import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlack } from "@/lib/notify/slack";

export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const MONTHLY_BUDGET_USD = Number(process.env.MONTHLY_BUDGET_USD || "70");

/**
 * 매일 KST 09:00 (= 00:00 UTC) 실행.
 * - 어제 (KST 00:00 ~ 오늘 KST 00:00) 사용량 요약
 * - 이번 달 누적 비용
 * - 월 예산 대비 소진율 → 50%/80%/100% 임계치 알림
 * → Slack 발송.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const kstMs = 9 * 60 * 60 * 1000;

  // 어제 KST 자정 ~ 오늘 KST 자정
  const kstNow = new Date(now.getTime() + kstMs);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  const todayKst = new Date(Date.UTC(y, m, d) - kstMs);
  const yesterdayKst = new Date(todayKst.getTime() - 24 * 60 * 60 * 1000);
  const monthStartKst = new Date(Date.UTC(y, m, 1) - kstMs);

  // ─── 어제 요약 ───
  const { data: yesterdayLogs, error: yErr } = await admin
    .from("usage_logs")
    .select("tool_slug, action, cost_usd, tokens_in, tokens_out, status, used_own_key, user_id")
    .gte("created_at", yesterdayKst.toISOString())
    .lt("created_at", todayKst.toISOString());
  if (yErr) {
    return NextResponse.json({ error: yErr.message }, { status: 500 });
  }

  type Row = {
    tool_slug: string;
    action: string;
    cost_usd: number;
    tokens_in: number;
    tokens_out: number;
    status: string;
    used_own_key: boolean;
    user_id: string;
  };
  const yLogs = (yesterdayLogs || []) as Row[];

  let yTotalCost = 0;
  let yCalls = 0;
  let yFreeCalls = 0;
  let yBlocked = 0;
  const perTool: Record<string, { calls: number; cost: number }> = {};
  const perUser: Record<string, { calls: number; cost: number }> = {};
  for (const l of yLogs) {
    if (l.status === "blocked") {
      yBlocked++;
      continue;
    }
    yCalls++;
    if (!l.used_own_key) yFreeCalls++;
    yTotalCost += Number(l.cost_usd) || 0;
    const t = (perTool[l.tool_slug] ||= { calls: 0, cost: 0 });
    t.calls++;
    t.cost += Number(l.cost_usd) || 0;
    const u = (perUser[l.user_id] ||= { calls: 0, cost: 0 });
    u.calls++;
    u.cost += Number(l.cost_usd) || 0;
  }

  // ─── 이번 달 누적 비용 (BYOK 제외 = 조슈아 부담분만) ───
  const { data: monthLogs, error: mErr } = await admin
    .from("usage_logs")
    .select("cost_usd")
    .eq("used_own_key", false)
    .eq("status", "ok")
    .gte("created_at", monthStartKst.toISOString());
  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }
  const monthCost = (monthLogs || []).reduce(
    (acc: number, r: { cost_usd: number }) => acc + (Number(r.cost_usd) || 0),
    0,
  );
  const monthPct = MONTHLY_BUDGET_USD > 0 ? monthCost / MONTHLY_BUDGET_USD : 0;

  // ─── 상위 사용자 3명 ───
  const topUsers = Object.entries(perUser)
    .sort((a, b) => b[1].calls - a[1].calls)
    .slice(0, 3);
  const topUserIds = topUsers.map(([id]) => id);
  const emailMap: Record<string, string> = {};
  if (topUserIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", topUserIds);
    (profs || []).forEach((p: { id: string; email: string | null }) => {
      emailMap[p.id] = p.email || p.id.slice(0, 8);
    });
  }

  // ─── Slack 메시지 조립 ───
  const emoji =
    monthPct >= 1 ? "🚨"
    : monthPct >= 0.8 ? "⚠️"
    : monthPct >= 0.5 ? "⚡"
    : "📊";
  const dateStr = yesterdayKst.toISOString().slice(0, 10);
  const toolLines = Object.entries(perTool)
    .sort((a, b) => b[1].calls - a[1].calls)
    .map(([slug, s]) => `  • ${slug}: ${s.calls}회 · $${s.cost.toFixed(3)}`)
    .join("\n");
  const userLines = topUsers
    .map(
      ([id, s], i) =>
        `  ${i + 1}. ${emailMap[id]} — ${s.calls}회 · $${s.cost.toFixed(3)}`,
    )
    .join("\n");

  const text = [
    `${emoji} *ARK Tools Usage — ${dateStr}*`,
    ``,
    `*어제*`,
    `  • 총 호출: ${yCalls}회 (무료 ${yFreeCalls}, BYOK ${yCalls - yFreeCalls})`,
    `  • Quota 차단: ${yBlocked}건`,
    `  • 비용: $${yTotalCost.toFixed(3)}`,
    ``,
    `*툴별*`,
    toolLines || "  (없음)",
    ``,
    `*Top 사용자*`,
    userLines || "  (없음)",
    ``,
    `*이번 달*`,
    `  • 누적 비용 (무료 티어): $${monthCost.toFixed(2)} / $${MONTHLY_BUDGET_USD} (${(monthPct * 100).toFixed(1)}%)`,
  ].join("\n");

  await sendSlack(text);

  return NextResponse.json({
    ok: true,
    yesterday: { date: dateStr, calls: yCalls, blocked: yBlocked, cost: yTotalCost },
    month: { cost: monthCost, budget: MONTHLY_BUDGET_USD, pct: monthPct },
  });
}
