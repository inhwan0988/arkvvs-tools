import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/profile";

/**
 * 현재 로그인한 사용자 + profile 반환.
 * - 미로그인 → null
 * - 로그인했지만 profile 없음 → "missing-profile" 마커
 */
export async function getCurrentProfile(): Promise<
  Profile | null | "missing-profile"
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error) {
    // 테이블 없음 등 — 명확히 구분해서 루프 방지
    return "missing-profile";
  }
  if (!profile) return "missing-profile";
  return profile;
}

/**
 * 승인된 사용자만 통과.
 * - 미로그인 → /login
 * - profile 없음 (DB 미초기화) → /banned (안내 페이지로 활용)
 * - 차단 → /banned
 */
export async function requireApproved(): Promise<Profile> {
  const result = await getCurrentProfile();
  if (result === null) redirect("/login");
  if (result === "missing-profile") redirect("/banned?reason=missing-profile");
  if (result.status === "banned") redirect("/banned");
  return result;
}

/**
 * 관리자만 통과. 그 외 → /.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireApproved();
  if (profile.role !== "admin") redirect("/");
  return profile;
}

// 호환 헬퍼 — Profile 만 받는 곳에서 사용
export async function getProfileOrNull(): Promise<Profile | null> {
  const r = await getCurrentProfile();
  return r && r !== "missing-profile" ? r : null;
}
