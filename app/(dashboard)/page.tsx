import Link from "next/link";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  TOOLS,
  getToolsByCategory,
  type Tool,
} from "@/lib/tools/registry";

export default function DashboardHome() {
  const grouped = getToolsByCategory();
  const liveCount = TOOLS.filter((t) => t.status === "live").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 sm:py-12">
      <div className="mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand mb-2">
          arkvvs.tools
        </p>
        <h1 className="text-3xl font-bold text-ink tracking-tight">대시보드</h1>
        <p className="text-base text-sub mt-2 max-w-2xl leading-relaxed">
          제작 단계별로 툴을 고르면 됩니다. 로그인한 수강생 전용이며, 툴은 계속
          늘어납니다.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-sub">
          <span
            className="inline-block size-2 rounded-full bg-success shrink-0"
            aria-hidden
          />
          지금 사용 가능한 툴 · {liveCount}개
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {CATEGORY_ORDER.map((category, idx) => {
          const tools = grouped[category];
          const meta = CATEGORY_META[category];
          return (
            <div
              key={category}
              className="flex flex-col rounded-xl2 border border-line bg-surface p-4 shadow-card"
            >
              {/* 카테고리 헤더 */}
              <div className="mb-4 px-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{meta.emoji}</span>
                  <h2 className="text-lg font-bold text-ink tracking-tight">
                    {category}
                  </h2>
                  <span className="ml-auto text-xs font-bold text-mute bg-chip px-2 py-0.5 rounded-md">
                    STEP {idx + 1}
                  </span>
                </div>
                <p className="text-[13px] text-mute leading-relaxed">
                  {meta.description}
                </p>
              </div>

              {/* 툴 카드들 (세로 스택) */}
              <div className="flex flex-col gap-3 flex-1">
                {tools.length === 0 ? (
                  <EmptyCategory />
                ) : (
                  tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)
                )}
              </div>
            </div>
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
      className={`relative p-5 rounded-xl2 bg-surface shadow-card border border-line transition flex flex-col ${
        isLive
          ? "hover:shadow-pop hover:-translate-y-0.5 hover:border-lineStrong"
          : "opacity-60 cursor-not-allowed"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl ${tool.color} flex items-center justify-center text-2xl mb-3`}
      >
        {tool.emoji}
      </div>

      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
        <h3 className="text-[15px] font-bold text-ink tracking-tight leading-snug">
          {tool.name}
        </h3>
      </div>

      <p className="text-[13px] text-sub leading-relaxed line-clamp-2 font-medium mb-3">
        {tool.description}
      </p>

      <div className="mt-auto flex items-center gap-1.5 flex-wrap">
        {tool.external && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-warnSoft text-warn">
            EXTERNAL ↗
          </span>
        )}
        {tool.status === "soon" && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-chip text-mute">
            SOON
          </span>
        )}
        {tool.status === "beta" && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-warnSoft text-warn">
            BETA
          </span>
        )}
        {isLive && (
          <span className="ml-auto text-[13px] font-bold text-brand">
            {tool.external ? "열기 →" : "사용하기 →"}
          </span>
        )}
      </div>
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
    <div className="flex-1 rounded-xl2 border-2 border-dashed border-line p-6 flex items-center justify-center min-h-[160px]">
      <p className="text-xs font-medium text-mute text-center">
        곧 툴이 추가됩니다
      </p>
    </div>
  );
}
