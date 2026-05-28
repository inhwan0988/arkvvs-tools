import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAiCaptionPrompt } from "@/lib/tools/spread/ai-caption";
import type { SpreadPlatform } from "@/lib/tools/spread/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL_CHAIN = [
  "claude-sonnet-4-5",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
];

/**
 * Body: { topic, platforms, anthropicApiKey }
 * Returns: { captions: { instagram_business: "...", threads: "...", ... } }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = (await req.json()) as {
    topic: string;
    platforms: SpreadPlatform[];
    anthropicApiKey: string;
  };

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "topic 필수" }, { status: 400 });
  }
  if (!body.platforms || body.platforms.length === 0) {
    return NextResponse.json(
      { error: "platforms 1개 이상" },
      { status: 400 },
    );
  }
  if (!body.anthropicApiKey?.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic 키 필요 (sk-ant-...)" },
      { status: 400 },
    );
  }

  const prompt = buildAiCaptionPrompt(body.topic, body.platforms);

  let lastErr: unknown;
  let text = "";
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
      if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const block = data.content?.find((b) => b.type === "text");
      if (!block?.text) throw new Error("응답 비어있음");
      text = block.text;
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!text) {
    return NextResponse.json(
      {
        error: lastErr instanceof Error ? lastErr.message : "Claude 호출 실패",
      },
      { status: 500 },
    );
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json(
      { error: "AI 응답에서 JSON 못 찾음", raw: text.slice(0, 300) },
      { status: 502 },
    );
  }

  let captions: Record<string, string>;
  try {
    captions = JSON.parse(match[0]);
  } catch {
    try {
      captions = JSON.parse(match[0].replace(/,(\s*[}\]])/g, "$1"));
    } catch (e) {
      return NextResponse.json(
        {
          error: "JSON 파싱 실패: " + (e instanceof Error ? e.message : ""),
          raw: text.slice(0, 300),
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ captions });
}
