import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { authDevice } from "@/lib/tools/capcut-helper/device-auth";

export const runtime = "nodejs";

/**
 * Helper가 Supabase Storage에 audio mp3 upload 하기 위한 signed URL 발급.
 * Body: { jobId }
 * Returns: { uploadUrl, path }
 */
export async function POST(req: NextRequest) {
  const authed = await authDevice(req);
  if (authed instanceof NextResponse) return authed;
  if (!authed.userId) return NextResponse.json({ error: "페어링 필요" }, { status: 403 });

  const body = (await req.json()) as { jobId: string };
  if (!body.jobId) return NextResponse.json({ error: "jobId 필수" }, { status: 400 });

  const admin = createSnsAdminClient();

  // job 검증
  const { data: job, error: jobErr } = await admin
    .from("capcut_jobs")
    .select("id, user_id, device_id")
    .eq("id", body.jobId)
    .eq("device_id", authed.deviceId)
    .maybeSingle();
  if (jobErr || !job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const path = `${job.user_id}/${job.id}.mp3`;

  // Supabase Storage signed upload URL (10분 만료)
  const { data, error } = await admin.storage
    .from("capcut-audio")
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path,
  });
}
