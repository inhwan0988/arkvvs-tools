/**
 * Spread (멀티 SNS 게시) — 타입.
 */

export const SPREAD_PLATFORMS = [
  "instagram_business",
  "facebook_page",
  "threads",
  "tiktok",
  "youtube",
  "x",
] as const;

export type SpreadPlatform = (typeof SPREAD_PLATFORMS)[number];

export interface PlatformMeta {
  label: string;
  emoji: string;
  color: string;
  maxCaption: number;
  supportsImage: boolean;
  supportsVideo: boolean;
  supportsCarousel: boolean;
  aspectRatios: ("1:1" | "4:5" | "9:16" | "16:9")[];
  authStatus: "ready" | "soon" | "manual";
  notes?: string;
}

export const PLATFORM_META: Record<SpreadPlatform, PlatformMeta> = {
  instagram_business: {
    label: "Instagram",
    emoji: "📷",
    color: "#E1306C",
    maxCaption: 2200,
    supportsImage: true,
    supportsVideo: true,
    supportsCarousel: true,
    aspectRatios: ["1:1", "4:5", "9:16"],
    authStatus: "ready",
    notes: "Business/Creator 계정 + FB Page 연결 필수",
  },
  facebook_page: {
    label: "Facebook Page",
    emoji: "👥",
    color: "#1877F2",
    maxCaption: 63206,
    supportsImage: true,
    supportsVideo: true,
    supportsCarousel: true,
    aspectRatios: ["1:1", "16:9", "9:16"],
    authStatus: "ready",
  },
  threads: {
    label: "Threads",
    emoji: "🧵",
    color: "#000000",
    maxCaption: 500,
    supportsImage: true,
    supportsVideo: true,
    supportsCarousel: true,
    aspectRatios: ["1:1", "16:9", "9:16"],
    authStatus: "ready",
  },
  tiktok: {
    label: "TikTok",
    emoji: "🎵",
    color: "#000000",
    maxCaption: 2200,
    supportsImage: false,
    supportsVideo: true,
    supportsCarousel: false,
    aspectRatios: ["9:16"],
    authStatus: "soon",
    notes: "Direct Post API audit 필요",
  },
  youtube: {
    label: "YouTube Shorts",
    emoji: "📺",
    color: "#FF0000",
    maxCaption: 5000,
    supportsImage: false,
    supportsVideo: true,
    supportsCarousel: false,
    aspectRatios: ["9:16"],
    authStatus: "soon",
  },
  x: {
    label: "X (Twitter)",
    emoji: "🐦",
    color: "#000000",
    maxCaption: 280,
    supportsImage: true,
    supportsVideo: true,
    supportsCarousel: false,
    aspectRatios: ["16:9", "1:1"],
    authStatus: "soon",
    notes: "X API v2 유료 ($0.01/post)",
  },
};

export interface SocialConnection {
  id: string;
  user_id: string;
  platform: SpreadPlatform;
  external_id: string;
  external_username: string | null;
  external_name: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  fb_page_id: string | null;
  fb_page_access_token: string | null;
  enabled: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface SpreadPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[] | null;
  per_platform_caption: Record<SpreadPlatform, string> | null;
  target_platforms: SpreadPlatform[];
  status:
    | "draft"
    | "scheduled"
    | "posting"
    | "posted"
    | "partial_failed"
    | "failed";
  scheduled_at: string | null;
  posted_at: string | null;
  category: string | null;
  evergreen: boolean;
  results: Record<SpreadPlatform, { ok: boolean; post_id?: string; url?: string; error?: string }> | null;
  short_id: string | null;
  created_at: string;
}
