"use client";

import { useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import type { ChannelProfile } from "@/lib/tools/vvs-planner/types";

/**
 * 내 채널 등록 + 분석 카드. Step1 상단에 표시.
 * 등록 시 모든 추천(주제/대본)이 내 채널 톤/규모/타겟에 맞춰 personalized.
 */
export default function ChannelProfileCard() {
  const {
    channelProfile,
    setChannelProfile,
    youtubeApiKey,
    anthropicApiKey,
  } = useWizard();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // 첫 마운트 시 저장된 프로필 fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tools/vvs-planner/profile-channel");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.profile) {
          // DB 컬럼 → 타입 형식 변환
          const p: ChannelProfile = {
            userId: data.profile.user_id,
            channelId: data.profile.channel_id,
            channelUrl: data.profile.channel_url,
            channelTitle: data.profile.channel_title,
            niche: data.profile.niche,
            avgViewCount: data.profile.avg_view_count,
            avgDurationSeconds: data.profile.avg_duration_seconds,
            commonHookPatterns: data.profile.common_hook_patterns,
            tone: data.profile.tone,
            pacing: data.profile.pacing,
            targetAudience: data.profile.target_audience,
            recentTitles: data.profile.recent_titles,
            analyzedAt: data.profile.analyzed_at,
          };
          setChannelProfile(p);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setChannelProfile]);

  async function analyze() {
    setErr(null);
    if (!input.trim()) {
      setErr("채널 URL 또는 @핸들을 입력해주세요.");
      return;
    }
    if (!youtubeApiKey.trim()) {
      setErr("우상단에서 YouTube API 키를 먼저 입력해주세요.");
      return;
    }
    if (!anthropicApiKey.trim()) {
      setErr("우상단에서 Claude API 키를 먼저 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tools/vvs-planner/profile-channel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelInput: input.trim(),
          youtubeApiKey: youtubeApiKey.trim(),
          anthropicApiKey: anthropicApiKey.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "분석 실패");
        return;
      }
      const p = data.profile;
      setChannelProfile({
        userId: p.user_id,
        channelId: p.channel_id,
        channelUrl: p.channel_url,
        channelTitle: p.channel_title,
        niche: p.niche,
        avgViewCount: p.avg_view_count,
        avgDurationSeconds: p.avg_duration_seconds,
        commonHookPatterns: p.common_hook_patterns,
        tone: p.tone,
        pacing: p.pacing,
        targetAudience: p.target_audience,
        recentTitles: p.recent_titles,
        analyzedAt: p.analyzed_at,
      });
      setInput("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!confirm("내 채널 프로필을 삭제할까요? 추천은 generic으로 돌아갑니다.")) return;
    await fetch("/api/tools/vvs-planner/profile-channel", { method: "DELETE" });
    setChannelProfile(null);
  }

  // 미등록 상태
  if (!channelProfile) {
    return (
      <div className="rounded-xl2 border-2 border-dashed border-brand/30 bg-brandSoft/30 p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⭐</span>
          <h3 className="text-sm font-bold text-ink">내 채널 등록 (선택)</h3>
          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand text-white rounded">
            추천 quality ↑↑
          </span>
        </div>
        <p className="text-xs text-sub mb-3">
          내 채널을 등록하면 AI가 내 채널의 톤/규모/타겟에 맞춰 주제와 대본을 추천해드려요. 1회 등록 후 영구 적용.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="@내채널 또는 https://www.youtube.com/@..."
            className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            onKeyDown={(e) => e.key === "Enter" && analyze()}
          />
          <button
            onClick={analyze}
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50"
          >
            {busy ? "분석 중..." : "분석"}
          </button>
        </div>
        {err && <p className="text-xs text-danger mt-2">{err}</p>}
      </div>
    );
  }

  // 등록 후 — compact + 펼치기
  return (
    <div className="rounded-xl2 border border-brand/40 bg-brandSoft/40 p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">✨</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-ink truncate">
                {channelProfile.channelTitle}
              </span>
              {channelProfile.niche && (
                <span className="text-[10px] px-1.5 py-0.5 bg-brand/20 text-brand rounded font-semibold whitespace-nowrap">
                  {channelProfile.niche}
                </span>
              )}
              <span className="text-[11px] text-sub whitespace-nowrap">
                평균 {(channelProfile.avgViewCount || 0).toLocaleString()}회
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-brand hover:underline"
              >
                {expanded ? "접기" : "상세"}
              </button>
              <button
                onClick={clear}
                className="text-[11px] text-mute hover:text-danger"
              >
                삭제
              </button>
            </div>
          </div>
          {expanded && (
            <div className="mt-2 space-y-1 text-[12px] text-sub">
              {channelProfile.tone && (
                <p>
                  <b className="text-ink">톤</b>: {channelProfile.tone}
                </p>
              )}
              {channelProfile.pacing && (
                <p>
                  <b className="text-ink">템포</b>: {channelProfile.pacing}
                </p>
              )}
              {channelProfile.targetAudience && (
                <p>
                  <b className="text-ink">타겟</b>: {channelProfile.targetAudience}
                </p>
              )}
              {channelProfile.commonHookPatterns &&
                channelProfile.commonHookPatterns.length > 0 && (
                  <p>
                    <b className="text-ink">자주 쓰는 후킹</b>:{" "}
                    {channelProfile.commonHookPatterns.join(", ")}
                  </p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
