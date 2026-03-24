// ============================================================================
// Recurring Transactions (v3.11.0)
// ============================================================================

import { state, categories } from "./state.js";
import { sanitizeHTML, formatDate, showMessage } from "./utils.js";
import { formatCurrency } from "./currency.js";
import {
  loadRecurringTemplatesFromDB,
  saveRecurringTemplateToDB,
  deleteRecurringTemplateFromDB,
  saveTransactionToDB,
} from "./db.js";
import { validateTransaction } from "./validation.js";

// ---- Load ----

export async function loadRecurringIntoState() {
  state.recurringTemplates = await loadRecurringTemplatesFromDB();
}

// ---- Date Computation ----

export function computeNextDueDate(frequency, dayOfMonth, fromDateStr) {
  const [year, month, day] = fromDateStr.split("-").map(Number);
  const from = new Date(year, month - 1, day);
  const next = new Date(from);

  switch (frequency) {
    case "daily":
      next.setDate(from.getDate() + 1);
      break;
    case "weekly":
      next.setDate(from.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(from.getDate() + 14);
      break;
    case "monthly": {
      next.setMonth(from.getMonth() + 1);
      if (dayOfMonth) {
        const maxDay = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0,
        ).getDate();
        next.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    }
    case "quarterly":
      next.setMonth(from.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(from.getFullYear() + 1);
      break;
    default:
      next.setMonth(from.getMonth() + 1);
  }

  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, "0");
  const nd = String(next.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

// ---- Check & Generate Due Transactions ----

// Returns the number of transactions generated.
// Caller (app.js) is responsible for calling updateUI() if count > 0.
export async function checkRecurringTransactions() {
  if (!state.recurringTemplates || !state.recurringTemplates.length) return 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const due = state.recurringTemplates.filter(
    (t) => t.enabled && t.nextDueDate <= todayStr,
  );
  if (!due.length) return 0;

  let idBase = Date.now();
  let generated = 0;

  for (let i = 0; i < due.length; i++) {
    const template = due[i];

    const transaction = {
      id: idBase + i,
      type: template.type,
      amount: template.amount,
      category: template.category,
      date: template.nextDueDate,
      notes: template.notes || "",
      createdAt: new Date().toISOString(),
      recurringId: template.id,
    };

    const validation = validateTransaction(transaction);
    if (!validation.valid) {
      console.warn(
        "[Recurring] Skipped invalid template:",
        template.id,
        validation.errors,
      );
      continue;
    }

    const sanitized = validation.sanitized;
    sanitized.dateTs = new Date(sanitized.date).getTime();

    await saveTransactionToDB(sanitized);
    state.transactions.push(sanitized);

    template.nextDueDate = computeNextDueDate(
      template.frequency,
      template.dayOfMonth,
      template.nextDueDate,
    );
    template.lastExecuted = new Date().toISOString();
    await saveRecurringTemplateToDB(template);

    generated++;
  }

  if (generated > 0) {
    state.transactions.sort((a, b) => b.dateTs - a.dateTs);
    showMessage(
      `${generated} recurring transaction${generated > 1 ? "s" : ""} added`,
    );
  }

  return generated;
}

// ---- Rendering ----

const FREQ_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 Wks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function renderRecurringSection() {
  const container = document.getElementById("recurringContainer");
  if (!container) return;

  const templates = state.recurringTemplates || [];

  const listHTML =
    templates.length === 0
      ? `<div class="recurring-empty">
               <i class="ri-repeat-line"></i>
               <p>No recurring transactions yet</p>
               <p class="recurring-empty-sub">Add rent, salary, or subscriptions to auto-track them</p>
           </div>`
      : templates
          .map((t) => {
            const isIncome = t.type === "income";
            const iconDir = isIncome ? "up" : "down";
            const freqLabel = FREQ_LABELS[t.frequency] || t.frequency;
            const isPaused = !t.enabled;
            const nextLabel = isPaused ? "Paused" : formatDate(t.nextDueDate);

            return `
                <div class="recurring-item${isPaused ? " paused" : ""}">
                    <div class="transaction-icon ${t.type}">
                        <i class="ri-arrow-${iconDir}-circle-fill"></i>
                    </div>
                    <div class="recurring-item-info">
                        <div class="recurring-item-title">
                            ${sanitizeHTML(t.category)}
                            <span class="recurring-frequency-chip">${freqLabel}</span>
                        </div>
                        <div class="recurring-item-meta">${formatCurrency(t.amount)} · Next: ${nextLabel}</div>
                        ${t.notes ? `<div class="recurring-item-note">${sanitizeHTML(t.notes)}</div>` : ""}
                    </div>
                    <div class="recurring-item-actions">
                        <button class="action-btn recurring-toggle-btn"
                            data-action="toggle-recurring" data-id="${t.id}"
                            aria-label="${isPaused ? "Resume" : "Pause"} recurring transaction"
                            title="${isPaused ? "Resume" : "Pause"}">
                            <i class="${isPaused ? "ri-play-circle-line" : "ri-pause-circle-line"}"></i>
                        </button>
                        <button class="action-btn edit-btn"
                            data-action="edit-recurring" data-id="${t.id}"
                            aria-label="Edit recurring transaction">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="action-btn delete-btn"
                            data-action="delete-recurring" data-id="${t.id}"
                            aria-label="Delete recurring transaction">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>`;
          })
          .join("");

  container.innerHTML = `
        <div class="card recurring-section">
            <div class="recurring-header">
                <div class="recurring-header-left">
                    <h3 class="recurring-title"><i class="ri-repeat-line"></i> Recurring Transactions</h3>
                    <p class="recurring-subtitle">Auto-add predictable expenses and income</p>
                </div>
                <button class="toolbar-btn recurring-add-btn" id="addRecurringBtn" aria-label="Add recurring transaction">
                    <i class="ri-add-line"></i>
                    <span>Add</span>
                </button>
            </div>
            <div class="recurring-list">${listHTML}</div>
        </div>`;

  document
    .getElementById("addRecurringBtn")
    .addEventListener("click", () => openRecurringModal());

  container.querySelector(".recurring-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === "edit-recurring") openRecurringModal(id);
    if (btn.dataset.action === "delete-recurring") deleteRecurring(id);
    if (btn.dataset.action === "toggle-recurring") toggleRecurring(id);
  });
}

// ---- Modal ----

let _editingRecurringId = null;

function _updateRecurringCategoryOptions(type) {
  const select = document.getElementById("recurringCategory");
  if (!select) return;
  const opts = categories[type] || [];
  select.innerHTML =
    '<option value="" disabled selected>Select category</option>' +
    opts.map((c) => `<option value="${c}">${c}</option>`).join("");
}

export function selectRecurringType(type) {
  const typeInput = document.getElementById("recurringType");
  const expenseBtn = document.getElementById("recurringTypeExpense");
  const incomeBtn = document.getElementById("recurringTypeIncome");
  if (!typeInput) return;

  typeInput.value = type;
  if (type === "expense") {
    expenseBtn.classList.add("active");
    expenseBtn.setAttribute("aria-checked", "true");
    incomeBtn.classList.remove("active");
    incomeBtn.setAttribute("aria-checked", "false");
  } else {
    incomeBtn.classList.add("active");
    incomeBtn.setAttribute("aria-checked", "true");
    expenseBtn.classList.remove("active");
    expenseBtn.setAttribute("aria-checked", "false");
  }
  _updateRecurringCategoryOptions(type);
}

export function openRecurringModal(id = null) {
  _editingRecurringId = id;
  const modal = document.getElementById("recurringModal");
  if (!modal) return;

  const modalTitle = modal.querySelector(".modal-header h3");

  // Reset to defaults
  selectRecurringType("expense");
  document.getElementById("recurringAmount").value = "";
  document.getElementById("recurringNotes").value = "";
  document.getElementById("recurringFrequency").value = "monthly";
  document.getElementById("recurringDay").value = "";
  document.getElementById("recurringStartDate").valueAsDate = new Date();
  document.getElementById("recurringDayGroup").style.display = "block";

  if (id !== null) {
    const template = state.recurringTemplates.find((t) => t.id === id);
    if (template) {
      modalTitle.innerHTML = '<i class="ri-repeat-line"></i> Edit Recurring';
      selectRecurringType(template.type);
      document.getElementById("recurringAmount").value = template.amount;
      document.getElementById("recurringCategory").value = template.category;
      document.getElementById("recurringNotes").value = template.notes || "";
      document.getElementById("recurringFrequency").value = template.frequency;
      document.getElementById("recurringDay").value = template.dayOfMonth || "";
      document.getElementById("recurringStartDate").value =
        template.nextDueDate;
      document.getElementById("recurringDayGroup").style.display =
        template.frequency === "monthly" ? "block" : "none";
    }
  } else {
    modalTitle.innerHTML = '<i class="ri-repeat-line"></i> Add Recurring';
  }

  modal.style.display = "flex";
}

export function closeRecurringModal() {
  const modal = document.getElementById("recurringModal");
  if (modal) modal.style.display = "none";
  _editingRecurringId = null;
}

export async function saveRecurringTemplate() {
  const type = document.getElementById("recurringType").value;
  const amountRaw = document.getElementById("recurringAmount").value.trim();
  const category = document.getElementById("recurringCategory").value;
  const notes = document.getElementById("recurringNotes").value.trim();
  const frequency = document.getElementById("recurringFrequency").value;
  const dayRaw = document.getElementById("recurringDay").value.trim();
  const startDate = document.getElementById("recurringStartDate").value;

  const amount = parseFloat(amountRaw);
  if (!amountRaw || isNaN(amount) || amount <= 0) {
    showMessage("Please enter a valid amount");
    return;
  }
  if (amount > 999999999) {
    showMessage("Amount exceeds maximum limit");
    return;
  }
  if (!category) {
    showMessage("Please select a category");
    return;
  }
  if (!startDate) {
    showMessage("Please select a start date");
    return;
  }

  const dayOfMonth =
    frequency === "monthly" && dayRaw ? parseInt(dayRaw, 10) : null;
  if (
    dayOfMonth !== null &&
    (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28)
  ) {
    showMessage("Day of month must be between 1 and 28");
    return;
  }

  const sanitizedNotes = sanitizeHTML(notes);
  if (sanitizedNotes.length > 500) {
    showMessage("Notes too long (max 500 characters)");
    return;
  }

  const isEditing = _editingRecurringId !== null;

  if (isEditing) {
    const template = state.recurringTemplates.find(
      (t) => t.id === _editingRecurringId,
    );
    if (!template) return;
    template.type = type;
    template.amount = amount;
    template.category = category;
    template.notes = sanitizedNotes;
    template.frequency = frequency;
    template.dayOfMonth = dayOfMonth;
    template.nextDueDate = startDate;
    await saveRecurringTemplateToDB(template);
  } else {
    const template = {
      id: Date.now(),
      type,
      amount,
      category,
      notes: sanitizedNotes,
      frequency,
      dayOfMonth,
      startDate,
      nextDueDate: startDate,
      lastExecuted: null,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    state.recurringTemplates.push(template);
    await saveRecurringTemplateToDB(template);
  }

  closeRecurringModal();
  renderRecurringSection();
  showMessage(isEditing ? "Recurring updated" : "Recurring transaction added");
}

async function deleteRecurring(id) {
  const template = state.recurringTemplates.find((t) => t.id === id);
  if (!template) return;

  const label = template.notes || template.category;
  if (
    !confirm(
      `Delete "${label}"?\n\nAlready-created transactions will not be affected.`,
    )
  )
    return;

  await deleteRecurringTemplateFromDB(id);
  state.recurringTemplates = state.recurringTemplates.filter(
    (t) => t.id !== id,
  );
  renderRecurringSection();
  showMessage("Recurring transaction deleted");
}

async function toggleRecurring(id) {
  const template = state.recurringTemplates.find((t) => t.id === id);
  if (!template) return;
  template.enabled = !template.enabled;
  await saveRecurringTemplateToDB(template);
  renderRecurringSection();
  showMessage(template.enabled ? "Recurring resumed" : "Recurring paused");
}
