import Link from "next/link";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  getToolsByCategory,
  type Tool,
} from "@/lib/tools/registry";

export default function DashboardHome() {
  const grouped = getToolsByCategory();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-ink tracking-tight">대시보드</h1>
        <p className="text-base text-sub mt-2">
          유튜브 제작 흐름에 따라 툴을 선택하세요. 툴은 계속 추가됩니다.
        </p>
      </div>

      <div className="space-y-12">
        {CATEGORY_ORDER.map((category) => {
          const tools = grouped[category];
          const meta = CATEGORY_META[category];
          return (
            <section key={category}>
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-xl font-bold text-ink tracking-tight">
                  <span className="mr-2">{meta.emoji}</span>
                  {category}
                </h2>
                <p className="text-sm text-mute">{meta.description}</p>
              </div>

              {tools.length === 0 ? (
                <EmptyCategory />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const isLive = tool.status === "live";
  const card = (
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

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h3 className="text-xl font-bold text-ink tracking-tight">
          {tool.name}
        </h3>
        {tool.external && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-warnSoft text-warn">
            EXTERNAL ↗
          </span>
        )}
        {tool.status === "soon" && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-chip text-mute">
            SOON
          </span>
        )}
        {tool.status === "beta" && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-warnSoft text-warn">
            BETA
          </span>
        )}
      </div>

      <p className="text-[15px] text-sub leading-relaxed line-clamp-3 font-medium">
        {tool.description}
      </p>

      {isLive && (
        <div className="mt-auto pt-5 flex items-center text-[15px] font-bold text-brand">
          <span>{tool.external ? "새 탭에서 열기" : "사용하기"}</span>
          <span className="ml-1">→</span>
        </div>
      )}
    </div>
  );

  return isLive ? (
    <Link
      href={tool.href}
      target={tool.external ? "_blank" : undefined}
      rel={tool.external ? "noopener noreferrer" : undefined}
      className="block"
    >
      {card}
    </Link>
  ) : (
    <div>{card}</div>
  );
}

function EmptyCategory() {
  return (
    <div className="rounded-xl3 border-2 border-dashed border-line py-12 text-center">
      <p className="text-base font-medium text-mute">
        곧 다양한 툴이 추가됩니다
      </p>
    </div>
  );
}
