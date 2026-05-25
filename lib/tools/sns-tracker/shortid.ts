/**
 * 충돌 가능성 낮은 짧은 URL ID 생성기.
 * 7글자 base62 → 62^7 ≈ 35억 가지 (충돌 거의 없음).
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateShortId(length: number = 7): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

/** 클라이언트 + 서버 모두에서 정의된 host 기반으로 단축 URL build */
export function buildShortUrl(baseUrl: string, shortId: string): string {
  return `${baseUrl.replace(/\/$/, "")}/r/${shortId}`;
}
