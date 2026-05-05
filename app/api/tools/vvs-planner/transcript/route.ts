import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTranscript } from "@/lib/tools/vvs-planner/transcript";

// youtube-transcript 라이브러리는 Node 런타임 필요
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status === "banned") {
    return NextResponse.json({ error: "차단된 계정입니다." }, { status: 403 });
  }

  const { videoId } = (await req.json()) as { videoId?: string };
  if (!videoId) {
    return NextResponse.json({ error: "영상 ID가 필요합니다." }, { status: 400 });
  }

  try {
    const result = await getTranscript(videoId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "자막 추출 중 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
