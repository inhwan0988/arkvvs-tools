import { createClient as createBaseClient } from "@supabase/supabase-js";

/**
 * service_role 키를 쓰는 admin client. RLS 우회.
 * 서버 전용 — 절대 client bundle에 노출되면 안 됨.
 * usage_logs 삽입, cron 작업 등 사용자 auth 없이 DB에 써야 하는 곳에서만 사용.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다 (admin client)",
    );
  }
  return createBaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
