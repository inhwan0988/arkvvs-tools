import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  TOOLS,
  getToolsByCategory,
  type Tool,
} from "@/lib/tools/registry";

export default async function DashboardHome() {
  const profile = await requireApproved();
  const isPremium = profile.tier === "premium";

  const groupedFree = getToolsByCategory({ membersOnly: false });
  const groupedPremium = getToolsByCategory({ membersOnly: true });
  const liveCount = TOOLS.filter(
    (t) => t.status === "live" && !t.membersOnly,
  ).length;

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

      <CategoryGrid grouped={groupedFree} variant="free" />

      <div className="mt-14 mb-8 relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex items-center justify-center">
          <span className="bg-bg px-4 inline-flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <span className="text-sm font-bold text-premium tracking-tight">
              회원전용
            </span>
            {isPremium ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-premiumSoft text-premium">
                MY ACCESS
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-chip text-mute">
                LOCKED
              </span>
            )}
          </span>
        </div>
        {!isPremium && (
          <p className="text-center text-xs text-mute mt-3 max-w-md mx-auto leading-relaxed">
            아래 툴은 수강생 회원에게만 열립니다. 회원 전환은 관리자에게
            문의해주세요.
          </p>
        )}
      </div>

      <CategoryGrid
        grouped={groupedPremium}
        variant="premium"
        locked={!isPremium}
      />
    </div>
  );
}

function CategoryGrid({
  grouped,
  variant,
  locked = false,
}: {
  grouped: Record<string, Tool[]>;
  variant: "free" | "premium";
  locked?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {CATEGORY_ORDER.map((category, idx) => {
        const tools = grouped[category] ?? [];
        const meta = CATEGORY_META[category];
        const isPremiumCol = variant === "premium";
        return (
          <div
            key={`${variant}-${category}`}
            className={`flex flex-col rounded-xl2 border p-4 shadow-card ${
              isPremiumCol
                ? "border-premium/30 bg-premiumSoft/40"
                : "border-line bg-surface"
            }`}
          >
            <div className="mb-4 px-0.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{meta.emoji}</span>
                <h2 className="text-lg font-bold text-ink tracking-tight">
                  {category}
                </h2>
                <span
                  className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-md ${
                    isPremiumCol
                      ? "text-premium bg-premiumSoft"
                      : "text-mute bg-chip"
                  }`}
                >
                  STEP {idx + 1}
                </span>
              </div>
              <p className="text-[13px] text-mute leading-relaxed">
                {meta.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {tools.length === 0 ? (
                <EmptyCategory premium={isPremiumCol} />
              ) : (
                tools.map((tool) => (
                  <ToolCard
                    key={tool.slug}
                    tool={tool}
                    locked={locked && Boolean(tool.membersOnly)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ToolCard({ tool, locked = false }: { tool: Tool; locked?: boolean }) {
  const isLive = tool.status === "live";
  const isPremium = Boolean(tool.membersOnly);
  const clickable = isLive && !locked;

  const card = (
    <div
      className={`relative p-5 rounded-xl2 shadow-card border transition flex flex-col ${
        isPremium
          ? "bg-surface border-premium/30"
          : "bg-surface border-line"
      } ${
        clickable
          ? isPremium
            ? "hover:shadow-pop hover:-translate-y-0.5 hover:border-premium"
            : "hover:shadow-pop hover:-translate-y-0.5 hover:border-lineStrong"
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
        {isPremium && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-premiumSoft text-premium">
            {locked ? "🔒 회원전용" : "⭐ 회원전용"}
          </span>
        )}
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
        {clickable && (
          <span
            className={`ml-auto text-[13px] font-bold ${
              isPremium ? "text-premium" : "text-brand"
            }`}
          >
            {tool.external ? "열기 →" : "사용하기 →"}
          </span>
        )}
      </div>
    </div>
  );

  return clickable ? (
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

function EmptyCategory({ premium = false }: { premium?: boolean }) {
  return (
    <div
      className={`flex-1 rounded-xl2 border-2 border-dashed p-6 flex items-center justify-center min-h-[160px] ${
        premium ? "border-premium/30" : "border-line"
      }`}
    >
      <p className="text-xs font-medium text-mute text-center">
        곧 툴이 추가됩니다
      </p>
    </div>
  );
}
