"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  // 두 큰 섹션 펼침/접힘 상태 (기본 둘 다 펼침)
  const [freeOpen, setFreeOpen] = useState(true);
  const [premiumOpen, setPremiumOpen] = useState(true);

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
      {/* 모바일 백드롭 (md 미만에서 사이드바 열려있을 때만) */}
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
          <div className="flex items-center gap-1 mb-3">
            <Link
              href="/"
              className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-bold transition ${
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

          {/* ━━━━━ 일반공개 섹션 ━━━━━ */}
          <SectionHeader
            label="일반공개"
            emoji="🌐"
            open={freeOpen}
            onToggle={() => setFreeOpen((v) => !v)}
            tone="brand"
          />

          {freeOpen && (
            <div className="mb-4">
              {CATEGORY_ORDER.map((category, idx) => {
                const tools = groupedFree[category];
                if (tools.length === 0) return null;
                const meta = CATEGORY_META[category];
                return (
                  <div key={category} className="mt-4">
                    <div className="px-3 mb-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-mute tracking-wider">
                        STEP {idx + 1}
                      </span>
                      <div className="h-px bg-line flex-1" />
                    </div>
                    <div className="px-3 mb-2 flex items-center gap-2">
                      <span className="text-base">{meta.emoji}</span>
                      <span className="text-[13px] font-bold text-ink tracking-tight">
                        {category}
                      </span>
                    </div>

                    <div className="ml-4 pl-3 border-l-2 border-line space-y-0.5">
                      {tools.map((tool) => (
                        <SidebarLink
                          key={tool.slug}
                          tool={tool}
                          pathname={pathname}
                          locked={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ━━━━━ 회원전용 섹션 ━━━━━ */}
          <SectionHeader
            label="회원전용"
            emoji="⭐"
            open={premiumOpen}
            onToggle={() => setPremiumOpen((v) => !v)}
            tone="premium"
            locked={!isPremium}
          />

          {premiumOpen && (
            <div className="mb-4">
              {CATEGORY_ORDER.map((category) => {
                const tools = groupedPremium[category];
                if (tools.length === 0) return null;
                const meta = CATEGORY_META[category];
                return (
                  <div key={`premium-${category}`} className="mt-4">
                    <div className="px-3 mb-2 flex items-center gap-2">
                      <span className="text-base">{meta.emoji}</span>
                      <span className="text-[13px] font-bold text-ink tracking-tight">
                        {category}
                      </span>
                    </div>

                    <div className="ml-4 pl-3 border-l-2 border-premium/30 space-y-0.5">
                      {tools.map((tool) => (
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
            </div>
          )}

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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold mb-1 transition ${
                  pathname.startsWith("/admin")
                    ? "bg-brandSoft text-brand"
                    : "text-sub hover:bg-chip"
                }`}
              >
                <span className="text-base">🛡️</span>
                <span>사용자 관리</span>
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

function SectionHeader({
  label,
  emoji,
  open,
  onToggle,
  tone,
  locked = false,
}: {
  label: string;
  emoji: string;
  open: boolean;
  onToggle: () => void;
  tone: "brand" | "premium";
  locked?: boolean;
}) {
  const colorClasses =
    tone === "premium"
      ? open
        ? "bg-premiumSoft text-premium border-premium/30"
        : "bg-surface text-premium border-premium/20 hover:bg-premiumSoft/60"
      : open
        ? "bg-brandSoft text-brand border-brand/30"
        : "bg-surface text-brand border-brand/20 hover:bg-brandSoft/60";

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-bold tracking-tight transition ${colorClasses}`}
    >
      <span className="text-base">{emoji}</span>
      <span className="flex-1 text-left">{label}</span>
      {locked && (
        <span className="text-[10px] opacity-70" aria-label="locked">
          🔒
        </span>
      )}
      <svg
        className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
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
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition ${
        active
          ? isPremium
            ? "bg-premiumSoft text-premium"
            : "bg-brandSoft text-brand"
          : disabled
            ? "text-mute cursor-not-allowed"
            : isPremium
              ? "text-sub hover:bg-premiumSoft hover:text-premium"
              : "text-sub hover:bg-chip hover:text-ink"
      }`}
    >
      <span className="text-sm">{tool.emoji}</span>
      <span className="truncate flex-1">{tool.name}</span>
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
