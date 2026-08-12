import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTrending } from "@/lib/tools/vvs-planner/trending";

export const runtime = "nodejs";

/**
 * GET /api/tools/vvs-planner/trending
 *   → 이번주 인기 영상 중 VVS score 높은 순 20개.
 *   → 첫 화면 auto-load 용.
 *
 * quota 비용: videos.list 1 + channels.list 1 = 2 units. 매우 저렴.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rawKeys = process.env.YOUTUBE_API_KEY || "";
  const keys = rawKeys
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    return NextResponse.json(
      { error: "YouTube API 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const videos = await fetchTrending(keys, { regionCode: "KR", limit: 20 });
    return NextResponse.json({ videos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "인기 영상 로딩 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
