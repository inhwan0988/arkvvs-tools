/**
 * 툴 메타데이터 레지스트리.
 * 새 툴 추가 시 여기에만 항목을 추가하면 사이드바·대시보드 카드에 자동 노출.
 */
export type ToolStatus = "live" | "soon" | "beta";

export type Category = "기획" | "촬영" | "편집" | "업로드 및 관리";

export const CATEGORY_ORDER: Category[] = [
  "기획",
  "촬영",
  "편집",
  "업로드 및 관리",
];

export const CATEGORY_META: Record<
  Category,
  { emoji: string; description: string }
> = {
  기획: { emoji: "💡", description: "콘텐츠 아이디어 · 기획" },
  촬영: { emoji: "🎥", description: "촬영 준비 · 현장 운영" },
  편집: { emoji: "✂️", description: "영상 편집 · 후반 작업" },
  "업로드 및 관리": {
    emoji: "🚀",
    description: "업로드 · 노출 · 트래픽 관리",
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
};

export const TOOLS: Tool[] = [
  // ━━━ 기획 ━━━
  {
    slug: "viral-planning",
    name: "조회수 터지는 기획",
    description: "후킹·트렌드 기반 영상 기획안 자동 생성",
    emoji: "🔥",
    href: "#",
    status: "soon",
    color: "bg-dangerSoft",
    category: "기획",
  },

  // ━━━ 촬영 ━━━
  // (예정)

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
  {
    slug: "spread",
    name: "Spread",
    description: "Meta · Instagram 자동 게시 도구 (Arc Publisher)",
    emoji: "📢",
    href: "https://spread-joshua-2770s-projects.vercel.app",
    status: "live",
    color: "bg-warnSoft",
    category: "업로드 및 관리",
    external: true,
  },
  {
    slug: "sns-traffic",
    name: "SNS 트래픽 추적 및 관리",
    description: "다채널 조회수·유입 · 성과 대시보드",
    emoji: "📊",
    href: "#",
    status: "soon",
    color: "bg-successSoft",
    category: "업로드 및 관리",
  },
  {
    slug: "ark-clipper",
    name: "Ark clipper",
    description: "롱폼 링크 넣으면 쇼츠 생성",
    emoji: "✂️",
    href: "#",
    status: "soon",
    color: "bg-dangerSoft",
    category: "업로드 및 관리",
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolsByCategory(): Record<Category, Tool[]> {
  const grouped = {} as Record<Category, Tool[]>;
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const tool of TOOLS) grouped[tool.category].push(tool);
  return grouped;
}
