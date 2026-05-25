/**
 * ARK CapCut Helper — main process.
 *
 * 백그라운드에서 캡컷 프로젝트 폴더 watch + audio 추출 + 웹앱 sync.
 *
 * 흐름:
 *  1. 앱 시작 → 시스템 트레이에 추가 (창 X)
 *  2. 캡컷 폴더 위치 감지 (macOS/Windows)
 *  3. chokidar로 폴더 watch
 *  4. 새 영상 import 감지 → 알림 (notification)
 *  5. 사용자가 "분석 시작" 클릭하면 audio 추출 + Supabase 업로드
 *  6. 웹앱에서 처리 후 → 결과 파일을 캡컷 프로젝트 폴더에 write back
 */

const { app, BrowserWindow, Tray, Menu, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const chokidar = require('chokidar');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

let tray = null;
let mainWindow = null;
let watcher = null;

/**
 * 캡컷 프로젝트 폴더 위치 자동 감지.
 */
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

function createTrayIcon() {
  const iconPath = path.join(__dirname, '..', 'icon.png');
  // 실제로는 16x16 PNG 아이콘 필요. 일단 placeholder.
  if (!fs.existsSync(iconPath)) {
    console.warn('[helper] icon not found, tray may fail');
  }
  tray = new Tray(iconPath || undefined);
  tray.setToolTip('ARK CapCut Helper');
  rebuildTrayMenu();
}

function rebuildTrayMenu(state = 'idle') {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: `상태: ${state}`, enabled: false },
    { type: 'separator' },
    { label: '대시보드 열기', click: openDashboard },
    { label: '캡컷 폴더 열기', click: openCapcutFolder },
    { type: 'separator' },
    {
      label: '웹앱 열기',
      click: () => shell.openExternal('https://arkvvs-tools.vercel.app'),
    },
    { label: '종료', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function openDashboard() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    title: 'ARK CapCut Helper',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function openCapcutFolder() {
  const dir = getCapcutProjectsDir();
  if (dir && fs.existsSync(dir)) {
    shell.openPath(dir);
  } else {
    new Notification({
      title: 'CapCut 폴더 없음',
      body: '캡컷이 설치되어 있고 프로젝트를 최소 한 번 생성했는지 확인해주세요.',
    }).show();
  }
}

/**
 * 캡컷 폴더 watch — 새 프로젝트 or 영상 import 감지.
 */
function startWatcher() {
  const dir = getCapcutProjectsDir();
  if (!dir) {
    console.warn('[helper] capcut dir not detected for', process.platform);
    return;
  }
  if (!fs.existsSync(dir)) {
    console.warn('[helper] capcut dir does not exist yet:', dir);
    return;
  }
  console.log('[helper] watching', dir);
  watcher = chokidar.watch(dir, {
    depth: 3,
    ignoreInitial: true, // 기존 파일은 무시, 새로 추가되는 것만
    awaitWriteFinish: { stabilityThreshold: 1000 },
  });

  watcher.on('add', (filepath) => {
    // 새 영상 파일 감지 (mp4, mov 등)
    if (/\.(mp4|mov|m4v)$/i.test(filepath)) {
      console.log('[helper] new video detected:', filepath);
      new Notification({
        title: '새 캡컷 영상 감지',
        body: `${path.basename(filepath)} — 자동 분석을 시작할까요?`,
      }).show();
      // TODO: 사용자 클릭 시 audio 추출 + 웹앱 sync 시작
      rebuildTrayMenu('영상 감지됨');
    }
  });
}

/**
 * 영상 파일 → mp3 추출 (ffmpeg).
 * Phase 2의 핵심 — Helper가 사용자 PC에서 추출 → 웹앱에 작은 mp3만 upload.
 */
async function extractAudio(videoPath) {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const outPath = videoPath.replace(/\.[^.]+$/, '.mp3');
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      '-i', videoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-b:a', '64k',
      '-ar', '16000',
      '-ac', '1',
      '-y',
      outPath,
    ]);
    proc.on('close', (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`ffmpeg exit ${code}`));
    });
  });
}

// extractAudio는 추후 watcher event에서 호출됨. 일단 export X (sketch).
void extractAudio;

app.whenReady().then(() => {
  createTrayIcon();
  startWatcher();
  // dock에서 숨김 (Mac)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }
});

app.on('window-all-closed', (e) => {
  // 창 닫혀도 앱 유지 (트레이만)
  e.preventDefault();
});

app.on('before-quit', () => {
  if (watcher) watcher.close();
});

void isDev;
