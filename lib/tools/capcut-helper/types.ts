/**
 * 캡컷 Helper App ↔ 웹앱 — 공유 타입.
 * 두 코드베이스(웹앱 + apps/capcut-helper)에서 import.
 */

import type { ProcessResult } from "@/lib/tools/capcut-edit/types";

export type Platform = "darwin" | "win32" | "linux";

export type JobStatus =
  | "detected"
  | "extracting"
  | "uploading"
  | "pending_analysis"
  | "analyzing"
  | "pending_review"
  | "pending_apply"
  | "applying"
  | "done"
  | "error";

export interface CapcutDevice {
  id: string;
  user_id: string | null;
  device_name: string | null;
  platform: Platform | null;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  capcut_dir_path: string | null;
  created_at: string;
}

export interface CapcutJob {
  id: string;
  user_id: string;
  device_id: string;
  project_id: string | null;
  project_dir: string;
  video_path: string;
  video_name: string;
  video_size_bytes: number | null;
  video_duration_sec: number | null;
  audio_storage_path: string | null;
  audio_uploaded_at: string | null;
  result_json: ProcessResult | null;
  analyzed_at: string | null;
  status: JobStatus;
  output_video_path: string | null;
  output_srt_path: string | null;
  output_guide_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  detected: "영상 감지됨",
  extracting: "audio 추출 중",
  uploading: "업로드 중",
  pending_analysis: "분석 대기 중",
  analyzing: "AI 분석 중",
  pending_review: "검수 대기 중",
  pending_apply: "적용 명령 대기 중",
  applying: "영상 처리 중",
  done: "완료",
  error: "오류",
};
