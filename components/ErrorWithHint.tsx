"use client";

import { useEffect } from "react";
import { hintForError } from "@/lib/error-hints";

interface Props {
  /** 사용자가 본 raw 에러 메시지 */
  message: string;
  /** 어느 도구에서 발생 — 자동 보고에 포함 */
  toolSlug?: string;
  /** 현재 페이지 라우트 (자동 보고용) */
  route?: string;
  /** stack trace (선택) */
  stack?: string;
  /** 부가 컨텍스트 */
  context?: Record<string, unknown>;
  /** 자동 보고 비활성 (이미 다른 곳에서 보고했을 때) */
  skipReport?: boolean;
  /** 닫기 콜백 */
  onDismiss?: () => void;
}

/**
 * 에러 메시지를 받아:
 *  1) 흔한 에러는 lib/error-hints.ts 매핑대로 친절 안내 표시
 *  2) 자동으로 /api/log-error에 보고 (skipReport 아니면)
 */
export default function ErrorWithHint({
  message,
  toolSlug,
  route,
  stack,
  context,
  skipReport = false,
  onDismiss,
}: Props) {
  useEffect(() => {
    if (skipReport || !message) return;
    // fire-and-forget — 실패해도 사용자 흐름 방해 X
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        stack,
        toolSlug,
        route: route ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        context,
        source: "client",
      }),
    }).catch(() => {});
  }, [message, stack, toolSlug, route, context, skipReport]);

  const h = hintForError(message);

  return (
    <div className="rounded-xl2 border border-danger/30 bg-dangerSoft/60 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-danger flex items-center gap-1.5">
            <span>⚠️</span>
            {h.title}
          </p>
          <p className="text-[13px] text-ink mt-1.5 leading-relaxed">
            {h.hint}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-mute hover:text-ink text-lg leading-none px-1"
            aria-label="닫기"
          >
            ×
          </button>
        )}
      </div>

      {h.actions && h.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {h.actions.map((a) => (
            <a
              key={a.href}
              href={a.href}
              target={a.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-surface border border-line text-[12px] font-semibold text-ink hover:bg-chip"
            >
              {a.label} →
            </a>
          ))}
        </div>
      )}

      <details className="pt-1">
        <summary className="text-[11px] text-mute cursor-pointer hover:text-sub">
          기술 정보 (원본 메시지)
        </summary>
        <pre className="mt-1 p-2 bg-surface border border-line rounded text-[11px] font-mono text-mute overflow-x-auto whitespace-pre-wrap break-all">
          {message}
        </pre>
      </details>
    </div>
  );
}
