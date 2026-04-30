"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  getToolsByCategory,
  type Tool,
} from "@/lib/tools/registry";

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const grouped = getToolsByCategory();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-surface border-r border-line">
      <div className="h-16 flex items-center px-5 border-b border-line">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="font-bold text-ink tracking-tight">arkvvs.tools</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-bold mb-1 transition ${
            pathname === "/"
              ? "bg-brandSoft text-brand"
              : "text-ink hover:bg-chip"
          }`}
        >
          <span className="text-base">🏠</span>
          <span>대시보드</span>
        </Link>

        {CATEGORY_ORDER.map((category, idx) => {
          const tools = grouped[category];
          if (tools.length === 0) return null;
          const meta = CATEGORY_META[category];
          return (
            <div key={category} className="mt-5">
              {/* 카테고리 헤더 */}
              <div className="px-3 mb-2 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-mute tracking-wider">
                    STEP {idx + 1}
                  </span>
                </div>
                <div className="h-px bg-line flex-1" />
              </div>
              <div className="px-3 mb-2.5 flex items-center gap-2">
                <span className="text-base">{meta.emoji}</span>
                <span className="text-[13px] font-bold text-ink tracking-tight">
                  {category}
                </span>
              </div>

              {/* 툴 목록 — 좌측 vertical line 으로 그룹 시각화 */}
              <div className="ml-4 pl-3 border-l-2 border-line space-y-0.5">
                {tools.map((tool) => (
                  <SidebarLink key={tool.slug} tool={tool} pathname={pathname} />
                ))}
              </div>
            </div>
          );
        })}

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
  );
}

function SidebarLink({ tool, pathname }: { tool: Tool; pathname: string }) {
  const active =
    !tool.external && pathname.startsWith(tool.href) && tool.href !== "#";
  const disabled = tool.status !== "live";
  return (
    <Link
      href={disabled ? "#" : tool.href}
      target={tool.external ? "_blank" : undefined}
      rel={tool.external ? "noopener noreferrer" : undefined}
      onClick={(e) => disabled && e.preventDefault()}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition ${
        active
          ? "bg-brandSoft text-brand"
          : disabled
          ? "text-mute cursor-not-allowed"
          : "text-sub hover:bg-chip hover:text-ink"
      }`}
    >
      <span className="text-sm">{tool.emoji}</span>
      <span className="truncate flex-1">{tool.name}</span>
      {tool.external && <span className="text-mute text-[11px]">↗</span>}
      {tool.status === "soon" && (
        <span className="text-[9px] font-bold text-mute bg-chip px-1.5 py-0.5 rounded">
          SOON
        </span>
      )}
    </Link>
  );
}
