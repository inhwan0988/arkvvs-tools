"use client";

import { useEffect } from "react";

export type GuideType = "youtube" | "claude" | "openai";

const GUIDES: Record<
  GuideType,
  {
    title: string;
    color: string;
    why: string;
    steps: { title: string; body: string; link?: { label: string; href: string } }[];
    note?: string;
  }
> = {
  youtube: {
    title: "YouTube Data API 키 발급 방법",
    color: "bg-dangerSoft text-danger",
    why: "유튜브 영상 검색·통계 조회용. 무료(일 10,000 units), 결제 카드 등록 불필요.",
    steps: [
      {
        title: "1. Google Cloud 콘솔 접속",
        body: "Google 계정으로 로그인합니다.",
        link: {
          label: "console.cloud.google.com 열기",
          href: "https://console.cloud.google.com/",
        },
      },
      {
        title: "2. 새 프로젝트 만들기",
        body: '상단 프로젝트 선택 → "새 프로젝트" → 이름 자유롭게 (예: "arkvvs") → 만들기.',
      },
      {
        title: "3. YouTube Data API v3 활성화",
        body: '좌측 메뉴 "API 및 서비스" → "라이브러리" → "YouTube Data API v3" 검색 → "사용 설정".',
        link: {
          label: "API 라이브러리로 바로가기",
          href: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
        },
      },
      {
        title: "4. API 키 생성",
        body: '"API 및 서비스" → "사용자 인증 정보" → "+ 사용자 인증 정보 만들기" → "API 키" 클릭. 생성된 키 복사.',
      },
      {
        title: "5. 우측 상단 입력칸에 붙여넣기",
        body: "키는 브라우저 localStorage에만 저장되며 서버로 전송되지 않습니다 (BYOK).",
      },
    ],
    note: "키는 보통 'AIzaSy…' 로 시작합니다. 일 10,000 units 한도 = 약 25회 검색/일. **여러 개 등록 시 quota가 합산됩니다** — Google Cloud에서 새 프로젝트를 더 만들고 각각 키를 발급받아 입력칸에 쉼표(,)로 구분해서 붙여넣으면 quota가 키 개수만큼 늘어납니다 (예: 3개 → 일 ~75회).",
  },
  claude: {
    title: "Anthropic Claude API 키 발급 방법",
    color: "bg-warnSoft text-warn",
    why: "AI 주제·대본·제목·SEO 자동 생성용. 사용한 만큼 과금(소액).",
    steps: [
      {
        title: "1. Anthropic Console 가입",
        body: "이메일/Google로 가입. 한국 카드 등록 가능.",
        link: {
          label: "console.anthropic.com 열기",
          href: "https://console.anthropic.com/",
        },
      },
      {
        title: "2. 결제 수단 등록",
        body: '"Settings" → "Billing" → 카드 등록 + 최소 $5 충전. (대본 1편 약 $0.05~0.10 소모)',
      },
      {
        title: "3. API 키 생성",
        body: '"Settings" → "API Keys" → "Create Key" → 이름 자유 → 생성된 키 복사. 페이지 떠나면 다시 볼 수 없으니 즉시 저장.',
        link: {
          label: "API Keys 페이지",
          href: "https://console.anthropic.com/settings/keys",
        },
      },
      {
        title: "4. 우측 상단 입력칸에 붙여넣기",
        body: "키는 브라우저 localStorage에만 저장되며 서버로 전송되지 않습니다.",
      },
    ],
    note: "키는 'sk-ant-…' 로 시작합니다. 매월 사용량은 Console → Usage에서 확인.",
  },
  openai: {
    title: "OpenAI API 키 발급 방법",
    color: "bg-successSoft text-success",
    why: "GPT-4o로 제목·썸네일·설명 생성 (Claude 대신 선택 가능).",
    steps: [
      {
        title: "1. OpenAI Platform 가입",
        body: "이메일/Google로 가입.",
        link: {
          label: "platform.openai.com 열기",
          href: "https://platform.openai.com/",
        },
      },
      {
        title: "2. 결제 수단 등록 + 충전",
        body: '"Billing" → 카드 등록 + 최소 $5 충전.',
      },
      {
        title: "3. API 키 생성",
        body: '"API keys" → "Create new secret key" → 이름 입력 → 생성. 즉시 복사.',
        link: {
          label: "API Keys 페이지",
          href: "https://platform.openai.com/api-keys",
        },
      },
      {
        title: "4. 우측 상단 입력칸에 붙여넣기",
        body: "키는 브라우저 localStorage에만 저장됩니다.",
      },
    ],
    note: "키는 'sk-…' 로 시작합니다.",
  },
};

export default function ApiKeyGuideModal({
  type,
  onClose,
}: {
  type: GuideType | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (type) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [type, onClose]);

  if (!type) return null;
  const guide = GUIDES[type];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl3 bg-surface shadow-pop"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface rounded-t-xl3 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`text-[11px] font-bold px-2 py-1 rounded-md ${guide.color}`}
            >
              {type === "youtube" ? "무료" : type === "claude" ? "유료" : "유료"}
            </span>
            <h2 className="text-base font-bold text-ink">{guide.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-mute hover:bg-chip hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-sub mb-5 leading-relaxed">{guide.why}</p>

          <ol className="space-y-4">
            {guide.steps.map((step, i) => (
              <li
                key={i}
                className="rounded-xl2 border border-line bg-bg p-4"
              >
                <p className="text-sm font-bold text-ink">{step.title}</p>
                <p className="mt-1 text-sm text-sub leading-relaxed">
                  {step.body}
                </p>
                {step.link && (
                  <a
                    href={step.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    {step.link.label} ↗
                  </a>
                )}
              </li>
            ))}
          </ol>

          {guide.note && (
            <p className="mt-5 rounded-xl2 bg-chip px-4 py-3 text-xs text-sub leading-relaxed">
              💡 {guide.note}
            </p>
          )}
        </div>

        <div className="border-t border-line px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brandHover"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
