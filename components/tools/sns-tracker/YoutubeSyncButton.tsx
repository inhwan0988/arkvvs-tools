"use client";

import { useState } from "react";

export default function YoutubeSyncButton({
  onSynced,
}: {
  onSynced: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tools/sns-tracker/sync-youtube", {
        method: "POST",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "sync 실패");
      setMsg(
        d.synced === 0
          ? "YouTube 콘텐츠가 없거나 모두 sync 완료."
          : `✓ ${d.synced}/${d.total}개 YouTube 콘텐츠 sync 완료`,
      );
      onSynced();
      setTimeout(() => setMsg(null), 4000);
    } catch (e) {
      setMsg(e instanceof Error ? `❌ ${e.message}` : "❌ 오류");
      setTimeout(() => setMsg(null), 6000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className="text-[11px] text-sub font-semibold">{msg}</span>
      )}
      <button
        onClick={sync}
        disabled={loading}
        className="text-[12px] rounded-lg bg-chip hover:bg-line px-3 py-1.5 font-bold text-ink disabled:opacity-50 transition"
        title="등록된 YouTube 콘텐츠의 조회수를 YouTube Data API로 일괄 업데이트"
      >
        {loading ? "sync 중..." : "📺 YouTube 조회수 sync"}
      </button>
    </div>
  );
}
