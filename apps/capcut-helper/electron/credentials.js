/**
 * Helper credentials 저장/조회 — Electron safeStorage 사용.
 * macOS Keychain / Windows DPAPI / Linux libsecret.
 * deviceId는 plain, deviceSecret은 암호화.
 */
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

function credentialsPath() {
  return path.join(app.getPath('userData'), 'credentials.json');
}

function load() {
  try {
    const p = credentialsPath();
    if (!fs.existsSync(p)) return null;
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (!raw.deviceId || !raw.encryptedSecret) return null;
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[creds] safeStorage 사용 불가, plain text fallback');
      return { deviceId: raw.deviceId, deviceSecret: raw.encryptedSecret };
    }
    const buf = Buffer.from(raw.encryptedSecret, 'base64');
    const deviceSecret = safeStorage.decryptString(buf);
    return { deviceId: raw.deviceId, deviceSecret };
  } catch (e) {
    console.error('[creds] load failed:', e.message);
    return null;
  }
}

function save({ deviceId, deviceSecret }) {
  const p = credentialsPath();
  let encryptedSecret;
  if (safeStorage.isEncryptionAvailable()) {
    encryptedSecret = safeStorage.encryptString(deviceSecret).toString('base64');
  } else {
    encryptedSecret = deviceSecret;
  }
  fs.writeFileSync(p, JSON.stringify({ deviceId, encryptedSecret }, null, 2));
}

function clear() {
  try {
    fs.unlinkSync(credentialsPath());
  } catch {}
}

module.exports = { load, save, clear };
