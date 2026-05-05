import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchFilters, VideoResult } from "./types";

// 캐시 키: 키워드(소문자·trim) + 모든 필터를 결정적 직렬화
export function buildCacheKey(
  keyword: string,
  filters: SearchFilters,
): string {
  const k = keyword.trim().toLowerCase();
  // 필드 순서를 고정해 결정적 출력 보장
  const f = [
    `p=${filters.period}`,
    `mv=${filters.minViews}`,
    `cs=${filters.channelSize}`,
    `vf=${filters.videoFormat}`,
    `ds=${filters.deepSearch ? 1 : 0}`,
  ].join("&");
  return `vvs:${k}::${f}`;
}

const TTL_HOURS = 24;

export async function readCache(
  supabase: SupabaseClient,
  cacheKey: string,
): Promise<VideoResult[] | null> {
  const { data, error } = await supabase
    .from("vvs_search_cache")
    .select("result, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.result as VideoResult[];
}

export async function writeCache(
  supabase: SupabaseClient,
  cacheKey: string,
  videos: VideoResult[],
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();
  // upsert로 동일 키 덮어쓰기
  await supabase.from("vvs_search_cache").upsert(
    {
      cache_key: cacheKey,
      result: videos,
      expires_at: expiresAt,
    },
    { onConflict: "cache_key" },
  );
}
