"use client";

import { useEffect, useRef, useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import { useWizard } from "./WizardContext";
import VideoCard from "./VideoCard";
import SessionHistory from "./SessionHistory";
import RecentSearches from "./RecentSearches";
import type { VideoResult } from "@/lib/tools/vvs-planner/types";

/**
 * Step 1 — 첫 화면.
 * 심플화: 필터/레퍼런스 UI 제거. 검색어 없으면 이번주 인기 영상 자동 로드.
 * 필터는 내부 default (period=1w, sortBy=score) 사용.
 */
export default function Step1KeywordSearch() {
  const {
    keyword,
    setKeyword,
    filters,
    videos,
    setVideos,
    setSelectedVideo,
    isLoading,
    setLoading,
    error,
    setError,
    goToStep,
    youtubeApiKey,
    loadSessionData,
  } = useWizard();

  const [input, setInput] = useState(keyword);
  const [wasCached, setWasCached] = useState(false);
  const [historyReload, setHistoryReload] = useState(0);
  const [mode, setMode] = useState<"trending" | "personalized" | "search">(
    keyword ? "search" : "trending",
  );
  const [personalKeywords, setPersonalKeywords] = useState<string[]>([]);
  const trendingFetched = useRef(false);

  // 첫 진입 시:
  //  - 최근 검색어 여러 개 있으면 각 키워드로 이번주 롱폼 병렬 검색 → 병합 스코어 순
  //  - 없으면 KR mostPopular 롱폼 폴백
  useEffect(() => {
    if (trendingFetched.current) return;
    if (videos.length > 0) return;
    if (keyword) return;
    trendingFetched.current = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) 최근 검색어 조회 (최대 3개)
        let topKeywords: string[] = [];
        try {
          const hRes = await fetch("/api/tools/vvs-planner/search-history", {
            cache: "no-store",
          });
          if (hRes.ok) {
            const hData = (await hRes.json()) as {
              history: { keyword: string }[];
            };
            topKeywords = (hData.history ?? [])
              .map((h) => h.keyword?.trim())
              .filter((k): k is string => !!k)
              .slice(0, 3);
          }
        } catch {
          /* ignore */
        }

        if (topKeywords.length > 0) {
          // 2a) 개인화: 각 키워드로 이번주 롱폼 병렬 검색 → 병합
          const searchOne = (kw: string) =>
            fetch("/api/tools/vvs-planner/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                keyword: kw,
                period: "1w",
                videoFormat: "long",
                sortBy: "score",
                channelSize: "all",
                minViews: 0,
                minVvs: 0,
                minEngagementRate: 0,
                durationRange: "any",
                captionsOnly: false,
                excludeKeywords: "",
                maxResults: 20,
                deepSearch: false,
                bypassCache: false,
              }),
            }).then(async (r) => {
              if (!r.ok) return { videos: [] as VideoResult[], cached: false };
              return (await r.json()) as {
                videos: VideoResult[];
                cached?: boolean;
              };
            });

          const results = await Promise.all(topKeywords.map(searchOne));
          const dedup = new Map<string, VideoResult>();
          for (const r of results) {
            for (const v of r.videos ?? []) {
              const prev = dedup.get(v.videoId);
              // 중복 시 score 높은 것 유지
              if (!prev || v.score > prev.score) dedup.set(v.videoId, v);
            }
          }
          const merged = [...dedup.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, 30);
          const allCached = results.every((r) => r.cached);

          setVideos(merged);
          setWasCached(allCached);
          setPersonalKeywords(topKeywords);
          setMode("personalized");
        } else {
          // 2b) 폴백: KR mostPopular 롱폼
          const res = await fetch("/api/tools/vvs-planner/trending", {
            cache: "no-store",
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error ?? "인기 영상을 불러오지 못했습니다.");
          }
          const data = (await res.json()) as { videos: VideoResult[] };
          setVideos(data.videos);
          setMode("trending");
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "인기 영상을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    setLoading(true);
    setError(null);
    setMode("search");
    try {
      const res = await fetch("/api/tools/vvs-planner/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: trimmed,
          youtubeApiKey,
          period: filters.period,
          minViews: filters.minViews,
          channelSize: filters.channelSize,
          videoFormat: filters.videoFormat,
          deepSearch: filters.deepSearch,
          minVvs: filters.minVvs,
          minEngagementRate: filters.minEngagementRate,
          durationRange: filters.durationRange,
          captionsOnly: filters.captionsOnly,
          excludeKeywords: filters.excludeKeywords,
          sortBy: filters.sortBy,
          maxResults: filters.maxResults,
          bypassCache: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "검색 중 오류가 발생했습니다.");
      }
      const data = await res.json();
      setVideos(data.videos as VideoResult[]);
      setWasCached(Boolean(data.cached));
      setHistoryReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (v: VideoResult) => {
    setSelectedVideo(v);
    goToStep(2);
  };

  const pickSession = async (id: string) => {
    try {
      const res = await fetch(`/api/tools/vvs-planner/sessions/${id}`);
      if (!res.ok) throw new Error("세션을 불러올 수 없습니다.");
      const data = await res.json();
      const s = data.session as Record<string, unknown>;
      const stepProgress = (s.step_progress as number) || 1;
      const restored = {
        sessionId: s.id as string,
        step: Math.max(1, Math.min(4, stepProgress)) as 1 | 2 | 3 | 4,
        keyword: (s.keyword as string) || "",
        selectedVideo: s.selected_video_id
          ? {
              videoId: s.selected_video_id as string,
              title: (s.selected_video_title as string) || "",
              channelId: "",
              channelTitle: (s.selected_video_channel as string) || "",
              thumbnail: (s.selected_video_thumbnail as string) || "",
              publishedAt: "",
              viewCount: 0,
              subscriberCount: 0,
              likeCount: 0,
              commentCount: 0,
              vvs: 0,
              engagementRate: 0,
              engagementMult: 1,
              recencyMult: 1,
              score: 0,
              durationSec: 0,
              isShorts: false,
              hasCaption: true,
            }
          : null,
        channelProfile: (s.channel_profile as never) ?? null,
        userIntent: (s.user_intent as never) ?? { freeText: "" },
        referenceVideoUrls: (s.reference_video_urls as string[]) ?? [],
        selectedTopic: (s.selected_topic as never) ?? null,
        interviewQuestions: (s.interview_questions as never) ?? [],
        interviewAnswers: (s.interview_answers as never) ?? {},
        script: (s.script_text as string) ?? "",
      };
      loadSessionData(restored);
    } catch (e) {
      setError(e instanceof Error ? e.message : "세션 복원 실패");
    }
  };

  return (
    <div>
      <SessionHistory onPick={pickSession} />
      <RecentSearches onPick={runSearch} reloadKey={historyReload} />

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(input)}
          placeholder="검색 키워드를 입력하세요 (예: 자기계발, 부동산 투자, 재개발)"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          onClick={() => runSearch(input)}
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brandHover disabled:opacity-50"
        >
          {isLoading ? "검색 중..." : "검색"}
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorWithHint
            message={error}
            toolSlug="vvs-planner"
            route={mode === "trending" ? "/api/tools/vvs-planner/trending" : "/api/tools/vvs-planner/search"}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {isLoading && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl2 border border-line bg-surface"
            >
              <div className="aspect-video bg-chip" />
              <div className="space-y-2 p-3">
                <div className="h-4 rounded bg-chip" />
                <div className="h-3 w-2/3 rounded bg-chip" />
                <div className="h-3 w-1/2 rounded bg-chip" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && videos.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-sub">
              {mode === "personalized" && personalKeywords.length > 0 ? (
                <>
                  🔥 <strong className="text-ink">이번주 인기 영상</strong>{" "}
                  <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                    {personalKeywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded-md bg-brandSoft px-2 py-0.5 text-[11px] font-bold text-brand"
                      >
                        #{k}
                      </span>
                    ))}
                  </span>
                  <span className="ml-1 text-mute">
                    · 최근 검색어 조합 · 롱폼 {videos.length}개
                  </span>
                  {wasCached && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-successSoft px-2 py-0.5 text-[11px] font-bold text-success">
                      ⚡ 캐시
                    </span>
                  )}
                </>
              ) : mode === "trending" ? (
                <>
                  🔥 <strong className="text-ink">이번주 인기 영상</strong>{" "}
                  <span className="text-mute">
                    · 롱폼 · VVS 종합점수 순 상위 {videos.length}개
                  </span>
                </>
              ) : (
                <>
                  총 {videos.length}개 영상
                  {wasCached && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-successSoft px-2 py-0.5 text-[11px] font-bold text-success">
                      ⚡ 캐시
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <VideoCard key={v.videoId} video={v} onClick={() => onSelect(v)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
