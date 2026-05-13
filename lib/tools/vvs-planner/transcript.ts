import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js";

type TranscriptResult = { transcript: string; language: string };

async function tryYoutubeTranscript(
  videoId: string,
): Promise<TranscriptResult | null> {
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
  return null;
}

function extractSegmentText(segment: unknown): string {
  const s = segment as {
    snippet?: { text?: string; runs?: Array<{ text?: string }> };
  };
  if (s.snippet?.text) return s.snippet.text;
  if (s.snippet?.runs) {
    return s.snippet.runs.map((r) => r.text ?? "").join("");
  }
  return "";
}

async function tryYoutubei(
  videoId: string,
): Promise<TranscriptResult | null> {
  try {
    const yt = await Innertube.create({ lang: "ko", retrieve_player: false });
    const info = await yt.getInfo(videoId);
    const transcriptInfo = await info.getTranscript();
    const body = (
      transcriptInfo as unknown as {
        transcript?: { content?: { body?: { initial_segments?: unknown[] } } };
        selectedLanguage?: string;
      }
    ).transcript?.content?.body;
    const segments = body?.initial_segments ?? [];
    const text = segments
      .map(extractSegmentText)
      .filter((t) => t.trim().length > 0)
      .join(" ");
    if (text.trim().length > 0) {
      const lang =
        (transcriptInfo as unknown as { selectedLanguage?: string })
          .selectedLanguage ?? "auto";
      return { transcript: text, language: lang };
    }
  } catch {
    // fall through
  }
  return null;
}

export async function getTranscript(videoId: string): Promise<TranscriptResult> {
  const first = await tryYoutubeTranscript(videoId);
  if (first) return first;

  const second = await tryYoutubei(videoId);
  if (second) return second;

  throw new Error(
    "자막을 찾을 수 없습니다. 자막이 없는 영상이거나 일시적으로 가져오지 못했습니다.",
  );
}
