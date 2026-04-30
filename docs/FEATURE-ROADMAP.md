# FinChronicle Feature Roadmap (Revised April 2026)

> Last updated: 2026-04-30
> Previous plan: 2026-03-30

---

## Project Status

| Version | Feature | Status |
|---------|---------|--------|
| v3.10.2 | Transaction Validation Layer | DONE |
| v3.10.4 | ES Module Refactoring | DONE (unplanned) |
| v3.10.5 | Category Pie Chart + WCAG fixes | DONE |
| v3.11.0 | Recurring Transactions | DONE |
| v3.12.0 | Complete Reports (trends, weekly) | DONE |
| v3.13.0 | Budget Limits & Alerts | DONE |
| v3.14.0 | Tags & Search | DONE |
| v3.15.0 | Transfer Transaction Type + Audit Trail | DONE |
| v3.16.0 | Optional Fields System | DONE |
| v3.17.0 | Quick Entry + Split Transactions | DONE |
| v3.18.0 | Accounts & Net Worth | NOT STARTED |
| v3.19.0 | Savings Rate Dashboard | NOT STARTED |
| v3.20.0 | Savings Goals | NOT STARTED |
| v3.21.0 | Annual Report & Smart Alerts | NOT STARTED |
| v3.22.0 | Auto-Backup & Data Safety | NOT STARTED |
| v3.23.0 | Receipt Photos | NOT STARTED |
| v3.24.0 | Multi-Currency Transactions | NOT STARTED |
| v3.25.0 | Push Notifications | NOT STARTED |
| v3.26.0 | Family Expense Settlement | NOT STARTED |

---

## What Changed from the April 2026 Review

### Why the plan changed (again)

A stakeholder review on April 30, 2026 identified **critical gaps** in the roadmap that affect every user session:

1. **No automatic backup** — if browser clears storage or device is lost, all data is permanently gone. Zero safety net.
2. **Daily UX friction** — users log 3–5 transactions/day but the form requires 5+ field entries every time. No quick-entry or templates.
3. **Accounts exist as strings but have no balances** — transfers reference account names but there's no way to see balances, net worth, or reconcile against bank statements. Savings Rate (v3.19) and Goals (v3.20) are built on sand without real account entities.
4. **No intelligence beyond static budgets** — budgets are binary over/under. No anomaly detection, no velocity warnings, no year-end insights.
5. **Missing future-looking features** — multi-currency, notifications, and family settlement needed for completeness.

### Changes from the March 2026 plan

| Previous | New | Reason |
|----------|-----|--------|
| v3.17.0 Split Transactions only | → v3.17.0 Quick Entry + Split | Quick Entry reduces daily friction — nearly free to add |
| v3.18.0 Savings Rate | → v3.18.0 Accounts & Net Worth | Accounts are the foundation; savings rate depends on them |
| v3.19.0 Savings Goals | → v3.19.0 Savings Rate (moved) | Savings rate now builds on real Accounts |
| (shifted) | → v3.20.0 Savings Goals | Shifted by one |
| (new) Annual Report + Smart Alerts | → v3.21.0 | Real need at year-end and daily monitoring |
| (new) Auto-Backup & Data Safety | → v3.22.0 | CRITICAL gap — should arguably be higher |
| v3.20.0 Receipt Photos | → v3.23.0 | Shifted by three — lower priority than data safety |
| (new) Multi-Currency | → v3.24.0 | Travel/foreign expenses support |
| (new) Push Notifications | → v3.25.0 | Proactive reminders for recurring and budgets |
| (new) Family Settlement | → v3.26.0 | Lightweight shared expense math |

### Priority rationale

The ordering reflects **impact × frequency**:
- **v3.16–v3.17** (Q2): Power-user essentials and daily UX speed
- **v3.18–v3.22** (Q3): Financial intelligence layer — accounts, savings, alerts, and data safety
- **v3.23–v3.26** (Q4): Nice-to-haves that serve specific use cases

---

## What Changed from the March 24 Plan

### Why the plan changed

A 3-month real transaction export (Jan–Mar 2026, 280 transactions) was analysed. It revealed **concrete data integrity problems** that the previous roadmap did not account for:

1. **Credit card payments logged as expenses** — double-counted spending (CC bill on Mar 6 = 9,648 that duplicated all the individual transactions already tracked)
2. **Savings logged as expenses** — Jan 31 `Other Expense` 25,000 "Savings" inflated expense totals
3. **No Transfer type** — the app has no way to represent money moving between accounts without corrupting expense totals
4. **Category drift** — nanny salary appeared under 3 different categories; Kevin's glasses (4,700) under Transport

These are not edge cases — they are regular monthly events. Data integrity has higher impact than Optional Fields, so **Transfer Transaction Type is promoted to v3.15.0**.

### Changes from the previous plan

| Previous | New | Reason |
|----------|-----|--------|
| v3.15.0 Optional Fields | → v3.16.0 | Deprioritised relative to data integrity |
| v3.16.0 Split Transactions | → v3.17.0 | Shifted by one |
| (new) Transfer Type | → v3.15.0 | Promoted from suggestion to HIGH priority |
| (new) Savings Rate Dashboard | → v3.18.0 | New — real data showed no savings visibility |
| v3.17.0 Savings Goals | → v3.19.0 | Shifted by one |
| v3.18.0 Receipt Photos | → v3.20.0 | Shifted by one |

### Enhancements folded into existing modules

These do not warrant their own version but should be done as part of the specified release:

| Enhancement | Target | Module |
|------------|--------|--------|
| Smart category suggestion from note keywords | v3.16 Optional Fields | `js/optional-fields.js` |
| Recurring auto-match (suggest "this looks like March rent") | v3.16 or v3.15 minor | `js/recurring.js` |
| Budget envelope groups (combine Food + Groceries into one limit) | v3.16 Optional Fields | `js/budget.js` |
| Per-person tag as a first-class `person` field | v3.16 Optional Fields | optional field: `attachedTo` |
| One-time expense flag on transaction form | v3.17 Split Transactions | `js/validation.js` + schema |
| Spending velocity warning ("At this pace, you'll exceed budget by the 20th") | v3.21 Smart Alerts | `js/budget.js` |
| Unusual transaction detection (8x average in category) | v3.21 Smart Alerts | `js/alerts.js` |
| Auto-backup scheduling (periodic export to Downloads) | v3.22 Data Safety | `js/import-export.js` |

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
| `js/recurring.js` | Recurring transactions (added v3.11.0) |
| `js/budget.js` | Budget limits & alerts (added v3.13.0) |
| `js/search.js` | Tags & search (added v3.14.0) |
| `js/transfer.js` | Transfer type & account autocomplete (added v3.15.0) |
| `js/faq.js` | Lazy-loaded |
| `js/import-export.js` | Lazy-loaded |

**Transaction schema (current, DB_VERSION: 5):**
```javascript
{
  id: number,              // Date.now()
  type: 'expense' | 'income' | 'transfer',
  amount: number,
  category: string,
  date: 'YYYY-MM-DD',
  notes: string,
  tags: string[],          // added v3.14.0
  createdAt: ISO8601,
  updatedAt: ISO8601,      // added v3.15.0
  fromAccount: string | null,   // transfer only, added v3.15.0
  toAccount: string | null,     // transfer only, added v3.15.0
  deleted: boolean,        // soft delete flag, added v3.15.0
  deletedAt: ISO8601 | null     // soft delete timestamp, added v3.15.0
}
```

**IndexedDB:**
- DB: `FinChronicleDB`, DB_VERSION: 5
- Store: `transactions`
- Indexes: `date`, `type`, `category`, `dateType` (composite), `tags` (multiEntry)

---

## Phased Release Plan

---

### v3.15.0 — Transfer Transaction Type + Audit Trail ✅ DONE
**Released: 2026-04-30**

Adds a third transaction type — `transfer` — for money moving between accounts without being income or expense. Eliminates double-counting of credit card payments, savings deposits, and debt repayments. Also adds `updatedAt` timestamps and soft delete for audit-quality data integrity.

**Implemented:**
- Transfer type selector with From Account / To Account autocomplete
- Transfers excluded from expense/income totals, budgets, and charts
- `updatedAt` timestamp on every save/edit
- Soft delete with `deleted`/`deletedAt` flags (records kept in DB for audit)
- Backup exports include all records (including soft-deleted) for complete audit trail
- Full import/export support for transfer and audit fields

**Files added/modified:**
- `js/transfer.js` (new) — account autocomplete, transfer field UI helpers
- `js/db.js` — DB_VERSION 5, soft delete, `loadAllTransactionsFromDB()`
- `js/validation.js` — transfer validation branch
- `js/state.js` — transfer categories, saved accounts
- `js/ui.js` — transfer row rendering, summary exclusion
- `js/chart.js` — skip transfers in aggregation
- `js/import-export.js` — transfer + audit columns in export/backup/restore
- `js/app.js` — transfer imports, form wiring, updatedAt
- `index.html`, `css/tokens.css`, `css/styles.css`, `css/dark-mode.css`, `sw.js`

---

### v3.16.0 — Optional Fields System
**Priority: MEDIUM**
**New file: `js/optional-fields.js`**

User-controlled optional transaction fields. Power users enable what they need; basic users see a clean form. Now also includes **smart category suggestions** and **budget envelope groups** (folded in from real-usage analysis).

**New IDB store: `appSettings` (DB_VERSION → 6)**
```javascript
{
  id: 'config',
  enabledFields: {
    paymentMethod: false,
    account: false,
    merchant: false,
    expenseType: false,
    attachedTo: false,   // "per-person tagging" — Kevin, Elvin, Beth, etc.
    referenceId: false,
    location: false
  },
  budgetEnvelopes: [
    // { name: 'Eating Out', categories: ['Food', 'Groceries'], limit: 25000 }
  ],
  smartCategoryKeywords: {
    // auto-populated from transaction history, user-editable
    // e.g. { 'nanny': 'Household', 'fuel': 'Transport', 'rent': 'Rent' }
  },
  appVersion: '3.16.0',
  lastUpdated: ISO8601
}
```

**Transaction schema additions (all nullable, DB_VERSION → 6):**
```javascript
paymentMethod: string | null,   // 'cash' | 'credit-card' | 'debit-card' | 'bank-transfer' | 'wallet' | 'other'
account: string | null,         // free text — "Kasikorn", "SCB CC"
merchant: string | null,        // free text with autocomplete
expenseType: string | null,     // 'personal' | 'business' | 'reimbursable'
attachedTo: string | null,      // person tag: 'Kevin', 'Elvin', 'Beth', free text
referenceId: string | null,     // UPI ID, receipt number
location: string | null         // city/area, free text
```

**Smart category suggestions:**
```javascript
// In js/optional-fields.js
function suggestCategory(noteText, history) {
  // Build keyword → category frequency map from last 90 days of history
  // Return top match if confidence > 60%
  // e.g. note contains "nanny" → suggests "Household" based on past entries
}
```
Shown as a dismissible inline suggestion beneath the category dropdown. Never overrides; only suggests.

**Budget envelopes:**
- User can group categories into named envelopes (e.g. "Eating Out" = Food + Groceries)
- Envelope totals shown alongside individual category budgets in the Budget section
- Envelope limits set independently of category limits

**Key behaviors:**
- Disabled fields do not appear in the transaction form
- Disabling a field hides it but never deletes its data
- Auto-detect on first load: if any transaction has data in a field, mark it as enabled
- `attachedTo` field populates a person filter in the List tab

**Files:**
- `js/optional-fields.js` (new) — field config, dynamic form rendering, smart suggestions, envelope logic
- `js/db.js` — add `appSettings` store, bump to DB_VERSION 6
- `js/state.js` — bump `DB_VERSION` to 6
- `js/budget.js` — add envelope group support
- `js/app.js` — import optional-fields.js
- `index.html` — optional field toggles in Settings, envelope group editor, "Additional Details" collapsible in form
- `css/styles.css` — toggle list, info badges, collapsible section, envelope group card
- `sw.js` — bump cache version

---

### v3.17.0 — Quick Entry + Split Transactions
**Priority: HIGH**

Daily UX friction reduction: users log 3–5 transactions per day but the form has 5+ fields. Quick Entry templates solve this. Also adds split transactions and one-time expense flag.

**Quick Entry — Transaction Templates:**
```javascript
// New IDB store or appSettings sub-key
{
  id: number,
  label: string,           // "Morning Coffee", "Grab to Office"
  type: 'expense' | 'income',
  amount: number,
  category: string,
  notes: string,
  tags: string[],
  account: string | null,
  sortOrder: number
}
```

**Quick Entry UI:**
- "Quick Add" floating action button or toolbar above the transaction form
- Tapping a template pre-fills the form with all fields and auto-submits (one tap to log)
- "Clone last" button — duplicates the most recent transaction with today's date
- Recent transaction list shows "Log again" action per item
- Template management section in Settings (add, edit, reorder, delete)
- Limit: 20 templates max

**Split Transactions:**

Divide one transaction across multiple categories. Also adds a **one-time expense flag** so monthly reports can distinguish "base spend" from unusual items like flights or school fees.

**Schema additions (no DB bump needed — nullable fields):**
```javascript
isSplit: boolean,           // default: false
splits: [{ category: string, amount: number, notes: string }],
isOneTime: boolean          // default: false — flags non-recurring unusual expenses
```

**Balance validation (accounting integrity):**
```javascript
function validateSplitTransaction(tx) {
  const splitTotal = tx.splits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.abs(tx.amount - splitTotal);
  if (diff > 0.01) {
    return { valid: false, error: `Split total ${formatCurrency(splitTotal)} ≠ transaction ${formatCurrency(tx.amount)}` };
  }
  return { valid: true };
}
```

**One-time flag UI:**
- Small toggle in transaction form: "One-time expense"
- Monthly summary shows: **Base spend: X | One-time items: Y | Total: Z**
- One-time transactions shown with a distinct badge in list view
- Reports can toggle one-time items in/out of trend charts

**Files:**
- `js/quick-entry.js` (new) — template CRUD, pre-fill logic, clone-last
- `js/validation.js` — add `validateSplitTransaction()`
- `js/app.js` — integrate quick entry, split logic, one-time flag into save/edit flows
- `index.html` — quick entry toolbar, template manager in Settings, split toggle + editor in form
- `css/styles.css` — quick entry pills, split editor, balance indicator, one-time badge
- `sw.js` — add `js/quick-entry.js` to `CACHE_URLS`, bump cache version

---

### v3.18.0 — Accounts & Net Worth
**Priority: HIGH**
**New file: `js/accounts.js`**

v3.15 introduced account names as free-text strings in transfers. This release promotes accounts to first-class entities with balances, making them the foundation for Savings Rate (v3.19) and Savings Goals (v3.20).

**New IDB store: `accounts` (DB_VERSION → 7)**
```javascript
{
  id: number,
  name: string,             // "Kasikorn Savings", "SCB Credit Card"
  type: 'checking' | 'savings' | 'credit-card' | 'cash' | 'investment' | 'other',
  openingBalance: number,   // user-entered starting balance
  currency: string,         // defaults to app's global currency
  isSavings: boolean,       // true = counts toward savings rate calculations
  isActive: boolean,        // false = hidden from dropdowns but preserved in history
  sortOrder: number,
  createdAt: ISO8601
}
// Indexes: name, type
```

**Derived balance calculation (no balance stored — always computed):**
```javascript
function getAccountBalance(accountName, transactions) {
  const opening = account.openingBalance;
  const credits = transactions
    .filter(t => !t.deleted && t.toAccount === accountName)
    .reduce((sum, t) => sum + t.amount, 0);
  const debits = transactions
    .filter(t => !t.deleted && t.fromAccount === accountName)
    .reduce((sum, t) => sum + t.amount, 0);
  const income = transactions
    .filter(t => !t.deleted && t.type === 'income' && t.account === accountName)
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter(t => !t.deleted && t.type === 'expense' && t.account === accountName)
    .reduce((sum, t) => sum + t.amount, 0);
  return opening + credits - debits + income - expenses;
}
```

**Net Worth Dashboard:**
- Total assets (sum of all account balances where type ≠ 'credit-card')
- Total liabilities (credit card balances, negative = owed)
- Net worth = assets − liabilities
- Net worth trend chart (monthly snapshots stored locally for performance)
- Account list view with current balance per account

**Account Reconciliation:**
- User enters actual bank statement balance
- App shows difference: "App says ₹45,230 — you entered ₹45,000 — difference: ₹230"
- Reconciliation history (date + confirmed balance) for audit trail

**Account-linked transactions:**
- Transfer From/To dropdowns now pull from `accounts` store (with autocomplete fallback for unlisted names)
- Optional: link expense/income to an account (e.g., "this meal was paid from SCB Credit Card")
- Depends on v3.16 Optional Fields having the `account` field

**Files:**
- `js/accounts.js` (new) — account CRUD, balance computation, net worth calculation, reconciliation
- `js/db.js` — add `accounts` store, bump to DB_VERSION 7
- `js/state.js` — bump `DB_VERSION` to 7
- `js/transfer.js` — account dropdowns source from `accounts` store
- `js/ui.js` — net worth section in Summary tab, account list view
- `js/app.js` — import accounts.js, bind events
- `index.html` — account management in Settings, net worth dashboard in Summary, reconciliation modal
- `css/styles.css` — account cards, net worth widget, reconciliation diff
- `css/dark-mode.css` — dark mode support
- `sw.js` — add `js/accounts.js` to `CACHE_URLS`, bump cache version

---

### v3.19.0 — Savings Rate Dashboard
**Priority: MEDIUM**
**New file: `js/savings.js`**

Real usage showed savings of 25k (Jan), 45k (Feb), 0k (Mar) — but the app provides no visibility into savings rate trends or projections. This release adds a dedicated savings view. **Now built on the Accounts foundation from v3.18.**

**No new IDB store needed.** Savings are derived from:
1. Transactions with `type === 'transfer'` where `toAccount` matches an account with `isSavings: true` (from v3.18 Accounts store)
2. Transactions with `category === 'Savings/Investments'` (legacy support for existing data)

**Dashboard widgets:**
- **This month saved:** amount transferred to savings accounts
- **Savings rate:** `savings / income * 100` for the month
- **3-month trend:** savings rate per month (bar chart using existing chart.js infrastructure)
- **Annual projection:** "At this rate, you'll save X by Dec 2026"
- **Running total:** cumulative savings logged since app start

**Settings:** User designates which accounts count as "savings accounts" via the `isSavings` flag on each account (added in v3.18). Legacy fallback: keyword match on account name ("Savings", "FD", "Investment").

**Files:**
- `js/savings.js` (new) — rate calculation, projection, trend data
- `js/accounts.js` — `getSavingsAccounts()` helper
- `js/ui.js` — add savings dashboard section to Summary tab
- `index.html` — savings dashboard HTML in Summary tab
- `css/styles.css` — savings rate card, projection widget
- `css/dark-mode.css` — dark mode support
- `sw.js` — add `js/savings.js` to `CACHE_URLS`, bump cache version

---

### v3.20.0 — Savings Goals
**Priority: MEDIUM**
**New file: `js/goals.js`**

Track progress toward savings targets (vacation fund, emergency fund, etc.).

**New IDB store: `savingsGoals` (DB_VERSION → 8)**
```javascript
{
  id: number,
  name: string,
  targetAmount: number,
  currentAmount: number,
  deadline: 'YYYY-MM-DD',
  linkedAccount: string | null,  // account name from v3.18 Accounts
  createdAt: ISO8601
}
// Index: deadline
```

**UI:** Goals section in Summary tab. Circular progress indicators. Manual contribution button (logs a Transfer). Milestone celebrations at 25/50/75/100%.

**Files:**
- `js/goals.js` (new) — CRUD, progress calculation, milestone detection
- `js/db.js` — add `savingsGoals` store, bump to DB_VERSION 8
- `js/state.js` — bump `DB_VERSION` to 8
- `js/app.js` — import goals.js
- `index.html` — goals section
- `css/styles.css` — circular progress, goal cards
- `sw.js` — bump cache version

---

### v3.21.0 — Annual Report & Smart Spending Alerts
**Priority: MEDIUM**
**New file: `js/alerts.js`, `js/annual-report.js`**

Two complementary features: a year-end financial summary and proactive spending intelligence beyond static budget limits.

**Annual Report:**
- 12-month income vs expense bar chart (uses existing chart infrastructure)
- Annual category breakdown pie chart — "Where did the money go this year?"
- Year-over-year comparison: "You spent 15% less on Transport vs last year"
- Savings rate for the year
- Top 5 largest expenses
- Export annual report as CSV (tax-season-friendly category export)
- Accessible from Summary tab with a "Year in Review" card when viewing December or via Settings

**Smart Spending Alerts:**
Proactive, context-aware notifications based on rolling averages — not just binary over/under limits.

```javascript
// Alert types
const ALERT_TYPES = {
  WEEKLY_SPIKE: 'weekly_spike',       // "You spent 40% more on Food this week vs your 3-month weekly average"
  UNUSUAL_AMOUNT: 'unusual_amount',   // "₹25,000 in Transport — 8x your average, is this right?"
  VELOCITY_WARNING: 'velocity',       // "At this pace, you'll exceed monthly budget by the 20th"
  CATEGORY_DRIFT: 'category_drift'    // "Utilities/Bills spending doubled this month"
};
```

**Alert logic (all local computation, no network):**
- Calculate rolling 90-day weekly averages per category
- On each transaction save, compare this week's total to the rolling average
- Velocity: `(spending_so_far / days_elapsed) * days_in_month > budget_limit`
- Unusual amount: single transaction > 3x category's median transaction amount
- Alerts shown as dismissible banners at the top of the Summary tab
- Alert history in Settings (last 30 alerts kept)

**Files:**
- `js/alerts.js` (new) — alert detection engine, rolling average calculation, alert history
- `js/annual-report.js` (new) — yearly aggregation, YoY comparison, report generation
- `js/ui.js` — alert banner rendering, annual report section
- `js/app.js` — import both modules, trigger alert checks on transaction save
- `index.html` — alert banner container, annual report view, alert history in Settings
- `css/styles.css` — alert banners (info/warning/danger), annual report charts
- `css/dark-mode.css` — dark mode support
- `sw.js` — add new files to `CACHE_URLS`, bump cache version

---

### v3.22.0 — Auto-Backup & Data Safety
**Priority: HIGH (CRITICAL for data resilience)**
**New file: `js/auto-backup.js`**

The single biggest risk to the app: IndexedDB can be cleared by the browser, OS storage pressure, or device loss. There is currently **no automated safety net**. This release adds scheduled local exports and optional user-initiated cloud export.

**Auto-Export to Device Storage:**
```javascript
// Backup schedule options (stored in localStorage)
{
  autoBackupEnabled: boolean,       // default: true after first prompt
  backupFrequency: 'daily' | 'weekly' | 'monthly',   // default: 'weekly'
  lastAutoBackup: ISO8601 | null,
  backupFormat: 'json' | 'csv',     // default: 'json' (smaller, lossless)
  keepBackupCount: number           // default: 4 (rotate old backups)
}
```

**Implementation strategy (offline-first, no external services):**
- Use the **File System Access API** (`showSaveFilePicker` / `navigator.storage`) where supported (Chrome, Edge)
- Fallback: programmatic download via `<a download>` with generated blob URL
- On app open: check if `lastAutoBackup` is older than `backupFrequency` → trigger export
- Show a non-blocking toast: "Auto-backup saved to Downloads" with undo/view option
- Never block the UI — backup runs after initial `updateUI()` completes

**Storage health monitoring:**
```javascript
async function checkStorageHealth() {
  const estimate = await navigator.storage.estimate();
  const usedPercent = (estimate.usage / estimate.quota) * 100;
  if (usedPercent > 80) showWarning('Storage 80% full — consider exporting data');
  if (usedPercent > 95) showCritical('Storage nearly full — backup immediately');
}
```

**User-initiated export to cloud (privacy-preserving):**
- "Export to file" button that generates an encrypted JSON file (AES-GCM with user-provided passphrase via Web Crypto API)
- User manually uploads to their own Google Drive / iCloud / Dropbox — app never touches cloud APIs
- Import can decrypt with the same passphrase
- This satisfies privacy-first while enabling cross-device migration

**Backup verification:**
- After export, read back and validate record count matches
- Show last successful backup timestamp prominently in Settings
- Warning badge on Settings tab if no backup in 14+ days

**Files:**
- `js/auto-backup.js` (new) — scheduling logic, File System Access API, encryption/decryption, storage health
- `js/import-export.js` — add encrypted export/import functions, backup rotation
- `js/settings.js` — backup settings UI, backup health indicator, last-backup badge
- `js/app.js` — import auto-backup, trigger schedule check on init
- `index.html` — backup settings section, storage health widget, encrypted export modal
- `css/styles.css` — backup status indicators, storage meter, warning badges
- `css/dark-mode.css` — dark mode support
- `sw.js` — add `js/auto-backup.js` to `CACHE_URLS`, bump cache version

---

### v3.23.0 — Receipt Photos
**Priority: LOW**
**New file: `js/receipts.js`**

Attach photo receipts to transactions. Conservative storage: 500KB max per image with Canvas-based compression.

**New IDB store: `receipts` (DB_VERSION → 9)**
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

### v3.24.0 — Multi-Currency Transactions
**Priority: LOW**
**New file: `js/multi-currency.js`**

For users who travel or have foreign expenses. Adds per-transaction currency support with manual exchange rates (no API calls — stays offline).

**Schema additions (nullable, no DB bump needed):**
```javascript
transactionCurrency: string | null,    // ISO 4217 code: 'USD', 'JPY', 'THB'
exchangeRate: number | null,           // rate to home currency at time of transaction
homeAmount: number | null              // amount in home currency = amount * exchangeRate
```

**Key behaviors:**
- If `transactionCurrency` is null or same as app currency, behaves as today (no change)
- Currency picker appears as optional field in transaction form (when enabled in v3.16 Optional Fields)
- Exchange rate input with auto-fill from last known rate for that currency pair
- All summaries, charts, and budgets use `homeAmount` for aggregation
- Transaction list shows both: "¥2,500 (₹1,450)" format
- Currency conversion helper in Settings: quick lookup of "How much is X in Y?"
- Saved exchange rates history (user-entered, no API)

**Files:**
- `js/multi-currency.js` (new) — currency conversion, rate history, dual-display formatting
- `js/validation.js` — validate exchangeRate > 0 when transactionCurrency differs from home
- `js/utils.js` — `formatMultiCurrency()` helper
- `js/ui.js` — dual-currency display in transaction list and summary
- `index.html` — currency field in form, exchange rate input, conversion helper
- `css/styles.css` — dual-amount display, currency badge
- `sw.js` — add `js/multi-currency.js` to `CACHE_URLS`, bump cache version

---

### v3.25.0 — Push Notifications for Recurring Due Dates
**Priority: LOW**
**New file: `js/notifications.js`**

Recurring transactions exist but are passive. This adds proactive reminders using the Web Push API (works even when app is closed, requires HTTPS which PWA already has).

**Notification types:**
```javascript
const NOTIFICATION_TYPES = {
  RECURRING_DUE: 'recurring_due',       // "Rent is due tomorrow"
  BUDGET_WARNING: 'budget_warning',     // "Food budget 80% used with 10 days remaining"
  INACTIVITY: 'inactivity',            // "You haven't logged any transactions in 3 days"
  BACKUP_REMINDER: 'backup_reminder'    // "No backup in 14 days — tap to export"
};
```

**Implementation (offline-capable, no server needed for local notifications):**
- Use the **Notification API** (not Push API — avoids server dependency) with Service Worker `showNotification()`
- Schedule checks run when app opens or via periodic background sync (where supported)
- Notification preferences: per-type enable/disable, quiet hours, snooze
- All scheduling logic runs locally — no external push server

**Trigger logic:**
- On app open: check recurring templates where `nextDueDate <= tomorrow` → notify
- On transaction save: check if budget > 80% threshold → notify
- On app open: check `lastTransactionDate` — if > 3 days ago → nudge
- On app open: check `lastAutoBackup` — if > 14 days ago → remind

**Permissions UX:**
- Never request notification permission on first launch
- Show permission request only after user interacts with a "Enable reminders" toggle in Settings
- Graceful fallback: if permission denied, show in-app banners instead

**Files:**
- `js/notifications.js` (new) — notification scheduling, permission management, trigger checks
- `js/settings.js` — notification preferences UI, quiet hours config
- `js/app.js` — trigger notification checks on init
- `sw.js` — `notificationclick` handler for opening app to relevant section
- `index.html` — notification settings section
- `css/styles.css` — notification preference toggles
- `sw.js` — bump cache version

---

### v3.26.0 — Family Expense Settlement
**Priority: LOW**
**New file: `js/settlement.js`**

The `attachedTo` field (from v3.16 Optional Fields) tags who a transaction is for, but doesn't answer "who owes whom." This release adds a lightweight settlement view for shared household expenses.

**No new IDB store needed.** Settlement is computed from existing data:
- Filter transactions by `attachedTo` field
- Compare what was spent *on* a person vs what they *contributed* (income tagged to them)
- Generate a simple balance per person

**Settlement dashboard:**
```javascript
// Example output
{
  persons: [
    { name: 'Kevin', spentOn: 12500, contributed: 0, owes: 12500 },
    { name: 'Beth', spentOn: 8200, contributed: 15000, balance: +6800 }
  ],
  period: '2026-04'  // current month by default, customizable
}
```

**UI:**
- "Family" section accessible from Summary tab or as a sub-tab
- Per-person card showing: spent on them, contributed by them, net balance
- Monthly/custom date range filter
- Simple "settle up" action: logs a transfer from debtor to creditor with auto-filled amount
- Historical settlement view: "Last month Kevin owed ₹11,200"

**Key behaviors:**
- Only appears if the `attachedTo` optional field is enabled (v3.16)
- Person list auto-populated from unique `attachedTo` values in transaction history
- No shared accounts, no multi-user login — purely single-device math on tags
- Export settlement summary as text (for sharing via messaging)

**Files:**
- `js/settlement.js` (new) — per-person aggregation, balance calculation, settlement suggestions
- `js/ui.js` — settlement view rendering
- `js/app.js` — import settlement.js, bind events
- `index.html` — family/settlement section
- `css/styles.css` — person cards, balance indicators (positive green / negative red)
- `css/dark-mode.css` — dark mode support
- `sw.js` — add `js/settlement.js` to `CACHE_URLS`, bump cache version

---

## Release Timeline

| Version | Feature | DB Version | Priority | Target Quarter |
|---------|---------|-----------|---------|---------------|
| v3.15.0 | Transfer Transaction Type + Audit Trail | 5 | HIGH | ✅ Done (Apr 2026) |
| v3.16.0 | Optional Fields + Smart Suggestions + Envelopes | 6 | MEDIUM | Q2 2026 |
| v3.17.0 | Quick Entry + Split Transactions + One-Time Flag | 6 | HIGH | Q2 2026 |
| v3.18.0 | Accounts & Net Worth | 7 | HIGH | Q3 2026 |
| v3.19.0 | Savings Rate Dashboard | 7 | MEDIUM | Q3 2026 |
| v3.20.0 | Savings Goals | 8 | MEDIUM | Q3 2026 |
| v3.21.0 | Annual Report & Smart Spending Alerts | 8 | MEDIUM | Q3 2026 |
| v3.22.0 | Auto-Backup & Data Safety | 8 | HIGH (Critical) | Q3 2026 |
| v3.23.0 | Receipt Photos | 9 | LOW | Q4 2026 |
| v3.24.0 | Multi-Currency Transactions | 9 | LOW | Q4 2026 |
| v3.25.0 | Push Notifications | 9 | LOW | Q4 2026 |
| v3.26.0 | Family Expense Settlement | 9 | LOW | Q4 2026 |

---

## DB Schema Evolution

| DB Version | App Version | Change |
|-----------|------------|--------|
| 1 | v3.10.x | transactions store |
| 2 | v3.11.0 | + recurringTemplates store |
| 3 | v3.13.0 | + budgets store |
| 4 | v3.14.0 | + tags index on transactions |
| 5 | v3.15.0 | + transfer type; fromAccount, toAccount, transferNote fields on transactions (nullable) |
| 6 | v3.16.0 | + appSettings store; optional fields on transactions (all nullable) |
| 7 | v3.18.0 | + accounts store |
| 8 | v3.20.0 | + savingsGoals store |
| 9 | v3.23.0 | + receipts store |

---

## Category Cleanup (Recommended, No Version Needed)

Real usage revealed the built-in category list has structural problems. These can be cleaned up in `js/state.js` at any point — no DB change needed, just updating the default list and removing/merging retired names.

| Current (inconsistent) | Recommended fix |
|---|---|
| `Misc/Buffer`, `Other Expense`, `Shopping` used interchangeably | Consolidate to `Other`; use tags for sub-classification |
| `Utilities/Bills` used for toys, travel, and actual bills | Split into `Utilities` and `Bills` |
| `Savings/Investments` as an expense category | Remove — use Transfer type instead |
| `Debt/Loans` for both outgoing loans and CC payments | Keep for loan repayments; CC payments → Transfer |

---

## Core Principles (Non-Negotiable)

1. Zero dependencies — no npm, no frameworks
2. No external network calls
3. Offline-first — every feature works without internet
4. Privacy-first — all data stays on device
5. IndexedDB for transactions and feature data; localStorage only for the small settings already there
6. Always use `textContent` for user content, never `innerHTML`; always call `sanitizeHTML()` before saving notes
7. Every release: bump `APP_VERSION` in `js/state.js`, `CACHE_NAME` in `sw.js`, `version` in `manifest.json`, and update `CHANGELOG.md`
