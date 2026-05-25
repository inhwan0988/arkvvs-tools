/**
 * 주간 best/worst 콘텐츠에 대한 Claude 분석 prompt 빌더.
 */
import { PLATFORM_META, type SnsContentStats } from "./types";

export function buildWeeklyAnalysisPrompt(args: {
  weekStart: string;
  best: SnsContentStats | null;
  worst: SnsContentStats | null;
  allContents: SnsContentStats[];
}): string {
  const { weekStart, best, worst, allContents } = args;

  const summary = `# 이번 주 데이터 요약
- 분석 주: ${weekStart} 시작 (월요일)
- 게시된 콘텐츠: ${allContents.length}개
- 총 조회수: ${formatNum(allContents.reduce((s, c) => s + (c.views ?? 0), 0))}
- 총 링크 클릭: ${formatNum(allContents.reduce((s, c) => s + (c.click_count ?? 0), 0))}`;

  const formatContent = (c: SnsContentStats | null, label: string): string => {
    if (!c) return `## ${label}\n(데이터 없음)`;
    const meta = PLATFORM_META[c.platform];
    return `## ${label}: "${c.title}"
- 플랫폼: ${meta.label}
- 게시일: ${new Date(c.posted_at).toLocaleString("ko-KR")}
- 조회수: ${formatNum(c.views ?? 0)}
- 링크 클릭: ${formatNum(c.click_count ?? 0)}
- 전환율 (클릭/조회수): ${(c.conversion_rate_pct ?? 0).toFixed(2)}%`;
  };

  const listOthers = allContents
    .filter((c) => c.content_id !== best?.content_id && c.content_id !== worst?.content_id)
    .slice(0, 8)
    .map(
      (c, i) =>
        `${i + 1}. [${PLATFORM_META[c.platform].label}] ${c.title} — 조회 ${formatNum(c.views ?? 0)} · 클릭 ${formatNum(c.click_count ?? 0)} · 전환 ${(c.conversion_rate_pct ?? 0).toFixed(2)}%`,
    )
    .join("\n");

  return `당신은 SNS 콘텐츠 마케팅 분석가입니다. 이번 주 한 크리에이터의 SNS 콘텐츠 데이터를 보고, 베스트 콘텐츠의 잘된 점과 워스트 콘텐츠의 개선점을 분석해주세요.

${summary}

${formatContent(best, "🏆 베스트 콘텐츠 (클릭 가장 많음)")}

${formatContent(worst, "📉 워스트 콘텐츠 (전환율 가장 낮음)")}

${listOthers ? `## 그 외 콘텐츠\n${listOthers}` : ""}

다음 형식으로 분석해주세요. 마크다운 안 쓰고 평이한 한국어로, 구체적이고 실용적으로:

**🏆 베스트의 잘된 점 (3가지)**
1. [구체적 분석 — 제목/플랫폼/타이밍/타겟 등 무엇이 잘 먹혔는지]
2. [...]
3. [...]

**📉 워스트의 개선점 (3가지)**
1. [무엇이 약했는지 + 다음에 시도할 변화]
2. [...]
3. [...]

**🎯 이번 주 인사이트 1줄**
[크리에이터가 다음 주 콘텐츠 기획할 때 가져갈 한 줄 교훈]

**📅 다음 주 추천 액션 (2가지)**
1. [구체적인 다음 콘텐츠 실험]
2. [...]

⚠️ 주의:
- 추상적인 조언(예: "더 좋은 콘텐츠 만들기") 금지. 구체적인 변화 제시.
- 데이터로 뒷받침. "조회수는 X였지만 클릭은 Y에 그쳤음" 같은 식.
- 크리에이터의 의욕을 꺾지 말되, 단순 칭찬도 금지. 솔직하게.
- 응답은 위 형식 그대로. 다른 설명 X. 마크다운 헤더(#)도 쓰지 마.`;
}

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}
