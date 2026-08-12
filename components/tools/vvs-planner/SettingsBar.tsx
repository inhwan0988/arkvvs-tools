"use client";

import { useEffect, useState } from "react";
import { useWizard } from "./WizardContext";
import ApiKeyGuideModal, {
  type GuideType,
} from "@/components/dashboard/ApiKeyGuideModal";

/**
 * 기본은 서버 API 키 사용 → 사용자는 아무것도 입력 안 해도 됨.
 * 우상단 "고급" 버튼 클릭 시 BYOK 입력 모달 (파워 유저용).
 */
export default function SettingsBar() {
  const {
    youtubeApiKey,
    setYoutubeApiKey,
    anthropicApiKey,
    setAnthropicApiKey,
  } = useWizard();
  const [guide, setGuide] = useState<GuideType | null>(null);
  const [advOpen, setAdvOpen] = useState(false);

  useEffect(() => {
    const yt = localStorage.getItem("apiKey_youtube");
    if (yt) setYoutubeApiKey(yt);
    const ant = localStorage.getItem("apiKey_claude");
    if (ant) setAnthropicApiKey(ant);
  }, [setYoutubeApiKey, setAnthropicApiKey]);

  useEffect(() => {
    if (youtubeApiKey) localStorage.setItem("apiKey_youtube", youtubeApiKey);
    else localStorage.removeItem("apiKey_youtube");
  }, [youtubeApiKey]);

  useEffect(() => {
    if (anthropicApiKey) localStorage.setItem("apiKey_claude", anthropicApiKey);
    else localStorage.removeItem("apiKey_claude");
  }, [anthropicApiKey]);

  const usingByok = !!(youtubeApiKey.trim() || anthropicApiKey.trim());

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
            {usingByok && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-successSoft px-2 py-1 text-[11px] font-bold text-success">
                BYOK 무제한
              </span>
            )}
            <button
              onClick={() => setAdvOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-xs font-bold text-ink hover:bg-line"
              title="본인 API 키 설정 (선택 사항)"
            >
              <span className="text-base leading-none">⚙️</span>
              <span className="hidden sm:inline">고급 (본인 키)</span>
              <span className="sm:hidden">고급</span>
            </button>
          </div>
        </div>
      </header>

      <ApiKeyGuideModal type={guide} onClose={() => setGuide(null)} />

      {advOpen && (
        <AdvancedKeysModal
          onClose={() => setAdvOpen(false)}
          youtubeApiKey={youtubeApiKey}
          setYoutubeApiKey={setYoutubeApiKey}
          anthropicApiKey={anthropicApiKey}
          setAnthropicApiKey={setAnthropicApiKey}
          onHelp={setGuide}
        />
      )}
    </>
  );
}

function AdvancedKeysModal({
  onClose,
  youtubeApiKey,
  setYoutubeApiKey,
  anthropicApiKey,
  setAnthropicApiKey,
  onHelp,
}: {
  onClose: () => void;
  youtubeApiKey: string;
  setYoutubeApiKey: (v: string) => void;
  anthropicApiKey: string;
  setAnthropicApiKey: (v: string) => void;
  onHelp: (t: GuideType) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:rounded-2xl bg-surface p-5 pb-7 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold">고급 · 본인 API 키 사용</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-mute hover:bg-chip"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <p className="text-[13px] text-sub leading-relaxed mb-5">
          비워두면 무료 티어(하루 사용량 제한) 자동 사용.
          <br />본인 키 입력 시 <strong className="text-brand">무제한</strong>{" "}
          + 개인 비용 부담.
        </p>

        <div className="space-y-4">
          <KeyField
            label="YouTube Data API v3"
            placeholder="AIzaSy… (여러 개면 쉼표로)"
            value={youtubeApiKey}
            onChange={setYoutubeApiKey}
            onHelp={() => onHelp("youtube")}
            multiKey
          />
          <KeyField
            label="Claude (Anthropic)"
            placeholder="sk-ant-…"
            value={anthropicApiKey}
            onChange={setAnthropicApiKey}
            onHelp={() => onHelp("claude")}
          />
        </div>

        <p className="mt-5 text-[11px] text-mute leading-relaxed">
          키는 브라우저 localStorage에만 저장됩니다.
        </p>
      </div>
    </div>
  );
}

function KeyField({
  label,
  placeholder,
  value,
  onChange,
  onHelp,
  multiKey = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onHelp?: () => void;
  multiKey?: boolean;
}) {
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
