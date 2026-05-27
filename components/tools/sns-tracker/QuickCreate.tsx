"use client";

import { useState } from "react";

/**
 * 토스 스타일 단축 URL 즉시 발급 카드.
 * destination URL 1줄만 입력 → 단축 URL + QR 즉시 발급.
 * 콘텐츠 메타(제목/플랫폼/조회수)는 자동 또는 나중에.
 */
export default function QuickCreate({
  onCreated,
  baseUrl,
}: {
  onCreated: () => void;
  baseUrl: string;
}) {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ shortId: string; shortUrl: string } | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!destinationUrl.trim() || !/^https?:\/\//.test(destinationUrl)) {
      setError("https:// 또는 http:// 로 시작하는 URL을 입력해주세요");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // contentUrl이 있으면 메타 자동 추출
      let platform: string | undefined;
      let title: string | undefined;
      if (contentUrl.trim() && /^https?:\/\//.test(contentUrl.trim())) {
        try {
          const r = await fetch("/api/tools/sns-tracker/resolve-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: contentUrl.trim() }),
          });
          if (r.ok) {
            const meta = await r.json();
            platform = meta.platform;
            title = meta.title;
          }
        } catch {
          // 메타 추출 실패해도 진행
        }
      }

      const res = await fetch("/api/tools/sns-tracker/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          title,
          content_url: contentUrl.trim() || undefined,
          destination_url: destinationUrl.trim(),
          // posted_at 안 보내면 서버가 now()
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "발급 실패");
      }
      const data = await res.json();
      const shortId = data.content?.short_id;
      if (!shortId) throw new Error("short_id 응답 누락");
      setCreated({
        shortId,
        shortUrl: `${baseUrl}/r/${shortId}`,
      });
      setDestinationUrl("");
      setContentUrl("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(created.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // 발급 후 결과 카드
  if (created) {
    return (
      <div className="rounded-xl3 bg-white shadow-card p-6 sm:p-8">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">✨</div>
          <h2 className="text-lg font-bold text-ink">단축 URL이 만들어졌어요</h2>
          <p className="text-[12px] text-sub mt-1">
            SNS 어디든 붙여넣으면 우리가 자동으로 추적해요
          </p>
        </div>

        <div className="rounded-xl2 bg-chip p-4 mb-3 flex items-center gap-3">
          <code className="flex-1 text-sm font-mono font-bold text-ink break-all">
            {created.shortUrl}
          </code>
          <button
            onClick={copy}
            className="shrink-0 rounded-lg bg-brand text-white px-4 py-2 text-sm font-bold hover:bg-brandHover"
          >
            {copied ? "✓ 복사됨" : "복사"}
          </button>
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          <a
            href={`/api/tools/sns-tracker/qr/${created.shortId}`}
            target="_blank"
            rel="noopener noreferrer"
            download={`qr-${created.shortId}.svg`}
            className="text-[12px] rounded-lg bg-chip hover:bg-line text-ink font-bold px-4 py-2"
          >
            🔲 QR 다운로드
          </a>
          <button
            onClick={() => setCreated(null)}
            className="text-[12px] rounded-lg bg-chip hover:bg-line text-sub font-bold px-4 py-2"
          >
            + 또 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl3 bg-white shadow-card p-6 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-ink mb-1">
        단축 URL 발급
      </h2>
      <p className="text-sm text-sub mb-6">
        URL 1줄만 입력하면 끝. SNS 어디서 클릭했는지 자동 분류돼요.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[12px] font-bold text-sub block mb-1.5">
            🎯 목적지 URL
          </label>
          <input
            type="url"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading && destinationUrl) submit();
            }}
            placeholder="https://your-site.com/landing"
            className="w-full bg-chip rounded-xl px-4 py-3 text-base text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            autoFocus
          />
        </div>

        {/* 선택 입력 — 펼치기 */}
        {!showOptional && (
          <button
            onClick={() => setShowOptional(true)}
            className="text-[12px] text-sub hover:text-ink"
          >
            + 콘텐츠 URL도 같이 등록 (선택)
          </button>
        )}
        {showOptional && (
          <div>
            <label className="text-[12px] font-bold text-sub block mb-1.5">
              📎 콘텐츠 URL (선택) — 입력하면 제목/플랫폼 자동 채워짐
            </label>
            <input
              type="url"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... 또는 https://instagram.com/p/..."
              className="w-full bg-chip rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !destinationUrl}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white hover:bg-brandHover disabled:opacity-40 transition"
        >
          {loading ? "발급 중..." : "단축 URL 발급"}
        </button>
      </div>
    </div>
  );
}
