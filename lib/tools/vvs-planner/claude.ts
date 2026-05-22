// Edge-호환: @anthropic-ai/sdk 대신 raw fetch 사용 (플랫폼 youtube-setup 패턴과 동일)
const MODEL = "claude-sonnet-4-5";

export async function generateTopicsRaw(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      // v2 풍부 prompt(주제 카드 메타데이터 8개 필드)에 대응 — 4096이면 응답 잘림.
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const block = data.content?.find((b) => b.type === "text");
  if (!block?.text) throw new Error("Claude 응답이 비어있습니다.");
  return block.text;
}

/**
 * Claude messages API 스트리밍을 호출하고, 각 text_delta 청크를 텍스트로 파싱한 뒤
 * 다시 text/plain 스트림으로 그대로 흘려보내는 ReadableStream 반환.
 */
export function streamClaudeText(
  apiKey: string,
  prompt: string,
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

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
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
                    delta?: { type?: string; text?: string };
                  };
                  if (
                    evt.type === "content_block_delta" &&
                    evt.delta?.type === "text_delta" &&
                    evt.delta.text
                  ) {
                    controller.enqueue(encoder.encode(evt.delta.text));
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
