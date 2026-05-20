"use client";

import { useState } from "react";
import { useWizard } from "./WizardContext";

/**
 * "이런 스타일로 만들고 싶다" 영상 URL 1-3개 입력.
 * Step3/4의 prompt에 자막 일부가 주입되어 추천 quality 향상.
 */
export default function ReferenceVideosInput() {
  const { referenceVideoUrls, setReferenceVideoUrls } = useWizard();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(referenceVideoUrls.length > 0);

  function add() {
    const url = input.trim();
    if (!url) return;
    if (!isYoutubeUrl(url)) {
      alert("올바른 YouTube URL을 입력해주세요.");
      return;
    }
    if (referenceVideoUrls.length >= 3) {
      alert("최대 3개까지만 추가 가능합니다.");
      return;
    }
    if (referenceVideoUrls.includes(url)) {
      alert("이미 추가된 URL입니다.");
      return;
    }
    setReferenceVideoUrls([...referenceVideoUrls, url]);
    setInput("");
  }

  function remove(url: string) {
    setReferenceVideoUrls(referenceVideoUrls.filter((u) => u !== url));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 text-[12px] text-mute hover:text-brand underline underline-offset-2"
      >
        🎯 &ldquo;이런 스타일로 만들고 싶어요&rdquo; 레퍼런스 영상 추가 (선택)
      </button>
    );
  }

  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <h3 className="text-sm font-bold text-ink">레퍼런스 영상 (선택)</h3>
          <span className="text-[10px] text-mute">최대 3개</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-mute hover:text-ink"
        >
          닫기
        </button>
      </div>
      <p className="text-[11px] text-sub mb-3">
        &ldquo;이런 스타일/구성으로 만들고 싶다&rdquo;고 생각하는 영상의 URL을 추가하면,
        AI가 그 영상의 자막을 학습해서 추천에 반영합니다.
      </p>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="https://www.youtube.com/watch?v=..."
          className="flex-1 rounded-lg border border-line bg-chip px-3 py-2 text-sm outline-none focus:border-brand"
          disabled={referenceVideoUrls.length >= 3}
        />
        <button
          onClick={add}
          disabled={!input.trim() || referenceVideoUrls.length >= 3}
          className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brandHover disabled:opacity-50"
        >
          추가
        </button>
      </div>

      {referenceVideoUrls.length > 0 && (
        <ul className="space-y-1">
          {referenceVideoUrls.map((url) => (
            <li
              key={url}
              className="flex items-center gap-2 text-[11px] text-sub bg-chip rounded px-2 py-1"
            >
              <span className="truncate flex-1 font-mono">{url}</span>
              <button
                onClick={() => remove(url)}
                className="text-mute hover:text-danger shrink-0"
                aria-label="삭제"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isYoutubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/.test(
    url,
  );
}
