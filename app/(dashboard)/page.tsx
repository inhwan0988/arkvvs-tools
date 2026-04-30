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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const isLive = tool.status === "live";
          const Card = (
            <div
              className={`relative p-6 rounded-xl3 bg-surface shadow-card border border-line transition ${
                isLive ? "hover:shadow-pop hover:-translate-y-0.5" : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl ${tool.color} flex items-center justify-center text-2xl mb-4`}
              >
                {tool.emoji}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[16px] font-bold text-ink">{tool.name}</h3>
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
              <p className="text-sm text-sub leading-relaxed">{tool.description}</p>
            </div>
          );
          return isLive ? (
            <Link
              key={tool.slug}
              href={tool.href}
              target={tool.external ? "_blank" : undefined}
              rel={tool.external ? "noopener noreferrer" : undefined}
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
