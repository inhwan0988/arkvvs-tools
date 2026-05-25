"use client";

import type { VideoResult } from "@/lib/tools/vvs-planner/types";

/**
 * Step 3 상단에 선택한 영상의 썸네일 + 제목을 표시.
 * AI 추천 주제와 비교하면서 사용자가 판단 가능.
 */
export default function SelectedVideoBanner({
  video,
}: {
  video: VideoResult;
}) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 mb-4 shadow-card">
      <div className="flex gap-4 items-start">
        {/* 썸네일 */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 block w-40 sm:w-48 aspect-video rounded-lg overflow-hidden bg-chip hover:opacity-90 transition relative group"
        >
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-mute text-xs">
              썸네일 없음
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
            <span className="text-white text-xs font-bold">▶ YouTube에서 열기</span>
          </div>
        </a>

        {/* 메타 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-mute uppercase tracking-wider">
              분석 중인 원본 영상
            </span>
          </div>
          <h3 className="text-[15px] font-bold text-ink leading-snug mb-2 line-clamp-2">
            {video.title}
          </h3>
          <p className="text-[12px] text-sub mb-2">{video.channelTitle}</p>

          {/* 지표 */}
          <div className="flex items-center gap-3 text-[11px] text-sub flex-wrap">
            <span>
              👁️ <b className="text-ink">{video.viewCount.toLocaleString()}</b>회
            </span>
            <span>
              👥 구독자 <b className="text-ink">{video.subscriberCount.toLocaleString()}</b>명
            </span>
            {video.vvs > 0 && (
              <span className="px-1.5 py-0.5 bg-brand/15 text-brand rounded font-bold">
                VVS {video.vvs.toFixed(1)}배
              </span>
            )}
            {video.engagementRate > 0 && (
              <span className="text-success font-semibold">
                참여율 {video.engagementRate.toFixed(2)}%
              </span>
            )}
          </div>

          {/* 원본 보기 */}
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
          >
            YouTube에서 영상 보기 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
