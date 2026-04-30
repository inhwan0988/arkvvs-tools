"use client";

import { useState } from "react";
import type { GenerateResult } from "@/lib/tools/youtube-setup/types";

type Tab = "titles" | "thumbnails" | "description" | "keywords" | "checklist";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
        copied
          ? "bg-successSoft text-success"
          : "bg-chip text-sub hover:bg-lineStrong hover:text-ink"
      }`}
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

function Chip({ label, tone = "brand" }: { label: string; tone?: "brand" | "neutral" }) {
  const cls =
    tone === "brand"
      ? "bg-brandSoft text-brand"
      : "bg-chip text-sub";
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md mr-1 mb-1 ${cls}`}>
      {label}
    </span>
  );
}

export default function ResultPanel({ result }: { result: GenerateResult | null }) {
  const [tab, setTab] = useState<Tab>("titles");

  if (!result) {
    return (
      <section className="flex items-center justify-center h-full bg-surface rounded-xl3 shadow-card p-8 min-h-[500px]">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brandSoft flex items-center justify-center mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 5v14l11-7z"
                fill="#3182F6"
              />
            </svg>
          </div>
          <p className="text-[15px] font-bold text-ink mb-1">
            결과가 여기에 표시돼요
          </p>
          <p className="text-sm text-mute">
            좌측에 스크립트를 붙여넣고 생성하기를 눌러주세요
          </p>
        </div>
      </section>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "titles", label: "제목", count: result.titles?.length },
    { id: "thumbnails", label: "썸네일", count: result.thumbnails?.length },
    { id: "description", label: "설명란" },
    { id: "keywords", label: "키워드" },
    { id: "checklist", label: "체크리스트" },
  ];

  return (
    <section className="flex flex-col h-full bg-surface rounded-xl3 shadow-card">
      <div className="flex gap-1 px-4 pt-4 border-b border-line overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition border-b-2 -mb-px ${
              tab === t.id
                ? "text-ink border-brand"
                : "text-mute border-transparent hover:text-sub"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1 text-xs ${tab === t.id ? "text-brand" : "text-mute"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {tab === "titles" &&
          result.titles?.map((t, i) => (
            <div
              key={i}
              className="p-4 rounded-xl2 border border-line hover:border-lineStrong transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[15px] font-bold leading-snug flex-1 text-ink">
                  {t.text}
                </p>
                <CopyButton text={t.text} />
              </div>
              <div className="mb-2 flex flex-wrap">
                {t.principles?.map((p) => <Chip key={p} label={p} />)}
              </div>
              <p className="text-[13px] text-sub leading-relaxed bg-chip rounded-lg px-3 py-2">
                {t.reason}
              </p>
            </div>
          ))}

        {tab === "thumbnails" &&
          result.thumbnails?.map((t, i) => (
            <div
              key={i}
              className="p-4 rounded-xl2 border border-line"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-lg font-bold mb-1 text-ink">"{t.text}"</p>
                  <p className="text-xs text-mute">감정 · {t.emotion}</p>
                </div>
                <CopyButton text={t.text} />
              </div>
              <div className="mb-2 flex flex-wrap">
                {t.principles?.map((p) => <Chip key={p} label={p} />)}
              </div>
              <div className="text-sm bg-chip rounded-lg px-3 py-2 text-sub mb-2">
                {t.concept}
              </div>
              {t.beforeAfter && (
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div className="p-3 rounded-lg bg-dangerSoft">
                    <p className="text-[11px] font-bold text-danger mb-1">BEFORE</p>
                    <p className="text-ink font-medium">{t.beforeAfter.before}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-successSoft">
                    <p className="text-[11px] font-bold text-success mb-1">AFTER</p>
                    <p className="text-ink font-medium">{t.beforeAfter.after}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

        {tab === "description" && (
          <div className="p-4 rounded-xl2 border border-line">
            <div className="flex justify-end mb-2">
              <CopyButton text={result.description ?? ""} />
            </div>
            <pre className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink font-sans">
              {result.description}
            </pre>
          </div>
        )}

        {tab === "keywords" && result.keywords && (
          <div className="space-y-3">
            {(["upper", "lower", "tags"] as const).map((k) => {
              const labels = {
                upper: "상위어 · 대중 욕구",
                lower: "하위어 · 구체 검색어",
                tags: "해시태그 · 태그",
              };
              const items = result.keywords[k] ?? [];
              return (
                <div key={k} className="p-4 rounded-xl2 border border-line">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-ink">{labels[k]}</h3>
                    <CopyButton text={items.join(", ")} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item, i) => (
                      <span
                        key={i}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg bg-chip text-ink"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "checklist" &&
          result.checklist?.map((c, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl2 border ${
                c.pass ? "bg-successSoft border-successSoft" : "bg-warnSoft border-warnSoft"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    c.pass ? "bg-success" : "bg-warn"
                  }`}
                >
                  {c.pass ? "✓" : "!"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{c.item}</p>
                  <p className="text-[13px] text-sub mt-1 leading-relaxed">{c.comment}</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
