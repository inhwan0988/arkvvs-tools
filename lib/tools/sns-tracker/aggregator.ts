/**
 * 클라이언트 측 집계 헬퍼.
 */
import type { SnsContentStats, Platform } from "./types";

export function aggregateByPlatform(contents: SnsContentStats[]) {
  const map = new Map<
    Platform,
    {
      count: number;
      views: number;
      clicks: number;
      conversion: number;
    }
  >();
  for (const c of contents) {
    const cur = map.get(c.platform) ?? { count: 0, views: 0, clicks: 0, conversion: 0 };
    cur.count += 1;
    cur.views += c.views ?? 0;
    cur.clicks += c.click_count ?? 0;
    map.set(c.platform, cur);
  }
  for (const v of map.values()) {
    v.conversion = v.views > 0 ? (v.clicks / v.views) * 100 : 0;
  }
  return map;
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // 월요일을 주 시작으로 (1=월)
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function isWithinWeek(date: string, weekStart: Date): boolean {
  const t = new Date(date).getTime();
  const start = weekStart.getTime();
  const end = start + 7 * 86400_000;
  return t >= start && t < end;
}

export function rankBest(
  contents: SnsContentStats[],
  metric: "clicks" | "conversion" | "views" = "clicks",
): SnsContentStats[] {
  const arr = [...contents].filter((c) => (c.views ?? 0) >= 10); // 너무 조회수 적으면 노이즈
  arr.sort((a, b) => {
    if (metric === "clicks") return (b.click_count ?? 0) - (a.click_count ?? 0);
    if (metric === "views") return (b.views ?? 0) - (a.views ?? 0);
    return (b.conversion_rate_pct ?? 0) - (a.conversion_rate_pct ?? 0);
  });
  return arr;
}

export function rankWorst(
  contents: SnsContentStats[],
  metric: "clicks" | "conversion" | "views" = "conversion",
): SnsContentStats[] {
  // 게시는 됐는데 (조회수 있음) 성과 낮은 콘텐츠
  const arr = [...contents].filter((c) => (c.views ?? 0) >= 100);
  arr.sort((a, b) => {
    if (metric === "clicks") return (a.click_count ?? 0) - (b.click_count ?? 0);
    if (metric === "views") return (a.views ?? 0) - (b.views ?? 0);
    return (a.conversion_rate_pct ?? 0) - (b.conversion_rate_pct ?? 0);
  });
  return arr;
}
