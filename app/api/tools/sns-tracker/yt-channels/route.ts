import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveChannelId } from "@/lib/tools/sns-tracker/youtube-channel-sync";

export const runtime = "nodejs";

const YT_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

/** 본인 등록 채널 list */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { data, error } = await supabase
    .from("sns_yt_channels")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channels: data ?? [] });
}

/** 새 채널 등록 — input = @handle / URL / UC...ID */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  if (!YT_KEY) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY 환경변수가 설정 안 됨" },
      { status: 500 },
    );
  }

  const body = (await req.json()) as {
    input: string;
    defaultDestinationUrl?: string;
  };
  if (!body.input?.trim()) {
    return NextResponse.json({ error: "input 필수" }, { status: 400 });
  }
  if (body.defaultDestinationUrl && !/^https?:\/\//.test(body.defaultDestinationUrl)) {
    return NextResponse.json(
      { error: "default_destination_url은 http(s)://로 시작해야 합니다" },
      { status: 400 },
    );
  }

  try {
    const info = await resolveChannelId(body.input, YT_KEY);
    const { data, error } = await supabase
      .from("sns_yt_channels")
      .upsert(
        {
          user_id: user.id,
          channel_id: info.channelId,
          channel_handle: info.handle,
          channel_title: info.channelTitle,
          uploads_playlist_id: info.uploadsPlaylistId,
          default_destination_url: body.defaultDestinationUrl || null,
          sync_enabled: true,
        },
        { onConflict: "user_id,channel_id" },
      )
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ channel: data, info });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}

/** 채널 등록 해제 */
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = (await req.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  const { error } = await supabase
    .from("sns_yt_channels")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
