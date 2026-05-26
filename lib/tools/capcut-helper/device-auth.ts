/**
 * Helper API endpoint에서 device 인증.
 * Authorization: Bearer {deviceId}.{deviceSecret}
 */
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export type AuthedDevice = {
  deviceId: string;
  userId: string | null; // null이면 페어링 안 된 상태
};

export async function authDevice(req: NextRequest): Promise<AuthedDevice | NextResponse> {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+([0-9a-f-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) {
    return NextResponse.json(
      { error: "Authorization 헤더 필요: Bearer deviceId.deviceSecret" },
      { status: 401 },
    );
  }
  const [, deviceId, providedSecret] = m;

  const admin = createSnsAdminClient();
  const { data: device, error } = await admin
    .from("capcut_devices")
    .select("id, user_id, device_secret_hash")
    .eq("id", deviceId)
    .maybeSingle();
  if (error || !device) {
    return NextResponse.json({ error: "device not found" }, { status: 401 });
  }

  // device_secret_hash 는 schema에 추가 필요 — 우선 row의 별도 hidden 컬럼으로 검증
  // schema 보강은 capcut-helper.sql에 추가됨
  const { default: crypto } = await import("crypto");
  const provided = crypto
    .createHash("sha256")
    .update(providedSecret + (process.env.CAPCUT_DEVICE_SALT || "salt"))
    .digest("hex");
  if (provided !== (device as { device_secret_hash?: string }).device_secret_hash) {
    return NextResponse.json({ error: "secret mismatch" }, { status: 401 });
  }

  // last_seen_at 갱신
  await admin
    .from("capcut_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", deviceId);

  return { deviceId, userId: device.user_id };
}

export function hashSecret(secret: string): string {
  // 동기 require — Edge runtime이 아닌 nodejs에서만 사용
  const c = require("crypto");
  return c
    .createHash("sha256")
    .update(secret + (process.env.CAPCUT_DEVICE_SALT || "salt"))
    .digest("hex");
}

export function generateDeviceSecret(): string {
  const c = require("crypto");
  return c.randomBytes(32).toString("base64url");
}
