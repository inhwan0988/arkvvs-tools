"use client";

import { useWizard } from "./WizardContext";

export default function Step3Analysis() {
  const { selectedReel, goToStep } = useWizard();

  if (!selectedReel) {
    return (
      <div className="text-center py-12">
        <p className="text-sub">콘텐츠를 먼저 선택해주세요.</p>
        <button
          onClick={() => goToStep(2)}
          className="mt-4 text-sm font-semibold text-brand hover:underline"
        >
          ← 콘텐츠 선택으로
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">분석 + 의도 입력</h2>
        <button
          onClick={() => goToStep(2)}
          className="text-sm font-semibold text-sub hover:text-ink"
        >
          ← 콘텐츠 선택
        </button>
      </div>

      {/* 선택한 콘텐츠 미리보기 */}
      <div className="rounded-xl2 border border-line bg-surface p-4 flex gap-4">
        {selectedReel.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedReel.thumbnail}
            alt=""
            className="w-32 h-32 object-cover rounded-lg shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-mute">분석할 콘텐츠</p>
          <p className="text-sm font-bold text-ink mt-1">
            @{selectedReel.ownerUsername}
          </p>
          <p className="text-[12px] text-sub line-clamp-3 mt-1">
            {selectedReel.caption || "(캡션 없음)"}
          </p>
          <p className="text-[11px] text-mute mt-2">
            IVS {selectedReel.ivs}배 · 참여율 {selectedReel.engagementRate}%
          </p>
        </div>
      </div>

      {/* TODO: 다음 commit에서 vvs-planner 패턴 적용 */}
      <div className="rounded-xl2 border-2 border-dashed border-brand/30 bg-brandSoft/30 p-8 text-center">
        <p className="text-lg font-bold text-ink mb-2">
          🚧 분석 + 의도 입력 + 대본 생성
        </p>
        <p className="text-sm text-sub">
          다음 단계 (Step 3-4): vvs-planner v3 패턴 적용 예정
        </p>
        <p className="text-xs text-mute mt-2">
          현재 MVP에서는 Step 1-2 (영감 채널 → 콘텐츠 선택)까지 작동
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => goToStep(4)}
          className="rounded-xl bg-brand/40 px-6 py-2.5 text-sm font-bold text-white cursor-not-allowed"
          disabled
        >
          다음: 대본 생성 (개발 중)
        </button>
      </div>
    </div>
  );
}
