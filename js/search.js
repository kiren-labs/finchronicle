// ============================================================================
// Tags & Search (v3.14.0)
// ============================================================================

import { state } from "./state.js";
import { saveTransactionToDB } from "./db.js";

// ---- Tag Color Palette (macOS-inspired) ----

export const TAG_PALETTE = [
  "#FF453A", // Red
  "#FF9F0A", // Orange
  "#FFD60A", // Yellow
  "#30D158", // Green
  "#40C8E0", // Teal
  "#0A84FF", // Blue
  "#BF5AF2", // Purple
  "#FF375F", // Pink
  "#98989D", // Gray
];

function getTagColors() {
  try {
    return JSON.parse(localStorage.getItem("tagColors") || "{}");
  } catch {
    return {};
  }
}

// Return the color for a tag, auto-assigning one if none exists.
export function getTagColor(tag) {
  const colors = getTagColors();
  if (colors[tag]) return colors[tag];
  return autoAssignColor(tag, colors);
}

function autoAssignColor(tag, colors = getTagColors()) {
  const used = new Set(Object.values(colors));
  const next =
    TAG_PALETTE.find((c) => !used.has(c)) ||
    TAG_PALETTE[Object.keys(colors).length % TAG_PALETTE.length];
  colors[tag] = next;
  localStorage.setItem("tagColors", JSON.stringify(colors));
  return next;
}

// Cycle a tag's color to the next in the palette. Returns the new color.
export function cycleTagColor(tag) {
  const colors = getTagColors();
  const current = colors[tag] || TAG_PALETTE[0];
  const idx = TAG_PALETTE.indexOf(current);
  const next = TAG_PALETTE[(idx + 1) % TAG_PALETTE.length];
  colors[tag] = next;
  localStorage.setItem("tagColors", JSON.stringify(colors));
  return next;
}

// Ensure every existing tag has a color assigned (call on app init).
export function initTagColors() {
  getAllTags().forEach((tag) => getTagColor(tag));
}

// Ensure a single tag has a color (call when a new tag is added).
export function ensureTagColor(tag) {
  getTagColor(tag);
}

// ---- Filter ----

// Apply search query and tag filters to an already-filtered transaction list.
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

// ---- Tag Queries ----

// Return all unique tags across all transactions, sorted alphabetically.
export function getAllTags() {
  const tagSet = new Set();
  state.transactions.forEach((t) => {
    (t.tags || []).forEach((tag) => tagSet.add(tag));
  });
  return [...tagSet].sort();
}

// ---- Tag Mutations ----

// Rename a tag across all transactions — transfers color, updates state + IDB.
export async function renameTag(oldName, newName) {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;

  // Transfer color to new name
  const colors = getTagColors();
  if (colors[oldName]) {
    colors[trimmed] = colors[oldName];
    delete colors[oldName];
    localStorage.setItem("tagColors", JSON.stringify(colors));
  }

  const affected = state.transactions.filter((t) => (t.tags || []).includes(oldName));
  for (const t of affected) {
    t.tags = t.tags.map((tag) => (tag === oldName ? trimmed : tag));
    await saveTransactionToDB(t);
  }
}

// Remove a tag from all transactions — cleans up color, updates state + IDB.
export async function deleteTag(name) {
  const colors = getTagColors();
  delete colors[name];
  localStorage.setItem("tagColors", JSON.stringify(colors));

  const affected = state.transactions.filter((t) => (t.tags || []).includes(name));
  for (const t of affected) {
    t.tags = t.tags.filter((tag) => tag !== name);
    await saveTransactionToDB(t);
  }
}
