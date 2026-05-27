"use client";

import { useEffect } from "react";

export default function SnsTrackerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sns-tracker]", error);
  }, [error]);

  return (
    <div className="min-h-full bg-bg p-8">
      <div className="max-w-2xl mx-auto rounded-xl3 bg-white shadow-card p-6">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-base font-bold text-ink">
          SNS 트래커 페이지에서 오류가 났어요
        </h2>
        <p className="text-sm text-sub mt-2">
          새로고침해보고 그래도 안 되면 아래 메시지를 알려주세요.
        </p>
        <pre className="mt-3 rounded-lg bg-chip p-3 text-[11px] text-danger overflow-auto max-h-40 whitespace-pre-wrap break-all">
          {error.message}
          {error.stack ? "\n\n" + error.stack.split("\n").slice(0, 6).join("\n") : ""}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <div className="flex gap-2 mt-4">
          <button
            onClick={reset}
            className="rounded-lg bg-brand text-white text-sm font-bold px-4 py-2 hover:bg-brandHover"
          >
            🔄 다시 시도
          </button>
          <a
            href="/tools/sns-tracker"
            className="rounded-lg bg-chip text-ink text-sm font-bold px-4 py-2 hover:bg-line"
          >
            새로고침
          </a>
        </div>
      </div>
    </div>
  );
}
