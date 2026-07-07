import { requireApproved } from "@/lib/auth";
import { TOOLS } from "@/lib/tools/registry";
import GuidesGrid from "@/components/dashboard/GuidesGrid";

export default async function GuidesPage() {
  const profile = await requireApproved();
  const isPremium = profile.tier === "premium";

  const videoCount = TOOLS.filter((t) => Boolean(t.guideVideoUrl)).length;
  const totalCount = TOOLS.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* 헤더 — 유튜브/영상 라이브러리 톤 */}
      <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.14em] text-danger mb-2">
            🎬 GUIDES
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            영상으로 배우는 도구 사용법
          </h1>
          <p className="mt-3 text-sm sm:text-base text-sub leading-relaxed max-w-2xl">
            도구별 실전 예시를 영상으로 담았어요. 카드를 눌러 바로 재생하세요.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-mute font-bold shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-danger animate-pulse" />
            영상 {videoCount}개
          </span>
          <span className="text-line">·</span>
          <span>전체 {totalCount}개 도구</span>
        </div>
      </header>

      <GuidesGrid isPremium={isPremium} />
    </div>
  );
}
