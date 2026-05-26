"use client";

import { useState } from "react";
import type { CapcutJob, JobStatus } from "@/lib/tools/capcut-helper/types";
import { STATUS_LABELS } from "@/lib/tools/capcut-helper/types";
import JobReviewModal from "./JobReviewModal";

const STATUS_COLOR: Record<JobStatus, string> = {
  detected: "bg-mute/20 text-mute",
  extracting: "bg-brand/15 text-brand",
  uploading: "bg-brand/15 text-brand",
  pending_analysis: "bg-warn/20 text-warn",
  analyzing: "bg-brand/15 text-brand animate-pulse",
  pending_review: "bg-success/20 text-success",
  pending_apply: "bg-premium/20 text-premium",
  applying: "bg-brand/15 text-brand animate-pulse",
  done: "bg-success/20 text-success",
  error: "bg-danger/20 text-danger",
};

export default function JobList({
  jobs,
  onChanged,
}: {
  jobs: CapcutJob[];
  onChanged: () => void;
}) {
  const [reviewing, setReviewing] = useState<CapcutJob | null>(null);

  return (
    <div className="rounded-xl2 border border-line bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">📹 감지된 영상</h3>
        <span className="text-[11px] text-mute">{jobs.length}개</span>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 text-center text-sub text-sm">
          캡컷에 영상을 import하면 Helper가 자동으로 감지해서 여기 표시됩니다.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {jobs.map((j) => (
            <JobRow
              key={j.id}
              job={j}
              onReview={() => setReviewing(j)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      {reviewing && (
        <JobReviewModal
          job={reviewing}
          onClose={() => setReviewing(null)}
          onApplied={() => {
            setReviewing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function JobRow({
  job,
  onReview,
  onChanged,
}: {
  job: CapcutJob;
  onReview: () => void;
  onChanged: () => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startAnalysis() {
    const openai = localStorage.getItem("apiKey_openai") || "";
    const claude = localStorage.getItem("apiKey_claude") || "";
    if (!openai.startsWith("sk-") || !claude.startsWith("sk-ant-")) {
      setErr("우상단에 OpenAI + Claude API 키 모두 입력해주세요.");
      return;
    }
    setAnalyzing(true);
    setErr(null);
    try {
      const res = await fetch("/api/tools/capcut-helper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          openaiApiKey: openai,
          anthropicApiKey: claude,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "분석 실패");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="p-4 hover:bg-chip/40">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-bold ${STATUS_COLOR[job.status]}`}
        >
          {STATUS_LABELS[job.status]}
        </span>
        <p className="text-sm font-semibold text-ink flex-1 min-w-0 truncate">
          {job.video_name}
        </p>
        <span className="text-[11px] text-mute">
          {job.video_duration_sec
            ? `${Math.floor(job.video_duration_sec / 60)}:${String(
                Math.floor(job.video_duration_sec % 60),
              ).padStart(2, "0")}`
            : ""}
        </span>
      </div>

      <p className="text-[11px] text-mute mt-1 font-mono truncate">
        {job.project_dir}
      </p>

      {job.status === "pending_analysis" && (
        <button
          onClick={startAnalysis}
          disabled={analyzing}
          className="mt-2 text-[12px] rounded-lg bg-brand text-white font-bold px-3 py-1.5 hover:bg-brandHover disabled:opacity-50"
        >
          {analyzing ? "분석 중..." : "🤖 AI 분석 시작"}
        </button>
      )}

      {job.status === "pending_review" && (
        <button
          onClick={onReview}
          className="mt-2 text-[12px] rounded-lg bg-success text-white font-bold px-3 py-1.5 hover:bg-success/80"
        >
          🔎 검수 + 적용 →
        </button>
      )}

      {job.status === "done" && (
        <div className="mt-2 text-[11px] text-success font-semibold">
          ✓ 완료 — 캡컷 프로젝트의 <b>resources/ark-output/</b> 폴더에 결과 파일 저장됨
        </div>
      )}

      {job.status === "error" && job.error_message && (
        <p className="mt-2 text-[11px] text-danger">⚠️ {job.error_message}</p>
      )}

      {err && <p className="mt-2 text-[11px] text-danger">⚠️ {err}</p>}
    </div>
  );
}
