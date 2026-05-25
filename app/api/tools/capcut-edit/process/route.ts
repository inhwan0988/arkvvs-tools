import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/tools/capcut-edit/whisper";
import { detectSilences } from "@/lib/tools/capcut-edit/silence-detector";
import { detectPointSubtitles } from "@/lib/tools/capcut-edit/point-detector";
import { matchSoundEffect } from "@/lib/tools/capcut-edit/sound-library";
import type { ProcessResult } from "@/lib/tools/capcut-edit/types";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro 필요 (5분). Hobby는 60초.

/**
 * mp3 파일을 받아 Whisper 자막 + 무음 감지 + 포인트 자막 + 효과음 매칭 통합 처리.
 *
 * Body: multipart/form-data
 *   - audio: mp3 file (Blob)
 *   - openaiApiKey: string
 *   - anthropicApiKey: string
 *   - targetPointCount: number (optional, default 8)
 *
 * Response: ProcessResult JSON
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

  // multipart 파싱
  const formData = await req.formData();
  const audioFile = formData.get("audio");
  const openaiApiKey = String(formData.get("openaiApiKey") || "");
  const anthropicApiKey = String(formData.get("anthropicApiKey") || "");
  const targetPointCount = Number(formData.get("targetPointCount") || 8);

  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json(
      { error: "audio 파일이 필요합니다." },
      { status: 400 },
    );
  }
  if (!openaiApiKey || !openaiApiKey.startsWith("sk-")) {
    return NextResponse.json(
      { error: "OpenAI API 키가 필요합니다." },
      { status: 400 },
    );
  }
  if (!anthropicApiKey || !anthropicApiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic API 키가 필요합니다." },
      { status: 400 },
    );
  }

  // Whisper API 한도 (25MB)
  const MAX_BYTES = 24.5 * 1024 * 1024;
  if (audioFile.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `mp3 파일이 너무 큽니다 (${(audioFile.size / 1024 / 1024).toFixed(1)}MB). 24MB 미만으로 압축해주세요.`,
      },
      { status: 400 },
    );
  }

  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = audioFile.name || "audio.mp3";

    // 1. Whisper 자막 추출
    const { segments, duration, language } = await transcribeAudio(
      buffer,
      filename,
      openaiApiKey,
    );

    // 2. 무음 구간 감지
    const silences = detectSilences(segments, duration, 0.5);

    // 3. 포인트 자막 식별 (Claude)
    type PointWithCategory = ReturnType<typeof detectPointSubtitles> extends Promise<infer T> ? T : never;
    const rawPoints = (await detectPointSubtitles(
      segments,
      anthropicApiKey,
      targetPointCount,
    )) as PointWithCategory;

    // 4. 효과음 매칭
    const points = (rawPoints as Array<{
      id: number;
      time: number;
      duration: number;
      text: string;
      emoji?: string;
      style?: "shock" | "emphasis" | "callout" | "punchline";
      sourceText?: string;
      soundEffect?: unknown;
    }>).map((p) => ({
      ...p,
      style: p.style ?? "emphasis",
      soundEffect: matchSoundEffect(p.style, undefined),
    }));

    const result: ProcessResult = {
      videoId: crypto.randomUUID(),
      duration,
      subtitles: segments,
      silences,
      points,
      detectedLanguage: language,
    };

    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "처리 중 오류";
    const errCode = (e as { status?: number }).status;
    console.error("[capcut-edit/process]", msg);

    // OpenAI 401 분류
    if (errCode === 401) {
      return NextResponse.json(
        { error: "API 키가 잘못되었어요. 우상단 설정 확인해주세요." },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
