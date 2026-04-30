import Anthropic from "@anthropic-ai/sdk";

export async function generateWithClaude(opts: {
  apiKey: string;
  system: string;
  user: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude 응답 비어있음");
  return block.text;
}
