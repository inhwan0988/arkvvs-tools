export interface VideoResult {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  subscriberCount: number;
  likeCount: number;
  commentCount: number;
  vvs: number;
  engagementRate: number;
  engagementMult: number;
  recencyMult: number;
  score: number;
  durationSec: number;
  isShorts: boolean;
  hasCaption: boolean;
}


export interface Topic {
  id: number;
  title: string;
  description: string;
  angle: string;
  appeal: string;
}

export type WizardStep = 1 | 2 | 3 | 4;

export type Period = "all" | "6m" | "1y";
export type ChannelSize = "all" | "small" | "medium" | "large";
export type VideoFormat = "all" | "long" | "shorts";

export interface SearchFilters {
  period: Period;
  minViews: number;
  channelSize: ChannelSize;
  videoFormat: VideoFormat;
  deepSearch: boolean;
}
