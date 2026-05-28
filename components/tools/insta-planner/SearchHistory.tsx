"use client";

import { useCallback, useEffect, useState } from "react";

export interface SearchHistoryItem {
  id: string;
  handles: string[];
  filters: {
    minIvs?: number;
    minFollowers?: number;
    excludeKeywords?: string;
  };
  result_count: number;
  last_used_at: string;
}

interface Props {
  onPick: (item: SearchHistoryItem) => void;
  /** trigger re-fetch when this value changes (e.g. after a new search succeeds) */
  reloadKey?: number;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "방금 전";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  const mo = Math.floor(d / 30);
  return `${mo}달 전`;
}

export default function SearchHistory({ onPick, reloadKey = 0 }: Props) {
  const [items, setItems] = useState<SearchHistoryItem[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/insta-planner/searches", {
        cache: "no-store",
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { searches: SearchHistoryItem[] };
      setItems(data.searches ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  async function deleteOne(id: string) {
    setItems((prev) => prev?.filter((it) => it.id !== id) ?? null);
    await fetch("/api/tools/insta-planner/searches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }
  async function deleteAll() {
    if (!confirm("최근 검색 기록을 모두 지울까요?")) return;
    setItems([]);
    await fetch("/api/tools/insta-planner/searches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  if (items === null) {
    return (
      <div className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
        <div className="text-xs text-mute">최근 검색 불러오는 중...</div>
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-bold text-sub hover:text-ink"
        >
          <span>🕘 최근 검색 {items.length}개</span>
          <span className="text-mute">{collapsed ? "▸" : "▾"}</span>
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={deleteAll}
            className="text-[11px] text-mute hover:text-danger"
          >
            전체 삭제
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {items.map((item) => (
            <HistoryChip
              key={item.id}
              item={item}
              onPick={() => onPick(item)}
              onDelete={() => deleteOne(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryChip({
  item,
  onPick,
  onDelete,
}: {
  item: SearchHistoryItem;
  onPick: () => void;
  onDelete: () => void;
}) {
  const clean = item.handles.map((h) => h.replace(/^@/, "")).filter(Boolean);
  if (clean.length === 0) return null;
  const first = clean[0];
  const extra = clean.length - 1;
  const label = extra > 0 ? `@${first} +${extra}` : `@${first}`;
  const tooltip = clean.map((h) => `@${h}`).join(", ");

  return (
    <div
      className="shrink-0 group flex items-center gap-1 rounded-full border border-line bg-chip pl-3 pr-1 py-1 hover:border-brand hover:bg-brandSoft/30 transition"
      title={tooltip}
    >
      <button
        type="button"
        onClick={onPick}
        className="flex items-center gap-2 text-xs font-semibold text-ink"
      >
        <span>{label}</span>
        <span className="text-[10px] font-normal text-mute">
          · {relativeTime(item.last_used_at)}
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="삭제"
        className="ml-0.5 w-5 h-5 rounded-full text-mute hover:text-danger hover:bg-dangerSoft/60 flex items-center justify-center text-[14px] leading-none"
      >
        ×
      </button>
    </div>
  );
}
