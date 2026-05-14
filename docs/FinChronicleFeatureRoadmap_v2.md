# FinChronicle Feature Roadmap

> Last updated: 2026-05-10
> Current version: v3.28.0 (v3.28.1 patch planned)

---

## Project Status — Everything Through v3.28.0 is Complete

All features from the previous roadmap have shipped. The app is now a full personal finance stack built on vanilla JS + IndexedDB with no external dependencies.

| Version | Feature | Released |
|---------|---------|---------|
| v3.10.x | Core app, ES modules, validation, pie chart, WCAG AA | Jan–Mar 2026 |
| v3.11.0 | Recurring Transactions | Mar 2026 |
| v3.12.0 | Complete Reports (bar chart, weekly, heatmap, range selector) | Mar 2026 |
| v3.13.0 | Budget Limits & Alerts | Mar 2026 |
| v3.14.0 | Tags & Full-Text Search | Mar 2026 |
| v3.15.0 | Transfer Transaction Type + Audit Trail (soft delete) | Apr 2026 |
| v3.16.0 | Optional Fields System (payment method, merchant, expense type, attachedTo, referenceId, location) | Apr 2026 |
| v3.17.0 | Quick Entry Templates | Apr 2026 |
| v3.18.0 | Accounts & Net Worth | Apr 2026 |
| v3.19.0 | Savings Rate Dashboard | May 2026 |
| v3.20.0 | Savings Goals with progress + milestones | May 2026 |
| v3.21.0 | Smart Spending Alerts + Annual Report | May 2026 |
| v3.22.0 | Auto-Backup (AES-GCM-256 encryption, storage health) | May 2026 |
| v3.24.0 | Multi-Currency Transactions (per-transaction FX + exchange rate history) | May 2026 |
| v3.26.0 | Family Expense Settlement (per-person balance from `attachedTo` tags) | May 2026 |
| v3.26.1 | Technical fixes (exchange rate validation, error toasts, CLAUDE.md update) | May 2026 |
| v3.27.0 | Reimbursement Workflow (mark-as-settled flow + settlement dashboard breakdown) | May 2026 |
| v3.28.0 | Net Worth Trend (monthly snapshot store + SVG line chart) | May 2026 |
| v3.28.1 | Dashboard & UI/UX fixes (savings rate bug, alert overload, period sync, negative value styling) | May 2026 |

---

## Architecture Snapshot (as of v3.28.0)

**27 JS modules, DB_VERSION 10, 8 IndexedDB stores**

| Store | Purpose | Since |
|-------|---------|-------|
| `transactions` | All transaction data + audit trail (soft-delete) | v3.10 |
| `recurringTemplates` | Recurring templates with due-date tracking | v3.11 |
| `budgets` | Per-category monthly budget limits | v3.13 |
| `appSettings` | Optional fields config + smart category keywords | v3.16 |
| `quickTemplates` | Quick Entry templates (max 20) | v3.17 |
| `accounts` | Account definitions for net worth calculation | v3.18 |
| `savingsGoals` | Savings goals with milestone tracking | v3.20 |
| `netWorthSnapshots` | Monthly net worth snapshots for trend chart | v3.28 |

**Transaction schema fields (as of v3.28.0):**
Core: `id`, `type`, `amount`, `category`, `date`, `notes`, `tags`, `createdAt`, `updatedAt`, `deleted`, `deletedAt`
Transfer: `fromAccount`, `toAccount`, `transferNote`
Optional (v3.16): `paymentMethod`, `merchant`, `expenseType`, `attachedTo`, `referenceId`, `location`
Multi-currency (v3.24): `transactionCurrency`, `exchangeRate`, `homeAmount`
Reimbursement (v3.27): `settled`, `settledAt`, `settledBy`
Recurring link: `recurringId`

---

## Permanently Deferred — Will Not Build

These were considered and consciously ruled out. Revisiting requires a concrete use case and real usage data.

| Feature | Why Not |
|---------|---------|
| Split Transactions | Approximable with tags; only 2–3 qualifying transactions observed in 3 months of real data. High implementation cost for low frequency. |
| Account Reconciliation | Needs bank statement import to be useful. Manual "enter your balance" reconciliation adds complexity with minimal benefit on a single-device personal app. |
| Budget Envelope Groups | Category budgets are granular enough. Envelope grouping would add UI complexity for unclear gain. |
| Recurring Auto-Match Suggestions | Heuristic-based; high false-positive risk. The manual recurring template workflow is already fast. |
| One-Time Expense Flag | Tags (`#one-time`, `#annual`) cover this without a schema change. |
| Contribution-Creates-Transfer in Goals | Auto-created transfers add transactions the user didn't explicitly enter. Confusing in the list. Manual update is cleaner. |
| Account-Linked Expenses | The `account` optional field from v3.16 covers the basic case. Full balance-from-expenses accounting adds complexity for minimal benefit. |

---

## v3.28.1 — Dashboard & UI/UX Fix Patch

**Priority: HIGH (data trust + daily-use friction)**
**No new modules, no DB changes**

This patch resolves bugs and UX anomalies identified from a live-usage screen review. All are purely JS/CSS fixes — no schema change, no new IndexedDB store.

---

### Bug 1 — Savings Rate shows 0.0% when income is ฿0 but savings amount is non-zero
**File:** `js/savings.js`

The savings rate calculation divides saved amount by income. When income is ฿0 in the current month the engine outputs 0.0% — but a non-zero saved amount is also shown, which is contradictory and breaks user trust.

**Fix:** When `totalIncome === 0` for the period:
- Display `"N/A"` for savings rate (not 0.0%)
- Replace the `"Below target"` sub-label with `"No income recorded this month"`
- Do not show a percentage arrow or color indicator
- Keep the saved-amount figure as-is (it reflects transfers to savings accounts)

---

### Bug 2 — Annual Projection shows positive when monthly average is negative
**File:** `js/savings.js`

"Annual Projection: ฿270,000 / -฿22,500/mo avg" is mathematically impossible. The projection is calculated from `monthlyAvg × 12` but uses an absolute value somewhere in the pipeline.

**Fix:**
- If `monthlyAvg < 0`, replace the projection card with: `"On track for deficit: ฿X"` in red
- Remove the sub-label `-฿22,500/mo avg` when the projection card already signals a deficit (redundant)
- Use `--color-danger` token for negative projection values

---

### Bug 3 — Period selector ("All Time") desyncs from KPI card title ("This Month")
**File:** `js/ui.js` → `updateSummary()`

The period dropdown value and the card header label read from different state keys. When the user selects "All Time" the card still hardcodes "This Month".

**Fix:**
- `updateSummary()` must read the active period from `state.currentFilter` and set the card label dynamically:
  - "All Time" → card title: "All Time Total"
  - "This Month" → card title: "This Month"
  - "YYYY-MM" month filter → card title: "Month — MMM YYYY"
  - Custom range → card title: "Range — [start] → [end]"

---

### Bug 4 — Income ฿0 displays a percentage change arrow (+0.0%)
**File:** `js/ui.js` → income summary card render

When both current and previous period income are ฿0, showing "+0.0%" with an arrow implies a comparison was made. It looks broken.

**Fix:** If both `currentIncome === 0` and `previousIncome === 0`, replace the change indicator with an em dash (`—`) and no arrow icon. Only show the arrow when at least one period has non-zero income.

---

### UX 1 — Alert banner overload (5 stacked banners)
**File:** `js/alerts.js`, `css/styles.css`

Five full-width alert banners stack on the dashboard making it feel broken and causing alert fatigue.

**Fix:**
- Collapse alerts into a single summary chip when count > 2: e.g. `"⚠ 3 spending alerts"` with a chevron toggle
- Expanded state shows all banners (toggled by click, state stored in `localStorage` key `alertsExpanded`)
- Add "Dismiss all" button when expanded
- Order: yellow advisory alerts first, red danger alerts second (currently reversed)

---

### UX 2 — Negative net/savings figures use default text color
**Files:** `css/styles.css`, `css/dark-mode.css`

Net loss (`-฿89,472`), negative savings rate (`-16%`), and negative net worth changes all render in the same muted grey as neutral figures. Critical financial signals must visually stand out.

**Fix:**
- Any value rendered via `.summary-amount`, `.kpi-value`, or `.net-value` that is negative → add class `is-negative` → apply `color: var(--color-danger)`
- The JS render functions in `ui.js` / `savings.js` / `annual-report.js` must toggle this class based on the sign of the value
- Do NOT hardcode `color: red` — always use the token

---

### UX 3 — Savings trend chart shows "0%" on empty bars instead of "No data"
**File:** `js/savings.js` → 3-month trend renderer

Bars for months with no transactions show `0%` label, indistinguishable from months that were genuinely 0% savings rate.

**Fix:** When a month bucket has `transactionCount === 0`, render the bar height at 0 but replace the label with `"—"` in muted color. Tooltip on hover: `"No transactions recorded"`.

---

### UX 4 — "Clone Last" button is orphaned from its context
**File:** `index.html`, `css/styles.css`

The "Clone Last" button floats below the Savings section with no visual connection to the Add Transaction form.

**Fix:** Move the button into the Add Transaction card header (right side), next to the form title. Add a `title="Copy last transaction"` tooltip. Visually group it using the existing `.form-header-actions` pattern.

---

### Files to Modify

| File | Change |
|------|--------|
| `js/savings.js` | Fix savings rate ÷0, fix negative projection label |
| `js/ui.js` | Sync period label to filter, fix income ฿0 arrow, add `is-negative` class logic |
| `js/alerts.js` | Collapse to summary chip when > 2 alerts, Dismiss all, fix ordering |
| `js/annual-report.js` | Apply `is-negative` to Net and Savings Rate in year scorecard |
| `index.html` | Move Clone Last button into Add Transaction card header |
| `css/styles.css` | `.is-negative` rule, alert collapse chip styles, Clone Last repositioned styles |
| `css/dark-mode.css` | `.is-negative` dark mode override if needed |
| `js/state.js` | Bump `APP_VERSION` → `3.28.1` |
| `sw.js` | Bump `CACHE_NAME` → `finchronicle-v3.28.1` |
| `manifest.json` | Bump `version` → `3.28.1` |

---

## What Comes Next — Proposed Roadmap v3.29–v3.39

> **Roadmap revised 2026-05-13** — An expert accounting analysis identified three Tier 1 accounting gaps (budget vs actual, cash flow forecast, financial health ratios) and four Tier 2 gaps (subscription tracker, duplicate detection, loan/EMI tracker, bank statement import) that outrank the original v3.29–v3.33 plan in daily impact. The original features are preserved and resequenced after the new additions. Receipt Photos shifts to the end as lowest ROI.

### Priority Framework

Ordering reflects **daily impact × user effort saved**:

- **HIGH** — fills a genuine accounting blind spot or removes primary-loop friction
- **MEDIUM** — meaningful improvement to a specific workflow
- **LOW** — nice-to-have, niche use case, or high implementation cost

---

### v3.29.0 — Budget vs Actual Report
**Priority: HIGH**
**No new module — extends `js/budget.js` and `js/annual-report.js`**

The single fastest win. Budgets exist and alerts exist, but there is no consolidated view showing all categories side-by-side with variance. An accountant's first tool when reviewing monthly spend.

**Report layout (Summary tab → Budget section, replaces current per-card view):**
```
Category       Budget    Actual    Variance    % Used
Food           ฿8,000   ฿6,400    +฿1,600       80%
Transport      ฿5,000   ฿7,200    -฿2,200      144% ⚠
Utilities      ฿3,000   ฿2,950    +฿50          98%
──────────────────────────────────────────────────
Total         ฿16,000  ฿16,550    -฿550        103%
```

**Key behaviors:**
- Period selector synced to `state.currentFilter` (month, all time, custom range)
- Rows with > 100% usage highlighted in `--color-danger`; 80–100% in `--color-warning`
- Categories without a budget limit shown separately at the bottom ("Unbudgeted spend")
- Totals row at the bottom with overall budget adherence
- Export as CSV (reuses existing `exportToCSV` pattern)
- No categories are hidden — 0 spend rows shown as ฿0 / 0%

**Files to modify:**
- `js/budget.js` — `getBudgetVsActual(period)` aggregation function; replace per-card render with table render
- `js/annual-report.js` — reuse aggregation for year-level budget vs actual in the Annual Report
- `index.html` — budget table structure in Summary tab
- `css/styles.css`, `css/dark-mode.css` — budget table, variance column coloring, over-budget row highlight
- Version: bump to 3.29.0

---

### v3.30.0 — Financial Health Ratios
**Priority: HIGH**
**No new module — extends `js/savings.js` or new section in `js/ui.js`**

Beyond savings rate, no diagnostic ratios exist. These four KPIs give a monthly health check on financial position. All are computed from data already in IndexedDB — no new store needed.

**Four ratios (shown as KPI cards in Summary tab, below the existing summary):**

| Ratio | Formula | Healthy Target |
|-------|---------|---------------|
| Emergency Fund | liquid savings balance ÷ avg monthly expenses | ≥ 6 months |
| Debt-to-Income | total monthly debt repayments ÷ monthly income | < 36% |
| Housing Cost | rent/mortgage expense ÷ monthly income | < 30% |
| Savings Rate | amount saved ÷ monthly income | ≥ 20% (already exists in v3.19 — surface here too) |

**Ratio logic:**
```javascript
// Emergency fund: accounts with isSavings:true / avg 3-month expenses
function getEmergencyFundRatio(accounts, transactions) {
  const liquidSavings = getSavingsAccountsBalance(accounts, transactions);
  const avg3MonthExpenses = getAvgMonthlyExpenses(transactions, 3);
  return avg3MonthExpenses > 0 ? liquidSavings / avg3MonthExpenses : null;
}

// Debt-to-income: category 'Debt/Loans' + 'Rent' as % of income this month
function getDebtToIncomeRatio(transactions, month) { ... }

// Housing cost: category 'Rent' as % of income this month
function getHousingCostRatio(transactions, month) { ... }
```

**UI:**
- 4 KPI cards in a 2×2 grid, each showing: ratio value, label, target indicator (green/yellow/red)
- Tapping a card expands a tooltip explaining the ratio and the healthy target
- Cards hidden if insufficient data (< 2 months of transactions)
- Health score summary: "3 of 4 ratios are healthy"

**Files to modify:**
- `js/savings.js` — add ratio calculation functions
- `js/ui.js` — render health ratio cards in Summary tab
- `index.html` — health ratio grid in Summary tab
- `css/styles.css`, `css/dark-mode.css` — ratio card styles, health indicator colors
- Version: bump to 3.30.0

---

### v3.31.0 — Cash Flow Forecast (30/60/90 days)
**Priority: HIGH**
**New file: `js/forecast.js`**

The most strategically important missing feature. The app knows everything about the past but nothing about what's coming. With `recurringTemplates` already in the DB and `accounts` balances available, the data exists to project forward.

**Forecast model:**
```javascript
// For each account, project balance over next 90 days:
function buildCashFlowForecast(accounts, transactions, recurringTemplates, days = 90) {
  const forecast = [];
  const today = new Date();

  for (let d = 0; d <= days; d++) {
    const date = addDays(today, d);
    const dueTemplates = recurringTemplates.filter(t =>
      t.enabled && isOnOrBefore(t.nextDueDate, date)
    );
    // Sum projected income and expenses for this date
    // Accumulate against current account balances
    forecast.push({ date, projectedBalance, income, expenses, events: dueTemplates });
  }
  return forecast;
}
```

**Dashboard (new "Forecast" sub-section in Summary tab):**
- **Runway indicator** — "Based on current balance and known recurring bills, you have enough to cover expenses for 47 days"
- **30-day cash flow summary** — total projected income vs expenses vs net
- **Timeline chart** — SVG line chart (reuses pattern from net worth trend) showing projected balance day-by-day over 90 days
- **Upcoming bills list** — next 30 days of known recurring payments, sorted by date
- **Shortfall alerts** — highlight dates where projected balance goes negative: "On June 28 your balance may drop to -฿4,200 (Rent due)"

**Key behaviors:**
- Only uses `recurringTemplates` with `enabled: true` — no guessing from history
- Account balance is starting point; derived from `accounts` store + all non-deleted transactions
- Does not factor in variable spending (conservative model — only committed recurring items)
- Clearly labelled: "Based on committed recurring transactions only — variable spend not included"
- Updates whenever `recurringTemplates` or `accounts` change

**Files to create/modify:**
- `js/forecast.js` (new) — projection engine, runway calculation, shortfall detection
- `js/accounts.js` — expose `getCurrentAccountBalance(name)` helper for forecast module
- `js/app.js` — import forecast.js, trigger rebuild on recurring/account change
- `index.html` — forecast section in Summary tab
- `css/styles.css`, `css/dark-mode.css` — forecast timeline, runway meter, shortfall highlight
- `sw.js` — add `js/forecast.js` to `CACHE_URLS`, bump cache version
- Version: bump to 3.31.0

---

### v3.32.0 — Subscription Tracker
**Priority: MEDIUM**
**No new module — extends `js/recurring.js`**

A dedicated sub-view showing all active subscriptions with their total monthly cost. People routinely don't know their total subscription spend. This is a filtered render of `recurringTemplates` — relatively low implementation effort for high daily insight.

**What counts as a subscription:**
- Any recurring template with `frequency: 'monthly'` or `frequency: 'yearly'` and `type: 'expense'`
- User can optionally tag a template as `isSubscription: true` for explicit tracking (schema addition, no DB bump — nullable field)

**Dashboard (new section in Recurring tab or Summary tab):**
```
Active Subscriptions                          ฿2,340/month

  Netflix          ฿419/mo    due Jun 15
  Spotify          ฿129/mo    due Jun 20
  iCloud 200GB     ฿99/mo     due Jun 1
  Gym              ฿1,200/mo  due Jun 5
  ...
─────────────────────────────────────────
  Total            ฿2,340/mo  = ฿28,080/yr
  % of Income      18.5% of ฿12,650 avg income
```

**Key behaviors:**
- Monthly and yearly totals shown
- "% of income" calculated from 3-month average income
- Upcoming renewal dates highlighted if due in next 7 days
- Sort by amount (descending) by default
- Filter toggle: show only enabled subscriptions

**Schema addition (nullable, no DB bump):**
```javascript
// In recurringTemplates store — add to existing schema
isSubscription: boolean | null   // null = not tagged; true = explicitly a subscription
```

**Files to modify:**
- `js/recurring.js` — `getSubscriptions()` helper, total calculation
- `js/ui.js` — subscription summary render
- `index.html` — subscription section in Recurring tab
- `css/styles.css`, `css/dark-mode.css` — subscription list, cost highlight
- Version: bump to 3.32.0

---

### v3.33.0 — Duplicate Transaction Detection
**Priority: MEDIUM**
**No new module — extends `js/validation.js`**

When entering a transaction that closely matches an existing one, show a warning before saving. Critical for data integrity — especially once bank statement import (v3.35) is added, where duplicates are common.

**Duplicate detection criteria (all three must match):**
```javascript
function detectDuplicate(candidate, existingTransactions) {
  return existingTransactions.find(tx =>
    !tx.deleted &&
    tx.type === candidate.type &&
    tx.category === candidate.category &&
    Math.abs(tx.amount - candidate.amount) / candidate.amount < 0.05 &&  // within 5%
    Math.abs(daysBetween(tx.date, candidate.date)) <= 2
  );
}
```

**UX:**
- Warning shown inline in the transaction form (not a blocking modal): "This looks like a duplicate of [Mar 15 — Grab — ฿245]. Add anyway?"
- Two buttons: "Yes, add it" (proceeds) / "View existing" (opens the matching transaction)
- Triggered on form submit, before `validateTransaction()`
- Never blocks — user can always override
- If bank statement import is added later, duplicate check runs on every imported row

**Files to modify:**
- `js/validation.js` — `detectDuplicate(candidate, transactions)` function
- `js/app.js` — call `detectDuplicate` in the save handler; show inline warning; handle "add anyway" confirmation
- `index.html` — duplicate warning slot in transaction form
- `css/styles.css` — warning inline banner style (reuse alert token pattern)
- Version: bump to 3.33.0

---

### v3.34.0 — Loan / EMI Tracker
**Priority: MEDIUM**
**New file: `js/loans.js`**

In most markets, home loans, car loans, and personal loans are a regular part of financial life. Currently a user logs each EMI as a recurring expense — but they cannot see outstanding principal, how much of the EMI is interest vs principal, or when the loan pays off. This makes the "Debt-to-Income" ratio from v3.30 incomplete without it.

**New IDB store: `loans` (DB_VERSION → 11)**
```javascript
{
  id: number,
  name: string,              // "Home Loan — SBI", "Car Loan — HDFC"
  principalAmount: number,   // original loan amount
  outstandingPrincipal: number, // updated by user or computed from amortization
  interestRate: number,      // annual % rate
  tenureMonths: number,      // total loan tenure in months
  startDate: 'YYYY-MM-DD',
  emiAmount: number,         // computed: P×r×(1+r)^n / ((1+r)^n - 1)
  linkedRecurringId: number | null, // link to a recurringTemplate for auto-tracking
  isActive: boolean,
  createdAt: ISO8601
}
```

**Amortization schedule computation:**
```javascript
function buildAmortizationSchedule(loan) {
  const r = loan.interestRate / 100 / 12;
  const n = loan.tenureMonths;
  const emi = loan.principalAmount * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1);
  // Generate month-by-month: { month, principal, interest, balance }
}
```

**Loan dashboard (new section in Accounts tab or Summary tab):**
- Total outstanding debt across all active loans
- Per-loan card: outstanding principal, next EMI date, payoff date, total interest remaining
- Amortization table (collapsible) showing first 12 months of schedule
- "Principal paid vs interest paid" donut chart (reuses existing chart infrastructure)
- Early payoff calculator: "If you pay ฿5,000 extra per month, you save ฿1.2L in interest and pay off 14 months early"

**Files to create/modify:**
- `js/loans.js` (new) — loan CRUD, amortization, payoff calculator, debt total
- `js/db.js` — `loans` store, DB_VERSION 11 migration
- `js/state.js` — DB_VERSION 11, `LOANS_STORE` constant
- `js/savings.js` — update `getDebtToIncomeRatio()` to include loan EMIs from `loans` store
- `js/app.js` — import loans.js, bind events
- `index.html` — loan management section
- `css/styles.css`, `css/dark-mode.css` — loan cards, amortization table, payoff calculator
- `sw.js` — add `js/loans.js` to `CACHE_URLS`, bump cache version
- Version: bump to 3.34.0

---

### v3.35.0 — Bank Statement CSV Importer
**Priority: MEDIUM**
**Extends `js/import-export.js` (lazy-loaded)**

Manual entry is the #1 friction point and primary reason people abandon finance apps. The existing CSV export is FinChronicle's own format. This adds a generic column mapper that accepts any bank's CSV export and maps columns to the transaction schema — no fixed format assumed.

**Import flow:**
1. User uploads bank CSV file
2. App reads first 3 rows and displays a column mapper UI:
   ```
   Your file has columns: Date | Description | Debit | Credit | Balance
   Map to:  [Date ▼] [Notes ▼] [Amount (expense) ▼] [Amount (income) ▼] [ignore ▼]
   ```
3. User sets date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD — autodetected where possible)
4. User sets amount sign convention (debit = expense, or single column with negative = expense)
5. Preview table shows first 10 rows as they will be imported
6. Import runs with duplicate detection (v3.33) on every row
7. Summary: "Imported 45 transactions. 3 duplicates skipped. 2 flagged for review."

**Saved column mapping (localStorage):**
- After a successful import, save the column mapping under the bank name (user-named)
- Next import from same bank auto-applies the saved mapping
- Up to 5 saved mappings

**Key behaviors:**
- Runs entirely client-side — file never leaves the device
- Duplicate detection (v3.33) applied to every imported row
- All imported transactions default to `expenseType: null` — user categorizes via Bulk Operations (v3.36)
- Auto-detect category from notes using smart suggestions (v3.16 keyword engine)
- Respects the same `validateTransaction()` + `bulkSaveTransactionsToDB()` pipeline as manual entry
- No DB changes needed

**Files to modify:**
- `js/import-export.js` — add `importFromBankCSV(file, mapping)`, column mapper UI, saved mappings
- `index.html` — bank import section in Settings (lazy-loaded on first use)
- `css/styles.css`, `css/dark-mode.css` — column mapper UI, preview table
- Version: bump to 3.35.0

---

### v3.36.0 — Local Notifications
**Priority: HIGH**
**New file: `js/notifications.js`**

Budget warnings and recurring due-date reminders exist as in-app alerts but go unnoticed when the app isn't open.

**Implementation approach:**
- Use the **Notification API** + Service Worker `showNotification()` — local only, no push server required, works offline
- `Notification.requestPermission()` triggered only from an explicit "Enable reminders" toggle in Settings (never on first launch)
- Graceful fallback: permission denied → show in-app banners instead (already works today)

**Four notification types:**
- **Recurring due** — "Rent is due tomorrow" (triggered on app open if `nextDueDate <= tomorrow`)
- **Budget warning** — "Food budget 80% used with 10 days left" (triggered on transaction save)
- **Inactivity nudge** — "You haven't logged anything in 3 days" (triggered on app open)
- **Backup reminder** — "No backup in 14 days" (triggered on app open, checks `lastAutoBackup`)

**Settings:**
- Per-type enable/disable toggles
- Quiet hours (e.g., 10pm–8am no notifications)
- Notification history (last 10, clearable)

**Files to modify/create:**
- `js/notifications.js` (new) — permission management, trigger logic, quiet hours check
- `js/settings.js` — notification preferences UI
- `js/app.js` — trigger checks on init and on transaction save
- `sw.js` — `notificationclick` handler to open the relevant section of the app
- `index.html` — notification settings section
- `css/styles.css`, `css/dark-mode.css` — preference toggle styles
- `sw.js` — add `js/notifications.js` to `CACHE_URLS`, bump cache version
- Version: bump to 3.36.0

---

### v3.37.0 — Bulk Transaction Operations
**Priority: MEDIUM**

Currently there's no way to recategorize or re-tag multiple transactions at once. This is the biggest friction point when cleaning up historical data (e.g., fixing category drift — nanny salary appearing under 3 different categories over 3 months). Also the essential cleanup step after a bank statement import (v3.35).

**Operations supported:**
- **Bulk recategorize** — select N transactions → change category to X
- **Bulk tag** — add/remove a tag from N transactions
- **Bulk delete** — soft-delete N transactions at once
- **Bulk expenseType** — mark N transactions as reimbursable / business / personal

**UI:**
- "Select" mode toggle button in List tab header
- Tap transactions to add to selection (checkboxes or highlight)
- Sticky action bar at bottom when N > 0 selected: "Recategorize | Tag | Delete | Cancel"
- Confirmation step for delete: "Soft-delete 8 transactions?"
- No new IDB store needed — uses existing `saveTransactionToDB` (put = upsert) in a loop via `bulkSaveTransactionsToDB`

**Files to modify:**
- `js/ui.js` — select mode rendering, selection state, action bar
- `js/app.js` — bulk operation handlers, event delegation for select actions
- `js/db.js` — reuse `bulkSaveTransactionsToDB` for recategorize/tag; extend for bulk soft-delete
- `js/state.js` — add `selectedTransactionIds: []` to state object
- `css/styles.css`, `css/dark-mode.css` — selection styles, bulk action bar
- Version: bump to 3.37.0

---

### v3.38.0 — Category Management
**Priority: MEDIUM**

No mechanism currently exists to rename a category across all historical transactions or merge two categories. The real-usage audit found "Shopping" / "Personal/Shopping" used interchangeably, and `Savings/Investments` being used as an expense category when it should be a Transfer.

**Three tools:**
1. **Rename category** — changes the category string on all matching transactions; also updates the `budgets` store key
2. **Merge categories** — move all transactions from category A into category B (A disappears)
3. **Category cleanup suggestions** — detect: categories named "Savings" variants (suggest: use Transfer instead); categories used < 5 times in 12 months (suggest: merge into Other)

**Important constraints:**
- Does not modify the built-in `categories` arrays in `state.js` — those are defaults for new transactions
- Rename/merge writes directly to the `transactions` store via `bulkRecategorize(fromCat, toCat)`
- Undo is not supported — show a confirmation: "This will update 23 transactions. Cannot be undone."
- After operation, call `updateUI()` to refresh all views

**Files to modify:**
- `js/db.js` — new `bulkRecategorize(fromCategory, toCategory)` function
- `js/settings.js` — category manager UI (rename/merge form, suggestion engine)
- `js/budget.js` — update budget category key on rename
- `js/app.js` — wire category manager events
- `index.html` — category management section in Settings
- `css/styles.css`, `css/dark-mode.css` — category management styles
- Version: bump to 3.38.0

---

### v3.39.0 — Business & Tax Export
**Priority: MEDIUM**

The `expenseType: "business"` optional field and `referenceId` (receipt/invoice number) were added in v3.16 for business expense tracking, but there's no business-only export for tax filing. The annual report exports everything with no expense-type filter.

**What it adds:**
- **Tax year configuration** — Settings: choose tax year start month (Jan for calendar year, Apr for India/UK fiscal year, Jul for Australian fiscal year). Stored in `appSettings`. All annual report and tax export date ranges respect this setting.
- **Business expense report** — filter by `expenseType === "business"`, year selector, sorted by date
- **Reimbursable summary** — all `expenseType === "reimbursable"` transactions, split by settled/outstanding
- **Export formats:**
  - CSV: date, category, amount, merchant, referenceId, notes, expenseType, settled
  - Text summary for accountant sharing
- Accessible from the Annual Report section → new "Tax Export" tab

**Files to modify:**
- `js/annual-report.js` — tax export functions, filtered aggregation, tax year aware date ranges, tab switch
- `js/settings.js` — tax year start month selector
- `js/state.js` — add `taxYearStartMonth` to default appSettings
- `index.html` — tax year setting, tax export tab in Annual Report section
- `css/styles.css`, `css/dark-mode.css` — tab styles (pattern already exists)
- Version: bump to 3.39.0

---

### v3.40.0 — Receipt Photos
**Priority: LOW**
**New file: `js/receipts.js`**

Previously deferred twice. Still the lowest ROI item but the last significant data-capture gap.

**Design constraints (storage-first approach):**
- New IDB store: `receipts` (DB_VERSION → 12)
  - Schema: `{ id, transactionId, imageBlob, fileSize, uploadedAt }`
  - Index: `transactionId`
- Canvas API compression: JPEG 800px max width, quality 0.7 — target ~100–150KB per receipt
- Hard limit: refuse upload if storage estimate > 80% quota (checked via `navigator.storage.estimate()`)
- Service Worker must NOT cache receipt blobs (too large)
- Storage usage shown in Settings alongside backup health

**UI:**
- Optional camera/file attach button in transaction form (only if `expenseType` optional field is enabled)
- Thumbnail shown in transaction list card if receipt exists
- Tap thumbnail → lightbox modal with Download button
- Settings: "Receipts" section showing total storage used + list of large receipts with delete option
- Cleanup prompt: receipts older than 12 months → "You have 23 old receipts using 2.3MB. Delete them?"

**Files to create/modify:**
- `js/receipts.js` (new) — CRUD, canvas compression, storage checks, cleanup
- `js/db.js` — receipts store, DB_VERSION 12 migration
- `js/state.js` — DB_VERSION 12, `RECEIPTS_STORE` constant
- `js/ui.js` — receipt thumbnail in transaction card
- `js/app.js` — import receipts.js, attach/view events
- `index.html` — file input in form, thumbnail slot in list, receipts settings section
- `css/styles.css`, `css/dark-mode.css` — thumbnail, lightbox, storage meter
- `sw.js` — add `js/receipts.js` to CACHE_URLS; explicitly exclude receipt blobs from SW cache
- Version: bump to 3.40.0

---

## Release Timeline

| Version | Feature | DB Version | Priority | Status |
|---------|---------|-----------|---------|--------|
| v3.28.1 | Dashboard & UI/UX fixes (savings rate bug, alert overload, period sync, negative value styling) | 10 | HIGH | Planned |
| v3.29.0 | Budget vs Actual Report (consolidated table with variance) | 10 | HIGH | Planned |
| v3.30.0 | Financial Health Ratios (emergency fund, debt-to-income, housing cost) | 10 | HIGH | Planned |
| v3.31.0 | Cash Flow Forecast — 30/60/90-day projection from recurring templates | 10 | HIGH | Planned |
| v3.32.0 | Subscription Tracker (filtered recurring view with total cost) | 10 | MEDIUM | Planned |
| v3.33.0 | Duplicate Transaction Detection | 10 | MEDIUM | Planned |
| v3.34.0 | Loan / EMI Tracker with amortization schedule | 11 | MEDIUM | Planned |
| v3.35.0 | Bank Statement CSV Importer (generic column mapper) | 11 | MEDIUM | Planned |
| v3.36.0 | Local Notifications | 11 | HIGH | Planned |
| v3.37.0 | Bulk Transaction Operations | 11 | MEDIUM | Planned |
| v3.38.0 | Category Management (rename, merge, cleanup suggestions) | 11 | MEDIUM | Planned |
| v3.39.0 | Business & Tax Export (with tax year configuration) | 11 | MEDIUM | Planned |
| v3.40.0 | Receipt Photos | 12 | LOW | Planned |

---

## DB Schema Evolution (Complete History)

| DB Version | App Version | Change |
|-----------|------------|--------|
| 1 | v3.10.x | `transactions` store |
| 2 | v3.11.0 | + `recurringTemplates` store |
| 3 | v3.13.0 | + `budgets` store |
| 4 | v3.14.0 | + `tags` multiEntry index on transactions |
| 5 | v3.15.0 | Transfer type; `fromAccount`, `toAccount` fields (nullable) |
| 6 | v3.16.0 | + `appSettings` store; optional fields on transactions (all nullable) |
| 7 | v3.17.0 | + `quickTemplates` store |
| 8 | v3.18.0 | + `accounts` store |
| 9 | v3.20.0 | + `savingsGoals` store |
| 10 | v3.28.0 | + `netWorthSnapshots` store |
| 11 | v3.34.0 | + `loans` store (planned) |
| 12 | v3.40.0 | + `receipts` store (planned) |

---

## Suggested Category Cleanup (No Version Needed)

Can be done at any time via a manual `bulkRecategorize` call in DevTools or by adding a one-time migration script. No DB version bump needed — just updates the `category` string on existing transactions.

| Problem | Recommended Fix |
|---------|----------------|
| `Savings/Investments` used as an expense category | Migrate to Transfer type; remove from expense category list |
| `Personal/Shopping` and `Shopping` used interchangeably | Merge into `Personal/Shopping`; remove `Shopping` |
| `Misc/Buffer` and `Other Expense` used interchangeably | Merge into `Other Expense`; remove `Misc/Buffer` |
| `Utilities/Bills` used for toys, travel, actual bills | Split into `Utilities` + `Bills` if real data justifies it |

---

## Core Principles (Non-Negotiable)

1. **Zero dependencies** — no npm packages, no frameworks, no CDN resources
2. **No external network calls** — no analytics, no APIs, no cloud sync
3. **Offline-first** — every feature must work without internet (Service Worker + IndexedDB)
4. **Privacy-first** — all data stays on device; no telemetry
5. **XSS safety** — `textContent` for user content; `sanitizeHTML()` before saving; never `innerHTML` with user input
6. **IndexedDB for feature data** — localStorage only for the small settings already there
7. **Always call `updateUI()`** after any state mutation
8. **Version protocol** — every release bumps `APP_VERSION` in `js/state.js`, `CACHE_NAME` in `sw.js`, and `version` in `manifest.json`
