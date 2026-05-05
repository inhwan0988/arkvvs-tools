"use client";

import { useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import ApiKeyGuideModal, {
  type GuideType,
} from "@/components/dashboard/ApiKeyGuideModal";

export default function SettingsBar() {
  const {
    youtubeApiKey,
    setYoutubeApiKey,
    anthropicApiKey,
    setAnthropicApiKey,
  } = useWizard();
  const [showYt, setShowYt] = useState(false);
  const [showAnt, setShowAnt] = useState(false);
  const [guide, setGuide] = useState<GuideType | null>(null);

  useEffect(() => {
    const yt = localStorage.getItem("apiKey_youtube");
    if (yt) setYoutubeApiKey(yt);
    const ant = localStorage.getItem("apiKey_claude");
    if (ant) setAnthropicApiKey(ant);
  }, [setYoutubeApiKey, setAnthropicApiKey]);

  useEffect(() => {
    if (youtubeApiKey) localStorage.setItem("apiKey_youtube", youtubeApiKey);
  }, [youtubeApiKey]);

  useEffect(() => {
    if (anthropicApiKey) localStorage.setItem("apiKey_claude", anthropicApiKey);
  }, [anthropicApiKey]);

  return (
    <>
      <header className="bg-surface border-b border-line sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-dangerSoft flex items-center justify-center text-lg">
              🔥
            </div>
            <h1 className="text-[15px] sm:text-[17px] font-bold tracking-tight truncate">
              조회수 터지는 기획
            </h1>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <KeyInput
              label="YouTube"
              placeholder="AIzaSy…"
              value={youtubeApiKey}
              onChange={setYoutubeApiKey}
              show={showYt}
              setShow={setShowYt}
              onHelp={() => setGuide("youtube")}
            />
            <KeyInput
              label="Claude"
              placeholder="sk-ant-…"
              value={anthropicApiKey}
              onChange={setAnthropicApiKey}
              show={showAnt}
              setShow={setShowAnt}
              onHelp={() => setGuide("claude")}
            />
          </div>
        </div>
      </header>
      <ApiKeyGuideModal type={guide} onClose={() => setGuide(null)} />
    </>
  );
}

function KeyInput({
  label,
  placeholder,
  value,
  onChange,
  show,
  setShow,
  onHelp,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  onHelp: () => void;
}) {
  return (
    <div className="relative hidden sm:block">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-mute uppercase tracking-wider pointer-events-none">
        {label}
      </span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm pl-16 pr-20 py-2 rounded-xl bg-chip w-64 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30 transition font-mono placeholder:text-mute"
      />
      <button
        onClick={() => setShow(!show)}
        className="absolute right-9 top-1/2 -translate-y-1/2 text-xs text-mute hover:text-ink px-1.5 py-1"
      >
        {show ? "숨김" : "표시"}
      </button>
      <button
        onClick={onHelp}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-xs font-bold text-mute hover:bg-line hover:text-ink"
        title={`${label} 키 발급 방법`}
        aria-label={`${label} 키 발급 가이드`}
      >
        ?
      </button>
    </div>
  );
}
