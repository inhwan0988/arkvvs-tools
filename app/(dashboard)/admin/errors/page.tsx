import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ErrorRow {
  id: string;
  user_id: string | null;
  tool_slug: string | null;
  route: string | null;
  source: "server" | "client" | "helper" | null;
  level: "error" | "warn" | "info";
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  user_agent: string | null;
  status_code: number | null;
  fingerprint: string | null;
  created_at: string;
}

interface AggRow {
  fingerprint: string;
  message: string;
  tool_slug: string | null;
  count: number;
  last_at: string;
  user_count: number;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default async function AdminErrorsPage() {
  await requireAdmin();
  const supabase = createClient();

  // 최근 200건 + 24h 통계
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [{ data: recent }, { data: last24h }] = await Promise.all([
    supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<ErrorRow[]>(),
    supabase
      .from("error_logs")
      .select("fingerprint, message, tool_slug, user_id, created_at")
      .gte("created_at", since24h)
      .returns<
        Array<{
          fingerprint: string | null;
          message: string;
          tool_slug: string | null;
          user_id: string | null;
          created_at: string;
        }>
      >(),
  ]);

  const list = recent ?? [];

  // 24h fingerprint별 집계
  const aggMap = new Map<string, AggRow>();
  for (const e of last24h ?? []) {
    const key = e.fingerprint ?? e.message.slice(0, 40);
    const cur = aggMap.get(key);
    if (cur) {
      cur.count += 1;
      if (e.user_id) cur.user_count = Math.max(cur.user_count, cur.user_count); // approximation below
      if (e.created_at > cur.last_at) cur.last_at = e.created_at;
    } else {
      aggMap.set(key, {
        fingerprint: key,
        message: e.message,
        tool_slug: e.tool_slug,
        count: 1,
        last_at: e.created_at,
        user_count: e.user_id ? 1 : 0,
      });
    }
  }
  // 정확한 user_count 계산
  const userSets = new Map<string, Set<string>>();
  for (const e of last24h ?? []) {
    if (!e.user_id) continue;
    const key = e.fingerprint ?? e.message.slice(0, 40);
    if (!userSets.has(key)) userSets.set(key, new Set());
    userSets.get(key)!.add(e.user_id);
  }
  for (const [key, set] of userSets) {
    const a = aggMap.get(key);
    if (a) a.user_count = set.size;
  }
  const aggregated = [...aggMap.values()].sort((a, b) => b.count - a.count);

  const totalLast24h = last24h?.length ?? 0;
  const uniqueErrors = aggregated.length;
  const affectedUsers = new Set(
    (last24h ?? []).map((e) => e.user_id).filter(Boolean),
  ).size;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">에러 모니터링</h1>
          <p className="text-sm text-mute mt-1">
            모든 도구의 server/client 에러 자동 수집 — 흔한 에러는 사용자에게 자동 안내 중
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-semibold text-sub hover:text-ink"
        >
          ← 사용자 관리
        </Link>
      </div>

      {/* 24h 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="24시간 누적"
          value={`${totalLast24h}건`}
          tone={totalLast24h > 50 ? "danger" : "default"}
        />
        <StatCard label="고유 에러 종류" value={`${uniqueErrors}개`} />
        <StatCard label="영향받은 사용자" value={`${affectedUsers}명`} />
      </div>

      {/* 빈도 상위 (24h) */}
      <section>
        <h2 className="text-sm font-bold text-ink mb-3">
          🔥 24시간 빈도 상위
        </h2>
        {aggregated.length === 0 ? (
          <div className="rounded-xl2 border border-line bg-surface p-6 text-center text-sm text-mute">
            지난 24시간 동안 보고된 에러가 없어요 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {aggregated.slice(0, 10).map((a) => (
              <div
                key={a.fingerprint}
                className="rounded-xl2 border border-line bg-surface p-3 flex items-start gap-3"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-dangerSoft text-danger font-bold text-lg flex items-center justify-center">
                  {a.count}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {a.tool_slug && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-chip text-sub">
                        {a.tool_slug}
                      </span>
                    )}
                    <span className="text-[10px] text-mute">
                      사용자 {a.user_count}명 · 최근 {relativeTime(a.last_at)}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink line-clamp-2">
                    {a.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 최근 timeline */}
      <section>
        <h2 className="text-sm font-bold text-ink mb-3">
          📜 최근 200건 timeline
        </h2>
        {list.length === 0 ? (
          <div className="rounded-xl2 border border-line bg-surface p-6 text-center text-sm text-mute">
            수집된 에러가 아직 없어요
          </div>
        ) : (
          <div className="rounded-xl2 border border-line bg-surface divide-y divide-line">
            {list.map((e) => (
              <ErrorRowView key={e.id} e={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={`rounded-xl2 border p-4 ${
        tone === "danger"
          ? "border-danger/30 bg-dangerSoft/30"
          : "border-line bg-surface"
      }`}
    >
      <p className="text-[11px] font-bold text-mute uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          tone === "danger" ? "text-danger" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ErrorRowView({ e }: { e: ErrorRow }) {
  return (
    <details className="p-3 group">
      <summary className="cursor-pointer flex items-start gap-3 list-none">
        <div className="shrink-0 mt-0.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              e.level === "error"
                ? "bg-danger"
                : e.level === "warn"
                  ? "bg-warn"
                  : "bg-mute"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5 text-[10px]">
            {e.tool_slug && (
              <span className="font-bold px-1.5 py-0.5 rounded bg-chip text-sub">
                {e.tool_slug}
              </span>
            )}
            {e.source && (
              <span className="font-bold px-1.5 py-0.5 rounded bg-chip text-sub">
                {e.source}
              </span>
            )}
            {e.status_code && (
              <span className="font-bold text-mute">{e.status_code}</span>
            )}
            <span className="text-mute">·</span>
            <span className="text-mute">{relativeTime(e.created_at)}</span>
            {e.user_id && (
              <span className="text-mute font-mono">
                {e.user_id.slice(0, 8)}…
              </span>
            )}
          </div>
          <p className="text-[13px] text-ink line-clamp-1">{e.message}</p>
          {e.route && (
            <p className="text-[11px] text-mute mt-0.5 font-mono line-clamp-1">
              {e.route}
            </p>
          )}
        </div>
      </summary>
      {(e.stack || e.context) && (
        <div className="mt-2 ml-5 space-y-2">
          {e.stack && (
            <pre className="text-[10px] font-mono bg-chip p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-60">
              {e.stack}
            </pre>
          )}
          {e.context && Object.keys(e.context).length > 0 && (
            <pre className="text-[10px] font-mono bg-chip p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(e.context, null, 2)}
            </pre>
          )}
        </div>
      )}
    </details>
  );
}
