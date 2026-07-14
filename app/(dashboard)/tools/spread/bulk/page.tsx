"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ErrorWithHint from "@/components/ErrorWithHint";
import {
  PLATFORM_META,
  SPREAD_PLATFORMS,
  type SpreadPlatform,
  type SocialConnection,
} from "@/lib/tools/spread/types";
import {
  BULK_HEADERS,
  BULK_MAX_ROWS,
  parseCsv,
  validateRows,
  type ParsedBulkRow,
} from "@/lib/tools/spread/bulk-csv";

type Step = 1 | 2 | 3;

export default function SpreadBulkPage() {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedBulkRow[]>([]);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [selected, setSelected] = useState<Set<SpreadPlatform>>(new Set());
  const [category, setCategory] = useState("");
  const [evergreen, setEvergreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/spread/connections", {
        cache: "no-store",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "연결 조회 실패");
      setConnections(d.connections);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const validRows = parsed.filter((p) => p.row !== null);
  const errorRows = parsed.filter((p) => p.errors.length > 0);
  const connected = new Set(connections.map((c) => c.platform));

  async function handleFile(file: File) {
    setError(null);
    setInfo(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("CSV 최대 5MB");
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    const rows = parseCsv(text);
    const { parsed: p, headerErrors: he } = validateRows(rows);
    setHeaderErrors(he);
    setParsed(p);
    if (he.length === 0 && p.length > 0) {
      if (p.length > BULK_MAX_ROWS) {
        setError(
          `한 번에 최대 ${BULK_MAX_ROWS}개 (현재 ${p.length}개) — 파일을 나눠주세요`,
        );
      } else {
        setStep(2);
      }
    }
  }

  function togglePlatform(p: SpreadPlatform) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  }

  async function submit() {
    if (validRows.length === 0) {
      setError("예약할 유효한 row가 없습니다");
      return;
    }
    if (selected.size === 0) {
      setError("플랫폼 1개 이상 선택");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/spread/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((v) => v.row),
          targetPlatforms: [...selected],
          category: category || undefined,
          evergreen,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "벌크 예약 실패");
      setInfo(`✓ ${d.inserted}개 예약 완료`);
      setStep(1);
      setParsed([]);
      setFileName("");
      setSelected(new Set());
      setCategory("");
      setEvergreen(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        <div className="mb-2">
          <Link
            href="/tools/spread"
            className="text-xs font-semibold text-sub hover:text-ink"
          >
            ← Spread
          </Link>
        </div>

        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            📥 CSV 벌크 업로드
          </h1>
          <p className="text-sm text-sub mt-1.5">
            한 번에 최대 {BULK_MAX_ROWS}개 예약. CSV 3단계로 처리.
          </p>
        </header>

        <StepIndicator step={step} />

        {info && (
          <div className="rounded-xl2 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            {info}
          </div>
        )}
        {error && (
          <ErrorWithHint
            message={error}
            toolSlug="spread"
            route="/api/tools/spread/bulk"
            onDismiss={() => setError(null)}
          />
        )}

        {/* Step 1: 파일 업로드 */}
        {step === 1 && (
          <div className="rounded-xl3 bg-white shadow-card p-5 sm:p-6 space-y-4">
            <div>
              <p className="text-[13px] font-bold text-ink mb-2">
                📄 CSV 파일 선택
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-line bg-chip/40 hover:bg-chip py-10 text-sm text-sub font-bold"
              >
                {fileName ? `📄 ${fileName}` : "📁 CSV 파일 선택 (최대 5MB)"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <p className="text-[11px] text-mute mt-2">
                샘플 다운로드:{" "}
                <a
                  href="/spread-bulk-sample.csv"
                  download
                  className="text-brand font-bold hover:underline"
                >
                  spread-bulk-sample.csv
                </a>
              </p>
            </div>

            {headerErrors.length > 0 && (
              <div className="rounded-xl bg-dangerSoft p-3 text-[12px] text-danger">
                <b>❌ 헤더 오류</b>
                <ul className="mt-1 space-y-0.5">
                  {headerErrors.map((h, i) => (
                    <li key={i}>• {h}</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="rounded-xl bg-chip/40 overflow-hidden">
              <summary className="px-3 py-2 text-[12px] font-bold text-ink cursor-pointer hover:bg-chip">
                📘 Formatting Tips
              </summary>
              <div className="p-3 text-[12px] text-sub space-y-1.5">
                <p>
                  <b className="text-ink">필수 컬럼:</b>{" "}
                  <code className="text-[11px] bg-white px-1 rounded">
                    {BULK_HEADERS.join(", ")}
                  </code>
                </p>
                <p>
                  <b className="text-ink">scheduledAt:</b>{" "}
                  <code className="text-[11px] bg-white px-1 rounded">
                    YYYY-MM-DD HH:mm
                  </code>{" "}
                  또는{" "}
                  <code className="text-[11px] bg-white px-1 rounded">
                    YYYY-MM-DD HH:mm:ss
                  </code>{" "}
                  (24시간). 현재보다 30초 이상 미래여야 함.
                </p>
                <p>
                  <b className="text-ink">caption:</b> 텍스트 + 해시태그.
                  줄바꿈은{" "}
                  <code className="text-[11px] bg-white px-1 rounded">"..."</code>{" "}
                  로 감싸면 됩니다.
                </p>
                <p>
                  <b className="text-ink">link:</b> OG 미리보기용 링크 하나
                  (선택).
                </p>
                <p>
                  <b className="text-ink">imageUrls:</b> 여러 개는 콤마로 구분해
                  하나의 셀에 넣기 (셀은{" "}
                  <code className="text-[11px] bg-white px-1 rounded">"..."</code>{" "}
                  로 감싸기).
                </p>
                <p>
                  <b className="text-ink">videoUrl:</b> 영상은 1개만.
                </p>
                <p className="text-warn">
                  ⚠️ 이미지/영상은 <b>공개 URL</b>만 (Meta API가 직접 fetch).
                  로컬 파일 업로드 미지원.
                </p>
                <p>
                  <b className="text-ink">최대:</b> {BULK_MAX_ROWS}개 / CSV.
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Step 2: 플랫폼 선택 */}
        {step === 2 && (
          <div className="rounded-xl3 bg-white shadow-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink">
                📄 {fileName}{" "}
                <span className="text-mute font-normal">
                  · 유효 {validRows.length}개 / 오류 {errorRows.length}개
                </span>
              </p>
              <button
                onClick={() => setStep(1)}
                className="text-[11px] text-mute hover:text-ink"
              >
                파일 다시 선택
              </button>
            </div>

            <div>
              <p className="text-[11px] font-bold text-sub mb-2">
                어디에 게시할까요? (배치 전체 공통)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPREAD_PLATFORMS.map((p) => {
                  const meta = PLATFORM_META[p];
                  const isConnected = connected.has(p);
                  const isSel = selected.has(p);
                  const disabled =
                    !isConnected || meta.authStatus !== "ready";
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
                        {isSel && (
                          <span className="ml-auto text-brand">✓</span>
                        )}
                      </div>
                      <p className="text-[10px] text-mute">
                        {disabled ? (
                          meta.authStatus === "ready" ? (
                            <span className="text-warn">연결 안 됨</span>
                          ) : (
                            <span>곧 추가</span>
                          )
                        ) : (
                          <span>최대 {meta.maxCaption}자</span>
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-warnSoft/30 p-3 space-y-2">
              <div>
                <label className="text-[10px] font-bold text-mute uppercase tracking-wider block mb-1">
                  카테고리 (옵션 — 큐 관리용, 전체 공통)
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 신상품, 이벤트"
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-warn/30"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={evergreen}
                  onChange={(e) => setEvergreen(e.target.checked)}
                  className="w-4 h-4 accent-warn"
                />
                <span className="text-[12px] font-bold text-ink">
                  🔁 에버그린: 7일마다 자동 재게시
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg bg-chip text-ink text-sm font-bold px-4 py-2 hover:bg-chip/70"
              >
                ← 이전
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selected.size === 0}
                className="flex-1 rounded-lg bg-brand text-white text-sm font-bold py-2 hover:bg-brandHover disabled:opacity-40"
              >
                미리보기 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 미리보기 + 제출 */}
        {step === 3 && (
          <div className="rounded-xl3 bg-white shadow-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink">
                📄 미리보기{" "}
                <span className="text-mute font-normal">
                  · 예약 {validRows.length}개
                  {errorRows.length > 0 && (
                    <span className="text-danger">
                      {" "}
                      · 오류 {errorRows.length}개는 제외됨
                    </span>
                  )}
                </span>
              </p>
              <p className="text-[11px] text-mute">
                플랫폼:{" "}
                {[...selected]
                  .map((p) => PLATFORM_META[p]?.emoji + PLATFORM_META[p]?.label)
                  .join(", ")}
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-[12px]">
                <thead className="bg-chip/60">
                  <tr>
                    <th className="text-left px-3 py-2 text-mute font-bold">#</th>
                    <th className="text-left px-3 py-2 text-mute font-bold">예약</th>
                    <th className="text-left px-3 py-2 text-mute font-bold">캡션</th>
                    <th className="text-left px-3 py-2 text-mute font-bold">미디어</th>
                    <th className="text-left px-3 py-2 text-mute font-bold">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {parsed.map((p) => (
                    <tr
                      key={p.rowIndex}
                      className={p.errors.length > 0 ? "bg-dangerSoft/40" : ""}
                    >
                      <td className="px-3 py-2 text-mute">{p.rowIndex}</td>
                      <td className="px-3 py-2 text-ink whitespace-nowrap">
                        {p.row?.scheduledAt
                          ? new Date(p.row.scheduledAt).toLocaleString("ko-KR")
                          : p.raw.scheduledAt}
                      </td>
                      <td className="px-3 py-2 text-ink max-w-[240px] truncate">
                        {p.raw.caption}
                      </td>
                      <td className="px-3 py-2 text-mute">
                        {(p.row?.imageUrls?.length ?? 0) > 0 &&
                          `🖼 ${p.row!.imageUrls.length}`}
                        {p.row?.videoUrl && " 🎥"}
                      </td>
                      <td className="px-3 py-2">
                        {p.errors.length === 0 ? (
                          <span className="text-success font-bold">✓ OK</span>
                        ) : (
                          <span
                            className="text-danger"
                            title={p.errors.join("\n")}
                          >
                            ❌ {p.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="rounded-lg bg-chip text-ink text-sm font-bold px-4 py-2 hover:bg-chip/70"
              >
                ← 이전
              </button>
              <button
                onClick={submit}
                disabled={submitting || validRows.length === 0}
                className="flex-1 rounded-lg bg-brand text-white text-sm font-bold py-2.5 hover:bg-brandHover disabled:opacity-40"
              >
                {submitting
                  ? "예약 중..."
                  : `📤 ${validRows.length}개 예약하기`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: "파일 업로드" },
    { n: 2, label: "플랫폼 선택" },
    { n: 3, label: "미리보기" },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2 flex-1">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === s.n
                ? "bg-brand text-white"
                : step > s.n
                  ? "bg-success text-white"
                  : "bg-chip text-mute"
            }`}
          >
            {step > s.n ? "✓" : s.n}
          </div>
          <span
            className={`text-[12px] font-bold ${
              step === s.n ? "text-brand" : step > s.n ? "text-success" : "text-mute"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 ${
                step > s.n ? "bg-success" : "bg-line"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
