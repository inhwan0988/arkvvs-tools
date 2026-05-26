import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { authDevice } from "@/lib/tools/capcut-helper/device-auth";

export const runtime = "nodejs";

/** Helper가 새 영상 감지 → job row 생성 */
export async function POST(req: NextRequest) {
  const authed = await authDevice(req);
  if (authed instanceof NextResponse) return authed;
  if (!authed.userId) {
    return NextResponse.json(
      { error: "페어링 안 된 device — 사용자에게 페어링 요청" },
      { status: 403 },
    );
  }

  const body = (await req.json()) as {
    projectId?: string;
    projectDir: string;
    videoPath: string;
    videoName: string;
    videoSizeBytes?: number;
    videoDurationSec?: number;
  };
  if (!body.projectDir || !body.videoPath || !body.videoName) {
    return NextResponse.json({ error: "projectDir, videoPath, videoName 필수" }, { status: 400 });
  }

  const admin = createSnsAdminClient();
  const { data, error } = await admin
    .from("capcut_jobs")
    .insert({
      user_id: authed.userId,
      device_id: authed.deviceId,
      project_id: body.projectId || null,
      project_dir: body.projectDir,
      video_path: body.videoPath,
      video_name: body.videoName,
      video_size_bytes: body.videoSizeBytes ?? null,
      video_duration_sec: body.videoDurationSec ?? null,
      status: "detected",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}
