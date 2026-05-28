/**
 * ARK CapCut Helper — error reporter.
 *
 * arkvvs-tools 서버의 /api/log-error로 fire-and-forget POST.
 *  - Electron 28+ builtin fetch 사용 (현재 ^33.4.11)
 *  - throw 안 함 — 로그 흐름이 catch를 두 번 트리거하지 않도록
 *  - 익명 OK (deviceId만 context에 포함)
 *
 * 사용:
 *   const { reportError } = require('./error-reporter');
 *   try { ... } catch (e) {
 *     reportError(e, { route: 'handleApplyJob', context: { jobId } });
 *     throw e;  // (또는 기존 흐름 유지)
 *   }
 */

const ERROR_ENDPOINT =
  process.env.ARK_ERROR_ENDPOINT ||
  'https://tools.arkvvs.ai/api/log-error';

const HELPER_VERSION = (() => {
  try {
    return require('../package.json').version;
  } catch {
    return 'unknown';
  }
})();

let cachedDeviceId = null;

function setDeviceId(id) {
  cachedDeviceId = id || null;
}

function reportError(err, opts = {}) {
  try {
    const message =
      err instanceof Error ? err.message : String(err ?? 'unknown error');
    const stack = err instanceof Error ? err.stack : null;

    const payload = {
      toolSlug: 'capcut-helper',
      source: 'helper',
      route: opts.route ?? null,
      message: message.slice(0, 2000),
      stack: stack ? stack.slice(0, 5000) : null,
      context: {
        ...(opts.context || {}),
        device_id: opts.deviceId ?? cachedDeviceId ?? null,
        helper_version: HELPER_VERSION,
        platform: process.platform,
      },
    };

    // fire-and-forget — promise를 await 하지 않음
    fetch(ERROR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((e) => {
      try {
        console.error('[error-reporter] post failed:', e?.message || e);
      } catch {}
    });
  } catch (e) {
    try {
      console.error('[error-reporter] internal:', e?.message || e);
    } catch {}
  }
}

module.exports = {
  reportError,
  setDeviceId,
};
