"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  keyword: string;
  filters: Record<string, unknown> | null;
  result_count: number;
  cached: boolean;
  created_at: string;
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "방금 전";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

/**
 * 최근 검색어 칩. 클릭 시 부모에게 keyword 전달 → 자동 재검색.
 * SessionHistory와 다른 점: 검색 이벤트 단위로 append-only. 위저드 진행과 무관.
 */
export default function RecentSearches({
  onPick,
  reloadKey = 0,
}: {
  onPick: (keyword: string) => void;
  reloadKey?: number;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/vvs-planner/search-history", {
        cache: "no-store",
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { history: Item[] };
      setItems(data.history ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const deleteOne = async (id: string) => {
    setItems((prev) => prev?.filter((it) => it.id !== id) ?? null);
    await fetch(`/api/tools/vvs-planner/search-history?id=${id}`, {
      method: "DELETE",
    });
  };

  const clearAll = async () => {
    if (!confirm("최근 검색어 전체를 삭제할까요?")) return;
    setItems([]);
    await fetch("/api/tools/vvs-planner/search-history", { method: "DELETE" });
  };

  if (items === null) return null; // 로딩 중엔 조용히
  if (items.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl2 border border-line bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-bold text-sub hover:text-ink"
        >
          <span>🔎 최근 검색어 {items.length}개</span>
          <span className="text-mute">{collapsed ? "▸" : "▾"}</span>
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-[10px] text-mute hover:text-danger"
        >
          전체 삭제
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="group inline-flex items-center gap-1 rounded-full border border-line bg-bg pl-3 pr-1 py-1 hover:border-brand hover:bg-brandSoft/40 transition-colors"
            >
              <button
                type="button"
                onClick={() => onPick(item.keyword)}
                className="text-xs font-semibold text-ink"
                title={`${relativeTime(item.created_at)} · 클릭하면 다시 검색`}
              >
                {item.keyword}
              </button>
              <button
                type="button"
                onClick={() => deleteOne(item.id)}
                aria-label={`${item.keyword} 삭제`}
                className="w-5 h-5 rounded-full text-mute hover:text-danger flex items-center justify-center text-[13px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
