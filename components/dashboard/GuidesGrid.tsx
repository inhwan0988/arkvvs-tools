"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  TOOLS,
  type Tool,
  type Category,
} from "@/lib/tools/registry";

type ToolWithVideoId = Tool & { _videoId: string };

export default function GuidesGrid({
  isPremium,
}: {
  isPremium: boolean;
}) {
  const [activeTool, setActiveTool] = useState<ToolWithVideoId | null>(null);

  // ESC / body scroll lock
  useEffect(() => {
    if (!activeTool) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTool(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [activeTool]);

  // videoId 있는 툴만 필터, 첫 번째는 히어로
  const withVideo = useMemo(() => {
    return TOOLS.map((t) => ({
      tool: t,
      videoId: t.guideVideoUrl ? extractYouTubeId(t.guideVideoUrl) : null,
    })).filter((x): x is { tool: Tool; videoId: string } => Boolean(x.videoId));
  }, []);

  const hero = withVideo[0] ?? null;
  const rest = withVideo.slice(1);

  // 카테고리별 그룹화 (히어로 제외, 나머지 영상 없는 툴 포함해서 "준비중" 표시)
  const grouped = useMemo(() => {
    const map = {} as Record<Category, { tool: Tool; videoId: string | null }[]>;
    for (const c of CATEGORY_ORDER) map[c] = [];
    for (const tool of TOOLS) {
      if (hero && tool.slug === hero.tool.slug) continue;
      const videoId = tool.guideVideoUrl ? extractYouTubeId(tool.guideVideoUrl) : null;
      map[tool.category].push({ tool, videoId });
    }
    return map;
  }, [hero]);

  const openTool = (tool: Tool, videoId: string) => {
    setActiveTool({ ...tool, _videoId: videoId });
  };

  return (
    <>
      {/* ━━━━━ 히어로 ━━━━━ */}
      {hero && (
        <HeroBanner
          tool={hero.tool}
          videoId={hero.videoId}
          onPlay={() => openTool(hero.tool, hero.videoId)}
        />
      )}

      {/* ━━━━━ 카테고리별 섹션 ━━━━━ */}
      <div className="mt-12 sm:mt-16 space-y-12 sm:space-y-16">
        {CATEGORY_ORDER.map((category) => {
          const items = grouped[category];
          if (items.length === 0) return null;
          const meta = CATEGORY_META[category];

          return (
            <section key={category}>
              <div className="flex items-baseline gap-3 mb-5 sm:mb-6">
                <span className="text-2xl sm:text-3xl">{meta.emoji}</span>
                <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  {category}
                </h2>
                <span className="text-[13px] text-mute font-medium">
                  {meta.description}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {items.map(({ tool, videoId }) => (
                  <GuideCard
                    key={tool.slug}
                    tool={tool}
                    videoId={videoId}
                    locked={Boolean(tool.membersOnly) && !isPremium}
                    onPlay={openTool}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {activeTool && (
        <VideoModal tool={activeTool} onClose={() => setActiveTool(null)} />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────── */
/* Hero Banner — 다크 톤 큰 배너 */
/* ─────────────────────────────────────────────── */
function HeroBanner({
  tool,
  videoId,
  onPlay,
}: {
  tool: Tool;
  videoId: string;
  onPlay: () => void;
}) {
  return (
    <div className="relative rounded-xl3 overflow-hidden shadow-pop group cursor-pointer bg-ink" onClick={onPlay}>
      {/* 배경 썸네일 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-ink via-ink/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/40 to-transparent" />

      <div className="relative p-6 sm:p-10 lg:p-12 aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5] flex flex-col justify-end">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md bg-danger text-white shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            NEW
          </span>
          <span className="text-[11px] font-bold text-white/80 tracking-wider uppercase">
            추천 영상
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight max-w-2xl">
          {tool.emoji} {tool.name}
        </h2>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl line-clamp-2">
          {tool.description}
        </p>

        <div className="mt-5 sm:mt-6 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white text-ink text-sm sm:text-base font-bold hover:bg-white/90 shadow-lg transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-danger" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            영상 재생
          </button>
          <Link
            href={tool.href}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white/10 backdrop-blur text-white text-sm sm:text-base font-bold hover:bg-white/20 border border-white/20 transition"
          >
            도구 열기 →
          </Link>
        </div>
      </div>

      {/* 우측 상단 재생 아이콘 (큰 화면) */}
      <div className="hidden lg:flex absolute top-1/2 right-12 -translate-y-1/2 w-20 h-20 rounded-full bg-white/95 items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-danger ml-1" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* Guide Card — 큰 16:9 썸네일 */
/* ─────────────────────────────────────────────── */
function GuideCard({
  tool,
  videoId,
  locked,
  onPlay,
}: {
  tool: Tool;
  videoId: string | null;
  locked: boolean;
  onPlay: (tool: Tool, videoId: string) => void;
}) {
  const hasVideo = Boolean(videoId) && !locked;
  const isPremium = Boolean(tool.membersOnly);

  return (
    <div
      className={`group relative rounded-xl2 overflow-hidden bg-surface transition ${
        hasVideo ? "cursor-pointer hover:-translate-y-1" : "opacity-75"
      }`}
      onClick={() => hasVideo && videoId && onPlay(tool, videoId)}
      role={hasVideo ? "button" : undefined}
      tabIndex={hasVideo ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasVideo && videoId && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onPlay(tool, videoId);
        }
      }}
    >
      {/* 16:9 썸네일 (크게) */}
      <div className="relative aspect-video bg-ink overflow-hidden rounded-xl2">
        {videoId ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {/* 어둡게 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* 재생 아이콘 */}
            <div className={`absolute inset-0 flex items-center justify-center ${locked ? "opacity-30" : ""}`}>
              <div className="w-16 h-16 rounded-full bg-white/95 shadow-pop flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-danger ml-1" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {/* 잠금/회원전용 배지 (좌상단) */}
            {locked && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-black/70 text-white">
                🔒 회원전용
              </div>
            )}
            {!locked && isPremium && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-premium text-white">
                ⭐ 회원전용
              </div>
            )}
          </>
        ) : (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${tool.color}`}>
            <span className="text-5xl sm:text-6xl">{tool.emoji}</span>
            <span className="text-[12px] font-bold text-sub bg-white/80 px-3 py-1 rounded-md">
              🎬 준비중
            </span>
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="pt-4 px-1">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl leading-none shrink-0 mt-0.5">
            {tool.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] sm:text-base font-bold text-ink tracking-tight leading-snug mb-1">
              {tool.name}
            </h3>
            <p className="text-[13px] text-sub leading-relaxed line-clamp-2 font-medium">
              {tool.description}
            </p>
          </div>
        </div>

        {hasVideo && videoId && (
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={tool.href}
              onClick={(e) => e.stopPropagation()}
              className="text-[12px] font-bold text-mute hover:text-ink transition"
            >
              도구 바로가기 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* Video Modal — 가로 큰 유튜브 임베드 */
/* ─────────────────────────────────────────────── */
function VideoModal({
  tool,
  onClose,
}: {
  tool: ToolWithVideoId;
  onClose: () => void;
}) {
  const videoId = tool._videoId;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${tool.name} 이용방법`}
    >
      <div
        className="relative w-full max-w-6xl bg-ink rounded-xl3 shadow-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 (모달 우상단 플로팅) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur flex items-center justify-center text-white transition"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={`${tool.name} 이용방법`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* 하단 정보 바 */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{tool.emoji}</span>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {tool.name}
              </h3>
            </div>
            <p className="text-[12px] sm:text-sm text-white/60 line-clamp-1">
              {tool.description}
            </p>
          </div>
          <Link
            href={tool.href}
            className={`shrink-0 px-4 sm:px-5 py-2.5 rounded-lg text-[13px] sm:text-sm font-bold text-white transition ${
              tool.membersOnly
                ? "bg-premium hover:bg-premiumHover"
                : "bg-brand hover:bg-brandHover"
            }`}
          >
            도구 열기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* YouTube URL parser */
/* ─────────────────────────────────────────────── */
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
