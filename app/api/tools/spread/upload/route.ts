import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import {
  transformImage,
  transformWithBlurBackground,
  type AspectRatio,
} from "@/lib/tools/spread/image-transform";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 사용자 이미지 업로드 → 4가지 비율로 자동 변환 → Storage 업로드 → public URL 4개 반환.
 *
 * Body: multipart/form-data
 *   - image: File (image/jpeg|png|webp)
 *   - blurFor916: "1" | "0"  (9:16일 때 blur background fill 쓸지)
 *
 * Returns:
 *   { variants: { "1:1": url, "4:5": url, "9:16": url, "16:9": url } }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("image");
  const blurFor916 = formData.get("blurFor916") === "1";

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "image 파일 필요" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: "이미지 최대 20MB" },
      { status: 400 },
    );
  }
  const inputType = file.type || "image/jpeg";
  if (!inputType.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createSnsAdminClient();
  const id = crypto.randomUUID();
  const ratios: AspectRatio[] = ["1:1", "4:5", "9:16", "16:9"];
  const variants: Record<string, string> = {};

  try {
    for (const ratio of ratios) {
      const transformed =
        ratio === "9:16" && blurFor916
          ? await transformWithBlurBackground(buffer, ratio)
          : await transformImage(buffer, ratio);

      const path = `${user.id}/${id}/${ratio.replace(":", "x")}.jpg`;
      const { error: upErr } = await admin.storage
        .from("spread-media")
        .upload(path, transformed, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });
      if (upErr) throw new Error(`${ratio} 업로드 실패: ${upErr.message}`);

      const { data: pub } = admin.storage.from("spread-media").getPublicUrl(path);
      variants[ratio] = pub.publicUrl;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "변환 실패" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id, variants });
}
