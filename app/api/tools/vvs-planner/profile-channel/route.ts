import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  resolveChannelId,
  fetchRecentVideos,
  analyzeChannelStyle,
} from "@/lib/tools/vvs-planner/channel-profile";

export const runtime = "nodejs";

/**
 * 사용자가 본인 채널 URL 입력 → 분석 → user_channel_profiles에 저장.
 * GET: 저장된 프로필 조회 (없으면 null)
 * POST: 새 분석 실행 + 저장 (replace)
 * DELETE: 프로필 삭제
 */

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ profile: null, signedIn: false });
  }

  // 테이블 없거나 row 없으면 null (graceful)
  const { data, error } = await supabase
    .from("user_channel_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // 테이블 미존재 등 — 그냥 null 반환
    return NextResponse.json({ profile: null, signedIn: true });
  }
  return NextResponse.json({ profile: data || null, signedIn: true });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    channelInput?: string;
    youtubeApiKey?: string;
    anthropicApiKey?: string;
  };

  const channelInput = (body.channelInput || "").trim();
  const youtubeApiKey = (body.youtubeApiKey || "").trim();
  const anthropicApiKey = (body.anthropicApiKey || "").trim();

  if (!channelInput) {
    return NextResponse.json(
      { error: "채널 URL 또는 핸들(@)을 입력해주세요." },
      { status: 400 },
    );
  }
  if (!youtubeApiKey) {
    return NextResponse.json(
      { error: "YouTube Data API 키가 필요합니다 (상단 설정에서 입력)." },
      { status: 400 },
    );
  }
  if (!anthropicApiKey) {
    return NextResponse.json(
      { error: "Anthropic API 키가 필요합니다 (상단 설정에서 입력)." },
      { status: 400 },
    );
  }

  try {
    // 1. 채널 ID 확정
    const { channelId, channelTitle } = await resolveChannelId(
      channelInput,
      youtubeApiKey,
    );

    // 2. 최근 영상 20개 fetch
    const recent = await fetchRecentVideos(channelId, youtubeApiKey, 20);
    if (recent.length === 0) {
      return NextResponse.json(
        { error: "채널의 영상을 찾지 못했습니다. URL을 확인해주세요." },
        { status: 400 },
      );
    }

    // 3. Claude로 분석
    const analysis = await analyzeChannelStyle(
      recent,
      channelTitle,
      anthropicApiKey,
    );

    // 4. Supabase에 upsert (테이블 없으면 graceful fail)
    const row = {
      user_id: user.id,
      channel_id: channelId,
      channel_url: channelInput,
      channel_title: analysis.channelTitle,
      niche: analysis.niche,
      avg_view_count: analysis.avgViewCount,
      avg_duration_seconds: analysis.avgDurationSeconds,
      common_hook_patterns: analysis.commonHookPatterns,
      tone: analysis.tone,
      pacing: analysis.pacing,
      target_audience: analysis.targetAudience,
      recent_titles: analysis.recentTitles,
      analyzed_at: new Date().toISOString(),
      raw_analysis: analysis,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("user_channel_profiles")
      .upsert(row, { onConflict: "user_id" });

    if (upsertErr) {
      // 테이블 없음 — 그래도 분석 결과는 반환 (사용자 세션에만 보관)
      console.warn("[profile-channel] upsert failed (테이블 미생성 가능):", upsertErr.message);
      return NextResponse.json({
        profile: row,
        warning:
          "DB 저장이 안 됐어요 (테이블이 아직 안 만들어진 듯). 이번 세션에서는 작동합니다.",
      });
    }

    return NextResponse.json({ profile: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[profile-channel] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  await supabase.from("user_channel_profiles").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
