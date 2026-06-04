"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import { useWizard } from "./WizardContext";
import SelectedVideoBanner from "./SelectedVideoBanner";
import type { InterviewQuestion } from "@/lib/tools/vvs-planner/types";

/**
 * Step 3.5 — Claude가 단답형 질문을 던지고 사용자가 답하는 인터뷰 모드.
 *
 * 흐름:
 * 1. mount 시 자동으로 /interview-questions API 호출 → 5-8개 질문 받음
 * 2. 카드 1장씩 진행 (다음 버튼)
 * 3. 마지막 답 완료 → Step 4 자동 이동 + 원고 생성 트리거
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
  const [currentIdx, setCurrentIdx] = useState(0);
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
        if (!anthropicApiKey.trim()) {
          throw new Error("우측 상단에서 Claude API 키를 입력해주세요.");
        }
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

  const total = interviewQuestions.length;
  const currentQ = interviewQuestions[currentIdx];
  const currentAnswer = currentQ ? interviewAnswers[currentQ.id] || "" : "";

  const setAnswer = useCallback(
    (val: string) => {
      if (!currentQ) return;
      setInterviewAnswers({ ...interviewAnswers, [currentQ.id]: val });
    },
    [currentQ, interviewAnswers, setInterviewAnswers],
  );

  const goNext = useCallback(() => {
    if (currentIdx < total - 1) {
      setCurrentIdx(currentIdx + 1);
      return;
    }
    // 마지막 질문 — Step 4로 + 원고 새로 시작하도록 reset
    setScript("");
    goToStep(4);
  }, [currentIdx, total, goToStep, setScript]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }, [currentIdx]);

  const skipAll = useCallback(() => {
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

  if (phase === "error" || !currentQ) {
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
            onClick={skipAll}
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
            본인 입으로 답해주시면 AI가 그대로 원고에 녹여드려요.
          </p>
        </div>
        <button
          onClick={() => goToStep(3)}
          className="text-sm font-semibold text-sub hover:text-ink whitespace-nowrap"
        >
          ← 주제 선택
        </button>
      </div>

      {/* 진행바 */}
      <div className="flex items-center gap-3">
        <div className="text-xs font-bold text-sub whitespace-nowrap">
          {currentIdx + 1} / {total}
        </div>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-chip">
          <div
            className="h-full bg-brand transition-[width] duration-300"
            style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
          />
        </div>
        <button
          onClick={skipAll}
          className="text-xs text-mute hover:text-ink whitespace-nowrap"
        >
          모두 건너뛰기
        </button>
      </div>

      {/* 질문 카드 (한 화면에 한 질문) */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <p className="text-xs font-bold text-brand uppercase tracking-wider mb-2">
          질문 {currentIdx + 1}
        </p>
        <h3 className="text-base font-bold text-ink leading-relaxed">
          {currentQ.text}
        </h3>
        {currentQ.hint && (
          <p className="mt-2 text-xs text-mute">{currentQ.hint}</p>
        )}

        <div className="mt-4">
          {currentQ.type === "chips" && currentQ.options ? (
            <div className="flex flex-wrap gap-2">
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswer(opt)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    currentAnswer === opt
                      ? "bg-brand text-white"
                      : "bg-chip text-sub hover:bg-line hover:text-ink"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && currentAnswer.trim()) goNext();
              }}
              placeholder="30자 이내로 답해주세요"
              maxLength={80}
              className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-base text-ink placeholder:text-mute focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              autoFocus
            />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-mute">
            {currentQ.type === "short_text"
              ? `${currentAnswer.length}자`
              : currentAnswer
                ? "선택됨"
                : ""}
          </span>
          <span className="text-mute">Enter로 다음 질문</span>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-chip disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← 이전
        </button>
        <div className="flex gap-2">
          <button
            onClick={goNext}
            className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-sub hover:bg-chip"
          >
            건너뛰기
          </button>
          <button
            onClick={goNext}
            disabled={!currentAnswer.trim()}
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentIdx === total - 1 ? "원고 생성 →" : "다음 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
