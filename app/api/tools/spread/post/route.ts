import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  postToFacebookPage,
  postToInstagram,
  postToThreads,
} from "@/lib/tools/spread/post-meta";
import { PLATFORM_RATIO } from "@/lib/tools/spread/image-transform";
import type { SpreadPlatform } from "@/lib/tools/spread/types";
import { generateShortId } from "@/lib/tools/sns-tracker/shortid";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 즉시 multi-platform 게시 (Phase 2).
 *
 * Body:
 *   caption: string
 *   variants?: Record<"1:1"|"4:5"|"9:16"|"16:9", string>   // /upload 응답 — 플랫폼별 권장 비율 자동 선택
 *   imageUrl?: string                                       // 또는 단일 URL
 *   targetPlatforms: SpreadPlatform[]
 *   perPlatformCaption?: Record<SpreadPlatform, string>
 *   trackingDestination?: string                            // 있으면 sns-tracker 단축 URL 자동 생성 + caption에 부착
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = (await req.json()) as {
    caption: string;
    variants?: Record<string, string>;
    imageUrl?: string;
    targetPlatforms: SpreadPlatform[];
    perPlatformCaption?: Record<string, string>;
    trackingDestination?: string;
  };

  if (!body.caption?.trim() && !body.imageUrl && !body.variants) {
    return NextResponse.json(
      { error: "caption 또는 이미지 중 하나는 필요해요" },
      { status: 400 },
    );
  }
  if (!body.targetPlatforms || body.targetPlatforms.length === 0) {
    return NextResponse.json({ error: "최소 1개 플랫폼 선택" }, { status: 400 });
  }

  // ━ sns-tracker 단축 URL 자동 생성 (trackingDestination 있을 때) ━
  let shortId: string | null = null;
  let shortUrl: string | null = null;
  if (
    body.trackingDestination &&
    /^https?:\/\//.test(body.trackingDestination)
  ) {
    for (let i = 0; i < 5; i++) {
      const candidate = generateShortId(7);
      const { data: exists } = await supabase
        .from("sns_contents")
        .select("id")
        .eq("short_id", candidate)
        .maybeSingle();
      if (!exists) {
        shortId = candidate;
        break;
      }
    }
    if (shortId) {
      let title = body.caption?.slice(0, 80) || "Spread post";
      try {
        title = new URL(body.trackingDestination).hostname;
      } catch {}
      await supabase.from("sns_contents").insert({
        user_id: user.id,
        platform: "etc",
        title,
        posted_at: new Date().toISOString(),
        short_id: shortId,
        destination_url: body.trackingDestination,
        views: 0,
      });
      const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      shortUrl = `${baseUrl}/r/${shortId}`;
    }
  }

  // 본인 connections fetch
  const { data: conns, error } = await supabase
    .from("social_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .in("platform", body.targetPlatforms);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!conns || conns.length === 0) {
    return NextResponse.json(
      { error: "선택한 플랫폼에 연결된 계정이 없어요" },
      { status: 400 },
    );
  }

  const results: Record<
    string,
    { ok: boolean; post_id?: string; url?: string; error?: string }
  > = {};

  await Promise.all(
    conns.map(async (c) => {
      let captionForPlatform =
        body.perPlatformCaption?.[c.platform] ?? body.caption ?? "";
      // 단축 URL 자동 부착
      if (shortUrl && !captionForPlatform.includes(shortUrl)) {
        captionForPlatform = captionForPlatform + `\n\n→ ${shortUrl}`;
      }

      // 플랫폼별 권장 비율의 이미지 선택
      let imageUrl = body.imageUrl;
      if (body.variants) {
        const ratio = PLATFORM_RATIO[c.platform];
        imageUrl =
          (ratio && body.variants[ratio]) ??
          body.variants["1:1"] ??
          body.imageUrl;
      }

      let result;
      switch (c.platform as SpreadPlatform) {
        case "facebook_page":
          result = await postToFacebookPage({
            pageId: c.external_id,
            pageAccessToken: c.fb_page_access_token ?? c.access_token,
            caption: captionForPlatform,
            imageUrl,
          });
          break;
        case "instagram_business":
          if (!imageUrl) {
            result = { ok: false, error: "Instagram은 이미지가 필요해요" };
          } else {
            result = await postToInstagram({
              igUserId: c.external_id,
              pageAccessToken: c.fb_page_access_token ?? c.access_token,
              caption: captionForPlatform,
              imageUrl,
            });
          }
          break;
        case "threads":
          result = await postToThreads({
            threadsUserId: c.external_id,
            accessToken: c.access_token,
            text: captionForPlatform,
            imageUrl,
          });
          break;
        default:
          result = { ok: false, error: `${c.platform}은 아직 미지원` };
      }
      results[`${c.platform}:${c.external_id}`] = result;
      if (result.ok) {
        await supabase
          .from("social_connections")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", c.id);
      }
    }),
  );

  const okAll = Object.values(results).every((r) => r.ok);
  const failAll = Object.values(results).every((r) => !r.ok);
  const status = okAll ? "posted" : failAll ? "failed" : "partial_failed";

  await supabase.from("spread_posts").insert({
    user_id: user.id,
    caption: body.caption,
    media_urls: body.variants
      ? Object.values(body.variants)
      : body.imageUrl
        ? [body.imageUrl]
        : null,
    per_platform_caption: body.perPlatformCaption ?? null,
    target_platforms: body.targetPlatforms,
    status,
    posted_at: new Date().toISOString(),
    results,
    short_id: shortId,
  });

  return NextResponse.json({ status, results, shortId, shortUrl });
}
