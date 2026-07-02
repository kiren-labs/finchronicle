# Changelog

All notable changes to Finance Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.11.0] — 2026-07-02

### Added

- **Bulk Transaction Operations** — select multiple transactions and act on them at once.
  - **Select mode** — new "Select" button in the List tab header activates selection mode. Tapping any transaction item toggles it; a checkbox icon replaces the type icon. Edit/Delete action buttons are hidden during selection. "Select" button becomes "Cancel" to exit.
  - **Sticky action bar** — appears at the bottom when at least one item is selected, showing the count and three actions.
  - **Bulk Recategorize** — opens a modal with the full category list; applying updates all selected transactions in IndexedDB and in memory, then exits select mode.
  - **Bulk Tag** — opens a modal with a text input; the tag is normalised (lowercase, spaces → hyphens) and appended to each selected transaction (existing tags are preserved; duplicate tags are ignored).
  - **Bulk Delete** — confirmation dialog then soft-deletes all selected transactions (`deleted: true`), removes them from `state.transactions`, and exits select mode.
  - Selection state is module-local in `js/ui.js` (not persisted, not in `state`). Switching tabs exits select mode automatically.

---

## [4.10.0] — 2026-06-30

### Added

- **Local Notifications** — on-device alerts with no server involved.
  - Four notification types: **Recurring due** (today/tomorrow), **Budget warning** (≥80% used), **Inactivity nudge** (3+ days without a transaction), **Backup reminder** (14+ days without a backup).
  - Master enable toggle with OS permission request flow.
  - Per-type toggles to enable/disable individual notification categories.
  - **Quiet hours** — configurable start/end hour; no alerts fired during that window.
  - **Dedup guard** — same notification tag is suppressed if already sent today, preventing accumulation on repeated page loads.
  - **Recent notifications log** — last 10 sent notifications shown in Settings with timestamp.
  - Fully offline; uses Web Notification API + Service Worker `showNotification()` with `new Notification()` fallback.
  - Android PWA and iOS 16.4+ installed PWA supported.

## [4.9.0] — 2026-06-26

### Added

- **Bank Statement CSV Importer** — import any bank's CSV export directly into FinChronicle via a column-mapper UI.
  - Upload any bank CSV from Settings → Restore → Import Bank Statement.
  - Column mapper lets you assign Date, Description, Debit, and Credit columns, plus how many header rows to skip.
  - **KBank auto-detection** — KBank CSV files (Be1st card format) are detected automatically and columns are pre-mapped; no manual selection required.
  - 10-row live preview table updates as you adjust column assignments, showing resolved dates, amounts, and income/expense type.
  - **Saved mappings** — check "Save this mapping" after a successful import to reuse column config next time (up to 5 saved mappings, oldest auto-evicted).
  - **Account linking** — select an account from your account list to tag all imported transactions with `fromAccount` (expenses) or `toAccount` (income).
  - All imported transactions start with `status: "pending"` and blank category — use the reconciliation workflow to review and categorize.
  - Full duplicate detection using the v4.8.0 engine — rows matching an existing transaction by date + amount are skipped automatically.
  - Runs entirely client-side; file never leaves the device.
  - Import summary toast: "Imported N transactions. N skipped."

## [4.8.0] — 2026-06-25

### Added

- **Duplicate Transaction Detection** — non-blocking duplicate warning in the Add Transaction form before save.
  - Duplicate check runs when type + category match, amount is within 5%, and date is within 2 days.
  - Existing soft-deleted transactions are ignored.
  - Warning banner now offers two actions: **Yes, add it** (continue save) or **View existing** (open matched transaction in edit mode).
  - Duplicate detection excludes the same transaction ID while editing.
  - Detection is advisory only and does not block save.

## [4.7.1] — 2026-06-24

### Added

- **Reconciliation Balance Adjustment** — when a reconciliation difference can't be located, a new "Create Balance Adjustment" button auto-creates a corrective transaction for the exact gap amount and marks it reconciled.
  - Expense entry when app balance is too high (positive difference); income entry when too low.
  - Posted to a dedicated `Reconciliation Adjustment` category, excluded from income/expense totals, savings rate, budget pace, category charts, and annual report — but counted in account balance and net worth.
  - `isAdjustment: true` flag on the transaction schema enables the exclusion.
  - "Reconcile Anyway" renamed to "Continue Anyway" for clearer phrasing.

- **Filter by Account in transaction list** — new "Filter by Account" dropdown in the List tab, below the category filter. Selecting an account shows only transactions where that account appears as `fromAccount` or `toAccount`, making it easy to cross-check entries against a bank statement. Dropdown is auto-populated from actual transaction data and resets on summary-tile navigation.

## [4.7.0] — 2026-06-20

### Added

- **Subscription Tracker** — new segue panel accessible from the Reports tab ("Subscriptions →" entry button, same pattern as Grouped View).
  - Filters all recurring expense templates with `frequency: 'monthly'` or `'yearly'` automatically — no manual tagging required.
  - Summary header showing **monthly total** and **annual total** in a 2-stat card grid.
  - Income % footer — "X% of avg monthly income" computed from the last 3 months of income data.
  - Per-subscription rows showing name, notes, frequency label, next due date, and monthly equivalent amount. Yearly subscriptions show both the monthly rate and the actual annual charge.
  - Rows sorted: active first, then by monthly cost descending. Paused subscriptions appear dimmed.
  - **"Manage Recurring" button** — closes the panel, navigates to Settings, and scrolls the Recurring card into view automatically.

### Fixed

- **Biometric double-prompt on iOS** — `_autoTriggerBiometric()` (auto-fires on lock) and the manual biometric button handler could both call `navigator.credentials.get()` concurrently, causing Face ID / Touch ID to appear twice. Fixed with `_biometricInProgress` mutex flag shared between both code paths. `lock()` resets the flag on every new lock cycle.

### Technical

- No new IDB stores, no DB_VERSION bump
- `getSubscriptions()` and `renderSubscriptionTracker()` exported from `js/recurring.js`
- `renderSubscriptionTracker` imported and wired in `js/app.js`; open/close handlers follow identical pattern to `groupedViewPanel`
- "Manage Recurring" uses `fc:navigate` CustomEvent + `requestAnimationFrame` scroll to `#recurringContainer`
- Subscription panel CSS in `css/styles.css` (`.sub-*` classes); dark-mode overrides in `css/dark-mode.css`

## [4.6.0] — 2026-06-20

### Added

- **Financial Health Ratios** — 2×2 KPI grid in the Reports tab showing four diagnostic ratios computed entirely from existing IndexedDB data:
  - **Emergency Fund** — liquid asset balance ÷ avg 3-month expenses. Target ≥ 6 months.
  - **Debt-to-Income** — monthly debt payments (credit card, EMI, loans) ÷ monthly income. Target < 36%.
  - **Housing Cost** — rent/mortgage expense ÷ monthly income. Target < 30%.
  - **Savings Rate** — amount saved ÷ monthly income. Target ≥ 20% (surfaced from existing v3.19 calculation).
  - Each card shows value, target sub-text, and a green/yellow/red status indicator.
  - Summary line: "N of 4 ratios healthy." Hidden if < 2 months of transaction data.
- **Expense trend arrow on summary card** — Expenses card now shows a month-over-month trend with inverted polarity: spending up = red ↑, spending down = green ↓.
- **Empty income prompt in Savings** — When no income is logged for the month, the Savings card shows a prompt "Add income to unlock savings rate & projections" with a one-tap button to navigate to the Add tab with Income type pre-selected.
- **Alert monthly snooze** — Each smart alert now has a moon (🌙) snooze button. Snoozing suppresses that alert type+category for the rest of the current month. Snooze entries auto-expire on the next month's app load. Existing × dismiss remains for permanent dismissal.
- **Unbudgeted spending → Set Budget** — Each row in the Unbudgeted Spending section now has a "Set budget" pill button that opens the Add Budget modal pre-filled with that category.

### Changed

- **Net Worth and Savings dashboards moved to Reports** — Home tab is now a daily-glance screen (month stats, budget alerts, smart alerts, goals, settlement). Deep analytics (Net Worth, Savings Rate, Financial Health Ratios) are in Reports.
- **`fc:navigate` CustomEvent** — Internal navigation from non-UI modules (e.g. savings prompt) now dispatches `fc:navigate` on `document` instead of importing `switchTab`/`selectType` directly, avoiding circular imports.

### Technical

- No new IDB stores, no DB_VERSION bump
- `renderHealthRatios()` exported from `js/savings.js`; called by `updateReportsView()` in `js/ui.js`
- `ui.js` imports `renderNetWorthDashboard` from `accounts.js` and `renderSavingsDashboard`, `renderHealthRatios` from `savings.js`
- `snoozeAlert(alertId)` exported from `js/alerts.js`; `snoozedAlerts` Set persisted to `localStorage` under key `snoozedAlerts`
- `isEdit = !!budget?.id` in `renderBudgetModal()` — allows category-only pre-fill without entering edit mode

## [4.5.1] — 2026-06-20

### Added

- **Home tab** — dedicated dashboard tab separating the summary/dashboard from the transaction entry form. Add tab is now form-only; Home tab shows all summary cards, budget, net worth, savings, goals, alerts, and settlement sections.
- **Global Status Strip** — persistent mini-summary bar visible on all tabs (hidden on Settings). Shows current month label, net balance, income, expenses, and entry count at a glance. Strip button navigates to Home tab.

### Fixed

- **Budget vs Actual NaN** — `getBudgetVsActual()` was reading `b.limit` (undefined) instead of `b.monthlyLimit`, causing NaN in the budget table. Fixed.
- **Ghost card on Home when collapsed** — removed collapsed state from summary header; collapse/expand is no longer needed on the dedicated Home tab.

### Changed

- **Collapse/expand removed from Home tab** — the Home tab is the full dashboard; collapsing it served no purpose. Button and related JS removed.
- **Bottom nav reordered** — Home | List | Add | Reports | Settings. Add button styled consistently with other nav items (primary blue colour, no elevated pill shape).
- **Header privacy indicator** — replaced the "Offline" green dot label with a compact shield icon chip, then simplified to no header indicator to avoid crowding the logo on small screens.
- **Default landing tab** changed from Add to Home.

### Technical

- `state.currentTab` default changed to `"home"`
- `switchTab()` handles `"home"` case; adds/removes `settings-active` body class to hide strip on Settings
- `toggleSummaryCollapse()` and `loadSummaryState()` removed from `ui.js` exports and `app.js` init
- Status strip label updated in `updateSummary()` with short month name

## [4.5.0] — 2026-06-19

### Added

- **Budget vs Actual Report** — consolidated table in the Budgets tab showing Category, Budget, Actual, Variance, and % Used for the selected month.
  - Rows turn red (≥100% used) or yellow (≥80% used) with a ⚠ indicator
  - Unbudgeted categories with spend listed in a separate section below the main table
  - Totals row summarising budgeted-category spend
  - **Export CSV** button downloads `budget-vs-actual-YYYY-MM.csv`
  - Synced to the global month filter (`state.selectedMonth`)
- **`logError` / `getErrorLog` / `clearErrorLog`** moved to `js/utils.js` — eliminates circular dependency between `db.js` and `app.js`
- `ERROR_LOG_KEY` exported from `utils.js` for test shim access
- `idbGetAll` fallback now calls `logError` for silent DB-not-ready events
- `saveTransactionToDB` retry catch now calls `logError`
- `.field-error` dark-mode contrast fix — uses `--color-danger-text` token (WCAG AA)
- CSV backup/restore round-trip fix — `stripCSVEscape()` in `parseBackupCSV()` removes leading `'` injected by `sanitizeBackupCell()` on formula chars

### Technical

- No new IDB stores, no DB_VERSION bump
- `getBudgetVsActual()`, `renderBudgetVsActualTable()`, `exportBudgetVsActualCSV()` exported from `js/budget.js`
- BVA table CSS in `css/styles.css`; dark-mode overrides in `css/dark-mode.css`

## [4.4.0] — 2026-06-19

### Added

- **Actionable Spending Insights** — every smart alert now includes an optional `suggestion` line with a concrete, numbers-based action to take. Suggestions are computed from existing state at detection time; no new data entry required.
  - Weekly spike → "Keep {category} under {90d weekly avg} this week"
  - Unusual amount → "Your typical {category} transaction is around {median}. Double-check this entry."
  - Velocity warning → "Limit {category} to {remaining budget ÷ remaining days}/day for the rest of the month"
  - Monthly pace → "Spend no more than {daily cap}/day on {category} to stay within budget"
  - Category drift → "Last month you spent {lastMonth} on {category} — this month is on track for {projected}"
  - Savings rate trend → "At your income of {income}, saving 20% means cutting expenses by {gap}/month"
  - Bill due + low balance → "Transfer {shortfall} to {account} before {due date}"
- **`.smart-alert-suggestion`** — muted italic sub-text style below the alert message. Inherits alert colour; dismissed with the same dismiss button.

### Technical

- No new module, no DB changes, no new IDB stores
- `getMonthlyIncome` imported into `js/alerts.js` for savings-rate suggestion calculation
- Suggestions only render when the maths produces a meaningful positive number (guard: `remainingDays > 0`, `gap > 0`, `avgIncome > 0`)
- All currency values use `formatCurrency()` — respects user's currency setting

---

## [4.3.1] — 2026-06-06

### Added

- **Arithmetic in amount field** — amount input accepts expressions (`500+250`, `1200*3`, `(80+20)*6`); evaluated on blur via a safe recursive-descent parser with no `eval` or `Function()`. Input changed from `type="number"` to `type="text"` with `inputmode="decimal"`.
- **FAQ: Accounts & Net Worth** — 7 new entries covering account setup, opening balances, linking transactions, Transfer vs Expense distinctions, correcting net worth, and diagnosing balance drift.
- **FAQ: Understanding the Tabs** — 6 new entries explaining each main tab (Add, List, Reports, Groups, Settings) and the summary cards.

### Fixed

- **Account dropdown empty on first open** — `initAccounts()` was running after `initOptionalFields()`, so `state.accounts` was empty when the account selector first populated. Fixed by swapping init order in `app.js`.
- **Account field position** — Account linking field moved above the Date field in the DOM (outside `optionalFieldsContainer`) so it appears at the top of the form in the correct position regardless of optional fields state.
- **Accounts & Net Worth feature toggle not hiding net worth** — toggling the feature off now hides both `#accountsContainer` and `#netWorthSection`. Previously only `#accountsContainer` was targeted. Also fixed `renderNetWorthDashboard()` unconditionally setting `section.hidden = false` on each render.
- **Weekly spike alert firing on monthly categories** — rent and other infrequent expenses were always flagged as spikes because their rolling weekly average is near zero. Fixed by skipping categories with fewer than 6 transactions in the past 90 days.
- **Features toggle rendering as unstyled native checkbox** — Accounts & Net Worth toggle had wrong CSS class names (`toggle-checkbox`, `toggle-slider`) instead of the correct ones (`field-toggle-checkbox`, `field-toggle-switch`).

### Changed

- **`js/app-lock.js` refactored** — extracted `getLockOverlay()` helper, `_buildSetupHTML()` and `_buildActiveHTML()` render functions, and `TIMEOUT_OPTIONS` constant. Removed `window._showMessage` global; replaced with a direct `import { showMessage } from "./utils.js"`. No behaviour change.
- **FAQ language** — phrasing updated to BBC English: removed Americanisms, improved article usage, replaced colloquial terms (`"my real bank"` → `"my bank statement"`, `"resets net worth to reality instantly"` → `"Your net worth will update immediately"`).

### Technical

- No new dependencies
- No DB version bump — all changes are UI and logic only
- All existing data unaffected

---

## [4.3.0] — 2026-06-05

### Added — App Lock

- **PIN lock** — optional UI gate that covers the app with a full-screen lock screen on load and after an inactivity timeout
- **Biometric fast-unlock** — Face ID / Touch ID / Windows Hello via WebAuthn platform authenticator; shown only when the device supports it; falls back gracefully to PIN
- **Auto-lock timeout** — configurable: 1 minute (default), 5 minutes, 15 minutes, or never
- **Lock now** button in the header — instantly locks the app without waiting for the timeout; only visible when lock is enabled
- **App Lock settings card** in the Settings tab — PIN setup, timeout selector, change PIN, add/remove biometric, and remove lock all from one place
- **Forgot PIN** — resets the lock (PIN only) without touching any financial data
- PIN stored as PBKDF2-derived hash (100,000 iterations, SHA-256) with a random salt — never plaintext
- New module `js/app-lock.js`; added to SW cache for offline support

### Technical

- Lock overlay uses `hidden` attribute; inactivity timer wired to `click`, `keydown`, `touchstart`, `mousemove`
- PIN inputs wrapped in `<form>` with hidden username field to satisfy browser password-manager accessibility requirements
- `window._showMessage` bridge allows `app-lock.js` to reuse the app's existing toast without a circular import

## [4.2.1] — 2026-06-04

### Changed — Copy & Language Overhaul

#### Plain-English rewrites

- Replaced all `"Failed to X"` error patterns with active-voice equivalents: `"X wasn't saved. Try again."`, `"Your data didn't load. Try refreshing."` etc.
- Removed `"Please"` from all validation and error messages — direct sentence case throughout
- `"This action cannot be undone."` → `"You can't undo this."` (delete modal and restore confirm)
- Restore confirm dialog: removed ALL-CAPS `DELETE`, rewrote as a plain question: `"Replace all your current data with N transactions from this backup? You can't undo this."`
- `"Already-created transactions"` → `"Existing transactions"` (recurring delete confirm)
- `"Great job keeping your records protected!"` → `"Your records are protected."` (backup status)
- `"Your data is at risk!"` → `"Your data is not yet backed up."` (never-backed-up state)
- `"Got it!"` (install prompt) → `"Dismiss"`
- `"to get started"` filler removed from quick-entry empty state
- `"Savings rate has been below…"` → `"Your savings rate has been below…"` (alert message)

#### Jargon removed

- `"Passphrase"` → `"Password"` across all prompts, messages, and validation errors
- `"Encrypted Backup"` (button) → `"Password-protected backup"`
- `"AES-256 encrypted. Requires passphrase to restore."` → `"Password-protected. You'll need your password to restore this backup."`
- `"Encryption failed"` → `"Backup protection failed"`
- `"Decryption failed — wrong passphrase or corrupted file"` → plain explanation
- `"CSV"` replaced with `"Spreadsheet"` in all user-facing labels and toasts
- `"Full JSON — all data, all stores, lossless"` → `"Full backup — all your data, nothing left out."`
- `"Reimbursable"` (expense type option) → `"Someone will pay me back"`
- `"Asset"` / `"Liability"` (account classification) → `"I own this (savings, cash)"` / `"I owe this (loan, credit card)"`
- `"Classification"` label → `"Account type"`
- `"Closing Balance"` (reconciliation) → `"Bank statement balance"`
- `"Hash mismatch"` → `"File check failed — this backup may be damaged"`
- `"No unreconciled transactions"` → `"No transactions to check"`
- `"Reconcile transaction"` (aria-label) → `"Mark as confirmed"`
- `"Reconcile: [account]"` heading → `"Check against statement: [account]"`
- `"X transactions reconciled."` → `"X transactions confirmed against your statement."`
- `"Outstanding"` (settlement) → `"Still owed"`
- `"Transaction Currency"` label → `"Paid in a different currency?"`
- `"Exchange Rate"` label → `"Conversion rate"`; validation errors updated to match
- `"Service worker not supported"` / `"No service worker registered"` → user-readable equivalents
- `"Persistent storage: Not granted — data may be evicted"` → `"Storage protection: Not guaranteed — browser may clear data"`
- `"Local-only. Copy and paste into a GitHub issue"` → `"Stored on this device only. Copy and share with the developer to report a bug."`

#### Capitalisation

- All modal headings, button labels, and section titles converted to sentence case
- `"Add Recurring"`, `"Edit Recurring"`, `"Add Budget"`, `"Edit Budget"`, `"Add Account"`, `"Add Goal"`, `"New Savings Goal"`, `"Edit Goal"`, `"Additional Details"`, `"Save as Template"`, `"Finalize Reconciliation"` → sentence case equivalents
- `"Finalise"` (British) → `"Finalize"` (American English); `"Tick off"` → `"Check off"`

#### Frequency labels

- `"Every 2 Wks"` → `"Every 2 weeks"`
- `"Quarterly"` → `"Every 3 months"`

#### Budget & savings copy

- `"Enable Budget Rollover (unused balance carries to next month)"` → `"Carry unused budget to next month"`
- Alert threshold hint rewritten in active voice: `"You'll be alerted when spending reaches this percent of your budget."`
- `"Over pace"` (budget health status) → `"Spending fast"`
- `"Daily pace"` metric → `"Daily spending"`
- `"Projected"` metric → `"Month-end estimate"`

#### Reconciliation copy

- Explainer text removes `"FinChronicle"` brand insertion; `"Tick off"` → `"Check off"`

#### Tone fixes

- `"Checking for updates..."` → `"Checking for updates…"` (Unicode ellipsis)
- `"Update found! Preparing..."` → `"Update found. Preparing…"`
- Milestone message `"🎯 25% — Great start on 'X'!"` → plain `"25% reached on 'X'."`
- Backup toasts: removed `✅` emoji from utility confirmations
- `"No transactions to export!"` → period; all empty-state `!` removed

#### i18n foundation

- Added `js/i18n.js` — `t(key, vars)` lookup function with `{variable}` interpolation
- Added `js/lang/en.js` — single source of truth for all user-visible strings (450+ keys across 15 namespaces: `button`, `message`, `error`, `validation`, `empty`, `warning`, `hint`, `status`, `confirmation`, `modal`, `aria`, `backup_status`, `prompt`, `section`, `faq`)
- Added `js/en.json` — reference copy of the same strings for external tooling / translation
- `import-export.js`, `budget.js`, `auto-backup.js`, `app.js`, `faq.js` now import `t()` and resolve strings through `en.js`
- `js/i18n.js` and `js/lang/en.js` added to `CACHE_URLS` in `sw.js`

### Technical

- `APP_VERSION` → `4.2.1` in `js/state.js`
- `CACHE_NAME` → `finchronicle-v4.2.1` in `sw.js`
- `version` → `4.2.1` in `manifest.json`
- `js/i18n.js`, `js/lang/en.js` added to `CACHE_URLS`

---

## [4.2.0] — 2026-05-24

### Changed — Backup & Restore Overhaul

#### Unified "Data & Backup" Card

- Replaced 4 scattered toolbar buttons (Export CSV, Import CSV, Create Backup, Restore Backup) with a single **Data & Backup** card in Settings
- Clear section labels: Export / Restore / Auto-Backup
- **Download Backup** — full lossless JSON (replaces "Create Backup")
- **Encrypted Backup** — AES-256-GCM passphrase-protected export (unchanged function, consolidated into card)
- **Export to Spreadsheet** — CSV for spreadsheet use, clearly labelled as transactions-only (replaces "Export CSV")
- **Restore from Backup** — accepts `.json`, `.enc`, and `.csv` files (replaces "Restore Backup")
- **Import Spreadsheet** — CSV import, adds transactions only (replaces "Import CSV")
- Auto-Backup toggle, frequency selector, and last-backup timestamp now live inside the card with static HTML (no JS injection)
- Storage Health widget now rendered inline inside the card, deferred to Settings tab open (not at app init)

#### Data Completeness

- `netWorthSnapshots` IDB store now included in JSON backup and restored on import
- `appSettings` IDB store now restored on import (was backed up but never restored)
- `exchangeRateHistory` and `tagColors` from localStorage now included in backup envelope under `localStorage` key and restored on import
- `loadAllTransactionsFromDB()` used in backup build — includes soft-deleted records for full audit trail
- `backupSchemaVersion: 1` added to backup envelope for forward-compatibility
- `migrateBackupPayload()` normalises older backups (schema 0) on restore

#### Restore UX

- Restore preview now shows SHA-256 integrity status (✓ verified / ⚠ mismatch / — none)
- Two restore modes: **Merge** (adds missing records, skips duplicates) and **Replace All** (clears all 8 IDB stores unconditionally, then writes backup, with confirmation prompt)
- Unified file handler routes `.enc` to passphrase decrypt, `.json` to parse, `.csv` to legacy CSV path with warning
- Currency from backup restored only in Replace All mode — Merge no longer overwrites active currency

#### Hardening

- `verifyIntegrity()` validates SHA-256 on restore, warns but does not block; uses in-place field zeroing to preserve key order across engines
- `clearAllStores()` on Replace All clears all 8 IDB stores unconditionally before writing backup data
- `bulkSaveNetWorthSnapshots()` skips duplicates by `snapshotDate` index
- Auto-backup one-shot migration: CSV format setting silently upgraded to JSON (CSV auto-backup was lossy)
- PBKDF2 iterations raised from 100,000 → 210,000 (NIST SP 800-132 minimum)
- Encrypted backup minimum passphrase raised from 6 → 12 characters
- `sanitizeHTML()` now encodes `"` → `&quot;` and `'` → `&#39;` — safe for HTML attribute interpolation
- Tags sanitized via `sanitizeHTML()` at CSV import time in both `importFromCSV` and `parseBackupCSV`

### Technical

- `APP_VERSION` → `4.2.0` in `js/state.js`
- `CACHE_NAME` → `finchronicle-v4.2.0` in `sw.js`
- `CACHE_VERSION` → `4.2.0` in `sw.js`
- `version` → `4.2.0` in `manifest.json`
- `backupDue` declared in `state` object in `js/state.js`
- New exports in `js/db.js`: `getAllNetWorthSnapshots`, `bulkSaveNetWorthSnapshots`, `clearAllStores`
- New exports in `js/import-export.js`: `migrateBackupPayload`, `verifyIntegrity`, `handleRestoreFileInput`, `handleCsvRestore`, `handleCsvImportFile`
- New export in `js/auto-backup.js`: `updateAutoBackupUI`
- Removed dead exports: `verifyBackup`, `renderAutoBackupSettings` from `js/auto-backup.js`

---

## [4.1.1] — 2026-05-23

### Fixed

- **Duplicate alerts**: monthly-pace alert no longer fires for categories already over budget — added `spent >= budget.monthlyLimit` guard in `checkMonthlyPace()` so pace fires only as an early warning
- **CSV export missing fields**: `exportToCSV()` and `createBackup()` now include `Tags` (semicolon-joined), `Status`, `RecurringId`, `Settled`, `SettledAt`, `SettledBy` columns; full 27-column parity across all export paths
- **JSON restore dropped non-transaction stores**: `processRestoredData()` and `confirmRestore()` now restore `recurringTemplates`, `budgets`, `accounts`, `savingsGoals`, `quickTemplates` to IndexedDB after a full backup restore
- **State mutated before DB write in CSV import**: removed `state.transactions.unshift(txn)` inside parsing loop; state now updated only after `bulkSaveTransactionsToDB()` succeeds
- **WCAG AA contrast failures**: introduced `--color-income-text: #1a7a3a` (5.4:1) and `--color-expense-text: #C41E1A` (5.9:1) tokens; migrated all text `color:` uses from display-only `--color-income`/`--color-expense` tokens; dark mode remaps to `#34c759` / `#FF6B6B`; fixes net worth values, account balances, savings widget, settlement, annual report, reconciliation amounts, type-toggle labels, backup message, storage warning
- **False-positive SW errors in error log**: `window.onerror` now filters out `"load failed"` events from `sw.js` source — these are browser-level background SW update failures, not app errors

### Technical

- `APP_VERSION` → `4.1.1` in `js/state.js`
- `CACHE_NAME` → `finchronicle-v4.1.1` in `sw.js`
- `version` → `4.1.1` in `manifest.json`

---

## [4.1.0] — 2026-05-23

### Added — Forward-Looking Intelligence (Phase 3)

#### 3.1 Cash-Flow Forecast

- New `js/forecast.js` module — pure `buildForecast(accounts, transactions, recurringTemplates, horizonDays)` function
- Generates per-account balance timelines by walking enabled recurring templates that have account links
- Horizon selector: 30d / 60d / 90d toggle in Reports tab
- Warning banners when any account is projected to go negative within the horizon
- Graceful empty state when no recurring templates have account links
- Added to `CACHE_URLS` in `sw.js`

#### 3.2 Financial Health Alerts

- Four new alert types added to `js/alerts.js` via `runHealthAlertChecks()`:
  - **Inactivity** (`inactivity`) — fires after 5 days with no transactions logged; deduplicated daily
  - **Bill Due** (`bill-due`) — fires when a recurring expense is due within 3 days and the linked account balance is below 1.2× the bill amount; requires `fromAccount` link
  - **Savings Rate Trend** (`savings-rate-trend`) — fires when savings rate is below 10% for 3 consecutive months; deduplicated per quarter to reduce noise
  - **Monthly Pace** (`monthly-pace`) — fires when a budget category is projected to exceed its limit by >20% based on daily pace; only active after day 5 of the month
- All four use the same `localStorage` key, dismiss flow, and render path as existing pattern alerts
- Alert history labels updated for all four new types
- Summary chip label changed from "spending alerts" to "alerts" to cover health alert types

### Changed

- `js/alerts.js` imports `getAccountBalance` from `accounts.js` and `getSavingsRate` from `savings.js`
- Deduplication key uses quarterly window for `savings-rate-trend` (vs daily for all other types)

### Technical

- New module `js/forecast.js`
- `APP_VERSION` → `4.1.0` in `js/state.js`
- `CACHE_NAME` → `finchronicle-v4.1.0` in `sw.js`
- `version` → `4.1.0` in `manifest.json`
- No DB schema changes, no new IndexedDB stores, no `DB_VERSION` bump

---

## [4.0.0] — 2026-05-23

### Added — Accounting Model (Phase 2)

#### 2.1 Asset/Liability Classification

- New account types: "loan" and "mortgage" → automatically classified as liabilities
- All existing accounts backfilled via v11 DB migration (`credit-card` → liability, rest → asset)
- `ACCOUNT_CLASSIFICATION` map in `js/state.js` for type → classification lookup
- Account form (add/edit) has "Classification" dropdown (asset/liability) with auto-derive on type change
- Liability badge rendered in account list (red, `var(--color-expense)`)
- `getNetWorth()` uses `classification` field: liabilities subtract as `Math.abs(balance)`, assets add normally

#### 2.2 Transaction ↔ Account Linking

- Optional "Account" dropdown in income/expense form controlled by `appSettings.enabledFields.accountLinking`
- Expense + linked account → sets `fromAccount`; income + linked account → sets `toAccount`
- Dropdown auto-populates from `state.accounts` when optional fields section is expanded
- Pre-populates on edit; hidden when transaction type is "transfer"
- `getAccountBalance()` fixed: income credits only `toAccount`, expense debits only `fromAccount` (eliminates balance-drift-on-reload bug)

#### 2.3 Reconciliation Workflow

- New `js/reconciliation.js` module — three pure functions (`computeReconciledBase`, `computeCheckedBalance`, `filterCandidates`) plus DOM-bound workflow
- Transaction `status` field: `'pending' | 'cleared' | 'reconciled'` (default `'cleared'`; backfilled via v12 DB migration)
- Reconciliation triggered from account edit modal via "Reconcile this account" button
- Step 1: enter statement balance + date → load unreconciled candidates up to that date
- Step 2: check off each transaction; live difference display updates as items are checked
- Finalise: marks all checked transactions as `reconciled` in IndexedDB; blocks on mismatch with optional "Reconcile Anyway" force path
- Transaction list shows lock icon badge for `reconciled` transactions; yellow chip for `pending`

#### 2.4 Category Hierarchy

- `categories` in `js/state.js` changed from flat arrays to hierarchy objects: `{ parent: [children] }`
- Expense categories reorganised with meaningful sub-categories (e.g. `Food → [Groceries, Restaurants, Coffee/Tea, Delivery]`, `Housing → [Rent, Mortgage, Maintenance]`)
- Income sub-categories added (e.g. `Business → [Consulting, Sales, Services]`, `Investment → [Dividends, Capital Gains, Interest]`)
- `getAllCategoryNames(type)` helper — returns flat list of all valid names (parents + children) for validation
- `getCategoryParent(name, type)` helper — resolves a category name to its parent
- All dropdowns (transaction form, recurring, budget) render `<optgroup>` with indented children
- Category filter groups used categories by parent; selecting a parent filters all its children too
- Validation accepts both parent and child category names — fully backwards compatible with existing data
- New `css/tokens.css` income/expense color tokens; dark mode token overrides

### Changed

- Account Add/Edit modal redesigned: type icon preview, compact inputs, visual divider between core and advanced fields, `role="dialog"` + `aria-modal` accessibility attributes, focus on open
- `button.primary` used throughout (was incorrectly using `.btn.primary-btn` class which had no CSS)
- `showAddAccountForm` / `showEditAccountForm` now focus `#accountNameInput` on open
- SW update polling changed from `setInterval` (60 s) to `visibilitychange` event (throttled to 5 min) — reduces background CPU on mobile

### Fixed

- Balance reducing on every page reload: `getAccountBalance()` was matching income on `fromAccount` OR `toAccount`; fixed to credit only `toAccount` for income, debit only `fromAccount` for expense
- Reconciliation modal not opening: modal was using `hidden` attribute but CSS controls visibility via `.modal` / `.modal.show` class; fixed to `classList.add/remove("show")`
- Account dropdown showing only "None": `populateLinkedAccountSelect` ran once at init when section was hidden; now re-runs on optional-fields expand
- Reconciliation action buttons unstyled: were using non-existent `.btn.primary-btn` / `.btn.danger-btn`; replaced with scoped `.reconcile-action-primary` / `.reconcile-action-danger` classes

### Technical

- `DB_VERSION` bumped to 12 (v11: classification backfill; v12: status backfill)
- New module `js/reconciliation.js` added to `CACHE_URLS` in `sw.js`
- Test suite: 10 unit test files, 323 tests passing; 1 new E2E spec (`reconciliation.spec.js`, 18 tests)
- `scripts/extract-functions.js` updated with brace-counting extractor for nested `categories` object; `getAllCategoryNames` and `getCategoryParent` added to extraction map

## [3.29.0] — 2026-05-23

### Added — Engineering Hardening (Phase 1)

#### 1.1 Storage Persistence

- Call `navigator.storage.persist()` after DB init to prevent browser eviction
- Display persistence status in Storage Health widget
- Store `state.storagePersisted` for runtime access

#### 1.2 Content Security Policy

- Added `<meta http-equiv="Content-Security-Policy">` to `index.html`
- Restricts scripts to `'self'`, allows styles from self + jsdelivr CDN (Remix Icons)
- Blocks inline scripts, eval, and all external script sources

#### 1.3 Collision-Safe IDs

- New `generateId()` in `js/utils.js` using `crypto.randomUUID()`
- Replaced `Date.now()` IDs in 7 modules: app, goals, budget, accounts, quick-entry, recurring, import-export
- Existing numeric IDs continue to work (IndexedDB accepts mixed key types)
- Fixed `shouldShowBackupReminder()` — now uses `createdAt` field instead of treating ID as timestamp

#### 1.4 innerHTML XSS Audit

- Sanitized tag suggestion rendering in `app.js` via `sanitizeHTML()`
- Sanitized goal names and account option labels in `goals.js`
- All user-sourced strings now pass through `sanitizeHTML()` before innerHTML insertion

#### 1.5 Local Error Log

- Global `window.onerror` + `unhandledrejection` handler at top of `app.js` (before imports)
- Stores last 50 errors in `localStorage.errorLog` with timestamp and stack trace
- "Error Log" section in Settings tab with copy-to-clipboard and clear buttons
- Errors are viewable without DevTools — critical for mobile debugging

#### 1.6 Backup Urgency

- Backup reminder threshold: 30 days → 14 days
- Auto-backup default changed from `false` to `true`
- Ensures new users get weekly JSON backups out of the box

#### 1.7 Service Worker Update Strategy

- Removed `setInterval(() => registration.update(), 60000)` polling
- Replaced with `visibilitychange` listener — checks for SW update when tab becomes visible
- Throttled to max once per 5 minutes to avoid unnecessary network calls
- Saves CPU on mobile when tab is backgrounded

### Fixed

- Circular ES module import between `settings.js` ↔ `app.js` — moved `getErrorLog`/`clearErrorLog` to `utils.js`

### Changed

- `js/utils.js` — added `generateId()`, `getErrorLog()`, `clearErrorLog()`
- `js/auto-backup.js` — added `requestStoragePersistence()`, persistence status in health widget

---

### Planned — v3.28.1 (Dashboard & UI/UX Fix Patch)

- Fix savings rate showing `0.0%` when income is ฿0 but saved amount is non-zero → show `"N/A"` instead
- Fix annual projection showing positive when monthly average is negative → replace with deficit label in red
- Fix period selector ("All Time") desyncing from KPI card title ("This Month") → sync card title to `state.currentFilter`
- Fix income ฿0 displaying `+0.0%` change arrow when both periods are zero → show em dash instead
- Collapse 3+ alert banners into a single summary chip with chevron toggle and "Dismiss all"
- Fix alert ordering: yellow advisory first, red danger second
- Apply `is-negative` class (using `--color-danger` token) to negative values in `.summary-amount`, `.kpi-value`, `.net-value`
- Fix savings trend chart showing `0%` on empty months → show `"—"` for months with no transactions
- Move "Clone Last" button into the Add Transaction card header (`.form-header-actions`)

### Permanently Deferred — Will Not Build

- Split Transactions — approximable with tags; low frequency in real usage
- Account reconciliation — adds complexity for minimal gain on a personal app
- Account-linked expenses/income — `account` optional field from v3.16 covers the basic case
- Receipt Photos, Budget Envelopes, Recurring Auto-Match — see roadmap for full rationale

---

## [3.28.0] — 2026-05-05

### Added

- **Net Worth Trend**: Monthly net worth snapshots stored in a new `netWorthSnapshots` IDB store (DB_VERSION 10)
- Snapshot is captured automatically on app load — once per month, only if no snapshot exists for that month
- SVG inline line chart rendered below the Net Worth dashboard showing up to 12 months of history
- Current net worth + month-over-month change shown above the chart
- Shows a placeholder message until 2 months of snapshots are available
- Animated line draw on first render (`stroke-dashoffset` CSS animation)
- Dark mode support; works fully offline

### Technical

- New constants: `NET_WORTH_SNAPSHOTS_STORE` in `state.js`; DB_VERSION bumped 9 → 10
- New DB functions: `saveNetWorthSnapshot()`, `loadNetWorthSnapshots()`, `getNetWorthSnapshotByDate()` in `db.js`
- New functions: `captureMonthlySnapshot()`, `renderNetWorthTrend()` in `accounts.js`

---

## [3.27.0] — 2026-05-05

### Added

- **Reimbursement Workflow**: Mark any `expenseType: reimbursable` transaction as settled with a single tap — "Mark settled" button appears inline on the transaction card
- Settled transactions show a green "Settled ✓" badge replacing the button
- Family Settlement dashboard now shows per-person **Outstanding** and **Settled** reimbursement sub-rows (only visible when person has reimbursable transactions)
- Settlement copy-summary text now includes outstanding/settled breakdown per person
- `markTransactionSettled(id, settledBy)` in `db.js` — patches `settled`, `settledAt`, `updatedAt` fields using the existing fetch-modify-save pattern (no DB_VERSION bump — nullable fields are backward-compatible)

---

## [3.26.1] — 2026-05-05

### Fixed

- `exchangeRate` is now required (not nullable) when `transactionCurrency` differs from the home currency — previously silently produced a NaN `homeAmount`
- `initAccounts()` failure now shows a user-facing toast instead of only logging to console
- `migrateFromLocalStorage()` failure now shows a user-facing toast instead of only logging to console

### Docs

- Updated `.claude/CLAUDE.md` module table with `auto-backup.js`, `multi-currency.js`, and `settlement.js` (added in v3.22–v3.26 but not listed)

---

## [3.26.0] - 2026-05-15

### Added

- **Multi-Currency Transactions (v3.24.0)** — Per-transaction foreign currency support
  - Toggle "Transaction Currency" in optional fields to enter amounts in any supported currency
  - Manual exchange rate input with automatic home-amount conversion
  - Exchange rate history saved locally for quick reuse
  - Dual-amount display in transaction list (foreign + home currency)
  - Full CSV/backup export and import/restore support for multi-currency fields

- **Family Expense Settlement (v3.26.0)** — Per-person balance from `attachedTo` tags
  - Settlement dashboard showing who owes whom based on `attachedTo` field usage
  - Per-person breakdown: amount spent on them, amount they contributed, net balance
  - Monthly period navigation to review settlement by month
  - One-click copy of settlement summary to clipboard
  - Auto-hidden when no `attachedTo` data exists

---

## [3.22.0] - 2026-05-15

### Added

- **Auto-Backup & Data Safety** — Scheduled local exports with storage health monitoring
  - Configurable auto-backup: daily, weekly, or monthly intervals (JSON or CSV format)
  - Storage Health dashboard: IndexedDB usage, transaction count, estimated remaining capacity
  - Encrypted backup/restore: AES-GCM-256 encryption via Web Crypto API (PBKDF2 key derivation)
  - Backup verification: integrity check with transaction count and date range validation
  - Last backup timestamp tracking in Settings tab

### Fixed

- **CSS Design Token Audit** — Comprehensive fix across v3.13–v3.22 components
  - Replaced all non-existent CSS custom property references with correct design tokens
  - Standardised form inputs to stacked vertical layout pattern with correct sizing
  - Fixed hardcoded pixel values to use token variables throughout
  - Added missing tokens: `--color-danger-bg`, `--color-danger-border`, `--color-danger-text`, `--color-primary-bg`
  - Fixed dark mode overrides to use correct token names

---

## [3.21.0] - 2026-05-01

### Added

- **Smart Spending Alerts** — Proactive, context-aware notifications based on rolling 90-day averages
  - Weekly Spike: detects when category spending exceeds 40% above weekly average
  - Unusual Amount: flags single transactions exceeding 3x category median
  - Velocity Warning: projects if monthly budget will be exceeded at current pace
  - Category Drift: alerts when category spending doubles vs last month
  - Dismissible alert banners on the Summary tab
  - Alert history in Settings (last 30 alerts)
- **Annual Report** — Compact year scorecard in the Reports tab (no duplication of existing charts)
  - Year selector for multi-year data
  - Annual summary cards (total income, expenses, net, savings rate)
  - Year-over-year comparison ("Income +12% vs last year")
  - Top 5 largest single expenses (outlier detection)
  - Export full year as CSV (tax-season-friendly)

### Technical

- New modules: `js/alerts.js`, `js/annual-report.js`
- Alert state persisted in localStorage (no new IndexedDB store needed)
- Alert checks triggered on every transaction save and on app init

---

## [3.20.0] - 2026-05-01

### Added

- **Savings Goals** — track progress toward savings targets with:
  - Create/edit/delete goals with name, target amount, optional deadline, and optional linked account
  - Circular progress ring indicators with color coding (red <50%, yellow 50-75%, green ≥75%)
  - Manual contribution button to update goal progress
  - Milestone celebrations at 25%, 50%, 75%, and 100% with toast messages
  - Overdue/deadline warnings for time-bound goals
  - Goals auto-sorted: incomplete first (by progress), completed at bottom
- New IndexedDB store: `savingsGoals` (DB_VERSION 9)
- Goals section in Summary tab (auto-hides when no goals exist)
- Dark mode support for goal cards and progress rings

---

## [3.19.0] - 2026-05-01

### Added

- **Savings Rate Dashboard** — new card in the Summary tab showing:
  - This Month Saved (amount + income context)
  - Savings Rate with color-coded percentage (green ≥20%, yellow ≥10%, red <10%)
  - 3-Month Trend bar chart showing savings rate over time
  - Annual Projection based on 3-month average
  - Cumulative Total (all-time savings)
- Savings detection from transfers to savings-flagged accounts and legacy "Savings/Investments" category
- Transfers between savings accounts are excluded from savings count
- Dashboard auto-hides when no savings accounts or legacy savings data exist
- Dark mode support for all savings widgets

---

## [3.18.0] - 2026-04-30

### Added

- **Accounts & Net Worth** — First-class account entities with derived balances and a net worth dashboard
  - Account CRUD: create, edit, deactivate accounts (checking, savings, credit-card, cash, investment, other)
  - Derived balance calculation from opening balance + transfers/income/expenses
  - Net Worth dashboard in Summary section: total assets, liabilities, and net worth
  - Per-account balance list in the net worth card
  - Account Manager in Settings with type icons, balance display, savings badge
  - "Counts as Savings" toggle per account (for future savings rate calculations)
  - Accounts referenced in transfers are deactivated instead of deleted (preserves history)
  - New IndexedDB `accounts` store (DB_VERSION 8) with name (unique) and type indexes

---

## [3.17.0] - 2026-05-01

### Added

- **Quick Entry Templates** — Save frequently used transactions as one-tap templates for faster data entry
  - Quick bar above the form with pill-shaped template buttons showing type, label, and amount
  - "Clone Last" button to pre-fill the form with the most recent transaction
  - "Save as Template" button below the submit button to create templates from current form values
  - Template Manager in Settings: reorder (up/down), inline rename, and delete templates
  - Up to 20 templates supported; templates stored in IndexedDB (`quickTemplates` store, DB_VERSION 7)
  - Pre-fill mode: templates populate the form without auto-submitting, allowing review before save

---

## [3.16.0] - 2026-04-30

### Added

- **Optional Fields System** — User-controlled optional transaction fields for power users; basic users see a clean form
  - Six optional fields: Payment Method, Merchant/Payee, Expense Type, Person (Attached To), Reference/Receipt ID, Location
  - Toggle each field on/off in Settings → Optional Fields; disabling hides the field but never deletes existing data
  - Collapsible "Additional Details" section in the transaction form keeps the UI clean
  - Autocomplete suggestions for Merchant and Person fields based on transaction history
  - Auto-detect: on first load, fields are auto-enabled if existing transactions already have data in them
  - Optional field metadata shown as compact chips in the transaction list view
  - Tags field is now part of the optional fields system — disable it in Settings for an even cleaner form
  - Full import/export/backup/restore support for all optional fields
  - Full dark mode support for all new UI elements

- **Smart Category Suggestions** — AI-lite category prediction from transaction notes
  - Builds keyword → category frequency map from the last 90 days of transactions
  - When typing notes, shows a dismissible suggestion banner: "Suggested: Household" with one-click accept
  - Suggestions are passive — never auto-fills, only suggests when confidence ≥ 60%
  - Keywords automatically rebuild from transaction history

### Technical

- `js/optional-fields.js` — New module: `initOptionalFields()`, `suggestCategory()`, `renderOptionalFieldsForm()`, `getOptionalFieldValues()`, `setOptionalFieldValues()`, `clearOptionalFields()`, `bindFieldAutocomplete()`, `renderFieldToggles()`, `handleFieldToggle()`, `handleNoteInput()`, `acceptCategorySuggestion()`, `dismissCategorySuggestion()`, `rebuildSmartKeywords()`
- `js/db.js` — DB_VERSION 5→6: new `appSettings` store; `loadAppSettings()`, `saveAppSettings()` functions
- `js/state.js` — `APP_VERSION` → `3.16.0`, `DB_VERSION` → 6; `APP_SETTINGS_STORE` constant; `DEFAULT_APP_SETTINGS`, `PAYMENT_METHODS`, `EXPENSE_TYPES` exports; `appSettings` added to state
- `js/validation.js` — Optional field validation: payment method enum, expense type enum, max length + sanitization for merchant/attachedTo/referenceId/location
- `js/ui.js` — `editTransaction()` populates optional fields; transaction list renders optional field metadata chips
- `js/import-export.js` — Export/backup include optional field columns; import/restore parse and restore optional fields
- `js/app.js` — Imports optional-fields module; `bindOptionalFieldsEvents()` for collapsible toggle, notes → suggestion, field toggles; form submit merges optional values; init calls `initOptionalFields()`, binds autocomplete, renders field toggles
- `index.html` — Collapsible "Additional Details" section with 6 optional fields in form; category suggestion banner; Optional Fields settings card with toggle switches
- `css/styles.css` — Optional field toggle, collapsible section, suggestion banner, field toggle switches, `.tx-meta` metadata chips
- `css/dark-mode.css` — Dark mode overrides for optional fields, suggestion banner, toggles, metadata chips
- `sw.js` — `js/optional-fields.js` added to `CACHE_URLS`; cache version bumped to `finchronicle-v3.16.0`
- `manifest.json` — Version bumped to `3.16.0`

---

## [3.15.0] - 2026-04-30

### Added

- **Transfer Transaction Type** — Third transaction type for money moving between accounts (credit card payments, savings deposits, debt repayments) without inflating expense/income totals
  - Transfer option in the type selector with swap icon
  - From Account / To Account fields with autocomplete from past entries and saved accounts
  - Category automatically set to "Transfer" and disabled for transfer transactions
  - Transfers excluded from all expense/income summaries, budget calculations, and category charts
  - Transfer rows visually distinct in the transaction list with neutral indigo color and swap icon
  - Account suggestions merge default accounts, saved accounts, and transaction history
  - Full dark mode support for all transfer UI elements

- **Audit Trail Improvements** — Data quality enhancements for reliable record-keeping
  - `updatedAt` timestamp on every transaction save/edit
  - Soft delete: deleted transactions are marked `deleted: true` with `deletedAt` timestamp instead of being removed
  - Soft-deleted records automatically filtered from all views, charts, and calculations
  - Backup exports include all records (including soft-deleted) with `Deleted` and `DeletedAt` columns for complete audit trail
  - Restore from backup preserves soft-delete state

### Technical

- `js/transfer.js` — New module: `getAccountSuggestions()`, `toggleTransferFields()`, `bindAccountAutocomplete()`, `getTransferFormData()`, `setTransferFormData()`, `clearTransferFields()`
- `js/db.js` — DB_VERSION 4→5 (schema-only upgrade); `deleteTransactionFromDB()` changed to soft delete; new `loadAllTransactionsFromDB()` for audit backup; `loadDataFromDB()` filters `deleted: true` records
- `js/state.js` — `APP_VERSION` → `3.15.0`, `DB_VERSION` → 5; `transfer: ["Transfer"]` added to categories; `savedAccounts` added to state
- `js/validation.js` — `transfer` added as valid type; auto-sets `category = "Transfer"`; requires both `fromAccount` and `toAccount`; prevents same source/destination
- `js/ui.js` — `updateSummary()` excludes transfers; transfer row rendering with swap icon and "from → to" label; `selectType()` toggles transfer fields; `updateCategoryOptions()` disables category for transfers; `groupByMonth()` tracks transfers separately; `groupByCategory()` handles transfer color
- `js/chart.js` — `buildIncomeExpenseData()` skips transfers in bar chart aggregation
- `js/import-export.js` — Export/backup include `From Account`, `To Account`, `UpdatedAt` columns; backup includes `Deleted`, `DeletedAt` columns and exports all records; import/restore handle transfer type and audit fields; `createBackup()` now async
- `js/app.js` — Imports transfer module; form submit builds transfer fields and `updatedAt`; binds account autocomplete; `createBackup()` awaited
- `index.html` — Transfer type button, `#transferFields` container with `fromAccount`/`toAccount` inputs and autocomplete dropdowns, category group wrapper
- `css/tokens.css` — `--color-transfer` and `--gradient-transfer` custom properties
- `css/styles.css` — Transfer toggle, `.transfer-fields`, `.account-input-wrapper`, `.account-suggestions`, `.disabled-field`, transfer transaction row styles with `::before` gradient bar
- `css/dark-mode.css` — Dark overrides for transfer fields, account suggestions, transfer icons, transfer type toggle
- `sw.js` — `js/transfer.js` added to `CACHE_URLS`; cache version bumped to `finchronicle-v3.15.0`

### Added

- **Tags & Search** — Organise and find transactions fast with free-form tags and a real-time search bar
  - Chip-style tag input in the Add/Edit transaction form; type and press Enter, comma, or Tab to add a tag
  - Autocomplete suggestions from existing tags while typing
  - Tags displayed as clickable chips on each transaction in the List tab — click a chip to filter by that tag
  - Active tag filter pills appear above the transaction list; click × to remove a filter
  - Search bar in the List tab header filters across amount, category, notes, and tags in real time
  - Clear button appears in the search bar when input is non-empty
  - Tag management section in Settings: rename (inline edit) or delete tags — changes propagate to all matching transactions
  - All tag data stored in IndexedDB on the `transactions` store; no data leaves the device
  - Full dark mode support for all new UI elements

### Technical

- `js/search.js` — New module: `filterTransactions`, `getAllTags`, `renameTag`, `deleteTag`
- `js/db.js` — DB_VERSION 3→4: added `tags` multiEntry index on `transactions` store in `onupgradeneeded`
- `js/state.js` — `DB_VERSION` bumped to 4; `searchQuery`, `searchTags`, `formTags` added to `state`
- `js/validation.js` — Tags sanitized via `sanitizeHTML`, max 30 chars/tag, max 15 tags per transaction
- `js/ui.js` — `updateTransactionsList()` applies `filterTransactions()`; renders active tag pills and tag chips on items; new `renderFormTagChips()` export; `editTransaction()` and `cancelEdit()` sync `state.formTags`
- `js/settings.js` — `renderTagManagement()` renders rename/delete rows; called from `updateSettingsContent()`
- `js/app.js` — `bindSearchEvents()` and `bindTagInputEvents()` wired in init; form submit includes `tags` field; delegated events for tag-click-to-filter, active pill removal, and tag management actions
- `index.html` — Search bar, active tag filter container, tag chip input + suggestions in form, tag management card in Settings
- `css/styles.css` — Search bar, tag chip, tag suggestion, active tag pill, tag management row styles
- `css/dark-mode.css` — Dark mode overrides for all new elements
- `sw.js` — `js/search.js` added to `CACHE_URLS`; cache version bumped to `finchronicle-v3.14.0`

---

## [3.13.0] - 2026-03-26

### Added

- **Budget Limits & Alerts** — Set monthly spending limits per expense category with configurable alert thresholds
  - Add, view, and delete budgets from the Settings tab (Budget Limits section)
  - Alert banner on the dashboard shows categories approaching or exceeding their limit, with percentage and amounts
  - Progress bars in the budget list indicate spending level per category (neutral / warning / exceeded states)
  - Alert threshold configurable 1–100% (default 80%); alerts fire when monthly spending reaches the threshold
  - Dark mode fully supported for all budget UI
  - All budget data stored in IndexedDB (`budgets` store); no data leaves the device

### Technical

- `js/budget.js` — New module: `loadBudgets`, `getBudgetForCategory`, `getSpentForCategory`, `checkBudgetAlerts`, `renderBudgetList`, `saveBudget`, `deleteBudget`, modal open/close, category select population
- `js/db.js` — Added `budgets` object store in `onupgradeneeded` (DB_VERSION 3); added `getBudgetsFromDB`, `saveBudgetToDB`, `deleteBudgetFromDB`; `getAllFromStore` now guards against missing stores (returns `[]`)
- `js/state.js` — `DB_VERSION` bumped to 3; `budgets: []` added to `state` object
- `js/ui.js` — `updateUI()` now calls `renderBudgetList()` and `checkBudgetAlerts()` on every refresh
- `js/app.js` — Budget module imported; event listeners wired for budget modal, form submit, and delete; boot sequence wraps `loadBudgets()` in try/catch
- `index.html` — Budget alert banner container (dashboard); Budget Limits section (Settings tab); budget add modal
- `css/styles.css` — Budget list, item, progress bar, warning/exceeded states, alert banner styles
- `css/dark-mode.css` — Dark mode overrides for budget alert banners and list items
- `sw.js` — `js/budget.js` added to `CACHE_URLS`

### Known Limitations

- Rollover carry-forward not yet implemented (planned for a future v3.13.x patch)
- Budget alerts are scoped to the current tab session; a budget added in a second tab requires a reload to appear in the first

---

## [3.12.1] - 2026-03-24

### Added

- **Reports tab** — Split the former Groups tab into two dedicated tabs in the bottom nav
  - **Reports** (new) — Houses all four analytics charts (category pie, income vs expenses, weekly, heatmap) with the date range selector
  - **Groups** (retained) — Now exclusively shows the By Month / By Category transaction grouping list
  - Bottom nav updated to 5 items: Add · List · Reports · Groups · Settings; mobile nav icon and font scaled down to keep all items comfortable at 75px each
- **Range date span** — Exact from/to dates displayed beside the range pills (e.g. "Sep 25, 2025 – Mar 24, 2026"); automatically reflects the earliest transaction date when "All" is selected; hidden on screens narrower than 400px

### Changed

- **Heatmap — colour separability** — Intensity formula changed from linear (`total / max`) to square-root (`√(total / max)`); days with low-but-real spending are now visually distinct instead of all collapsing to the same faint pink
- **Heatmap — period label** — Section title now shows the active range (e.g. "Spending by Day of Month — Last 6 Months") so it's clear the heatmap responds to the range selector, not the month dropdown below
- **Weekly Spending — label clarity** — Title updated to "Weekly Spending — Last 4 Weeks" to make explicit that this chart always shows the most recent 4 rolling weeks regardless of the selected range

### Technical

- `js/ui.js` — `_renderGroupCharts()` promoted to exported `updateReportsView()`; removed from `updateGroupedView()` so the two tabs are fully independent
- `js/app.js` — Tab list extended to include `"reports"`; range pills handler updated to call `updateReportsView()`; unused `updateGroupedView` import removed
- `js/chart.js` — Heatmap intensity: `Math.max(0.12, total/max)` → `Math.sqrt(total/max)`
- `css/chart.css` — Heatmap active cell formula updated to `calc(0.15 + var(--cell-intensity) * 0.80)`; added `.range-date-span` styles; `.range-date-span` hidden below 400px
- `css/styles.css` — Added `@media (max-width: 480px)` rules for 5-item bottom nav (font-size `14px → 12px`, icon `26px → 22px`)

---

## [3.12.0] - 2026-03-24

### Added

- **Reports: Complete Visualization Suite** — The Groups tab is now a full analytics dashboard
  - **Date range selector** — Choose Last 3 months / 6 months / 12 months / All time; all four charts respond instantly
  - **Income vs Expenses bar chart** — Side-by-side monthly bars with animated entry; scrollable on mobile for long ranges
  - **Weekly Spending chart** — Last 4 rolling weeks with trend arrows (↑ ↓) and percentage change vs prior week
  - **Day-of-Month Heatmap** — 31-cell heat grid showing which days of the month you spend most; intensity scales with amount
  - Category pie chart now responds to the shared date range selector (previously was per-month only)

### Technical

- `js/chart.js` — Added `getRangeMonths()`, `buildIncomeExpenseData()` / `renderIncomeExpenseChart()`, `buildWeeklyData()` / `renderWeeklyChart()`, `buildDayHeatmapData()` / `renderDayHeatmap()`; extended `buildCategoryData()` to accept a month array for range filtering
- `js/ui.js` — `updateGroupedView()` now calls `_renderGroupCharts()` helper; pie chart driven by `state.reportRange`
- `js/app.js` — Bound `#reportRangeSelect` change event in `bindStaticEvents()`
- `js/state.js` — Added `reportRange: '6m'` to state object
- `css/chart.css` — Added styles for range selector, bar chart columns, weekly rows, heatmap grid and legend
- `css/dark-mode.css` — Added `--chart-heat` RGB token override and dark mode chart surface overrides

### Changed

- **CSS refactor — token consistency and best-practice fixes** (no visual changes)
  - `--chart-heat` token moved from `css/chart.css :root {}` to its canonical location in `css/tokens.css`
  - Removed 6 no-op declarations from `tokens.css` mobile media query that re-declared values identical to the base tokens
  - `.type-option` `border-radius` corrected from spacing token `var(--space-sm)` to radius token `var(--radius-md)`
  - `.bottom-nav` duplicate `padding-bottom` declaration removed (already covered by padding shorthand)
  - `transition: background 0.2s ease` and `transition: transform 0.3s ease` literals replaced with `var(--transition-fast)` / `var(--transition-med)` in `.faq-section-header`, `.faq-section-arrow`, `.faq-question`, `.backup-faq-button`, and `.insights-month-selector`
  - `.filter-label`, `.group-content`, `.group-row`, `.group-row.with-border`, `.group-value.large` hardcoded `px` values replaced with appropriate space/font tokens
  - `.backup-status-good/warning/danger` hardcoded hex colors replaced with existing semantic tokens (`--color-chip-positive-bg`, `--color-success-strong`, `--color-success-deep`, `--color-warning-*`, `--color-chip-negative-bg`, `--color-danger-strong`, `--color-danger`)
  - `.recurring-empty-sub` three `!important` overrides removed by fixing specificity — changed `.recurring-empty p` selector to `.recurring-empty p:not(.recurring-empty-sub)`

---

## [3.11.0] - 2026-03-24

### Added

- **Recurring Transactions** — Auto-generate predictable expenses and income on a schedule
  - Supported frequencies: Daily, Weekly, Every 2 Weeks, Monthly, Quarterly, Yearly
  - Optional "Day of Month" field (1–28) for monthly recurrences to pin a specific day
  - Templates checked on every app load; due transactions are created automatically
  - Generated transactions marked with a repeat badge (`ri-repeat-line`) in the transaction list
  - Manage recurring templates from the Settings tab: Add, Edit, Pause/Resume, Delete
  - Pause a recurring without deleting it; resume any time
  - Deleting a template does not remove already-created transactions

### Technical

- New module: `js/recurring.js` — IDB CRUD, date computation, rendering, modal logic
- New IDB store: `recurringTemplates` (DB_VERSION bumped 1 → 2)
  - Indexes: `nextDueDate`, `enabled`
- Transaction schema: added optional `recurringId: number | null` field
- `js/state.js`: `DB_VERSION` bumped to 2, `RECURRING_STORE` constant added, `state.recurringTemplates` added
- `js/db.js`: `onupgradeneeded` refactored with `oldVersion` guards; 3 new exports: `loadRecurringTemplatesFromDB`, `saveRecurringTemplateToDB`, `deleteRecurringTemplateFromDB`
- `js/settings.js`: imports and calls `renderRecurringSection()` from `updateSettingsContent()`
- `js/ui.js`: recurring badge rendered for transactions with `recurringId`
- `js/app.js`: `loadRecurringIntoState()` and `checkRecurringTransactions()` called on init
- `index.html`: `#recurringContainer` in Settings tab; `#recurringModal` with full form
- `css/styles.css`: recurring section, list, item, frequency chip, empty state, badge, modal body, form hint styles
- `css/dark-mode.css`: dark mode overrides for recurring components
- `sw.js`: `js/recurring.js` added to `CACHE_URLS`; cache version bumped to `3.11.0`

---

## [3.10.5] - 2026-03-20

### Added

- **Category Spending Pie Chart** — CSS conic-gradient donut chart in the Groups tab
  - Renders top 7 expense categories with an "Other" bucket for the remainder
  - Hover a legend row to highlight that category's amount in the chart centre
  - Micro progress bar per row shows relative proportion at a glance
  - Staggered entrance animations and a tick-ring outer decoration
  - Syncs with the existing Monthly Insights month selector
  - Zero external libraries — pure CSS + Vanilla JS (`js/chart.js`, `css/chart.css`)

### Fixed

- **Accessibility — WCAG AA contrast violations** (Lighthouse audit)
  - `legend-pct` percentage labels now use `--color-text` instead of the chart segment colour; chart colours (e.g. `#34C759`, `#5AC8FA`) fail the 4.5:1 ratio on white
  - `Budget Health` status badge colours promoted to strong variants:
    - On Track: `--color-success` → `--color-success-strong` (light `#147A33` 9.7:1, dark `#30E85D`)
    - Caution: `#f59e0b` → `--color-warning-text` (light `#856404` 5.7:1, dark `#FCD34D` 11:1)
    - Over Pace: `--color-danger` → `--color-danger-strong` (light `#C41E1A` 6:1, dark `#FF6B6B`)
  - Category spending amounts in grouped view: `--color-danger` → `--color-danger-strong`
  - Added `--color-warning-text: #FCD34D` dark mode override (was unset; `#856404` fails on `#1c1c1e`)
- **Accessibility — Chart ARIA**
  - Donut wrapper: `role="img"` + `aria-label` describing total spend
  - Decorative elements (`chart-donut`, `legend-swatch`, `legend-bar`) marked `aria-hidden="true"`
  - Legend: `role="list"` with `aria-label`; each row `role="listitem"` with a full sentence `aria-label` (name, percent, amount)
  - Empty state: `role="status"` + `aria-live="polite"`

### Developer Experience

- Pre-commit version-sync hook — blocks `git commit` if `APP_VERSION`, `CACHE_NAME`, and `manifest.json` version are out of sync
- Tightened `finchronicle-dev` sub-agent description for more reliable auto-routing

### Technical

- New files: `js/chart.js`, `css/chart.css`
- New tokens: `--chart-c1..c8` in `css/tokens.css`
- `css/chart.css` linked in `index.html` between `styles.css` and `dark-mode.css`
- Both new files added to `CACHE_URLS` in `sw.js` for offline support
- `js/ui.js`: imports `renderCategoryPieChart`, `buildCategoryData` from `chart.js`; chart renders in `updateGroupedView()`

---

## [3.10.4] - 2026-03-09

### Changed

- **🏗️ Major Code Refactoring (Phase 1)** - Modernized codebase architecture for better maintainability
  - Broke down monolithic `app.js` (~1,920 lines) into **ES modules** by domain
  - Implemented **lazy loading** for FAQ and Import/Export modules (loads on-demand)
  - Streamlined module imports for cleaner dependency management
  - Removed all **inline event handlers** from HTML for better separation of concerns
  - Comprehensive **event binding system** replaces inline `onclick` handlers

### Performance

- **Optimized transaction date handling** with cached timestamps
  - Reduces redundant date parsing during sorting operations
  - Improves list rendering performance with large transaction datasets
- **Lazy module loading** reduces initial JavaScript bundle size
  - FAQ module loads only when Settings tab is opened
  - Import/Export module loads only when user triggers import/export

### Technical

- **Module Structure**: Separated concerns into domain-specific modules
  - Service worker registration and database integration
  - Shared application state management across modules
  - UI rendering utilities and transaction validation functions
  - Import/Export handlers (refactored from inline implementation)
- **Dark Mode Improvements**: Better token management and consistency
  - Added text color variable to body and select elements
  - Improved CSS variable usage across components
- **Code Quality**: Removed inline handlers from:
  - Bottom navigation buttons
  - Settings page buttons
  - Currency selector
  - Tab navigation
  - Summary cards
  - Modal buttons

### Developer Experience

- **Better code organization** - easier to find and modify features
- **Improved maintainability** - modular structure reduces complexity
- **Easier testing** - isolated modules can be tested independently
- **Documentation added**: `UNUSED_CODE_ANALYSIS.md`, `ARCHITECTURE-IMPROVEMENTS.md`, `P3-REFACTORING-COMPLETION.md`

### Notes

- **No user-facing changes** - all functionality remains identical
- **No data migration required** - purely architectural improvements
- This is a **refactoring release** focused on code quality and maintainability

---

## [3.10.3] - 2026-02-23

### Added

- **User Feedback System** - Easy ways for users to provide feedback
  - GitHub Issues integration for bug reports, feature requests, and general feedback
  - Pre-configured issue templates (bug report, feature request, general feedback)
  - Email fallback for users without GitHub accounts
  - Feedback button in header navigation for easy access
  - Feedback button in Settings page for better discoverability
  - Modal with organized feedback options

- **Automated Release System** - Streamlined release process
  - `release.sh` - One-command automated release process
  - `bump-version.sh` - Automatic version updates across all files
  - GitHub Actions workflow for automated releases and tagging
  - RELEASE.md documentation with detailed release guide
  - Pull request template for code contributions

### Technical

- New feedback modal UI component with responsive design
- New functions: `openFeedbackModal()`, `closeFeedbackModal()`
- GitHub issue templates in `.github/ISSUE_TEMPLATE/`
- GitHub Actions release workflow in `.github/workflows/release.yml`
- Feedback modal styled to match app design system
- Mobile-responsive feedback interface
- Version consistency validation in CI/CD pipeline
- Automatic changelog extraction for release notes

---

## [3.10.2] - 2026-02-20

### Added

- **Transaction Validation Layer** - Comprehensive validation for all transactions (Foundation for future features)
  - Type validation: Only 'income' or 'expense' allowed
  - Amount validation: Must be positive, maximum ₹99 crore (999,999,999)
  - Category validation: Must match available categories for transaction type
  - Date validation: No future dates, no dates before 1900
  - Notes sanitization: XSS protection via HTML sanitization
  - Notes length validation: Maximum 500 characters
  - Centralized validation logic for maintainability

### Security

- Implemented XSS protection for notes field using HTML sanitization
- All user inputs now validated before saving to database
- Sanitized transaction data stored to prevent injection attacks

### Technical

- New functions: `validateTransaction()`, `sanitizeHTML()`
- Updated form submission handler to use centralized validation
- Validation returns detailed error objects for debugging
- All validation errors displayed to user with clear messages
- Zero breaking changes - backward compatible with existing data
- No database migration required (validation is JavaScript-only)

### Improved

- Better error messages for invalid transaction data
- Consolidated validation logic (previously scattered across form handler)
- Data integrity protection for all future features
- Performance: Negligible impact (~1ms per validation)

---

## [3.10.1] - 2026-02-16

### Fixed

- **Amount Validation** - Fixed floating point precision issue in decimal validation
  - Form input now correctly accepts amounts with 1-2 decimal places (e.g., 2550.3, 2550.30)
  - Previously rejected valid amounts due to JavaScript floating point arithmetic issues
  - Refactored validation logic to use string-based decimal checking instead of `Number.isInteger(amount * 100)`
  - Added centralized `validateAmount()` function for consistent validation across form and CSV imports
  - CSV imports now also validate decimal places (max 2 decimals)
  - Improved error messages and validation consistency

### Changed

- Centralized amount validation logic for better maintainability
- Amount values are now rounded to 2 decimal places for consistency

## [3.10.0] - 2026-02-16

### Added

- **Budget Health Card** - Real-time spending insights and projections
  - Daily spending pace tracker showing average daily expenses
  - Days remaining in current month counter
  - Projected month-end spending based on current pace
  - Health status indicator: On Track, Caution, or Over Pace
  - Color-coded visual indicators (green/yellow/red)
  - Automatically displays in Monthly Insights section
  - Smart detection of current vs historical months

### Improved

- Monthly insights now provide more actionable spending data
- Better visibility into spending patterns and trends
- Helps users stay within budget through proactive alerts

---

## [3.9.1] - 2026-02-08

### Fixed

- Dark mode contrast for backup status, backup header, and FAQ headers/icons
- Backup status now refreshes immediately after CSV export

## [3.9.0] - 2026-02-08

### Added

- **Backup Reminder System** - Track and encourage regular data backups
  - Backup status card in Settings showing last backup date
  - Color-coded status indicators (green/yellow/red) based on backup age
  - One-click export directly from backup status card
  - 7-day grace period for new users before showing warnings
  - Automatic timestamp recording on each CSV export

- **Comprehensive FAQ** - In-app help section in Settings tab
  - Data Backup & Recovery section (5 questions)
    - Where data is stored, how to backup, device loss recovery
  - Privacy & Security section (3 questions)
    - Server communication, data access, security guarantees
  - Usage & Features section (3 questions)
    - Import bank statements, change currency, insights explanation
  - Collapsible accordion design for easy navigation
  - Direct link from backup card to FAQ backup section

### Improved

- Export function now records backup timestamp automatically
- Users proactively notified when backup is outdated (30+ days)
- Better onboarding for data safety awareness
- Settings tab provides comprehensive self-service help
- All new components fully responsive on mobile devices

### Technical

- New localStorage key: `last_backup_timestamp`
- New functions: `loadBackupTimestamp()`, `updateBackupTimestamp()`, `getDaysSinceBackup()`, `shouldShowBackupReminder()`, `renderBackupStatus()`, `renderFAQ()`, `toggleFAQSection()`, `toggleFAQItem()`, `scrollToFAQ()`, `updateSettingsContent()`
- Modified `exportToCSV()` to call `updateBackupTimestamp()`
- Modified `switchTab()` to populate settings content dynamically
- Added CSS for backup status card and FAQ accordion
- Full dark mode support for all new components
- Zero breaking changes - purely additive features

---

## [3.8.0] - 2026-02-07

### Added

- **Monthly Insights Panel** - Enhanced Groups tab with comprehensive monthly overview
  - Monthly summary cards showing income, expenses, savings, and transaction count
  - Month-over-month trend indicators for all metrics
  - **Month selector dropdown** - Switch between months directly in the insights section
  - Defaults to current month, with easy access to all historical months
- **Top Spending Categories** - Visual breakdown of top 5 expense categories
  - Shows category name, transaction count, total amount, and percentage of expenses
  - Sorted by spending amount (highest first)
  - Helps identify budget-consuming categories at a glance

### Improved

- Groups tab now provides actionable insights above existing month/category grouping
- Better visibility into spending patterns without complex accounting
- Month selector allows quick navigation between different months' insights
- Consistent design language with existing summary cards
- Fully responsive on mobile devices (dropdown goes full-width on small screens)

### Technical

- New functions: `getMonthInsights()`, `getTopSpendingCategories()`, `renderMonthlyInsights()`
- Updated `updateGroupedView()` to include insights section
- Added CSS styles for insights cards and category rows
- Dark mode support for all new UI components

---

## [3.7.1] - 2026-02-07

### Changed

- **Code Organization**: Separated JavaScript into external `app.js` file (~1,920 lines)
- Improved developer experience with cleaner file structure
- Better browser caching efficiency (HTML and JS cached independently)
- Enhanced code maintainability and debugging
- Service worker now caches `app.js` for offline functionality

### Technical

- Created `app.js` containing all application logic
- Updated service worker cache list to include `app.js`
- Maintained zero-framework, zero-build-tool philosophy
- All functionality remains identical to v3.7.0

---

## [3.7.0] - 2026-02-07

### Added

- 🎯 **Actionable Summary Tiles**: Tap summary cards to instantly navigate to filtered views
  - **This Month** → View all transactions for current month
  - **Total Entries** → View all transactions for current month
  - **Income** → View income transactions (current month)
  - **Expenses** → View expense transactions (current month)
  - Haptic feedback on mobile tap (50ms vibration)
  - Keyboard accessible (Tab, Enter, Space)
  - ARIA labels for screen readers

- 📊 **Trend Indicators**: Month-over-month insights at a glance
  - **This Month Net**: Shows MoM % change with ↑/↓ arrows and color coding
  - **Income**: Optional MoM trend (currently enabled)
  - **Expenses**: Shows "% of income" for spending context
  - Edge case handling: Shows "—" when no previous month data exists
  - Smart direction indicators: Green for improvements, red for declines

- 🎨 **Visual Consistency Improvements**:
  - Uniform tile heights (104px minimum)
  - Consistent cursor pointer on all interactive elements
  - Smooth `:active` state with scale animation
  - Focus-visible outline for keyboard navigation (3px primary color)
  - Enhanced hover states with translateY animation

- 📈 **Advanced Calculations**:
  - `calculateMoMDelta()`: Month-over-month percentage and absolute change
  - `calculateExpensePercentage()`: Expenses as % of income
  - `getMonthTotals()`: Aggregates transactions by month for trend analysis
  - `getPreviousMonth()`: Smart month navigation with year rollover
  - Handles edge cases: first month, zero income, empty previous month

- 🔍 **Type Filtering**: New `selectedType` filter ('all', 'income', 'expense')
  - Allows filtering transaction list by type
  - Integrated with summary tile navigation
  - Works alongside existing month and category filters

- 🔤 **Enhanced Typography for Financial Data**: Improved readability and alignment
  - Added monospace font stack (`ui-monospace`, SF Mono, Monaco, etc.) for all numerical values
  - Applied to summary cards, transaction amounts, analytics, input fields, and reports
  - Enabled `font-variant-numeric: tabular-nums` for equal-width digits
  - Better visual alignment in transaction lists and grouped views
  - Zero external dependencies - uses system monospace fonts
  - New CSS token: `--font-family-mono` for numerical data

### Changed

- 📊 **Total Entries**: Now shows current month count (was: all-time count)
  - More contextually relevant to "This Month" summary
  - Aligns with user mental model when viewing monthly dashboard
- 🎨 **Summary Card Styling**: Enhanced interactive states for better UX
- 📝 **Summary Meta**: Added "This month" label to Total Entries for clarity
- 🎨 **"This Month" Card**: Now consistently blue (neutral) regardless of net balance
  - Aligns with CR spec: neutral tiles always use primary color
  - Only the trend indicator is colored green/red, not the entire card
  - Provides better visual distinction between static metrics and trends

### Technical

- Added 4 new helper functions for trend calculations (60+ lines)
- Extended `updateTransactionsList()` with type filtering
- Enhanced `updateSummary()` with trend calculation and display logic
- Added `selectedType` global variable to filter state
- New CSS classes: `.summary-trend`, `.summary-meta` for Phase 2 styling
- Updated summary card HTML with semantic attributes (role, tabindex, aria-label)
- New CSS token: `--font-family-mono` for numerical data typography
- Updated 9 CSS classes with monospace font: `.summary-value`, `.transaction-amount`, `.compact-stat`, `.group-value`, `.group-total`, `.pagination-info`, `.report-value`, `.preview-value`, `input[type="number"]`
- Applied `font-variant-numeric: tabular-nums` to body for equal-width digits

### Documentation

- 📋 Created **Change Request (CR) - REVISED.md**: Comprehensive implementation plan
  - Aligned with privacy-first, offline-first, vanilla JS architecture
  - Split into 2 phases: Visual Consistency + Tap Actions, Trend Indicators
  - Removed analytics/telemetry requirements
  - Includes MoM calculation formulas with edge case handling

### Fixed

- ♿ **Accessibility: Improved Contrast Ratios** - WCAG AA compliance for both light and dark modes

  **Light Mode Improvements:**
  - Success-strong: `#1e8e3e` → `#147A33` (darker green, 7:1 contrast on white)
  - Danger-strong: `#d93025` → `#C41E1A` (darker red, 6:1 contrast on white)
  - Compact summary income/expense amounts now highly visible on white surfaces

  **Dark Mode Improvements:**
  - Primary color: `#0051D5` → `#0053AD` (better balance for dark backgrounds)
  - Primary hover: Updated to `#409CFF` for better visibility
  - Success-strong: `#1e8e3e` → `#30E85D` (vibrant green, 9:1 contrast on `#1c1c1e`)
  - Danger-strong: `#d93025` → `#FF6B6B` (bright coral, 6.5:1 contrast on `#1c1c1e`)
  - Text-muted: `#98989d` → `#aeaeb2` (8.5:1 contrast)
  - Text-subtle: `#98989d` → `#8e8e93` (6.5:1 contrast)
  - Filter buttons: Active state now uses white text for proper contrast
  - Filter labels: Use CSS variables with proper contrast
  - Grouped view labels: Removed hardcoded colors, use theme-aware variables

  **Cross-Theme Fixes:**
  - Removed all hardcoded color values in favor of CSS variables
  - All text and interactive elements meet WCAG AA standards (4.5:1+)
  - Mobile and desktop audits now pass for both themes

### Planned

- Budget tracking per category
- Recurring transactions
- Search functionality
- Charts and graphs

---

## [3.6.0] - 2026-02-07

### Added

- 📱 **iOS Optimizations**: Professional mobile experience
  - Zoom enabled for accessibility (users with low vision can zoom)
  - Font sizes 16px+ prevent iOS auto-zoom on input focus
  - Increased touch targets to 48px+ (iOS standard)
  - Safe area support for iPhone notch and home indicator
  - Larger fonts on mobile (14-16px minimum)
  - Bottom navigation height increased to 60px
  - Better spacing and padding throughout
- ♿ **100% Accessibility Compliance (WCAG AA)**:
  - Skip to main content link for keyboard users
  - All buttons have proper aria-labels
  - Improved color contrast ratios (all pass WCAG AA)
  - Status green: #00a83e → #008833 (4.5:1 contrast)
  - Subtle text: #8e8e93 → #6e6e73 (4.6:1 contrast)
  - Edit/delete transaction buttons have screen reader labels
  - Pagination buttons have accessible labels
  - Hidden file inputs have proper ARIA labels

### Changed

- 🔍 Enhanced compact summary readability
  - Larger font sizes (main: 18px, stats: 14px)
  - Better spacing between elements
  - More readable separators and icons
- 📊 Improved form usability on mobile
  - Labels: 16px, bolder (600 weight)
  - All inputs: min-height 48px
  - Primary button: min-height 52px
  - Better touch targets throughout
- 🎯 Bottom navigation improvements
  - Icons: 26px (larger and clearer)
  - Labels: 14px font
  - Item height: 60px (easier tapping)
  - Better vertical alignment

### Technical

- Viewport meta allows zoom for accessibility compliance
- Mobile token scale increased for better readability
- All CSS tokens cleanup completed (95%+ coverage)

---

## [3.5.1] - 2026-02-06

### Added

- 📱 **Bottom Navigation Bar**: Modern mobile-first navigation
  - Fixed bottom navigation with Add, List, Groups, Settings
  - Always accessible - no need to scroll to switch tabs
  - Better thumb reach on mobile devices
  - Icons with labels for clarity
- 🎛️ **Smart Collapsible Summary**: Space-saving with compact view
  - Toggle button to collapse/expand summary cards
  - **Collapsed view shows one-line summary in white card** with all key metrics
  - Shows: This Month net • Total entries • Income • Expenses (all in one line)
  - Proper card styling when collapsed (white background, shadow, padding)
  - Entire collapsed card is clickable to expand (better UX)
  - Hover effect on collapsed card
  - Smooth animation with fade and height transition
  - State saved to localStorage (remembers preference)
  - Arrow icon rotates to indicate state
  - Color-coded compact stats (green for positive, red for negative)

### Changed

- 🎨 Refactored styles to use shared design tokens and reduced repeated values
- 🧩 Added `css/tokens.css` and updated dark mode to override tokens
- 🔄 Moved tab navigation from middle of screen to fixed bottom bar
- 📐 Removed Quick Refresh button from header (redundant)
- 🎯 Summary card icons reduced to 24px (better proportions)
- ✍️ Improved app name typography (bolder, tighter letter-spacing, blue icon)
- ➡️ Quick Add button moved to right side of header (better mobile thumb reach)
- 📊 Added "Summary" section header with collapse control
- 📏 Compact summary view shows all stats in one line when collapsed
- 🔄 Both detailed cards and compact view stay in sync via updateSummary()
- 📱 **iOS Optimizations**: Better mobile experience
  - Disabled zoom (prevents accidental zoom, app-like experience)
  - Increased bottom nav height to 60px (better touch targets)
  - Larger font sizes on mobile (14px labels, 16px inputs)
  - Minimum touch target: 48x48px for all interactive elements
  - Added safe-area-inset support for iPhone notch/home indicator
  - Increased spacing and padding for better readability
  - Bottom nav icons: 26px (larger and clearer)

---

## [3.5.0] - 2026-02-06

### Added

- 💾 **Backup and Restore System**: Complete backup/restore functionality
  - Create timestamped backups with metadata (backup date, version, transaction count, date range, currency)
  - Multiple backup support - keep as many backup files as you want
  - Backup preview modal - see what's in a backup before restoring
  - **Merge mode restore** - preserves existing data, adds only new transactions
  - **Automatic duplicate detection** - skips transactions that already exist
  - Enhanced CSV format with metadata headers as comments
  - All transaction fields included (ID, CreatedAt for data integrity)
- 🔍 **Backup Preview Modal**: Visual preview before restoring
  - Shows backup date, transaction count, date range, currency
  - Informational message about merge mode
  - Cancel or confirm restore action
- 📊 **Restore Report Modal**: Detailed statistics after restore
  - Total transactions in backup
  - New transactions added
  - Duplicates skipped
  - Current total transactions
  - Color-coded statistics with icons
- ✨ **Compact Single-Line Header**: Redesigned header for better space utilization
  - Quick Add button (+ icon) - instantly jump to add transaction form
  - Inline status and version - all in one line
  - Improved app name typography (bolder, tighter letter-spacing)
  - Blue wallet icon for better brand identity
  - Saves ~20px vertical space
- 🎨 **Enhanced Summary Cards with Icons**: Improved visual design
  - Icons added to all 4 cards (calendar, checklist, up/down arrows)
  - Color-coded icons match card purpose (green/red/blue)
  - 2x2 grid layout maintained for balance
  - Hover effects for interactivity
  - Clean white background with proper icon sizing (24px)

### Changed

- 🎨 Settings tab reorganized with backup/restore buttons
- 📦 Backup files now use timestamp-based naming: `finchronicle-backup-YYYY-MM-DD-HHMMSS.csv`
- ✅ Restore operations now use **merge mode** (safe, non-destructive)
- 🔄 Existing transactions are preserved during restore
- 🏗️ Header redesigned to single-line compact layout (saves vertical space)
- 📐 Summary cards now use hero layout with "This Month" emphasized
- 🎯 Better use of horizontal space in header with quick action buttons

### Technical

- Added `isDuplicateTransaction()` function for duplicate detection
- Added `createBackup()` and `generateBackupMetadata()` for enhanced backups
- Added `parseBackupCSV()` with metadata extraction
- Added `showRestoreReport()` and `closeRestoreReport()` for statistics display
- Added `quickAddTransaction()` function for header quick action
- Added restore report modal with `.restore-report-info` styling
- Added `.modal-info` component for informational messages
- Added `.header-content`, `.header-actions`, `.header-btn`, `.header-meta` CSS classes
- Added `.card-icon` and `.card-content` for icon-based card layout
- Updated summary cards to use flexbox with icons (24px size)
- Enhanced h1 typography: font-weight 700, letter-spacing -0.5px
- Blue wallet icon color (#0051D5) for brand identity
- Comprehensive error handling and validation for backup files
- Duplicate matching: same date, type, category, amount, and notes
- Header height reduced from ~56px to ~36px (saves 20px)
- Single-line header layout with flexbox for better space utilization

### Security

- Backup validation checks for required headers
- Data integrity validation (dates, amounts, types)
- Error recovery: if restore fails, existing data is preserved
- Safe merge mode prevents accidental data loss

### Technical

- Added `toggleSummaryCollapse()` and `loadSummaryState()` functions
- Compact summary dynamically updates via `updateSummary()`
- All hardcoded CSS values replaced with design tokens
- Added `--color-install` token for install prompt
- Mobile font scale increased: 13px → 14px, 15px → 16px
- Viewport meta allows user zoom for accessibility
- Minimum touch targets: 48px for iOS compliance
- Token coverage: 95%+ (only layout-specific values remain hardcoded)
- Summary values now use `--color-success-strong` (#1e8e3e) and `--color-danger-strong` (#d93025)
- Icons still use lighter colors, text uses darker colors for contrast
- Skip link positioned absolutely with focus transition
- All color combinations tested for 4.5:1 contrast ratio

---

## [3.4.0] - 2026-02-06

### Added

- ✨ **Enhanced Form Feedback**: Multi-layered confirmation when adding transactions
  - Loading state with spinner animation while saving
  - Success state with checkmark and green button color
  - Card pulse animation with green glow effect
  - Haptic feedback (vibration) on mobile devices
  - Improved success message with bounce animation and checkmark icon
- 📱 **Better Mobile Keyboard**: Amount input now shows optimized decimal keypad
  - Added `inputmode="decimal"` for perfect currency input experience
  - Consistent across iOS and Android devices

### Changed

- 🗄️ **Major upgrade: IndexedDB storage** for transactions (unlimited scale)
- 💾 localStorage now used only for settings (currency, dark mode, version)
- 🔄 Auto-migration from localStorage to IndexedDB on first load
- ⚡ Improved performance with indexed queries for filters
- 🎨 Cleaner amount input field (removed spinner arrows on desktop)
- 📅 Fixed date input field overflow and height consistency on iOS devices
- 🔢 Improved decimal precision for amount input (step changed to 0.01)

### Technical

- Added IndexedDB wrapper with Promise-based API
- Hybrid storage architecture (IndexedDB + localStorage)
- Backward compatible migration (preserves existing data)
- Implemented button state management (loading, success, disabled states)
- Added CSS animations: `successPulse`, `slideDownBounce`, spinner rotation
- Enhanced form submission flow with 800ms feedback cycle
- Added haptic feedback using Vibration API

---

## [3.3.2] - 2026-01-31

### Changed

- 📱 Refined transaction list layout on mobile for better readability and spacing
- 🎨 Replaced transaction icon with a styled status indicator for more room
- 🧊 Softened edit/delete button styling with translucent treatments

---

## [3.3.1] - 2026-01-31

### Changed

- 💎 Enhanced currency display with badge styling for better visibility
- 📊 Reorganized currency list by priority (local, major, regional currencies)

---

## [3.3.0] - 2026-01-31

### Added

- 📥 **CSV Import**: Import transactions from CSV files via toolbar button
  - Supports app export format and custom CSVs with Date, Category, Amount, Notes/Description
  - Automatic date normalization for common formats

### Changed

- Expanded and refined expense categories for better budgeting accuracy

---

## [3.1.0] - 2025-01-15

### Added

- 🎨 **Professional Icons**: Replaced all emoji icons with Remix Icon font for consistent appearance across all devices
- 🔄 **Manual Update Check**: Added refresh button in toolbar to check for updates manually
- 🎯 **Improved Update Mechanism**:
  - Service worker now activates immediately without closing tabs
  - One-click "Update Now" button with automatic reload
  - Background update checking every 60 seconds
  - Shows clear update available notification

### Changed

- Transaction icons now use colored, filled arrow icons (up for income, down for expense)
- Action buttons (edit/delete) now use professional icon font
- Tab icons updated to modern, clean designs
- Dark mode toggle uses sun/moon icons instead of emojis

### Fixed

- Update mechanism now works properly - no need to delete and reinstall app
- Icons now render consistently on iOS, Android, Windows, and macOS
- Spinning animation on update check button

### Technical

- Added Remix Icon font from CDN
- Updated service worker cache to v5
- Added proper icon styling for light and dark modes
- Improved service worker message handling

---

## [3.0.0] - 2025-01-14

### Added

- 💱 **Multi-Currency Support**: Choose from 20 major world currencies
  - USD, EUR, GBP, INR, JPY, CNY, THB, SGD, and 12 more
  - Beautiful currency selector modal
  - Currency symbol updates throughout the app
  - Persistent currency selection stored locally
- 🎛️ **Smart Type Toggle**: Replaced dropdown with mobile-friendly toggle buttons for Income/Expense
- 📊 **Dynamic Categories**: Categories now filter based on selected transaction type
  - Income categories: Salary, Freelance, Business, Investment, Other
  - Expense categories: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other
- 🔢 **Version Display**: Version number now visible in app header
- 🔔 **Auto-Update Notifications**:
  - Automatic version checking on app load
  - Green banner notification when updates available
  - Shows old → new version number
- 🔄 **Service Worker Updates**: Detects and notifies about new versions

### Changed

- Transaction type selection is now a toggle button instead of dropdown
- Category dropdown populates dynamically based on selected type
- Amount label now shows selected currency symbol
- CSV export now includes currency code in header
- Improved update flow with better user feedback

### Technical

- Added version management system with localStorage
- Service worker cache updated to v3
- Added currency selector modal with 20 currencies
- Improved form UX with toggle buttons
- Added proper ARIA roles for accessibility

---

## [2.0.0] - 2025-01-13

### Added

- ✏️ **Edit Transactions**: Update any existing transaction
  - Click edit button on transaction
  - Form pre-fills with transaction data
  - Save updates or cancel
- 🗑️ **Delete Transactions**: Remove transactions with confirmation
  - Click delete button on transaction
  - Confirmation modal to prevent accidents
  - Permanent deletion
- 🔍 **Category Filtering**: Filter transaction list by specific category
  - Dropdown in List tab
  - Shows all categories from transactions
  - Filter by income or expense categories
- 📥 **Export to CSV**: Download all transactions
  - Export button in toolbar
  - CSV includes: Date, Type, Category, Amount, Notes
  - Filename includes current date
  - Open in Excel, Google Sheets, etc.
- 🌙 **Dark Mode**: Toggle between light and dark themes
  - Moon/sun icon in toolbar
  - Saves preference to localStorage
  - All UI elements adapt to dark theme
- 🎨 **Improved UI**: Better mobile experience
  - Larger touch targets
  - Better spacing
  - Smoother animations
  - iOS-style design polish

### Changed

- Transaction items now show edit and delete buttons
- Toolbar redesigned with export and dark mode buttons
- Improved transaction list layout
- Better visual feedback on interactions

### Fixed

- Color contrast issues for WCAG AA compliance
- Form label associations for accessibility
- Service Worker registration error handling

### Technical

- Added modal system for confirmations
- Implemented CSV generation and download
- Added dark mode CSS with all component support
- Service worker cache updated to v2
- Improved localStorage data management

---

## [1.0.0] - 2025-01-12

### Added

- 💰 **Track Transactions**: Add income and expense transactions
  - Type (Income/Expense)
  - Amount
  - Category
  - Date
  - Notes (optional)
- 📊 **Monthly Summary**: View current month's financial overview
  - Net amount (income - expenses)
  - Total income
  - Total expenses
  - Transaction count
- 📋 **Transaction List**: View all transactions chronologically
  - Color-coded by type (green for income, red for expense)
  - Shows category, notes, date, and amount
  - Newest first
- 📅 **Month Filtering**: Filter transactions by specific month
  - Buttons for recent months
  - Dynamic month list based on transactions
- 🎯 **Category Grouping**: View spending by category
  - By Month view: Income/Expense/Net per month
  - By Category view: Total spending per category
  - Entry counts for each group
- 💾 **Offline-First**: Works completely without internet
  - Service Worker caching
  - localStorage persistence
  - All data stays on device
- 📱 **Progressive Web App**: Installable on mobile devices
  - Add to Home Screen on iOS
  - Manifest.json configuration
  - App-like experience
- ♿ **Accessible**: WCAG AA compliant
  - Proper semantic HTML
  - ARIA labels
  - Keyboard navigable
  - Screen reader friendly
- 🎨 **Beautiful Design**: iOS-style interface
  - Clean, modern look
  - Smooth animations
  - Responsive layout
  - Works on all screen sizes

### Technical

- Single HTML file with embedded CSS and JavaScript
- Service Worker for offline support
- Web App Manifest for PWA
- localStorage for data persistence
- No backend or database required
- No external dependencies (except icons)
- Total size: ~15KB

---

## Version History

- **v3.10.5** - Category pie chart, WCAG AA contrast fixes, chart ARIA (2026-03-20)
- **v3.6.0** - iOS optimizations, enhanced mobile UX (2026-02-07)
- **v3.5.1** - Bottom navigation, design tokens, UI refinements (2026-02-06)
- **v3.5.0** - Backup and restore system with preview (2026-02-06)
- **v3.4.0** - IndexedDB storage, enhanced form feedback, mobile improvements (2026-02-06)
- **v3.3.2** - Mobile layout refinements (2026-01-31)
- **v3.3.1** - Currency display improvements (2026-01-31)
- **v3.3.0** - CSV import (2026-01-31)
- **v3.1.0** - Professional icons, improved updates (2025-01-15)
- **v3.0.0** - Multi-currency, smart toggles, version system (2025-01-14)
- **v2.0.0** - Edit, delete, filter, export, dark mode (2025-01-13)
- **v1.0.0** - Initial release (2025-01-12)

---

## Upgrade Notes

### Upgrading to v3.4.0

- **Automatic data migration**: All transactions automatically migrate from localStorage to IndexedDB
- Migration happens seamlessly on first load
- All existing data preserved (transactions, currency, dark mode preference)
- Enhanced form feedback works immediately
- Mobile keyboard improvements apply automatically
- No manual action required

### Upgrading from v3.0.0 to v3.1.0

- No data migration needed
- Icons automatically update to new font
- Currency selection is preserved
- All transactions remain intact

### Upgrading from v2.0.0 to v3.0.0

- No data migration needed
- Default currency set to INR (changeable in settings)
- Transaction categories work same way
- All existing data compatible

### Upgrading from v1.0.0 to v2.0.0

- No data migration needed
- All transactions automatically get IDs
- Dark mode preference starts as disabled
- All existing transactions editable/deletable

---

## Breaking Changes

### v3.0.0

- Category structure changed to object format
- Type dropdown replaced with toggle button

### v2.0.0

- Transaction data structure extended with `createdAt` field
- Service worker cache name changed (old cache auto-deleted)

---

## Links

- [Documentation](VERSION.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [MIT License](LICENSE)
- [GitHub Repository](https://github.com/kiren-labs/finchronicle)
- [Live Demo](https://kiren-labs.github.io/finchronicle/)
