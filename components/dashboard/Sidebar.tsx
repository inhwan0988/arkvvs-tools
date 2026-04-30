"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOLS } from "@/lib/tools/registry";

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col bg-surface border-r border-line">
      <div className="h-16 flex items-center px-6 border-b border-line">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="font-bold text-ink tracking-tight">arkvvs.tools</span>
        </Link>
      </div>

      <nav className="flex-1 p-3">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition ${
            pathname === "/" ? "bg-brandSoft text-brand" : "text-sub hover:bg-chip"
          }`}
        >
          <span>🏠</span>
          <span>대시보드</span>
        </Link>

        <p className="text-[11px] font-bold uppercase text-mute px-3 mt-5 mb-2 tracking-wider">
          Tools
        </p>

        {TOOLS.map((tool) => {
          const active = pathname.startsWith(tool.href) && tool.href !== "#";
          const disabled = tool.status !== "live";
          return (
            <Link
              key={tool.slug}
              href={disabled ? "#" : tool.href}
              onClick={(e) => disabled && e.preventDefault()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition ${
                active
                  ? "bg-brandSoft text-brand"
                  : disabled
                  ? "text-mute cursor-not-allowed"
                  : "text-sub hover:bg-chip"
              }`}
            >
              <span>{tool.emoji}</span>
              <span className="truncate">{tool.name}</span>
              {tool.status === "soon" && (
                <span className="ml-auto text-[10px] font-bold text-mute">SOON</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="text-[11px] font-bold uppercase text-mute px-3 mt-5 mb-2 tracking-wider">
              Admin
            </p>
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition ${
                pathname.startsWith("/admin")
                  ? "bg-brandSoft text-brand"
                  : "text-sub hover:bg-chip"
              }`}
            >
              <span>🛡️</span>
              <span>사용자 관리</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
