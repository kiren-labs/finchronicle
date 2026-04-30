# Version Management Guide

## Current Version: 3.21.0

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
export const APP_VERSION = '3.21.0';
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
export const APP_VERSION = '3.21.0';

// sw.js
const CACHE_NAME = 'finchronicle-v3.21.0';
```

```json
// manifest.json
"version": "3.21.0"
```

### Step 2: Update Service Worker Cache URLs

If new JS modules were added, add them to `CACHE_URLS` array in `sw.js`.

### Step 3: Document Changes

Add entry to `CHANGELOG.md`.

### Step 4: Commit and Deploy

```bash
git add -A
git commit -m "Release v3.21.0: [Brief description]"
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

## Changelog

### v3.0.0 (2025-01-14) 🎉

**Major Features:**
- ✨ Multi-currency support (20 currencies)
- 🎛️ Toggle button for Income/Expense selection
- 📊 Dynamic category filtering based on type
- 🔢 Version display in header
- 🔔 Automatic update notifications
- 🔄 Service worker update detection

**Improvements:**
- Better mobile UX with toggle buttons
- Currency selector modal with beautiful UI
- Dark mode support for all new features
- Persistent currency selection

**Technical:**
- Semantic versioning implementation
- Version check on app load
- localStorage version tracking
- Service worker cache v3

---

### v2.0.0 (Previous Release)

**Features:**
- ✏️ Edit transactions
- 🗑️ Delete transactions with confirmation
- 🔍 Filter by category
- 📥 Export to CSV
- 🌙 Dark mode
- ♿ WCAG AA accessibility compliance

**Bug Fixes:**
- Fixed color contrast issues
- Fixed form label associations
- Fixed service worker registration

---

### v1.0.0 (Initial Release)

**Features:**
- 💰 Add income/expense transactions
- 📊 Monthly summary view
- 📱 PWA installable on mobile
- 💾 Offline-first with localStorage
- 🎨 Beautiful iOS-style design

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
**Next Release**: v3.1.0 (Planned features TBD)
**Last Updated**: 2025-01-14
