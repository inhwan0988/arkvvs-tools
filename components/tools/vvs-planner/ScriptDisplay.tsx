"use client";

import { useState } from "react";
import { cn } from "@/lib/tools/vvs-planner/utils";

const TARGET_CHARS = 7500; // 목표 7,000~8,000자의 중앙값

export default function ScriptDisplay({
  script,
  isStreaming,
}: {
  script: string;
  isStreaming: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const charCount = script.length;
  const progress = Math.min(100, Math.round((charCount / TARGET_CHARS) * 100));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div className="max-h-[600px] overflow-y-auto p-4">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {script || (
            <span className="text-mute">대본이 여기에 표시됩니다...</span>
          )}
          {isStreaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-brand ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}
