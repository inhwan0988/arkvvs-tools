"use client";

import { cn } from "@/lib/tools/vvs-planner/utils";

type IndicatorStep = 1 | 2 | 3 | 4;

const STEPS: { step: IndicatorStep; label: string }[] = [
  { step: 1, label: "키워드 검색" },
  { step: 2, label: "영상 선택" },
  { step: 3, label: "주제 선택" },
  { step: 4, label: "대본 생성" },
];

export default function StepIndicator({ current }: { current: IndicatorStep }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map(({ step, label }, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                step === current
                  ? "bg-brand text-white"
                  : step < current
                    ? "bg-success text-white"
                    : "bg-chip text-mute",
              )}
            >
              {step < current ? "✓" : step}
            </div>
            <span
              className={cn(
                "hidden text-sm font-semibold sm:inline",
                step === current ? "text-ink" : "text-mute",
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "h-px w-8 sm:w-12",
                step < current ? "bg-success" : "bg-line",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
