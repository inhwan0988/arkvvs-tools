import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveUrlMeta } from "@/lib/tools/sns-tracker/url-resolver";

export const runtime = "nodejs";

/**
 * 사용자가 콘텐츠 URL 1줄 paste → 메타데이터 자동 추출.
 *
 * Body: { url: "https://youtube.com/watch?v=..." }
 * Returns: { platform, title, thumbnailUrl, channelName, publishedAt, externalId, canonicalUrl }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = (await req.json()) as { url?: string };
  if (!body.url) return NextResponse.json({ error: "url 필수" }, { status: 400 });
  if (!/^https?:\/\//.test(body.url)) {
    return NextResponse.json(
      { error: "http(s):// 로 시작하는 URL이어야 합니다" },
      { status: 400 },
    );
  }

  try {
    const meta = await resolveUrlMeta(body.url);
    return NextResponse.json(meta);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "추출 실패" },
      { status: 500 },
    );
  }
}
