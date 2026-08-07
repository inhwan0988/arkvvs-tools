import { createAdminClient } from "@/lib/supabase/admin";
import { calcCostUsd } from "./pricing";

export type Provider = "anthropic" | "openai";
export type UsageStatus = "ok" | "error" | "blocked";

export type LogUsageInput = {
  userId: string;
  toolSlug: string;
  action: string;
  provider: Provider;
  model?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  usedOwnKey: boolean;
  status?: UsageStatus;
  errorMessage?: string | null;
};

/**
 * usage_logs 삽입. 실패해도 throw 하지 않음 — 로깅 실패가 사용자 요청을 깨면 안 됨.
 * service_role 키로 실행 → RLS 우회.
 */
export async function logUsage(input: LogUsageInput): Promise<void> {
  try {
    const tokensIn = input.tokensIn ?? 0;
    const tokensOut = input.tokensOut ?? 0;
    const cost =
      input.status === "blocked" ? 0 : calcCostUsd(input.model, tokensIn, tokensOut);

    const admin = createAdminClient();
    const { error } = await admin.from("usage_logs").insert({
      user_id: input.userId,
      tool_slug: input.toolSlug,
      action: input.action,
      provider: input.provider,
      model: input.model ?? null,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: cost,
      used_own_key: input.usedOwnKey,
      status: input.status ?? "ok",
      error_message: input.errorMessage ?? null,
    });
    if (error) console.error("[usage.logger] insert error:", error.message);
  } catch (e) {
    console.error("[usage.logger] unexpected error:", e);
  }
}

/** Anthropic messages API 응답에서 usage 추출 */
export function extractAnthropicUsage(res: unknown): {
  input: number;
  output: number;
} {
  const r = res as {
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  return {
    input: r?.usage?.input_tokens ?? 0,
    output: r?.usage?.output_tokens ?? 0,
  };
}

/** OpenAI chat/completions 응답에서 usage 추출 */
export function extractOpenAIUsage(res: unknown): {
  input: number;
  output: number;
} {
  const r = res as {
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    input: r?.usage?.prompt_tokens ?? 0,
    output: r?.usage?.completion_tokens ?? 0,
  };
}
