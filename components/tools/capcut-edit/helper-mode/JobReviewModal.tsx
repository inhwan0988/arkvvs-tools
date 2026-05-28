"use client";

import { useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import type { CapcutJob } from "@/lib/tools/capcut-helper/types";
import type {
  PointSubtitle,
  ProcessResult,
  SubtitleSegment,
} from "@/lib/tools/capcut-edit/types";

export default function JobReviewModal({
  job,
  onClose,
  onApplied,
}: {
  job: CapcutJob;
  onClose: () => void;
  onApplied: () => void;
}) {
  const result = job.result_json;
  const [subs, setSubs] = useState<SubtitleSegment[]>(result?.subtitles || []);
  const [points, setPoints] = useState<PointSubtitle[]>(result?.points || []);
  const [tab, setTab] = useState<"summary" | "subs" | "points" | "silences">(
    "summary",
  );
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!result) return null;

  async function apply() {
    setApplying(true);
    setErr(null);
    const updated: ProcessResult = {
      ...result!,
      subtitles: subs,
      points,
    };
    try {
      const res = await fetch("/api/tools/capcut-helper/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, result: updated }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "적용 실패");
      onApplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setApplying(false);
    }
  }

  const silenceTotalSec = result.silences.reduce((s, x) => s + x.duration, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl3 shadow-pop max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">🔎 검수 — {job.video_name}</h2>
            <p className="text-[11px] text-mute mt-0.5">
              {Math.floor(result.duration / 60)}분 {Math.floor(result.duration % 60)}초
              · 자막 {subs.length}줄 · 무음 {result.silences.length}개 (-{Math.round(silenceTotalSec)}초)
              · 포인트 {points.length}개
            </p>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 border-b border-line">
          {[
            { id: "summary", label: "📊 요약" },
            { id: "subs", label: `📝 자막 (${subs.length})` },
            { id: "points", label: `🎯 포인트 (${points.length})` },
            { id: "silences", label: `✂️ 무음 (${result.silences.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                tab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-sub hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "summary" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="원본 길이" value={`${Math.floor(result.duration / 60)}:${String(Math.floor(result.duration % 60)).padStart(2, "0")}`} />
                <Stat
                  label="컷 후 길이"
                  emphasis
                  value={`${Math.floor((result.duration - silenceTotalSec) / 60)}:${String(Math.floor((result.duration - silenceTotalSec) % 60)).padStart(2, "0")}`}
                  sub={`-${silenceTotalSec.toFixed(1)}초`}
                />
                <Stat label="자막" value={`${subs.length}줄`} />
                <Stat label="포인트 자막" value={`${points.length}개`} />
              </div>
              <div className="rounded-xl2 border border-brand/30 bg-brandSoft/30 p-4 text-[13px] text-sub leading-relaxed">
                <b className="text-ink">"📡 Helper에서 적용" 클릭 시:</b>
                <br />Helper가 본인 PC에서 ffmpeg로 무음 잘라낸 mp4 + .srt 자막 + 포인트/효과음 가이드를 캡컷 프로젝트의 <code className="text-brand">resources/ark-output/</code> 폴더에 저장해요. 캡컷에서 새 영상 import만 하면 됩니다.
              </div>
            </div>
          )}

          {tab === "subs" && (
            <div className="space-y-2">
              {subs.map((s, i) => (
                <div key={i} className="rounded-lg border border-line p-3 flex gap-3 items-start">
                  <span className="text-[11px] font-mono text-mute pt-1 shrink-0">
                    {fmt(s.start)}
                  </span>
                  <textarea
                    value={s.text}
                    onChange={(e) => {
                      const n = [...subs];
                      n[i] = { ...s, text: e.target.value };
                      setSubs(n);
                    }}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-ink resize-none focus:outline-none"
                  />
                  <span className="text-[11px] font-mono text-mute pt-1 shrink-0">
                    {(s.end - s.start).toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "points" && (
            <div className="space-y-3">
              {points.map((p, i) => (
                <div key={p.id} className="rounded-xl2 border border-line p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-brand">{fmt(p.time)}</span>
                    <button
                      onClick={() => setPoints(points.filter((_, idx) => idx !== i))}
                      className="text-[11px] text-mute hover:text-danger"
                    >
                      삭제
                    </button>
                  </div>
                  <input
                    type="text"
                    value={p.text}
                    onChange={(e) => {
                      const n = [...points];
                      n[i] = { ...p, text: e.target.value };
                      setPoints(n);
                    }}
                    className="w-full bg-chip rounded-lg px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:bg-white"
                  />
                  {p.sourceText && (
                    <p className="text-[11px] text-mute italic">원문: &ldquo;{p.sourceText}&rdquo;</p>
                  )}
                  <p className="text-[11px] text-sub">
                    🎵 효과음: <b>{p.soundEffect?.name || "(없음)"}</b>
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === "silences" && (
            <div className="space-y-2">
              {result.silences.map((s, i) => (
                <div key={i} className="rounded-lg border border-line p-3 flex items-center gap-3">
                  <span className="text-[11px] font-mono text-mute">
                    {fmt(s.start)} → {fmt(s.end)}
                  </span>
                  <span className="flex-1 text-xs text-sub">
                    {s.type === "leading" ? "🎬 영상 시작" : s.type === "trailing" ? "🎬 영상 끝" : "🎬 중간"}
                  </span>
                  <span className="text-[11px] font-bold text-danger">-{s.duration.toFixed(1)}초</span>
                </div>
              ))}
              {result.silences.length === 0 && (
                <div className="text-center text-sub py-8 text-sm">잘라낼 무음 없음</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {err && (
          <div className="px-5 pt-3">
            <ErrorWithHint
              message={err}
              toolSlug="capcut-helper"
              route="/api/tools/capcut-helper/apply"
              onDismiss={() => setErr(null)}
            />
          </div>
        )}
        <div className="px-5 py-4 border-t border-line flex items-center justify-between gap-3 flex-wrap">
          <button onClick={onClose} className="text-sm text-sub hover:text-ink ml-auto">
            취소
          </button>
          <button
            onClick={apply}
            disabled={applying}
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50"
          >
            {applying ? "전송 중..." : "📡 Helper에서 적용 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-xl2 p-3 border ${emphasis ? "border-success/40 bg-success/10" : "border-line"}`}>
      <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold ${emphasis ? "text-success" : "text-ink"}`}>{value}</p>
      {sub && <p className="text-[10px] text-sub mt-0.5">{sub}</p>}
    </div>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}
