import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SpreadPlatform } from "@/lib/tools/spread/types";
import { BULK_MAX_ROWS, type BulkRow } from "@/lib/tools/spread/bulk-csv";

export const runtime = "nodejs";

/**
 * 벌크 예약 게시 — CSV로 파싱된 rows[]를 한 번에 spread_posts에 insert.
 * Body: { rows: BulkRow[], targetPlatforms: SpreadPlatform[], category?, evergreen? }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = (await req.json()) as {
    rows: BulkRow[];
    targetPlatforms: SpreadPlatform[];
    category?: string;
    evergreen?: boolean;
  };

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "rows 필요" }, { status: 400 });
  }
  if (body.rows.length > BULK_MAX_ROWS) {
    return NextResponse.json(
      { error: `한 번에 최대 ${BULK_MAX_ROWS}개까지 가능` },
      { status: 400 },
    );
  }
  if (!body.targetPlatforms || body.targetPlatforms.length === 0) {
    return NextResponse.json({ error: "platforms 1개 이상" }, { status: 400 });
  }

  const now = Date.now();
  const records = body.rows.map((r) => {
    const ts = new Date(r.scheduledAt).getTime();
    const scheduledAt =
      Number.isFinite(ts) && ts > now + 30_000
        ? new Date(ts).toISOString()
        : new Date(now + 60_000).toISOString();

    // 이미지/영상 URL 병합 (media_urls는 string[])
    const media: string[] = [];
    for (const u of r.imageUrls) media.push(u);
    if (r.videoUrl) media.push(r.videoUrl);

    return {
      user_id: user.id,
      caption: r.caption || null,
      media_urls: media.length > 0 ? media : null,
      per_platform_caption: null,
      target_platforms: body.targetPlatforms,
      status: "scheduled" as const,
      scheduled_at: scheduledAt,
      category: body.category ?? null,
      evergreen: !!body.evergreen,
      results: {
        _trackingDestination: r.link || null,
        _bulk: true,
      },
    };
  });

  const { data, error } = await supabase
    .from("spread_posts")
    .insert(records)
    .select("id, scheduled_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, posts: data });
}
