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

/**
 * 영상 구조 분석 결과 — Step 3 상단에 카드로 표시.
 * 사용자가 영상의 핵심을 한눈에 파악 + 어디 영감받았는지 명확히 인지.
 */
export interface VideoAnalysis {
  /** 한 줄 핵심 요약 (예: "재개발 손해 보는 패턴 분석") */
  coreTheme: string;
  /** 영상 구조 */
  structure: {
    intro: string;          // 인트로 한 줄
    mainPoints: string[];   // 본론 핵심 포인트 2-4개
    conclusion: string;     // 결론 / CTA
  };
  /** 사용된 후킹 패턴 (예: ["충격 오프닝", "숫자 활용", "전문가 발언"]) */
  hookPatterns: string[];
  /** 타겟 시청자 (예: "재개발 투자 고민하는 30-50대") */
  targetAudience: string;
  /** 떡상 추정 이유 — 시청자가 왜 이 영상을 끝까지 봤는지 */
  viralReasons: string[];
  /** 이 영상에서 빌릴 만한 angle (예: "함정 패턴 구조", "체크리스트 형식") */
  borrowableAngles: string[];
}

/**
 * 사용자 의도 — "이 영상에서 무엇을 빌리고 싶은지" 명시.
 * 주제/대본 생성 prompt에 강하게 주입되어 AI가 generic 추천하지 않게 함.
 */
export interface UserIntent {
  /** 사전 정의된 접근 방식 (선택, 옵션 클릭 가능) */
  approach?: 'similar' | 'borrow_hook' | 'deeper_dive' | 'opposite' | 'combine';
  /** 자유 텍스트 — 가장 핵심. 사용자가 자기 의도를 자유롭게 서술 */
  freeText: string;
}

export const APPROACH_LABELS: Record<NonNullable<UserIntent['approach']>, string> = {
  similar: '비슷한 주제로 내 채널 스타일로',
  borrow_hook: '이 영상의 후킹 방식만 빌리기',
  deeper_dive: '이 영상이 다룬 한 부분을 더 깊게',
  opposite: '이 영상과 반대 관점',
  combine: '내 채널 기존 주제와 결합',
};

export type WizardStep = 1 | 2 | 3 | 4;

export type Period = "all" | "6m" | "1y" | "3m" | "1m" | "1w";
export type ChannelSize = "all" | "small" | "medium" | "large";
export type VideoFormat = "all" | "long" | "shorts";
export type DurationRange =
  | "any"           // 제한 없음
  | "under3"        // 3분 이하 (쇼츠)
  | "3to10"         // 3-10분 (숏폼 롱폼)
  | "10to30"        // 10-30분 (일반 롱폼)
  | "over30";       // 30분+ (장편)
export type SortBy =
  | "score"         // 기본: 종합 점수 (vvs × recency × engagement)
  | "vvs"           // 조회수/구독자 비율만
  | "views"         // 절대 조회수
  | "date"          // 최신순
  | "engagement";   // 참여율 (좋아요+댓글/조회수)

export interface SearchFilters {
  period: Period;
  minViews: number;
  channelSize: ChannelSize;
  videoFormat: VideoFormat;
  deepSearch: boolean;
  // v3 강화 필터 (모두 optional — 기본값 = 비활성)
  minVvs?: number;            // 조회수/구독자 최소 배수 (예: 3 = 3배 이상)
  minEngagementRate?: number; // 참여율 최소 % (예: 1 = 1% 이상)
  durationRange?: DurationRange;
  captionsOnly?: boolean;     // 자막 있는 영상만 (vvs-planner 흐름의 필수 조건)
  excludeKeywords?: string;   // 쉼표 구분 ("광고, 협찬, 광고문의")
  sortBy?: SortBy;
  maxResults?: number;        // 반환 결과 개수 (기본 30, 옵션: 10/20/50/100)
}
