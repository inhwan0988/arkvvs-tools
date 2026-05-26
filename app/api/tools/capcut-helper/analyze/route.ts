import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { transcribeAudio } from "@/lib/tools/capcut-edit/whisper";
import { detectSilences } from "@/lib/tools/capcut-edit/silence-detector";
import { detectPointSubtitles } from "@/lib/tools/capcut-edit/point-detector";
import { matchSoundEffect } from "@/lib/tools/capcut-edit/sound-library";
import type { ProcessResult } from "@/lib/tools/capcut-edit/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 사용자가 웹앱에서 "분석 시작" 클릭 → Helper가 올린 audio 다운로드 → Whisper + Claude →
 * result_json을 jobs 테이블에 저장 → status='pending_review'.
 *
 * Body: { jobId, openaiApiKey, anthropicApiKey, targetPointCount? }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as {
    jobId: string;
    openaiApiKey: string;
    anthropicApiKey: string;
    targetPointCount?: number;
  };

  if (!body.jobId) return NextResponse.json({ error: "jobId 필요" }, { status: 400 });
  if (!body.openaiApiKey?.startsWith("sk-")) {
    return NextResponse.json({ error: "OpenAI 키 필요" }, { status: 400 });
  }
  if (!body.anthropicApiKey?.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "Anthropic 키 필요" }, { status: 400 });
  }

  const admin = createSnsAdminClient();

  // job 조회
  const { data: job, error: jobErr } = await admin
    .from("capcut_jobs")
    .select("*")
    .eq("id", body.jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (jobErr || !job) return NextResponse.json({ error: "job not found" }, { status: 404 });
  if (!job.audio_storage_path) {
    return NextResponse.json({ error: "audio 업로드 미완료" }, { status: 400 });
  }

  // status → analyzing
  await admin
    .from("capcut_jobs")
    .update({ status: "analyzing" })
    .eq("id", job.id);

  try {
    // Storage에서 audio 다운로드
    const { data: audioBlob, error: dlErr } = await admin.storage
      .from("capcut-audio")
      .download(job.audio_storage_path);
    if (dlErr || !audioBlob) throw new Error("audio download 실패: " + (dlErr?.message ?? ""));

    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = job.video_name.replace(/\.[^.]+$/, ".mp3");

    // Whisper
    const { segments, duration, language } = await transcribeAudio(
      buffer,
      filename,
      body.openaiApiKey,
    );

    // 무음 + Claude 포인트 자막 (병렬)
    const silences = detectSilences(segments, duration, 0.5);
    const rawPoints = await detectPointSubtitles(
      segments,
      body.anthropicApiKey,
      body.targetPointCount ?? 8,
    );

    const points = (rawPoints as Array<{
      id: number;
      time: number;
      duration: number;
      text: string;
      emoji?: string;
      style?: "shock" | "emphasis" | "callout" | "punchline";
      sourceText?: string;
    }>).map((p) => ({
      ...p,
      style: p.style ?? ("emphasis" as const),
      soundEffect: matchSoundEffect(p.style ?? "emphasis", undefined),
    }));

    const result: ProcessResult = {
      videoId: job.id,
      duration,
      subtitles: segments,
      silences,
      points,
      detectedLanguage: language,
    };

    // jobs 테이블에 저장
    await admin
      .from("capcut_jobs")
      .update({
        result_json: result,
        analyzed_at: new Date().toISOString(),
        status: "pending_review",
      })
      .eq("id", job.id);

    // Storage 임시 audio 삭제 (분석 끝났으니 불필요)
    await admin.storage.from("capcut-audio").remove([job.audio_storage_path]);
    await admin
      .from("capcut_jobs")
      .update({ audio_storage_path: null })
      .eq("id", job.id);

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "분석 실패";
    await admin
      .from("capcut_jobs")
      .update({ status: "error", error_message: msg })
      .eq("id", job.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
