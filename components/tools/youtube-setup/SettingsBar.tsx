"use client";

import { useEffect, useState } from "react";
import type { ChannelStage } from "@/lib/tools/youtube-setup/prompts";

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

  useEffect(() => {
    const saved = localStorage.getItem(`apiKey_${provider}`);
    setApiKey(saved ?? "");
  }, [provider, setApiKey]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(`apiKey_${provider}`, apiKey);
  }, [apiKey, provider]);

  return (
    <header className="bg-surface border-b border-line sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
            Y
          </div>
          <h1 className="text-[17px] font-bold tracking-tight">
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
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`${provider === "claude" ? "sk-ant-…" : "sk-…"} API Key`}
              className="text-sm px-4 py-2 pr-14 rounded-xl bg-chip w-72 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30 transition font-mono placeholder:text-mute"
            />
            <button
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-mute hover:text-ink px-2 py-1"
            >
              {show ? "숨김" : "표시"}
            </button>
          </div>
        </div>
      </div>
    </header>
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
