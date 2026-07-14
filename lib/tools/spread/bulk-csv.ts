/**
 * Spread 벌크 CSV — 파서 + validator.
 * RFC 4180 준수 (quoted field 안에 comma, newline, escaped quote "" 지원).
 * 별도 dependency 없이 인라인 구현.
 */

export const BULK_MAX_ROWS = 90;

export const BULK_HEADERS = [
  "scheduledAt",
  "caption",
  "link",
  "imageUrls",
  "videoUrl",
] as const;

export type BulkHeader = (typeof BULK_HEADERS)[number];

export interface BulkRow {
  scheduledAt: string; // ISO
  caption: string;
  link: string;
  imageUrls: string[];
  videoUrl: string;
}

export interface ParsedBulkRow {
  rowIndex: number; // 1-based, header 제외
  row: BulkRow | null;
  errors: string[];
  raw: Record<string, string>;
}

/**
 * CSV 문자열 → 2D 배열. quoted field, escaped quote, newline-in-field 지원.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  const src = text.replace(/^﻿/, ""); // BOM 제거

  while (i < src.length) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // 마지막 field/row flush
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const DATE_FORMATS: RegExp[] = [
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/, // YYYY-MM-DD HH:mm[:ss]
  /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/, // YYYY/MM/DD HH:mm[:ss]
];

function parseDate(raw: string): { iso: string | null; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { iso: null, error: "scheduledAt 필수" };
  for (const re of DATE_FORMATS) {
    const m = trimmed.match(re);
    if (m) {
      const [, Y, Mo, D, H, Mi, S] = m;
      const d = new Date(
        Number(Y),
        Number(Mo) - 1,
        Number(D),
        Number(H),
        Number(Mi),
        Number(S ?? "0"),
      );
      if (Number.isNaN(d.getTime())) {
        return { iso: null, error: "날짜 파싱 실패" };
      }
      return { iso: d.toISOString() };
    }
  }
  return {
    iso: null,
    error: "포맷: YYYY-MM-DD HH:mm 또는 YYYY-MM-DD HH:mm:ss",
  };
}

const URL_RE = /^https?:\/\/.+/i;

function parseUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 파싱된 rows[][] → 검증된 BulkRow[].
 * 첫 행이 header. 각 행마다 errors[] 반환.
 */
export function validateRows(rows: string[][]): {
  parsed: ParsedBulkRow[];
  headerErrors: string[];
} {
  if (rows.length === 0) {
    return { parsed: [], headerErrors: ["빈 파일"] };
  }
  const headerRaw = rows[0].map((s) => s.trim());
  const headerErrors: string[] = [];

  const missing = BULK_HEADERS.filter((h) => !headerRaw.includes(h));
  if (missing.length > 0) {
    headerErrors.push(`누락된 컬럼: ${missing.join(", ")}`);
  }

  const idx: Record<BulkHeader, number> = {} as Record<BulkHeader, number>;
  for (const h of BULK_HEADERS) idx[h] = headerRaw.indexOf(h);

  const parsed: ParsedBulkRow[] = [];
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const raw: Record<string, string> = {};
    for (const h of BULK_HEADERS) raw[h] = (r[idx[h]] ?? "").trim();

    const errors: string[] = [];

    const { iso, error: dateError } = parseDate(raw.scheduledAt);
    if (dateError) errors.push(dateError);

    const imageUrls = parseUrls(raw.imageUrls);
    const videoUrl = raw.videoUrl.trim();

    for (const u of imageUrls) {
      if (!URL_RE.test(u)) errors.push(`imageUrls 잘못됨: ${u}`);
    }
    if (videoUrl && !URL_RE.test(videoUrl)) {
      errors.push(`videoUrl 잘못됨: ${videoUrl}`);
    }
    if (raw.link && !URL_RE.test(raw.link)) {
      errors.push(`link 잘못됨: ${raw.link}`);
    }

    if (!raw.caption && imageUrls.length === 0 && !videoUrl) {
      errors.push("caption / imageUrls / videoUrl 중 하나는 필수");
    }

    const row: BulkRow | null = iso
      ? {
          scheduledAt: iso,
          caption: raw.caption,
          link: raw.link,
          imageUrls,
          videoUrl,
        }
      : null;

    parsed.push({
      rowIndex: i + 1,
      row: errors.length === 0 ? row : null,
      errors,
      raw,
    });
  }

  return { parsed, headerErrors };
}
