"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorWithHint from "@/components/ErrorWithHint";
import QuickCreate from "@/components/tools/sns-tracker/QuickCreate";
import TossSummary from "@/components/tools/sns-tracker/TossSummary";
import TossLinkList from "@/components/tools/sns-tracker/TossLinkList";
import PlatformBreakdown from "@/components/tools/sns-tracker/PlatformBreakdown";
import WeeklyAnalysis from "@/components/tools/sns-tracker/WeeklyAnalysis";
import YoutubeChannels from "@/components/tools/sns-tracker/YoutubeChannels";
import type { SnsContentStats } from "@/lib/tools/sns-tracker/types";

export default function SnsTrackerPage() {
  const [contents, setContents] = useState<SnsContentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [tab, setTab] = useState<"main" | "advanced">("main");

  const fetchContents = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/sns-tracker/contents", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "조회 실패");
      const d = (await res.json()) as { contents: SnsContentStats[] };
      setContents(d.contents);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
    const t = setInterval(fetchContents, 30_000);
    return () => clearInterval(t);
  }, [fetchContents]);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    const k = localStorage.getItem("apiKey_claude") || "";
    if (k) setApiKey(k);
  }, []);

  useEffect(() => {
    if (apiKey) localStorage.setItem("apiKey_claude", apiKey);
  }, [apiKey]);

  return (
    <div className="min-h-full bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Hero */}
        <header className="text-center sm:text-left mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            SNS 트래픽 추적
          </h1>
          <p className="text-sm text-sub mt-1.5 leading-relaxed">
            단축 URL 1개로 SNS 트래픽을 한눈에. 어디서 클릭됐는지 자동 분류돼요.
          </p>
        </header>

        {err && (
          <ErrorWithHint
            message={err}
            toolSlug="sns-tracker"
            route="/api/tools/sns-tracker/contents"
            onDismiss={() => setErr(null)}
          />
        )}

        {/* 메인 액션 — 단축 URL 발급 */}
        <QuickCreate onCreated={fetchContents} baseUrl={baseUrl} />

        {/* 핵심 stat */}
        {!loading && contents.length > 0 && <TossSummary contents={contents} />}

        {/* 단축 URL 리스트 */}
        {loading ? (
          <div className="rounded-xl3 bg-white shadow-card p-8 text-center text-sub text-sm">
            로딩 중...
          </div>
        ) : (
          <TossLinkList
            contents={contents}
            baseUrl={baseUrl}
            onChanged={fetchContents}
          />
        )}

        {/* 고급 옵션 — 접혀있음 */}
        <div className="pt-2">
          <button
            onClick={() => setTab(tab === "main" ? "advanced" : "main")}
            className="w-full text-center text-[12px] text-sub hover:text-ink py-2"
          >
            {tab === "main" ? "+ 고급 옵션 (자동 sync, 분석)" : "- 접기"}
          </button>
        </div>

        {tab === "advanced" && (
          <div className="space-y-4">
            <YoutubeChannels onChanged={fetchContents} />
            <PlatformBreakdown contents={contents} />
            <WeeklyAnalysis
              contents={contents}
              apiKey={apiKey}
              onSetApiKey={setApiKey}
            />
          </div>
        )}

        {/* 도움말 */}
        <details className="rounded-xl2 bg-white shadow-card overflow-hidden">
          <summary className="px-4 py-3 text-sm font-bold text-ink cursor-pointer hover:bg-chip/40">
            💡 어떻게 쓰나요?
          </summary>
          <div className="px-4 pb-4 text-[13px] text-sub leading-relaxed space-y-2">
            <p>
              1. <b className="text-ink">목적지 URL</b>만 입력하고 발급 → 단축 URL이 즉시 생성돼요
            </p>
            <p>
              2. 단축 URL을 인스타·X·스레드·유튜브 어디든 붙여넣으세요
            </p>
            <p>
              3. 사람들이 누르면 우리가 <b className="text-ink">어떤 SNS에서 왔는지</b>를 자동으로 감지해서 통계에 분리 기록합니다 (referer + UA 기반)
            </p>
            <p>
              4. 조회수는 각 SNS 분석에서 직접 확인하세요. 우리는{" "}
              <b className="text-ink">"우리 단축 URL에서 일어난 클릭"</b>에만 집중해요
            </p>
            <p className="text-[11px] text-mute mt-2 italic">
              🔒 IP는 sha256로 해시 · 봇 클릭 자동 필터 · 단축 URL에 utm 자동 부착
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
