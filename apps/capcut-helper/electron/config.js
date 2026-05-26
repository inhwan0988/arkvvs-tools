/**
 * ARK CapCut Helper — 설정 / 환경 변수.
 */
const path = require('path');
const os = require('os');

// 웹앱 base URL (Helper가 API 호출할 곳)
const WEB_BASE_URL =
  process.env.ARK_WEB_BASE_URL || 'https://arkvvs-tools.vercel.app';

// 캡컷 프로젝트 폴더 자동 감지
function getCapcutProjectsDir() {
  if (process.platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Movies',
      'CapCut',
      'User Data',
      'Projects',
      'com.lveditor.draft',
    );
  } else if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (!appData) return null;
    return path.join(appData, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft');
  }
  return null;
}

// 영상 확장자
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|mkv|avi|webm)$/i;

// audio 추출 옵션 (Whisper 25MB 한도에 맞춤 + 빠른 처리)
const AUDIO_OPTS = {
  bitrate: '64k', // 64kbps mono
  sampleRate: 16000,
  channels: 1,
};

module.exports = {
  WEB_BASE_URL,
  getCapcutProjectsDir,
  VIDEO_EXTENSIONS,
  AUDIO_OPTS,
};
