"use client";

import type { SnsContentStats } from "@/lib/tools/sns-tracker/types";

export default function SummaryCards({
  contents,
}: {
  contents: SnsContentStats[];
}) {
  const totalContents = contents.length;
  const totalViews = contents.reduce((s, c) => s + (c.views ?? 0), 0);
  const totalClicks = contents.reduce((s, c) => s + (c.click_count ?? 0), 0);
  const avgConv =
    totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : "0.00";

  // 최근 7일
  const now = Date.now();
  const SEVEN = 7 * 86400_000;
  const recent = contents.filter(
    (c) => now - new Date(c.posted_at).getTime() < SEVEN,
  );
  const recentViews = recent.reduce((s, c) => s + (c.views ?? 0), 0);
  const recentClicks = recent.reduce((s, c) => s + (c.click_count ?? 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        label="총 콘텐츠"
        value={totalContents.toString()}
        sub={`최근 7일 ${recent.length}개`}
      />
      <Card
        label="총 조회수"
        value={formatNum(totalViews)}
        sub={`최근 7일 ${formatNum(recentViews)}`}
      />
      <Card
        label="총 링크 클릭"
        value={formatNum(totalClicks)}
        sub={`최근 7일 ${formatNum(recentClicks)}`}
        accent="success"
      />
      <Card
        label="평균 전환율"
        value={`${avgConv}%`}
        sub="(클릭 / 조회수)"
        accent="brand"
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "brand" | "success";
}) {
  const cls =
    accent === "success"
      ? "text-success"
      : accent === "brand"
        ? "text-brand"
        : "text-ink";
  return (
    <div className="rounded-xl2 border border-line bg-surface p-4">
      <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-[11px] text-sub mt-1">{sub}</p>}
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}
