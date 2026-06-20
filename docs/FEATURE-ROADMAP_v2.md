# FinChronicle Feature Roadmap

> Last updated: 2026-06-20
> Current version: v4.7.0

---

## Project Status — Everything Through v4.1.0 is Complete

All features from the previous roadmap have shipped. The app is now a full personal finance stack built on vanilla JS + IndexedDB with no external dependencies.

| Version | Feature                                                                                               | Released     |
| ------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| v3.10.x | Core app, ES modules, validation, pie chart, WCAG AA                                                  | Jan–Mar 2026 |
| v3.11.0 | Recurring Transactions                                                                                | Mar 2026     |
| v3.12.0 | Complete Reports (bar chart, weekly, heatmap, range selector)                                         | Mar 2026     |
| v3.13.0 | Budget Limits & Alerts                                                                                | Mar 2026     |
| v3.14.0 | Tags & Full-Text Search                                                                               | Mar 2026     |
| v3.15.0 | Transfer Transaction Type + Audit Trail (soft delete)                                                 | Apr 2026     |
| v3.16.0 | Optional Fields System (payment method, merchant, expense type, attachedTo, referenceId, location)    | Apr 2026     |
| v3.17.0 | Quick Entry Templates                                                                                 | Apr 2026     |
| v3.18.0 | Accounts & Net Worth                                                                                  | Apr 2026     |
| v3.19.0 | Savings Rate Dashboard                                                                                | May 2026     |
| v3.20.0 | Savings Goals with progress + milestones                                                              | May 2026     |
| v3.21.0 | Smart Spending Alerts + Annual Report                                                                 | May 2026     |
| v3.22.0 | Auto-Backup (AES-GCM-256 encryption, storage health)                                                  | May 2026     |
| v3.24.0 | Multi-Currency Transactions (per-transaction FX + exchange rate history)                              | May 2026     |
| v3.26.0 | Family Expense Settlement (per-person balance from `attachedTo` tags)                                 | May 2026     |
| v3.26.1 | Technical fixes (exchange rate validation, error toasts)                                              | May 2026     |
| v3.27.0 | Reimbursement Workflow (mark-as-settled flow + settlement dashboard breakdown)                        | May 2026     |
| v3.28.0 | Net Worth Trend (monthly snapshot store + SVG line chart)                                             | May 2026     |
| v4.0.0  | Asset/Liability Classification, Transaction Linking, Reconciliation Workflow                          | May 2026     |
| v4.1.0  | Cash-Flow Forecast (30/60/90d), Financial Health Alerts (4 types), account-linked recurring           | May 2026     |
| v4.1.1  | Accessibility contrast audit, export/restore data integrity, alert deduplication, SW error log filter | May 2026     |
| v4.2.0  | Backup & Restore Overhaul — full envelope, UI consolidation, merge/replace modes, SHA-256 integrity   | May 2026     |
| v4.2.1  | Copy & language overhaul — plain-English errors, jargon removal, sentence case, i18n foundation       | Jun 2026     |
| v4.3.0  | App Lock — PIN gate + biometric (WebAuthn), auto-lock timeout, lock-now header button                 | Jun 2026     |

---

## Architecture Snapshot (as of v4.1.0)

**27 JS modules, DB_VERSION 12, 8 IndexedDB stores**

| Store                | Purpose                                                                                      | Since        |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------ |
| `transactions`       | All transaction data + audit trail (soft-delete). Status: `pending`\|`cleared`\|`reconciled` | v3.10        |
| `recurringTemplates` | Recurring templates with due-date tracking + account links                                   | v3.11        |
| `budgets`            | Per-category monthly budget limits                                                           | v3.13        |
| `appSettings`        | Optional fields config + smart category keywords                                             | v3.16        |
| `quickTemplates`     | Quick Entry templates (max 20)                                                               | v3.17        |
| `accounts`           | Account definitions with `classification: 'asset'\|'liability'`                              | v3.18 / v4.0 |
| `savingsGoals`       | Savings goals with milestone tracking                                                        | v3.20        |
| `netWorthSnapshots`  | Monthly net worth snapshots for trend chart (unique index: snapshotDate)                     | v3.28        |

**Transaction schema fields (as of v4.1.0):**
Core: `id`, `type`, `amount`, `category`, `date`, `notes`, `tags`, `status`, `createdAt`, `updatedAt`, `deleted`, `deletedAt`
Transfer: `fromAccount`, `toAccount`, `transferNote`
Optional (v3.16): `paymentMethod`, `merchant`, `expenseType`, `attachedTo`, `referenceId`, `location`
Multi-currency (v3.24): `transactionCurrency`, `exchangeRate`, `homeAmount`
Reimbursement (v3.27): `settled`, `settledAt`, `settledBy`
Recurring link: `recurringId`

---

## Permanently Deferred — Will Not Build

These were considered and consciously ruled out. Revisiting requires a concrete use case and real usage data.

| Feature                                | Why Not                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Split Transactions                     | Approximable with tags; only 2–3 qualifying transactions observed in 3 months of real data. High implementation cost for low frequency. |
| Budget Envelope Groups                 | Category budgets are granular enough. Envelope grouping would add UI complexity for unclear gain.                                       |
| Recurring Auto-Match Suggestions       | Heuristic-based; high false-positive risk. The manual recurring template workflow is already fast.                                      |
| One-Time Expense Flag                  | Tags (`#one-time`, `#annual`) cover this without a schema change.                                                                       |
| Contribution-Creates-Transfer in Goals | Auto-created transfers add transactions the user didn't explicitly enter. Confusing in the list. Manual update is cleaner.              |

---

## v4.1.1 — Accessibility, Data Integrity & Alert Quality Patch

**Priority: HIGH**
**No new modules, no DB changes**

Post-release audit identified contrast failures across light and dark mode, data loss in CSV/JSON export-restore, and a duplicate alert problem introduced with v4.1.0 health alerts. All are purely CSS/JS fixes.

---

### Fix 1 — Monthly-pace alert fires alongside existing budget alert (duplicate noise)

**File:** `js/alerts.js` → `checkMonthlyPace()`

When a category's current spending already reached or exceeded the budget limit, both the existing budget alert ("Groceries at 97%") and the new monthly-pace alert ("on pace for ฿11,822") fired simultaneously. The pace alert is an early warning — it should only fire while there is still time to act (spend below limit but trending over).

**Fix:** Skip monthly-pace for any category where `spent >= budget.monthlyLimit`. Budget alert already covers that case.

---

### Fix 2 — CSV/JSON export missing fields introduced in v4.0 and v4.1

**Files:** `js/import-export.js`, `js/auto-backup.js`

`exportToCSV()` and `buildCsvBackup()` did not include `tags`, `status` (pending/cleared/reconciled), `recurringId`, `settled`, `settledAt`, `settledBy`. Tags silently dropped on every CSV export — permanent data loss on round-trip.

**Fix:** All fields now included in every export format (CSV export, full backup CSV, auto-backup CSV). Import and restore parse them back correctly.

---

### Fix 3 — JSON backup restore only recovered transactions, dropped all other stores

**File:** `js/import-export.js` → `processRestoredData()`, `confirmRestore()`

Restoring an encrypted `.enc` backup (JSON format) recovered transactions but silently discarded `recurringTemplates`, `budgets`, `accounts`, `savingsGoals`, and `quickTemplates` — the user lost all configuration after a full restore.

**Fix:** `confirmRestore()` now saves all stores back to IndexedDB when present in the backup payload, then reloads full state.

---

### Fix 4 — CSV import mutated state before DB write

**File:** `js/import-export.js` → `importFromCSV()`

`state.transactions.unshift(txn)` ran inside the row-parsing loop before `bulkSaveTransactionsToDB()`. If the DB write failed, state showed imported data that was never persisted.

**Fix:** State is only updated after a successful DB write.

---

### Fix 5 — WCAG AA contrast failures across light and dark mode

**Files:** `css/tokens.css`, `css/styles.css`, `css/dark-mode.css`

Multiple contrast failures identified via accessibility audit:

| Element                                                         | Problem                                                                                      | Fix                                                                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `.net-worth-value`, `.nw-item-value`, `.account-balance-amount` | `--color-income` (#34c759) on white = 2.1:1 — fails all WCAG levels                          | New `--color-income-text: #1a7a3a` (5.4:1) and `--color-expense-text: #C41E1A` (5.9:1) tokens. Dark mode: `#34c759` / `#FF6B6B` |
| `.savings-widget-value.low`                                     | Red on blue highlight bg = 3.4:1 — fails normal text                                         | Switched to `--color-expense-text`                                                                                              |
| `.savings-widget-label`, `.savings-widget-sub` on highlight     | Muted text on blue bg = 4.4:1 — fails normal text                                            | Override to `--color-text` on `.savings-widget.highlight`                                                                       |
| `.type-option .type-label`                                      | `opacity: 0.6` on 8px text = ~2.6:1 — fails                                                  | Removed opacity, bumped to 9px, set `color: var(--color-text)`                                                                  |
| `.backup-message`                                               | `opacity: 0.9` on success-strong text = ~3.8:1 — fails                                       | Removed opacity                                                                                                                 |
| `.storage-warning-text` dark mode                               | `--color-warning-text: #FCD34D` on light-mode `--color-warning-bg: #fff3cd` — near identical | Added `--color-warning-bg: #2d2200` and `--color-warning-border: #b45309` dark mode tokens                                      |

All text colour uses of `--color-income` / `--color-expense` (net worth, settlement, annual report, reconciliation, goals, savings, forecast amounts) migrated to the new accessible tokens. Display uses (chart bars, SVG strokes, backgrounds) unchanged.

---

### Fix 6 — SW script load failures logged as app errors

**File:** `js/app.js` → `window.onerror`

Transient network failures when the Service Worker tries to fetch `sw.js` (background update check on tab focus) were captured by `window.onerror` and written to the in-app error log, causing false entries like "Script sw.js load failed". These are browser-level network hiccups, not app bugs.

**Fix:** `window.onerror` now filters SW script load failures before logging.

---

### v4.1.1 Files Modified

| File                  | Change                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/alerts.js`        | `checkMonthlyPace()` — skip categories already at/over budget limit                                                                           |
| `js/import-export.js` | Add `tags`, `status`, `recurringId`, `settled*` to all export formats; restore all stores on JSON restore; fix state mutation order in import |
| `js/auto-backup.js`   | `buildCsvBackup()` — full field parity with `createBackup()`                                                                                  |
| `js/app.js`           | Filter SW load failures from `window.onerror`                                                                                                 |
| `css/tokens.css`      | Add `--color-income-text` and `--color-expense-text` tokens                                                                                   |
| `css/styles.css`      | Migrate all text colour uses to `*-text` tokens; fix type-label opacity; fix backup-message opacity                                           |
| `css/dark-mode.css`   | Dark mode token overrides for new text tokens and warning bg/border; remove redundant explicit overrides                                      |
| `js/state.js`         | Bump `APP_VERSION` → `4.1.1`                                                                                                                  |
| `sw.js`               | Bump `CACHE_NAME` → `finchronicle-v4.1.1`                                                                                                     |
| `manifest.json`       | Bump `version` → `4.1.1`                                                                                                                      |

---

## What Comes Next — Proposed Roadmap v4.4–v4.15

> **Roadmap revised 2026-05-23** — Backup & Restore Overhaul inserted as v4.2.0 (data safety priority). Actionable Spending Insights moves to v4.3.0. All subsequent versions shift by one.

### Priority Framework

- **HIGH** — fills a genuine accounting blind spot or removes primary-loop friction
- **MEDIUM** — meaningful improvement to a specific workflow
- **LOW** — nice-to-have, niche use case, or high implementation cost

---

### v4.2.0 — Backup & Restore Overhaul

**Priority: HIGH**
**Full plan:** `docs/backup-restore-plan-v4.2.md`
**No new modules — extends `js/auto-backup.js`, `js/import-export.js`, `js/db.js`**

Fixes silent data loss in the existing backup/restore system and consolidates the scattered backup UI into one card. A user relying on "Create Backup" today loses accounts, budgets, recurring templates, goals, and net worth history on restore.

**Three phases:**

**Phase 1 — Data completeness (no UI change)**

- `buildJsonBackup()` made async; includes all 8 IDB stores (`netWorthSnapshots` added via explicit IDB read) + `exchangeRateHistory` + `tagColors` from localStorage
- `confirmRestore()` saves all stores back: `appSettings`, `netWorthSnapshots`, localStorage keys
- `backupSchemaVersion: 1` added to envelope
- SHA-256 integrity field — two-pass serialization, verified on restore (warn on mismatch, don't block)
- One-shot migration: stored `backupFormat: 'csv'` → `'json'` on init
- `migrateBackupPayload()` — handles schema 0 (no `backupSchemaVersion`) → 1 up-conversion

**Phase 2 — UI consolidation**

- Remove 4 scattered Settings toolbar buttons (Export CSV, Import CSV, Create Backup, Restore Backup)
- Add single static "Data & Backup" card in `index.html` with four sections: Export, Backup, Auto-Backup, Restore
- Remove CSV format option from auto-backup (always JSON)
- Unified file input `accept=".json,.enc,.csv"` with explicit format routing in handler
- Auto-backup card becomes static HTML; JS only updates last-backup date and toggle state

**Phase 3 — Hardening**

- Merge vs Replace restore modes: merge = append missing records; replace = `clearAllStores(storesToClear)` then write
- Replace mode: red button + extra confirmation step, only clears stores present in backup payload
- `migrateBackupPayload()` extended for future schema versions

**What a verified restore guarantees after v4.2.0:**
All 8 IDB stores + `exchangeRateHistory` + `tagColors`. Not restored: `currency`, `darkMode`, UI prefs (device preferences, not data).

**Files to modify:**

- `js/auto-backup.js` — async `buildJsonBackup()`, full envelope, remove `renderAutoBackupSettings()`, add `updateAutoBackupUI()`
- `js/import-export.js` — `confirmRestore()` all stores, `handleRestoreFileInput()` format routing, `migrateBackupPayload()`, merge/replace modes
- `js/db.js` — add `getAllNetWorthSnapshots()`, `bulkSaveNetWorthSnapshots()`, `clearAllStores()`, confirm `saveAppSettings()`
- `js/app.js` — one-shot CSV setting migration, rebind events for new unified buttons
- `index.html` — remove old toolbar buttons, add static "Data & Backup" card
- `css/styles.css`, `css/dark-mode.css` — Data & Backup card section styles
- Version: bump to 4.2.0

---

### v4.4.0 — Actionable Spending Insights

**Priority: HIGH**
**No new module — extends `js/alerts.js`**

The current alert system is data-driven — it tells you what happened. This adds a `suggestion` field to every alert, computed from existing state, that tells you what to do about it. No backend, no AI — pure JS heuristics on top of the rolling averages and budget data already calculated.

**How it works:**

Each alert gets an optional `suggestion` string computed at detection time:

```javascript
// Weekly spike alert — suggests trimming to 90-day average
alerts.push({
  type: ALERT_TYPES.WEEKLY_SPIKE,
  message: `${cat}: ${pct}% above weekly average`,
  suggestion: `Consider keeping ${cat} under ${formatCurrency(Math.round(avg))} this week — your 90-day weekly average.`,
  ...
})

// Monthly pace alert — calculates the daily spend needed to hit budget
alerts.push({
  type: ALERT_TYPES.MONTHLY_PACE,
  message: `${cat} on pace for ${formatCurrency(projected)} — budget is ${formatCurrency(limit)}`,
  suggestion: `Spend no more than ${formatCurrency(Math.round(remainingBudget / remainingDays))}/day on ${cat} to stay within budget.`,
  ...
})

// Savings rate trend — quantifies the monthly shortfall
alerts.push({
  type: ALERT_TYPES.SAVINGS_RATE_TREND,
  message: `Savings rate below 10% for 3 months`,
  suggestion: `At your average income of ${formatCurrency(avgIncome)}, saving 20% means cutting expenses by ${formatCurrency(gap)}/month.`,
  ...
})
```

**UI:** Suggestions rendered below the alert message in a muted style — secondary text, no icon, clearly subordinate to the alert. Dismissed with the same dismiss button.

**Alert-to-suggestion mapping:**

| Alert type             | Suggestion formula                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Weekly spike           | "Keep {cat} under {90d weekly avg} this week"                                      |
| Monthly pace           | "Spend ≤ {remaining budget ÷ remaining days}/day on {cat}"                         |
| Savings rate trend     | "Cut expenses by {income × 20% − current savings}/month to reach 20% savings rate" |
| Bill due + low balance | "Transfer {shortfall} to {account} before {due date}"                              |
| Category drift         | "Last month you spent {lastMonth} — this month is on track for {projected}"        |

**Key constraints:**

- Suggestions are advisory only — never blocking, never persistent
- Only shown when the maths produces a meaningful number (e.g., no suggestion if remainingDays ≤ 0)
- Uses `formatCurrency()` throughout — respects user's currency setting
- No new state, no DB changes

**Files to modify:**

- `js/alerts.js` — add `suggestion` field computation in each `check*` function
- `css/styles.css`, `css/dark-mode.css` — `.smart-alert-suggestion` muted sub-text style
- `index.html` — render suggestion in `renderAlertBanner()` template
- Version: bump to 4.4.0

---

### v4.5.0 — Budget vs Actual Report

**Priority: HIGH**
**No new module — extends `js/budget.js`**

Budgets and alerts exist but there is no consolidated view showing all categories side-by-side with variance. The fastest win: pure render change, no DB changes.

**Report layout (Summary tab → Budget section):**

```
Category       Budget    Actual    Variance    % Used
Food           ฿8,000   ฿6,400    +฿1,600       80%
Transport      ฿5,000   ฿7,200    -฿2,200      144% ⚠
Utilities      ฿3,000   ฿2,950    +฿50          98%
──────────────────────────────────────────────────
Total         ฿16,000  ฿16,550    -฿550        103%
```

**Key behaviors:**

- Period selector synced to `state.currentFilter`
- Rows > 100% highlighted in `--color-danger`; 80–100% in `--color-warning`
- Unbudgeted categories shown separately at bottom
- Totals row with overall budget adherence %
- Export as CSV (reuses existing `exportToCSV` pattern)

**Files to modify:**

- `js/budget.js` — `getBudgetVsActual(period)` aggregation + table render
- `js/annual-report.js` — reuse for year-level budget vs actual
- `index.html` — budget table in Summary tab
- `css/styles.css`, `css/dark-mode.css` — table + variance column coloring
- Version: bump to 4.5.0

---

### v4.6.0 — Financial Health Ratios

**Priority: HIGH**
**No new module — extends `js/savings.js`**

Beyond savings rate, no diagnostic ratios exist. Four KPIs computed entirely from existing IndexedDB data.

**Four ratios (KPI cards in Summary tab):**

| Ratio          | Formula                                        | Healthy Target                              |
| -------------- | ---------------------------------------------- | ------------------------------------------- |
| Emergency Fund | liquid savings balance ÷ avg monthly expenses  | ≥ 6 months                                  |
| Debt-to-Income | total monthly debt repayments ÷ monthly income | < 36%                                       |
| Housing Cost   | rent/mortgage expense ÷ monthly income         | < 30%                                       |
| Savings Rate   | amount saved ÷ monthly income                  | ≥ 20% (already in v3.19 — surface here too) |

**UI:** 2×2 KPI grid, each card shows ratio value + target indicator (green/yellow/red). Cards hidden if < 2 months of data. Summary line: "3 of 4 ratios are healthy."

**Files to modify:**

- `js/savings.js` — ratio calculation functions (Savings Rate already computed in v3.19 — re-render existing value, do not re-implement)
- `js/ui.js` — render ratio cards
- `index.html` — health ratio grid in Summary tab
- `css/styles.css`, `css/dark-mode.css` — ratio card styles
- Version: bump to 4.6.0

---

### v4.7.0 — Subscription Tracker

**Priority: MEDIUM**
**No new module — extends `js/recurring.js`**

Filtered view of `recurringTemplates` showing all active subscriptions with monthly/annual totals. Low implementation effort, high daily insight.

**What counts as a subscription:**

- Any recurring template with `frequency: 'monthly'` or `'yearly'` and `type: 'expense'`
- Optional `isSubscription: true` flag on template for explicit tagging (nullable, no DB bump)

**Dashboard (new section in Recurring tab):**

```
Active Subscriptions                          ฿2,340/month

  Netflix          ฿419/mo    due Jun 15
  Spotify          ฿129/mo    due Jun 20
  Gym              ฿1,200/mo  due Jun 5
─────────────────────────────────────────
  Total            ฿2,340/mo  = ฿28,080/yr
  % of Income      18.5% of ฿12,650 avg income
```

**Files to modify:**

- `js/recurring.js` — `getSubscriptions()` helper, total calculation
- `index.html` — subscription section in Recurring tab
- `css/styles.css`, `css/dark-mode.css` — subscription list styles
- Version: bump to 4.7.0

---

### v4.8.0 — Duplicate Transaction Detection

**Priority: MEDIUM**
**No new module — extends `js/validation.js`**

Inline warning before saving when a transaction closely matches an existing one. Critical for data integrity, especially once bank statement import is added.

**Duplicate criteria (all three must match):**

```javascript
function detectDuplicate(candidate, existingTransactions) {
  return existingTransactions.find(
    (tx) =>
      !tx.deleted &&
      tx.type === candidate.type &&
      tx.category === candidate.category &&
      Math.abs(tx.amount - candidate.amount) / candidate.amount < 0.05 && // within 5%
      Math.abs(daysBetween(tx.date, candidate.date)) <= 2,
  );
}
```

**UX:** Inline warning in form (not blocking): "This looks like a duplicate of [Mar 15 — Grab — ฿245]. Add anyway?" Two buttons: "Yes, add it" / "View existing". Never blocks.

**Files to modify:**

- `js/validation.js` — `detectDuplicate()` function
- `js/app.js` — call in save handler, show inline warning
- `index.html` — duplicate warning slot in form
- `css/styles.css` — warning banner style
- Version: bump to 4.8.0

---

### v4.9.0 — Bank Statement CSV Importer

**Priority: MEDIUM**
**Extends `js/import-export.js` (lazy-loaded)**

Generic column mapper that accepts any bank's CSV export — no fixed format assumed.

**Import flow:**

1. Upload bank CSV
2. Column mapper UI — user maps Date/Amount/Description to schema fields
3. Date format selector (autodetected where possible)
4. Preview table (first 10 rows)
5. Import with duplicate detection (v4.7) on every row
6. Summary: "Imported 45 transactions. 3 duplicates skipped."

**Saved mappings:** Store column mapping per bank name in `appSettings` IDB store (up to 5). Auto-applied on next import from same bank.

**Key behaviors:**

- Runs entirely client-side — file never leaves device
- Auto-detect category from notes using smart suggestions (v3.16 keyword engine)
- Uses existing `validateTransaction()` + `bulkSaveTransactionsToDB()` pipeline
- No DB changes needed

**Files to modify:**

- `js/import-export.js` — `importFromBankCSV()`, column mapper UI, saved mappings
- `index.html` — bank import section in Settings
- `css/styles.css`, `css/dark-mode.css` — column mapper, preview table
- Version: bump to 4.9.0

**Note:** Saved column mappings stored in `appSettings` IDB store (not localStorage) to maintain the pattern of "localStorage only for small settings."

---

### v4.10.0 — Local Notifications

**Priority: HIGH**
**New file: `js/notifications.js`**

Budget warnings and recurring due-date reminders exist as in-app alerts but go unnoticed when the app isn't open.

**Implementation:** Notification API + Service Worker `showNotification()` — local only, no push server, works offline. Permission requested only from an explicit Settings toggle.

**Four notification types:**

- **Recurring due** — "Rent is due tomorrow"
- **Budget warning** — "Food budget 80% used with 10 days left"
- **Inactivity nudge** — "You haven't logged anything in 3 days"
- **Backup reminder** — "No backup in 14 days"

**Settings:** Per-type enable/disable toggles. Quiet hours (e.g., 10pm–8am). Notification history (last 10).

**Files to create/modify:**

- `js/notifications.js` (new) — permission management, trigger logic, quiet hours
- `js/settings.js` — notification preferences UI
- `js/app.js` — trigger checks on init and transaction save
- `sw.js` — `notificationclick` handler + add to `CACHE_URLS`
- `index.html` — notification settings section
- `css/styles.css`, `css/dark-mode.css` — preference toggle styles
- Version: bump to 4.10.0

**Note:** Quiet hours use local `Date` object — no explicit timezone handling needed since all data is device-local.

---

### v4.11.0 — Bulk Transaction Operations

**Priority: MEDIUM**

No way to recategorize or re-tag multiple transactions at once. Primary friction when cleaning up historical data or after a bank statement import.

**Operations:**

- Bulk recategorize
- Bulk add/remove tag
- Bulk soft-delete
- Bulk set expenseType

**UI:** "Select" mode toggle in List tab header. Tap to select (checkboxes). Sticky action bar when N > 0: "Recategorize | Tag | Delete | Cancel". Confirmation step for delete.

**Files to modify:**

- `js/ui.js` — select mode rendering, selection state, action bar (keep `selectedTransactionIds` module-local in `ui.js` — UI-only state, not persisted)
- `js/app.js` — bulk operation handlers
- `js/db.js` — extend `bulkSaveTransactionsToDB` for bulk soft-delete
- `css/styles.css`, `css/dark-mode.css` — selection styles, bulk action bar
- Version: bump to 4.11.0

---

### v4.12.0 — Category Management

**Priority: MEDIUM**

No mechanism to rename a category across all transactions or merge two categories. Real-usage audit found "Shopping" / "Personal/Shopping" used interchangeably.

**Three tools:**

1. **Rename** — changes category string on all matching transactions + updates `budgets` store key
2. **Merge** — move all transactions from category A into B
3. **Cleanup suggestions** — detect rarely-used categories (< 5 times in 12 months), suggest merge

**Constraints:** Does not modify built-in `categories` in `state.js`. Confirmation shown: "This will update 23 transactions. Cannot be undone."

**Files to modify:**

- `js/db.js` — `bulkRecategorize(fromCategory, toCategory)`
- `js/settings.js` — category manager UI
- `js/budget.js` — update budget key on rename
- `js/app.js` — wire events
- `index.html` — category management in Settings
- `css/styles.css`, `css/dark-mode.css` — manager styles
- Version: bump to 4.12.0

**Note:** Category Management is a soft prerequisite for Bank CSV Import — clean categories make auto-categorization more accurate. Can ship independently but benefits from being available first.

---

### v4.13.0 — Business & Tax Export

**Priority: MEDIUM**

`expenseType: "business"` and `referenceId` (receipt/invoice) exist since v3.16 but there's no business-only export for tax filing.

**What it adds:**

- Tax year configuration (Settings: choose start month — Jan, Apr, Jul)
- Business expense report filtered by `expenseType === "business"`
- Reimbursable summary split by settled/outstanding
- Export: CSV + plain text summary for accountant sharing
- New "Tax Export" tab in Annual Report section

**Files to modify:**

- `js/annual-report.js` — tax export, filtered aggregation, tax-year-aware date ranges
- `js/settings.js` — tax year start month selector
- `js/state.js` — add `taxYearStartMonth` to default appSettings
- `index.html` — tax year setting, tax export tab
- `css/styles.css`, `css/dark-mode.css` — tab styles
- Version: bump to 4.13.0

---

### v4.16.0 — Thai Tax Estimator

**Priority: MEDIUM**
**New file: `js/tax.js`**
**Gated on: `getCurrency().code === 'THB'`**

Reads salary income already logged in the app and shows the user their estimated Thai personal income tax, how much they are saving via deductions, and how much they could still save with unused deduction vehicles. Invisible to non-THB users — no UI shown, no calculations run.

**Why this fits the app's constraints:**

- Zero external API calls — Thai tax brackets are static constants
- All data already in IndexedDB (salary transactions)
- Works offline
- Expat-friendly: Thai deductions are based on tax residency (180+ days), not citizenship — all instruments (SSF, RMF, PVD, health insurance) are available to work-permit holders

---

**Two phases, shippable independently:**

**Phase 1 — Salary-Derived Tax Insight (low effort, ~150 lines)**

Reads from existing `type: 'income', category: 'Salary'` transactions. No new data entry.

Adds a "Tax Estimate" card to the Reports tab (hidden unless currency = THB):

```
Income This Year (YTD)        ฿800,000
Estimated Tax (current rate)  ฿90,000
Effective Rate                11.3%
Marginal Bracket              20%

Unused SSF room               ฿200,000  → could save ฿40,000 in tax
Unused PVD room (15% − 3%)   ฿96,000   → could save ฿19,200 in tax
Total potential saving         ฿59,200
```

One toggle in Settings: "I pay Thai personal income tax" — enables the insight. Defaults to hidden.

**Phase 2 — Full Tax Planner Panel (medium effort)**

A settings panel where the user enters their deduction setup once, stored in `appSettings`:

```javascript
appSettings.taxProfile = {
  enabled: true,
  pvdEmployeeRate: 3, // % — default 3, max 15
  ssfContributed: 0, // THB this year
  rmfContributed: 0, // THB this year
  lifeInsurancePremium: 0, // THB this year
  healthInsurancePremium: 0, // THB this year
  personalAllowance: 60000, // fixed
  spouseAllowance: 60000, // toggle
  childrenCount: 1, // × ฿30,000 each
  parentAllowance: 0, // × ฿30,000 each (max 2)
  socialSecurity: 9000, // auto-filled from ฿750 × months
};
```

Output — side-by-side comparison:

|                    | Current      | Optimised    |
| ------------------ | ------------ | ------------ |
| Gross income       | ฿1,500,000   | ฿1,500,000   |
| Total deductions   | ฿280,000     | ฿680,000     |
| Net taxable income | ฿1,220,000   | ฿820,000     |
| **Tax bill**       | **฿194,000** | **฿114,000** |
| **You save**       | —            | **฿80,000**  |

Slider to adjust PVD rate (3%–15%) with live tax recalculation. Each deduction row shows: current amount, max allowed, incremental tax saving.

---

**Thai tax brackets (2026, hardcoded constants):**

```javascript
const THB_TAX_BRACKETS = [
  { upTo: 150_000, rate: 0.0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.1 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];
```

**Deduction caps (hardcoded — Revenue Department rules):**

```javascript
const DEDUCTION_CAPS = {
  employment: 100_000, // 50% of income, max ฿100,000
  personal: 60_000,
  spouse: 60_000,
  perChild: 30_000,
  perParent: 30_000, // max 2 parents
  socialSecurity: 9_000, // actual paid, capped
  pvdRmfSsfCombined: 500_000, // combined retirement savings cap
  ssfMax: 200_000, // sub-cap within combined
  lifeHealthCombined: 100_000, // life insurance + health insurance combined
};
```

**Currency guard — always applied first:**

```javascript
export function renderTaxInsight() {
  if (getCurrency().code !== "THB") return; // silently skip
  if (!state.appSettings?.taxProfile?.enabled) return;
  // ... render
}
```

**Always reads `homeAmount` not display amount** — correct for multi-currency salary entries.

---

**Files to create/modify:**

- `js/tax.js` (new) — bracket calculator, deduction engine, render functions
- `js/state.js` — add `taxProfile` to `DEFAULT_APP_SETTINGS`
- `js/settings.js` — tax profile settings panel (Phase 2)
- `js/app.js` — import + bind events
- `index.html` — tax insight card in Reports tab; tax profile in Settings (Phase 2)
- `css/styles.css`, `css/dark-mode.css` — tax card, comparison table, PVD slider
- `sw.js` — add `js/tax.js` to `CACHE_URLS`
- Version: bump to 4.16.0

**Note:** Phase 1 ships in v4.16.0. Phase 2 (full planner) can follow as v4.16.1 or be bundled if implementation time allows. No DB version bump required — `taxProfile` is stored inside the existing `appSettings` IDB store.

---

### v4.14.0 — Loan / EMI Tracker

**Priority: MEDIUM**
**New file: `js/loans.js`**

Currently EMIs are logged as recurring expenses — no view of outstanding principal, interest vs principal split, or payoff date.

**New IDB store: `loans` (DB_VERSION → 13)**

```javascript
{
  id: string,
  name: string,              // "Home Loan — SBI"
  principalAmount: number,
  outstandingPrincipal: number,
  interestRate: number,      // annual %
  tenureMonths: number,
  startDate: 'YYYY-MM-DD',
  emiAmount: number,         // computed: P×r×(1+r)^n / ((1+r)^n - 1)
  linkedRecurringId: string | null,
  isActive: boolean,
  createdAt: ISO8601
}
```

**Loan dashboard:** Total outstanding debt. Per-loan card: outstanding principal, next EMI, payoff date, total interest remaining. Amortization table (first 12 months, collapsible). Early payoff calculator.

**Files to create/modify:**

- `js/loans.js` (new)
- `js/db.js` — loans store, DB_VERSION 13
- `js/state.js` — DB_VERSION 13
- `js/savings.js` — update debt-to-income ratio to include loan EMIs
- `js/app.js` — import + events
- `index.html` — loan section
- `css/styles.css`, `css/dark-mode.css`
- `sw.js` — add to CACHE_URLS
- Version: bump to 4.14.0

---

### v4.15.0 — Receipt Photos

**Priority: LOW**
**New file: `js/receipts.js`**

Last significant data-capture gap. Storage-first constraints apply.

**New IDB store: `receipts` (DB_VERSION → 14)**

- Schema: `{ id, transactionId, imageBlob, fileSize, uploadedAt }`
- Canvas API compression: JPEG 800px max width, quality 0.7 (~100–150KB per receipt)
- Hard limit: refuse upload if storage > 80% quota
- SW must NOT cache receipt blobs

**UI:** Optional attach button in form. Thumbnail in transaction list. Tap → lightbox + Download. Settings section with storage usage + delete-old-receipts prompt.

**Files to create/modify:**

- `js/receipts.js` (new)
- `js/db.js` — receipts store, DB_VERSION 14
- `js/state.js` — DB_VERSION 14
- `js/ui.js` — receipt thumbnail in transaction card
- `js/app.js` — import + events
- `index.html` — file input in form, receipts settings
- `css/styles.css`, `css/dark-mode.css`
- `sw.js` — add to CACHE_URLS, exclude blobs from cache
- Version: bump to 4.15.0

---

## Release Summary Table

| Version | Feature                                                                    | DB Version | Priority | Status     |
| ------- | -------------------------------------------------------------------------- | ---------- | -------- | ---------- |
| v4.1.0  | Cash-Flow Forecast (30/60/90d) + Financial Health Alerts                   | 12         | HIGH     | ✅ Shipped |
| v4.1.1  | Accessibility, data integrity & alert quality patch                        | 12         | HIGH     | ✅ Shipped |
| v4.2.0  | Backup & Restore Overhaul — full envelope, UI consolidation, merge/replace | 12         | HIGH     | ✅ Shipped |
| v4.2.1  | Copy & language overhaul — plain-English errors, jargon removal, i18n      | 12         | HIGH     | ✅ Shipped |
| v4.3.0  | App Lock — PIN + biometric (WebAuthn), auto-lock, lock-now button          | 12         | HIGH     | ✅ Shipped |
| v4.4.0  | Actionable Spending Insights — `suggestion` field on every alert           | 12         | HIGH     | ✅ Shipped |
| v4.5.0  | Budget vs Actual Report — consolidated variance table                      | 12         | HIGH     | ✅ Shipped |
| v4.6.0  | Financial Health Ratios (emergency fund, debt-to-income, housing cost)     | 12         | HIGH     | ✅ Shipped |
| v4.7.0  | Subscription Tracker                                                       | 12         | MEDIUM   | ✅ Shipped |
| v4.8.0  | Duplicate Transaction Detection                                            | 12         | MEDIUM   | Planned    |
| v4.9.0  | Bank Statement CSV Importer                                                | 12         | MEDIUM   | Planned    |
| v4.10.0 | Local Notifications                                                        | 12         | HIGH     | Planned    |
| v4.11.0 | Bulk Transaction Operations                                                | 12         | MEDIUM   | Planned    |
| v4.12.0 | Category Management (rename, merge, cleanup)                               | 12         | MEDIUM   | Planned    |
| v4.13.0 | Business & Tax Export                                                      | 12         | MEDIUM   | Planned    |
| v4.14.0 | Loan / EMI Tracker with amortization schedule                              | 13         | MEDIUM   | Planned    |
| v4.15.0 | Receipt Photos                                                             | 14         | LOW      | Planned    |

---

## DB Schema Evolution (Complete History)

| DB Version | App Version                  | Change                                                                                           |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| 1          | v3.10.x                      | `transactions` store                                                                             |
| 2          | v3.11.0                      | + `recurringTemplates` store                                                                     |
| 3          | v3.13.0                      | + `budgets` store                                                                                |
| 4          | v3.14.0                      | + `tags` multiEntry index on transactions                                                        |
| 5          | v3.15.0                      | Transfer type; `fromAccount`, `toAccount` fields (nullable)                                      |
| 6          | v3.16.0                      | + `appSettings` store; optional fields on transactions (all nullable)                            |
| 7          | v3.17.0                      | + `quickTemplates` store                                                                         |
| 8          | v3.18.0                      | + `accounts` store                                                                               |
| 9          | v3.20.0                      | + `savingsGoals` store                                                                           |
| 10         | v3.28.0                      | + `netWorthSnapshots` store                                                                      |
| 11         | v4.0.0                       | `accounts` + `classification` field; `transactions` + `status` field; `dateType` composite index |
| 12         | v4.0.0                       | (same migration block) reconciliation indexes                                                    |
| 13         | v4.14.0 (Loan / EMI Tracker) | + `loans` store (planned)                                                                        |
| 14         | v4.15.0 (Receipt Photos)     | + `receipts` store (planned)                                                                     |

---

## Suggested Category Cleanup (No Version Needed)

Can be done via `bulkRecategorize` in DevTools or a one-time migration script at any time.

| Problem                                                 | Recommended Fix                                             |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| `Savings/Investments` used as an expense category       | Migrate to Transfer type; remove from expense category list |
| `Personal/Shopping` and `Shopping` used interchangeably | Merge into `Personal/Shopping`; remove `Shopping`           |
| `Misc/Buffer` and `Other Expense` used interchangeably  | Merge into `Other Expense`; remove `Misc/Buffer`            |
| `Utilities/Bills` used for toys, travel, actual bills   | Split into `Utilities` + `Bills` if real data justifies it  |

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
