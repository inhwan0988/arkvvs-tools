import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/tools/vvs-planner/search-history
 *  → 로그인 사용자의 최근 검색 기록 (최대 20개, 중복 keyword는 최신 것만).
 *
 * DELETE /api/tools/vvs-planner/search-history?id=xxx
 *  → 특정 기록 삭제 (id 없으면 전체 삭제)
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ history: [] });
  }

  // 최근 100개 pull → 클라이언트에서 keyword 중복 제거 후 20개로 자르면 정확
  const { data, error } = await supabase
    .from("vvs_search_history")
    .select("id, keyword, filters, result_count, cached, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ history: [] });
  }

  // keyword 중복 제거 (최신 것만 유지)
  const seen = new Set<string>();
  const dedup = [];
  for (const row of data || []) {
    const k = (row.keyword || "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    dedup.push(row);
    if (dedup.length >= 20) break;
  }

  return NextResponse.json({ history: dedup });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const q = supabase.from("vvs_search_history").delete().eq("user_id", user.id);
  const { error } = id ? await q.eq("id", id) : await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
