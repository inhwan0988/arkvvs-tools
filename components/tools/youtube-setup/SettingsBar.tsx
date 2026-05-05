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
          </div>
        </div>
      </header>
      <ApiKeyGuideModal type={guide} onClose={() => setGuide(null)} />
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
