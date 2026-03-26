# FinChronicle Multi-Agent Workflow

---

## Part 1: What Is Multi-Agent in Claude Code? (KT)

### The Core Mental Model

Think of it like a software team — but you are the **engineering manager**, and each agent is a **focused contractor** you hire for a specific job. You give them a task, they do the work and hand you back a result. They don't talk to each other directly — **everything flows through you**.

```
You (Orchestrator)
    ├── spawn → Feature Lead agent    → returns: files changed, test notes
    ├── spawn → QA agent              → returns: pass/fail report
    ├── spawn → Edge Case agent       → returns: blocker/nice-to-have list
    └── you handle: version bumps, commits, PR creation
```

### How Agents Work in Claude Code

| Concept | What it means |
|---------|---------------|
| **Agent** | A subprocess with its own context window. Stateless — it has no memory of previous agent calls. |
| **Orchestrator** | You, in the main conversation. You coordinate agents and pass context forward. |
| **Agent tool** | How Claude Code launches an agent: `subagent_type`, `prompt`, optionally `isolation: "worktree"`. |
| **Foreground** | Agent runs and blocks until done. Use when you need the result before continuing. |
| **Background** | Agent runs in parallel while you continue. Use for independent work (e.g. QA + Edge Case simultaneously). |
| **Worktree** | Isolated git branch for the agent. Changes don't touch `main` until you merge. |

### When TO Use Multi-Agent

- **Full feature development** — Feature Lead implements, QA validates, you review and ship
- **Parallel independent work** — QA + Edge Case reviewing the same code at the same time
- **Keeping main context clean** — long file reads, large implementations; send to an agent, get back a summary
- **Specialized review** — accessibility audit, security review, constraint validation
- **Risky changes** — use worktree isolation so main is never polluted

### When NOT To Use Multi-Agent

- **Simple edits** — changing a CSS value, fixing a typo, bumping a version string. Just do it directly.
- **Exploratory questions** — "what does this function do?" Just read the file.
- **Sequential tasks with no parallelism** — if Task B depends on Task A's output, running them as separate agents adds overhead with no benefit.
- **Version bumps and commits** — these are 2-minute mechanical tasks. Do them yourself in the main context.

### The Communication Reality

Agents **cannot message each other**. If you need Agent B to know what Agent A found, you:
1. Read Agent A's output
2. Copy the relevant findings into Agent B's prompt

This is deliberate — it forces you to review what each agent produces before passing it forward, which is where bugs get caught.

### The `finchronicle-dev` Agent

This project has a custom agent at `.claude/agents/finchronicle-dev.md`. It knows:
- All project constraints (zero deps, XSS safety, updateUI(), etc.)
- The correct code patterns (validateTransaction → save → updateUI)
- Which files to touch for which operations

**All agents in this workflow should use `subagent_type: "finchronicle-dev"`**. You give each one a role-specific prompt on top of that shared knowledge.

---

## Part 2: Project Context

FinChronicle is a **zero-dependency, offline-first PWA** built in vanilla JavaScript. The architecture is non-negotiable:

- **Zero npm dependencies** — no frameworks, no build tools besides `scripts/build.js`
- **Offline-first** — every feature must work without internet
- **Privacy-first** — all data stays on device
- **XSS safety** — use `textContent` for user input, never `innerHTML` with untrusted data
- **Modular ES modules** — each feature gets its own `js/` file, imported in `app.js`
- **IndexedDB only** — transaction data NEVER in localStorage
- **Single state object** — all UI state in `state` object (`js/state.js`)
- **Master refresh cycle** — `updateUI()` in `js/ui.js` is the canonical refresh function

---

## Part 3: Feature Release Sequencing

```
v3.13.0 Budget Limits & Alerts        (DB_VERSION → 3)
    ↓
v3.14.0 Tags & Search                 (DB_VERSION → 4)
    ↓
v3.15.0 Optional Fields System        (DB_VERSION → 5)
    ↓
v3.16.0 Split Transactions            (no DB bump)
    ↓
v3.17.0 Savings Goals                 (DB_VERSION → 6)
    ↓
v3.18.0 Receipt Photos                (DB_VERSION → 7)
```

**Key constraint:** Only **one feature per release**. Only **one DB_VERSION bump per release**. Features ship sequentially — v3.13.0 must be on `main` before v3.14.0 starts.

---

## Part 4: Agent Roles

All agents use `subagent_type: "finchronicle-dev"`. The role-specific prompt is what differentiates them.

### Role 1: Feature Lead
**Goal:** Implement one complete feature end-to-end.

**Outputs to you:**
- List of files changed and why
- Any decisions made (e.g. why a certain DB schema shape)
- Manual test results (offline, dark mode, mobile)
- Any open questions or risks

**Does NOT:**
- Bump DB_VERSION, APP_VERSION, or CACHE_NAME (Coordinator does that)
- Commit to main (you do that after review)

---

### Role 2: QA & Constraint Validator
**Goal:** Catch violations of FinChronicle's constraints before they reach main.

**Inputs from you:** Summary of what Feature Lead changed + specific files to review.

**Outputs to you:** PASS or FAIL with specific findings.

**Test checklist:**
- [ ] Works offline (DevTools → Network → Offline)
- [ ] No external API calls or CDN requests
- [ ] Data persists after reload
- [ ] Dark mode looks correct
- [ ] Mobile viewport (< 480px) responsive
- [ ] No XSS (test `<img src=x onerror=alert(1)>` in notes field)
- [ ] All code is vanilla JS — no npm imports
- [ ] IndexedDB operations only via `db.js`
- [ ] `updateUI()` called after state mutations
- [ ] No console errors

---

### Role 3: Edge Case Analyst
**Goal:** Find failure modes and race conditions before users do.

**Inputs from you:** Summary of what Feature Lead changed + specific files to review.

**Outputs to you:** Scenario list with BLOCKER or NICE_TO_HAVE classification.

**Standard scenarios to probe:**
- 5000+ transactions — does the feature still load fast?
- IndexedDB quota at 90% — error handling?
- Two tabs open with conflicting state
- User deletes a record mid-operation (e.g. deletes a budget while a transaction is being categorized against it)
- Leap year / month-end edge dates
- Mobile soft keyboard covers form inputs

**Report format per scenario:**
```
Scenario: [name]
Failure mode: [what bad thing happens]
Mitigation: [how to handle it]
Test steps: [how QA can verify]
Classification: BLOCKER | NICE_TO_HAVE
```

---

### What You Handle Directly (No Agent Needed)

After Feature Lead, QA, and Edge Case all sign off:
1. Update `js/state.js` — `APP_VERSION` and `DB_VERSION`
2. Update `sw.js` — `CACHE_NAME` and `CACHE_URLS` (add new `.js` file)
3. Update `manifest.json` — `version`
4. Update `CHANGELOG.md`
5. Update `README.md` version badge
6. Commit and create PR

These are mechanical 2-minute edits — no agent needed.

---

## Part 5: How to Execute This in Claude Code

This is the step-by-step you follow in the **main Claude Code conversation**.

### Step 1 — Launch Feature Lead (foreground, with worktree isolation)

```
Use the Agent tool:
  subagent_type: "finchronicle-dev"
  isolation: "worktree"          ← gives it a private git branch
  prompt: [paste Feature Lead kickoff prompt from Part 6]
```

Wait for the agent to return. Read its output carefully — note what files it changed and any decisions it flagged.

---

### Step 2 — Launch QA + Edge Case (background, in parallel)

Once Feature Lead returns, fire both agents **at the same time** in a single message:

```
Message with TWO Agent tool calls:

Agent call 1:
  subagent_type: "finchronicle-dev"
  run_in_background: true
  prompt: [QA kickoff prompt] + [Feature Lead's output summary]

Agent call 2:
  subagent_type: "finchronicle-dev"
  run_in_background: true
  prompt: [Edge Case kickoff prompt] + [Feature Lead's output summary]
```

You'll be notified when each finishes. You don't need to wait — continue reading Feature Lead's output while they run.

---

### Step 3 — Review findings

Read both reports. Classify findings:
- **Blockers** → go back to Feature Lead with a fix prompt (repeat from Step 1, no worktree needed for a patch)
- **NICE_TO_HAVE** → log in CHANGELOG as "known limitations / future work"

---

### Step 4 — You handle the release

When all roles are clear:
- Edit version files directly (no agent)
- Commit: `release: v3.13.0 Budget Limits & Alerts`
- Create PR via `gh pr create`

---

### Visual: What runs when

```
Step 1  [Feature Lead]────────────────────────────────────┐
                                                           ↓ (you review output, extract summary)
Step 2                     [QA]────────┐
                           [Edge Case]─┘  (both in background, parallel)
                                           ↓ (notifications arrive, you review)
Step 3  You review → blockers? → re-run Feature Lead (targeted fix)
                                           ↓ (clear)
Step 4  You: version bumps → commit → PR
```

---

## Part 6: Kickoff Prompts

Paste these into the Agent tool's `prompt` field. Replace `[FEATURE_LEAD_SUMMARY]` with what the Feature Lead agent returned.

### Feature Lead (v3.13.0)

```
You are implementing v3.13.0 Budget Limits & Alerts for FinChronicle.

GOAL: Deliver a complete, working feature. Return a structured summary of what you built.

IMPLEMENTATION PLAN:
1. Add `budgets` object store to IndexedDB in js/db.js
   Schema: { id, category, monthlyLimit, alertThreshold, rolloverEnabled, createdAt }
   Index: category
   DO NOT bump DB_VERSION — that will be done outside this agent after sign-off

2. Create js/budget.js
   - getBudgetForCategory(category)
   - getSpentForCategory(category, month) — queries transactions store
   - checkBudgetAlerts() — called from updateUI()
   - UI: modal to add/edit/delete budgets, budget list view

3. Update js/app.js — import js/budget.js, add event listeners

4. Update index.html — Budget section in Settings tab

5. Update css/styles.css — budget list, warning colors, threshold visual

6. Update css/dark-mode.css — dark mode for budget alerts

7. Update sw.js CACHE_URLS — add js/budget.js (DO NOT change CACHE_NAME)

CONSTRAINTS (non-negotiable):
- Zero npm packages — vanilla JS only
- All DB operations via js/db.js — never open IndexedDB directly
- Call updateUI() after every state mutation
- Use sanitizeHTML() before saving any user text input
- Use textContent not innerHTML for user-supplied content
- Error handling: all IndexedDB .catch() must call showMessage() with user-friendly message

MANUAL TESTS TO RUN before returning:
- Offline mode: add a budget, create a transaction, verify alert triggers
- Dark mode: toggle .dark-mode, verify budget UI colors are correct
- Mobile: viewport < 480px, form is usable

RETURN FORMAT:
1. Files changed (name + one-line summary of change)
2. DB schema design decisions and why
3. Manual test results (pass/fail per test)
4. Any open questions or risks you found
```

---

### QA & Constraint Validator (v3.13.0)

```
You are the QA & Constraint Validator for v3.13.0 Budget Limits in FinChronicle.

FEATURE LEAD SUMMARY:
[FEATURE_LEAD_SUMMARY]

GOAL: Review the implementation for correctness and constraint adherence.
Read the files listed in the Feature Lead summary. Do not make changes.

TEST CHECKLIST — verify each one:
- [ ] Works offline (review code path: does it use any fetch() or network calls?)
- [ ] No external API calls or CDN resources
- [ ] Data persists: budget store is in IndexedDB, not localStorage
- [ ] Dark mode: dark-mode.css has rules for all new budget UI classes
- [ ] Mobile responsive: no fixed pixel widths > 480px for budget modals/forms
- [ ] XSS: notes/category inputs — is sanitizeHTML() called before save? textContent used for display?
- [ ] All imports are from local js/ files (no npm, no CDN)
- [ ] All DB operations route through js/db.js functions
- [ ] updateUI() is called after every add/edit/delete budget action
- [ ] All IndexedDB errors caught with .catch() → showMessage()
- [ ] No console errors (review for any unhandled promise rejections)

RETURN FORMAT:
Overall: PASS | FAIL
For each checklist item: ✓ PASS or ✗ FAIL — [specific file:line if fail]
If FAIL: list exact issues Feature Lead must fix before release
```

---

### Edge Case Analyst (v3.13.0)

```
You are the Edge Case & Failure Scenario Analyst for v3.13.0 Budget Limits in FinChronicle.

FEATURE LEAD SUMMARY:
[FEATURE_LEAD_SUMMARY]

GOAL: Find failure modes before users do. Read the implementation files.
Produce 5–8 scenarios specific to the Budget Limits feature.

SCENARIOS TO INVESTIGATE (check all that apply):
1. User has 5000+ transactions — does getSpentForCategory() still perform?
2. IndexedDB quota at 90% — what happens when saving a new budget?
3. User deletes a budget while a transaction is mid-save to that category
4. Two tabs open: Tab 1 adds a budget, Tab 2 creates a transaction against it
5. User changes a category name — does the budget stay linked?
6. User creates a budget for a category with no transactions — zero-state handling?
7. rolloverEnabled toggled while month-end calculation is running
8. Budget alertThreshold = 0 or 100 — edge values handled?

For each scenario use this format:
Scenario: [name]
Failure mode: [what bad thing happens]
Mitigation: [what code change prevents it]
Test steps: [how to reproduce and verify the fix]
Classification: BLOCKER | NICE_TO_HAVE

RETURN FORMAT:
- Numbered list of scenarios
- Summary: total BLOCKERs found
- If 0 BLOCKERs: "CLEAR FOR RELEASE"
- If BLOCKERs exist: "BLOCKED — [count] issues must be fixed"
```

---

## Part 7: Rules & Constraints

1. **No npm packages.** If a helper is needed, write vanilla JS.
2. **All DB operations via `db.js`.** Never open IndexedDB directly in feature modules.
3. **All state mutations trigger `updateUI()`.** No exceptions.
4. **One DB_VERSION bump per release.** Two features that both need schema changes cannot ship together.
5. **Three version files must always match.** `APP_VERSION` in `state.js`, `CACHE_NAME` in `sw.js`, `version` in `manifest.json`.
6. **Offline-first non-negotiable.** Every feature must work without internet.
7. **XSS safety always.** `textContent` for display, `sanitizeHTML()` before save.
8. **No unhandled IndexedDB errors.** Every `.catch()` must call `showMessage()`.

---

## Part 8: Practical Tips for Using This Workflow

### Do this once to learn the pattern
Run the full v3.13.0 workflow manually. You'll see how each agent specializes and how findings chain together. After that, it becomes intuitive.

### Copy-paste agent outputs into a scratch file
Between phases, paste each agent's output into a temporary note. When you write the next agent's prompt, you already have the context ready to include.

### Trust the blockers, triage the nice-to-haves
Edge Case often finds theoretical issues. If something is NICE_TO_HAVE, log it in CHANGELOG as a known limitation and ship. Don't let perfect block good.

### You are the quality gate
Agents can miss things. You reviewing agent output before passing it forward is the most important step. An agent that returns "PASS" on QA doesn't mean you skip reading it.

### Don't over-agent
For a 3-line CSS fix or a typo, just edit directly. Multi-agent is for full feature releases where thoroughness matters.

---

## Part 9: Success Metrics

- Feature works offline, on mobile, in dark mode
- Zero XSS vulnerabilities
- All QA tests pass, no console errors
- Data persists across reloads and browser restarts
- One DB_VERSION bump per release, all three version files match
- No npm packages introduced
