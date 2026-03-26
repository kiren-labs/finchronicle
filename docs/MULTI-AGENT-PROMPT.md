# FinChronicle Multi-Agent Workflow Prompt

## Context

FinChronicle is a **zero-dependency, offline-first PWA** built in vanilla JavaScript. All data lives in IndexedDB. The architecture is non-negotiable:

- **Zero npm dependencies** — no frameworks, no build tools besides `scripts/build.js`
- **Offline-first** — every feature must work without internet
- **Privacy-first** — all data stays on device
- **XSS safety** — use `textContent` for user input, never `innerHTML` with untrusted data
- **Modular ES modules** — each feature gets its own `js/` file, imported in `app.js`
- **IndexedDB only** — transaction data NEVER in localStorage
- **Single state object** — all UI state in `state` object (`js/state.js`)
- **Master refresh cycle** — `updateUI()` in `js/ui.js` is the canonical refresh function

## Feature Release Sequencing (from FEATURE-ROADMAP.md)

```
v3.13.0 Budget Limits & Alerts        (DB_VERSION 3)
    ↓
v3.14.0 Tags & Search                 (DB_VERSION 4)
    ↓
v3.15.0 Optional Fields System        (DB_VERSION 5)
    ↓
v3.16.0 Split Transactions            (DB_VERSION 6)
    ↓
v3.17.0 Savings Goals                 (DB_VERSION 7)
    ↓
v3.18.0 Receipt Photos                (DB_VERSION 8)
```

**Key constraint:** Only **ONE feature per release**. Only **ONE DB_VERSION bump per release**. Features must complete sequentially; do NOT parallelize releases.

## Multi-Agent Team Structure

### Role 1: Feature Lead
**Goal:** Deliver one complete feature end-to-end, from spec to merged PR.

**Responsibilities:**
- Implement the feature spec from FEATURE-ROADMAP.md
- Modify IndexedDB schema (if needed) — document DB_VERSION increment
- Add new `js/` modules or modify existing ones
- Update HTML, CSS, dark mode CSS
- Call `updateUI()` after state changes
- Update CACHE_URLS in `sw.js` if needed
- Create unit-testable logic (validation, DB operations)

**Success criteria:**
- Feature works in offline mode
- No console errors in DevTools
- Mobile responsive (< 480px viewport)
- Dark mode supported
- Accessibility (WCAG AA) for any new UI components
- All validation runs *before* save

---

### Role 2: QA & Constraint Validator
**Goal:** Catch violations of FinChronicle's non-negotiable constraints before merge.

**Responsibilities:**
- Review code for zero-dependency violations
- Verify all IndexedDB logic uses `db.js` operations
- Check XSS safety: no `innerHTML` with user input, use `sanitizeHTML()` when needed
- Verify offline-first: simulate offline in DevTools, test core flows
- Check dark mode CSS is updated
- Accessibility spot-check: buttons, modals, forms have proper labels/ARIA
- Verify `updateUI()` is called after state mutations
- Test on mobile viewport (< 480px) and desktop

**Test checklist per feature:**
- [ ] Works offline (DevTools > Network > Offline)
- [ ] No external API calls or CDN requests
- [ ] Data persists after reload
- [ ] Dark mode looks correct
- [ ] Mobile viewport (< 480px) is responsive
- [ ] No XSS vulnerabilities (test with HTML in notes field)
- [ ] All new code is vanilla JS (no npm imports)
- [ ] IndexedDB operations only via `db.js`
- [ ] No console errors

---

### Role 3: Version & Deploy Coordinator
**Goal:** Manage version bumps, cache invalidation, and changeset documentation.

**Responsibilities:**
- Coordinate DB_VERSION increments (only one per release)
- Update APP_VERSION in `js/state.js` (e.g., `v3.13.0`)
- Update CACHE_NAME in `sw.js` (e.g., `finchronicle-v3.13.0`)
- Update `version` in `manifest.json`
- Update `CHANGELOG.md` with feature summary
- Update version badge in `README.md`
- Ensure only one DB_VERSION bump and one APP_VERSION per release
- Flag conflicts if Feature Lead tries to bump DB_VERSION incorrectly

**Deploy checklist:**
- [ ] APP_VERSION, CACHE_NAME, manifest.json all match
- [ ] CHANGELOG.md updated with feature notes
- [ ] CACHE_URLS in `sw.js` includes all new `.js` files
- [ ] No other version files were modified (only the 3 above)
- [ ] README.md version badge updated

---

### Role 4: Edge Case & Failure Scenario Analyst
**Goal:** Identify gaps, race conditions, and failure modes *before* they hit users.

**Responsibilities:**
- Brainstorm failure scenarios: network restore mid-operation, IndexedDB quota exceeded, duplicate recurring triggers, edge dates (leap years, month-end), large datasets (1000+ transactions), browser plugin conflicts
- Validate error handling: does the UI gracefully handle IndexedDB errors? Validation failures? Missing data?
- Test concurrent scenarios: two tabs modifying state, one tab offline while another syncs
- Verify data integrity: can corrupt states happen? Can transactions get lost? Duplicated?
- Challenge assumptions: "What if the user deletes the recurring template while a transaction is being generated?"

**Report format:**
- Scenario → Failure mode → Mitigation → Test steps

**Example scenarios to test per feature:**
- User has 5000+ transactions; does the feature still load fast?
- IndexedDB quota is 90% full; error handling?
- Recurring template is deleted while a transaction is mid-generation?
- Two browser tabs open; state sync issues?
- User toggles dark mode mid-modal?
- Mobile: soft keyboard covers form inputs?

---

## Execution Flow

### Phase 1: Feature Lead Implements (Solo)
1. Read feature spec from FEATURE-ROADMAP.md (provided above)
2. Design DB schema (if needed) — **do NOT bump DB_VERSION yet**
3. Implement feature in new `js/module.js` or modify existing modules
4. Update HTML, CSS, dark-mode CSS
5. Update `sw.js` CACHE_URLS
6. Manual testing: offline, dark mode, mobile
7. **Commit with message:** `feat: add [feature name] (wip)`

### Phase 2: QA Validates (Solo)
1. Run full test checklist (see above)
2. Test on real mobile device or DevTools mobile viewport
3. Test offline mode (DevTools > Network > Offline)
4. Document failures and edge cases found
5. **Report:** Pass/Fail + findings
   - If Fail: return to Feature Lead with specific issues
   - If Pass: proceed

### Phase 3: Edge Case Analyst Probes (Solo)
1. Review Feature Lead's implementation
2. Brainstorm 5–10 failure scenarios relevant to the feature
3. Test concurrent/race conditions
4. Test data integrity edge cases
5. **Report:** Blocker-level findings vs. nice-to-have improvements

### Phase 4: Coordinator Prepares Release
1. Review all findings; coordinate with Feature Lead on blockers
2. **After Feature Lead confirms fixes:**
   - Increment DB_VERSION (if applicable)
   - Update APP_VERSION, CACHE_NAME, manifest.json
   - Update CHANGELOG.md, README.md
   - Add `js/[module].js` to CACHE_URLS in `sw.js`
3. **Do NOT commit version files until all roles sign off**

### Phase 5: Review & Merge
1. All 4 roles review the final PR
2. Sign-off checklist:
   - [ ] Feature Lead: Implementation complete
   - [ ] QA: All tests pass
   - [ ] Edge Case: Mitigations in place, no blockers
   - [ ] Coordinator: Version files updated correctly
3. Merge to `main`

---

## Communication Protocol

**Blockers:**
- Feature Lead → QA: "Test found XSS issue in notes field"
- QA → Feature Lead: "Need to call `sanitizeHTML()` before saving notes"
- Feature Lead → Edge Case: "Is the race condition between recurring trigger and manual delete a blocker?"
- Edge Case → Coordinator: "Yes, need retry logic in `generateTransaction()`"
- Coordinator → Feature Lead: "Cannot release until retry logic is added; DB_VERSION bump is blocked"

**Dependencies:**
- Coordinator announces: "v3.13.0 is tagged; v3.14.0 can now start (DB_VERSION 4 reserved)"
- Feature Lead for v3.14.0 can begin implementation knowing the DB schema baseline

**Parallel work allowed:**
- QA validates v3.13.0 while Feature Lead preps v3.14.0 POC
- Edge Case probes v3.13.0 while Feature Lead writes DB migration tests
- **But:** Only ONE feature in active development per release cycle

---

## Rules & Constraints

1. **No npm packages.** Ever. If a helper is needed, write vanilla JS.
2. **All DB operations via `db.js`.** Don't open IndexedDB directly.
3. **All state mutations trigger `updateUI()`.** No exceptions.
4. **One DB_VERSION bump per release.** If two features modify IndexedDB schema, they cannot ship together.
5. **Version files must all match.** `APP_VERSION`, `CACHE_NAME`, `manifest.json#version` are always in sync.
6. **Offline-first non-negotiable.** Every feature must work without internet.
7. **XSS safety always.** Use `textContent`, never `innerHTML` with user data.
8. **No unhandled IndexedDB errors.** All `.catch()` must provide user feedback via `showMessage()`.

---

## Example: v3.13.0 Budget Limits Feature Flow

### Feature Lead Implementation Plan
```
1. Add `budgets` store to DB schema (js/db.js)
   - Schema: { id, category, monthlyLimit, alertThreshold, rolloverEnabled, ... }
   - Index: category (one budget per category)
   - DO NOT bump DB_VERSION yet

2. Create js/budget.js
   - exportBudgetForCategory(category)
   - getAvailableBudget(category, month)
   - checkBudgetAlert(category, spent)
   - UI functions for modal/list

3. Update js/app.js
   - Import js/budget.js
   - Add event listeners for budget modal open/close

4. Update index.html
   - Add Budget section in Settings tab
   - List of budgets, Add/Edit/Delete modals

5. Update css/styles.css
   - Budget list styles, warning colors, threshold visual

6. Update css/dark-mode.css
   - Dark mode colors for budget alerts

7. Update sw.js
   - Add js/budget.js to CACHE_URLS

8. Manual test offline, dark mode, mobile
```

### QA Test Checklist
```
✓ Offline: Add budget, create transaction, verify alert triggers
✓ Dark mode: Colors visible, no contrast issues
✓ Mobile: Form fits in < 480px, scrolling works
✓ XSS: Enter "<img src=x onerror=alert()>" in category; no alert fires
✓ IndexedDB: Budget persists after reload
✓ updateUI(): Toggle budget, verify UI refreshes
✓ No console errors
✓ Validation: Cannot save empty category, negative limit, etc.
```

### Edge Case Scenarios
```
1. User hits IndexedDB storage quota while saving a budget
   → Error handling? Retry? User message?

2. User creates budget for "Food" at $500, then changes category name
   → Does budget stay linked to old name?

3. User deletes all transactions for "Food", then deletes budget
   → Orphaned budget? Clean state?

4. Two tabs open: one adds budget, one creates transaction
   → Alert fires correctly in both tabs?

5. User toggles rolloverEnabled while a transaction is auto-generating
   → Calculation uses old or new rule?
```

### Coordinator Release Prep
```
After Feature Lead & QA sign off:
- js/state.js: APP_VERSION = 'v3.13.0'
- sw.js: CACHE_NAME = 'finchronicle-v3.13.0'
- manifest.json: "version": "v3.13.0"
- js/state.js: DB_VERSION = 3 (was 2)
- CHANGELOG.md: Add Budget Limits feature notes
- README.md: Update version badge
- sw.js: Add js/budget.js to CACHE_URLS
- Commit: "release: v3.13.0 Budget Limits & Alerts"
```

---

## Kickoff Prompts for Each Role

### Feature Lead (v3.13.0)
```
You are the Feature Lead for v3.13.0 Budget Limits & Alerts in FinChronicle.

Your goal: Implement the complete feature as specified in FEATURE-ROADMAP.md, 
including DB schema changes, UI, validation, and error handling.

Constraints:
- Zero npm dependencies (vanilla JS only)
- All DB operations via js/db.js
- Call updateUI() after any state change
- Use sanitizeHTML() before saving user input
- DO NOT bump DB_VERSION — the Coordinator will do that
- Test offline, dark mode, mobile (< 480px)

Your implementation steps:
1. Create js/budget.js with all feature logic
2. Modify js/db.js to add budgets store schema
3. Update index.html with Budget UI
4. Update css/styles.css and css/dark-mode.css
5. Update sw.js CACHE_URLS (do NOT change CACHE_NAME)
6. Manual test offline, dark mode, mobile
7. Commit with "feat: add budget limits (wip)"
8. Notify QA when ready for testing
```

### QA (v3.13.0)
```
You are the QA & Constraint Validator for v3.13.0 Budget Limits.

Your goal: Ensure the Feature Lead's implementation adheres to all of 
FinChronicle's constraints and works correctly.

Test checklist:
- [ ] Works offline (DevTools > Network > Offline)
- [ ] No external API calls
- [ ] Data persists after reload
- [ ] Dark mode looks correct
- [ ] Mobile responsive (< 480px)
- [ ] No XSS vulnerabilities (test HTML in notes)
- [ ] All code is vanilla JS
- [ ] IndexedDB operations only via db.js
- [ ] updateUI() called after state changes
- [ ] No console errors

Report findings as: PASS (with notes) or FAIL (with specific issues).
If FAIL, return to Feature Lead with minimal reproducible steps.
```

### Edge Case Analyst (v3.13.0)
```
You are the Edge Case & Failure Scenario Analyst for v3.13.0 Budget Limits.

Your goal: Identify failure modes, race conditions, and data integrity 
issues that could cause problems for users.

Analyze the Feature Lead's implementation for:
1. Concurrent scenarios (two tabs, IndexedDB locks)
2. Resource constraints (5000+ transactions, IndexedDB quota)
3. State conflicts (budget deleted while transaction uses it)
4. Calculation edge cases (leap years, month-end, rollover logic)
5. Error paths (network restore, IndexedDB errors, validation failures)

For each scenario, report:
- Scenario name & description
- Failure mode (what bad thing happens)
- Mitigation (how Feature Lead should handle it)
- Test steps (how QA can verify the fix)

Flag as BLOCKER or NICE_TO_HAVE. Blockers must be fixed before release.
```

### Coordinator (v3.13.0)
```
You are the Version & Deploy Coordinator for v3.13.0 Budget Limits.

Your goal: Manage version bumps, cache invalidation, and ensure 
all release files stay in sync.

Wait for sign-off from Feature Lead, QA, and Edge Case Analyst.

Then execute:
1. Update js/state.js: APP_VERSION = 'v3.13.0'
2. Update sw.js: CACHE_NAME = 'finchronicle-v3.13.0'
3. Update manifest.json: "version": "v3.13.0"
4. Update js/state.js: DB_VERSION = 3
5. Update sw.js: Add js/budget.js to CACHE_URLS
6. Update CHANGELOG.md with feature summary
7. Update README.md version badge
8. Commit: "release: v3.13.0 Budget Limits & Alerts"

Verify no other version files were changed.
Flag conflicts if Feature Lead modifies DB_VERSION or CACHE_NAME.
```

---

## Notes for Running the Team

- **Start with one feature (v3.13.0 Budget Limits).** Validate the workflow before scaling.
- **Strict sequencing.** v3.13.0 must fully release (main branch) before v3.14.0 starts.
- **Async coordination.** Roles don't need to run in parallel; they can overlap (QA on v3.13 while Feature Lead preps v3.14 POC).
- **Escalation path.** If Edge Case finds a blocker, Feature Lead pauses development and fixes it immediately.
- **Documentation over meetings.** Each role submits findings in writing; no real-time chat debates.
- **Single source of truth.** All decisions logged in commit messages and CHANGELOG.md.

---

## Success Metrics

- 🟢 Feature works offline, on mobile, in dark mode
- 🟢 Zero XSS vulnerabilities
- 🟢 All tests pass, no console errors
- 🟢 Data persists across reloads and browser restarts
- 🟢 One DB_VERSION bump per release, all version files in sync
- 🟢 Feature shipped in < 1 week
