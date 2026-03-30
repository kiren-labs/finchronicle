# Remix Icon Removal - Phase 1 Audit

Date: 2026-03-28
Scope: runtime UI files (index.html, js/, css/) plus docs/legal references

## 1) Inventory Summary

Runtime icon references:
- Total ri-* references: 124
- Unique icon classes: 67

Runtime usage by file:
- index.html: 60
- js/ui.js: 16
- js/settings.js: 13
- js/recurring.js: 11
- js/faq.js: 8
- js/budget.js: 8
- js/chart.js: 4
- css/styles.css: 2
- js/currency.js: 1
- js/app.js: 1

Dependency entry points:
- CDN stylesheet import in index.html (line 21)
- Preconnect/prefetch for jsdelivr in index.html (lines 19-20)

## 2) UX Criticality Classification

### A) Critical functional (must preserve in Phase 2)

These are used for interaction affordance, state changes, or action confirmation.

1. Icon-only controls in index.html
- Close buttons in modals: lines 55, 101, 150, 228
- Header actions (feedback, quick add): lines 293, 296
- Summary collapse control: line 342
- Search clear button: line 499
- Pagination controls: lines 515, 521
- Settings toolbar action buttons: lines 573, 577, 583, 587, 593, 598, 607, 612

2. Dynamic runtime icon switching in JS
- js/settings.js line 19: dark mode toggle icon switches between sun/moon
- js/settings.js line 34: dark mode startup icon assignment
- js/faq.js lines 147, 151: FAQ expand/collapse icon switches add/subtract
- js/ui.js lines 121, 130: trend direction icons rendered from live data
- js/app.js line 732: submit success icon rendered at save completion

3. Action/status icons generated in templates
- js/ui.js lines 210, 225, 226: transaction type/action icons in list rows
- js/recurring.js lines 189, 401, 416: play/pause and modal title action cues
- js/budget.js line 403: alert severity icon in budget state

Risk if removed without replacement:
- Interaction discoverability drops significantly
- Icon-only buttons appear empty or visually broken
- State feedback (success, warning, trend direction) becomes weaker

### B) Medium importance (text + icon, still user-facing)

These have text labels but rely on icons for scan speed and hierarchy.

- Top tabs and bottom nav in index.html (lines 418-425, 664-681)
- Type toggles for expense/income in index.html (lines 158-164, 436-442)
- Modal titles and report stat rows in index.html (lines 54, 80, 100, 108, 115, 122, 129)
- Recurring section cards and list actions in js/recurring.js
- Settings backup status cards in js/settings.js lines 254, 273, 277

Risk if removed without replacement:
- UX still usable, but readability and scannability decline
- Financial direction cues (income vs expense, warning vs success) become less obvious

### C) Decorative/brand-supporting

- Logo/title icon in index.html line 289
- Some chart/section header icons in js/chart.js and js/ui.js
- Minor visual badges where text is already explicit

Risk if removed without replacement:
- Lower visual polish and weaker information scent, but no functional break

## 3) Dynamic Pattern Map (important for migration)

Patterns to replace in Phase 2:

1. className reassignment
- settings.js: icon.className = isDark ? "ri-sun-line" : "ri-moon-line"
- faq.js: icon.className swaps add/subtract states

2. innerHTML insertion containing <i class="ri-...">
- app.js save success button icon
- ui.js trend indicators and tag chip close button
- recurring.js modal title icon

3. Template-string generated icon tags
- ui.js transaction list
- currency.js selected currency checkmark
- recurring.js recurring list/actions
- budget.js action and status icons

4. CSS coupled to Remix icon class names
- styles.css lines 865 and 869 target .ri-arrow-up-circle-line and .ri-arrow-down-circle-line

## 4) Docs and Legal Files to Update After Migration

References found:
- NOTICE (dependency and attribution text)
- README.md
- CHANGELOG.md
- ARCHITECTURE.md
- docs/ARCHITECTURE-IMPROVEMENTS.md
- docs/DoubleEntry/DOUBLE-ENTRY-IMPLEMENTATION-ROADMAP.md

## 5) Recommended Phase 2 Migration Order (low risk)

1. Introduce replacement mechanism first
- Create a local icon system (preferred: inline SVG sprite + helper)
- Keep semantic labels and aria-label behavior unchanged

2. Migrate critical icon-only controls in index.html
- Close buttons, header actions, search clear, pagination, toolbar actions
- Verify keyboard and screen-reader behavior

3. Migrate dynamic JS icon logic
- settings.js dark mode switch
- faq.js expand/collapse toggles
- ui.js trend/action icons and app.js save success icon

4. Migrate medium-priority text+icon surfaces
- tabs/nav/type toggles/modals/reports/recurring cards

5. Remove Remix Icon dependency
- Remove CDN and jsdelivr preconnect lines from index.html
- Update service worker cache only if new local icon assets are introduced

6. Final cleanup
- Remove icon-class-specific CSS coupling
- Update NOTICE and docs/legal references
- Run manual regression checks: mobile, dark mode, offline, recurring flows, import/export, reports

## 6) Effort Estimate (execution-focused)

- Phase 2 and 3 combined, done safely with full UI parity: 2 to 4 days
- Fast cutover with acceptable but visible UX simplification: 1 to 2 days
- Removing icons with no replacement: fast, but high UX regression risk (not recommended)
