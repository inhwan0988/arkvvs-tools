"use client";

import { useCallback, useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import TopicCard from "./TopicCard";
import type { Topic } from "@/lib/tools/vvs-planner/types";

export default function Step3TopicSelect() {
  const {
    selectedVideo,
    setTranscript,
    topics,
    setTopics,
    selectedTopic,
    setSelectedTopic,
    isLoading,
    setLoading,
    error,
    setError,
    goToStep,
    anthropicApiKey,
    channelProfile,
    referenceVideoUrls,
  } = useWizard();

  const [phase, setPhase] = useState<"transcript" | "topics" | "done">(
    topics.length > 0 ? "done" : "transcript",
  );
  const [elapsed, setElapsed] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isLoading]);

  const generateTopics = useCallback(
    async (transcript: string, signal?: AbortSignal) => {
      if (!anthropicApiKey.trim()) {
        throw new Error("우측 상단에서 Claude API 키를 입력해주세요.");
      }
      if (!selectedVideo) throw new Error("영상이 선택되지 않았습니다.");

      setPhase("topics");
      const topRes = await fetch("/api/tools/vvs-planner/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          videoTitle: selectedVideo.title,
          channelTitle: selectedVideo.channelTitle,
          anthropicApiKey,
          // v2 personalization
          channelProfile,
          referenceVideoUrls,
        }),
        signal,
      });
      if (!topRes.ok) {
        const d = await topRes.json();
        throw new Error(d.error ?? "주제 생성 중 오류가 발생했습니다.");
      }
      const topData = (await topRes.json()) as { topics: Topic[] };
      setTopics(topData.topics);
      setPhase("done");
    },
    [anthropicApiKey, selectedVideo, setPhase, setTopics],
  );

  useEffect(() => {
    if (!selectedVideo) {
      goToStep(1);
      return;
    }
    if (topics.length > 0) return;

    const ctrl = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      setShowManualInput(false);

      try {
        setPhase("transcript");
        const tRes = await fetch("/api/tools/vvs-planner/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: selectedVideo.videoId }),
          signal: ctrl.signal,
        });
        if (!tRes.ok) {
          const d = await tRes.json();
          throw new Error(
            d.error ?? "자막 추출 중 오류가 발생했습니다.",
            { cause: "transcript" },
          );
        }
        const tData = (await tRes.json()) as { transcript: string };
        if (ctrl.signal.aborted) return;
        setTranscript(tData.transcript);

        await generateTopics(tData.transcript, ctrl.signal);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const isTranscriptError =
          e instanceof Error && e.cause === "transcript";
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
        if (isTranscriptError) setShowManualInput(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => {
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo]);

  const handleManualSubmit = useCallback(async () => {
    const cleaned = cleanTranscript(manualText);
    if (cleaned.length < 30) {
      setError(
        "자막이 너무 짧습니다. 영상의 자막 전체를 복사해서 붙여넣어 주세요.",
      );
      return;
    }
    setError(null);
    setShowManualInput(false);
    setTranscript(cleaned);
    setLoading(true);
    try {
      await generateTopics(cleaned);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [manualText, generateTopics, setTranscript, setLoading, setError]);

  return (
    <div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-4 text-sm font-bold text-ink">
            {phase === "transcript"
              ? "자막을 추출하고 있습니다..."
              : "AI가 주제를 생성하고 있습니다..."}
          </p>
          <p className="mt-1 text-xs text-mute">
            {elapsed}초 경과
            {phase === "topics" && elapsed > 30 && " · 평소보다 오래 걸리고 있어요"}
          </p>
          <div className="mt-3 flex gap-2 text-[11px] font-bold">
            <Pill done>1. 자막 추출</Pill>
            <Pill done={phase !== "transcript"} active={phase === "topics"}>
              2. 주제 10개 생성
            </Pill>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="mx-auto max-w-md text-center">
          <div className="rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        </div>
      )}

      {showManualInput && !isLoading && (
        <ManualTranscriptInput
          videoUrl={
            selectedVideo
              ? `https://www.youtube.com/watch?v=${selectedVideo.videoId}`
              : ""
          }
          value={manualText}
          onChange={setManualText}
          onSubmit={handleManualSubmit}
          onCancel={() => goToStep(2)}
        />
      )}

      {error && !showManualInput && !isLoading && (
        <div className="mx-auto mt-4 max-w-md text-center">
          <button
            onClick={() => goToStep(2)}
            className="rounded-xl border border-line bg-surface px-6 py-2 text-sm font-semibold text-ink transition-colors hover:bg-chip"
          >
            다른 영상 선택하기
          </button>
        </div>
      )}

      {!isLoading && !error && topics.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">
              AI가 제안하는 주제 10개
            </h2>
            <button
              onClick={() => goToStep(2)}
              className="text-sm font-semibold text-sub hover:text-ink"
            >
              ← 영상 확인
            </button>
          </div>
          <p className="mb-6 text-sm text-sub">
            마음에 드는 주제를 선택한 후 대본 생성을 진행하세요.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topics.map((t) => (
              <TopicCard
                key={t.id}
                topic={t}
                selected={selectedTopic?.id === t.id}
                onClick={() => setSelectedTopic(t)}
              />
            ))}
          </div>

          {selectedTopic && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => goToStep(4)}
                className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-brandHover"
              >
                이 주제로 대본 생성하기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ManualTranscriptInput({
  videoUrl,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  videoUrl: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-card">
      <h3 className="text-base font-bold text-ink">
        직접 자막을 붙여넣어 주세요
      </h3>
      <p className="mt-1 text-sm text-sub">
        자동 추출이 막혀있어요. YouTube에서 직접 복사해서 붙여넣으면 다음 단계로
        진행할 수 있어요.
      </p>

      <ol className="mt-4 space-y-2 text-sm text-sub">
        <li className="flex gap-2">
          <span className="font-bold text-brand">1.</span>
          <span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand underline underline-offset-2"
            >
              YouTube에서 이 영상 열기 ↗
            </a>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-brand">2.</span>
          <span>
            영상 설명란에서 <b>&ldquo;더보기&rdquo;</b> 클릭 →{" "}
            <b>&ldquo;스크립트 표시&rdquo;</b> 버튼 클릭
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-brand">3.</span>
          <span>스크립트 패널의 텍스트 전체 선택 + 복사 (Cmd+A, Cmd+C)</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-brand">4.</span>
          <span>아래 칸에 붙여넣기 (시간 표시는 자동으로 정리됩니다)</span>
        </li>
      </ol>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0:00 안녕하세요&#10;0:05 오늘은..."
        className="mt-4 w-full min-h-[200px] resize-y rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-mute focus:border-brand focus:outline-none"
      />
      <p className="mt-1.5 text-xs text-mute">
        {value.length > 0
          ? `${value.length.toLocaleString()}자 · 정제 후 ${cleanTranscript(value).length.toLocaleString()}자`
          : "텍스트를 붙여넣으세요"}
      </p>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-chip"
        >
          다른 영상 선택
        </button>
        <button
          onClick={onSubmit}
          disabled={cleanTranscript(value).length < 30}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brandHover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이 자막으로 진행 →
        </button>
      </div>
    </div>
  );
}

function cleanTranscript(raw: string): string {
  return raw
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*/gm, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function Pill({
  children,
  done,
  active,
}: {
  children: React.ReactNode;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={`px-2 py-1 rounded-md ${
        done
          ? "bg-success/10 text-success"
          : active
            ? "bg-brandSoft text-brand"
            : "bg-chip text-mute"
      }`}
    >
      {done ? "✓ " : active ? "⏳ " : ""}
      {children}
    </span>
  );
}
