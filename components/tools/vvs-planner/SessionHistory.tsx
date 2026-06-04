"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionHistoryItem {
  id: string;
  title: string | null;
  keyword: string | null;
  selected_video_title: string | null;
  selected_video_thumbnail: string | null;
  selected_video_channel: string | null;
  status: "in_progress" | "complete" | "abandoned";
  step_progress: number;
  updated_at: string;
  created_at: string;
}

interface Props {
  onPick: (id: string) => void;
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

const STEP_LABELS: Record<number, string> = {
  1: "키워드 검색",
  2: "영상 선택",
  3: "주제 선택",
  4: "원고 생성",
};

export default function SessionHistory({ onPick, reloadKey = 0 }: Props) {
  const [items, setItems] = useState<SessionHistoryItem[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/vvs-planner/sessions", {
        cache: "no-store",
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { sessions: SessionHistoryItem[] };
      setItems((data.sessions ?? []).slice(0, 10));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  async function deleteOne(id: string) {
    setItems((prev) => prev?.filter((it) => it.id !== id) ?? null);
    await fetch(`/api/tools/vvs-planner/sessions/${id}`, { method: "DELETE" });
  }

  if (items === null) {
    return (
      <div className="mb-4 rounded-xl2 border border-line bg-surface p-4 shadow-card">
        <div className="text-xs text-mute">이전 작업 불러오는 중...</div>
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl2 border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-bold text-sub hover:text-ink"
        >
          <span>🕘 이전 작업 {items.length}개</span>
          <span className="text-mute">{collapsed ? "▸" : "▾"}</span>
        </button>
        <span className="text-[10px] text-mute">
          클릭하면 이어서 작업할 수 있어요
        </span>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item) => (
            <SessionCard
              key={item.id}
              item={item}
              onPick={() => onPick(item.id)}
              onDelete={() => deleteOne(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  item,
  onPick,
  onDelete,
}: {
  item: SessionHistoryItem;
  onPick: () => void;
  onDelete: () => void;
}) {
  const label =
    item.title || item.selected_video_title || item.keyword || "(제목 없음)";
  const stepLabel = STEP_LABELS[item.step_progress] || `${item.step_progress}단계`;
  const isComplete = item.status === "complete";

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-line bg-bg p-2.5 hover:border-brand transition-colors">
      {item.selected_video_thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.selected_video_thumbnail}
          alt=""
          className="h-14 w-20 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="h-14 w-20 shrink-0 rounded-md bg-chip flex items-center justify-center text-[10px] text-mute">
          {item.keyword ? `#${item.keyword.slice(0, 4)}` : "—"}
        </div>
      )}
      <button
        type="button"
        onClick={onPick}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-xs font-bold text-ink truncate">{label}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-mute">
          <span
            className={
              isComplete
                ? "px-1 py-0.5 rounded bg-success/15 text-success font-bold"
                : "px-1 py-0.5 rounded bg-brandSoft text-brand font-bold"
            }
          >
            {isComplete ? "완료" : stepLabel}
          </span>
          <span>·</span>
          <span>{relativeTime(item.updated_at)}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="삭제"
        className="shrink-0 w-5 h-5 rounded-full text-mute hover:text-danger hover:bg-dangerSoft/60 flex items-center justify-center text-[14px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}
