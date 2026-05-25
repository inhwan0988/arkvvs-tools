"use client";

import { useCallback, useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import TopicCard from "./TopicCard";
import VideoAnalysisCard from "./VideoAnalysisCard";
import UserIntentInput from "./UserIntentInput";
import SelectedVideoBanner from "./SelectedVideoBanner";
import type { Topic, VideoAnalysis } from "@/lib/tools/vvs-planner/types";

export default function Step3TopicSelect() {
  const {
    selectedVideo,
    transcript: existingTranscript,
    setTranscript,
    topics,
    setTopics,
    selectedTopic,
    setSelectedTopic,
    isLoading,
    setLoading,
    error,
    setError,
    goToStep,
    anthropicApiKey,
    youtubeApiKey,
    channelProfile,
    referenceVideoUrls,
    videoAnalysis,
    setVideoAnalysis,
    userIntent,
    setUserIntent,
  } = useWizard();

  const [phase, setPhase] = useState<"transcript" | "analyze" | "ready" | "topics" | "done">(
    topics.length > 0 ? "done" : videoAnalysis ? "ready" : "transcript",
  );
  const [elapsed, setElapsed] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");
  // 자막/description 어디서 가져왔는지 사용자에게 표시 (투명성)
  const [transcriptSource, setTranscriptSource] = useState<
    "captions" | "description" | "captions+description" | null
  >(null);

  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isLoading]);

  /**
   * 영상 분석 — 자막을 받아 구조/후킹/타겟 등 추출.
   * 사용자가 영상의 핵심을 한눈에 보고 의도를 입력할 수 있게 함.
   */
  const analyzeVideo = useCallback(
    async (transcript: string, signal?: AbortSignal): Promise<VideoAnalysis> => {
      if (!anthropicApiKey.trim()) {
        throw new Error("우측 상단에서 Claude API 키를 입력해주세요.");
      }
      if (!selectedVideo) throw new Error("영상이 선택되지 않았습니다.");
      setPhase("analyze");
      const res = await fetch("/api/tools/vvs-planner/analyze-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          videoTitle: selectedVideo.title,
          channelTitle: selectedVideo.channelTitle,
          anthropicApiKey,
        }),
        signal,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "영상 분석 중 오류가 발생했습니다.");
      }
      const data = (await res.json()) as { analysis: VideoAnalysis };
      return data.analysis;
    },
    [anthropicApiKey, selectedVideo],
  );

  const generateTopics = useCallback(
    async (transcript: string, signal?: AbortSignal) => {
      if (!anthropicApiKey.trim()) {
        throw new Error("우측 상단에서 Claude API 키를 입력해주세요.");
      }
      if (!selectedVideo) throw new Error("영상이 선택되지 않았습니다.");
      if (!userIntent.freeText.trim()) {
        throw new Error("어떤 방향으로 만들고 싶은지 의도를 입력해주세요.");
      }

      setPhase("topics");
      const topRes = await fetch("/api/tools/vvs-planner/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          videoTitle: selectedVideo.title,
          channelTitle: selectedVideo.channelTitle,
          anthropicApiKey,
          // v2/v3 personalization
          channelProfile,
          referenceVideoUrls,
          userIntent,
        }),
        signal,
      });
      if (!topRes.ok) {
        const d = await topRes.json();
        throw new Error(d.error ?? "주제 생성 중 오류가 발생했습니다.");
      }
      const topData = (await topRes.json()) as { topics: Topic[] };
      setTopics(topData.topics);
      setPhase("done");
    },
    [
      anthropicApiKey,
      selectedVideo,
      setPhase,
      setTopics,
      channelProfile,
      referenceVideoUrls,
      userIntent,
    ],
  );

  // "이 의도로 주제 생성" 버튼 → topics 호출
  const handleGenerateTopics = useCallback(async () => {
    if (!existingTranscript) return;
    setLoading(true);
    setError(null);
    try {
      await generateTopics(existingTranscript);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setPhase("ready");
    } finally {
      setLoading(false);
    }
  }, [existingTranscript, generateTopics, setLoading, setError]);

  useEffect(() => {
    if (!selectedVideo) {
      goToStep(1);
      return;
    }
    // 이미 분석/주제 있으면 skip (사용자가 뒤로 갔다 다시 옴)
    if (videoAnalysis || topics.length > 0) return;

    const ctrl = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      setShowManualInput(false);

      try {
        // 1. 자막 추출
        setPhase("transcript");
        const tRes = await fetch("/api/tools/vvs-planner/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: selectedVideo.videoId,
            youtubeApiKey,
          }),
          signal: ctrl.signal,
        });
        if (!tRes.ok) {
          const d = await tRes.json();
          throw new Error(d.error ?? "자막 추출 중 오류가 발생했습니다.", {
            cause: "transcript",
          });
        }
        const tData = (await tRes.json()) as {
          transcript: string;
          source?: "captions" | "description" | "captions+description";
        };
        if (ctrl.signal.aborted) return;
        setTranscript(tData.transcript);
        setTranscriptSource(tData.source ?? null);

        // 2. 영상 분석 (자동, topics는 사용자 명시적 트리거 후)
        const analysis = await analyzeVideo(tData.transcript, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setVideoAnalysis(analysis);
        setPhase("ready"); // 사용자가 의도 입력 + "주제 생성" 버튼 누를 단계
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const isTranscriptError =
          e instanceof Error && e.cause === "transcript";
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
        if (isTranscriptError) setShowManualInput(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => {
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo]);

  const handleManualSubmit = useCallback(async () => {
    const cleaned = cleanTranscript(manualText);
    if (cleaned.length < 30) {
      setError(
        "자막이 너무 짧습니다. 영상의 자막 전체를 복사해서 붙여넣어 주세요.",
      );
      return;
    }
    setError(null);
    setShowManualInput(false);
    setTranscript(cleaned);
    setLoading(true);
    try {
      // 수동 입력 시에도 analyze → ready 흐름
      const analysis = await analyzeVideo(cleaned);
      setVideoAnalysis(analysis);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [
    manualText,
    analyzeVideo,
    setVideoAnalysis,
    setTranscript,
    setLoading,
    setError,
  ]);

  return (
    <div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-4 text-sm font-bold text-ink">
            {phase === "transcript" && "자막을 추출하고 있습니다..."}
            {phase === "analyze" && "AI가 영상을 분석하고 있습니다..."}
            {phase === "topics" && "AI가 주제를 생성하고 있습니다..."}
          </p>
          <p className="mt-1 text-xs text-mute">
            {elapsed}초 경과
            {phase === "topics" && elapsed > 30 && " · 평소보다 오래 걸리고 있어요"}
          </p>
          <div className="mt-3 flex gap-2 text-[11px] font-bold flex-wrap justify-center">
            <Pill done>1. 자막 추출</Pill>
            <Pill
              done={phase === "ready" || phase === "topics" || phase === "done"}
              active={phase === "analyze"}
            >
              2. 영상 분석
            </Pill>
            <Pill done={phase === "done"} active={phase === "topics"}>
              3. 주제 10개 생성
            </Pill>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="mx-auto max-w-md text-center">
          <div className="rounded-xl border border-danger/30 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        </div>
      )}

      {showManualInput && !isLoading && (
        <ManualTranscriptInput
          videoUrl={
            selectedVideo
              ? `https://www.youtube.com/watch?v=${selectedVideo.videoId}`
              : ""
          }
          value={manualText}
          onChange={setManualText}
          onSubmit={handleManualSubmit}
          onCancel={() => goToStep(2)}
        />
      )}

      {error && !showManualInput && !isLoading && (
        <div className="mx-auto mt-4 max-w-md text-center">
          <button
            onClick={() => goToStep(2)}
            className="rounded-xl border border-line bg-surface px-6 py-2 text-sm font-semibold text-ink transition-colors hover:bg-chip"
          >
            다른 영상 선택하기
          </button>
        </div>
      )}

      {/* ready 단계: 영상 분석 카드 + 의도 입력 + 주제 생성 버튼 */}
      {!isLoading && !error && phase === "ready" && videoAnalysis && (
        <div className="space-y-4">
          {/* 선택한 영상 정보 (썸네일 + 제목) — 상단 고정 */}
          {selectedVideo && <SelectedVideoBanner video={selectedVideo} />}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">
                영상 분석 완료 — 어떤 방향으로?
              </h2>
              <p className="text-sm text-sub mt-0.5">
                아래 분석을 참고하고, 본인 의도를 입력하면 그에 맞춰 주제를 만들어드립니다.
              </p>
            </div>
            <button
              onClick={() => goToStep(2)}
              className="text-sm font-semibold text-sub hover:text-ink whitespace-nowrap"
            >
              ← 영상 선택
            </button>
          </div>

          {transcriptSource && (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-mute">분석 소스:</span>
              {transcriptSource === "captions" && (
                <span className="px-1.5 py-0.5 bg-success/15 text-success rounded">
                  영상 자막
                </span>
              )}
              {transcriptSource === "description" && (
                <span className="px-1.5 py-0.5 bg-warn/15 text-warn rounded">
                  영상 설명란 (자막 없음)
                </span>
              )}
              {transcriptSource === "captions+description" && (
                <span className="px-1.5 py-0.5 bg-brand/15 text-brand rounded">
                  자막 + 설명란 통합
                </span>
              )}
            </div>
          )}

          <VideoAnalysisCard analysis={videoAnalysis} />

          <UserIntentInput intent={userIntent} onChange={setUserIntent} />

          <div className="flex justify-end">
            <button
              onClick={handleGenerateTopics}
              disabled={userIntent.freeText.trim().length < 5}
              className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-brandHover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이 의도로 주제 10개 생성하기 →
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && topics.length > 0 && (
        <>
          {/* 선택한 영상 정보 — AI 추천과 비교 가능 */}
          {selectedVideo && <SelectedVideoBanner video={selectedVideo} />}

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">
              AI가 제안하는 주제 10개
            </h2>
            <button
              onClick={() => goToStep(2)}
              className="text-sm font-semibold text-sub hover:text-ink"
            >
              ← 영상 확인
            </button>
          </div>
          {transcriptSource && (
            <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-mute">분석 소스:</span>
              {transcriptSource === "captions" && (
                <span className="px-1.5 py-0.5 bg-success/15 text-success rounded">
                  영상 자막
                </span>
              )}
              {transcriptSource === "description" && (
                <span className="px-1.5 py-0.5 bg-warn/15 text-warn rounded">
                  영상 설명란 (자막 없음)
                </span>
              )}
              {transcriptSource === "captions+description" && (
                <span className="px-1.5 py-0.5 bg-brand/15 text-brand rounded">
                  자막 + 설명란 통합
                </span>
              )}
            </div>
          )}
          <p className="mb-6 text-sm text-sub">
            마음에 드는 주제를 선택한 후 대본 생성을 진행하세요.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topics.map((t) => (
              <TopicCard
                key={t.id}
                topic={t}
                selected={selectedTopic?.id === t.id}
                onClick={() => setSelectedTopic(t)}
              />
            ))}
          </div>

          {selectedTopic && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => goToStep(4)}
                className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-brandHover"
              >
                이 주제로 대본 생성하기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ManualTranscriptInput({
  videoUrl,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  videoUrl: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  // 클립보드에서 직접 읽어서 붙여넣기 (사용자 클릭 절약)
  async function pasteFromClipboard() {
    try {
      if (!navigator.clipboard?.readText) {
        alert(
          "이 브라우저는 클립보드 자동 읽기를 지원하지 않아요. 텍스트 칸에 직접 붙여넣기(Cmd+V)해주세요.",
        );
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length < 10) {
        alert(
          "클립보드가 비어있거나 너무 짧아요. YouTube에서 '스크립트 표시 → 전체 선택 → 복사' 먼저 해주세요.",
        );
        return;
      }
      onChange(text);
    } catch (e) {
      // permission denied 등
      const msg = e instanceof Error ? e.message : String(e);
      alert(
        `클립보드 읽기 실패: ${msg}\n\n` +
          "권한 차단 시 텍스트 칸에 직접 붙여넣기(Cmd+V)해주세요.",
      );
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-card">
      <h3 className="text-base font-bold text-ink">
        직접 자막을 붙여넣어 주세요
      </h3>
      <p className="mt-1 text-sm text-sub">
        YouTube가 클라우드 서버 자동 추출을 차단하고 있어요. 아래 단계로
        진행하면 1분 안에 끝나요.
      </p>

      <ol className="mt-4 space-y-2.5 text-sm text-sub">
        <li className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-brandSoft text-brand text-[11px] font-bold flex items-center justify-center">
            1
          </span>
          <span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand underline underline-offset-2"
            >
              YouTube에서 이 영상 열기 ↗
            </a>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-brandSoft text-brand text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <span>
            영상 설명란 <b>&ldquo;더보기&rdquo;</b> 클릭 →{" "}
            <b>&ldquo;스크립트 표시&rdquo;</b> 클릭 (영상 옆에 스크립트 패널 펼쳐짐)
          </span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-brandSoft text-brand text-[11px] font-bold flex items-center justify-center">
            3
          </span>
          <span>스크립트 텍스트 전체 선택 (Cmd+A) + 복사 (Cmd+C)</span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
            4
          </span>
          <span className="font-semibold text-ink">
            아래 <b className="text-brand">&ldquo;📋 클립보드에서 붙여넣기&rdquo;</b>{" "}
            버튼 한 번 클릭 — 끝!
          </span>
        </li>
      </ol>

      {/* 클립보드 자동 붙여넣기 — 가장 강조 */}
      <button
        onClick={pasteFromClipboard}
        className="mt-5 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brandHover flex items-center justify-center gap-2"
      >
        📋 클립보드에서 자동 붙여넣기
      </button>
      <p className="mt-1.5 text-center text-[11px] text-mute">
        Cmd+C로 복사한 후 위 버튼만 누르면 자동 입력됩니다
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-line" />
        <span className="text-[10px] font-bold text-mute uppercase tracking-wider">
          또는 직접 입력
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0:00 안녕하세요&#10;0:05 오늘은..."
        className="mt-3 w-full min-h-[200px] resize-y rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-mute focus:border-brand focus:outline-none"
      />
      <p className="mt-1.5 text-xs text-mute">
        {value.length > 0
          ? `${value.length.toLocaleString()}자 · 정제 후 ${cleanTranscript(value).length.toLocaleString()}자`
          : "텍스트를 붙여넣으세요"}
      </p>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-chip"
        >
          다른 영상 선택
        </button>
        <button
          onClick={onSubmit}
          disabled={cleanTranscript(value).length < 30}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brandHover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이 자막으로 진행 →
        </button>
      </div>
    </div>
  );
}

function cleanTranscript(raw: string): string {
  return raw
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*/gm, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function Pill({
  children,
  done,
  active,
}: {
  children: React.ReactNode;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={`px-2 py-1 rounded-md ${
        done
          ? "bg-success/10 text-success"
          : active
            ? "bg-brandSoft text-brand"
            : "bg-chip text-mute"
      }`}
    >
      {done ? "✓ " : active ? "⏳ " : ""}
      {children}
    </span>
  );
}
