// ============================================================================
// App Lock — PIN + Biometric UI gate (v4.3.0)
// UI-only lock: data stays in plaintext IndexedDB. Stops casual shoulder-
// surfing and "someone picks up my phone" threat. Not a crypto barrier.
// ============================================================================

const LS_ENABLED   = 'appLock_enabled';
const LS_PIN_HASH  = 'appLock_pin_hash';
const LS_SALT      = 'appLock_salt';
const LS_TIMEOUT   = 'appLock_timeout';    // minutes; 0 = never
const LS_CRED_ID   = 'appLock_cred_id';   // base64 WebAuthn credential ID

const DEFAULT_TIMEOUT_MINS = 1;

// ---- Inactivity timer ----
let _lockTimer = null;
let _locked = false;

function resetInactivityTimer() {
  const mins = getLockTimeout();
  if (mins === 0) return;
  clearTimeout(_lockTimer);
  _lockTimer = setTimeout(lock, mins * 60 * 1000);
}

function startInactivityTimer() {
  ['click', 'keydown', 'touchstart', 'mousemove'].forEach(evt =>
    document.addEventListener(evt, resetInactivityTimer, { passive: true })
  );
  resetInactivityTimer();
}

function stopInactivityTimer() {
  clearTimeout(_lockTimer);
  ['click', 'keydown', 'touchstart', 'mousemove'].forEach(evt =>
    document.removeEventListener(evt, resetInactivityTimer)
  );
}

// ---- Crypto helpers ----

async function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPIN(pin, saltHex) {
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const pinBytes = new TextEncoder().encode(pin);
  const keyMaterial = await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---- Getters / setters ----

export function isLockEnabled() {
  return localStorage.getItem(LS_ENABLED) === 'true';
}

export function getLockTimeout() {
  const v = localStorage.getItem(LS_TIMEOUT);
  return v !== null ? parseInt(v, 10) : DEFAULT_TIMEOUT_MINS;
}

function setLockTimeout(mins) {
  localStorage.setItem(LS_TIMEOUT, String(mins));
}

function getCredentialId() {
  const b64 = localStorage.getItem(LS_CRED_ID);
  if (!b64) return null;
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function setCredentialId(idBytes) {
  const b64 = btoa(String.fromCharCode(...idBytes));
  localStorage.setItem(LS_CRED_ID, b64);
}

// ---- Biometric support detection ----

export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ---- Lock / Unlock ----

export function lock() {
  if (!isLockEnabled()) return;
  _locked = true;
  stopInactivityTimer();
  document.getElementById('lockOverlay').removeAttribute('hidden');
  document.getElementById('lockOverlay').querySelector('.lock-pin-input').value = '';
  document.getElementById('lockOverlay').querySelector('.lock-error').textContent = '';
  updateBiometricButtonVisibility();
}

async function unlock() {
  _locked = false;
  document.getElementById('lockOverlay').setAttribute('hidden', '');
  startInactivityTimer();
}

export function isLocked() {
  return _locked;
}

// ---- PIN verification ----

async function verifyPIN(pin) {
  const storedHash = localStorage.getItem(LS_PIN_HASH);
  const salt = localStorage.getItem(LS_SALT);
  if (!storedHash || !salt) return false;
  const hash = await hashPIN(pin, salt);
  return hash === storedHash;
}

// ---- Biometric authentication ----

async function authenticateWithBiometric() {
  const credId = getCredentialId();
  if (!credId) return false;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: credId, transports: ['internal'] }],
        userVerification: 'required',
        timeout: 30000,
      }
    });
    return true;
  } catch {
    return false;
  }
}

async function registerBiometric() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(8));
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'FinChronicle', id: location.hostname },
        user: { id: userId, name: 'finchronicle_user', displayName: 'You' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60000,
      }
    });
    setCredentialId(new Uint8Array(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

// ---- Lock overlay helpers ----

function setLockError(msg) {
  const el = document.getElementById('lockOverlay').querySelector('.lock-error');
  el.textContent = msg;
  const input = document.getElementById('lockOverlay').querySelector('.lock-pin-input');
  input.classList.add('lock-input-shake');
  setTimeout(() => input.classList.remove('lock-input-shake'), 400);
}

async function updateBiometricButtonVisibility() {
  const btn = document.getElementById('biometricBtn');
  if (!btn) return;
  const available = await isBiometricAvailable();
  btn.hidden = !available || !getCredentialId();
}

// ---- Setup flow (in Settings) ----

export async function enableLock(pin) {
  const salt = await generateSalt();
  const hash = await hashPIN(pin, salt);
  localStorage.setItem(LS_SALT, salt);
  localStorage.setItem(LS_PIN_HASH, hash);
  localStorage.setItem(LS_ENABLED, 'true');
  if (!localStorage.getItem(LS_TIMEOUT)) {
    setLockTimeout(DEFAULT_TIMEOUT_MINS);
  }
  startInactivityTimer();
  renderLockSettings();
}

export function disableLock() {
  localStorage.removeItem(LS_ENABLED);
  localStorage.removeItem(LS_PIN_HASH);
  localStorage.removeItem(LS_SALT);
  localStorage.removeItem(LS_CRED_ID);
  stopInactivityTimer();
  renderLockSettings();
}

export async function changePIN(currentPin, newPin) {
  const valid = await verifyPIN(currentPin);
  if (!valid) return false;
  await enableLock(newPin);
  return true;
}

// ---- Init (called once from app.js after init()) ----

export async function initAppLock() {
  bindLockOverlayEvents();
  if (!isLockEnabled()) return;
  lock();
}

export function bindLockOverlayEvents() {
  const overlay   = document.getElementById('lockOverlay');
  const pinForm   = document.getElementById('lockPinForm');
  const pinInput  = overlay.querySelector('.lock-pin-input');
  const unlockBtn = overlay.querySelector('.lock-unlock-btn');
  const biometBtn = document.getElementById('biometricBtn');
  const forgotBtn = overlay.querySelector('.lock-forgot-btn');

  async function attemptUnlock() {
    const pin = pinInput.value.trim();
    if (!pin) return;
    const ok = await verifyPIN(pin);
    pinInput.value = '';
    if (ok) {
      await unlock();
    } else {
      setLockError('Wrong PIN. Try again.');
    }
  }

  pinForm.addEventListener('submit', (e) => { e.preventDefault(); attemptUnlock(); });
  unlockBtn.addEventListener('click', attemptUnlock);

  biometBtn?.addEventListener('click', async () => {
    const ok = await authenticateWithBiometric();
    if (ok) {
      await unlock();
    } else {
      setLockError('Biometric failed. Use your PIN instead.');
    }
  });

  forgotBtn.addEventListener('click', () => {
    if (!confirm('Reset your PIN? Your financial data stays safe — only the lock is removed.')) return;
    disableLock();
    _locked = false;
    overlay.setAttribute('hidden', '');
  });

  updateBiometricButtonVisibility();
}

// ---- Settings panel renderer ----

export async function renderLockSettings() {
  const container = document.getElementById('appLockSettingsContainer');
  if (!container) return;

  const enabled   = isLockEnabled();
  const bioAvail  = await isBiometricAvailable();
  const hasCred   = !!getCredentialId();
  const timeout   = getLockTimeout();

  const timeoutOptions = [
    { value: 1,  label: '1 minute' },
    { value: 5,  label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 0,  label: 'Never' },
  ];

  container.innerHTML = `
    <div class="card">
      <h3>App Lock</h3>
      <p class="lock-settings-desc">Require a PIN to open the app. Your data is not encrypted — this stops casual access only.</p>

      ${!enabled ? `
        <form id="lockSetupForm" autocomplete="off">
          <input type="text" name="username" autocomplete="username" hidden aria-hidden="true">
          <label class="lock-label" for="newPinInput">Set a PIN (4–8 digits)</label>
          <input type="password" id="newPinInput" class="lock-settings-input" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" placeholder="Enter PIN" autocomplete="new-password">
          <label class="lock-label" for="confirmPinInput">Confirm PIN</label>
          <input type="password" id="confirmPinInput" class="lock-settings-input" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" placeholder="Confirm PIN" autocomplete="new-password">
          <p class="lock-setup-error" id="lockSetupError"></p>
          <button class="data-backup-btn" id="enableLockBtn" type="submit">
            <i class="ri-lock-line"></i><span>Enable lock</span>
          </button>
        </form>
      ` : `
        <div class="lock-active-panel">
          <div class="lock-status-row">
            <i class="ri-lock-fill lock-active-icon"></i>
            <span class="lock-active-label">Lock is on</span>
            <button class="lock-danger-btn" id="disableLockBtn" type="button">Remove lock</button>
          </div>

          <label class="lock-label" for="lockTimeoutSelect">Auto-lock after</label>
          <select id="lockTimeoutSelect" class="lock-settings-select">
            ${timeoutOptions.map(o =>
              `<option value="${o.value}" ${o.value === timeout ? 'selected' : ''}>${o.label}</option>`
            ).join('')}
          </select>

          <div class="lock-section-divider"></div>
          <p class="lock-label">Change PIN</p>
          <form id="changePinForm" autocomplete="off">
            <input type="text" name="username" autocomplete="username" hidden aria-hidden="true">
            <input type="password" id="currentPinInput" class="lock-settings-input" inputmode="numeric" pattern="[0-9]*" placeholder="Current PIN" autocomplete="current-password">
            <input type="password" id="newPinInput2" class="lock-settings-input" inputmode="numeric" pattern="[0-9]*" placeholder="New PIN (4–8 digits)" autocomplete="new-password">
            <p class="lock-setup-error" id="lockChangeError"></p>
            <button class="data-backup-btn" id="changePinBtn" type="submit">
              <i class="ri-key-line"></i><span>Update PIN</span>
            </button>
          </form>

          ${bioAvail ? `
            <div class="lock-section-divider"></div>
            <p class="lock-label">Biometric fast-unlock</p>
            <p class="lock-settings-desc">${hasCred ? 'Face/fingerprint unlock is on.' : 'Use Face ID, Touch ID, or Windows Hello instead of typing your PIN.'}</p>
            ${hasCred
              ? `<button class="lock-danger-btn" id="removeBiometricBtn" type="button">Remove biometric</button>`
              : `<button class="data-backup-btn" id="addBiometricBtn" type="button"><i class="ri-fingerprint-line"></i><span>Set up biometric</span></button>`
            }
          ` : ''}
        </div>
      `}
    </div>
  `;

  bindLockSettingsEvents();

  // Keep the header lock button in sync
  const lockNowBtn = document.getElementById('lockNowBtn');
  if (lockNowBtn) lockNowBtn.hidden = !enabled;
}

function bindLockSettingsEvents() {
  const setupForm   = document.getElementById('lockSetupForm');
  const changeForm  = document.getElementById('changePinForm');
  const disableBtn  = document.getElementById('disableLockBtn');
  const timeoutSel  = document.getElementById('lockTimeoutSelect');
  const addBioBtn   = document.getElementById('addBiometricBtn');
  const rmBioBtn    = document.getElementById('removeBiometricBtn');

  setupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin     = document.getElementById('newPinInput').value;
    const confirm = document.getElementById('confirmPinInput').value;
    const errEl   = document.getElementById('lockSetupError');
    if (!/^\d{4,8}$/.test(pin)) {
      errEl.textContent = 'PIN must be 4–8 digits.'; return;
    }
    if (pin !== confirm) {
      errEl.textContent = 'PINs don\'t match.'; return;
    }
    await enableLock(pin);
    showLockMessage('Lock enabled.');
  });

  disableBtn?.addEventListener('click', () => {
    if (!confirm('Remove the app lock? Anyone with device access will be able to open the app.')) return;
    disableLock();
    showLockMessage('Lock removed.');
  });

  changeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('currentPinInput').value;
    const next    = document.getElementById('newPinInput2').value;
    const errEl   = document.getElementById('lockChangeError');
    if (!/^\d{4,8}$/.test(next)) {
      errEl.textContent = 'New PIN must be 4–8 digits.'; return;
    }
    const ok = await changePIN(current, next);
    if (ok) {
      showLockMessage('PIN updated.');
    } else {
      errEl.textContent = 'Current PIN is wrong.';
    }
  });

  timeoutSel?.addEventListener('change', () => {
    setLockTimeout(parseInt(timeoutSel.value, 10));
    resetInactivityTimer();
  });

  addBioBtn?.addEventListener('click', async () => {
    const ok = await registerBiometric();
    if (ok) {
      renderLockSettings();
      showLockMessage('Biometric unlock set up.');
    } else {
      showLockMessage('Biometric setup failed. Try again.');
    }
  });

  rmBioBtn?.addEventListener('click', () => {
    localStorage.removeItem(LS_CRED_ID);
    renderLockSettings();
    showLockMessage('Biometric unlock removed.');
  });
}

function showLockMessage(msg) {
  // Reuse the app's existing showMessage if available, else a simple fallback.
  if (typeof window._showMessage === 'function') {
    window._showMessage(msg);
  } else {
    const el = document.getElementById('successMessage');
    if (el) { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }
  }
}
