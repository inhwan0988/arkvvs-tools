/**
 * YouTube 자동 조회수 sync.
 * 콘텐츠의 content_url이 youtube.com / youtu.be 면 videoId 추출 →
 * YouTube Data API videos.list로 viewCount/likeCount/commentCount 일괄 fetch.
 */

const BASE_URL = "https://www.googleapis.com/youtube/v3";

export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      // /watch?v=ID
      const v = u.searchParams.get("v");
      if (v) return v;
      // /shorts/ID
      const m = u.pathname.match(/\/shorts\/([\w-]+)/);
      if (m) return m[1];
      // /embed/ID
      const m2 = u.pathname.match(/\/embed\/([\w-]+)/);
      if (m2) return m2[1];
    }
    return null;
  } catch {
    return null;
  }
}

export interface YoutubeStats {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
}

/**
 * videoIds를 50개씩 chunk로 나눠 videos.list 호출.
 * Quota: 호출당 1 unit (statistics part).
 */
export async function fetchYoutubeStats(
  videoIds: string[],
  apiKey: string,
): Promise<Map<string, YoutubeStats>> {
  const result = new Map<string, YoutubeStats>();
  const chunks: string[][] = [];
  const ids = [...new Set(videoIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

  for (const chunk of chunks) {
    const url = `${BASE_URL}/videos?part=statistics&id=${chunk.join(",")}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`YouTube API ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }>;
    };
    for (const item of data.items ?? []) {
      result.set(item.id, {
        videoId: item.id,
        views: parseInt(item.statistics?.viewCount ?? "0", 10) || 0,
        likes: parseInt(item.statistics?.likeCount ?? "0", 10) || 0,
        comments: parseInt(item.statistics?.commentCount ?? "0", 10) || 0,
      });
    }
  }
  return result;
}
