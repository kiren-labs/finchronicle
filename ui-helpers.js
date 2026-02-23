/**
 * DOUBLE-ENTRY BOOKKEEPING - UI HELPER LAYER
 * File: ui-helpers.js
 * Purpose: Form utilities, data formatting, auto-population
 * Version: v4.0 MVP
 * 
 * Used by HTML forms to manage double-entry transaction input
 */

// ============================================================================
// FORM DATA BUILDING
// ============================================================================

/**
 * Build journal entry from form inputs
 * Used when user submits add/edit transaction form
 * 
 * @param {Object} formData - Form data object
 * @param {string} formData.date - Transaction date
 * @param {string} formData.type - 'income' or 'expense'
 * @param {string} formData.amount - Transaction amount
 * @param {string} formData.category - Category/account name
 * @param {string} [formData.notes] - Optional notes
 * @param {string} [formData.id] - Optional ID if editing
 * @param {string} [formData.bankAccount] - Bank account ID (default 1100)
 * @param {Object} [formData.categoryMap] - Category to account ID mapping
 * @returns {Object|null} Journal entry or null if invalid
 */
function buildJournalEntryFromForm(formData, accounts = []) {
  // Parse and validate
  const dateValidation = window.Validation.validateDate(formData.date);
  if (!dateValidation.isValid) {
    console.error('Invalid date:', dateValidation.error);
    return null;
  }

  const amountValidation = window.Validation.validateAmount(formData.amount);
  if (!amountValidation.isValid) {
    console.error('Invalid amount:', amountValidation.error);
    return null;
  }

  const amount = amountValidation.value;

  // Find category account
  const categoryAccount = accounts.find(
    (a) => a.name.toLowerCase() === formData.category.toLowerCase()
  );

  if (!categoryAccount) {
    console.error('Category account not found:', formData.category);
    return null;
  }

  const bankAccount = formData.bankAccount || '1100'; // Checking Account

  // Build entry
  let entries = [];

  if (formData.type === 'income') {
    entries = [
      { accountId: bankAccount, debit: amount, credit: 0 },
      { accountId: categoryAccount.id, debit: 0, credit: amount }
    ];
  } else if (formData.type === 'expense') {
    entries = [
      { accountId: categoryAccount.id, debit: amount, credit: 0 },
      { accountId: bankAccount, debit: 0, credit: amount }
    ];
  }

  const entry = {
    id: formData.id || `je_${Date.now()}`,
    date: dateValidation.value,
    entries,
    notes: formData.notes || '',
    tags: [formData.type],
    type: 'transaction',
    balanceCheck: true,
    createdAt: formData.id ? undefined : new Date().toISOString() // Only on create
  };

  return entry;
}

/**
 * Populate form fields from journal entry (for editing)
 * Reverse of buildJournalEntryFromForm
 * 
 * @param {Object} entry - Journal entry to display
 * @param {Array} accounts - Available accounts
 * @returns {Object} Form data object
 */
function getFormDataFromEntry(entry, accounts = []) {
  if (!entry || !entry.entries || entry.entries.length < 2) {
    return null;
  }

  // Determine type and extract accounts
  const typeTag = entry.tags?.find((t) => ['income', 'expense'].includes(t)) || 'expense';
  const bankAccountId = '1100'; // Checking Account (v4.0 simplification)

  let categoryAccountId = null;
  let amount = 0;

  entry.entries.forEach((line) => {
    if (typeTag === 'income') {
      if (line.accountId === bankAccountId) {
        amount = line.debit;
      } else {
        categoryAccountId = line.accountId;
      }
    } else {
      if (line.accountId === bankAccountId) {
        amount = line.credit;
      } else {
        categoryAccountId = line.accountId;
      }
    }
  });

  const categoryAccount = accounts.find((a) => a.id === categoryAccountId);

  return {
    id: entry.id,
    date: entry.date,
    type: typeTag,
    amount,
    category: categoryAccount?.name || '',
    notes: entry.notes,
    bankAccount: bankAccountId
  };
}

// ============================================================================
// FORM STATE MANAGEMENT
// ============================================================================

/**
 * Reset form to initial state
 * 
 * @param {HTMLFormElement} form - Form to reset
 */
function resetTransactionForm(form) {
  form.reset();

  // Clear any error states
  form.querySelectorAll('.error').forEach((el) => {
    el.classList.remove('error');
  });

  form.querySelectorAll('[data-error]').forEach((el) => {
    el.textContent = '';
  });

  // Reset button state
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.classList.remove('loading', 'success');
    submitBtn.disabled = false;
  }
}

/**
 * Show form error message
 * 
 * @param {HTMLFormElement} form - Form containing error field
 * @param {string} fieldName - Field name (e.g., 'amount')
 * @param {string} message - Error message
 */
function showFormError(form, fieldName, message) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  const errorEl = form.querySelector(`[data-error="${fieldName}"]`);

  if (field) {
    field.classList.add('error');
  }

  if (errorEl) {
    errorEl.textContent = message;
  }

  console.warn(`Form error: ${fieldName} - ${message}`);
}

/**
 * Clear form error message
 * 
 * @param {HTMLFormElement} form - Form
 * @param {string} fieldName - Field name
 */
function clearFormError(form, fieldName) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  const errorEl = form.querySelector(`[data-error="${fieldName}"]`);

  if (field) {
    field.classList.remove('error');
  }

  if (errorEl) {
    errorEl.textContent = '';
  }
}

/**
 * Update form fields based on transaction type (income/expense)
 * Auto-populate category dropdown with appropriate accounts
 * 
 * @param {string} type - 'income' or 'expense'
 * @param {Array} accounts - All available accounts
 * @param {HTMLSelectElement} categorySelect - Category dropdown element
 */
function updateFormForType(type, accounts, categorySelect) {
  if (!categorySelect) return;

  // Clear existing options
  categorySelect.innerHTML = '<option value="">Select category...</option>';

  // Get accounts of matching type
  const typeToAccountType = {
    income: 'income',
    expense: 'expense'
  };

  const accountType = typeToAccountType[type];
  const filteredAccounts = accounts.filter(
    (a) => a.type === accountType && a.isActive
  );

  // Add options
  filteredAccounts.forEach((account) => {
    const option = document.createElement('option');
    option.value = account.name;
    option.textContent = account.name;
    categorySelect.appendChild(option);
  });

  if (filteredAccounts.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No categories available';
    option.disabled = true;
    categorySelect.appendChild(option);
  }
}

// ============================================================================
// FORMATTING & DISPLAY
// ============================================================================

/**
 * Format amount for display with currency symbol
 * Takes into account currency setting
 * 
 * @param {number} amount - Amount to format
 * @param {string} [currency='INR'] - Currency code
 * @returns {string} Formatted string (e.g., "₹5,000.00")
 */
function formatCurrencyDisplay(amount, currency = 'INR') {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    CNY: '¥',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
    NZD: 'NZ$',
    THB: '฿',
    MYR: 'RM',
    PKR: 'Rs',
    BDT: '৳'
  };

  const symbol = symbols[currency] || currency;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return `${symbol}${formatted}`;
}

/**
 * Format date for display
 * 
 * @param {string} dateStr - Date in format 'YYYY-MM-DD'
 * @param {string} [format='short'] - 'short' (15 Feb), 'long' (February 15, 2026)
 * @returns {string} Formatted date
 */
function formatDateDisplay(dateStr, format = 'short') {
  const date = new Date(dateStr + 'T00:00:00Z');

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    // short: "15 Feb"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Format number with thousand separators
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format transaction for list display
 * Returns object with formatted values for templates
 * 
 * @param {Object} entry - Journal entry
 * @param {Array} accounts - Available accounts
 * @param {string} [currency='INR'] - Currency code
 * @returns {Object} Formatted entry
 */
function formatEntryForDisplay(entry, accounts, currency = 'INR') {
  if (!entry || !entry.entries || entry.entries.length < 2) {
    return null;
  }

  const typeTag = entry.tags?.find((t) => ['income', 'expense'].includes(t)) || 'expense';
  let amount = 0;
  let categoryName = '';

  entry.entries.forEach((line) => {
    const account = accounts.find((a) => a.id === line.accountId);

    if (account?.type !== 'asset') {
      // Non-asset account is the category
      amount = line.debit || line.credit;
      categoryName = account?.name || 'Unknown';
    }
  });

  return {
    id: entry.id,
    date: entry.date,
    dateFormatted: formatDateDisplay(entry.date, 'short'),
    type: typeTag,
    amount,
    amountFormatted: formatCurrencyDisplay(amount, currency),
    category: categoryName,
    notes: entry.notes,
    isIncome: typeTag === 'income',
    isExpense: typeTag === 'expense'
  };
}

// ============================================================================
// MODAL & POPUP HELPERS
// ============================================================================

/**
 * Show confirmation dialog
 * 
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Object} [buttons] - Button options {cancel, confirm}
 * @returns {Promise<boolean>} true if confirmed, false if cancelled
 */
async function showConfirmDialog(title, message, buttons = {}) {
  const confirmText = buttons.confirm || 'Confirm';
  const cancelText = buttons.cancel || 'Cancel';

  // Create temporary dialog (or use existing modal)
  return new Promise((resolve) => {
    // For now, use native confirm (can be replaced with custom modal)
    const confirmed = confirm(`${title}\n\n${message}`);
    resolve(confirmed);
  });
}

/**
 * Show info message (toast/snackbar)
 * 
 * @param {string} message - Message to show
 * @param {string} [type='info'] - 'info', 'success', 'error', 'warning'
 * @param {number} [duration=3000] - Duration in ms
 */
function showMessage(message, type = 'info', duration = 3000) {
  // Log to console for now
  console.log(`[${type.toUpperCase()}] ${message}`);

  // In production, create toast element:
  // const toastEl = document.createElement('div');
  // toastEl.className = `toast toast-${type}`;
  // toastEl.textContent = message;
  // document.body.appendChild(toastEl);
  // setTimeout(() => toastEl.remove(), duration);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate form input before submission
 * 
 * @param {HTMLFormElement} form - Form to validate
 * @param {Array} [accounts] - Accounts for validation
 * @returns {Object} {isValid, errors: {}}
 */
function validateFormBeforeSubmit(form, accounts = []) {
  const formData = new FormData(form);
  const errors = {};

  // Validate date
  const dateValidation = window.Validation.validateDate(formData.get('date'));
  if (!dateValidation.isValid) {
    errors.date = dateValidation.error;
  }

  // Validate amount
  const amountValidation = window.Validation.validateAmount(formData.get('amount'));
  if (!amountValidation.isValid) {
    errors.amount = amountValidation.error;
  }

  // Validate category
  if (!formData.get('category')) {
    errors.category = 'Category required';
  }

  // Validate notes length
  const notes = formData.get('notes');
  if (notes && notes.length > 500) {
    errors.notes = 'Notes too long (max 500 chars)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ============================================================================
// KEYBOARD & ACCESSIBILITY
// ============================================================================

/**
 * Handle form submission on Enter key
 * Also handles Escape to cancel
 * 
 * @param {HTMLFormElement} form - Form element
 * @param {Function} onSubmit - Callback on submit
 * @param {Function} [onCancel] - Optional callback on Escape
 */
function setupFormKeyHandlers(form, onSubmit, onCancel = null) {
  form.addEventListener('keydown', (e) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }

    // Escape to cancel
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  });
}

/**
 * Set focus to first error field
 * Helps accessibility
 * 
 * @param {HTMLFormElement} form - Form containing errors
 */
function focusFirstError(form) {
  const errorField = form.querySelector('.error');
  if (errorField) {
    errorField.focus();
    errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Format multiple entries for display
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Available accounts
 * @param {string} [currency='INR'] - Currency code
 * @returns {Array} Formatted entries
 */
function formatEntriesForDisplay(entries, accounts, currency = 'INR') {
  return entries
    .map((entry) => formatEntryForDisplay(entry, accounts, currency))
    .filter((entry) => entry !== null);
}

/**
 * Calculate summary for list of entries
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Available accounts
 * @returns {Object} {totalIncome, totalExpenses, net, count}
 */
function calculateListSummary(entries, accounts) {
  let totalIncome = 0;
  let totalExpenses = 0;

  entries.forEach((entry) => {
    const typeTag = entry.tags?.find((t) => ['income', 'expense'].includes(t)) || 'expense';
    const amount = entry.entries.reduce((sum, line) => sum + line.debit + line.credit, 0) / 2;

    if (typeTag === 'income') {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }
  });

  return {
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    count: entries.length
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.UIHelpers = {
    // Form building
    buildJournalEntryFromForm,
    getFormDataFromEntry,
    
    // Form management
    resetTransactionForm,
    showFormError,
    clearFormError,
    updateFormForType,
    validateFormBeforeSubmit,
    
    // Formatting
    formatCurrencyDisplay,
    formatDateDisplay,
    formatNumber,
    formatEntryForDisplay,
    formatEntriesForDisplay,
    
    // Dialogs
    showConfirmDialog,
    showMessage,
    
    // Keyboard
    setupFormKeyHandlers,
    focusFirstError,
    
    // Bulk ops
    calculateListSummary
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildJournalEntryFromForm,
    getFormDataFromEntry,
    resetTransactionForm,
    showFormError,
    clearFormError,
    updateFormForType,
    validateFormBeforeSubmit,
    formatCurrencyDisplay,
    formatDateDisplay,
    formatNumber,
    formatEntryForDisplay,
    formatEntriesForDisplay,
    showConfirmDialog,
    showMessage,
    setupFormKeyHandlers,
    focusFirstError,
    calculateListSummary
  };
}
