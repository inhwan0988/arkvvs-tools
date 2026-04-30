import Link from "next/link";
import { TOOLS } from "@/lib/tools/registry";

export default function DashboardHome() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">대시보드</h1>
        <p className="text-sm text-mute mt-1">
          사용할 툴을 선택하세요. 툴은 계속 추가됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOOLS.map((tool) => {
          const isLive = tool.status === "live";
          const Card = (
            <div
              className={`relative aspect-square p-7 rounded-xl3 bg-surface shadow-card border border-line transition flex flex-col ${
                isLive
                  ? "hover:shadow-pop hover:-translate-y-1 hover:border-lineStrong"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl ${tool.color} flex items-center justify-center text-3xl mb-5`}
              >
                {tool.emoji}
              </div>

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-[17px] font-bold text-ink">{tool.name}</h3>
                {tool.external && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-warnSoft text-warn">
                    EXTERNAL ↗
                  </span>
                )}
                {tool.status === "soon" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-chip text-mute">
                    SOON
                  </span>
                )}
                {tool.status === "beta" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-warnSoft text-warn">
                    BETA
                  </span>
                )}
              </div>

              <p className="text-sm text-sub leading-relaxed line-clamp-3">
                {tool.description}
              </p>

              {isLive && (
                <div className="mt-auto pt-4 flex items-center text-sm font-bold text-brand">
                  <span>{tool.external ? "새 탭에서 열기" : "사용하기"}</span>
                  <span className="ml-1">→</span>
                </div>
              )}
            </div>
          );
          return isLive ? (
            <Link
              key={tool.slug}
              href={tool.href}
              target={tool.external ? "_blank" : undefined}
              rel={tool.external ? "noopener noreferrer" : undefined}
              className="block"
            >
              {Card}
            </Link>
          ) : (
            <div key={tool.slug}>{Card}</div>
          );
        })}
      </div>
    </div>
  );
}
