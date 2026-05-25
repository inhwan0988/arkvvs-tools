import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicsRaw } from "@/lib/tools/vvs-planner/claude";
import { buildIdeasPrompt } from "@/lib/tools/insta-planner/prompts";
import type {
  ContentIdea,
  InstaProfile,
  ReelAnalysis,
  ReelResult,
  UserIntent,
} from "@/lib/tools/insta-planner/types";

export const runtime = "nodejs";

type Body = {
  reel?: ReelResult;
  analysis?: ReelAnalysis;
  profile?: InstaProfile | null;
  userIntent?: UserIntent;
  targetFormat?: "reel" | "post" | "carousel" | "any";
  anthropicApiKey?: string;
};

function parseIdeasRobust(raw: string): ContentIdea[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    const start = raw.indexOf("[");
    const lastBrace = raw.lastIndexOf("}");
    if (start < 0 || lastBrace < 0) {
      throw new Error("AI 응답에서 JSON 배열을 찾지 못했습니다.");
    }
    const reconstructed = raw.slice(start, lastBrace + 1) + "]";
    return JSON.parse(reconstructed) as ContentIdea[];
  }
  const text = match[0];
  try {
    return JSON.parse(text) as ContentIdea[];
  } catch (e1) {
    const lastValidEnd = text.lastIndexOf("},");
    if (lastValidEnd > 0) {
      const truncated = text.slice(0, lastValidEnd + 1) + "]";
      try {
        return JSON.parse(truncated) as ContentIdea[];
      } catch {
        /* next */
      }
    }
    try {
      const cleaned = text.replace(/,(\s*[}\]])/g, "$1");
      return JSON.parse(cleaned) as ContentIdea[];
    } catch {
      throw e1;
    }
  }
}

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
  if (!body.reel || !body.analysis) {
    return NextResponse.json(
      { error: "릴스 정보와 분석 결과가 필요합니다." },
      { status: 400 },
    );
  }
  if (!body.userIntent?.freeText?.trim()) {
    return NextResponse.json(
      { error: "어떤 방향으로 만들고 싶은지 의도를 입력해주세요." },
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
    const prompt = buildIdeasPrompt(body.reel, body.analysis, {
      profile: body.profile,
      userIntent: body.userIntent,
      targetFormat: body.targetFormat,
    });
    const raw = await generateTopicsRaw(apiKey, prompt);
    const ideas = parseIdeasRobust(raw);
    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error("생성된 아이디어가 없습니다.");
    }
    return NextResponse.json({ ideas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "아이디어 생성 실패";
    console.error("[generate-ideas]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
