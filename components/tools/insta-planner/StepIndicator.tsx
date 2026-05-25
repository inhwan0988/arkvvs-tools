"use client";

import type { WizardStep } from "@/lib/tools/insta-planner/types";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "영감 채널" },
  { id: 2, label: "콘텐츠 선택" },
  { id: 3, label: "분석 + 의도" },
  { id: 4, label: "대본 생성" },
];

export default function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 ${active ? "" : done ? "opacity-100" : "opacity-50"}`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  done
                    ? "bg-success text-white"
                    : active
                      ? "bg-brand text-white"
                      : "bg-line text-mute"
                }`}
              >
                {done ? "✓" : s.id}
              </span>
              <span
                className={`text-sm font-semibold ${
                  active ? "text-ink" : "text-sub"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`w-8 h-px ${done ? "bg-success" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
