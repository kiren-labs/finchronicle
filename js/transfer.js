// ============================================================================
// Transfer Transaction Type (v3.15.0)
// ============================================================================

import { state } from "./state.js";
import { sanitizeHTML } from "./utils.js";

// Default account suggestions (pre-seeded)
const DEFAULT_ACCOUNTS = ["Cash", "Savings", "Credit Card", "Bank Account"];

/**
 * Get all unique account names from past transfer transactions + defaults.
 * Used for autocomplete suggestions.
 */
export function getAccountSuggestions() {
  const fromHistory = new Set();
  state.transactions.forEach((t) => {
    if (t.type === "transfer") {
      if (t.fromAccount) fromHistory.add(t.fromAccount);
      if (t.toAccount) fromHistory.add(t.toAccount);
    }
  });

  // Merge defaults + history, deduplicate
  const all = new Set([...DEFAULT_ACCOUNTS, ...state.savedAccounts, ...fromHistory]);
  return [...all].sort();
}

/**
 * Show/hide transfer-specific fields based on selected type.
 * Called when user toggles between expense/income/transfer.
 */
export function toggleTransferFields(type) {
  const transferFields = document.getElementById("transferFields");
  const categoryGroup = document.getElementById("categoryGroup");

  if (type === "transfer") {
    transferFields.hidden = false;
    categoryGroup.classList.add("disabled-field");
    document.getElementById("category").disabled = true;
    document.getElementById("category").value = "Transfer";
  } else {
    transferFields.hidden = true;
    categoryGroup.classList.remove("disabled-field");
    document.getElementById("category").disabled = false;
  }
}

/**
 * Populate account autocomplete suggestions for an input.
 */
export function bindAccountAutocomplete(inputId, suggestionsId) {
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

    const accounts = getAccountSuggestions();
    const matches = accounts.filter((a) => a.toLowerCase().includes(query));

    if (matches.length === 0) {
      suggestionsEl.hidden = true;
      suggestionsEl.innerHTML = "";
      return;
    }

    suggestionsEl.innerHTML = matches
      .map((a) => `<div class="account-suggestion" data-value="${sanitizeHTML(a)}">${sanitizeHTML(a)}</div>`)
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

  // Close suggestions on blur (with delay for click to register)
  input.addEventListener("blur", () => {
    setTimeout(() => {
      suggestionsEl.hidden = true;
    }, 200);
  });

  // Close on Escape
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      suggestionsEl.hidden = true;
    }
  });
}

/**
 * Build transfer transaction data from form fields.
 * Returns the transfer-specific fields to merge into the transaction object.
 */
export function getTransferFormData() {
  const fromAccount = document.getElementById("fromAccount").value.trim();
  const toAccount = document.getElementById("toAccount").value.trim();
  return {
    fromAccount: fromAccount || null,
    toAccount: toAccount || null,
    transferNote: null,
  };
}

/**
 * Set transfer form fields when editing a transfer transaction.
 */
export function setTransferFormData(transaction) {
  if (transaction.type !== "transfer") return;

  document.getElementById("fromAccount").value = transaction.fromAccount || "";
  document.getElementById("toAccount").value = transaction.toAccount || "";
}

/**
 * Clear transfer form fields on reset.
 */
export function clearTransferFields() {
  const fromInput = document.getElementById("fromAccount");
  const toInput = document.getElementById("toAccount");
  if (fromInput) fromInput.value = "";
  if (toInput) toInput.value = "";
}
