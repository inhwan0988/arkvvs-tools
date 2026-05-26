/**
 * ARK CapCut Helper — main process.
 *
 * 흐름:
 *  1. App 시작 → credentials 로드
 *     - 없으면: register → pairing code 발급 → UI에 표시
 *     - 있으면: ping으로 paired 여부 확인
 *  2. Paired → chokidar watcher 시작
 *  3. 새 영상 감지 → audio 추출 → Storage 업로드 → job 생성 → status='pending_analysis'
 *  4. 5초 polling → pending_apply job 발견 시 → ffmpeg cut → 결과 파일 저장 → status='done'
 */

const { app, BrowserWindow, Tray, Menu, Notification, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const chokidar = require('chokidar');

const config = require('./config');
const api = require('./api');
const creds = require('./credentials');
const ff = require('./ffmpeg-ops');

const isDev = !app.isPackaged;

let mainWindow = null;
let tray = null;
let watcher = null;
let pollTimer = null;
let state = {
  credentials: null,
  paired: false,
  pairingCode: null,
  pairingExpiresAt: null,
  capcutDir: null,
  status: '대기 중',
  recentJobs: [],
};

function logLine(...args) {
  try {
    fs.appendFileSync(
      path.join(app.getPath('userData'), 'helper.log'),
      `[${new Date().toISOString()}] ${args.join(' ')}\n`,
    );
  } catch {}
  console.log(...args);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 520,
    height: 720,
    title: 'ARK CapCut Helper',
    backgroundColor: '#0a1428',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.on('closed', () => (mainWindow = null));
}

function pushStateToUI() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('helper:state', {
    paired: state.paired,
    pairingCode: state.pairingCode,
    pairingExpiresAt: state.pairingExpiresAt,
    capcutDir: state.capcutDir,
    status: state.status,
    recentJobs: state.recentJobs.slice(0, 10),
  });
}

function setStatus(s) {
  state.status = s;
  logLine('[status]', s);
  pushStateToUI();
  rebuildTrayMenu();
}

function notify(title, body) {
  if (Notification.isSupported()) {
    try {
      new Notification({ title, body }).show();
    } catch (e) {
      logLine('[notify] failed:', e.message);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tray
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'tray-icon.png');
  try {
    tray = new Tray(fs.existsSync(iconPath) ? iconPath : undefined);
  } catch {
    tray = null;
  }
  if (!tray) return;
  tray.setToolTip('ARK CapCut Helper');
  rebuildTrayMenu();
  tray.on('click', createWindow);
}

function rebuildTrayMenu() {
  if (!tray) return;
  const items = [
    { label: `상태: ${state.status}`, enabled: false },
    { type: 'separator' },
    { label: '대시보드 열기', click: createWindow },
    { label: '캡컷 폴더 열기', click: openCapcutFolder },
    {
      label: '웹앱 열기',
      click: () => shell.openExternal(`${config.WEB_BASE_URL}/tools/capcut-edit`),
    },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(items));
}

function openCapcutFolder() {
  const dir = config.getCapcutProjectsDir();
  if (dir && fs.existsSync(dir)) {
    shell.openPath(dir);
  } else {
    notify('CapCut 폴더 없음', '캡컷이 설치되어 있고 프로젝트를 최소 한 번 생성했는지 확인해주세요.');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 페어링
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function bootstrapPairing() {
  setStatus('페어링 코드 발급 중...');
  try {
    const dir = config.getCapcutProjectsDir();
    const result = await api.register(process.platform, dir);
    creds.save({ deviceId: result.deviceId, deviceSecret: result.deviceSecret });
    state.credentials = { deviceId: result.deviceId, deviceSecret: result.deviceSecret };
    state.pairingCode = result.pairingCode;
    state.pairingExpiresAt = result.expiresAt;
    setStatus('웹앱에서 페어링 대기 중');
    pushStateToUI();
  } catch (e) {
    setStatus('페어링 실패: ' + e.message);
    notify('페어링 실패', e.message);
  }
}

async function checkPaired() {
  if (!state.credentials) return;
  try {
    const data = await api.ping(state.credentials);
    if (data.paired) {
      const wasUnpaired = !state.paired;
      state.paired = true;
      state.pairingCode = null;
      if (wasUnpaired) {
        notify('✅ 페어링 완료', '캡컷 폴더 감시를 시작합니다.');
        setStatus('연동 완료 — 캡컷 폴더 감시 중');
        startWatcher();
      }
      // pending_apply jobs 처리
      if (data.pendingJobs && data.pendingJobs.length > 0) {
        for (const job of data.pendingJobs) {
          await handleApplyJob(job);
        }
      }
    } else {
      state.paired = false;
    }
    pushStateToUI();
  } catch (e) {
    if (e.status === 401) {
      // device 정보 불일치 → credentials 폐기 + 재등록
      logLine('[ping] 401 — credentials reset');
      creds.clear();
      state.credentials = null;
      state.paired = false;
      await bootstrapPairing();
    } else {
      logLine('[ping] error:', e.message);
    }
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  // 5초 간격 polling
  pollTimer = setInterval(checkPaired, 5000);
  checkPaired();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Watcher — 새 영상 감지 → audio 추출 → 업로드 → job 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startWatcher() {
  if (watcher) return;
  const dir = config.getCapcutProjectsDir();
  if (!dir) {
    setStatus(`이 OS(${process.platform})에서 캡컷 폴더를 찾을 수 없어요`);
    return;
  }
  if (!fs.existsSync(dir)) {
    setStatus('캡컷 폴더 없음 — 캡컷 한 번 실행 후 다시 시작해주세요');
    return;
  }
  state.capcutDir = dir;
  logLine('[watch] start', dir);

  watcher = chokidar.watch(dir, {
    depth: 4,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 200,
    },
  });

  const processed = new Set();
  watcher.on('add', async (filepath) => {
    if (!config.VIDEO_EXTENSIONS.test(filepath)) return;
    if (processed.has(filepath)) return;
    processed.add(filepath);
    await processNewVideo(filepath);
  });

  watcher.on('error', (e) => logLine('[watch] error:', e.message));
  pushStateToUI();
}

async function processNewVideo(videoPath) {
  if (!state.credentials || !state.paired) return;

  const videoName = path.basename(videoPath);
  // project dir 추정: .../<project_uuid>/resources/video_clips/foo.mp4
  // → .../<project_uuid>
  const parts = videoPath.split(path.sep);
  const projectIdx = parts.findIndex((p) => p === 'com.lveditor.draft');
  const projectId = projectIdx >= 0 ? parts[projectIdx + 1] : null;
  const projectDir = projectId
    ? parts.slice(0, projectIdx + 2).join(path.sep)
    : path.dirname(videoPath);

  logLine('[video] new:', videoName, 'project:', projectId);
  notify('📹 새 영상 감지', `${videoName} — audio 추출 + 업로드 중...`);

  try {
    // 1. 영상 길이
    const duration = await ff.getDuration(videoPath);
    const sizeBytes = fs.statSync(videoPath).size;

    // 2. job row 생성
    const { job } = await api.createJob(state.credentials, {
      projectId,
      projectDir,
      videoPath,
      videoName,
      videoSizeBytes: sizeBytes,
      videoDurationSec: duration,
    });
    pushJobToRecent(job);
    setStatus(`audio 추출 중 — ${videoName}`);

    // 3. audio 추출
    const audioPath = path.join(
      app.getPath('temp'),
      `arc-capcut-${job.id}.mp3`,
    );
    await api.updateJob(state.credentials, job.id, { status: 'extracting' });
    await ff.extractAudio(videoPath, audioPath);

    // 4. Storage 업로드
    setStatus(`업로드 중 — ${videoName}`);
    await api.updateJob(state.credentials, job.id, { status: 'uploading' });
    const { uploadUrl, path: storagePath } = await api.getUploadUrl(
      state.credentials,
      job.id,
    );
    await api.uploadAudio(uploadUrl, audioPath);

    // 5. status 업데이트 — 분석 대기
    await api.updateJob(state.credentials, job.id, {
      status: 'pending_analysis',
      audioStoragePath: storagePath,
    });

    try {
      fs.unlinkSync(audioPath);
    } catch {}

    setStatus('연동 완료 — 캡컷 폴더 감시 중');
    notify('✅ 업로드 완료', `웹앱에서 ${videoName} 분석을 시작해주세요.`);
  } catch (e) {
    logLine('[video] processing failed:', e.message);
    setStatus('연동 완료 — 캡컷 폴더 감시 중');
    notify('❌ 처리 실패', e.message);
  }
}

function pushJobToRecent(job) {
  state.recentJobs = [job, ...state.recentJobs.filter((j) => j.id !== job.id)].slice(0, 20);
  pushStateToUI();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// apply 처리 — pending_apply job → ffmpeg cut → 결과 저장
// (M4에서 본격 구현)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleApplyJob(job) {
  if (!state.credentials) return;
  logLine('[apply] start', job.id);
  setStatus(`영상 처리 중 — ${job.video_name}`);
  pushJobToRecent({ ...job, status: 'applying' });

  try {
    await api.updateJob(state.credentials, job.id, { status: 'applying' });

    const result = job.result_json;
    if (!result) throw new Error('result_json 없음 — 분석이 안 끝났습니다');

    const projectDir = job.project_dir;
    const baseName = path.basename(job.video_name, path.extname(job.video_name));
    const outputDir = path.join(projectDir, 'resources', 'ark-output');
    fs.mkdirSync(outputDir, { recursive: true });

    const outputVideoPath = path.join(outputDir, `${baseName}_cut.mp4`);
    const outputSrtPath = path.join(outputDir, `${baseName}.srt`);
    const outputGuidePath = path.join(outputDir, `${baseName}_guide.txt`);

    // 1. 무음 cut된 영상
    await ff.cutSilences(
      job.video_path,
      outputVideoPath,
      result.silences || [],
      result.duration || 0,
    );

    // 2. .srt 자막
    const srt = buildSrt(result.subtitles || []);
    fs.writeFileSync(outputSrtPath, srt);

    // 3. 가이드 txt (포인트 자막 + 효과음)
    const guide = buildGuide(result);
    fs.writeFileSync(outputGuidePath, guide);

    await api.updateJob(state.credentials, job.id, {
      status: 'done',
      outputVideoPath,
      outputSrtPath,
      outputGuidePath,
    });

    setStatus('연동 완료 — 캡컷 폴더 감시 중');
    notify(
      '🎉 처리 완료',
      `${baseName}_cut.mp4 + .srt + 가이드 저장됨\n캡컷에서 import해주세요.`,
    );
    shell.openPath(outputDir);
  } catch (e) {
    logLine('[apply] failed:', e.message);
    await api.updateJob(state.credentials, job.id, {
      status: 'error',
      errorMessage: e.message,
    });
    setStatus('연동 완료 — 캡컷 폴더 감시 중');
    notify('❌ 영상 처리 실패', e.message);
  }
}

function buildSrt(subtitles) {
  return subtitles
    .map((s, i) => {
      return `${i + 1}\n${fmtSrtTime(s.start)} --> ${fmtSrtTime(s.end)}\n${s.text}\n`;
    })
    .join('\n');
}

function fmtSrtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function buildGuide(result) {
  const lines = ['[ ARK CapCut Helper — 가이드 ]', ''];
  lines.push(`영상 길이: ${result.duration?.toFixed(1)}초`);
  lines.push(`자막: ${result.subtitles?.length || 0}줄`);
  lines.push(`무음 컷: ${result.silences?.length || 0}개`);
  lines.push(`포인트 자막: ${result.points?.length || 0}개`);
  lines.push('');
  if (result.points?.length) {
    lines.push('━━ 포인트 자막 + 효과음 ━━');
    result.points.forEach((p, i) => {
      lines.push(
        `${i + 1}. ${fmtMs(p.time)}  "${p.text}" ${p.emoji || ''}  효과음: ${p.soundEffect?.name || '(없음)'}`,
      );
      if (p.sourceText) lines.push(`    원문 참고: "${p.sourceText}"`);
    });
  }
  return lines.join('\n');
}

function fmtMs(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IPC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ipcMain.handle('helper:getState', () => ({
  paired: state.paired,
  pairingCode: state.pairingCode,
  pairingExpiresAt: state.pairingExpiresAt,
  capcutDir: state.capcutDir,
  status: state.status,
  recentJobs: state.recentJobs.slice(0, 10),
}));

ipcMain.handle('helper:openWebApp', () => {
  shell.openExternal(`${config.WEB_BASE_URL}/tools/capcut-edit`);
});

ipcMain.handle('helper:openCapcutFolder', openCapcutFolder);

ipcMain.handle('helper:unpair', async () => {
  creds.clear();
  state.credentials = null;
  state.paired = false;
  state.pairingCode = null;
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
  await bootstrapPairing();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// App lifecycle
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.whenReady().then(async () => {
  createTray();
  if (process.platform === 'darwin' && app.dock) {
    // tray app: dock 보이도록 (사용자가 클릭 가능하게)
    // app.dock.hide();
  }
  createWindow();

  // 1) credentials 로드
  state.credentials = creds.load();
  if (!state.credentials) {
    await bootstrapPairing();
  } else {
    setStatus('페어링 상태 확인 중...');
  }

  // 2) polling 시작
  startPolling();
});

app.on('window-all-closed', (e) => {
  // 트레이만으로도 동작하니까 종료 X
  if (process.platform !== 'darwin') {
    // Win/Linux에서도 tray만 남기고 싶으면 e.preventDefault()
    e.preventDefault();
  }
});

app.on('before-quit', async () => {
  if (watcher) await watcher.close();
  if (pollTimer) clearInterval(pollTimer);
});

void isDev;
void os;
void dialog;
