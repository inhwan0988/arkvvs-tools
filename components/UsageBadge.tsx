"use client";

import { useEffect, useState } from "react";

type QuotaResult =
  | { unlimited: true }
  | {
      unlimited: false;
      allowed: boolean;
      limit: number;
      used: number;
      remaining: number;
      window: "daily" | "weekly";
      resetAt: string;
    };

type UsageResponse = { quotas: Record<string, Record<string, QuotaResult>> };

/**
 * 특정 tool+action의 무료 남은 사용량을 배지로 표시.
 * `hasOwnKey`가 true면 "BYOK" 표시 (무제한).
 * 배지 색: 여유↑=success, 낮음=warn, 소진=danger.
 */
export default function UsageBadge({
  toolSlug,
  action,
  hasOwnKey = false,
  className = "",
}: {
  toolSlug: string;
  action: string;
  hasOwnKey?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState<QuotaResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/usage/me", { cache: "no-store" });
        if (!r.ok) throw new Error("failed");
        const data = (await r.json()) as UsageResponse;
        if (cancelled) return;
        setQ(data.quotas[toolSlug]?.[action] ?? null);
      } catch {
        if (!cancelled) setQ(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toolSlug, action]);

  if (hasOwnKey) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-successSoft px-2 py-0.5 text-[11px] font-bold text-success ${className}`}
        title="본인 API 키 사용 중 — 무제한"
      >
        BYOK · 무제한
      </span>
    );
  }
  if (loading) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-chip px-2 py-0.5 text-[11px] font-bold text-mute ${className}`}
      >
        …
      </span>
    );
  }
  if (!q || q.unlimited) return null;

  const { remaining, limit, window } = q;
  const pct = remaining / limit;
  const tone =
    remaining === 0
      ? { bg: "bg-dangerSoft", fg: "text-danger" }
      : pct <= 0.34
        ? { bg: "bg-warnSoft", fg: "text-warn" }
        : { bg: "bg-brandSoft", fg: "text-brand" };
  const windowLabel = window === "daily" ? "오늘" : "이번주";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md ${tone.bg} px-2 py-0.5 text-[11px] font-bold ${tone.fg} ${className}`}
      title={
        remaining === 0
          ? `${windowLabel} 무료 사용량 소진 — 본인 API 키 입력 시 계속 사용 가능`
          : `${windowLabel} 남은 무료 사용량 ${remaining}/${limit}회`
      }
    >
      {windowLabel} {remaining}/{limit} 남음
    </span>
  );
}
