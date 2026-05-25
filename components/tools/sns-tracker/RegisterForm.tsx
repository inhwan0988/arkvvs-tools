"use client";

import { useState } from "react";
import {
  PLATFORMS,
  PLATFORM_META,
  type Platform,
} from "@/lib/tools/sns-tracker/types";

export default function RegisterForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [title, setTitle] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [postedAt, setPostedAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [views, setViews] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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
      setTitle("");
      setContentUrl("");
      setDestinationUrl("");
      setViews(0);
      setNotes("");
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
            SNS에 게시한 콘텐츠 + 본문에 넣을 단축 URL을 발급받습니다.
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
          {/* 플랫폼 선택 */}
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

          {/* 제목 */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              제목 / 영상 이름 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 회당 3억 버는 유튜버의 비밀"
              className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* 목적지 URL */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              목적지 URL * <span className="text-mute font-normal">(사람들이 단축 URL을 누르면 이동할 곳)</span>
            </label>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://your-site.com/landing"
              className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* 컨텐츠 URL */}
          <div>
            <label className="text-[11px] font-bold text-sub block mb-1">
              콘텐츠 URL <span className="text-mute font-normal">(SNS 게시물 자체 URL, 옵션)</span>
            </label>
            <input
              type="url"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* 게시일 + 조회수 */}
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
                현재 조회수 <span className="text-mute font-normal">(나중에 업데이트 가능)</span>
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

          {/* 메모 */}
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
