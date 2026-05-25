import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicsRaw } from "@/lib/tools/vvs-planner/claude";
import { buildAnalyzeVideoPrompt } from "@/lib/tools/vvs-planner/prompts";
import type { VideoAnalysis } from "@/lib/tools/vvs-planner/types";

export const runtime = "nodejs";

type Body = {
  transcript?: string;
  videoTitle?: string;
  channelTitle?: string;
  anthropicApiKey?: string;
};

/**
 * 영상 구조 분석 — 자막을 보고 핵심 주제/구조/후킹/타겟 등을 추출.
 * Step3 진입 시 자동 호출. 사용자가 영상의 핵심을 한눈에 파악 + 어디서 영감받았는지 인지.
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
  const { transcript, videoTitle, channelTitle } = body;
  if (!transcript || !videoTitle || !channelTitle) {
    return NextResponse.json(
      { error: "자막, 영상 제목, 채널명이 필요합니다." },
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
    const prompt = buildAnalyzeVideoPrompt(transcript, videoTitle, channelTitle);
    const raw = await generateTopicsRaw(apiKey, prompt);

    // JSON 파싱 (robust)
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
    let analysis: VideoAnalysis;
    try {
      analysis = JSON.parse(match[0]) as VideoAnalysis;
    } catch {
      // trailing comma 등 복구 시도
      const cleaned = match[0].replace(/,(\s*[}\]])/g, "$1");
      analysis = JSON.parse(cleaned) as VideoAnalysis;
    }

    return NextResponse.json({ analysis });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "영상 분석 중 오류가 발생했습니다.";
    console.error("[analyze-video] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
