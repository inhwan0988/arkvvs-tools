"use client";

import type { SnsContentStats } from "@/lib/tools/sns-tracker/types";

/**
 * 토스 스타일 요약 카드 — 큰 숫자 3개만.
 */
export default function TossSummary({
  contents,
}: {
  contents: SnsContentStats[];
}) {
  const totalClicks = contents.reduce((s, c) => s + (c.click_count ?? 0), 0);
  const totalContents = contents.length;

  // 오늘 클릭 추정 — last_click_at 기반은 부정확하니, 24h 안 contents 우선 표시
  const now = Date.now();
  const recent24h = contents.filter(
    (c) => c.last_click_at && now - new Date(c.last_click_at).getTime() < 24 * 60 * 60 * 1000,
  );
  const recent24hClicks = recent24h.reduce((s, c) => s + (c.click_count ?? 0), 0);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Stat label="총 클릭" value={fmt(totalClicks)} accent />
      <Stat label="단축 URL" value={fmt(totalContents)} />
      <Stat label="최근 24h 활동" value={`${recent24h.length}개`} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl2 bg-white p-4 shadow-card">
      <p className="text-[11px] font-semibold text-mute mb-1">{label}</p>
      <p
        className={`text-xl sm:text-2xl font-bold ${accent ? "text-brand" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}
