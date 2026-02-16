# Plan: Monthly Insights + Double-Entry Ledger

## Overview

Add a month-focused insights panel inside the Groups tab with a summary box and top spending categories. Then introduce a full double-entry "Account Book" feature with a chart of accounts, opening balances, and transfers. Keep the app offline-first and dependency-free.

This requires new data structures, migration from existing single-entry transactions, and UI updates across Groups and a new Ledger tab.

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| **Monthly Summary Box Location** | Inside Groups tab (month-focused analytics area) |
| **Top Spending Categories** | Top 3 by total expense amount for selected month |
| **Selected Month Scope** | Uses `selectedMonth` state from List tab |
| **Savings Definition** | income - expenses |
| **Balance Definition** | Cumulative balance across all time up to month end |
| **Ledger Scope** | Full chart of accounts with opening balances and transfers |

---

## Implementation Steps

### Step 1: Analyze Current Analytics Flow
**Goal:** Understand existing insights and UI anchors.

**Files to inspect:**
- [index.html](index.html#L175-L372) – Summary cards and Groups tab UI
- [app.js](app.js#L461-L780) – Analytics logic (`updateSummary()`, `updateGroupedView()`, `groupByMonth()`, `groupByCategory()`)
- [css/styles.css](css/styles.css#L360-L700) – Summary and analytics styling

**Current patterns to reuse:**
- `selectedMonth` state variable (from List tab filters)
- `updateGroupedView()` function (renders Groups tab content)
- Formatting helpers: `formatCurrency()`, `formatDate()`, `formatMonth()`
- Card-based UI with group headers and rows

### Step 2: Define Double-Entry Data Model
**Goal:** Build data structures for accounts, journal entries, and migration path.

**New localStorage Keys:**
- `accounts` – Array of account objects
  ```javascript
  {
    id: string,                    // Unique ID (e.g., 'acc-cash-001')
    name: string,                  // Account name (e.g., "Cash", "Savings Bank")
    type: string,                  // 'asset' | 'liability' | 'income' | 'expense' | 'equity'
    openingBalance: number,        // Starting balance
    description: string,           // Optional notes
    createdAt: ISO timestamp
  }
  ```

- `journalEntries` – Array of journal entry objects
  ```javascript
  {
    id: number,                    // Date.now() timestamp or UUID
    date: 'YYYY-MM-DD',
    memo: string,                  // Description/reference
    lines: [
      {
        accountId: string,         // Reference to account.id
        debit: number,             // Debit amount (0 if credit)
        credit: number,            // Credit amount (0 if debit)
        description: string        // Optional line item note
      }
    ],
    createdAt: ISO timestamp
  }
  ```

**Migration Strategy:**
- Keep existing `transactions` array as-is for backward compatibility
- On first load of new version:
  - Create default accounts: "Cash" (asset), "Income" (income), "Expenses" (expense)
  - Convert each existing transaction to journal entry lines:
    - Income transaction → Debit Cash, Credit Income
    - Expense transaction → Debit Expense, Credit Cash
  - Set `hasPreMigratedData` flag in localStorage to avoid re-running migration
  - Preserve `transactions` for potential rollback or legacy view

### Step 3: Add Monthly Summary Box to Groups Tab
**Goal:** Display month summary with total income, expenses, savings, and balance.

**UI Changes:**
- Add `.insights-section` div at top of Groups tab content (in [index.html](index.html#L363-L372))
- Include:
  - Month selector (reuse month buttons from List tab)
  - Summary box with 4 cards: Income, Expenses, Savings, Balance
  - Visual indicators (green for positive, red for negative)

**Logic Changes (app.js):**
- Create `getMonthSummary(month)` helper function
  - Filter transactions/journal entries by month
  - Calculate: total income, total expenses, savings (income - expenses)
  - Calculate: cumulative balance up to month end
  - Return object with all metrics
- Integrate into `updateGroupedView()` to render summary before existing group content
- Handle edge cases: no month selected, no transactions, first month (no prior balance)

### Step 4: Add Top Spending Categories Section
**Goal:** Show top 3 expense categories for selected month.

**UI Changes:**
- Add `.top-spending-section` div below monthly summary box
- Display as:
  - Table/card list: Category name | Amount | % of total expenses
  - Sorted descending by amount
  - Color-coded category indicators
  - Empty state if no expenses in month

**Logic Changes (app.js):**
- Create `getTopSpendingCategories(month, limit = 3)` helper function
  - Filter transactions by month and type='expense'
  - Group by category and sum amounts
  - Sort descending by amount
  - Take top N (default 3)
  - Calculate percentage of total expenses
  - Return array of category summaries
- Call from `updateGroupedView()` and render

### Step 5: Build Account Book / Ledger Tab
**Goal:** Full double-entry accounting interface with chart of accounts, journal entries, transfers.

**UI Structure (new tab in [index.html](index.html#L275-L372)):**

**5a. Chart of Accounts Sub-tab**
- List all accounts grouped by type (Asset, Liability, Income, Expense, Equity)
- For each account: Name | Type | Opening Balance | Current Balance | Actions (edit, delete)
- "Add Account" button → Form modal
- Form fields: Name, Type (dropdown), Opening Balance, Description

**5b. New Journal Entry Form**
- Date field (required)
- Memo field (required)
- Dynamic lines table:
  - Account dropdown (reusable, filtered by type)
  - Debit input OR Credit input (mutually exclusive, highlight when filled)
  - Line description (optional)
  - "Add Line" button to append more rows
  - "Remove Line" buttons on each row
- Validation: At least 2 lines, total debits === total credits
- Save button (disabled until valid)
- Cancel button

**5c. Journal Entries List**
- Filters: Month, Account
- Paginated table/list:
  - Entry Date | Memo | Line Count | Total Amount | Actions (view, edit, delete)
  - Click to expand → Show all lines (account, debit, credit, description)
- Sorting: Date descending (newest first)

**5d. Account Balances Summary**
- By type: Asset | Liability | Income | Expense | Equity
- For each: Account Name | Opening Balance | Debits | Credits | Current Balance
- Grand total row: Total Assets | Total Liabilities | etc. (for balance sheet check)

**Logic Changes (app.js):**
- `getAccounts()` – Return all accounts from localStorage
- `saveAccount(account)` – Add or update account
- `deleteAccount(accountId)` – Remove account (warn if has journal lines)
- `getJournalEntries(filters?)` – Return entries, optionally filtered by month/account
- `saveJournalEntry(entry)` – Add or update entry (validate debit/credit balance)
- `deleteJournalEntry(entryId)` – Remove entry
- `getAccountBalance(accountId, upToDate?)` – Calculate balance from opening balance + all debit/credit lines
- `createTransfer(fromAccountId, toAccountId, amount, date, memo)` – Helper to create balanced journal entry for transfers
- `validateJournalEntry(entry)` – Ensure >= 2 lines and debits === credits

### Step 6: Style New UI Elements
**Goal:** Match existing visual language and ensure responsive design.

**Changes to [css/styles.css](css/styles.css#L360-L700):**
- `.insights-section` – Container for monthly summary and top categories
  - Grid layout with summary cards (reuse `.summary-card` structure)
  - Responsive: 2 columns on desktop, 1-2 on mobile
- `.top-spending-section` – Category list section
  - Card-based layout with rows
  - Category badges/icons
- `.account-book-tab` – Ledger tab content
  - Chart of accounts table styling
  - Journal entry form styling (multi-line inputs)
  - Journal entries table or list
  - Account balances summary table
  - Reuse existing `.card`, `.form-group`, `.table` styles

**Changes to [css/dark-mode.css](css/dark-mode.css):**
- Ensure new sections inherit dark mode colors
- Text, backgrounds, borders, interactive states

### Step 7: Update Version & Documentation
**Goal:** Bump app version and document changes.

**Files to update:**
- `index.html` – Change `APP_VERSION` constant (line 249)
- `sw.js` – Change `CACHE_NAME` (line 2)
- `manifest.json` – Update `version` field
- `VERSION.md` – Add new version entry
- `CHANGELOG.md` – Add entry under "Unreleased" or new version section

**Documentation entry template:**
```markdown
## Version X.X.X (YYYY-MM-DD)

### New Features
- **Monthly Insights** – Visual summary box in Groups tab showing income, expenses, savings, and balance for selected month
- **Top Spending Categories** – Display top 3 expense categories for the selected month in Groups tab
- **Double-Entry Ledger** – New "Account Book" tab with full accounting features:
  - Chart of accounts with optional opening balances
  - Journal entry form with balanced debit/credit lines
  - Journal entries list with month/account filters
  - Account balance calculations and transfers support
  - Migration of existing transactions to journal entries

### Technical Changes
- New localStorage keys: `accounts`, `journalEntries`, `hasPreMigratedData`
- New helper functions: `getMonthSummary()`, `getTopSpendingCategories()`, `getAccountBalance()`, `saveJournalEntry()`, etc.
- New UI tab "Account Book" with sub-sections for chart of accounts, entries, and balances
- Updated `updateUI()` to call new insights/ledger update functions

### Backward Compatibility
- Existing `transactions` array preserved for legacy view
- Automatic one-time migration on first load of new version
- Users can continue using simple expense/income tracking; ledger is optional
```

---

## Testing Checklist

- [ ] **Monthly Summary Box:**
  - Displays when month filter applied in List tab
  - Shows correct totals for income, expenses, savings
  - Balance calculation is cumulative across months
  - Empty state if no transactions in month
  - Persists across tab switches

- [ ] **Top Spending Categories:**
  - Shows top 3 categories by expense amount
  - Percentages calculated correctly
  - Sorted descending
  - Empty state if no expenses
  - Updates when month filter changes

- [ ] **Account Book - Chart of Accounts:**
  - Can add/edit/delete accounts
  - Opening balances persisted
  - Accounts grouped by type
  - Current balance calculated correctly

- [ ] **Account Book - Journal Entries:**
  - Form validates: >= 2 lines, debits === credits
  - Can add/edit/delete entries
  - Month filter works
  - Account filter works
  - Pagination works if >20 entries
  - Entries persist across reload

- [ ] **Account Book - Transfers:**
  - Transfer helper creates balanced journal entry
  - Balances updated after transfer
  - Transfer appears in both accounts' history

- [ ] **Migration:**
  - Existing transactions converted to journal entries on first load
  - Converted entries appear in both journals and ledger
  - Original `transactions` array preserved
  - `hasPreMigratedData` flag prevents re-running migration

- [ ] **Offline:**
  - All new features work without network
  - Data persists in localStorage
  - Service worker caches all new HTML/CSS/JS

- [ ] **Responsive:**
  - Summary box stacks on mobile
  - Forms accessible on small screens
  - Tables/lists pagination works

- [ ] **Version Management:**
  - Update banner appears after version bump
  - Service worker updates correctly
  - Version consistent across 3 files

---

## Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Data Migration Corruption** | Users lose existing transactions | Test migration thoroughly; use `hasPreMigratedData` flag to run once only; offer rollback via CHANGELOG notice |
| **localStorage Size Overflow** | App exceeds 5MB quota | Ledger entries add ~200 bytes each; warn user at 80% quota; consider archive feature later |
| **Complex Journal Entry UI** | User confusion on debits/credits | Provide in-app help text; use icons/colors; consider "simple transfer" mode as first option |
| **Performance with Large Dataset** | Slow rendering/filtering | Paginate journal entries (20/page); index accounts in memory; optimize `getAccountBalance()` with caching |
| **Breaking Changes** | Existing workflows disrupted | Keep `transactions` array; new features optional; users can ignore ledger and continue using simple Add tab |
| **CSS/Dark Mode Inconsistency** | New sections look broken in dark mode | Test dark mode on all new components; use CSS tokens/variables consistently |
| **Backward Compatibility** | Old app versions can't read new data | Store both `transactions` and `journalEntries`; old app still reads `transactions` successfully |

---

## Success Criteria

1. ✅ Monthly Summary Box displays income, expenses, savings, balance for selected month in Groups tab
2. ✅ Top Spending Categories shows top 3 by amount with percentages
3. ✅ Chart of Accounts panel allows full CRUD of accounts with types, opening balances
4. ✅ Journal Entry form enforces balanced debits/credits and saves correctly
5. ✅ Journal Entries list filters by month and account with pagination
6. ✅ Account Balance calculations correct after entries and transfers
7. ✅ Existing transactions migrate to ledger automatically on first load
8. ✅ All features work offline with localStorage only
9. ✅ Responsive design on mobile (<480px), desktop tested
10. ✅ Version bumped in 3 files; CHANGELOG updated; service worker updates correctly
