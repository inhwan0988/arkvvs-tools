/**
 * 한 주제 → Claude로 플랫폼별 캡션 자동 생성.
 *
 * 각 플랫폼 특성:
 *  - Instagram: 길고 감성적, 줄바꿈 많이, 해시태그 5-10개
 *  - Facebook: 길게 풀어 설명 OK, 해시태그 2-3개
 *  - Threads: 짧고 위트, 500자 이내, 해시태그 1-2개
 *  - X: 280자 엄수, 후킹 + 한 줄, 해시태그 1-2개
 *  - TikTok: 짧은 후킹 + 트렌딩 해시태그
 *  - YouTube Shorts: 후킹 + CTA
 */

import type { SpreadPlatform } from "./types";

const PLATFORM_INSTRUCTIONS: Record<SpreadPlatform, string> = {
  instagram_business:
    "Instagram용 — 감성적이고 시각적인 톤. 줄바꿈을 적극 사용해 시각적으로 정돈. 첫 문장은 강한 후킹. 마지막에 해시태그 5-10개 (#... 형식). 최대 2200자.",
  facebook_page:
    "Facebook Page용 — 친근하고 길게 풀어 설명. 스토리텔링. 해시태그는 2-3개 정도. 5000자 이내.",
  threads:
    "Threads용 — 짧고 위트있게. 한국 토픽이면 한국 트렌드 어휘. 해시태그 1-2개. 500자 엄수 (반드시).",
  tiktok:
    "TikTok용 — 짧은 후킹 + 트렌딩 해시태그 (영문/한국어 혼용). 200자 이내. 첫 줄에 강한 후킹.",
  youtube:
    "YouTube Shorts 설명용 — 후킹 1줄 + 본문 2줄 + CTA. 해시태그 3-5개. 5000자 이내지만 짧게.",
  x: "X(Twitter)용 — 280자 엄수. 단 한 문장의 강한 후킹 + 해시태그 1-2개. 줄임 표현 OK.",
};

export function buildAiCaptionPrompt(
  topic: string,
  platforms: SpreadPlatform[],
): string {
  const sections = platforms
    .map((p) => `### ${p}\n${PLATFORM_INSTRUCTIONS[p]}`)
    .join("\n\n");

  return `당신은 SNS 콘텐츠 마케팅 카피라이터입니다. 같은 주제에 대해 각 플랫폼 톤에 맞는 캡션을 생성해주세요.

# 주제
${topic}

# 플랫폼별 가이드라인
${sections}

# 출력 형식 (반드시 이 JSON 형식. 다른 텍스트 금지)
{
${platforms.map((p) => `  "${p}": "캡션 내용"`).join(",\n")}
}

⚠️ 규칙:
- 큰따옴표 안 문자열에 큰따옴표가 필요하면 작은따옴표로 대체
- 줄바꿈은 \\n으로 escape
- 각 플랫폼 글자수 제한 엄수 (X 280, Threads 500)
- 응답은 { 로 시작 } 로 종료, 코드블록 X`;
}
