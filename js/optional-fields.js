// ============================================================================
// Optional Fields System (v3.16.0)
// ============================================================================

import { state, DEFAULT_APP_SETTINGS, PAYMENT_METHODS, EXPENSE_TYPES } from "./state.js";
import { loadAppSettings, saveAppSettings } from "./db.js";
import { sanitizeHTML } from "./utils.js";

// ============================================================================
// Initialisation
// ============================================================================

/**
 * Load app settings from DB, auto-detect enabled fields from existing data.
 */
export async function initOptionalFields() {
  let settings = await loadAppSettings();
  const isFirstRun = !settings;

  if (!settings) {
    settings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  }

  // Merge any missing field keys (forward compatibility)
  for (const key of Object.keys(DEFAULT_APP_SETTINGS.enabledFields)) {
    if (!(key in settings.enabledFields)) {
      settings.enabledFields[key] = false;
    }
  }

  // Auto-detect only on first run — never override user choices after that
  if (isFirstRun) {
    const fieldKeys = Object.keys(settings.enabledFields);
    for (const key of fieldKeys) {
      if (!settings.enabledFields[key]) {
        const hasData = state.transactions.some((t) => {
          const val = t[key];
          if (val === undefined || val === null || val === "") return false;
          if (Array.isArray(val)) return val.length > 0;
          return true;
        });
        if (hasData) {
          settings.enabledFields[key] = true;
        }
      }
    }
  }

  state.appSettings = settings;

  // Build smart category keywords from history on first load
  if (
    !settings.smartCategoryKeywords ||
    Object.keys(settings.smartCategoryKeywords).length === 0
  ) {
    settings.smartCategoryKeywords = buildSmartKeywords();
  }

  await saveAppSettings(settings);
  renderOptionalFieldsForm();
}

// ============================================================================
// Smart Category Suggestions
// ============================================================================

/**
 * Build keyword → category frequency map from last 90 days of transactions.
 */
function buildSmartKeywords() {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recent = state.transactions.filter(
    (t) => t.type !== "transfer" && (t.dateTs || new Date(t.date).getTime()) >= cutoff
  );

  const keywordMap = {}; // { keyword: { category: count } }

  recent.forEach((t) => {
    if (!t.notes) return;
    const words = t.notes
      .toLowerCase()
      .split(/[\s,.\-/]+/)
      .filter((w) => w.length > 2);

    words.forEach((word) => {
      if (!keywordMap[word]) keywordMap[word] = {};
      keywordMap[word][t.category] = (keywordMap[word][t.category] || 0) + 1;
    });
  });

  // Keep only keywords that strongly map to one category (>= 60% of occurrences)
  const result = {};
  for (const [word, cats] of Object.entries(keywordMap)) {
    const total = Object.values(cats).reduce((s, c) => s + c, 0);
    if (total < 2) continue; // need at least 2 occurrences
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const topCategory = sorted[0][0];
    const topCount = sorted[0][1];
    if (topCount / total >= 0.6) {
      result[word] = topCategory;
    }
  }

  return result;
}

/**
 * Suggest a category based on notes text.
 * Returns { category, confidence } or null.
 */
export function suggestCategory(noteText) {
  if (!noteText || !state.appSettings) return null;

  const keywords = state.appSettings.smartCategoryKeywords || {};
  if (Object.keys(keywords).length === 0) return null;

  const words = noteText
    .toLowerCase()
    .split(/[\s,.\-/]+/)
    .filter((w) => w.length > 2);

  const categoryScores = {};
  let matchCount = 0;

  for (const word of words) {
    if (keywords[word]) {
      const cat = keywords[word];
      categoryScores[cat] = (categoryScores[cat] || 0) + 1;
      matchCount++;
    }
  }

  if (matchCount === 0) return null;

  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0][0];
  const confidence = sorted[0][1] / matchCount;

  if (confidence >= 0.5) {
    return { category: topCategory, confidence };
  }

  return null;
}

/**
 * Rebuild smart keywords (call after import or bulk changes).
 */
export async function rebuildSmartKeywords() {
  if (!state.appSettings) return;
  state.appSettings.smartCategoryKeywords = buildSmartKeywords();
  await saveAppSettings(state.appSettings);
}

// ============================================================================
// Form Rendering
// ============================================================================

/**
 * Show/hide optional field rows based on enabled settings.
 */
export function renderOptionalFieldsForm() {
  const container = document.getElementById("optionalFieldsContainer");
  if (!container || !state.appSettings) return;

  const enabled = state.appSettings.enabledFields;
  const hasAnyEnabled = Object.values(enabled).some(Boolean);

  // Show/hide the entire collapsible section
  const section = document.getElementById("optionalFieldsSection");
  if (section) {
    section.hidden = !hasAnyEnabled;
  }

  // Show/hide individual fields
  const currentType = document.getElementById("type")?.value;
  const fields = container.querySelectorAll("[data-optional-field]");
  fields.forEach((el) => {
    const fieldName = el.dataset.optionalField;
    // accountLinking only applies to income/expense, not transfer
    if (fieldName === "accountLinking") {
      el.hidden = !enabled[fieldName] || currentType === "transfer";
    } else {
      el.hidden = !enabled[fieldName];
    }
  });

  // Populate account dropdown when visible
  if (enabled.accountLinking && currentType !== "transfer") {
    populateLinkedAccountSelect();
  }

  // Hide Tags management section in Settings when tags are disabled
  const tagMgmt = document.getElementById("tagManagementContainer");
  if (tagMgmt) {
    tagMgmt.hidden = !enabled.tags;
  }
}

/**
 * Populate the linked account <select> from state.accounts.
 */
function populateLinkedAccountSelect(selectedValue) {
  const el = document.getElementById("linkedAccount");
  if (!el) return;
  const accounts = state.accounts || [];
  el.innerHTML =
    '<option value="">None</option>' +
    accounts
      .map(
        (a) =>
          `<option value="${sanitizeHTML(a.name)}"${a.name === selectedValue ? " selected" : ""}>${sanitizeHTML(a.name)}</option>`
      )
      .join("");
}

/**
 * Read optional field values from the form.
 */
export function getOptionalFieldValues() {
  if (!state.appSettings) return {};

  const enabled = state.appSettings.enabledFields;
  const values = {};

  if (enabled.paymentMethod) {
    const el = document.getElementById("paymentMethod");
    values.paymentMethod = el ? el.value || null : null;
  }
  if (enabled.merchant) {
    const el = document.getElementById("merchant");
    values.merchant = el ? sanitizeHTML(el.value.trim()) || null : null;
  }
  if (enabled.expenseType) {
    const el = document.getElementById("expenseType");
    values.expenseType = el ? el.value || null : null;
  }
  if (enabled.attachedTo) {
    const el = document.getElementById("attachedTo");
    values.attachedTo = el ? sanitizeHTML(el.value.trim()) || null : null;
  }
  if (enabled.referenceId) {
    const el = document.getElementById("referenceId");
    values.referenceId = el ? sanitizeHTML(el.value.trim()) || null : null;
  }
  if (enabled.location) {
    const el = document.getElementById("locationField");
    values.location = el ? sanitizeHTML(el.value.trim()) || null : null;
  }

  if (enabled.accountLinking) {
    const el = document.getElementById("linkedAccount");
    const type = document.getElementById("type")?.value;
    const accountName = el ? el.value || null : null;
    if (accountName && type === "expense") values.fromAccount = accountName;
    if (accountName && type === "income") values.toAccount = accountName;
  }

  return values;
}

/**
 * Populate optional fields when editing a transaction.
 */
export function setOptionalFieldValues(transaction) {
  if (!state.appSettings) return;

  const el = (id) => document.getElementById(id);

  if (el("paymentMethod"))
    el("paymentMethod").value = transaction.paymentMethod || "";
  if (el("merchant")) el("merchant").value = transaction.merchant || "";
  if (el("expenseType"))
    el("expenseType").value = transaction.expenseType || "";
  if (el("attachedTo")) el("attachedTo").value = transaction.attachedTo || "";
  if (el("referenceId"))
    el("referenceId").value = transaction.referenceId || "";
  if (el("locationField"))
    el("locationField").value = transaction.location || "";

  if (el("linkedAccount")) {
    const linkedValue =
      transaction.type === "expense"
        ? transaction.fromAccount || ""
        : transaction.type === "income"
          ? transaction.toAccount || ""
          : "";
    populateLinkedAccountSelect(linkedValue);
    el("linkedAccount").value = linkedValue;
  }
}

/**
 * Clear all optional field inputs.
 */
export function clearOptionalFields() {
  const container = document.getElementById("optionalFieldsContainer");
  if (!container) return;
  container
    .querySelectorAll("input, select")
    .forEach((el) => (el.value = ""));
}

// ============================================================================
// Autocomplete for merchant and attachedTo fields
// ============================================================================

/**
 * Get unique values for a given field from transaction history.
 */
function getFieldSuggestions(fieldName) {
  const values = new Set();
  state.transactions.forEach((t) => {
    if (t[fieldName]) values.add(t[fieldName]);
  });
  return [...values].sort();
}

/**
 * Bind autocomplete behaviour to an input (reuses transfer.js pattern).
 */
export function bindFieldAutocomplete(inputId, suggestionsId, fieldName) {
  const input = document.getElementById(inputId);
  const suggestionsEl = document.getElementById(suggestionsId);
  if (!input || !suggestionsEl) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      suggestionsEl.hidden = true;
      suggestionsEl.innerHTML = "";
      return;
    }

    const all = getFieldSuggestions(fieldName);
    const matches = all.filter((a) => a.toLowerCase().includes(query));

    if (matches.length === 0) {
      suggestionsEl.hidden = true;
      suggestionsEl.innerHTML = "";
      return;
    }

    suggestionsEl.innerHTML = matches
      .slice(0, 8)
      .map(
        (a) =>
          `<div class="account-suggestion" data-value="${sanitizeHTML(a)}">${sanitizeHTML(a)}</div>`
      )
      .join("");
    suggestionsEl.hidden = false;
  });

  suggestionsEl.addEventListener("click", (e) => {
    const item = e.target.closest(".account-suggestion");
    if (!item) return;
    input.value = item.dataset.value;
    suggestionsEl.hidden = true;
    suggestionsEl.innerHTML = "";
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      suggestionsEl.hidden = true;
    }, 200);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      suggestionsEl.hidden = true;
    }
  });
}

// ============================================================================
// Settings: Field Toggles
// ============================================================================

const FIELD_LABELS = {
  tags: "Tags",
  paymentMethod: "Payment Method",
  merchant: "Merchant / Payee",
  expenseType: "Expense Type",
  attachedTo: "Person (Attached To)",
  referenceId: "Reference / Receipt ID",
  location: "Location",
  transactionCurrency: "Transaction Currency",
  accountLinking: "Account Linking",
};

/**
 * Render the field toggle switches in Settings.
 */
export function renderFieldToggles() {
  const container = document.getElementById("optionalFieldToggles");
  if (!container || !state.appSettings) return;

  const enabled = state.appSettings.enabledFields;

  container.innerHTML = Object.entries(FIELD_LABELS)
    .map(
      ([key, label]) => `
      <label class="field-toggle-row">
        <span class="field-toggle-label">${label}</span>
        <input type="checkbox" class="field-toggle-checkbox"
               data-field-toggle="${key}" ${enabled[key] ? "checked" : ""}>
        <span class="field-toggle-switch"></span>
      </label>`
    )
    .join("");
}

/**
 * Handle toggle change — persist and re-render form.
 */
export async function handleFieldToggle(fieldName, isEnabled) {
  if (!state.appSettings) return;
  state.appSettings.enabledFields[fieldName] = isEnabled;
  await saveAppSettings(state.appSettings);
  renderOptionalFieldsForm();
}

// ============================================================================
// Category Suggestion UI
// ============================================================================

let suggestionTimeout = null;

/**
 * Show/hide category suggestion banner based on notes input.
 */
export function handleNoteInput(noteText) {
  const banner = document.getElementById("categorySuggestion");
  if (!banner) return;

  clearTimeout(suggestionTimeout);

  suggestionTimeout = setTimeout(() => {
    const type = document.getElementById("type").value;
    if (type === "transfer") {
      banner.hidden = true;
      return;
    }

    const result = suggestCategory(noteText);
    if (result) {
      const categorySelect = document.getElementById("category");
      // Don't suggest if already set to the same category
      if (categorySelect.value === result.category) {
        banner.hidden = true;
        return;
      }
      banner.querySelector(".suggestion-category").textContent =
        result.category;
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }, 300);
}

/**
 * Accept the suggested category.
 */
export function acceptCategorySuggestion() {
  const banner = document.getElementById("categorySuggestion");
  if (!banner) return;
  const category = banner.querySelector(".suggestion-category").textContent;
  const categorySelect = document.getElementById("category");
  if (categorySelect) {
    categorySelect.value = category;
  }
  banner.hidden = true;
}

/**
 * Dismiss the suggestion.
 */
export function dismissCategorySuggestion() {
  const banner = document.getElementById("categorySuggestion");
  if (banner) banner.hidden = true;
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindOptionalFieldsEvents() {
  const toggle = document.getElementById("optionalFieldsToggle");
  const container = document.getElementById("optionalFieldsContainer");
  if (toggle && container) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      container.hidden = expanded;
      toggle.querySelector(".optional-fields-chevron").classList.toggle("expanded", !expanded);
      if (!expanded) renderOptionalFieldsForm();
    });
  }

  const notesInput = document.getElementById("notes");
  if (notesInput) {
    notesInput.addEventListener("input", () => {
      handleNoteInput(notesInput.value);
    });
  }

  const suggestionBanner = document.getElementById("categorySuggestion");
  if (suggestionBanner) {
    suggestionBanner.querySelector(".suggestion-accept").addEventListener("click", acceptCategorySuggestion);
    suggestionBanner.querySelector(".suggestion-dismiss").addEventListener("click", dismissCategorySuggestion);
  }

  document.getElementById("optionalFieldToggles").addEventListener("change", (e) => {
    const checkbox = e.target.closest("[data-field-toggle]");
    if (!checkbox) return;
    handleFieldToggle(checkbox.dataset.fieldToggle, checkbox.checked);
  });
}
