"use client";

import { useState } from "react";
import { useWizard } from "./WizardContext";
import VideoCard from "./VideoCard";
import ChannelProfileCard from "./ChannelProfileCard";
import ReferenceVideosInput from "./ReferenceVideosInput";
import type {
  ChannelSize,
  DurationRange,
  Period,
  SortBy,
  VideoFormat,
  VideoResult,
} from "@/lib/tools/vvs-planner/types";

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "1w", label: "최근 1주" },
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "6m", label: "6개월" },
  { value: "1y", label: "1년" },
];
const MIN_VIEWS_OPTS: { value: number; label: string }[] = [
  { value: 0, label: "제한 없음" },
  { value: 10_000, label: "1만+" },
  { value: 100_000, label: "10만+" },
  { value: 1_000_000, label: "100만+" },
];
const SIZE_OPTS: { value: ChannelSize; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "small", label: "소형 (10만 이하)" },
  { value: "medium", label: "중형 (10~100만)" },
  { value: "large", label: "대형 (100만+)" },
];
const FORMAT_OPTS: { value: VideoFormat; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "long", label: "롱폼" },
  { value: "shorts", label: "쇼츠" },
];
const SORT_OPTS: { value: SortBy; label: string }[] = [
  { value: "score", label: "종합 점수" },
  { value: "vvs", label: "VVS (조회/구독 비율)" },
  { value: "views", label: "조회수 순" },
  { value: "engagement", label: "참여율 순" },
  { value: "date", label: "최신순" },
];
const VVS_OPTS: { value: number; label: string }[] = [
  { value: 0, label: "제한 없음" },
  { value: 1, label: "1배+" },
  { value: 3, label: "3배+" },
  { value: 5, label: "5배+" },
  { value: 10, label: "10배+ (대박)" },
];
const ENGAGEMENT_OPTS: { value: number; label: string }[] = [
  { value: 0, label: "제한 없음" },
  { value: 1, label: "1%+" },
  { value: 3, label: "3%+ (높음)" },
  { value: 5, label: "5%+ (매우 높음)" },
];
const DURATION_OPTS: { value: DurationRange; label: string }[] = [
  { value: "any", label: "전체" },
  { value: "under3", label: "3분 이하" },
  { value: "3to10", label: "3-10분" },
  { value: "10to30", label: "10-30분" },
  { value: "over30", label: "30분+" },
];
const MAX_RESULTS_OPTS: { value: number; label: string }[] = [
  { value: 10, label: "10개" },
  { value: 20, label: "20개" },
  { value: 30, label: "30개 (기본)" },
  { value: 50, label: "50개" },
  { value: 100, label: "100개" },
];

export default function Step1KeywordSearch() {
  const {
    keyword,
    setKeyword,
    filters,
    setPeriod,
    setMinViews,
    setChannelSize,
    setVideoFormat,
    setDeepSearch,
    setMinVvs,
    setMinEngagementRate,
    setDurationRange,
    setCaptionsOnly,
    setExcludeKeywords,
    setSortBy,
    setMaxResults,
    videos,
    setVideos,
    setSelectedVideo,
    isLoading,
    setLoading,
    error,
    setError,
    goToStep,
    youtubeApiKey,
  } = useWizard();

  const [input, setInput] = useState(keyword);
  const [wasCached, setWasCached] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 활성화된 필터 개수 (시각 표시용)
  const activeFilterCount = [
    filters.minVvs && filters.minVvs > 0,
    filters.minEngagementRate && filters.minEngagementRate > 0,
    filters.durationRange && filters.durationRange !== "any",
    filters.captionsOnly,
    filters.excludeKeywords && filters.excludeKeywords.trim() !== "",
    filters.maxResults && filters.maxResults !== 30,
    filters.channelSize !== "all",
    filters.minViews > 0,
    filters.deepSearch,
  ].filter(Boolean).length;

  const search = async (bypassCache = false) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setKeyword(trimmed);
    setLoading(true);
    setError(null);

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
          // v3 강화 필터
          minVvs: filters.minVvs,
          minEngagementRate: filters.minEngagementRate,
          durationRange: filters.durationRange,
          captionsOnly: filters.captionsOnly,
          excludeKeywords: filters.excludeKeywords,
          sortBy: filters.sortBy,
          maxResults: filters.maxResults,
          bypassCache,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 400 && !youtubeApiKey.trim()) {
          throw new Error("우측 상단에서 YouTube API 키를 입력해주세요.");
        }
        throw new Error(data.error ?? "검색 중 오류가 발생했습니다.");
      }
      const data = await res.json();
      setVideos(data.videos as VideoResult[]);
      setWasCached(Boolean(data.cached));
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

  return (
    <div>
      <ChannelProfileCard />
      <ReferenceVideosInput />
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(false)}
          placeholder="검색 키워드를 입력하세요 (예: 자기계발, 부동산 투자, 재개발)"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          onClick={() => search(false)}
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brandHover disabled:opacity-50"
        >
          {isLoading ? "검색 중..." : "검색"}
        </button>
      </div>

      <div className="mt-4 rounded-xl2 border border-line bg-surface p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">필터</h3>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand text-white rounded">
                {activeFilterCount}개 활성
              </span>
            )}
            <span className="text-[11px] font-semibold text-mute">
              검색 전에 조정하세요
            </span>
          </div>
        </div>

        {/* 기본 필터 (가장 자주 쓰는 4가지) */}
        <div className="space-y-3">
          <FilterRow
            label="영상 형식"
            options={FORMAT_OPTS}
            value={filters.videoFormat}
            onChange={(v) => setVideoFormat(v)}
          />
          <FilterRow
            label="기간"
            options={PERIOD_OPTS}
            value={filters.period}
            onChange={(v) => setPeriod(v)}
          />
          <FilterRow
            label="VVS 최소"
            options={VVS_OPTS}
            value={filters.minVvs ?? 0}
            onChange={(v) => setMinVvs(v)}
            tooltip="조회수가 구독자 수의 몇 배 이상인 영상만 (떡상 영상 찾기 핵심 지표)"
          />
          <FilterRow
            label="정렬"
            options={SORT_OPTS}
            value={filters.sortBy ?? "score"}
            onChange={(v) => setSortBy(v)}
          />
        </div>

        {/* 자막만 (필수 옵션이라 기본 영역) */}
        <div className="mt-3 pt-3 border-t border-line">
          <label className="flex items-center gap-2 text-xs font-semibold text-sub cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.captionsOnly ?? false}
              onChange={(e) => setCaptionsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-brand cursor-pointer"
            />
            🎯 자막 있는 영상만
            <span className="text-mute font-medium">
              — 다음 단계(주제·대본 추천)는 자막 필수. 켜두면 안전.
            </span>
          </label>
        </div>

        {/* 고급 필터 토글 */}
        <div className="mt-3 pt-3 border-t border-line">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
          >
            <span>{showAdvanced ? "▼" : "▶"}</span>
            고급 필터 (참여율·영상 길이·제외 키워드·결과 개수·심층 검색)
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-3 space-y-3 pt-3 border-t border-dashed border-line">
            <FilterRow
              label="참여율 최소"
              options={ENGAGEMENT_OPTS}
              value={filters.minEngagementRate ?? 0}
              onChange={(v) => setMinEngagementRate(v)}
              tooltip="(좋아요 + 댓글) / 조회수. 높을수록 시청자 반응이 활발한 영상."
            />
            <FilterRow
              label="영상 길이"
              options={DURATION_OPTS}
              value={filters.durationRange ?? "any"}
              onChange={(v) => setDurationRange(v)}
            />
            <FilterRow
              label="채널 규모"
              options={SIZE_OPTS}
              value={filters.channelSize}
              onChange={(v) => setChannelSize(v)}
            />
            <FilterRow
              label="절대 조회수"
              options={MIN_VIEWS_OPTS}
              value={filters.minViews}
              onChange={(v) => setMinViews(v)}
            />
            <FilterRow
              label="결과 개수"
              options={MAX_RESULTS_OPTS}
              value={filters.maxResults ?? 30}
              onChange={(v) => setMaxResults(v)}
            />
            <div>
              <label className="text-xs font-semibold text-sub mb-1 block">
                제외 키워드{" "}
                <span className="text-mute font-medium">
                  (제목에 포함되면 제외, 쉼표로 구분)
                </span>
              </label>
              <input
                type="text"
                value={filters.excludeKeywords ?? ""}
                onChange={(e) => setExcludeKeywords(e.target.value)}
                placeholder="광고, 협찬, 광고문의"
                className="w-full rounded-lg border border-line bg-chip px-3 py-2 text-xs outline-none focus:border-brand"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-sub cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={filters.deepSearch}
                onChange={(e) => setDeepSearch(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-brand cursor-pointer"
              />
              심층 검색
              <span className="text-mute font-medium">
                — 후보 풀 ↑↑, quota 약 2.5배 (일 ~10회)
              </span>
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger leading-relaxed">
          <span className="mr-1">⚠️</span>
          {error}
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
              {error && (
                <span className="mr-1.5 rounded-md bg-warnSoft px-2 py-0.5 text-[11px] font-bold text-warn">
                  이전 검색 결과
                </span>
              )}
              총 {videos.length}개 영상
              {filters.videoFormat === "long" && " · 롱폼만"}
              {filters.videoFormat === "shorts" && " · 쇼츠만"}
              {wasCached && !error && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-successSoft px-2 py-0.5 text-[11px] font-bold text-success">
                  ⚡ 캐시 (quota 0)
                </span>
              )}
            </p>
            {wasCached && !error && (
              <button
                onClick={() => search(true)}
                className="text-xs font-semibold text-sub hover:text-ink underline"
              >
                새로 가져오기 (캐시 무시)
              </button>
            )}
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

function FilterRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
  tooltip,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tooltip?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-full sm:w-24 shrink-0 flex items-center gap-1">
        <p className="text-xs font-bold text-sub">{label}</p>
        {tooltip && (
          <span
            title={tooltip}
            className="text-[10px] text-mute cursor-help select-none"
          >
            ⓘ
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              value === o.value
                ? "bg-brand text-white"
                : "bg-chip text-sub hover:bg-line hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
