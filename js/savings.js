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
    if (
      t.type === "transfer" &&
      t.toAccount &&
      savingsNames.includes(t.toAccount)
    ) {
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
    const label = new Date(`${m}-15`).toLocaleDateString("en", {
      month: "short",
    });
    const transactionCount = state.transactions.filter(
      (t) => !t.deleted && t.date && t.date.startsWith(m),
    ).length;
    return { month: m, label, income, savings, rate, transactionCount };
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

  if (monthsWithIncome === 0)
    return { avgMonthlySavings: 0, projectedAnnual: 0, remainingMonths: 0 };

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

    if (
      t.type === "transfer" &&
      t.toAccount &&
      savingsNames.includes(t.toAccount)
    ) {
      if (t.fromAccount && savingsNames.includes(t.fromAccount)) return;
      total += t.amount;
    }

    if (t.category === "Savings/Investments" && t.type === "expense") {
      total += t.amount;
    }
  });

  return total;
}

// ---- Financial Health Ratio Calculations (v4.6.0) ----

function getAvgMonthlyExpense(months = 3) {
  const now = new Date();
  let total = 0;
  let count = 0;
  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.toISOString().slice(0, 7);
    const monthTotal = state.transactions
      .filter(
        (t) =>
          !t.deleted && t.type === "expense" && t.date && t.date.startsWith(m),
      )
      .reduce((s, t) => s + (t.homeAmount || t.amount), 0);
    if (monthTotal > 0) {
      total += monthTotal;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

function getAvgMonthlyIncome(months = 3) {
  const now = new Date();
  let total = 0;
  let count = 0;
  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.toISOString().slice(0, 7);
    const inc = getMonthlyIncome(m);
    if (inc > 0) {
      total += inc;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

function getLiquidAssetBalance() {
  const { ACCOUNT_CLASSIFICATION } = {
    ACCOUNT_CLASSIFICATION: {
      checking: "asset",
      savings: "asset",
      "credit-card": "liability",
      cash: "asset",
      investment: "asset",
      loan: "liability",
      mortgage: "liability",
      other: "asset",
    },
  };
  let total = 0;
  state.accounts.forEach((a) => {
    const cls = a.classification || ACCOUNT_CLASSIFICATION[a.type] || "asset";
    if (cls !== "asset") return;
    if (["investment", "other"].includes(a.type)) return; // illiquid
    const opening = a.openingBalance || 0;
    let credits = 0,
      debits = 0;
    state.transactions.forEach((t) => {
      if (t.deleted) return;
      if (t.type === "transfer") {
        if (t.toAccount === a.name) credits += t.amount;
        if (t.fromAccount === a.name) debits += t.amount;
      } else if (t.type === "income" && t.toAccount === a.name) {
        credits += t.amount;
      } else if (t.type === "expense" && t.fromAccount === a.name) {
        debits += t.amount;
      }
    });
    total += opening + credits - debits;
  });
  return Math.max(total, 0);
}

function getMonthlyDebtPayments() {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const debtCategories = ["Credit Card", "EMI", "Personal Loan", "Debt/Loans"];
  return state.transactions
    .filter(
      (t) =>
        !t.deleted &&
        t.type === "expense" &&
        t.date &&
        t.date.startsWith(currentMonth) &&
        (debtCategories.includes(t.category) ||
          state.accounts.some(
            (a) =>
              ["credit-card", "loan", "mortgage"].includes(a.type) &&
              t.fromAccount === a.name,
          )),
    )
    .reduce((s, t) => s + (t.homeAmount || t.amount), 0);
}

function getMonthlyHousingCost() {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const housingCategories = ["Rent", "Mortgage", "Housing"];
  return state.transactions
    .filter(
      (t) =>
        !t.deleted &&
        t.type === "expense" &&
        t.date &&
        t.date.startsWith(currentMonth) &&
        housingCategories.some(
          (c) => t.category === c || t.category.startsWith(c),
        ),
    )
    .reduce((s, t) => s + (t.homeAmount || t.amount), 0);
}

function hasEnoughData() {
  const months = new Set(
    state.transactions
      .filter((t) => !t.deleted)
      .map((t) => (t.date ? t.date.slice(0, 7) : "")),
  );
  months.delete("");
  return months.size >= 2;
}

export function renderHealthRatios() {
  const container = document.getElementById("healthRatiosDashboard");
  const section = document.getElementById("healthRatiosSection");
  if (!container || !section) return;

  if (!hasEnoughData()) {
    section.hidden = true;
    return;
  }

  const avgExpense = getAvgMonthlyExpense(3);
  const avgIncome = getAvgMonthlyIncome(3);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentIncome = getMonthlyIncome(currentMonth) || avgIncome;

  // Emergency Fund
  const liquidBalance = getLiquidAssetBalance();
  const emergencyMonths = avgExpense > 0 ? liquidBalance / avgExpense : null;

  // Debt-to-Income
  const debtPayments = getMonthlyDebtPayments();
  const dti = currentIncome > 0 ? (debtPayments / currentIncome) * 100 : null;

  // Housing Cost
  const housing = getMonthlyHousingCost();
  const housingPct = currentIncome > 0 ? (housing / currentIncome) * 100 : null;

  // Savings Rate
  const savingsRate = getSavingsRate(currentMonth);
  const srHasIncome = currentIncome > 0;

  section.hidden = false;

  function ratioCard(label, valueStr, subtext, status, icon) {
    const cls =
      status === "good"
        ? "ratio-good"
        : status === "warn"
          ? "ratio-warn"
          : "ratio-bad";
    const dot =
      status === "good"
        ? "ri-checkbox-circle-fill"
        : status === "warn"
          ? "ri-error-warning-fill"
          : "ri-close-circle-fill";
    return `<div class="health-ratio-card ${cls}">
      <span class="ratio-icon"><i class="${icon}"></i></span>
      <span class="ratio-label">${label}</span>
      <span class="ratio-value">${valueStr}</span>
      <span class="ratio-sub">${subtext}</span>
      <i class="ratio-status-icon ${dot}"></i>
    </div>`;
  }

  // Emergency Fund card
  let efCard;
  if (emergencyMonths === null || !state.accounts.length) {
    efCard = ratioCard(
      "Emergency Fund",
      "—",
      "Set up accounts to track",
      "warn",
      "ri-shield-check-line",
    );
  } else {
    const s =
      emergencyMonths >= 6 ? "good" : emergencyMonths >= 3 ? "warn" : "bad";
    efCard = ratioCard(
      "Emergency Fund",
      `${emergencyMonths.toFixed(1)} mo`,
      `Target ≥ 6 mo · ${formatCurrency(liquidBalance)} liquid`,
      s,
      "ri-shield-check-line",
    );
  }

  // DTI card
  let dtiCard;
  if (dti === null) {
    dtiCard = ratioCard(
      "Debt-to-Income",
      "—",
      "No income this month",
      "warn",
      "ri-bank-card-line",
    );
  } else if (debtPayments === 0) {
    dtiCard = ratioCard(
      "Debt-to-Income",
      "0%",
      "No debt payments · Target < 36%",
      "good",
      "ri-bank-card-line",
    );
  } else {
    const s = dti < 36 ? "good" : dti < 50 ? "warn" : "bad";
    dtiCard = ratioCard(
      "Debt-to-Income",
      `${dti.toFixed(1)}%`,
      `${formatCurrency(debtPayments)}/mo · Target < 36%`,
      s,
      "ri-bank-card-line",
    );
  }

  // Housing card
  let housingCard;
  if (housingPct === null) {
    housingCard = ratioCard(
      "Housing Cost",
      "—",
      "No income this month",
      "warn",
      "ri-home-4-line",
    );
  } else if (housing === 0) {
    housingCard = ratioCard(
      "Housing Cost",
      "0%",
      "No housing expense · Target < 30%",
      "good",
      "ri-home-4-line",
    );
  } else {
    const s = housingPct < 30 ? "good" : housingPct < 40 ? "warn" : "bad";
    housingCard = ratioCard(
      "Housing Cost",
      `${housingPct.toFixed(1)}%`,
      `${formatCurrency(housing)}/mo · Target < 30%`,
      s,
      "ri-home-4-line",
    );
  }

  // Savings Rate card
  let srCard;
  if (!srHasIncome) {
    srCard = ratioCard(
      "Savings Rate",
      "—",
      "No income this month",
      "warn",
      "ri-seedling-line",
    );
  } else {
    const s = savingsRate >= 20 ? "good" : savingsRate >= 10 ? "warn" : "bad";
    srCard = ratioCard(
      "Savings Rate",
      `${savingsRate.toFixed(1)}%`,
      `Target ≥ 20%`,
      s,
      "ri-seedling-line",
    );
  }

  const cards = [efCard, dtiCard, housingCard, srCard];
  const goodCount = [
    emergencyMonths !== null && emergencyMonths >= 6,
    dti !== null && dti < 36,
    housingPct !== null && housingPct < 30,
    srHasIncome && savingsRate >= 20,
  ].filter(Boolean).length;

  container.innerHTML = `
    <p class="ratio-summary">${goodCount} of 4 ratios healthy</p>
    <div class="health-ratio-grid">${cards.join("")}</div>`;
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

  if (monthIncome === 0) {
    container.innerHTML = `
      <div class="savings-income-prompt">
        <p class="savings-income-prompt-msg">Add income to unlock savings rate &amp; projections</p>
        <button class="savings-income-prompt-btn">
          <i class="ri-add-line"></i> Log income
        </button>
      </div>`;
    container
      .querySelector(".savings-income-prompt-btn")
      .addEventListener("click", () => {
        document.dispatchEvent(
          new CustomEvent("fc:navigate", {
            detail: { tab: "add", type: "income" },
          }),
        );
      });
    return;
  }

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
          <span class="savings-widget-label">Saved this month</span>
          <span class="savings-widget-value">${formatCurrency(monthSaved)}</span>
          <span class="savings-widget-sub">${monthIncome > 0 ? `of ${formatCurrency(monthIncome)} income` : "no income yet"}</span>
        </div>
        <div class="savings-widget highlight">
          <span class="savings-widget-label">Savings rate</span>
          <span class="savings-widget-value ${monthIncome === 0 ? "" : rateClass}">${monthIncome === 0 ? "N/A" : `${rate.toFixed(1)}%`}</span>
          <span class="savings-widget-sub">${monthIncome === 0 ? "No income recorded" : rate >= 20 ? "On track" : rate >= 10 ? "Could improve" : "Below target"}</span>
        </div>
      </div>`;

  // 3-month trend bar chart
  html += `<div class="savings-trend">
    <span class="savings-trend-title">3-month trend</span>
    <div class="savings-trend-chart">`;

  const maxRate = Math.max(...trend.map((t) => t.rate), 1);
  trend.forEach((t) => {
    const height = Math.max((t.rate / maxRate) * 100, 4);
    const barClass = t.rate >= 20 ? "good" : t.rate >= 10 ? "okay" : "low";
    html += `
      <div class="savings-trend-col">
        <div class="savings-trend-bar-wrap">
          <span class="savings-trend-pct${t.transactionCount === 0 ? " savings-trend-nodata" : ""}">${t.transactionCount === 0 ? "—" : `${t.rate.toFixed(0)}%`}</span>
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
          <span class="savings-widget-label">Annual projection</span>
          <span class="savings-widget-value${projection.avgMonthlySavings < 0 ? " is-negative" : ""}">${formatCurrency(Math.abs(projection.projectedAnnual))}</span>
          <span class="savings-widget-sub">${projection.avgMonthlySavings < 0 ? "Deficit trend" : `~${formatCurrency(projection.avgMonthlySavings)}/mo avg`}</span>
        </div>
        <div class="savings-widget">
          <span class="savings-widget-label">Total saved</span>
          <span class="savings-widget-value">${formatCurrency(cumulative)}</span>
          <span class="savings-widget-sub">All time</span>
        </div>
      </div>
    </div>`;

  container.innerHTML = html;
}
