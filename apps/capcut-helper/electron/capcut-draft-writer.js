/**
 * 캡컷 draft 직접 수정 — capcut-cli (ESM) wrapper.
 *
 * 기존 흐름(v0.1.x): 별도 .mp4 + .srt + 가이드를 캡컷 폴더에 저장 → 사용자가 import.
 * 새 흐름(v0.2.0+): 캡컷 프로젝트의 draft_info.json을 직접 수정 → 사용자가 캡컷 재시작하면 모든 게 적용된 상태로 표시.
 *
 * capcut-cli는 ESM이고 Electron main은 CommonJS이므로 dynamic import 사용.
 * capcut-cli의 saveDraft는 자동으로 .bak 백업을 만들어 줌 (안전).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

/** ESM 모듈 lazy load */
async function loadCli() {
  // capcut-cli/dist 안의 컴파일된 ESM 파일들을 동적으로 import
  const draft = await import('capcut-cli/dist/draft.js');
  return { draft };
}

/**
 * 캡컷이 현재 실행 중인지 — draft 수정 시 충돌 방지용.
 * 캡컷이 열려 있으면 우리가 쓴 변경을 덮어쓰거나 file lock 충돌 가능.
 */
function isCapcutRunning() {
  try {
    if (process.platform === 'darwin') {
      const out = execSync('pgrep -fl "CapCut"', { encoding: 'utf-8' });
      // CapCut Helper도 있으니 정확히 매칭
      return /\/Applications\/CapCut\.app\//.test(out);
    } else if (process.platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq CapCut.exe"', {
        encoding: 'utf-8',
      });
      return /CapCut\.exe/i.test(out);
    }
  } catch {
    // pgrep returns non-zero when no match
  }
  return false;
}

function uuidUpper() {
  return crypto.randomUUID().toUpperCase();
}

/** seconds → microseconds (capcut 내부 단위) */
function secToMicros(sec) {
  return Math.round(sec * 1_000_000);
}

/**
 * 사용자 result_json의 subtitles → 캡컷 caption-track 추가.
 *
 * capcut-cli/src/caption.ts의 패턴을 참고 — sub_type:1 + caption_template_info를 박아서
 * 캡컷 UI가 자막으로 인식하게 함 (단순 텍스트 오버레이가 아니라).
 */
function appendCaptionTrack(draft, subtitles, trackName = 'ark-captions') {
  if (!subtitles || subtitles.length === 0) return 0;
  if (!Array.isArray(draft.materials.texts)) draft.materials.texts = [];

  let track = draft.tracks.find(
    (t) => t.type === 'text' && t.name === trackName,
  );
  if (!track) {
    track = {
      id: uuidUpper(),
      type: 'text',
      name: trackName,
      attribute: 0,
      segments: [],
    };
    draft.tracks.push(track);
  }

  const baseStyle = {
    font_size: 15,
    font_color: '#FFFFFF',
    font_family: 'Pretendard',
  };

  for (const sub of subtitles) {
    const matId = uuidUpper();
    const content = JSON.stringify({
      text: sub.text,
      styles: [
        {
          ...baseStyle,
          range: [0, Buffer.from(sub.text, 'utf16le').length],
        },
      ],
    });

    const textMaterial = {
      id: matId,
      type: 'text',
      content,
      font_size: baseStyle.font_size,
      text_color: baseStyle.font_color,
      alignment: 1,
      sub_type: 1,
      caption_template_info: {
        category_id: '',
        category_name: '',
        effect_id: '',
        is_new: false,
        resource_id: '',
      },
    };
    draft.materials.texts.push(textMaterial);

    track.segments.push({
      id: uuidUpper(),
      material_id: matId,
      target_timerange: {
        start: secToMicros(sub.start),
        duration: secToMicros(sub.end - sub.start),
      },
      source_timerange: {
        start: 0,
        duration: secToMicros(sub.end - sub.start),
      },
      speed: 1,
      volume: 1,
      visible: true,
      clip: {
        alpha: 1,
        rotation: 0,
        scale: { x: 1, y: 1 },
        transform: { x: 0, y: -0.6 },
      },
      extra_material_refs: [],
      render_index: 0,
    });
  }
  return subtitles.length;
}

/**
 * 포인트 자막(강조 자막) → 별도 text track.
 * 큰 폰트 + 위쪽 배치.
 */
function appendPointTrack(draft, points, trackName = 'ark-points') {
  if (!points || points.length === 0) return 0;
  if (!Array.isArray(draft.materials.texts)) draft.materials.texts = [];

  let track = draft.tracks.find(
    (t) => t.type === 'text' && t.name === trackName,
  );
  if (!track) {
    track = {
      id: uuidUpper(),
      type: 'text',
      name: trackName,
      attribute: 0,
      segments: [],
    };
    draft.tracks.push(track);
  }

  for (const p of points) {
    const matId = uuidUpper();
    const displayText = (p.emoji ? p.emoji + ' ' : '') + (p.text || '');
    const content = JSON.stringify({
      text: displayText,
      styles: [
        {
          font_size: 24,
          font_color: '#FFE600',
          font_family: 'Pretendard',
          range: [0, Buffer.from(displayText, 'utf16le').length],
        },
      ],
    });

    const textMaterial = {
      id: matId,
      type: 'text',
      content,
      font_size: 24,
      text_color: '#FFE600',
      alignment: 1,
    };
    draft.materials.texts.push(textMaterial);

    track.segments.push({
      id: uuidUpper(),
      material_id: matId,
      target_timerange: {
        start: secToMicros(p.time),
        duration: secToMicros(p.duration || 2),
      },
      source_timerange: { start: 0, duration: secToMicros(p.duration || 2) },
      speed: 1,
      volume: 1,
      visible: true,
      clip: {
        alpha: 1,
        rotation: 0,
        scale: { x: 1, y: 1 },
        transform: { x: 0, y: 0.5 },
      },
      extra_material_refs: [],
      render_index: 0,
    });
  }
  return points.length;
}

/**
 * 무음 구간을 video track segment에서 cut.
 *
 * 캡컷의 video segment는 source_timerange + target_timerange로 정의됨.
 * 기존 segment 1개를 silences 사이의 "keep" 구간들로 split하고,
 * target_timerange를 cumulative하게 재계산.
 *
 * 안전: 이 작업은 main video track 1개에만 적용 (다른 트랙은 손대지 않음).
 */
function cutSilencesInVideoTrack(draft, silences, totalDurationSec) {
  if (!silences || silences.length === 0) return 0;

  // main video track 1개 찾기
  const videoTracks = draft.tracks.filter((t) => t.type === 'video');
  if (videoTracks.length === 0) return 0;
  const vt = videoTracks[0]; // 첫 번째 video track만 처리

  // segment가 정확히 1개여야 함 (일반적인 import 직후 상태)
  if (vt.segments.length !== 1) {
    // 사용자가 이미 cut을 한 경우 — 그대로 두고 skip
    return -1;
  }
  const orig = vt.segments[0];
  const origSourceStart = orig.source_timerange.start;

  // silences → "keep" 구간들
  const sorted = [...silences].sort((a, b) => a.start - b.start);
  const keeps = [];
  let cursor = 0;
  for (const s of sorted) {
    if (s.start > cursor + 0.01) keeps.push({ start: cursor, end: s.start });
    cursor = s.end;
  }
  if (cursor < totalDurationSec - 0.01) {
    keeps.push({ start: cursor, end: totalDurationSec });
  }
  if (keeps.length === 0) return 0;

  // 새 segments 생성 — keep 구간 각각이 새 segment
  const newSegments = [];
  let targetCursor = 0;
  for (const k of keeps) {
    const durMicros = secToMicros(k.end - k.start);
    newSegments.push({
      ...orig, // material_id, speed, clip, render_index 등 그대로
      id: uuidUpper(),
      source_timerange: {
        start: origSourceStart + secToMicros(k.start),
        duration: durMicros,
      },
      target_timerange: {
        start: targetCursor,
        duration: durMicros,
      },
    });
    targetCursor += durMicros;
  }

  vt.segments = newSegments;

  // draft.duration 갱신
  draft.duration = targetCursor;

  return newSegments.length;
}

/**
 * 우리 ProcessResult를 받아 캡컷 draft를 수정 + 저장.
 *
 * @param {string} projectDir — 캡컷 프로젝트 폴더 (uuid 포함)
 * @param {object} result — ProcessResult { subtitles, silences, points, duration }
 * @returns {object} 결과 통계 (draftPath, captions, points, segments, backupPath)
 */
async function applyResultToCapcut(projectDir, result) {
  if (isCapcutRunning()) {
    throw new Error(
      'CapCut이 실행 중입니다. 캡컷을 완전히 종료하고 다시 시도해주세요.\n(파일 잠금 + 덮어쓰기 위험)',
    );
  }

  const { draft: cli } = await loadCli();
  const { draft, filePath } = cli.loadDraft(projectDir);

  // 1) 무음 구간 cut
  const cutCount = cutSilencesInVideoTrack(
    draft,
    result.silences,
    result.duration,
  );

  // 2) 일반 자막 트랙 추가
  const capCount = appendCaptionTrack(draft, result.subtitles);

  // 3) 포인트 자막 트랙 추가
  const pointCount = appendPointTrack(draft, result.points);

  // 저장 — capcut-cli의 saveDraft는 자동 .bak 생성
  cli.saveDraft(filePath, draft);

  return {
    draftPath: filePath,
    backupPath: filePath + '.bak',
    cuts: cutCount,
    captions: capCount,
    points: pointCount,
    newDurationSec: draft.duration / 1_000_000,
  };
}

module.exports = {
  applyResultToCapcut,
  isCapcutRunning,
};
