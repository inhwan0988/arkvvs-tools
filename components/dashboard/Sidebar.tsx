"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  getToolsByCategory,
  type Category,
  type Tool,
} from "@/lib/tools/registry";
import { useSidebar } from "./SidebarContext";
import SidebarToggleButton from "./SidebarToggleButton";

/**
 * 카테고리별 컬러 테마 — 사이드바 pill 활성 배경 / 카테고리 헤더에 사용.
 */
const CATEGORY_THEME: Record<
  Category,
  {
    text: string;
    dot: string;
    activeBg: string;
    activeText: string;
    hoverBg: string;
    hoverText: string;
  }
> = {
  기획: {
    text: "text-warn",
    dot: "bg-warn",
    activeBg: "bg-warnSoft",
    activeText: "text-warn",
    hoverBg: "hover:bg-warnSoft",
    hoverText: "hover:text-warn",
  },
  편집: {
    text: "text-brand",
    dot: "bg-brand",
    activeBg: "bg-brandSoft",
    activeText: "text-brand",
    hoverBg: "hover:bg-brandSoft",
    hoverText: "hover:text-brand",
  },
  "업로드 및 관리": {
    text: "text-success",
    dot: "bg-success",
    activeBg: "bg-successSoft",
    activeText: "text-success",
    hoverBg: "hover:bg-successSoft",
    hoverText: "hover:text-success",
  },
  "콘텐츠 활용": {
    text: "text-danger",
    dot: "bg-danger",
    activeBg: "bg-dangerSoft",
    activeText: "text-danger",
    hoverBg: "hover:bg-dangerSoft",
    hoverText: "hover:text-danger",
  },
};

export default function Sidebar({
  isAdmin = false,
  isPremium = false,
}: {
  isAdmin?: boolean;
  isPremium?: boolean;
}) {
  const pathname = usePathname();
  const groupedFree = getToolsByCategory({ membersOnly: false });
  const groupedPremium = getToolsByCategory({ membersOnly: true });
  const { isOpen, close } = useSidebar();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile && isOpen) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {isOpen && (
        <div
          onClick={close}
          className="md:hidden fixed inset-0 z-30 bg-black/40 transition-opacity"
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col bg-bg border-r border-line overflow-hidden
          w-64
          transition-transform duration-200 ease-out
          md:relative md:inset-auto md:z-auto md:transition-[width,border-color]
          ${isOpen
            ? "translate-x-0 md:w-64 md:translate-x-0"
            : "-translate-x-full md:w-0 md:translate-x-0 md:border-r-0"}
        `}
        aria-hidden={!isOpen}
      >
        <div className="h-16 flex items-center px-5 border-b border-line min-w-[16rem] bg-surface">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="font-bold text-ink tracking-tight">arkvvs.tools</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto min-w-[16rem]">
          {/* 대시보드 + 사이드바 토글 버튼 */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <PillLink
              href="/"
              icon="🏠"
              label="대시보드"
              active={pathname === "/"}
              activeClass="bg-brandSoft text-brand"
              flex1
            />
            <SidebarToggleButton />
          </div>

          <PillLink
            href="/guides"
            icon="📖"
            label="이용방법"
            active={pathname.startsWith("/guides")}
            activeClass="bg-brandSoft text-brand"
            rightBadge={
              <span className="text-[10px] font-bold text-danger bg-dangerSoft px-1.5 py-0.5 rounded">
                NEW
              </span>
            }
          />

          {/* 툴 목록 — 카테고리별 pill 그룹 */}
          {CATEGORY_ORDER.map((category) => {
            const freeTools = groupedFree[category] ?? [];
            const premiumTools = groupedPremium[category] ?? [];
            if (freeTools.length === 0 && premiumTools.length === 0) return null;
            const meta = CATEGORY_META[category];
            const theme = CATEGORY_THEME[category];
            return (
              <div key={category} className="mt-5">
                <div className="px-3 mb-2 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                  <span className="text-[11px]">{meta.emoji}</span>
                  <span
                    className={`text-[11px] font-bold tracking-tight ${theme.text}`}
                  >
                    {category}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {freeTools.map((tool) => (
                    <ToolPill
                      key={tool.slug}
                      tool={tool}
                      pathname={pathname}
                      locked={false}
                      theme={theme}
                    />
                  ))}
                  {premiumTools.map((tool) => (
                    <ToolPill
                      key={tool.slug}
                      tool={tool}
                      pathname={pathname}
                      locked={!isPremium}
                      theme={theme}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* ARK CLASS */}
          <div className="mt-5">
            <PillLink
              href="https://community.arkvvs.ai/communities/groups/arkclass/home"
              icon="🎓"
              label="ARK CLASS"
              active={false}
              activeClass="bg-brandSoft text-brand"
              external
            />
          </div>

          {isAdmin && (
            <>
              <div className="mt-6 mb-2 px-3 flex items-center gap-2">
                <span className="text-[11px] font-bold text-mute tracking-wider">
                  ADMIN
                </span>
                <div className="h-px bg-line flex-1" />
              </div>
              <div className="space-y-1.5">
                <PillLink
                  href="/admin"
                  icon="🛡️"
                  label="사용자 관리"
                  active={pathname.startsWith("/admin")}
                  activeClass="bg-brandSoft text-brand"
                />
                <PillLink
                  href="/membership"
                  icon="💎"
                  label="멤버십 안내"
                  active={pathname.startsWith("/membership")}
                  activeClass="bg-premiumSoft text-premium"
                />
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

/**
 * 공통 pill (rounded-full) 링크. 대시보드/이용방법/ARK CLASS/관리자 항목 등에 사용.
 * 활성 시 activeClass 로 하이라이트.
 */
function PillLink({
  href,
  icon,
  label,
  active,
  activeClass,
  rightBadge,
  external = false,
  flex1 = false,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  activeClass: string;
  rightBadge?: React.ReactNode;
  external?: boolean;
  flex1?: boolean;
}) {
  const base =
    "group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full text-[14px] font-bold transition-all duration-150 hover:translate-x-0.5";
  const inactive = "bg-surface text-ink border border-line hover:border-transparent hover:bg-chip";
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`${base} ${flex1 ? "flex-1" : ""} ${active ? activeClass + " border border-transparent" : inactive}`}
    >
      <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-white/60 text-[13px] transition-transform duration-150 group-hover:scale-110">
        {icon}
      </span>
      <span className="flex-1 truncate text-left">{label}</span>
      {rightBadge}
      {external && <span className="text-mute text-[11px]">↗</span>}
    </Link>
  );
}

/**
 * 툴 pill — 카테고리 컬러 테마 반영.
 * 비활성: 흰 배경 + 회색 테두리 (레퍼런스 디자인)
 * 활성:   카테고리 soft bg + 컬러 텍스트
 * 잠금:   회색 opacity 낮게
 */
function ToolPill({
  tool,
  pathname,
  locked,
  theme,
}: {
  tool: Tool;
  pathname: string;
  locked: boolean;
  theme: (typeof CATEGORY_THEME)[Category];
}) {
  const active =
    !tool.external && pathname.startsWith(tool.href) && tool.href !== "#";
  const disabled = tool.status !== "live" || locked;
  const isPremium = Boolean(tool.membersOnly);

  const base =
    "group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full text-[13px] font-bold transition-all duration-150";
  const activeClass = `${theme.activeBg} ${theme.activeText} border border-transparent shadow-sm`;
  const inactive = `bg-surface text-ink border border-line hover:border-transparent ${theme.hoverBg} ${theme.hoverText} hover:translate-x-0.5`;
  const disabledClass =
    "bg-surface text-mute border border-line opacity-60 cursor-not-allowed";

  return (
    <Link
      href={disabled ? "#" : tool.href}
      target={tool.external ? "_blank" : undefined}
      rel={tool.external ? "noopener noreferrer" : undefined}
      onClick={(e) => disabled && e.preventDefault()}
      className={`${base} ${
        active ? activeClass : disabled ? disabledClass : inactive
      }`}
    >
      <span
        className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-[13px] transition-transform duration-150 group-hover:scale-110 ${
          active ? "bg-white/70" : "bg-chip"
        }`}
      >
        {tool.emoji}
      </span>
      <span className="flex-1 truncate text-left">{tool.name}</span>
      {isPremium && !locked && !active && (
        <span className="text-[10px] font-bold text-premium/70" title="회원전용">
          💎
        </span>
      )}
      {tool.external && <span className="text-mute text-[11px]">↗</span>}
      {locked && (
        <span className="text-[10px] text-mute" aria-label="locked">
          🔒
        </span>
      )}
      {tool.status === "soon" && (
        <span className="text-[9px] font-bold text-mute bg-chip px-1.5 py-0.5 rounded">
          SOON
        </span>
      )}
    </Link>
  );
}
