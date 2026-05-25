import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * 사용자 SNS 트래커 전체 요약 통계.
 * - 플랫폼별 총 조회수 / 클릭수 / 전환율
 * - 최근 7일 / 30일 합계
 * - 베스트 5
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: stats, error } = await supabase
    .from("sns_content_stats")
    .select("*")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = stats ?? [];

  type Stat = {
    content_id: string;
    platform: string;
    title: string;
    views: number;
    click_count: number;
    conversion_rate_pct: number;
    posted_at: string;
  };
  const r = rows as Stat[];

  const totals = {
    totalContents: r.length,
    totalViews: r.reduce((s, x) => s + (x.views ?? 0), 0),
    totalClicks: r.reduce((s, x) => s + (x.click_count ?? 0), 0),
  };
  const avgConversion =
    totals.totalViews > 0 ? (totals.totalClicks / totals.totalViews) * 100 : 0;

  // 플랫폼별
  const byPlatform: Record<string, { views: number; clicks: number; count: number }> = {};
  for (const row of r) {
    const p = row.platform;
    if (!byPlatform[p]) byPlatform[p] = { views: 0, clicks: 0, count: 0 };
    byPlatform[p].views += row.views ?? 0;
    byPlatform[p].clicks += row.click_count ?? 0;
    byPlatform[p].count += 1;
  }

  // 최근 7일
  const now = Date.now();
  const SEVEN = 7 * 86400_000;
  const recent7 = r.filter((x) => now - new Date(x.posted_at).getTime() < SEVEN);

  // 베스트 (클릭 기준 상위 5)
  const top5 = [...r]
    .sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0))
    .slice(0, 5);

  return NextResponse.json({
    totals: {
      ...totals,
      avgConversion: Math.round(avgConversion * 100) / 100,
    },
    byPlatform,
    recent7: {
      count: recent7.length,
      views: recent7.reduce((s, x) => s + (x.views ?? 0), 0),
      clicks: recent7.reduce((s, x) => s + (x.click_count ?? 0), 0),
    },
    top5,
  });
}
