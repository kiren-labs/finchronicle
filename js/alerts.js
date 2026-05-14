// ============================================================================
// Smart Spending Alerts (v3.21.0)
// ============================================================================

import { state } from "./state.js";
import { formatCurrency } from "./currency.js";

// ---- Constants ----

const ALERT_TYPES = {
  WEEKLY_SPIKE: "weekly_spike",
  UNUSUAL_AMOUNT: "unusual_amount",
  VELOCITY_WARNING: "velocity",
  CATEGORY_DRIFT: "category_drift",
};

const ROLLING_DAYS = 90;
const ALERT_HISTORY_MAX = 30;
const STORAGE_KEY = "smartAlerts";

// ---- Alert State ----

let alertHistory = [];
let dismissedAlerts = new Set();

// ---- Initialisation ----

export function initAlerts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      alertHistory = Array.isArray(data.history) ? data.history.slice(0, ALERT_HISTORY_MAX) : [];
      dismissedAlerts = new Set(Array.isArray(data.dismissed) ? data.dismissed : []);
    } catch {
      alertHistory = [];
      dismissedAlerts = new Set();
    }
  }
}

function persistAlerts() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      history: alertHistory.slice(0, ALERT_HISTORY_MAX),
      dismissed: [...dismissedAlerts].slice(0, 100),
    })
  );
}

// ---- Helper: get expenses in a date range ----

function getExpenses(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return state.transactions.filter((t) => {
    if (t.type !== "expense") return false;
    const ts = t.dateTs || new Date(t.date).getTime();
    return ts >= start && ts <= end;
  });
}

// ---- Helper: get week boundaries ----

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---- Rolling averages per category (90-day weekly) ----

function getRollingWeeklyAverages() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - ROLLING_DAYS);

  const expenses = getExpenses(cutoff, now);
  const weeks = Math.max(1, ROLLING_DAYS / 7);

  const categoryTotals = {};
  for (const t of expenses) {
    const cat = t.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  }

  const averages = {};
  for (const [cat, total] of Object.entries(categoryTotals)) {
    averages[cat] = total / weeks;
  }
  return averages;
}

// ---- Median transaction per category (90-day) ----

function getCategoryMedians() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - ROLLING_DAYS);

  const expenses = getExpenses(cutoff, now);
  const categoryAmounts = {};

  for (const t of expenses) {
    const cat = t.category || "Other";
    if (!categoryAmounts[cat]) categoryAmounts[cat] = [];
    categoryAmounts[cat].push(t.amount);
  }

  const medians = {};
  for (const [cat, amounts] of Object.entries(categoryAmounts)) {
    amounts.sort((a, b) => a - b);
    const mid = Math.floor(amounts.length / 2);
    medians[cat] =
      amounts.length % 2 === 0
        ? (amounts[mid - 1] + amounts[mid]) / 2
        : amounts[mid];
  }
  return medians;
}

// ---- This week's spending per category ----

function getThisWeekByCategory() {
  const weekStart = getWeekStart(new Date());
  const now = new Date();
  const expenses = getExpenses(weekStart, now);

  const result = {};
  for (const t of expenses) {
    const cat = t.category || "Other";
    result[cat] = (result[cat] || 0) + t.amount;
  }
  return result;
}

// ---- This month's spending per category ----

function getThisMonthByCategory() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expenses = getExpenses(monthStart, now);

  const result = {};
  for (const t of expenses) {
    const cat = t.category || "Other";
    result[cat] = (result[cat] || 0) + t.amount;
  }
  return result;
}

// ---- Last month's spending per category ----

function getLastMonthByCategory() {
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const expenses = getExpenses(lastMonthStart, lastMonthEnd);

  const result = {};
  for (const t of expenses) {
    const cat = t.category || "Other";
    result[cat] = (result[cat] || 0) + t.amount;
  }
  return result;
}

// ---- Alert Detection Engine ----

/**
 * Check for a WEEKLY_SPIKE alert.
 * Fires when this week's spending in a category exceeds 40% of rolling weekly average.
 */
function checkWeeklySpike(weeklyAverages, thisWeek) {
  const alerts = [];
  for (const [cat, spent] of Object.entries(thisWeek)) {
    const avg = weeklyAverages[cat];
    if (!avg || avg < 1) continue;
    const ratio = spent / avg;
    if (ratio >= 1.4) {
      const pct = Math.round((ratio - 1) * 100);
      alerts.push({
        type: ALERT_TYPES.WEEKLY_SPIKE,
        category: cat,
        message: `${cat}: ${pct}% above weekly average`,
        severity: ratio >= 2 ? "danger" : "warning",
        value: spent,
        average: avg,
      });
    }
  }
  return alerts;
}

/**
 * Check for UNUSUAL_AMOUNT alerts.
 * Fires when a single transaction exceeds 3x the category median.
 */
function checkUnusualAmount(transaction, medians) {
  if (transaction.type !== "expense") return null;
  const cat = transaction.category || "Other";
  const median = medians[cat];
  if (!median || median < 1) return null;
  const ratio = transaction.amount / median;
  if (ratio >= 3) {
    return {
      type: ALERT_TYPES.UNUSUAL_AMOUNT,
      category: cat,
      message: `${formatCurrency(transaction.amount)} in ${cat} — ${Math.round(ratio)}x your average`,
      severity: ratio >= 5 ? "danger" : "warning",
      value: transaction.amount,
      average: median,
    };
  }
  return null;
}

/**
 * Check for VELOCITY_WARNING alerts.
 * At current pace, monthly spending will exceed budget by end of month.
 */
function checkVelocity(thisMonthTotals) {
  if (!state.budgets || state.budgets.length === 0) return [];
  const alerts = [];

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Only check after day 5 to avoid false positives
  if (dayOfMonth < 5) return [];

  for (const budget of state.budgets) {
    const spent = thisMonthTotals[budget.category] || 0;
    if (spent === 0) continue;

    const projectedTotal = (spent / dayOfMonth) * daysInMonth;
    if (projectedTotal > budget.monthlyLimit) {
      const exceedDay = Math.round((budget.monthlyLimit / spent) * dayOfMonth);
      const pctOver = Math.round(((projectedTotal - budget.monthlyLimit) / budget.monthlyLimit) * 100);
      alerts.push({
        type: ALERT_TYPES.VELOCITY_WARNING,
        category: budget.category,
        message: `${budget.category}: on pace to exceed budget by ${pctOver}% (~day ${exceedDay})`,
        severity: pctOver >= 30 ? "danger" : "warning",
        value: projectedTotal,
        limit: budget.monthlyLimit,
      });
    }
  }
  return alerts;
}

/**
 * Check for CATEGORY_DRIFT alerts.
 * Spending in a category doubled compared to last month.
 */
function checkCategoryDrift(thisMonth, lastMonth) {
  const alerts = [];
  for (const [cat, spent] of Object.entries(thisMonth)) {
    const lastSpent = lastMonth[cat];
    if (!lastSpent || lastSpent < 10) continue; // ignore tiny categories
    const ratio = spent / lastSpent;
    if (ratio >= 2) {
      alerts.push({
        type: ALERT_TYPES.CATEGORY_DRIFT,
        category: cat,
        message: `${cat} spending ${Math.round(ratio)}x last month`,
        severity: ratio >= 3 ? "danger" : "warning",
        value: spent,
        previous: lastSpent,
      });
    }
  }
  return alerts;
}

// ---- Public: Run all alert checks ----

/**
 * Run the full alert detection engine.
 * Called on init and after every transaction save.
 * Optionally pass the newly saved transaction for unusual-amount check.
 */
export function runAlertChecks(newTransaction = null) {
  if (state.transactions.length < 5) return []; // not enough data

  const weeklyAverages = getRollingWeeklyAverages();
  const medians = getCategoryMedians();
  const thisWeek = getThisWeekByCategory();
  const thisMonth = getThisMonthByCategory();
  const lastMonth = getLastMonthByCategory();

  const newAlerts = [];

  // Weekly spike
  newAlerts.push(...checkWeeklySpike(weeklyAverages, thisWeek));

  // Unusual amount (for newly saved transaction)
  if (newTransaction) {
    const unusual = checkUnusualAmount(newTransaction, medians);
    if (unusual) newAlerts.push(unusual);
  }

  // Velocity warning
  newAlerts.push(...checkVelocity(thisMonth));

  // Category drift
  newAlerts.push(...checkCategoryDrift(thisMonth, lastMonth));

  // Deduplicate: one alert per type+category per day
  const today = new Date().toISOString().slice(0, 10);
  const unique = [];
  const seen = new Set();

  for (const alert of newAlerts) {
    const key = `${alert.type}:${alert.category}:${today}`;
    if (seen.has(key) || dismissedAlerts.has(key)) continue;
    seen.add(key);
    alert.id = key;
    alert.date = today;
    alert.timestamp = Date.now();
    unique.push(alert);
  }

  // Add new alerts to history (most recent first)
  for (const alert of unique) {
    // Avoid duplicate in history
    if (!alertHistory.some((h) => h.id === alert.id)) {
      alertHistory.unshift(alert);
    }
  }

  // Trim history
  alertHistory = alertHistory.slice(0, ALERT_HISTORY_MAX);
  persistAlerts();

  return unique;
}

// ---- Public: Dismiss an alert ----

export function dismissAlert(alertId) {
  dismissedAlerts.add(alertId);
  persistAlerts();
}

// ---- Public: Get alert history ----

export function getAlertHistory() {
  return alertHistory;
}

// ---- Public: Dismiss all active alerts ----

export function dismissAllAlerts(alerts) {
  if (!Array.isArray(alerts)) return;
  alerts.forEach((alert) => dismissedAlerts.add(alert.id));
  persistAlerts();
}

// ---- Public: Clear all alerts ----

export function clearAlertHistory() {
  alertHistory = [];
  dismissedAlerts.clear();
  persistAlerts();
}

// ---- Public: Render alert banners ----

export function renderAlertBanners(alerts) {
  const container = document.getElementById("smartAlerts");
  if (!container) return;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  // Sort: warning (advisory) first, danger second
  const sorted = [...alerts].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === "warning" ? -1 : 1;
  });

  container.hidden = false;

  if (sorted.length <= 2) {
    container.innerHTML = sorted.map((a) => renderAlertBanner(a)).join("");
    return;
  }

  // Collapse to summary chip when > 2 alerts
  const expanded = localStorage.getItem("alertsExpanded") === "true";
  const dangerCount = sorted.filter((a) => a.severity === "danger").length;
  const chipClass = dangerCount > 0 ? "alert-summary-chip danger" : "alert-summary-chip warning";
  const icon = dangerCount > 0 ? "ri-alarm-warning-fill" : "ri-error-warning-line";
  const bannerList = expanded ? sorted.map((a) => renderAlertBanner(a)).join("") : "";

  container.innerHTML = `
    <div class="${chipClass}" id="alertSummaryChip">
      <i class="${icon}"></i>
      <span>${sorted.length} spending alert${sorted.length > 1 ? "s" : ""}</span>
      <button class="alert-summary-toggle" id="alertSummaryToggle" aria-expanded="${expanded}" aria-label="${expanded ? "Collapse" : "Expand"} alerts">
        <i class="ri-arrow-${expanded ? "up" : "down"}-s-line"></i>
      </button>
      ${expanded ? `<button class="alert-dismiss-all" id="alertDismissAll" aria-label="Dismiss all alerts">Dismiss all</button>` : ""}
    </div>
    <div id="alertBannerList">${bannerList}</div>`;
}

function renderAlertBanner(alert) {
  return `<div class="smart-alert smart-alert-${alert.severity}" data-alert-id="${alert.id}">
    <i class="${alert.severity === "danger" ? "ri-alarm-warning-fill" : "ri-error-warning-line"}"></i>
    <span class="smart-alert-text">${alert.message}</span>
    <button class="smart-alert-dismiss" data-dismiss="${alert.id}" aria-label="Dismiss">
      <i class="ri-close-line"></i>
    </button>
  </div>`;
}

// ---- Public: Render alert history (Settings) ----

export function renderAlertHistory() {
  const container = document.getElementById("alertHistoryList");
  if (!container) return;

  if (alertHistory.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 16px 0;">No alerts yet. Alerts appear when spending deviates from your patterns.</p>`;
    return;
  }

  container.innerHTML = alertHistory
    .map(
      (alert) => `
    <div class="alert-history-item alert-history-${alert.severity}">
      <div class="alert-history-info">
        <span class="alert-history-type">${getAlertTypeLabel(alert.type)}</span>
        <span class="alert-history-msg">${alert.message}</span>
      </div>
      <span class="alert-history-date">${alert.date}</span>
    </div>
  `
    )
    .join("");
}

function getAlertTypeLabel(type) {
  switch (type) {
    case ALERT_TYPES.WEEKLY_SPIKE:
      return "Spike";
    case ALERT_TYPES.UNUSUAL_AMOUNT:
      return "Unusual";
    case ALERT_TYPES.VELOCITY_WARNING:
      return "Pace";
    case ALERT_TYPES.CATEGORY_DRIFT:
      return "Drift";
    default:
      return "Alert";
  }
}
