"use client";

import { useWizard } from "./WizardContext";
import type { ReelResult } from "@/lib/tools/insta-planner/types";

export default function Step2ReelSelect() {
  const { reels, selectedReel, setSelectedReel, goToStep } = useWizard();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">
            인기 콘텐츠 {reels.length}개
          </h2>
          <p className="text-sm text-sub mt-0.5">
            영감 채널의 콘텐츠를 IVS(조회/팔로워) 순으로 정렬했어요. 1개 선택하세요.
          </p>
        </div>
        <button
          onClick={() => goToStep(1)}
          className="text-sm font-semibold text-sub hover:text-ink"
        >
          ← 채널 다시 입력
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reels.map((r) => (
          <ReelCard
            key={r.shortcode}
            reel={r}
            selected={selectedReel?.shortcode === r.shortcode}
            onClick={() => setSelectedReel(r)}
          />
        ))}
      </div>

      {selectedReel && (
        <div className="mt-6 sticky bottom-4 flex justify-center">
          <button
            onClick={() => goToStep(3)}
            className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white hover:bg-brandHover shadow-lg"
          >
            이 콘텐츠로 분석 시작 →
          </button>
        </div>
      )}
    </div>
  );
}

function ReelCard({
  reel,
  selected,
  onClick,
}: {
  reel: ReelResult;
  selected: boolean;
  onClick: () => void;
}) {
  const typeEmoji =
    reel.type === "reel" ? "📹" : reel.type === "carousel" ? "🖼️" : "📷";
  const typeLabel =
    reel.type === "reel" ? "릴스" : reel.type === "carousel" ? "캐러셀" : "피드";
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl2 border bg-surface overflow-hidden transition hover:shadow-pop hover:-translate-y-0.5 ${
        selected ? "border-brand ring-2 ring-brand/20" : "border-line"
      }`}
    >
      {/* 썸네일 (Instagram CDN은 hotlink 차단 → image-proxy 거침) */}
      <div className="aspect-square bg-chip relative overflow-hidden">
        {reel.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/image-proxy?url=${encodeURIComponent(reel.thumbnail)}`}
            alt={reel.caption.slice(0, 50)}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-mute">
            no image
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-black/70 text-white rounded font-bold">
          {typeEmoji} {typeLabel}
        </span>
        <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-brand text-white rounded font-bold">
          IVS {reel.ivs}배
        </span>
      </div>

      <div className="p-3">
        <p className="text-[11px] font-bold text-sub mb-1 truncate">
          @{reel.ownerUsername}
          <span className="text-mute font-normal">
            {" · "}팔로워 {formatCount(reel.ownerFollowers)}
          </span>
        </p>
        <p className="text-[12px] text-ink line-clamp-2 leading-snug mb-2">
          {reel.caption || "(캡션 없음)"}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-mute">
          {reel.viewCount > 0 && (
            <span>👁️ {formatCount(reel.viewCount)}</span>
          )}
          <span>❤️ {formatCount(reel.likeCount)}</span>
          <span>💬 {formatCount(reel.commentCount)}</span>
          <span className="ml-auto text-[10px] text-success font-semibold">
            {reel.engagementRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
