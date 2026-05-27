/**
 * YouTube 채널 자동 sync — 사용자가 채널 1번 등록하면 신규 영상이 매일 자동 추가.
 *
 * 흐름:
 *  1. 사용자 입력(@handle / channel URL / channel ID)에서 channelId 추출
 *  2. channels API로 uploads playlist ID + 채널명 가져옴
 *  3. cron(daily): playlistItems로 최근 영상 N개 fetch → 우리 sns_contents에 없으면 INSERT
 *  4. 신규 영상에는 자동 short_id + UTM/QR
 */

const BASE_URL = "https://www.googleapis.com/youtube/v3";

export interface YtChannelRow {
  id: string;
  user_id: string;
  channel_id: string;
  channel_handle: string | null;
  channel_title: string | null;
  uploads_playlist_id: string | null;
  last_synced_at: string | null;
  sync_enabled: boolean;
  default_destination_url: string | null;
}

export interface ChannelInfo {
  channelId: string;
  channelTitle: string;
  uploadsPlaylistId: string;
  handle: string | null;
  thumbnailUrl: string | null;
}

/**
 * 사용자 입력 → channelId 해상도.
 * - 입력 예: `@joshua`, `https://youtube.com/@joshua`, `UC...` 자체, `https://youtube.com/channel/UC...`
 */
export async function resolveChannelId(
  input: string,
  apiKey: string,
): Promise<ChannelInfo> {
  const trimmed = input.trim();

  // 1) 직접 UC... ID
  let channelId: string | null = null;
  if (/^UC[\w-]{20,}$/.test(trimmed)) {
    channelId = trimmed;
  } else {
    // 2) URL에서 추출
    try {
      const u = new URL(trimmed.startsWith("http") ? trimmed : "https://" + trimmed);
      const path = u.pathname;
      const channelMatch = path.match(/\/channel\/(UC[\w-]+)/);
      if (channelMatch) channelId = channelMatch[1];
      // @handle
      const handleMatch = path.match(/\/@([^/?]+)/);
      if (!channelId && handleMatch) {
        const info = await fetchByHandle(handleMatch[1], apiKey);
        return info;
      }
    } catch {
      // not a URL
    }
    // 3) @handle 단독 입력
    if (!channelId && trimmed.startsWith("@")) {
      return await fetchByHandle(trimmed.slice(1), apiKey);
    }
    // 4) handle without @ (예: "arkstudio")
    if (!channelId && /^[\w.-]+$/.test(trimmed)) {
      return await fetchByHandle(trimmed, apiKey);
    }
  }

  if (!channelId) {
    throw new Error(
      "채널 ID를 인식할 수 없어요. @handle, 채널 URL 또는 UC...ID 형식으로 입력해주세요.",
    );
  }
  return await fetchById(channelId, apiKey);
}

async function fetchByHandle(handle: string, apiKey: string): Promise<ChannelInfo> {
  const url = `${BASE_URL}/channels?part=snippet,contentDetails&forHandle=@${encodeURIComponent(handle)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`YouTube API ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as ChannelApiResp;
  if (!data.items?.length) throw new Error(`@${handle} 채널을 찾을 수 없어요.`);
  const ch = data.items[0];
  return {
    channelId: ch.id,
    channelTitle: ch.snippet?.title || "",
    uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads || "",
    handle: ch.snippet?.customUrl || `@${handle}`,
    thumbnailUrl:
      ch.snippet?.thumbnails?.default?.url ??
      ch.snippet?.thumbnails?.medium?.url ??
      null,
  };
}

async function fetchById(channelId: string, apiKey: string): Promise<ChannelInfo> {
  const url = `${BASE_URL}/channels?part=snippet,contentDetails&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`YouTube API ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as ChannelApiResp;
  if (!data.items?.length)
    throw new Error(`채널 ${channelId}를 찾을 수 없어요.`);
  const ch = data.items[0];
  return {
    channelId: ch.id,
    channelTitle: ch.snippet?.title || "",
    uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads || "",
    handle: ch.snippet?.customUrl || null,
    thumbnailUrl:
      ch.snippet?.thumbnails?.default?.url ??
      ch.snippet?.thumbnails?.medium?.url ??
      null,
  };
}

interface ChannelApiResp {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      customUrl?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
      };
    };
    contentDetails?: {
      relatedPlaylists?: { uploads?: string };
    };
  }>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// playlistItems → 영상 list
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UploadVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

export async function fetchRecentUploads(
  uploadsPlaylistId: string,
  apiKey: string,
  max = 25,
): Promise<UploadVideo[]> {
  // 1) playlistItems로 video IDs
  const url = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${max}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`YouTube playlistItems ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: {
          default?: { url?: string };
          medium?: { url?: string };
          high?: { url?: string };
          maxres?: { url?: string };
        };
      };
      contentDetails?: { videoId?: string; videoPublishedAt?: string };
    }>;
  };
  const items = data.items ?? [];
  if (items.length === 0) return [];

  // 2) videos.list로 statistics 일괄 fetch
  const videoIds = items.map((i) => i.contentDetails?.videoId).filter(Boolean) as string[];
  const statsUrl = `${BASE_URL}/videos?part=statistics&id=${videoIds.join(",")}&key=${apiKey}`;
  const sres = await fetch(statsUrl);
  if (!sres.ok) {
    const txt = await sres.text();
    throw new Error(`YouTube videos ${sres.status}: ${txt.slice(0, 200)}`);
  }
  const sdata = (await sres.json()) as {
    items?: Array<{
      id: string;
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
    }>;
  };
  const statsMap = new Map<string, { v: number; l: number; c: number }>();
  for (const s of sdata.items ?? []) {
    statsMap.set(s.id, {
      v: parseInt(s.statistics?.viewCount ?? "0", 10) || 0,
      l: parseInt(s.statistics?.likeCount ?? "0", 10) || 0,
      c: parseInt(s.statistics?.commentCount ?? "0", 10) || 0,
    });
  }

  return items
    .map((item) => {
      const vid = item.contentDetails?.videoId;
      if (!vid) return null;
      const stats = statsMap.get(vid) ?? { v: 0, l: 0, c: 0 };
      const t = item.snippet?.thumbnails;
      const thumb =
        t?.maxres?.url ?? t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? null;
      return {
        videoId: vid,
        title: item.snippet?.title ?? "",
        thumbnailUrl: thumb,
        publishedAt:
          item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? new Date().toISOString(),
        views: stats.v,
        likes: stats.l,
        comments: stats.c,
      } as UploadVideo;
    })
    .filter(Boolean) as UploadVideo[];
}
