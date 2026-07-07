"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  type Tool,
} from "@/lib/tools/registry";

type ToolWithVideoId = Tool & { _videoId: string | null };

export default function GuidesGrid({
  groupedFree,
  groupedPremium,
  isPremium,
}: {
  groupedFree: Record<string, Tool[]>;
  groupedPremium: Record<string, Tool[]>;
  isPremium: boolean;
}) {
  const [activeTool, setActiveTool] = useState<ToolWithVideoId | null>(null);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!activeTool) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTool(null);
    };
    window.addEventListener("keydown", onKey);
    // WHY: 모달 열려있는 동안 body 스크롤 잠금
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [activeTool]);

  return (
    <>
      <CategorySection
        grouped={groupedFree}
        variant="free"
        onOpen={setActiveTool}
      />

      <div className="mt-14 sm:mt-16 mb-8 sm:mb-10 relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex items-center justify-center">
          <span className="bg-bg px-5 inline-flex items-center gap-2.5">
            <span className="text-2xl">⭐</span>
            <span className="text-lg sm:text-xl font-bold text-premium tracking-tight">
              회원전용
            </span>
            {isPremium ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-premiumSoft text-premium">
                MY ACCESS
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-chip text-mute">
                LOCKED
              </span>
            )}
          </span>
        </div>
      </div>

      <CategorySection
        grouped={groupedPremium}
        variant="premium"
        locked={!isPremium}
        onOpen={setActiveTool}
      />

      {activeTool && (
        <VideoModal tool={activeTool} onClose={() => setActiveTool(null)} />
      )}
    </>
  );
}

function CategorySection({
  grouped,
  variant,
  locked = false,
  onOpen,
}: {
  grouped: Record<string, Tool[]>;
  variant: "free" | "premium";
  locked?: boolean;
  onOpen: (tool: ToolWithVideoId) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
      {CATEGORY_ORDER.map((category, idx) => {
        const tools = grouped[category] ?? [];
        const meta = CATEGORY_META[category];
        const isPremiumCol = variant === "premium";
        return (
          <div
            key={`${variant}-${category}`}
            className={`flex flex-col rounded-xl3 border p-5 sm:p-6 shadow-card ${
              isPremiumCol
                ? "border-premium/30 bg-premiumSoft/40"
                : "border-line bg-surface"
            }`}
          >
            <div className="mb-5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-3xl sm:text-[32px] leading-none">
                  {meta.emoji}
                </span>
                <h2 className="text-xl sm:text-[22px] font-bold text-ink tracking-tight">
                  {category}
                </h2>
                <span
                  className={`ml-auto text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md ${
                    isPremiumCol
                      ? "text-premium bg-premiumSoft"
                      : "text-mute bg-chip"
                  }`}
                >
                  STEP {idx + 1}
                </span>
              </div>
              <p className="text-sm sm:text-[15px] text-mute leading-relaxed">
                {meta.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {tools.length === 0 ? (
                <EmptyCategory premium={isPremiumCol} />
              ) : (
                tools.map((tool) => (
                  <GuideCard
                    key={tool.slug}
                    tool={tool}
                    locked={locked && Boolean(tool.membersOnly)}
                    onOpen={onOpen}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GuideCard({
  tool,
  locked,
  onOpen,
}: {
  tool: Tool;
  locked: boolean;
  onOpen: (tool: ToolWithVideoId) => void;
}) {
  const videoId = tool.guideVideoUrl ? extractYouTubeId(tool.guideVideoUrl) : null;
  const hasVideo = Boolean(videoId) && !locked;
  const isPremium = Boolean(tool.membersOnly);

  return (
    <div
      className={`relative rounded-xl2 shadow-card border overflow-hidden flex flex-col bg-surface transition ${
        isPremium ? "border-premium/30" : "border-line"
      } ${
        hasVideo
          ? isPremium
            ? "hover:shadow-pop hover:-translate-y-0.5 hover:border-premium cursor-pointer"
            : "hover:shadow-pop hover:-translate-y-0.5 hover:border-lineStrong cursor-pointer"
          : "opacity-70"
      }`}
      onClick={() => hasVideo && videoId && onOpen({ ...tool, _videoId: videoId })}
      role={hasVideo ? "button" : undefined}
      tabIndex={hasVideo ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasVideo && videoId && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen({ ...tool, _videoId: videoId });
        }
      }}
    >
      {/* 썸네일 영역 */}
      <div
        className={`relative aspect-video ${
          hasVideo ? "bg-black" : `${tool.color}`
        } flex items-center justify-center`}
      >
        {hasVideo && videoId ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition" />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 shadow-pop flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 sm:w-7 sm:h-7 text-danger ml-1"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl sm:text-5xl">{tool.emoji}</span>
            <span className="text-[11px] font-bold text-mute bg-white/70 px-2 py-0.5 rounded-md">
              {locked ? "🔒 회원전용" : "🎬 준비중"}
            </span>
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base sm:text-lg">{tool.emoji}</span>
          <h3 className="text-base sm:text-[17px] font-bold text-ink tracking-tight leading-snug">
            {tool.name}
          </h3>
        </div>
        <p className="text-[13px] sm:text-sm text-sub leading-relaxed line-clamp-2 font-medium mb-3">
          {tool.description}
        </p>

        <div className="mt-auto flex items-center gap-1.5 flex-wrap">
          {isPremium && (
            <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-premiumSoft text-premium">
              {locked ? "🔒 회원전용" : "⭐ 회원전용"}
            </span>
          )}
          {hasVideo ? (
            <span
              className={`ml-auto text-sm font-bold ${
                isPremium ? "text-premium" : "text-brand"
              }`}
            >
              영상 보기 →
            </span>
          ) : (
            <span className="ml-auto text-[12px] font-bold text-mute">
              곧 업로드 예정
            </span>
          )}
        </div>

        {hasVideo && (
          <Link
            href={tool.href}
            target={tool.external ? "_blank" : undefined}
            rel={tool.external ? "noopener noreferrer" : undefined}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[13px] font-bold text-sub hover:bg-chip hover:text-ink transition"
          >
            도구 바로가기
            <span className="text-mute">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function VideoModal({
  tool,
  onClose,
}: {
  tool: ToolWithVideoId;
  onClose: () => void;
}) {
  const videoId = tool._videoId;
  if (!videoId) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${tool.name} 이용방법`}
    >
      <div
        className="relative w-full max-w-4xl bg-surface rounded-xl3 shadow-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl">{tool.emoji}</span>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight truncate">
                {tool.name} · 이용방법
              </h3>
              <p className="text-[12px] sm:text-sm text-mute truncate">
                {tool.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 w-9 h-9 rounded-lg hover:bg-chip flex items-center justify-center text-mute hover:text-ink transition"
            aria-label="닫기"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={`${tool.name} 이용방법`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-line flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-bold text-sub hover:bg-chip transition"
          >
            닫기
          </button>
          <Link
            href={tool.href}
            target={tool.external ? "_blank" : undefined}
            rel={tool.external ? "noopener noreferrer" : undefined}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold text-white transition ${
              tool.membersOnly
                ? "bg-premium hover:bg-premium/90"
                : "bg-brand hover:bg-brand/90"
            }`}
          >
            도구 바로가기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyCategory({ premium = false }: { premium?: boolean }) {
  return (
    <div
      className={`flex-1 rounded-xl2 border-2 border-dashed p-6 flex items-center justify-center min-h-[180px] ${
        premium ? "border-premium/30" : "border-line"
      }`}
    >
      <p className="text-sm font-medium text-mute text-center">
        곧 도구가 추가됩니다
      </p>
    </div>
  );
}

// WHY: youtu.be, youtube.com/watch, /shorts, /embed 다양한 포맷 지원
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "shorts" || p === "embed" || p === "live");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}
