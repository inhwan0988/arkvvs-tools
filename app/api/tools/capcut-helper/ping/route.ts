import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { authDevice } from "@/lib/tools/capcut-helper/device-auth";

export const runtime = "nodejs";

/**
 * Helper가 살아있다 알림 + 페어링 상태 + pending 명령 조회.
 * Helper는 5초마다 polling.
 *
 * Auth: Bearer {deviceId}.{deviceSecret}
 *
 * Returns: { paired: boolean, userId, pendingJobs: [...job rows with status='pending_apply' or 'pending_analysis'] }
 */
export async function POST(req: NextRequest) {
  const authed = await authDevice(req);
  if (authed instanceof NextResponse) return authed;

  const admin = createSnsAdminClient();

  // Helper 버전 헤더 → DB 갱신 (옵션 — 없어도 OK)
  const helperVersion = req.headers.get("x-helper-version");
  if (helperVersion && /^[\w.-]{1,20}$/.test(helperVersion)) {
    await admin
      .from("capcut_devices")
      .update({ helper_version: helperVersion })
      .eq("id", authed.deviceId);
  }

  if (!authed.userId) {
    // 아직 페어링 안 됨 — paired=false 반환
    return NextResponse.json({ paired: false, pendingJobs: [] });
  }

  // Helper가 처리해야 할 jobs (apply 명령 받은 것들)
  const { data: jobs, error } = await admin
    .from("capcut_jobs")
    .select("*")
    .eq("device_id", authed.deviceId)
    .in("status", ["pending_apply"]) // 적용 대기
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    paired: true,
    userId: authed.userId,
    pendingJobs: jobs ?? [],
  });
}
