"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import PairingPanel from "./PairingPanel";
import JobList from "./JobList";
import UpdateBanner from "./UpdateBanner";
import type { CapcutDevice, CapcutJob } from "@/lib/tools/capcut-helper/types";

export default function HelperPanel() {
  const [devices, setDevices] = useState<CapcutDevice[]>([]);
  const [jobs, setJobs] = useState<CapcutJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [dRes, jRes] = await Promise.all([
        fetch("/api/tools/capcut-helper/devices", { cache: "no-store" }),
        fetch("/api/tools/capcut-helper/list-jobs", { cache: "no-store" }),
      ]);
      if (!dRes.ok) throw new Error((await dRes.json()).error ?? "devices 조회 실패");
      if (!jRes.ok) throw new Error((await jRes.json()).error ?? "jobs 조회 실패");
      const dData = (await dRes.json()) as { devices: CapcutDevice[] };
      const jData = (await jRes.json()) as { jobs: CapcutJob[] };
      setDevices(dData.devices);
      setJobs(jData.jobs);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  if (loading) {
    return (
      <div className="rounded-xl2 border border-line bg-surface p-8 text-center text-sub">
        Helper 상태 조회 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {err && (
        <ErrorWithHint
          message={err}
          toolSlug="capcut-helper"
          route="/api/tools/capcut-helper/devices"
          onDismiss={() => setErr(null)}
        />
      )}

      {devices.length === 0 ? (
        <PairingPanel onPaired={refresh} />
      ) : (
        <>
          <UpdateBanner device={devices[0]} />
          <PairedHeader devices={devices} onChanged={refresh} />
          <JobList jobs={jobs} onChanged={refresh} />
        </>
      )}
    </div>
  );
}

function PairedHeader({
  devices,
  onChanged,
}: {
  devices: CapcutDevice[];
  onChanged: () => void;
}) {
  const d = devices[0];
  const lastSeen = d.last_seen_at ? new Date(d.last_seen_at) : null;
  const aliveMs = lastSeen ? Date.now() - lastSeen.getTime() : Infinity;
  const isOnline = aliveMs < 30_000;

  async function unpair() {
    if (!confirm("이 Helper와 페어링을 해제할까요?")) return;
    await fetch("/api/tools/capcut-helper/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: d.id }),
    });
    onChanged();
  }

  return (
    <div className="rounded-xl2 border border-success/30 bg-success/5 p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isOnline ? "bg-success animate-pulse" : "bg-mute"
          }`}
        />
        <div>
          <p className="text-sm font-bold text-ink">
            {isOnline ? "✅ Helper 연결됨" : "⏸️ Helper 오프라인"}
          </p>
          <p className="text-[11px] text-sub">
            {d.device_name || `${d.platform} device`} ·{" "}
            {lastSeen ? `마지막 응답 ${formatAgo(lastSeen)}` : "응답 없음"}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={unpair}
          className="text-[11px] text-mute hover:text-danger px-3 py-1.5 rounded-lg hover:bg-chip"
        >
          페어링 해제
        </button>
      </div>
    </div>
  );
}

function formatAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  return `${h}시간 전`;
}
