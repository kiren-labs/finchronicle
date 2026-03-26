// ============================================================================
// Tags & Search (v3.14.0)
// ============================================================================

import { state } from "./state.js";
import { saveTransactionToDB } from "./db.js";

// Apply search query and tag filters to an already-filtered transaction list.
// Called from updateTransactionsList() in ui.js after existing filters.
export function filterTransactions(transactions) {
  let result = transactions;

  const query = state.searchQuery.trim().toLowerCase();
  if (query) {
    result = result.filter((t) => {
      if (String(t.amount).includes(query)) return true;
      if (t.category.toLowerCase().includes(query)) return true;
      if (t.notes && t.notes.toLowerCase().includes(query)) return true;
      if ((t.tags || []).some((tag) => tag.toLowerCase().includes(query))) return true;
      return false;
    });
  }

  if (state.searchTags.length > 0) {
    result = result.filter((t) =>
      state.searchTags.every((tag) => (t.tags || []).includes(tag))
    );
  }

  return result;
}

// Return all unique tags across all transactions, sorted alphabetically.
export function getAllTags() {
  const tagSet = new Set();
  state.transactions.forEach((t) => {
    (t.tags || []).forEach((tag) => tagSet.add(tag));
  });
  return [...tagSet].sort();
}

// Rename a tag across all transactions — updates state + IDB in place.
export async function renameTag(oldName, newName) {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;

  const affected = state.transactions.filter((t) => (t.tags || []).includes(oldName));
  for (const t of affected) {
    t.tags = t.tags.map((tag) => (tag === oldName ? trimmed : tag));
    await saveTransactionToDB(t);
  }
}

// Remove a tag from all transactions — updates state + IDB in place.
export async function deleteTag(name) {
  const affected = state.transactions.filter((t) => (t.tags || []).includes(name));
  for (const t of affected) {
    t.tags = t.tags.filter((tag) => tag !== name);
    await saveTransactionToDB(t);
  }
}
