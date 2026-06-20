// ============================================================================
// App Lock — PIN + Biometric UI gate (v4.3.0)
// UI-only lock: data stays in plaintext IndexedDB. Stops casual shoulder-
// surfing and "someone picks up my phone" threat. Not a crypto barrier.
// ============================================================================

import { showMessage } from "./utils.js";

const LS_ENABLED = "appLock_enabled";
const LS_PIN_HASH = "appLock_pin_hash";
const LS_SALT = "appLock_salt";
const LS_TIMEOUT = "appLock_timeout"; // minutes; 0 = never
const LS_CRED_ID = "appLock_cred_id"; // base64 WebAuthn credential ID

const DEFAULT_TIMEOUT_MINS = 1;

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
let _pinAttempts = 0;
let _lockoutUntil = 0; // epoch ms
let _lockoutTimer = null;

const TIMEOUT_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 0, label: "Never" },
];

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
  ["click", "keydown", "touchstart", "mousemove"].forEach((evt) =>
    document.addEventListener(evt, resetInactivityTimer, { passive: true }),
  );
  resetInactivityTimer();
}

function stopInactivityTimer() {
  clearTimeout(_lockTimer);
  ["click", "keydown", "touchstart", "mousemove"].forEach((evt) =>
    document.removeEventListener(evt, resetInactivityTimer),
  );
}

// ---- Crypto helpers ----

async function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPIN(pin, saltHex) {
  const saltBytes = new Uint8Array(
    saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)),
  );
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

// ---- localStorage helpers ----

export function isLockEnabled() {
  return localStorage.getItem(LS_ENABLED) === "true";
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
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function setCredentialId(idBytes) {
  localStorage.setItem(LS_CRED_ID, btoa(String.fromCharCode(...idBytes)));
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

// ---- Lock overlay DOM helpers ----

function getLockOverlay() {
  return document.getElementById("lockOverlay");
}

function setLockError(msg) {
  const overlay = getLockOverlay();
  overlay.querySelector(".lock-error").textContent = msg;
  const input = overlay.querySelector(".lock-pin-input");
  input.classList.add("lock-input-shake");
  setTimeout(() => input.classList.remove("lock-input-shake"), 400);
}

async function updateBiometricButtonVisibility() {
  const btn = document.getElementById("biometricBtn");
  if (!btn) return;
  btn.hidden = !(await isBiometricAvailable()) || !getCredentialId();
}

function updateLockButtonVisibility() {
  const btn = document.getElementById("lockNowBtn");
  if (btn) btn.hidden = !isLockEnabled();
}

// ---- Lock / Unlock ----

export function lock() {
  if (!isLockEnabled()) return;
  _locked = true;
  _pinAttempts = 0;
  _lockoutUntil = 0;
  clearInterval(_lockoutTimer);
  stopInactivityTimer();
  const overlay = getLockOverlay();
  overlay.removeAttribute("hidden");
  const pinInput = overlay.querySelector(".lock-pin-input");
  pinInput.value = "";
  pinInput.disabled = false;
  overlay.querySelector(".lock-error").textContent = "";
  updateBiometricButtonVisibility();
  _autoTriggerBiometric();
}

async function _autoTriggerBiometric() {
  if (!getCredentialId() || !(await isBiometricAvailable())) return;
  // Brief delay so the overlay is visible before the OS prompt appears
  await new Promise((r) => setTimeout(r, 350));
  if (!_locked) return;
  if (await authenticateWithBiometric()) await unlock();
  // Dismissed or failed — silently stay on PIN screen
}

async function unlock() {
  _locked = false;
  getLockOverlay().setAttribute("hidden", "");
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
  return (await hashPIN(pin, salt)) === storedHash;
}

// ---- Biometric registration / authentication ----

async function authenticateWithBiometric() {
  const credId = getCredentialId();
  if (!credId) return false;
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          { type: "public-key", id: credId, transports: ["internal"] },
        ],
        userVerification: "required",
        timeout: 30000,
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function registerBiometric() {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "FinChronicle", id: location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(8)),
          name: "finchronicle_user",
          displayName: "You",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "discouraged",
        },
        timeout: 60000,
      },
    });
    setCredentialId(new Uint8Array(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

// ---- Lock setup / teardown ----

export async function enableLock(pin) {
  const salt = await generateSalt();
  localStorage.setItem(LS_SALT, salt);
  localStorage.setItem(LS_PIN_HASH, await hashPIN(pin, salt));
  localStorage.setItem(LS_ENABLED, "true");
  if (!localStorage.getItem(LS_TIMEOUT)) setLockTimeout(DEFAULT_TIMEOUT_MINS);
  startInactivityTimer();
  await renderLockSettings();
  updateLockButtonVisibility();
}

export function disableLock() {
  [LS_ENABLED, LS_PIN_HASH, LS_SALT, LS_CRED_ID, LS_TIMEOUT].forEach((k) =>
    localStorage.removeItem(k),
  );
  stopInactivityTimer();
  updateLockButtonVisibility();
  renderLockSettings();
}

export async function changePIN(currentPin, newPin) {
  if (!(await verifyPIN(currentPin))) return false;
  await enableLock(newPin);
  return true;
}

// ---- Init ----

export async function initAppLock() {
  bindLockOverlayEvents();
  updateLockButtonVisibility();
  if (isLockEnabled()) lock();
}

// ---- Lock overlay events ----

export function bindLockOverlayEvents() {
  const overlay = getLockOverlay();
  const pinForm = document.getElementById("lockPinForm");
  const pinInput = overlay.querySelector(".lock-pin-input");
  const unlockBtn = overlay.querySelector(".lock-unlock-btn");
  const biometBtn = document.getElementById("biometricBtn");
  const forgotBtn = overlay.querySelector(".lock-forgot-btn");

  async function attemptUnlock() {
    const pin = pinInput.value.trim();
    if (!pin) return;

    // Enforce lockout cooldown
    const now = Date.now();
    if (_lockoutUntil > now) {
      const secs = Math.ceil((_lockoutUntil - now) / 1000);
      setLockError(`Too many attempts. Try again in ${secs}s.`);
      pinInput.value = "";
      return;
    }

    pinInput.value = "";
    if (await verifyPIN(pin)) {
      _pinAttempts = 0;
      _lockoutUntil = 0;
      clearInterval(_lockoutTimer);
      await unlock();
    } else {
      _pinAttempts += 1;
      const remaining = MAX_PIN_ATTEMPTS - _pinAttempts;
      if (_pinAttempts >= MAX_PIN_ATTEMPTS) {
        _pinAttempts = 0;
        _lockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;
        pinInput.disabled = true;
        unlockBtn.disabled = true;
        setLockError(`Too many attempts. Locked for ${LOCKOUT_SECONDS}s.`);
        let countdown = LOCKOUT_SECONDS;
        _lockoutTimer = setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            clearInterval(_lockoutTimer);
            pinInput.disabled = false;
            unlockBtn.disabled = false;
            setLockError("");
          } else {
            setLockError(`Too many attempts. Try again in ${countdown}s.`);
          }
        }, 1000);
      } else {
        setLockError(
          `Wrong PIN. ${remaining} attempt${remaining !== 1 ? "s" : ""} left.`,
        );
      }
    }
  }

  pinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    attemptUnlock();
  });
  unlockBtn.addEventListener("click", attemptUnlock);

  biometBtn?.addEventListener("click", async () => {
    if (await authenticateWithBiometric()) {
      await unlock();
    } else {
      setLockError("Biometric failed. Use your PIN instead.");
    }
  });

  forgotBtn.addEventListener("click", () => {
    if (
      !confirm(
        "Reset your PIN? Your financial data stays safe — only the lock is removed.",
      )
    )
      return;
    disableLock();
    _locked = false;
    overlay.setAttribute("hidden", "");
  });

  updateBiometricButtonVisibility();
}

// ---- Settings panel ----

export async function renderLockSettings() {
  const container = document.getElementById("appLockSettingsContainer");
  if (!container) return;

  const enabled = isLockEnabled();
  const bioAvail = await isBiometricAvailable();
  const hasCred = !!getCredentialId();
  const timeout = getLockTimeout();

  container.innerHTML = `
    <div class="card">
      <h3>App Lock</h3>
      <p class="lock-settings-desc">Require a PIN to open the app. Your data is not encrypted — this stops casual access only.</p>
      ${enabled ? _buildActiveHTML(timeout, bioAvail, hasCred) : _buildSetupHTML()}
    </div>`;

  bindLockSettingsEvents();
  updateLockButtonVisibility();
}

function _buildSetupHTML() {
  return `
    <form id="lockSetupForm" autocomplete="off">
      <input type="text" name="username" autocomplete="username" hidden aria-hidden="true">
      <label class="lock-label" for="newPinInput">Set a PIN (4–8 digits)</label>
      <input type="password" id="newPinInput" class="lock-settings-input" inputmode="numeric"
        pattern="[0-9]*" minlength="4" maxlength="8" placeholder="Enter PIN" autocomplete="new-password">
      <label class="lock-label" for="confirmPinInput">Confirm PIN</label>
      <input type="password" id="confirmPinInput" class="lock-settings-input" inputmode="numeric"
        pattern="[0-9]*" minlength="4" maxlength="8" placeholder="Confirm PIN" autocomplete="new-password">
      <p class="lock-setup-error" id="lockSetupError"></p>
      <button class="data-backup-btn" id="enableLockBtn" type="submit">
        <i class="ri-lock-line"></i><span>Enable lock</span>
      </button>
    </form>`;
}

function _buildActiveHTML(timeout, bioAvail, hasCred) {
  const timeoutOpts = TIMEOUT_OPTIONS.map(
    (o) =>
      `<option value="${o.value}"${o.value === timeout ? " selected" : ""}>${o.label}</option>`,
  ).join("");

  const biometricSection = bioAvail
    ? `
    <div class="lock-section-divider"></div>
    <p class="lock-label">Biometric fast-unlock</p>
    <p class="lock-settings-desc">${hasCred ? "Face/fingerprint unlock is on." : "Use Face ID, Touch ID, or Windows Hello instead of typing your PIN."}</p>
    ${
      hasCred
        ? `<button class="lock-danger-btn" id="removeBiometricBtn" type="button">Remove biometric</button>`
        : `<button class="data-backup-btn" id="addBiometricBtn" type="button"><i class="ri-fingerprint-line"></i><span>Set up biometric</span></button>`
    }`
    : "";

  return `
    <div class="lock-active-panel">
      <div class="lock-status-row">
        <i class="ri-lock-fill lock-active-icon"></i>
        <span class="lock-active-label">Lock is on</span>
        <button class="lock-danger-btn" id="disableLockBtn" type="button">Remove lock</button>
      </div>

      <label class="lock-label" for="lockTimeoutSelect">Auto-lock after</label>
      <select id="lockTimeoutSelect" class="lock-settings-select">${timeoutOpts}</select>

      <div class="lock-section-divider"></div>
      <p class="lock-label">Change PIN</p>
      <form id="changePinForm" autocomplete="off">
        <input type="text" name="username" autocomplete="username" hidden aria-hidden="true">
        <input type="password" id="currentPinInput" class="lock-settings-input" inputmode="numeric"
          pattern="[0-9]*" placeholder="Current PIN" autocomplete="current-password">
        <input type="password" id="newPinInput2" class="lock-settings-input" inputmode="numeric"
          pattern="[0-9]*" placeholder="New PIN (4–8 digits)" autocomplete="new-password">
        <p class="lock-setup-error" id="lockChangeError"></p>
        <button class="data-backup-btn" id="changePinBtn" type="submit">
          <i class="ri-key-line"></i><span>Update PIN</span>
        </button>
      </form>
      ${biometricSection}
    </div>`;
}

function bindLockSettingsEvents() {
  const setupForm = document.getElementById("lockSetupForm");
  const changeForm = document.getElementById("changePinForm");
  const disableBtn = document.getElementById("disableLockBtn");
  const timeoutSel = document.getElementById("lockTimeoutSelect");
  const addBioBtn = document.getElementById("addBiometricBtn");
  const rmBioBtn = document.getElementById("removeBiometricBtn");

  setupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pin = document.getElementById("newPinInput").value;
    const confirm = document.getElementById("confirmPinInput").value;
    const errEl = document.getElementById("lockSetupError");
    if (!/^\d{4,8}$/.test(pin)) {
      errEl.textContent = "PIN must be 4–8 digits.";
      return;
    }
    if (pin !== confirm) {
      errEl.textContent = "PINs don't match.";
      return;
    }
    await enableLock(pin);
    showMessage("Lock enabled.");
  });

  disableBtn?.addEventListener("click", () => {
    if (
      !confirm(
        "Remove the app lock? Anyone with device access will be able to open the app.",
      )
    )
      return;
    disableLock();
    showMessage("Lock removed.");
  });

  changeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const current = document.getElementById("currentPinInput").value;
    const next = document.getElementById("newPinInput2").value;
    const errEl = document.getElementById("lockChangeError");
    if (!/^\d{4,8}$/.test(next)) {
      errEl.textContent = "New PIN must be 4–8 digits.";
      return;
    }
    if (await changePIN(current, next)) {
      showMessage("PIN updated.");
    } else {
      errEl.textContent = "Current PIN is wrong.";
    }
  });

  timeoutSel?.addEventListener("change", () => {
    setLockTimeout(parseInt(timeoutSel.value, 10));
    resetInactivityTimer();
  });

  addBioBtn?.addEventListener("click", async () => {
    if (await registerBiometric()) {
      renderLockSettings();
      showMessage("Biometric unlock set up.");
    } else {
      showMessage("Biometric setup failed. Try again.");
    }
  });

  rmBioBtn?.addEventListener("click", () => {
    localStorage.removeItem(LS_CRED_ID);
    renderLockSettings();
    showMessage("Biometric unlock removed.");
  });
}
