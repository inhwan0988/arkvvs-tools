import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";
import { isBotUserAgent } from "@/lib/tools/sns-tracker/bot-detect";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 단축 URL redirect + 클릭 로그.
 *
 * 흐름:
 *  1. shortId로 콘텐츠 조회
 *  2. 없으면 404
 *  3. 있으면 destination_url로 302 redirect
 *  4. 비동기로 link_clicks insert (bot은 is_bot=true)
 *  5. UTM 파라미터는 destination URL에 보존
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const { shortId } = await params;
  if (!shortId || shortId.length > 32) {
    return new NextResponse("Bad short id", { status: 400 });
  }

  let supabase;
  try {
    supabase = createSnsAdminClient();
  } catch {
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const { data: content } = await supabase
    .from("sns_contents")
    .select("id, destination_url, archived_at")
    .eq("short_id", shortId)
    .maybeSingle();

  if (!content || content.archived_at) {
    return new NextResponse("링크를 찾을 수 없습니다.", { status: 404 });
  }

  // Destination URL에 UTM 파라미터 보존 (들어온 URL의 query 그대로 넘김)
  const incomingUrl = new URL(req.url);
  const dest = new URL(content.destination_url);
  incomingUrl.searchParams.forEach((v, k) => {
    if (!dest.searchParams.has(k)) dest.searchParams.set(k, v);
  });

  // Click 비동기 기록 (실패해도 redirect는 계속)
  const ua = req.headers.get("user-agent") || "";
  const referer = req.headers.get("referer") || null;
  const country = req.headers.get("x-vercel-ip-country") || null;
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const salt = process.env.CLICK_IP_SALT || "default-salt-rotate-me";
  const ipHash = ip
    ? crypto.createHash("sha256").update(ip + salt).digest("hex").slice(0, 32)
    : null;

  const isBot = isBotUserAgent(ua);
  const utm_source = incomingUrl.searchParams.get("utm_source");
  const utm_medium = incomingUrl.searchParams.get("utm_medium");
  const utm_campaign = incomingUrl.searchParams.get("utm_campaign");

  // fire-and-forget
  supabase
    .from("link_clicks")
    .insert({
      short_id: shortId,
      content_id: content.id,
      ip_hash: ipHash,
      ua: ua.slice(0, 500),
      referer: referer?.slice(0, 500) ?? null,
      country,
      utm_source,
      utm_medium,
      utm_campaign,
      is_bot: isBot,
    })
    .then(({ error }) => {
      if (error) console.error("[sns-tracker/click insert]", error.message);
    });

  return NextResponse.redirect(dest.toString(), 302);
}
