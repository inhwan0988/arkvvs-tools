import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SpreadPlatform } from "@/lib/tools/spread/types";

export const runtime = "nodejs";

/**
 * 예약 게시 — 즉시 게시 대신 scheduled_at에 큐 등록.
 * cron이 1분 간격으로 picking.
 *
 * Body: caption, variants, targetPlatforms, scheduledAt(ISO), perPlatformCaption?, trackingDestination?, category?, evergreen?
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
    targetPlatforms: SpreadPlatform[];
    scheduledAt: string;
    perPlatformCaption?: Record<string, string>;
    trackingDestination?: string;
    category?: string;
    evergreen?: boolean;
  };

  if (!body.scheduledAt) {
    return NextResponse.json({ error: "scheduledAt 필수" }, { status: 400 });
  }
  const ts = new Date(body.scheduledAt).getTime();
  if (Number.isNaN(ts) || ts < Date.now() + 30_000) {
    return NextResponse.json(
      { error: "예약 시각은 30초 이후여야 합니다" },
      { status: 400 },
    );
  }
  if (!body.targetPlatforms || body.targetPlatforms.length === 0) {
    return NextResponse.json({ error: "platforms 1개 이상" }, { status: 400 });
  }

  // sns-tracker 단축 URL 자동 생성은 cron에서 처리 (메타 보존)
  const { data, error } = await supabase
    .from("spread_posts")
    .insert({
      user_id: user.id,
      caption: body.caption,
      media_urls: body.variants ? Object.values(body.variants) : null,
      per_platform_caption: body.perPlatformCaption ?? null,
      target_platforms: body.targetPlatforms,
      status: "scheduled",
      scheduled_at: new Date(ts).toISOString(),
      category: body.category ?? null,
      evergreen: !!body.evergreen,
      results: body.variants
        ? { _variants: body.variants, _trackingDestination: body.trackingDestination ?? null }
        : { _trackingDestination: body.trackingDestination ?? null },
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
