import { requireApproved } from "@/lib/auth";
import { getToolsByCategory, TOOLS } from "@/lib/tools/registry";
import GuidesGrid from "@/components/dashboard/GuidesGrid";

export default async function GuidesPage() {
  const profile = await requireApproved();
  const isPremium = profile.tier === "premium";

  const groupedFree = getToolsByCategory({ membersOnly: false });
  const groupedPremium = getToolsByCategory({ membersOnly: true });

  const videoCount = TOOLS.filter((t) => Boolean(t.guideVideoUrl)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-8 sm:mb-12">
        <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.14em] text-brand mb-2">
          가이드 · GUIDES
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          이용방법
        </h1>
        <p className="mt-3 text-base sm:text-lg text-sub leading-relaxed max-w-2xl">
          도구별로 유튜브 사용법 영상을 확인하세요. 카드 클릭 시 바로 재생됩니다.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sub">
          <span
            className="inline-block size-2.5 rounded-full bg-danger shrink-0"
            aria-hidden
          />
          업로드된 영상 · {videoCount}개
        </p>
      </header>

      <GuidesGrid
        groupedFree={groupedFree}
        groupedPremium={groupedPremium}
        isPremium={isPremium}
      />
    </div>
  );
}
