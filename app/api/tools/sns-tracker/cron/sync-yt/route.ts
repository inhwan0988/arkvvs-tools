import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { fetchRecentUploads } from "@/lib/tools/sns-tracker/youtube-channel-sync";
import { generateShortId } from "@/lib/tools/sns-tracker/shortid";

export const runtime = "nodejs";
export const maxDuration = 60;

const YT_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Vercel Cron — sync_enabled=true인 모든 yt_channels에 대해 신규 영상 자동 등록.
 *
 * vercel.json의 `crons` 설정으로 daily 호출.
 * 인증: Authorization: Bearer ${CRON_SECRET} (Vercel이 자동 부착)
 */
export async function GET(req: NextRequest) {
  // Vercel cron auth
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!YT_KEY) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY 없음" }, { status: 500 });
  }

  const admin = createSnsAdminClient();
  const { data: channels, error } = await admin
    .from("sns_yt_channels")
    .select("*")
    .eq("sync_enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    user_id: string;
    channel_id: string;
    channel_title: string | null;
    uploads_playlist_id: string | null;
    default_destination_url: string | null;
  };
  const rows = (channels ?? []) as Row[];

  let totalNew = 0;
  const errors: Array<{ channelId: string; error: string }> = [];

  for (const ch of rows) {
    if (!ch.uploads_playlist_id) continue;
    try {
      const uploads = await fetchRecentUploads(
        ch.uploads_playlist_id,
        YT_KEY,
        25,
      );
      // 우리 DB에 이미 있는 external_id 제외
      const externalIds = uploads.map((u) => u.videoId);
      const { data: existing } = await admin
        .from("sns_contents")
        .select("external_id")
        .eq("user_id", ch.user_id)
        .eq("platform", "youtube")
        .in("external_id", externalIds);
      const existingSet = new Set((existing ?? []).map((e) => e.external_id));

      const newOnes = uploads.filter((u) => !existingSet.has(u.videoId));

      for (const v of newOnes) {
        // short_id 충돌 회피 (5회 시도)
        let shortId = "";
        for (let i = 0; i < 5; i++) {
          const candidate = generateShortId(7);
          const { data: c } = await admin
            .from("sns_contents")
            .select("id")
            .eq("short_id", candidate)
            .maybeSingle();
          if (!c) {
            shortId = candidate;
            break;
          }
        }
        if (!shortId) continue;

        const destination =
          ch.default_destination_url || `https://www.youtube.com/watch?v=${v.videoId}`;

        await admin.from("sns_contents").insert({
          user_id: ch.user_id,
          platform: "youtube",
          title: v.title,
          content_url: `https://www.youtube.com/watch?v=${v.videoId}`,
          thumbnail_url: v.thumbnailUrl,
          external_id: v.videoId,
          posted_at: v.publishedAt,
          short_id: shortId,
          destination_url: destination,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          auto_synced: true,
          views_synced_at: new Date().toISOString(),
        });
        totalNew += 1;
      }

      // 기존 콘텐츠 views_sync도 같이 (auto_synced 한정)
      for (const u of uploads) {
        await admin
          .from("sns_contents")
          .update({
            views: u.views,
            likes: u.likes,
            comments: u.comments,
            views_synced_at: new Date().toISOString(),
          })
          .eq("user_id", ch.user_id)
          .eq("platform", "youtube")
          .eq("external_id", u.videoId)
          .eq("auto_synced", true);
      }

      await admin
        .from("sns_yt_channels")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", ch.id);
    } catch (e) {
      errors.push({
        channelId: ch.channel_id,
        error: e instanceof Error ? e.message : "오류",
      });
    }
  }

  return NextResponse.json({
    channelsProcessed: rows.length,
    newVideos: totalNew,
    errors,
    syncedAt: new Date().toISOString(),
  });
}
