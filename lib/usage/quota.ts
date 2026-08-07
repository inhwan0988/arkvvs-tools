import { createAdminClient } from "@/lib/supabase/admin";

export type QuotaWindow = "daily" | "weekly";
export type QuotaRule = { window: QuotaWindow; limit: number };

/**
 * 무료 티어 사용량 제한. 사용자가 자기 API 키를 넣으면 이 quota는 소진되지 않음.
 * 조슈아 지갑(월 예산 ~$70) 보호 + 어뷰징 차단이 목적.
 *
 * 정책은 100명 × 월 $70 기준. 툴별로 부하 감안:
 * - light: search / analyze-video / transcript 등 (일 5-10)
 * - medium: topics / interview-questions (일 3-5)
 * - heavy: script / regenerate-paragraph (주 2-3 or 일 소량)
 */
export const QUOTA_POLICY: Record<string, Record<string, QuotaRule>> = {
  "vvs-planner": {
    search: { window: "daily", limit: 5 },
    "analyze-video": { window: "daily", limit: 10 },
    transcript: { window: "daily", limit: 10 },
    "profile-channel": { window: "daily", limit: 3 },
    topics: { window: "daily", limit: 5 },
    "interview-questions": { window: "daily", limit: 5 },
    script: { window: "weekly", limit: 3 },
    "regenerate-paragraph": { window: "daily", limit: 10 },
  },
  "youtube-setup": {
    generate: { window: "daily", limit: 5 },
  },
  "insta-viral-planner": {
    "analyze-reel": { window: "daily", limit: 5 },
    "generate-ideas": { window: "daily", limit: 3 },
    "generate-script": { window: "weekly", limit: 3 },
  },
};

export type QuotaCheckResult =
  | { unlimited: true }
  | {
      unlimited: false;
      allowed: boolean;
      limit: number;
      used: number;
      remaining: number;
      window: QuotaWindow;
      resetAt: string; // ISO
    };

/**
 * KST(Asia/Seoul) 기준 daily/weekly 윈도우 시작.
 * daily = KST 00:00, weekly = KST 월요일 00:00.
 */
function windowStartKst(window: QuotaWindow, now: Date = new Date()): Date {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();

  if (window === "daily") {
    return new Date(Date.UTC(y, m, d) - KST_OFFSET_MS);
  }
  // weekly: 월요일 시작 (getUTCDay: 0=Sun, 1=Mon, ...)
  const dow = kstNow.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  return new Date(Date.UTC(y, m, d - daysSinceMonday) - KST_OFFSET_MS);
}

function windowEndKst(window: QuotaWindow, now: Date = new Date()): Date {
  const start = windowStartKst(window, now);
  const addDays = window === "daily" ? 1 : 7;
  return new Date(start.getTime() + addDays * 24 * 60 * 60 * 1000);
}

/**
 * 사용자가 이 액션을 지금 수행할 수 있는지 확인.
 * used_own_key = true 인 로그는 quota에서 제외 (자기 키 쓰면 무제한).
 * status = 'ok' 인 것만 카운트 (에러/차단은 무료 quota 안 씀).
 *
 * DB 에러 시 fail-open (허용) — 사용자 차단하는 것보단 낫다.
 */
export async function checkQuota(
  userId: string,
  toolSlug: string,
  action: string,
): Promise<QuotaCheckResult> {
  const rule = QUOTA_POLICY[toolSlug]?.[action];
  if (!rule) return { unlimited: true };

  const now = new Date();
  const start = windowStartKst(rule.window, now);
  const end = windowEndKst(rule.window, now);

  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("tool_slug", toolSlug)
      .eq("action", action)
      .eq("status", "ok")
      .eq("used_own_key", false)
      .gte("created_at", start.toISOString());

    if (error) {
      console.error("[quota.check] db error:", error.message);
      return { unlimited: true };
    }

    const used = count ?? 0;
    const remaining = Math.max(0, rule.limit - used);
    return {
      unlimited: false,
      allowed: remaining > 0,
      limit: rule.limit,
      used,
      remaining,
      window: rule.window,
      resetAt: end.toISOString(),
    };
  } catch (e) {
    console.error("[quota.check] unexpected:", e);
    return { unlimited: true };
  }
}

/**
 * 429 응답용 표준 메시지. UI에서 파싱해서 배지/모달로 안내.
 */
export function quotaExceededMessage(result: Extract<QuotaCheckResult, { unlimited: false }>): string {
  const windowLabel = result.window === "daily" ? "일일" : "주간";
  return `${windowLabel} 무료 사용 한도(${result.limit}회)를 모두 사용했습니다. 우측 상단 설정에서 본인 API 키를 입력하면 계속 사용할 수 있어요.`;
}
