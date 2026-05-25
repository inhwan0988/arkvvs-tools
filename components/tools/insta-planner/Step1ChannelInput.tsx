"use client";

import { useState } from "react";
import { useWizard } from "./WizardContext";
import type { ReelResult } from "@/lib/tools/insta-planner/types";

export default function Step1ChannelInput() {
  const {
    channelInput,
    setChannelInput,
    setChannels,
    minIvs,
    setMinIvs,
    minFollowers,
    setMinFollowers,
    excludeKeywords,
    setExcludeKeywords,
    setReels,
    isLoading,
    setLoading,
    error,
    setError,
    goToStep,
  } = useWizard();

  const [phase, setPhase] = useState<"input" | "fetching">("input");

  async function handleSearch() {
    const raw = channelInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (raw.length === 0) {
      setError("영감 받은 인스타 채널 @핸들을 1개 이상 입력해주세요.");
      return;
    }
    setChannels(raw);
    setLoading(true);
    setError(null);
    setPhase("fetching");
    try {
      const res = await fetch("/api/tools/insta-planner/fetch-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: raw,
          postsPerProfile: 12,
          minIvs: minIvs > 0 ? minIvs : undefined,
          minFollowers: minFollowers > 0 ? minFollowers : undefined,
          excludeKeywords: excludeKeywords || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "채널 데이터 가져오기 실패");
      }
      const data = (await res.json()) as {
        reels: ReelResult[];
        meta?: { totalFetched: number; afterFilter: number };
      };
      if (data.reels.length === 0) {
        setError(
          "결과가 없어요. 채널 @핸들을 다시 확인하거나 필터를 완화해주세요.",
        );
        setPhase("input");
        return;
      }
      setReels(data.reels);
      goToStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setPhase("input");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-2">
          영감 받은 인스타 채널을 알려주세요
        </h2>
        <p className="text-sm text-sub leading-relaxed">
          분야의 떡상 채널 또는 본인이 follow하는 채널 @핸들을{" "}
          <b className="text-ink">1-5개</b> 입력하면, 각 채널의 인기 콘텐츠를
          분석해드립니다.
        </p>
      </div>

      {/* 채널 입력 */}
      <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
        <label className="text-xs font-bold text-sub mb-2 block">
          영감 채널 @핸들 (쉼표 또는 줄바꿈으로 구분)
        </label>
        <textarea
          value={channelInput}
          onChange={(e) => setChannelInput(e.target.value)}
          placeholder="예: @kim_finance, @lee_invest&#10;또는 https://instagram.com/username"
          rows={4}
          className="w-full rounded-xl border border-line bg-chip px-4 py-3 text-sm font-mono focus:outline-none focus:border-brand"
          disabled={isLoading}
        />
        <p className="mt-1.5 text-[11px] text-mute">
          {channelInput.split(/[,\n]/).filter((s) => s.trim()).length}개 채널
          (최대 5개)
        </p>
      </div>

      {/* 필터 */}
      <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
        <h3 className="text-sm font-bold text-ink mb-3">필터</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-sub mb-1.5 block">
              IVS 최소 (조회수 또는 좋아요 / 팔로워)
            </label>
            <div className="flex gap-1.5">
              {[0, 0.1, 0.3, 0.5, 1, 3].map((v) => (
                <button
                  key={v}
                  onClick={() => setMinIvs(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    minIvs === v
                      ? "bg-brand text-white"
                      : "bg-chip text-sub hover:bg-line"
                  }`}
                >
                  {v === 0 ? "전체" : `${v}배+`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-sub mb-1.5 block">
              팔로워 최소
            </label>
            <div className="flex gap-1.5">
              {[
                { v: 0, label: "전체" },
                { v: 1000, label: "1천+" },
                { v: 10000, label: "1만+" },
                { v: 100000, label: "10만+" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setMinFollowers(o.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    minFollowers === o.v
                      ? "bg-brand text-white"
                      : "bg-chip text-sub hover:bg-line"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-sub mb-1.5 block">
            제외 키워드 (선택, 캡션에 포함되면 제외)
          </label>
          <input
            type="text"
            value={excludeKeywords}
            onChange={(e) => setExcludeKeywords(e.target.value)}
            placeholder="광고, 협찬, 광고문의"
            className="w-full rounded-lg border border-line bg-chip px-3 py-2 text-xs focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* 검색 버튼 */}
      <button
        onClick={handleSearch}
        disabled={isLoading || channelInput.trim().length === 0}
        className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50"
      >
        {isLoading
          ? phase === "fetching"
            ? "Instagram에서 콘텐츠 분석 중... (30-60초)"
            : "처리 중..."
          : "분석 시작 →"}
      </button>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
          ⚠️ {error}
        </div>
      )}

      {/* 안내 */}
      <div className="text-xs text-mute leading-relaxed space-y-1 pt-4 border-t border-line">
        <p>💡 <b>팁:</b> 본인이 영감받는 한국 인스타 채널을 입력하면 한국어 콘텐츠 분석 가능.</p>
        <p>💡 자동 검색은 1-2분 소요 (Instagram 데이터 추출 + 분석).</p>
      </div>
    </div>
  );
}
