"use client";

import { useCallback, useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import {
  APPROACH_LABELS,
  type ContentIdea,
  type ReelAnalysis,
  type UserIntent,
} from "@/lib/tools/insta-planner/types";

export default function Step3Analysis() {
  const {
    selectedReel,
    reelAnalysis,
    setReelAnalysis,
    userIntent,
    setUserIntent,
    setIdeas,
    setSelectedIdea,
    anthropicApiKey,
    myProfile,
    goToStep,
  } = useWizard();

  const [phase, setPhase] = useState<"analyzing" | "ready" | "generating">(
    reelAnalysis ? "ready" : "analyzing",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<
    "reel" | "post" | "carousel" | "any"
  >("reel");

  // 진입 시 analyze 자동 호출
  useEffect(() => {
    if (!selectedReel) {
      goToStep(2);
      return;
    }
    if (reelAnalysis) return;
    if (!anthropicApiKey.trim()) {
      setError("우상단에서 Claude API 키를 입력해주세요.");
      return;
    }

    const ctrl = new AbortController();
    setBusy(true);
    setError(null);
    fetch("/api/tools/insta-planner/analyze-reel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reel: selectedReel, anthropicApiKey }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "분석 실패");
        }
        const data = (await res.json()) as { analysis: ReelAnalysis };
        setReelAnalysis(data.analysis);
        setPhase("ready");
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "오류");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setBusy(false);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReel]);

  const handleGenerate = useCallback(async () => {
    if (!selectedReel || !reelAnalysis) return;
    if (!userIntent.freeText.trim()) {
      setError("어떤 방향으로 만들고 싶은지 의도를 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/tools/insta-planner/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reel: selectedReel,
          analysis: reelAnalysis,
          profile: myProfile,
          userIntent,
          targetFormat,
          anthropicApiKey,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "아이디어 생성 실패");
      }
      const data = (await res.json()) as { ideas: ContentIdea[] };
      setIdeas(data.ideas);
      setSelectedIdea(null);
      goToStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setPhase("ready");
    } finally {
      setBusy(false);
    }
  }, [
    selectedReel,
    reelAnalysis,
    userIntent,
    myProfile,
    targetFormat,
    anthropicApiKey,
    setIdeas,
    setSelectedIdea,
    goToStep,
  ]);

  if (!selectedReel) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">분석 + 의도 입력</h2>
          <p className="text-sm text-sub mt-0.5">
            영감 콘텐츠를 분석한 결과를 보고, 본인 의도를 입력하세요.
          </p>
        </div>
        <button
          onClick={() => goToStep(2)}
          className="text-sm font-semibold text-sub hover:text-ink whitespace-nowrap"
        >
          ← 콘텐츠 선택
        </button>
      </div>

      {/* 선택 콘텐츠 banner */}
      <SelectedReelBanner />

      {/* 로딩 / 에러 */}
      {phase === "analyzing" && busy && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-4 text-sm font-bold text-ink">AI가 콘텐츠 분석 중...</p>
        </div>
      )}
      {phase === "generating" && busy && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-4 text-sm font-bold text-ink">
            의도 기반 아이디어 생성 중... (30-60초)
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
          ⚠️ {error}
        </div>
      )}

      {phase === "ready" && reelAnalysis && (
        <>
          <ReelAnalysisCard analysis={reelAnalysis} />
          <UserIntentBox intent={userIntent} onChange={setUserIntent} />

          {/* 형식 선택 */}
          <div className="rounded-xl2 border border-line bg-surface p-4">
            <p className="text-xs font-bold text-sub mb-2">만들 콘텐츠 형식</p>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { v: "reel", label: "📹 릴스" },
                { v: "carousel", label: "🖼️ 캐러셀" },
                { v: "post", label: "📷 단일 피드" },
                { v: "any", label: "AI 추천" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() =>
                    setTargetFormat(
                      o.v as "reel" | "post" | "carousel" | "any",
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    targetFormat === o.v
                      ? "bg-brand text-white"
                      : "bg-chip text-sub hover:bg-line"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={busy || userIntent.freeText.trim().length < 5}
              className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white hover:bg-brandHover disabled:opacity-50"
            >
              이 의도로 아이디어 10개 생성 →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SelectedReelBanner() {
  const { selectedReel } = useWizard();
  if (!selectedReel) return null;
  const reel = selectedReel;
  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 flex gap-4">
      <a
        href={reel.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-chip relative"
      >
        {reel.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/image-proxy?url=${encodeURIComponent(reel.thumbnail)}`}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </a>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-mute uppercase tracking-wider">
          분석할 콘텐츠
        </p>
        <p className="text-sm font-bold text-ink mt-1">
          @{reel.ownerUsername}
          <span className="text-mute text-xs font-normal ml-2">
            팔로워 {reel.ownerFollowers.toLocaleString()}
          </span>
        </p>
        <p className="text-[12px] text-sub line-clamp-2 mt-1">
          {reel.caption || "(캡션 없음)"}
        </p>
        <div className="flex gap-3 text-[11px] text-mute mt-1.5">
          <span>IVS {reel.ivs}배</span>
          <span>참여율 {reel.engagementRate}%</span>
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline ml-auto"
          >
            Instagram 열기 ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function ReelAnalysisCard({ analysis }: { analysis: ReelAnalysis }) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <h3 className="text-sm font-bold text-ink">콘텐츠 분석 결과</h3>
      </div>

      <div className="mb-4 rounded-lg bg-brandSoft/50 p-3">
        <p className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1">
          핵심 주제
        </p>
        <p className="text-sm font-bold text-ink leading-relaxed">
          {analysis.coreTheme}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-2">
          📱 콘텐츠 구조
        </p>
        <ul className="space-y-1.5 text-[13px] text-sub">
          <li className="flex gap-2">
            <span className="shrink-0 text-mute w-14">후킹</span>
            <span className="flex-1">{analysis.structure.hook}</span>
          </li>
          {analysis.structure.body.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-mute w-14">본론 {i + 1}</span>
              <span className="flex-1">{p}</span>
            </li>
          ))}
          <li className="flex gap-2">
            <span className="shrink-0 text-mute w-14">CTA</span>
            <span className="flex-1">{analysis.structure.cta}</span>
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1.5">
            🎯 후킹 패턴
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.hookPatterns.map((p, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 bg-dangerSoft/40 text-danger rounded font-semibold"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-mute uppercase tracking-wider mb-1.5">
            👥 타겟 시청자
          </p>
          <p className="text-[12px] text-sub leading-snug">
            {analysis.targetAudience}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
        <div>
          <p className="text-[10px] font-bold text-success uppercase tracking-wider mb-1.5">
            🔥 떡상 추정 이유
          </p>
          <ul className="space-y-0.5">
            {analysis.viralReasons.map((r, i) => (
              <li key={i} className="text-[12px] text-sub flex gap-1">
                <span>•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold text-warn uppercase tracking-wider mb-1.5">
            💡 빌릴 만한 angle
          </p>
          <ul className="space-y-0.5">
            {analysis.borrowableAngles.map((a, i) => (
              <li key={i} className="text-[12px] text-sub flex gap-1">
                <span>•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(analysis.visualStyle || analysis.captionStyle) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line mt-3 text-[12px] text-sub">
          {analysis.visualStyle && (
            <div>
              <span className="text-mute font-bold">시각 스타일: </span>
              {analysis.visualStyle}
            </div>
          )}
          {analysis.captionStyle && (
            <div>
              <span className="text-mute font-bold">캡션 패턴: </span>
              {analysis.captionStyle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserIntentBox({
  intent,
  onChange,
}: {
  intent: UserIntent;
  onChange: (i: UserIntent) => void;
}) {
  const approaches = Object.keys(APPROACH_LABELS) as Array<
    NonNullable<UserIntent["approach"]>
  >;
  return (
    <div className="rounded-xl2 border-2 border-brand/30 bg-brandSoft/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">✍️</span>
        <h3 className="text-sm font-bold text-ink">
          어떤 방향으로 만들고 싶으세요?
        </h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand text-white rounded">
          필수
        </span>
      </div>
      <p className="text-xs text-sub mb-4 leading-relaxed">
        영감 받은 부분과, 본인 채널에서 어떤 방향으로 만들고 싶은지 알려주세요.
        AI가 의도를 100% 반영해서 아이디어를 만듭니다.
      </p>

      <p className="text-[11px] font-bold text-sub mb-2">빠른 선택 (선택)</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {approaches.map((key) => (
          <button
            key={key}
            onClick={() =>
              onChange({
                ...intent,
                approach: intent.approach === key ? undefined : key,
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              intent.approach === key
                ? "bg-brand text-white"
                : "bg-surface text-sub border border-line hover:border-brand hover:text-ink"
            }`}
          >
            {APPROACH_LABELS[key]}
          </button>
        ))}
      </div>

      <p className="text-[11px] font-bold text-sub mb-2">
        구체적 의도 (자유 서술 — 필수) ⭐
      </p>
      <textarea
        value={intent.freeText}
        onChange={(e) => onChange({ ...intent, freeText: e.target.value })}
        placeholder="예) 이 콘텐츠의 '체크리스트 구조'를 빌리고 싶어요. 내 채널은 부동산 초보자 대상이라 더 쉬운 용어로 풀어주세요."
        rows={4}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-mute focus:border-brand focus:outline-none resize-y"
      />
      <p className="mt-1.5 text-[11px] text-mute">
        {intent.freeText.length === 0
          ? "💡 한 줄이라도 적어주세요"
          : `${intent.freeText.length}자 작성됨`}
      </p>
    </div>
  );
}
