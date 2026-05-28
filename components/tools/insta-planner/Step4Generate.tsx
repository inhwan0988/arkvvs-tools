"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWizard } from "./WizardContext";
import type { ContentIdea } from "@/lib/tools/insta-planner/types";
import {
  parseScript,
  rowsToDialogueSection,
  rowsToDirectionSection,
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
    dialogueDraft,
    setDialogueDraft,
    directionDraft,
    setDirectionDraft,
    goToStep,
  } = useWizard();

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [userEdited, setUserEdited] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!selectedIdea || !selectedReel) return;
    setScriptText("");
    setDialogueDraft("");
    setDirectionDraft("");
    setUserEdited(false);
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
    setDialogueDraft,
    setDirectionDraft,
  ]);

  const rows = useMemo(() => parseScript(scriptText), [scriptText]);

  // streaming 중 — 두 draft를 AI 출력에서 자동 동기화 (사용자가 직접 편집한 적 없을 때)
  const liveDialogue = useMemo(() => rowsToDialogueSection(rows), [rows]);
  const liveDirection = useMemo(() => rowsToDirectionSection(rows), [rows]);
  useEffect(() => {
    if (userEdited) return;
    if (streaming || (scriptText && !dialogueDraft && !directionDraft)) {
      setDialogueDraft(liveDialogue);
      setDirectionDraft(liveDirection);
    }
  }, [
    streaming,
    scriptText,
    liveDialogue,
    liveDirection,
    userEdited,
    dialogueDraft,
    directionDraft,
    setDialogueDraft,
    setDirectionDraft,
  ]);

  function flashCopy(msg: string) {
    setCopyMsg(msg);
    setTimeout(() => setCopyMsg(null), 1500);
  }

  async function copyDialogue() {
    if (!dialogueDraft.trim()) return;
    await navigator.clipboard.writeText(dialogueDraft);
    flashCopy("✓ 대본 복사됨");
  }
  async function copyDirection() {
    if (!directionDraft.trim()) return;
    await navigator.clipboard.writeText(directionDraft);
    flashCopy("✓ 연출 복사됨");
  }
  async function copyBoth() {
    const combined = [
      "📜 대본",
      dialogueDraft,
      "",
      "🎨 연출",
      directionDraft,
    ].join("\n");
    await navigator.clipboard.writeText(combined.trim());
    flashCopy("✓ 전체 복사됨");
  }

  function restoreOriginal() {
    if (!confirm("AI가 생성한 원본으로 되돌릴까요? 편집한 내용은 사라집니다."))
      return;
    setDialogueDraft(liveDialogue);
    setDirectionDraft(liveDirection);
    setUserEdited(false);
  }

  const hasOutput = scriptText.length > 0 || dialogueDraft.length > 0;

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
      {!hasOutput && (
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
      {selectedIdea && !hasOutput && (
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

      {/* 결과 — 두 큰 섹션 (대본 / 연출) */}
      {hasOutput && (
        <div className="space-y-4">
          {/* 상단 액션 바 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-ink">
                📝 콘텐츠 기획서
              </h3>
              {streaming && (
                <span className="text-[10px] text-mute animate-pulse">
                  생성 중...
                </span>
              )}
              {!streaming && userEdited && (
                <span className="text-[10px] font-bold text-warn">
                  · 편집됨
                </span>
              )}
              {copyMsg && (
                <span className="text-[10px] font-bold text-success">
                  {copyMsg}
                </span>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={copyBoth}
                disabled={streaming}
                className="px-3 py-1 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brandHover disabled:opacity-40"
              >
                📋 전체 복사
              </button>
              {!streaming && userEdited && (
                <button
                  onClick={restoreOriginal}
                  className="px-3 py-1 rounded-lg bg-chip text-xs font-semibold hover:bg-line"
                  title="AI 원본 복원"
                >
                  ↺ 원본 복원
                </button>
              )}
              {!streaming && (
                <button
                  onClick={() => {
                    setScriptText("");
                    setDialogueDraft("");
                    setDirectionDraft("");
                    setUserEdited(false);
                    setSelectedIdea(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-chip text-xs font-semibold hover:bg-line"
                >
                  다른 아이디어
                </button>
              )}
            </div>
          </div>

          {/* 두 섹션 — 대본 / 연출 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionEditor
              icon="🎙️"
              title="대본 파트"
              hint="출연자에게 그대로 줄 대사"
              value={dialogueDraft}
              onChange={(v) => {
                setDialogueDraft(v);
                setUserEdited(true);
              }}
              onCopy={copyDialogue}
              readOnly={streaming}
              accent="ink"
            />
            <SectionEditor
              icon="🎨"
              title="연출 파트"
              hint="디렉터/편집자에게 줄 큐시트"
              value={directionDraft}
              onChange={(v) => {
                setDirectionDraft(v);
                setUserEdited(true);
              }}
              onCopy={copyDirection}
              readOnly={streaming}
              accent="brand"
            />
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

function SectionEditor({
  icon,
  title,
  hint,
  value,
  onChange,
  onCopy,
  readOnly,
  accent,
}: {
  icon: string;
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onCopy: () => void;
  readOnly: boolean;
  accent: "ink" | "brand";
}) {
  const accentBg = accent === "brand" ? "bg-brandSoft/15" : "bg-chip/40";
  return (
    <div className="rounded-xl2 border border-line bg-surface shadow-card flex flex-col min-h-[420px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div>
          <div className="text-sm font-bold text-ink">
            <span className="mr-1.5">{icon}</span>
            {title}
          </div>
          <div className="text-[10px] text-mute mt-0.5">{hint}</div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={readOnly || !value.trim()}
          className="px-2.5 py-1 rounded-lg bg-chip text-[11px] font-semibold hover:bg-line disabled:opacity-40"
        >
          복사
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={readOnly ? "생성 중..." : ""}
        className={`flex-1 w-full p-4 text-[13.5px] leading-relaxed text-ink font-medium resize-none focus:outline-none rounded-b-xl2 ${accentBg} ${
          readOnly ? "cursor-default" : ""
        }`}
      />
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
