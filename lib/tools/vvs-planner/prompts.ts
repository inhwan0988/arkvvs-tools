export function buildTopicPrompt(
  transcript: string,
  videoTitle: string,
  channelTitle: string,
): string {
  return `당신은 유튜브 콘텐츠 기획 전문가입니다.

아래는 "${channelTitle}" 채널의 "${videoTitle}" 영상 자막입니다.

<자막>
${transcript.slice(0, 8000)}
</자막>

이 영상의 주제와 같은 분야에서, 새로운 유튜브 영상으로 만들 수 있는 독창적인 주제 10개를 제안해주세요.

각 주제는 다음을 포함해야 합니다:
- title: 유튜브 영상 제목 (클릭을 유도하는 매력적인 제목)
- description: 영상에서 다룰 핵심 내용 요약 (2-3문장)
- angle: 기존 영상과 차별화되는 독특한 관점이나 접근법
- appeal: 시청자가 이 영상을 클릭할 만한 매력 포인트

반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요:
[
  {
    "id": 1,
    "title": "제목",
    "description": "설명",
    "angle": "독특한 각도",
    "appeal": "매력 포인트"
  }
]`;
}

export function buildScriptPrompt(
  topic: { title: string; description: string; angle: string },
  transcript: string,
  videoTitle: string,
): string {
  return `당신은 유튜브 대본 작성 전문가입니다.

아래는 참고할 목표 영상의 자막입니다:
<목표영상 제목>${videoTitle}</목표영상 제목>
<목표영상 자막>
${transcript.slice(0, 6000)}
</목표영상 자막>

위 영상의 구조와 말투를 참고하여, 아래 주제로 유튜브 대본을 작성해주세요:

<주제>
제목: ${topic.title}
설명: ${topic.description}
독특한 각도: ${topic.angle}
</주제>

대본 작성 규칙:
1. 총 글자수: 7,000~8,000자 (한국어 기준)
2. 구조:
   - 🎬 인트로 (300-500자): 강력한 후킹으로 시작, 영상을 끝까지 봐야 하는 이유 제시
   - 📌 본론 1 (1,500-2,500자): 핵심 내용 전달
   - 📌 본론 2 (1,500-2,500자): 심화 내용 또는 사례
   - 📌 본론 3 (1,500-2,500자): 실전 적용 방법 또는 반전
   - 🎯 아웃트로 (300-500자): 요약 + 구독/좋아요 유도
3. 유튜브 말투: ~요체, 자연스러운 구어체, 시청자에게 말하듯이
4. 중간중간 "그런데 여기서 중요한 게 있습니다", "많은 분들이 모르시는 건데요" 같은 후킹 멘트 포함
5. 각 본론 사이에 자연스러운 전환 문구 사용

대본만 작성해주세요. 구조 표시(🎬, 📌, 🎯)는 포함하되, 그 외 메타 설명은 제외해주세요.`;
}
