import { NextRequest, NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  buildSectionPrompt,
  ChannelStage,
  Section,
} from "@/lib/tools/youtube-setup/prompts";
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

const SECTIONS: Section[] = ["titles", "thumbnails", "description", "meta"];

function stripCodeFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function tryExtractJson(s: string): unknown {
  const stripped = stripCodeFence(s);
  try {
    return JSON.parse(stripped);
  } catch {
    // JSON 객체 부분만 추출 시도
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error("JSON 파싱 실패");
  }
}

export async function POST(req: NextRequest) {
  try {
    // 인증 체크
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

    const callOne = async (section: Section) => {
      const userPrompt = buildSectionPrompt(script, stage, section);
      const raw =
        provider === "claude"
          ? await generateWithClaude({ apiKey, system: SYSTEM_PROMPT, user: userPrompt })
          : await generateWithOpenAI({ apiKey, system: SYSTEM_PROMPT, user: userPrompt });
      return { section, raw };
    };

    // 4개 섹션 병렬 호출 — 총 시간 = 가장 느린 1개 (~10~15초 예상)
    const settled = await Promise.allSettled(SECTIONS.map(callOne));

    // 실패한 섹션이 있는지 체크
    const failed = settled
      .map((r, i) => (r.status === "rejected" ? SECTIONS[i] : null))
      .filter(Boolean) as Section[];
    if (failed.length === SECTIONS.length) {
      const firstReason =
        (settled[0] as PromiseRejectedResult).reason?.message ?? "AI 호출 실패";
      return NextResponse.json({ error: firstReason }, { status: 502 });
    }

    // 결과 병합
    const merged: Record<string, unknown> = {};
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      try {
        const parsed = tryExtractJson(r.value.raw) as Record<string, unknown>;
        Object.assign(merged, parsed);
      } catch {
        // 부분 실패는 무시 (다른 섹션은 살림)
      }
    }

    // 최소 한 섹션이라도 성공해야 응답 OK
    if (Object.keys(merged).length === 0) {
      return NextResponse.json(
        { error: "모든 AI 응답 파싱 실패" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: merged,
      partial: failed.length > 0 ? failed : undefined,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
