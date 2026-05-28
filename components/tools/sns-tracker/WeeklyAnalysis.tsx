"use client";

import { useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import { rankBest, rankWorst, getWeekStart, isWithinWeek } from "@/lib/tools/sns-tracker/aggregator";
import { PLATFORM_META, type SnsContentStats } from "@/lib/tools/sns-tracker/types";

type AnalysisResponse = {
  best: SnsContentStats | null;
  worst: SnsContentStats | null;
  analysis_md: string;
};

export default function WeeklyAnalysis({
  contents,
  apiKey,
  onSetApiKey,
}: {
  contents: SnsContentStats[];
  apiKey: string;
  onSetApiKey: (k: string) => void;
}) {
  const weekStart = getWeekStart();
  const thisWeek = contents.filter((c) => isWithinWeek(c.posted_at, weekStart));
  const best = rankBest(thisWeek, "clicks")[0] ?? null;
  const worst = rankWorst(thisWeek, "conversion").filter((c) => c.content_id !== best?.content_id)[0] ?? null;

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateAnalysis() {
    if (!apiKey || !apiKey.startsWith("sk-ant-")) {
      setError("우상단에서 Anthropic API 키를 입력해주세요.");
      return;
    }
    if (!best && !worst) {
      setError("이번 주에 등록된 콘텐츠가 없어요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/sns-tracker/weekly-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStart.toISOString().slice(0, 10),
          best,
          worst,
          allContents: thisWeek,
          anthropicApiKey: apiKey,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "분석 실패");
      }
      const data = (await res.json()) as AnalysisResponse;
      setAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-line bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink">🏆 이번 주 베스트 / 워스트</h3>
          <p className="text-[11px] text-sub mt-0.5">
            {weekStart.toLocaleDateString("ko-KR")} 이후 게시 ·{" "}
            <span className="font-bold">{thisWeek.length}개</span> 콘텐츠
          </p>
        </div>
        {!apiKey && (
          <input
            type="password"
            placeholder="sk-ant-… (Claude key)"
            onChange={(e) => onSetApiKey(e.target.value)}
            className="text-[12px] bg-chip rounded-lg px-3 py-1.5 font-mono w-56 focus:outline-none focus:bg-white"
          />
        )}
        <button
          onClick={generateAnalysis}
          disabled={loading || (!best && !worst)}
          className="text-[12px] rounded-lg bg-brand text-white font-bold px-4 py-1.5 hover:bg-brandHover disabled:opacity-50"
        >
          {loading ? "AI 분석 중..." : analysis ? "다시 분석" : "🤖 AI 분석 시작"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BestWorstCard kind="best" content={best} />
        <BestWorstCard kind="worst" content={worst} />
      </div>

      {error && (
        <ErrorWithHint
          message={error}
          toolSlug="sns-tracker"
          route="/api/tools/sns-tracker/weekly-analyze"
          onDismiss={() => setError(null)}
        />
      )}

      {analysis && (
        <div className="rounded-xl border border-brand/30 bg-brandSoft/30 p-4">
          <h4 className="text-sm font-bold text-ink mb-2">📊 Claude의 분석</h4>
          <div className="text-sm text-sub whitespace-pre-wrap leading-relaxed">
            {analysis.analysis_md}
          </div>
        </div>
      )}
    </div>
  );
}

function BestWorstCard({
  kind,
  content,
}: {
  kind: "best" | "worst";
  content: SnsContentStats | null;
}) {
  const label = kind === "best" ? "🥇 베스트" : "📉 워스트";
  const cls =
    kind === "best"
      ? "border-success/40 bg-success/5"
      : "border-warn/40 bg-warn/5";
  const accent = kind === "best" ? "text-success" : "text-warn";

  if (!content) {
    return (
      <div className={`rounded-xl border ${cls} p-3 text-center`}>
        <p className="text-[11px] font-bold text-mute uppercase mb-1">{label}</p>
        <p className="text-xs text-sub">데이터 없음</p>
      </div>
    );
  }

  const meta = PLATFORM_META[content.platform];
  return (
    <div className={`rounded-xl border ${cls} p-3`}>
      <p className={`text-[11px] font-bold uppercase mb-1 ${accent}`}>{label}</p>
      <p className="text-sm font-bold text-ink truncate" title={content.title}>
        {meta.emoji} {content.title}
      </p>
      <div className="grid grid-cols-3 gap-1 mt-2 text-[11px]">
        <div>
          <span className="text-mute">조회</span>{" "}
          <b className="text-ink">{formatNum(content.views ?? 0)}</b>
        </div>
        <div>
          <span className="text-mute">클릭</span>{" "}
          <b className="text-ink">{formatNum(content.click_count ?? 0)}</b>
        </div>
        <div>
          <span className="text-mute">전환</span>{" "}
          <b className="text-ink">{(content.conversion_rate_pct ?? 0).toFixed(2)}%</b>
        </div>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}
