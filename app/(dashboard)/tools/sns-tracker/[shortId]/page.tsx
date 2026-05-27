"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MiniLineChart from "@/components/tools/sns-tracker/MiniLineChart";
import { PLATFORM_META, type Platform } from "@/lib/tools/sns-tracker/types";

interface AnalyticsResponse {
  content: {
    content_id: string;
    short_id: string;
    title: string;
    platform: Platform;
    destination_url: string;
    posted_at: string;
    content_url: string | null;
  };
  summary: {
    totalClicks: number;
    botClicks: number;
    todayClicks: number;
    last7Clicks: number;
  };
  timeline: Array<{ date: string; count: number }>;
  sources: Array<{ key: string; count: number }>;
  countries: Array<{ key: string; count: number }>;
  devices: Array<{ key: string; count: number }>;
  recent: Array<{
    clickedAt: string;
    platform: Platform | null;
    country: string | null;
    device: string;
    referer: string | null;
  }>;
}

const SOURCE_LABEL: Record<string, string> = {
  youtube: "📺 YouTube",
  instagram: "📷 Instagram",
  tiktok: "🎵 TikTok",
  x: "🐦 X",
  facebook: "👥 Facebook",
  threads: "🧵 Threads",
  naver_blog: "🟢 네이버 블로그",
  etc: "🌐 기타",
  direct: "🔗 직접 접속",
};

const DEVICE_LABEL: Record<string, string> = {
  mobile: "📱 모바일",
  tablet: "🖥️ 태블릿",
  desktop: "💻 데스크탑",
};

export default function SnsTrackerDetailPage({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // 이름 inline 편집
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tools/sns-tracker/contents/${shortId}/analytics?days=${days}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "조회 실패");
      const d = (await res.json()) as AnalyticsResponse;
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [shortId, days]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  async function copyShortUrl() {
    if (!baseUrl) return;
    await navigator.clipboard.writeText(`${baseUrl}/r/${shortId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveTitle() {
    if (!data) return;
    const newTitle = titleDraft.trim();
    if (!newTitle || newTitle === data.content.title) {
      setEditingTitle(false);
      return;
    }
    setTitleSaving(true);
    try {
      const res = await fetch("/api/tools/sns-tracker/contents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.content.content_id, title: newTitle }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "저장 실패");
      setEditingTitle(false);
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    } finally {
      setTitleSaving(false);
    }
  }

  async function deleteContent() {
    if (!data) return;
    if (!confirm("이 단축 URL을 삭제할까요? 클릭 기록도 같이 사라집니다.")) return;
    const res = await fetch("/api/tools/sns-tracker/contents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.content.content_id }),
    });
    if (res.ok) router.push("/tools/sns-tracker");
  }

  if (loading && !data) {
    return (
      <div className="min-h-full bg-bg flex items-center justify-center py-20">
        <p className="text-sm text-mute">로딩 중...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-full bg-bg py-12 px-6">
        <Link
          href="/tools/sns-tracker"
          className="text-sm text-brand font-bold hover:underline"
        >
          ← 트래커로 돌아가기
        </Link>
        <div className="rounded-xl2 bg-dangerSoft px-4 py-3 mt-4 text-sm font-semibold text-danger">
          ⚠️ {error ?? "데이터 없음"}
        </div>
      </div>
    );
  }

  const c = data.content;
  const meta = PLATFORM_META[c.platform];
  const shortUrl = `${baseUrl}/r/${c.short_id}`;
  const maxSource = data.sources[0]?.count || 1;

  return (
    <div className="min-h-full bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        {/* Back */}
        <Link
          href="/tools/sns-tracker"
          className="inline-flex items-center gap-1 text-sm text-sub hover:text-ink font-semibold"
        >
          ← 모든 단축 URL
        </Link>

        {/* Header card */}
        <div className="rounded-xl3 bg-white shadow-card p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <span
              className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${meta.color}15` }}
            >
              {meta.emoji}
            </span>
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle();
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
                    className="flex-1 bg-chip rounded-lg px-3 py-1.5 text-sm font-bold text-ink focus:outline-none focus:bg-white"
                    autoFocus
                  />
                  <button
                    onClick={saveTitle}
                    disabled={titleSaving}
                    className="rounded-lg bg-brand text-white px-3 py-1.5 text-xs font-bold hover:bg-brandHover disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTitleDraft(c.title);
                    setEditingTitle(true);
                  }}
                  className="text-left w-full group"
                >
                  <h1 className="text-lg sm:text-xl font-bold text-ink leading-tight">
                    {c.title}
                    <span className="ml-2 text-[11px] text-mute opacity-0 group-hover:opacity-100 transition">
                      ✏️ 수정
                    </span>
                  </h1>
                </button>
              )}
              <p className="text-[12px] text-mute mt-1">
                {new Date(c.posted_at).toLocaleDateString("ko-KR")} · {meta.label}
              </p>
            </div>
            <button
              onClick={deleteContent}
              className="shrink-0 text-[11px] text-mute hover:text-danger"
            >
              삭제
            </button>
          </div>

          {/* Short URL */}
          <div className="rounded-xl2 bg-chip p-3 flex items-center gap-2 mb-2">
            <code className="flex-1 text-sm font-mono font-bold text-ink break-all">
              {shortUrl}
            </code>
            <button
              onClick={copyShortUrl}
              className="shrink-0 rounded-lg bg-brand text-white px-3 py-1.5 text-xs font-bold hover:bg-brandHover"
            >
              {copied ? "✓" : "복사"}
            </button>
            <a
              href={`/api/tools/sns-tracker/qr/${c.short_id}`}
              target="_blank"
              rel="noopener noreferrer"
              download={`qr-${c.short_id}.svg`}
              className="shrink-0 rounded-lg bg-white border border-line text-ink px-3 py-1.5 text-xs font-bold hover:bg-line"
            >
              🔲 QR
            </a>
          </div>

          {/* Destination */}
          <a
            href={c.destination_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-sub hover:text-brand block truncate"
          >
            → {c.destination_url}
          </a>
        </div>

        {/* 핵심 stat */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="총 클릭" value={fmt(data.summary.totalClicks)} accent />
          <Stat label="오늘" value={fmt(data.summary.todayClicks)} />
          <Stat label="최근 7일" value={fmt(data.summary.last7Clicks)} />
        </div>

        {/* 시간대별 차트 */}
        <div className="rounded-xl3 bg-white shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">📈 클릭 추이</h3>
            <div className="flex gap-1">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition ${
                    days === d
                      ? "bg-brand text-white"
                      : "bg-chip text-sub hover:bg-line"
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
          </div>
          <MiniLineChart data={data.timeline} />
        </div>

        {/* 출처 분포 */}
        <div className="rounded-xl3 bg-white shadow-card p-5">
          <h3 className="text-sm font-bold text-ink mb-3">📊 어디서 왔나</h3>
          {data.sources.length === 0 ? (
            <p className="text-sm text-mute text-center py-4">
              아직 데이터 없음
            </p>
          ) : (
            <div className="space-y-2">
              {data.sources.map((s) => {
                const pct = (s.count / maxSource) * 100;
                const totalPct =
                  data.summary.totalClicks > 0
                    ? ((s.count / data.summary.totalClicks) * 100).toFixed(0)
                    : "0";
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="font-semibold text-ink">
                        {SOURCE_LABEL[s.key] ?? s.key}
                      </span>
                      <span className="font-bold text-ink">
                        {fmt(s.count)}{" "}
                        <span className="text-mute font-normal">
                          ({totalPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-chip rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 디바이스 + 국가 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl3 bg-white shadow-card p-5">
            <h3 className="text-sm font-bold text-ink mb-3">📱 디바이스</h3>
            {data.devices.length === 0 ? (
              <p className="text-sm text-mute text-center py-4">
                데이터 없음
              </p>
            ) : (
              <div className="space-y-2">
                {data.devices.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-sub">
                      {DEVICE_LABEL[d.key] ?? d.key}
                    </span>
                    <span className="font-bold text-ink">{fmt(d.count)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl3 bg-white shadow-card p-5">
            <h3 className="text-sm font-bold text-ink mb-3">🌍 국가</h3>
            {data.countries.length === 0 ? (
              <p className="text-sm text-mute text-center py-4">
                데이터 없음
              </p>
            ) : (
              <div className="space-y-2">
                {data.countries.slice(0, 6).map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-sub">
                      {flagOf(c.key)} {c.key}
                    </span>
                    <span className="font-bold text-ink">{fmt(c.count)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 최근 클릭 */}
        <div className="rounded-xl3 bg-white shadow-card p-5">
          <h3 className="text-sm font-bold text-ink mb-3">🕐 최근 클릭</h3>
          {data.recent.length === 0 ? (
            <p className="text-sm text-mute text-center py-4">
              아직 클릭이 없어요. 단축 URL을 SNS에 붙여넣어 보세요.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {data.recent.slice(0, 20).map((r, i) => (
                <div
                  key={i}
                  className="py-2 flex items-center justify-between text-[12px]"
                >
                  <span className="text-sub">
                    {timeAgo(r.clickedAt)} · {r.platform ? SOURCE_LABEL[r.platform] ?? r.platform : "🔗 직접"}
                  </span>
                  <span className="text-mute">
                    {r.country ?? "?"} · {r.device}
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.summary.botClicks > 0 && (
            <p className="text-[10px] text-mute mt-3 italic">
              + 봇 클릭 {data.summary.botClicks}회 (자동 필터됨)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl2 bg-white p-4 shadow-card">
      <p className="text-[11px] font-semibold text-mute mb-1">{label}</p>
      <p
        className={`text-xl sm:text-2xl font-bold ${accent ? "text-brand" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  return `${day}일 전`;
}

const COUNTRY_FLAG: Record<string, string> = {
  KR: "🇰🇷",
  US: "🇺🇸",
  JP: "🇯🇵",
  CN: "🇨🇳",
  GB: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IN: "🇮🇳",
  CA: "🇨🇦",
  AU: "🇦🇺",
  Unknown: "❓",
};
function flagOf(code: string): string {
  return COUNTRY_FLAG[code] ?? "🌐";
}
