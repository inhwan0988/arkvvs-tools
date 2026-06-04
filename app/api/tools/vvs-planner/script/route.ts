import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamClaudeText } from "@/lib/tools/vvs-planner/claude";
import { buildScriptPrompt } from "@/lib/tools/vvs-planner/prompts";
import { getTranscript } from "@/lib/tools/vvs-planner/transcript";
import type {
  ChannelProfile,
  InterviewAnswers,
  InterviewQuestion,
  ReferenceVideo,
  UserIntent,
} from "@/lib/tools/vvs-planner/types";

// youtube-transcript는 Node 런타임 필요
export const runtime = "nodejs";

type Body = {
  topic?: { title: string; description: string; angle: string };
  transcript?: string;
  videoTitle?: string;
  anthropicApiKey?: string;
  channelProfile?: ChannelProfile | null;
  referenceVideoUrls?: string[];
  userIntent?: UserIntent | null;
  interviewQuestions?: InterviewQuestion[] | null;
  interviewAnswers?: InterviewAnswers | null;
};

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/\/shorts\/([\w-]+)/);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}

async function fetchReferenceVideos(urls: string[]): Promise<ReferenceVideo[]> {
  const out: ReferenceVideo[] = [];
  for (const url of (urls || []).slice(0, 3)) {
    const id = extractVideoId(url);
    if (!id) continue;
    try {
      const tr = await getTranscript(id);
      if (tr?.transcript) {
        out.push({ videoId: id, transcriptSample: tr.transcript.slice(0, 1500) });
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("로그인이 필요합니다.", 401);
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status === "banned") return jsonError("차단된 계정입니다.", 403);

  const body = (await req.json()) as Body;
  const { topic, transcript, videoTitle } = body;
  if (!topic || !transcript || !videoTitle) {
    return jsonError("주제, 자막, 영상 제목이 필요합니다.", 400);
  }

  const apiKey = body.anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return jsonError("Anthropic API 키가 필요합니다.", 400);

  try {
    const referenceVideos = body.referenceVideoUrls
      ? await fetchReferenceVideos(body.referenceVideoUrls)
      : [];
    const prompt = buildScriptPrompt(topic, transcript, videoTitle, {
      channelProfile: body.channelProfile || null,
      referenceVideos,
      userIntent: body.userIntent || null,
      interviewQuestions: body.interviewQuestions || null,
      interviewAnswers: body.interviewAnswers || null,
    });
    const stream = await streamClaudeText(apiKey, prompt);
    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "대본 생성 중 오류가 발생했습니다.";
    return jsonError(msg, 500);
  }
}
