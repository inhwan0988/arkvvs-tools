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
 * 카테고리별 컬러 테마 — 사이드바에서 시각적 구분.
 * Toss 팔레트 토큰만 사용.
 */
const CATEGORY_THEME: Record<
  Category,
  { text: string; dot: string; border: string; hoverBg: string }
> = {
  기획: {
    text: "text-warn",
    dot: "bg-warn",
    border: "border-warn/40",
    hoverBg: "hover:bg-warnSoft",
  },
  편집: {
    text: "text-brand",
    dot: "bg-brand",
    border: "border-brand/40",
    hoverBg: "hover:bg-brandSoft",
  },
  "업로드 및 관리": {
    text: "text-success",
    dot: "bg-success",
    border: "border-success/40",
    hoverBg: "hover:bg-successSoft",
  },
  "콘텐츠 활용": {
    text: "text-danger",
    dot: "bg-danger",
    border: "border-danger/40",
    hoverBg: "hover:bg-dangerSoft",
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

  // 모바일에서 페이지 이동 시 드로어 자동 닫기
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile && isOpen) {
      close();
    }
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
          fixed inset-y-0 left-0 z-40 flex flex-col bg-surface border-r border-line overflow-hidden
          w-64
          transition-transform duration-200 ease-out
          md:relative md:inset-auto md:z-auto md:transition-[width,border-color]
          ${isOpen
            ? "translate-x-0 md:w-64 md:translate-x-0"
            : "-translate-x-full md:w-0 md:translate-x-0 md:border-r-0"}
        `}
        aria-hidden={!isOpen}
      >
        <div className="h-16 flex items-center px-5 border-b border-line min-w-[16rem]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="font-bold text-ink tracking-tight">arkvvs.tools</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto min-w-[16rem]">
          <div className="flex items-center gap-1 mb-1">
            <Link
              href="/"
              className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-150 hover:translate-x-0.5 ${
                pathname === "/"
                  ? "bg-brandSoft text-brand"
                  : "text-ink hover:bg-chip"
              }`}
            >
              <span className="text-base">🏠</span>
              <span>대시보드</span>
            </Link>
            <SidebarToggleButton />
          </div>

          <Link
            href="/guides"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-bold mb-3 transition-all duration-150 hover:translate-x-0.5 ${
              pathname.startsWith("/guides")
                ? "bg-brandSoft text-brand"
                : "text-ink hover:bg-chip"
            }`}
          >
            <span className="text-base">📖</span>
            <span className="flex-1">이용방법</span>
            <span className="text-[10px] font-bold text-danger bg-dangerSoft px-1.5 py-0.5 rounded">
              NEW
            </span>
          </Link>

          {/* 툴 목록 — 카테고리별 컬러 테마로 시각적 구분 */}
          {CATEGORY_ORDER.map((category) => {
            const freeTools = groupedFree[category] ?? [];
            const premiumTools = groupedPremium[category] ?? [];
            if (freeTools.length === 0 && premiumTools.length === 0) return null;
            const meta = CATEGORY_META[category];
            const theme = CATEGORY_THEME[category];
            return (
              <div key={category} className="mt-4">
                <div className="px-3 mb-1.5 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                  <span className="text-[13px]">{meta.emoji}</span>
                  <span
                    className={`text-[11px] font-bold tracking-tight ${theme.text}`}
                  >
                    {category}
                  </span>
                </div>
                <div
                  className={`ml-3 pl-2 border-l-2 ${theme.border} space-y-0.5`}
                >
                  {freeTools.map((tool) => (
                    <SidebarLink
                      key={tool.slug}
                      tool={tool}
                      pathname={pathname}
                      locked={false}
                      hoverBg={theme.hoverBg}
                    />
                  ))}
                  {premiumTools.map((tool) => (
                    <SidebarLink
                      key={tool.slug}
                      tool={tool}
                      pathname={pathname}
                      locked={!isPremium}
                      hoverBg={theme.hoverBg}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* ARK CLASS — 외부 커뮤니티 */}
          <a
            href="https://community.arkvvs.ai/communities/groups/arkclass/home"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-150 hover:translate-x-0.5 text-sub hover:bg-chip"
          >
            <span className="text-base">🎓</span>
            <span className="flex-1">ARK CLASS</span>
            <span className="text-mute text-[11px]">↗</span>
          </a>

          {isAdmin && (
            <>
              <div className="mt-6 px-3 mb-2 flex items-center gap-2">
                <span className="text-[11px] font-bold text-mute tracking-wider">
                  ADMIN
                </span>
                <div className="h-px bg-line flex-1" />
              </div>
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold mb-1 transition-all duration-150 hover:translate-x-0.5 ${
                  pathname.startsWith("/admin")
                    ? "bg-brandSoft text-brand"
                    : "text-sub hover:bg-chip"
                }`}
              >
                <span className="text-base">🛡️</span>
                <span>사용자 관리</span>
              </Link>
              <Link
                href="/membership"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold mb-1 transition-all duration-150 hover:translate-x-0.5 ${
                  pathname.startsWith("/membership")
                    ? "bg-premiumSoft text-premium"
                    : "text-sub hover:bg-chip"
                }`}
              >
                <span className="text-base">💎</span>
                <span>멤버십 안내</span>
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

function SidebarLink({
  tool,
  pathname,
  locked,
  hoverBg,
}: {
  tool: Tool;
  pathname: string;
  locked: boolean;
  hoverBg?: string; // 카테고리 컬러 hover bg (예: "hover:bg-warnSoft")
}) {
  const active =
    !tool.external && pathname.startsWith(tool.href) && tool.href !== "#";
  const disabled = tool.status !== "live" || locked;
  const isPremium = Boolean(tool.membersOnly);
  const activeBg = isPremium ? "bg-premiumSoft text-premium" : "bg-brandSoft text-brand";
  const idleHover = hoverBg
    ? `text-sub ${hoverBg} hover:text-ink hover:translate-x-1`
    : "text-sub hover:bg-chip hover:text-ink hover:translate-x-1";

  return (
    <Link
      href={disabled ? "#" : tool.href}
      target={tool.external ? "_blank" : undefined}
      rel={tool.external ? "noopener noreferrer" : undefined}
      onClick={(e) => disabled && e.preventDefault()}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
        active
          ? activeBg
          : disabled
            ? "text-mute cursor-not-allowed opacity-70"
            : idleHover
      }`}
    >
      <span className="text-sm transition-transform duration-150 group-hover:scale-110">
        {tool.emoji}
      </span>
      <span className="truncate flex-1">{tool.name}</span>
      {isPremium && !locked && !active && (
        <span
          className="text-[10px] font-bold text-premium/70"
          aria-label="회원전용"
          title="회원전용"
        >
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
