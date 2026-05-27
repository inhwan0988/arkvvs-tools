import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  postToFacebookPage,
  postToInstagram,
  postToThreads,
} from "@/lib/tools/spread/post-meta";
import type { SpreadPlatform } from "@/lib/tools/spread/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 즉시 게시 (multi-platform).
 *
 * Body: {
 *   caption: string,
 *   imageUrl?: string,             // Supabase Storage public url 또는 외부 URL
 *   targetPlatforms: SpreadPlatform[],
 *   perPlatformCaption?: Record<SpreadPlatform, string>
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = (await req.json()) as {
    caption: string;
    imageUrl?: string;
    targetPlatforms: SpreadPlatform[];
    perPlatformCaption?: Record<string, string>;
  };

  if (!body.caption?.trim() && !body.imageUrl) {
    return NextResponse.json(
      { error: "caption 또는 imageUrl 중 하나는 필요해요" },
      { status: 400 },
    );
  }
  if (!body.targetPlatforms || body.targetPlatforms.length === 0) {
    return NextResponse.json(
      { error: "최소 1개 플랫폼 선택" },
      { status: 400 },
    );
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

  const results: Record<string, { ok: boolean; post_id?: string; url?: string; error?: string }> = {};

  // 각 connection에 대해 게시 (병렬)
  await Promise.all(
    conns.map(async (c) => {
      const captionForPlatform =
        body.perPlatformCaption?.[c.platform] ?? body.caption;
      let result;
      switch (c.platform as SpreadPlatform) {
        case "facebook_page":
          result = await postToFacebookPage({
            pageId: c.external_id,
            pageAccessToken: c.fb_page_access_token ?? c.access_token,
            caption: captionForPlatform,
            imageUrl: body.imageUrl,
          });
          break;
        case "instagram_business":
          if (!body.imageUrl) {
            result = { ok: false, error: "Instagram은 이미지가 필요해요" };
          } else {
            result = await postToInstagram({
              igUserId: c.external_id,
              pageAccessToken: c.fb_page_access_token ?? c.access_token,
              caption: captionForPlatform,
              imageUrl: body.imageUrl,
            });
          }
          break;
        case "threads":
          result = await postToThreads({
            threadsUserId: c.external_id,
            accessToken: c.access_token,
            text: captionForPlatform,
            imageUrl: body.imageUrl,
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

  // 게시 기록 저장
  const okAll = Object.values(results).every((r) => r.ok);
  const failAll = Object.values(results).every((r) => !r.ok);
  const status = okAll ? "posted" : failAll ? "failed" : "partial_failed";

  await supabase.from("spread_posts").insert({
    user_id: user.id,
    caption: body.caption,
    media_urls: body.imageUrl ? [body.imageUrl] : null,
    per_platform_caption: body.perPlatformCaption ?? null,
    target_platforms: body.targetPlatforms,
    status,
    posted_at: new Date().toISOString(),
    results,
  });

  return NextResponse.json({ status, results });
}
