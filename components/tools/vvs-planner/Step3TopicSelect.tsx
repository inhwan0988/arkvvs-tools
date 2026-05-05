"use client";

import { useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import TopicCard from "./TopicCard";
import type { Topic } from "@/lib/tools/vvs-planner/types";

export default function Step3TopicSelect() {
  const {
    selectedVideo,
    transcript,
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
  } = useWizard();

  const [phase, setPhase] = useState<"transcript" | "topics" | "done">(
    topics.length > 0 ? "done" : "transcript",
  );
  const [elapsed, setElapsed] = useState(0);

  // 진행 중일 때 1초마다 경과시간 갱신
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

  useEffect(() => {
    if (!selectedVideo) {
      goToStep(1);
      return;
    }
    if (topics.length > 0) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        setPhase("transcript");
        const tRes = await fetch("/api/tools/vvs-planner/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: selectedVideo.videoId }),
        });
        if (!tRes.ok) {
          const d = await tRes.json();
          throw new Error(d.error ?? "자막 추출 중 오류가 발생했습니다.");
        }
        const tData = (await tRes.json()) as { transcript: string };
        if (cancelled) return;
        setTranscript(tData.transcript);

        if (!anthropicApiKey.trim()) {
          throw new Error(
            "우측 상단에서 Claude API 키를 입력해주세요.",
          );
        }

        setPhase("topics");
        const topRes = await fetch("/api/tools/vvs-planner/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: tData.transcript,
            videoTitle: selectedVideo.title,
            channelTitle: selectedVideo.channelTitle,
            anthropicApiKey,
          }),
        });
        if (!topRes.ok) {
          const d = await topRes.json();
          throw new Error(d.error ?? "주제 생성 중 오류가 발생했습니다.");
        }
        const topData = (await topRes.json()) as { topics: Topic[] };
        if (cancelled) return;
        setTopics(topData.topics);
        setPhase("done");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo]);

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

      {error && (
        <div className="mx-auto max-w-md text-center">
          <div className="rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
          <button
            onClick={() => goToStep(1)}
            className="mt-4 rounded-xl border border-line bg-surface px-6 py-2 text-sm font-semibold text-ink transition-colors hover:bg-chip"
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
