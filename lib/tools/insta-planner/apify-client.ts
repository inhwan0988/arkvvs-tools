/**
 * Apify API client helper — run actor + fetch dataset.
 *
 * Vercel function timeout 60초 안에 완료되도록 run-sync-get-dataset-items 사용.
 * 큰 작업은 별도 polling 패턴 필요 (현재 MVP에서는 sync로 충분).
 */

const APIFY_BASE = "https://api.apify.com/v2";

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN이 설정되지 않았어요. Vercel Settings → Environment Variables에 등록 필요.",
    );
  }
  return token;
}

/**
 * Apify actor를 sync 방식으로 실행하고 dataset items 반환.
 * 60초 안에 완료되는 작업에만 사용 (Vercel function timeout).
 *
 * @param actorId 예: "apify/instagram-profile-scraper" (URL safe form)
 * @param input actor input JSON
 * @param timeoutSec actor 실행 timeout (default 60s)
 */
export async function runActorSync<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSec: number = 60,
): Promise<T[]> {
  const token = getToken();
  // actorId의 '/'를 '~'로 치환 (Apify URL convention)
  const safeActorId = actorId.replace("/", "~");
  const url = `${APIFY_BASE}/acts/${safeActorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSec}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as T[];
  if (!Array.isArray(data)) {
    throw new Error("Apify 응답이 array가 아닙니다.");
  }
  return data;
}

/**
 * @핸들 정리 — '@username' / 'username' / 'https://...' 어떤 형태든 username만 추출
 */
export function normalizeUsername(input: string): string {
  let s = input.trim();
  // URL 형식
  const urlMatch = s.match(/instagram\.com\/([\w.]+)/i);
  if (urlMatch) return urlMatch[1];
  // @ 제거
  s = s.replace(/^@/, "");
  // 공백 등 제거
  s = s.split(/\s/)[0];
  return s.toLowerCase();
}
