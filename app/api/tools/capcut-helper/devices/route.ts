import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** 본인 페어링된 Helper devices 목록 + 상태 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("capcut_devices")
    .select("*")
    .eq("user_id", user.id)
    .order("paired_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ devices: data ?? [] });
}

/** 페어링 해제 (device 삭제) */
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as { deviceId: string };
  if (!body.deviceId) return NextResponse.json({ error: "deviceId 필요" }, { status: 400 });

  const { error } = await supabase
    .from("capcut_devices")
    .delete()
    .eq("id", body.deviceId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
