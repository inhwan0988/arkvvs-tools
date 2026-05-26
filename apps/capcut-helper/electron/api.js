/**
 * ARK CapCut Helper — 웹앱 API 호출 helper.
 */
const { WEB_BASE_URL } = require('./config');

function authHeader(credentials) {
  if (!credentials?.deviceId || !credentials?.deviceSecret) return {};
  return {
    Authorization: `Bearer ${credentials.deviceId}.${credentials.deviceSecret}`,
  };
}

async function api(path, options = {}, credentials = null) {
  const url = `${WEB_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...authHeader(credentials),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${res.status}` };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/** 첫 실행 — device 등록 + pairing code 발급 */
async function register(platform, capcutDirPath) {
  return api('/api/tools/capcut-helper/register', {
    method: 'POST',
    body: JSON.stringify({ platform, capcutDirPath }),
  });
}

/** 폴링 — paired 상태 + pending jobs */
async function ping(credentials) {
  return api('/api/tools/capcut-helper/ping', { method: 'POST' }, credentials);
}

/** 새 영상 감지 → job 생성 */
async function createJob(credentials, payload) {
  return api(
    '/api/tools/capcut-helper/jobs',
    { method: 'POST', body: JSON.stringify(payload) },
    credentials,
  );
}

/** job 상태/결과 업데이트 */
async function updateJob(credentials, jobId, patch) {
  return api(
    `/api/tools/capcut-helper/jobs/${jobId}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
    credentials,
  );
}

/** Storage signed upload URL 발급 */
async function getUploadUrl(credentials, jobId) {
  return api(
    '/api/tools/capcut-helper/upload-url',
    { method: 'POST', body: JSON.stringify({ jobId }) },
    credentials,
  );
}

/** Supabase Storage signed URL로 audio mp3 PUT */
async function uploadAudio(uploadUrl, audioPath) {
  const fs = require('fs');
  const buffer = fs.readFileSync(audioPath);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: buffer,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Storage upload failed: ${res.status} ${txt.slice(0, 200)}`);
  }
}

module.exports = {
  register,
  ping,
  createJob,
  updateJob,
  getUploadUrl,
  uploadAudio,
};
