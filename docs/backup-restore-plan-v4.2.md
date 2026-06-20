# Backup & Restore Overhaul — Implementation Plan

> Version target: v4.2.0 (revised — supersedes Actionable Spending Insights as v4.2)
> Last updated: 2026-05-23
> Status: Ready to implement

---

## Why This Work

The current backup/restore system has three separate problems that compound each other:

1. **Data loss** — six IDB stores and two critical localStorage keys are never backed up
2. **False confidence** — "Create Backup" produces a CSV that silently drops accounts, budgets, recurring templates, and goals
3. **Confusing UX** — two entry points (top Settings buttons + Auto-Backup card) do overlapping things with no clear mental model

A user who relies on "Create Backup" and later restores loses everything except their transaction list. This is the most serious data integrity issue currently in the app.

---

## Scope

### In scope

- Fix backup envelope to include all IDB stores and critical localStorage data
- Fix restore to write all stores back (not just transactions)
- Remove CSV from auto-backup (silently lossy)
- Migrate stored `backupFormat: 'csv'` setting to `'json'` on init
- Add SHA-256 integrity field to JSON envelope
- Add `migrateBackupPayload()` for forward compatibility
- Add merge vs replace choice on restore
- Consolidate UI into one static "Data & Backup" card
- Remove the 4 scattered top-of-settings toolbar buttons

### Out of scope

- Auto-sync or cloud backup (violates zero-dependency, privacy-first)
- Incremental backups
- Backup history browser (keep last N files on device — browser can't control Downloads)

---

## Decisions Made

| Decision                                | Choice                                | Reason                                                                            |
| --------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| Include `currency` in backup?           | No                                    | Device preference, not financial data. Conflict prompt adds friction for no value |
| Include `smartAlerts` in backup?        | No                                    | Transient dismiss history — not financial data                                    |
| Include `darkMode`, UI prefs in backup? | No                                    | Device preferences                                                                |
| Include `exchangeRateHistory`?          | Yes                                   | User-entered FX rates — real data, not reproducible                               |
| Include `tagColors`?                    | Yes                                   | User customization tied to tag data                                               |
| CSV in auto-backup?                     | Remove                                | Silently drops 7 of 9 stores — footgun                                            |
| Restore mode?                           | Both merge + replace                  | Merge = safer default; Replace = device migration                                 |
| UI: static or JS-injected?              | Static HTML in index.html             | JS only updates dynamic values (last backup date, toggle state)                   |
| Integrity check on restore?             | SHA-256 in envelope, warn on mismatch | Don't block restore — warn and let user decide                                    |

---

## Backup Envelope Schema

```javascript
{
  version: "4.2.0",
  backupSchemaVersion: 1,
  exportDate: "2026-05-23T12:00:00.000Z",
  currency: "THB",                        // informational only, not restored
  transactionCount: 342,
  integrity: "sha256:abc123...",          // SHA-256 of JSON with this field set to ""

  // IDB stores
  transactions: [...],
  recurringTemplates: [...],
  budgets: [...],
  accounts: [...],
  savingsGoals: [...],
  quickTemplates: [...],
  appSettings: { enabledFields: {...}, keywords: {...} } | null,
  netWorthSnapshots: [...],              // NEW — requires explicit IDB read

  // localStorage (data only, not preferences)
  localStorage: {
    exchangeRateHistory: {...} | null,   // NEW
    tagColors: {...} | null,             // NEW
  }
}
```

**Note:** `appSettings` is already written to `buildJsonBackup()` but never restored in `confirmRestore()`. `netWorthSnapshots` must be fetched via `getAllNetWorthSnapshots()` — `state.netWorthSnapshots` is not eagerly loaded.

---

## File Format Routing (unified restore handler)

```
user picks file
  ├── .enc  → prompt passphrase → decryptBackup() → JSON string
  │            → migrateBackupPayload() → preview modal → merge/replace
  ├── .json → JSON.parse() → check backupSchemaVersion
  │            → migrateBackupPayload() → preview modal → merge/replace
  └── .csv  → legacy CSV path (transactions only)
               → show banner: "CSV restores transactions only. Use .json backup for full restore."
               → preview modal → import (append only, no replace option)
```

---

## Restore Modes

### Merge (default)

- Skip records where `id` already exists in IDB
- Append new records
- Good for: "I accidentally deleted some transactions" / "adding records from older device"
- Label: **"Merge — add missing records"**

### Replace (destructive)

- Call `clearAllStores(storesToClear)` — only clears stores that have corresponding data in the backup payload. If backup is schema 0 (no `netWorthSnapshots`), do NOT wipe the local snapshots store.
- Write all records from backup
- Good for: switching devices, full rollback
- Label: **"Replace — overwrite all current data"** (red button)
- Extra confirmation step: "This will delete all current data. Cannot be undone."

**`clearAllStores()` scope:**

```javascript
const CLEARABLE_STORES = [
  "transactions",
  "recurringTemplates",
  "budgets",
  "accounts",
  "savingsGoals",
  "quickTemplates",
  "appSettings",
  "netWorthSnapshots",
];
// Only clear stores present in the backup payload:
const storesToClear = CLEARABLE_STORES.filter((s) => backupData[s] != null);
```

---

## UI — New "Data & Backup" Card

Single static card in Settings replaces the 4 scattered toolbar buttons and absorbs the JS-rendered auto-backup card.

```
┌─────────────────────────────────────────────────┐
│  Data & Backup                                  │
│                                                 │
│  ── EXPORT ──────────────────────────────────── │
│  [↓ Export to Spreadsheet]                      │
│     Transactions only · CSV · for analysis      │
│                                                 │
│  ── BACKUP ──────────────────────────────────── │
│  [↓ Download Backup]                            │
│     All data · JSON · restoreable               │
│  [🔒 Encrypted Backup]                          │
│     Password-protected · JSON+AES-GCM-256       │
│  Last backup: 23 May 2026                       │
│                                                 │
│  ── AUTO-BACKUP ─────────────────────────────── │
│  Enable auto-backups         [toggle]           │
│  Frequency  [Daily / Weekly / Monthly]          │
│  Always saves full JSON backup                  │
│                                                 │
│  ── RESTORE ─────────────────────────────────── │
│  [↑ Import Spreadsheet CSV]                     │
│     Adds transactions only · no overwrite       │
│  [↑ Restore from Backup]                        │
│     Accepts .json or .enc · all data            │
│     Shows preview + merge/replace choice        │
└─────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1 — Data completeness (no UI change)

No user-visible change. Fixes silent data loss in the existing backup format.

**`js/auto-backup.js` → `buildJsonBackup()`**

- Make async
- Use `loadAllTransactionsFromDB()` instead of `state.transactions` — includes soft-deleted records for complete audit trail
- Add `getAllNetWorthSnapshots()` call to fetch snapshots from IDB
- Add `appSettings` to envelope (already in state, just add it)
- Add `localStorage` block: `exchangeRateHistory`, `tagColors`
- Add `backupSchemaVersion: 1` field
- Add SHA-256 integrity field — **two-pass serialization:**
  1. Serialize JSON with `integrity: ""`
  2. Compute SHA-256 of that string via `crypto.subtle.digest()`
  3. Set `integrity: "sha256:<hex>"` and serialize again for download
- **Ripple effect:** `encryptBackup()` calls `buildJsonBackup()` synchronously today — must be updated to `await buildJsonBackup()` (already inside an async function, so just add `await`)

**`js/import-export.js` → `confirmRestore()`**

- Add `appSettings` restore: `saveAppSettings(backupData.appSettings)` if present
- Add `netWorthSnapshots` restore: bulk-save via `bulkSaveNetWorthSnapshots()` (add to `db.js` if missing)
- Add localStorage restore: `exchangeRateHistory`, `tagColors` — only if present in payload
- Add `migrateBackupPayload(data)` function: if no `backupSchemaVersion`, treat as schema 0 and add defaults
- Verify SHA-256 on restore: mismatch shows warning in preview modal, does not block

**`js/app.js` → init**

- One-shot migration: `if (getBackupSettings().backupFormat === 'csv') { saveBackupSettings({...settings, backupFormat: 'json'}) }`

**`js/db.js`**

- Add `getAllNetWorthSnapshots()` if not already exported
- Add `bulkSaveNetWorthSnapshots(snapshots)` if not already exported
- Add `clearAllStores()` (needed for Phase 2 replace mode — add now, wire in Phase 2)
- Add `saveAppSettings(settings)` if not already exported

**Files modified:** `js/auto-backup.js`, `js/import-export.js`, `js/app.js`, `js/db.js`
**DB changes:** None — no `DB_VERSION` bump
**Version bump:** Not yet — bundle Phase 1 + 2 into v4.2.0

**Backward compatibility note:** Phase 1 changes the JSON backup format (adds `backupSchemaVersion`, `netWorthSnapshots`, `localStorage` block). Older app versions (< 4.2) can still restore new backups because `JSON.parse` ignores unknown keys and `confirmRestore()` only reads fields it knows about. No action needed — but document this in CHANGELOG as a one-way format upgrade.

---

### Phase 2 — UI consolidation

**`index.html`**

- Remove 4 top-of-settings toolbar buttons: Export CSV, Import CSV, Create Backup, Restore Backup
- Remove `restoreFile` hidden input (accept=".csv")
- Remove `importFile` hidden input (accept=".csv")
- Add static "Data & Backup" card (markup above) after Optional Fields card
- Add single unified file input: `accept=".json,.enc,.csv"` id=`dataRestoreFile`
- Remove format dropdown from auto-backup section (keep toggle + frequency only)
- Auto-backup card: static structure in HTML, JS only fills in last-backup date and toggle state

**`js/auto-backup.js` → `renderAutoBackupSettings()`**

- Remove — no longer JS-renders the whole card
- Replace with `updateAutoBackupUI()`: only updates last-backup date text + toggle checked state
- Remove CSV option from `DEFAULT_SETTINGS.backupFormat`, hardcode to `'json'`
- `runAutoBackupIfDue()` always calls `performJsonBackup(true)`

**`js/import-export.js`**

- Add `handleRestoreFileInput(file)` — detects format by extension, routes to correct path
- `.enc` → prompt passphrase → `importEncryptedBackup()` → `processRestoredData()`
- `.json` → `migrateBackupPayload()` → `processRestoredData()`
- `.csv` → existing `parseBackupCSV()` + show CSV-only warning banner
- Preview modal: add integrity check result line ("Integrity: verified ✓" or "⚠ Hash mismatch")

**`js/app.js`**

- Remove event bindings for old 4 toolbar buttons
- Add event binding for new unified `dataRestoreFile` input
- Add binding for new "Download Backup", "Encrypted Backup", "Import Spreadsheet", "Restore from Backup" buttons

**Files modified:** `index.html`, `js/auto-backup.js`, `js/import-export.js`, `js/app.js`

---

### Phase 3 — Hardening

**Merge vs Replace UI**

In `processRestoredData()` preview modal, add two action buttons:

- "Merge — add missing records" (default, blue)
- "Replace — overwrite all data" (red, triggers confirmation step)

`confirmRestore(mode)` accepts `'merge'` or `'replace'`:

- `'replace'`: call `clearAllStores()` first, then write all stores
- `'merge'`: existing behaviour (skip existing IDs)

Confirmation step for replace: full-screen warning card with transaction count of what will be deleted.

**`migrateBackupPayload()` — schema versioning**

```javascript
function migrateBackupPayload(data) {
  // schema 0 → 1: no backupSchemaVersion field
  if (!data.backupSchemaVersion) {
    data.backupSchemaVersion = 0;
    data.netWorthSnapshots = data.netWorthSnapshots || [];
    data.localStorage = data.localStorage || {};
  }
  return data;
}
```

Future versions add migration steps here.

**Files modified:** `js/import-export.js`

---

## Files Modified — Complete List

| File                  | Phase     | Change                                                                                                                                                                      |
| --------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/auto-backup.js`   | 1 + 2     | `buildJsonBackup()` async + full envelope; remove `renderAutoBackupSettings()`; add `updateAutoBackupUI()`; remove CSV path                                                 |
| `js/import-export.js` | 1 + 2 + 3 | `confirmRestore()` restores all stores + localStorage; `handleRestoreFileInput()` format routing; `migrateBackupPayload()`; integrity check in preview; merge/replace modes |
| `js/db.js`            | 1         | Add `getAllNetWorthSnapshots()`, `bulkSaveNetWorthSnapshots()`, `clearAllStores()`, confirm `saveAppSettings()` exists                                                      |
| `js/app.js`           | 1 + 2     | One-shot CSV setting migration; rebind events for new buttons; remove old toolbar button bindings                                                                           |
| `index.html`          | 2         | Remove 4 toolbar buttons; add static "Data & Backup" card; unified file input                                                                                               |
| `css/styles.css`      | 2         | Data & Backup card styles (sections, dividers)                                                                                                                              |
| `css/dark-mode.css`   | 2         | Dark mode for new card                                                                                                                                                      |
| `js/state.js`         | 3         | Bump `APP_VERSION` → `4.2.0`                                                                                                                                                |
| `sw.js`               | 3         | Bump `CACHE_NAME` → `finchronicle-v4.2.0`                                                                                                                                   |
| `manifest.json`       | 3         | Bump `version` → `4.2.0`                                                                                                                                                    |

---

## What a Verified Full Restore Guarantees

After v4.2.0, restoring a `.json` or `.enc` backup restores:

| Data                                  | Store                              |
| ------------------------------------- | ---------------------------------- |
| All transactions (incl. soft-deleted) | IDB `transactions`                 |
| Recurring templates                   | IDB `recurringTemplates`           |
| Budget limits                         | IDB `budgets`                      |
| Accounts + classification             | IDB `accounts`                     |
| Savings goals                         | IDB `savingsGoals`                 |
| Quick entry templates                 | IDB `quickTemplates`               |
| Optional fields config                | IDB `appSettings`                  |
| Net worth trend history               | IDB `netWorthSnapshots`            |
| Exchange rate history                 | localStorage `exchangeRateHistory` |
| Tag colour assignments                | localStorage `tagColors`           |

Not restored (device preferences):

- `currency`, `darkMode`, `summaryCollapsed`, `alertsExpanded`, `smartAlerts`, UI prefs

---

## Open Questions (decide before Phase 2)

1. **Where does "Data & Backup" card sit in Settings scroll order?** Recommendation: after Quick Entry Templates, before Accounts — near the top since it's high-stakes.

2. **Keep "Backup Now" in auto-backup section or remove?** Currently it's in the auto-backup card. In the new layout "Download Backup" and "Backup Now" do the same thing. Recommend: remove "Backup Now" from auto-backup section, "Download Backup" button covers it.

3. **Show netWorthSnapshots count in preview modal?** Useful context ("restoring 8 monthly snapshots"). Low effort — add one line.

4. **Roadmap update** — this replaces the previous v4.2.0 (Actionable Spending Insights). Spending Insights moves to v4.3.0 and all subsequent versions shift by one.
