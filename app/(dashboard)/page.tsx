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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* 헤더 */}
      <header className="mb-8 sm:mb-12">
        <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.14em] text-brand mb-2">
          arkvvs.tools
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          대시보드
        </h1>
        <p className="mt-3 text-base sm:text-lg text-sub leading-relaxed max-w-2xl">
          제작 단계별로 도구를 골라 사용하세요.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sub">
          <span
            className="inline-block size-2.5 rounded-full bg-success shrink-0"
            aria-hidden
          />
          지금 사용 가능한 도구 · {liveCount}개
        </p>
      </header>

      <CategoryGrid grouped={groupedFree} variant="free" />

      <div className="mt-14 sm:mt-16 mb-8 sm:mb-10 relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex items-center justify-center">
          <span className="bg-bg px-5 inline-flex items-center gap-2.5">
            <span className="text-2xl">⭐</span>
            <span className="text-lg sm:text-xl font-bold text-premium tracking-tight">
              회원전용
            </span>
            {isPremium ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-premiumSoft text-premium">
                MY ACCESS
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-chip text-mute">
                LOCKED
              </span>
            )}
          </span>
        </div>
        {!isPremium && (
          <p className="text-center text-sm text-mute mt-4 max-w-md mx-auto leading-relaxed">
            아래 도구는 수강생 회원에게만 열립니다. 회원 전환은 관리자에게
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
    // xl(1280px+)에서 4-column, lg에서 2-column, sm에서 2-column, 기본 1-column
    // → 일반 노트북에선 2-column으로 큰 카드, 와이드 모니터에선 4-column 한눈에
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
      {CATEGORY_ORDER.map((category, idx) => {
        const tools = grouped[category] ?? [];
        const meta = CATEGORY_META[category];
        const isPremiumCol = variant === "premium";
        return (
          <div
            key={`${variant}-${category}`}
            className={`flex flex-col rounded-xl3 border p-5 sm:p-6 shadow-card ${
              isPremiumCol
                ? "border-premium/30 bg-premiumSoft/40"
                : "border-line bg-surface"
            }`}
          >
            {/* 카테고리 헤더 (크게) */}
            <div className="mb-5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-3xl sm:text-[32px] leading-none">
                  {meta.emoji}
                </span>
                <h2 className="text-xl sm:text-[22px] font-bold text-ink tracking-tight">
                  {category}
                </h2>
                <span
                  className={`ml-auto text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md ${
                    isPremiumCol
                      ? "text-premium bg-premiumSoft"
                      : "text-mute bg-chip"
                  }`}
                >
                  STEP {idx + 1}
                </span>
              </div>
              <p className="text-sm sm:text-[15px] text-mute leading-relaxed">
                {meta.description}
              </p>
            </div>

            {/* 도구 카드들 */}
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
      className={`relative p-5 sm:p-6 rounded-xl2 shadow-card border transition flex flex-col ${
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
      {/* 큰 이모지 박스 */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl2 ${tool.color} flex items-center justify-center text-3xl sm:text-[34px] mb-4`}
      >
        {tool.emoji}
      </div>

      {/* 이름 (크게) */}
      <h3 className="text-base sm:text-[17px] font-bold text-ink tracking-tight leading-snug mb-1.5">
        {tool.name}
      </h3>

      {/* 설명 (2줄) */}
      <p className="text-[13px] sm:text-sm text-sub leading-relaxed line-clamp-2 font-medium mb-3.5">
        {tool.description}
      </p>

      {/* 하단 배지 + CTA */}
      <div className="mt-auto flex items-center gap-1.5 flex-wrap">
        {isPremium && (
          <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-premiumSoft text-premium">
            {locked ? "🔒 회원전용" : "⭐ 회원전용"}
          </span>
        )}
        {tool.external && (
          <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-warnSoft text-warn">
            EXTERNAL ↗
          </span>
        )}
        {tool.status === "soon" && (
          <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-chip text-mute">
            SOON
          </span>
        )}
        {tool.status === "beta" && (
          <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-warnSoft text-warn">
            BETA
          </span>
        )}
        {clickable && (
          <span
            className={`ml-auto text-sm font-bold ${
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
      className={`flex-1 rounded-xl2 border-2 border-dashed p-6 flex items-center justify-center min-h-[180px] ${
        premium ? "border-premium/30" : "border-line"
      }`}
    >
      <p className="text-sm font-medium text-mute text-center">
        곧 도구가 추가됩니다
      </p>
    </div>
  );
}
