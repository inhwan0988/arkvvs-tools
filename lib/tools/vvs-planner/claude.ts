// Edge-호환: @anthropic-ai/sdk 대신 raw fetch 사용 (플랫폼 youtube-setup 패턴과 동일)
const MODEL = "claude-sonnet-4-5";

export type ClaudeUsage = { input: number; output: number };
export type ClaudeCallResult = { text: string; model: string; usage: ClaudeUsage };

/**
 * Claude messages API 호출 — text + model + usage 반환.
 * quota 로깅에 필요한 토큰 수 포함.
 */
export async function callClaude(
  apiKey: string,
  prompt: string,
  opts?: { maxTokens?: number },
): Promise<ClaudeCallResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts?.maxTokens ?? 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    model?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const block = data.content?.find((b) => b.type === "text");
  if (!block?.text) throw new Error("Claude 응답이 비어있습니다.");
  return {
    text: block.text,
    model: data.model ?? MODEL,
    usage: {
      input: data.usage?.input_tokens ?? 0,
      output: data.usage?.output_tokens ?? 0,
    },
  };
}

/**
 * @deprecated 새 코드는 callClaude 사용 (usage 반환). 하위호환용.
 */
export async function generateTopicsRaw(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const r = await callClaude(apiKey, prompt);
  return r.text;
}

/**
 * Claude messages API 스트리밍을 호출하고, 각 text_delta 청크를 텍스트로 파싱한 뒤
 * 다시 text/plain 스트림으로 그대로 흘려보내는 ReadableStream 반환.
 *
 * opts.onFinish 콜백은 응답 종료 시(message_delta usage 이벤트) 호출됨 →
 * quota 로깅에 활용.
 */
export function streamClaudeText(
  apiKey: string,
  prompt: string,
  opts?: {
    onFinish?: (info: { model: string; usage: ClaudeUsage }) => void;
  },
): Promise<ReadableStream<Uint8Array>> {
  return (async () => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok || !res.body) {
      const txt = await res.text();
      throw new Error(`Claude ${res.status}: ${txt.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // stream 동안 축적할 usage
    let inputTokens = 0;
    let outputTokens = 0;
    let modelId = MODEL;

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              opts?.onFinish?.({
                model: modelId,
                usage: { input: inputTokens, output: outputTokens },
              });
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            // Anthropic SSE: 이벤트 블록은 "\n\n" 구분
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() ?? "";
            for (const block of blocks) {
              for (const line of block.split("\n")) {
                if (!line.startsWith("data:")) continue;
                const dataStr = line.slice(5).trim();
                if (!dataStr || dataStr === "[DONE]") continue;
                try {
                  const evt = JSON.parse(dataStr) as {
                    type?: string;
                    delta?: {
                      type?: string;
                      text?: string;
                    };
                    message?: {
                      model?: string;
                      usage?: {
                        input_tokens?: number;
                        output_tokens?: number;
                      };
                    };
                    usage?: {
                      input_tokens?: number;
                      output_tokens?: number;
                    };
                  };
                  if (
                    evt.type === "content_block_delta" &&
                    evt.delta?.type === "text_delta" &&
                    evt.delta.text
                  ) {
                    controller.enqueue(encoder.encode(evt.delta.text));
                  } else if (evt.type === "message_start" && evt.message) {
                    if (evt.message.model) modelId = evt.message.model;
                    if (evt.message.usage?.input_tokens) {
                      inputTokens = evt.message.usage.input_tokens;
                    }
                    if (evt.message.usage?.output_tokens) {
                      outputTokens = evt.message.usage.output_tokens;
                    }
                  } else if (evt.type === "message_delta" && evt.usage) {
                    // 최종 usage는 여기 실림
                    if (typeof evt.usage.output_tokens === "number") {
                      outputTokens = evt.usage.output_tokens;
                    }
                    if (typeof evt.usage.input_tokens === "number") {
                      inputTokens = evt.usage.input_tokens;
                    }
                  }
                } catch {
                  // 파싱 실패 라인 무시
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });
  })();
}
