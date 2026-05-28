import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchProfilesWithPosts } from "@/lib/tools/insta-planner/profile-scraper";
import { normalizeUsername } from "@/lib/tools/insta-planner/apify-client";

export const runtime = "nodejs";
// Apify 호출 + 여러 채널 = 최대 90초 정도 가능. Vercel Pro 필요할 수 있음.
export const maxDuration = 120;

type Body = {
  usernames?: string[];   // ["arkstudio_kr", "@another"]
  postsPerProfile?: number; // default 12
  minIvs?: number;
  minFollowers?: number;
  excludeKeywords?: string;
};

/**
 * 영감 받은 인스타 채널 1-5개 → 각 채널의 최근 포스트 + IVS 계산.
 * 결과: ReelResult[] (인기 순 정렬).
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status === "banned") {
    return NextResponse.json({ error: "차단된 계정입니다." }, { status: 403 });
  }

  const body = (await req.json()) as Body;
  const raw = body.usernames ?? [];
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json(
      { error: "분석할 인스타 채널 @핸들을 1개 이상 입력해주세요." },
      { status: 400 },
    );
  }

  const usernames = [...new Set(raw.map(normalizeUsername).filter(Boolean))].slice(
    0,
    5,
  );
  if (usernames.length === 0) {
    return NextResponse.json(
      { error: "유효한 채널 @핸들이 없어요." },
      { status: 400 },
    );
  }

  try {
    const posts = await fetchProfilesWithPosts(
      usernames,
      body.postsPerProfile ?? 12,
    );

    // 필터링
    const minIvs = body.minIvs ?? 0;
    const minFollowers = body.minFollowers ?? 0;
    const excludes = (body.excludeKeywords ?? "")
      .split(/[,\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const filtered = posts.filter((p) => {
      if (p.ivs < minIvs) return false;
      if (p.ownerFollowers < minFollowers) return false;
      if (excludes.length > 0) {
        const text = p.caption.toLowerCase();
        if (excludes.some((kw) => text.includes(kw))) return false;
      }
      return true;
    });

    // 종합 점수 순 정렬
    filtered.sort((a, b) => b.score - a.score);

    // 결과 1건 이상이면 검색 기록 저장 — (user_id, handles) unique index로 upsert
    if (filtered.length > 0) {
      const handlesKey = [...usernames].sort();
      const filters = {
        minIvs: body.minIvs ?? 0,
        minFollowers: body.minFollowers ?? 0,
        excludeKeywords: body.excludeKeywords ?? "",
      };
      await supabase.from("insta_planner_searches").upsert(
        {
          user_id: user.id,
          handles: handlesKey,
          filters,
          result_count: filtered.length,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,handles" },
      );
    }

    return NextResponse.json({
      reels: filtered.slice(0, 50),
      meta: {
        totalFetched: posts.length,
        afterFilter: filtered.length,
        usernames,
      },
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Instagram 데이터 추출 중 오류 발생";
    console.error("[insta-planner/fetch-channels]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
