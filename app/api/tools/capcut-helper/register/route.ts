import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { generatePairingCode, pairingCodeExpiry } from "@/lib/tools/capcut-helper/pairing";
import { generateDeviceSecret, hashSecret } from "@/lib/tools/capcut-helper/device-auth";

export const runtime = "nodejs";

/**
 * Helper App 첫 실행 또는 재페어링 시 호출.
 * 익명 — 인증 없음. Helper가 새 device row + pairing code 발급받음.
 *
 * Body: { platform: "darwin"|"win32"|"linux", capcutDirPath?: string }
 * Returns: { deviceId, deviceSecret, pairingCode, expiresAt }
 *
 * Helper는 deviceId + deviceSecret 를 local secure storage에 저장 (Electron safeStorage).
 * pairingCode 는 화면에 표시 (10분 만료).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    platform?: "darwin" | "win32" | "linux";
    capcutDirPath?: string;
  };

  if (!body.platform || !["darwin", "win32", "linux"].includes(body.platform)) {
    return NextResponse.json({ error: "platform 필요" }, { status: 400 });
  }

  const admin = createSnsAdminClient();
  const deviceSecret = generateDeviceSecret();
  const deviceSecretHash = hashSecret(deviceSecret);
  const pairingCode = generatePairingCode();
  const expiresAt = pairingCodeExpiry();

  const { data, error } = await admin
    .from("capcut_devices")
    .insert({
      platform: body.platform,
      capcut_dir_path: body.capcutDirPath || null,
      pairing_code: pairingCode,
      pairing_code_expires_at: expiresAt.toISOString(),
      device_secret_hash: deviceSecretHash,
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // pairing_code 충돌이면 재시도
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "코드 충돌 — 잠시 후 다시 시도해주세요." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deviceId: data.id,
    deviceSecret, // plain (이 응답에서만, 이후 server에선 hash만 보관)
    pairingCode,
    expiresAt: expiresAt.toISOString(),
  });
}
