/**
 * 툴 메타데이터 레지스트리.
 * 새 툴 추가 시 여기에만 항목을 추가하면 사이드바·대시보드 카드에 자동 노출.
 */
export type ToolStatus = "live" | "soon" | "beta";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  href: string;
  status: ToolStatus;
  color: string; // tailwind bg color
};

export const TOOLS: Tool[] = [
  {
    slug: "youtube-setup",
    name: "YouTube 세팅 툴",
    description: "스크립트 → 제목 · 썸네일 · 설명란 · SEO 키워드 자동 생성",
    emoji: "🎬",
    href: "/tools/youtube-setup",
    status: "live",
    color: "bg-brandSoft",
  },
  {
    slug: "soon-1",
    name: "Coming Soon",
    description: "다음 툴이 곧 추가됩니다",
    emoji: "✨",
    href: "#",
    status: "soon",
    color: "bg-chip",
  },
  {
    slug: "soon-2",
    name: "Coming Soon",
    description: "다음 툴이 곧 추가됩니다",
    emoji: "🚀",
    href: "#",
    status: "soon",
    color: "bg-chip",
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
