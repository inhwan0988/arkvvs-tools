import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js";
import {
  cleanDescription,
  fetchVideoDescription,
  isDescriptionUseful,
} from "./description";

type TranscriptSource = "captions" | "description" | "captions+description";

export type TranscriptResult = {
  transcript: string;
  language: string;
  source: TranscriptSource;
  captionsLength?: number;
  descriptionLength?: number;
};

async function tryYoutubei(
  videoId: string,
): Promise<{ text: string; language: string } | null> {
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
      .map((seg) => {
        const s = seg as {
          snippet?: { text?: string; runs?: Array<{ text?: string }> };
        };
        if (s.snippet?.text) return s.snippet.text;
        if (s.snippet?.runs) return s.snippet.runs.map((r) => r.text ?? "").join("");
        return "";
      })
      .filter((t) => t.trim().length > 0)
      .join(" ");
    if (text.trim().length > 0) {
      const lang =
        (transcriptInfo as unknown as { selectedLanguage?: string })
          .selectedLanguage ?? "auto";
      return { text, language: lang };
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function tryYoutubeTranscript(
  videoId: string,
): Promise<{ text: string; language: string } | null> {
  const langs = ["ko", "en"];
  for (const lang of langs) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      const text = items.map((i) => i.text).join(" ");
      if (text.trim().length > 0) return { text, language: lang };
    } catch {
      continue;
    }
  }
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const text = items.map((i) => i.text).join(" ");
    if (text.trim().length > 0) return { text, language: "auto" };
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * 영상의 텍스트 컨텍스트 추출.
 *
 * 우선순위:
 * 1. youtubei.js (더 robust한 자막 추출, 자동생성 자막 한국어 정확도 ↑)
 * 2. youtube-transcript (fallback 자막)
 * 3. description (자막 없는 영상 fallback — 사용자 보고 사례 대응)
 *
 * 자막이 너무 짧으면(<300자) description도 추가로 합쳐 컨텍스트 풍부화.
 * 자막도 description도 부족하면 throw → 사용자가 수동 입력 가능.
 *
 * @param videoId YouTube video ID
 * @param youtubeApiKey description fetch용 (선택, 없으면 자막만 시도)
 */
export async function getTranscript(
  videoId: string,
  youtubeApiKey?: string,
): Promise<TranscriptResult> {
  // 1. 자막 추출 시도 (youtubei.js 먼저 — 더 정확)
  const captionsResult =
    (await tryYoutubei(videoId)) ?? (await tryYoutubeTranscript(videoId));

  // 2. description fetch (자막 결과 약하면 보조)
  let descCleaned = "";
  if (youtubeApiKey?.trim()) {
    const raw = await fetchVideoDescription(videoId, youtubeApiKey);
    descCleaned = cleanDescription(raw);
  }

  // 3. 결과 조합
  const captionsText = captionsResult?.text ?? "";
  const captionsLen = captionsText.length;
  const descLen = descCleaned.length;

  // case A: 자막 충분 → 자막만 사용 (description은 noise 가능성)
  if (captionsLen >= 800) {
    return {
      transcript: captionsText,
      language: captionsResult!.language,
      source: "captions",
      captionsLength: captionsLen,
      descriptionLength: descLen,
    };
  }

  // case B: 자막 짧지만 있음 + description 의미 있음 → 합쳐서 컨텍스트 풍부화
  if (captionsLen > 0 && isDescriptionUseful(descCleaned)) {
    const combined =
      `[자막]\n${captionsText}\n\n[영상 설명란]\n${descCleaned}`;
    return {
      transcript: combined,
      language: captionsResult!.language,
      source: "captions+description",
      captionsLength: captionsLen,
      descriptionLength: descLen,
    };
  }

  // case C: 자막만 있음 (description 부족) → 자막 그대로
  if (captionsLen > 0) {
    return {
      transcript: captionsText,
      language: captionsResult!.language,
      source: "captions",
      captionsLength: captionsLen,
      descriptionLength: descLen,
    };
  }

  // case D: 자막 없음 + description만 있음 → description 사용
  if (isDescriptionUseful(descCleaned)) {
    return {
      transcript: descCleaned,
      language: "auto",
      source: "description",
      captionsLength: 0,
      descriptionLength: descLen,
    };
  }

  // case E: 둘 다 부족 → throw (사용자 수동 입력 흐름으로)
  throw new Error(
    "자막과 영상 설명 모두 부족합니다. 영상의 자막을 직접 복사해서 붙여넣어 주세요.",
  );
}
