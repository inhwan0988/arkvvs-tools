import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicsRaw } from "@/lib/tools/vvs-planner/claude";
import { buildTopicPrompt } from "@/lib/tools/vvs-planner/prompts";
import { getTranscript } from "@/lib/tools/vvs-planner/transcript";
import type { ChannelProfile, ReferenceVideo, Topic, UserIntent } from "@/lib/tools/vvs-planner/types";

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
  // v3: 사용자 의도
  userIntent?: UserIntent | null;
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

/**
 * Claude의 JSON 응답을 robust하게 parse.
 * 1차: 그대로 parse
 * 2차: 잘린 응답 복구 (마지막 incomplete object 잘라내고 ] 닫기)
 * 3차: trailing comma 제거 후 재시도
 * 4차: 모두 실패 시 원본 에러 throw + 응답 일부 로깅
 */
function parseTopicsRobust(raw: string): Topic[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    // ] 가 없으면 [ 부터 시작해서 마지막 } 까지 자르고 ] 추가
    const start = raw.indexOf("[");
    const lastBrace = raw.lastIndexOf("}");
    if (start < 0 || lastBrace < 0) {
      throw new Error("AI 응답에서 JSON 배열을 찾지 못했습니다.");
    }
    const reconstructed = raw.slice(start, lastBrace + 1) + "]";
    return JSON.parse(reconstructed) as Topic[];
  }
  const text = match[0];
  // 1차
  try {
    return JSON.parse(text) as Topic[];
  } catch (e1) {
    // 2차: 잘린 응답 복구 — 마지막 valid object 종료 위치까지 잘라서 닫기
    const lastValidEnd = text.lastIndexOf("},");
    if (lastValidEnd > 0) {
      const truncated = text.slice(0, lastValidEnd + 1) + "]";
      try {
        return JSON.parse(truncated) as Topic[];
      } catch {
        /* next */
      }
    }
    // 3차: trailing comma 제거
    try {
      const cleaned = text
        .replace(/,(\s*[}\]])/g, "$1")
        .replace(/,\s*$/, "");
      return JSON.parse(cleaned) as Topic[];
    } catch {
      /* fall through */
    }
    // 4차: 모든 시도 실패 — 진단용 로그 + 원본 에러
    console.error("[topics] JSON parse failed:", e1);
    console.error("[topics] raw response (last 500 chars):", text.slice(-500));
    throw new Error(
      "AI 응답 형식이 올바르지 않아 주제를 파싱하지 못했어요. 다시 시도해주세요. " +
        "(반복되면 다른 영상으로 시도)",
    );
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
      userIntent: body.userIntent || null,
    });
    const raw = await generateTopicsRaw(apiKey, prompt);
    const topics = parseTopicsRobust(raw);
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error("생성된 주제가 없습니다.");
    }
    return NextResponse.json({ topics });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "주제 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
