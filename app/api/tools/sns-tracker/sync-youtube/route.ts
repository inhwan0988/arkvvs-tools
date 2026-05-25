import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractYoutubeVideoId,
  fetchYoutubeStats,
} from "@/lib/tools/sns-tracker/youtube-sync";

export const runtime = "nodejs";

/**
 * YouTube 콘텐츠의 views/likes/comments를 YouTube Data API로 자동 sync.
 * 본인 콘텐츠 중 platform='youtube'이면서 content_url에서 videoId 뽑을 수 있는 것만.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const { data: contents, error } = await supabase
    .from("sns_contents")
    .select("id, platform, content_url")
    .eq("user_id", user.id)
    .eq("platform", "youtube")
    .is("archived_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = { id: string; platform: string; content_url: string | null };
  const rows = (contents ?? []) as Row[];

  // videoId → row id 매핑
  const idMap = new Map<string, string>();
  for (const c of rows) {
    if (!c.content_url) continue;
    const vid = extractYoutubeVideoId(c.content_url);
    if (vid) idMap.set(vid, c.id);
  }
  if (idMap.size === 0) {
    return NextResponse.json({ synced: 0, message: "sync할 YouTube 콘텐츠가 없습니다." });
  }

  let stats;
  try {
    stats = await fetchYoutubeStats([...idMap.keys()], apiKey);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "YouTube API 오류" },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  let synced = 0;
  for (const [videoId, snsRowId] of idMap.entries()) {
    const s = stats.get(videoId);
    if (!s) continue;
    const { error: upErr } = await supabase
      .from("sns_contents")
      .update({
        views: s.views,
        likes: s.likes,
        comments: s.comments,
        views_synced_at: now,
      })
      .eq("id", snsRowId)
      .eq("user_id", user.id);
    if (!upErr) synced += 1;
  }

  return NextResponse.json({
    synced,
    total: idMap.size,
    syncedAt: now,
  });
}
