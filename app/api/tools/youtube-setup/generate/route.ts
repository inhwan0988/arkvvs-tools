import { NextRequest } from "next/server";
import {
  SYSTEM_PROMPT,
  buildSectionPrompt,
  ChannelStage,
  Section,
} from "@/lib/tools/youtube-setup/prompts";
import { generateWithClaude } from "@/lib/tools/youtube-setup/claude";
import { generateWithOpenAI } from "@/lib/tools/youtube-setup/openai";
import { createClient } from "@/lib/supabase/server";

// Edge runtime: 첫 응답 25초 내, 이후 스트리밍 최대 5분
export const runtime = "edge";

type Body = {
  script: string;
  provider: "claude" | "openai";
  apiKey?: string;
  stage: ChannelStage;
};

const SECTIONS: Section[] = ["titles", "thumbnails", "description", "meta"];

function stripCodeFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function tryExtractJson(s: string): unknown {
  const stripped = stripCodeFence(s);
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error("JSON 파싱 실패");
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  // ─── 인증 체크 ───
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: "로그인이 필요합니다." }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status === "banned") {
    return jsonResponse({ error: "차단된 계정입니다." }, 403);
  }

  // ─── 본문 파싱 ───
  const body = (await req.json()) as Body;
  const { script, provider, stage } = body;

  if (!script?.trim()) {
    return jsonResponse({ error: "스크립트가 비어있습니다." }, 400);
  }

  const apiKey =
    body.apiKey?.trim() ||
    (provider === "claude"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY);

  if (!apiKey) {
    return jsonResponse(
      {
        error: `${provider === "claude" ? "Anthropic" : "OpenAI"} API 키가 필요합니다.`,
      },
      400,
    );
  }

  // ─── SSE 스트리밍 응답 ───
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      // 즉시 첫 바이트 전송 → Vercel 25초 타이머 통과
      send("start", { sections: SECTIONS });

      // 4개 섹션 병렬 호출
      const callOne = async (section: Section) => {
        try {
          const userPrompt = buildSectionPrompt(script, stage, section);
          const raw =
            provider === "claude"
              ? await generateWithClaude({
                  apiKey,
                  system: SYSTEM_PROMPT,
                  user: userPrompt,
                })
              : await generateWithOpenAI({
                  apiKey,
                  system: SYSTEM_PROMPT,
                  user: userPrompt,
                });
          const parsed = tryExtractJson(raw);
          send("section", { section, data: parsed });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI 호출 실패";
          send("section_error", { section, message: msg });
        }
      };

      // 진행률 keep-alive (10초마다 ping)
      const ping = setInterval(() => {
        try {
          send("ping", { ts: Date.now() });
        } catch {}
      }, 10_000);

      try {
        await Promise.all(SECTIONS.map(callOne));
        send("done", {});
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        send("error", { message: msg });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
