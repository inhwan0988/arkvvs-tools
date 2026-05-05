"use client";

import { useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import { formatNumber, formatVVS } from "@/lib/tools/vvs-planner/utils";

export default function Step2VideoSelect() {
  const { selectedVideo, goToStep } = useWizard();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!selectedVideo) goToStep(1);
  }, [selectedVideo, goToStep]);

  // 다른 영상으로 바뀌면 다시 썸네일 상태로
  useEffect(() => {
    setIsPlaying(false);
  }, [selectedVideo?.videoId]);

  if (!selectedVideo) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-lg font-bold text-ink">선택한 목표 영상</h2>

      <div className="overflow-hidden rounded-xl2 border border-brand/30 bg-surface shadow-card">
        <div className="relative aspect-video overflow-hidden bg-black">
          {isPlaying ? (
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0`}
              title={selectedVideo.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
              className="group relative h-full w-full"
              aria-label="재생"
            >
              {selectedVideo.thumbnail && (
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-24 items-center justify-center rounded-2xl bg-danger/90 shadow-pop transition-transform group-hover:scale-110">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="white"
                    aria-hidden
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-ink">{selectedVideo.title}</h3>
          <p className="mt-1 text-sm text-sub">{selectedVideo.channelTitle}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-bg p-3">
            <Stat label="조회수" value={formatNumber(selectedVideo.viewCount)} />
            <Stat
              label="구독자"
              value={formatNumber(selectedVideo.subscriberCount)}
            />
            <Stat label="VVS" value={formatVVS(selectedVideo.vvs)} accent />
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => goToStep(1)}
          className="flex-1 rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-ink transition-colors hover:bg-chip"
        >
          다른 영상 선택
        </button>
        <button
          onClick={() => goToStep(3)}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brandHover"
        >
          이 영상으로 진행
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-mute">{label}</div>
      <div
        className={`mt-1 text-sm font-bold ${accent ? "text-brand" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}
