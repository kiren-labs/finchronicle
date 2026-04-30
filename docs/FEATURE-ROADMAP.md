# FinChronicle Feature Roadmap (Revised March 2026)

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
| v3.16.0 | Optional Fields System | NOT STARTED |
| v3.17.0 | Split Transactions | NOT STARTED |
| v3.18.0 | Savings Rate Dashboard | NOT STARTED |
| v3.19.0 | Savings Goals | NOT STARTED |
| v3.20.0 | Receipt Photos | NOT STARTED |

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

### v3.17.0 — Split Transactions
**Priority: MEDIUM**

Divide one transaction across multiple categories. Also adds a **one-time expense flag** (from real-usage analysis) so monthly reports can distinguish "base spend" from unusual items like flights or school fees.

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
- `js/validation.js` — add `validateSplitTransaction()`
- `js/app.js` — integrate split logic and one-time flag into save/edit flows
- `index.html` — split toggle + split editor UI in form, split badge and one-time badge in list
- `css/styles.css` — split editor, balance indicator, one-time badge
- `sw.js` — bump cache version

No DB version bump needed (new fields are nullable/default on existing transactions).

---

### v3.18.0 — Savings Rate Dashboard
**Priority: MEDIUM**
**New file: `js/savings.js`**

Real usage showed savings of 25k (Jan), 45k (Feb), 0k (Mar) — but the app provides no visibility into savings rate trends or projections. This release adds a dedicated savings view.

**No new IDB store needed.** Savings are derived from:
1. Transactions with `type === 'transfer'` where `toAccount` matches a known savings account
2. Transactions with `category === 'Savings/Investments'` (legacy support for existing data)

**Dashboard widgets:**
- **This month saved:** amount transferred to savings accounts
- **Savings rate:** `savings / income * 100` for the month
- **3-month trend:** savings rate per month (bar chart using existing chart.js infrastructure)
- **Annual projection:** "At this rate, you'll save X by Dec 2026"
- **Running total:** cumulative savings logged since app start

**Settings:** User designates which account names count as "savings accounts" (e.g. "SCB Savings", "Savings Jar"). Stored in `appSettings` (added in v3.16).

**Files:**
- `js/savings.js` (new) — rate calculation, projection, trend data
- `js/ui.js` — add savings dashboard section to Summary tab
- `index.html` — savings dashboard HTML in Summary tab
- `css/styles.css` — savings rate card, projection widget
- `css/dark-mode.css` — dark mode support
- `sw.js` — add `js/savings.js` to `CACHE_URLS`, bump cache version

---

### v3.19.0 — Savings Goals
**Priority: MEDIUM**
**New file: `js/goals.js`**

Track progress toward savings targets (vacation fund, emergency fund, etc.).

**New IDB store: `savingsGoals` (DB_VERSION → 7)**
```javascript
{
  id: number,
  name: string,
  targetAmount: number,
  currentAmount: number,
  deadline: 'YYYY-MM-DD',
  linkedAccount: string | null,  // account name from v3.15 Transfer accounts
  createdAt: ISO8601
}
// Index: deadline
```

**UI:** Goals section in Summary tab. Circular progress indicators. Manual contribution button (logs a Transfer). Milestone celebrations at 25/50/75/100%.

**Files:**
- `js/goals.js` (new) — CRUD, progress calculation, milestone detection
- `js/db.js` — add `savingsGoals` store, bump to DB_VERSION 7
- `js/state.js` — bump `DB_VERSION` to 7
- `js/app.js` — import goals.js
- `index.html` — goals section
- `css/styles.css` — circular progress, goal cards
- `sw.js` — bump cache version

---

### v3.20.0 — Receipt Photos
**Priority: LOW**
**New file: `js/receipts.js`**

Attach photo receipts to transactions. Conservative storage: 500KB max per image with Canvas-based compression.

**New IDB store: `receipts` (DB_VERSION → 8)**
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
| v3.15.0 | Transfer Transaction Type | 5 | HIGH |
| v3.16.0 | Optional Fields + Smart Suggestions + Envelopes | 6 | MEDIUM |
| v3.17.0 | Split Transactions + One-Time Flag | 6 | MEDIUM |
| v3.18.0 | Savings Rate Dashboard | 6 | MEDIUM |
| v3.19.0 | Savings Goals | 7 | MEDIUM |
| v3.20.0 | Receipt Photos | 8 | LOW |

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
| 7 | v3.19.0 | + savingsGoals store |
| 8 | v3.20.0 | + receipts store |

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
