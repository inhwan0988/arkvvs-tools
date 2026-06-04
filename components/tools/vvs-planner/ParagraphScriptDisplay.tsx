"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import { cn } from "@/lib/tools/vvs-planner/utils";
import type {
  ChannelProfile,
  ParagraphTone,
} from "@/lib/tools/vvs-planner/types";

const TARGET_CHARS = 7500;

interface Props {
  script: string;
  isStreaming: boolean;
  onScriptChange: (newScript: string) => void;
  anthropicApiKey: string;
  channelProfile: ChannelProfile | null;
}

/**
 * 단락 단위로 split → 각 단락에 재생성/편집/톤 조정 액션.
 * 스트리밍 중에는 통째로 표시. 완료 후 단락 액션 활성화.
 */
export default function ParagraphScriptDisplay({
  script,
  isStreaming,
  onScriptChange,
  anthropicApiKey,
  channelProfile,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const charCount = script.length;
  const progress = Math.min(100, Math.round((charCount / TARGET_CHARS) * 100));
  const scrollRef = useRef<HTMLDivElement>(null);

  // 빈 줄 기준 단락 split. 시간 마커 [...] 줄도 그대로 유지.
  const paragraphs = useMemo(() => splitParagraphs(script), [script]);

  // 스트리밍 중에는 자동 스크롤 (아래로)
  useEffect(() => {
    if (!isStreaming) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [script, isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegen = async (idx: number, tone?: ParagraphTone) => {
    if (regenIdx !== null) return;
    if (!anthropicApiKey.trim()) {
      setError("우측 상단에서 Claude API 키를 입력해주세요.");
      return;
    }
    setError(null);
    setRegenIdx(idx);
    try {
      const res = await fetch(
        "/api/tools/vvs-planner/script/regenerate-paragraph",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullScript: script,
            paragraphIndex: idx,
            paragraph: paragraphs[idx],
            tone,
            channelProfile,
            anthropicApiKey,
          }),
        },
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "단락 재생성 중 오류가 발생했습니다.");
      }
      const data = (await res.json()) as { paragraph: string };
      const next = paragraphs.slice();
      next[idx] = data.paragraph;
      onScriptChange(next.join("\n\n"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "단락 재생성 중 오류가 발생했습니다.",
      );
    } finally {
      setRegenIdx(null);
    }
  };

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditValue(paragraphs[idx]);
  };

  const saveEdit = () => {
    if (editIdx === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditIdx(null);
      return;
    }
    const next = paragraphs.slice();
    next[editIdx] = editValue;
    onScriptChange(next.join("\n\n"));
    setEditIdx(null);
  };

  const cancelEdit = () => setEditIdx(null);

  return (
    <div className="rounded-xl2 border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-ink">생성된 대본</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                charCount >= 7000 && charCount <= 8000
                  ? "bg-success/15 text-success"
                  : charCount > 0
                    ? "bg-warnSoft text-warn"
                    : "bg-chip text-mute",
              )}
            >
              {charCount.toLocaleString()}자 · 목표 7,000~8,000
            </span>
            {isStreaming && (
              <span className="text-xs text-brand animate-pulse">생성 중...</span>
            )}
          </div>
          <button
            onClick={handleCopy}
            disabled={!script || isStreaming}
            className="rounded-lg bg-chip px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-line disabled:opacity-50"
          >
            {copied ? "복사됨!" : "클립보드 복사"}
          </button>
        </div>
        {(isStreaming || charCount > 0) && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-chip">
            <div
              className={cn(
                "h-full transition-[width] duration-300 ease-out",
                progress >= 100 ? "bg-success" : "bg-brand",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 pt-3">
          <ErrorWithHint
            message={error}
            toolSlug="vvs-planner"
            route="/api/tools/vvs-planner/script/regenerate-paragraph"
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-[600px] overflow-y-auto p-4 space-y-3"
      >
        {paragraphs.length === 0 ? (
          <div className="text-sm text-mute">대본이 여기에 표시됩니다...</div>
        ) : (
          paragraphs.map((p, i) => (
            <div key={i} className="group relative">
              {editIdx === i ? (
                <div className="rounded-xl border border-brand bg-bg p-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full min-h-[120px] resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                    autoFocus
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg px-3 py-1 text-xs font-semibold text-sub hover:text-ink"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveEdit}
                      className="rounded-lg bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brandHover"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-transparent p-2 hover:border-line hover:bg-bg/50 transition-colors">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {p}
                    {isStreaming && i === paragraphs.length - 1 && (
                      <span className="inline-block h-4 w-0.5 animate-pulse bg-brand ml-0.5" />
                    )}
                  </div>
                  {!isStreaming && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {regenIdx === i ? (
                        <span className="text-[11px] font-bold text-brand animate-pulse">
                          ⏳ 재생성 중...
                        </span>
                      ) : (
                        <>
                          <ActionButton onClick={() => startEdit(i)}>
                            ✏️ 편집
                          </ActionButton>
                          <ActionButton onClick={() => handleRegen(i)}>
                            ↻ 재생성
                          </ActionButton>
                          <ActionButton
                            onClick={() => handleRegen(i, "punchy")}
                            tone
                          >
                            자극적
                          </ActionButton>
                          <ActionButton
                            onClick={() => handleRegen(i, "calm")}
                            tone
                          >
                            차분
                          </ActionButton>
                          <ActionButton
                            onClick={() => handleRegen(i, "expand")}
                            tone
                          >
                            길게
                          </ActionButton>
                          <ActionButton
                            onClick={() => handleRegen(i, "shrink")}
                            tone
                          >
                            짧게
                          </ActionButton>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors",
        tone
          ? "bg-chip text-sub hover:bg-brandSoft hover:text-brand"
          : "bg-chip text-ink hover:bg-line",
      )}
    >
      {children}
    </button>
  );
}

/**
 * 빈 줄 (\n\n+) 기준 split. 시간 마커 [...] 줄도 자체 단락으로 보존.
 * 너무 짧은 단락(5자 이하)은 다음 단락과 머지.
 */
function splitParagraphs(script: string): string[] {
  if (!script.trim()) return [];
  const parts = script
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  // 너무 짧은 단락은 이전 단락에 머지 (조각화 방지)
  const merged: string[] = [];
  for (const p of parts) {
    if (p.length < 5 && merged.length > 0) {
      merged[merged.length - 1] = merged[merged.length - 1] + "\n\n" + p;
    } else {
      merged.push(p);
    }
  }
  return merged;
}
