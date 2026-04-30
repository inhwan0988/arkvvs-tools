import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, buildUserPrompt, ChannelStage } from "@/lib/tools/youtube-setup/prompts";
import { generateWithClaude } from "@/lib/tools/youtube-setup/claude";
import { generateWithOpenAI } from "@/lib/tools/youtube-setup/openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  script: string;
  provider: "claude" | "openai";
  apiKey?: string;
  stage: ChannelStage;
};

function stripCodeFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    // 인증 체크 (로그인 + 미차단 사용자만)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
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

    const body = (await req.json()) as Body;
    const { script, provider, stage } = body;

    if (!script?.trim()) {
      return NextResponse.json({ error: "스크립트가 비어있습니다." }, { status: 400 });
    }

    const apiKey =
      body.apiKey?.trim() ||
      (provider === "claude"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY);

    if (!apiKey) {
      return NextResponse.json(
        { error: `${provider === "claude" ? "Anthropic" : "OpenAI"} API 키가 필요합니다.` },
        { status: 400 }
      );
    }

    const userPrompt = buildUserPrompt(script, stage);
    const raw =
      provider === "claude"
        ? await generateWithClaude({ apiKey, system: SYSTEM_PROMPT, user: userPrompt })
        : await generateWithOpenAI({ apiKey, system: SYSTEM_PROMPT, user: userPrompt });

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(raw));
    } catch {
      return NextResponse.json(
        { error: "AI 응답 JSON 파싱 실패", raw },
        { status: 502 }
      );
    }
    return NextResponse.json({ data: parsed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
