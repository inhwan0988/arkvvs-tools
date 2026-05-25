/**
 * YouTube 영상 description fetch + 정제.
 * 자막 추출 fail 시 fallback으로 사용.
 *
 * 한계: 모든 영상에 의미 있는 description이 있는 건 아님.
 *      광고/링크/해시태그만 있으면 cleaned 결과가 짧아 isUseful=false 반환.
 */

const YT_BASE = "https://www.googleapis.com/youtube/v3";

export async function fetchVideoDescription(
  videoId: string,
  youtubeApiKey: string,
): Promise<string> {
  if (!youtubeApiKey?.trim()) return "";
  // 사용자 키 여러 개 쉼표 구분 가능 — 첫 번째만 시도 (description은 quota 매우 적음)
  const apiKey = youtubeApiKey.split(/[,\n]/)[0].trim();
  if (!apiKey) return "";

  try {
    const url = `${YT_BASE}/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const data = (await res.json()) as {
      items?: Array<{ snippet?: { description?: string } }>;
    };
    return data.items?.[0]?.snippet?.description ?? "";
  } catch {
    return "";
  }
}

/**
 * description에서 noise 제거.
 * - URL 제거 (http/https)
 * - 해시태그 제거 (#xxx)
 * - 너무 짧은 줄(10자 미만) 제거 → 광고 멘트, 인사말 같은 거 정리
 * - 광고 keywords 줄 제거
 * - 타임스탬프(0:00) 줄은 유지 (영상 흐름 힌트)
 */
export function cleanDescription(raw: string): string {
  if (!raw) return "";

  // 광고/스폰서 관련 키워드 — 이 단어 들어간 줄은 통째로 제거
  const adPatterns = [
    /비즈니스\s*문의/i,
    /광고\s*문의/i,
    /협찬\s*문의/i,
    /sponsorship/i,
    /business\s*inquiry/i,
    /구독\s*[*및과+]?\s*좋아요/i,
    /구독\s*부탁/i,
    /채널\s*구독/i,
  ];

  const cleaned = raw
    // URL 제거 (http/https + 흔한 짧은 도메인)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/www\.\S+/g, "")
    // 해시태그 제거 (#키워드)
    .replace(/#\S+/g, "")
    // 이메일 제거
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 10) return false; // 너무 짧은 줄 (인사말, 단독 이모지 등)
      if (adPatterns.some((p) => p.test(l))) return false;
      return true;
    })
    .join("\n")
    .trim();

  return cleaned;
}

/**
 * description이 의미 있는 컨텐츠를 담고 있는지 판단.
 * 100자 이상이면 어느 정도 가치 있다고 봄 (광고/링크만 있으면 cleaned 후 100자 미만).
 */
export function isDescriptionUseful(cleaned: string): boolean {
  return cleaned.length >= 100;
}
