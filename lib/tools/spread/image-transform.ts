/**
 * 한 이미지 → 1:1 / 4:5 / 9:16 / 16:9 비율로 자동 변환.
 *
 * - 1:1 (Insta default) — center crop
 * - 4:5 (Insta portrait) — center crop
 * - 9:16 (Reel/Shorts/Stories) — center crop으로 자른 후, 부족하면 blur background fill
 * - 16:9 (FB/YT) — 또는 letterbox
 *
 * sharp의 fit:cover + position:attention/entropy로 스마트 크롭.
 */
import sharp from "sharp";

export type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

const RATIO_TARGETS: Record<AspectRatio, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
};

/**
 * Buffer 또는 path를 받아 지정 비율로 변환.
 * smart crop (attention position) 사용 — sharp가 자동으로 관심 영역 보존.
 */
export async function transformImage(
  input: Buffer,
  ratio: AspectRatio,
): Promise<Buffer> {
  const target = RATIO_TARGETS[ratio];
  return await sharp(input)
    .rotate() // EXIF orientation 자동 처리
    .resize(target.w, target.h, {
      fit: "cover",
      position: sharp.strategy.attention, // 사람/얼굴 등 관심 영역 우선
    })
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();
}

/**
 * 9:16 같은 매우 다른 비율 — 원본이 가로면 center crop으로 손실 큼.
 * 대안: 원본을 9:16 안에 contain + 양쪽을 blur background로 채움 (Insta Reels 스타일).
 */
export async function transformWithBlurBackground(
  input: Buffer,
  ratio: AspectRatio,
): Promise<Buffer> {
  const target = RATIO_TARGETS[ratio];

  // 1) blur background — 원본을 cover로 채우고 흐림
  const background = await sharp(input)
    .resize(target.w, target.h, { fit: "cover" })
    .blur(80)
    .modulate({ brightness: 0.6 })
    .toBuffer();

  // 2) foreground — contain으로 비율 유지
  const foreground = await sharp(input)
    .rotate()
    .resize(target.w, target.h, { fit: "inside" })
    .toBuffer();

  // 3) composite
  return await sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();
}

/** 플랫폼별 권장 비율 */
export const PLATFORM_RATIO: Record<string, AspectRatio> = {
  instagram_business: "1:1",
  facebook_page: "1:1",
  threads: "1:1",
  tiktok: "9:16",
  youtube: "9:16",
  x: "16:9",
};
