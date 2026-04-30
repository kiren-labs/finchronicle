// ============================================================================
// Savings Rate Dashboard (v3.19.0)
// ============================================================================

import { state } from "./state.js";
import { formatCurrency } from "./currency.js";

// ---- Savings Calculation Engine ----

/**
 * Get savings account names from the accounts store.
 * Fallback: keyword match on account name for legacy data.
 */
export function getSavingsAccountNames() {
  const fromStore = state.accounts
    .filter((a) => a.isSavings && a.isActive !== false)
    .map((a) => a.name);

  if (fromStore.length > 0) return fromStore;

  // Legacy fallback: match common savings keywords in savedAccounts
  const keywords = ["savings", "fd", "investment", "deposit", "mutual"];
  return state.savedAccounts.filter((name) =>
    keywords.some((kw) => name.toLowerCase().includes(kw)),
  );
}

/**
 * Calculate savings for a given month (YYYY-MM).
 * Savings = transfers TO savings accounts + income with category "Savings/Investments".
 */
export function getMonthlySavings(month) {
  const savingsNames = getSavingsAccountNames();

  let total = 0;
  state.transactions.forEach((t) => {
    if (t.deleted) return;
    if (!t.date || !t.date.startsWith(month)) return;

    // Transfers into savings accounts
    if (t.type === "transfer" && t.toAccount && savingsNames.includes(t.toAccount)) {
      // Don't count transfers between savings accounts
      if (t.fromAccount && savingsNames.includes(t.fromAccount)) return;
      total += t.amount;
    }

    // Legacy: category-based savings
    if (t.category === "Savings/Investments" && t.type === "expense") {
      total += t.amount;
    }
  });

  return total;
}

/**
 * Calculate total income for a given month (YYYY-MM).
 */
export function getMonthlyIncome(month) {
  let total = 0;
  state.transactions.forEach((t) => {
    if (t.deleted) return;
    if (t.type !== "income") return;
    if (!t.date || !t.date.startsWith(month)) return;
    total += t.amount;
  });
  return total;
}

/**
 * Get savings rate for a month: (savings / income) * 100.
 */
export function getSavingsRate(month) {
  const income = getMonthlyIncome(month);
  const savings = getMonthlySavings(month);
  if (income <= 0) return 0;
  return Math.min((savings / income) * 100, 100);
}

/**
 * Get the last N months as YYYY-MM strings, ending with current month.
 */
function getLastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

/**
 * Build 3-month trend data for savings rate.
 */
export function buildSavingsTrend() {
  const months = getLastNMonths(3);
  return months.map((m) => {
    const income = getMonthlyIncome(m);
    const savings = getMonthlySavings(m);
    const rate = income > 0 ? Math.min((savings / income) * 100, 100) : 0;
    const label = new Date(m + "-15").toLocaleDateString("en", { month: "short" });
    return { month: m, label, income, savings, rate };
  });
}

/**
 * Calculate annual projection: at current avg savings rate, how much saved by Dec.
 */
export function getAnnualProjection() {
  const months = getLastNMonths(3);
  let totalSavings = 0;
  let monthsWithIncome = 0;

  months.forEach((m) => {
    const income = getMonthlyIncome(m);
    if (income > 0) {
      totalSavings += getMonthlySavings(m);
      monthsWithIncome++;
    }
  });

  if (monthsWithIncome === 0) return { avgMonthlySavings: 0, projectedAnnual: 0, remainingMonths: 0 };

  const avgMonthlySavings = totalSavings / monthsWithIncome;
  const now = new Date();
  const remainingMonths = 12 - now.getMonth(); // months left including current
  const projectedAnnual = avgMonthlySavings * 12;

  return { avgMonthlySavings, projectedAnnual, remainingMonths };
}

/**
 * Calculate running total (cumulative savings since app start).
 */
export function getCumulativeSavings() {
  const savingsNames = getSavingsAccountNames();
  let total = 0;

  state.transactions.forEach((t) => {
    if (t.deleted) return;

    if (t.type === "transfer" && t.toAccount && savingsNames.includes(t.toAccount)) {
      if (t.fromAccount && savingsNames.includes(t.fromAccount)) return;
      total += t.amount;
    }

    if (t.category === "Savings/Investments" && t.type === "expense") {
      total += t.amount;
    }
  });

  return total;
}

// ---- Render Dashboard ----

export function renderSavingsDashboard() {
  const container = document.getElementById("savingsDashboard");
  const section = document.getElementById("savingsSection");
  if (!container || !section) return;

  // Show only if there are savings accounts or legacy savings data
  const savingsNames = getSavingsAccountNames();
  const hasLegacySavings = state.transactions.some(
    (t) => t.category === "Savings/Investments" && !t.deleted,
  );

  if (savingsNames.length === 0 && !hasLegacySavings) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthSaved = getMonthlySavings(currentMonth);
  const monthIncome = getMonthlyIncome(currentMonth);
  const rate = getSavingsRate(currentMonth);
  const trend = buildSavingsTrend();
  const projection = getAnnualProjection();
  const cumulative = getCumulativeSavings();

  // Rate color
  const rateClass = rate >= 20 ? "good" : rate >= 10 ? "okay" : "low";

  let html = `
    <div class="savings-widgets">
      <div class="savings-widget-row">
        <div class="savings-widget">
          <span class="savings-widget-label">Saved This Month</span>
          <span class="savings-widget-value">${formatCurrency(monthSaved)}</span>
          <span class="savings-widget-sub">${monthIncome > 0 ? "of " + formatCurrency(monthIncome) + " income" : "no income yet"}</span>
        </div>
        <div class="savings-widget highlight">
          <span class="savings-widget-label">Savings Rate</span>
          <span class="savings-widget-value ${rateClass}">${rate.toFixed(1)}%</span>
          <span class="savings-widget-sub">${rate >= 20 ? "On track" : rate >= 10 ? "Could improve" : "Below target"}</span>
        </div>
      </div>`;

  // 3-month trend bar chart
  html += `<div class="savings-trend">
    <span class="savings-trend-title">3-Month Trend</span>
    <div class="savings-trend-chart">`;

  const maxRate = Math.max(...trend.map((t) => t.rate), 1);
  trend.forEach((t) => {
    const height = Math.max((t.rate / maxRate) * 100, 4);
    const barClass = t.rate >= 20 ? "good" : t.rate >= 10 ? "okay" : "low";
    html += `
      <div class="savings-trend-col">
        <div class="savings-trend-bar-wrap">
          <span class="savings-trend-pct">${t.rate.toFixed(0)}%</span>
          <div class="savings-trend-bar ${barClass}" style="height: ${height}%"></div>
        </div>
        <span class="savings-trend-label">${t.label}</span>
      </div>`;
  });

  html += `</div></div>`;

  // Projection + Cumulative
  html += `
      <div class="savings-widget-row">
        <div class="savings-widget">
          <span class="savings-widget-label">Annual Projection</span>
          <span class="savings-widget-value">${formatCurrency(projection.projectedAnnual)}</span>
          <span class="savings-widget-sub">~${formatCurrency(projection.avgMonthlySavings)}/mo avg</span>
        </div>
        <div class="savings-widget">
          <span class="savings-widget-label">Total Saved</span>
          <span class="savings-widget-value">${formatCurrency(cumulative)}</span>
          <span class="savings-widget-sub">All time</span>
        </div>
      </div>
    </div>`;

  container.innerHTML = html;
}
