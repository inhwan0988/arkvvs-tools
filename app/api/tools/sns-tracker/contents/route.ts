import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateShortId } from "@/lib/tools/sns-tracker/shortid";
import { PLATFORMS, type Platform } from "@/lib/tools/sns-tracker/types";

export const runtime = "nodejs";

type CreateBody = {
  platform: Platform;
  title: string;
  content_url?: string;
  posted_at: string;
  destination_url: string;
  views?: number;
  likes?: number;
  comments?: number;
  notes?: string;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("sns_content_stats")
    .select("*")
    .eq("user_id", user.id)
    .order("posted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contents: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as CreateBody;

  // destination_url만 필수 — 나머지는 다 옵션 (referer로 자동 분류 가능)
  if (!body.destination_url || !/^https?:\/\//.test(body.destination_url)) {
    return NextResponse.json({ error: "destination_url은 http(s):// 로 시작해야 합니다" }, { status: 400 });
  }
  // platform이 누락이거나 잘못된 값이면 etc로 폴백
  const platform = body.platform && PLATFORMS.includes(body.platform) ? body.platform : "etc";
  // title 없으면 destination_url의 host로 폴백
  let title = body.title?.trim();
  if (!title) {
    try {
      title = new URL(body.destination_url).hostname;
    } catch {
      title = body.destination_url.slice(0, 80);
    }
  }
  // posted_at 없으면 now
  const postedAt = body.posted_at || new Date().toISOString();

  // 중복 안 되는 short_id 생성 (최대 5회 시도)
  let shortId = "";
  for (let i = 0; i < 5; i++) {
    const candidate = generateShortId(7);
    const { data: exists } = await supabase
      .from("sns_contents")
      .select("id")
      .eq("short_id", candidate)
      .maybeSingle();
    if (!exists) {
      shortId = candidate;
      break;
    }
  }
  if (!shortId) return NextResponse.json({ error: "short_id 생성 실패" }, { status: 500 });

  const { data, error } = await supabase
    .from("sns_contents")
    .insert({
      user_id: user.id,
      platform,
      title,
      content_url: body.content_url?.trim() || null,
      posted_at: postedAt,
      short_id: shortId,
      destination_url: body.destination_url,
      views: body.views ?? 0,
      likes: body.likes ?? 0,
      comments: body.comments ?? 0,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as {
    id: string;
    views?: number;
    likes?: number;
    comments?: number;
    title?: string;
    destination_url?: string;
    notes?: string;
    archived?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.views === "number") {
    patch.views = body.views;
    patch.views_synced_at = new Date().toISOString();
  }
  if (typeof body.likes === "number") patch.likes = body.likes;
  if (typeof body.comments === "number") patch.comments = body.comments;
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.destination_url === "string") patch.destination_url = body.destination_url;
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (typeof body.archived === "boolean") {
    patch.archived_at = body.archived ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from("sns_contents")
    .update(patch)
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as { id: string };
  if (!body.id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  const { error } = await supabase
    .from("sns_contents")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
