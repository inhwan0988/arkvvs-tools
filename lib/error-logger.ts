/**
 * 전역 에러 로거 — 모든 도구의 server-side catch에서 호출.
 *
 * 사용:
 *   import { logServerError } from "@/lib/error-logger";
 *   try { ... } catch (e) {
 *     await logServerError(e, { toolSlug: "insta-planner", route: "/api/.../analyze" });
 *     return NextResponse.json({ error: friendlyMessage(e) }, { status: 500 });
 *   }
 *
 * fail-safe — logger 자체가 throw하지 않음 (catch + console.error만).
 */

import { createClient } from "@/lib/supabase/server";
import { createHash } from "node:crypto";

export interface ErrorLogInput {
  toolSlug?: string;
  route?: string;
  source?: "server" | "client" | "helper";
  level?: "error" | "warn" | "info";
  context?: Record<string, unknown>;
  userAgent?: string;
  statusCode?: number;
  ipHash?: string;
}

function fingerprintOf(message: string, route?: string): string {
  const key = `${route ?? ""}::${message.slice(0, 80)}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

export async function logServerError(
  err: unknown,
  input: ErrorLogInput = {},
): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const message =
      err instanceof Error ? err.message : String(err ?? "unknown error");
    const stack = err instanceof Error ? err.stack : null;

    await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      tool_slug: input.toolSlug ?? null,
      route: input.route ?? null,
      source: input.source ?? "server",
      level: input.level ?? "error",
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 5000) ?? null,
      context: input.context ?? {},
      user_agent: input.userAgent?.slice(0, 300) ?? null,
      status_code: input.statusCode ?? null,
      ip_hash: input.ipHash ?? null,
      fingerprint: fingerprintOf(message, input.route),
    });
  } catch (e) {
    // logger 자체가 fail하더라도 user 응답 흐름은 막지 않음
    console.error("[error-logger] insert failed:", e);
  }
}

/**
 * 잡힌 에러를 사용자 친화 메시지로 변환 + 로그 기록을 한 번에.
 */
export async function logAndFriendly(
  err: unknown,
  input: ErrorLogInput = {},
): Promise<{ message: string; statusCode: number }> {
  const statusCode =
    typeof (err as { status?: unknown })?.status === "number"
      ? ((err as { status: number }).status as number)
      : input.statusCode ?? 500;

  await logServerError(err, { ...input, statusCode });

  const raw = err instanceof Error ? err.message : String(err ?? "오류");
  return { message: raw, statusCode };
}
