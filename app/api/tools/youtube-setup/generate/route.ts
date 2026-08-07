import { NextRequest } from "next/server";
import {
  SYSTEM_PROMPT,
  buildSectionPrompt,
  ChannelStage,
  Section,
} from "@/lib/tools/youtube-setup/prompts";
import { generateWithClaudeUsage } from "@/lib/tools/youtube-setup/claude";
import { generateWithOpenAIUsage } from "@/lib/tools/youtube-setup/openai";
import { createClient } from "@/lib/supabase/server";
import { enforceQuota } from "@/lib/usage/wrap";
import { logUsage } from "@/lib/usage/logger";

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

  const usedOwnKey = !!body.apiKey?.trim();
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

  // ─── Quota 체크 (섹션 4개를 1회 사용으로 카운트) ───
  const quotaResp = await enforceQuota({
    userId: user.id,
    toolSlug: "youtube-setup",
    action: "generate",
    provider: provider === "claude" ? "anthropic" : "openai",
    usedOwnKey,
  });
  if (quotaResp) return quotaResp;

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

      // 4개 섹션 usage 합산 (전체 호출 = 1 quota, 하지만 실제 비용은 4번 호출의 합)
      let totalIn = 0;
      let totalOut = 0;
      let usedModel = provider === "claude" ? "claude-sonnet-4-5" : "gpt-4o";
      let anyOk = false;

      // 4개 섹션 병렬 호출
      const callOne = async (section: Section) => {
        try {
          const userPrompt = buildSectionPrompt(script, stage, section);
          const r =
            provider === "claude"
              ? await generateWithClaudeUsage({
                  apiKey,
                  system: SYSTEM_PROMPT,
                  user: userPrompt,
                })
              : await generateWithOpenAIUsage({
                  apiKey,
                  system: SYSTEM_PROMPT,
                  user: userPrompt,
                });
          totalIn += r.usage.input;
          totalOut += r.usage.output;
          usedModel = r.model;
          anyOk = true;
          const parsed = tryExtractJson(r.text);
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
        // 최종 usage 기록 (섹션 4개 모두 실패한 경우 status=error)
        void logUsage({
          userId: user.id,
          toolSlug: "youtube-setup",
          action: "generate",
          provider: provider === "claude" ? "anthropic" : "openai",
          model: usedModel,
          tokensIn: totalIn,
          tokensOut: totalOut,
          usedOwnKey,
          status: anyOk ? "ok" : "error",
        });
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
