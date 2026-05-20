import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicsRaw } from "@/lib/tools/vvs-planner/claude";
import { buildTopicPrompt } from "@/lib/tools/vvs-planner/prompts";
import { getTranscript } from "@/lib/tools/vvs-planner/transcript";
import type { ChannelProfile, ReferenceVideo, Topic } from "@/lib/tools/vvs-planner/types";

// youtube-transcript는 Node 런타임 필요
export const runtime = "nodejs";

type Body = {
  transcript?: string;
  videoTitle?: string;
  channelTitle?: string;
  anthropicApiKey?: string;
  // v2 personalization
  channelProfile?: ChannelProfile | null;
  referenceVideoUrls?: string[];
};

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/\/shorts\/([\w-]+)/);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}

async function fetchReferenceVideos(urls: string[]): Promise<ReferenceVideo[]> {
  if (!urls || urls.length === 0) return [];
  const results: ReferenceVideo[] = [];
  for (const url of urls.slice(0, 3)) {
    const videoId = extractVideoId(url);
    if (!videoId) continue;
    try {
      const tr = await getTranscript(videoId);
      if (tr?.transcript) {
        results.push({
          videoId,
          transcriptSample: tr.transcript.slice(0, 1500),
        });
      }
    } catch {
      // 자막 추출 실패하면 skip — 본 흐름에 영향 X
    }
  }
  return results;
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
    // 레퍼런스 영상 자막 추출 (선택, 실패해도 본 흐름 영향 X)
    const referenceVideos = body.referenceVideoUrls
      ? await fetchReferenceVideos(body.referenceVideoUrls)
      : [];

    const prompt = buildTopicPrompt(transcript, videoTitle, channelTitle, {
      channelProfile: body.channelProfile || null,
      referenceVideos,
    });
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
