# FinChronicle Hardening Plan

> Stop feature treadmill. Make what exists durable, testable, accountant-correct.

Based on [challenge.md](challenge.md) audit against actual codebase (v3.28.0, May 2026).

---

## Phase 1: Engineering Foundation (v3.29.0)

Do ALL of these before any new feature. Each is small, low-risk, high-impact.

### 1.1 Storage Persistence — `navigator.storage.persist()`

**Problem:** Safari iOS purges IndexedDB after 7 days of inactivity. Chrome can evict under storage pressure. Users lose years of financial data silently.

**Current state:** `auto-backup.js` has `checkStorageHealth()` using `navigator.storage.estimate()` but never calls `persist()`.

**Fix:**
- Call `navigator.storage.persist()` in `app.js` after `initDB()` succeeds
- Store result in state, display in Settings → Data Safety section
- If denied, show persistent yellow warning: "Browser may delete your data. Add to Home Screen and export backups regularly."

**Files:** `js/app.js`, `js/settings.js`
**Risk:** None. Read-only browser API. Worst case: browser says "no."

---

### 1.2 Content Security Policy

**Problem:** No CSP meta tag. Any injected script executes freely.

**Current state:** No `Content-Security-Policy` in `index.html`.

**Fix:** Add to `<head>`:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; img-src 'self' data: blob:; script-src 'self';">
```

- `'self'` for scripts — no inline scripts (already true, all ES modules)
- `'unsafe-inline'` for styles — needed for conic-gradient chart and dynamic style attributes
- `cdn.jsdelivr.net` for Remix Icon font only
- `data:` and `blob:` for icons and backup downloads

**Files:** `index.html`
**Risk:** Low. Test that Remix Icons still load and chart renders. If conic-gradient breaks, adjust.

---

### 1.3 Replace `Date.now()` IDs with `crypto.randomUUID()`

**Problem:** ID collisions possible during CSV import (bulk), recurring template batch processing, and rapid entry. Import code already works around it with `Date.now() + i` increment hack.

**Current state:** 7 files use `Date.now()` for IDs:
- `js/app.js` — new transactions
- `js/goals.js` — savings goals
- `js/budget.js` — budgets
- `js/accounts.js` — accounts
- `js/quick-entry.js` — templates
- `js/recurring.js` — recurring templates + batch-generated transactions
- `js/import-export.js` — CSV import

**Fix:**
- Add `generateId()` to `js/utils.js`: returns `crypto.randomUUID()` (string)
- Replace all `Date.now()` ID assignments with `generateId()`
- IndexedDB stores already use `keyPath: "id"` — strings work fine as keys
- Existing numeric IDs stay as-is (no migration needed, IDB doesn't care about type consistency in key values)
- Update `import-export.js` to use `generateId()` instead of `Date.now() + i` hack

**Files:** `js/utils.js`, `js/app.js`, `js/goals.js`, `js/budget.js`, `js/accounts.js`, `js/quick-entry.js`, `js/recurring.js`, `js/import-export.js`
**Risk:** Low. String IDs are valid IDB keys. Existing code compares IDs with `===` or `.find()`, both work with strings. One concern: `shouldShowBackupReminder()` in `settings.js` treats `firstTransaction.id` as a timestamp — that logic needs adjustment.

---

### 1.4 innerHTML Audit

**Problem:** Critique claims XSS risk from innerHTML + template literals. Partially mitigated — `sanitizeHTML()` IS used in most places.

**Current state (verified):**
- ✅ `ui.js` transaction rendering — uses `sanitizeHTML()` on notes, category, accounts, tags, merchant, attachedTo, location
- ⚠️ `quick-entry.js` — template names rendered via innerHTML, need to verify `sanitizeHTML()` usage
- ⚠️ `settlement.js` — person names from `attachedTo` tag, need to verify
- ⚠️ `recurring.js` — template names in modal, tag suggestions
- ⚠️ `goals.js` — goal names in rendered HTML

**Fix:**
- Audit every innerHTML assignment across all 23 modules
- Ensure every user-sourced value passes through `sanitizeHTML()` before insertion
- Add code comment convention: `// SAFE: sanitized` next to verified innerHTML sites
- Long-term: migrate to DocumentFragment + textContent pattern (already started in ui.js line 204)

**Files:** All `js/*.js` files with innerHTML usage
**Risk:** None. Only adding sanitization where missing.

---

### 1.5 Local Error Log

**Problem:** No `window.onerror` or `unhandledrejection` handler. Finance app that silently fails to save is worst failure mode. Users have no way to report crashes.

**Fix:**
- Add global error handler in `app.js` (top of file, before any imports)
- Store last 50 errors in localStorage key `errorLog` (array of `{timestamp, message, stack}`)
- Add "Error Log" section in Settings with "Copy to Clipboard" button
- Clear log button

**Files:** `js/app.js`, `js/settings.js`
**Risk:** None. Catch-only, no behavior change.

---

### 1.6 Backup Urgency Upgrade

**Problem:** Auto-backup is opt-in. Backup reminder threshold is 30 days. For a finance app, that's too relaxed.

**Current state:** `shouldShowBackupReminder()` returns true after 30 days or 7 days from first transaction if never backed up.

**Fix:**
- Drop reminder threshold from 30 → 14 days
- Add persistent backup badge to header/nav that turns red after 14 days with no backup
- On first launch with >5 transactions and no backup ever: show one-time modal explaining data durability risk
- Auto-backup default: change from `false` to `true` (weekly, JSON format)

**Files:** `js/settings.js`, `js/auto-backup.js`, `js/app.js`, `index.html` (badge element)
**Risk:** Low. More aggressive prompting, but protects user data.

---

### 1.7 SW Update: visibilitychange Instead of setInterval

**Problem:** `setInterval(() => registration.update(), 60000)` runs even when tab is hidden. Burns CPU on mobile. No multi-tab coordination.

**Current state:** 60-second polling in `app.js` line 1436.

**Fix:**
- Remove `setInterval`
- Add `document.addEventListener('visibilitychange', ...)` — check for updates when tab becomes visible (but throttle to max once per 5 minutes)
- Keep the initial `registration.update()` call on load

**Files:** `js/app.js`
**Risk:** None. Less aggressive checking, same result.

---

## Phase 2: Accounting Model (v4.0.0)

The structural fixes. These change the data model. Requires DB_VERSION bump.

### 2.1 Account Type Classification: Asset vs Liability

**Problem:** Critique says no asset/liability distinction. **Actually partially wrong** — `getNetWorth()` already treats `credit-card` type as liability and negative balances as liability.

**What's still missing:**
- No explicit `isLiability` flag — logic is hardcoded to "credit-card" type name
- No "loan" or "mortgage" account type
- User can't mark a custom account as liability

**Fix:**
- Add to `ACCOUNT_TYPES`: keep existing types, add `loan`, `mortgage`
- Add `classification: 'asset' | 'liability'` field to account schema
- Auto-derive: `credit-card`, `loan`, `mortgage` → liability. Rest → asset.
- Allow user override in account settings
- Update `getNetWorth()` to use `classification` field instead of hardcoded type check
- DB migration: add `classification` field to existing accounts based on type

**Files:** `js/state.js`, `js/accounts.js`, `js/db.js` (migration), `index.html` (account form)
**DB_VERSION:** 11
**Risk:** Medium. Data migration required. Must handle accounts created before this version.

---

### 2.2 Transaction ↔ Account Linking

**Problem:** Regular income/expense transactions don't decrement/increment account balances unless user manually sets fromAccount/toAccount. Net Worth can drift from actual spending.

**Current state:** `getAccountBalance()` in `accounts.js` already sums transactions by `fromAccount`/`toAccount` fields. But only transfers require these fields. Income/expense can be "unlinked."

**Fix:**
- Add optional "Account" dropdown to income/expense transaction form (not just transfers)
- When selected, transaction's `fromAccount` (expense) or `toAccount` (income) is set
- `getAccountBalance()` already handles this — no calculation changes needed
- Default: last-used account (convenience)
- Make it an optional field controlled by `appSettings.enabledFields.accountLinking`
- Do NOT make it mandatory — users who don't track accounts shouldn't be forced

**Files:** `js/app.js` (form), `js/optional-fields.js`, `js/state.js` (settings default), `index.html` (form field)
**Risk:** Low. Additive. Existing transactions continue to work without account links.

---

### 2.3 Reconciliation Workflow

**Problem:** No way to compare app records against bank statement. No concept of cleared/pending.

**Fix:**
- Add `status: 'pending' | 'cleared' | 'reconciled'` field to transaction schema (default: `'cleared'` for backwards compat)
- Add reconciliation screen per account:
  1. User enters statement balance + statement date
  2. App shows all unreconciled transactions for that account up to statement date
  3. User checks off each one
  4. App calculates: opening balance + reconciled transactions = statement balance?
  5. If match: mark all as `'reconciled'`, save reconciliation date
  6. If mismatch: show difference, user decides
- Visual indicator on transaction list for pending vs cleared vs reconciled

**Files:** New `js/reconciliation.js` module, `js/db.js` (migration), `js/ui.js` (status badges), `index.html`, `sw.js` (cache new file)
**DB_VERSION:** 11 (batch with 2.1)
**Risk:** Medium. New module, new DB fields. But fully optional — users who don't reconcile never see it.

---

### 2.4 Category Hierarchy

**Problem:** Flat categories. "Food" is one bucket. Users want Food → Groceries / Restaurants / Delivery.

**Fix:**
- Change `categories` in `state.js` from flat arrays to objects: `{ "Food": ["Groceries", "Restaurants", "Delivery", "Coffee"], ... }`
- Reports roll up to parent by default, drill down on click
- Backwards compatible: existing transactions with "Food" category stay as parent-level
- Filters show parent categories with expand/collapse
- Migration: existing flat categories become parents with no children (user adds subcategories later)

**Files:** `js/state.js`, `js/ui.js` (filters, reports), `js/chart.js` (pie chart), `js/validation.js`, `index.html` (category selector)
**Risk:** Medium-High. Touches many modules. Needs careful migration for existing data. Consider doing this AFTER 2.1-2.3 are stable.

---

## Phase 3: Product Value (v4.1.0+)

Only after Phase 1 and 2 are shipped and stable.

### 3.1 Cash-Flow Forecast

**Problem:** App shows history. Doesn't tell user what next month looks like.

**Data already available:** Recurring templates (with amounts, frequency, next due dates), account balances, budget limits.

**Fix:**
- New "Forecast" tab or section in Reports
- Project each account balance forward 30/60/90 days using enabled recurring templates
- Show timeline: today's balance → projected balance at each recurring event
- Flag accounts that will go negative (red warning)
- Show monthly burn rate vs monthly income rate

**Files:** New `js/forecast.js` module
**Risk:** Low. Read-only projection. No data changes.

---

### 3.2 Financial Health Alerts

**Problem:** Current smart alerts detect patterns (spike, unusual amount, velocity, drift). Missing the alerts households actually need.

**New alert types:**
1. **Inactivity alert:** "No transactions logged in 5 days" — fights app abandonment
2. **Bill due alert:** "Rent is due in 3 days, checking balance is ₹X" — uses recurring templates
3. **Savings rate trend:** "Savings rate below 10% for 3 months" — uses savings.js data
4. **Pace alert:** "Discretionary spending is on track to exceed budget by month end" — uses budget + daily pace

**Files:** `js/alerts.js` (extend existing)
**Risk:** Low. Additive to existing alert system.

---

### 3.3 Test Suite

**Problem:** 23 modules, zero tests, v3.28. Surface area for silent regressions is large.

**Approach:**
- Use `node:test` (built-in, zero dependencies — fits project philosophy)
- Mock IndexedDB with `fake-indexeddb` (one dev dependency only)
- Start with 30 critical-path tests:

**Priority tests:**
1. `validateTransaction()` — 8 tests (valid/invalid for each field, edge cases)
2. `sanitizeHTML()` — 3 tests (script tags, event handlers, normal text)
3. `formatCurrency()` — 3 tests (INR, USD, edge cases)
4. `getAccountBalance()` — 4 tests (income, expense, transfer, mixed)
5. `getNetWorth()` — 3 tests (assets only, liabilities, mixed)
6. Budget calculations — 3 tests (under/at/over budget)
7. Savings rate calculation — 3 tests (normal, zero income, zero expense)
8. CSV import/export round-trip — 3 tests

**Files:** New `tests/` directory, `package.json` (test script only, no prod dependencies)
**Risk:** None. Tests don't ship to users. Dev-only.

---

## Implementation Order

```
v3.29.0 — Phase 1 (all 7 items, can ship incrementally)   ✅ SHIPPED
  ├── 1.1 storage.persist()          ✅
  ├── 1.2 CSP meta tag               ✅
  ├── 1.3 crypto.randomUUID()        ✅
  ├── 1.4 innerHTML audit            ✅
  ├── 1.5 local error log            ✅
  ├── 1.6 backup urgency             ✅
  └── 1.7 SW visibilitychange        ✅

v4.0.0 — Phase 2 (accounting model)                        ✅ SHIPPED 2026-05-23
  ├── 2.1 asset/liability types       ✅ DB_VERSION 11
  ├── 2.2 transaction ↔ account link  ✅ optional-fields system
  ├── 2.3 reconciliation              ✅ js/reconciliation.js, DB_VERSION 12
  └── 2.4 category hierarchy          ✅ optgroup dropdowns, parent-aware filter

v4.1.0 — Phase 3 (product value)                           ← NEXT
  ├── 3.1 cash-flow forecast
  └── 3.2 financial health alerts
```

## What We're NOT Doing (and why)

| Suggestion from critique | Decision | Reason |
|--------------------------|----------|--------|
| Full double-entry accounting | Skip | Account-linked transactions (2.2) gives 90% of the benefit at 10% of the complexity. Not building GnuCash. |
| Integer minor units for amounts | Defer | Correct in theory, but migration is invasive and float precision is acceptable for personal finance at our scale. Revisit if multi-currency math shows drift. |
| Reactive state / pub-sub / Proxy | Defer | Manual `updateUI()` works at current scale. Introduce only when we have tests (3.3) to verify the refactor doesn't break anything. |
| Self-host Remix Icons | Defer | Nice-to-have. CDN has SRI hash. SW caches after first load. |
| Envelope budgeting mode | Defer to v4.2+ | Requires account linking (2.2) first. Good feature, wrong time. |
| i18n / RTL / Intl.NumberFormat | Defer | Scope explosion. Current user base is INR-centric. |
| Tax-relevant tagging | Defer to v4.2+ | Tags already support this informally. Structured tax reporting is v5 territory. |
