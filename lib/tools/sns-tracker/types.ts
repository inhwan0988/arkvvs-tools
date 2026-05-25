/**
 * SNS 트래픽 추적 도구 — 타입.
 */

export const PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "threads",
  "naver_blog",
  "etc",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_META: Record<Platform, { label: string; emoji: string; color: string }> = {
  youtube: { label: "YouTube", emoji: "📺", color: "#FF0000" },
  instagram: { label: "Instagram", emoji: "📷", color: "#E1306C" },
  tiktok: { label: "TikTok", emoji: "🎵", color: "#000000" },
  x: { label: "X (Twitter)", emoji: "🐦", color: "#000000" },
  facebook: { label: "Facebook", emoji: "👥", color: "#1877F2" },
  threads: { label: "Threads", emoji: "🧵", color: "#000000" },
  naver_blog: { label: "네이버 블로그", emoji: "🟢", color: "#03C75A" },
  etc: { label: "기타", emoji: "🔗", color: "#8B95A1" },
};

export interface SnsContent {
  id: string;
  user_id: string;
  platform: Platform;
  title: string;
  content_url: string | null;
  posted_at: string; // ISO
  short_id: string;
  destination_url: string;
  views: number;
  likes: number;
  comments: number;
  views_synced_at: string | null;
  notes: string | null;
  created_at: string;
  archived_at: string | null;
}

/**
 * view sns_content_stats — id 컬럼이 content_id로 alias됨.
 */
export interface SnsContentStats {
  content_id: string;
  user_id: string;
  platform: Platform;
  title: string;
  content_url: string | null;
  short_id: string;
  destination_url: string;
  posted_at: string;
  views: number;
  likes: number;
  comments: number;
  click_count: number;
  conversion_rate_pct: number;
  last_click_at: string | null;
  created_at: string;
}

export interface LinkClick {
  id: number;
  short_id: string;
  content_id: string | null;
  clicked_at: string;
  ip_hash: string | null;
  ua: string | null;
  referer: string | null;
  country: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  is_bot: boolean;
}

export interface SnsWeeklyAnalysis {
  id: string;
  user_id: string;
  week_start: string;
  platform: Platform | null;
  best_content_id: string | null;
  worst_content_id: string | null;
  analysis_md: string;
  metrics_json: WeeklyMetrics | null;
  created_at: string;
}

export interface WeeklyMetrics {
  totalContents: number;
  totalViews: number;
  totalClicks: number;
  avgConversionRate: number;
  bestSnapshot?: ContentSnapshot;
  worstSnapshot?: ContentSnapshot;
}

export interface ContentSnapshot {
  id: string;
  title: string;
  platform: Platform;
  views: number;
  clicks: number;
  conversionRate: number;
  postedAt: string;
}
