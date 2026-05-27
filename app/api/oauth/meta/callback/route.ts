import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

/**
 * Meta OAuth callback — 사용자가 권한 승인 후 돌아오는 곳.
 * 흐름:
 *  1. code → short-lived user access token 교환
 *  2. short → long-lived (60일) 토큰 교환
 *  3. /me/accounts 로 사용자가 관리하는 FB Page list
 *  4. 각 Page의 instagram_business_account fetch
 *  5. social_connections 테이블에 page + ig 둘 다 저장
 *  6. /tools/spread/connect 로 redirect
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!META_APP_ID || !META_APP_SECRET) {
    return NextResponse.redirect(
      new URL("/tools/spread?error=meta_env_missing", req.url),
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("spread_oauth_state")?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/tools/spread?error=oauth_state_mismatch", req.url),
    );
  }

  const baseUrl =
    process.env.APP_BASE_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/oauth/meta/callback`;

  try {
    // 1) code → short-lived token
    const tokenUrl = new URL(
      "https://graph.facebook.com/v22.0/oauth/access_token",
    );
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const tRes = await fetch(tokenUrl.toString());
    if (!tRes.ok) throw new Error(`token exchange ${tRes.status}: ${(await tRes.text()).slice(0, 200)}`);
    const tData = (await tRes.json()) as { access_token: string };
    const shortToken = tData.access_token;

    // 2) short → long-lived (60일)
    const longUrl = new URL(
      "https://graph.facebook.com/v22.0/oauth/access_token",
    );
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", META_APP_ID);
    longUrl.searchParams.set("client_secret", META_APP_SECRET);
    longUrl.searchParams.set("fb_exchange_token", shortToken);
    const lRes = await fetch(longUrl.toString());
    if (!lRes.ok) throw new Error(`long-lived ${lRes.status}: ${(await lRes.text()).slice(0, 200)}`);
    const lData = (await lRes.json()) as {
      access_token: string;
      expires_in: number;
    };
    const userToken = lData.access_token;
    const userExpiresAt = new Date(Date.now() + (lData.expires_in || 5_184_000) * 1000);

    // 3) /me/accounts — 사용자가 관리하는 FB Pages
    const pagesUrl = new URL("https://graph.facebook.com/v22.0/me/accounts");
    pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account");
    pagesUrl.searchParams.set("access_token", userToken);
    const pRes = await fetch(pagesUrl.toString());
    if (!pRes.ok) throw new Error(`pages ${pRes.status}: ${(await pRes.text()).slice(0, 200)}`);
    const pData = (await pRes.json()) as {
      data?: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string };
      }>;
    };

    const pages = pData.data ?? [];
    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL("/tools/spread?error=no_pages", req.url),
      );
    }

    // 4) 각 Page + 연결된 IG를 social_connections에 upsert
    for (const page of pages) {
      // FB Page
      await supabase.from("social_connections").upsert(
        {
          user_id: user.id,
          platform: "facebook_page",
          external_id: page.id,
          external_name: page.name,
          access_token: page.access_token,
          fb_page_id: page.id,
          fb_page_access_token: page.access_token,
          token_expires_at: userExpiresAt.toISOString(),
          enabled: true,
          last_refreshed_at: new Date().toISOString(),
          refresh_error: null,
        },
        { onConflict: "user_id,platform,external_id" },
      );

      // 연결된 IG Business
      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        // IG username + name fetch
        const igUrl = new URL(`https://graph.facebook.com/v22.0/${igId}`);
        igUrl.searchParams.set("fields", "username,name");
        igUrl.searchParams.set("access_token", page.access_token);
        const igRes = await fetch(igUrl.toString());
        const igData = igRes.ok
          ? ((await igRes.json()) as { username?: string; name?: string })
          : {};
        await supabase.from("social_connections").upsert(
          {
            user_id: user.id,
            platform: "instagram_business",
            external_id: igId,
            external_username: igData.username ?? null,
            external_name: igData.name ?? page.name,
            access_token: page.access_token, // IG 게시는 page token으로
            fb_page_id: page.id,
            fb_page_access_token: page.access_token,
            token_expires_at: userExpiresAt.toISOString(),
            enabled: true,
            last_refreshed_at: new Date().toISOString(),
            refresh_error: null,
          },
          { onConflict: "user_id,platform,external_id" },
        );
      }
    }

    const res = NextResponse.redirect(
      new URL("/tools/spread?connected=1", req.url),
    );
    res.cookies.delete("spread_oauth_state");
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OAuth 실패";
    return NextResponse.redirect(
      new URL(`/tools/spread?error=${encodeURIComponent(msg)}`, req.url),
    );
  }
}
