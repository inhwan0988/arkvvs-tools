import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import {
  postToFacebookPage,
  postToInstagram,
  postToThreads,
} from "@/lib/tools/spread/post-meta";
import { PLATFORM_RATIO } from "@/lib/tools/spread/image-transform";
import { generateShortId } from "@/lib/tools/sns-tracker/shortid";
import type { SpreadPlatform } from "@/lib/tools/spread/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * 1분마다 실행 — scheduled_at <= now인 'scheduled' 게시물을 picking 후 즉시 게시.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSnsAdminClient();
  const now = new Date().toISOString();

  // 처리할 게시물 가져오기
  const { data: posts, error } = await admin
    .from("spread_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const post of posts ?? []) {
    // 작업 시작 — race condition 회피
    const { error: upErr } = await admin
      .from("spread_posts")
      .update({ status: "posting" })
      .eq("id", post.id)
      .eq("status", "scheduled"); // optimistic
    if (upErr) continue;

    processed += 1;

    try {
      // 사용자 connections 조회
      const { data: conns } = await admin
        .from("social_connections")
        .select("*")
        .eq("user_id", post.user_id)
        .eq("enabled", true)
        .in("platform", post.target_platforms);

      if (!conns || conns.length === 0) {
        await admin
          .from("spread_posts")
          .update({
            status: "failed",
            results: { error: "no enabled connections" },
          })
          .eq("id", post.id);
        failed += 1;
        continue;
      }

      // tracking
      const variantsFromResults = (post.results as { _variants?: Record<string, string>; _trackingDestination?: string | null } | null) || {};
      const variants = variantsFromResults._variants;
      const trackingDestination = variantsFromResults._trackingDestination;

      let shortId: string | null = null;
      let shortUrl: string | null = null;
      if (trackingDestination && /^https?:\/\//.test(trackingDestination)) {
        for (let i = 0; i < 5; i++) {
          const candidate = generateShortId(7);
          const { data: ex } = await admin
            .from("sns_contents")
            .select("id")
            .eq("short_id", candidate)
            .maybeSingle();
          if (!ex) {
            shortId = candidate;
            break;
          }
        }
        if (shortId) {
          let title = post.caption?.slice(0, 80) || "Spread scheduled post";
          try {
            title = new URL(trackingDestination).hostname;
          } catch {}
          await admin.from("sns_contents").insert({
            user_id: post.user_id,
            platform: "etc",
            title,
            posted_at: new Date().toISOString(),
            short_id: shortId,
            destination_url: trackingDestination,
            views: 0,
          });
          const baseUrl =
            process.env.APP_BASE_URL ||
            `${req.nextUrl.protocol}//${req.nextUrl.host}`;
          shortUrl = `${baseUrl}/r/${shortId}`;
        }
      }

      const results: Record<string, { ok: boolean; post_id?: string; url?: string; error?: string }> = {};
      const perPlatform = (post.per_platform_caption ?? {}) as Record<string, string>;

      await Promise.all(
        conns.map(async (c) => {
          let captionForPlatform =
            perPlatform[c.platform] ?? post.caption ?? "";
          if (shortUrl && !captionForPlatform.includes(shortUrl)) {
            captionForPlatform = captionForPlatform + `\n\n→ ${shortUrl}`;
          }
          let imageUrl: string | undefined;
          if (variants) {
            const ratio = PLATFORM_RATIO[c.platform];
            imageUrl =
              (ratio && variants[ratio]) ?? variants["1:1"] ?? undefined;
          } else if (post.media_urls && post.media_urls.length > 0) {
            imageUrl = post.media_urls[0];
          }

          let res;
          switch (c.platform as SpreadPlatform) {
            case "facebook_page":
              res = await postToFacebookPage({
                pageId: c.external_id,
                pageAccessToken: c.fb_page_access_token ?? c.access_token,
                caption: captionForPlatform,
                imageUrl,
              });
              break;
            case "instagram_business":
              if (!imageUrl) {
                res = { ok: false, error: "Instagram은 이미지 필요" };
              } else {
                res = await postToInstagram({
                  igUserId: c.external_id,
                  pageAccessToken: c.fb_page_access_token ?? c.access_token,
                  caption: captionForPlatform,
                  imageUrl,
                });
              }
              break;
            case "threads":
              res = await postToThreads({
                threadsUserId: c.external_id,
                accessToken: c.access_token,
                text: captionForPlatform,
                imageUrl,
              });
              break;
            default:
              res = { ok: false, error: `${c.platform}은 미지원` };
          }
          results[`${c.platform}:${c.external_id}`] = res;
        }),
      );

      const okAll = Object.values(results).every((r) => r.ok);
      const failAll = Object.values(results).every((r) => !r.ok);
      const status = okAll ? "posted" : failAll ? "failed" : "partial_failed";

      // evergreen인 경우 다음 cycle 큐에 자동 재등록
      let evergreenNext: string | null = null;
      if (post.evergreen && okAll) {
        // 7일 후 재게시
        evergreenNext = new Date(Date.now() + 7 * 86400_000).toISOString();
      }

      await admin
        .from("spread_posts")
        .update({
          status,
          posted_at: new Date().toISOString(),
          results,
          short_id: shortId,
          ...(evergreenNext ? { scheduled_at: evergreenNext, status: "scheduled" } : {}),
          ...(post.evergreen ? { evergreen_last_at: new Date().toISOString() } : {}),
        })
        .eq("id", post.id);

      if (okAll) succeeded += 1;
      else failed += 1;
    } catch (e) {
      await admin
        .from("spread_posts")
        .update({
          status: "failed",
          results: { error: e instanceof Error ? e.message : "오류" },
        })
        .eq("id", post.id);
      failed += 1;
    }
  }

  return NextResponse.json({
    processed,
    succeeded,
    failed,
    at: now,
  });
}
