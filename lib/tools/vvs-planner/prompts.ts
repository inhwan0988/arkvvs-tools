import type { ChannelProfile, ReferenceVideo } from "./types";

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
  },
): string {
  const channelCtx = buildChannelContext(options?.channelProfile);
  const refCtx = buildReferenceContext(options?.referenceVideos);
  const hasContext = !!(channelCtx || refCtx);

  return `당신은 유튜브 콘텐츠 기획 전문가입니다.${
    hasContext
      ? " 사용자의 채널 컨텍스트와 참고 영상을 면밀히 고려해서 맞춤형 추천을 해주세요."
      : ""
  }

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

반드시 JSON 배열로만 응답. 다른 텍스트 X:
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

export function buildScriptPrompt(
  topic: { title: string; description: string; angle: string },
  transcript: string,
  videoTitle: string,
  options?: {
    channelProfile?: ChannelProfile | null;
    referenceVideos?: ReferenceVideo[] | null;
  },
): string {
  const channelCtx = buildChannelContext(options?.channelProfile);
  const refCtx = buildReferenceContext(options?.referenceVideos);

  const targetMin = options?.channelProfile?.avgDurationSeconds
    ? Math.max(3, Math.round(options.channelProfile.avgDurationSeconds / 60))
    : 8;
  const targetChars = targetMin * 1000; // 분당 약 1000자 한국어 발화 기준 추정

  return `당신은 유튜브 대본 작성 전문가입니다.${
    channelCtx ? " 사용자의 채널 톤/말투에 정확히 맞춰 작성해주세요." : ""
  }

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
