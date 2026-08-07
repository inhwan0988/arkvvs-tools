import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/tools/vvs-planner/claude";
import { buildAnalyzeReelPrompt } from "@/lib/tools/insta-planner/prompts";
import { enforceQuota } from "@/lib/usage/wrap";
import { logUsage } from "@/lib/usage/logger";
import type { ReelAnalysis, ReelResult } from "@/lib/tools/insta-planner/types";

export const runtime = "nodejs";

type Body = {
  reel?: ReelResult;
  anthropicApiKey?: string;
};

/**
 * 선택된 릴스 → Claude로 구조/후킹/타겟/시각 스타일 분석.
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
  if (!body.reel) {
    return NextResponse.json({ error: "콘텐츠 정보가 필요합니다." }, { status: 400 });
  }
  const usedOwnKey = !!body.anthropicApiKey?.trim();
  const apiKey = body.anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API 키가 필요합니다." },
      { status: 400 },
    );
  }

  const quotaResp = await enforceQuota({
    userId: user.id,
    toolSlug: "insta-viral-planner",
    action: "analyze-reel",
    provider: "anthropic",
    usedOwnKey,
  });
  if (quotaResp) return quotaResp;

  try {
    const prompt = buildAnalyzeReelPrompt(body.reel);
    const { text: raw, model, usage } = await callClaude(apiKey, prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
    let analysis: ReelAnalysis;
    try {
      analysis = JSON.parse(match[0]) as ReelAnalysis;
    } catch {
      const cleaned = match[0].replace(/,(\s*[}\]])/g, "$1");
      analysis = JSON.parse(cleaned) as ReelAnalysis;
    }
    await logUsage({
      userId: user.id,
      toolSlug: "insta-viral-planner",
      action: "analyze-reel",
      provider: "anthropic",
      model,
      tokensIn: usage.input,
      tokensOut: usage.output,
      usedOwnKey,
    });
    return NextResponse.json({ analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "분석 실패";
    console.error("[analyze-reel]", msg);
    await logUsage({
      userId: user.id,
      toolSlug: "insta-viral-planner",
      action: "analyze-reel",
      provider: "anthropic",
      usedOwnKey,
      status: "error",
      errorMessage: msg.slice(0, 200),
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
