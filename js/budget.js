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

// Render budget list in Settings tab
export function renderBudgetList() {
  const container = document.getElementById("budgetContainer");
  if (!container) return;

  if (state.budgets.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p style="text-align: center; color: var(--text-secondary);">
          No budgets set yet. Add one to start tracking spending limits.
        </p>
      </div>
    `;
    return;
  }

  const today = new Date();
  const budgetHTML = state.budgets
    .map((budget) => {
      const spent = getCategorySpending(budget.category, today);
      const { isWarning, isExceeded } = checkBudgetAlert(
        budget.category,
        spent
      );
      const percentage = Math.min(100, (spent / budget.monthlyLimit) * 100);

      let statusClass = "";
      let statusText = "On track";
      if (isExceeded) {
        statusClass = "budget-exceeded";
        statusText = "Exceeded";
      } else if (isWarning) {
        statusClass = "budget-warning";
        statusText = "Warning";
      }

      return `
        <div class="card budget-card">
          <div class="budget-header">
            <div class="budget-title">
              <h3>${budget.category}</h3>
              <span class="budget-status ${statusClass}">${statusText}</span>
            </div>
            <div class="budget-actions">
              <button class="icon-btn" data-edit-budget="${budget.id}" aria-label="Edit budget">
                <i class="ri-edit-line"></i>
              </button>
              <button class="icon-btn" data-delete-budget="${budget.id}" aria-label="Delete budget">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>

          <div class="budget-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="progress-text">
              <span>${formatCurrency(spent)} / ${formatCurrency(budget.monthlyLimit)}</span>
              <span>${Math.round(percentage)}%</span>
            </div>
          </div>

          <div class="budget-details">
            <div class="detail-item">
              <span class="detail-label">Alert at</span>
              <span class="detail-value">${budget.alertThreshold}%</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Rollover</span>
              <span class="detail-value">${budget.rolloverEnabled ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="card">
      <h3>Monthly Budgets</h3>
      <div class="budget-list">
        ${budgetHTML}
      </div>
    </div>
  `;
}

// Render budget modal
export function renderBudgetModal(budget = null) {
  const isEdit = !!budget;
  const title = isEdit ? "Edit Budget" : "Add Budget";

  const categoryOptions = [
    ...categories.expense,
    ...categories.income,
  ]
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

  return {
    element: container.querySelector("#budgetModal"),
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

// Render budget alert banner
export function renderBudgetAlerts() {
  const alerts = getActiveBudgetAlerts();
  const container = document.getElementById("budgetAlerts");

  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = "";
    return;
  }

  const alertsHTML = alerts
    .map((alert) => {
      const percentage = Math.min(
        100,
        (alert.spent / alert.limit) * 100
      );
      const icon = alert.isExceeded
        ? "ri-alert-fill"
        : "ri-alert-line";
      const className = alert.isExceeded
        ? "alert-danger"
        : "alert-warning";

      return `
        <div class="budget-alert ${className}">
          <i class="${icon}"></i>
          <div class="alert-content">
            <strong>${alert.category}</strong>: ${formatCurrency(alert.spent)} of ${formatCurrency(alert.limit)} (${Math.round(percentage)}%)
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = alertsHTML;
}
