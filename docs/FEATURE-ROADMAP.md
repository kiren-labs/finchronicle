# FinChronicle Feature Roadmap (Revised March 2026)

> Last updated: 2026-03-24
> Previous plan: 2026-02-19

---

## Project Status

| Version | Feature | Status |
|---------|---------|--------|
| v3.10.2 | Transaction Validation Layer | DONE |
| v3.10.4 | ES Module Refactoring | DONE (unplanned) |
| v3.10.5 | Category Pie Chart + WCAG fixes | DONE |
| v3.11.0 | Recurring Transactions | NOT STARTED (overdue) |
| v3.12.0 | Complete Reports (trends, weekly) | NOT STARTED |
| v3.13.0 | Budget Limits & Alerts | NOT STARTED |
| v3.14.0 | Tags & Search | NOT STARTED |
| v3.15.0 | Optional Fields System | NOT STARTED |
| v3.16.0 | Split Transactions | NOT STARTED |
| v3.17.0 | Savings Goals | NOT STARTED |
| v3.18.0 | Receipt Photos | NOT STARTED |

---

## What Changed from the February 2026 Plan

### Wins

1. **Refactoring completed (v3.10.4)** — Not in the original plan. The codebase is now ES modules with lazy loading, making every future feature cleaner to add. New features get their own `js/` module.

2. **Pie chart shipped early (v3.10.5)** — Part of v3.12.0 Reports is already done. The chart infrastructure (`js/chart.js`, `css/chart.css`, `--chart-c1..c8` tokens) is in place.

3. **Foundation is solid** — All transactions on IndexedDB, validation layer live, architecture modular. The risky groundwork is behind us.

### Adjustments

1. **v3.12.0 is lighter** — Pie chart is done. Remaining work is bar/trend charts.
2. **Optional Fields moved to v3.15.0** — It's complex (7 fields, toggle system, IDB settings store, analytics conditionals). Budget Limits and Tags/Search have higher daily value for typical users and should come first.
3. **Tags & Search bumped to v3.14.0** — Basic UX expectation. Relatively simple (one new IDB index, a search input). Should not be after Split Transactions.
4. **Split Transactions moved to v3.16.0** — Medium complexity, niche use case. Stays in the plan but lower priority.
5. **Savings Goals moved to v3.17.0**, Receipt Photos to v3.18.0.

---

## Architecture Foundation (Current)

**Module structure:**

| Module | Responsibility |
|--------|---------------|
| `js/app.js` | Entry point — imports, DOM events, SW registration |
| `js/state.js` | `state` object, `APP_VERSION`, `DB_VERSION`, `categories`, `getDOM()` |
| `js/db.js` | All IndexedDB operations |
| `js/ui.js` | All DOM rendering, `updateUI()` master refresh |
| `js/validation.js` | `validateTransaction()` |
| `js/utils.js` | `formatCurrency`, `formatDate`, `showMessage`, `sanitizeHTML` |
| `js/settings.js` | Dark mode, SW update flow |
| `js/currency.js` | Currency selector |
| `js/chart.js` | Category pie chart (added v3.10.5) |
| `js/faq.js` | Lazy-loaded |
| `js/import-export.js` | Lazy-loaded |

**Transaction schema (current):**
```javascript
{
  id: number,              // Date.now()
  type: 'expense' | 'income',
  amount: number,
  category: string,
  date: 'YYYY-MM-DD',
  notes: string,
  createdAt: ISO8601
}
```

**IndexedDB:**
- DB: `FinChronicleDB`, DB_VERSION: 1
- Store: `transactions`
- Indexes: `date`, `type`, `category`, `dateType` (composite)

---

## Phased Release Plan

---

### v3.11.0 — Recurring Transactions
**Priority: HIGH (was due mid-March 2026, now overdue)**
**New file: `js/recurring.js`**

The most-requested feature. Auto-generate predictable monthly expenses (rent, subscriptions, salary).

**New IDB store: `recurringTemplates` (DB_VERSION → 2)**

```javascript
{
  id: number,
  type: 'expense' | 'income',
  amount: number,
  category: string,
  notes: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
  dayOfMonth: number | 'last',
  startDate: 'YYYY-MM-DD',
  nextDueDate: ISO8601,
  lastExecuted: ISO8601 | null,
  enabled: boolean,
  createdAt: ISO8601
}
// Indexes: nextDueDate, enabled
```

**Core logic:**

```javascript
// js/recurring.js
async function checkRecurringTransactions() {
  const now = new Date();
  const templates = await loadEnabledTemplates();

  for (const template of templates) {
    const nextDue = new Date(template.nextDueDate);
    if (now >= nextDue) {
      await generateTransaction(template);
      await updateNextDueDate(template);
    }
  }
}

function computeNextDueDate(template) {
  const current = new Date(template.nextDueDate);
  switch (template.frequency) {
    case 'daily':    current.setDate(current.getDate() + 1); break;
    case 'weekly':   current.setDate(current.getDate() + 7); break;
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      if (template.dayOfMonth === 'last') {
        return new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString();
      }
      current.setDate(Math.min(template.dayOfMonth, daysInMonth(current)));
      break;
    case 'yearly': current.setFullYear(current.getFullYear() + 1); break;
  }
  return current.toISOString();
}
```

**Check runs on:**
- App startup (in `app.js` after `loadDataFromDB`)
- Each tab switch (cheap: only runs if `nextDueDate` is past)

**UI (Settings tab — new section):**
- List of recurring templates with enable/pause toggle
- Add/Edit/Delete modal (same fields as transaction form + Frequency + Start Date)
- Generated transactions marked with `recurringId` field referencing the template

**Transaction schema addition:**
```javascript
recurringId: number | null   // null for manual transactions
```

**Files:**
- `js/recurring.js` (new) — CRUD, check logic, date computation
- `js/db.js` — add `recurringTemplates` store in `onupgradeneeded`
- `js/state.js` — bump `DB_VERSION` to 2
- `js/app.js` — import recurring.js, call `checkRecurringTransactions()` on init
- `index.html` — recurring section in Settings tab, modal HTML
- `css/styles.css` — recurring list styles, pause/enable toggle
- `css/dark-mode.css` — dark mode support
- `sw.js` — add `js/recurring.js` to `CACHE_URLS`, bump cache version

---

### v3.12.0 — Reports: Complete the Visualization Suite
**Priority: HIGH**
**Builds on: pie chart infrastructure already in `js/chart.js`**

The category pie chart is live. This release completes the Reports section with trend and comparison charts.

**Remaining charts to build:**

1. **Income vs Expense Bar Chart** (monthly, last 6-12 months)
   - Side-by-side bars per month using CSS height percentages
   - Same `--chart-c*` tokens from `css/chart.css`

2. **Week-over-Week Spending**
   - Last 4 weeks comparison
   - Color-coded trend arrows (up/down vs previous week)

3. **Best/Worst Spending Days**
   - Heatmap-style row showing day-of-month spending patterns
   - Useful for spotting payday splurge patterns

**Date range selector:**
- Dropdown: Last 3 months / 6 months / 1 year / All time
- Default: Last 6 months
- All charts respond to the same selector

**Report caching (performance):**
```javascript
// In js/chart.js or js/reports.js
let reportCache = {
  dateRange: null,
  transactionCount: 0,
  data: null,
  timestamp: null
};
// Invalidate on: new/deleted transaction, date range change
// Cache TTL: 5 minutes (for live use)
```

**Files:**
- `js/chart.js` — add new chart renderers alongside existing pie chart
- `index.html` — add chart containers in Groups/Reports tab
- `css/chart.css` — bar chart, week comparison, day heatmap styles
- `css/dark-mode.css` — chart dark mode
- `sw.js` — bump cache version

---

### v3.13.0 — Budget Limits & Alerts
**Priority: HIGH**
**New file: `js/budget.js`**

Set monthly spending limits per category with visual warnings when approaching or exceeding.

**New IDB store: `budgets` (DB_VERSION → 3)**

```javascript
{
  id: number,
  category: string,
  monthlyLimit: number,
  alertThreshold: number,   // 0-100, default 80 (80%)
  rolloverEnabled: boolean,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
// Index: category (one budget per category)
```

**Budget rollover (envelope budgeting):**
```javascript
function getAvailableBudget(category, month) {
  const budget = getBudget(category);
  const spent = getCategorySpending(category, month);
  let available = budget.monthlyLimit;

  if (budget.rolloverEnabled) {
    const prevMonth = getPreviousMonth(month);
    const prevSpent = getCategorySpending(category, prevMonth);
    const savings = budget.monthlyLimit - prevSpent;
    if (savings > 0) available += savings;
  }

  return { available, spent, remaining: available - spent, pct: (spent / available) * 100 };
}
```

**Alert logic:** Checked on every `saveTransaction()`. Shows a non-blocking warning if threshold crossed.

**UI:**
- Budget section in Settings tab: list all categories, set limit, see current month status
- Budget status card in Groups tab: aggregate view ("2 categories over budget")
- Progress bar per category (green < threshold, yellow approaching, red over)
- Transaction list: small badge on transactions in over-budget categories

**Files:**
- `js/budget.js` (new) — CRUD, check logic, rollover calculation
- `js/db.js` — add `budgets` store
- `js/state.js` — bump `DB_VERSION` to 3
- `js/app.js` — import budget.js, call budget check after each save
- `index.html` — budget management UI
- `css/styles.css` — progress bars, status badges
- `sw.js` — bump cache version

---

### v3.14.0 — Tags & Search
**Priority: MEDIUM-HIGH**

Basic but high-impact UX: find transactions fast and group by custom tags.

**Schema addition (DB_VERSION → 4):**
```javascript
tags: string[]   // default: []
// New IDB index: tags (multiEntry: true) on transactions store
```

**Search:**
- Search bar in List tab header
- Real-time filter on: amount (exact/range), category, notes text, tags
- Works alongside existing month + category filters
- No new IDB store needed — client-side filter over `state.transactions`

**Tags:**
- Chip-style multi-tag input in transaction form
- Autocomplete from existing tags in state
- Click tag in transaction list to filter by it
- Tag management in Settings: rename (updates all transactions), delete

**Files:**
- `js/search.js` (new) — search + tag filter functions
- `js/db.js` — bump DB version, add `tags` index to transactions store
- `js/state.js` — bump `DB_VERSION` to 4
- `js/app.js` — import search.js, bind search input events
- `index.html` — search bar, tag input in form, tag chips in list
- `css/styles.css` — tag chips, search bar
- `sw.js` — bump cache version

---

### v3.15.0 — Optional Fields System
**Priority: MEDIUM**
**New file: `js/optional-fields.js`**

User-controlled optional transaction fields. Power users enable what they need; basic users see a clean form.

**New IDB store: `appSettings` (DB_VERSION → 5)**
```javascript
{
  id: 'config',
  enabledFields: {
    paymentMethod: false,
    account: false,
    merchant: false,
    expenseType: false,
    attachedTo: false,
    referenceId: false,
    location: false
  },
  appVersion: '3.15.0',
  lastUpdated: ISO8601
}
```

**Transaction schema additions (all nullable):**
```javascript
paymentMethod: string | null,   // 'cash' | 'upi' | 'credit-card' | 'debit-card' | 'wallet' | 'bank-transfer' | 'other'
account: string | null,         // free text
merchant: string | null,        // free text with autocomplete
expenseType: string | null,     // 'personal' | 'business' | 'tax-deductible' | 'reimbursable'
attachedTo: string | null,      // 'self' | 'spouse' | free text
referenceId: string | null,     // UPI ID, invoice number
location: string | null         // city/area, free text
```

**Key behaviors:**
- Disabled fields do not appear in the transaction form
- Disabling a field hides it but never deletes its data
- Editing a transaction that has data in a disabled field: temporarily show that field with an info badge
- Auto-detect on first load: if any transaction has data in a field, mark it as enabled
- Reports and budget charts conditionally show breakdowns for enabled fields only

**Settings UI:** "Additional Transaction Fields" section with a toggle per field.

**Files:**
- `js/optional-fields.js` (new) — field config, dynamic form rendering, safe get/set
- `js/db.js` — add `appSettings` store
- `js/state.js` — bump `DB_VERSION` to 5
- `js/app.js` — import optional-fields.js
- `index.html` — field toggle section in Settings, "Additional Details" collapsible in form
- `css/styles.css` — toggle list, info badges, collapsible section
- `sw.js` — bump cache version

---

### v3.16.0 — Split Transactions
**Priority: MEDIUM**

Divide one transaction across multiple categories (e.g. ₹1,000 grocery run = ₹600 Food + ₹400 Household).

**Schema additions:**
```javascript
isSplit: boolean,   // default: false
splits: [{ category: string, amount: number, notes: string }]
```

**Balance validation (accounting integrity):**
```javascript
function validateSplitTransaction(tx) {
  const splitTotal = tx.splits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.abs(tx.amount - splitTotal);
  if (diff > 0.01) {
    return { valid: false, error: `Split total ${formatCurrency(splitTotal)} != transaction ${formatCurrency(tx.amount)}` };
  }
  return { valid: true };
}
```

Auto-balance last split option available in the UI.

**Category reports and budget tracking count split amounts correctly per category.**

**Files:**
- `js/validation.js` — add `validateSplitTransaction()`
- `js/app.js` — integrate split logic into save/edit flows
- `index.html` — split toggle + split editor UI in form, split badge in list
- `css/styles.css` — split editor, balance indicator
- `sw.js` — bump cache version

No DB version bump needed (new fields are nullable/default on existing transactions).

---

### v3.17.0 — Savings Goals
**Priority: MEDIUM**
**New file: `js/goals.js`**

Track progress toward savings targets (vacation fund, emergency fund, etc.).

**New IDB store: `savingsGoals` (DB_VERSION → 6)**
```javascript
{
  id: number,
  name: string,
  targetAmount: number,
  currentAmount: number,
  deadline: 'YYYY-MM-DD',
  createdAt: ISO8601
}
// Index: deadline
```

**UI:** Goals section in Summary tab. Circular progress indicators. Manual contribution button. Milestone celebrations at 25/50/75/100%.

**Files:**
- `js/goals.js` (new) — CRUD, progress calculation, milestone detection
- `js/db.js` — add `savingsGoals` store
- `js/state.js` — bump `DB_VERSION` to 6
- `js/app.js` — import goals.js
- `index.html` — goals section
- `css/styles.css` — circular progress, goal cards
- `sw.js` — bump cache version

---

### v3.18.0 — Receipt Photos
**Priority: LOW**
**New file: `js/receipts.js`**

Attach photo receipts to transactions. Conservative storage: 500KB max per image with Canvas-based compression.

**New IDB store: `receipts` (DB_VERSION → 7)**
```javascript
{
  id: number,
  transactionId: number,
  imageBlob: Blob,
  fileName: string,
  fileSize: number,
  uploadedAt: ISO8601
}
// Index: transactionId
```

**Storage safeguards:**
- Pre-flight `navigator.storage.estimate()` check before upload
- Refuse upload if >95% quota used; warn at 80%
- Adaptive compression quality based on available space
- Storage usage dashboard in Settings
- Cleanup prompt for receipts older than 1 year

**Implementation notes:**
- Canvas API for JPEG compression (target 800px max width, quality 0.7)
- Lightbox modal for viewing receipts in-app
- Download original button
- DO NOT cache receipt blobs in service worker

---

## Release Timeline

| Version | Feature | DB Version | Priority |
|---------|---------|-----------|---------|
| v3.11.0 | Recurring Transactions | 2 | HIGH (overdue) |
| v3.12.0 | Reports: Trend + Weekly Charts | 2 | HIGH |
| v3.13.0 | Budget Limits + Rollover | 3 | HIGH |
| v3.14.0 | Tags & Search | 4 | MEDIUM-HIGH |
| v3.15.0 | Optional Fields System | 5 | MEDIUM |
| v3.16.0 | Split Transactions | 5 | MEDIUM |
| v3.17.0 | Savings Goals | 6 | MEDIUM |
| v3.18.0 | Receipt Photos | 7 | LOW |

---

## DB Schema Evolution

| DB Version | App Version | Change |
|-----------|------------|--------|
| 1 | v3.10.x | transactions store (current) |
| 2 | v3.11.0 | + recurringTemplates store |
| 3 | v3.13.0 | + budgets store |
| 4 | v3.14.0 | + tags index on transactions |
| 5 | v3.15.0 | + appSettings store; optional fields on transactions (nullable) |
| 6 | v3.17.0 | + savingsGoals store |
| 7 | v3.18.0 | + receipts store |

---

## Core Principles (Non-Negotiable)

1. Zero dependencies — no npm, no frameworks
2. No external network calls
3. Offline-first — every feature works without internet
4. Privacy-first — all data stays on device
5. IndexedDB for transactions and feature data; localStorage only for the small settings already there
6. Always use `textContent` for user content, never `innerHTML`; always call `sanitizeHTML()` before saving notes
7. Every release: bump `APP_VERSION` in `js/state.js`, `CACHE_NAME` in `sw.js`, `version` in `manifest.json`, and update `CHANGELOG.md`
