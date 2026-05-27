"use client";

import { useState } from "react";
import {
  PLATFORMS,
  PLATFORM_META,
  type Platform,
} from "@/lib/tools/sns-tracker/types";

type ResolvedMeta = {
  platform: Platform;
  title: string | null;
  thumbnailUrl: string | null;
  channelName: string | null;
  publishedAt: string | null;
  externalId: string | null;
  canonicalUrl: string;
};

export default function RegisterForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [title, setTitle] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [postedAt, setPostedAt] = useState(() => localDatetimeNow());
  const [views, setViews] = useState(0);
  const [notes, setNotes] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [autoFilled, setAutoFilled] = useState(false);

  function localDatetimeNow() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  async function resolveAndFill(url: string) {
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//.test(trimmed)) return;
    setResolving(true);
    setError(null);
    setAutoFilled(false);
    try {
      const res = await fetch("/api/tools/sns-tracker/resolve-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "메타데이터 추출 실패");
      }
      const meta = (await res.json()) as ResolvedMeta;
      // 자동 채우기 — 사용자가 이미 입력한 값은 덮지 않음
      setPlatform(meta.platform);
      if (meta.title && !title) setTitle(meta.title);
      if (meta.thumbnailUrl) setThumbnailUrl(meta.thumbnailUrl);
      if (meta.publishedAt) {
        try {
          const d = new Date(meta.publishedAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setPostedAt(d.toISOString().slice(0, 16));
        } catch {}
      }
      setAutoFilled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setResolving(false);
    }
  }

  async function submit() {
    if (!title.trim()) return setError("제목을 입력해주세요.");
    if (!destinationUrl.trim() || !/^https?:\/\//.test(destinationUrl)) {
      return setError("목적지 URL은 http(s):// 로 시작해야 합니다.");
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/sns-tracker/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          title: title.trim(),
          content_url: contentUrl.trim() || undefined,
          destination_url: destinationUrl.trim(),
          posted_at: new Date(postedAt).toISOString(),
          views,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "등록 실패");
      }
      // 초기화
      setTitle("");
      setContentUrl("");
      setDestinationUrl("");
      setViews(0);
      setNotes("");
      setThumbnailUrl(null);
      setAutoFilled(false);
      setPostedAt(localDatetimeNow());
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-line bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">➕ 새 콘텐츠 등록</h3>
          <p className="text-[11px] text-sub mt-0.5">
            콘텐츠 URL만 붙여넣으면 제목·썸네일·플랫폼·게시일 자동 채워져요.
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-brand font-semibold"
        >
          {expanded ? "접기" : "펼치기"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {/* 1. URL paste (auto-resolve) */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              ⚡ 콘텐츠 URL 붙여넣기 (자동 인식)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                onPaste={(e) => {
                  const v = e.clipboardData.getData("text").trim();
                  if (/^https?:\/\//.test(v)) {
                    // 다음 tick에 resolve
                    setTimeout(() => resolveAndFill(v), 50);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && e.target.value !== contentUrl) return;
                  if (e.target.value && !autoFilled) resolveAndFill(e.target.value);
                }}
                placeholder="https://youtube.com/watch?v=... 또는 https://instagram.com/p/..."
                className="flex-1 bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
              />
              <button
                onClick={() => contentUrl && resolveAndFill(contentUrl)}
                disabled={resolving || !contentUrl}
                className="rounded-lg bg-brand text-white px-3 py-2 text-xs font-bold hover:bg-brandHover disabled:opacity-50 shrink-0"
              >
                {resolving ? "추출 중..." : "🔍 자동 인식"}
              </button>
            </div>
            {autoFilled && (
              <p className="text-[11px] text-success font-semibold mt-1">
                ✓ 자동 채워졌어요 — 필요시 수정만 하세요
              </p>
            )}
          </div>

          {/* 썸네일 미리보기 */}
          {thumbnailUrl && (
            <div className="flex gap-3 items-start rounded-lg bg-chip/40 p-2">
              <picture>
                <img
                  src={thumbnailUrl}
                  alt="thumbnail"
                  className="w-24 h-14 object-cover rounded shrink-0"
                  referrerPolicy="no-referrer"
                />
              </picture>
              <p className="text-[11px] text-sub mt-1 line-clamp-3">
                {title || "(제목 없음)"}
              </p>
            </div>
          )}

          {/* 2. 플랫폼 (자동 인식 + 수정 가능) */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              플랫폼
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`text-[12px] px-3 py-1.5 rounded-lg font-semibold transition ${
                    platform === p
                      ? "bg-brand text-white"
                      : "bg-chip text-sub hover:bg-line"
                  }`}
                >
                  {PLATFORM_META[p].emoji} {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 제목 */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 회당 3억 버는 유튜버의 비밀"
              className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* 4. 목적지 URL — 핵심 입력 */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              🎯 목적지 URL * <span className="text-mute font-normal">(사람들이 단축 URL을 누르면 갈 곳)</span>
            </label>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://your-site.com/landing"
              className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* 5. 게시일 + 조회수 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-sub block mb-1">
                게시일 *
              </label>
              <input
                type="datetime-local"
                value={postedAt}
                onChange={(e) => setPostedAt(e.target.value)}
                className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-sub block mb-1">
                현재 조회수
              </label>
              <input
                type="number"
                min={0}
                value={views}
                onChange={(e) => setViews(Number(e.target.value))}
                className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* 6. 메모 */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              메모 (옵션)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="콘텐츠 의도, 타겟 등"
              className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-dangerSoft px-3 py-2 text-sm font-semibold text-danger">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50"
          >
            {loading ? "등록 중..." : "콘텐츠 등록 + 단축 URL 생성"}
          </button>
        </div>
      )}
    </div>
  );
}
