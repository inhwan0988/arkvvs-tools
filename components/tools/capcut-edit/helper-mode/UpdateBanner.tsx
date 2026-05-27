"use client";

import { useEffect, useState } from "react";
import type { CapcutDevice } from "@/lib/tools/capcut-helper/types";

type LatestRelease = {
  version: string;
  releaseUrl: string;
  publishedAt: string;
  downloads: {
    macArm64: { url: string; size: number } | null;
    macIntel: { url: string; size: number } | null;
  };
};

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export default function UpdateBanner({ device }: { device: CapcutDevice }) {
  const [latest, setLatest] = useState<LatestRelease | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tools/capcut-helper/latest-version")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.version) setLatest(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest) return null;

  // device가 아직 version 보고 안 했으면 (helper_version null) 일단 알림 표시
  const installed = device.helper_version || "0.1.0";
  const needsUpdate = compareVersions(installed, latest.version) < 0;
  if (!needsUpdate) return null;

  const arm = latest.downloads.macArm64;
  const intel = latest.downloads.macIntel;

  function formatSize(n?: number) {
    if (!n) return "";
    return ` (${Math.round(n / 1024 / 1024)}MB)`;
  }

  return (
    <div className="rounded-xl2 border-2 border-warn/40 bg-warn/10 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl">🆕</span>
          <div>
            <p className="text-sm font-bold text-ink">
              Helper 새 버전 v{latest.version}이 있어요
            </p>
            <p className="text-[12px] text-sub mt-0.5">
              현재 설치: v{installed} ·{" "}
              <a
                href={latest.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                변경사항 보기 ↗
              </a>
            </p>
            <p className="text-[11px] text-mute mt-1.5 leading-relaxed">
              💡 설치 방법: ① dmg 받기 → ② Helper 종료 → ③ 응용 프로그램으로 드래그 ("교체") → ④ 다시 열기.
              페어링은 그대로 유지됩니다.
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap shrink-0">
          {arm && (
            <a
              href={arm.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] rounded-lg bg-warn text-white font-bold px-3 py-1.5 hover:bg-warn/80 transition"
            >
              🍎 M1/M2/M3{formatSize(arm.size)}
            </a>
          )}
          {intel && (
            <a
              href={intel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] rounded-lg bg-chip text-ink font-bold px-3 py-1.5 hover:bg-line transition"
            >
              🖥️ Intel{formatSize(intel.size)}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
