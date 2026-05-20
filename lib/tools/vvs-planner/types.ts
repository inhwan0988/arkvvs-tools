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
  // 풍부화된 메타데이터 (v2 — 채널 컨텍스트 반영)
  expectedViewsRange?: string;   // "3만~7만" 등 채널 평균 기준 추정
  difficulty?: {
    filming: 1 | 2 | 3;          // 촬영 난이도
    editing: 1 | 2 | 3;          // 편집 난이도
    note?: string;               // "자료 화면 많음" 등
  };
  titleCandidates?: string[];    // 영상 제목 후보 3개
  thumbnailText?: string;        // 썸네일 텍스트 1줄
  hookLine?: string;             // 영상 첫 15초 후킹 라인 sample
  relatedTags?: string[];        // 연관 키워드/태그
}

export interface ChannelProfile {
  userId: string;
  channelId?: string;
  channelUrl?: string;
  channelTitle?: string;
  niche?: string;                // "부동산", "뷰티" 등
  avgViewCount?: number;
  avgDurationSeconds?: number;
  commonHookPatterns?: string[]; // ["충격적", "절대", ...]
  tone?: string;                 // "친근/격식체"
  pacing?: string;               // "빠름/보통/느림"
  targetAudience?: string;       // "30-40대 직장인" 등
  recentTitles?: string[];       // 최근 영상 제목 5-10개
  analyzedAt?: string;
}

export interface ReferenceVideo {
  videoId: string;
  title?: string;
  channelTitle?: string;
  transcriptSample?: string;     // 첫 1000자 정도
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
