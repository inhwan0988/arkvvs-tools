import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";

export const runtime = "nodejs";

/**
 * 사용자가 웹앱에서 "Helper 페어링" 화면에 6자리 코드 입력 → 본인 계정에 묶음.
 *
 * Body: { code: "123456" }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as { code?: string; deviceName?: string };
  const code = (body.code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "6자리 숫자 코드를 입력해주세요." }, { status: 400 });
  }

  // service-role 사용 (anon row update 필요 — RLS 우회)
  const admin = createSnsAdminClient();

  const { data: device, error } = await admin
    .from("capcut_devices")
    .select("id, pairing_code_expires_at, user_id")
    .eq("pairing_code", code)
    .is("user_id", null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!device) {
    return NextResponse.json(
      { error: "이 코드로 등록된 Helper가 없거나 이미 페어링되었어요." },
      { status: 404 },
    );
  }
  if (
    device.pairing_code_expires_at &&
    new Date(device.pairing_code_expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "페어링 코드가 만료됐어요 (10분). Helper 앱에서 새 코드 발급해주세요." },
      { status: 410 },
    );
  }

  const { error: upErr } = await admin
    .from("capcut_devices")
    .update({
      user_id: user.id,
      device_name: (body.deviceName || "").slice(0, 100) || null,
      paired_at: new Date().toISOString(),
      pairing_code: null, // 코드 1회용
      pairing_code_expires_at: null,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", device.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deviceId: device.id });
}
