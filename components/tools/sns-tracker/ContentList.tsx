"use client";

import { useState } from "react";
import {
  PLATFORM_META,
  type Platform,
  type SnsContentStats,
} from "@/lib/tools/sns-tracker/types";

export default function ContentList({
  contents,
  baseUrl,
  onChanged,
}: {
  contents: SnsContentStats[];
  baseUrl: string;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Platform | "all">("all");
  const [sort, setSort] = useState<"posted" | "clicks" | "conv">("posted");
  const [editingViews, setEditingViews] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = contents.filter(
    (c) => filter === "all" || c.platform === filter,
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "clicks") return (b.click_count ?? 0) - (a.click_count ?? 0);
    if (sort === "conv")
      return (b.conversion_rate_pct ?? 0) - (a.conversion_rate_pct ?? 0);
    return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
  });

  async function copyShortUrl(shortId: string) {
    const url = `${baseUrl}/r/${shortId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(shortId);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // noop
    }
  }

  async function saveViews(id: string, valueRaw: string | null | undefined) {
    const value = valueRaw ?? "";
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 0) {
      setEditingViews(null);
      return;
    }
    const res = await fetch("/api/tools/sns-tracker/contents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, views: n }),
    });
    if (res.ok) onChanged();
    setEditingViews(null);
  }

  async function deleteContent(id: string) {
    if (!confirm("이 콘텐츠를 삭제할까요? 클릭 로그도 같이 사라집니다.")) return;
    const res = await fetch("/api/tools/sns-tracker/contents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) onChanged();
  }

  return (
    <div className="rounded-xl2 border border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line flex-wrap">
        <h3 className="text-sm font-bold text-ink mr-2">📋 콘텐츠 목록</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Platform | "all")}
          className="text-[12px] bg-chip rounded-lg px-2 py-1.5 focus:outline-none"
        >
          <option value="all">전체 플랫폼</option>
          {Object.entries(PLATFORM_META).map(([p, m]) => (
            <option key={p} value={p}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-[12px] bg-chip rounded-lg px-2 py-1.5 focus:outline-none"
        >
          <option value="posted">최근 게시 순</option>
          <option value="clicks">클릭 많은 순</option>
          <option value="conv">전환율 높은 순</option>
        </select>
        <span className="text-[11px] text-mute ml-auto">
          {sorted.length}개
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="p-8 text-center text-sub text-sm">
          등록된 콘텐츠가 없습니다. 위에서 새 콘텐츠를 등록하세요.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {sorted.map((c) => {
            const meta = PLATFORM_META[c.platform];
            const shortUrl = `${baseUrl}/r/${c.short_id}`;
            return (
              <div key={c.content_id} className="p-4 hover:bg-chip/40">
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-lg"
                    style={{ background: `${meta.color}22` }}
                  >
                    {meta.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-ink truncate">
                        {c.title}
                      </p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{
                          background: `${meta.color}1F`,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-mute mt-0.5 flex-wrap">
                      <span>{new Date(c.posted_at).toLocaleString("ko-KR")}</span>
                      {c.content_url && (
                        <a
                          href={c.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline"
                        >
                          원본 보기 ↗
                        </a>
                      )}
                    </div>
                    {/* 단축 URL */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <code className="text-[11px] bg-chip px-2 py-1 rounded font-mono text-ink">
                        {shortUrl}
                      </code>
                      <button
                        onClick={() => copyShortUrl(c.short_id)}
                        className="text-[11px] text-brand font-bold hover:underline"
                      >
                        {copied === c.short_id ? "✓ 복사됨" : "복사"}
                      </button>
                      <a
                        href={c.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-mute hover:underline truncate max-w-[200px]"
                      >
                        → {c.destination_url}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteContent(c.content_id)}
                    className="shrink-0 text-[11px] text-mute hover:text-danger"
                  >
                    삭제
                  </button>
                </div>

                {/* 메트릭 */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <Metric
                    label="조회수"
                    valueNode={
                      editingViews?.id === c.content_id ? (
                        <input
                          type="number"
                          value={editingViews.value}
                          onChange={(e) =>
                            setEditingViews({
                              id: c.content_id,
                              value: e.target.value,
                            })
                          }
                          onBlur={() =>
                            saveViews(c.content_id, editingViews.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              saveViews(c.content_id, editingViews.value);
                            if (e.key === "Escape") setEditingViews(null);
                          }}
                          autoFocus
                          className="w-full bg-white border border-brand rounded px-2 py-1 text-sm font-bold"
                        />
                      ) : (
                        <button
                          onClick={() =>
                            setEditingViews({
                              id: c.content_id,
                              value: String(c.views ?? 0),
                            })
                          }
                          className="text-left text-sm font-bold text-ink hover:text-brand"
                          title="클릭해서 수정"
                        >
                          {formatNum(c.views ?? 0)} ✏️
                        </button>
                      )
                    }
                  />
                  <Metric
                    label="링크 클릭"
                    valueNode={
                      <span className="text-sm font-bold text-success">
                        {formatNum(c.click_count ?? 0)}
                      </span>
                    }
                  />
                  <Metric
                    label="전환율"
                    valueNode={
                      <span className="text-sm font-bold text-brand">
                        {(c.conversion_rate_pct ?? 0).toFixed(2)}%
                      </span>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  valueNode,
}: {
  label: string;
  valueNode: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-chip/40 p-2">
      <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div>{valueNode}</div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}
