import { parseDuration } from "./utils";
import type {
  ChannelSize,
  Period,
  SearchFilters,
  VideoFormat,
  VideoResult,
} from "./types";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

// 후보 풀 설정 — 정렬 2가지(relevance, date) × 페이지 N × 50
// 일반 검색: 페이지 2 → 4 calls = 400 units → 일 ~25회 (키 1개 기준)
// 심층 검색(deepSearch=true): 페이지 5 → 10 calls = 1,000 units → 일 ~10회
// 키 여러 개 등록 시: 첫 키 quota 소진되면 다음 키로 자동 로테이션
const SORT_ORDERS: ("relevance" | "date")[] = ["relevance", "date"];
const PAGES_NORMAL = 2;
const PAGES_DEEP = 5;
const RESULTS_PER_PAGE = 50;
const RETURN_TOP_N = 30;

// YouTube videoDuration 매핑: short = <4분, medium = 4~20분, long = >20분
const DURATIONS_BY_FORMAT: Record<VideoFormat, (string | undefined)[]> = {
  all: [undefined],
  shorts: ["short"],
  long: ["medium"],
};

interface SearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      maxres?: { url: string };
    };
    publishedAt: string;
  };
}

interface SearchResponse {
  items?: SearchItem[];
  nextPageToken?: string;
}

interface VideoItem {
  id: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: { duration?: string; caption?: string };
}

interface ChannelItem {
  id: string;
  statistics?: { subscriberCount?: string };
}

const CHANNEL_SIZE_RANGE: Record<ChannelSize, [number, number]> = {
  all: [0, Number.MAX_SAFE_INTEGER],
  small: [0, 100_000],
  medium: [100_000, 1_000_000],
  large: [1_000_000, Number.MAX_SAFE_INTEGER],
};

const PERIOD_DAYS: Record<Period, number | null> = {
  all: null,
  "6m": 183,
  "1y": 365,
};

function recencyMult(publishedAt: string): number {
  const pub = Date.parse(publishedAt);
  if (Number.isNaN(pub)) return 1.0;
  const daysAgo = (Date.now() - pub) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 90) return 1.5;
  if (daysAgo <= 180) return 1.2;
  if (daysAgo <= 365) return 1.1;
  return 1.0;
}

/**
 * 참여도 가중치: (좋아요 + 댓글*2) / 조회수 → 5배 증폭, 최대 +1.0 (즉 ×1.0~×2.0)
 * 일반적인 영상 1~3% engagement → ×1.05~×1.15
 * 강한 영상 5~10% → ×1.25~×1.5
 * 폭발 영상 10%+ → 최대 ×2.0 캡
 */
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

interface YouTubeErrorBody {
  error?: {
    code?: number;
    message?: string;
    errors?: { reason?: string; message?: string }[];
  };
}

function parseYouTubeApiError(status: number, body: string): string {
  let parsed: YouTubeErrorBody | null = null;
  try {
    parsed = JSON.parse(body) as YouTubeErrorBody;
  } catch {
    // ignore
  }
  const reason = parsed?.error?.errors?.[0]?.reason;
  const apiMsg = parsed?.error?.message ?? "";

  if (status === 403) {
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      return "오늘 YouTube API 일일 한도(10,000 units)를 모두 사용했어요. 한국시간 오후 4~5시경 자동 초기화됩니다. 또는 다른 Google Cloud 프로젝트에서 새 키를 발급받아 사용해주세요.";
    }
    if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded") {
      return "잠깐 사이 요청이 너무 많았어요. 30초~1분 후 다시 시도해주세요.";
    }
    if (reason === "keyInvalid") {
      return "YouTube API 키가 잘못되었어요. 우측 상단 키 입력칸에서 다시 확인해주세요.";
    }
    if (reason === "accessNotConfigured") {
      return "이 키의 Google Cloud 프로젝트에 YouTube Data API v3가 활성화되어 있지 않아요. 콘솔에서 해당 API를 사용 설정한 뒤 다시 시도해주세요.";
    }
    if (reason === "ipRefererBlocked") {
      return "키에 IP/Referer 제한이 걸려있어요. Google Cloud Console → 사용자 인증 정보 → 해당 키의 제한사항을 확인해주세요.";
    }
    return `YouTube API 접근 거부 (403)${apiMsg ? `: ${apiMsg.slice(0, 150)}` : ""}`;
  }

  if (status === 400) {
    if (reason === "badRequest") {
      return "검색 요청이 잘못되었어요. 키 형식을 다시 확인해주세요.";
    }
    return `검색 요청 오류 (400)${apiMsg ? `: ${apiMsg.slice(0, 150)}` : ""}`;
  }

  return `YouTube API 오류 (${status})${apiMsg ? `: ${apiMsg.slice(0, 150)}` : ""}`;
}

async function fetchSearchPage(
  apiKey: string,
  keyword: string,
  order: "relevance" | "date",
  duration: string | undefined,
  publishedAfter: string | undefined,
  pageToken?: string,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    part: "snippet",
    q: keyword,
    type: "video",
    maxResults: String(RESULTS_PER_PAGE),
    order,
    regionCode: "KR",
    relevanceLanguage: "ko",
    key: apiKey,
  });
  if (duration) params.set("videoDuration", duration);
  if (publishedAfter) params.set("publishedAfter", publishedAfter);
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${BASE_URL}/search?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(parseYouTubeApiError(res.status, body));
  }
  return (await res.json()) as SearchResponse;
}

async function chunkedFetch<T>(
  ids: string[],
  fetcher: (chunk: string[]) => Promise<T[]>,
  chunkSize = 50,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      out.push(...(await fetcher(chunk)));
    } catch {
      // 청크 단위 실패는 스킵
    }
  }
  return out;
}

/**
 * 키가 여러 개면 차례로 시도 — quota/rate-limit 에러 시 다음 키로 fallback.
 * 그 외 에러(키 무효, 네트워크 등)는 즉시 throw.
 */
export async function searchVideos(
  apiKeys: string | string[],
  keyword: string,
  filters: SearchFilters,
): Promise<VideoResult[]> {
  const keys = (Array.isArray(apiKeys) ? apiKeys : [apiKeys])
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    throw new Error("YouTube API 키가 필요합니다.");
  }

  let lastErr: Error | null = null;
  for (let i = 0; i < keys.length; i++) {
    try {
      return await searchWithSingleKey(keys[i], keyword, filters);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const msg = lastErr.message;
      const isQuotaErr =
        msg.includes("일일 한도") ||
        msg.includes("요청이 너무 많았") ||
        msg.includes("quotaExceeded") ||
        msg.includes("rateLimitExceeded");
      if (isQuotaErr && i < keys.length - 1) {
        // 다음 키로 시도
        continue;
      }
      // 키 무효·설정 문제·네트워크 등 → 즉시 throw
      // 또는 마지막 키까지 quota 소진 → 마지막 에러 throw
      throw lastErr;
    }
  }
  throw lastErr ?? new Error("등록된 모든 YouTube 키가 quota 초과 상태입니다.");
}

async function searchWithSingleKey(
  apiKey: string,
  keyword: string,
  filters: SearchFilters,
): Promise<VideoResult[]> {
  // ─── 1) 후보 풀 수집 ─────────────────────────────────
  // publishedAfter: 기간 필터가 있을 때 search.list 단계에서 미리 컷 → 같은 quota로 더 알찬 풀
  const periodDaysForSearch = PERIOD_DAYS[filters.period];
  const publishedAfter = periodDaysForSearch
    ? new Date(Date.now() - periodDaysForSearch * 24 * 60 * 60 * 1000).toISOString()
    : undefined;
  const pagesPerSort = filters.deepSearch ? PAGES_DEEP : PAGES_NORMAL;
  const dedupedItems = new Map<string, SearchItem>();
  const durations = DURATIONS_BY_FORMAT[filters.videoFormat];
  let hadAnySuccess = false;
  outer: for (const order of SORT_ORDERS) {
    for (const duration of durations) {
      let pageToken: string | undefined = undefined;
      for (let page = 0; page < pagesPerSort; page++) {
        let resp: SearchResponse;
        try {
          resp = await fetchSearchPage(
            apiKey,
            keyword,
            order,
            duration,
            publishedAfter,
            pageToken,
          );
        } catch (err) {
          // 첫 호출부터 실패 → 키/quota 문제. 친절한 메시지로 즉시 throw
          if (!hadAnySuccess) throw err;
          // 부분 성공 후 실패 → 가져온 결과는 보존하고 종료
          break outer;
        }
        hadAnySuccess = true;
        for (const item of resp.items ?? []) {
          if (item.id?.videoId && !dedupedItems.has(item.id.videoId)) {
            dedupedItems.set(item.id.videoId, item);
          }
        }
        if (!resp.nextPageToken) break;
        pageToken = resp.nextPageToken;
      }
    }
  }
  if (dedupedItems.size === 0) return [];

  const items = [...dedupedItems.values()];
  const videoIds = items.map((i) => i.id.videoId);
  const channelIds = [...new Set(items.map((i) => i.snippet.channelId))];

  // ─── 2) 영상 통계 + 채널 구독자 (배치) ───────────────
  const videoItems = await chunkedFetch<VideoItem>(videoIds, async (chunk) => {
    const r = await fetch(
      `${BASE_URL}/videos?part=statistics,contentDetails&id=${chunk.join(",")}&key=${apiKey}`,
    );
    if (!r.ok) return [];
    const d = (await r.json()) as { items?: VideoItem[] };
    return d.items ?? [];
  });
  const videoMap = new Map<string, VideoItem>();
  for (const v of videoItems) videoMap.set(v.id, v);

  const channelItems = await chunkedFetch<ChannelItem>(
    channelIds,
    async (chunk) => {
      const r = await fetch(
        `${BASE_URL}/channels?part=statistics&id=${chunk.join(",")}&key=${apiKey}`,
      );
      if (!r.ok) return [];
      const d = (await r.json()) as { items?: ChannelItem[] };
      return d.items ?? [];
    },
  );
  const subsMap = new Map<string, number>();
  for (const c of channelItems) {
    subsMap.set(c.id, parseInt(c.statistics?.subscriberCount ?? "0", 10) || 0);
  }

  // ─── 3) 필터링 + 점수 계산 ──────────────────────────
  const periodDays = PERIOD_DAYS[filters.period];
  const cutoff = periodDays
    ? Date.now() - periodDays * 24 * 60 * 60 * 1000
    : null;
  const [sizeMin, sizeMax] = CHANNEL_SIZE_RANGE[filters.channelSize];

  const results: VideoResult[] = [];
  for (const item of items) {
    const videoId = item.id.videoId;
    const v = videoMap.get(videoId);
    if (!v) continue;

    const subs = subsMap.get(item.snippet.channelId) ?? 0;
    const views = parseInt(v.statistics?.viewCount ?? "0", 10) || 0;
    const likes = parseInt(v.statistics?.likeCount ?? "0", 10) || 0;
    const comments = parseInt(v.statistics?.commentCount ?? "0", 10) || 0;
    const durationSec = parseDuration(v.contentDetails?.duration ?? "PT0S");
    const hasCaption = v.contentDetails?.caption === "true";
    const titleLower = item.snippet.title.toLowerCase();
    // YouTube 쇼츠 기준: 180초(3분) 이하. 제목 해시태그도 보조 신호로 사용.
    // 길이 정보가 0(=API가 못 돌려준 경우)이면 제목 해시태그만으로 판정.
    const isShorts =
      (durationSec > 0 && durationSec <= 180) ||
      titleLower.includes("#shorts") ||
      titleLower.includes("#쇼츠");

    if (views < filters.minViews) continue;
    if (subs < sizeMin || subs >= sizeMax) continue;
    if (cutoff !== null) {
      const pub = Date.parse(item.snippet.publishedAt);
      if (Number.isNaN(pub) || pub < cutoff) continue;
    }
    // 영상 형식 server-side 후처리 (videoDuration 파라미터의 4분 경계와 우리 정의 180초가 어긋나므로 재확인)
    if (filters.videoFormat === "shorts" && !isShorts) continue;
    if (filters.videoFormat === "long" && isShorts) continue;

    const vvs = subs > 0 ? views / subs : 0;
    const recMult = recencyMult(item.snippet.publishedAt);
    const eng = engagementMultiplier(likes, comments, views);
    const score =
      Math.round(vvs * recMult * eng.mult * 100) / 100;

    const thumb =
      item.snippet.thumbnails.maxres?.url ??
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      "";

    results.push({
      videoId,
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
      engagementRate: Math.round(eng.rate * 10000) / 100, // 백분율, 소수 둘째자리
      engagementMult: Math.round(eng.mult * 100) / 100,
      recencyMult: recMult,
      score,
      durationSec,
      isShorts,
      hasCaption,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, RETURN_TOP_N);
}
