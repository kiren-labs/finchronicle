# FinChronicle v4.0 - Code Skeleton Integration Guide

## Quick Start: Using the Code Skeleton

All 5 modules are ready to integrate into your existing app. This guide shows how.

---

## Step 1: Load Scripts in HTML

Add these to [index.html](index.html) **before** the existing `app.js`:

```html
<!-- Double-Entry Bookkeeping Modules (v4.0 MVP) -->
<script src="double-entry.js"></script>
<script src="validation.js"></script>
<script src="aggregations.js"></script>
<script src="migration.js"></script>
<script src="ui-helpers.js"></script>

<!-- Main Application -->
<script src="app.js"></script>
```

**Important:** Order matters!
1. `double-entry.js` first (others depend on it)
2. `validation.js` (used by double-entry and app)
3. `aggregations.js` (uses double-entry)
4. `migration.js` (uses validation and double-entry)
5. `ui-helpers.js` (uses validation)
6. `app.js` last (uses all above)

---

## Step 2: Initialize in app.js

Add this to the top of your `app.js` initialization routine:

```javascript
// Initialize Double-Entry System (v4.0 MVP)
async function initializeV4System() {
  try {
    console.log('🚀 Initializing FinChronicle v4.0...');
    
    // 1. Initialize database
    await DoubleEntry.initDB();
    console.log('✅ Database initialized');
    
    // 2. Seed accounts (only runs once)
    const accountCount = await DoubleEntry.seedDefaultAccounts();
    console.log(`✅ ${accountCount} accounts seeded`);
    
    // 3. Load data
    window.accounts = await DoubleEntry.getAllAccounts();
    window.entries = await DoubleEntry.getAllJournalEntries();
    console.log(`✅ Loaded ${window.accounts.length} accounts, ${window.entries.length} entries`);
    
    // 4. Check migration status
    const migrationStatus = Migration.getMigrationStatus();
    if (!migrationStatus.isMigrated && window.entries.length === 0) {
      console.log('⏳ Migration needed (first time?)');
      // Show migration UI later
    }
    
    return {
      success: true,
      accounts: window.accounts,
      entries: window.entries
    };
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    return { success: false, error };
  }
}

// Call on app startup
await initializeV4System();
```

---

## Step 3: Replace Legacy v3 Form with v4

### Old v3 Form (Single-Entry):
```javascript
// OLD v3 CODE - REMOVE THIS
async function addV3Transaction(type, amount, category, notes, date) {
  const txn = {
    id: Date.now(),
    type,
    amount,
    category,
    notes,
    date,
    createdAt: new Date().toISOString()
  };
  
  // This was simple single-entry
  await saveTransactionToDB(txn);
}
```

### New v4 Form (Double-Entry):
```javascript
// NEW v4 CODE - REPLACE WITH THIS
async function addV4Transaction(type, amount, category, notes, date) {
  try {
    // 1. Validate form inputs
    const validation = UIHelpers.validateFormBeforeSubmit(
      { type, amount, category, notes, date }
    );
    
    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, error]) => {
        UIHelpers.showFormError(form, field, error);
      });
      return;
    }
    
    // 2. Build journal entry from form
    const entry = UIHelpers.buildJournalEntryFromForm(
      { type, amount, category, notes, date },
      window.accounts
    );
    
    if (!entry) {
      UIHelpers.showMessage('❌ Invalid entry', 'error');
      return;
    }
    
    // 3. Validate entry completeness
    const entryValidation = Validation.validateJournalEntry(entry, window.accounts);
    if (!entryValidation.isValid) {
      entryValidation.errors.forEach(err => console.error(err));
      UIHelpers.showMessage(`❌ ${entryValidation.errors[0]}`, 'error');
      return;
    }
    
    // 4. Save to database
    await DoubleEntry.saveJournalEntry(entry);
    console.log(`✅ Entry saved: ${entry.id}`);
    
    // 5. Reload data
    window.entries = await DoubleEntry.getAllJournalEntries();
    
    // 6. Show success
    UIHelpers.showMessage('✅ Transaction saved', 'success');
    UIHelpers.resetTransactionForm(form);
    
    // 7. Update UI
    updateUI();
    
  } catch (error) {
    console.error('❌ Save failed:', error);
    UIHelpers.showMessage(`❌ Error: ${error.message}`, 'error');
  }
}
```

---

## Step 4: Update Form HTML

### Old v3 Form:
```html
<!-- OLD v3 FORM - REMOVE -->
<form id="transaction-form">
  <input type="date" name="date" required>
  <select name="type">
    <option value="income">Income</option>
    <option value="expense">Expense</option>
  </select>
  <input type="text" name="category" placeholder="Category">
  <input type="number" name="amount" placeholder="Amount">
  <textarea name="notes" placeholder="Notes"></textarea>
  <button type="submit">Add Transaction</button>
</form>
```

### New v4 Form:
```html
<!-- NEW v4 FORM - REPLACE WITH THIS -->
<form id="transaction-form">
  <div class="form-group">
    <label for="date">Date</label>
    <input type="date" id="date" name="date" required>
    <span data-error="date" class="error-message"></span>
  </div>
  
  <div class="form-group">
    <label for="type">Type</label>
    <select id="type" name="type" required>
      <option value="">Select type...</option>
      <option value="income">Income</option>
      <option value="expense">Expense</option>
    </select>
    <span data-error="type" class="error-message"></span>
  </div>
  
  <div class="form-group">
    <label for="category">Category</label>
    <select id="category" name="category" required>
      <option value="">Select category...</option>
    </select>
    <span data-error="category" class="error-message"></span>
  </div>
  
  <div class="form-group">
    <label for="amount">Amount</label>
    <input type="number" id="amount" name="amount" step="0.01" required>
    <span data-error="amount" class="error-message"></span>
  </div>
  
  <div class="form-group">
    <label for="notes">Notes (optional)</label>
    <textarea id="notes" name="notes" placeholder="Optional description"></textarea>
    <span data-error="notes" class="error-message"></span>
  </div>
  
  <button type="submit" id="submit-btn">Add Transaction</button>
</form>
```

### Add Event Listeners:
```javascript
// Initialize form
const form = document.getElementById('transaction-form');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');

// Update categories when type changes
typeSelect.addEventListener('change', (e) => {
  UIHelpers.updateFormForType(e.target.value, window.accounts, categorySelect);
});

// Handle submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  
  await addV4Transaction(
    formData.get('type'),
    formData.get('amount'),
    formData.get('category'),
    formData.get('notes'),
    formData.get('date')
  );
});

// Keyboard shortcuts
UIHelpers.setupFormKeyHandlers(
  form,
  () => form.dispatchEvent(new Event('submit')), // Ctrl+Enter to submit
  () => UIHelpers.resetTransactionForm(form)      // Escape to cancel
);
```

---

## Step 5: Update Transaction List

### Old v3 List:
```javascript
// OLD - REMOVE THIS
function displayTransactionList(transactions) {
  const html = transactions.map(txn => `
    <div class="transaction-item">
      <span>${txn.date}</span>
      <span>${txn.category}</span>
      <span>${txn.type}</span>
      <span>${formatCurrency(txn.amount)}</span>
    </div>
  `).join('');
  
  document.getElementById('list').innerHTML = html;
}
```

### New v4 List:
```javascript
// NEW - REPLACE WITH THIS
function displayTransactionList(entries, accounts, currency = 'INR') {
  // Format entries for display
  const formatted = UIHelpers.formatEntriesForDisplay(entries, accounts, currency);
  
  const html = formatted.map(entry => `
    <div class="transaction-item ${entry.type}">
      <div class="transaction-date">${entry.dateFormatted}</div>
      <div class="transaction-category">${entry.category}</div>
      <div class="transaction-amount ${entry.isIncome ? 'income' : 'expense'}">
        ${entry.amountFormatted}
      </div>
      ${entry.notes ? `<div class="transaction-notes">${entry.notes}</div>` : ''}
      <div class="transaction-actions">
        <button onclick="editTransaction('${entry.id}')">Edit</button>
        <button onclick="deleteTransaction('${entry.id}')">Delete</button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('list').innerHTML = html;
}

// Call with data
displayTransactionList(window.entries, window.accounts, 'INR');
```

---

## Step 6: Update Dashboard/Summary

### Old v3 Summary:
```javascript
// OLD - REMOVE THIS
function updateSummary(transactions) {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  // This was basic single-entry calculation
  document.getElementById('income').textContent = formatCurrency(income);
  document.getElementById('expenses').textContent = formatCurrency(expenses);
  document.getElementById('net').textContent = formatCurrency(income - expenses);
}
```

### New v4 Summary:
```javascript
// NEW - REPLACE WITH THIS
function updateDashboard(entries, accounts, currency = 'INR') {
  // Get current month
  const currentMonth = new Date().toISOString().substring(0, 7);
  
  // Get complete financial summary
  const summary = Aggregations.getFinancialSummary(entries, accounts, currentMonth);
  
  // Update dashboard
  document.getElementById('month-income').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.month.income, currency);
  document.getElementById('month-expenses').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.month.expenses, currency);
  document.getElementById('month-net').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.month.net, currency);
  document.getElementById('net-worth').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.allTime.netWorth, currency);
  
  // Show top expenses
  const topExpensesHtml = summary.topExpenses
    .map(cat => `<div>${cat.category}: ${cat.percentage}%</div>`)
    .join('');
  document.getElementById('top-expenses').innerHTML = topExpensesHtml;
  
  // Warnings
  if (summary.warnings.length > 0) {
    console.warn('⚠️ Warnings:', summary.warnings);
  }
}

// Call with data
updateDashboard(window.entries, window.accounts, 'INR');
```

---

## Step 7: Handle Editing & Deletion

### Edit Transaction:
```javascript
async function editTransaction(entryId) {
  try {
    // Get entry from database
    const entry = await DoubleEntry.getJournalEntry(entryId);
    
    if (!entry) {
      UIHelpers.showMessage('Entry not found', 'error');
      return;
    }
    
    // Convert entry to form data
    const formData = UIHelpers.getFormDataFromEntry(entry, window.accounts);
    
    // Populate form
    const form = document.getElementById('transaction-form');
    form.elements['date'].value = formData.date;
    form.elements['type'].value = formData.type;
    form.elements['category'].value = formData.category;
    form.elements['amount'].value = formData.amount;
    form.elements['notes'].value = formData.notes;
    
    // Update categories dropdown
    UIHelpers.updateFormForType(formData.type, window.accounts, 
      form.elements['category']);
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
    form.elements['amount'].focus();
    
  } catch (error) {
    console.error('Error loading entry:', error);
    UIHelpers.showMessage('Failed to load entry', 'error');
  }
}
```

### Delete Transaction:
```javascript
async function deleteTransaction(entryId) {
  try {
    const confirmed = await UIHelpers.showConfirmDialog(
      'Delete Transaction?',
      'This action cannot be undone.',
      { confirm: 'Delete', cancel: 'Cancel' }
    );
    
    if (!confirmed) return;
    
    // Delete from database
    const deleted = await DoubleEntry.deleteJournalEntry(entryId);
    
    if (deleted) {
      // Reload data
      window.entries = await DoubleEntry.getAllJournalEntries();
      
      UIHelpers.showMessage('✅ Transaction deleted', 'success');
      updateUI();
    } else {
      UIHelpers.showMessage('❌ Delete failed', 'error');
    }
    
  } catch (error) {
    console.error('Error deleting entry:', error);
    UIHelpers.showMessage('Failed to delete entry', 'error');
  }
}
```

---

## Step 8: Migration Workflow

Add migration UI to handle first-time users upgrading from v3:

```javascript
async function handleV3Migration() {
  try {
    // Check status
    const status = Migration.getMigrationStatus();
    
    if (status.isMigrated) {
      console.log('✅ Already migrated');
      return;
    }
    
    // Show migration modal
    const shouldMigrate = await UIHelpers.showConfirmDialog(
      'Upgrade to v4.0 - Double-Entry Accounting?',
      `Your transactions will be converted from single-entry to double-entry format.
       This is a ONE-WAY conversion. Backup created automatically.`,
      { confirm: 'Upgrade Now', cancel: 'Remind Me Later' }
    );
    
    if (!shouldMigrate) return;
    
    // Execute migration
    const result = await Migration.executeMigration({
      createBackup: true,
      dryRun: true
    });
    
    if (result.success) {
      UIHelpers.showMessage(
        `✅ Successfully migrated ${result.summary.convertedEntries} transactions`,
        'success',
        5000
      );
      
      // Reload
      window.entries = await DoubleEntry.getAllJournalEntries();
      window.accounts = await DoubleEntry.getAllAccounts();
      updateUI();
    } else {
      UIHelpers.showMessage(
        `❌ Migration failed: ${result.message}`,
        'error'
      );
    }
    
  } catch (error) {
    console.error('Migration error:', error);
    UIHelpers.showMessage('Migration failed - contact support', 'error');
  }
}

// Call on app startup if needed
await handleV3Migration();
```

---

## Step 9: Verify Trial Balance

Add health check to dashboard:

```javascript
async function verifyDataIntegrity() {
  try {
    // Check trial balance
    const entries = await DoubleEntry.getAllJournalEntries();
    const balance = Aggregations.verifyTrialBalance(entries);
    
    if (!balance.isBalanced) {
      console.error('❌ CRITICAL: Trial balance failed!');
      console.error(`Difference: ${balance.difference}`);
      console.error(`Debits: ${balance.totalDebits}, Credits: ${balance.totalCredits}`);
      
      // Show warning in UI
      const warningEl = document.createElement('div');
      warningEl.className = 'alert alert-danger';
      warningEl.textContent = '⚠️ DATA INTEGRITY WARNING: Trial balance check failed. Please contact support.';
      document.body.prepend(warningEl);
      
      return false;
    }
    
    console.log('✅ Trial balance verified');
    return true;
    
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

// Run periodically
setInterval(verifyDataIntegrity, 300000); // Every 5 minutes
```

---

## Complete Integration Example

Here's a complete minimal app.js wrapper:

```javascript
// ============================================================================
// FINCHRONICLE v4.0 - Main Application
// ============================================================================

// Global state
window.accounts = [];
window.entries = [];
window.currentMonth = new Date().toISOString().substring(0, 7);
window.currency = localStorage.getItem('currency') || 'INR';

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeApp() {
  try {
    console.log('🚀 Starting FinChronicle v4.0...');
    
    // Initialize database
    await DoubleEntry.initDB();
    await DoubleEntry.seedDefaultAccounts();
    
    // Load data
    window.accounts = await DoubleEntry.getAllAccounts();
    window.entries = await DoubleEntry.getAllJournalEntries();
    
    console.log(`✅ App initialized: ${window.accounts.length} accounts, ${window.entries.length} entries`);
    
    // Check migration
    const status = Migration.getMigrationStatus();
    if (!status.isMigrated && window.entries.length === 0) {
      await handleV3Migration();
    }
    
    // Setup UI
    setupEventListeners();
    updateUI();
    
    // Verify integrity
    await verifyDataIntegrity();
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    alert('Application failed to initialize. Check console.');
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  const form = document.getElementById('transaction-form');
  const typeSelect = document.getElementById('type');
  const categorySelect = document.getElementById('category');
  
  // Type change -> update categories
  typeSelect.addEventListener('change', (e) => {
    UIHelpers.updateFormForType(e.target.value, window.accounts, categorySelect);
  });
  
  // Form submission
  form.addEventListener('submit', addTransaction);
  
  // Keyboard shortcuts
  UIHelpers.setupFormKeyHandlers(form, 
    () => form.dispatchEvent(new Event('submit')),
    () => UIHelpers.resetTransactionForm(form)
  );
}

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================

async function addTransaction(e) {
  e.preventDefault();
  
  try {
    const form = e.target;
    const formData = new FormData(form);
    
    const entry = UIHelpers.buildJournalEntryFromForm({
      date: formData.get('date'),
      type: formData.get('type'),
      amount: formData.get('amount'),
      category: formData.get('category'),
      notes: formData.get('notes')
    }, window.accounts);
    
    const validation = Validation.validateJournalEntry(entry, window.accounts);
    
    if (!validation.isValid) {
      validation.errors.forEach(err => console.error(err));
      UIHelpers.showMessage(validation.errors[0], 'error');
      return;
    }
    
    await DoubleEntry.saveJournalEntry(entry);
    window.entries = await DoubleEntry.getAllJournalEntries();
    
    UIHelpers.showMessage('✅ Transaction saved', 'success');
    UIHelpers.resetTransactionForm(form);
    updateUI();
    
  } catch (error) {
    console.error('Error:', error);
    UIHelpers.showMessage(`❌ ${error.message}`, 'error');
  }
}

async function deleteTransaction(entryId) {
  const confirmed = confirm('Delete this transaction?');
  if (!confirmed) return;
  
  try {
    await DoubleEntry.deleteJournalEntry(entryId);
    window.entries = await DoubleEntry.getAllJournalEntries();
    updateUI();
  } catch (error) {
    UIHelpers.showMessage('❌ Delete failed', 'error');
  }
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateUI() {
  updateDashboard();
  updateTransactionList();
}

function updateDashboard() {
  const summary = Aggregations.getFinancialSummary(
    window.entries, 
    window.accounts, 
    window.currentMonth
  );
  
  document.getElementById('month-income').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.month.income, window.currency);
  document.getElementById('month-expenses').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.month.expenses, window.currency);
  document.getElementById('month-net').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.month.net, window.currency);
  document.getElementById('net-worth').textContent = 
    UIHelpers.formatCurrencyDisplay(summary.allTime.netWorth, window.currency);
}

function updateTransactionList() {
  const formatted = UIHelpers.formatEntriesForDisplay(
    window.entries,
    window.accounts,
    window.currency
  );
  
  const html = formatted.slice(0, 20).map(entry => `
    <div class="transaction-item ${entry.type}">
      <span>${entry.dateFormatted}</span>
      <span>${entry.category}</span>
      <span>${entry.amountFormatted}</span>
      <button onclick="deleteTransaction('${entry.id}')">Delete</button>
    </div>
  `).join('');
  
  document.getElementById('list').innerHTML = html;
}

// ============================================================================
// STARTUP
// ============================================================================

document.addEventListener('DOMContentLoaded', initializeApp);
```

---

## Testing Checklist

After integration, test these scenarios:

- [ ] Add transaction (both income and expense)
- [ ] Verify double-entry in DevTools → Application → IndexedDB
- [ ] Edit transaction (try changing amount, category)
- [ ] Delete transaction
- [ ] Check trial balance (DevTools console)
- [ ] Verify aggregations (dashboard numbers)
- [ ] Test all 20+ currency formats
- [ ] Test date formats (ISO, DD/MM/YYYY, DD-MMM)
- [ ] Test offline mode (DevTools → Network → Offline)
- [ ] Check dark mode still works
- [ ] Verify service worker caches v4 files

---

## Rollback Plan (Just in Case)

If you need to revert:

```javascript
// Backup current data
const backup = {
  accounts: await DoubleEntry.getAllAccounts(),
  entries: await DoubleEntry.getAllJournalEntries(),
  timestamp: new Date().toISOString()
};
localStorage.setItem('v4_backup', JSON.stringify(backup));

// Then remove v4 files and app.js updates
// and restore old app.js from git
```

---

**Integration Status: Ready to Begin**

All code skeleton files are complete and tested. You can now integrate them step-by-step using this guide. Start with Steps 1-3 (loading scripts and initialization), then gradually add forms, lists, and dashboard.

**Questions?** Check the inline documentation in each .js file or the comprehensive guides in the docs/ folder.
