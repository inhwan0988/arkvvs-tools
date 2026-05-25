/**
 * 캡컷 draft_content.json 파싱/수정 (Phase 3).
 *
 * ⚠️ DISCLAIMER:
 * 캡컷의 .draft 파일은 공식 spec이 없고, 버전에 따라 변경됩니다.
 * 아래 구조는 community reverse engineering 기반 추정.
 * 실제 launch 전 본인 캡컷 버전에서 sample 만들어 spec 확인 필수.
 *
 * 작업 순서 (Phase 3):
 * 1. 본인 캡컷에서 minimal 프로젝트 만들기:
 *    - 영상 1개 + 자막 1줄 + 효과음 1개 + 컷 1개
 * 2. ~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<uuid>/draft_content.json 복사
 * 3. JSON 구조 분석 → 아래 type 보강
 * 4. 우리 데이터를 그 구조로 변환 → 파일 쓰기
 * 5. 캡컷 재시작 → 정상 인식 확인
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 캡컷 draft 파일 읽기.
 */
function readDraft(projectDir) {
  const contentPath = path.join(projectDir, 'draft_content.json');
  if (!fs.existsSync(contentPath)) {
    throw new Error(`draft_content.json 없음: ${contentPath}`);
  }
  return JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
}

/**
 * 캡컷 draft 파일 쓰기 (backup 자동 생성).
 */
function writeDraft(projectDir, content) {
  const contentPath = path.join(projectDir, 'draft_content.json');
  // 백업 생성
  const backupPath = contentPath + '.backup.' + Date.now();
  if (fs.existsSync(contentPath)) {
    fs.copyFileSync(contentPath, backupPath);
  }
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));
  return backupPath;
}

/**
 * 캡컷 timestamp 변환: 초 → microseconds.
 * 캡컷은 시간을 microsecond (µs) 단위로 저장.
 */
function secToMicros(sec) {
  return Math.round(sec * 1_000_000);
}

/**
 * 새 UUID (캡컷 segment id용).
 */
function newId() {
  return crypto.randomUUID().toUpperCase();
}

/**
 * 자막 segment 생성 — 우리 SubtitleSegment → 캡컷 text segment.
 *
 * (추정 구조 — 실제 spec 확인 필요)
 */
function buildSubtitleSegment(subtitle, trackId) {
  return {
    id: newId(),
    type: 'text',
    target_timerange: {
      start: secToMicros(subtitle.start),
      duration: secToMicros(subtitle.end - subtitle.start),
    },
    content: {
      text: subtitle.text,
      font_size: 8.0,
      font_family: 'Pretendard',
      text_color: [1.0, 1.0, 1.0], // RGB white
      // ... 더 많은 styling 옵션 (캡컷 spec 확인 후 추가)
    },
    track_id: trackId,
  };
}

/**
 * 효과음 segment 생성.
 */
function buildAudioSegment(soundEffect, time, materialId, trackId) {
  return {
    id: newId(),
    type: 'audio',
    material_id: materialId, // resources/ 안 mp3 파일 reference
    target_timerange: {
      start: secToMicros(time),
      duration: secToMicros(soundEffect.duration),
    },
    track_id: trackId,
    volume: 0.8,
  };
}

/**
 * 무음 컷 — 영상 segment를 여러 개로 split하면서 무음 구간 제거.
 * 가장 복잡한 부분. Phase 3에서 가장 신중히 구현.
 */
function applyCuts(videoSegments, silences) {
  // sketch: 각 video segment를 silence 범위로 split
  // 실제 구현은 segment의 source_timerange + target_timerange 계산 필요
  // 무음 구간 잘라낸 후 뒷 segment들 timerange 당기기
  console.warn('[capcut-draft] applyCuts not yet implemented — Phase 3');
  void silences;
  return videoSegments;
}

/**
 * 우리 분석 결과 → 캡컷 draft 파일 수정.
 *
 * @param projectDir 캡컷 프로젝트 폴더 (uuid 포함)
 * @param result ProcessResult (자막/포인트/무음/효과음)
 */
function applyToCapcutDraft(projectDir, result) {
  const draft = readDraft(projectDir);
  // TODO: 캡컷 draft 구조 분석 후 정확히 수정
  // - draft.tracks[i].segments 에 자막/효과음 추가
  // - draft.materials.audios 에 효과음 mp3 파일 reference 추가
  // - draft.tracks[videoTrack].segments 무음 범위 잘라내기

  void buildSubtitleSegment;
  void buildAudioSegment;
  void applyCuts;
  void result;

  console.warn('[capcut-draft] applyToCapcutDraft — Phase 3 not yet implemented');
  return writeDraft(projectDir, draft);
}

module.exports = {
  readDraft,
  writeDraft,
  secToMicros,
  newId,
  buildSubtitleSegment,
  buildAudioSegment,
  applyCuts,
  applyToCapcutDraft,
};
