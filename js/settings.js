// ============================================================================
// Settings: Dark Mode, Version, Install Prompt, Backup Status (v3.9.0)
// ============================================================================

import { APP_VERSION, VERSION_KEY, state } from "./state.js";
import { formatDate, showMessage, sanitizeHTML } from "./utils.js";
import { getCurrency } from "./currency.js";
import { renderFAQ } from "./faq.js";
import { renderRecurringSection } from "./recurring.js";
import { renderBudgetList } from "./budget.js";
import { getAllTags, renameTag, deleteTag, getTagColor, TAG_PALETTE } from "./search.js";

// ---- Dark Mode ----

export function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  const icon = document.getElementById("darkModeIcon");
  icon.className = isDark ? "ri-sun-line" : "ri-moon-line";
  document
    .getElementById("darkModeBtn")
    .setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );
  localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
}

export function loadDarkMode() {
  const darkMode = localStorage.getItem("darkMode");
  if (darkMode === "enabled") {
    document.body.classList.add("dark-mode");
    const icon = document.getElementById("darkModeIcon");
    icon.className = "ri-sun-line";
    document
      .getElementById("darkModeBtn")
      .setAttribute("aria-label", "Switch to light mode");
  }
}

// ---- Install Prompt (iOS) ----

export function hideInstallPrompt() {
  document.getElementById("installPrompt").style.display = "none";
  localStorage.setItem("installPromptHidden", "true");
}

export function checkInstallPrompt() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  const promptHidden = localStorage.getItem("installPromptHidden");

  if (isIOS && !isStandalone && !promptHidden) {
    document.getElementById("installPrompt").style.display = "block";
  }
}

// ---- Version Management ----

export function checkAppVersion() {
  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (!storedVersion) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    console.log(`✨ FinChronicle ${APP_VERSION} installed!`);
  } else if (storedVersion !== APP_VERSION) {
    console.log(`🎉 Updated from ${storedVersion} to ${APP_VERSION}`);
    showUpdateNotification(storedVersion, APP_VERSION);
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } else {
    checkServiceWorkerUpdate();
  }

  document.getElementById("appVersion").textContent = `v${APP_VERSION}`;
}

export function showUpdateNotification(oldVersion, newVersion) {
  const prompt = document.getElementById("updatePrompt");
  const message = prompt.querySelector("p");
  message.textContent = `Updated from v${oldVersion} to v${newVersion}! Check out the new features.`;
  prompt.classList.add("show");

  setTimeout(() => {
    dismissUpdate();
  }, 10000);
}

export function checkServiceWorkerUpdate() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              state.updateAvailable = true;
              showUpdatePrompt();
            }
          });
        });
        registration.update();
      }
    });
  }
}

export function showUpdatePrompt() {
  const prompt = document.getElementById("updatePrompt");
  prompt.classList.add("show");
}

export function reloadApp() {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload(true);
      }
    });
  } else {
    window.location.reload(true);
  }
}

export function dismissUpdate() {
  const prompt = document.getElementById("updatePrompt");
  prompt.classList.remove("show");
}

export function checkForUpdates() {
  const btn = document.getElementById("updateCheckBtn");
  const icon = btn.querySelector("i");

  icon.style.animation = "spin 1s linear infinite";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        console.log("🔍 Checking for updates...");
        showMessage("Checking for updates...");

        registration.update().then(() => {
          setTimeout(() => {
            icon.style.animation = "";
            if (registration.waiting || registration.installing) {
              showMessage("Update found! Preparing...");
              showUpdatePrompt();
            } else {
              showMessage("You're on the latest version!");
            }
          }, 1000);
        });
      } else {
        icon.style.animation = "";
        showMessage("No service worker registered");
      }
    });
  } else {
    icon.style.animation = "";
    showMessage("Service Worker not supported");
  }
}

// ---- Backup Status (v3.9.0) ----

export function loadBackupTimestamp() {
  const timestamp = localStorage.getItem("last_backup_timestamp");
  state.lastBackupTimestamp = timestamp ? parseInt(timestamp) : null;
}

export function updateBackupTimestamp() {
  const now = Date.now();
  localStorage.setItem("last_backup_timestamp", now.toString());
  state.lastBackupTimestamp = now;
  console.log("✅ Backup timestamp updated:", new Date(now).toLocaleString());

  if (state.currentTab === "settings") {
    updateSettingsContent();
  }
}

export function getDaysSinceBackup() {
  if (!state.lastBackupTimestamp) return null;
  const days = Math.floor(
    (Date.now() - state.lastBackupTimestamp) / (1000 * 60 * 60 * 24),
  );
  return days;
}

export function shouldShowBackupReminder() {
  const days = getDaysSinceBackup();

  if (days === null && state.transactions.length > 0) {
    const sortedTransactions = [...state.transactions].sort(
      (a, b) => a.id - b.id,
    );
    const firstTransaction = sortedTransactions[0];
    const daysSinceFirst = Math.floor(
      (Date.now() - firstTransaction.id) / (1000 * 60 * 60 * 24),
    );
    return daysSinceFirst >= 7;
  }

  if (days !== null && days >= 30) return true;

  return false;
}

export function renderBackupStatus() {
  const days = getDaysSinceBackup();

  let statusClass = "";
  let statusIcon = "";
  let statusLabel = "";
  let statusMessage = "";

  if (days === null) {
    statusClass = "backup-status-danger";
    statusIcon = "ri-alert-line";
    statusLabel = "Never backed up";
    statusMessage =
      "Your data is at risk! Export a backup now to protect your financial records.";
  } else if (days === 0) {
    statusClass = "backup-status-good";
    statusIcon = "ri-checkbox-circle-line";
    statusLabel = "Backed up today";
    statusMessage =
      "Your data is safe. Great job keeping your records protected!";
  } else if (days <= 7) {
    statusClass = "backup-status-good";
    statusIcon = "ri-checkbox-circle-line";
    statusLabel = `Last backup: ${days} ${days === 1 ? "day" : "days"} ago`;
    statusMessage = "Your data is protected.";
  } else if (days <= 30) {
    statusClass = "backup-status-warning";
    statusIcon = "ri-error-warning-line";
    statusLabel = `Last backup: ${days} days ago`;
    statusMessage = "Consider creating a new backup soon.";
  } else {
    statusClass = "backup-status-danger";
    statusIcon = "ri-alert-line";
    statusLabel = `Last backup: ${days} days ago`;
    statusMessage =
      "⚠️ Backup is outdated! Export now to protect your recent transactions.";
  }

  return `
        <div class="backup-status-card">
            <div class="backup-header">
                <i class="ri-shield-check-line backup-icon" aria-hidden="true"></i>
                <h3 id="backupSectionHeading">Data Backup</h3>
            </div>

            <div class="backup-status ${statusClass}" role="status" aria-live="polite" aria-atomic="true">
                <i class="${statusIcon}" aria-hidden="true"></i>
                <div class="backup-info">
                    <div class="backup-label">${statusLabel}</div>
                    <div class="backup-message">${statusMessage}</div>
                </div>
            </div>

            <p class="backup-description">
                Your data is stored locally on this device only. Regular backups ensure you don't
                lose your financial records if your device is lost or damaged.
            </p>

            <div class="backup-actions">
                <button class="btn btn-primary" data-action="exportBackup" type="button" aria-label="Export all transactions to CSV backup file">
                    <i class="ri-download-line" aria-hidden="true"></i> Export Backup Now
                </button>

                <button class="backup-faq-button" data-action="scrollToFAQ" type="button" aria-label="Jump to frequently asked questions about backups">
                    <i class="ri-question-line" aria-hidden="true"></i> Learn more about backups in FAQ
                </button>
            </div>
        </div>
    `;
}

// ---- Settings Tab Content ----

export function updateSettingsContent() {
  const backupContainer = document.getElementById("backupStatusContainer");
  const faqContainer = document.getElementById("faqContainer");

  renderRecurringSection();
  renderBudgetList();
  renderTagManagement();

  if (backupContainer) {
    backupContainer.innerHTML = renderBackupStatus();
  }

  if (faqContainer) {
    faqContainer.innerHTML = renderFAQ();
  }
}

// ---- Tag Management (v3.14.0) ----

export function renderTagManagement() {
  const container = document.getElementById("tagManagementList");
  if (!container) return;

  const tags = getAllTags();

  if (tags.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--color-text-muted); padding: 20px 0;">No tags yet. Add tags to transactions to organize them.</div>';
    return;
  }

  // Count occurrences per tag
  const tagCounts = {};
  state.transactions.forEach((t) => {
    (t.tags || []).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  container.innerHTML = tags
    .map((tag) => {
      const color = getTagColor(tag);
      const count = tagCounts[tag] || 0;
      return `
      <div class="tag-manage-row">
        <span class="tag-manage-name">
          <button class="tag-color-dot" data-color-tag="${sanitizeHTML(tag)}" style="background:${color}" title="Click to change color" aria-label="Change color for ${sanitizeHTML(tag)}"></button>
          ${sanitizeHTML(tag)}<span class="tag-manage-count">${count} transaction${count !== 1 ? "s" : ""}</span>
        </span>
        <div class="tag-manage-actions">
          <button class="tag-manage-btn tag-manage-btn-rename" data-rename-tag="${sanitizeHTML(tag)}">Rename</button>
          <button class="tag-manage-btn tag-manage-btn-delete" data-delete-tag="${sanitizeHTML(tag)}">Delete</button>
        </div>
      </div>`;
    })
    .join("");
}
