import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UpsertBody = {
  sessionId?: string;
  keyword?: string | null;
  selectedVideo?: {
    videoId?: string;
    title?: string;
    url?: string;
    thumbnail?: string;
    channelTitle?: string;
  } | null;
  channelProfile?: unknown;
  userIntent?: unknown;
  referenceVideoUrls?: string[] | null;
  selectedTopic?: unknown;
  interviewQuestions?: unknown;
  interviewAnswers?: unknown;
  scriptText?: string | null;
  status?: "in_progress" | "complete" | "abandoned";
  stepProgress?: number;
  title?: string | null;
};

/** GET — 본인 세션 list (최근 20개) */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("vvs_planner_sessions")
    .select(
      "id, title, keyword, selected_video_title, selected_video_thumbnail, selected_video_channel, status, step_progress, updated_at, created_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

/** POST — upsert. sessionId 있으면 update, 없으면 insert. 자동 저장 패턴. */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as UpsertBody;

  const computedTitle =
    body.title ||
    body.selectedVideo?.title ||
    body.keyword ||
    "새 작업";

  // Supabase는 undefined 무시 안 함 — null 또는 omit 처리 필요
  const row: Record<string, unknown> = {
    user_id: user.id,
    title: computedTitle,
    updated_at: new Date().toISOString(),
  };
  if (body.keyword !== undefined) row.keyword = body.keyword;
  if (body.selectedVideo !== undefined) {
    row.selected_video_id = body.selectedVideo?.videoId ?? null;
    row.selected_video_title = body.selectedVideo?.title ?? null;
    row.selected_video_url = body.selectedVideo?.url ?? null;
    row.selected_video_thumbnail = body.selectedVideo?.thumbnail ?? null;
    row.selected_video_channel = body.selectedVideo?.channelTitle ?? null;
  }
  if (body.channelProfile !== undefined) row.channel_profile = body.channelProfile;
  if (body.userIntent !== undefined) row.user_intent = body.userIntent;
  if (body.referenceVideoUrls !== undefined)
    row.reference_video_urls = body.referenceVideoUrls;
  if (body.selectedTopic !== undefined) row.selected_topic = body.selectedTopic;
  if (body.interviewQuestions !== undefined)
    row.interview_questions = body.interviewQuestions;
  if (body.interviewAnswers !== undefined)
    row.interview_answers = body.interviewAnswers;
  if (body.scriptText !== undefined) row.script_text = body.scriptText;
  if (body.status !== undefined) row.status = body.status;
  if (body.stepProgress !== undefined) row.step_progress = body.stepProgress;

  if (body.sessionId) {
    const { data, error } = await supabase
      .from("vvs_planner_sessions")
      .update(row)
      .eq("id", body.sessionId)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ sessionId: data.id });
  }

  // insert (created_at은 default)
  const { data, error } = await supabase
    .from("vvs_planner_sessions")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessionId: data.id });
}
