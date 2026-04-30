import OpenAI from "openai";

export async function generateWithOpenAI(opts: {
  apiKey: string;
  system: string;
  user: string;
}): Promise<string> {
  const client = new OpenAI({ apiKey: opts.apiKey });
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI 응답 비어있음");
  return text;
}
