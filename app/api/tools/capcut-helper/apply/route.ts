import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProcessResult } from "@/lib/tools/capcut-edit/types";

export const runtime = "nodejs";

/**
 * 사용자가 검수 후 "Helper에서 적용" 클릭 → status='pending_apply'로 변경.
 * Helper polling이 이 상태를 잡아서 ffmpeg cut을 실행.
 *
 * 사용자가 검수 단계에서 수정한 result(자막/포인트)도 같이 저장.
 *
 * Body: { jobId, result (수정된 ProcessResult) }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as {
    jobId: string;
    result: ProcessResult;
  };
  if (!body.jobId || !body.result) {
    return NextResponse.json({ error: "jobId + result 필요" }, { status: 400 });
  }

  const { error } = await supabase
    .from("capcut_jobs")
    .update({
      result_json: body.result,
      status: "pending_apply",
    })
    .eq("id", body.jobId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
