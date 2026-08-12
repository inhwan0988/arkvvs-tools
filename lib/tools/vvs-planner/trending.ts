import { parseDuration } from "./utils";
import type { VideoResult } from "./types";

/**
 * 이번주 인기 영상 — 검색 없이 첫 화면 노출용.
 *
 * videos.list?chart=mostPopular 사용 → 1 unit per call (search.list는 100)
 * 채널 통계 추가로 붙여 VVS/score 계산 → 같은 스코어링 로직
 * 최근 7일 게시 + VVS 높은 순 정렬.
 */

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const VVS_SMOOTHING_K = 100;
const NOISE_FLOOR_MIN_VIEWS = 1000;
const NOISE_FLOOR_MIN_SUBS = 100;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface PopularVideoItem {
  id: string;
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      maxres?: { url: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: { duration?: string; caption?: string };
}

interface ChannelStat {
  id: string;
  statistics?: { subscriberCount?: string };
}

function recencyMult(publishedAt: string): number {
  const pub = Date.parse(publishedAt);
  if (Number.isNaN(pub)) return 1.0;
  const daysAgo = (Date.now() - pub) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 7) return 1.7;
  if (daysAgo <= 30) return 1.5;
  if (daysAgo <= 90) return 1.3;
  return 1.0;
}

function engagementMultiplier(
  likes: number,
  comments: number,
  views: number,
): { rate: number; mult: number } {
  if (views <= 0) return { rate: 0, mult: 1 };
  const rate = (likes + comments * 2) / views;
  const mult = Math.min(1 + rate * 5, 2);
  return { rate, mult };
}

/**
 * 여러 키 순회하며 첫 성공만 반환. quota 소진 등 실패 시 다음 키.
 */
async function fetchWithRotation<T>(
  apiKeys: string[],
  fn: (key: string) => Promise<T>,
): Promise<T> {
  let lastErr: unknown;
  for (const key of apiKeys) {
    try {
      return await fn(key);
    } catch (e) {
      lastErr = e;
      const msg = String(e);
      if (/quota|403/i.test(msg)) continue;
      throw e;
    }
  }
  throw lastErr ?? new Error("모든 YouTube API 키에서 실패");
}

async function fetchMostPopular(
  apiKey: string,
  regionCode: string,
  maxResults: number,
): Promise<PopularVideoItem[]> {
  const url = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { items?: PopularVideoItem[] };
  return data.items ?? [];
}

async function fetchChannelSubs(
  apiKey: string,
  channelIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  // chunks of 50 (channels.list max)
  for (let i = 0; i < channelIds.length; i += 50) {
    const chunk = channelIds.slice(i, i + 50);
    const url = `${BASE_URL}/channels?part=statistics&id=${chunk.join(",")}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as { items?: ChannelStat[] };
    for (const c of data.items ?? []) {
      map.set(
        c.id,
        parseInt(c.statistics?.subscriberCount ?? "0", 10) || 0,
      );
    }
  }
  return map;
}

/**
 * 이번주(7일) 게시된 인기 영상 중 VVS score 높은 순.
 * 총 quota: videos.list 1 + channels.list 1 = 2 units per call. 매우 저렴.
 */
export async function fetchTrending(
  apiKeys: string[],
  opts?: { regionCode?: string; limit?: number },
): Promise<VideoResult[]> {
  const region = opts?.regionCode ?? "KR";
  const limit = opts?.limit ?? 20;

  const items = await fetchWithRotation(apiKeys, (k) =>
    fetchMostPopular(k, region, 50),
  );
  if (items.length === 0) return [];

  const channelIds = [...new Set(items.map((v) => v.snippet.channelId))];
  const subsMap = await fetchWithRotation(apiKeys, (k) =>
    fetchChannelSubs(k, channelIds),
  );

  const cutoff = Date.now() - WEEK_MS;
  const results: VideoResult[] = [];
  for (const item of items) {
    const pubTs = Date.parse(item.snippet.publishedAt);
    if (Number.isNaN(pubTs) || pubTs < cutoff) continue;

    const subs = subsMap.get(item.snippet.channelId) ?? 0;
    const views = parseInt(item.statistics?.viewCount ?? "0", 10) || 0;
    const likes = parseInt(item.statistics?.likeCount ?? "0", 10) || 0;
    const comments = parseInt(item.statistics?.commentCount ?? "0", 10) || 0;
    const durationSec = parseDuration(item.contentDetails?.duration ?? "PT0S");
    const hasCaption = item.contentDetails?.caption === "true";
    const titleLower = item.snippet.title.toLowerCase();
    const isShorts =
      (durationSec > 0 && durationSec <= 180) ||
      titleLower.includes("#shorts") ||
      titleLower.includes("#쇼츠");

    if (views < NOISE_FLOOR_MIN_VIEWS) continue;
    if (subs < NOISE_FLOOR_MIN_SUBS) continue;

    const vvs = subs > 0 ? views / subs : 0;
    const vvsSmoothed = views / (subs + VVS_SMOOTHING_K);
    const recMult = recencyMult(item.snippet.publishedAt);
    const eng = engagementMultiplier(likes, comments, views);
    const score = Math.round(vvsSmoothed * recMult * eng.mult * 100) / 100;

    const thumb =
      item.snippet.thumbnails.maxres?.url ??
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      "";

    results.push({
      videoId: item.id,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      thumbnail: thumb,
      publishedAt: item.snippet.publishedAt,
      viewCount: views,
      subscriberCount: subs,
      likeCount: likes,
      commentCount: comments,
      vvs: Math.round(vvs * 100) / 100,
      engagementRate: Math.round(eng.rate * 10000) / 100,
      engagementMult: Math.round(eng.mult * 100) / 100,
      recencyMult: recMult,
      score,
      durationSec,
      isShorts,
      hasCaption,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
