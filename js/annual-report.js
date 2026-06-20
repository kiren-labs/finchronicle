// ============================================================================
// Annual Report (v3.21.0)
// ============================================================================

import { state } from "./state.js";
import { formatCurrency } from "./currency.js";

// ---- Helpers ----

function getYearOptions() {
  const years = new Set();
  for (const t of state.transactions) {
    const y = t.date ? t.date.slice(0, 4) : null;
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

function getTransactionsForYear(year) {
  return state.transactions.filter((t) => t.date && t.date.startsWith(year));
}

// ---- Annual Aggregation ----

function getMonthlyTotals(year) {
  const income = new Array(12).fill(0);
  const expense = new Array(12).fill(0);
  const txns = getTransactionsForYear(year);

  for (const t of txns) {
    const month = parseInt(t.date.slice(5, 7), 10) - 1;
    if (t.type === "income") income[month] += t.amount;
    else if (t.type === "expense") expense[month] += t.amount;
  }
  return { income, expense };
}

function getTopExpenses(year, count = 5) {
  return getTransactionsForYear(year)
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count);
}

function getAnnualSavingsRate(year) {
  const txns = getTransactionsForYear(year);
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
  }
  if (income === 0) return 0;
  return Math.round(((income - expense) / income) * 100);
}

function getYoYComparison(currentYear) {
  const prevYear = String(Number(currentYear) - 1);
  const currentTxns = getTransactionsForYear(currentYear);
  const prevTxns = getTransactionsForYear(prevYear);

  if (prevTxns.length === 0) return null;

  const currExpense = currentTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const currIncome = currentTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  return {
    expenseChange:
      prevExpense > 0
        ? Math.round(((currExpense - prevExpense) / prevExpense) * 100)
        : null,
    incomeChange:
      prevIncome > 0
        ? Math.round(((currIncome - prevIncome) / prevIncome) * 100)
        : null,
    prevYear,
  };
}

// ---- Public: Render Annual Report ----

export function renderAnnualReport(year = null) {
  const container = document.getElementById("annualReportContent");
  if (!container) return;

  const years = getYearOptions();
  if (years.length === 0) {
    container.innerHTML = `<p class="annual-empty">No data yet. Add transactions to see your annual report.</p>`;
    return;
  }

  const selectedYear = year || years[0];

  // Year selector
  const yearSelector = `
    <div class="annual-year-selector">
      ${years
        .map(
          (y) =>
            `<button class="range-pill ${y === selectedYear ? "active" : ""}" data-annual-year="${y}">${y}</button>`,
        )
        .join("")}
    </div>
  `;

  // Gather data
  const { income, expense } = getMonthlyTotals(selectedYear);
  const totalIncome = income.reduce((s, v) => s + v, 0);
  const totalExpense = expense.reduce((s, v) => s + v, 0);
  const net = totalIncome - totalExpense;
  const savingsRate = getAnnualSavingsRate(selectedYear);
  const topExpenses = getTopExpenses(selectedYear);
  const yoy = getYoYComparison(selectedYear);

  // Summary cards
  const summaryCards = `
    <div class="annual-summary-row">
      <div class="annual-stat">
        <span class="annual-stat-label">Total income</span>
        <span class="annual-stat-value positive">${formatCurrency(totalIncome)}</span>
      </div>
      <div class="annual-stat">
        <span class="annual-stat-label">Total expenses</span>
        <span class="annual-stat-value negative">${formatCurrency(totalExpense)}</span>
      </div>
      <div class="annual-stat">
        <span class="annual-stat-label">Net</span>
        <span class="annual-stat-value ${net >= 0 ? "positive" : "negative"}">${net >= 0 ? "" : "-"}${formatCurrency(Math.abs(net))}</span>
      </div>
      <div class="annual-stat">
        <span class="annual-stat-label">Savings rate</span>
        <span class="annual-stat-value ${savingsRate >= 20 ? "positive" : savingsRate >= 0 ? "" : "negative"}">${savingsRate}%</span>
      </div>
    </div>
  `;

  // YoY comparison
  let yoySection = "";
  if (yoy) {
    const expIcon = yoy.expenseChange <= 0 ? "↓" : "↑";
    const incIcon = yoy.incomeChange >= 0 ? "↑" : "↓";
    yoySection = `
      <div class="annual-yoy">
        <p class="annual-subsection-title">vs ${yoy.prevYear}</p>
        ${yoy.incomeChange !== null ? `<span class="yoy-item ${yoy.incomeChange >= 0 ? "positive" : "negative"}">${incIcon} Income ${yoy.incomeChange >= 0 ? "+" : ""}${yoy.incomeChange}%</span>` : ""}
        ${yoy.expenseChange !== null ? `<span class="yoy-item ${yoy.expenseChange <= 0 ? "positive" : "negative"}">${expIcon} Expenses ${yoy.expenseChange >= 0 ? "+" : ""}${yoy.expenseChange}%</span>` : ""}
      </div>
    `;
  }

  // Top 5 expenses
  let topSection = "";
  if (topExpenses.length > 0) {
    topSection = `
      <div class="annual-section">
        <p class="annual-subsection-title">Top 5 largest expenses</p>
        <div class="annual-top-list">
          ${topExpenses
            .map(
              (t) => `
            <div class="annual-top-item">
              <span class="annual-top-cat">${t.category}</span>
              <span class="annual-top-amount">${formatCurrency(t.amount)}</span>
              <span class="annual-top-date">${t.date}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  // Export button
  const exportBtn = `
    <div class="annual-section" style="text-align: center; padding-top: var(--space-sm);">
      <button class="btn primary-btn" data-annual-export="${selectedYear}" style="font-size: 12px; padding: 8px 16px;">
        <i class="ri-download-2-line"></i> Export ${selectedYear} as CSV
      </button>
    </div>
  `;

  container.innerHTML = `
    ${yearSelector}
    ${summaryCards}
    ${yoySection}
    ${topSection}
    ${exportBtn}
  `;
}

// ---- Public: Export annual data as CSV ----

export function exportAnnualCSV(year) {
  const txns = getTransactionsForYear(year);
  if (txns.length === 0) return;

  const rows = [["Date", "Type", "Category", "Amount", "Notes", "Tags"]];
  for (const t of txns) {
    rows.push([
      t.date,
      t.type,
      t.category || "",
      t.amount,
      (t.notes || "").replace(/"/g, '""'),
      (t.tags || []).join(";"),
    ]);
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finchronicle-annual-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindAnnualReportEvents() {
  const container = document.getElementById("annualReportContent");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const yearBtn = e.target.closest("[data-annual-year]");
    if (yearBtn) {
      renderAnnualReport(yearBtn.dataset.annualYear);
      return;
    }
    const exportBtn = e.target.closest("[data-annual-export]");
    if (exportBtn) {
      exportAnnualCSV(exportBtn.dataset.annualExport);
    }
  });
}
