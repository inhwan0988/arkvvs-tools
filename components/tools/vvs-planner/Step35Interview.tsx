"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import { useWizard } from "./WizardContext";
import SelectedVideoBanner from "./SelectedVideoBanner";
import type { InterviewQuestion } from "@/lib/tools/vvs-planner/types";

/**
 * Step 3.5 — Claude가 단답형 질문 5~8개를 생성 → 사용자가 한 화면에서 원하는 것만 답하고 원고 생성.
 */
export default function Step35Interview() {
  const {
    selectedVideo,
    selectedTopic,
    transcript,
    channelProfile,
    userIntent,
    interviewQuestions,
    setInterviewQuestions,
    interviewAnswers,
    setInterviewAnswers,
    anthropicApiKey,
    goToStep,
    setScript,
  } = useWizard();

  const [phase, setPhase] = useState<"loading" | "answering" | "error">(
    interviewQuestions.length > 0 ? "answering" : "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!selectedTopic || !selectedVideo || !transcript) {
      goToStep(3);
      return;
    }
    if (interviewQuestions.length > 0 || fetchedRef.current) return;
    fetchedRef.current = true;

    const ctrl = new AbortController();
    (async () => {
      try {
        setPhase("loading");
        setError(null);
        const res = await fetch("/api/tools/vvs-planner/interview-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedTopic: {
              title: selectedTopic.title,
              description: selectedTopic.description,
              angle: selectedTopic.angle,
            },
            referenceTranscript: transcript,
            videoTitle: selectedVideo.title,
            channelProfile,
            userIntent,
            anthropicApiKey,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "질문 생성 중 오류가 발생했습니다.");
        }
        const data = (await res.json()) as { questions: InterviewQuestion[] };
        if (ctrl.signal.aborted) return;
        setInterviewQuestions(data.questions);
        setPhase("answering");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if ((e as Error).name === "AbortError") return;
        setError(
          e instanceof Error ? e.message : "질문 생성 중 오류가 발생했습니다.",
        );
        setPhase("error");
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic, selectedVideo, transcript]);

  const setAnswer = useCallback(
    (id: string, val: string) => {
      setInterviewAnswers({ ...interviewAnswers, [id]: val });
    },
    [interviewAnswers, setInterviewAnswers],
  );

  const answeredCount = useMemo(
    () =>
      interviewQuestions.reduce(
        (acc, q) => acc + ((interviewAnswers[q.id] || "").trim() ? 1 : 0),
        0,
      ),
    [interviewQuestions, interviewAnswers],
  );

  const total = interviewQuestions.length;

  const submit = useCallback(() => {
    setScript("");
    goToStep(4);
  }, [goToStep, setScript]);

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-4 text-sm font-bold text-ink">
          AI가 인터뷰 질문을 준비하고 있어요...
        </p>
        <p className="mt-1 text-xs text-mute">
          5~8개의 단답형 질문으로 원고 퀄리티를 높여드립니다
        </p>
      </div>
    );
  }

  if (phase === "error" || total === 0) {
    return (
      <div className="mx-auto max-w-md">
        {error && (
          <ErrorWithHint
            message={error}
            toolSlug="vvs-planner"
            route="/api/tools/vvs-planner/interview-questions"
            onDismiss={() => setError(null)}
          />
        )}
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => goToStep(3)}
            className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-chip"
          >
            ← 주제 선택
          </button>
          <button
            onClick={submit}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brandHover"
          >
            질문 건너뛰고 원고 생성 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedVideo && <SelectedVideoBanner video={selectedVideo} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">
            인터뷰 — 원고 퀄리티를 위한 단답형 답변
          </h2>
          <p className="mt-0.5 text-sm text-sub">
            답할 수 있는 것만 채워주세요. 빈 답변은 무시됩니다.
          </p>
        </div>
        <button
          onClick={() => goToStep(3)}
          className="text-sm font-semibold text-sub hover:text-ink whitespace-nowrap"
        >
          ← 주제 선택
        </button>
      </div>

      {/* 진행바: 답변한 개수 */}
      <div className="flex items-center gap-3">
        <div className="text-xs font-bold text-sub whitespace-nowrap">
          {answeredCount} / {total} 답변 완료
        </div>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-chip">
          <div
            className="h-full bg-brand transition-[width] duration-300"
            style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }}
          />
        </div>
        <button
          onClick={submit}
          className="text-xs text-mute hover:text-ink whitespace-nowrap"
        >
          모두 건너뛰기
        </button>
      </div>

      {/* 질문 카드 목록 — 한 화면에 전체 노출 */}
      <div className="space-y-3">
        {interviewQuestions.map((q, i) => {
          const answer = interviewAnswers[q.id] || "";
          const isAnswered = !!answer.trim();
          return (
            <div
              key={q.id}
              className={`rounded-2xl border bg-surface p-5 shadow-card transition ${
                isAnswered ? "border-brand/40" : "border-line"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1.5">
                    질문 {i + 1}
                  </p>
                  <h3 className="text-[15px] font-bold text-ink leading-relaxed">
                    {q.text}
                  </h3>
                  {q.hint && (
                    <p className="mt-1.5 text-xs text-mute">{q.hint}</p>
                  )}
                </div>
                {isAnswered && (
                  <span className="shrink-0 rounded-full bg-brandSoft px-2 py-0.5 text-[11px] font-bold text-brand">
                    ✓
                  </span>
                )}
              </div>

              <div className="mt-3">
                {q.type === "chips" && q.options ? (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAnswer(q.id, opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                          answer === opt
                            ? "bg-brand text-white"
                            : "bg-chip text-sub hover:bg-line hover:text-ink"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="답변을 자유롭게 적어주세요 (선택)"
                    maxLength={200}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-line bg-bg px-4 py-3 text-[15px] text-ink placeholder:text-mute focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                )}
              </div>

              {q.type === "short_text" && (
                <div className="mt-1 text-right text-[11px] text-mute">
                  {answer.length} / 200자
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 CTA */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-line bg-surface/90 px-5 py-3 shadow-pop backdrop-blur">
        <span className="text-xs text-sub">
          {answeredCount === 0
            ? "답변 없이 바로 원고를 생성할 수도 있어요"
            : `${answeredCount}개의 답변이 원고에 반영됩니다`}
        </span>
        <button
          onClick={submit}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brandHover"
        >
          원고 생성 →
        </button>
      </div>
    </div>
  );
}
