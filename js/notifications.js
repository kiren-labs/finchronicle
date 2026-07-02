// ============================================================================
// Local Notifications (v4.10.0)
// Notification API + SW showNotification — local only, no push server
// ============================================================================

import { state } from "./state.js";
import { formatCurrency } from "./currency.js";
import { getDaysSinceBackup } from "./settings.js";

// ---- Constants ----

const NOTIF_PREFS_KEY = "notifPrefs";
const NOTIF_HISTORY_KEY = "notifHistory";
const NOTIF_HISTORY_MAX = 10;

const TYPE = {
  RECURRING_DUE: "recurring_due",
  BUDGET_WARNING: "budget_warning",
  INACTIVITY: "inactivity",
  BACKUP_REMINDER: "backup_reminder",
};

const DEFAULT_PREFS = {
  enabled: false,
  recurringDue: true,
  budgetWarning: true,
  inactivity: true,
  backupReminder: true,
  quietStart: 22,
  quietEnd: 8,
};

// ---- Prefs ----

export function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function saveNotifPrefs(prefs) {
  localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

// ---- History ----

function loadHistory() {
  try {
    const raw = localStorage.getItem(NOTIF_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addToHistory(entry) {
  const history = loadHistory();
  history.unshift({ ...entry, sentAt: new Date().toISOString() });
  localStorage.setItem(
    NOTIF_HISTORY_KEY,
    JSON.stringify(history.slice(0, NOTIF_HISTORY_MAX)),
  );
}

// ---- Quiet Hours ----

function isQuietHours(prefs) {
  const hour = new Date().getHours();
  const { quietStart, quietEnd } = prefs;
  if (quietStart === quietEnd) return false;
  if (quietStart > quietEnd) {
    // e.g. 22–8: quiet if hour >= 22 OR hour < 8
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}

// ---- Permission ----

export function getNotifPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// ---- Send ----

async function send(title, body, tag, data = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  const prefs = loadNotifPrefs();
  if (!prefs.enabled || isQuietHours(prefs)) return;

  // Dedup: skip if same tag already sent today
  const today = new Date().toISOString().slice(0, 10);
  const history = loadHistory();
  if (history.some((h) => h.tag === tag && h.sentAt.slice(0, 10) === today))
    return;

  addToHistory({ title, body, tag });

  const reg =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration().catch(() => null)
      : null;

  const opts = {
    body,
    tag,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data,
  };

  if (reg && reg.active) {
    try {
      await reg.showNotification(title, opts);
    } catch {
      new Notification(title, {
        body,
        tag,
        icon: "./icons/icon-192.png",
        data,
      });
    }
  } else {
    new Notification(title, { body, tag, icon: "./icons/icon-192.png", data });
  }
}

// ---- Check Functions ----

function checkRecurringDue(prefs) {
  if (!prefs.recurringDue) return;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);

  const templates = state.recurringTemplates || [];
  for (const tmpl of templates) {
    if (!tmpl.enabled || !tmpl.nextDueDate) continue;
    if (tmpl.nextDueDate === todayStr || tmpl.nextDueDate === tomorrowStr) {
      const when = tmpl.nextDueDate === todayStr ? "today" : "tomorrow";
      const name = tmpl.notes || tmpl.category || "Recurring transaction";
      const amtStr = tmpl.amount ? ` (${formatCurrency(tmpl.amount)})` : "";
      send(
        `${name} is due ${when}`,
        `${name}${amtStr} is due ${when}.`,
        `recurring_${tmpl.id}`,
        {
          type: TYPE.RECURRING_DUE,
          templateId: tmpl.id,
          category: tmpl.category,
        },
      );
    }
  }
}

function checkBudgetWarning(prefs) {
  if (!prefs.budgetWarning) return;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const daysPassed = now.getDate();
  const daysLeft = daysInMonth - daysPassed;

  const spentByCategory = {};
  for (const tx of state.transactions) {
    if (tx.deleted || tx.type !== "expense") continue;
    const txDate = new Date(tx.date);
    if (txDate < monthStart) continue;
    const cat = tx.category || "Other";
    spentByCategory[cat] = (spentByCategory[cat] || 0) + tx.amount;
  }

  for (const budget of state.budgets || []) {
    const spent = spentByCategory[budget.category] || 0;
    const pct = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0;
    if (pct >= 0.8 && pct < 1.0) {
      const pctStr = Math.round(pct * 100);
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      send(
        `${budget.category} budget ${pctStr}% used`,
        `${budget.category} budget is ${pctStr}% used with ${daysLeft} days left.`,
        `budget_${budget.category}_${now.getFullYear()}_${now.getMonth()}`,
        { type: TYPE.BUDGET_WARNING, category: budget.category, month },
      );
    }
  }
}

function checkInactivity(prefs) {
  if (!prefs.inactivity) return;
  if (state.transactions.length === 0) return;

  const recent = state.transactions
    .filter((t) => !t.deleted)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (!recent) return;
  const lastDate = new Date(recent.date);
  const daysSince = Math.floor(
    (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSince >= 3) {
    send(
      "Haven't logged anything recently",
      `You haven't logged a transaction in ${daysSince} days. Tap to add one.`,
      `inactivity_${new Date().toISOString().slice(0, 10)}`,
      { type: TYPE.INACTIVITY },
    );
  }
}

function checkBackupReminder(prefs) {
  if (!prefs.backupReminder) return;
  const days = getDaysSinceBackup();
  if (days !== null && days >= 14) {
    send(
      "Backup overdue",
      `No backup in ${days} days. Open FinChronicle to download one.`,
      `backup_reminder_${new Date().toISOString().slice(0, 10)}`,
      { type: TYPE.BACKUP_REMINDER },
    );
  }
}

// ---- Public: run all checks ----

export function runNotificationChecks() {
  const prefs = loadNotifPrefs();
  if (!prefs.enabled || getNotifPermission() !== "granted") return;
  checkRecurringDue(prefs);
  checkBudgetWarning(prefs);
  checkInactivity(prefs);
  checkBackupReminder(prefs);
}

// ---- Settings UI ----

export function renderNotificationSettings() {
  const container = document.getElementById("notificationSettingsContainer");
  if (!container) return;

  const supported = "Notification" in window;
  const permission = getNotifPermission();
  const prefs = loadNotifPrefs();
  const history = loadHistory();

  if (!supported) {
    container.innerHTML = `
      <div class="card">
        <h3 class="card-title"><i class="ri-notification-off-line"></i> Notifications</h3>
        <p class="optional-fields-desc">Your browser does not support notifications.</p>
      </div>`;
    return;
  }

  const permBadge =
    permission === "granted"
      ? `<span class="notif-perm-badge notif-perm-granted">Allowed</span>`
      : permission === "denied"
        ? `<span class="notif-perm-badge notif-perm-denied">Blocked in browser</span>`
        : `<span class="notif-perm-badge notif-perm-default">Not yet allowed</span>`;

  const requestBtn =
    permission !== "granted"
      ? `<button class="btn btn-primary notif-request-btn" id="notifRequestPermBtn" type="button" style="margin-top: var(--space-2);">
           <i class="ri-notification-line"></i> Allow notifications
         </button>`
      : "";

  const typeRows = [
    {
      key: "recurringDue",
      icon: "ri-calendar-check-line",
      label: "Recurring due",
      desc: 'e.g. "Rent is due tomorrow"',
    },
    {
      key: "budgetWarning",
      icon: "ri-pie-chart-2-line",
      label: "Budget warning",
      desc: 'e.g. "Food budget 80% used"',
    },
    {
      key: "inactivity",
      icon: "ri-time-line",
      label: "Inactivity nudge",
      desc: "After 3 days with no entries",
    },
    {
      key: "backupReminder",
      icon: "ri-shield-check-line",
      label: "Backup reminder",
      desc: "After 14 days without a backup",
    },
  ]
    .map(
      (r) => `
    <label class="field-toggle-row notif-type-row ${!prefs.enabled || permission !== "granted" ? "notif-type-disabled" : ""}">
      <span class="field-toggle-label">
        <i class="${r.icon}" style="margin-right: 6px; color: var(--color-primary);"></i>
        ${r.label}
        <span class="notif-type-desc">${r.desc}</span>
      </span>
      <input type="checkbox" class="field-toggle-checkbox notif-type-toggle" data-notif-type="${r.key}" ${prefs[r.key] ? "checked" : ""} ${!prefs.enabled || permission !== "granted" ? "disabled" : ""} />
      <span class="field-toggle-switch"></span>
    </label>`,
    )
    .join("");

  const quietHoursOptions = Array.from({ length: 24 }, (_, h) => {
    const label =
      h === 0
        ? "12 AM"
        : h < 12
          ? `${h} AM`
          : h === 12
            ? "12 PM"
            : `${h - 12} PM`;
    return `<option value="${h}">${label}</option>`;
  }).join("");

  const historyRows =
    history.length === 0
      ? `<p class="notif-history-empty">No notifications sent yet.</p>`
      : history
          .map((h) => {
            const when = new Date(h.sentAt).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return `<div class="notif-history-row"><span class="notif-history-title">${h.title}</span><span class="notif-history-time">${when}</span></div>`;
          })
          .join("");

  container.innerHTML = `
    <div class="card">
      <h3 class="card-title"><i class="ri-notification-line"></i> Notifications</h3>
      <p class="optional-fields-desc">
        Local alerts for budgets, recurring bills, and backups. No server involved — all processed on your device.
      </p>

      <div class="notif-master-row">
        <span class="field-toggle-label">
          Enable notifications ${permBadge}
        </span>
        <label class="notif-master-toggle-label">
          <input type="checkbox" id="notifMasterToggle" class="field-toggle-checkbox" ${prefs.enabled ? "checked" : ""} ${permission === "denied" ? "disabled" : ""} />
          <span class="field-toggle-switch"></span>
        </label>
      </div>
      ${requestBtn}

      <div class="notif-type-list" id="notifTypeList">
        ${typeRows}
      </div>

      <div class="notif-quiet-hours" id="notifQuietHours" ${!prefs.enabled || permission !== "granted" ? 'style="opacity:0.5;pointer-events:none"' : ""}>
        <h4 class="notif-quiet-title">Quiet hours</h4>
        <div class="notif-quiet-row">
          <label class="notif-quiet-label">From</label>
          <select id="notifQuietStart" class="notif-quiet-select">
            ${quietHoursOptions.replace(`value="${prefs.quietStart}"`, `value="${prefs.quietStart}" selected`)}
          </select>
          <label class="notif-quiet-label">to</label>
          <select id="notifQuietEnd" class="notif-quiet-select">
            ${quietHoursOptions.replace(`value="${prefs.quietEnd}"`, `value="${prefs.quietEnd}" selected`)}
          </select>
        </div>
      </div>

      <details class="notif-history-details">
        <summary class="notif-history-summary">Recent notifications (${history.length})</summary>
        <div class="notif-history-list">${historyRows}</div>
      </details>
    </div>`;
}

export function bindNotificationEvents() {
  const container = document.getElementById("notificationSettingsContainer");
  if (!container) return;

  container.addEventListener("change", async (e) => {
    const prefs = loadNotifPrefs();

    if (e.target.id === "notifMasterToggle") {
      if (e.target.checked && getNotifPermission() !== "granted") {
        const granted = await requestNotifPermission();
        if (!granted) {
          e.target.checked = false;
          renderNotificationSettings();
          bindNotificationEvents();
          return;
        }
      }
      prefs.enabled = e.target.checked;
      saveNotifPrefs(prefs);
      renderNotificationSettings();
      bindNotificationEvents();
      return;
    }

    const typeToggle = e.target.closest("[data-notif-type]");
    if (typeToggle) {
      const key = typeToggle.dataset.notifType;
      prefs[key] = e.target.checked;
      saveNotifPrefs(prefs);
      return;
    }

    if (e.target.id === "notifQuietStart") {
      prefs.quietStart = parseInt(e.target.value, 10);
      saveNotifPrefs(prefs);
      return;
    }
    if (e.target.id === "notifQuietEnd") {
      prefs.quietEnd = parseInt(e.target.value, 10);
      saveNotifPrefs(prefs);
      return;
    }
  });

  container.addEventListener("click", async (e) => {
    if (e.target.closest("#notifRequestPermBtn")) {
      const granted = await requestNotifPermission();
      const prefs = loadNotifPrefs();
      if (granted) {
        prefs.enabled = true;
        saveNotifPrefs(prefs);
      }
      renderNotificationSettings();
      bindNotificationEvents();
    }
  });
}
