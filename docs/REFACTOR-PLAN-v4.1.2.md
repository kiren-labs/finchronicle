# Refactor Plan — v4.1.2

> Code-quality patch. No behavior change. No DB migration. No new feature.
> Target: `js/alerts.js`, `js/forecast.js`, `js/auto-backup.js`, `js/import-export.js`.

---

## Why now

Four modules grew big during 4.1.0 / 4.1.1 / 4.2.0 work. Each now mixes pure logic, DOM rendering, and storage in one file. Result:

- Hard to unit-test pure logic (DOM/localStorage tangled in)
- Repeated patterns (alert lifecycle, balance walk, fileSize/filename)
- Long files — `import-export.js` 967 lines, `auto-backup.js` 634, `alerts.js` 607
- Inline HTML strings everywhere → XSS risk surface, hard to read

Senior-engineer lens: split by **concern** (detect / store / render), kill duplication, name things so the file reads top-to-bottom.

---

## Non-negotiables (carried from CLAUDE.md)

1. Zero deps. No new files unless wired into `sw.js` CACHE_URLS.
2. Public API unchanged. Every existing `export` keeps its signature so `app.js` is untouched (or one-line import path swap).
3. No DB version bump. No `state` shape change.
4. No `innerHTML` with user data. Move toward DOM builder helpers, not `innerHTML` + `data-*` post-fix dance (current `forecast.js` smell).
5. Pure functions get unit tests in the sibling `finance-tracker-tests` repo before/after — proves no behavior drift.

---

## Phase 0 — Prep (1 commit)

| #   | Task                                                                                                                      | File                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 0.1 | Create branch `refactor/v4.1.2` off `main` (after `feature/backup-restore-v4.2.0` merges)                                 | —                                    |
| 0.2 | Add unit-test snapshots for current behavior of `buildForecast`, `runAlertChecks`, `verifyBackup`, `parseBackupCSV`       | `finance-tracker-tests/unit/`        |
| 0.3 | Bump version stub: `APP_VERSION = '4.1.2'`, `CACHE_NAME = 'finchronicle-v4.1.2'`, manifest. Don't ship until phases done. | `state.js`, `sw.js`, `manifest.json` |

**Gate to next phase:** snapshot tests pass on `main` head.

---

## Phase 1 — `js/alerts.js` (607 → ~3 files, ~250 lines each)

### Diagnosis

- 12+ helpers: `getExpenses`, `getWeekStart`, `getRollingWeeklyAverages`, `getCategoryMedians`, `getThisWeekByCategory`, `getThisMonthByCategory`, `getLastMonthByCategory`, `getMonthSpend` — three nearly-identical month aggregators
- Detection (`checkWeeklySpike`, `checkUnusualAmount`, …) tangled with persistence (`persistAlerts`) and rendering (`renderAlertBanners`, `renderAlertHistory`)
- Module-level mutable state (`alertHistory`, `dismissedAlerts`) — singleton hidden in module
- `renderAlertBanners` mixes `innerHTML` with computed values; `data-*` postfix not used so user-supplied category names land in `innerHTML` → **latent XSS** if a category contains `<script>` (validation should block it, but defense in depth)

### Split

```
js/alerts/
  index.js              — re-exports public API; runAlertChecks orchestrator (~80 lines)
  detectors.js          — pure check functions; export each detector (~250 lines)
  aggregations.js       — getExpenses / getThisMonth / averages / medians (~120 lines)
  store.js              — alertHistory + dismissedAlerts + localStorage persistence (~80 lines)
  render.js             — renderAlertBanners + renderAlertHistory + getAlertTypeLabel (~120 lines)
  constants.js          — ALERT_TYPES, ROLLING_DAYS, ALERT_HISTORY_MAX, STORAGE_KEY (~20 lines)
```

> If user prefers single-file: keep `alerts.js` but enforce section order: constants → aggregations → detectors → store → orchestrator → render. Same wins, half the file moves. **Recommended: single-file reorg first, split only if it's still hard to read after.**

### Specific cleanups

1. **Collapse three month aggregators into one parameterised helper:**

   ```js
   function spendByCategoryInRange(start, end) { … }
   const thisWeek = spendByCategoryInRange(getWeekStart(now), now);
   const thisMonth = spendByCategoryInRange(monthStart(now), now);
   const lastMonth = spendByCategoryInRange(monthStart(now, -1), monthEnd(now, -1));
   ```

   Removes ~40 lines of copy-paste.

2. **Replace module-mutable singletons with a store object:**

   ```js
   const alertStore = createAlertStore(); // { history, dismissed, persist, dismiss, clear }
   ```

   Makes `runAlertChecks` testable by passing a stub store.

3. **Detector contract:** every detector returns `Alert[]` (never null, never single). Removes the `if (x) push(x)` ladder in `runHealthAlertChecks`.

4. **Severity calculation:** repeated `ratio >= N ? 'danger' : 'warning'` → one helper `severityFromRatio(ratio, dangerAt)`.

5. **Render layer:** stop using `innerHTML` with computed strings. Build banners with `document.createElement` + `textContent` for the message. Same DOM, no XSS surface, easier to read than the `data-msg` postfix dance.

6. **Dedup key:** `${type}:${category}:${window}` is brittle if `category` contains `:`. Use `JSON.stringify([type, category, window])` or a hash. Low priority, but flag it.

**Wins:** ~150 lines removed. Pure detectors unit-testable. Render path no longer interleaves with detection.

---

## Phase 2 — `js/forecast.js` (227 → ~180 lines, two clear halves)

### Diagnosis

- `buildForecast` is fine — pure, testable, well-commented. **Leave alone.**
- `renderForecast` is broken-by-design:
  - Builds HTML with `innerHTML`, then **immediately re-walks the DOM** to set `textContent` on the same nodes via `data-*` attributes (lines 195–226). Two passes, easy to drift.
  - Uses `data-*` to smuggle user-controlled-ish values (`label = tmpl.name`) past the `innerHTML` string. If `tmpl.name` contains `"` it breaks the markup.
  - `activeHorizon = 30` module-level — same singleton smell as alerts.

### Fix

1. **Single-pass DOM builder:**

   ```js
   function buildEventRow(ev) {
     const row = el(
       "div",
       "forecast-event-row" +
         (ev.runningBalance < 0 ? " forecast-event-negative" : ""),
     );
     row.append(
       el("span", "forecast-event-date", ev.date),
       el("span", "forecast-event-label", ev.label),
       el("span", amountClass(ev.amount), formatAmount(ev.amount)),
       el(
         "span",
         balanceClass(ev.runningBalance),
         formatCurrency(ev.runningBalance),
       ),
     );
     return row;
   }
   ```

   `el(tag, className, text)` is a 5-line helper — add it to `utils.js`, reuse everywhere.

2. **Replace `activeHorizon` module var:** read horizon from `data-horizon` on the active toggle button, or pass into `renderForecast(horizonDays)` as required arg. Keeps state in DOM where it belongs.

3. **Warning dedup**: `[...new Map(warnings.map(w => [w.account, w])).values()]` keeps the _first_ warning per account, but events are sorted ascending — so it correctly shows the _earliest_ breach. Add a comment so the next reader doesn't "fix" it.

**Wins:** No more two-pass render. No `innerHTML` with user data. ~30 lines shorter.

---

## Phase 3 — `js/auto-backup.js` (634 → split)

### Diagnosis

- Three concerns mashed together:
  - **Backup payload building** (`buildJsonBackup`, `buildCsvBackup`) — pure-ish
  - **Crypto** (`deriveKey`, `encryptBackup`, `decryptBackup`) — pure
  - **Storage health & quota** (`requestStoragePersistence`, `checkStorageHealth`) — browser-API
  - **Settings persistence** (`getBackupSettings`, `saveBackupSettings`) — localStorage
  - **UI rendering** (`renderAutoBackupSettings`, `renderStorageHealth`, `updateAutoBackupUI`) — DOM
  - **Public actions** (`performJsonBackup`, `performCsvBackup`, `performEncryptedBackup`) — orchestration
- `buildCsvBackup` is **duplicated** with the CSV export in `import-export.js` — same column list, slight schema drift risk
- `performJsonBackup` / `performCsvBackup` / `performEncryptedBackup` repeat the same epilogue (update timestamp, save settings, `state.backupDue = false`, `updateAutoBackupUI`, `showMessage`)

### Split

```
js/backup/
  index.js            — public API re-export (~40 lines)
  payload.js          — buildJsonBackup, buildCsvBackup, getBackupFilename (~150 lines)
  crypto.js           — deriveKey, encryptBackup, decryptBackup (~60 lines)
  storage-health.js   — requestStoragePersistence, checkStorageHealth (~70 lines)
  settings.js         — getBackupSettings, saveBackupSettings, isBackupDue (~60 lines)
  actions.js          — performJsonBackup, performCsvBackup, performEncryptedBackup, importEncryptedBackup (~120 lines)
  ui.js               — renderAutoBackupSettings, renderStorageHealth, updateAutoBackupUI (~140 lines)
```

> Same fallback as alerts: if user prefers, single-file with strict section order.

### Specific cleanups

1. **Single source of truth for CSV columns:** export `CSV_COLUMNS` array (and `transactionToCsvRow` mapper) from `payload.js`. `import-export.js` imports the same. Removes 30 lines of duplication and drift risk.

2. **Backup epilogue helper:**

   ```js
   async function finalizeBackup({ blob, filename, successMsg, isAuto }) {
     await downloadBlob(blob, filename);
     markBackupDone(); // updates settings.lastAutoBackup, timestamp, state.backupDue, UI
     if (!isAuto) showMessage(successMsg);
   }
   ```

   Three perform\* functions shrink ~15 lines each.

3. **Move `downloadBlob` to `utils.js`** — `import-export.js` likely re-implements file downloads too. One canonical helper, including the iOS Web Share fallback.

4. **`buildJsonBackup` integrity calc:** swallows crypto errors silently → empty integrity field. Either log + propagate, or set `integrity: "unsupported"`. Silent failure is the worst outcome.

5. **Magic numbers:** PBKDF2 iterations (100k), salt (16), iv (12), AES-GCM key length (256) — pull to named constants at top of `crypto.js`.

**Wins:** CSV column drift eliminated. Duplicate epilogue gone. Crypto in its own file makes a future security review trivial.

---

## Phase 4 — `js/import-export.js` (967 → split)

### Diagnosis (largest, dirtiest module)

- 22 top-level functions in one file
- Mixes CSV export / CSV import / JSON backup creation / restore preview UI / restore execution / file-input wiring / encrypted import passthrough
- `parseBackupCSV` is **199 lines** — has its own format detection, escape parsing, fallback handling
- `confirmRestore` is **112 lines** with three branches (merge / replace / append) inline
- `createBackup` is named like `auto-backup.js`'s `performJsonBackup` — overlap unclear
- File-input event handlers (`handleImport`, `handleRestore`, `handleRestoreFileInput`, `handleCsvRestore`) — four similar shapes

### Split

```
js/data-io/
  index.js              — public API (~50 lines)
  csv-export.js         — exportToCSV (~80 lines)
  csv-import.js         — importFromCSV, parseBackupCSV (~250 lines)
  backup-create.js      — createBackup, generateBackupMetadata (~120 lines)
  restore-flow.js       — triggerRestore, handleRestore, showRestorePreview, confirmRestore, processRestoredData (~280 lines)
  restore-validators.js — verifyIntegrity, migrateBackupPayload, isDuplicateTransaction (~80 lines)
  file-handlers.js      — triggerImport, handleImport, handleCsvImportFile, handleRestoreFileInput, handleCsvRestore (~80 lines)
```

### Specific cleanups

1. **Resolve overlap with `auto-backup.js`:** `createBackup` (in `import-export.js`) vs `performJsonBackup` (in `auto-backup.js`) — what's the difference? Pick one. If both exist, document why in a 2-line comment in each.

2. **Split `confirmRestore` by mode:**

   ```js
   const RESTORE_HANDLERS = {
     merge: restoreMerge,
     replace: restoreReplace,
     append: restoreAppend,
   };
   export async function confirmRestore(mode = "merge") {
     const handler = RESTORE_HANDLERS[mode];
     if (!handler) throw new Error(`Unknown restore mode: ${mode}`);
     return handler(state.pendingRestore);
   }
   ```

   Each branch becomes a 30-line testable function.

3. **`parseBackupCSV` legacy paths:** if specific formats are no longer in the wild, deprecate them with a `console.warn`. If they still are, add a comment naming the version that produced them.

4. **File-input handlers are nearly identical** — extract `readFileAs(file, 'text' | 'arrayBuffer')` Promise wrapper (already common pattern; saves boilerplate).

5. **Imports cleanup:** the import block at the top is 25 lines. After split each sub-file imports only what it uses → smaller surface, easier to review.

6. **Reuse `CSV_COLUMNS` from `backup/payload.js`** (Phase 3 #1).

**Wins:** Largest absolute LOC reduction. Restore flow becomes reviewable. Drops the 199-line monster function.

---

## Phase 5 — Sweep (cross-cutting)

| #   | Task                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | Add `el(tag, className, text)` and `readFileAs(file, mode)` to `utils.js`. Remove duplicates.                                    |
| 5.2 | Audit every `innerHTML = …` in the four refactored modules. Replace with DOM builders where the string contains computed values. |
| 5.3 | Run validate-local.sh — version sync, no debugger/eval, manifest, SW cache list updated for any new files.                       |
| 5.4 | Run unit tests + Playwright. Diff snapshots against Phase 0. Zero behavior delta required.                                       |
| 5.5 | Manual QA pass: offline mode, dark mode, mobile viewport, encrypted backup roundtrip, restore preview merge/replace/append.      |
| 5.6 | Update `CHANGELOG.md`: "v4.1.2 — internal refactor, no user-visible changes."                                                    |

---

## What the refactor does NOT touch

- `js/db.js` — already clean, single concern
- `js/state.js` — no shape change
- `js/app.js` — at most an import-path edit per module if we go directory-style
- IndexedDB schema — no DB_VERSION bump
- Any feature behavior — this is a no-op refactor

---

## Risk register

| Risk                                           | Mitigation                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Behavior drift on alert dedup or restore merge | Snapshot tests in Phase 0; required gate before merge                                 |
| Cache invalidation breaks PWA upgrade path     | `CACHE_NAME` bump + every new `.js` path in `CACHE_URLS` (validate-local.sh enforces) |
| Public API change leaks into `app.js`          | Each phase touches `app.js` import paths only; no signature changes                   |
| Sub-directory imports break in some browsers   | All imports are relative `./` paths; ES modules already used everywhere               |
| Refactor stalls mid-phase                      | Each phase is independently mergeable; ship in 5 small PRs not one mega-PR            |

---

## Sequencing

```
4.2.0 ships  →  branch refactor/v4.1.2 off main
                    │
                    ├── PR-1: Phase 0 (snapshot tests + version bump)
                    ├── PR-2: Phase 1 alerts.js
                    ├── PR-3: Phase 2 forecast.js
                    ├── PR-4: Phase 3 auto-backup.js
                    ├── PR-5: Phase 4 import-export.js
                    └── PR-6: Phase 5 sweep + release
```

Five-to-six small PRs over a week beats one 2000-line PR that nobody wants to review.

---

## Decision points to confirm before code

1. **Single-file reorg vs sub-directory split?** Recommend single-file reorg first for `alerts.js`. Sub-directory for `import-export.js` (it's 967 lines, no way around it). `auto-backup.js` borderline — single-file likely fine.
2. **Snapshot-test investment up-front?** Worth 1–2 hours for `buildForecast` and `parseBackupCSV` because behavior drift is hardest to spot there.
3. **Ship as 4.1.2 or roll into 4.2.0?** Ship after 4.2.0 merges. Mixing refactor with a feature release blurs the diff and reverting becomes harder.
