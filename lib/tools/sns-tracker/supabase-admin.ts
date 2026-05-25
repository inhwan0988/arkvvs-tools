import { createClient as createBaseClient } from "@supabase/supabase-js";

/**
 * service-role 키를 쓰는 admin client.
 * RLS 우회 — redirect route에서 콘텐츠 조회 + 클릭 로그 삽입에만 사용.
 * 절대 클라이언트로 노출하면 안 됨.
 */
export function createSnsAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[sns-tracker] SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
    );
  }
  return createBaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
