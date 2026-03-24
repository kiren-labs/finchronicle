// ============================================================================
// UI Rendering: Summary, Transactions, Groups, Insights, Tabs, Filters
// ============================================================================

import { state, getDOM, categories, ITEMS_PER_PAGE } from "./state.js";
import { sanitizeHTML, formatDate, formatMonth, showMessage } from "./utils.js";
import { formatCurrency, getCurrency } from "./currency.js";
import { deleteTransactionFromDB } from "./db.js";
import { updateSettingsContent } from "./settings.js";
import {
  renderCategoryPieChart,
  buildCategoryData,
  getRangeMonths,
  buildIncomeExpenseData,
  renderIncomeExpenseChart,
  buildWeeklyData,
  renderWeeklyChart,
  buildDayHeatmapData,
  renderDayHeatmap,
} from "./chart.js";

// ---- Master UI Refresh ----

export function updateUI() {
  updateSummary();

  // Always update filters (lightweight)
  updateMonthFilters();
  updateCategoryFilter();

  // Only render the visible tab's content (P1: lazy-render)
  switch (state.currentTab) {
    case "list":
      updateTransactionsList();
      break;
    case "groups":
      updateGroupedView();
      break;
    case "settings":
      updateSettingsContent();
      break;
  }
}

// ---- Summary Cards (P1: single-pass aggregation) ----

export function updateSummary() {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { income, expense, count } = state.transactions.reduce(
    (acc, t) => {
      if (t.date.startsWith(currentMonth)) {
        acc.count++;
        if (t.type === "income") acc.income += t.amount;
        else acc.expense += t.amount;
      }
      return acc;
    },
    { income: 0, expense: 0, count: 0 },
  );

  const net = income - expense;

  const previousMonth = getPreviousMonth(currentMonth);
  const prevTotals = getMonthTotals(previousMonth);

  const netDelta = calculateMoMDelta(net, prevTotals.net);
  const incomeDelta = calculateMoMDelta(income, prevTotals.income);
  const expensePercent = calculateExpensePercentage(expense, income);

  const $ = getDOM();
  $.monthNet.textContent = formatCurrency(net);
  $.monthNet.className = "summary-value";

  $.totalEntries.textContent = count;
  $.monthIncome.textContent = formatCurrency(income);
  $.monthExpense.textContent = formatCurrency(expense);

  // Update This Month trend
  if (netDelta && netDelta.pct !== null) {
    const sign = netDelta.abs >= 0 ? "+" : "";
    $.monthNetTrend.innerHTML = `<i class="ri-arrow-${netDelta.direction === "up" ? "up" : netDelta.direction === "down" ? "down" : "right"}-line"></i> ${sign}${Math.abs(netDelta.pct).toFixed(1)}% vs last month`;
    $.monthNetTrend.className = `summary-trend ${netDelta.direction === "up" ? "positive" : netDelta.direction === "down" ? "negative" : "neutral"}`;
  } else {
    $.monthNetTrend.textContent = "";
  }

  // Update Income trend
  if (incomeDelta && incomeDelta.pct !== null) {
    const sign = incomeDelta.abs >= 0 ? "+" : "";
    $.monthIncomeTrend.innerHTML = `<i class="ri-arrow-${incomeDelta.direction === "up" ? "up" : incomeDelta.direction === "down" ? "down" : "right"}-line"></i> ${sign}${Math.abs(incomeDelta.pct).toFixed(1)}% vs last month`;
    $.monthIncomeTrend.className = `summary-trend ${incomeDelta.direction === "up" ? "positive" : incomeDelta.direction === "down" ? "negative" : "neutral"}`;
  } else {
    $.monthIncomeTrend.textContent = "";
  }

  // Update Expenses meta
  if (expensePercent !== null) {
    $.monthExpenseMeta.textContent = `${expensePercent.toFixed(1)}% of income`;
  } else {
    $.monthExpenseMeta.textContent = "";
  }

  // Update compact summary
  $.compactNet.textContent = formatCurrency(net);
  $.compactNet.className =
    "compact-stat " + (net >= 0 ? "compact-income" : "compact-expense");
  $.compactEntries.textContent = count;
  $.compactIncome.textContent = formatCurrency(income);
  $.compactExpense.textContent = formatCurrency(expense);
}

// ---- Transaction List (P3: DocumentFragment rendering) ----

export function updateTransactionsList() {
  const $ = getDOM();
  const list = $.transactionsList;
  const paginationControls = $.paginationControls;
  let filtered = state.transactions;

  if (state.selectedMonth !== "all") {
    filtered = filtered.filter((t) => t.date.startsWith(state.selectedMonth));
  }
  if (state.selectedCategory !== "all") {
    filtered = filtered.filter((t) => t.category === state.selectedCategory);
  }
  if (state.selectedType !== "all") {
    filtered = filtered.filter((t) => t.type === state.selectedType);
  }

  if (filtered.length === 0) {
    list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="ri-file-list-3-line"></i></div>
                <div>No transactions yet</div>
            </div>
        `;
    paginationControls.style.display = "none";
    return;
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = filtered.slice(startIndex, endIndex);

  // P3: Build with DocumentFragment instead of innerHTML
  const fragment = document.createDocumentFragment();

  paginatedTransactions.forEach((t) => {
    const isIncome = t.type === "income";
    const amountClass = isIncome ? "positive" : "negative";
    const sign = isIncome ? "+" : "-";

    const item = document.createElement("div");
    item.className = `transaction-item ${t.type}`;

    item.innerHTML = `
            <div class="transaction-icon ${t.type}">
                <i class="ri-arrow-${isIncome ? "up" : "down"}-circle-fill"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-category">
                    ${sanitizeHTML(t.category)}
                    ${t.recurringId ? '<span class="recurring-badge" title="Auto-generated recurring transaction"><i class="ri-repeat-line"></i></span>' : ""}
                </div>
                ${t.notes ? `<div class="transaction-note">${sanitizeHTML(t.notes)}</div>` : ""}
                <div class="transaction-date">${formatDate(t.date)}</div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${sign}${formatCurrency(t.amount)}
            </div>
            <div class="transaction-actions">
                <button class="action-btn edit-btn" data-action="edit" data-id="${t.id}" aria-label="Edit transaction"><i class="ri-edit-line"></i></button>
                <button class="action-btn delete-btn" data-action="delete" data-id="${t.id}" aria-label="Delete transaction"><i class="ri-delete-bin-line"></i></button>
            </div>
        `;

    fragment.appendChild(item);
  });

  list.innerHTML = "";
  list.appendChild(fragment);

  // Update pagination controls
  if (filtered.length > ITEMS_PER_PAGE) {
    paginationControls.style.display = "block";
    $.pageInfo.textContent = `Page ${state.currentPage} of ${totalPages} (${filtered.length} transactions)`;
    $.prevBtn.disabled = state.currentPage === 1;
    $.nextBtn.disabled = state.currentPage === totalPages;
  } else {
    paginationControls.style.display = "none";
  }
}

// ---- Month Filters ----

export function updateMonthFilters() {
  const months = [
    ...new Set(state.transactions.map((t) => t.date.slice(0, 7))),
  ];
  months.sort().reverse();

  const filters = getDOM().monthFilters;
  filters.innerHTML = `
        <button class="filter-btn ${state.selectedMonth === "all" ? "active" : ""}"
                data-month="all">All</button>
        ${months
          .map(
            (month) => `
            <button class="filter-btn ${state.selectedMonth === month ? "active" : ""}"
                    data-month="${month}">${formatMonth(month)}</button>
        `,
          )
          .join("")}
    `;
}

// ---- Category Filter ----

export function updateCategoryFilter() {
  const cats = [...new Set(state.transactions.map((t) => t.category))];
  cats.sort();

  const filter = getDOM().categoryFilter;
  filter.innerHTML = `
        <option value="all">All Categories</option>
        ${cats
          .map(
            (cat) => `
            <option value="${cat}" ${state.selectedCategory === cat ? "selected" : ""}>${cat}</option>
        `,
          )
          .join("")}
    `;
}

export function filterByMonth(month) {
  state.selectedMonth = month;
  state.currentPage = 1;
  updateTransactionsList();
  updateMonthFilters();
}

export function filterByCategory() {
  state.selectedCategory = document.getElementById("categoryFilter").value;
  state.currentPage = 1;
  updateTransactionsList();
}

// ---- Pagination ----

export function nextPage() {
  state.currentPage++;
  updateTransactionsList();
  scrollToTop();
}

export function prevPage() {
  state.currentPage--;
  updateTransactionsList();
  scrollToTop();
}

export function goToPage(page) {
  state.currentPage = page;
  updateTransactionsList();
  scrollToTop();
}

function scrollToTop() {
  const listTab = document.getElementById("listTab");
  if (listTab && listTab.classList.contains("active")) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ---- Grouped View ----

export function updateGroupedView() {
  const content = getDOM().groupedContent;

  // Always refresh charts (they render their own empty states)
  _renderGroupCharts();

  if (state.transactions.length === 0) {
    content.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="ri-bar-chart-box-line"></i></div>
                    <div>No data to group yet</div>
                </div>
            </div>
        `;
    return;
  }

  let html = renderMonthlyInsights();
  html += '<div class="insights-separator"></div>';

  if (state.currentGrouping === "month") {
    html += groupByMonth();
  } else {
    html += groupByCategory();
  }

  content.innerHTML = html;

  // Attach change listener for insights month selector (element recreated each render)
  const monthSelector = document.getElementById("insightsMonthSelector");
  if (monthSelector) {
    monthSelector.addEventListener("change", function (e) {
      state.insightsMonth = e.target.value;
      updateGroupedView();
    });
  }
}

const RANGE_LABELS = {
  "3m": "Last 3 Months",
  "6m": "Last 6 Months",
  "1y": "Last 12 Months",
  all: "All Time",
};

function _renderGroupCharts() {
  const range = state.reportRange;
  const txns = state.transactions;
  const rangeLabel = RANGE_LABELS[range] || "";

  // Sync active range pill
  document.querySelectorAll(".range-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.range === range);
  });

  // Pie chart — filtered by the selected range
  const pieContainer = document.getElementById("categoryChart");
  if (pieContainer) {
    const months = getRangeMonths(range); // null = all, array = specific months
    renderCategoryPieChart(
      buildCategoryData(txns, months === null ? "all" : months),
      pieContainer,
    );
  }

  // Income vs Expenses bar chart
  const barContainer = document.getElementById("incomeExpenseChart");
  if (barContainer) {
    renderIncomeExpenseChart(buildIncomeExpenseData(txns, range), barContainer);
  }

  // Weekly spending
  const weeklyContainer = document.getElementById("weeklyChart");
  if (weeklyContainer) {
    renderWeeklyChart(buildWeeklyData(txns), weeklyContainer);
  }

  // Day-of-month heatmap — update title to show active period
  const heatmapTitle = document.getElementById("heatmapTitle");
  if (heatmapTitle) {
    heatmapTitle.textContent = `Spending by Day of Month — ${rangeLabel}`;
  }
  const heatmapContainer = document.getElementById("dayHeatmap");
  if (heatmapContainer) {
    renderDayHeatmap(buildDayHeatmapData(txns, range), heatmapContainer);
  }
}

function groupByMonth() {
  const grouped = {};

  state.transactions.forEach((t) => {
    const month = t.date.slice(0, 7);
    if (!grouped[month]) {
      grouped[month] = { income: 0, expense: 0, count: 0 };
    }
    grouped[month].count++;
    if (t.type === "income") {
      grouped[month].income += t.amount;
    } else {
      grouped[month].expense += t.amount;
    }
  });

  const months = Object.keys(grouped).sort().reverse();

  return months
    .map((month) => {
      const data = grouped[month];
      const net = data.income - data.expense;
      const netClass = net >= 0 ? "positive" : "negative";

      return `
            <div class="card">
                <div class="group-header">
                    ${formatMonth(month)}
                    <span class="group-total">${data.count} entries</span>
                </div>
                <div class="group-content">
                    <div class="group-row">
                        <span class="group-label">Income</span>
                        <span class="positive">${formatCurrency(data.income)}</span>
                    </div>
                    <div class="group-row">
                        <span class="group-label">Expenses</span>
                        <span class="negative">${formatCurrency(data.expense)}</span>
                    </div>
                    <div class="group-row with-border">
                        <span class="group-label strong">Net</span>
                        <span class="${netClass} group-value">${formatCurrency(net)}</span>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

function groupByCategory() {
  const grouped = {};

  state.transactions.forEach((t) => {
    if (!grouped[t.category]) {
      grouped[t.category] = { total: 0, count: 0, type: t.type };
    }
    grouped[t.category].total += t.amount;
    grouped[t.category].count++;
  });

  const cats = Object.keys(grouped).sort(
    (a, b) => grouped[b].total - grouped[a].total,
  );

  return cats
    .map((category) => {
      const data = grouped[category];
      const colorClass = data.type === "income" ? "positive" : "negative";

      return `
            <div class="card">
                <div class="group-header">
                    ${category}
                    <span class="group-total">${data.count} entries</span>
                </div>
                <div class="group-content">
                    <div class="group-row">
                        <span class="group-label">Total</span>
                        <span class="${colorClass} group-value large">
                            ${formatCurrency(data.total)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

// ---- Tabs ----

export function switchTab(tab) {
  state.currentTab = tab;

  // Update old tab buttons
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });

  // Update bottom navigation items
  document.querySelectorAll(".nav-item").forEach((nav) => {
    nav.classList.remove("active");
    nav.setAttribute("aria-selected", "false");
  });

  // Set active state on bottom nav
  const activeNav = document.getElementById(tab + "-nav");
  if (activeNav) {
    activeNav.classList.add("active");
    activeNav.setAttribute("aria-selected", "true");
  }

  // Update tab content
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById(tab + "Tab").classList.add("active");

  // Hide summary on settings tab, show on all others
  const summarySection = document.querySelector(".summary-section");
  if (summarySection)
    summarySection.style.display = tab === "settings" ? "none" : "";

  // Refresh the newly visible tab's content (P1: lazy-render)
  switch (tab) {
    case "list":
      updateTransactionsList();
      updateMonthFilters();
      updateCategoryFilter();
      break;
    case "groups":
      updateGroupedView();
      break;
    case "settings":
      updateSettingsContent();
      break;
  }
}

export function quickAddTransaction() {
  const addNavBtn = document.getElementById("add-nav");
  if (addNavBtn) {
    addNavBtn.click();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => {
    document.getElementById("amount").focus();
  }, 300);
}

// ---- Summary Collapse ----

export function toggleSummaryCollapse() {
  const section = document.querySelector(".summary-section");
  const isCollapsed = section.classList.toggle("collapsed");
  localStorage.setItem("summaryCollapsed", isCollapsed ? "true" : "false");
}

export function loadSummaryState() {
  const isCollapsed = localStorage.getItem("summaryCollapsed") === "true";
  if (isCollapsed) {
    document.querySelector(".summary-section").classList.add("collapsed");
  }
}

// ---- Summary Tile Click ----

export function onSummaryTileClick(tileType) {
  if ("vibrate" in navigator) {
    navigator.vibrate(50);
  }

  const currentMonth = new Date().toISOString().slice(0, 7);

  switchTab("list");

  switch (tileType) {
    case "this-month":
      state.selectedMonth = currentMonth;
      state.selectedCategory = "all";
      state.selectedType = "all";
      break;
    case "total-entries":
      state.selectedMonth = currentMonth;
      state.selectedCategory = "all";
      state.selectedType = "all";
      break;
    case "income":
      state.selectedMonth = currentMonth;
      state.selectedCategory = "all";
      state.selectedType = "income";
      break;
    case "expenses":
      state.selectedMonth = currentMonth;
      state.selectedCategory = "all";
      state.selectedType = "expense";
      break;
  }

  state.currentPage = 1;
  updateUI();
}

// ---- Grouping Toggle ----

export function changeGrouping(type, event) {
  state.currentGrouping = type;

  document.querySelectorAll("#groupsTab .filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  if (event && event.target) {
    event.target.classList.add("active");
  }

  updateGroupedView();
}

// ---- Edit / Delete Transactions ----

export function editTransaction(id) {
  const transaction = state.transactions.find((t) => t.id === id);
  if (!transaction) return;

  state.editingId = id;

  selectType(transaction.type);

  const categorySelect = document.getElementById("category");
  categorySelect.dataset.editValue = transaction.category;

  document.getElementById("amount").value = transaction.amount;
  document.getElementById("date").value = transaction.date;
  document.getElementById("notes").value = transaction.notes;

  updateCategoryOptions(transaction.type);
  document.getElementById("category").value = transaction.category;

  document.getElementById("formTitle").textContent = "Edit Transaction";
  document.getElementById("submitBtn").textContent = "Update Transaction";
  document.getElementById("cancelEditBtn").style.display = "block";

  switchTab("add");
  window.scrollTo(0, 0);
}

export function cancelEdit() {
  state.editingId = null;
  document.getElementById("transactionForm").reset();
  document.getElementById("date").valueAsDate = new Date();

  selectType("expense");

  document.getElementById("formTitle").textContent = "Add Transaction";
  document.getElementById("submitBtn").textContent = "Save Transaction";
  document.getElementById("cancelEditBtn").style.display = "none";
}

export function deleteTransaction(id) {
  state.deleteId = id;
  document.getElementById("deleteModal").classList.add("show");
}

export async function confirmDelete() {
  if (state.deleteId) {
    try {
      await deleteTransactionFromDB(state.deleteId);
      state.transactions = state.transactions.filter(
        (t) => t.id !== state.deleteId,
      );
      updateUI();
      showMessage("Transaction deleted!");
    } catch (err) {
      console.error("Delete failed:", err);
      showMessage("Failed to delete transaction");
    }
    state.deleteId = null;
  }
  closeDeleteModal();
}

export function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("show");
  state.deleteId = null;
}

// ---- Type Toggle & Category Options ----

export function selectType(type) {
  document.getElementById("type").value = type;

  document.querySelectorAll(".type-option").forEach((btn) => {
    const isActive = btn.dataset.type === type;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive);
  });

  updateCategoryOptions(type);
}

export function updateCategoryOptions(type) {
  const categorySelect = document.getElementById("category");
  const cats = categories[type] || [];

  categorySelect.innerHTML = cats
    .map((cat) => `<option value="${cat}">${cat}</option>`)
    .join("");

  if (state.editingId) {
    const currentCategory = categorySelect.dataset.editValue;
    if (currentCategory && cats.includes(currentCategory)) {
      categorySelect.value = currentCategory;
    }
  }
}

// ---- Trend / Helpers ----

export function getPreviousMonth(currentMonth) {
  const [year, month] = currentMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

export function getMonthTotals(month) {
  const filtered = state.transactions.filter((t) => t.date.startsWith(month));
  const income = filtered
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = filtered
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return { income, expense, net: income - expense, count: filtered.length };
}

export function calculateMoMDelta(currentMonth, previousMonth) {
  if (previousMonth === undefined || previousMonth === null) {
    return null;
  }
  if (previousMonth === 0) {
    if (currentMonth === 0) {
      return { abs: 0, pct: 0, direction: "neutral" };
    }
    return {
      abs: currentMonth,
      pct: null,
      direction: currentMonth > 0 ? "up" : "down",
    };
  }

  const delta_abs = currentMonth - previousMonth;
  const delta_pct = (delta_abs / Math.abs(previousMonth)) * 100;

  return {
    abs: delta_abs,
    pct: delta_pct,
    direction: delta_abs > 0 ? "up" : delta_abs < 0 ? "down" : "neutral",
  };
}

export function calculateExpensePercentage(expenses, income) {
  if (income === 0 || income === undefined) {
    return null;
  }
  return (expenses / income) * 100;
}

// ---- Insights ----

export function getMonthInsights(month) {
  const targetMonth =
    month === "all" ? new Date().toISOString().slice(0, 7) : month;
  const current = getMonthTotals(targetMonth);
  const prevMonth = getPreviousMonth(targetMonth);
  const previous = getMonthTotals(prevMonth);

  const incomeDelta = calculateMoMDelta(current.income, previous.income);
  const expenseDelta = calculateMoMDelta(current.expense, previous.expense);
  const netDelta = calculateMoMDelta(current.net, previous.net);

  return {
    month: targetMonth,
    monthName: formatMonth(targetMonth),
    income: current.income,
    expense: current.expense,
    savings: current.net,
    transactionCount: current.count,
    trends: { income: incomeDelta, expense: expenseDelta, savings: netDelta },
  };
}

export function getTopSpendingCategories(month, limit = 5) {
  const targetMonth =
    month === "all" ? new Date().toISOString().slice(0, 7) : month;
  const expenseTxs = state.transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(targetMonth),
  );
  if (expenseTxs.length === 0) return [];

  const categoryTotals = {};
  expenseTxs.forEach((t) => {
    if (!categoryTotals[t.category]) {
      categoryTotals[t.category] = { total: 0, count: 0 };
    }
    categoryTotals[t.category].total += t.amount;
    categoryTotals[t.category].count++;
  });

  const totalExpenses = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  return Object.keys(categoryTotals)
    .map((category) => ({
      category,
      total: categoryTotals[category].total,
      count: categoryTotals[category].count,
      percentage: (categoryTotals[category].total / totalExpenses) * 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function getAvailableMonths() {
  if (state.transactions.length === 0) return [];
  const months = new Set();
  state.transactions.forEach((t) => months.add(t.date.slice(0, 7)));
  return Array.from(months).sort().reverse();
}

export function calculateBudgetHealth(month) {
  const [year, monthNum] = month.split("-").map(Number);
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === monthNum;

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const currentDay = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysRemaining = daysInMonth - currentDay;

  const expenseTxs = state.transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(month),
  );

  if (expenseTxs.length === 0 || currentDay === 0) return null;

  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const dailyPace = totalExpense / currentDay;
  const projectedMonthEnd = dailyPace * daysInMonth;
  const variance = projectedMonthEnd - totalExpense;
  const variancePercent = (variance / totalExpense) * 100;

  let status, statusIcon;
  if (variancePercent < 20) {
    status = "On Track";
    statusIcon = "check-line";
  } else if (variancePercent < 50) {
    status = "Caution";
    statusIcon = "alert-line";
  } else {
    status = "Over Pace";
    statusIcon = "close-circle-line";
  }

  return {
    dailyPace,
    daysRemaining,
    projectedMonthEnd,
    status,
    statusIcon,
    variancePercent,
  };
}

export function renderMonthlyInsights() {
  const targetMonth =
    state.insightsMonth === "current"
      ? new Date().toISOString().slice(0, 7)
      : state.insightsMonth;
  const insights = getMonthInsights(targetMonth);
  const topCategories = getTopSpendingCategories(targetMonth);
  const budgetHealth = calculateBudgetHealth(targetMonth);

  const availableMonths = getAvailableMonths();
  const currentMonth = new Date().toISOString().slice(0, 7);

  let monthOptions = `<option value="current" ${state.insightsMonth === "current" ? "selected" : ""}>Current Month (${formatMonth(currentMonth)})</option>`;
  availableMonths.forEach((month) => {
    monthOptions += `<option value="${month}" ${state.insightsMonth === month ? "selected" : ""}>${formatMonth(month)}</option>`;
  });

  const renderTrend = (delta) => {
    if (!delta || delta.pct === null) return "";
    const arrow =
      delta.direction === "up"
        ? "up"
        : delta.direction === "down"
          ? "down"
          : "right";
    const sign = delta.abs >= 0 ? "+" : "";
    const colorClass =
      delta.direction === "up"
        ? "positive"
        : delta.direction === "down"
          ? "negative"
          : "neutral";
    return `<span class="insight-trend ${colorClass}">
            <i class="ri-arrow-${arrow}-line"></i> ${sign}${Math.abs(delta.pct).toFixed(1)}%
        </span>`;
  };

  const summaryHTML = `
        <div class="insights-section">
            <div class="insights-header">
                <h3 id="insightsOverviewLabel">Monthly Overview</h3>
                <label for="insightsMonthSelector" class="sr-only">Select month for insights</label>
                <select id="insightsMonthSelector" class="insights-month-selector" aria-labelledby="insightsOverviewLabel" aria-label="Select month to view financial insights">
                    ${monthOptions}
                </select>
            </div>

            <div class="insights-cards">
                <div class="insight-card income-card">
                    <div class="insight-icon"><i class="ri-arrow-up-circle-line"></i></div>
                    <div class="insight-content">
                        <div class="insight-label">Income</div>
                        <div class="insight-value">${formatCurrency(insights.income)}</div>
                        ${renderTrend(insights.trends.income)}
                    </div>
                </div>

                <div class="insight-card expense-card">
                    <div class="insight-icon"><i class="ri-arrow-down-circle-line"></i></div>
                    <div class="insight-content">
                        <div class="insight-label">Expenses</div>
                        <div class="insight-value">${formatCurrency(insights.expense)}</div>
                        ${renderTrend(insights.trends.expense)}
                    </div>
                </div>

                <div class="insight-card savings-card">
                    <div class="insight-icon"><i class="ri-wallet-3-line"></i></div>
                    <div class="insight-content">
                        <div class="insight-label">Savings (Net)</div>
                        <div class="insight-value ${insights.savings >= 0 ? "positive" : "negative"}">
                            ${formatCurrency(insights.savings)}
                        </div>
                        ${renderTrend(insights.trends.savings)}
                    </div>
                </div>

                <div class="insight-card count-card">
                    <div class="insight-icon"><i class="ri-file-list-line"></i></div>
                    <div class="insight-content">
                        <div class="insight-label">Transactions</div>
                        <div class="insight-value">${insights.transactionCount}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Budget Health Card
  let budgetHealthHTML = "";
  if (budgetHealth && insights.expense > 0) {
    const statusClass =
      budgetHealth.status === "On Track"
        ? "on-track"
        : budgetHealth.status === "Caution"
          ? "caution"
          : "over-pace";

    budgetHealthHTML = `
            <div class="budget-health-section">
                <div class="budget-health-header">
                    <div class="budget-health-title">
                        <i class="ri-pulse-line"></i>
                        <h3>Budget Health</h3>
                    </div>
                    <div class="budget-health-status ${statusClass}">
                        <i class="ri-${budgetHealth.statusIcon}"></i>
                        ${budgetHealth.status}
                    </div>
                </div>
                <div class="budget-health-metrics">
                    <div class="budget-metric">
                        <div class="metric-label">Daily Pace</div>
                        <div class="metric-value">${formatCurrency(budgetHealth.dailyPace)}</div>
                    </div>
                    <div class="budget-metric">
                        <div class="metric-label">Days Left</div>
                        <div class="metric-value">${budgetHealth.daysRemaining}d</div>
                    </div>
                    <div class="budget-metric">
                        <div class="metric-label">Projected</div>
                        <div class="metric-value">${formatCurrency(budgetHealth.projectedMonthEnd)}</div>
                    </div>
                </div>
            </div>
        `;
  }

  // Top Spending Categories
  let categoriesHTML = "";
  if (topCategories.length > 0) {
    const categoryRows = topCategories
      .map(
        (cat) => `
            <div class="category-row">
                <div class="category-info">
                    <span class="category-name">${cat.category}</span>
                    <span class="category-count">${cat.count} transactions</span>
                </div>
                <div class="category-amount">
                    <span class="category-value">${formatCurrency(cat.total)}</span>
                    <span class="category-percent">${cat.percentage.toFixed(1)}%</span>
                </div>
            </div>
        `,
      )
      .join("");

    categoriesHTML = `
            <div class="top-categories-section">
                <div class="section-header">
                    <h3>Top Spending Categories</h3>
                </div>
                <div class="category-list">
                    ${categoryRows}
                </div>
            </div>
        `;
  }

  return summaryHTML + budgetHealthHTML + categoriesHTML;
}

// ---- Feedback Modal ----

export function openFeedbackModal() {
  document.getElementById("feedbackModal").classList.add("show");
}

export function closeFeedbackModal() {
  document.getElementById("feedbackModal").classList.remove("show");
}
