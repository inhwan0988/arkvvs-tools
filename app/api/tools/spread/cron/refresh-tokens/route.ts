import { NextRequest, NextResponse } from "next/server";
import { createSnsAdminClient } from "@/lib/tools/sns-tracker/supabase-admin";

export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

/**
 * Daily — 만료 7일 이내 Meta long-lived 토큰 재발급.
 *  - long-lived 토큰은 60일 → 만료 전에 같은 토큰을 다시 fb_exchange_token으로 갱신
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!META_APP_ID || !META_APP_SECRET) {
    return NextResponse.json(
      { error: "META env 없음 — skip" },
      { status: 200 },
    );
  }

  const admin = createSnsAdminClient();
  // 만료 7일 이내 ready row
  const cutoff = new Date(Date.now() + 7 * 86400_000).toISOString();

  const { data: conns, error } = await admin
    .from("social_connections")
    .select("*")
    .in("platform", ["instagram_business", "facebook_page", "threads"])
    .lt("token_expires_at", cutoff)
    .eq("enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let refreshed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const c of conns ?? []) {
    try {
      // long-lived token refresh — 동일한 fb_exchange_token endpoint
      const u = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
      u.searchParams.set("grant_type", "fb_exchange_token");
      u.searchParams.set("client_id", META_APP_ID);
      u.searchParams.set("client_secret", META_APP_SECRET);
      u.searchParams.set("fb_exchange_token", c.access_token);
      const res = await fetch(u.toString());
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`refresh ${res.status}: ${t.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
      };
      const newExpiresAt = new Date(
        Date.now() + (data.expires_in || 5_184_000) * 1000,
      );

      await admin
        .from("social_connections")
        .update({
          access_token: data.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          last_refreshed_at: new Date().toISOString(),
          refresh_error: null,
        })
        .eq("id", c.id);
      refreshed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류";
      await admin
        .from("social_connections")
        .update({ refresh_error: msg })
        .eq("id", c.id);
      errors.push({ id: c.id, error: msg });
    }
  }

  return NextResponse.json({ refreshed, errors });
}
