"use client";

import { useWizard } from "./WizardContext";

export default function Step4Generate() {
  const { goToStep } = useWizard();
  return (
    <div className="text-center py-12">
      <p className="text-lg font-bold text-ink">🚧 대본 생성</p>
      <p className="text-sm text-sub mt-2">다음 commit에서 구현 예정</p>
      <button
        onClick={() => goToStep(3)}
        className="mt-4 text-sm font-semibold text-brand hover:underline"
      >
        ← 이전
      </button>
    </div>
  );
}
