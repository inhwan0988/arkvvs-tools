/**
 * Instagram 떡상 기획기 — 타입 정의.
 * vvs-planner의 YouTube 타입과 패턴 유사하지만 Instagram 특성 반영.
 */

export type WizardStep = 1 | 2 | 3 | 4;

export type Period = "all" | "1w" | "1m" | "3m" | "6m" | "1y";
export type FollowerSize = "all" | "small" | "medium" | "large";
export type ContentFormat = "all" | "reel" | "post";
export type SortBy = "score" | "ivs" | "views" | "likes" | "engagement" | "date";

/**
 * Instagram 검색 결과 (Apify Hashtag Scraper 응답 가공).
 */
export interface ReelResult {
  shortcode: string;          // Instagram post shortcode (URL의 마지막 부분)
  url: string;                // 전체 URL
  type: "reel" | "post" | "carousel";
  caption: string;
  thumbnail: string;
  ownerUsername: string;
  ownerFullName: string;
  ownerFollowers: number;
  publishedAt: string;        // ISO date
  // 지표
  viewCount: number;          // 릴스만 (post는 undefined)
  likeCount: number;
  commentCount: number;
  // 계산 지표
  ivs: number;                // 조회수(or 좋아요) / 팔로워
  engagementRate: number;     // (likes + comments) / views (or followers)
  score: number;              // 종합 점수
  hasMusic?: boolean;
  musicTitle?: string;
  musicArtist?: string;
}

export interface SearchFilters {
  period: Period;
  minViews: number;
  followerSize: FollowerSize;
  contentFormat: ContentFormat;
  minIvs?: number;
  minEngagementRate?: number;
  sortBy?: SortBy;
  maxResults?: number;
  excludeKeywords?: string;
}

/**
 * 본인 인스타 채널 프로필 (Apify Profile Scraper).
 */
export interface InstaProfile {
  userId: string;             // Supabase user id
  username?: string;
  fullName?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  // 분석 결과
  niche?: string;
  tone?: string;
  pacing?: string;             // 릴스 컷 속도 등
  targetAudience?: string;
  commonHookPatterns?: string[];
  averageLikes?: number;
  averageViews?: number;       // 릴스 평균
  contentMix?: { reels: number; posts: number; stories?: number }; // 비율
  recentCaptions?: string[];
  analyzedAt?: string;
}

/**
 * 릴스 분석 결과 (vvs-planner의 VideoAnalysis 패턴).
 */
export interface ReelAnalysis {
  coreTheme: string;
  structure: {
    hook: string;              // 첫 3초
    body: string[];            // 본론 핵심 포인트
    cta: string;               // 마무리
  };
  hookPatterns: string[];
  targetAudience: string;
  viralReasons: string[];
  borrowableAngles: string[];
  // Instagram 특화
  visualStyle?: string;        // "빠른 컷 + 텍스트 오버레이"
  musicStyle?: string;         // "BPM 130+ 업비트 / 트렌드 audio"
  captionStyle?: string;       // "3줄 후킹 + 본론 + CTA"
}

/**
 * 사용자 의도 (vvs-planner와 동일 패턴).
 */
export interface UserIntent {
  approach?: "similar" | "borrow_hook" | "deeper_dive" | "opposite" | "combine";
  freeText: string;
}

export const APPROACH_LABELS: Record<NonNullable<UserIntent["approach"]>, string> = {
  similar: "비슷한 주제로 내 스타일로",
  borrow_hook: "후킹 방식만 빌리기",
  deeper_dive: "한 부분을 더 깊게",
  opposite: "반대 관점",
  combine: "내 주제와 결합",
};

/**
 * AI가 추천하는 콘텐츠 아이디어 카드.
 */
export interface ContentIdea {
  id: number;
  title: string;               // 콘텐츠 제목
  description: string;
  format: "reel" | "post" | "carousel";
  hook: string;                // 첫 3초 후킹 라인
  bodyStructure: string[];     // 본론 구성 (릴스 슬라이드 또는 캐러셀)
  cta: string;                 // 마무리 CTA
  caption: string;             // Instagram 본문 캡션
  hashtags: string[];          // 해시태그 10개
  musicSuggestion?: string;    // 음악 추천 (릴스만)
  visualGuide?: string;        // 시각 가이드
  expectedReach?: string;      // 예상 도달
  difficulty?: {
    filming: 1 | 2 | 3;
    editing: 1 | 2 | 3;
  };
}

/**
 * 콘텐츠 아이디어에서 발전된 최종 대본/기획서.
 */
export interface ContentScript {
  format: "reel" | "post" | "carousel";
  title: string;
  fullScript: string;          // 전체 대본 (시간 마커 포함)
  caption: string;
  hashtags: string[];
  musicSuggestion?: string;
}
