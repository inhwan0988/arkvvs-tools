import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { authDevice } from "@/lib/tools/capcut-helper/device-auth";

export const runtime = "nodejs";

/** Helper가 job status / output paths 업데이트 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authed = await authDevice(req);
  if (authed instanceof NextResponse) return authed;

  const { jobId } = await params;
  const body = (await req.json()) as {
    status?: string;
    audioStoragePath?: string;
    outputVideoPath?: string;
    outputSrtPath?: string;
    outputGuidePath?: string;
    errorMessage?: string;
  };

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.audioStoragePath !== undefined) {
    patch.audio_storage_path = body.audioStoragePath;
    if (body.audioStoragePath) patch.audio_uploaded_at = new Date().toISOString();
  }
  if (body.outputVideoPath !== undefined) patch.output_video_path = body.outputVideoPath;
  if (body.outputSrtPath !== undefined) patch.output_srt_path = body.outputSrtPath;
  if (body.outputGuidePath !== undefined) patch.output_guide_path = body.outputGuidePath;
  if (body.errorMessage !== undefined) patch.error_message = body.errorMessage;

  const admin = createSnsAdminClient();
  const { error } = await admin
    .from("capcut_jobs")
    .update(patch)
    .eq("id", jobId)
    .eq("device_id", authed.deviceId); // device 본인 job만
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
