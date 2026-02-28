# FinChronicle Refactoring Plan — P0/P1/P2

**Branch:** `refactor/app-js-p0`  
**Base:** `feature/double-entry-v4.0`  
**Date:** 2026-03-01  
**Scope:** Security fixes, performance improvements, and dead code cleanup in `app.js`

---

## P0 — Security & Data Integrity (Must Fix)

### 1. XSS at Render Time (Security)
- **File:** `app.js` → `updateTransactionsList()`, `groupByCategory()`, `groupByMonth()`
- **Problem:** Transaction notes are sanitized on save (v3.10.2), but old/imported data from before v3.10.2 may contain unsanitized HTML. The render path injects `t.notes` directly into `innerHTML`.
- **Fix:** Wrap every `t.notes` output with `sanitizeHTML()` at render time.
- **Lines affected:** ~697, ~870, ~910 (transaction list + group views)

### 2. importFromCSV Saves Entire Array (Data Integrity)
- **File:** `app.js` → `importFromCSV()`
- **Problem:** After importing new rows, `bulkSaveTransactionsToDB(transactions)` is called with the **entire** in-memory array, re-writing every existing transaction to IndexedDB unnecessarily.
- **Fix:** Collect only newly imported transactions into a separate array and pass that to `bulkSaveTransactionsToDB()`.
- **Lines affected:** ~2167-2227

---

## P1 — Performance Improvements

### 3. Single-Pass Aggregation in updateSummary()
- **File:** `app.js` → `updateSummary()`
- **Problem:** Filters the transactions array 3× (month filter → income filter → expense filter). Each pass is O(n).
- **Fix:** Replace with a single `reduce()` that computes income, expense, and count in one pass.
- **Lines affected:** ~571-640

### 4. Lazy-Render Only Active Tab
- **File:** `app.js` → `updateUI()`
- **Problem:** Every call to `updateUI()` rebuilds all tabs (list, groups, summary, filters), even when only one tab is visible. `updateGroupedView()` is particularly expensive (insights + grouped HTML).
- **Fix:** Only run update functions for the currently visible tab. Mark other tabs as dirty and refresh on switch.
- **Lines affected:** ~562-567 (`updateUI`), ~919-948 (`switchTab`)

### 5. Cache DOM References
- **File:** `app.js` (top-level + `updateSummary()`, `updateTransactionsList()`)
- **Problem:** `document.getElementById()` is called dozens of times per UI update cycle for the same elements.
- **Fix:** Create a `DOM` cache object at the top of the file, populated once after DOMContentLoaded.
- **Lines affected:** Multiple call sites

---

## P2 — Code Cleanup

### 6. Remove Dead localStorage Functions
- **File:** `app.js` → `loadData()`, `saveData()`
- **Problem:** These functions are remnants from before the IndexedDB migration. They are never called in the current initialization flow.
- **Fix:** Delete both functions.
- **Lines affected:** ~404-416

### 7. Replace window._pendingRestoreData
- **File:** `app.js` → `handleRestore()`, `confirmRestore()`, `closeRestorePreview()`
- **Problem:** Temporary backup data is stored on `window._pendingRestoreData`, polluting global scope.
- **Fix:** Replace with a module-scoped variable `let pendingRestoreData = null`.
- **Lines affected:** ~1929, ~2101, ~2074

### 8. Fix Async/Await Consistency in importFromCSV
- **File:** `app.js` → `importFromCSV()`
- **Problem:** Uses `.then()/.catch()` for `bulkSaveTransactionsToDB()` instead of `await`. The calling function `handleImport()` has no visibility into DB save success/failure.
- **Fix:** Make `importFromCSV()` async, use `await`, and propagate errors to caller.
- **Lines affected:** ~2167-2227, ~1883-1900

---

## Implementation Order

```
Step 1: P0 #1 — XSS render-time fix
Step 2: P0 #2 — importFromCSV bulk-save fix
Step 3: P1 #3 — Single-pass updateSummary
Step 4: P1 #4 — Lazy-render active tab
Step 5: P1 #5 — Cache DOM references
Step 6: P2 #6 — Remove dead code
Step 7: P2 #7 — Replace window._pendingRestoreData
Step 8: P2 #8 — Fix async/await in import
Step 9: Verify — Check for errors, test manually
```

---

## Out of Scope (P3 — Future)

These are architectural changes better suited for the v4.0 rewrite:

- Split `app.js` into ES modules
- Replace inline `onclick` handlers with `addEventListener`
- Split `styles.css` into component files
- Audit redundant dark-mode CSS overrides
- Add numeric timestamp caching for sort optimization
- Replace `innerHTML` rendering with `DocumentFragment`
