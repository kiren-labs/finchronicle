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

## What Comes Next — Proposed Roadmap v3.29–v3.33

### Priority Framework

All remaining features are quality-of-life improvements to an already functional app. Ordering reflects **daily impact × user effort saved**:

- **HIGH** — removes friction from the primary user loop (adding/reviewing transactions)
- **MEDIUM** — meaningful improvement to specific workflows
- **LOW** — nice-to-have, niche use case, or high implementation cost

---

### v3.29.0 — Local Notifications
**Priority: HIGH**
**New file: `js/notifications.js`**

The most impactful remaining gap. Budget warnings and recurring due-date reminders exist as in-app alerts but go unnoticed when the app isn't open.

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
- Version: bump to 3.29.0; add to `CACHE_URLS`

---

### v3.30.0 — Bulk Transaction Operations
**Priority: MEDIUM**

Currently there's no way to recategorize or re-tag multiple transactions at once. This is the biggest friction point when cleaning up historical data (e.g., fixing the category drift problem — nanny salary appearing under 3 different categories over 3 months).

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
- Version: bump to 3.30.0

---

### v3.31.0 — Category Management
**Priority: MEDIUM**

No mechanism currently exists to rename a category across all historical transactions or merge two categories. The real-usage audit found "Shopping" / "Personal/Shopping" used interchangeably, and `Savings/Investments` being used as an expense category when it should be a Transfer. Fixing this now requires a manual transaction-by-transaction edit.

**Three tools:**
1. **Rename category** — changes the category string on all matching transactions in one operation; also updates the category name in `budgets` store if a budget exists for it
2. **Merge categories** — move all transactions from category A into category B (A disappears from the list)
3. **Category cleanup suggestions** — on Settings tab open, detect: any expense category named "Savings" variants (suggest: use Transfer instead) or any category used < 5 times in 12 months (suggest: merge into Other)

**Important constraints:**
- Does not modify the built-in `categories` arrays in `state.js` — those are defaults for new transactions
- Rename/merge writes directly to the `transactions` store via a new `bulkRecategorize(fromCat, toCat)` DB function
- Undo is not supported — show a confirmation: "This will update 23 transactions. Cannot be undone."
- After operation, call `updateUI()` to refresh all views

**Files to modify:**
- `js/db.js` — new `bulkRecategorize(fromCategory, toCategory)` function
- `js/settings.js` — category manager UI (rename/merge form, suggestion engine)
- `js/budget.js` — update budget category key on rename
- `js/app.js` — wire category manager events
- `index.html` — category management section in Settings
- `css/styles.css`, `css/dark-mode.css` — category management styles
- Version: bump to 3.31.0

---

### v3.32.0 — Business & Tax Export
**Priority: MEDIUM**

The `expenseType: "business"` optional field and `referenceId` (receipt/invoice number) were added in v3.16 specifically for business expense tracking, but there's no way to get a business-only export for tax filing. The annual report exports everything — no filter for expense type.

**What it adds:**
- **Business expense report** — filter transactions by `expenseType === "business"`, year selector, sorted by date
- **Reimbursable summary** — all `expenseType === "reimbursable"` transactions, split by settled/outstanding
- **Export formats:**
  - CSV with columns: date, category, amount, merchant, referenceId, notes, expenseType, settled
  - Text summary (for accountant sharing)
- Accessible from the Annual Report section in Reports tab → new "Tax Export" tab alongside year scorecard

**Design notes:**
- No new module needed — extend `js/annual-report.js` with export filter functions
- Reuse the existing `exportToCSV` pattern from `js/import-export.js`
- If neither `business` nor `reimbursable` transactions exist in the selected year, show an informational placeholder

**Files to modify:**
- `js/annual-report.js` — tax export functions, filtered aggregation, tab switch
- `index.html` — tax export tab in Annual Report section
- `css/styles.css`, `css/dark-mode.css` — tab styles (already exist for annual report tabs)
- Version: bump to 3.32.0

---

### v3.33.0 — Receipt Photos
**Priority: LOW**
**New file: `js/receipts.js`**

Previously deferred. Still low priority but the only significant data-capture gap remaining.

**Design constraints (storage-first approach):**
- New IDB store: `receipts` (DB_VERSION → 11)
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
- `js/db.js` — receipts store, DB_VERSION 11 migration
- `js/state.js` — DB_VERSION 11, RECEIPTS_STORE constant
- `js/ui.js` — receipt thumbnail in transaction card
- `js/app.js` — import receipts.js, attach/view events
- `index.html` — file input in form, thumbnail slot in list, receipts settings section
- `css/styles.css`, `css/dark-mode.css` — thumbnail, lightbox, storage meter
- `sw.js` — add `js/receipts.js` to CACHE_URLS; update CACHE_URLS to exclude receipt blobs explicitly
- Version: bump to 3.33.0

---

## Release Timeline

| Version | Feature | DB Version | Priority | Status |
|---------|---------|-----------|---------|--------|
| v3.28.1 | Dashboard & UI/UX fixes (savings rate bug, alert overload, period sync, negative value styling) | 10 | HIGH | Planned |
| v3.29.0 | Local Notifications | 10 | HIGH | Planned |
| v3.30.0 | Bulk Transaction Operations | 10 | MEDIUM | Planned |
| v3.31.0 | Category Management (rename, merge, cleanup) | 10 | MEDIUM | Planned |
| v3.32.0 | Business & Tax Export | 10 | MEDIUM | Planned |
| v3.33.0 | Receipt Photos | 11 | LOW | Planned |

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
| 11 | v3.33.0 | + `receipts` store (planned) |

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
