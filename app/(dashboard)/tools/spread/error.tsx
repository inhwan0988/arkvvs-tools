"use client";

import { useEffect } from "react";

export default function SpreadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[spread]", error);
  }, [error]);

  return (
    <div className="min-h-full bg-bg p-8">
      <div className="max-w-2xl mx-auto rounded-xl3 bg-white shadow-card p-6">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-base font-bold text-ink">
          Spread 페이지에서 오류가 났어요
        </h2>
        <pre className="mt-3 rounded-lg bg-chip p-3 text-[11px] text-danger overflow-auto max-h-40 whitespace-pre-wrap break-all">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <div className="flex gap-2 mt-4">
          <button
            onClick={reset}
            className="rounded-lg bg-brand text-white text-sm font-bold px-4 py-2 hover:bg-brandHover"
          >
            🔄 다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
