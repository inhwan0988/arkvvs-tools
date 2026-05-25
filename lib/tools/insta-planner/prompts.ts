import type {
  ContentIdea,
  InstaProfile,
  ReelAnalysis,
  ReelResult,
  UserIntent,
} from "./types";
import { APPROACH_LABELS } from "./types";

function buildProfileContext(profile: InstaProfile | null | undefined): string {
  if (!profile || !profile.username) return "";
  const parts: string[] = ["<내 인스타 채널 프로필>"];
  if (profile.username) parts.push(`username: @${profile.username}`);
  if (profile.fullName) parts.push(`이름: ${profile.fullName}`);
  if (profile.niche) parts.push(`주제: ${profile.niche}`);
  if (profile.followerCount) parts.push(`팔로워: ${profile.followerCount.toLocaleString()}`);
  if (profile.averageLikes)
    parts.push(`평균 좋아요: ${profile.averageLikes.toLocaleString()}`);
  if (profile.averageViews)
    parts.push(`평균 조회수(릴스): ${profile.averageViews.toLocaleString()}`);
  if (profile.tone) parts.push(`톤: ${profile.tone}`);
  if (profile.targetAudience) parts.push(`타겟: ${profile.targetAudience}`);
  if (profile.commonHookPatterns?.length)
    parts.push(`자주 쓰는 후킹: ${profile.commonHookPatterns.join(", ")}`);
  parts.push("</내 인스타 채널 프로필>");
  return parts.join("\n");
}

function buildIntentContext(intent: UserIntent | null | undefined): string {
  if (!intent) return "";
  const parts = ["<사용자가 명시한 의도 (반드시 100% 반영)>"];
  if (intent.approach) parts.push(`접근: ${APPROACH_LABELS[intent.approach]}`);
  if (intent.freeText?.trim()) parts.push(`구체: ${intent.freeText.trim()}`);
  parts.push("</사용자 의도>");
  parts.push("");
  parts.push("⚠️ 사용자 의도와 맞지 않는 방향은 절대 추천하지 마세요.");
  return parts.join("\n");
}

/**
 * 릴스 분석 prompt — 캡션을 기반으로 (음성 transcript 없음 가정).
 */
export function buildAnalyzeReelPrompt(reel: ReelResult): string {
  return `당신은 Instagram 콘텐츠 분석 전문가입니다.

다음은 인스타 @${reel.ownerUsername} 채널의 ${reel.type === "reel" ? "릴스" : "포스트"} 정보입니다.

<캡션>
${reel.caption || "(캡션 없음)"}
</캡션>

<지표>
- 팔로워: ${reel.ownerFollowers.toLocaleString()}
- 좋아요: ${reel.likeCount.toLocaleString()}
- 댓글: ${reel.commentCount.toLocaleString()}
${reel.viewCount > 0 ? `- 조회수: ${reel.viewCount.toLocaleString()}` : ""}
- IVS (조회/팔로워): ${reel.ivs}배
- 참여율: ${reel.engagementRate}%
</지표>

이 콘텐츠를 분석해서 JSON 형식으로 다음을 추출해주세요:

1. coreTheme: 한 줄 핵심 (15-30자)
2. structure:
   - hook: 첫 3초/첫 줄 후킹 추정
   - body: 본론 핵심 포인트 2-4개
   - cta: 마무리/CTA
3. hookPatterns: 사용된 후킹 패턴 2-4개
4. targetAudience: 타겟 시청자
5. viralReasons: 떡상 추정 이유 2-3개
6. borrowableAngles: 다른 크리에이터가 빌릴 만한 angle 2-4개
7. visualStyle: 시각 스타일 추정 (캡션 톤에서 추정)
8. captionStyle: 캡션 구성 패턴 (3줄 후킹/이모지 활용 등)

⚠️ JSON 규칙:
- 큰따옴표 사용. 문자열 안 큰따옴표는 작은따옴표로
- 응답은 { 시작 } 종료. 코드블록 X.

응답 형식:
{
  "coreTheme": "...",
  "structure": { "hook": "...", "body": ["..."], "cta": "..." },
  "hookPatterns": ["..."],
  "targetAudience": "...",
  "viralReasons": ["..."],
  "borrowableAngles": ["..."],
  "visualStyle": "...",
  "captionStyle": "..."
}`;
}

/**
 * 콘텐츠 아이디어 10개 생성 prompt — 사용자 의도 + 분석 결과 반영.
 */
export function buildIdeasPrompt(
  reel: ReelResult,
  analysis: ReelAnalysis,
  options?: {
    profile?: InstaProfile | null;
    userIntent?: UserIntent | null;
    targetFormat?: "reel" | "post" | "carousel" | "any";
  },
): string {
  const profileCtx = buildProfileContext(options?.profile);
  const intentCtx = buildIntentContext(options?.userIntent);
  const fmtHint =
    options?.targetFormat && options.targetFormat !== "any"
      ? `\n주로 ${options.targetFormat === "reel" ? "릴스" : options.targetFormat === "carousel" ? "캐러셀" : "단일 피드"} 형식으로 추천.`
      : "";

  return `당신은 Instagram 콘텐츠 기획 전문가입니다. 사용자 의도를 100% 반영해서 맞춤형 아이디어를 만들어주세요.

${intentCtx}

${profileCtx}

<분석한 영감 콘텐츠>
채널: @${reel.ownerUsername} (팔로워 ${reel.ownerFollowers.toLocaleString()})
타입: ${reel.type}
핵심: ${analysis.coreTheme}
빌릴 만한 angle: ${analysis.borrowableAngles.join(", ")}
사용된 후킹: ${analysis.hookPatterns.join(", ")}
타겟: ${analysis.targetAudience}
</분석한 영감 콘텐츠>

위 의도와 분석을 바탕으로, ${
    options?.profile ? "내 채널 톤/규모에 맞춰" : ""
  } Instagram 콘텐츠 아이디어 10개를 만들어주세요.${fmtHint}

각 아이디어는 다음을 포함:
- title: 콘텐츠 제목 (15-30자)
- description: 핵심 내용 (2-3문장)
- format: "reel" | "post" | "carousel"
- hook: 첫 3초/첫 줄 후킹 라인
- bodyStructure: 본론 구성 (릴스면 시간 순, 캐러셀이면 슬라이드 순)
- cta: 마무리 CTA
- caption: Instagram 본문 캡션 (이모지 + 줄바꿈)
- hashtags: 해시태그 10개 (큰 #3 + 중간 #5 + 작은 #2)
- musicSuggestion: 음악 스타일 추천 (릴스만, "BPM 130+ 업비트" 등)
- visualGuide: 시각 가이드 (한 줄)
- expectedReach: 예상 도달 (예: "1만~5만")
- difficulty: { "filming": 1-3, "editing": 1-3 }

⚠️ JSON 배열만 응답. 코드블록 X. 문자열 안 큰따옴표는 작은따옴표로.

응답:
[
  {
    "id": 1,
    "title": "...",
    "description": "...",
    "format": "reel",
    "hook": "...",
    "bodyStructure": ["..."],
    "cta": "...",
    "caption": "...",
    "hashtags": ["#태그1", ...],
    "musicSuggestion": "...",
    "visualGuide": "...",
    "expectedReach": "...",
    "difficulty": { "filming": 2, "editing": 2 }
  }
]`;
}

/**
 * 선택된 아이디어 → 상세 대본/기획서 streaming prompt.
 */
export function buildScriptPrompt(
  idea: ContentIdea,
  reel: ReelResult,
  options?: {
    profile?: InstaProfile | null;
    userIntent?: UserIntent | null;
  },
): string {
  const profileCtx = buildProfileContext(options?.profile);
  const intentCtx = buildIntentContext(options?.userIntent);
  return `당신은 Instagram 콘텐츠 대본 작성 전문가입니다.

${intentCtx}

${profileCtx}

<만들 콘텐츠>
형식: ${idea.format}
제목: ${idea.title}
설명: ${idea.description}
후킹: ${idea.hook}
CTA: ${idea.cta}
</만들 콘텐츠>

<영감 콘텐츠>
@${reel.ownerUsername}: ${reel.caption.slice(0, 500)}
</영감 콘텐츠>

위 내용을 바탕으로 ${idea.format === "reel" ? "릴스" : idea.format === "carousel" ? "캐러셀 (1-10 슬라이드)" : "단일 피드"} 상세 기획서를 작성해주세요.

${
  idea.format === "reel"
    ? `**릴스 대본 구조**:
[0:00-0:03 🎬 후킹]
강력한 한 줄 + 시각 효과 안내

[0:03-0:15 📱 본론 1]
첫 번째 핵심 포인트
💡 텍스트 오버레이: "..."
💡 시각: "..."

[0:15-0:35 📱 본론 2-3]
나머지 핵심 포인트

[0:35-0:50 🎯 CTA]
저장/공유 유도

[0:50-0:60 마무리]

📝 캡션:
[3줄 후킹]
[본론 요약]
[CTA]

🏷️ 해시태그 (큰 + 중간 + 작은 조합):
#... #... #...

🎵 음악 스타일:
...
`
    : `**${idea.format === "carousel" ? "캐러셀" : "피드"} 기획서**:

[Slide 1] 후킹 - 큰 텍스트
[Slide 2-5] 핵심 정보 1개씩
[Slide 6] 요약 + CTA

📝 캡션:
...

🏷️ 해시태그:
...
`
}

상세 기획서 본문만 작성. 메타 설명 X.`;
}
