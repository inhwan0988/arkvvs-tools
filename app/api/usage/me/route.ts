import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { QUOTA_POLICY, checkQuota } from "@/lib/usage/quota";

export const runtime = "nodejs";

/**
 * 로그인한 사용자의 툴/액션별 무료 남은 quota를 반환.
 * 프론트에서 배지/게이지 표시용.
 *
 * GET /api/usage/me → { quotas: { [toolSlug]: { [action]: {...} } } }
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const quotas: Record<string, Record<string, unknown>> = {};

  await Promise.all(
    Object.entries(QUOTA_POLICY).flatMap(([slug, actions]) =>
      Object.keys(actions).map(async (action) => {
        const result = await checkQuota(user.id, slug, action);
        if (!quotas[slug]) quotas[slug] = {};
        quotas[slug][action] = result;
      }),
    ),
  );

  return NextResponse.json({ quotas });
}
