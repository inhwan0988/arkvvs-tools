import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamClaudeText } from "@/lib/tools/vvs-planner/claude";
import { buildScriptPrompt } from "@/lib/tools/vvs-planner/prompts";

type Body = {
  topic?: { title: string; description: string; angle: string };
  transcript?: string;
  videoTitle?: string;
  anthropicApiKey?: string;
};

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
    const prompt = buildScriptPrompt(topic, transcript, videoTitle);
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
