"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  getToolsByCategory,
  type Tool,
} from "@/lib/tools/registry";
import { useSidebar } from "./SidebarContext";
import SidebarToggleButton from "./SidebarToggleButton";

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

          {/* 툴 목록 — 카테고리별로 바로 노출 (일반공개 → 회원전용 순) */}
          {CATEGORY_ORDER.map((category) => {
            const freeTools = groupedFree[category] ?? [];
            const premiumTools = groupedPremium[category] ?? [];
            if (freeTools.length === 0 && premiumTools.length === 0) return null;
            const meta = CATEGORY_META[category];
            return (
              <div key={category} className="mt-3">
                <div className="px-3 mb-1 flex items-center gap-1.5">
                  <span className="text-[13px]">{meta.emoji}</span>
                  <span className="text-[11px] font-bold text-mute tracking-tight">
                    {category}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {freeTools.map((tool) => (
                    <SidebarLink
                      key={tool.slug}
                      tool={tool}
                      pathname={pathname}
                      locked={false}
                    />
                  ))}
                  {premiumTools.map((tool) => (
                    <SidebarLink
                      key={tool.slug}
                      tool={tool}
                      pathname={pathname}
                      locked={!isPremium}
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
}: {
  tool: Tool;
  pathname: string;
  locked: boolean;
}) {
  const active =
    !tool.external && pathname.startsWith(tool.href) && tool.href !== "#";
  const disabled = tool.status !== "live" || locked;
  const isPremium = Boolean(tool.membersOnly);

  return (
    <Link
      href={disabled ? "#" : tool.href}
      target={tool.external ? "_blank" : undefined}
      rel={tool.external ? "noopener noreferrer" : undefined}
      onClick={(e) => disabled && e.preventDefault()}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
        active
          ? isPremium
            ? "bg-premiumSoft text-premium"
            : "bg-brandSoft text-brand"
          : disabled
            ? "text-mute cursor-not-allowed opacity-70"
            : isPremium
              ? "text-sub hover:bg-premiumSoft hover:text-premium hover:translate-x-1"
              : "text-sub hover:bg-chip hover:text-ink hover:translate-x-1"
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
