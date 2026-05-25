import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamClaudeText } from "@/lib/tools/vvs-planner/claude";
import { buildScriptPrompt } from "@/lib/tools/insta-planner/prompts";
import type {
  ContentIdea,
  InstaProfile,
  ReelResult,
  UserIntent,
} from "@/lib/tools/insta-planner/types";

export const runtime = "nodejs";

type Body = {
  idea?: ContentIdea;
  reel?: ReelResult;
  profile?: InstaProfile | null;
  userIntent?: UserIntent;
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
  if (!body.idea || !body.reel) {
    return jsonError("아이디어와 영감 콘텐츠 정보가 필요합니다.", 400);
  }
  const apiKey = body.anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return jsonError("Anthropic API 키가 필요합니다.", 400);

  try {
    const prompt = buildScriptPrompt(body.idea, body.reel, {
      profile: body.profile,
      userIntent: body.userIntent,
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
    const msg = e instanceof Error ? e.message : "대본 생성 실패";
    return jsonError(msg, 500);
  }
}
