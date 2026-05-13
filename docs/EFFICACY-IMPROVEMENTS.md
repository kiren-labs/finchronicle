# FinChronicle Efficacy Improvements — Draft

> Date: 2026-05-01  
> Last reviewed: 2026-05-13  
> Status: Partially actioned — see item-level status notes  
> Scope: Post-v3.28 improvements focused on speed, reliability, and daily UX

---

## Context

With 25 feature modules shipped (v3.10–v3.28), the app covers budgeting, savings, goals, alerts, multi-currency, settlement, reimbursement, auto-backup, and net worth trend. The next phase should focus on **efficacy** — making existing features faster, safer, and less friction-prone — rather than adding more surface area.

**Roadmap status (as of 2026-05-13):** Batch Operations is now v3.37.0 in the main roadmap. Keyboard Shortcuts, Undo Delete, Lazy Loading, Virtual Scrolling, and the remaining items below are not yet scheduled — they are candidates for efficacy sprints between roadmap releases.

---

## Priority 1 — High Impact

### 1.1 Undo Delete (Toast with Undo Button)

| Aspect | Detail |
|--------|--------|
| Problem | Accidental transaction delete is unrecoverable — biggest user-error risk |
| Solution | 5-second toast with "Undo" button; soft-delete first, hard-delete after timeout |
| Complexity | Low — ~50 lines in `ui.js` |
| Module | `js/ui.js` (delete flow) |

### 1.2 Lazy Module Loading

| Aspect | Detail |
|--------|--------|
| Problem | All ~230KB of JS parses on first load; heavy modules like `alerts.js`, `annual-report.js`, `goals.js`, `savings.js` are rarely needed on initial screen |
| Solution | Dynamic `import()` these modules on first tab visit (same pattern as `faq.js` and `import-export.js`) |
| Complexity | Medium — refactor `app.js` imports and ensure `updateUI()` still works when modules haven't loaded |
| Impact | ~40% faster first paint on low-end devices |

### 1.3 Automated Smoke Tests

| Aspect | Detail |
|--------|--------|
| Problem | 100% manual testing; regressions slip in across 16 modules with no safety net |
| Solution | `scripts/test.js` using Puppeteer — add transaction, verify persistence, test offline mode, dark mode toggle |
| Complexity | Medium — one-time setup, then each module gets a basic test |
| Impact | Protects 26 versions of accumulated work from silent breakage |

### 1.4 Virtual Scrolling / Windowed List

| Aspect | Detail |
|--------|--------|
| Problem | After 6+ months (~500+ transactions), full DOM render of transaction list becomes sluggish |
| Solution | Render only visible rows + buffer; recycle DOM nodes on scroll |
| Complexity | Medium-High — custom implementation (no libs allowed) |
| Impact | Smooth scrolling at any data volume; reduced memory |

### 1.5 IndexedDB Cursor Pagination

| Aspect | Detail |
|--------|--------|
| Problem | `getAll()` loads entire transaction store into memory, then filters in JS |
| Solution | Use IDB key ranges and cursors for paginated reads; only fetch visible page |
| Complexity | Medium — refactor `db.js` query functions |
| Impact | Lower memory on phones with 1000+ transactions |

---

## Priority 2 — Medium Impact Polish

### 2.1 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Open new transaction form |
| `Esc` | Close any open modal |
| `Cmd/Ctrl+S` | Save current form |
| `Cmd/Ctrl+Z` | Undo last delete (if within timeout) |
| `1–5` | Switch tabs |

Implementation: Single `keydown` listener in `app.js` with a shortcut map.

### 2.2 Form Memory

- Remember last-used category, payment method, and account per transaction type
- Store in `localStorage` (small settings data, consistent with existing pattern)
- Pre-fill on next form open; user can override

### 2.3 Batch Operations *(→ scheduled as v3.37.0 in main roadmap)*

- Multi-select mode in transaction list (long-press or checkbox toggle)
- Actions: bulk delete, bulk re-categorize, bulk tag
- Confirmation modal for destructive actions

### 2.4 Offline Status Indicator

- Subtle banner/dot when `navigator.onLine === false`
- Auto-dismiss when connection returns
- Reassures users the app is still functional

### 2.5 Share API for Backups (Mobile)

- On mobile PWA, file downloads are awkward
- Use `navigator.share()` with backup file as attachment
- Fallback to download on desktop

---

## Priority 3 — Architecture Quality

### 3.1 Error Boundary / Diagnostics Panel

| Aspect | Detail |
|--------|--------|
| Problem | Users report "it broke" with no reproducible details |
| Solution | Global `window.onerror` + `unhandledrejection` handler; log last 50 errors to a hidden diagnostics panel in Settings |
| Access | Long-press version number in Settings to reveal |

### 3.2 State Change Events (Pub/Sub)

| Aspect | Detail |
|--------|--------|
| Problem | Manual `updateUI()` calls after every state change — easy to miss one |
| Solution | Lightweight event bus; state mutations emit events; UI modules subscribe to relevant keys |
| Constraint | Must remain zero-dependency; ~30 lines of vanilla JS |

### 3.3 DB Migration Safety

| Aspect | Detail |
|--------|--------|
| Problem | `onupgradeneeded` is one-way — a failed migration at DB_VERSION 10+ could destroy data |
| Solution | Auto-export full JSON backup before any upgrade runs; store in a temporary IDB store or blob URL |
| Trigger | Runs once per version bump, before `onupgradeneeded` logic executes |

### 3.4 Accessibility Audit

- ARIA labels on all interactive widgets (especially custom selects, modals, chart)
- Focus trap in modals (Tab/Shift+Tab stays within)
- `prefers-reduced-motion` media query to disable transitions
- Screen reader announcements for toast messages (`role="alert"`)

---

## Implementation Order (Suggested)

| Phase | Items | Est. Effort |
|-------|-------|-------------|
| Phase A | 1.1 Undo Delete, 2.1 Keyboard Shortcuts, 2.4 Offline Indicator | Small |
| Phase B | 1.2 Lazy Loading, 2.2 Form Memory, 3.1 Error Boundary | Medium |
| Phase C | 1.3 Smoke Tests, 3.2 Pub/Sub, 3.3 DB Migration Safety | Medium |
| Phase D | 1.4 Virtual Scrolling, 1.5 IDB Pagination, 2.3 Batch Ops | Large |
| Phase E | 3.4 Accessibility Audit, 2.5 Share API | Medium |

---

## Constraints (Unchanged)

- Zero npm dependencies
- No external network calls
- Offline-first — every improvement must work without internet
- Privacy-first — no telemetry, no cloud sync
- IndexedDB for data; localStorage for small settings only

---

## Decision Needed

- [ ] Which phase to start with?
- [ ] Should undo delete cover edits too, or just deletes?
- [ ] Smoke tests: Puppeteer (requires Node), or in-browser test harness?
- [ ] Virtual scrolling threshold: 100 transactions? 200?
