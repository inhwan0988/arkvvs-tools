import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MONTHLY_BUDGET_USD = Number(process.env.MONTHLY_BUDGET_USD || "70");

function windowStartKst(days: number, now = new Date()): Date {
  const KST = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + KST);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  return new Date(Date.UTC(y, m, d - days) - KST);
}

function monthStartKst(now = new Date()): Date {
  const KST = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + KST);
  return new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - KST,
  );
}

type Row = {
  id: string;
  user_id: string;
  tool_slug: string;
  action: string;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  status: string;
  used_own_key: boolean;
  created_at: string;
};

export default async function UsagePage() {
  await requireAdmin();
  const admin = createAdminClient();

  // 최근 30일 로그 (요약용)
  const monthStart = monthStartKst();
  const dayStart = windowStartKst(0);
  const weekStart = windowStartKst(7);

  const { data: monthLogs } = await admin
    .from("usage_logs")
    .select("*")
    .gte("created_at", monthStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<Row[]>();

  const logs = monthLogs || [];

  // 집계 헬퍼
  const totals = (filter: (r: Row) => boolean) => {
    let calls = 0;
    let blocked = 0;
    let cost = 0;
    let byok = 0;
    for (const r of logs) {
      if (!filter(r)) continue;
      if (r.status === "blocked") {
        blocked++;
      } else {
        calls++;
        if (r.used_own_key) byok++;
        else cost += Number(r.cost_usd) || 0;
      }
    }
    return { calls, blocked, cost, byok };
  };

  const today = totals((r) => r.created_at >= dayStart.toISOString());
  const week = totals((r) => r.created_at >= weekStart.toISOString());
  const month = totals(() => true);
  const monthPct = MONTHLY_BUDGET_USD > 0 ? month.cost / MONTHLY_BUDGET_USD : 0;

  // 툴별 breakdown (이번 달)
  const perTool: Record<
    string,
    { calls: number; blocked: number; cost: number }
  > = {};
  for (const r of logs) {
    const t = (perTool[r.tool_slug] ||= { calls: 0, blocked: 0, cost: 0 });
    if (r.status === "blocked") {
      t.blocked++;
    } else {
      t.calls++;
      if (!r.used_own_key) t.cost += Number(r.cost_usd) || 0;
    }
  }
  const toolList = Object.entries(perTool).sort((a, b) => b[1].cost - a[1].cost);

  // 상위 사용자 (이번 달, 무료 사용량 기준)
  const perUser: Record<string, { calls: number; cost: number }> = {};
  for (const r of logs) {
    if (r.status !== "ok" || r.used_own_key) continue;
    const u = (perUser[r.user_id] ||= { calls: 0, cost: 0 });
    u.calls++;
    u.cost += Number(r.cost_usd) || 0;
  }
  const topUsers = Object.entries(perUser)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 10);
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

  // 최근 quota 차단 이력 (30개)
  const recentBlocked = logs.filter((r) => r.status === "blocked").slice(0, 30);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">사용량 모니터링</h1>
          <p className="text-sm text-mute mt-1">
            무료 티어(서버 API 키) 사용량과 비용 추적. BYOK는 사용자 부담이라
            비용에 포함 X.
          </p>
        </div>
        <a
          href="/admin"
          className="shrink-0 rounded-lg bg-chip px-3 py-1.5 text-xs font-bold text-sub hover:bg-line"
        >
          ← 사용자 관리
        </a>
      </div>

      {/* 예산 게이지 */}
      <div className="mb-6 rounded-xl2 border border-line bg-surface p-5 shadow-card">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-bold text-ink">이번 달 무료 티어 비용</h2>
          <p
            className={`text-2xl font-bold ${
              monthPct >= 1
                ? "text-danger"
                : monthPct >= 0.8
                  ? "text-warn"
                  : "text-brand"
            }`}
          >
            ${month.cost.toFixed(2)} / ${MONTHLY_BUDGET_USD}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-chip">
          <div
            className={`h-full transition-[width] duration-300 ${
              monthPct >= 1
                ? "bg-danger"
                : monthPct >= 0.8
                  ? "bg-warn"
                  : "bg-brand"
            }`}
            style={{ width: `${Math.min(100, monthPct * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-mute">
          {(monthPct * 100).toFixed(1)}% 소진 · MONTHLY_BUDGET_USD 환경변수로 조정
        </p>
      </div>

      {/* 오늘/이번주/이번달 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="오늘"
          calls={today.calls}
          blocked={today.blocked}
          cost={today.cost}
          byok={today.byok}
        />
        <SummaryCard
          label="이번주"
          calls={week.calls}
          blocked={week.blocked}
          cost={week.cost}
          byok={week.byok}
        />
        <SummaryCard
          label="이번달"
          calls={month.calls}
          blocked={month.blocked}
          cost={month.cost}
          byok={month.byok}
        />
      </div>

      {/* 툴별 breakdown */}
      <div className="mb-6 bg-surface rounded-xl3 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-base font-bold text-ink">
            툴별 사용량 (이번 달)
          </h2>
        </div>
        {toolList.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-mute">
            아직 기록이 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-mute border-b border-line">
                <th className="px-6 py-2.5">툴</th>
                <th className="px-6 py-2.5 text-right">호출</th>
                <th className="px-6 py-2.5 text-right">차단</th>
                <th className="px-6 py-2.5 text-right">비용 (무료)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {toolList.map(([slug, s]) => (
                <tr key={slug}>
                  <td className="px-6 py-2.5 font-semibold text-ink">{slug}</td>
                  <td className="px-6 py-2.5 text-right tabular-nums text-ink">
                    {s.calls}
                  </td>
                  <td className="px-6 py-2.5 text-right tabular-nums">
                    <span
                      className={
                        s.blocked > 0
                          ? "font-bold text-warn"
                          : "text-mute"
                      }
                    >
                      {s.blocked}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 text-right tabular-nums font-semibold text-ink">
                    ${s.cost.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 상위 사용자 */}
      <div className="mb-6 bg-surface rounded-xl3 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-base font-bold text-ink">
            상위 사용자 Top 10 (이번 달, 무료 티어 기준)
          </h2>
        </div>
        {topUsers.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-mute">
            데이터가 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-mute border-b border-line">
                <th className="px-6 py-2.5">#</th>
                <th className="px-6 py-2.5">이메일</th>
                <th className="px-6 py-2.5 text-right">호출</th>
                <th className="px-6 py-2.5 text-right">비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {topUsers.map(([uid, s], i) => (
                <tr key={uid}>
                  <td className="px-6 py-2.5 text-mute">{i + 1}</td>
                  <td className="px-6 py-2.5 text-ink">
                    {emailMap[uid] ?? uid.slice(0, 8)}
                  </td>
                  <td className="px-6 py-2.5 text-right tabular-nums text-ink">
                    {s.calls}
                  </td>
                  <td className="px-6 py-2.5 text-right tabular-nums font-semibold text-ink">
                    ${s.cost.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 최근 quota 차단 */}
      {recentBlocked.length > 0 && (
        <div className="bg-surface rounded-xl3 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-line">
            <h2 className="text-base font-bold text-ink">
              최근 quota 차단 ({recentBlocked.length}건)
            </h2>
            <p className="text-xs text-mute mt-0.5">
              한 사용자가 반복 차단되면 어뷰징 가능성 — 툴 정책 조정 검토.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-mute border-b border-line">
                <th className="px-6 py-2.5">시각 (KST)</th>
                <th className="px-6 py-2.5">사용자</th>
                <th className="px-6 py-2.5">툴</th>
                <th className="px-6 py-2.5">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentBlocked.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-2 text-xs text-mute tabular-nums">
                    {new Date(r.created_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </td>
                  <td className="px-6 py-2 text-xs text-sub">
                    {r.user_id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-2 text-xs font-semibold text-ink">
                    {r.tool_slug}
                  </td>
                  <td className="px-6 py-2 text-xs text-sub">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  calls,
  blocked,
  cost,
  byok,
}: {
  label: string;
  calls: number;
  blocked: number;
  cost: number;
  byok: number;
}) {
  return (
    <div className="bg-surface rounded-xl2 shadow-card p-5">
      <p className="text-xs font-semibold text-mute mb-2">{label}</p>
      <p className="text-2xl font-bold text-ink">{calls}회</p>
      <div className="mt-2 space-y-0.5 text-[11px] text-mute">
        <p>무료 비용: <span className="font-semibold text-ink">${cost.toFixed(3)}</span></p>
        <p>BYOK: {byok}회 · 차단: {blocked}건</p>
      </div>
    </div>
  );
}
