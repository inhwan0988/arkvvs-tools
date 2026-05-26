"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useWizard } from "./WizardContext";
import type { ContentIdea } from "@/lib/tools/insta-planner/types";
import {
  parseScript,
  rowsToPlainText,
  rowsToDialogueOnly,
  rowsToDirectionOnly,
  type ScriptRow,
} from "@/lib/tools/insta-planner/script-parser";

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

  const rows = useMemo<ScriptRow[]>(() => parseScript(scriptText), [scriptText]);

  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  function flashCopy(msg: string) {
    setCopyMsg(msg);
    setTimeout(() => setCopyMsg(null), 1500);
  }

  async function copyAll() {
    if (!scriptText) return;
    await navigator.clipboard.writeText(rowsToPlainText(rows));
    flashCopy("✓ 전체 복사됨");
  }
  async function copyDialogue() {
    if (!scriptText) return;
    await navigator.clipboard.writeText(rowsToDialogueOnly(rows));
    flashCopy("✓ 대사만 복사됨");
  }
  async function copyDirection() {
    if (!scriptText) return;
    await navigator.clipboard.writeText(rowsToDirectionOnly(rows));
    flashCopy("✓ 연출만 복사됨");
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

      {/* 대본 출력 — 2-column (대사 / 연출) */}
      {scriptText && (
        <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-ink">
              📝 콘텐츠 기획서 / 대본
              {streaming && (
                <span className="ml-2 text-[10px] text-mute animate-pulse">
                  생성 중...
                </span>
              )}
              {copyMsg && (
                <span className="ml-2 text-[10px] font-bold text-success">
                  {copyMsg}
                </span>
              )}
            </h3>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={copyDialogue}
                className="px-3 py-1 rounded-lg bg-chip text-xs font-semibold hover:bg-line"
                title="출연자에게 줄 대사만"
              >
                🎙️ 대사만 복사
              </button>
              <button
                onClick={copyDirection}
                className="px-3 py-1 rounded-lg bg-chip text-xs font-semibold hover:bg-line"
                title="디렉터/편집자에게 줄 연출 큐시트만"
              >
                🎨 연출만 복사
              </button>
              <button
                onClick={copyAll}
                className="px-3 py-1 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brandHover"
              >
                📋 전체 복사
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

          {/* 컬럼 헤더 */}
          <div className="hidden md:grid md:grid-cols-[1fr_1.2fr] gap-3 mb-2 px-1">
            <div className="text-[10px] font-bold text-mute uppercase tracking-wider">
              🎙️ 출연자 대사 (그대로 읽기)
            </div>
            <div className="text-[10px] font-bold text-mute uppercase tracking-wider">
              🎨 화면 연출 (텍스트/시각/디렉션)
            </div>
          </div>

          <div className="space-y-3">
            {rows.length === 0 && (
              <div className="text-center text-mute text-sm py-8">
                생성 중...
              </div>
            )}
            {rows.map((row, i) => (
              <ScriptRowView key={i} row={row} />
            ))}
          </div>
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

function ScriptRowView({ row }: { row: ScriptRow }) {
  // 머리말 (헤더 없는 leading row) — 단일 셀
  if (!row.header && (row.dialogue.length || row.direction.length || row.other.length)) {
    return (
      <div className="rounded-lg bg-chip/40 p-3 text-[13px] text-sub leading-relaxed">
        {[...row.dialogue, ...row.direction, ...row.other].map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    );
  }
  if (!row.header) return null;

  return (
    <div className="rounded-xl border border-line">
      {/* 시간대 헤더 */}
      <div className="px-3 py-2 bg-chip/60 border-b border-line rounded-t-xl">
        <span className="text-[12px] font-bold text-ink">[{row.header}]</span>
      </div>
      {/* 2-column body */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] divide-y md:divide-y-0 md:divide-x divide-line">
        {/* 왼쪽 — 대사 */}
        <div className="p-3 space-y-2 min-h-[60px]">
          {row.dialogue.length === 0 && (
            <p className="text-[11px] text-mute italic">대사 없음 (B-roll/연출만)</p>
          )}
          {row.dialogue.map((d, i) => (
            <p
              key={i}
              className="text-[13.5px] text-ink leading-relaxed font-medium"
            >
              {d}
            </p>
          ))}
        </div>
        {/* 오른쪽 — 연출 */}
        <div className="p-3 space-y-1.5 min-h-[60px] bg-brandSoft/15">
          {row.direction.length === 0 && row.other.length === 0 && (
            <p className="text-[11px] text-mute italic">연출 없음</p>
          )}
          {row.direction.map((d, i) => (
            <p key={i} className="text-[12.5px] text-sub leading-relaxed">
              <span className="mr-1.5 text-brand">▸</span>
              {d}
            </p>
          ))}
          {row.other.map((o, i) => (
            <p
              key={i}
              className="text-[12.5px] text-mute leading-relaxed italic"
            >
              {o}
            </p>
          ))}
        </div>
      </div>
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
