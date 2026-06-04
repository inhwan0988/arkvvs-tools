"use client";

import { useEffect, useRef } from "react";
import { useWizard } from "./WizardContext";

/**
 * 위저드 핵심 state 변경 시 자동으로 /sessions POST upsert.
 *
 * - 첫 의미 있는 진척 (keyword 검색 성공 또는 영상 선택) 부터 세션 생성
 * - sessionId 보유 시 update
 * - debounce 1.2초 (잦은 호출 방지)
 */
export function useSessionAutoSave() {
  const w = useWizard();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentHash = useRef<string>("");

  useEffect(() => {
    // 의미 있는 진척이 없으면 skip (사용자가 그냥 페이지만 열어둔 상태에서 row 만드는 거 방지)
    const hasMeaningfulProgress =
      (w.keyword && w.keyword.trim().length > 0) ||
      w.selectedVideo ||
      w.selectedTopic ||
      w.script;
    if (!hasMeaningfulProgress) return;

    const payload = {
      sessionId: w.sessionId ?? undefined,
      keyword: w.keyword || null,
      selectedVideo: w.selectedVideo
        ? {
            videoId: w.selectedVideo.videoId,
            title: w.selectedVideo.title,
            url: `https://www.youtube.com/watch?v=${w.selectedVideo.videoId}`,
            thumbnail: w.selectedVideo.thumbnail,
            channelTitle: w.selectedVideo.channelTitle,
          }
        : null,
      channelProfile: w.channelProfile,
      userIntent: w.userIntent,
      referenceVideoUrls: w.referenceVideoUrls,
      selectedTopic: w.selectedTopic,
      interviewQuestions: w.interviewQuestions,
      interviewAnswers: w.interviewAnswers,
      scriptText: w.script || null,
      status: w.script && !w.isLoading ? "complete" : "in_progress",
      stepProgress: Math.floor(w.step), // 3.5 → 3 으로 저장 (DB는 int)
      title:
        w.selectedTopic?.title || w.selectedVideo?.title || w.keyword || null,
    };

    // hash 비교 — 변경 없으면 skip
    const hash = JSON.stringify(payload);
    if (hash === lastSentHash.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/tools/vvs-planner/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: hash,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { sessionId?: string };
        if (data.sessionId && data.sessionId !== w.sessionId) {
          w.setSessionId(data.sessionId);
        }
        lastSentHash.current = hash;
      } catch {
        /* silent — 자동 저장 실패해도 UI 흐름 막지 않음 */
      }
    }, 1200);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    w.keyword,
    w.selectedVideo,
    w.selectedTopic,
    w.script,
    w.step,
    w.channelProfile,
    w.userIntent,
    w.referenceVideoUrls,
    w.interviewQuestions,
    w.interviewAnswers,
    w.sessionId,
    w.isLoading,
  ]);
}
