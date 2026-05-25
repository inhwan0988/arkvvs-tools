"use client";

import { useCallback, useRef, useState } from "react";
import { useWizard } from "./WizardContext";
import type { ContentIdea } from "@/lib/tools/insta-planner/types";

export default function Step4Generate() {
  const {
    ideas,
    selectedIdea,
    setSelectedIdea,
    selectedReel,
    myProfile,
    userIntent,
    anthropicApiKey,
    scriptText,
    setScriptText,
    appendScriptText,
    goToStep,
  } = useWizard();

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!selectedIdea || !selectedReel) return;
    setScriptText("");
    setError(null);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/tools/insta-planner/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: selectedIdea,
          reel: selectedReel,
          profile: myProfile,
          userIntent,
          anthropicApiKey,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "대본 생성 실패");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트리밍 시작 불가");
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendScriptText(dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setStreaming(false);
    }
  }, [
    selectedIdea,
    selectedReel,
    myProfile,
    userIntent,
    anthropicApiKey,
    setScriptText,
    appendScriptText,
  ]);

  function copyScript() {
    if (!scriptText) return;
    navigator.clipboard.writeText(scriptText);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">
            AI 아이디어 {ideas.length}개 — 1개 선택해서 대본 생성
          </h2>
        </div>
        <button
          onClick={() => goToStep(3)}
          className="text-sm font-semibold text-sub hover:text-ink"
        >
          ← 분석 단계
        </button>
      </div>

      {/* 아이디어 카드 */}
      {!scriptText && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              selected={selectedIdea?.id === idea.id}
              onClick={() => setSelectedIdea(idea)}
            />
          ))}
        </div>
      )}

      {/* 생성 버튼 */}
      {selectedIdea && !scriptText && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={streaming}
            className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50"
          >
            {streaming ? "대본 생성 중..." : "이 아이디어로 대본 생성 →"}
          </button>
        </div>
      )}

      {/* 대본 출력 */}
      {scriptText && (
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">
              📝 콘텐츠 기획서 / 대본
              {streaming && (
                <span className="ml-2 text-[10px] text-mute animate-pulse">
                  생성 중...
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyScript}
                className="px-3 py-1 rounded-lg bg-chip text-xs font-semibold hover:bg-line"
              >
                📋 복사
              </button>
              {!streaming && (
                <button
                  onClick={() => {
                    setScriptText("");
                    setSelectedIdea(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-chip text-xs font-semibold hover:bg-line"
                >
                  다른 아이디어
                </button>
              )}
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-[13px] text-ink leading-relaxed font-sans">
            {scriptText}
          </pre>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

function IdeaCard({
  idea,
  selected,
  onClick,
}: {
  idea: ContentIdea;
  selected: boolean;
  onClick: () => void;
}) {
  const fmtEmoji =
    idea.format === "reel" ? "📹" : idea.format === "carousel" ? "🖼️" : "📷";
  const fmtLabel =
    idea.format === "reel" ? "릴스" : idea.format === "carousel" ? "캐러셀" : "피드";
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl2 border bg-surface p-4 transition hover:shadow-pop hover:-translate-y-0.5 ${
        selected ? "border-brand ring-2 ring-brand/20" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-ink leading-snug flex-1">
          {idea.title}
        </h3>
        <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-chip rounded font-bold">
          {fmtEmoji} {fmtLabel}
        </span>
      </div>

      {(idea.expectedReach || idea.difficulty) && (
        <div className="flex items-center gap-2 mb-2 flex-wrap text-[10px]">
          {idea.expectedReach && (
            <span className="px-1.5 py-0.5 bg-brand/15 text-brand rounded font-bold">
              📊 도달 {idea.expectedReach}
            </span>
          )}
          {idea.difficulty && (
            <span className="px-1.5 py-0.5 bg-chip text-sub rounded font-semibold">
              🎬 촬영 {"★".repeat(idea.difficulty.filming)}
              {"☆".repeat(3 - idea.difficulty.filming)} / 편집{" "}
              {"★".repeat(idea.difficulty.editing)}
              {"☆".repeat(3 - idea.difficulty.editing)}
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-sub leading-relaxed mb-2">{idea.description}</p>

      {selected && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          <div className="rounded-lg bg-dangerSoft/40 p-2">
            <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-0.5">
              🎯 후킹 (첫 3초)
            </p>
            <p className="text-[12px] text-ink">&ldquo;{idea.hook}&rdquo;</p>
          </div>
          {idea.bodyStructure?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1">
                📱 본론 구성
              </p>
              <ul className="space-y-0.5">
                {idea.bodyStructure.map((b, i) => (
                  <li key={i} className="text-[12px] text-sub">
                    {i + 1}. {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1">
              🎯 CTA
            </p>
            <p className="text-[12px] text-sub">{idea.cta}</p>
          </div>
          {idea.musicSuggestion && (
            <p className="text-[11px] text-mute italic">
              🎵 음악: {idea.musicSuggestion}
            </p>
          )}
          {idea.hashtags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {idea.hashtags.slice(0, 6).map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 bg-chip text-mute rounded"
                >
                  {t.startsWith("#") ? t : `#${t}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
