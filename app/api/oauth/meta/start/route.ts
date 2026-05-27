import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

/**
 * Meta(Facebook + Instagram + Threads) OAuth 시작.
 *
 * 환경변수:
 *   META_APP_ID         — Meta App ID
 *   META_APP_SECRET     — (callback에서 사용)
 *   APP_BASE_URL        — https://arkvvs-tools.vercel.app (생략 가능, req에서 추출)
 *
 * Threads는 별도 OAuth (developers.facebook.com에서 Threads use case 추가).
 * 여기서는 IG/FB Page 통합 흐름.
 */
const META_APP_ID = process.env.META_APP_ID;

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
].join(",");

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  if (!META_APP_ID) {
    return NextResponse.json(
      {
        error:
          "Meta App 설정이 안 되어 있어요. Vercel env에 META_APP_ID + META_APP_SECRET 추가 필요.",
        setupGuide:
          "https://developers.facebook.com/apps → My Apps → 새 앱 만들기 (Business) → App ID 복사",
      },
      { status: 500 },
    );
  }

  // CSRF state 생성 + cookie에 저장 (callback에서 검증)
  const state = crypto.randomBytes(16).toString("hex");
  const baseUrl =
    process.env.APP_BASE_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/oauth/meta/callback`;

  const authUrl = new URL("https://www.facebook.com/v22.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", META_SCOPES);
  authUrl.searchParams.set("response_type", "code");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("spread_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 600,
    path: "/",
  });
  return res;
}
