/**
 * DOUBLE-ENTRY BOOKKEEPING - VALIDATION LAYER
 * File: validation.js
 * Purpose: Data integrity checks, trial balance verification, user input validation
 * Version: v4.0 MVP
 * 
 * CRITICAL: All data operations must pass validation before storage
 */

// ============================================================================
// AMOUNT & CURRENCY VALIDATION
// ============================================================================

/**
 * Validate and parse amount from user input
 * Handles strings, floats, integers, negative values
 * 
 * @param {any} amount - User input (string, number, etc)
 * @returns {Object} {isValid, value, error}
 */
function validateAmount(amount) {
  // Check if empty
  if (amount === null || amount === undefined || amount === '') {
    return { isValid: false, value: 0, error: 'Amount required' };
  }

  // Convert to number
  const parsed = parseFloat(amount);

  // Check if valid number
  if (isNaN(parsed)) {
    return { isValid: false, value: 0, error: 'Invalid amount (must be a number)' };
  }

  // Check if zero (not allowed)
  if (parsed === 0) {
    return { isValid: false, value: 0, error: 'Amount must be greater than 0' };
  }

  // Check if negative (not allowed - use debit/credit columns instead)
  if (parsed < 0) {
    return { isValid: false, value: 0, error: 'Amount cannot be negative (use proper debit/credit)' };
  }

  // Check if too large (> 1 billion)
  if (parsed > 1000000000) {
    return { isValid: false, value: 0, error: 'Amount too large (max 1 billion)' };
  }

  // Check decimal places (max 2 for currency)
  const decimalCount = (parsed.toString().split('.')[1] || '').length;
  if (decimalCount > 2) {
    return { isValid: false, value: 0, error: 'Too many decimal places (max 2)' };
  }

  return { isValid: true, value: parsed, error: null };
}

/**
 * Validate date string format
 * Accepts: 'YYYY-MM-DD' (ISO), 'DD/MM/YYYY', 'DD-MMM'
 * 
 * @param {string} dateStr - Date input
 * @returns {Object} {isValid, value, error}
 */
function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { isValid: false, value: null, error: 'Date required' };
  }

  let date = null;
  let format = '';

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr + 'T00:00:00Z');
    format = 'ISO';
  }
  // Try DD/MM/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    date = new Date(parts[2], parts[1] - 1, parts[0]);
    format = 'DD/MM/YYYY';
  }
  // Try DD-MMM (e.g., 15-Feb, assume current year)
  else if (/^\d{2}-[A-Za-z]{3}$/.test(dateStr)) {
    const year = new Date().getFullYear();
    date = new Date(`${dateStr}-${year}`);
    format = 'DD-MMM';
  }

  // Check if it's a valid date
  if (!date || isNaN(date.getTime())) {
    return {
      isValid: false,
      value: null,
      error: 'Invalid date format. Use YYYY-MM-DD, DD/MM/YYYY, or DD-MMM'
    };
  }

  // Check if date is not in future (optional, comment out if needed)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date > today) {
    // Allow but warn
    console.warn('⚠ Warning: Future-dated entry');
  }

  const isoDate = date.toISOString().split('T')[0]; // Convert back to ISO
  return { isValid: true, value: isoDate, error: null };
}

/**
 * Validate account ID exists and is of correct type
 * 
 * @param {string} accountId - Account ID to validate
 * @param {string} [expectedType] - Optional: check if account is of this type
 * @param {Array} [accounts] - Array of account objects (from DB)
 * @returns {Object} {isValid, account, error}
 */
function validateAccountId(accountId, expectedType, accounts = []) {
  if (!accountId || typeof accountId !== 'string') {
    return { isValid: false, account: null, error: 'Account ID required' };
  }

  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    return { isValid: false, account: null, error: `Account not found: ${accountId}` };
  }

  if (expectedType && account.type !== expectedType) {
    return {
      isValid: false,
      account: null,
      error: `Account must be type ${expectedType}, got ${account.type}`
    };
  }

  return { isValid: true, account, error: null };
}

// ============================================================================
// JOURNAL ENTRY VALIDATION
// ============================================================================

/**
 * Validate complete journal entry before saving
 * Checks: structure, trial balance, amounts, accounts
 * 
 * @param {Object} entry - Journal entry object
 * @param {Array} [accounts] - List of valid accounts (for account validation)
 * @returns {Object} {isValid, errors: [], warnings: []}
 */
function validateJournalEntry(entry, accounts = []) {
  const errors = [];
  const warnings = [];

  // Check structure
  if (!entry) {
    return { isValid: false, errors: ['Entry is null/undefined'] };
  }

  if (!entry.entries || !Array.isArray(entry.entries)) {
    errors.push('Entry must have "entries" array');
  } else if (entry.entries.length === 0) {
    errors.push('Entry must have at least one line item');
  }

  if (entry.entries && entry.entries.length < 2) {
    errors.push('Entry must have at least 2 line items (debit + credit)');
  }

  if (!entry.date) {
    errors.push('Entry must have a date');
  } else {
    const dateValidation = validateDate(entry.date);
    if (!dateValidation.isValid) {
      errors.push(dateValidation.error);
    }
  }

  // If structural errors, stop here
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Check line items individually
  entry.entries.forEach((line, idx) => {
    if (!line.accountId) {
      errors.push(`Line ${idx + 1}: Missing accountId`);
    } else if (accounts.length > 0) {
      const accountCheck = validateAccountId(line.accountId, null, accounts);
      if (!accountCheck.isValid) {
        errors.push(`Line ${idx + 1}: ${accountCheck.error}`);
      }
    }

    const debit = parseFloat(line.debit) || 0;
    const credit = parseFloat(line.credit) || 0;

    if (debit < 0) {
      errors.push(`Line ${idx + 1}: Debit cannot be negative`);
    }
    if (credit < 0) {
      errors.push(`Line ${idx + 1}: Credit cannot be negative`);
    }

    if (debit > 0 && credit > 0) {
      errors.push(`Line ${idx + 1}: Cannot have both debit and credit`);
    }

    if (debit === 0 && credit === 0) {
      errors.push(`Line ${idx + 1}: Must have either debit or credit`);
    }
  });

  // Check trial balance (debits = credits)
  const totalDebits = entry.entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const totalCredits = entry.entries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);

  if (totalDebits !== totalCredits) {
    errors.push(
      `Trial balance failed: Debits (${totalDebits}) ≠ Credits (${totalCredits})`
    );
  }

  // Warnings (not errors)
  if (Math.abs(totalDebits) > 1000000) {
    warnings.push('Large transaction amount');
  }

  if (!entry.notes || entry.notes.trim() === '') {
    warnings.push('No notes/description provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate opening balance entry (special type)
 * Must include assets + liabilities + balancing equity
 * 
 * @param {Object} entry - Opening balance entry
 * @param {Array} [accounts] - List of accounts
 * @returns {Object} {isValid, errors: []}
 */
function validateOpeningBalance(entry, accounts = []) {
  const baseValidation = validateJournalEntry(entry, accounts);

  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const errors = [];

  // Check for at least one asset account
  const hasAsset = entry.entries.some((line) => {
    if (accounts.length === 0) return true; // Can't validate without accounts
    const acc = accounts.find((a) => a.id === line.accountId);
    return acc && acc.type === 'asset';
  });

  if (!hasAsset && accounts.length > 0) {
    errors.push('Opening balance must include at least one asset account');
  }

  // Check for balancing equity (usually "Opening Balance" account)
  const hasEquity = entry.entries.some((line) => {
    if (accounts.length === 0) return true;
    const acc = accounts.find((a) => a.id === line.accountId);
    return acc && acc.type === 'equity';
  });

  if (!hasEquity && accounts.length > 0) {
    errors.push('Opening balance must include equity account to balance');
  }

  return {
    isValid: errors.length === 0,
    errors: [...baseValidation.errors, ...errors]
  };
}

// ============================================================================
// ACCOUNT VALIDATION
// ============================================================================

/**
 * Validate account name (user input during rename)
 * 
 * @param {string} name - Proposed account name
 * @returns {Object} {isValid, error}
 */
function validateAccountName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Account name required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Account name too short (min 2 characters)' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Account name too long (max 50 characters)' };
  }

  // Check for valid characters (alphanumeric, spaces, and common symbols)
  if (!/^[a-zA-Z0-9\s\-\/.()&]+$/.test(trimmed)) {
    return { isValid: false, error: 'Account name contains invalid characters' };
  }

  return { isValid: true, error: null };
}

/**
 * Validate account structure (after creation in v4.1)
 * v4.0: Only check defaults
 * v4.1: Full validation
 * 
 * @param {Object} account - Account to validate
 * @returns {Object} {isValid, errors: []}
 */
function validateAccount(account) {
  const errors = [];

  if (!account.id) errors.push('Account ID required');
  if (!account.name) errors.push('Account name required');
  if (!account.type) errors.push('Account type required');

  // Validate type
  const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
  if (account.type && !validTypes.includes(account.type)) {
    errors.push(`Invalid type: ${account.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate name
  const nameValidation = validateAccountName(account.name);
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error);
  }

  // Validate ID format (should be numeric string in 1000-5999 range)
  if (account.id) {
    const idNum = parseInt(account.id);
    if (isNaN(idNum)) {
      errors.push('Account ID must be numeric');
    } else if (idNum < 1000 || idNum > 5999) {
      errors.push('Account ID must be between 1000-5999');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// TRIAL BALANCE VALIDATION
// ============================================================================

/**
 * Check if trial balance is valid (debits = credits)
 * Computes across all entries
 * 
 * @param {Array} entries - Array of journal entries
 * @returns {Object} {isValid, totalDebits, totalCredits, difference, details}
 */
function validateTrialBalance(entries) {
  let totalDebits = 0;
  let totalCredits = 0;

  entries.forEach((entry) => {
    if (entry.entries && Array.isArray(entry.entries)) {
      entry.entries.forEach((line) => {
        totalDebits += parseFloat(line.debit) || 0;
        totalCredits += parseFloat(line.credit) || 0;
      });
    }
  });

  const isValid = totalDebits === totalCredits;
  const difference = Math.abs(totalDebits - totalCredits);

  return {
    isValid,
    totalDebits: Number(totalDebits.toFixed(2)),
    totalCredits: Number(totalCredits.toFixed(2)),
    difference: Number(difference.toFixed(2)),
    details: {
      entriesCount: entries.length,
      linesCount: entries.reduce((sum, e) => sum + (e.entries?.length || 0), 0)
    }
  };
}

/**
 * Validate account balances make sense
 * Example: Assets should not be negative (usually)
 * 
 * @param {Object} balances - Map of accountId -> balance
 * @param {Array} [accounts] - List of account objects
 * @returns {Object} {hasIssues, issues: []}
 */
function validateAccountBalances(balances, accounts = []) {
  const issues = [];

  Object.entries(balances).forEach(([accountId, balance]) => {
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      return; // Account not found, skip
    }

    // For asset accounts, negative usually means error
    // But allow for accounts like "AR - Customer Refunds"
    if (account.type === 'asset' && balance < 0) {
      issues.push(
        `⚠ Asset account "${account.name}" has negative balance: ${balance}`
      );
    }

    // For expense accounts, shouldn't have negative (that's income)
    if (account.type === 'expense' && balance < 0) {
      issues.push(
        `⚠ Expense account "${account.name}" has negative balance: ${balance}`
      );
    }

    // Income should never be negative in well-formed entries
    if (account.type === 'income' && balance < 0) {
      issues.push(`⚠ Income account "${account.name}" has negative balance: ${balance}`);
    }
  });

  return {
    hasIssues: issues.length > 0,
    issues
  };
}

// ============================================================================
// MIGRATION VALIDATION (v3 -> v4)
// ============================================================================

/**
 * Validate a v3 transaction object before migration
 * v3 format: {id, type, amount, category, date, notes, createdAt}
 * 
 * @param {Object} transaction - v3 transaction to validate
 * @returns {Object} {isValid, errors: []}
 */
function validateV3Transaction(transaction) {
  const errors = [];

  if (!transaction) {
    return { isValid: false, errors: ['Transaction is null'] };
  }

  if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
    errors.push('Type must be "income" or "expense"');
  }

  if (!transaction.amount || parseFloat(transaction.amount) <= 0) {
    errors.push('Invalid amount');
  }

  if (!transaction.date) {
    errors.push('Date is required');
  } else {
    const dateValidation = validateDate(transaction.date);
    if (!dateValidation.isValid) {
      errors.push(dateValidation.error);
    }
  }

  if (!transaction.category) {
    errors.push('Category is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate v3 ledger (array of v3 transactions)
 * 
 * @param {Array} transactions - Array of v3 transactions
 * @returns {Object} {isValid, totalCount, validCount, invalidCount, issues: []}
 */
function validateV3Ledger(transactions) {
  if (!Array.isArray(transactions)) {
    return {
      isValid: false,
      totalCount: 0,
      validCount: 0,
      invalidCount: 1,
      issues: ['Input is not an array']
    };
  }

  let validCount = 0;
  let invalidCount = 0;
  const issues = [];

  transactions.forEach((txn, idx) => {
    const validation = validateV3Transaction(txn);
    if (validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
      issues.push(`Transaction ${idx + 1}: ${validation.errors.join(', ')}`);
    }
  });

  return {
    isValid: invalidCount === 0,
    totalCount: transactions.length,
    validCount,
    invalidCount,
    issues: issues.slice(0, 10) // Limit to first 10 issues
  };
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate multiple journal entries at once
 * Returns summary of validation
 * 
 * @param {Array} entries - Array of journal entries
 * @param {Array} [accounts] - List of accounts
 * @returns {Object} {isValid, summary, details: []}
 */
function validateMultipleEntries(entries, accounts = []) {
  if (!Array.isArray(entries)) {
    return {
      isValid: false,
      summary: { total: 0, valid: 0, invalid: 0 },
      details: []
    };
  }

  const details = [];
  let validCount = 0;
  let invalidCount = 0;

  entries.forEach((entry, idx) => {
    const validation = validateJournalEntry(entry, accounts);
    details.push({
      index: idx,
      entryId: entry.id || 'unknown',
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    });

    if (validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  });

  // Also check overall trial balance
  const trialBalance = validateTrialBalance(entries);

  return {
    isValid: invalidCount === 0 && trialBalance.isValid,
    summary: {
      total: entries.length,
      valid: validCount,
      invalid: invalidCount,
      trialsBalanced: trialBalance.isValid
    },
    trialBalance,
    details
  };
}

// ============================================================================
// CSV IMPORT VALIDATION
// ============================================================================

/**
 * Validate CSV row structure for import
 * Expected columns: Date, Category, Amount, Type (optional), Notes (optional)
 * 
 * @param {Array} headers - CSV headers
 * @returns {Object} {isValid, errors: []}
 */
function validateCSVHeaders(headers) {
  const errors = [];
  const required = ['date', 'category', 'amount'];

  const normalized = headers.map((h) => h.toLowerCase().trim());

  required.forEach((col) => {
    if (!normalized.includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    hasType: normalized.includes('type'),
    hasNotes: normalized.includes('notes')
  };
}

/**
 * Validate CSV row for import
 * 
 * @param {Object} row - CSV row object {date, category, amount, type, notes}
 * @param {number} rowIndex - Row number (for error messages)
 * @returns {Object} {isValid, errors: []}
 */
function validateCSVRow(row, rowIndex) {
  const errors = [];

  const dateValidation = validateDate(row.date);
  if (!dateValidation.isValid) {
    errors.push(`Row ${rowIndex}: ${dateValidation.error}`);
  }

  const amountValidation = validateAmount(row.amount);
  if (!amountValidation.isValid) {
    errors.push(`Row ${rowIndex}: ${amountValidation.error}`);
  }

  if (!row.category || row.category.trim() === '') {
    errors.push(`Row ${rowIndex}: Category required`);
  }

  if (row.type && !['income', 'expense'].includes(row.type.toLowerCase())) {
    errors.push(`Row ${rowIndex}: Type must be 'income' or 'expense'`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.Validation = {
    // Amounts & Dates
    validateAmount,
    validateDate,
    validateAccountId,
    
    // Entries
    validateJournalEntry,
    validateOpeningBalance,
    
    // Accounts
    validateAccountName,
    validateAccount,
    
    // Trial Balance
    validateTrialBalance,
    validateAccountBalances,
    
    // Migration
    validateV3Transaction,
    validateV3Ledger,
    
    // Batch
    validateMultipleEntries,
    
    // CSV
    validateCSVHeaders,
    validateCSVRow
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateAmount,
    validateDate,
    validateAccountId,
    validateJournalEntry,
    validateOpeningBalance,
    validateAccountName,
    validateAccount,
    validateTrialBalance,
    validateAccountBalances,
    validateV3Transaction,
    validateV3Ledger,
    validateMultipleEntries,
    validateCSVHeaders,
    validateCSVRow
  };
}
