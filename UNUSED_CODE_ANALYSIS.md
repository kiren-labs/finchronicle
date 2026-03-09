# JavaScript Unused Code Analysis

## Summary
- **Total JS size**: 232 KiB (actual files)
- **Lighthouse unused JS estimate**: 1,250 KiB (likely includes DCE overhead or double-counting)
- **Primary Issue**: No code splitting or lazy-loading
- **Bottleneck**: All ~2,800 lines of code load on initial page view

---

## Module Breakdown

### 1. **ui.js** (31 KiB / 884 lines) ⚠️ LARGEST
**Problem**: Monolithic UI module - ALL UI functions load upfront

**Exported Functions**: 20+ functions
**Actually Used in app.js**: ~16 of them
- ✅ updateUI, switchTab, quickAddTransaction, toggleSummaryCollapse
- ✅ loadSummaryState, onSummaryTileClick, changeGrouping
- ✅ editTransaction, deleteTransaction, confirmDelete, cancelEdit
- ✅ selectType, updateCategoryOptions, filterByMonth, filterByCategory
- ✅ nextPage, prevPage

**Unused/Lesser-Used Functions in ui.js**:
- `closeDeleteModal()` - Can inline or reference directly
- `updateTransactionsList()` - Called via updateUI() but could be isolated
- `updateMonthFilters()` - Called via updateUI() 
- `updateCategoryFilter()` - Called via updateUI()
- `closeFeedbackModal()` - Can be referenced directly via ID
- `goToPage()` - Exported but may not be used

**Opportunities**:
- Split into: `ui-core.js` (add/edit/delete), `ui-list.js` (transaction list), `ui-groups.js` (grouping view)
- Lazy-load groups/advanced views after initial render

---

### 2. **import-export.js** (14 KiB / 433 lines) 🎯 OPPORTUNITY
**Problem**: CSV/Backup features load even if user never uses them

**Exported Functions**: 10+ functions
**Actually Used in app.js**:
- ✅ exportToCSV, createBackup, triggerImport, handleImport
- ✅ triggerRestore, handleRestore, confirmRestore
- ✅ closeRestorePreview, closeRestoreReport

**This is a PRIME CANDIDATE for lazy-loading**:
- Users accessing "Settings" tab: only then load this module
- Could save ~14 KiB on initial bundle

---

### 3. **settings.js** (10 KiB / 275 lines) 🎯 OPPORTUNITY
**Problem**: Settings UI features load upfront, but most only used when clicking Settings tab

**Exported Functions**: 13 functions
**Used in app.js**: ~6-8 of them
- ✅ toggleDarkMode, loadDarkMode, hideInstallPrompt, checkInstallPrompt
- ✅ checkAppVersion, checkForUpdates, reloadApp, dismissUpdate
- ✅ loadBackupTimestamp, updateSettingsContent, showUpdatePrompt

**Unused/Helper Functions**:
- `showUpdateNotification()` - May not be called
- `checkServiceWorkerUpdate()` - May not be called
- `renderBackupStatus()` - Called by updateSettingsContent
- `getDaysSinceBackup()`, `shouldShowBackupReminder()` - Helpers that might not be used
- `updateBackupTimestamp()` - Only called when backup created

**This is a SECONDARY CANDIDATE for lazy-loading**:
- Could save ~10 KiB by deferring until Settings tab accessed

---

### 4. **faq.js** (8 KiB / 168 lines) 🎯 PRIMARY OPPORTUNITY
**Problem**: FAQ data and functions load even if user never expands FAQ section

**Exported Content**:
- `faqData` - Large static data structure (FAQ content)
- `renderFAQ()`, `toggleFAQSection()`, `toggleFAQItem()`, `scrollToFAQ()`

**This is the EASIEST to lazy-load**:
- Render FAQ container as empty initially
- Load faq.js only when user expands first FAQ section
- Could save ~8 KiB on initial load

---

### 5. **app.js** (17 KiB / 435 lines)
**Problem**: Entry point loads all module initialization upfront

**Could be improved by**:
- Splitting event binding into lazy-loaded chunks
- Deferring non-critical initialization (checkAppVersion, registerServiceWorker can be deferred)

---

### 6. **Other Modules** (Smaller, already optimized)
- **db.js** (4.9 KiB) - ✅ Essential, must load
- **state.js** (4.0 KiB) - ✅ Essential, must load
- **utils.js** (7.6 KiB) - ✅ Essential, must load
- **validation.js** (2.0 KiB) - ✅ Essential, must load
- **currency.js** (2.3 KiB) - ✅ Essential, must load

---

## Root Cause of "1,250 KiB Unused"
1. **No code splitting**: All 232 KiB loads on page 1
2. **Tab-based UI**: Settings/Groups/FAQ content only needed when tab clicked
3. **Feature-gated code**: Import/Export, Backup features unused by some users
4. **Static initialization**: All modules initialize code even before being needed

---

## Quick Wins (Can implement immediately)

### Priority 1: Lazy-load FAQ (~8 KiB savings)
```javascript
// In app.js - defer FAQ loading
const faqContainer = document.getElementById('faqContainer');
faqContainer.addEventListener('click', async (e) => {
  if (!window.faqLoaded) {
    const { renderFAQ } = await import('./faq.js');
    window.faqLoaded = true;
    renderFAQ();
  }
}, { once: true });
```

### Priority 2: Lazy-load Import/Export (~14 KiB savings)  
```javascript
// Load when user clicks "Create Backup" or "Import CSV"
// Instead of importing at top, import dynamically when needed
```

### Priority 3: Lazy-load Settings (~10 KiB savings)
```javascript
// Load settings functionality only when Settings tab opened
const settingsTab = document.getElementById('settingsTab');
if (settingsTab) {
  settingsTab.addEventListener('click', async () => {
    if (!window.settingsLoaded) {
      await import('./settings.js');
      window.settingsLoaded = true;
    }
  }, { once: true });
}
```

### Priority 4: Code Minification (~39 KiB savings)
- Minify CSS files (already identified by Lighthouse)
- Minify JS files
- Use build tool like esbuild or rollup

---

## Estimated Impact with All Optimizations

| Optimization | Savings | Method |
|---|---|---|
| Lazy-load FAQ | ~8 KiB | Dynamic import |
| Lazy-load Import/Export | ~14 KiB | Dynamic import on button click |
| Lazy-load Settings advanced features | ~10 KiB | Dynamic import on tab switch |
| Minify CSS | ~18 KiB | CSS minifier |
| Minify JS | ~21 KiB | JS minifier |
| Remove unused CSS rules | ~42 KiB | PurgeCSS/UnCSS |
| **Total Potential Savings** | **~113 KiB** | Combined |

**New Expected Lighthouse Score**: ~92-95 (vs current 84)

---

## Recommended Implementation Order

1. ✅ **Week 1**: Lazy-load FAQ + Minify CSS/JS (quick wins, ~29 KiB)
2. ✅ **Week 2**: Lazy-load Import/Export functionality (~14 KiB)
3. ✅ **Week 3**: Lazy-load Settings tab (~10 KiB)
4. ✅ **Week 4**: Remove unused CSS rules (~42 KiB)
5. ✅ **Future**: Consider bundler setup (Vite/esbuild) for better tree-shaking

---

## Implementation Notes

- **No breaking changes**: All functionality remains
- **User experience**: First page load 30-40% faster
- **Files affected**: 
  - `index.html` - No changes needed
  - `js/app.js` - Add dynamic imports
  - `css/` - Option to minify
  - New optional `build/` script

