"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PLATFORM_META,
  SPREAD_PLATFORMS,
  type SpreadPlatform,
  type SocialConnection,
} from "@/lib/tools/spread/types";

export default function SpreadPage() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // composer state
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selected, setSelected] = useState<Set<SpreadPlatform>>(new Set());
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<Record<string, { ok: boolean; url?: string; error?: string }> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/spread/connections", {
        cache: "no-store",
      });
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
    // URL ?connected=1 또는 ?error=xxx 처리
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

  function connectedPlatforms(): Set<SpreadPlatform> {
    return new Set(connections.map((c) => c.platform));
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
      setError("플랫폼 1개 이상 선택해주세요");
      return;
    }
    if (!caption.trim() && !imageUrl) {
      setError("캡션 또는 이미지 URL 중 하나는 필요해요");
      return;
    }
    setPosting(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/tools/spread/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          imageUrl: imageUrl.trim() || undefined,
          targetPlatforms: [...selected],
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "게시 실패");
      setResults(d.results);
      const okAll = Object.values(d.results).every((r: unknown) => (r as { ok: boolean }).ok);
      if (okAll) {
        setCaption("");
        setImageUrl("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setPosting(false);
    }
  }

  const connected = connectedPlatforms();

  return (
    <div className="min-h-full bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        {/* Hero */}
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Spread
            <span className="ml-2 text-[11px] px-2 py-0.5 bg-premium/20 text-premium rounded font-bold align-middle">
              BETA
            </span>
          </h1>
          <p className="text-sm text-sub mt-1.5">
            한 번 작성 → Instagram · Facebook · Threads 동시 게시
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
              아직 연결된 계정이 없어요. 위 "+ Meta 연결"을 눌러 시작하세요.
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

          <div className="mt-3">
            <label className="text-[11px] font-bold text-sub block mb-1">
              이미지 URL (선택 — Instagram은 필수)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://your-cdn.com/image.jpg (public URL)"
              className="w-full bg-chip rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30"
            />
            <p className="text-[10px] text-mute mt-1 italic">
              ⚠️ Storage 업로드는 Phase 2 — 일단 public URL로
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
            {posting ? "게시 중..." : `📢 ${selected.size}개 플랫폼에 동시 게시`}
          </button>

          {/* 결과 */}
          {results && (
            <div className="mt-4 space-y-1.5">
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
                    <b>{meta?.emoji} {meta?.label}:</b>{" "}
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

        {/* 안내 */}
        <details className="rounded-xl2 bg-white shadow-card overflow-hidden">
          <summary className="px-4 py-3 text-sm font-bold text-ink cursor-pointer hover:bg-chip/40">
            ⚙️ 셋업 안내 (Meta App)
          </summary>
          <div className="px-4 pb-4 text-[13px] text-sub leading-relaxed space-y-2">
            <p>
              Meta(Facebook + Instagram) 연결을 위해서는 admin이 Vercel env 2개를 추가해야 해요:
            </p>
            <p>
              <code className="bg-chip px-1.5 py-0.5 rounded font-mono text-[11px]">
                META_APP_ID
              </code>
              {" + "}
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
                → "Create App" → Use case: "Other" → Type: "Business"
              </li>
              <li>
                App Settings → Basic → App ID + App Secret 복사
              </li>
              <li>
                Facebook Login for Business + Instagram + Threads use case 추가
              </li>
              <li>
                Valid OAuth Redirect URIs에{" "}
                <code className="text-[11px] bg-chip px-1 py-0.5 rounded">
                  https://arkvvs-tools.vercel.app/api/oauth/meta/callback
                </code>{" "}
                추가
              </li>
              <li>
                Vercel env에 두 키 추가 → 재배포
              </li>
            </ol>
            <p className="text-[11px] text-mute mt-2">
              ⚠️ 본 게시 기능 사용을 위해 Meta App을 Live 상태로 전환해야 합니다 (App Review).
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
