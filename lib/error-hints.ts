/**
 * 흔한 에러 메시지를 사용자 친화 안내로 자동 변환.
 *
 * 추가하는 법: { match: 정규식|문자열, title, hint, actions? } 한 줄.
 * 첫 매치만 사용.
 */

export interface ErrorHint {
  title: string;
  hint: string;
  actions?: Array<{ label: string; href: string }>;
}

interface Rule {
  match: RegExp | string;
  hint: ErrorHint;
}

const RULES: Rule[] = [
  // ── API 키 관련 ──────────────────────────────
  {
    match: /OpenAI API.*키|sk-.*시작|openaiApiKey|invalid_api_key/i,
    hint: {
      title: "OpenAI API 키가 없거나 잘못됐어요",
      hint: "우상단 설정에서 'sk-'로 시작하는 OpenAI 키를 입력해주세요. 키는 본인 PC에만 저장됩니다.",
      actions: [
        {
          label: "OpenAI 키 발급",
          href: "https://platform.openai.com/api-keys",
        },
      ],
    },
  },
  {
    match: /Anthropic API.*키|sk-ant-|anthropicApiKey/i,
    hint: {
      title: "Anthropic API 키가 없거나 잘못됐어요",
      hint: "우상단 설정에서 'sk-ant-'로 시작하는 Anthropic 키를 입력해주세요.",
      actions: [
        {
          label: "Anthropic 키 발급",
          href: "https://console.anthropic.com/settings/keys",
        },
      ],
    },
  },
  {
    match: /insufficient_quota|429|rate.limit|quota/i,
    hint: {
      title: "API 사용량 한도 초과",
      hint: "OpenAI 또는 Anthropic 결제 정보를 확인하고 최소 $5 충전해주세요. 무료 tier는 매우 제한적이라 결제 카드 등록이 필요합니다.",
      actions: [
        {
          label: "Anthropic billing",
          href: "https://console.anthropic.com/settings/billing",
        },
        {
          label: "OpenAI billing",
          href: "https://platform.openai.com/settings/organization/billing",
        },
      ],
    },
  },

  // ── 파일/사이즈 ──────────────────────────────
  {
    match: /너무 큽니다|25MB|too.large|file.size/i,
    hint: {
      title: "파일 크기 제한 초과",
      hint: "Whisper API는 25MB 미만만 받아요. 영상이 길면 음질을 낮춰 mp3로 압축하거나, 영상을 잘라서 여러 번 처리해주세요.",
    },
  },

  // ── 네트워크/타임아웃 ────────────────────────
  {
    match: /504|timeout|FetchError|ETIMEDOUT|Gateway.Time|fetch.failed/i,
    hint: {
      title: "처리 시간이 너무 길어요",
      hint: "영상이 너무 길거나 서버가 잠시 느려요. 5분 뒤 다시 시도하거나, 영상을 짧게 잘라 시도해주세요.",
    },
  },
  {
    match: /Failed to fetch|NetworkError|ERR_NETWORK/i,
    hint: {
      title: "네트워크 연결 문제",
      hint: "인터넷 연결을 확인하고 잠시 후 다시 시도해주세요. VPN이 켜져있다면 끄고 다시 시도.",
    },
  },

  // ── 인증/세션 ───────────────────────────────
  {
    match: /로그인이 필요|401|Unauthorized|JWT/i,
    hint: {
      title: "로그인이 필요해요",
      hint: "세션이 만료됐어요. 다시 로그인하고 작업을 이어가주세요.",
      actions: [{ label: "로그인", href: "/login" }],
    },
  },
  {
    match: /차단된 계정|banned/i,
    hint: {
      title: "계정이 차단됐어요",
      hint: "관리자에게 문의해주세요: joshua@arkstudio.kr",
    },
  },

  // ── Apify / Instagram ───────────────────────
  {
    match: /Apify|채널 @핸들|Instagram 데이터/i,
    hint: {
      title: "Instagram 채널을 못 찾았어요",
      hint: "@핸들이 정확한지, 비공개 계정인지 확인해주세요. 비공개 계정은 분석할 수 없습니다.",
    },
  },

  // ── Supabase ────────────────────────────────
  {
    match: /service_role|service-role|SERVICE_ROLE/i,
    hint: {
      title: "서버 설정 오류 (관리자 알림 완료)",
      hint: "관리자가 서버 설정을 확인 중입니다. 잠시 후 다시 시도해주세요.",
    },
  },
];

const FALLBACK: ErrorHint = {
  title: "일시적인 오류",
  hint: "잠시 후 다시 시도해주세요. 계속 같은 문제가 나면 화면 캡처와 함께 joshua@arkstudio.kr로 알려주세요.",
};

/** 메시지를 보고 가장 잘 맞는 hint 반환 — 매치 없으면 fallback */
export function hintForError(message: string): ErrorHint {
  if (!message) return FALLBACK;
  for (const r of RULES) {
    if (typeof r.match === "string") {
      if (message.includes(r.match)) return r.hint;
    } else if (r.match.test(message)) {
      return r.hint;
    }
  }
  return FALLBACK;
}
