/**
 * ffmpeg 작업 — audio 추출, 무음 cut, etc.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffmpeg-installer/ffmpeg').path; // ffmpeg-installer ships ffprobe? check
const { AUDIO_OPTS } = require('./config');

function runFfmpeg(args, onProgress) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = '';
    proc.stderr.on('data', (d) => {
      const chunk = d.toString();
      stderr += chunk;
      if (onProgress) {
        // ffmpeg progress parse: "time=00:01:23.45"
        const m = chunk.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (m) {
          const sec = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
          onProgress(sec);
        }
      }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}\n${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

/** 영상 → mp3 추출 (Whisper용 압축 옵션) */
async function extractAudio(videoPath, outputMp3Path, onProgress) {
  const args = [
    '-i', videoPath,
    '-vn',
    '-acodec', 'libmp3lame',
    '-b:a', AUDIO_OPTS.bitrate,
    '-ar', String(AUDIO_OPTS.sampleRate),
    '-ac', String(AUDIO_OPTS.channels),
    '-y',
    outputMp3Path,
  ];
  await runFfmpeg(args, onProgress);
  if (!fs.existsSync(outputMp3Path)) {
    throw new Error('audio 추출 결과 파일이 없음');
  }
  return outputMp3Path;
}

/**
 * 무음 구간 잘라낸 영상 생성.
 *
 * silences: [{start, end, duration, type}]
 * → "keep" 구간들로 변환 → concat filter
 */
async function cutSilences(videoPath, outputVideoPath, silences, totalDurationSec, onProgress) {
  if (!silences || silences.length === 0) {
    // 잘라낼 게 없으면 그대로 복사
    const args = ['-i', videoPath, '-c', 'copy', '-y', outputVideoPath];
    await runFfmpeg(args, onProgress);
    return outputVideoPath;
  }

  // silences → keep segments
  const sorted = [...silences].sort((a, b) => a.start - b.start);
  const keeps = [];
  let cursor = 0;
  for (const s of sorted) {
    if (s.start > cursor + 0.01) {
      keeps.push({ start: cursor, end: s.start });
    }
    cursor = s.end;
  }
  if (cursor < totalDurationSec - 0.01) {
    keeps.push({ start: cursor, end: totalDurationSec });
  }

  if (keeps.length === 0) {
    throw new Error('잘라낸 후 남는 구간이 없습니다');
  }

  // concat filter 빌드
  const filterParts = [];
  const concatInputs = [];
  keeps.forEach((k, i) => {
    filterParts.push(
      `[0:v]trim=start=${k.start}:end=${k.end},setpts=PTS-STARTPTS[v${i}]`,
    );
    filterParts.push(
      `[0:a]atrim=start=${k.start}:end=${k.end},asetpts=PTS-STARTPTS[a${i}]`,
    );
    concatInputs.push(`[v${i}][a${i}]`);
  });
  filterParts.push(`${concatInputs.join('')}concat=n=${keeps.length}:v=1:a=1[outv][outa]`);
  const filterComplex = filterParts.join(';');

  const args = [
    '-i', videoPath,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-y',
    outputVideoPath,
  ];
  await runFfmpeg(args, onProgress);
  return outputVideoPath;
}

/** 영상 길이 (초) */
async function getDuration(videoPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-i', videoPath]);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', () => {
      const m = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (!m) return reject(new Error('duration 파싱 실패'));
      resolve(parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]));
    });
    proc.on('error', reject);
  });
}

void ffprobePath;
module.exports = { extractAudio, cutSilences, getDuration };
