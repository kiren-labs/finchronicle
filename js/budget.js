// ============================================================================
// Budget Management (v3.13.0)
// ============================================================================

import { state, categories } from "./state.js";
import {
  saveBudgetToDB,
  loadBudgetsFromDB,
  deleteBudgetFromDB,
  getBudgetByCategory,
} from "./db.js";
import { showMessage } from "./utils.js";
import { formatCurrency } from "./currency.js";

// Initialize budgets on app startup
export async function initBudgets() {
  try {
    const budgets = await loadBudgetsFromDB();
    state.budgets = budgets || [];
  } catch (error) {
    console.error("Error loading budgets:", error);
    state.budgets = [];
    showMessage("Error loading budgets", "error");
  }
}

// Get budget for a specific category
export function getBudget(category) {
  return state.budgets.find((b) => b.category === category) || null;
}

// Save a budget
export async function saveBudget(budget) {
  try {
    // Validation
    if (!budget.category || budget.category.trim() === "") {
      throw new Error("Category is required");
    }
    if (budget.monthlyLimit <= 0) {
      throw new Error("Monthly limit must be greater than 0");
    }
    if (budget.alertThreshold < 0 || budget.alertThreshold > 100) {
      throw new Error("Alert threshold must be between 0 and 100");
    }

    // Block duplicate categories (only on new budgets, not edits)
    if (!budget.id) {
      const exists = state.budgets.find(
        (b) => b.category === budget.category
      );
      if (exists) {
        throw new Error(`A budget for "${budget.category}" already exists. Edit it instead.`);
      }
    }

    // Set timestamps
    if (!budget.id) {
      budget.id = Date.now();
      budget.createdAt = new Date().toISOString();
    }
    budget.updatedAt = new Date().toISOString();

    // Save to DB
    await saveBudgetToDB(budget);

    // Update state
    const idx = state.budgets.findIndex((b) => b.id === budget.id);
    if (idx >= 0) {
      state.budgets[idx] = budget;
    } else {
      state.budgets.push(budget);
    }

    showMessage(`Budget for "${budget.category}" saved`, "success");
    return budget;
  } catch (error) {
    console.error("Error saving budget:", error);
    showMessage(`Error: ${error.message}`, "error");
    throw error;
  }
}

// Delete a budget
export async function deleteBudget(budgetId) {
  try {
    await deleteBudgetFromDB(budgetId);
    state.budgets = state.budgets.filter((b) => b.id !== budgetId);
    showMessage("Budget deleted", "success");
  } catch (error) {
    console.error("Error deleting budget:", error);
    showMessage("Error deleting budget", "error");
    throw error;
  }
}

// Get spending for a category in a specific month
function getCategorySpending(category, date) {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  return state.transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return (
        t.type === "expense" &&
        t.category === category &&
        tDate.getFullYear() === year &&
        tDate.getMonth() === month
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

// Get available budget for a category in a specific month
export function getAvailableBudget(category, date = new Date()) {
  const budget = getBudget(category);
  if (!budget) {
    return null;
  }

  const spent = getCategorySpending(category, date);
  let available = budget.monthlyLimit;

  if (budget.rolloverEnabled) {
    // Add unused budget from previous month
    const prevDate = new Date(date);
    prevDate.setMonth(prevDate.getMonth() - 1);

    const prevMonthSpent = getCategorySpending(category, prevDate);
    const prevMonthUnused = Math.max(0, budget.monthlyLimit - prevMonthSpent);
    available = budget.monthlyLimit + prevMonthUnused;
  }

  return Math.max(0, available - spent);
}

// Check if budget alert should trigger
export function checkBudgetAlert(category, monthlySpent) {
  const budget = getBudget(category);
  if (!budget) {
    return { isWarning: false, isExceeded: false };
  }

  const threshold = (budget.alertThreshold / 100) * budget.monthlyLimit;

  return {
    isWarning: monthlySpent >= threshold && monthlySpent < budget.monthlyLimit,
    isExceeded: monthlySpent >= budget.monthlyLimit,
  };
}

// Get all active budget alerts for current month
export function getActiveBudgetAlerts() {
  const today = new Date();
  const alerts = [];

  state.budgets.forEach((budget) => {
    const spent = getCategorySpending(budget.category, today);
    const { isWarning, isExceeded } = checkBudgetAlert(
      budget.category,
      spent
    );

    if (isWarning || isExceeded) {
      alerts.push({
        category: budget.category,
        spent,
        limit: budget.monthlyLimit,
        isWarning,
        isExceeded,
      });
    }
  });

  return alerts;
}

// Render budget list in Settings tab — collapsible with compact rows
export function renderBudgetList() {
  const container = document.getElementById("budgetContainer");
  if (!container) return;

  // Preserve expanded state across re-renders
  const prevBody = container.querySelector(".budget-collapse-body");
  const isExpanded = prevBody ? !prevBody.hidden : false;

  if (state.budgets.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="budget-collapse-header">
          <div class="budget-collapse-info">
            <span class="budget-collapse-title">Monthly Budgets</span>
            <span class="budget-collapse-summary">No budgets set</span>
          </div>
          <button class="toolbar-btn" id="addBudgetBtn" aria-label="Add Budget">
            <i class="ri-add-line"></i>
            <span>Add</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  const today = new Date();
  const budgetsWithStatus = state.budgets.map((budget) => {
    const spent = getCategorySpending(budget.category, today);
    const { isWarning, isExceeded } = checkBudgetAlert(budget.category, spent);
    const pct = budget.monthlyLimit > 0
      ? Math.min(100, Math.round((spent / budget.monthlyLimit) * 100))
      : 0;
    return { budget, spent, isWarning, isExceeded, pct };
  });

  // Build summary line showing worst alert
  const exceeded = budgetsWithStatus.filter((b) => b.isExceeded);
  const warning  = budgetsWithStatus.filter((b) => b.isWarning);
  const count = state.budgets.length;
  let summaryText  = `${count} budget${count !== 1 ? "s" : ""} active`;
  let summaryClass = "";
  if (exceeded.length > 0) {
    summaryText  += ` · ⚠ ${exceeded[0].budget.category} exceeded`;
    summaryClass  = "budget-summary-danger";
  } else if (warning.length > 0) {
    summaryText  += ` · ⚠ ${warning[0].budget.category} at ${warning[0].pct}%`;
    summaryClass  = "budget-summary-warn";
  } else {
    summaryText += " · All on track";
  }

  const rowsHTML = budgetsWithStatus
    .map(({ budget, spent, isWarning, isExceeded, pct }) => {
      const dotClass  = isExceeded ? "budget-dot-danger" : isWarning ? "budget-dot-warn" : "budget-dot-ok";
      const fillClass = isExceeded ? "budget-fill-danger" : isWarning ? "budget-fill-warn" : "";
      const pctStyle  = isExceeded
        ? "color:var(--color-danger)"
        : isWarning
        ? "color:var(--color-warning-border)"
        : "color:var(--color-text-muted)";
      return `
        <div class="budget-compact-row">
          <span class="budget-dot ${dotClass}"></span>
          <span class="budget-row-name">${budget.category}</span>
          <div class="budget-mini-bar-wrap">
            <div class="budget-mini-bar">
              <div class="budget-mini-fill ${fillClass}" style="width:${pct}%"></div>
            </div>
          </div>
          <span class="budget-row-pct" style="${pctStyle}">${pct}%</span>
          <button class="icon-btn" data-edit-budget="${budget.id}" aria-label="Edit ${budget.category} budget">
            <i class="ri-edit-line"></i>
          </button>
          <button class="icon-btn" data-delete-budget="${budget.id}" aria-label="Delete ${budget.category} budget">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="card">
      <div class="budget-collapse-header" data-toggle-budget-collapse aria-expanded="${isExpanded}">
        <div class="budget-collapse-info">
          <span class="budget-collapse-title">Monthly Budgets</span>
          <span class="budget-collapse-summary ${summaryClass}">${summaryText}</span>
        </div>
        <div class="budget-collapse-actions">
          <button class="toolbar-btn" id="addBudgetBtn" aria-label="Add Budget">
            <i class="ri-add-line"></i>
            <span>Add</span>
          </button>
          <span class="budget-chevron${isExpanded ? " expanded" : ""}">
            <i class="ri-arrow-down-s-line"></i>
          </span>
        </div>
      </div>
      <div class="budget-collapse-body" ${isExpanded ? "" : "hidden"}>
        ${rowsHTML}
      </div>
    </div>
  `;
}

// Render budget modal
export function renderBudgetModal(budget = null) {
  const isEdit = !!budget;
  const title = isEdit ? "Edit Budget" : "Add Budget";

  const categoryOptions = [...categories.expense]
    .sort()
    .map(
      (cat) =>
        `<option value="${cat}" ${budget?.category === cat ? "selected" : ""}>${cat}</option>`
    )
    .join("");

  const html = `
    <div class="modal" id="budgetModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="close-btn" aria-label="Close">
            <i class="ri-close-line"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="budgetCategory">Category *</label>
            <select id="budgetCategory" required>
              <option value="">Select a category</option>
              ${categoryOptions}
            </select>
          </div>

          <div class="form-group">
            <label for="budgetLimit">Monthly Limit *</label>
            <input type="number" id="budgetLimit" min="0.01" step="0.01" required
              value="${budget?.monthlyLimit || ""}" placeholder="0.00">
          </div>

          <div class="form-group">
            <label for="budgetThreshold">Alert Threshold (%)</label>
            <input type="number" id="budgetThreshold" min="0" max="100" step="1"
              value="${budget?.alertThreshold || 80}">
            <small>Alert triggers when spending reaches this percentage of the limit</small>
          </div>

          <div class="form-group checkbox">
            <input type="checkbox" id="budgetRollover"
              ${budget?.rolloverEnabled ? "checked" : ""}>
            <label for="budgetRollover">Enable Budget Rollover (unused balance carries to next month)</label>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel">Cancel</button>
          <button class="modal-btn modal-btn-confirm">${isEdit ? "Update" : "Add"} Budget</button>
        </div>
      </div>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  const modalEl = container.querySelector("#budgetModal");
  modalEl.classList.add("show");

  return {
    element: modalEl,
    getFormData() {
      return {
        id: budget?.id,
        category: document.getElementById("budgetCategory").value,
        monthlyLimit: parseFloat(document.getElementById("budgetLimit").value),
        alertThreshold: parseInt(document.getElementById("budgetThreshold").value),
        rolloverEnabled: document.getElementById("budgetRollover").checked,
      };
    },
    close() {
      container.remove();
    },
  };
}

// Render budget alert banner — always one compact line regardless of alert count
export function renderBudgetAlerts() {
  const alerts = getActiveBudgetAlerts();
  const container = document.getElementById("budgetAlerts");

  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = "";
    return;
  }

  const exceeded = alerts.filter((a) => a.isExceeded);
  const warning  = alerts.filter((a) => a.isWarning);
  const hasExceeded = exceeded.length > 0;

  // Build a compact summary: show first 2 names, then "+N more" if needed
  const named = alerts.slice(0, 2).map((a) => {
    const pct = Math.min(100, Math.round((a.spent / a.limit) * 100));
    return a.isExceeded ? `${a.category} exceeded` : `${a.category} at ${pct}%`;
  });
  if (alerts.length > 2) named.push(`+${alerts.length - 2} more`);

  const summaryText = named.join(" · ");
  const className   = hasExceeded ? "alert-danger" : "alert-warning";
  const icon        = hasExceeded ? "ri-alert-fill" : "ri-error-warning-line";

  container.innerHTML = `
    <div class="budget-alert ${className}">
      <i class="${icon}"></i>
      <span class="budget-alert-text">${summaryText}</span>
    </div>
  `;
}
