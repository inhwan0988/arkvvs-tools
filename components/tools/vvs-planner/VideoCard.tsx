"use client";

import type { VideoResult } from "@/lib/tools/vvs-planner/types";
import { cn, formatNumber, formatVVS, vvsBadge } from "@/lib/tools/vvs-planner/utils";

export default function VideoCard({
  video,
  selected,
  onClick,
}: {
  video: VideoResult;
  selected?: boolean;
  onClick?: () => void;
}) {
  const badge = vvsBadge(video.vvs);
  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-xl2 border bg-surface transition-all hover:shadow-pop hover:-translate-y-0.5",
        selected ? "border-brand ring-2 ring-brand/20" : "border-line",
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-chip">
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        )}
        <div
          className={cn(
            "absolute right-2 top-2 rounded-lg px-2 py-1 text-xs font-bold backdrop-blur-sm",
            badge.bg,
            badge.text,
          )}
        >
          VVS {formatVVS(video.vvs)}
        </div>
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {video.isShorts && (
            <div className="rounded-md bg-danger/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
              SHORTS
            </div>
          )}
          {!video.hasCaption && (
            <div
              className="rounded-md bg-mute/90 px-1.5 py-0.5 text-[10px] font-bold text-white"
              title="자막 없음 — 다음 단계에서 자막 추출 실패할 수 있습니다"
            >
              자막 ✗
            </div>
          )}
        </div>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-sub">{video.channelTitle}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-mute">
          <span>조회 {formatNumber(video.viewCount)}</span>
          <span>구독 {formatNumber(video.subscriberCount)}</span>
        </div>
      </div>
    </div>
  );
}
