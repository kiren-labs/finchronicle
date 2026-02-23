# app.js Integration Guide - Phase 2

This file shows exactly what to modify in app.js to integrate the v4.0 backend code modules.

## Overview

The v3 app.js will be significantly refactored for v4.0 but maintains the same structure:

1. **Initialization** - Initialize DB and check for migration
2. **Event Listeners** - Hook form and button events (new handlers)
3. **UI Updates** - Refresh views after data changes (enhanced)
4. **Utilities** - Formatting and helpers (mostly same)

---

## 1. Global Variables (REPLACE)

### REMOVE:
```javascript
// OLD v3 globals - DELETE
let db = null;
let transactions = [];
let currentTab = 'add';
let selectedMonth = 'all';
let selectedCategory = 'all';
let selectedType = 'all';
let editingId = null;
let currentPage = 1;
const itemsPerPage = 20;
```

### REPLACE WITH:
```javascript
// v4.0 Global Variables
const APP_VERSION = '4.0.0';
const CURRENCY_CODES = {
  'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
  'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr',
  'NZD': 'NZ$', 'MXN': '$', 'SGD': 'S$', 'HKD': 'HK$', 'NOK': 'kr',
  'KRW': '₩', 'TRY': '₺', 'RUB': '₽', 'BRL': 'R$', 'ZAR': 'R'
};

// Database
let db = null;  // IndexedDB connection (initialized by initDB())

// Application State
let currentTab = 'add';           // Active tab
let editingId = null;             // ID of transaction being edited (null = new)
let isMigrationInProgress = false;  // Migration flag
let selectedCurrency = 'INR';     // User's selected currency

// Filter State (for list view)
let selectedMonth = 'current';    // Month filter
let selectedType = 'all';         // Type filter: 'all', 'income', 'expense'
let selectedCategory = 'all';     // Category filter

// Pagination
let currentPage = 1;
const itemsPerPage = 20;

// Cache for UI
let cachedAccounts = [];          // Cache all accounts for selection
let cachedCategories = {};        // Cache categories by type: {expense: [...], income: [...]}
let lastFilteredTransactions = []; // Cache filtered results

// In-memory transaction cache (for display only, never mutate!)
let allTransactions = [];         // All transactions from IndexedDB
```

---

## 2. Initialization (REPLACE)

### REPLACE app initialization:
```javascript
// v4.0 Initialization
async function initializeApp() {
  console.log(`FinChronicle v${APP_VERSION} - Initializing...`);

  try {
    // 1. Initialize IndexedDB (v4.0 schema with accounts + journal_entries)
    await initDB();
    console.log('✓ Database initialized');

    // 2. Attempt to load existing transactions
    allTransactions = await getAllJournalEntries();
    console.log(`✓ Loaded ${allTransactions.length} transactions`);

    // 3. Load saved preferences
    loadUserPreferences();
    console.log('✓ Preferences loaded');

    // 4. Check if migration needed (v3 to v4)
    const needs_migration = await checkNeedsMigration();
    if (needs_migration) {
      console.log('⚠️ Migration needed from v3 to v4');
      showMigrationModal();
      return;  // Stop initialization until migration complete
    }

    // 5. Load accounts and populate UI caches
    await loadAccountsCache();
    console.log('✓ Accounts cache loaded');

    // 6. Initialize UI
    populateCategoryDropdown('expense');  // Default to expense
    updateDashboard();
    updateTagline();
    setupFormEventListeners();
    setupTabEventListeners();

    // 7. Check for app update
    if ('serviceWorker' in navigator) {
      checkForUpdates();
    }

    console.log('✓ Application ready');

  } catch (error) {
    console.error('Initialization failed:', error);
    showError('Failed to initialize app. Please refresh the page.');
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', initializeApp);

// Handle service worker updates
let refreshing;
navigator.serviceWorker?.controller?.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});
```

---

## 3. Database Operations (REPLACE)

### REMOVE v3 database code

### REPLACE WITH integration layer:
```javascript
// v4.0 Database Integration

/**
 * Initialize IndexedDB v4 schema
 * Called once at app startup
 */
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FinChronicleDB', 2);  // v2 schema

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = async (event) => {
      const database = event.target.result;

      // Create tables if not exist
      if (!database.objectStoreNames.contains('accounts')) {
        const accountStore = database.createObjectStore('accounts', { keyPath: 'id' });
        accountStore.createIndex('type', 'type');
        accountStore.createIndex('active', 'active');
      }

      if (!database.objectStoreNames.contains('journal_entries')) {
        const entryStore = database.createObjectStore('journal_entries', { keyPath: 'id' });
        entryStore.createIndex('date', 'date');
        entryStore.createIndex('account_id', 'account_id');
      }

      // Seed default accounts if new database
      await seedDefaultAccounts();
    };
  });
}

/**
 * Load all accounts into cache for UI
 */
async function loadAccountsCache() {
  try {
    cachedAccounts = await getAllAccounts();
    
    // Build category lookup by type
    cachedCategories = {
      expense: cachedAccounts
        .filter(a => a.type === 'expense' && a.active)
        .map(a => a.name)
        .sort(),
      income: cachedAccounts
        .filter(a => a.type === 'income' && a.active)
        .map(a => a.name)
        .sort()
    };

    return cachedAccounts;
  } catch (error) {
    console.error('Failed to load accounts:', error);
    return [];
  }
}

/**
 * Save transaction (add or update)
 * Handles journal entry creation with double-entry logic
 */
async function saveTransaction(formData, isEditing = false) {
  try {
    // 1. Validate input
    const validation = validateJournalEntry(formData);
    if (!validation.isValid) {
      showFieldErrors(validation.errors);
      return false;
    }

    // 2. Create journal entry object
    const entry = {
      id: isEditing ? editingId : Date.now(),
      date: formData.date,
      description: formData.notes,
      line_items: [
        // First line: the account affected (from selected category)
        {
          account_id: getAccountIdByName(formData.category),
          debit: formData.type === 'expense' ? formData.amount : 0,
          credit: formData.type === 'income' ? formData.amount : 0,
          description: formData.category
        },
        // Second line: the source/sink (default bank account 1100)
        {
          account_id: 1100,  // Default checking account
          debit: formData.type === 'income' ? formData.amount : 0,
          credit: formData.type === 'expense' ? formData.amount : 0,
          description: formData.notes || 'Transfer'
        }
      ]
    };

    // 3. Save to IndexedDB
    await saveJournalEntry(entry);

    // 4. Update in-memory cache
    if (!isEditing) {
      allTransactions.unshift(entry);
    } else {
      const idx = allTransactions.findIndex(t => t.id === editingId);
      if (idx >= 0) allTransactions[idx] = entry;
    }

    // 5. Verify trial balance
    const isBalanced = await verifyTrialBalance();
    if (!isBalanced) {
      console.error('⚠️ Trial balance failed after save!');
      showError('Data integrity issue detected.');
      return false;
    }

    return true;

  } catch (error) {
    console.error('Save transaction failed:', error);
    showError(`Failed to save transaction: ${error.message}`);
    return false;
  }
}

/**
 * Delete transaction
 * Safe deletion with audit trail
 */
async function deleteTransaction(id) {
  if (!confirm('Delete this transaction? This cannot be undone.')) return false;

  try {
    await deleteJournalEntry(id);
    allTransactions = allTransactions.filter(t => t.id !== id);
    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    showError('Failed to delete transaction.');
    return false;
  }
}

/**
 * Get account ID by account name
 * Helper for form processing
 */
function getAccountIdByName(accountName) {
  const account = cachedAccounts.find(a => a.name === accountName);
  return account ? account.id : 5100;  // Default to misc expense
}
```

---

## 4. Form Handling (MAJOR CHANGE)

### REMOVE old form submission handler

### ADD NEW v4.0 form handler:
```javascript
/**
 * v4.0 Form Event Listeners Setup
 */
function setupFormEventListeners() {
  const form = document.getElementById('transaction-form');
  form.addEventListener('submit', handleFormSubmit);

  // Type selector buttons
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = btn.dataset.type;
      updateTransactionTypeSelection(type);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      form.dispatchEvent(new Event('submit'));
    }
    if (e.key === 'Escape') {
      resetTransactionForm(form);
    }
  });

  // Currency display
  updateCurrencyDisplay();
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('[type="submit"]');

  try {
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Get form data using v4 helper
    const formData = buildJournalEntryFromForm(form);

    // Validate
    if (!formData) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }

    // Save transaction
    const success = await saveTransaction(formData, editingId !== null);

    if (success) {
      // Show success animation
      submitBtn.classList.add('success');
      form.classList.add('success-animation');

      // Reset form
      setTimeout(() => {
        form.reset();
        editingId = null;
        updateUI();
        submitBtn.classList.remove('loading', 'success');
        submitBtn.disabled = false;
        form.classList.remove('success-animation');
        deleteFocusedElement();
      }, 800);
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }

  } catch (error) {
    console.error('Form submission failed:', error);
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    showError('Failed to save transaction.');
  }
}

/**
 * Update transaction type selection
 * Updates hidden input and refreshes category dropdown
 */
function updateTransactionTypeSelection(type) {
  // Update hidden input
  document.getElementById('type').value = type;

  // Update button states
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // Refresh category dropdown
  populateCategoryDropdown(type);

  // Clear any previous category selection
  document.getElementById('category').value = '';
}

/**
 * Populate category dropdown based on type
 */
function populateCategoryDropdown(type) {
  const select = document.getElementById('category');
  const categories = cachedCategories[type] || [];

  select.innerHTML = `<option value="">Select category...</option>`;
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/**
 * Reset transaction form to initial state
 */
function resetTransactionForm(form) {
  form.reset();
  editingId = null;
  document.getElementById('type').value = 'expense';
  updateTransactionTypeSelection('expense');
  clearAllFormErrors();
}

/**
 * Show field-specific errors
 */
function showFieldErrors(errors) {
  clearAllFormErrors();

  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.querySelector(`[data-error="${field}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.parentElement.classList.add('error');
    }
  });

  // Focus on first error
  const firstError = document.querySelector('.form-group.error');
  if (firstError) {
    firstError.querySelector('input, select, textarea')?.focus();
  }
}

/**
 * Clear all form errors
 */
function clearAllFormErrors() {
  document.querySelectorAll('[data-error]').forEach(el => {
    el.textContent = '';
    el.parentElement.classList.remove('error');
  });
}
```

---

## 5. UI Update Functions (ENHANCE)

### REPLACE updateUI() with v4.0 version:
```javascript
/**
 * Master UI refresh function
 * Called after any data change
 */
async function updateUI() {
  try {
    currentPage = 1;  // Reset pagination
    updateDashboard();
    updateTransactionsList();
    updateAccountsView();
    updateReportsView();
  } catch (error) {
    console.error('UI update failed:', error);
  }
}

/**
 * Update dashboard summary cards
 */
async function updateDashboard() {
  try {
    // Get current month
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    // Get monthly totals
    const income = await getIncomeTotal(currentMonth);
    const expenses = await getExpenseTotal(currentMonth);
    const net = income - expenses;
    const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : 0;

    // Get net worth
    const netWorth = await getNetWorth();

    // Update DOM
    const curr = CURRENCY_CODES[selectedCurrency];
    document.getElementById('summary-income').textContent = 
      `${curr}${formatNumber(income.toFixed(2))}`;
    document.getElementById('summary-expenses').textContent = 
      `${curr}${formatNumber(Math.abs(expenses).toFixed(2))}`;
    document.getElementById('summary-net').textContent = 
      `${curr}${formatNumber(net.toFixed(2))}`;
    document.getElementById('summary-networth').textContent = 
      `${curr}${formatNumber(netWorth.toFixed(2))}`;
    document.getElementById('summary-savings-rate').textContent = 
      `Savings rate: ${savingsRate}%`;

  } catch (error) {
    console.error('Dashboard update failed:', error);
  }
}

/**
 * Update transaction list with filtering and pagination
 */
async function updateTransactionsList() {
  try {
    // 1. Filter transactions
    let filtered = [...allTransactions];

    // Month filter
    if (selectedMonth !== 'all' && selectedMonth !== 'current') {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth));
    } else if (selectedMonth === 'current') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      filtered = filtered.filter(t => t.date.startsWith(currentMonth));
    }

    // Type filter
    if (selectedType !== 'all') {
      // For v4, check line item types
      filtered = filtered.filter(t => 
        t.line_items.some(li => {
          if (selectedType === 'expense') return li.debit > 0;
          if (selectedType === 'income') return li.credit > 0;
        })
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t =>
        t.line_items.some(li => li.description === selectedCategory)
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    lastFilteredTransactions = filtered;

    // 2. Calculate summary for this filter
    let income = 0, expenses = 0;
    filtered.forEach(t => {
      t.line_items.forEach(li => {
        if (li.credit > 0 && li.account_id !== 1100) income += li.credit;
        if (li.debit > 0 && li.account_id !== 1100) expenses += li.debit;
      });
    });

    // Update filter summary
    const curr = CURRENCY_CODES[selectedCurrency];
    document.getElementById('list-income').textContent = 
      `${curr}${formatNumber(income.toFixed(2))}`;
    document.getElementById('list-expenses').textContent = 
      `${curr}${formatNumber(expenses.toFixed(2))}`;
    document.getElementById('list-net').textContent = 
      `${curr}${formatNumber((income - expenses).toFixed(2))}`;

    // 3. Paginate
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(start, start + itemsPerPage);

    // 4. Render list
    const listEl = document.getElementById('list');
    listEl.innerHTML = pageItems.map(entry => 
      renderTransactionItem(entry)
    ).join('');

    // 5. Show pagination if needed
    const pagEl = document.getElementById('pagination');
    if (totalPages > 1) {
      pagEl.style.display = 'flex';
      document.getElementById('page-info').textContent = 
        `Page ${currentPage} of ${totalPages}`;
    } else {
      pagEl.style.display = 'none';
    }

  } catch (error) {
    console.error('List update failed:', error);
  }
}

/**
 * Render single transaction item for list
 */
function renderTransactionItem(entry) {
  // Find the main transaction (not the bank account entry)
  const mainLine = entry.line_items.find(li => li.account_id !== 1100);
  const isExpense = mainLine.debit > 0;
  const amount = isExpense ? mainLine.debit : mainLine.credit;

  const curr = CURRENCY_CODES[selectedCurrency];
  const date = new Date(entry.date);
  const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });

  return `
    <div class="transaction-item ${isExpense ? 'expense' : 'income'}">
      <div class="transaction-date">${dateStr}</div>
      <div class="transaction-category">${mainLine.description}</div>
      <div class="transaction-notes">${entry.description || ''}</div>
      <div class="transaction-amount ${isExpense ? 'expense' : 'income'}">
        ${curr}${formatNumber(amount.toFixed(2))}
      </div>
      <div class="transaction-actions">
        <button onclick="editTransaction(${entry.id})" class="btn-icon" title="Edit">✎</button>
        <button onclick="deleteTransaction(${entry.id})" class="btn-icon" title="Delete">🗑</button>
      </div>
    </div>
  `;
}

/**
 * NEW: Update Accounts view
 */
async function updateAccountsView() {
  try {
    const accountsList = document.getElementById('accounts-list');
    if (!accountsList) return;  // Not visible yet

    const accounts = await getAllAccounts();
    const balances = await getAllAccountBalances();

    // Group by type
    const grouped = {};
    accounts.forEach(acc => {
      if (!grouped[acc.type]) grouped[acc.type] = [];
      grouped[acc.type].push({
        ...acc,
        balance: balances[acc.id] || 0
      });
    });

    // Render grouped accounts
    let html = '';
    ['asset', 'liability', 'equity', 'income', 'expense'].forEach(type => {
      const typeAccounts = grouped[type] || [];
      if (typeAccounts.length === 0) return;

      html += `<div class="account-group">
        <h3>${type.toUpperCase()}</h3>`;

      typeAccounts.forEach(acc => {
        const curr = CURRENCY_CODES[selectedCurrency];
        html += `
          <div class="account-item">
            <span>${acc.name}</span>
            <span>${curr}${formatNumber(acc.balance.toFixed(2))}</span>
          </div>
        `;
      });

      html += '</div>';
    });

    accountsList.innerHTML = html;

  } catch (error) {
    console.error('Accounts view update failed:', error);
  }
}

/**
 * NEW: Update Reports view
 */
async function updateReportsView() {
  try {
    const reportsView = document.getElementById('reports-view');
    if (!reportsView) return;  // Not visible yet

    // Trial balance
    const isBalanced = await verifyTrialBalance();
    const balances = await getAllAccountBalances();

    let html = `<div class="trial-balance">
      <h3>Trial Balance</h3>
      <div class="balance-status ${isBalanced ? 'verified' : 'error'}">
        ${isBalanced ? '✅ Verified' : '❌ Unbalanced'}
      </div>
      <table>
        <tr><th>Account</th><th>Debit</th><th>Credit</th></tr>`;

    let totalDebit = 0, totalCredit = 0;

    const accounts = await getAllAccounts();
    accounts.forEach(acc => {
      const balance = balances[acc.id] || 0;
      if (acc.type === 'asset' || acc.type === 'expense') {
        html += `<tr><td>${acc.name}</td><td>${balance}</td><td>0</td></tr>`;
        totalDebit += balance;
      } else {
        html += `<tr><td>${acc.name}</td><td>0</td><td>${balance}</td></tr>`;
        totalCredit += balance;
      }
    });

    html += `
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td><strong>${totalDebit}</strong></td>
        <td><strong>${totalCredit}</strong></td>
      </tr>
      </table>
    </div>`;

    reportsView.innerHTML = html;

  } catch (error) {
    console.error('Reports view update failed:', error);
  }
}
```

---

## 6. Tab Switching (NEW)

### ADD tab management:
```javascript
/**
 * Setup tab event listeners
 */
function setupTabEventListeners() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab || btn.textContent.toLowerCase().split(' ')[0];
      switchTab(tabName);
    });
  });
}

/**
 * Switch to specific tab
 */
function switchTab(tabName) {
  currentTab = tabName;
  localStorage.setItem('currentTab', tabName);

  // Update button active state
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update panel visibility
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('hidden', 
      !panel.id.startsWith(tabName));
  });

  // Refresh UI if needed
  if (tabName === 'list') updateTransactionsList();
  if (tabName === 'accounts') updateAccountsView();
  if (tabName === 'reports') updateReportsView();
}
```

---

## 7. Migration Handling (NEW)

### ADD migration functions:
```javascript
/**
 * Check if migration from v3 to v4 is needed
 */
async function checkNeedsMigration() {
  try {
    const v3Data = await loadV3Transactions();
    return v3Data && v3Data.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Show migration modal
 */
function showMigrationModal() {
  const modal = document.getElementById('migration-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

/**
 * Start the migration process
 */
async function startMigration() {
  const progressModal = document.getElementById('migration-progress-modal');
  progressModal.classList.remove('hidden');
  progressModal.style.display = 'flex';

  try {
    // 1. Perform dry run
    const dryRun = await performDryRunMigration();
    if (!dryRun.success) {
      showError('Migration dry-run failed. ' + dryRun.errors.join('\n'));
      return;
    }

    // 2. Create backup
    await createV3Backup();

    // 3. Execute migration
    const result = await executeMigration();

    if (result.success) {
      // Close modals
      document.getElementById('migration-modal').style.display = 'none';
      progressModal.style.display = 'none';

      // Reload app
      allTransactions = await getAllJournalEntries();
      updateUI();
      showSuccess('Migration successful!');
    } else {
      showError('Migration failed: ' + result.errors.join('\n'));
    }

  } catch (error) {
    showError('Migration error: ' + error.message);
  }
}

/**
 * Skip migration (remind later)
 */
function skipMigration() {
  document.getElementById('migration-modal').style.display = 'none';
  // User can still use app in v4.0 (no v3 data)
  initializeApp();
}
```

---

## 8. Utility Functions (KEEP/UPDATE)

### Keep existing formatting functions but update:
```javascript
/**
 * Format number with thousand separators
 */
function formatNumber(num) {
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format currency
 */
function formatCurrencyDisplay() {
  const symbol = CURRENCY_CODES[selectedCurrency] || '₹';
  document.querySelectorAll('[data-currency]').forEach(el => {
    el.textContent = symbol;
  });
  updateUI();
}

/**
 * Load user preferences from localStorage
 */
function loadUserPreferences() {
  selectedCurrency = localStorage.getItem('currency') || 'INR';
  const darkMode = localStorage.getItem('darkMode') === 'enabled';
  document.body.classList.toggle('dark-mode', darkMode);
  currentTab = localStorage.getItem('currentTab') || 'add';
}

/**
 * Save user preferences
 */
function saveUserPreferences() {
  localStorage.setItem('currency', selectedCurrency);
  localStorage.setItem('darkMode', 
    document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
  localStorage.setItem('currentTab', currentTab);
}

/**
 * Show error message
 */
function showError(message) {
  // Use existing error UI or create toast
  const errorEl = document.getElementById('error-message') || 
    document.createElement('div');
  errorEl.id = 'error-message';
  errorEl.className = 'error-toast';
  errorEl.textContent = message;
  document.body.appendChild(errorEl);

  setTimeout(() => errorEl.remove(), 4000);
}

/**
 * Show success message
 */
function showSuccess(message) {
  const successEl = document.createElement('div');
  successEl.className = 'success-toast';
  successEl.textContent = message;
  document.body.appendChild(successEl);

  setTimeout(() => successEl.remove(), 3000);
}
```

---

## Implementation Checklist for app.js

- [ ] Replace global variables with v4 versions
- [ ] Replace initialization with v4.0 initializeApp()
- [ ] Replace database operations with wrapper functions
- [ ] Replace form handler with v4.0 handleFormSubmit()
- [ ] Replace updateUI() with v4.0 version
- [ ] Add new updateAccountsView()
- [ ] Add new updateReportsView()
- [ ] Add new setupTabEventListeners()
- [ ] Add new switchTab()
- [ ] Add migration functions
- [ ] Test form submission end-to-end
- [ ] Test transaction creation, edit, delete
- [ ] Test tab switching
- [ ] Test filters and pagination
- [ ] Test migration (if v3 data exists)

---

## Key Integration Rules

1. **Always call updateUI()** after changing data
2. **Always await** database operations
3. **Always validate** form data before saving
4. **Always verify trial balance** after writes
5. **Never direct-mutate** allTransactions (use database layer)
6. **Always use cached categories** for dropdown
7. **Always use CURRENCY_CODES** for formatting
8. **Always use helpers** from ui-helpers.js

---

**Next Steps:**
1. Backup current app.js
2. Make these changes incrementally
3. Test each section before moving to next
4. Commit and test in browser
