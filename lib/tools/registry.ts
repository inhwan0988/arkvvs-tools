/**
 * 툴 메타데이터 레지스트리.
 * 새 툴 추가 시 여기에만 항목을 추가하면 사이드바·대시보드 카드에 자동 노출.
 */
export type ToolStatus = "live" | "soon" | "beta";

export type Category = "기획" | "편집" | "업로드 및 관리" | "콘텐츠 활용";

export const CATEGORY_ORDER: Category[] = [
  "기획",
  "편집",
  "업로드 및 관리",
  "콘텐츠 활용",
];

export const CATEGORY_META: Record<
  Category,
  { emoji: string; description: string }
> = {
  기획: { emoji: "💡", description: "콘텐츠 아이디어 · 기획" },
  편집: { emoji: "✂️", description: "영상 편집 · 후반 작업" },
  "업로드 및 관리": {
    emoji: "🚀",
    description: "업로드 · 노출 · 트래픽 관리",
  },
  "콘텐츠 활용": {
    emoji: "📢",
    description: "쇼츠·SNS로 확장 및 재활용",
  },
};

export type Tool = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  href: string;
  status: ToolStatus;
  color: string; // tailwind bg color
  category: Category;
  external?: boolean; // 외부 링크면 true (새 탭으로 열림)
  membersOnly?: boolean; // true면 회원전용 (premium tier만 접근 가능)
};

export const TOOLS: Tool[] = [
  // ━━━ 기획 ━━━
  {
    slug: "vvs-planner",
    name: "조회수 터지는 기획",
    description: "키워드 → VVS 높은 영상 → 자막 → AI 주제 10개 → 대본 자동 생성",
    emoji: "🔥",
    href: "/tools/vvs-planner",
    status: "live",
    color: "bg-dangerSoft",
    category: "기획",
  },

  // ━━━ 편집 ━━━
  {
    slug: "premiere-auto-edit",
    name: "프리미어프로 반자동 편집",
    description: "컷 편집 · 자막 · BGM 자동화",
    emoji: "✂️",
    href: "#",
    status: "soon",
    color: "bg-brandSoft",
    category: "편집",
  },

  // ━━━ 업로드 및 관리 ━━━
  {
    slug: "youtube-setup",
    name: "YouTube 세팅 툴",
    description: "스크립트 → 제목 · 썸네일 · 설명란 · SEO 키워드 자동 생성",
    emoji: "🎬",
    href: "/tools/youtube-setup",
    status: "live",
    color: "bg-brandSoft",
    category: "업로드 및 관리",
  },

  // ━━━ 콘텐츠 활용 ━━━
  {
    slug: "ark-clipper",
    name: "Ark Clipper",
    description: "롱폼 YouTube → AI가 후킹 구간 자동 추출 → 9:16 쇼츠 5-6개 생성 (Mac/Win 데스크탑 앱)",
    emoji: "✂️",
    href: "/tools/ark-clipper",
    status: "live",
    color: "bg-dangerSoft",
    category: "콘텐츠 활용",
  },
  {
    slug: "spread",
    name: "Spread",
    description: "Meta · Instagram 자동 게시 도구 (Arc Publisher)",
    emoji: "📢",
    href: "https://spread-joshua-2770s-projects.vercel.app",
    status: "live",
    color: "bg-warnSoft",
    category: "콘텐츠 활용",
    external: true,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 회원전용 (premium tier만 접근 가능 — 관리자가 사용자 관리에서 부여)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━ 기획 (회원전용) ━━━
  {
    slug: "insta-viral-planner",
    name: "인스타그램 떡상 기획",
    description: "릴스·피드 떡상 키워드 분석 + 콘텐츠 기획 자동화",
    emoji: "📱",
    href: "#",
    status: "soon",
    color: "bg-premiumSoft",
    category: "기획",
    membersOnly: true,
  },

  // ━━━ 편집 (회원전용) ━━━
  {
    slug: "capcut-auto-edit",
    name: "캡컷 반자동 편집",
    description: "캡컷 템플릿 기반 컷 편집 · 자막 자동화",
    emoji: "🎞️",
    href: "#",
    status: "soon",
    color: "bg-premiumSoft",
    category: "편집",
    membersOnly: true,
  },

  // ━━━ 업로드 및 관리 (회원전용) ━━━
  {
    slug: "sns-traffic",
    name: "SNS 트래픽 추적 및 관리",
    description: "다채널 조회수·유입 · 성과 대시보드",
    emoji: "📊",
    href: "#",
    status: "soon",
    color: "bg-premiumSoft",
    category: "업로드 및 관리",
    membersOnly: true,
  },

  // ━━━ 콘텐츠 활용 (회원전용) ━━━
  {
    slug: "premium-content-soon",
    name: "준비 중",
    description: "회원전용 콘텐츠 활용 툴이 곧 추가됩니다.",
    emoji: "📢",
    href: "#",
    status: "soon",
    color: "bg-premiumSoft",
    category: "콘텐츠 활용",
    membersOnly: true,
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolsByCategory(opts?: {
  membersOnly?: boolean;
}): Record<Category, Tool[]> {
  const filter = opts?.membersOnly;
  const grouped = {} as Record<Category, Tool[]>;
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const tool of TOOLS) {
    if (filter === true && !tool.membersOnly) continue;
    if (filter === false && tool.membersOnly) continue;
    grouped[tool.category].push(tool);
  }
  return grouped;
}
