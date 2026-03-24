// ============================================================================
// Category Pie Chart — CSS conic-gradient donut renderer
//
// Usage:
//   import { renderCategoryPieChart } from './chart.js';
//   renderCategoryPieChart(data, container);
//
// data     — Array<{ category: string, amount: number }>, sorted desc by amount
// container — The .category-chart DOM element
//
// The function sets background-image (not the background shorthand) on the
// donut ring so that background-color: var(--color-surface) survives the
// assignment and transparent segment gaps inherit the correct surface colour
// in both light and dark mode.
// ============================================================================

import { formatCurrency } from "./currency.js";

// ---------------------------------------------------------------------------
// Chart colour palette — hex literals required for conic-gradient strings.
// These mirror the --chart-c1..c8 tokens defined in css/tokens.css.
// ---------------------------------------------------------------------------
const CHART_COLORS = [
  "#FF9F0A", // c1 – amber   Food
  "#FF6B35", // c2 – coral   Groceries / Housing
  "#0051D5", // c3 – blue    Transport
  "#5AC8FA", // c4 – sky     Utilities / Bills
  "#BF5AF2", // c5 – purple  Personal / Shopping
  "#FF3B30", // c6 – red     Healthcare / Debt
  "#34C759", // c7 – green   Savings / Investments
  "#8E8E93", // c8 – slate   Misc / Other
];

// Gap in percentage points between adjacent segments (visual breathing room)
const SEGMENT_GAP = 0.5;

// ---------------------------------------------------------------------------
// renderCategoryPieChart
// ---------------------------------------------------------------------------

/**
 * Render a CSS donut chart for spending by category.
 *
 * @param {Array<{category: string, amount: number}>} data
 *   Expense categories with totals, sorted descending by amount.
 *   Typically the top 7–8 categories; an "Other" bucket should be pre-merged
 *   by the caller if needed.
 *
 * @param {HTMLElement} container
 *   The .category-chart element that will receive the rendered HTML.
 *   The element must already be in the DOM.
 */
export function renderCategoryPieChart(data, container) {
  // --- Empty / zero-spend guard -------------------------------------------
  const total = data ? data.reduce((s, d) => s + d.amount, 0) : 0;

  if (!data || data.length === 0 || total === 0) {
    container.innerHTML = `
            <div class="chart-empty" role="status" aria-live="polite">
                <i class="ri-pie-chart-2-line" aria-hidden="true"></i>
                <span>No expenses to display</span>
            </div>`;
    return;
  }

  // --- Build conic-gradient segments and legend rows ----------------------
  const hasGap = data.length > 1;
  const gapHalf = hasGap ? SEGMENT_GAP / 2 : 0;
  const segments = [];
  const rows = [];
  let cursor = 0;

  data.forEach((item, i) => {
    const pct = (item.amount / total) * 100;
    const color = CHART_COLORS[i % CHART_COLORS.length];

    const segStart = cursor + gapHalf;
    const segEnd = cursor + pct - gapHalf;

    // transparent gap before this segment (skip on the very first slice)
    if (hasGap && i > 0) {
      segments.push(
        `transparent ${cursor.toFixed(3)}% ${segStart.toFixed(3)}%`,
      );
    }
    segments.push(`${color} ${segStart.toFixed(3)}% ${segEnd.toFixed(3)}%`);

    cursor += pct;

    rows.push({
      name: item.category,
      color,
      pctLabel: pct < 1 ? "<1%" : `${Math.round(pct)}%`,
      pctValue: Math.min(pct, 100).toFixed(2), // for CSS --item-pct
      amount: formatCurrency(item.amount),
      delay: `${(i * 0.048).toFixed(3)}s`,
    });
  });

  // Close any remaining arc to avoid stray artefacts
  if (cursor < 100) {
    segments.push(`transparent ${cursor.toFixed(3)}% 100%`);
  }

  const gradient = `conic-gradient(${segments.join(", ")})`;
  const totalFormatted = formatCurrency(total);

  // --- Render HTML --------------------------------------------------------
  container.innerHTML = `
        <div class="chart-donut-wrapper" role="img" aria-label="Expense spending by category donut chart. Total: ${totalFormatted}">
            <div class="chart-donut" aria-hidden="true"></div>
            <div class="chart-center-info" aria-hidden="true">
                <span class="chart-center-amount">${totalFormatted}</span>
                <span class="chart-center-label">Spent</span>
            </div>
        </div>
        <div class="chart-legend" role="list" aria-label="Category spending breakdown">
            ${rows
              .map(
                (row) => `
                <div class="legend-item"
                     role="listitem"
                     aria-label="${row.name}: ${row.pctLabel} of expenses, ${row.amount}"
                     style="--item-color:${row.color};--item-pct:${row.pctValue}%;--legend-delay:${row.delay}"
                     data-amt="${row.amount}"
                     data-name="${row.name}">
                    <span class="legend-swatch" aria-hidden="true"></span>
                    <span class="legend-name" aria-hidden="true">${row.name}</span>
                    <span class="legend-pct" aria-hidden="true">${row.pctLabel}</span>
                    <span class="legend-amt" aria-hidden="true">${row.amount}</span>
                    <div class="legend-bar" aria-hidden="true">
                        <div class="legend-bar-fill"></div>
                    </div>
                </div>`,
              )
              .join("")}
        </div>`;

  // --- Set gradient via background-image (preserves background-color) ----
  // Setting the shorthand `background` would wipe out background-color, which
  // provides the surface-coloured fill for transparent gaps in dark mode.
  container.querySelector(".chart-donut").style.backgroundImage = gradient;

  // --- Hover: update centre label/amount ----------------------------------
  const amtEl = container.querySelector(".chart-center-amount");
  const labelEl = container.querySelector(".chart-center-label");

  container.querySelectorAll(".legend-item").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      amtEl.textContent = item.dataset.amt;
      labelEl.textContent = item.dataset.name;
    });
    item.addEventListener("mouseleave", () => {
      amtEl.textContent = totalFormatted;
      labelEl.textContent = "Spent";
    });
  });
}

// ---------------------------------------------------------------------------
// buildCategoryData  — helper to derive chart input from state.transactions
// ---------------------------------------------------------------------------

/**
 * Aggregate transactions into category totals for the pie chart.
 *
 * @param {Array}          transactions  state.transactions
 * @param {string|Array}   month         'YYYY-MM', 'all', or string[] of 'YYYY-MM' months
 * @param {number}         [topN=7]      Max categories before collapsing into "Other"
 * @returns {Array<{category: string, amount: number}>} Sorted descending.
 */
export function buildCategoryData(transactions, month, topN = 7) {
  let filtered;
  if (month === "all") {
    filtered = transactions.filter((t) => t.type === "expense");
  } else if (Array.isArray(month)) {
    filtered = transactions.filter(
      (t) => t.type === "expense" && month.includes(t.date.slice(0, 7)),
    );
  } else {
    filtered = transactions.filter(
      (t) => t.type === "expense" && t.date.startsWith(month),
    );
  }

  const totals = {};
  filtered.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  if (sorted.length <= topN) return sorted;

  // Collapse tail into "Other"
  const top = sorted.slice(0, topN);
  const other = sorted.slice(topN).reduce((s, d) => s + d.amount, 0);
  if (other > 0) top.push({ category: "Other", amount: other });
  return top;
}

// ---------------------------------------------------------------------------
// getRangeMonths — derive array of 'YYYY-MM' strings from a range key
// ---------------------------------------------------------------------------

/**
 * @param {string} range  '3m' | '6m' | '1y' | 'all'
 * @returns {string[]|null}  Sorted oldest-first array, or null for 'all'
 */
export function getRangeMonths(range) {
  if (range === "all") return null;
  const count = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months; // oldest → newest
}

// ---------------------------------------------------------------------------
// buildIncomeExpenseData / renderIncomeExpenseChart
// ---------------------------------------------------------------------------

/**
 * Aggregate income and expense totals per month for the bar chart.
 *
 * @param {Array}  transactions
 * @param {string} range  '3m' | '6m' | '1y' | 'all'
 * @returns {Array<{month, label, income, expense}>} oldest-first
 */
export function buildIncomeExpenseData(transactions, range) {
  const months = getRangeMonths(range);

  // Aggregate by month
  const byMonth = {};
  transactions.forEach((t) => {
    const m = t.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
    if (t.type === "income") byMonth[m].income += t.amount;
    else byMonth[m].expense += t.amount;
  });

  let keys;
  if (months === null) {
    keys = Object.keys(byMonth).sort();
  } else {
    // Only include months that have at least one transaction
    keys = months.filter((m) => byMonth[m]);
  }

  return keys.map((m) => ({
    month: m,
    label: _monthShort(m),
    income: byMonth[m]?.income || 0,
    expense: byMonth[m]?.expense || 0,
  }));
}

function _monthShort(ym) {
  const [y, mo] = ym.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("default", {
    month: "short",
  });
}

/**
 * Render an income-vs-expense bar chart into container.
 *
 * @param {Array}       data       Output of buildIncomeExpenseData
 * @param {HTMLElement} container  .bar-chart-card element
 */
export function renderIncomeExpenseChart(data, container) {
  const hasData = data && data.some((d) => d.income > 0 || d.expense > 0);

  if (!hasData) {
    container.innerHTML = `
            <div class="chart-empty-sm" role="status">
                <i class="ri-bar-chart-2-line" aria-hidden="true"></i>
                <span>No data for this period</span>
            </div>`;
    return;
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);

  const cols = data
    .map((d, i) => {
      const incH = ((d.income / maxVal) * 100).toFixed(1);
      const expH = ((d.expense / maxVal) * 100).toFixed(1);
      const delay = (i * 0.045).toFixed(3);
      const net = d.income - d.expense;
      const netLabel =
        net > 0
          ? `<span class="bar-net-label positive">+${formatCurrency(net)}</span>`
          : net < 0
            ? `<span class="bar-net-label negative">−${formatCurrency(-net)}</span>`
            : "";
      return `
            <div class="bar-col" style="--bar-delay:${delay}s"
                 aria-label="${d.label}: Income ${formatCurrency(d.income)}, Expenses ${formatCurrency(d.expense)}, Net ${formatCurrency(net)}">
                <div class="bar-group">
                    <div class="bar income-bar" style="--bar-h:${incH}%"
                         title="Income ${formatCurrency(d.income)}"></div>
                    <div class="bar expense-bar" style="--bar-h:${expH}%"
                         title="Expenses ${formatCurrency(d.expense)}"></div>
                </div>
                <div class="bar-month-label">${d.label}</div>
                ${netLabel}
            </div>`;
    })
    .join("");

  container.innerHTML = `
        <div class="bar-chart" role="img" aria-label="Income vs expenses bar chart">
            <div class="bar-cols">${cols}</div>
            <div class="bar-chart-legend" aria-hidden="true">
                <span class="bar-legend-dot income-dot"></span><span>Income</span>
                <span class="bar-legend-dot expense-dot"></span><span>Expenses</span>
            </div>
        </div>`;
}

// ---------------------------------------------------------------------------
// buildWeeklyData / renderWeeklyChart
// ---------------------------------------------------------------------------

/**
 * Compute expense totals for the last 4 rolling 7-day windows.
 *
 * @param {Array} transactions
 * @returns {Array<{label, total, changePct, changeDir}>} oldest-first
 */
export function buildWeeklyData(transactions) {
  const now = new Date();
  const weeks = [];

  for (let w = 3; w >= 0; w--) {
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - w * 7,
    );
    const startDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() - 6,
    );

    const toStr = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const startStr = toStr(startDate);
    const endStr = toStr(endDate);

    const total = transactions
      .filter(
        (t) => t.type === "expense" && t.date >= startStr && t.date <= endStr,
      )
      .reduce((s, t) => s + t.amount, 0);

    const startLabel = startDate.toLocaleString("default", {
      month: "short",
      day: "numeric",
    });
    const endLabel = endDate.toLocaleString("default", { day: "numeric" });

    weeks.push({ label: `${startLabel}–${endLabel}`, total });
  }

  return weeks.map((w, i) => {
    const prev = i > 0 ? weeks[i - 1].total : null;
    const changePct =
      prev === null || prev === 0
        ? null
        : Math.round(((w.total - prev) / prev) * 100);
    const changeDir =
      prev === null || prev === 0
        ? null
        : w.total > prev
          ? "up"
          : w.total < prev
            ? "down"
            : "same";
    return { ...w, changePct, changeDir };
  });
}

/**
 * Render a week-over-week spending comparison into container.
 *
 * @param {Array}       data       Output of buildWeeklyData
 * @param {HTMLElement} container  .weekly-chart-card element
 */
export function renderWeeklyChart(data, container) {
  const hasData = data && data.some((w) => w.total > 0);

  if (!hasData) {
    container.innerHTML = `
            <div class="chart-empty-sm" role="status">
                <i class="ri-calendar-line" aria-hidden="true"></i>
                <span>No expense data yet</span>
            </div>`;
    return;
  }

  const maxTotal = Math.max(...data.map((w) => w.total), 1);

  const rows = data
    .map((w, i) => {
      const barW = ((w.total / maxTotal) * 100).toFixed(1);
      const delay = (i * 0.07).toFixed(3);
      let trendHtml = "";
      if (w.changeDir === "up") {
        trendHtml = `<span class="week-trend up" aria-label="Up ${Math.abs(w.changePct)}%">↑ ${Math.abs(w.changePct)}%</span>`;
      } else if (w.changeDir === "down") {
        trendHtml = `<span class="week-trend down" aria-label="Down ${Math.abs(w.changePct)}%">↓ ${Math.abs(w.changePct)}%</span>`;
      } else if (w.changeDir === "same") {
        trendHtml = `<span class="week-trend same" aria-label="No change">—</span>`;
      }
      return `
            <div class="week-row" role="listitem" style="--week-delay:${delay}s"
                 aria-label="${w.label}: ${formatCurrency(w.total)}">
                <div class="week-label">${w.label}</div>
                <div class="week-bar-track">
                    <div class="week-bar-fill" style="--week-w:${barW}%"></div>
                </div>
                <div class="week-amount">${formatCurrency(w.total)}</div>
                ${trendHtml}
            </div>`;
    })
    .join("");

  container.innerHTML = `<div class="weekly-chart" role="list" aria-label="Weekly spending comparison">${rows}</div>`;
}

// ---------------------------------------------------------------------------
// buildDayHeatmapData / renderDayHeatmap
// ---------------------------------------------------------------------------

/**
 * Sum expense amounts per day-of-month across the selected range.
 *
 * @param {Array}  transactions
 * @param {string} range  '3m' | '6m' | '1y' | 'all'
 * @returns {Array<{day: number, total: number}>} days 1–31
 */
export function buildDayHeatmapData(transactions, range) {
  const months = getRangeMonths(range);
  const filtered = transactions.filter((t) => {
    if (t.type !== "expense") return false;
    return months === null || months.includes(t.date.slice(0, 7));
  });

  const byDay = {};
  filtered.forEach((t) => {
    const day = parseInt(t.date.slice(8, 10), 10);
    byDay[day] = (byDay[day] || 0) + t.amount;
  });

  return Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    total: byDay[i + 1] || 0,
  }));
}

/**
 * Render a day-of-month spending heatmap into container.
 *
 * @param {Array}       data       Output of buildDayHeatmapData
 * @param {HTMLElement} container  .day-heatmap-card element
 */
export function renderDayHeatmap(data, container) {
  const hasData = data && data.some((d) => d.total > 0);

  if (!hasData) {
    container.innerHTML = `
            <div class="chart-empty-sm" role="status">
                <i class="ri-calendar-2-line" aria-hidden="true"></i>
                <span>No expense data for this period</span>
            </div>`;
    return;
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  const cells = data
    .map((d) => {
      const intensity = d.total > 0 ? Math.max(0.12, d.total / maxTotal) : 0;
      const label =
        d.total > 0
          ? `Day ${d.day}: ${formatCurrency(d.total)}`
          : `Day ${d.day}: no spending`;
      return `
            <div class="heatmap-cell ${d.total > 0 ? "active" : ""}"
                 style="--cell-intensity:${intensity.toFixed(3)}"
                 title="${label}"
                 aria-label="${label}">
                <span class="heatmap-day">${d.day}</span>
            </div>`;
    })
    .join("");

  container.innerHTML = `
        <div class="day-heatmap" aria-label="Spending by day of month">
            <div class="heatmap-grid">${cells}</div>
            <div class="heatmap-legend" aria-hidden="true">
                <span>Less</span>
                <div class="heatmap-legend-scale"></div>
                <span>More</span>
            </div>
        </div>`;
}
