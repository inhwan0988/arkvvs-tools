"use client";

import type { VideoAnalysis } from "@/lib/tools/vvs-planner/types";

/**
 * 영상 분석 결과를 카드로 시각화.
 * 사용자가 "이 영상이 어떤 영상인지" 한눈에 파악.
 */
export default function VideoAnalysisCard({
  analysis,
}: {
  analysis: VideoAnalysis;
}) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <h3 className="text-sm font-bold text-ink">이 영상 분석 결과</h3>
      </div>

      {/* 핵심 한 줄 */}
      <div className="mb-4 rounded-lg bg-brandSoft/50 p-3">
        <p className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1">
          핵심 주제
        </p>
        <p className="text-sm font-bold text-ink leading-relaxed">
          {analysis.coreTheme}
        </p>
      </div>

      {/* 영상 구조 */}
      <div className="mb-4">
        <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-2">
          📺 영상 구조
        </p>
        <ul className="space-y-1.5 text-[13px] text-sub">
          <li className="flex gap-2">
            <span className="shrink-0 text-mute w-12">인트로</span>
            <span className="flex-1">{analysis.structure.intro}</span>
          </li>
          {analysis.structure.mainPoints.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-mute w-12">본론 {i + 1}</span>
              <span className="flex-1">{p}</span>
            </li>
          ))}
          <li className="flex gap-2">
            <span className="shrink-0 text-mute w-12">결론</span>
            <span className="flex-1">{analysis.structure.conclusion}</span>
          </li>
        </ul>
      </div>

      {/* 2-column grid: 후킹 패턴 + 타겟 시청자 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1.5">
            🎯 사용된 후킹 패턴
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.hookPatterns.map((p, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 bg-dangerSoft/40 text-danger rounded font-semibold"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1.5">
            👥 타겟 시청자
          </p>
          <p className="text-[12px] text-sub leading-snug">
            {analysis.targetAudience}
          </p>
        </div>
      </div>

      {/* 떡상 이유 + 빌릴 만한 angle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
        <div>
          <p className="text-[10px] font-bold text-success uppercase tracking-wider mb-1.5">
            🔥 떡상 추정 이유
          </p>
          <ul className="space-y-0.5">
            {analysis.viralReasons.map((r, i) => (
              <li key={i} className="text-[12px] text-sub flex gap-1">
                <span>•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold text-warn uppercase tracking-wider mb-1.5">
            💡 빌릴 만한 angle
          </p>
          <ul className="space-y-0.5">
            {analysis.borrowableAngles.map((a, i) => (
              <li key={i} className="text-[12px] text-sub flex gap-1">
                <span>•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
