"use client";

import { useState } from "react";
import {
  PLATFORM_META,
  type SnsContentStats,
} from "@/lib/tools/sns-tracker/types";

/**
 * 토스 스타일 단축 URL 리스트 — 큰 카드, 핵심 숫자, 적은 색.
 */
export default function TossLinkList({
  contents,
  baseUrl,
  onChanged,
}: {
  contents: SnsContentStats[];
  baseUrl: string;
  onChanged: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const sorted = [...contents].sort(
    (a, b) => (b.click_count ?? 0) - (a.click_count ?? 0),
  );

  async function copy(shortId: string) {
    await navigator.clipboard.writeText(`${baseUrl}/r/${shortId}`);
    setCopied(shortId);
    setTimeout(() => setCopied(null), 1500);
  }

  async function remove(id: string) {
    if (!confirm("이 단축 URL을 삭제할까요? 클릭 기록도 같이 사라집니다.")) return;
    await fetch("/api/tools/sns-tracker/contents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onChanged();
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl3 bg-white shadow-card p-8 text-center">
        <div className="text-4xl mb-2">🔗</div>
        <p className="text-sm font-bold text-ink mb-1">
          아직 발급된 단축 URL이 없어요
        </p>
        <p className="text-xs text-sub">위에서 첫 URL을 발급해보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold text-mute uppercase tracking-wider px-1">
        최근 단축 URL · {sorted.length}개
      </p>
      {sorted.map((c) => {
        const meta = PLATFORM_META[c.platform];
        const shortUrl = `${baseUrl}/r/${c.short_id}`;
        return (
          <div
            key={c.content_id}
            className="rounded-xl2 bg-white shadow-card p-4 hover:shadow-pop transition"
          >
            <div className="flex items-start gap-3">
              <span
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: `${meta.color}15` }}
              >
                {meta.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate" title={c.title}>
                  {c.title}
                </p>
                <code className="text-[11px] text-sub font-mono break-all">
                  /r/{c.short_id}
                </code>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-brand leading-none">
                  {fmt(c.click_count ?? 0)}
                </p>
                <p className="text-[10px] text-mute mt-0.5">클릭</p>
              </div>
            </div>

            {/* 액션 */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <button
                onClick={() => copy(c.short_id)}
                className="text-[11px] rounded-lg bg-brandSoft text-brand font-bold px-3 py-1.5 hover:bg-brand hover:text-white transition"
              >
                {copied === c.short_id ? "✓ 복사됨" : "🔗 복사"}
              </button>
              <a
                href={`/api/tools/sns-tracker/qr/${c.short_id}`}
                target="_blank"
                rel="noopener noreferrer"
                download={`qr-${c.short_id}.svg`}
                className="text-[11px] rounded-lg bg-chip text-ink font-bold px-3 py-1.5 hover:bg-line"
              >
                🔲 QR
              </a>
              <a
                href={c.destination_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-mute hover:text-ink truncate max-w-[200px]"
                title={c.destination_url}
              >
                → {short(c.destination_url)}
              </a>
              <button
                onClick={() => remove(c.content_id)}
                className="ml-auto text-[11px] text-mute hover:text-danger"
              >
                삭제
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}

function short(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + u.pathname.slice(0, 20);
  } catch {
    return url.slice(0, 40);
  }
}
