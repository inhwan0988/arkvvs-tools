/**
 * Helper 페어링 코드 — 6자리 숫자.
 * 충돌 가능성 매우 낮음 (1/1,000,000) + 10분 만료 + 1회용.
 */
export function generatePairingCode(): string {
  // crypto-strong 6-digit
  const arr = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 4; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  const n =
    ((arr[0] << 24) | (arr[1] << 16) | (arr[2] << 8) | arr[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}

export function pairingCodeExpiry(): Date {
  return new Date(Date.now() + 10 * 60_000);
}

export function formatPairingCode(code: string): string {
  // "123456" → "123 456"
  return code.slice(0, 3) + " " + code.slice(3);
}
