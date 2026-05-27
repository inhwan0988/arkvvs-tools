import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyTrafficSource } from "@/lib/tools/sns-tracker/referer-classify";

export const runtime = "nodejs";

/**
 * 단축 URL 1개 상세 분석:
 *  - 시간대별 클릭 (최근 30일, 일 단위)
 *  - 출처(referer) 분포 — 자동 classify
 *  - 국가 분포
 *  - 디바이스 (mobile/desktop/tablet)
 *  - 최근 클릭 list (50개)
 *
 * GET /api/tools/sns-tracker/contents/{shortId}/analytics?days=30
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { shortId } = await params;
  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "30", 10), 90);

  // 콘텐츠 owner 검증
  const { data: content, error: cErr } = await supabase
    .from("sns_content_stats")
    .select("*")
    .eq("short_id", shortId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (cErr || !content) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }

  // 모든 클릭 fetch (최근 days일)
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data: clicks, error: clickErr } = await supabase
    .from("link_clicks")
    .select("clicked_at, ua, referer, country, utm_source, is_bot")
    .eq("short_id", shortId)
    .gte("clicked_at", since)
    .order("clicked_at", { ascending: false });
  if (clickErr)
    return NextResponse.json({ error: clickErr.message }, { status: 500 });

  type Click = {
    clicked_at: string;
    ua: string | null;
    referer: string | null;
    country: string | null;
    utm_source: string | null;
    is_bot: boolean;
  };
  const all = (clicks ?? []) as Click[];
  const real = all.filter((c) => !c.is_bot);

  // ━ 시간대별 (일 단위) ━
  const daily = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    daily.set(toLocalDateKey(d), 0);
  }
  for (const c of real) {
    const key = toLocalDateKey(new Date(c.clicked_at));
    if (daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + 1);
  }
  const timeline = [...daily.entries()].map(([date, count]) => ({ date, count }));

  // ━ 출처(referer + UA) 분류 ━
  const sourceCounts = new Map<string, number>();
  for (const c of real) {
    const platform =
      classifyTrafficSource(c.referer, c.ua) ?? // 1순위: classify
      c.utm_source ?? // 2순위: utm
      (c.referer ? "etc" : "direct"); // 3순위: referer 있으면 etc, 없으면 direct
    sourceCounts.set(platform, (sourceCounts.get(platform) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  // ━ 국가 분포 ━
  const countryCounts = new Map<string, number>();
  for (const c of real) {
    const key = c.country || "Unknown";
    countryCounts.set(key, (countryCounts.get(key) ?? 0) + 1);
  }
  const countries = [...countryCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ━ 디바이스 분류 ━
  const deviceCounts = new Map<string, number>();
  for (const c of real) {
    deviceCounts.set(
      detectDevice(c.ua),
      (deviceCounts.get(detectDevice(c.ua)) ?? 0) + 1,
    );
  }
  const devices = [...deviceCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  // ━ 최근 클릭 (마지막 50개) ━
  const recent = real.slice(0, 50).map((c) => ({
    clickedAt: c.clicked_at,
    platform: classifyTrafficSource(c.referer, c.ua),
    country: c.country,
    device: detectDevice(c.ua),
    referer: c.referer,
  }));

  // ━ 요약 ━
  const now = Date.now();
  const todayClicks = real.filter(
    (c) => now - new Date(c.clicked_at).getTime() < 86400_000,
  ).length;
  const last7Clicks = real.filter(
    (c) => now - new Date(c.clicked_at).getTime() < 7 * 86400_000,
  ).length;

  return NextResponse.json({
    content,
    summary: {
      totalClicks: real.length,
      botClicks: all.length - real.length,
      todayClicks,
      last7Clicks,
    },
    timeline,
    sources,
    countries,
    devices,
    recent,
  });
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function detectDevice(ua: string | null): "mobile" | "tablet" | "desktop" {
  if (!ua) return "desktop";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}
