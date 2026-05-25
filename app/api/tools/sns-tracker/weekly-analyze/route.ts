import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWeeklyAnalysisPrompt } from "@/lib/tools/sns-tracker/weekly-ai";
import type { SnsContentStats } from "@/lib/tools/sns-tracker/types";

export const runtime = "nodejs";

type Body = {
  weekStart: string; // YYYY-MM-DD
  best: SnsContentStats | null;
  worst: SnsContentStats | null;
  allContents: SnsContentStats[];
  anthropicApiKey: string;
  platform?: string | null;
};

const MODEL_CHAIN = [
  "claude-sonnet-4-5",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
];

/**
 * 주간 best/worst 분석 생성 + 캐시.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body.anthropicApiKey || !body.anthropicApiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "Anthropic API 키가 필요합니다." }, { status: 400 });
  }
  if (!body.weekStart) {
    return NextResponse.json({ error: "weekStart 필요" }, { status: 400 });
  }
  if ((body.allContents?.length ?? 0) === 0) {
    return NextResponse.json({ error: "이번 주 콘텐츠가 없습니다." }, { status: 400 });
  }

  const prompt = buildWeeklyAnalysisPrompt({
    weekStart: body.weekStart,
    best: body.best,
    worst: body.worst,
    allContents: body.allContents,
  });

  let lastErr: unknown;
  let analysisText = "";
  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": body.anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.status === 404) continue;
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Claude ${res.status}: ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const block = data.content?.find((b) => b.type === "text");
      if (!block?.text) throw new Error("응답이 비어있습니다.");
      analysisText = block.text;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!analysisText) {
    return NextResponse.json(
      {
        error:
          lastErr instanceof Error
            ? lastErr.message
            : "Claude 모델 호출 실패",
      },
      { status: 500 },
    );
  }

  // 분석 결과 캐시 (upsert)
  const metrics = {
    totalContents: body.allContents.length,
    totalViews: body.allContents.reduce((s, c) => s + (c.views ?? 0), 0),
    totalClicks: body.allContents.reduce((s, c) => s + (c.click_count ?? 0), 0),
  };

  await supabase.from("sns_weekly_analyses").upsert(
    {
      user_id: user.id,
      week_start: body.weekStart,
      platform: body.platform ?? null,
      best_content_id: body.best?.content_id ?? null,
      worst_content_id: body.worst?.content_id ?? null,
      analysis_md: analysisText,
      metrics_json: metrics,
    },
    { onConflict: "user_id,week_start,platform" },
  );

  return NextResponse.json({
    best: body.best,
    worst: body.worst,
    analysis_md: analysisText,
  });
}
