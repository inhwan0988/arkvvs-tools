"use client";

import { useEffect, useState } from "react";
import type { ChannelStage } from "@/lib/tools/youtube-setup/prompts";
import ApiKeyGuideModal, {
  type GuideType,
} from "@/components/dashboard/ApiKeyGuideModal";

export type Provider = "claude" | "openai";

type Props = {
  provider: Provider;
  setProvider: (p: Provider) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  stage: ChannelStage;
  setStage: (s: ChannelStage) => void;
};

export default function SettingsBar({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  stage,
  setStage,
}: Props) {
  const [show, setShow] = useState(false);
  const [guide, setGuide] = useState<GuideType | null>(null);
  const [mobileKeysOpen, setMobileKeysOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`apiKey_${provider}`);
    setApiKey(saved ?? "");
  }, [provider, setApiKey]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(`apiKey_${provider}`, apiKey);
  }, [apiKey, provider]);

  return (
    <>
      <header className="bg-surface border-b border-line sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
              Y
            </div>
            <h1 className="text-[15px] sm:text-[17px] font-bold tracking-tight truncate">
              YouTube 세팅 툴
            </h1>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Segmented
              value={provider}
              onChange={(v) => setProvider(v as Provider)}
              options={[
                { value: "claude", label: "Claude" },
                { value: "openai", label: "OpenAI" },
              ]}
            />
            <Segmented
              value={stage}
              onChange={(v) => setStage(v as ChannelStage)}
              options={[
                { value: "초기", label: "초기 채널" },
                { value: "성장", label: "성장 채널" },
              ]}
            />
            <div className="relative hidden md:block">
              <input
                type={show ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`${provider === "claude" ? "sk-ant-…" : "sk-…"} API Key`}
                className="text-sm px-4 py-2 pr-20 rounded-xl bg-chip w-72 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30 transition font-mono placeholder:text-mute"
              />
              <button
                onClick={() => setShow((s) => !s)}
                className="absolute right-9 top-1/2 -translate-y-1/2 text-xs text-mute hover:text-ink px-1.5 py-1"
              >
                {show ? "숨김" : "표시"}
              </button>
              <button
                onClick={() => setGuide(provider)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-xs font-bold text-mute hover:bg-line hover:text-ink"
                title="API 키 발급 방법"
                aria-label="API 키 발급 가이드"
              >
                ?
              </button>
            </div>
            <button
              onClick={() => setMobileKeysOpen(true)}
              className="md:hidden flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-xs font-bold text-ink hover:bg-line shrink-0"
              aria-label="API 키 설정"
            >
              <span className="text-base leading-none">⚙️</span>
              <span>API 키</span>
            </button>
          </div>
        </div>
      </header>
      <ApiKeyGuideModal type={guide} onClose={() => setGuide(null)} />
      {mobileKeysOpen && (
        <MobileKeysModal onClose={() => setMobileKeysOpen(false)}>
          <MobileKeyField
            label={provider === "claude" ? "Claude" : "OpenAI"}
            placeholder={`${provider === "claude" ? "sk-ant-…" : "sk-…"} API Key`}
            value={apiKey}
            onChange={setApiKey}
            onHelp={() => setGuide(provider)}
          />
        </MobileKeysModal>
      )}
    </>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex bg-chip rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${
            value === o.value
              ? "bg-white text-ink shadow-card"
              : "text-sub hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MobileKeysModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 md:hidden bg-black/50 flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full bg-surface rounded-t-2xl p-5 pb-7 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">API 키 설정</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-mute hover:bg-chip"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <p className="mt-5 text-[11px] text-mute leading-relaxed">
          키는 브라우저 localStorage에만 저장됩니다 (BYOK).
        </p>
      </div>
    </div>
  );
}

function MobileKeyField({
  label,
  placeholder,
  value,
  onChange,
  onHelp,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onHelp?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-sub uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShow((s) => !s)}
            className="text-[11px] text-mute hover:text-ink"
          >
            {show ? "숨김" : "표시"}
          </button>
          {onHelp && (
            <button
              onClick={onHelp}
              className="h-6 w-6 flex items-center justify-center rounded-md text-xs font-bold text-mute hover:bg-line hover:text-ink"
              aria-label={`${label} 키 발급 가이드`}
              title={`${label} 키 발급 방법`}
            >
              ?
            </button>
          )}
        </div>
      </div>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-3 rounded-xl bg-chip focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30 transition font-mono placeholder:text-mute"
      />
    </div>
  );
}
