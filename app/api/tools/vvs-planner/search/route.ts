import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchVideos } from "@/lib/tools/vvs-planner/youtube";
import {
  buildCacheKey,
  readCache,
  writeCache,
} from "@/lib/tools/vvs-planner/cache";
import type {
  ChannelSize,
  DurationRange,
  Period,
  SearchFilters,
  SortBy,
  VideoFormat,
} from "@/lib/tools/vvs-planner/types";

type Body = {
  keyword?: string;
  youtubeApiKey?: string;
  period?: Period;
  minViews?: number;
  channelSize?: ChannelSize;
  videoFormat?: VideoFormat;
  deepSearch?: boolean;
  bypassCache?: boolean;
  // v3 강화 필터
  minVvs?: number;
  minEngagementRate?: number;
  durationRange?: DurationRange;
  captionsOnly?: boolean;
  excludeKeywords?: string;
  sortBy?: SortBy;
  maxResults?: number;
};

export async function POST(req: NextRequest) {
  // 인증
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status === "banned") {
    return NextResponse.json({ error: "차단된 계정입니다." }, { status: 403 });
  }

  const body = (await req.json()) as Body;
  const keyword = body.keyword?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
  }

  const filters: SearchFilters = {
    period: body.period ?? "all",
    minViews: body.minViews ?? 0,
    channelSize: body.channelSize ?? "all",
    videoFormat: body.videoFormat ?? "all",
    deepSearch: body.deepSearch ?? false,
    // v3 강화
    minVvs: body.minVvs,
    minEngagementRate: body.minEngagementRate,
    durationRange: body.durationRange,
    captionsOnly: body.captionsOnly,
    excludeKeywords: body.excludeKeywords,
    sortBy: body.sortBy,
    maxResults: body.maxResults,
  };

  // ─── 캐시 조회 (24h TTL) ─────────────────────────
  const cacheKey = buildCacheKey(keyword, filters);
  if (!body.bypassCache) {
    const cached = await readCache(supabase, cacheKey);
    if (cached) {
      return NextResponse.json({ videos: cached, cached: true });
    }
  }

  // ─── 캐시 미스 → YouTube API 호출 ────────────────
  // 사용자 키(쉼표/줄바꿈 구분 가능) 우선, 없으면 서버 env (이것도 쉼표 가능)
  const rawKeys = body.youtubeApiKey?.trim() || process.env.YOUTUBE_API_KEY || "";
  const keys = rawKeys
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return NextResponse.json(
      { error: "YouTube API 키가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const videos = await searchVideos(keys, keyword, filters);
    // 결과가 있을 때만 캐시 (빈 결과 캐시는 의미 없음, quota 에러 방지)
    if (videos.length > 0) {
      await writeCache(supabase, cacheKey, videos);
    }
    return NextResponse.json({ videos, cached: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "검색 중 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
