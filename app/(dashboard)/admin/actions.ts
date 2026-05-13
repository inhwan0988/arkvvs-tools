"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Status, Tier } from "@/lib/types/profile";

export async function setUserStatus(
  userId: string,
  status: Status,
): Promise<{ error?: string }> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: "본인 계정은 변경할 수 없습니다." };
  }

  const supabase = createClient();
  const update: Record<string, unknown> = { status };
  if (status === "banned") {
    update.banned_at = new Date().toISOString();
    update.banned_by = admin.id;
  } else {
    update.banned_at = null;
    update.banned_by = null;
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (target?.role === "admin") {
    return { error: "관리자 계정은 변경할 수 없습니다." };
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}

export async function setUserTier(
  userId: string,
  tier: Tier,
): Promise<{ error?: string }> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: "본인 계정은 변경할 수 없습니다." };
  }

  const supabase = createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (target?.role === "admin") {
    return { error: "관리자 계정은 변경할 수 없습니다." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ tier })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}
