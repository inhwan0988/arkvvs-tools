"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PLATFORM_META,
  SPREAD_PLATFORMS,
  type SpreadPlatform,
  type SocialConnection,
} from "@/lib/tools/spread/types";

type Variants = Record<"1:1" | "4:5" | "9:16" | "16:9", string>;

export default function SpreadPage() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // composer
  const [caption, setCaption] = useState("");
  const [variants, setVariants] = useState<Variants | null>(null);
  const [selected, setSelected] = useState<Set<SpreadPlatform>>(new Set());
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Record<string, { ok: boolean; url?: string; error?: string }> | null>(null);

  // tracking
  const [enableTracking, setEnableTracking] = useState(false);
  const [trackingDestination, setTrackingDestination] = useState("");
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/spread/connections", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? "조회 실패");
      const d = (await res.json()) as { connections: SocialConnection[] };
      setConnections(d.connections);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("connected")) setInfo("✓ 연결됨!");
    const err = sp.get("error");
    if (err) setError(decodeURIComponent(err));
  }, [refresh]);

  function togglePlatform(p: SpreadPlatform) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  }

  const connected = new Set(connections.map((c) => c.platform));

  async function handleFile(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setError("이미지 최대 20MB");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("image", file);
      fd.set("blurFor916", "1");
      const res = await fetch("/api/tools/spread/upload", {
        method: "POST",
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "업로드 실패");
      setVariants(d.variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setUploading(false);
    }
  }

  async function disconnect(id: string) {
    if (!confirm("이 계정 연결을 해제할까요?")) return;
    await fetch("/api/tools/spread/connections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  }

  async function post() {
    if (selected.size === 0) {
      setError("플랫폼 1개 이상 선택");
      return;
    }
    if (!caption.trim() && !variants) {
      setError("캡션 또는 이미지 중 하나는 필요해요");
      return;
    }
    if (enableTracking && trackingDestination && !/^https?:\/\//.test(trackingDestination)) {
      setError("추적 URL은 http(s)://로 시작해야 합니다");
      return;
    }
    setPosting(true);
    setError(null);
    setResults(null);
    setShortUrl(null);
    try {
      const res = await fetch("/api/tools/spread/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          variants: variants ?? undefined,
          targetPlatforms: [...selected],
          trackingDestination:
            enableTracking && trackingDestination ? trackingDestination : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "게시 실패");
      setResults(d.results);
      if (d.shortUrl) setShortUrl(d.shortUrl);
      const okAll = Object.values(d.results).every((r: unknown) => (r as { ok: boolean }).ok);
      if (okAll) {
        setCaption("");
        setVariants(null);
        setTrackingDestination("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Spread
            <span className="ml-2 text-[11px] px-2 py-0.5 bg-premium/20 text-premium rounded font-bold align-middle">
              BETA
            </span>
          </h1>
          <p className="text-sm text-sub mt-1.5">
            한 번 작성 → Instagram · Facebook · Threads 동시 게시 · 자동 비율 변환
          </p>
        </header>

        {info && (
          <div className="rounded-xl2 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            {info}
          </div>
        )}
        {error && (
          <div className="rounded-xl2 bg-dangerSoft px-4 py-3 text-sm font-semibold text-danger">
            ⚠️ {error}
          </div>
        )}

        {/* 연결된 계정 */}
        <div className="rounded-xl3 bg-white shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink">연결된 계정</h2>
            <a
              href="/api/oauth/meta/start"
              className="text-[12px] rounded-lg bg-brand text-white font-bold px-3 py-1.5 hover:bg-brandHover"
            >
              + Meta 연결 (FB + IG)
            </a>
          </div>
          {loading ? (
            <p className="text-sm text-mute">로딩 중...</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-mute py-4 text-center">
              아직 연결된 계정이 없어요.
            </p>
          ) : (
            <div className="space-y-1.5">
              {connections.map((c) => {
                const meta = PLATFORM_META[c.platform];
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg bg-chip/40 px-3 py-2"
                  >
                    <span className="text-lg">{meta?.emoji ?? "🔗"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">
                        {meta?.label}{" "}
                        <span className="text-mute font-normal">
                          · {c.external_username ?? c.external_name ?? c.external_id}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => disconnect(c.id)}
                      className="text-[11px] text-mute hover:text-danger"
                    >
                      해제
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="rounded-xl3 bg-white shadow-card p-5 sm:p-6">
          <h2 className="text-sm font-bold text-ink mb-3">📝 작성</h2>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="어떤 내용을 올릴까요?"
            className="w-full bg-chip rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30 resize-none"
          />

          {/* 이미지 업로드 */}
          <div className="mt-3">
            <label className="text-[11px] font-bold text-sub block mb-1.5">
              📸 이미지 (자동으로 4가지 비율로 변환)
            </label>
            {!variants ? (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl border-2 border-dashed border-line bg-chip/40 hover:bg-chip py-6 text-sm text-sub font-bold disabled:opacity-50"
              >
                {uploading ? "변환 + 업로드 중..." : "📁 이미지 선택 (최대 20MB)"}
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {(["1:1", "4:5", "9:16", "16:9"] as const).map((r) => (
                  <div key={r} className="text-center">
                    <picture>
                      <img
                        src={variants[r]}
                        alt={r}
                        className="w-full rounded-lg object-cover"
                        style={{ aspectRatio: r.replace(":", "/") }}
                      />
                    </picture>
                    <p className="text-[10px] text-mute mt-1 font-mono">{r}</p>
                  </div>
                ))}
              </div>
            )}
            {variants && (
              <button
                onClick={() => {
                  setVariants(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="mt-1.5 text-[11px] text-mute hover:text-ink"
              >
                ✕ 이미지 다시 선택
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* 단축 URL 자동 삽입 */}
          <div className="mt-4 rounded-xl bg-brandSoft/30 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableTracking}
                onChange={(e) => setEnableTracking(e.target.checked)}
                className="w-4 h-4 accent-brand"
              />
              <span className="text-[12px] font-bold text-ink">
                🔗 단축 URL로 클릭 추적 (sns-tracker 자동 연동)
              </span>
            </label>
            {enableTracking && (
              <input
                type="url"
                value={trackingDestination}
                onChange={(e) => setTrackingDestination(e.target.value)}
                placeholder="https://your-site.com/landing"
                className="w-full bg-white rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            )}
            <p className="text-[10px] text-mute">
              💡 켜면 모든 게시물 끝에 단축 URL이 자동 부착되고 클릭을 추적해요
            </p>
          </div>

          {/* 플랫폼 토글 */}
          <div className="mt-4">
            <label className="text-[11px] font-bold text-sub block mb-2">
              어디에 게시할까요?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPREAD_PLATFORMS.map((p) => {
                const meta = PLATFORM_META[p];
                const isConnected = connected.has(p);
                const isSel = selected.has(p);
                const charCount = caption.length;
                const overflow = charCount > meta.maxCaption;
                const disabled = !isConnected || meta.authStatus !== "ready";
                return (
                  <button
                    key={p}
                    onClick={() => !disabled && togglePlatform(p)}
                    disabled={disabled}
                    className={`text-left p-3 rounded-xl border-2 transition ${
                      disabled
                        ? "border-line bg-chip/40 opacity-50 cursor-not-allowed"
                        : isSel
                          ? "border-brand bg-brandSoft/50"
                          : "border-line bg-white hover:border-brand/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">{meta.emoji}</span>
                      <span className="text-sm font-bold text-ink">
                        {meta.label}
                      </span>
                      {isSel && <span className="ml-auto text-brand">✓</span>}
                    </div>
                    <p className="text-[10px] text-mute">
                      {disabled ? (
                        meta.authStatus === "ready" ? (
                          <span className="text-warn">연결 안 됨</span>
                        ) : (
                          <span>곧 추가</span>
                        )
                      ) : (
                        <span className={overflow ? "text-danger" : ""}>
                          {charCount} / {meta.maxCaption}
                        </span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={post}
            disabled={posting || selected.size === 0}
            className="w-full mt-5 rounded-xl bg-brand py-3.5 text-base font-bold text-white hover:bg-brandHover disabled:opacity-40 transition"
          >
            {posting
              ? "게시 중..."
              : `📢 ${selected.size}개 플랫폼에 동시 게시${variants ? " (자동 비율)" : ""}`}
          </button>

          {/* 결과 */}
          {results && (
            <div className="mt-4 space-y-1.5">
              {shortUrl && (
                <div className="rounded-lg bg-brandSoft/40 px-3 py-2 text-[12px] text-brand font-bold">
                  🔗 단축 URL: {shortUrl}
                </div>
              )}
              {Object.entries(results).map(([key, r]) => {
                const [platform] = key.split(":");
                const meta = PLATFORM_META[platform as SpreadPlatform];
                return (
                  <div
                    key={key}
                    className={`rounded-lg px-3 py-2 text-[12px] ${
                      r.ok ? "bg-success/10 text-success" : "bg-dangerSoft text-danger"
                    }`}
                  >
                    <b>
                      {meta?.emoji} {meta?.label}:
                    </b>{" "}
                    {r.ok ? (
                      <>
                        ✅ 성공{" "}
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline ml-1"
                          >
                            게시물 보기 ↗
                          </a>
                        )}
                      </>
                    ) : (
                      <>❌ {r.error}</>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 셋업 안내 */}
        <details className="rounded-xl2 bg-white shadow-card overflow-hidden">
          <summary className="px-4 py-3 text-sm font-bold text-ink cursor-pointer hover:bg-chip/40">
            ⚙️ Meta App 셋업 안내 (관리자만)
          </summary>
          <div className="px-4 pb-4 text-[13px] text-sub leading-relaxed space-y-2">
            <p>
              관리자가 한 번만 셋업:{" "}
              <code className="bg-chip px-1.5 py-0.5 rounded font-mono text-[11px]">
                META_APP_ID
              </code>{" "}
              +{" "}
              <code className="bg-chip px-1.5 py-0.5 rounded font-mono text-[11px]">
                META_APP_SECRET
              </code>
            </p>
            <ol className="text-[12px] list-decimal list-inside space-y-1 mt-2">
              <li>
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  developers.facebook.com/apps
                </a>{" "}
                → "Create App" → Business
              </li>
              <li>App Settings → Basic → App ID + Secret 복사</li>
              <li>FB Login for Business + Instagram + Threads use case 추가</li>
              <li>
                Valid OAuth Redirect URIs:{" "}
                <code className="text-[11px] bg-chip px-1 py-0.5 rounded">
                  https://arkvvs-tools.vercel.app/api/oauth/meta/callback
                </code>
              </li>
              <li>Vercel env에 두 키 추가</li>
              <li>본 게시 시 Meta App을 Live 상태로 (App Review 필요)</li>
            </ol>
          </div>
        </details>
      </div>
    </div>
  );
}
