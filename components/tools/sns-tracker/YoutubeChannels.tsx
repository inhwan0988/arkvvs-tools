"use client";

import { useCallback, useEffect, useState } from "react";

interface YtChannel {
  id: string;
  channel_id: string;
  channel_handle: string | null;
  channel_title: string | null;
  uploads_playlist_id: string | null;
  last_synced_at: string | null;
  sync_enabled: boolean;
  default_destination_url: string | null;
  created_at: string;
}

export default function YoutubeChannels({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [channels, setChannels] = useState<YtChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [destination, setDestination] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/sns-tracker/yt-channels", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "조회 실패");
      const d = (await res.json()) as { channels: YtChannel[] };
      setChannels(d.channels);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addChannel() {
    if (!input.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/sns-tracker/yt-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: input.trim(),
          defaultDestinationUrl: destination.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "등록 실패");
      }
      setInput("");
      setDestination("");
      setShowForm(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setAdding(false);
    }
  }

  async function removeChannel(id: string) {
    if (!confirm("이 채널 자동 sync를 해제할까요? 기존 등록된 영상은 유지됩니다.")) return;
    await fetch("/api/tools/sns-tracker/yt-channels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  async function triggerSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/sns-tracker/sync-youtube", {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "sync 실패");
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return null;

  return (
    <div className="rounded-xl2 border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-ink">
            📺 YouTube 채널 자동 sync
          </h3>
          <p className="text-[11px] text-sub mt-0.5">
            채널 1번 등록하면 새 영상이 매일 자동으로 추가돼요 (UTC 08:00)
          </p>
        </div>
        <div className="flex gap-1.5">
          {channels.length > 0 && (
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="text-[11px] rounded-lg bg-chip hover:bg-line text-ink font-bold px-3 py-1.5 disabled:opacity-50"
            >
              {syncing ? "sync 중..." : "🔄 지금 조회수 갱신"}
            </button>
          )}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-[11px] rounded-lg bg-brand text-white font-bold px-3 py-1.5 hover:bg-brandHover"
          >
            {showForm ? "취소" : "+ 채널 등록"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-3 space-y-2 rounded-lg bg-chip/40 p-3">
          <div>
            <label className="text-[10px] font-bold text-mute uppercase tracking-wider block mb-1">
              채널 URL / @handle / UC...ID
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="@arkstudio 또는 https://youtube.com/@arkstudio"
              className="w-full bg-white rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-mute uppercase tracking-wider block mb-1">
              기본 목적지 URL (옵션) — 새 영상의 단축 URL이 이리로 보냄
            </label>
            <input
              type="url"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="https://your-site.com/landing (비우면 YouTube 원본으로)"
              className="w-full bg-white rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <button
            onClick={addChannel}
            disabled={adding || !input.trim()}
            className="w-full rounded-lg bg-brand text-white py-2 text-sm font-bold hover:bg-brandHover disabled:opacity-50"
          >
            {adding ? "확인 중..." : "이 채널 자동 sync 켜기"}
          </button>
        </div>
      )}

      {channels.length === 0 ? (
        !showForm && (
          <div className="mt-3 text-center text-[12px] text-mute py-4">
            아직 등록된 채널이 없어요. 위 "+ 채널 등록"으로 시작하세요.
          </div>
        )
      ) : (
        <div className="mt-3 space-y-1.5">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center justify-between rounded-lg bg-chip/40 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate">
                  📺 {ch.channel_title || ch.channel_handle || ch.channel_id}
                </p>
                <p className="text-[11px] text-mute truncate">
                  {ch.channel_handle ?? ch.channel_id}
                  {ch.last_synced_at &&
                    ` · 마지막 sync ${new Date(ch.last_synced_at).toLocaleString("ko-KR")}`}
                </p>
              </div>
              <button
                onClick={() => removeChannel(ch.id)}
                className="text-[11px] text-mute hover:text-danger px-2"
              >
                해제
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-danger font-semibold mt-2">⚠️ {error}</p>
      )}
    </div>
  );
}
