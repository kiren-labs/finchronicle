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

import { formatCurrency } from './currency.js';

// ---------------------------------------------------------------------------
// Chart colour palette — hex literals required for conic-gradient strings.
// These mirror the --chart-c1..c8 tokens defined in css/tokens.css.
// ---------------------------------------------------------------------------
const CHART_COLORS = [
    '#FF9F0A',  // c1 – amber   Food
    '#FF6B35',  // c2 – coral   Groceries / Housing
    '#0051D5',  // c3 – blue    Transport
    '#5AC8FA',  // c4 – sky     Utilities / Bills
    '#BF5AF2',  // c5 – purple  Personal / Shopping
    '#FF3B30',  // c6 – red     Healthcare / Debt
    '#34C759',  // c7 – green   Savings / Investments
    '#8E8E93',  // c8 – slate   Misc / Other
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
    const hasGap   = data.length > 1;
    const gapHalf  = hasGap ? SEGMENT_GAP / 2 : 0;
    const segments = [];
    const rows     = [];
    let   cursor   = 0;

    data.forEach((item, i) => {
        const pct   = (item.amount / total) * 100;
        const color = CHART_COLORS[i % CHART_COLORS.length];

        const segStart = cursor + gapHalf;
        const segEnd   = cursor + pct - gapHalf;

        // transparent gap before this segment (skip on the very first slice)
        if (hasGap && i > 0) {
            segments.push(`transparent ${cursor.toFixed(3)}% ${segStart.toFixed(3)}%`);
        }
        segments.push(`${color} ${segStart.toFixed(3)}% ${segEnd.toFixed(3)}%`);

        cursor += pct;

        rows.push({
            name:     item.category,
            color,
            pctLabel: pct < 1 ? '<1%' : `${Math.round(pct)}%`,
            pctValue: Math.min(pct, 100).toFixed(2),   // for CSS --item-pct
            amount:   formatCurrency(item.amount),
            delay:    `${(i * 0.048).toFixed(3)}s`,
        });
    });

    // Close any remaining arc to avoid stray artefacts
    if (cursor < 100) {
        segments.push(`transparent ${cursor.toFixed(3)}% 100%`);
    }

    const gradient       = `conic-gradient(${segments.join(', ')})`;
    const totalFormatted = formatCurrency(total);

    // --- Render HTML --------------------------------------------------------
    container.innerHTML = `
        <div class="chart-donut-wrapper">
            <div class="chart-donut"></div>
            <div class="chart-center-info">
                <span class="chart-center-amount">${totalFormatted}</span>
                <span class="chart-center-label">Total Spent</span>
            </div>
        </div>
        <div class="chart-legend">
            ${rows.map(row => `
                <div class="legend-item"
                     style="--item-color:${row.color};--item-pct:${row.pctValue}%;--legend-delay:${row.delay}"
                     data-amt="${row.amount}"
                     data-name="${row.name}">
                    <span class="legend-swatch"></span>
                    <span class="legend-name">${row.name}</span>
                    <span class="legend-pct">${row.pctLabel}</span>
                    <span class="legend-amt">${row.amount}</span>
                    <div class="legend-bar">
                        <div class="legend-bar-fill"></div>
                    </div>
                </div>`).join('')}
        </div>`;

    // --- Set gradient via background-image (preserves background-color) ----
    // Setting the shorthand `background` would wipe out background-color, which
    // provides the surface-coloured fill for transparent gaps in dark mode.
    container.querySelector('.chart-donut').style.backgroundImage = gradient;

    // --- Hover: update centre label/amount ----------------------------------
    const amtEl   = container.querySelector('.chart-center-amount');
    const labelEl = container.querySelector('.chart-center-label');

    container.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            amtEl.textContent   = item.dataset.amt;
            labelEl.textContent = item.dataset.name;
        });
        item.addEventListener('mouseleave', () => {
            amtEl.textContent   = totalFormatted;
            labelEl.textContent = 'Total Spent';
        });
    });
}

// ---------------------------------------------------------------------------
// buildCategoryData  — helper to derive chart input from state.transactions
// ---------------------------------------------------------------------------

/**
 * Aggregate transactions into category totals for the pie chart.
 *
 * @param {Array}   transactions  state.transactions (all loaded transactions)
 * @param {string}  month         'YYYY-MM' or 'all'
 * @param {number}  [topN=7]      Max categories before collapsing into "Other"
 * @returns {Array<{category: string, amount: number}>} Sorted descending.
 */
export function buildCategoryData(transactions, month, topN = 7) {
    const filtered = month === 'all'
        ? transactions.filter(t => t.type === 'expense')
        : transactions.filter(t => t.type === 'expense' && t.date.startsWith(month));

    const totals = {};
    filtered.forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(totals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

    if (sorted.length <= topN) return sorted;

    // Collapse tail into "Other"
    const top   = sorted.slice(0, topN);
    const other = sorted.slice(topN).reduce((s, d) => s + d.amount, 0);
    if (other > 0) top.push({ category: 'Other', amount: other });
    return top;
}
