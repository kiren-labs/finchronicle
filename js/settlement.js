// ============================================================================
// Family Expense Settlement (v3.26.0)
// ============================================================================

import { state } from "./state.js";
import { formatCurrency } from "./currency.js";
import { sanitizeHTML } from "./utils.js";

// ============================================================================
// Settlement Calculation
// ============================================================================

/**
 * Calculate per-person settlement for a given date range.
 * Uses the `attachedTo` optional field on transactions.
 *
 * @param {string} [startDate] - YYYY-MM-DD start (inclusive). Defaults to current month start.
 * @param {string} [endDate] - YYYY-MM-DD end (inclusive). Defaults to today.
 * @returns {{ persons: Array, period: { start, end }, totalSpent: number }}
 */
export function calculateSettlement(startDate, endDate) {
  const now = new Date();
  const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = endDate || now.toISOString().slice(0, 10);

  // Filter transactions in range with attachedTo set
  const relevant = state.transactions.filter((t) => {
    if (t.deleted) return false;
    if (!t.attachedTo) return false;
    if (t.date < start || t.date > end) return false;
    return true;
  });

  // Aggregate per person
  const personMap = {}; // { name: { spentOn, contributed, outstanding, settled } }

  relevant.forEach((t) => {
    const person = t.attachedTo.trim();
    if (!person) return;

    if (!personMap[person]) {
      personMap[person] = { spentOn: 0, contributed: 0, outstanding: 0, settled: 0 };
    }

    if (t.type === "expense") {
      const amt = t.homeAmount || t.amount;
      personMap[person].spentOn += amt;
      if (t.expenseType === "reimbursable") {
        if (t.settled) {
          personMap[person].settled += amt;
        } else {
          personMap[person].outstanding += amt;
        }
      }
    } else if (t.type === "income") {
      personMap[person].contributed += t.homeAmount || t.amount;
    }
    // Transfers are excluded from settlement math
  });

  const persons = Object.entries(personMap).map(([name, data]) => ({
    name,
    spentOn: Math.round(data.spentOn * 100) / 100,
    contributed: Math.round(data.contributed * 100) / 100,
    balance: Math.round((data.contributed - data.spentOn) * 100) / 100,
    outstanding: Math.round(data.outstanding * 100) / 100,
    settled: Math.round(data.settled * 100) / 100,
  }));

  // Sort by balance ascending (most owed first)
  persons.sort((a, b) => a.balance - b.balance);

  const totalSpent = persons.reduce((sum, p) => sum + p.spentOn, 0);

  return { persons, period: { start, end }, totalSpent };
}

/**
 * Get all unique person names from transaction history.
 */
export function getPersonNames() {
  const names = new Set();
  state.transactions.forEach((t) => {
    if (t.attachedTo && !t.deleted) {
      names.add(t.attachedTo.trim());
    }
  });
  return [...names].sort();
}

// ============================================================================
// Settlement Dashboard Rendering
// ============================================================================

/**
 * Render the Family Settlement dashboard.
 * @param {string} [startDate]
 * @param {string} [endDate]
 */
export function renderSettlementDashboard(startDate, endDate) {
  const container = document.getElementById("settlementDashboard");
  if (!container) return;

  const section = document.getElementById("settlementSection");

  // Only show if attachedTo field is enabled
  const isEnabled = state.appSettings && state.appSettings.enabledFields.attachedTo;
  if (!isEnabled) {
    if (section) section.hidden = true;
    return;
  }

  // Check if any transactions have attachedTo data
  const hasData = state.transactions.some((t) => t.attachedTo && !t.deleted);
  if (!hasData) {
    if (section) section.hidden = true;
    return;
  }

  if (section) section.hidden = false;

  const settlement = calculateSettlement(startDate, endDate);

  if (settlement.persons.length === 0) {
    container.innerHTML = `<p class="settlement-empty">No person-tagged transactions in this period.</p>`;
    return;
  }

  const periodLabel = formatPeriodLabel(settlement.period.start, settlement.period.end);

  container.innerHTML = `
    <div class="settlement-period">
      <div class="settlement-period-controls">
        <button class="settlement-period-btn" data-settlement-period="prev" aria-label="Previous month">
          <i class="ri-arrow-left-s-line"></i>
        </button>
        <span class="settlement-period-label">${periodLabel}</span>
        <button class="settlement-period-btn" data-settlement-period="next" aria-label="Next month">
          <i class="ri-arrow-right-s-line"></i>
        </button>
      </div>
      <div class="settlement-total">Total tagged: ${formatCurrency(settlement.totalSpent)}</div>
    </div>
    <div class="settlement-persons">
      ${settlement.persons.map((p) => renderPersonCard(p)).join("")}
    </div>
    <button class="settlement-export-btn" data-settlement-export aria-label="Copy settlement summary">
      <i class="ri-file-copy-line"></i> Copy Summary
    </button>
  `;
}

/**
 * Render a single person's settlement card.
 */
function renderPersonCard(person) {
  const balanceClass = person.balance >= 0 ? "positive" : "negative";
  const balanceLabel = person.balance >= 0
    ? `+${formatCurrency(person.balance)}`
    : `-${formatCurrency(Math.abs(person.balance))}`;
  const statusLabel = person.balance >= 0
    ? "surplus"
    : "owes";

  const hasReimbursable = person.outstanding > 0 || person.settled > 0;
  const reimbursementHtml = hasReimbursable ? `
    <div class="settlement-reimbursement">
      ${person.outstanding > 0 ? `
      <div class="settlement-detail settlement-outstanding">
        <span class="settlement-detail-label"><i class="ri-time-line"></i> Outstanding</span>
        <span class="settlement-detail-value outstanding">${formatCurrency(person.outstanding)}</span>
      </div>` : ""}
      ${person.settled > 0 ? `
      <div class="settlement-detail settlement-settled">
        <span class="settlement-detail-label"><i class="ri-check-line"></i> Settled</span>
        <span class="settlement-detail-value settled">${formatCurrency(person.settled)}</span>
      </div>` : ""}
    </div>` : "";

  return `
    <div class="settlement-person-card">
      <div class="settlement-person-header">
        <div class="settlement-person-avatar">
          <i class="ri-user-line"></i>
        </div>
        <div class="settlement-person-name">${sanitizeHTML(person.name)}</div>
        <div class="settlement-person-balance ${balanceClass}">
          ${balanceLabel}
          <span class="settlement-status">${statusLabel}</span>
        </div>
      </div>
      <div class="settlement-person-details">
        <div class="settlement-detail">
          <span class="settlement-detail-label">Spent on</span>
          <span class="settlement-detail-value negative">${formatCurrency(person.spentOn)}</span>
        </div>
        <div class="settlement-detail">
          <span class="settlement-detail-label">Contributed</span>
          <span class="settlement-detail-value positive">${formatCurrency(person.contributed)}</span>
        </div>
      </div>
      ${reimbursementHtml}
    </div>
  `;
}

/**
 * Format a period label from start/end dates.
 */
function formatPeriodLabel(start, end) {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  // If same month, show "May 2026" format
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // Otherwise show range
  return `${startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

// ============================================================================
// Period Navigation
// ============================================================================

// Current settlement view state
let currentSettlementMonth = null;

/**
 * Initialize settlement to current month.
 */
function getCurrentMonth() {
  if (!currentSettlementMonth) {
    const now = new Date();
    currentSettlementMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return currentSettlementMonth;
}

/**
 * Navigate settlement period.
 */
export function navigateSettlementPeriod(direction) {
  const month = getCurrentMonth();
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 1);

  if (direction === "prev") {
    date.setMonth(date.getMonth() - 1);
  } else {
    date.setMonth(date.getMonth() + 1);
    // Don't go past current month
    const now = new Date();
    if (date > now) return;
  }

  currentSettlementMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const start = `${currentSettlementMonth}-01`;
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const end = `${currentSettlementMonth}-${String(lastDay).padStart(2, "0")}`;

  renderSettlementDashboard(start, end);
}

// ============================================================================
// Export Summary as Text
// ============================================================================

/**
 * Generate a plain text summary of the settlement for sharing.
 */
export function getSettlementSummaryText(startDate, endDate) {
  const settlement = calculateSettlement(startDate, endDate);
  const periodLabel = formatPeriodLabel(settlement.period.start, settlement.period.end);

  let text = `Family Settlement — ${periodLabel}\n`;
  text += `${"─".repeat(40)}\n`;
  text += `Total tagged expenses: ${formatCurrency(settlement.totalSpent)}\n\n`;

  settlement.persons.forEach((p) => {
    const status = p.balance >= 0 ? "surplus" : "owes";
    const balanceStr = p.balance >= 0
      ? `+${formatCurrency(p.balance)}`
      : `-${formatCurrency(Math.abs(p.balance))}`;
    text += `${p.name}: spent ${formatCurrency(p.spentOn)}, contributed ${formatCurrency(p.contributed)} → ${balanceStr} (${status})`;
    if (p.outstanding > 0) text += ` | outstanding: ${formatCurrency(p.outstanding)}`;
    if (p.settled > 0) text += ` | settled: ${formatCurrency(p.settled)}`;
    text += "\n";
  });

  return text;
}

/**
 * Copy settlement summary to clipboard.
 */
export async function copySettlementSummary() {
  const month = getCurrentMonth();
  const start = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const text = getSettlementSummaryText(start, end);

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindSettlementEvents() {
  const container = document.getElementById("settlementDashboard");
  if (!container) return;

  container.addEventListener("click", async (e) => {
    const periodBtn = e.target.closest("[data-settlement-period]");
    if (periodBtn) {
      navigateSettlementPeriod(periodBtn.dataset.settlementPeriod);
      return;
    }
    const exportBtn = e.target.closest("[data-settlement-export]");
    if (exportBtn) {
      await copySettlementSummary();
    }
  });
}
