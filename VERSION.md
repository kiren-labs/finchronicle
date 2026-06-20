# Version Management Guide

## Current Version: 4.1.0

**Last Updated:** 2026-05-23

## How Versioning Works

FinChronicle uses **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0): Breaking changes, major redesign
- **MINOR** (0.X.0): New features, no breaking changes
- **PATCH** (0.0.X): Bug fixes, minor improvements

## Version Display

The app version is always visible in the header next to the app name. This helps users verify they're running the latest version.

## Update Notification System

### Automatic Update Detection

1. **Version Check on Load**: App compares stored version with current version
2. **Service Worker Updates**: Detects when new service worker is available
3. **Update Prompt**: Beautiful green banner appears when update is available
4. **One-Click Update**: Users can reload with "Update Now" button

### How It Works

```javascript
// In js/state.js:
export const APP_VERSION = "3.28.0";
```

When users load the app:

- App reads version from localStorage
- Compares with `APP_VERSION` constant
- If different → Shows update notification
- Automatically updates stored version

## Release Process

### Step 1: Update Version Number in Three Places

```javascript
// js/state.js
export const APP_VERSION = "3.28.0";

// sw.js
const CACHE_NAME = "finchronicle-v3.28.0";
```

```json
// manifest.json
"version": "3.28.0"
```

### Step 2: Update Service Worker Cache URLs

If new JS modules were added, add them to `CACHE_URLS` array in `sw.js`.

### Step 3: Document Changes

Add entry to `CHANGELOG.md`.

### Step 4: Commit and Deploy

```bash
git add -A
git commit -m "Release v3.28.0: [Brief description]"
git push origin main
```

### Step 5: Verify Deployment

1. Visit: https://kiren-labs.github.io/finchronicle/
2. Check version number in header
3. Test new features

### Step 6: Update Mobile Users

Mobile users will be notified automatically:

1. Open the installed PWA
2. Pull down to refresh
3. Update notification appears
4. Tap "Update Now" to reload

## Recent Release History

| Version | Date       | Highlights                                                                                             |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| v4.1.0  | 2026-05-23 | Cash-Flow Forecast (30/60/90d), Financial Health Alerts (inactivity, bill-due, savings trend, pace)    |
| v4.0.0  | 2026-05-23 | Accounting Model — asset/liability classification, account linking, reconciliation, category hierarchy |
| v3.29.0 | 2026-05-23 | Engineering hardening — CSP, UUID IDs, storage persist, error log                                      |
| v3.28.0 | 2026-05-05 | Net Worth Trend — monthly snapshot store (DB_VERSION 10), SVG line chart                               |
| v3.27.0 | 2026-05-05 | Reimbursement Workflow — mark-as-settled, settlement dashboard breakdown                               |
| v3.26.1 | 2026-05-05 | Exchange rate validation fix, error toasts, CLAUDE.md update                                           |
| v3.26.0 | 2026-05-05 | Family Expense Settlement — per-person balance from `attachedTo` tags                                  |
| v3.24.0 | 2026-05-05 | Multi-Currency Transactions — per-transaction FX + exchange rate history                               |
| v3.22.0 | 2026-05-05 | Auto-Backup — AES-GCM-256 encryption, storage health dashboard                                         |
| v3.21.0 | 2026-05-01 | Smart Spending Alerts (4 types), Annual Report with YoY comparison                                     |
| v3.20.0 | 2026-05-01 | Savings Goals with circular progress, milestones, deadlines                                            |
| v3.19.0 | 2026-05-01 | Savings Rate Dashboard — this-month, 3-month trend, annual projection                                  |
| v3.18.0 | 2026-04-30 | Accounts & Net Worth — first-class accounts, derived balances, net worth dashboard                     |
| v3.17.0 | 2026-05-01 | Quick Entry Templates — one-tap pre-fill, Clone Last, template manager                                 |
| v3.16.0 | 2026-04-30 | Optional Fields System — 6 optional fields, smart category suggestions                                 |
| v3.15.0 | 2026-04-30 | Transfer Transaction Type — eliminates double-counting, audit trail, soft delete                       |
| v3.14.0 | —          | Tags & full-text search                                                                                |
| v3.13.0 | 2026-03-26 | Budget Limits & Alerts per category                                                                    |
| v3.12.0 | 2026-03-24 | Complete Reports suite (bar chart, weekly, heatmap, range selector)                                    |
| v3.11.0 | 2026-03-24 | Recurring Transactions                                                                                 |
| v3.10.5 | 2026-03-20 | Category Pie Chart, WCAG AA fixes                                                                      |
| v3.10.4 | 2026-03-09 | ES Module refactoring (21 modules)                                                                     |

See [CHANGELOG.md](CHANGELOG.md) for full details on every release.

---

## Version Strategy

### When to Bump MAJOR (X.0.0)

- Complete redesign
- Breaking changes to data structure
- Major feature overhaul
- Requires data migration

Example: v4.0.0 - Complete UI redesign

### When to Bump MINOR (0.X.0)

- New features added
- Existing features enhanced
- No breaking changes
- Backward compatible

Example: v3.1.0 - Add budget tracking feature

### When to Bump PATCH (0.0.X)

- Bug fixes
- Small UI improvements
- Performance optimizations
- No new features

Example: v3.0.1 - Fix currency display bug

## Testing Checklist

Before releasing a new version:

- [ ] Update `APP_VERSION` in `js/state.js`
- [ ] Update `CACHE_NAME` in `sw.js`
- [ ] Update `version` in `manifest.json`
- [ ] Add new JS files to `CACHE_URLS` in `sw.js` (if any)
- [ ] Test on desktop browser
- [ ] Test on mobile browser
- [ ] Test dark mode
- [ ] Test offline mode (DevTools → Network → Offline)
- [ ] Verify IndexedDB persistence (reload and verify data)
- [ ] Update `CHANGELOG.md`
- [ ] Commit and push
- [ ] Verify deployed version
- [ ] Test update notification on existing install

## User Communication

### In-App Notification

Users see automatic update notification with:

- Green banner at top
- "Update Available!" message
- Version numbers (old → new)
- "Update Now" button
- Auto-dismiss after 10 seconds

### Update Message Template

```
🎉 Updated from v2.0.0 to v3.0.0! Check out the new features.
```

## Troubleshooting

### Users Not Seeing Updates

1. **Clear service worker**: Users may need to refresh twice
2. **Check GitHub Pages**: Verify latest version deployed
3. **Cache issue**: Users can reinstall PWA
4. **Browser cache**: Hard refresh (Ctrl+Shift+R)

### Version Mismatch

If users report wrong version:

1. Check `localStorage` has correct version
2. Verify service worker is latest
3. Try clearing cache and reinstalling

## Future Improvements

- [ ] In-app changelog viewer
- [ ] "What's New" modal on update
- [ ] Version comparison API
- [ ] Rollback capability
- [ ] Beta testing channel
- [ ] Automatic version bump script

---

**Current Status**: Production Ready ✅
**Latest Release**: v4.1.0 — Cash-Flow Forecast + Financial Health Alerts
**Roadmap**: v4.2 — Budget vs Actual Report, Envelope Budgeting mode, Subscription Tracker
**Last Updated**: 2026-05-23
