import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicsRaw } from "@/lib/tools/vvs-planner/claude";
import { buildInterviewQuestionsPrompt } from "@/lib/tools/vvs-planner/prompts";
import type {
  ChannelProfile,
  InterviewQuestion,
  UserIntent,
} from "@/lib/tools/vvs-planner/types";

export const runtime = "nodejs";

type Body = {
  selectedTopic?: { title: string; description: string; angle: string };
  referenceTranscript?: string;
  videoTitle?: string;
  channelProfile?: ChannelProfile | null;
  userIntent?: UserIntent | null;
  anthropicApiKey?: string;
};

/**
 * Step 3.5 — 사용자에게 던질 단답형 인터뷰 질문 5-8개 생성.
 * 사용자가 답하면 그 답이 Step 4 원고 prompt에 강하게 주입되어 generic 원고 방지.
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
  const { selectedTopic, referenceTranscript } = body;
  if (
    !selectedTopic ||
    !selectedTopic.title ||
    !referenceTranscript ||
    referenceTranscript.trim().length < 30
  ) {
    return NextResponse.json(
      { error: "선택한 주제와 레퍼런스 자막이 필요합니다." },
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
    const prompt = buildInterviewQuestionsPrompt({
      selectedTopic,
      referenceTranscript,
      videoTitle: body.videoTitle,
      channelProfile: body.channelProfile || null,
      userIntent: body.userIntent || null,
    });
    const raw = await generateTopicsRaw(apiKey, prompt);

    // JSON parse (robust)
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
    let parsed: { questions?: InterviewQuestion[] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      const cleaned = match[0].replace(/,(\s*[}\]])/g, "$1");
      parsed = JSON.parse(cleaned);
    }
    const questions = (parsed.questions ?? []).filter(
      (q): q is InterviewQuestion =>
        !!q && typeof q.id === "string" && typeof q.text === "string",
    );
    if (questions.length === 0) {
      throw new Error("생성된 질문이 없습니다.");
    }
    // 각 질문에 fallback id (Claude가 가끔 id 빼먹음)
    questions.forEach((q, i) => {
      if (!q.id) q.id = `q${i + 1}`;
      if (q.type !== "chips" && q.type !== "short_text") q.type = "short_text";
    });

    return NextResponse.json({ questions });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "질문 생성 중 오류가 발생했습니다.";
    console.error("[interview-questions] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
