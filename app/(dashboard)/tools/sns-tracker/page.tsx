"use client";

import { useCallback, useEffect, useState } from "react";
import YoutubeSyncButton from "@/components/tools/sns-tracker/YoutubeSyncButton";
import SummaryCards from "@/components/tools/sns-tracker/SummaryCards";
import RegisterForm from "@/components/tools/sns-tracker/RegisterForm";
import ContentList from "@/components/tools/sns-tracker/ContentList";
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
    // 30초마다 refresh
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
    <div className="min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Header */}
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              📊 SNS 트래픽 추적
              <span className="text-[10px] px-1.5 py-0.5 bg-brand/20 text-brand rounded font-bold">
                BETA
              </span>
            </h1>
            <p className="text-sm text-sub mt-1">
              각 SNS에 게시한 콘텐츠 + 단축 URL → 실시간 클릭 / 전환율 / AI 주간 분석.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <YoutubeSyncButton onSynced={fetchContents} />
            <a
              href="#how"
              className="text-[12px] text-brand font-semibold hover:underline"
            >
              ❓ 사용법
            </a>
          </div>
        </header>

        {err && (
          <div className="rounded-lg border border-danger/30 bg-dangerSoft px-4 py-2.5 text-sm font-semibold text-danger">
            ⚠️ {err}
          </div>
        )}

        {/* Summary */}
        <SummaryCards contents={contents} />

        {/* YouTube 채널 자동 sync */}
        <YoutubeChannels onChanged={fetchContents} />

        {/* 등록 + 플랫폼 분할 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RegisterForm onSuccess={fetchContents} />
          </div>
          <div>
            <PlatformBreakdown contents={contents} />
          </div>
        </div>

        {/* Weekly Best/Worst */}
        <WeeklyAnalysis
          contents={contents}
          apiKey={apiKey}
          onSetApiKey={setApiKey}
        />

        {/* Content list */}
        {loading ? (
          <div className="text-center py-12 text-sub">로딩 중...</div>
        ) : (
          <ContentList
            contents={contents}
            baseUrl={baseUrl}
            onChanged={fetchContents}
          />
        )}

        {/* How-to */}
        <section
          id="how"
          className="rounded-xl2 border border-line bg-surface p-5 mt-8"
        >
          <h2 className="text-base font-bold text-ink mb-3">📖 사용법</h2>
          <ol className="space-y-2 text-sm text-sub list-decimal list-inside">
            <li>
              <b className="text-ink">새 콘텐츠 등록</b>: SNS 플랫폼, 제목, 게시일, 그리고 사람들이 클릭하면 갈 <b className="text-ink">목적지 URL</b>을 입력
            </li>
            <li>
              <b className="text-ink">단축 URL 복사</b>: 등록되면{" "}
              <code className="bg-chip px-1.5 py-0.5 rounded font-mono text-[11px]">
                /r/XXXXXXX
              </code>{" "}
              형태의 짧은 URL이 발급됨. 이 URL을 SNS 게시물 본문 / 프로필 link / 댓글에 붙여넣기
            </li>
            <li>
              <b className="text-ink">조회수 업데이트</b>: SNS에서 조회수를 확인하고 콘텐츠 카드의 조회수를 클릭해서 수정. 전환율이 자동 계산됨
            </li>
            <li>
              <b className="text-ink">주간 AI 분석</b>: 일주일 데이터가 쌓이면 Claude로 베스트/워스트 분석 + 다음 주 액션 추천
            </li>
          </ol>
          <p className="text-[11px] text-mute mt-3">
            🔒 클릭 로그는 IP를 해시처리해서 저장하며, 봇 클릭은 자동 필터됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
