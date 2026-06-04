import type {
  ChannelProfile,
  InterviewAnswers,
  InterviewQuestion,
  ParagraphTone,
  ReferenceVideo,
  UserIntent,
} from "./types";
import { APPROACH_LABELS } from "./types";

/**
 * 채널 프로필을 prompt에 주입할 system context로 변환.
 * null 이면 빈 문자열 — generic 추천으로 fallback.
 */
function buildChannelContext(profile: ChannelProfile | null | undefined): string {
  if (!profile || !profile.channelTitle) return "";
  const parts: string[] = ["<내 채널 프로필>"];
  if (profile.channelTitle) parts.push(`채널명: ${profile.channelTitle}`);
  if (profile.niche) parts.push(`주제: ${profile.niche}`);
  if (profile.avgViewCount)
    parts.push(`평균 조회수: 약 ${profile.avgViewCount.toLocaleString()}회`);
  if (profile.avgDurationSeconds) {
    const min = Math.round(profile.avgDurationSeconds / 60);
    parts.push(`평균 영상 길이: 약 ${min}분`);
  }
  if (profile.tone) parts.push(`말투: ${profile.tone}`);
  if (profile.pacing) parts.push(`템포: ${profile.pacing}`);
  if (profile.targetAudience) parts.push(`타겟 시청자: ${profile.targetAudience}`);
  if (profile.commonHookPatterns && profile.commonHookPatterns.length > 0) {
    parts.push(`자주 쓰는 후킹 패턴: ${profile.commonHookPatterns.join(", ")}`);
  }
  if (profile.recentTitles && profile.recentTitles.length > 0) {
    parts.push(`최근 영상 제목 (참고):\n- ${profile.recentTitles.slice(0, 6).join("\n- ")}`);
  }
  parts.push("</내 채널 프로필>");
  return parts.join("\n");
}

/**
 * 사용자 의도를 prompt에 주입. AI가 generic 추천 못 하게 강제.
 */
function buildIntentContext(intent: UserIntent | null | undefined): string {
  if (!intent) return "";
  const parts: string[] = ["<사용자가 명시한 의도 (반드시 100% 반영)>"];
  if (intent.approach) {
    parts.push(`접근 방식: ${APPROACH_LABELS[intent.approach]}`);
  }
  if (intent.freeText?.trim()) {
    parts.push(`구체 의도: ${intent.freeText.trim()}`);
  }
  parts.push("</사용자 의도>");
  parts.push("");
  parts.push(
    "⚠️ 위 사용자 의도와 맞지 않는 주제/방향은 절대 제안하지 마세요. " +
      "AI 자기 마음대로 다른 주제 만들기 금지.",
  );
  return parts.join("\n");
}

/**
 * 사용자가 명시적으로 추가한 레퍼런스 영상의 자막을 prompt에 주입.
 * "이런 스타일로 만들고 싶다"는 명시적 의도 반영.
 */
function buildReferenceContext(refs: ReferenceVideo[] | null | undefined): string {
  if (!refs || refs.length === 0) return "";
  const parts: string[] = ["<참고 영상 (사용자가 이런 스타일로 만들고 싶다고 지정함)>"];
  refs.slice(0, 3).forEach((ref, i) => {
    parts.push(`\n[참고 ${i + 1}] ${ref.title || "(제목 없음)"} / ${ref.channelTitle || ""}`);
    if (ref.transcriptSample) {
      parts.push(ref.transcriptSample.slice(0, 1000));
    }
  });
  parts.push("</참고 영상>");
  return parts.join("\n");
}

export function buildTopicPrompt(
  transcript: string,
  videoTitle: string,
  channelTitle: string,
  options?: {
    channelProfile?: ChannelProfile | null;
    referenceVideos?: ReferenceVideo[] | null;
    userIntent?: UserIntent | null;
  },
): string {
  const channelCtx = buildChannelContext(options?.channelProfile);
  const refCtx = buildReferenceContext(options?.referenceVideos);
  const intentCtx = buildIntentContext(options?.userIntent);
  const hasContext = !!(channelCtx || refCtx || intentCtx);

  return `당신은 유튜브 콘텐츠 기획 전문가입니다.${
    hasContext
      ? " 사용자의 채널/의도/참고 영상을 면밀히 고려해서 맞춤형 추천을 해주세요. 사용자가 명시한 의도와 다른 방향으로 빗나가지 마세요."
      : ""
  }

${intentCtx}

${channelCtx}

${refCtx}

<분석 대상 영상>
채널: ${channelTitle}
제목: ${videoTitle}
자막:
${transcript.slice(0, 8000)}
</분석 대상 영상>

이 영상의 분야에서, ${
    channelCtx
      ? "**내 채널의 톤/규모/타겟에 어울리는** 새 영상 주제 10개"
      : "새 영상 주제 10개"
  }를 제안해주세요.

각 주제는 다음을 모두 포함해야 합니다:
- title: 클릭 유도 강한 영상 제목
- description: 핵심 내용 (2-3문장)
- angle: 차별화 포인트
- appeal: 매력 포인트
- expectedViewsRange: ${
    channelCtx
      ? "내 채널 평균(약 " +
        (options?.channelProfile?.avgViewCount?.toLocaleString() || "?") +
        ")을 기준으로 예상 조회수 범위 (예: \"3만~7만\")"
      : '대중적 예상 조회수 범위 (예: "10만~30만")'
  }
- difficulty: { "filming": 1-3, "editing": 1-3, "note": "(있다면 한 줄)" } — 촬영/편집 난이도
- titleCandidates: 영상 제목 후보 3개 (배열)
- thumbnailText: 썸네일에 들어갈 텍스트 한 줄 (8-15자)
- hookLine: 영상 첫 15초에 쓸 후킹 라인 ${
    channelCtx ? "(내 채널 톤에 맞춰)" : ""
  } (1-2문장)
- relatedTags: 연관 키워드 3-5개 (배열)

⚠️ JSON 규칙 (반드시 준수):
- 모든 문자열 값은 큰따옴표("")로 감싼다.
- 문자열 값 안에 큰따옴표가 필요하면 작은따옴표(' 또는 한국어 인용부호 ' ')로 대체한다.
  예: "hookLine": "그는 '안녕'이라고 말했다" (← 큰따옴표 escape보다 작은따옴표 권장)
- 줄바꿈은 \\n 으로만 (실제 줄바꿈 문자 X).
- 백슬래시는 \\\\.
- 응답은 [ 로 시작해서 ] 로 끝나야 한다. 다른 텍스트, 코드블록 표시 X.

응답 형식 예시:
[
  {
    "id": 1,
    "title": "...",
    "description": "...",
    "angle": "...",
    "appeal": "...",
    "expectedViewsRange": "3만~7만",
    "difficulty": { "filming": 2, "editing": 3, "note": "자료 화면 많음" },
    "titleCandidates": ["제목1", "제목2", "제목3"],
    "thumbnailText": "썸네일 텍스트",
    "hookLine": "후킹 라인...",
    "relatedTags": ["태그1", "태그2", "태그3"]
  }
]`;
}

/**
 * 인터뷰 답변을 prompt에 자연스러운 문장 블록으로 변환.
 * 단답형(30자 이내) 답들을 모아서 "사용자가 직접 말한 내용"으로 강하게 주입.
 */
function buildInterviewContext(
  questions: InterviewQuestion[] | null | undefined,
  answers: InterviewAnswers | null | undefined,
): string {
  if (!questions || !answers) return "";
  const filled = questions
    .map((q) => ({ q, a: (answers[q.id] || "").trim() }))
    .filter((qa) => qa.a.length > 0);
  if (filled.length === 0) return "";
  const parts: string[] = [
    "<사용자 인터뷰 답변 (반드시 100% 원고에 자연스럽게 녹여 작성)>",
  ];
  filled.forEach((qa, i) => {
    parts.push(`Q${i + 1}. ${qa.q.text}`);
    parts.push(`A${i + 1}. ${qa.a}`);
  });
  parts.push("</사용자 인터뷰 답변>");
  parts.push("");
  parts.push(
    "⚠️ 위 인터뷰 답변은 사용자가 본인 입으로 말한 내용이에요. " +
      "이 답들이 원고의 핵심 콘텐츠가 됩니다. " +
      "각 답을 단순 나열하지 말고, 자연스러운 문장 흐름 안에 녹여서 작성하세요. " +
      "답에 없는 내용을 임의로 추가/창작하지 마세요.",
  );
  return parts.join("\n");
}

export function buildScriptPrompt(
  topic: { title: string; description: string; angle: string },
  transcript: string,
  videoTitle: string,
  options?: {
    channelProfile?: ChannelProfile | null;
    referenceVideos?: ReferenceVideo[] | null;
    userIntent?: UserIntent | null;
    interviewQuestions?: InterviewQuestion[] | null;
    interviewAnswers?: InterviewAnswers | null;
  },
): string {
  const channelCtx = buildChannelContext(options?.channelProfile);
  const refCtx = buildReferenceContext(options?.referenceVideos);
  const intentCtx = buildIntentContext(options?.userIntent);
  const interviewCtx = buildInterviewContext(
    options?.interviewQuestions,
    options?.interviewAnswers,
  );

  const targetMin = options?.channelProfile?.avgDurationSeconds
    ? Math.max(3, Math.round(options.channelProfile.avgDurationSeconds / 60))
    : 8;
  const targetChars = targetMin * 1000; // 분당 약 1000자 한국어 발화 기준 추정

  return `당신은 유튜브 대본 작성 전문가입니다.${
    channelCtx ? " 사용자의 채널 톤/말투에 정확히 맞춰 작성해주세요." : ""
  }${intentCtx ? " 사용자가 명시한 의도를 100% 반영하세요." : ""}${
    interviewCtx ? " 인터뷰 답변을 원고의 실제 내용으로 사용하세요." : ""
  }

${intentCtx}

${interviewCtx}

${channelCtx}

${refCtx}

<참고할 목표 영상>
제목: ${videoTitle}
자막:
${transcript.slice(0, 6000)}
</참고할 목표 영상>

<만들 영상 주제>
제목: ${topic.title}
설명: ${topic.description}
독특한 각도: ${topic.angle}
</만들 영상 주제>

**대본 작성 규칙**:

1. 총 글자수: ${Math.round(targetChars * 0.9)}~${Math.round(targetChars * 1.1)}자
   (목표 영상 길이: 약 ${targetMin}분)

2. 구조 — 각 섹션 앞에 시간 마커 + 섹션 이름을 [대괄호]로 명시:

   [0:00-0:15 🎬 후킹]
   강력한 한 줄 후킹으로 시작. 영상을 끝까지 봐야 하는 이유 1줄.

   [0:15-1:00 📌 인트로]
   주제 소개 + "오늘 알려드릴 핵심 3가지" 같은 예고.

   [1:00-{1/3}m 📌 본론 1]
   핵심 내용 1.
   💡 B-roll: "(이 부분에 들어가면 좋은 자료 화면 또는 컷)"

   [{1/3}m-{2/3}m 📌 본론 2]
   심화 / 사례.
   💡 B-roll: "..."

   [{2/3}m-(끝-30s) 📌 본론 3]
   실전 적용 / 반전.
   💡 B-roll: "..."

   [끝-30s ~ 끝 🎯 아웃트로]
   요약 + CTA (구독/좋아요).

3. 말투: ${
    options?.channelProfile?.tone || "~요체, 자연스러운 구어체"
  }, 시청자에게 직접 말하듯이.

4. 중간중간 "그런데 여기서 중요한 게 있습니다", "많은 분들이 모르시는 건데요" 같은
   ${
     options?.channelProfile?.commonHookPatterns?.length
       ? "특히 다음 패턴을 자연스럽게 활용: " +
         options.channelProfile.commonHookPatterns.slice(0, 3).join(", ")
       : "후킹 멘트"
   }
   를 포함.

5. 각 시간 마커는 반드시 [대괄호] 포함. 파싱에 사용됨.

대본 본문만 작성 (구조 표시 [...]와 💡 B-roll 포함, 그 외 메타 설명 X).`;
}

/**
 * 영상 분석 prompt — 자막을 보고 구조/후킹/타겟 등 추출.
 * 사용자가 Step3 진입 시 자동 호출되어 영상의 핵심을 한눈에 보여줌.
 */
export function buildAnalyzeVideoPrompt(
  transcript: string,
  videoTitle: string,
  channelTitle: string,
): string {
  return `당신은 유튜브 콘텐츠 분석 전문가입니다.

다음은 "${channelTitle}" 채널의 "${videoTitle}" 영상 자막입니다.

<자막>
${transcript.slice(0, 8000)}
</자막>

이 영상을 분석해서 다음을 추출해주세요:

1. coreTheme: 영상의 핵심 메시지를 한 줄로 (15-30자)
2. structure:
   - intro: 인트로(처음 30초)의 핵심 한 줄
   - mainPoints: 본론의 핵심 포인트 2-4개 (각 한 줄)
   - conclusion: 결론/CTA 한 줄
3. hookPatterns: 사용된 후킹 패턴 2-4개
   (예: "충격적 사실 오프닝", "숫자 활용", "전문가 발언 인용", "역설적 주장")
4. targetAudience: 이 영상의 주 타겟 시청자
   (예: "재개발 투자 고민하는 30-50대", "유튜브 시작하려는 직장인")
5. viralReasons: 이 영상이 떡상한 추정 이유 2-3개
   (예: ["불편한 진실을 드러냄", "구체적 사례 풍부", "결과를 명확히 약속"])
6. borrowableAngles: 다른 크리에이터가 이 영상에서 빌릴 만한 angle 2-4개
   (예: ["함정 패턴 구조", "체크리스트 형식", "전문가 인터뷰 톤"])

⚠️ JSON 규칙:
- 모든 문자열은 큰따옴표
- 따옴표 안에 큰따옴표 필요 시 작은따옴표로 대체
- 응답은 { 시작 } 종료. 코드블록/설명 X.

응답 형식:
{
  "coreTheme": "...",
  "structure": {
    "intro": "...",
    "mainPoints": ["...", "..."],
    "conclusion": "..."
  },
  "hookPatterns": ["...", "..."],
  "targetAudience": "...",
  "viralReasons": ["...", "..."],
  "borrowableAngles": ["...", "..."]
}`;
}

/**
 * Step 3.5 인터뷰 질문 생성 prompt.
 *
 * 레퍼런스 영상 transcript를 역분해 → 그 영상에서 화자가 "말했던 것"을 사용자가
 * 답할 수 있도록 단답형 질문으로 변환. 사용자가 직접 답하면 원고 quality ↑.
 *
 * 마케팅 DB 수집 광고 패턴: 사용자가 자유 입력으로 막힐 때 한 줄 질문 하나씩 던지면 답함.
 */
export function buildInterviewQuestionsPrompt(args: {
  selectedTopic: { title: string; description: string; angle: string };
  referenceTranscript: string;
  channelProfile?: ChannelProfile | null;
  userIntent?: UserIntent | null;
  videoTitle?: string;
}): string {
  const channelCtx = buildChannelContext(args.channelProfile);
  const intentCtx = buildIntentContext(args.userIntent);

  return `당신은 유튜브 콘텐츠 인터뷰어입니다. 크리에이터가 직접 원고를 쓸 수 있도록 핵심을 짚는 단답형 질문을 던지세요.

${intentCtx}

${channelCtx}

<만들 영상 주제>
제목: ${args.selectedTopic.title}
설명: ${args.selectedTopic.description}
독특한 각도: ${args.selectedTopic.angle}
</만들 영상 주제>

<레퍼런스 영상 자막 (이런 구조로 만들고 싶음)>
${args.videoTitle ? `제목: ${args.videoTitle}\n` : ""}${args.referenceTranscript.slice(0, 6000)}
</레퍼런스 영상 자막>

**역할**:
레퍼런스 영상의 화자가 "본인 입으로 말했던 핵심"을 추출하고, 그것을 사용자(크리에이터)도 동일하게 자기 입으로 답할 수 있도록 단답형 질문으로 변환하세요.
사용자는 빠르게 답해야 하므로 30자 이내로 답할 수 있는 질문이어야 합니다.
질문이 추상적이면 안 됩니다 — 구체적인 경험, 숫자, 사례, 한 줄 의견을 묻는 식.

**질문 개수**: 5~8개 (보통 6개 권장)

**질문 타입**:
- "short_text": 자유 단답형 (예: "본인 경험 한 줄로 — 가장 큰 실수는?")
- "chips": 3-5개 옵션 중 선택 (예: "타겟 시청자 연령대는?" / options: ["20대","30대","40대+"])

**구성 가이드** (이 순서/유형 권장):
1. 후킹 — 시청자가 끝까지 봐야 할 이유 한 줄 (사용자 본인 경험/충격 사실)
2. 핵심 메시지 — 이 영상에서 전달하고 싶은 단 한 가지
3. 본인 사례 — 가장 인상 깊었던 구체적 케이스/숫자
4. 본론 1-3 — 영상에서 다룰 포인트 각 한 줄
5. 차별점 — 다른 영상과 다른 점
6. 시청자 행동 — 영상 끝에 시청자가 뭘 하길 바라는지

⚠️ JSON 규칙:
- 모든 문자열 큰따옴표
- 응답은 { 시작 } 종료. 코드블록/설명 X.

응답 형식:
{
  "questions": [
    {
      "id": "q1",
      "text": "이 영상을 끝까지 봐야 할 이유 한 줄? (본인 경험으로)",
      "type": "short_text",
      "hint": "예: '저도 처음엔 이 함정에 빠졌어요'"
    },
    {
      "id": "q2",
      "text": "타겟 시청자 연령대?",
      "type": "chips",
      "options": ["20대","30대","40대+","전부"]
    }
  ]
}`;
}

/**
 * Step 4 단락 재생성 prompt.
 *
 * 전체 원고 흐름은 유지하면서 특정 단락만 다시 작성. tone에 따라 톤/길이 조절.
 */
export function buildParagraphRegenPrompt(args: {
  fullScript: string;
  paragraphIndex: number;
  paragraph: string;
  tone?: ParagraphTone;
  channelProfile?: ChannelProfile | null;
}): string {
  const toneInstruction = (() => {
    switch (args.tone) {
      case "punchy":
        return "톤을 더 자극적이고 임팩트 있게. 첫 문장에 후킹, 짧고 강한 문장.";
      case "calm":
        return "톤을 더 차분하고 신뢰감 있게. 단정한 어조, 호흡이 긴 문장.";
      case "expand":
        return "분량을 1.5~2배로 늘리세요. 예시/디테일 추가, 같은 메시지를 더 풍부하게.";
      case "shrink":
        return "분량을 절반 정도로 줄이세요. 핵심만 남기고 군더더기 제거.";
      default:
        return "톤은 그대로, 표현만 다듬어서 더 자연스럽게.";
    }
  })();

  const channelCtx = buildChannelContext(args.channelProfile);

  return `당신은 유튜브 대본 작성 전문가입니다. 아래 전체 원고 중 한 단락만 다시 작성하세요.

${channelCtx}

<전체 원고 (문맥 유지용)>
${args.fullScript.slice(0, 5000)}
</전체 원고>

<재작성 대상 단락 (index ${args.paragraphIndex})>
${args.paragraph}
</재작성 대상 단락>

**규칙**:
1. ${toneInstruction}
2. 시간 마커 [0:00-0:15 ...] 또는 [📌 본론 1] 형식이 있다면 그대로 유지.
3. 💡 B-roll: "..." 표시가 있다면 그것도 유지 또는 자연스럽게 보완.
4. 앞뒤 단락과 자연스럽게 연결 (문맥 깨지면 안 됨).
5. 응답은 새 단락 본문만. 메타 설명/따옴표/코드블록 X.

새 단락:`;
}
