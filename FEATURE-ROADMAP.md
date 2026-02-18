# Multi-Release Feature Plan: FinChronicle Enhancement

## Context

The user wants to add 7 high-impact features to FinChronicle to make it more useful for everyday users:

1. **Budget Limits & Alerts** - Set monthly spending limits per category with visual warnings
2. **Recurring Transactions** - Auto-add predictable monthly expenses (rent, subscriptions)
3. **Receipt Photos** - Attach photo receipts to transactions (conservative: 500KB max)
4. **Split Transactions** - Divide one transaction across multiple categories
5. **Tags & Search** - Tag transactions and search/filter by tags
6. **Savings Goals** - Track progress toward savings targets
7. **Reports & Visualizations** - Charts and spending insights

**User Priorities** (from user feedback):
1. Recurring Transactions (highest priority)
2. Reports & Visualizations
3. Budget Limits & Alerts
4. Others (lower priority)

**Key Concern**: Receipt images could consume storage quickly. User chose conservative approach (500KB max, ~200-500 images per device).

## Architecture Foundation (Already Exists)

**Current Storage:**
- IndexedDB: `FinChronicleDB` with `transactions` store
- localStorage: Settings only (currency, darkMode, version, etc.)
- No quota management or size tracking currently

**Current Transaction Schema:**
```javascript
{
  id: number,              // Date.now() timestamp
  type: 'expense' | 'income',
  amount: number,
  category: string,
  date: 'YYYY-MM-DD',
  notes: string,
  createdAt: ISO timestamp
}
```

**Key Functions:**
- `initDB()` - Initialize IndexedDB
- `saveTransactionToDB(tx)` - Save transaction
- `updateUI()` - Master UI refresh function
- `updateSummary()` - Update summary cards
- `validateAmount()` - Centralized amount validation

**Recent Features (v3.10.0):**
- Budget Health Card already exists (daily pace, projected spending, status indicators)
- Monthly Insights with trends
- Top Spending Categories

## Phased Release Plan

### Version 3.10.2 - Transaction Validation Layer (Foundation) 🛡️
**Release Target:** 1 week after v3.10.1
**Priority:** CRITICAL - Must implement BEFORE any new features

**Why This is Critical:**
Current transaction saving has NO validation for:
- Invalid transaction types
- Out-of-range amounts
- Invalid categories
- Future dates
- XSS attacks via notes field
- Data integrity issues

**Implementation:**

```javascript
// Core validation function
function validateTransaction(transaction) {
  const errors = [];

  // 1. Type validation
  if (!['income', 'expense'].includes(transaction.type)) {
    errors.push({ field: 'type', message: 'Invalid transaction type' });
  }

  // 2. Amount validation
  if (isNaN(transaction.amount) || transaction.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }
  if (transaction.amount > 999999999) {  // ₹99 crore max
    errors.push({ field: 'amount', message: 'Amount exceeds maximum limit' });
  }

  // 3. Category validation
  const validCategories = transaction.type === 'income' ? incomeCategories : expenseCategories;
  if (!validCategories.includes(transaction.category)) {
    errors.push({ field: 'category', message: 'Invalid category for transaction type' });
  }

  // 4. Date validation
  const date = new Date(transaction.date);
  if (isNaN(date.getTime())) {
    errors.push({ field: 'date', message: 'Invalid date format' });
  }
  if (date > new Date()) {
    errors.push({ field: 'date', message: 'Future dates not allowed' });
  }
  if (date < new Date('1900-01-01')) {
    errors.push({ field: 'date', message: 'Date too far in past' });
  }

  // 5. Notes sanitization (prevent XSS)
  if (transaction.notes && transaction.notes.length > 500) {
    errors.push({ field: 'notes', message: 'Notes too long (max 500 characters)' });
  }
  transaction.notes = sanitizeHTML(transaction.notes || '');

  return {
    valid: errors.length === 0,
    errors: errors,
    sanitized: transaction
  };
}

function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Update saveTransaction to use validation
async function saveTransaction(transaction) {
  const validation = validateTransaction(transaction);

  if (!validation.valid) {
    const errorMessage = validation.errors.map(e => e.message).join(', ');
    showMessage(`⚠️ Validation Error: ${errorMessage}`);
    return false;
  }

  // Save sanitized transaction
  await saveTransactionToDB(validation.sanitized);
  return true;
}
```

**Files to Modify:**
- `app.js`: Add validation functions, update saveTransaction()
- No UI changes needed

**Testing:**
- Try saving with invalid type
- Try saving negative amount
- Try saving with SQL injection in notes
- Try saving future date
- Verify all edge cases caught

---

### Version 3.11.0 - Recurring Transactions (Priority 1)
**Release Target:** 4-5 weeks after v3.10.1 (revised from 2-3 weeks)

**New IndexedDB Store:**
```javascript
Store: recurringTemplates
{
  id: number,
  type: 'expense' | 'income',
  amount: number,
  category: string,
  notes: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
  dayOfMonth: number,            // 1-31, or 'last' for month-end
  executionTime: string,         // '09:00' - consistent execution time
  timezone: string,              // 'Asia/Kolkata' - user's timezone
  startDate: 'YYYY-MM-DD',
  nextDueDate: string,           // ISO 8601 with timezone: '2026-03-01T09:00:00+05:30'
  lastExecuted: string,          // ISO 8601 with timezone
  enabled: boolean,              // Can pause without deleting
  skipWeekends: boolean,         // Optional: Skip if due on weekend
  createdAt: ISO timestamp
}

Indexes:
- nextDueDate (for checking what's due)
- enabled (filter active templates)
```

**Critical Addition: Timezone Handling**

**Why:** Prevents bugs with daylight saving time, different timezones, and execution timing issues.

**Implementation:**
```javascript
function checkRecurringTransactions() {
  const now = new Date();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  templates.forEach(template => {
    if (!template.enabled) return;

    const nextDue = new Date(template.nextDueDate);

    // Only execute if:
    // 1. Current time is past due date
    // 2. Haven't executed today already
    if (now >= nextDue && !executedToday(template)) {
      generateTransaction(template);
      updateNextDueDate(template);
    }
  });
}

function updateNextDueDate(template) {
  const current = new Date(template.nextDueDate);
  let next;

  switch(template.frequency) {
    case 'daily':
      next = new Date(current);
      next.setDate(current.getDate() + 1);
      break;
    case 'weekly':
      next = new Date(current);
      next.setDate(current.getDate() + 7);
      break;
    case 'monthly':
      next = new Date(current);
      next.setMonth(current.getMonth() + 1);
      // Handle month-end: Jan 31 → Feb 28/29
      if (template.dayOfMonth === 'last') {
        next = new Date(next.getFullYear(), next.getMonth() + 1, 0);
      } else {
        next.setDate(Math.min(template.dayOfMonth, getDaysInMonth(next)));
      }
      break;
    // ... other frequencies
  }

  // Preserve timezone
  template.nextDueDate = next.toISOString();
  template.lastExecuted = new Date().toISOString();
}
```

**Implementation:**

1. **New Settings Section**: "Recurring Transactions"
   - List all recurring templates
   - Add/Edit/Delete/Pause buttons
   - Visual indicators for enabled/paused

2. **Template Creation Modal**:
   - Same fields as regular transaction
   - Additional: Frequency dropdown, Start Date
   - Save as template (not transaction)

3. **Background Check Function**: `checkRecurringTransactions()`
   - Runs on app startup and tab switch
   - Compares today's date with `nextDueDate`
   - Creates transaction if due
   - Updates `nextDueDate` and `lastGenerated`
   - Shows notification: "3 recurring transactions added"

4. **UI Elements**:
   - Badge on generated transactions: "🔁 From: Rent"
   - Edit recurring template vs edit individual transaction
   - Confirm dialog before deleting template

**Files to Modify:**
- `app.js`: Add recurring store init, check function, CRUD operations
- `index.html`: Add recurring section in Settings tab
- `css/styles.css`: Style recurring list and modal
- `css/dark-mode.css`: Dark mode support
- `sw.js`: Update cache version

**Testing:**
- Create monthly rent template
- Advance system date, reload app
- Verify transaction auto-created
- Test edit, pause, delete

---

### Version 3.12.0 - Reports & Visualizations + Optional Fields System (Priority 2)
**Release Target:** 4-5 weeks after v3.10.1

---

## Part 1: Optional Fields System (Core Feature) 🎯

**Concept:** User-controlled optional fields that can be enabled/disabled in settings. Fields are hidden from UI when disabled but data is preserved in database.

### Transaction Schema Update

**Add optional fields to transaction object (all nullable):**
```javascript
{
  // Core fields (always present)
  id: number,
  type: 'expense' | 'income',
  amount: number,
  category: string,
  date: 'YYYY-MM-DD',
  notes: string,
  createdAt: ISO timestamp,

  // Optional fields (v3.12.0) - nullable, controlled by user settings
  paymentMethod: string | null,    // 'cash', 'upi', 'credit-card', 'debit-card', 'wallet', 'bank-transfer', 'other'
  account: string | null,          // 'HDFC Savings', 'ICICI Credit Card', etc.
  merchant: string | null,         // 'Swiggy', 'Amazon', 'John', etc.
  expenseType: string | null,      // 'personal', 'business', 'tax-deductible', 'reimbursable'
  attachedTo: string | null,       // 'self', 'spouse', 'kid1', 'parent', etc.
  referenceId: string | null,      // UPI ID, cheque number, invoice number
  location: string | null          // City/area (manual entry)
}
```

### Storage Configuration

**CRITICAL: Store in IndexedDB, NOT localStorage**

**Why:** localStorage can be cleared by user or browser, causing data integrity issues. If user has 500 transactions with payment method data but localStorage is cleared, they lose access to that data.

**New IndexedDB Store:**
```javascript
Store: appSettings
{
  id: 'config',  // Single config document
  enabledFields: {
    paymentMethod: false,    // Disabled by default
    account: false,
    merchant: false,
    expenseType: false,
    attachedTo: false,
    referenceId: false,
    location: false
  },
  appVersion: '3.12.0',
  lastUpdated: ISO timestamp
}

// No indexes needed (single document store)
```

**Fallback: Auto-Detection on Load**

If appSettings store is empty (first load or cleared), automatically detect fields that have data:

```javascript
async function initializeEnabledFields() {
  let config = await loadAppSettings();

  if (!config) {
    // First time or settings cleared - auto-detect
    config = await autoDetectEnabledFields();
    await saveAppSettings(config);
  }

  return config;
}

async function autoDetectEnabledFields() {
  const transactions = await loadDataFromDB();

  return {
    paymentMethod: transactions.some(t => t.paymentMethod),
    account: transactions.some(t => t.account),
    merchant: transactions.some(t => t.merchant),
    expenseType: transactions.some(t => t.expenseType),
    attachedTo: transactions.some(t => t.attachedTo),
    referenceId: transactions.some(t => t.referenceId),
    location: transactions.some(t => t.location)
  };
}
```

### Settings UI: "Additional Transaction Fields"

**New section in Settings tab:**

```
┌─────────────────────────────────────────────────┐
│  📋 Additional Transaction Fields               │
├─────────────────────────────────────────────────┤
│  Enable optional fields to track more details.  │
│  Disabled fields won't appear in forms.         │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 💳 Payment Method               [Toggle]  │ │
│  │    Track cash, UPI, credit card, etc.     │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 🏦 Account/Source              [Toggle]   │ │
│  │    Track which bank account or card       │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 🏪 Merchant/Vendor             [Toggle]   │ │
│  │    Track who you paid                     │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 📊 Expense Type                [Toggle]   │ │
│  │    Business, personal, tax-deductible     │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 👥 Attached To (Person)        [Toggle]   │ │
│  │    Track family expenses                  │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 🔢 Reference/Transaction ID    [Toggle]   │ │
│  │    UPI ID, invoice number                 │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 📍 Location                    [Toggle]   │ │
│  │    Where transaction happened             │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  [Reset to Defaults]                            │
└─────────────────────────────────────────────────┘
```

### Transaction Form Behavior

**When fields are ENABLED:**
- Show "Additional Details" collapsible section below core fields
- Only show enabled fields (others hidden)
- All optional fields are... optional (can be left blank)

**When fields are DISABLED:**
- Fields don't appear in form for new transactions
- When editing old transaction WITH data in disabled field:
  - Temporarily show that field with info message
  - "This field is disabled. You can edit/clear it or [enable in settings]"
  - Preserve data on save (don't delete)

### Core Functions

```javascript
// Get enabled fields from localStorage
function getEnabledFields() { ... }

// Save enabled fields configuration
function setEnabledFields(config) { ... }

// Toggle field on/off with confirmation if data exists
function toggleField(fieldName, enabled) { ... }

// Check if any transaction has data in this field
function checkIfFieldHasData(fieldName) { ... }

// Dynamically show/hide form fields based on config
function updateTransactionForm() { ... }

// Safe getter - returns null if field disabled
function getFieldValue(transaction, fieldName) { ... }

// Safe setter - preserves data even if field disabled
function setFieldValue(transaction, fieldName, value) { ... }

// Show disabled field temporarily when editing old transaction
function showTemporaryField(fieldName, value) { ... }
```

### Edge Case Handling

**Scenario 1: User disables field after using it**
- ✅ Data preserved in database (hidden, not deleted)
- ✅ Field disappears from form
- ✅ Analytics charts hidden (no crash)
- ✅ CSV export includes column (data integrity)
- ✅ Show confirmation: "50 transactions have data. Will be hidden but not deleted."

**Scenario 2: Editing old transaction with disabled field**
- ✅ Temporarily show field with existing data
- ✅ Add info badge: "This field is currently disabled"
- ✅ User can edit or clear value
- ✅ Link to settings to re-enable field
- ✅ Data preserved on save

**Scenario 3: Re-enabling field**
- ✅ Field reappears in form
- ✅ Old data immediately visible
- ✅ No data loss, no migration needed
- ✅ Message: "Field re-enabled. Your old data is back!"

**Scenario 4: Analytics with disabled fields**
- ✅ Conditional rendering: only show charts for enabled fields
- ✅ Null checks before accessing field data
- ✅ No crashes if field disabled mid-use

**Scenario 5: CSV export**
- ✅ Include column if ANY transaction has data in that field
- ✅ Empty cells for transactions without data
- ✅ On import, data preserved

### Dropdown Options for Optional Fields

**Payment Method:**
- 💵 Cash
- 📱 UPI (PhonePe, Google Pay, Paytm)
- 💳 Credit Card
- 💳 Debit Card
- 👛 Wallet (Paytm, Amazon Pay)
- 🏦 Bank Transfer (NEFT/RTGS/IMPS)
- ➡️ Other

**Expense Type:**
- Personal
- Business Expense
- Tax Deductible
- Reimbursable
- Investment

**Account:** (Free text input with suggestions)
**Merchant:** (Free text input with autocomplete from existing)
**Attached To:** (Free text or predefined: Self, Spouse, Kid 1, Kid 2, Parent, Other)
**Reference ID:** (Free text)
**Location:** (Free text)

---

## Part 2: Reports & Visualizations

**New Tab:** "Reports" (replaces or extends Groups tab)

### Core Report Types

1. **Spending by Category (Pie Chart)**
   - HTML/CSS pie chart (no chart.js)
   - Top 5-7 categories
   - Percentages and amounts

2. **Income vs Expense Trend (Bar Chart)**
   - Monthly bars for last 6-12 months
   - Side-by-side income/expense bars
   - HTML/CSS bars (height percentages)

3. **Week-over-Week Spending**
   - Last 4 weeks comparison
   - Show if spending increasing/decreasing
   - Color-coded trend arrows

4. **Best/Worst Spending Days**
   - Days of month with highest/lowest spending
   - Helps identify patterns (payday splurges, etc.)

### Optional Field Analytics (Dynamic)

**Only shown if respective field is enabled:**

5. **Payment Method Breakdown** (if paymentMethod enabled)
   - Pie chart: Cash vs UPI vs Credit Card vs others
   - "85% of spending is digital"
   - Trend: Digital vs cash ratio over time

6. **Account-wise Spending** (if account enabled)
   - Bar chart per account/card
   - "HDFC Credit Card: ₹15,000 | SBI Savings: ₹10,000"
   - Useful for credit card budget tracking

7. **Top Merchants** (if merchant enabled)
   - List of top 10 merchants by spending
   - "You spent ₹5,000 at Swiggy in 3 months"
   - Identify subscription services

8. **Business vs Personal** (if expenseType enabled)
   - Split view of business vs personal expenses
   - Tax report generation
   - Reimbursable expenses pending

9. **Per-Person Spending** (if attachedTo enabled)
   - Family expense breakdown
   - "Kids: ₹20,000 | Self: ₹15,000 | Spouse: ₹18,000"

### Report Generation Functions + Caching Strategy

**CRITICAL: Report Performance Optimization**

**Problem:** With 1000+ transactions and 9+ report types, rendering can be slow (9000+ iterations).

**Solution: Implement Report Caching**

```javascript
// Global cache object
let reportCache = {
  dateRange: null,
  enabledFields: null,
  transactionCount: 0,
  data: null,
  timestamp: null
};

// Main report generator with caching
function generateAllReports() {
  const currentRange = getSelectedDateRange();
  const currentFields = getEnabledFields();
  const txCount = transactions.length;

  // Cache hit conditions:
  // 1. Same date range
  // 2. Same enabled fields
  // 3. Same transaction count (no new transactions added)
  // 4. Cache less than 5 minutes old (for live updates)
  const cacheValid =
    reportCache.dateRange === currentRange &&
    JSON.stringify(reportCache.enabledFields) === JSON.stringify(currentFields) &&
    reportCache.transactionCount === txCount &&
    reportCache.timestamp &&
    (Date.now() - reportCache.timestamp) < 300000; // 5 minutes

  if (cacheValid) {
    console.log('📊 Using cached reports');
    return reportCache.data;
  }

  console.log('📊 Generating fresh reports');

  // Filter transactions once
  const filtered = transactions.filter(t => inDateRange(t, currentRange));

  // Generate all reports
  const reports = {
    // Core reports (always generated)
    categoryPie: generateCategoryPieData(filtered),
    monthlyTrend: generateMonthlyTrendData(filtered),
    weeklyTrend: generateWeeklyTrendData(filtered),
    dayAnalysis: generateDayOfMonthAnalysis(filtered)
  };

  // Optional field reports (conditional)
  if (currentFields.paymentMethod) {
    reports.paymentMethod = generatePaymentMethodBreakdown(filtered);
  }
  if (currentFields.account) {
    reports.accountWise = generateAccountWiseSpending(filtered);
  }
  if (currentFields.merchant) {
    reports.topMerchants = generateTopMerchants(filtered);
  }
  if (currentFields.expenseType) {
    reports.businessPersonal = generateBusinessVsPersonal(filtered);
  }
  if (currentFields.attachedTo) {
    reports.perPerson = generatePerPersonSpending(filtered);
  }

  // Update cache
  reportCache = {
    dateRange: currentRange,
    enabledFields: currentFields,
    transactionCount: txCount,
    data: reports,
    timestamp: Date.now()
  };

  return reports;
}

// Invalidate cache when data changes
function saveTransactionToDB(transaction) {
  // ... existing save logic ...

  // Invalidate report cache
  reportCache = {
    dateRange: null,
    enabledFields: null,
    transactionCount: 0,
    data: null,
    timestamp: null
  };
}

// Dynamic report renderer
function renderReports() {
  const reports = generateAllReports();

  // Render core reports
  renderCategoryPieChart(reports.categoryPie);
  renderMonthlyTrend(reports.monthlyTrend);
  renderWeeklyTrend(reports.weeklyTrend);
  renderDayAnalysis(reports.dayAnalysis);

  // Render optional field reports
  if (reports.paymentMethod) renderPaymentMethodBreakdown(reports.paymentMethod);
  if (reports.accountWise) renderAccountWiseSpending(reports.accountWise);
  if (reports.topMerchants) renderTopMerchants(reports.topMerchants);
  if (reports.businessPersonal) renderBusinessVsPersonal(reports.businessPersonal);
  if (reports.perPerson) renderPerPersonSpending(reports.perPerson);
}
```

**Performance Improvement:**
- First load: ~100ms (generate all reports)
- Subsequent loads: ~2ms (cache hit)
- Cache invalidated only on: new transaction, delete transaction, date range change, field toggle

### Date Range Selector

- Dropdown: Last 3 months, 6 months, 1 year, All time
- Filter all reports by range
- Default: Last 6 months

---

## Files to Modify

**app.js:**
- Add optional fields to transaction schema
- Add getEnabledFields(), setEnabledFields(), toggleField()
- Add updateTransactionForm() for dynamic form rendering
- Add safe getFieldValue() and setFieldValue()
- Add report generation functions (core + optional)
- Add dynamic renderReports() with conditional logic
- Update saveTransaction() to handle optional fields
- Update editTransaction() to show disabled fields temporarily
- Update exportToCSV() to include optional field columns

**index.html:**
- Add "Additional Transaction Fields" section in Settings tab
- Add toggle switches for each optional field
- Add "Additional Details" collapsible section in transaction form
- Add optional field dropdowns/inputs (conditionally shown)
- Add Reports tab or extend Groups tab
- Add chart containers for all report types

**css/styles.css:**
- Style field toggle list and switches
- Style "Additional Details" section in form
- Style temporary field info messages
- Style optional field badges in transaction list
- Chart styles (bars, pie segments, legends)
- Report grid layout

**css/dark-mode.css:**
- Dark mode for field toggles
- Dark mode for optional field badges
- Dark mode for charts and reports

**sw.js:**
- Update cache version to v3.12.0

---

## IndexedDB Migration

**CRITICAL FIX: Bump DB version from 2 to 3** (not stay at 2)

**Why:** Even though optional fields are nullable, we MUST bump DB version to:
1. Trigger `onupgradeneeded` event
2. Create new `appSettings` store
3. Track schema evolution properly
4. Prevent version conflicts with v3.13.0

```javascript
const DB_VERSION = 3;

db.onupgradeneeded = function(event) {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

  // v2: Add recurring templates (from v3.11.0)
  if (oldVersion < 2) {
    const recurringStore = db.createObjectStore('recurringTemplates', { keyPath: 'id' });
    recurringStore.createIndex('nextDueDate', 'nextDueDate');
    recurringStore.createIndex('enabled', 'enabled');
    console.log('Upgraded to v2: Recurring templates added');
  }

  // v3: Add app settings store + optional fields
  if (oldVersion < 3) {
    // Create appSettings store for configuration
    const settingsStore = db.createObjectStore('appSettings', { keyPath: 'id' });

    // Optional fields added to transaction schema (no migration needed - nullable)
    // Existing transactions automatically get null values for new fields

    // Initialize default config
    const defaultConfig = {
      id: 'config',
      enabledFields: {
        paymentMethod: false,
        account: false,
        merchant: false,
        expenseType: false,
        attachedTo: false,
        referenceId: false,
        location: false
      },
      appVersion: '3.12.0',
      lastUpdated: new Date().toISOString()
    };

    const transaction = event.target.transaction;
    transaction.oncomplete = () => {
      // Save default config after stores are created
      const settingsTx = db.transaction(['appSettings'], 'readwrite');
      settingsTx.objectStore('appSettings').add(defaultConfig);
    };

    console.log('Upgraded to v3: Optional fields system added');
  }
};
```

**Data Migration:** None needed. Existing transactions get `null` for optional fields automatically.

---

## Testing

**Core Functionality:**
- Enable/disable each field via settings
- Verify field appears/disappears in form
- Create transaction with optional fields
- Edit transaction, verify data preserved
- Disable field with existing data, verify confirmation dialog
- Edit old transaction with disabled field, verify temporary field shown
- Re-enable field, verify old data visible

**Edge Cases:**
- Disable field → create transactions → re-enable field
- Edit transaction with multiple disabled fields
- CSV export with mixed enabled/disabled fields
- Analytics with disabled fields (no crash)
- Null checks in all report functions

**Reports:**
- Generate all core reports with 12+ months data
- Verify optional field reports only show when enabled
- Test payment method breakdown with mixed data
- Test account-wise spending with multiple accounts
- Verify calculations match raw totals
- Test responsive layout on mobile
- Test dark mode for all charts

---

## Storage Impact

**Per transaction with ALL optional fields:**
- Core fields: ~150 bytes
- Optional fields: ~100 bytes
- **Total: ~250 bytes per transaction**
- **1000 transactions: ~250 KB** (negligible)

---

## User Benefits

✅ **Flexibility** - Power users enable what they need, simple users stay simple
✅ **Progressive Disclosure** - App grows with user sophistication
✅ **No Bloat** - Transaction form stays clean by default
✅ **Data Safety** - Disabling field doesn't delete data
✅ **Future-Proof** - Easy to add more optional fields
✅ **Analytics Scale** - Reports dynamically adjust to enabled fields
✅ **Privacy** - Location tracking is opt-in, not forced

---

### Version 3.13.0 - Budget Limits & Alerts (Priority 3)
**Release Target:** 6-7 weeks after v3.10.1

**New IndexedDB Store:**
```javascript
Store: budgets
{
  id: number,
  category: string,          // Must match existing category
  monthlyLimit: number,      // Budget amount
  alertThreshold: number,    // % to trigger warning (e.g., 80%)
  rolloverEnabled: boolean,  // NEW: Enable budget rollover
  rolloverBalance: number,   // NEW: Current rollover amount
  budgetType: string,        // NEW: 'fixed' | 'envelope' | 'percentage'
  resetDay: number,          // NEW: Day of month to reset (default: 1)
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp
}

Indexes:
- category (one budget per category)
```

**NEW: Budget Rollover System**

**Why:** Users expect unused budget to rollover to next month (envelope budgeting).

**Rollover Logic:**
```javascript
function calculateAvailableBudget(category, month) {
  const budget = getBudget(category);
  const currentSpending = getCategorySpending(category, month);

  let available = budget.monthlyLimit;

  // Add rollover from previous month (if enabled)
  if (budget.rolloverEnabled) {
    const previousMonth = getPreviousMonth(month);
    const previousSpending = getCategorySpending(category, previousMonth);
    const previousSavings = budget.monthlyLimit - previousSpending;

    // Only rollover positive savings (not overspending)
    if (previousSavings > 0) {
      available += previousSavings;
      budget.rolloverBalance = previousSavings;
    } else {
      budget.rolloverBalance = 0;
    }
  }

  return {
    total: available,
    spent: currentSpending,
    remaining: available - currentSpending,
    percentUsed: (currentSpending / available) * 100
  };
}

// Display in UI
function renderBudgetCard(category) {
  const status = calculateAvailableBudget(category, getCurrentMonth());

  return `
    <div class="budget-card">
      <h4>${category}</h4>
      <div class="budget-amounts">
        <span>Spent: ${formatCurrency(status.spent)}</span>
        <span>Budget: ${formatCurrency(status.total)}</span>
        ${status.rolloverBalance > 0 ?
          `<small>+ ${formatCurrency(status.rolloverBalance)} rollover</small>` : ''}
      </div>
      <div class="budget-progress">
        <div class="progress-bar" style="width: ${Math.min(status.percentUsed, 100)}%"></div>
      </div>
      <span class="${status.percentUsed > 100 ? 'over-budget' : 'on-track'}">
        ${formatCurrency(status.remaining)} remaining
      </span>
    </div>
  `;
}
```

**Budget Types:**

1. **Fixed Budget** (default):
   - Always resets to ₹10,000 each month
   - No rollover

2. **Envelope Budget** (rollover enabled):
   - Unused budget carries forward
   - Example: Spend ₹8,000 of ₹10,000 → Next month: ₹12,000 available

3. **Percentage Budget** (advanced):
   - Budget = X% of income
   - Example: "Groceries = 20% of monthly salary"

**Implementation:**

1. **Budget Management UI** (in Settings or new Budgets tab):
   - List all categories with budget status
   - Set limit button (opens modal)
   - Shows: Spent / Limit (with progress bar)
   - Color-coded: Green (<80%), Yellow (80-100%), Red (>100%)

2. **Budget Alert System**:
   - Check on every transaction save
   - Compare current month spending vs budget
   - Show warning modal: "⚠️ Groceries: 85% of budget used"
   - Options: OK / View Details / Adjust Budget

3. **Budget Health Integration**:
   - Extend existing Budget Health Card (v3.10.0)
   - Show category-level budget status
   - Aggregate status: "3 categories over budget"

4. **Visual Indicators**:
   - Summary cards show budget warnings
   - Transaction list: Badge on transactions in over-budget categories
   - Category filter shows budget status

**Files to Modify:**
- `app.js`: Add budgets store, check logic, alert modals
- `index.html`: Add budget management UI
- `css/styles.css`: Progress bars, status badges
- `css/dark-mode.css`: Dark mode colors
- `sw.js`: Update cache version

**Testing:**
- Set budget for Groceries: ₹5000
- Add transactions totaling ₹4500
- Verify warning at 80% threshold
- Add transaction exceeding budget
- Verify red status and alert

---

### Version 3.14.0 - Tags & Search (Medium Priority)
**Release Target:** 8-9 weeks after v3.10.1

**Transaction Schema Update:**
```javascript
{
  // ... existing fields ...
  tags: string[]  // New field: ['vacation', 'business', 'urgent']
}
```

**Implementation:**

1. **Tag Input** (in transaction form):
   - Multi-tag input field
   - Autocomplete from existing tags
   - Comma-separated or chip-based input

2. **Tag Management**:
   - Tag cloud view (all tags with counts)
   - Rename tag (updates all transactions)
   - Delete tag (removes from all transactions)

3. **Search Bar**:
   - New search input in List tab header
   - Search by: amount, category, notes, tags
   - Real-time filtering as user types

4. **Tag Filtering**:
   - Click tag to filter transactions
   - Combine with existing month/category filters
   - Show active filters as chips

**Files to Modify:**
- `app.js`: Add tags field to transaction object, search function
- `index.html`: Add tag input, search bar, tag cloud
- `css/styles.css`: Tag chips, search bar, filter pills
- `css/dark-mode.css`: Dark mode support
- `sw.js`: Update cache version

**IndexedDB Migration:**
- Bump DB version to 2
- Add tags field to existing transactions (default: [])
- Create index on tags (multiEntry: true)

**Testing:**
- Add tags to multiple transactions
- Search for tag, verify filtering
- Test search by amount, notes
- Test tag rename/delete

---

### Version 3.15.0 - Split Transactions (Medium Priority)
**Release Target:** 10-11 weeks after v3.10.1

**Transaction Schema Update:**
```javascript
{
  // ... existing fields ...
  isSplit: boolean,           // New: Is this a split transaction?
  splits: [                    // New: Array of splits (if isSplit = true)
    {
      category: string,
      amount: number,
      notes: string
    }
  ]
}
```

**Implementation:**

1. **Split Transaction Toggle** (in form):
   - Checkbox: "Split this transaction"
   - When checked, show split editor

2. **Split Editor**:
   - List of splits with mini-form for each
   - Add/Remove split buttons
   - **CRITICAL: Enforce balance validation** - splits MUST equal total
   - Each split: Category, Amount, Notes
   - Auto-balance last split option

**NEW: Split Transaction Balance Validation (Accounting Integrity)**

**Why:** Prevent accounting errors where splits don't add up to transaction total.

```javascript
function validateSplitTransaction(transaction) {
  if (!transaction.isSplit || !transaction.splits || transaction.splits.length === 0) {
    return { valid: true };
  }

  const errors = [];

  // 1. Calculate total of splits
  const splitTotal = transaction.splits.reduce((sum, split) => sum + split.amount, 0);

  // 2. Allow 0.01 difference for rounding errors
  const diff = Math.abs(transaction.amount - splitTotal);

  if (diff > 0.01) {
    errors.push({
      field: 'splits',
      message: `Split amounts (${formatCurrency(splitTotal)}) don't match transaction total (${formatCurrency(transaction.amount)}). Difference: ${formatCurrency(diff)}`
    });
  }

  // 3. Validate each split
  transaction.splits.forEach((split, index) => {
    if (!split.category || split.category.trim() === '') {
      errors.push({ field: `splits[${index}].category`, message: `Split ${index + 1}: Category required` });
    }
    if (isNaN(split.amount) || split.amount <= 0) {
      errors.push({ field: `splits[${index}].amount`, message: `Split ${index + 1}: Invalid amount` });
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// UI Helper: Auto-balance last split
function autoBalanceLastSplit(totalAmount, splits) {
  if (splits.length === 0) return [];

  // Calculate sum of all splits except last
  const allButLast = splits.slice(0, -1);
  const manualTotal = allButLast.reduce((sum, s) => sum + s.amount, 0);

  // Automatically set last split to balance
  const lastSplit = splits[splits.length - 1];
  lastSplit.amount = Math.round((totalAmount - manualTotal) * 100) / 100;
  lastSplit.autoAdjusted = true;

  return splits;
}

// Integrate into save function
async function saveTransaction(transaction) {
  // Validate basic fields
  const basicValidation = validateTransaction(transaction);
  if (!basicValidation.valid) {
    showErrors(basicValidation.errors);
    return false;
  }

  // Validate splits if applicable
  if (transaction.isSplit) {
    const splitValidation = validateSplitTransaction(transaction);
    if (!splitValidation.valid) {
      showErrors(splitValidation.errors);
      return false;
    }
  }

  await saveTransactionToDB(transaction);
  return true;
}
```

3. **Display Logic**:
   - Transaction list: Show "📋 Split" badge
   - Click to expand and show all splits
   - Summary calculations include split amounts per category

4. **Analytics Integration**:
   - Category totals include split amounts
   - Budget tracking counts split amounts per category

**Files to Modify:**
- `app.js`: Add split logic, validation, rendering
- `index.html`: Add split editor UI
- `css/styles.css`: Split editor layout, split display
- `css/dark-mode.css`: Dark mode support
- `sw.js`: Update cache version

**IndexedDB Migration:**
- Bump DB version to 3
- Add isSplit and splits fields (default: false, [])

**Testing:**
- Create split transaction: ₹1000 = ₹600 (Food) + ₹400 (Transport)
- Verify total validation
- Verify category reports count splits correctly
- Test edit/delete of split transactions

---

### Version 3.16.0 - Savings Goals (Medium Priority)
**Release Target:** 12-13 weeks after v3.10.1

**New IndexedDB Store:**
```javascript
Store: savingsGoals
{
  id: number,
  name: string,              // "Vacation Fund", "Emergency Fund"
  targetAmount: number,      // Goal amount
  currentAmount: number,     // Tracked manually or auto
  deadline: 'YYYY-MM-DD',    // Target date
  category: string,          // Optional: Link to transaction category
  createdAt: ISO timestamp
}

Indexes:
- deadline (sort by urgency)
```

**Implementation:**

1. **Goals Management** (new section in Summary or Settings):
   - List all goals with progress bars
   - Add/Edit/Delete goals
   - Manual contribution button (add ₹X to goal)

2. **Progress Visualization**:
   - Circular progress indicator
   - Percentage completed
   - Amount remaining
   - Days until deadline

3. **Goal Contribution Tracking**:
   - Option 1: Manual updates (simple)
   - Option 2: Auto-track from income category (complex)
   - Recommend Option 1 for v3.16.0

4. **Milestone Alerts**:
   - Show celebration when 25%, 50%, 75%, 100% reached
   - Notification: "🎉 You're halfway to your Vacation goal!"

**Files to Modify:**
- `app.js`: Add goals store, CRUD operations, progress calculations
- `index.html`: Add goals section, modal for create/edit
- `css/styles.css`: Progress circles, goal cards
- `css/dark-mode.css`: Dark mode support
- `sw.js`: Update cache version

**Testing:**
- Create goal: "Vacation ₹50,000 by Dec 2026"
- Add contributions manually
- Verify progress calculation
- Test deadline approaching warnings

---

### Version 3.17.0 - Receipt Photos (Lower Priority)
**Release Target:** 14-15 weeks after v3.10.1

**New IndexedDB Store:**
```javascript
Store: receipts
{
  id: number,
  transactionId: number,     // Foreign key to transaction
  imageBlob: Blob,           // Compressed image (JPEG, 500KB max)
  fileName: string,          // Original filename
  fileSize: number,          // Bytes
  uploadedAt: ISO timestamp
}

Indexes:
- transactionId (one-to-many: transaction can have multiple receipts)
```

**Storage Management: CRITICAL - Quota Enforcement**

**Browser Storage Limits:**
- Desktop Chrome: ~60% of free disk space
- Mobile Chrome/Safari: ~500MB - 1GB
- Must enforce BEFORE hitting limits

```javascript
// 1. Pre-flight check BEFORE upload
async function canAddReceipt(fileSize) {
  const estimate = await navigator.storage.estimate();
  const available = estimate.quota - estimate.usage;
  const afterUpload = estimate.usage + fileSize;
  const percentUsed = (afterUpload / estimate.quota) * 100;

  if (percentUsed > 95) {
    showCriticalStorageModal('Cannot upload. Storage is critically low. Please delete old receipts.');
    return false;
  }

  if (percentUsed > 90) {
    const confirmed = await showWarningModal('Storage is 90% full. Upload anyway?');
    if (!confirmed) return false;
  }

  if (percentUsed > 80) {
    showStorageWarningBanner('Storage is 80% full. Consider deleting old receipts.');
  }

  return true;
}

// 2. Adaptive compression based on available storage
async function adaptiveCompression(file) {
  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage / estimate.quota) * 100;

  let quality = 0.8;
  if (percentUsed > 90) quality = 0.5;        // Aggressive compression
  else if (percentUsed > 80) quality = 0.6;   // Moderate compression
  else if (percentUsed > 70) quality = 0.7;   // Light compression

  return await compressImage(file, quality);
}

// 3. Proactive cleanup suggestions
async function suggestCleanup() {
  const receipts = await getAllReceipts();
  const oldReceipts = receipts.filter(r => {
    const age = Date.now() - new Date(r.uploadedAt).getTime();
    return age > 365 * 24 * 60 * 60 * 1000; // 1 year
  });

  if (oldReceipts.length > 20) {
    const totalSize = oldReceipts.reduce((sum, r) => sum + r.fileSize, 0);
    const sizeMB = (totalSize / 1024 / 1024).toFixed(1);

    showCleanupModal({
      title: 'Storage Cleanup',
      message: `You have ${oldReceipts.length} receipts older than 1 year (${sizeMB} MB). Delete them?`,
      actions: [
        { label: 'View Receipts', action: () => showReceiptList(oldReceipts) },
        { label: `Delete All (Free ${sizeMB} MB)`, action: () => bulkDeleteReceipts(oldReceipts) },
        { label: 'Not Now', action: () => {} }
      ]
    });
  }
}

// 4. Storage monitoring dashboard (in Settings)
async function renderStorageStatus() {
  const estimate = await navigator.storage.estimate();
  const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
  const totalMB = (estimate.quota / 1024 / 1024).toFixed(1);
  const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

  const receiptsData = await getReceiptsStorage();
  const transactionsData = await getTransactionsStorage();

  return `
    <div class="storage-status ${percentUsed > 80 ? 'warning' : ''}">
      <h3>Storage Usage</h3>
      <div class="storage-bar">
        <div class="storage-used" style="width: ${percentUsed}%"></div>
      </div>
      <p>${usedMB} MB / ${totalMB} MB (${percentUsed}%)</p>

      <div class="storage-breakdown">
        <div>Receipts: ${(receiptsData.size / 1024 / 1024).toFixed(1)} MB (${receiptsData.count} files)</div>
        <div>Transactions: ${(transactionsData.size / 1024).toFixed(1)} KB</div>
      </div>

      ${percentUsed > 80 ? '<button onclick="suggestCleanup()">Clean Up Old Receipts</button>' : ''}
    </div>
  `;
}
```

**Implementation:**

1. **Image Upload** (in transaction form):
   - File input button: "📎 Attach Receipt"
   - Show thumbnail preview
   - Max 500KB (compress if larger)
   - Multiple receipts per transaction

2. **Image Display**:
   - Transaction list: 📷 icon if has receipts
   - Click to open lightbox modal
   - Swipe between multiple receipts
   - Download original button

3. **Storage Monitoring**:
   - Settings: Show total storage used / available
   - Warning banner if >80% quota used
   - Option to delete old receipts

4. **Compression Strategy**:
   - Use Canvas API to resize/compress
   - Target: 800px max width, JPEG quality 0.7
   - Fallback: Reject if still >500KB after compression

**Files to Modify:**
- `app.js`: Add receipts store, image compression, lightbox
- `index.html`: Add file input, storage monitor, lightbox modal
- `css/styles.css`: Lightbox, thumbnails, storage UI
- `css/dark-mode.css`: Dark mode support
- `sw.js`: Update cache version (DO NOT cache receipts)

**IndexedDB Migration:**
- Bump DB version to 4 (or current +1)
- Create receipts store
- No changes to transactions store

**Testing:**
- Upload 2MB image, verify compression to <500KB
- Attach multiple receipts to one transaction
- Check storage quota warning at 80%
- Test on low-storage device
- Verify offline functionality

**Security:**
- Validate file type (image/jpeg, image/png only)
- Sanitize filenames
- No external image hosting (privacy-first)

---

## Version Summary Timeline

| Version | Feature | Priority | Weeks from 3.10.1 | Estimated Release |
|---------|---------|----------|-------------------|-------------------|
| 3.10.2 | **Transaction Validation Layer** (Foundation) | **CRITICAL** | 1 | Late Feb 2026 |
| 3.11.0 | Recurring Transactions + Timezone Handling | **High** | 4-5 (revised) | Mid March 2026 |
| 3.12.0 | **Optional Fields (IDB)** + Reports + Caching | **High** | 7-9 (revised) | Early April 2026 |
| 3.13.0 | Budget Limits + Rollover Logic | **High** | 11-13 (revised) | Late April 2026 |
| 3.14.0 | Tags & Search | Medium | 14-16 | Mid May 2026 |
| 3.15.0 | Split Transactions + Balance Validation | Medium | 17-19 | Late May 2026 |
| 3.16.0 | Savings Goals | Medium | 20-22 | Mid June 2026 |
| 3.17.0 | Receipt Photos + Quota Management | Low | 24-26 | Early July 2026 |

**Revised Timeline Notes:**
- Added v3.10.2 (validation layer) - MUST implement first
- Increased estimates to account for:
  - Timezone handling (v3.11.0)
  - IndexedDB migration complexity (v3.12.0)
  - Report caching implementation (v3.12.0)
  - Budget rollover logic (v3.13.0)
  - Split transaction validation (v3.15.0)
  - Storage quota enforcement (v3.17.0)

**Total Timeline: ~6 months** (more realistic than original ~4 months)

## Database Schema Evolution

**Current (v3.10.1):**
- DB Version: 1
- Stores: transactions
- Fields: id, type, amount, category, date, notes, createdAt

**v3.10.2 - Transaction Validation Layer (Foundation):**
- DB Version: 1 (no schema changes)
- Add validation layer (JavaScript only - no DB changes)

**v3.11.0 - Recurring Transactions:**
- DB Version: 2
- New Store: recurringTemplates
  - Fields: id, type, amount, category, notes, frequency, dayOfMonth, executionTime, timezone, startDate, nextDueDate, lastExecuted, enabled, skipWeekends, createdAt
  - Indexes: nextDueDate, enabled

**v3.12.0 - Optional Fields + Reports:** ⚠️ **CRITICAL FIX**
- DB Version: 3 (MUST bump from 2→3, not stay at 2)
- New Store: appSettings
  - Single document: { id: 'config', enabledFields: {...}, appVersion, lastUpdated }
  - No indexes (single document)
- Update: transactions gets 7 optional fields (all nullable):
  - `paymentMethod`, `account`, `merchant`, `expenseType`, `attachedTo`, `referenceId`, `location`
- **CRITICAL:** enabledFields moved from localStorage to IndexedDB for data integrity

**v3.13.0 - Budget Limits + Rollover:**
- DB Version: 4
- New Store: budgets
  - Fields: id, category, monthlyLimit, alertThreshold, rolloverEnabled, rolloverBalance, budgetType, resetDay, createdAt, updatedAt
  - Indexes: category

**v3.14.0 - Tags & Search:**
- DB Version: 5
- Update: transactions gets `tags: string[]` field
- New Index: tags (multiEntry: true)

**v3.15.0 - Split Transactions:**
- DB Version: 6
- Update: transactions gets `isSplit: boolean`, `splits: array` fields
- Add split transaction balance validation

**v3.16.0 - Savings Goals:**
- DB Version: 7
- New Store: savingsGoals
  - Fields: id, name, targetAmount, currentAmount, deadline, category, createdAt
  - Indexes: deadline

**v3.17.0 - Receipt Photos:**
- DB Version: 8
- New Store: receipts
  - Fields: id, transactionId, imageBlob, fileName, fileSize, uploadedAt
  - Indexes: transactionId
- Add storage quota management system

## Storage Estimates (per 1000 transactions)

| Data Type | Size per Item | 1000 Items |
|-----------|--------------|------------|
| Transactions (core fields only) | ~150 bytes | ~150 KB |
| Transactions (with ALL optional fields) | ~250 bytes | ~250 KB |
| Recurring Templates | ~150 bytes | ~15 KB (assume 100 templates) |
| Budgets | ~100 bytes | ~2 KB (20 categories max) |
| Savings Goals | ~150 bytes | ~3 KB (20 goals max) |
| Receipts (500KB each) | 500 KB | 50 MB (100 receipts) |

**Total for Active User (1000 transactions, 100 receipts):**
- Core fields only: ~150 KB
- With ALL optional fields enabled: ~250 KB
- With receipts: ~50 MB
- Still well within 50-100MB IndexedDB quota

**Optional Fields Overhead:**
- Payment Method: ~10-20 bytes
- Account: ~20-30 bytes
- Merchant: ~20-50 bytes
- Expense Type: ~10-20 bytes
- Attached To: ~10-20 bytes
- Reference ID: ~20-50 bytes
- Location: ~10-20 bytes
- **Total overhead: ~100 bytes per transaction** (negligible)

**Receipt Storage Reality Check:**
- Conservative 500KB limit = ~200-500 receipts per device (safe)
- Most users won't attach receipts to every transaction
- Can add cleanup: "Delete receipts older than 1 year?"

## Testing Strategy

**For Each Release:**

1. **Unit Tests** (in test repo):
   - Data validation functions
   - Calculation accuracy
   - Edge cases (empty data, negative amounts)

2. **Manual Tests**:
   - Feature works as expected
   - Offline functionality maintained
   - Dark mode support
   - Responsive on mobile (<480px)
   - Accessibility (keyboard nav, screen reader)

3. **Migration Tests**:
   - Upgrade from previous version preserves data
   - New fields have sensible defaults
   - No data loss

4. **Performance Tests**:
   - Load time with 1000+ transactions
   - Filtering/search speed
   - IndexedDB query performance

## Version Update Protocol

**For EACH release, update these 3 files:**

1. **app.js** - Line 2:
   ```javascript
   const APP_VERSION = '3.11.0';
   ```

2. **sw.js** - Line 1-4:
   ```javascript
   // Version: 3.11.0
   const CACHE_NAME = 'finchronicle-v3.11.0';
   ```

3. **manifest.json**:
   ```json
   "version": "3.11.0"
   ```

## Maintenance Between Releases

- Update CHANGELOG.md with features, fixes, technical details
- Update CLAUDE.md if new patterns introduced
- Create feature documentation in `docs/` folder
- Run validation: `python3 -m http.server 8000`
- Test offline mode (Network tab → Offline checkbox)
- Test on iOS Safari and Chrome Mobile

## Risks & Mitigation

**Risk 1: Storage Quota Exceeded (Receipts)**
- Mitigation: Conservative 500KB limit, compression, storage monitoring
- Fallback: Allow deletion of old receipts

**Risk 2: Performance Degradation (Large Datasets)**
- Mitigation: Proper IndexedDB indexes, pagination (already exists)
- Fallback: Lazy-loading, virtual scrolling if needed

**Risk 3: Complex Features Break Simplicity**
- Mitigation: Keep UI clean, hide advanced features in collapsible sections
- Philosophy: Progressive disclosure (simple by default, powerful when needed)

**Risk 4: IndexedDB Migration Failures**
- Mitigation: Test migrations thoroughly, maintain backward compatibility
- Fallback: Export/import data if migration fails

## Philosophy Preservation

Throughout all releases, maintain core principles:

✅ **Zero dependencies** (except Remix Icon CDN)
✅ **No frameworks** - Pure vanilla JS
✅ **No build tools** - Direct file serving
✅ **100% offline-first** - Works without internet
✅ **Privacy-first** - All data stays on device
✅ **No backend** - Client-side only
✅ **Progressive disclosure** - Simple by default, powerful when needed (via Optional Fields)

## Key Innovation: Optional Fields System 🎯

The **Optional Fields System** (v3.12.0) is a game-changing feature that solves a fundamental problem:

**Problem:** Different users need different fields. Power users want detailed tracking (payment method, account, merchant), while simple users just want amount + category.

**Solution:** User-controlled optional fields that can be toggled on/off in settings.

**Benefits:**
1. **Flexibility:** App adapts to user sophistication level
2. **No bloat:** Transaction form stays clean for basic users
3. **Data safety:** Disabling field hides it but doesn't delete data
4. **Future-proof:** Easy to add more optional fields without redesign
5. **Analytics scale:** Reports dynamically adjust based on enabled fields
6. **Privacy:** Location tracking is opt-in, not forced

**7 Optional Fields Available:**
- 💳 Payment Method (cash, UPI, credit card, etc.)
- 🏦 Account/Source (which bank account/card)
- 🏪 Merchant/Vendor (who you paid)
- 📊 Expense Type (personal, business, tax-deductible)
- 👥 Attached To (family member)
- 🔢 Reference/Transaction ID (UPI ID, invoice)
- 📍 Location (city/area)

**Edge Cases Handled:**
- ✅ Disable field → data preserved (hidden, not deleted)
- ✅ Edit old transaction → temporarily show disabled field with data
- ✅ Re-enable field → old data reappears instantly
- ✅ Analytics → conditional rendering, no crashes
- ✅ CSV export → includes columns if data exists

This approach mirrors professional accounting software (QuickBooks, FreshBooks) and makes FinChronicle scalable from casual users to power users.

## Next Steps

1. ✅ **Review this plan with user** - COMPLETE
2. **Start with v3.11.0 (Recurring Transactions)**
3. **Implement v3.12.0 (Optional Fields + Reports)** - Critical foundation
4. **Continue through v3.13.0 to v3.17.0**
5. **Release and gather feedback**
6. **Iterate based on user needs**

---

**Plan Complete!** Ready to proceed with implementation.

**Last Updated:** 2026-02-18
**Planned Completion:** June 2026 (all 7 versions)
