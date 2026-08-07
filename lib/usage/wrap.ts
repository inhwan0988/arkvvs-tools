import { NextResponse } from "next/server";
import { checkQuota, quotaExceededMessage } from "./quota";
import { logUsage, type Provider } from "./logger";

export type QuotaContext = {
  userId: string;
  toolSlug: string;
  action: string;
  provider: Provider;
  usedOwnKey: boolean;
};

/**
 * Quota 체크 후 초과 시 429 응답 반환, 통과면 null.
 * used_own_key=true(BYOK)는 quota 건너뜀.
 * 초과 케이스는 status='blocked'로 usage_logs에도 남겨서 어뷰징 감지 가능.
 */
export async function enforceQuota(
  ctx: QuotaContext,
): Promise<NextResponse | null> {
  if (ctx.usedOwnKey) return null;

  const result = await checkQuota(ctx.userId, ctx.toolSlug, ctx.action);
  if (result.unlimited) return null;
  if (result.allowed) return null;

  await logUsage({
    userId: ctx.userId,
    toolSlug: ctx.toolSlug,
    action: ctx.action,
    provider: ctx.provider,
    usedOwnKey: false,
    status: "blocked",
    errorMessage: `quota:${result.window}:${result.limit}`,
  });

  return NextResponse.json(
    {
      error: quotaExceededMessage(result),
      quota: {
        window: result.window,
        limit: result.limit,
        used: result.used,
        remaining: 0,
        resetAt: result.resetAt,
      },
    },
    { status: 429 },
  );
}
