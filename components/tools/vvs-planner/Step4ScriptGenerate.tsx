"use client";

import { useEffect, useRef, useState } from "react";
import { useWizard } from "./WizardContext";
import ScriptDisplay from "./ScriptDisplay";

export default function Step4ScriptGenerate() {
  const {
    selectedVideo,
    selectedTopic,
    transcript,
    script,
    setScript,
    appendScript,
    goToStep,
    reset,
    anthropicApiKey,
    channelProfile,
    referenceVideoUrls,
    userIntent,
  } = useWizard();

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!selectedTopic || !selectedVideo || !transcript) return;
    if (!anthropicApiKey.trim()) {
      setError("우측 상단에서 Claude API 키를 입력해주세요.");
      return;
    }

    setScript("");
    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/tools/vvs-planner/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: {
            title: selectedTopic.title,
            description: selectedTopic.description,
            angle: selectedTopic.angle,
          },
          transcript,
          videoTitle: selectedVideo.title,
          anthropicApiKey,
          // v2/v3 personalization
          channelProfile,
          referenceVideoUrls,
          userIntent,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "대본 생성 중 오류가 발생했습니다.");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트리밍을 시작할 수 없습니다.");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendScript(decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(
        e instanceof Error ? e.message : "대본 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    if (!selectedVideo || !selectedTopic || !transcript) {
      goToStep(3);
      return;
    }
    if (!script) generate();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">대본 생성</h2>
          <p className="mt-1 text-sm text-sub">주제: {selectedTopic?.title}</p>
        </div>
        <button
          onClick={() => goToStep(3)}
          className="text-sm font-semibold text-sub hover:text-ink"
        >
          ← 주제 선택
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <ScriptDisplay script={script} isStreaming={isStreaming} />

      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={() => {
            abortRef.current?.abort();
            generate();
          }}
          disabled={isStreaming}
          className="rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-chip disabled:opacity-50"
        >
          재생성
        </button>
        <button
          onClick={() => reset()}
          disabled={isStreaming}
          className="rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-chip disabled:opacity-50"
        >
          처음부터 다시
        </button>
      </div>
    </div>
  );
}
