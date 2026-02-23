# FinChronicle v4.0 - UI/UX Changes Guide

## Overview

The transition from v3 (single-entry) to v4 (double-entry) requires significant UI/UX changes:
- **Simpler for users** - we hide double-entry complexity
- **Same form** - but with better labels and education
- **New displays** - show accounts and balances instead of categories
- **Guided education** - 3-stage approach (modal → tooltips → tips)

---

## 1. Form Changes: Transaction Input

### v3 Form (Single-Entry) - Current
```html
<!-- REMOVE THIS -->
<form id="transaction-form">
  <input type="date" name="date" required>
  <select name="type">
    <option value="income">Income</option>
    <option value="expense">Expense</option>
  </select>
  <input type="text" name="category" placeholder="Category">
  <input type="number" name="amount" placeholder="Amount">
  <textarea name="notes" placeholder="Notes"></textarea>
  <button>Add Transaction</button>
</form>

<!-- v3 Output: Single record
{ type: 'expense', amount: 500, category: 'Groceries' }
-->
```

### v4 Form (Double-Entry) - New
```html
<!-- ADD THIS (same fields, better UX) -->
<form id="transaction-form" class="transaction-form">
  <div class="form-section">
    <div class="form-header">
      <h3>Add Transaction</h3>
      <button type="button" class="help-btn" title="Help">?</button>
    </div>
    
    <!-- Date -->
    <div class="form-group">
      <label for="date">Date</label>
      <input 
        type="date" 
        id="date" 
        name="date" 
        required
        title="When did this happen?"
      >
      <span data-error="date" class="error-message"></span>
    </div>

    <!-- Type Toggle -->
    <div class="form-group">
      <label>Type</label>
      <div class="type-toggle">
        <button 
          type="button" 
          class="type-btn type-expense active"
          data-type="expense"
          title="Money going OUT"
        >
          💸 Expense
        </button>
        <button 
          type="button" 
          class="type-btn type-income"
          data-type="income"
          title="Money coming IN"
        >
          💰 Income
        </button>
      </div>
      <input type="hidden" id="type" name="type" value="expense">
      <span data-error="type" class="error-message"></span>
    </div>

    <!-- Category (Auto-populated from accounts) -->
    <div class="form-group">
      <label for="category">
        Category
        <span class="tooltip-icon" title="Where this money goes/comes from">ℹ️</span>
      </label>
      <select 
        id="category" 
        name="category" 
        required
        class="category-select"
      >
        <option value="">Select category...</option>
      </select>
      <span data-error="category" class="error-message"></span>
      <small class="category-hint">Expenses: Groceries, Rent, etc. | Income: Salary, Bonus, etc.</small>
    </div>

    <!-- Amount -->
    <div class="form-group">
      <label for="amount">
        Amount (<span id="currency-display">₹</span>)
        <span class="tooltip-icon" title="How much money">ℹ️</span>
      </label>
      <div class="amount-input-wrapper">
        <span id="currency-symbol">₹</span>
        <input 
          type="number" 
          id="amount" 
          name="amount" 
          placeholder="0.00"
          step="0.01"
          min="0"
          required
          class="amount-input"
          title="Enter amount (e.g., 500 or 1500.50)"
        >
      </div>
      <span data-error="amount" class="error-message"></span>
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label for="notes">
        Notes (Optional)
        <span class="tooltip-icon" title="Why? Where? Details?">ℹ️</span>
      </label>
      <textarea 
        id="notes" 
        name="notes" 
        placeholder="e.g., 'Weekly groceries at supermarket'"
        maxlength="500"
        rows="2"
      ></textarea>
      <span data-error="notes" class="error-message"></span>
      <small id="notes-counter">0/500</small>
    </div>
  </div>

  <!-- Hidden field for account -->
  <input type="hidden" id="bankAccount" name="bankAccount" value="1100">

  <!-- Submit Button -->
  <div class="form-actions">
    <button type="submit" id="submit-btn" class="btn btn-primary">
      <span class="btn-icon">+</span>
      <span class="btn-text">Add Transaction</span>
    </button>
    <button type="button" class="btn btn-secondary" onclick="resetTransactionForm()">
      Clear
    </button>
  </div>

  <!-- Info Box -->
  <div class="form-info">
    <strong>💡 How it works:</strong>
    <p>We automatically create accounting entries. Your expense goes to cash, income comes from accounts.</p>
    <small><a href="#" onclick="showEducationModal()">Learn more about double-entry →</a></small>
  </div>
</form>

<!-- v4 Output: Double-entry journal entry
{
  date: '2026-02-23',
  entries: [
    { accountId: '5000', debit: 500, credit: 0 },      // Groceries (expense up)
    { accountId: '1100', debit: 0, credit: 500 }       // Checking (asset down)
  ],
  notes: 'Weekly groceries at supermarket',
  type: 'transaction'
}
-->
```

### Form Styling (CSS Updates)
```css
/* Type toggle - visual improvement */
.type-toggle {
  display: flex;
  gap: 10px;
  border-radius: 8px;
  background: var(--color-bg-light);
  padding: 4px;
}

.type-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.type-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.type-btn.type-expense.active {
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.type-btn.type-income.active {
  background: var(--color-success);
  border-color: var(--color-success);
}

/* Amount input with currency */
.amount-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
}

.amount-input-wrapper #currency-symbol {
  font-weight: bold;
  color: var(--color-text-secondary);
  font-size: 18px;
}

.amount-input {
  border: none;
  flex: 1;
  font-size: 16px;
  text-align: right;
  font-family: var(--font-family-mono);
  font-variant-numeric: tabular-nums;
}

/* Help tooltip */
.tooltip-icon {
  cursor: help;
  opacity: 0.6;
  margin-left: 4px;
}

.tooltip-icon:hover {
  opacity: 1;
}

/* Form info box */
.form-info {
  background: var(--color-info-bg);
  border-left: 4px solid var(--color-primary);
  padding: 12px 16px;
  border-radius: 4px;
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.5;
}

.form-info strong {
  display: block;
  margin-bottom: 4px;
}

.form-info small {
  display: block;
  margin-top: 8px;
}

/* Error states */
.form-group.error input,
.form-group.error select,
.form-group.error textarea {
  border-color: var(--color-danger);
  background-color: rgba(255, 59, 48, 0.05);
}

.error-message {
  color: var(--color-danger);
  font-size: 12px;
  display: block;
  margin-top: 4px;
}
```

---

## 2. Migration UI: First-Time User Onboarding

### Migration Modal (shown on first v4 load)
```html
<!-- Show if: Migration.getMigrationStatus().isMigrated === false -->
<div id="migration-modal" class="modal modal-full show">
  <div class="modal-content modal-large">
    
    <!-- Header -->
    <div class="modal-header">
      <h2>🎉 Welcome to FinChronicle v4.0</h2>
      <p class="modal-subtitle">Upgraded to Professional Accounting</p>
    </div>

    <!-- Progress Indicator -->
    <div class="migration-progress">
      <div class="progress-step complete">
        <div class="progress-circle">✓</div>
        <p>Backup Created</p>
      </div>
      <div class="progress-step active">
        <div class="progress-circle">2</div>
        <p>Converting Data</p>
      </div>
      <div class="progress-step">
        <div class="progress-circle">3</div>
        <p>Verifying</p>
      </div>
      <div class="progress-step">
        <div class="progress-circle">✓</div>
        <p>Complete</p>
      </div>
    </div>

    <!-- Content -->
    <div class="modal-body">
      <div class="migration-info">
        <h3>What's New?</h3>
        <ul>
          <li><strong>Professional Accounting:</strong> Now using double-entry accounting</li>
          <li><strong>More Accurate:</strong> Every transaction is balanced automatically</li>
          <li><strong>Better Reports:</strong> Net worth, account balances, and more</li>
          <li><strong>Safer Data:</strong> Built-in checks prevent data corruption</li>
        </ul>

        <h3>What Happens to Your Data?</h3>
        <ul>
          <li>✅ All existing transactions will be automatically converted</li>
          <li>✅ Your data is backed up before conversion</li>
          <li>✅ No data is lost or deleted</li>
          <li>⚠️ This conversion is ONE-WAY (cannot go back to v3)</li>
        </ul>

        <h3>How to Use?</h3>
        <p>Just like before! The form is the same:</p>
        <ul>
          <li>Set date, type (income/expense), category, amount, notes</li>
          <li>We handle the accounting in the background</li>
          <li>You get better insights automatically</li>
        </ul>
      </div>

      <!-- Stats -->
      <div class="migration-stats">
        <div class="stat-box">
          <div class="stat-number" id="migration-count">0</div>
          <div class="stat-label">Transactions to Convert</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">0</div>
          <div class="stat-label">Accounts Created</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">✓</div>
          <div class="stat-label">Backup Created</div>
        </div>
      </div>

      <!-- Warnings -->
      <div class="alert alert-warning">
        <strong>⚠️ Important:</strong>
        <p>Make sure you have internet connection before starting. This process takes a few moments.</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="modal-footer">
      <button 
        type="button" 
        class="btn btn-secondary"
        onclick="skipMigration()"
      >
        Remind Me Later
      </button>
      <button 
        type="button" 
        class="btn btn-primary btn-large"
        id="start-migration-btn"
        onclick="startMigration()"
      >
        <span class="btn-icon">→</span>
        Upgrade Now
      </button>
    </div>
  </div>
</div>

<!-- Migration Progress (during conversion) -->
<div id="migration-progress-modal" class="modal modal-progress hidden">
  <div class="modal-content modal-small">
    <div class="modal-body text-center">
      <div class="loading-spinner"></div>
      <p id="migration-status">Converting your transactions...</p>
      <div class="progress-bar">
        <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
      </div>
      <small id="progress-detail">0 of 0 transactions</small>
    </div>
  </div>
</div>

<!-- Migration Complete -->
<div id="migration-complete-modal" class="modal modal-success hidden">
  <div class="modal-content modal-small">
    <div class="modal-body text-center">
      <div class="success-icon">✅</div>
      <h3>Migration Complete!</h3>
      <p id="migration-result">Successfully converted XX transactions</p>
      <p class="text-muted">Your data is safe and ready to use.</p>
      <button 
        type="button" 
        class="btn btn-primary"
        onclick="closeMigrationModal()"
      >
        Get Started
      </button>
    </div>
  </div>
</div>
```

---

## 3. Updated Transaction List Display

### v3 List (Simple)
```html
<!-- REMOVE THIS -->
<div class="transaction-item">
  <span>2026-02-23</span>
  <span>Groceries</span>
  <span>Expense</span>
  <span>₹500</span>
</div>
```

### v4 List (Enhanced)
```html
<!-- ADD THIS -->
<div class="transactions-list">
  <!-- Filter Bar -->
  <div class="list-controls">
    <div class="filter-group">
      <select id="filter-month" class="filter-select">
        <option value="all">All Months</option>
        <option value="2026-02" selected>February 2026</option>
        <option value="2026-01">January 2026</option>
      </select>
      
      <select id="filter-type" class="filter-select">
        <option value="all">All Types</option>
        <option value="expense">Expenses Only</option>
        <option value="income">Income Only</option>
      </select>

      <select id="filter-category" class="filter-select">
        <option value="all">All Categories</option>
        <option value="5000">Groceries</option>
        <option value="5200">Transport</option>
        <option value="5300">Utilities</option>
      </select>
    </div>

    <button class="btn-icon" onclick="toggleListView()" title="Toggle view">📊</button>
  </div>

  <!-- Summary for current filter -->
  <div class="list-summary">
    <div class="summary-card">
      <div class="summary-label">Income</div>
      <div class="summary-amount income">₹0.00</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Expenses</div>
      <div class="summary-amount expense">₹5,000.00</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Net</div>
      <div class="summary-amount">−₹5,000.00</div>
    </div>
  </div>

  <!-- Transaction items -->
  <div class="transaction-items">
    <div class="transaction-item expense">
      <div class="transaction-left">
        <div class="transaction-date">23 Feb</div>
        <div class="transaction-category">
          <span class="category-icon">🛒</span>
          <span class="category-name">Groceries</span>
        </div>
      </div>
      
      <div class="transaction-middle">
        <div class="transaction-notes">Weekly groceries at supermarket</div>
        <div class="transaction-meta">
          <span class="transaction-id">ID: #je_123456</span>
          <span class="transaction-badge">Double-entry</span>
        </div>
      </div>

      <div class="transaction-right">
        <div class="transaction-amount expense">−₹500.00</div>
        <div class="transaction-actions">
          <button 
            class="btn-icon small" 
            onclick="editTransaction('je_123456')"
            title="Edit"
          >
            ✏️
          </button>
          <button 
            class="btn-icon small danger" 
            onclick="deleteTransaction('je_123456')"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <div class="transaction-item expense">
      <div class="transaction-left">
        <div class="transaction-date">23 Feb</div>
        <div class="transaction-category">
          <span class="category-icon">🚗</span>
          <span class="category-name">Transport</span>
        </div>
      </div>
      
      <div class="transaction-middle">
        <div class="transaction-notes">Uber to office</div>
        <div class="transaction-meta">
          <span class="transaction-id">ID: #je_123455</span>
        </div>
      </div>

      <div class="transaction-right">
        <div class="transaction-amount expense">−₹350.00</div>
        <div class="transaction-actions">
          <button class="btn-icon small" onclick="editTransaction('je_123455')">✏️</button>
          <button class="btn-icon small danger" onclick="deleteTransaction('je_123455')">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button class="btn-text" onclick="previousPage()">« Previous</button>
      <span class="page-info">Page 1 of 5 (20 of 100 transactions)</span>
      <button class="btn-text" onclick="nextPage()">Next »</button>
    </div>
  </div>
</div>

<!-- List Styling -->
<style>
.transaction-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.transaction-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.transaction-item.income {
  border-left: 4px solid var(--color-success);
}

.transaction-item.expense {
  border-left: 4px solid var(--color-danger);
}

.transaction-amount {
  font-family: var(--font-family-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  min-width: 100px;
  text-align: right;
}

.transaction-amount.income {
  color: var(--color-success);
}

.transaction-amount.expense {
  color: var(--color-danger);
}

.transaction-badge {
  background: var(--color-primary);
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
</style>
```

---

## 4. New Views: Accounts & Trial Balance

### Accounts Tab
```html
<!-- NEW TAB: Show accounts and balances -->
<div id="accounts-tab" class="tab-panel hidden">
  <div class="tab-header">
    <h2>Accounts</h2>
    <button class="btn-secondary" onclick="addCustomAccount()">
      + Add Account (v4.1)
    </button>
  </div>

  <!-- Account Type Groups -->
  <div class="accounts-view">
    <!-- Assets -->
    <div class="account-type-group">
      <div class="group-header">
        <h3>💰 Assets (What I Own)</h3>
        <span class="group-total" id="total-assets">₹0.00</span>
      </div>
      <div class="account-list">
        <div class="account-item">
          <div class="account-info">
            <div class="account-name">Checking Account</div>
            <small class="account-meta">ID: 1100 | Active</small>
          </div>
          <div class="account-balance">₹25,000.00</div>
          <button class="btn-icon" onclick="manageAccount('1100')">⚙️</button>
        </div>

        <div class="account-item">
          <div class="account-info">
            <div class="account-name">Savings Account</div>
            <small class="account-meta">ID: 1200 | Active</small>
          </div>
          <div class="account-balance">₹50,000.00</div>
          <button class="btn-icon" onclick="manageAccount('1200')">⚙️</button>
        </div>

        <div class="account-item">
          <div class="account-info">
            <div class="account-name">Cash (บาท)</div>
            <small class="account-meta">ID: 1000 | Active</small>
          </div>
          <div class="account-balance">₹3,500.00</div>
          <button class="btn-icon" onclick="manageAccount('1000')">⚙️</button>
        </div>
      </div>
    </div>

    <!-- Liabilities -->
    <div class="account-type-group">
      <div class="group-header">
        <h3>💳 Liabilities (What I Owe)</h3>
        <span class="group-total negative" id="total-liabilities">−₹8,000.00</span>
      </div>
      <div class="account-list">
        <div class="account-item">
          <div class="account-info">
            <div class="account-name">Credit Card Debt</div>
            <small class="account-meta">ID: 2000 | Active</small>
          </div>
          <div class="account-balance negative">−₹8,000.00</div>
          <button class="btn-icon" onclick="manageAccount('2000')">⚙️</button>
        </div>
      </div>
    </div>

    <!-- Net Worth -->
    <div class="net-worth-card">
      <div class="nw-label">Total Net Worth</div>
      <div class="nw-amount">₹70,500.00</div>
      <div class="nw-breakdown">
        <span class="nw-assets">Assets: ₹78,500</span>
        <span class="nw-minus">−</span>
        <span class="nw-liabilities">Liabilities: ₹8,000</span>
      </div>
    </div>

    <!-- Income & Expense Accounts (read-only) -->
    <div class="account-type-group">
      <div class="group-header">
        <h3>📊 Expense Categories</h3>
        <button class="btn-text" onclick="customizeCategories()">Manage</button>
      </div>
      <div class="account-list compact">
        <div class="account-item">Groceries (5000)</div>
        <div class="account-item">Transport (5200)</div>
        <div class="account-item">Utilities (5300)</div>
        <div class="account-item">+ 10 more categories</div>
      </div>
    </div>
  </div>
</div>

<!-- Account Management Modal -->
<div id="account-modal" class="modal modal-medium hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Manage Account</h3>
      <button class="modal-close">&times;</button>
    </div>
    
    <div class="modal-body">
      <div class="form-group">
        <label for="account-name">Account Name</label>
        <input type="text" id="account-name" value="Checking Account">
        <small>Note: In v4.0, you can rename but not change account type</small>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" id="account-active" checked>
          Active (show in forms)
        </label>
      </div>

      <div class="account-stats">
        <div class="stat">
          <div class="stat-label">Current Balance</div>
          <div class="stat-value">₹25,000.00</div>
        </div>
        <div class="stat">
          <div class="stat-label">Transactions</div>
          <div class="stat-value">45</div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveAccountChanges()">Save Changes</button>
    </div>
  </div>
</div>
```

### Reports Tab: Trial Balance View
```html
<!-- NEW TAB: Financial Reports -->
<div id="reports-tab" class="tab-panel hidden">
  <div class="reports-grid">
    
    <!-- Trial Balance -->
    <div class="report-card">
      <div class="report-header">
        <h3>Trial Balance</h3>
        <span class="report-date">as of today</span>
      </div>
      
      <div class="trial-balance-table">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th class="text-right">Debits</th>
              <th class="text-right">Credits</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Checking Account</td>
              <td class="text-right">₹25,000</td>
              <td class="text-right">—</td>
            </tr>
            <tr>
              <td>Groceries Expense</td>
              <td class="text-right">₹5,000</td>
              <td class="text-right">—</td>
            </tr>
            <!-- More rows -->
            <tr class="total-row">
              <td><strong>TOTALS</strong></td>
              <td class="text-right"><strong>₹150,000</strong></td>
              <td class="text-right"><strong>₹150,000</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Status indicator -->
      <div class="trial-balance-status success">
        ✅ <strong>Trial Balance Verified</strong>
        <small>Debits = Credits (₹150,000)</small>
      </div>
    </div>

    <!-- Monthly Summary -->
    <div class="report-card">
      <div class="report-header">
        <h3>Monthly Summary</h3>
        <select class="month-select">
          <option>February 2026</option>
          <option>January 2026</option>
        </select>
      </div>

      <div class="summary-stats">
        <div class="stat-box">
          <div class="stat-icon income">💰</div>
          <div class="stat-content">
            <div class="stat-label">Income</div>
            <div class="stat-value">₹50,000</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon expense">💸</div>
          <div class="stat-content">
            <div class="stat-label">Expenses</div>
            <div class="stat-value">₹15,000</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon neutral">📊</div>
          <div class="stat-content">
            <div class="stat-label">Net Savings</div>
            <div class="stat-value">₹35,000</div>
            <small class="stat-percent">70% savings rate</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Expense Breakdown -->
    <div class="report-card">
      <div class="report-header">
        <h3>Top Expenses</h3>
      </div>

      <div class="expense-breakdown">
        <div class="expense-row">
          <div class="expense-category">
            <span class="category-icon">🏠</span>
            <span class="category-name">Rent</span>
          </div>
          <div class="expense-bar">
            <div class="bar-fill" style="width: 45%"></div>
          </div>
          <div class="expense-amount">₹6,750 (45%)</div>
        </div>

        <div class="expense-row">
          <div class="expense-category">
            <span class="category-icon">🛒</span>
            <span class="category-name">Groceries</span>
          </div>
          <div class="expense-bar">
            <div class="bar-fill" style="width: 25%"></div>
          </div>
          <div class="expense-amount">₹3,750 (25%)</div>
        </div>

        <!-- More rows -->
      </div>
    </div>
  </div>
</div>
```

---

## 5. Education UI: Tooltips & Help System

### Inline Tooltips
```html
<!-- Throughout forms and lists -->
<span class="tooltip-icon" title="Double-entry creates balanced accounting entries automatically">ℹ️</span>

<!-- On hover, show helpful context -->
<div class="tooltip-text">
  <strong>What's Double-Entry?</strong>
  <p>Every transaction affects two accounts: one goes up, one goes down. 
     This is how professional accountants work!</p>
</div>
```

### Help Modal
```html
<!-- Accessible via "?" button or help menu -->
<div id="help-modal" class="modal modal-large hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h2>❓ Help & Tutorials</h2>
    </div>

    <div class="help-tabs">
      <button class="help-tab active" onclick="selectHelpTab('basics')">
        Basics
      </button>
      <button class="help-tab" onclick="selectHelpTab('accounting')">
        How it Works
      </button>
      <button class="help-tab" onclick="selectHelpTab('faq')">
        FAQ
      </button>
      <button class="help-tab" onclick="selectHelpTab('troubleshoot')">
        Troubleshooting
      </button>
    </div>

    <!-- Basics Tab -->
    <div id="basics-tab" class="help-content">
      <h3>Getting Started</h3>
      <ol>
        <li>
          <strong>Add a transaction</strong>
          <p>Click the form, enter date, type (income/expense), category, amount, notes</p>
        </li>
        <li>
          <strong>View your transactions</strong>
          <p>See all transactions in the list, filter by month/category</p>
        </li>
        <li>
          <strong>Check your net worth</strong>
          <p>View how much you have after debts in the Accounts tab</p>
        </li>
        <li>
          <strong>Review reports</strong>
          <p>Monthly summary, trial balance, expense breakdown in Reports tab</p>
        </li>
      </ol>
    </div>

    <!-- How it Works Tab -->
    <div id="accounting-tab" class="help-content hidden">
      <h3>Understanding Double-Entry Accounting</h3>
      <p><strong>Why double-entry?</strong> It's more accurate and professional.</p>

      <h4>Example: Buying Groceries</h4>
      <p>When you spend ₹500 on groceries:</p>
      <ul>
        <li>Your <strong>Checking</strong> account decreases by ₹500 (credit)</li>
        <li>Your <strong>Groceries</strong> expense increases by ₹500 (debit)</li>
      </ul>
      <p>Both sides balance: −₹500 = +₹500 ✓</p>

      <h4>Example: Receiving Salary</h4>
      <p>When you earn ₹50,000 salary:</p>
      <ul>
        <li>Your <strong>Checking</strong> account increases by ₹50,000 (debit)</li>
        <li>Your <strong>Salary</strong> income increases by ₹50,000 (credit)</li>
      </ul>
      <p>Both sides balance: +₹50,000 = +₹50,000 ✓</p>
    </div>

    <!-- FAQ Tab -->
    <div id="faq-tab" class="help-content hidden">
      <div class="faq-item">
        <h4>Q: Can I edit past transactions?</h4>
        <p>A: Yes, click edit on any transaction. Changes automatically update your trial balance.</p>
      </div>
      <div class="faq-item">
        <h4>Q: What about credit card spending?</h4>
        <p>A: Create a "CC Payment" transaction when paying off the card. 
           We track your CC debt as a liability.</p>
      </div>
      <div class="faq-item">
        <h4>Q: Why does my trial balance not verify?</h4>
        <p>A: This shouldn't happen! We prevent unbalanced entries. If it does, contact support.</p>
      </div>
    </div>
  </div>
</div>
```

---

## 6. Mobile Responsive Updates

### Mobile Form (Stack layout)
```css
/* Mobile: Stack everything vertically */
@media (max-width: 480px) {
  .type-toggle {
    flex-direction: column;
  }

  .type-btn {
    width: 100%;
  }

  .transaction-item {
    flex-direction: column;
    gap: 8px;
  }

  .amount-input-wrapper {
    width: 100%;
  }

  .form-group {
    width: 100%;
  }

  /* Number keyboard on mobile */
  .amount-input {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
```

---

## 7. Dark Mode Compatibility

All new UI elements support dark mode via CSS variables:

```css
:root {
  /* Light mode - existing */
  --color-bg: #f5f5f7;
  --color-surface: #ffffff;
  --color-border: #e5e5ea;
  --color-info-bg: #e8f5ff;
}

body.dark-mode {
  /* Dark mode - new */
  --color-bg: #000000;
  --color-surface: #1c1c1e;
  --color-border: #424245;
  --color-info-bg: #0a2a50;
}
```

---

## 8. Summary of Changes

### HTML Changes
- [ ] Update form: Add type toggle, improve labels
- [ ] Add filter controls to transaction list
- [ ] Create Accounts tab with balances
- [ ] Create Reports tab with trial balance
- [ ] Add migration modal
- [ ] Add help modal

### CSS Changes
- [ ] Add form styling (type toggle, amount input)
- [ ] Update transaction list styling
- [ ] Add accounts view styling
- [ ] Add reports view styling
- [ ] Ensure dark mode compatibility
- [ ] Mobile responsive updates

### JavaScript Changes
- [ ] Update form submission (call ui-helpers.js functions)
- [ ] Update transaction display (use formatEntriesForDisplay)
- [ ] Add account management handlers
- [ ] Add migration UI handlers
- [ ] Add help system interactions
- [ ] Update tab navigation

---

## Implementation Priority

**Phase 1 (Critical - v4.0.0):**
1. Update form UI and handlers
2. Update transaction list display
3. Add migration modal
4. Add accounts view with balances

**Phase 2 (Important - v4.0.1):**
5. Add reports/trial balance view
6. Add help system
7. Mobile responsive testing
8. Dark mode verification

**Phase 3 (Nice-to-have - v4.1):**
9. Custom account creation UI
10. Advanced filtering options
11. Chart visualizations
12. Mobile app features

---

**Ready to implement?** Start with the form and transaction list - these are the core UX changes that users will see immediately.
