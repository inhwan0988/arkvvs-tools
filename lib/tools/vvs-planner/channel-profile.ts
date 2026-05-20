import type { ChannelProfile } from "./types";

const YT = "https://www.googleapis.com/youtube/v3";

/**
 * 사용자가 입력한 채널 URL 또는 핸들에서 channelId 추출.
 * - https://www.youtube.com/@handle
 * - https://www.youtube.com/channel/UCxxx
 * - https://www.youtube.com/c/CustomURL
 * - @handle
 * - UCxxx (그대로)
 */
export async function resolveChannelId(
  input: string,
  youtubeApiKey: string,
): Promise<{ channelId: string; channelTitle: string }> {
  const raw = input.trim();

  // 직접 UC… 형태
  const directMatch = raw.match(/^UC[\w-]{20,}$/);
  if (directMatch) {
    const meta = await fetchChannelMeta(directMatch[0], youtubeApiKey);
    return { channelId: directMatch[0], channelTitle: meta.title };
  }

  // /channel/UC… URL
  const channelUrlMatch = raw.match(/\/channel\/(UC[\w-]{20,})/);
  if (channelUrlMatch) {
    const meta = await fetchChannelMeta(channelUrlMatch[1], youtubeApiKey);
    return { channelId: channelUrlMatch[1], channelTitle: meta.title };
  }

  // @handle 또는 /@handle URL
  const handleMatch = raw.match(/(?:^|\/)@([\w.-]+)/);
  if (handleMatch) {
    const id = await searchByHandle(handleMatch[1], youtubeApiKey);
    return id;
  }

  // /c/CustomURL — search로 fallback
  const customMatch = raw.match(/\/c\/([\w.-]+)/);
  if (customMatch) {
    return await searchByQuery(customMatch[1], youtubeApiKey);
  }

  // 그 외 — 채널 이름으로 검색 fallback
  return await searchByQuery(raw, youtubeApiKey);
}

async function fetchChannelMeta(
  channelId: string,
  apiKey: string,
): Promise<{ title: string; subscriberCount: number }> {
  const url = `${YT}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("채널을 찾을 수 없습니다.");
  return {
    title: item.snippet.title,
    subscriberCount: Number(item.statistics?.subscriberCount || 0),
  };
}

async function searchByHandle(
  handle: string,
  apiKey: string,
): Promise<{ channelId: string; channelTitle: string }> {
  const url = `${YT}/search?part=snippet&q=${encodeURIComponent("@" + handle)}&type=channel&maxResults=5&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error(`@${handle} 채널을 찾을 수 없습니다.`);
  return {
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
  };
}

async function searchByQuery(
  q: string,
  apiKey: string,
): Promise<{ channelId: string; channelTitle: string }> {
  const url = `${YT}/search?part=snippet&q=${encodeURIComponent(q)}&type=channel&maxResults=1&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("채널을 찾을 수 없습니다.");
  return {
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
  };
}

/**
 * 채널의 최근 영상 N개 fetch.
 */
export async function fetchRecentVideos(
  channelId: string,
  apiKey: string,
  count: number = 20,
): Promise<
  Array<{
    videoId: string;
    title: string;
    publishedAt: string;
    durationSec: number;
    viewCount: number;
  }>
> {
  // 1. uploads playlist 찾기
  const chRes = await fetch(
    `${YT}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
  );
  const chData = await chRes.json();
  const uploadsId =
    chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) throw new Error("uploads 플레이리스트를 찾지 못했습니다.");

  // 2. 최근 영상 list
  const plRes = await fetch(
    `${YT}/playlistItems?part=contentDetails,snippet&playlistId=${uploadsId}&maxResults=${count}&key=${apiKey}`,
  );
  const plData = await plRes.json();
  const items = plData.items || [];
  const ids = items.map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId);
  if (ids.length === 0) return [];

  // 3. 영상 메타 (duration + views)
  const vRes = await fetch(
    `${YT}/videos?part=contentDetails,statistics,snippet&id=${ids.join(",")}&key=${apiKey}`,
  );
  const vData = await vRes.json();
  return (vData.items || []).map(
    (v: {
      id: string;
      snippet: { title: string; publishedAt: string };
      contentDetails: { duration: string };
      statistics: { viewCount?: string };
    }) => ({
      videoId: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      durationSec: parseIsoDuration(v.contentDetails.duration),
      viewCount: Number(v.statistics?.viewCount || 0),
    }),
  );
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    (parseInt(m[1] || "0", 10) * 3600) +
    (parseInt(m[2] || "0", 10) * 60) +
    parseInt(m[3] || "0", 10)
  );
}

/**
 * 채널 분석 — Claude로 채널 스타일/톤/타겟 추출.
 */
export async function analyzeChannelStyle(
  videos: Array<{ title: string; durationSec: number; viewCount: number }>,
  channelTitle: string,
  anthropicApiKey: string,
): Promise<Omit<ChannelProfile, "userId" | "analyzedAt">> {
  const titlesBlock = videos
    .slice(0, 15)
    .map((v, i) => `${i + 1}. [${Math.round(v.durationSec / 60)}분, ${v.viewCount.toLocaleString()}회] ${v.title}`)
    .join("\n");

  const avgViews =
    videos.reduce((s, v) => s + v.viewCount, 0) / Math.max(1, videos.length);
  const avgDuration =
    videos.reduce((s, v) => s + v.durationSec, 0) / Math.max(1, videos.length);

  const prompt = `다음은 유튜브 채널 "${channelTitle}"의 최근 영상 목록입니다.

${titlesBlock}

이 채널의 특성을 분석해 JSON 형식으로만 응답해주세요. 다른 텍스트 X:

{
  "niche": "채널 분야/장르 (한 단어 또는 짧은 구절)",
  "tone": "말투 스타일 (예: '친근하면서 정보 위주', '진지한 분석형', '코믹/예능형')",
  "pacing": "영상 템포 (빠름/보통/느림)",
  "targetAudience": "주 타겟 시청자 (예: '30-40대 직장인', '20대 여성', '재테크 관심층')",
  "commonHookPatterns": ["자주 쓰는 후킹 단어/문구 3-5개", "예: '충격', '절대 모르면', '실수' 등"]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((b) => b.type === "text")?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답을 파싱하지 못했습니다.");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    channelTitle,
    niche: parsed.niche,
    avgViewCount: Math.round(avgViews),
    avgDurationSeconds: Math.round(avgDuration),
    commonHookPatterns: Array.isArray(parsed.commonHookPatterns)
      ? parsed.commonHookPatterns
      : [],
    tone: parsed.tone,
    pacing: parsed.pacing,
    targetAudience: parsed.targetAudience,
    recentTitles: videos.slice(0, 10).map((v) => v.title),
  };
}
