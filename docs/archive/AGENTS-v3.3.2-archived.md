# AGENTS.md

## 1. Project Context

This is **FinChronicle** - a **Progressive Web App (PWA)** for personal finance tracking.

* **Architecture:** Monolithic offline-first PWA
* **Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES6+) - **No frameworks, no build tools**
* **Philosophy:** Privacy-first, offline-first, zero dependencies (except UI icons)
* **Storage:** Client-side only using browser localStorage API
* **Deployment:** GitHub Pages (static file hosting)

## 2. Technology Stack (Exact Versions)

* **HTML5:** Single-page application structure
* **CSS3:** Modular stylesheets with responsive design
* **JavaScript:** ES6+ (embedded in index.html, ~1150 lines)
* **Icons:** Remix Icon v4.0.0 (CDN-based: https://cdn.jsdelivr.net/npm/remixicon@4.0.0)
* **Service Worker:** Custom offline caching (sw.js)
* **Current Version:** 3.3.2

### Core Dependencies
* **Zero npm packages**
* **Zero frameworks** (No React, Vue, Angular)
* **Zero build tools** (No Webpack, Vite, Parcel)
* **One CDN Dependency:** Remix Icon Font for UI icons

## 3. High-Level Architecture

### File Structure (Monolithic PWA)

```
finchronicle/
├── index.html              # Main app (1400 lines: HTML + embedded JavaScript)
├── css/
│   ├── styles.css         # Main styles (1093 lines)
│   └── dark-mode.css      # Dark theme overrides (205 lines)
├── sw.js                   # Service Worker for offline caching
├── manifest.json           # PWA manifest configuration
├── icons/                  # PWA icons (192x192, 512x512, SVG, maskable)
├── robots.txt              # SEO configuration
└── [documentation files]   # README, CHANGELOG, etc.
```

### Application Architecture

**Single-Page Application (SPA) with Tab-Based Navigation:**

```
┌─────────────────────────────────────────────┐
│           Header + Summary Cards            │
├─────────────────────────────────────────────┤
│  [Add]  [List]  [Groups]  [Settings]       │  ← Tabs
├─────────────────────────────────────────────┤
│                                             │
│  Tab Content (dynamically shown/hidden)     │
│  - Add: Transaction form                    │
│  - List: Filtered transaction list          │
│  - Groups: Analytics (month/category)       │
│  - Settings: Import/Export, Currency, Dark  │
│                                             │
└─────────────────────────────────────────────┘
```

## 4. Core Components & Responsibilities

### A. Data Layer (localStorage-based)

**Primary Data Structure:**
```javascript
transactions = [
  {
    id: number,              // Date.now() timestamp
    type: 'expense' | 'income',
    amount: number,
    category: string,
    date: 'YYYY-MM-DD',
    notes: string,
    createdAt: ISO timestamp
  }
]
```

**Storage Keys:**
* `transactions` - Array of all transactions (JSON string)
* `currency` - Current currency code (default: 'INR')
* `darkMode` - Theme preference ('enabled' | 'disabled')
* `app_version` - Last seen app version (for update detection)
* `installPromptHidden` - iOS install prompt visibility

**Key Functions:**
* `loadData()` - Load transactions from localStorage (line 426)
* `saveData()` - Persist transactions to localStorage (line 437)

### B. UI Components (Embedded in index.html)

#### 1. Header & Summary Cards (lines 44-91)
* **Purpose:** Display app branding, version, offline status
* **Summary Cards:** Monthly net, total entries, income, expenses
* **Update Function:** `updateSummary()` (line 507)

#### 2. Tab Navigation System (lines 107-116)
* **Tabs:** Add, List, Groups, Settings
* **Function:** `switchTab(tab)` (line 782)
* **Pattern:** Hide/show `.tab-content` divs with `.active` class

#### 3. Add/Edit Transaction Form (lines 119-168)
* **Type Toggle:** Expense/Income buttons
* **Dynamic Categories:** Categories change based on transaction type
* **Functions:**
  * `selectType(type)` (line 391) - Toggle transaction type
  * `updateCategoryOptions(type)` (line 407) - Populate category dropdown
  * `editTransaction(id)` (line 812) - Load transaction for editing
  * `cancelEdit()` (line 843) - Reset form to add mode

#### 4. Transaction List with Pagination (lines 171-196)
* **Features:** Month filter, category filter, pagination (20 items/page)
* **Functions:**
  * `updateTransactionsList()` (line 529) - Render paginated list
  * `filterByMonth(month)` (line 642) - Apply month filter
  * `filterByCategory()` (line 664) - Apply category filter
  * `nextPage()` / `prevPage()` (lines 616-626) - Pagination controls

#### 5. Grouped Analytics View (lines 199-205)
* **Groupings:** By Month or By Category
* **Functions:**
  * `groupByMonth()` (line 694) - Income/expense breakdown per month
  * `groupByCategory()` (line 743) - Total spending per category
  * `changeGrouping(type)` (line 799) - Toggle grouping mode

#### 6. Settings Panel (lines 208-244)
* **Features:** Export CSV, Import CSV, Check Updates, Currency Selector, Dark Mode
* **Functions:**
  * `exportToCSV()` (line 881) - Generate CSV download
  * `importFromCSV(text)` (line 940) - Parse and import CSV data
  * `toggleCurrencySelector()` (line 357) - Show currency modal
  * `toggleDarkMode()` (line 1148) - Toggle dark theme

### C. Service Worker (sw.js)

**Purpose:** Enable offline functionality and auto-updates

**Cache Strategy:** Cache-first (offline-first)
```javascript
CACHE_NAME = 'finchronicle-v3.3.2'  // Version-based cache
```

**Lifecycle:**
1. **Install:** Pre-cache all critical files (HTML, CSS, icons, manifest)
2. **Fetch:** Return cached files first, fallback to network
3. **Activate:** Clean up old cache versions, notify app of updates

**Update Detection:**
* Service worker checks for updates every 60 seconds (line 1372)
* App shows "Update Available" banner when new version detected
* User clicks "Update Now" → Force reload with new service worker

## 5. Coding Rules & Patterns

### A. Naming Conventions

* **Functions:** camelCase (e.g., `updateUI()`, `formatCurrency()`)
* **Variables:** camelCase (e.g., `currentTab`, `transactions`, `editingId`)
* **Constants:** UPPER_SNAKE_CASE (e.g., `APP_VERSION`, `VERSION_KEY`)
* **CSS Classes:** kebab-case (e.g., `.transaction-item`, `.primary-btn`)
* **IDs:** camelCase (e.g., `#transactionsList`, `#monthFilters`)

### B. State Management (Global Variables)

**Runtime State (in-memory):**
```javascript
let transactions = [];        // Main data array
let currentTab = 'add';        // Active tab
let currentGrouping = 'month'; // Analytics grouping mode
let selectedMonth = 'all';     // Month filter value
let selectedCategory = 'all';  // Category filter value
let editingId = null;          // ID of transaction being edited
let deleteId = null;           // ID pending deletion
let currentPage = 1;           // Pagination current page
const itemsPerPage = 20;       // Fixed pagination size
let updateAvailable = false;   // SW update flag
```

**Persistence Strategy:**
* **All state changes → `updateUI()`** (master refresh function at line 498)
* **Data changes → `saveData()`** then `updateUI()`
* **Dark mode → localStorage immediately**
* **Currency → localStorage + `updateUI()`**

### C. Form Handling Pattern

**Submission Flow:**
1. Prevent default form submission (`e.preventDefault()`)
2. Collect form data into transaction object
3. If `editingId` exists → update existing, else → add new
4. Call `saveData()` to persist
5. Call `updateUI()` to refresh all views
6. Show success message (`showMessage()`)
7. Reset form state

**Example (line 448):**
```javascript
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const transaction = { /* ... collect data ... */ };

    if (editingId) {
        // Update existing
        transactions[index] = transaction;
    } else {
        // Add new
        transactions.unshift(transaction);
    }

    saveData();
    updateUI();
    showMessage('Transaction saved!');
});
```

### D. Modal Pattern

**Structure:**
* Modal div with `.modal` class (hidden by default)
* `.modal-content` for inner content
* JavaScript toggles `.show` class or `display: flex`

**Functions:**
* Open: `document.getElementById('modalId').classList.add('show')`
* Close: `document.getElementById('modalId').classList.remove('show')`

**Used For:**
* Delete confirmation (line 32)
* Currency selector (line 93)
* Update notifications (line 57)

### E. Category System (Dynamic)

**Categories Definition (lines 267-296):**
```javascript
const categories = {
    income: [
        'Salary', 'Business', 'Investment', 'Rental Income',
        'Gifts/Refunds', 'Freelance', 'Bonus', 'Other Income'
    ],
    expense: [
        'Food', 'Groceries', 'Transport', 'Utilities/Bills',
        'Kids/School', 'Fees/Docs', 'Debt/Loans', 'Household',
        'Other Expense', 'Rent', 'Healthcare', 'Personal/Shopping',
        'Insurance/Taxes', 'Savings/Investments', 'Charity/Gifts',
        'Misc/Buffer'
    ]
};
```

**Pattern:**
* Category dropdown updates when transaction type changes
* During import, smart category detection maps keywords to categories
* `normalizeImportedCategory()` function (line 1035) performs fuzzy matching

### F. CSV Import/Export

**Export Pattern (line 881):**
1. Check if transactions exist
2. Build CSV header with currency code
3. Map transactions to rows
4. Quote all cells (handle embedded quotes with `""`)
5. Create Blob → Trigger download

**Import Pattern (line 940):**
1. Parse CSV with custom parser (handles quoted fields, line 1106)
2. Find column indices using regex patterns (flexible headers)
3. Normalize dates (supports multiple formats: YYYY-MM-DD, DD/MM/YYYY, DD-MMM)
4. Detect categories from notes using keyword mapping
5. Assign unique IDs based on timestamp
6. Merge with existing transactions (no duplicate detection)
7. Save and refresh UI

**Smart Category Detection:**
* Keywords in notes field → automatic category assignment
* Example: "KFC" or "lunch" → 'Food' category
* Example: "grocery" or "bigc" → 'Groceries' category

### G. Currency Support

**20 Supported Currencies (lines 299-320):**
* Americas: USD, CAD
* Europe: EUR, GBP, CHF
* Asia: INR, JPY, CNY, THB, SGD, HKD, KRW, MYR, PHP, IDR, VND
* Middle East: AED, SAR
* Oceania: AUD, NZD

**Pattern:**
* Currency stored as code ('INR', 'USD', etc.)
* `getCurrencySymbol()` returns symbol from `currencies` object
* `formatCurrency(amount)` prepends symbol to formatted number
* Currency modal shows all options with checkmark on active

## 6. Styling Architecture

### CSS Organization

**styles.css (1093 lines):**
* Base styles & resets
* Layout components (container, grid, cards)
* Tab system styling
* Form elements (inputs, buttons, select)
* Transaction list (with icons and actions)
* Modals and overlays
* Pagination controls
* Responsive breakpoints

**dark-mode.css (205 lines):**
* Activated via `.dark-mode` class on `<body>`
* Overrides colors for dark theme
* Same structure as light mode

### Responsive Breakpoints
```css
@media (max-width: 480px)  { /* Mobile phones */ }
@media (max-width: 360px)  { /* Extra small screens */ }
```

### Color System

**Light Mode:**
```css
--primary-color: #0051D5    /* Blue - main actions */
--income-color: #34c759     /* Green */
--expense-color: #ff3b30    /* Red */
--background: #f5f5f7       /* Light gray */
--card-bg: #ffffff          /* White */
--text-primary: #1d1d1f     /* Black */
--text-secondary: #6e6e73   /* Gray */
```

**Dark Mode:**
```css
background: #000000
card-bg: #1c1c1e
text-primary: #ffffff
text-secondary: #98989d
```

## 7. Version Management & Updates

### Version Storage (3 Places)

1. **index.html** - `APP_VERSION` constant (line 249)
2. **sw.js** - `CACHE_NAME` constant (line 2)
3. **manifest.json** - `version` field

**CRITICAL RULE:** When bumping version, update ALL THREE files.

### Version Check Flow (line 1211)

1. On page load, `checkAppVersion()` runs
2. Compare localStorage `app_version` with `APP_VERSION` constant
3. If different → show update notification
4. Update localStorage to new version
5. Service worker also checks for updates every 60 seconds

### Update Notification Flow

1. Service worker detects new version available
2. Set `updateAvailable = true`
3. Show "Update Available" banner (line 1265)
4. User clicks "Update Now"
5. Send `SKIP_WAITING` message to service worker
6. Service worker activates immediately
7. Page reloads with new version

## 8. PWA Configuration

### manifest.json

```json
{
  "name": "FinChronicle",
  "short_name": "FinChronicle",
  "display": "standalone",
  "start_url": "./index.html",
  "theme_color": "#0051D5",
  "background_color": "#ffffff",
  "orientation": "portrait",
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192" },
    { "src": "./icons/icon-512.png", "sizes": "512x512" },
    { "src": "./icons/maskable-icon-512.png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

### Installation Methods

* **Desktop:** Browser install button or pin to taskbar
* **iOS:** Share → Add to Home Screen
* **Android:** Install prompt in address bar

## 9. Coding Standards & Best Practices

### A. NEVER Do This

* ❌ **Do NOT add npm packages** - App is dependency-free
* ❌ **Do NOT add frameworks** (React, Vue, Angular) - Pure vanilla JS
* ❌ **Do NOT add build tools** (Webpack, Vite) - Direct file serving
* ❌ **Do NOT use `eval()`** or unsafe JavaScript
* ❌ **Do NOT access external APIs** - 100% offline-first
* ❌ **Do NOT add analytics or tracking** - Privacy-first
* ❌ **Do NOT use `var`** - Use `let` or `const` only
* ❌ **Do NOT use jQuery** - Use native DOM APIs
* ❌ **Do NOT use `innerHTML` with user input** - XSS risk (use `textContent`)

### B. ALWAYS Do This

* ✅ **Always call `saveData()` after data changes**
* ✅ **Always call `updateUI()` after state changes**
* ✅ **Always use `formatCurrency()` for displaying amounts**
* ✅ **Always use `formatDate()` for displaying dates**
* ✅ **Always validate user input** (check for NaN, empty strings)
* ✅ **Always sort transactions by date descending** (newest first)
* ✅ **Always escape CSV fields with quotes** (handle embedded quotes)
* ✅ **Always update version in 3 places** when releasing
* ✅ **Always test offline mode** (disable network in DevTools)
* ✅ **Always test on mobile** (iOS Safari, Android Chrome)

### C. Security Best Practices

* **Input Validation:** Always validate amounts (parseFloat + NaN check)
* **XSS Prevention:** Use `textContent` for user-generated content, not `innerHTML`
* **CSV Injection:** Quote all CSV cells properly
* **localStorage Limits:** Keep data structure flat (no deeply nested objects)
* **No Secrets:** Never store sensitive data (passwords, tokens, etc.)

## 10. Development Workflow

### Local Development

```bash
# Start local server (REQUIRED for service worker testing)
python3 -m http.server 8000

# Open in browser
open http://localhost:8000

# Test offline mode
# 1. Open DevTools
# 2. Go to Network tab
# 3. Enable "Offline" checkbox
# 4. Reload page → App should still work
```

### Making Changes

1. **Edit Files:**
   * UI/Logic → `index.html`
   * Styles → `css/styles.css` or `css/dark-mode.css`
   * Offline caching → `sw.js`

2. **Bump Version:**
   * Update `APP_VERSION` in index.html (line 249)
   * Update `CACHE_NAME` in sw.js (line 2)
   * Update `version` in manifest.json

3. **Update Documentation:**
   * Add entry to `CHANGELOG.md`
   * Update `README.md` if needed

4. **Test:**
   * Test on Chrome, Firefox, Safari
   * Test on mobile (iOS and Android)
   * Test offline mode (disable network)
   * Test PWA install

5. **Deploy:**
   * Commit with message: `Bump version to X.X.X`
   * Push to `main` branch
   * GitHub Pages auto-deploys
   * Users see update notification within 60 seconds

### Testing Checklist

- [ ] Forms submit correctly
- [ ] Edit/delete transaction works
- [ ] Filters work (month, category)
- [ ] Pagination works (if >20 transactions)
- [ ] Export to CSV downloads correctly
- [ ] Import from CSV works (test various formats)
- [ ] Currency changes persist
- [ ] Dark mode toggles and persists
- [ ] Service worker caches files (check DevTools → Application)
- [ ] App works offline (disable network)
- [ ] Update notification appears on version change
- [ ] Responsive layout on mobile (test <480px width)
- [ ] PWA installs correctly (test on actual device)

## 11. Feature Development Protocol

### Adding a New Feature

1. **Plan First:**
   * Determine where logic goes (usually in index.html `<script>`)
   * Identify which functions need updating
   * Plan UI changes (HTML structure, CSS classes)

2. **Implement in Order:**
   * **Data structure** (if needed - add fields to transaction object)
   * **UI markup** (HTML for new components)
   * **Styling** (CSS for new components)
   * **JavaScript logic** (functions and event handlers)
   * **Integration** (call from `updateUI()` or form handlers)

3. **Update Documentation:**
   * Add to `CHANGELOG.md` under "Unreleased"
   * Update `README.md` features list if user-facing

4. **Test Thoroughly:**
   * Test new feature in isolation
   * Test interaction with existing features
   * Test on mobile
   * Test offline mode

### Modifying Existing Features

1. **Read the code first:**
   * Find the relevant functions (use browser search: Ctrl+F)
   * Understand data flow: form → validation → storage → UI update

2. **Make minimal changes:**
   * Don't refactor unless necessary
   * Keep existing variable names and patterns
   * Preserve backward compatibility with localStorage data

3. **Test regression:**
   * Ensure existing functionality still works
   * Check that localStorage data from old versions loads correctly

## 12. Debugging Tips

### Common Issues & Solutions

**Issue: Transactions not saving**
* Check: Is `saveData()` called after changes?
* Check: Browser localStorage quota (usually 5-10MB)
* Check: DevTools → Application → Local Storage

**Issue: Service worker not updating**
* Solution: DevTools → Application → Service Workers → Unregister
* Solution: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
* Solution: Clear cache and reload

**Issue: Styles not applying**
* Check: CSS file loaded correctly (no 404)
* Check: CSS selector specificity
* Check: Dark mode class on body (if dark mode issue)

**Issue: CSV import fails**
* Check: CSV format (headers must include Date, Category, Amount)
* Check: Date format (use YYYY-MM-DD or DD/MM/YYYY or DD-MMM)
* Check: Amount is a valid number (no currency symbols)

**Issue: Pagination not working**
* Check: `currentPage` is reset to 1 when filters change
* Check: `itemsPerPage` is set to 20
* Check: Total pages calculation: `Math.ceil(filtered.length / itemsPerPage)`

### DevTools Workflow

1. **Console:** Check for errors (red messages)
2. **Application → Local Storage:** View stored data
3. **Application → Service Workers:** Check SW status
4. **Network → Offline:** Test offline mode
5. **Lighthouse:** Check PWA score (should be 100/100)

## 13. Performance Considerations

### Current Performance

* **Total App Size:** ~15KB (HTML + CSS + JS)
* **Lighthouse Score:** 100/100
* **First Paint:** <500ms
* **Time to Interactive:** <1s

### Optimization Rules

* **Keep JavaScript inline** - Avoid extra HTTP requests
* **Minimize CSS** - Remove unused styles
* **Use CSS containment** - `contain: layout paint` on cards
* **Debounce expensive operations** - If adding search, debounce input
* **Pagination is mandatory** - For lists >20 items
* **Lazy load images** - If adding images in future

## 14. Accessibility (WCAG AA Compliant)

### Current Implementation

* ✅ Semantic HTML (`<header>`, `<main>`, `<nav>`, `<button>`)
* ✅ ARIA labels on interactive elements
* ✅ Role attributes on custom components
* ✅ Keyboard navigation support (tab, enter, escape)
* ✅ Focus indicators on buttons
* ✅ Color contrast ratios meet AA standards
* ✅ Screen reader friendly (tested with VoiceOver)

### Accessibility Checklist for New Features

- [ ] Use semantic HTML elements
- [ ] Add `aria-label` to icon-only buttons
- [ ] Add `role` to custom components
- [ ] Ensure keyboard navigation works (test with Tab key)
- [ ] Ensure focus indicators are visible
- [ ] Test color contrast (4.5:1 for text, 3:1 for UI)
- [ ] Test with screen reader (macOS VoiceOver: Cmd+F5)

## 15. Deployment & Hosting

### Current Hosting: GitHub Pages

* **Repository:** `kiren-labs/finance-tracker` (or `finchronicle`)
* **URL:** `https://kiren-labs.github.io/finchronicle/`
* **Deployment:** Automatic on push to `main` branch
* **CDN:** GitHub Pages CDN (global edge locations)

### Deployment Checklist

1. Ensure version is bumped in 3 places
2. Update CHANGELOG.md
3. Test locally with `python3 -m http.server 8000`
4. Commit with message: `Bump version to X.X.X and update changelog with [description]`
5. Push to `main` branch
6. Wait 1-2 minutes for GitHub Pages to deploy
7. Test live URL in incognito window
8. Verify service worker updates (wait 60 seconds, check for banner)

## 16. AI Agent Guidelines

### When Working on This Project

1. **Never suggest adding frameworks** - This project is intentionally framework-free
2. **Never suggest build tools** - Direct file serving is a feature, not a limitation
3. **Always check existing patterns** - Don't introduce new patterns unless necessary
4. **Always update version** - If making changes, bump version in 3 places
5. **Always test offline** - Every change must work without internet
6. **Always preserve privacy** - No external APIs, no tracking, no telemetry
7. **Always maintain simplicity** - Complexity is the enemy

### Code Modification Protocol

**Before modifying code:**
1. Read the relevant section of index.html
2. Understand the data flow (form → validation → storage → UI)
3. Identify which functions need updating
4. Check if `updateUI()` needs to be called

**When adding features:**
1. Check if similar functionality exists (don't duplicate)
2. Follow existing naming conventions
3. Use existing utility functions (`formatCurrency`, `formatDate`, etc.)
4. Update documentation (CHANGELOG.md, README.md)

**When fixing bugs:**
1. Reproduce the bug first
2. Identify root cause (check console errors)
3. Make minimal fix (don't refactor unrelated code)
4. Test thoroughly (including edge cases)
5. Add comments if the fix is non-obvious

### Communication with User

* **Always explain** what you're changing and why
* **Always show** code snippets for review
* **Always mention** version bumping if making changes
* **Always suggest** testing steps after changes
* **Never assume** - ask if requirements are unclear

## 17. Future Considerations

### Planned Features (v4.0+)

* **Budget Tracking:** Set monthly budgets per category
* **Recurring Transactions:** Auto-add monthly expenses
* **Search Functionality:** Full-text search across transactions
* **Charts & Graphs:** Visual analytics with Chart.js
* **Google Sheets Sync:** Optional cloud backup
* **Tags System:** Add custom tags to transactions
* **Custom Date Ranges:** Filter by arbitrary date ranges

### Technical Debt

* **Monolithic HTML:** Consider splitting into modules (but keep build-free)
* **localStorage Limits:** Add warning when approaching 5MB limit
* **No TypeScript:** Consider adding JSDoc comments for type hints
* **No Tests:** Consider adding lightweight testing (manual test suite)

### Constraints to Maintain

* **No Backend:** Keep 100% client-side
* **No Frameworks:** Remain framework-free
* **No Build Tools:** Keep direct file serving
* **Privacy-First:** Never add tracking or external APIs
* **Offline-First:** All features must work offline

---

**Last Updated:** 2026-02-01
**Version:** 3.3.2
**Maintainer:** Kiren Labs

---

## Quick Reference

### Key Functions by Category

**Data Management:**
* `loadData()` - Load from localStorage
* `saveData()` - Persist to localStorage
* `updateUI()` - Master refresh function

**Transaction Operations:**
* `addTransaction()` - Via form submission (line 448)
* `editTransaction(id)` - Load for editing (line 812)
* `deleteTransaction(id)` - Show delete modal (line 857)
* `confirmDelete()` - Execute deletion (line 863)

**UI Updates:**
* `updateSummary()` - Refresh summary cards (line 507)
* `updateTransactionsList()` - Refresh list with filters (line 529)
* `updateMonthFilters()` - Refresh month filter buttons (line 600)
* `updateGroupedView()` - Refresh analytics (line 671)

**Formatting:**
* `formatCurrency(amount)` - Add currency symbol (line 343)
* `formatNumber(num)` - Add thousand separators (line 1169)
* `formatDate(dateStr)` - Format date display (line 1174)
* `formatMonth(monthStr)` - Format month display (line 1184)

**Import/Export:**
* `exportToCSV()` - Generate CSV download (line 881)
* `importFromCSV(text)` - Parse and import (line 940)
* `parseCSV(text)` - Custom CSV parser (line 1106)

**Version Management:**
* `checkAppVersion()` - Check for updates (line 1211)
* `checkServiceWorkerUpdate()` - Check SW updates (line 1244)
* `reloadApp()` - Force reload with new SW (line 1270)

---

**End of AGENTS.md**
