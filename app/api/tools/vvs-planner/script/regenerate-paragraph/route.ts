import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicsRaw } from "@/lib/tools/vvs-planner/claude";
import { buildParagraphRegenPrompt } from "@/lib/tools/vvs-planner/prompts";
import type {
  ChannelProfile,
  ParagraphTone,
} from "@/lib/tools/vvs-planner/types";

export const runtime = "nodejs";

type Body = {
  fullScript?: string;
  paragraphIndex?: number;
  paragraph?: string;
  tone?: ParagraphTone;
  channelProfile?: ChannelProfile | null;
  anthropicApiKey?: string;
};

/**
 * Step 4 — 원고의 한 단락만 재생성.
 * 전체 문맥은 유지하고 해당 단락만 새로 작성. tone(punchy/calm/expand/shrink) 옵션.
 */
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

  const body = (await req.json()) as Body;
  const { fullScript, paragraphIndex, paragraph, tone } = body;
  if (!fullScript || typeof paragraphIndex !== "number" || !paragraph) {
    return NextResponse.json(
      { error: "원고, 단락, 단락 index가 필요합니다." },
      { status: 400 },
    );
  }
  if (paragraph.trim().length < 5) {
    return NextResponse.json(
      { error: "단락이 너무 짧습니다." },
      { status: 400 },
    );
  }

  const apiKey = body.anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API 키가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const prompt = buildParagraphRegenPrompt({
      fullScript,
      paragraphIndex,
      paragraph,
      tone,
      channelProfile: body.channelProfile || null,
    });
    const raw = await generateTopicsRaw(apiKey, prompt);
    // 모델이 가끔 마크다운 코드블록을 씌우는 경우 제거
    const cleaned = raw
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    if (!cleaned) {
      throw new Error("재생성된 단락이 비어있습니다.");
    }
    return NextResponse.json({ paragraph: cleaned });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "단락 재생성 중 오류가 발생했습니다.";
    console.error("[regenerate-paragraph] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
