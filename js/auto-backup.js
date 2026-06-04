// ============================================================================
// Auto-Backup & Data Safety (v3.22.0)
// ============================================================================

import { state, APP_VERSION } from "./state.js";
import { showMessage } from "./utils.js";
import { getCurrency } from "./currency.js";
import { updateBackupTimestamp } from "./settings.js";
import {
  loadAllTransactionsFromDB,
  getAllNetWorthSnapshots,
  loadRecurringTemplatesFromDB,
  loadBudgetsFromDB,
  loadAccounts,
  loadGoals,
  loadQuickTemplates,
  loadAppSettings,
} from "./db.js";

// ---- Constants ----

const BACKUP_SETTINGS_KEY = "autoBackupSettings";
const STORAGE_HEALTH_KEY = "storageHealthLastCheck";

const DEFAULT_SETTINGS = {
  autoBackupEnabled: true,
  backupFrequency: "weekly", // 'daily' | 'weekly' | 'monthly'
  lastAutoBackup: null,
  backupFormat: "json", // 'json' | 'csv'
};

// Frequency in milliseconds
const FREQUENCY_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

// ---- Settings Persistence ----

export function getBackupSettings() {
  try {
    const raw = localStorage.getItem(BACKUP_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("Failed to parse backup settings:", e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveBackupSettings(settings) {
  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
}

// ---- Storage Persistence (v3.29.0) ----

export async function requestStoragePersistence() {
  if (!navigator.storage || !navigator.storage.persist) {
    state.storagePersisted = null;
    return null;
  }
  try {
    // Check current status first
    const already = await navigator.storage.persisted();
    if (already) {
      state.storagePersisted = true;
      return true;
    }
    // Request persistence (timeout guards against browsers that hang on this prompt)
    const granted = await Promise.race([
      navigator.storage.persist(),
      new Promise(resolve => setTimeout(() => resolve(false), 3000)),
    ]);
    state.storagePersisted = granted;
    if (!granted) {
      console.warn("⚠️ Storage persistence denied. Data may be evicted by browser.");
    }
    return granted;
  } catch (e) {
    console.warn("Storage persistence request failed:", e);
    state.storagePersisted = null;
    return null;
  }
}

// ---- Storage Health ----

export async function checkStorageHealth() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { supported: false, usedPercent: 0, usedMB: 0, quotaMB: 0, persisted: state.storagePersisted };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usedMB = Math.round((estimate.usage / (1024 * 1024)) * 10) / 10;
    const quotaMB =
      Math.round((estimate.quota / (1024 * 1024)) * 10) / 10;
    const usedPercent =
      Math.round((estimate.usage / estimate.quota) * 1000) / 10;

    return { supported: true, usedPercent, usedMB, quotaMB, persisted: state.storagePersisted };
  } catch (e) {
    console.warn("Storage estimate failed:", e);
    return { supported: false, usedPercent: 0, usedMB: 0, quotaMB: 0, persisted: state.storagePersisted };
  }
}

// ---- Auto-Backup Check (runs on init) ----

export function isBackupDue() {
  const settings = getBackupSettings();
  if (!settings.autoBackupEnabled) return false;

  const lastBackup = settings.lastAutoBackup;
  if (!lastBackup) return true;

  const elapsed = Date.now() - new Date(lastBackup).getTime();
  const threshold = FREQUENCY_MS[settings.backupFrequency] || FREQUENCY_MS.weekly;

  return elapsed >= threshold;
}

export function runAutoBackupIfDue() {
  if (!isBackupDue()) {
    state.backupDue = false;
    return false;
  }
  state.backupDue = true;
  return true;
}

// ---- Backup Generation ----

async function buildJsonBackup() {
  // Read all stores directly from DB — do not rely on state which may be partially loaded
  const [
    allTransactions,
    recurringTemplates,
    budgets,
    accounts,
    savingsGoals,
    quickTemplates,
    appSettings,
    netWorthSnapshots,
  ] = await Promise.all([
    loadAllTransactionsFromDB().catch(() => state.transactions),
    loadRecurringTemplatesFromDB().catch(() => state.recurringTemplates || []),
    loadBudgetsFromDB().catch(() => state.budgets || []),
    loadAccounts().catch(() => state.accounts || []),
    loadGoals().catch(() => state.savingsGoals || []),
    loadQuickTemplates().catch(() => state.quickTemplates || []),
    loadAppSettings().catch(() => state.appSettings || null),
    getAllNetWorthSnapshots().catch(() => []),
  ]);

  const payload = {
    version: APP_VERSION,
    backupSchemaVersion: 1,
    exportDate: new Date().toISOString(),
    currency: getCurrency(),
    transactionCount: allTransactions.length,
    integrity: "",
    transactions: allTransactions,
    recurringTemplates,
    budgets,
    accounts,
    savingsGoals,
    quickTemplates,
    appSettings,
    netWorthSnapshots,
    localStorage: {
      exchangeRateHistory: JSON.parse(localStorage.getItem("exchangeRateHistory") || "null"),
      tagColors: JSON.parse(localStorage.getItem("tagColors") || "null"),
    },
  };

  // Compute SHA-256 integrity over JSON with integrity field empty
  const jsonForHash = JSON.stringify(payload, null, 2);
  try {
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(jsonForHash),
    );
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    payload.integrity = "sha256:" + hashHex;
  } catch {
    payload.integrity = "";
  }

  return JSON.stringify(payload, null, 2);
}

function buildCsvBackup() {
  const currencyCode = getCurrency();
  const headers = [
    "Date",
    "Type",
    "Category",
    `Amount (${currencyCode})`,
    "Notes",
    "Tags",
    "Status",
    "ID",
    "CreatedAt",
    "UpdatedAt",
    "From Account",
    "To Account",
    "Deleted",
    "DeletedAt",
    "RecurringId",
    "Settled",
    "SettledAt",
    "SettledBy",
    "Payment Method",
    "Merchant",
    "Expense Type",
    "Attached To",
    "Reference ID",
    "Location",
    "Transaction Currency",
    "Exchange Rate",
    "Home Amount",
  ];
  const rows = state.transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.notes || "",
    (t.tags || []).join(";"),
    t.status || "",
    t.id,
    t.createdAt || "",
    t.updatedAt || "",
    t.fromAccount || "",
    t.toAccount || "",
    t.deleted ? "yes" : "",
    t.deletedAt || "",
    t.recurringId || "",
    t.settled ? "yes" : "",
    t.settledAt || "",
    t.settledBy || "",
    t.paymentMethod || "",
    t.merchant || "",
    t.expenseType || "",
    t.attachedTo || "",
    t.referenceId || "",
    t.location || "",
    t.transactionCurrency || "",
    t.exchangeRate || "",
    t.homeAmount || "",
  ]);

  let csv = headers.join(",") + "\n";
  csv += rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  return csv;
}

// ---- Encrypted Export (AES-GCM via Web Crypto) ----

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(passphrase) {
  const data = await buildJsonBackup();
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(data),
  );

  // Pack salt + iv + ciphertext into one ArrayBuffer
  const packed = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return packed.buffer;
}

export async function decryptBackup(passphrase, arrayBuffer) {
  const packed = new Uint8Array(arrayBuffer);
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

// ---- File Download Helpers ----

async function downloadBlob(blob, filename) {
  // iOS Safari: programmatic downloads open a blank tab — use Web Share API instead
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "FinChronicle Backup" });
        return;
      } catch (e) {
        // User cancelled share — not an error
        if (e.name === "AbortError") return;
        // Other error: fall through to blob download
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getBackupFilename(format, encrypted) {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 19).replace(/:/g, "");
  if (encrypted) return `finchronicle-backup-${date}-${time}.enc`;
  if (format === "json") return `finchronicle-backup-${date}-${time}.json`;
  return `finchronicle-backup-${date}-${time}.csv`;
}

// ---- Public Backup Actions ----

export async function performJsonBackup(isAuto = false) {
  const hasData = state.transactions.length > 0 ||
    (state.accounts || []).length > 0 ||
    (state.budgets || []).length > 0 ||
    (state.recurringTemplates || []).length > 0 ||
    (state.savingsGoals || []).length > 0 ||
    (state.quickTemplates || []).length > 0;
  if (!hasData) {
    if (!isAuto) showMessage("No data to back up!");
    return;
  }

  const data = await buildJsonBackup();
  const blob = new Blob([data], { type: "application/json" });
  const filename = getBackupFilename("json", false);

  await downloadBlob(blob, filename);

  // Update timestamps
  const settings = getBackupSettings();
  settings.lastAutoBackup = new Date().toISOString();
  saveBackupSettings(settings);
  updateBackupTimestamp();
  state.backupDue = false;
  updateAutoBackupUI();

  if (!isAuto) showMessage("✅ Backup saved!");
}

export async function performCsvBackup(isAuto = false) {
  if (state.transactions.length === 0) {
    if (!isAuto) showMessage("No transactions to back up!");
    return;
  }

  const data = buildCsvBackup();
  const blob = new Blob([data], { type: "text/csv" });
  const filename = getBackupFilename("csv", false);

  await downloadBlob(blob, filename);

  const settings = getBackupSettings();
  settings.lastAutoBackup = new Date().toISOString();
  saveBackupSettings(settings);
  updateBackupTimestamp();

  if (isAuto) {
    showMessage("📦 Auto-backup saved to Downloads");
  } else {
    showMessage("✅ CSV backup exported!");
  }
}

export async function performEncryptedBackup(passphrase) {
  const hasData = state.transactions.length > 0 ||
    (state.accounts || []).length > 0 ||
    (state.budgets || []).length > 0 ||
    (state.recurringTemplates || []).length > 0 ||
    (state.savingsGoals || []).length > 0 ||
    (state.quickTemplates || []).length > 0;
  if (!hasData) {
    showMessage("No data to back up!");
    return;
  }

  if (!passphrase || passphrase.length < 12) {
    showMessage("Passphrase must be at least 12 characters");
    return;
  }

  try {
    const encrypted = await encryptBackup(passphrase);
    const blob = new Blob([encrypted], { type: "application/octet-stream" });
    const filename = getBackupFilename("json", true);

    await downloadBlob(blob, filename);

    const settings = getBackupSettings();
    settings.lastAutoBackup = new Date().toISOString();
    saveBackupSettings(settings);
    updateBackupTimestamp();
    state.backupDue = false;
    updateAutoBackupUI();

    showMessage("🔒 Encrypted backup saved!");
  } catch (e) {
    console.error("Encryption failed:", e);
    showMessage("Encryption failed. Try again.");
  }
}

export async function importEncryptedBackup(file, passphrase) {
  if (!passphrase || passphrase.length < 12) {
    showMessage("Passphrase must be at least 12 characters");
    return null;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const jsonStr = await decryptBackup(passphrase, arrayBuffer);
    const data = JSON.parse(jsonStr);

    if (!data.transactions || !Array.isArray(data.transactions)) {
      showMessage("Invalid backup file format");
      return null;
    }

    return data;
  } catch (e) {
    console.error("Decryption failed:", e);
    showMessage("Decryption failed — wrong passphrase or corrupted file");
    return null;
  }
}

// ---- Render Storage Health Widget ----

export async function renderStorageHealth() {
  const health = await checkStorageHealth();
  const container = document.getElementById("storageHealthWidget");
  if (!container) return;

  if (!health.supported) {
    container.innerHTML = `
      <div class="storage-health-inline">
        <p class="storage-unsupported">Storage estimation not available in this browser.</p>
      </div>
    `;
    return;
  }

  let statusClass = "good";
  let statusIcon = "ri-checkbox-circle-line";
  if (health.usedPercent > 80) {
    statusClass = "warning";
    statusIcon = "ri-error-warning-line";
  }
  if (health.usedPercent > 95) {
    statusClass = "danger";
    statusIcon = "ri-alert-line";
  }

  container.innerHTML = `
    <div class="storage-health-inline">
      <div class="storage-health-header">
        <i class="ri-hard-drive-2-line" aria-hidden="true"></i>
        <h4>Storage Health</h4>
      </div>
      <div class="storage-meter">
        <div class="storage-meter-fill storage-${statusClass}" style="width: ${Math.min(health.usedPercent, 100)}%"></div>
      </div>
      <div class="storage-health-info">
        <span><i class="${statusIcon}" aria-hidden="true"></i> ${health.usedMB} MB used of ${health.quotaMB} MB (${health.usedPercent}%)</span>
      </div>
      <div class="storage-health-info">
        <span><i class="${health.persisted === true ? "ri-shield-check-line" : health.persisted === false ? "ri-error-warning-line" : "ri-question-line"}" aria-hidden="true"></i> Persistent storage: ${health.persisted === true ? "Protected" : health.persisted === false ? "Not granted — data may be evicted" : "Unknown"}</span>
      </div>
      ${health.persisted === false ? `<p class="storage-warning-text" role="alert">⚠️ Browser may delete your data under storage pressure. Add to Home Screen and export backups regularly.</p>` : ""}
      ${health.usedPercent > 80 ? `<p class="storage-warning-text" role="alert">⚠️ Storage is getting full. Consider exporting and clearing old data.</p>` : ""}
    </div>
  `;
}

// ---- Update static auto-backup UI (v4.2.0) ----

export function updateAutoBackupUI() {
  const settings = getBackupSettings();

  const toggle = document.getElementById("autoBackupToggle2");
  if (toggle) {
    toggle.classList.toggle("active", settings.autoBackupEnabled);
    toggle.setAttribute("aria-checked", String(settings.autoBackupEnabled));
  }

  const freqSelect = document.getElementById("backupFrequency2");
  if (freqSelect) {
    freqSelect.value = settings.backupFrequency || "weekly";
    freqSelect.disabled = !settings.autoBackupEnabled;
  }

  const freqRow = document.getElementById("autoBackupFreqRow");
  if (freqRow) {
    freqRow.classList.toggle("disabled", !settings.autoBackupEnabled);
  }

  const hint = document.getElementById("lastBackupHint");
  if (hint) {
    const last = settings.lastAutoBackup
      ? new Date(settings.lastAutoBackup).toLocaleDateString()
      : "Never";
    hint.textContent = `Last backup: ${last}`;
  }

  // Show overdue banner if backup is due
  const banner = document.getElementById("backupOverdueBanner");
  if (banner) {
    banner.hidden = !state.backupDue;
  }
}

// ---- Init (called from app.js) ----

export async function initAutoBackup() {
  // One-shot migration: CSV auto-backup is lossy — migrate to JSON
  const settings = getBackupSettings();
  if (settings.backupFormat === "csv") {
    settings.backupFormat = "json";
    saveBackupSettings(settings);
  }

  // Check due state (sets state.backupDue — no download)
  runAutoBackupIfDue();

  // Update overdue message text
  const settings2 = getBackupSettings();
  if (settings2.lastAutoBackup) {
    const days = Math.floor((Date.now() - new Date(settings2.lastAutoBackup).getTime()) / (1000 * 60 * 60 * 24));
    const msg = document.getElementById("backupOverdueMsg");
    if (msg && days > 0) msg.textContent = `Backup overdue — last backup was ${days} day${days === 1 ? "" : "s"} ago.`;
  }

  // Update static UI (banner visibility driven by state.backupDue)
  updateAutoBackupUI();
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindAutoBackupEvents() {
  document.getElementById("autoBackupToggle2")?.addEventListener("click", () => {
    const settings = getBackupSettings();
    settings.autoBackupEnabled = !settings.autoBackupEnabled;
    saveBackupSettings(settings);
    updateAutoBackupUI();
  });

  document.getElementById("backupFrequency2")?.addEventListener("change", (e) => {
    const settings = getBackupSettings();
    settings.backupFrequency = e.target.value;
    saveBackupSettings(settings);
  });

  document.getElementById("downloadBackupBtn")?.addEventListener("click", () => {
    performJsonBackup(false);
  });

  document.getElementById("encryptedBackupBtn2")?.addEventListener("click", () => {
    const passphrase = prompt("Enter a passphrase (min 12 characters) to encrypt your backup:");
    if (passphrase) performEncryptedBackup(passphrase);
  });

  document.getElementById("exportSpreadsheetBtn")?.addEventListener("click", async () => {
    const mod = await import("./import-export.js");
    mod.exportToCSV();
  });

  document.getElementById("restoreBackupBtn2")?.addEventListener("click", () => {
    document.getElementById("dataRestoreFile").click();
  });

  document.getElementById("dataRestoreFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const mod = await import("./import-export.js");
    await mod.handleRestoreFileInput(file);
    e.target.value = "";
  });

  document.getElementById("importSpreadsheetBtn")?.addEventListener("click", () => {
    document.getElementById("spreadsheetImportFile").click();
  });

  document.getElementById("spreadsheetImportFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const mod = await import("./import-export.js");
    mod.handleCsvImportFile(file);
    e.target.value = "";
  });

  document.getElementById("restoreMergeBtn")?.addEventListener("click", async () => {
    const mod = await import("./import-export.js");
    mod.confirmRestore("merge");
  });

  document.getElementById("restoreReplaceBtn")?.addEventListener("click", async () => {
    const mod = await import("./import-export.js");
    mod.confirmRestore("replace");
  });

  document.getElementById("backupOverdueBtn")?.addEventListener("click", () => {
    performJsonBackup(false);
  });
}
