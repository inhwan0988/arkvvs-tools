// Edge runtime 호환 — Anthropic API 직접 호출 (fetch 사용)
export type ClaudeCallOut = {
  text: string;
  model: string;
  usage: { input: number; output: number };
};

export async function generateWithClaude(opts: {
  apiKey: string;
  system: string;
  user: string;
}): Promise<string> {
  const r = await generateWithClaudeUsage(opts);
  return r.text;
}

export async function generateWithClaudeUsage(opts: {
  apiKey: string;
  system: string;
  user: string;
}): Promise<ClaudeCallOut> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude ${res.status}: ${errText.slice(0, 200)}`);
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
    model: data.model ?? "claude-sonnet-4-5",
    usage: {
      input: data.usage?.input_tokens ?? 0,
      output: data.usage?.output_tokens ?? 0,
    },
  };
}
