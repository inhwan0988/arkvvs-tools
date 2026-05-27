/**
 * URL → 메타데이터 자동 추출.
 *
 * 1순위: 플랫폼별 oEmbed endpoint (YouTube, Vimeo, Instagram 등) — 가장 정확
 * 2순위: 자체 OG/Twitter Card 파서 (간단한 fetch + meta tag 정규식)
 * 3순위: URL 분석으로 플랫폼만 추측
 */

import type { Platform } from "./types";

export interface ResolvedMeta {
  platform: Platform;
  title: string | null;
  thumbnailUrl: string | null;
  channelName: string | null;
  publishedAt: string | null; // ISO
  externalId: string | null;
  canonicalUrl: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 플랫폼 감지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HOST_TO_PLATFORM: Array<[RegExp, Platform]> = [
  [/(^|\.)(youtube\.com|youtu\.be)$/i, "youtube"],
  [/(^|\.)instagram\.com$/i, "instagram"],
  [/(^|\.)tiktok\.com$/i, "tiktok"],
  [/(^|\.)(twitter\.com|x\.com)$/i, "x"],
  [/(^|\.)facebook\.com$/i, "facebook"],
  [/(^|\.)threads\.(net|com)$/i, "threads"],
  [/(^|\.)blog\.naver\.com$/i, "naver_blog"],
];

export function detectPlatformFromUrl(rawUrl: string): Platform {
  try {
    const u = new URL(rawUrl);
    for (const [pattern, platform] of HOST_TO_PLATFORM) {
      if (pattern.test(u.hostname)) return platform;
    }
  } catch {}
  return "etc";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 플랫폼별 ID 추출
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractExternalId(url: string, platform: Platform): string | null {
  try {
    const u = new URL(url);
    switch (platform) {
      case "youtube":
        if (u.hostname.includes("youtu.be"))
          return u.pathname.slice(1).split("/")[0] || null;
        const v = u.searchParams.get("v");
        if (v) return v;
        const shorts = u.pathname.match(/\/shorts\/([\w-]+)/);
        if (shorts) return shorts[1];
        return null;
      case "instagram":
        const igMatch = u.pathname.match(/\/(p|reel|reels|tv)\/([^/?]+)/);
        return igMatch?.[2] ?? null;
      case "tiktok":
        const tt = u.pathname.match(/\/video\/(\d+)/);
        return tt?.[1] ?? null;
      case "x":
        const x = u.pathname.match(/\/status\/(\d+)/);
        return x?.[1] ?? null;
      case "threads":
        const th = u.pathname.match(/\/post\/([^/?]+)/);
        return th?.[1] ?? null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// oEmbed (가장 정확) — YouTube 공식
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function resolveYouTubeOEmbed(url: string): Promise<Partial<ResolvedMeta>> {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    { headers: { "user-agent": "arkvvs-tools/1.0" }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return {};
  const data = (await res.json()) as {
    title?: string;
    thumbnail_url?: string;
    author_name?: string;
  };
  return {
    title: data.title ?? null,
    thumbnailUrl: data.thumbnail_url ?? null,
    channelName: data.author_name ?? null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OG/Twitter Card fetch (범용 폴백)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseMetaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    // og:title, twitter:title, name="title" 등 다 대응
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
      "i",
    );
    const m = html.match(re);
    if (!m) continue;
    const content = m[0].match(/content=["']([^"']+)["']/i);
    if (content?.[1]) return content[1];
  }
  return null;
}

async function resolveByOpenGraph(url: string): Promise<Partial<ResolvedMeta>> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return {};
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return {};
    const html = (await res.text()).slice(0, 200_000); // 200KB 제한
    const title =
      parseMetaContent(html, ["og:title", "twitter:title"]) ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
      null;
    const thumb = parseMetaContent(html, [
      "og:image",
      "og:image:url",
      "twitter:image",
      "twitter:image:src",
    ]);
    const author = parseMetaContent(html, [
      "og:site_name",
      "article:author",
      "author",
    ]);
    const publishedAt = parseMetaContent(html, [
      "article:published_time",
      "og:published_time",
      "datePublished",
    ]);
    return {
      title: title?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() ?? null,
      thumbnailUrl: thumb ?? null,
      channelName: author ?? null,
      publishedAt: publishedAt ?? null,
    };
  } catch {
    return {};
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 통합
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function resolveUrlMeta(rawUrl: string): Promise<ResolvedMeta> {
  let canonicalUrl = rawUrl.trim();
  try {
    canonicalUrl = new URL(rawUrl).toString();
  } catch {
    // not a valid URL
  }
  const platform = detectPlatformFromUrl(canonicalUrl);
  const externalId = extractExternalId(canonicalUrl, platform);

  let meta: Partial<ResolvedMeta> = {};

  // 1순위: YouTube oEmbed
  if (platform === "youtube") {
    try {
      meta = await resolveYouTubeOEmbed(canonicalUrl);
    } catch {}
  }

  // 2순위: OG/Twitter Card (모든 플랫폼)
  if (!meta.title || !meta.thumbnailUrl) {
    const og = await resolveByOpenGraph(canonicalUrl);
    meta = { ...og, ...meta }; // meta가 우선, 빈 부분만 og로 채움
    // 두 번째 fallback 시 우선순위 보정
    meta.title = meta.title ?? og.title ?? null;
    meta.thumbnailUrl = meta.thumbnailUrl ?? og.thumbnailUrl ?? null;
    meta.channelName = meta.channelName ?? og.channelName ?? null;
    meta.publishedAt = meta.publishedAt ?? og.publishedAt ?? null;
  }

  return {
    platform,
    title: meta.title ?? null,
    thumbnailUrl: meta.thumbnailUrl ?? null,
    channelName: meta.channelName ?? null,
    publishedAt: meta.publishedAt ?? null,
    externalId,
    canonicalUrl,
  };
}
