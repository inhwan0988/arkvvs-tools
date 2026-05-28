/**
 * 인스타 떡상 기획 Step 4 — Claude 출력 스크립트를 좌(대사) / 우(연출) 컬럼으로 분리.
 *
 * 출력 규칙 (buildScriptPrompt와 동기):
 *  - 시간대/슬라이드 헤더: [라벨]   ← row 분리자
 *  - 대사 라인:           🎙️ "..."
 *  - 연출 라인:           🎨 ...
 *  - 다른 라인:           legacy로 우측에 표시 (옛 응답 호환)
 *
 * Streaming 중에도 안전하게 호출 가능 — 마지막 row가 partial이어도 그대로 표시.
 */

export interface ScriptRow {
  /** [라벨] 한 줄. 비어있으면 본문 전 머리말. */
  header: string;
  /** 🎙️ 대사 라인 (prefix 제거됨) */
  dialogue: string[];
  /** 🎨 연출 라인 (prefix 제거됨) */
  direction: string[];
  /** prefix 없는 raw 라인 (legacy) */
  other: string[];
}

const HEADER_RE = /^\[([^\]]+)\]\s*$/;
const DIALOGUE_PREFIX = "🎙️";
const DIRECTION_PREFIX = "🎨";

export function parseScript(text: string): ScriptRow[] {
  if (!text) return [];
  const rows: ScriptRow[] = [];
  let current: ScriptRow = {
    header: "",
    dialogue: [],
    direction: [],
    other: [],
  };

  const lines = text.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const trimmed = line.trim();

    // 헤더 — 새 row 시작
    const m = trimmed.match(HEADER_RE);
    if (m) {
      // 직전 row를 push (비어있어도 머리말 row면 push)
      if (
        current.header ||
        current.dialogue.length ||
        current.direction.length ||
        current.other.length
      ) {
        rows.push(current);
      }
      current = {
        header: m[1].trim(),
        dialogue: [],
        direction: [],
        other: [],
      };
      continue;
    }

    if (trimmed.startsWith(DIALOGUE_PREFIX)) {
      const v = trimmed.slice(DIALOGUE_PREFIX.length).trim();
      if (v) current.dialogue.push(v);
      continue;
    }
    if (trimmed.startsWith(DIRECTION_PREFIX)) {
      const v = trimmed.slice(DIRECTION_PREFIX.length).trim();
      if (v) current.direction.push(v);
      continue;
    }
    // 빈 라인 — 무시
    if (!trimmed) continue;
    // streaming 중 partial 헤더 ("[본론" 같은 닫히지 않은 것) — 다음 chunk를 기다림
    if (trimmed.startsWith("[") && !trimmed.includes("]")) continue;
    // legacy 라인 (옛 응답 또는 prompt 어김) — 연출 컬럼에 표시
    current.other.push(trimmed);
  }
  if (
    current.header ||
    current.dialogue.length ||
    current.direction.length ||
    current.other.length
  ) {
    rows.push(current);
  }
  return rows;
}

/** 복사용 — 두 컬럼을 평문으로 합침 (사용자가 "복사" 클릭 시) */
export function rowsToPlainText(rows: ScriptRow[]): string {
  const out: string[] = [];
  for (const r of rows) {
    if (r.header) out.push(`[${r.header}]`);
    for (const d of r.dialogue) out.push(`🎙️ ${d}`);
    for (const d of r.direction) out.push(`🎨 ${d}`);
    for (const o of r.other) out.push(o);
    out.push("");
  }
  return out.join("\n").trim();
}

/** 대사만 추출 (출연자한테 줄 대본) */
export function rowsToDialogueOnly(rows: ScriptRow[]): string {
  const out: string[] = [];
  for (const r of rows) {
    if (r.header) out.push(`[${r.header}]`);
    for (const d of r.dialogue) out.push(d);
    out.push("");
  }
  return out.join("\n").trim();
}

/** 연출만 추출 (디렉터한테 줄 큐시트) */
export function rowsToDirectionOnly(rows: ScriptRow[]): string {
  const out: string[] = [];
  for (const r of rows) {
    if (r.header) out.push(`[${r.header}]`);
    for (const d of r.direction) out.push(`• ${d}`);
    for (const o of r.other) out.push(`• ${o}`);
    out.push("");
  }
  return out.join("\n").trim();
}

/**
 * 대본 파트 — 시간대 헤더 제거하고 모든 대사를 한 덩어리로.
 * 출연자가 위에서 아래로 그대로 읽기 좋게 row 사이 빈 줄로 호흡 구분.
 */
export function rowsToDialogueSection(rows: ScriptRow[]): string {
  const out: string[] = [];
  for (const r of rows) {
    if (r.dialogue.length === 0) continue;
    for (const d of r.dialogue) out.push(d);
    out.push("");
  }
  return out.join("\n").trim();
}

/**
 * 연출 파트 — 시간대 헤더 제거하고 모든 연출 큐를 한 덩어리로.
 * 디렉터가 순서대로 따라가도록 bullet (•) 유지.
 */
export function rowsToDirectionSection(rows: ScriptRow[]): string {
  const out: string[] = [];
  for (const r of rows) {
    const lines = [...r.direction, ...r.other];
    if (lines.length === 0) continue;
    for (const d of lines) out.push(`• ${d}`);
    out.push("");
  }
  return out.join("\n").trim();
}
