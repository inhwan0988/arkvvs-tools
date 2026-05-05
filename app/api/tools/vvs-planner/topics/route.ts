import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicsRaw } from "@/lib/tools/vvs-planner/claude";
import { buildTopicPrompt } from "@/lib/tools/vvs-planner/prompts";
import type { Topic } from "@/lib/tools/vvs-planner/types";

type Body = {
  transcript?: string;
  videoTitle?: string;
  channelTitle?: string;
  anthropicApiKey?: string;
};

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
    const prompt = buildTopicPrompt(transcript, videoTitle, channelTitle);
    const raw = await generateTopicsRaw(apiKey, prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("AI 응답에서 JSON을 파싱할 수 없습니다.");
    const topics = JSON.parse(match[0]) as Topic[];
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error("생성된 주제가 없습니다.");
    }
    return NextResponse.json({ topics });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "주제 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
