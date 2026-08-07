/**
 * 모델별 가격표 — USD per 1M tokens.
 * 새 모델 추가 시 여기만 업데이트하면 됨.
 * 모르는 모델은 conservative fallback (Sonnet 가격) 사용.
 */
export const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic Claude
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-3-5-sonnet-latest": { input: 3, output: 15 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-5-haiku-latest": { input: 0.8, output: 4 },

  // OpenAI (fallback provider)
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
};

const FALLBACK = { input: 3, output: 15 };

export function calcCostUsd(
  model: string | null | undefined,
  tokensIn: number,
  tokensOut: number,
): number {
  const p = (model && PRICING[model]) || FALLBACK;
  return (tokensIn * p.input + tokensOut * p.output) / 1_000_000;
}
