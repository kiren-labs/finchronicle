// ============================================================================
// Quick Entry Templates (v3.17.0)
// ============================================================================

import { state, MAX_QUICK_TEMPLATES } from "./state.js";
import {
  loadQuickTemplates,
  saveQuickTemplate,
  deleteQuickTemplate,
} from "./db.js";
import { formatCurrency } from "./currency.js";
import { sanitizeHTML, showMessage, generateId } from "./utils.js";
import { updateCategoryOptions, selectType, renderFormTagChips } from "./ui.js";

// ============================================================================
// Initialisation
// ============================================================================

export async function initQuickEntry() {
  state.quickTemplates = await loadQuickTemplates();
  renderQuickBar();
}

// ============================================================================
// Quick Bar (above the transaction form)
// ============================================================================

export function renderQuickBar() {
  const bar = document.getElementById("quickEntryBar");
  if (!bar) return;

  const templates = state.quickTemplates;

  if (templates.length === 0 && state.transactions.length === 0) {
    bar.hidden = true;
    return;
  }

  bar.hidden = false;

  const pills = templates
    .map(
      (t) =>
        `<button type="button" class="quick-pill" data-template-id="${t.id}" title="${sanitizeHTML(t.label)} — ${sanitizeHTML(t.category)}">
        <span class="quick-pill-icon">${t.type === "income" ? "↑" : "↓"}</span>
        <span class="quick-pill-label">${sanitizeHTML(t.label)}</span>
        <span class="quick-pill-amount">${formatCurrency(t.amount)}</span>
      </button>`,
    )
    .join("");

  const cloneBtn =
    state.transactions.length > 0
      ? `<button type="button" class="quick-pill quick-pill-clone" id="cloneLastBtn" title="Clone most recent transaction with today's date">
        <i class="ri-file-copy-line"></i> Clone Last
      </button>`
      : "";

  bar.innerHTML = `
    <div class="quick-bar-scroll">
      ${pills}
      ${cloneBtn}
    </div>`;
}

// ============================================================================
// Pre-fill Form from Template
// ============================================================================

export function prefillFromTemplate(templateId) {
  const template = state.quickTemplates.find((t) => t.id === templateId);
  if (!template) return;

  // Set type
  const typeInput = document.getElementById("type");
  if (typeInput) typeInput.value = template.type;

  // Trigger type toggle UI update
  document.querySelectorAll(".type-option").forEach((btn) => {
    const isActive = btn.dataset.type === template.type;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });

  // Update category options for the type, then set value
  const event = new CustomEvent("quick-entry-type", { detail: template.type });
  document.dispatchEvent(event);

  // Set amount
  const amountInput = document.getElementById("amount");
  if (amountInput) amountInput.value = template.amount;

  // Set category (after options are updated)
  setTimeout(() => {
    const categorySelect = document.getElementById("category");
    if (categorySelect) categorySelect.value = template.category;
  }, 0);

  // Set date to today
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.valueAsDate = new Date();

  // Set notes
  const notesInput = document.getElementById("notes");
  if (notesInput) notesInput.value = template.notes || "";

  // Set tags
  state.formTags = [...(template.tags || [])];
  const event2 = new CustomEvent("quick-entry-tags");
  document.dispatchEvent(event2);

  // Set optional fields
  if (template.paymentMethod) {
    const el = document.getElementById("paymentMethod");
    if (el) el.value = template.paymentMethod;
  }
  if (template.merchant) {
    const el = document.getElementById("merchant");
    if (el) el.value = template.merchant;
  }

  showMessage("Template loaded. Review and save.");

  // Scroll to form and focus save button
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn)
    submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ============================================================================
// Clone Last Transaction
// ============================================================================

export function cloneLast() {
  // Find the most recent non-deleted, non-transfer transaction
  const recent = state.transactions.find(
    (t) => !t.deleted && t.type !== "transfer",
  );
  if (!recent) {
    showMessage("No recent transaction to clone.");
    return;
  }

  // Set type
  const typeInput = document.getElementById("type");
  if (typeInput) typeInput.value = recent.type;

  document.querySelectorAll(".type-option").forEach((btn) => {
    const isActive = btn.dataset.type === recent.type;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });

  const event = new CustomEvent("quick-entry-type", { detail: recent.type });
  document.dispatchEvent(event);

  const amountInput = document.getElementById("amount");
  if (amountInput) amountInput.value = recent.amount;

  setTimeout(() => {
    const categorySelect = document.getElementById("category");
    if (categorySelect) categorySelect.value = recent.category;
  }, 0);

  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.valueAsDate = new Date();

  const notesInput = document.getElementById("notes");
  if (notesInput) notesInput.value = recent.notes || "";

  state.formTags = [...(recent.tags || [])];
  const event2 = new CustomEvent("quick-entry-tags");
  document.dispatchEvent(event2);

  // Copy optional fields
  const optionalKeys = [
    "paymentMethod",
    "merchant",
    "expenseType",
    "attachedTo",
    "referenceId",
  ];
  for (const key of optionalKeys) {
    if (recent[key]) {
      const el = document.getElementById(
        key === "location" ? "locationField" : key,
      );
      if (el) el.value = recent[key];
    }
  }
  if (recent.location) {
    const el = document.getElementById("locationField");
    if (el) el.value = recent.location;
  }

  showMessage("Last transaction cloned. Review and save.");
}

// ============================================================================
// Save as Template (from current form)
// ============================================================================

export async function saveAsTemplate() {
  if (state.quickTemplates.length >= MAX_QUICK_TEMPLATES) {
    showMessage(
      `Maximum ${MAX_QUICK_TEMPLATES} templates reached. Delete one first.`,
    );
    return;
  }

  const type = document.getElementById("type").value;
  if (type === "transfer") {
    showMessage("Transfers cannot be saved as templates.");
    return;
  }

  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;

  if (!amount || !category) {
    showMessage("Fill in the amount and category first.");
    return;
  }

  const notes = document.getElementById("notes").value.trim();

  // Generate a label from notes or category
  const label = notes
    ? notes.substring(0, 20) + (notes.length > 20 ? "…" : "")
    : category;

  const template = {
    id: generateId(),
    label: sanitizeHTML(label),
    type,
    amount,
    category,
    notes: sanitizeHTML(notes),
    tags: [...state.formTags],
    sortOrder: state.quickTemplates.length,
    createdAt: new Date().toISOString(),
  };

  // Copy optional fields if they have values
  const paymentMethod = document.getElementById("paymentMethod");
  if (paymentMethod && paymentMethod.value)
    template.paymentMethod = paymentMethod.value;
  const merchant = document.getElementById("merchant");
  if (merchant && merchant.value.trim())
    template.merchant = sanitizeHTML(merchant.value.trim());

  await saveQuickTemplate(template);
  state.quickTemplates.push(template);

  renderQuickBar();
  renderTemplateManager();
  showMessage("Template saved.");
}

// ============================================================================
// Template Manager (Settings)
// ============================================================================

export function renderTemplateManager() {
  const container = document.getElementById("quickTemplatesList");
  if (!container) return;

  if (state.quickTemplates.length === 0) {
    container.innerHTML = `<div class="empty-state">No quick entry templates yet. Save a transaction as a template.</div>`;
    return;
  }

  container.innerHTML = state.quickTemplates
    .map(
      (t, i) => `
      <div class="template-item" data-template-id="${t.id}">
        <div class="template-item-info">
          <span class="template-item-type ${t.type}">${t.type === "income" ? "↑" : "↓"}</span>
          <div class="template-item-details">
            <span class="template-item-label">${sanitizeHTML(t.label)}</span>
            <span class="template-item-meta">${sanitizeHTML(t.category)} · ${formatCurrency(t.amount)}</span>
          </div>
        </div>
        <div class="template-item-actions">
          ${i > 0 ? `<button type="button" class="template-action-btn" data-move="up" data-id="${t.id}" aria-label="Move up"><i class="ri-arrow-up-s-line"></i></button>` : ""}
          ${i < state.quickTemplates.length - 1 ? `<button type="button" class="template-action-btn" data-move="down" data-id="${t.id}" aria-label="Move down"><i class="ri-arrow-down-s-line"></i></button>` : ""}
          <button type="button" class="template-action-btn template-delete-btn" data-delete="${t.id}" aria-label="Delete template"><i class="ri-delete-bin-line"></i></button>
        </div>
      </div>`,
    )
    .join("");
}

export async function deleteTemplate(id) {
  await deleteQuickTemplate(id);
  state.quickTemplates = state.quickTemplates.filter((t) => t.id !== id);
  // Reorder
  state.quickTemplates.forEach((t, i) => (t.sortOrder = i));
  if (state.quickTemplates.length > 0) {
    const { bulkSaveQuickTemplates } = await import("./db.js");
    await bulkSaveQuickTemplates(state.quickTemplates);
  }
  renderQuickBar();
  renderTemplateManager();
  showMessage("Template deleted.");
}

export async function moveTemplate(id, direction) {
  const idx = state.quickTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const newIdx = direction === "up" ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= state.quickTemplates.length) return;

  // Swap
  const temp = state.quickTemplates[idx];
  state.quickTemplates[idx] = state.quickTemplates[newIdx];
  state.quickTemplates[newIdx] = temp;

  // Update sort orders
  state.quickTemplates.forEach((t, i) => (t.sortOrder = i));
  const { bulkSaveQuickTemplates } = await import("./db.js");
  await bulkSaveQuickTemplates(state.quickTemplates);

  renderQuickBar();
  renderTemplateManager();
}

// ============================================================================
// Edit Template Label
// ============================================================================

export async function editTemplateLabel(id, newLabel) {
  const template = state.quickTemplates.find((t) => t.id === id);
  if (!template || !newLabel.trim()) return;
  template.label = sanitizeHTML(newLabel.trim().substring(0, 30));
  await saveQuickTemplate(template);
  renderQuickBar();
  renderTemplateManager();
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindQuickEntryEvents() {
  const bar = document.getElementById("quickEntryBar");
  if (bar) {
    bar.addEventListener("click", (e) => {
      const pill = e.target.closest("[data-template-id]");
      if (pill) {
        prefillFromTemplate(Number(pill.dataset.templateId));
        return;
      }
      if (e.target.closest("#cloneLastBtn")) {
        cloneLast();
      }
    });
  }

  const saveTemplateBtn = document.getElementById("saveAsTemplateBtn");
  if (saveTemplateBtn)
    saveTemplateBtn.addEventListener("click", saveAsTemplate);

  document.addEventListener("quick-entry-type", (e) => {
    updateCategoryOptions(e.detail);
    selectType(e.detail);
  });

  document.addEventListener("quick-entry-tags", () => {
    renderFormTagChips();
  });

  const templatesList = document.getElementById("quickTemplatesList");
  if (templatesList) {
    templatesList.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest("[data-delete]");
      if (deleteBtn) {
        deleteTemplate(Number(deleteBtn.dataset.delete));
        return;
      }
      const moveBtn = e.target.closest("[data-move]");
      if (moveBtn) {
        moveTemplate(Number(moveBtn.dataset.id), moveBtn.dataset.move);
        return;
      }
      const label = e.target.closest(".template-item-label");
      if (label) {
        const item = label.closest(".template-item");
        if (!item) return;
        const id = Number(item.dataset.templateId);
        const currentLabel = label.textContent;
        const input = document.createElement("input");
        input.type = "text";
        input.value = currentLabel;
        input.maxLength = 30;
        input.className = "template-edit-input";
        label.replaceWith(input);
        input.focus();
        input.select();
        const commit = () => {
          const newVal = input.value.trim() || currentLabel;
          editTemplateLabel(id, newVal);
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") input.blur();
          if (ev.key === "Escape") {
            input.value = currentLabel;
            input.blur();
          }
        });
      }
    });
  }
}
