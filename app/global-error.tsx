"use client";

import { useEffect } from "react";

/**
 * Next.js global error boundary — Layout 자체가 fail할 때 발화.
 * /api/log-error로 자동 보고 후 사용자에게 친절한 안내 표시.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        route: typeof window !== "undefined" ? window.location.pathname : "",
        source: "client",
        context: { digest: error.digest, scope: "global-error" },
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          fontFamily:
            "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          margin: 0,
          padding: 0,
          background: "#F2F4F6",
          color: "#191F28",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            padding: "80px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>😵‍💫</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            화면을 불러오지 못했어요
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#6B7684",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            오류가 자동으로 관리자에게 전달됐어요. <br />
            잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              background: "#3182F6",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              border: 0,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: 24,
                fontSize: 11,
                color: "#8B95A1",
                fontFamily: "monospace",
              }}
            >
              error id: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
