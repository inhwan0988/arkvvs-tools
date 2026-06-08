"use client";

import { useEffect, useState } from "react";
import { useWizard } from "./WizardContext";

export default function SettingsBar() {
  const { anthropicApiKey, setAnthropicApiKey } = useWizard();
  const [show, setShow] = useState(false);
  const [mobileKeysOpen, setMobileKeysOpen] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem("apiKey_claude");
    if (k) setAnthropicApiKey(k);
  }, [setAnthropicApiKey]);

  useEffect(() => {
    if (anthropicApiKey) localStorage.setItem("apiKey_claude", anthropicApiKey);
  }, [anthropicApiKey]);

  return (
    <header className="bg-surface border-b border-line sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-premiumSoft flex items-center justify-center text-lg">
            📱
          </div>
          <h1 className="text-[15px] sm:text-[17px] font-bold tracking-tight truncate">
            인스타그램 떡상 기획
          </h1>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-brand/20 text-brand rounded font-bold">
            BETA
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative hidden sm:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-mute uppercase tracking-wider pointer-events-none">
              CLAUDE
            </span>
            <input
              type={show ? "text" : "password"}
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-…"
              className="text-sm pl-16 pr-16 py-2 rounded-xl bg-chip w-64 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/30 transition font-mono placeholder:text-mute"
            />
            <button
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mute hover:text-ink"
            >
              {show ? "숨김" : "표시"}
            </button>
          </div>
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
      {mobileKeysOpen && (
        <MobileKeysModal onClose={() => setMobileKeysOpen(false)}>
          <MobileKeyField
            label="Claude"
            placeholder="sk-ant-…"
            value={anthropicApiKey}
            onChange={setAnthropicApiKey}
          />
        </MobileKeysModal>
      )}
    </header>
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
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-sub uppercase tracking-wider">
          {label}
        </label>
        <button
          onClick={() => setShow((s) => !s)}
          className="text-[11px] text-mute hover:text-ink"
        >
          {show ? "숨김" : "표시"}
        </button>
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
