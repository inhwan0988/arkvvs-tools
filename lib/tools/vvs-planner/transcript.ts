import { YoutubeTranscript } from "youtube-transcript";

export async function getTranscript(
  videoId: string,
): Promise<{ transcript: string; language: string }> {
  const langs = ["ko", "en"];
  for (const lang of langs) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      const text = items.map((i) => i.text).join(" ");
      if (text.trim().length > 0) return { transcript: text, language: lang };
    } catch {
      continue;
    }
  }
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const text = items.map((i) => i.text).join(" ");
    if (text.trim().length > 0) return { transcript: text, language: "auto" };
  } catch {
    // fall through
  }
  throw new Error("자막을 찾을 수 없습니다. 자막이 있는 영상을 선택해주세요.");
}
