# JavaScript Codebase Review & Refactoring Plan

**Scope:** `js/` folder — 24 modules, ~12,400 LOC  
**Date:** 2026-05-31  
**Constraint:** Zero-dependency vanilla JS (no npm, no frameworks)

---

## 1. Critical Code Duplication

### 1.1 IndexedDB CRUD Boilerplate (db.js — 768 lines)

The single worst duplication in the codebase. Every DB function repeats the same 10-line ceremony:

```javascript
export function loadXxx() {
  return new Promise((resolve, reject) => {
    if (!state.db) { reject(new Error("Database not initialized")); return; }
    const tx = state.db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
```

This pattern appears **~30 times** across `loadBudgetsFromDB`, `saveBudgetToDB`, `deleteBudgetFromDB`, `loadRecurringTemplatesFromDB`, `saveRecurringTemplateToDB`, `deleteRecurringTemplateFromDB`, `loadQuickTemplates`, `saveQuickTemplate`, `deleteQuickTemplate`, `loadAccounts`, `saveAccount`, `deleteAccount`, `loadGoals`, `saveGoal`, `deleteGoal`, `saveNetWorthSnapshot`, `loadNetWorthSnapshots`, `getNetWorthSnapshotByDate`, etc.

**Fix:** Extract a generic IndexedDB helper:

```javascript
// db-helpers.js
function idbTransaction(storeName, mode = "readonly") {
  if (!state.db) throw new Error("Database not initialized");
  const tx = state.db.transaction([storeName], mode);
  return tx.objectStore(storeName);
}

export function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const store = idbTransaction(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export function idbPut(storeName, record) {
  return new Promise((resolve, reject) => {
    const store = idbTransaction(storeName, "readwrite");
    const req = store.put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function idbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const store = idbTransaction(storeName, "readwrite");
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function idbGetByIndex(storeName, indexName, key) {
  return new Promise((resolve, reject) => {
    const store = idbTransaction(storeName);
    const req = store.index(indexName).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
```

This would reduce `db.js` from ~768 lines to ~200.

---

### 1.2 Autocomplete/Suggestion Dropdown Pattern

Duplicated across:
- `transfer.js` → `bindAccountAutocomplete()` (input, filter, render, select, blur, escape)
- `optional-fields.js` → `bindFieldAutocomplete()` (identical pattern)
- `app.js` → `bindTagInputEvents()` → tag suggestions (same pattern)
- `search.js` → filtering logic reused inline

**Fix:** Extract a reusable `createAutocomplete(input, suggestionsEl, getOptions)` utility.

---

### 1.3 Modal Open/Close Ceremony

Every modal follows:

```javascript
export function showXxxModal() {
  const modal = document.getElementById("xxxModal");
  modal.classList.add("show");
  someInput?.focus();
}

export function closeXxxModal() {
  const modal = document.getElementById("xxxModal");
  modal.classList.remove("show");
}
```

Repeated for: account form, goal form, contribution form, recurring modal, reconciliation modal, budget modal, delete modal, feedback modal, restore preview modal.

**Fix:** Generic `openModal(id, focusSelector)` / `closeModal(id)` helper.

---

### 1.4 Date Construction & Formatting

Multiple modules reconstruct `YYYY-MM-DD` strings or parse them:

```javascript
// Pattern appears in: recurring.js, forecast.js, alerts.js, savings.js, settlement.js, accounts.js
const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
```

Also: month start/end calculations, "last N months" generation (duplicated in savings.js, alerts.js, annual-report.js).

**Fix:** Add `toDateStr(date)`, `getMonthStart(date)`, `getLastNMonths(n)` to `utils.js`.

---

### 1.5 Transaction Filtering by Date Range

Each module filters `state.transactions` with its own filter loop:

- `budget.js` → `getCategorySpending()` — creates `new Date()` per transaction
- `alerts.js` → `getExpenses()` — uses `t.dateTs`
- `savings.js` → `getMonthlySavings()` / `getMonthlyIncome()` — uses string prefix match
- `settlement.js` → `calculateSettlement()` — uses string comparison
- `annual-report.js` — yet another approach

**Fix:** Centralise into `utils.js`:

```javascript
export function filterByDateRange(transactions, start, end) {
  return transactions.filter(t => t.date >= start && t.date <= end);
}

export function filterByMonth(transactions, month) {
  return transactions.filter(t => t.date.startsWith(month));
}
```

---

## 2. Outdated / Legacy Patterns

### 2.1 Raw Promise Wrappers Instead of Async/Await

`db.js` wraps every IndexedDB call in `new Promise((resolve, reject) => {...})`. While IndexedDB doesn't natively support promises, the wrapper layer could expose a cleaner async interface and internal callers already `await` the results.

**Impact:** Verbose, hard to compose, error-prone (easy to forget reject paths).

### 2.2 `innerHTML` for Rendering

Used extensively in:
- `ui.js` → `updateTransactionsList()`, `updateMonthFilters()`, `updateGroupedView()`
- `accounts.js` → `renderNetWorthDashboard()`, `renderAccountManager()`
- `budget.js` → `renderBudgetList()`, `renderBudgetAlerts()`
- `goals.js` → `renderGoalsDashboard()`
- `settlement.js` → `renderSettlementDashboard()`

While `sanitizeHTML()` is used for user content, template literals with `innerHTML` are fragile — any missed escaping is an XSS vector. The DocumentFragment approach in `updateTransactionsList` is the right direction but is inconsistently applied.

**Recommendation:** Adopt a lightweight template rendering approach (render functions returning DocumentFragments or using `createElement` with a helper) consistently across all render functions. At minimum, audit every `innerHTML` assignment for unescaped interpolations.

### 2.3 `localStorage` for Structured Data

Tag colors, alert history, exchange rate history, and backup settings all live in `localStorage` with manual JSON parse/stringify. This creates a parallel storage system alongside IndexedDB, with no transactional guarantees or migration path.

**Recommendation:** Consolidate into IndexedDB `appSettings` store (one key per settings domain) or at minimum create a `localStore.js` wrapper with validation.

### 2.4 Event Binding Without AbortController

`app.js` binds 100+ event listeners at startup. None use `AbortController` / signal-based cleanup. If any view is conditionally mounted/unmounted, stale listeners leak.

Currently not a practical issue (SPA with no route teardown), but makes future refactoring to component-based rendering impossible.

### 2.5 No `structuredClone` Usage

Object spreading (`{ ...account, ...updates }`) is used for shallow copies. Multi-level objects (like `DEFAULT_APP_SETTINGS.enabledFields`) could be corrupted by mutation.

```javascript
// Current (risky)
settings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));

// Modern
settings = structuredClone(DEFAULT_APP_SETTINGS);
```

### 2.6 String-Based Date Comparisons

The codebase uses `t.date.startsWith(month)` and `t.date >= start && t.date <= end` for date filtering. While this works for ISO strings, it's a convention that breaks if date formats change and is harder to reason about.

### 2.7 No Use of Modern Collection Methods

- `Array.prototype.groupBy` (Stage 4 / available via `Object.groupBy`) would simplify grouped views
- `Map` and `Set` are underused — most aggregations use plain objects
- `Array.prototype.at(-1)` could replace `arr[arr.length - 1]`

---

## 3. Architectural Issues

### 3.1 God Module: `app.js` (1,699 lines)

This file does **four distinct jobs**:
1. Error logging setup (global handlers)
2. Import orchestration (100+ named imports)
3. Event binding (~800 lines of `bindXxxEvents()` functions)
4. App lifecycle (init, form submission handler)

**Recommendation:** Split into:
- `js/error-log.js` — global error handler setup
- `js/events/` folder — one file per feature domain (accounts-events.js, goals-events.js, etc.)
- `js/init.js` — app bootstrap (or keep slim app.js)

### 3.2 State Module Overloaded

`state.js` exports:
- Runtime state object
- Constants (DB config, pagination, account types)
- Category definitions (business logic)
- Currency definitions (reference data)
- DOM cache utility (`getDOM()`)

**Recommendation:** Split into:
- `js/state.js` — only the mutable state object
- `js/constants.js` — DB config, pagination, account types, payment methods
- `js/categories.js` — category tree + helper functions
- `js/currencies.js` — currency data (already have `currency.js` for logic, merge or separate clearly)

### 3.3 Tight Coupling via Direct Imports

Every module imports from 3–6 other modules. The dependency graph is a web:

```
accounts.js → db.js, currency.js, utils.js, state.js
alerts.js → state.js, currency.js, accounts.js, savings.js
forecast.js → state.js, currency.js, utils.js, accounts.js, recurring.js
savings.js → state.js, currency.js, accounts.js (via store)
```

There is no abstraction layer. If you change `getAccountBalance()` signature, you must update `alerts.js`, `forecast.js`, `savings.js`, etc.

**Recommendation:** Consider a thin service layer or at minimum group related modules into feature folders:

```
js/
  core/
    state.js
    constants.js
    db.js
    db-helpers.js
    utils.js
    events.js (generic event bus)
  features/
    accounts/
      accounts.js (logic)
      accounts-ui.js (rendering)
    budgets/
      budget.js
      budget-ui.js
    ...
  ui/
    ui.js (core rendering)
    chart.js
    modals.js (generic helpers)
```

### 3.4 Render Functions Mix Logic and Presentation

`accounts.js` has both `getAccountBalance()` (pure computation) and `renderNetWorthDashboard()` (DOM manipulation with innerHTML). Same pattern in `budget.js`, `goals.js`, `savings.js`, `alerts.js`.

**Recommendation:** Separate computation from rendering. Each feature module should export:
1. Pure functions (business logic, calculations) — testable without DOM
2. Render functions (DOM manipulation) — in a separate `-ui.js` file

### 3.5 No Pub/Sub or Event Bus

When a transaction is added, `app.js` manually calls `updateUI()`, `renderBudgetAlerts()`, `runAlertChecks()`, etc. Adding a new feature that reacts to transactions means editing `app.js`.

**Recommendation:** A simple custom event bus:

```javascript
// events.js
const bus = new EventTarget();
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, handler) => bus.addEventListener(name, handler);
```

Then features self-register: `on('transaction:added', () => renderBudgetAlerts())`.

---

## 4. Specific Modernisation Recommendations

### 4.1 Replace `new Promise` IDB wrappers with a generic async layer

Estimated savings: **~400 lines** from db.js.

### 4.2 Use `structuredClone` instead of `JSON.parse(JSON.stringify(...))`

```diff
-const settings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
+const settings = structuredClone(DEFAULT_APP_SETTINGS);
```

### 4.3 Use `Object.groupBy` for transaction grouping

```javascript
// Current (ui.js grouped view)
const groups = {};
transactions.forEach(t => {
  const key = t.date.slice(0, 7);
  if (!groups[key]) groups[key] = [];
  groups[key].push(t);
});

// Modern
const groups = Object.groupBy(transactions, t => t.date.slice(0, 7));
```

**Note:** `Object.groupBy` is ES2024 and available in all modern browsers. Check your PWA target matrix.

### 4.4 Use Optional Chaining and Nullish Coalescing Consistently

Already used in some places, but inconsistent:
```javascript
// Found in multiple files:
const opening = account.openingBalance || 0;  // treats false/0 as falsy
// Better:
const opening = account.openingBalance ?? 0;
```

### 4.5 Use Private Fields for Module-Scoped State

```javascript
// alerts.js currently:
let alertHistory = [];
let dismissedAlerts = new Set();

// Could be encapsulated in a class or just stay as module-scoped (fine for ES modules).
// But consider exporting a frozen API object rather than individual functions.
```

### 4.6 Replace `setTimeout(() => ..., 200)` Blur Hacks

```javascript
// transfer.js
input.addEventListener("blur", () => {
  setTimeout(() => { suggestionsEl.hidden = true; }, 200);
});

// Modern: use focusout + relatedTarget, or pointerdown (fires before blur)
suggestionsEl.addEventListener("pointerdown", (e) => e.preventDefault());
```

### 4.7 Use `crypto.randomUUID()` ✅ Already Done

Good — already using this in `utils.js`.

### 4.8 Use `AbortController` for Cleanup-Ready Listeners

```javascript
const controller = new AbortController();
element.addEventListener("click", handler, { signal: controller.signal });
// Later: controller.abort() removes all listeners registered with that signal
```

---

## 5. File Organisation Proposal

### Current Structure (flat)
```
js/
  24 files, all at root level
```

### Proposed Structure
```
js/
  core/
    state.js          (mutable state only)
    constants.js      (DB config, pagination, account types, payment methods)
    categories.js     (category tree + helpers)
    currencies.js     (currency data)
    db.js             (IndexedDB init + migration + generic helpers)
    utils.js          (pure utilities)
    events.js         (simple pub/sub bus)
    modal.js          (generic open/close/backdrop)
    autocomplete.js   (reusable dropdown)
  
  features/
    transactions/
      validation.js
      form.js         (form submission logic, currently in app.js)
    accounts/
      accounts.js     (balance calc, CRUD)
      accounts-ui.js  (render functions)
    budgets/
      budget.js
      budget-ui.js
    recurring/
      recurring.js
    search/
      search.js
      tags.js
    alerts/
      alerts.js
    goals/
      goals.js
      goals-ui.js
    savings/
      savings.js
    forecast/
      forecast.js
    settlement/
      settlement.js
    multi-currency/
      multi-currency.js
    reconciliation/
      reconciliation.js
    backup/
      auto-backup.js
      import-export.js
    reports/
      chart.js
      annual-report.js
  
  app.js              (slim: imports, init, SW registration)
  ui.js               (master updateUI, summary, transaction list, pagination)
  settings.js         (dark mode, version, settings tab)
```

---

## 6. Quick Wins (Low Risk, High Impact)

| # | Change | Lines Saved | Risk |
|---|--------|-------------|------|
| 1 | Extract `idbGetAll`/`idbPut`/`idbDelete` helpers in db.js | ~400 | Low |
| 2 | Extract `toDateStr(date)` + `getLastNMonths(n)` into utils.js | ~60 | Low |
| 3 | Extract `openModal(id)` / `closeModal(id)` helper | ~80 | Low |
| 4 | Replace `JSON.parse(JSON.stringify(...))` with `structuredClone` | ~10 | Low |
| 5 | Replace `|| 0` with `?? 0` where numeric defaults are intended | ~20 | Low |
| 6 | Extract `bindAccountAutocomplete` into reusable `createAutocomplete` | ~60 | Medium |
| 7 | Split app.js event sections into per-feature files | ~800 (moved) | Medium |
| 8 | Split state.js into state + constants + categories | ~100 (moved) | Medium |

---

## 7. Summary

**Strengths:**
- Consistent ES module usage throughout
- Good separation of validation from save logic
- `DocumentFragment` rendering in transaction list (good perf practice)
- `sanitizeHTML` discipline for user content
- Lazy loading for optional modules (FAQ, import-export)
- Well-documented module responsibilities in CLAUDE.md

**Weaknesses:**
- Massive duplication in IndexedDB layer (~30 near-identical functions)
- 1,699-line god module (app.js) that requires editing for every new feature
- Mixed concerns: business logic and DOM rendering live in the same modules
- No event-driven architecture — adding features requires touching app.js
- Inconsistent data storage (localStorage vs IndexedDB) for configuration
- No TypeScript / JSDoc typing (acceptable given zero-dep constraint, but JSDoc would help)

**Priority Order:**
1. **db.js generic helpers** — biggest bang for effort, purely internal refactor
2. **Split app.js** — reduces merge conflicts, makes each feature self-contained
3. **Separate logic from rendering** — enables unit testing of business logic
4. **Event bus** — decouples features, makes extensibility trivial
5. **Folder restructure** — last step, after the above are stable
