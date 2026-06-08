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
  const [mobileKeysOpen, setMobileKeysOpen] = useState(false);

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
              placeholder="AIzaSy… (여러 개면 쉼표로)"
              value={youtubeApiKey}
              onChange={setYoutubeApiKey}
              show={showYt}
              setShow={setShowYt}
              onHelp={() => setGuide("youtube")}
              multiKey
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
            <button
              onClick={() => setMobileKeysOpen(true)}
              className="sm:hidden flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-xs font-bold text-ink hover:bg-line"
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
        <MobileKeysModal
          onClose={() => setMobileKeysOpen(false)}
          fields={[
            {
              label: "YouTube",
              placeholder: "AIzaSy… (여러 개면 쉼표로)",
              value: youtubeApiKey,
              onChange: setYoutubeApiKey,
              onHelp: () => setGuide("youtube"),
              multiKey: true,
            },
            {
              label: "Claude",
              placeholder: "sk-ant-…",
              value: anthropicApiKey,
              onChange: setAnthropicApiKey,
              onHelp: () => setGuide("claude"),
            },
          ]}
        />
      )}
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
  multiKey = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  onHelp: () => void;
  multiKey?: boolean;
}) {
  // 다중 키일 때 등록된 키 개수 카운트 (UX 표시용)
  const keyCount = multiKey
    ? value.split(/[,\n]/).map((k) => k.trim()).filter(Boolean).length
    : 0;
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
        className={`text-sm pl-16 pr-24 py-2 rounded-xl bg-chip ${
          multiKey ? "w-80" : "w-64"
        } focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30 transition font-mono placeholder:text-mute`}
      />
      {multiKey && keyCount > 1 && (
        <span className="absolute right-20 top-1/2 -translate-y-1/2 text-[10px] font-bold text-success bg-success/15 px-1.5 py-0.5 rounded">
          {keyCount}개
        </span>
      )}
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

type MobileField = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onHelp?: () => void;
  multiKey?: boolean;
};

function MobileKeysModal({
  onClose,
  fields,
}: {
  onClose: () => void;
  fields: MobileField[];
}) {
  return (
    <div
      className="fixed inset-0 z-50 sm:hidden bg-black/50 flex items-end"
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
        <div className="space-y-4">
          {fields.map((f) => (
            <MobileKeyField key={f.label} {...f} />
          ))}
        </div>
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
  multiKey,
}: MobileField) {
  const [show, setShow] = useState(false);
  const keyCount = multiKey
    ? value.split(/[,\n]/).map((k) => k.trim()).filter(Boolean).length
    : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-sub uppercase tracking-wider">
          {label}
          {multiKey && keyCount > 1 && (
            <span className="ml-2 text-[10px] font-bold text-success bg-success/15 px-1.5 py-0.5 rounded normal-case tracking-normal">
              {keyCount}개
            </span>
          )}
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
