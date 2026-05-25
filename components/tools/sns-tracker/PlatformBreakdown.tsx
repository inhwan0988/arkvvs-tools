"use client";

import { aggregateByPlatform } from "@/lib/tools/sns-tracker/aggregator";
import { PLATFORM_META, type SnsContentStats } from "@/lib/tools/sns-tracker/types";

export default function PlatformBreakdown({
  contents,
}: {
  contents: SnsContentStats[];
}) {
  const map = aggregateByPlatform(contents);
  const rows = [...map.entries()].sort((a, b) => b[1].clicks - a[1].clicks);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl2 border border-line bg-surface p-6 text-center text-sub text-sm">
        아직 등록된 콘텐츠가 없어요.
      </div>
    );
  }

  return (
    <div className="rounded-xl2 border border-line bg-surface p-4">
      <h3 className="text-sm font-bold text-ink mb-3">📊 플랫폼별 성과</h3>
      <div className="space-y-2">
        {rows.map(([platform, agg]) => {
          const meta = PLATFORM_META[platform];
          const conversion = agg.conversion.toFixed(2);
          return (
            <div
              key={platform}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-chip"
            >
              <span className="text-lg w-8 text-center">{meta?.emoji ?? "🔗"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{meta?.label ?? platform}</p>
                <p className="text-[11px] text-sub">
                  {agg.count}개 · 조회 {formatNum(agg.views)} · 클릭 {formatNum(agg.clicks)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-brand">{conversion}%</p>
                <p className="text-[10px] text-mute">전환율</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}
