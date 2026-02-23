/**
 * DOUBLE-ENTRY BOOKKEEPING - MIGRATION LAYER
 * File: migration.js
 * Purpose: Convert v3 single-entry transactions to v4 double-entry format
 * Version: v4.0 MVP
 * 
 * CRITICAL: This is a ONE-WAY migration
 * Cannot go back to v3 format once migrated
 * Always backup before migrating
 * Always dry-run before actual migration
 */

// ============================================================================
// MIGRATION CONSTANTS
// ============================================================================

// Category to account mapping for v3 -> v4 conversion
const DEFAULT_CATEGORY_TO_ACCOUNT = {
  // Income categories (v3) -> Income account (v4)
  salary: '4000', // Salary
  freelance: '4100', // Freelance Income
  bonus: '4300', // Bonus
  investment: '4200', // Investment Returns
  other_income: '4900', // Other Income

  // Expense categories (v3) -> Expense account (v4)
  groceries: '5000', // Groceries
  food: '5000', // Groceries
  dining: '5100', // Dining Out
  transport: '5200', // Transportation
  utilities: '5300', // Utilities
  rent: '5400', // Rent
  entertainment: '5500', // Entertainment
  health: '5600', // Healthcare
  shopping: '5700', // Shopping
  subscriptions: '5800', // Subscriptions
  other_expense: '5900' // Other Expenses
};

// Default bank account for v3 transactions
const DEFAULT_BANK_ACCOUNT = '1100'; // Checking Account

// ============================================================================
// V3 DATA LOADING
// ============================================================================

/**
 * Load v3 transactions from legacy storage
 * v3 format: Single-entry only in localStorage + old transactions IndexedDB store
 * 
 * @returns {Promise<Array>} Array of v3 transactions
 */
async function loadV3Transactions() {
  const db = await window.DoubleEntry.getDB();
  const tx = db.transaction('transactions', 'readonly');
  const transactions = [];

  return new Promise((resolve) => {
    tx.objectStore('transactions').openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        transactions.push(cursor.value);
        cursor.continue();
      } else {
        // Sort by date descending (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(transactions);
      }
    };
  });
}

// ============================================================================
// V3 TO V4 CONVERSION LOGIC
// ============================================================================

/**
 * Convert single v3 transaction to double-entry journal entry
 * 
 * v3 format: {id, type, amount, category, date, notes}
 * v4 format: {id, date, entries: [{accountId, debit, credit}, ...], notes, type}
 * 
 * @param {Object} v3Txn - v3 transaction
 * @param {Object} [options] - Conversion options
 * @param {Object} [options.categoryMap] - Custom category to account mapping
 * @param {string} [options.bankAccount] - Bank account ID (default 1100)
 * @returns {Object|null} Journal entry or null if conversion fails
 */
function convertV3TransactionToV4(v3Txn, options = {}) {
  const categoryMap = options.categoryMap || DEFAULT_CATEGORY_TO_ACCOUNT;
  const bankAccount = options.bankAccount || DEFAULT_BANK_ACCOUNT;

  // Validate
  if (!v3Txn || !v3Txn.type || !v3Txn.amount || !v3Txn.date || !v3Txn.category) {
    console.error('Invalid v3 transaction:', v3Txn);
    return null;
  }

  const amount = parseFloat(v3Txn.amount);

  if (isNaN(amount) || amount <= 0) {
    console.error('Invalid amount:', v3Txn.amount);
    return null;
  }

  // Map category to account
  const categoryLower = v3Txn.category.toLowerCase().replace(/\s+/g, '_');
  const targetAccount = categoryMap[categoryLower] || categoryMap['other_expense'];

  if (!targetAccount) {
    console.error('Cannot map category:', v3Txn.category);
    return null;
  }

  // Build journal entry
  // Income: Debit bank, Credit income account
  // Expense: Debit expense account, Credit bank

  let entries = [];

  if (v3Txn.type === 'income') {
    entries = [
      { accountId: bankAccount, debit: amount, credit: 0 },
      { accountId: targetAccount, debit: 0, credit: amount }
    ];
  } else if (v3Txn.type === 'expense') {
    entries = [
      { accountId: targetAccount, debit: amount, credit: 0 },
      { accountId: bankAccount, debit: 0, credit: amount }
    ];
  } else {
    console.error('Unknown transaction type:', v3Txn.type);
    return null;
  }

  // Validate trial balance
  const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);

  if (totalDebits !== totalCredits) {
    console.error('Trial balance failed after conversion:', v3Txn);
    return null;
  }

  // Create v4 entry
  return {
    id: `migrated_${v3Txn.id}`,
    date: v3Txn.date,
    entries,
    notes: v3Txn.notes || `Migrated from v3: ${v3Txn.category}`,
    tags: ['migrated_v3', v3Txn.type],
    type: 'transaction', // Mark as regular transaction
    balanceCheck: true,
    createdAt: v3Txn.createdAt || new Date().toISOString(),
    modifiedAt: null,
    modifiedReason: null,
    _v3SourceId: v3Txn.id // Keep reference to source
  };
}

/**
 * Convert array of v3 transactions to v4 journal entries
 * Handles validation and error reporting
 * 
 * @param {Array} v3Transactions - Array of v3 transactions
 * @param {Object} [options] - Conversion options
 * @returns {Object} {success: true/false, entries: [], failed: [], stats: {}}
 */
function convertV3TransactionsToV4(v3Transactions, options = {}) {
  if (!Array.isArray(v3Transactions)) {
    return {
      success: false,
      entries: [],
      failed: [],
      stats: { total: 0, converted: 0, failed: 0 },
      error: 'Input is not an array'
    };
  }

  const entries = [];
  const failed = [];

  v3Transactions.forEach((v3Txn) => {
    const v4Entry = convertV3TransactionToV4(v3Txn, options);

    if (v4Entry) {
      entries.push(v4Entry);
    } else {
      failed.push({
        v3Transaction: v3Txn,
        reason: 'Conversion failed (invalid data)'
      });
    }
  });

  return {
    success: failed.length === 0,
    entries,
    failed,
    stats: {
      total: v3Transactions.length,
      converted: entries.length,
      failed: failed.length,
      successRate: ((entries.length / v3Transactions.length) * 100).toFixed(2)
    }
  };
}

// ============================================================================
// MIGRATION SAFETY: BACKUP & DRY-RUN
// ============================================================================

/**
 * Create backup of v3 data before migration
 * Stores in localStorage with timestamp
 * 
 * @param {Array} v3Transactions - Data to backup
 * @param {string} [label] - Optional label for backup
 * @returns {string} Backup ID
 */
function createV3Backup(v3Transactions, label = '') {
  const backupId = `v3_backup_${Date.now()}`;
  const backup = {
    id: backupId,
    label: label || `Backup before migration at ${new Date().toLocaleString()}`,
    timestamp: new Date().toISOString(),
    count: v3Transactions.length,
    data: v3Transactions
  };

  // Store in localStorage (usually 5-10MB available)
  try {
    localStorage.setItem(backupId, JSON.stringify(backup));
    console.log(`✅ Backup created: ${backupId}`);
    return backupId;
  } catch (e) {
    console.error('❌ Backup failed:', e);
    throw new Error('Insufficient storage for backup');
  }
}

/**
 * Retrieve backup from localStorage
 * 
 * @param {string} backupId - Backup ID to restore
 * @returns {Object|null} Backup object or null if not found
 */
function getV3Backup(backupId) {
  try {
    const data = localStorage.getItem(backupId);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error retrieving backup:', e);
    return null;
  }
}

/**
 * List all available backups
 * 
 * @returns {Array} Array of backup metadata
 */
function listV3Backups() {
  const backups = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('v3_backup_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        backups.push({
          id: key,
          label: data.label,
          timestamp: data.timestamp,
          count: data.count
        });
      } catch (e) {
        // Skip corrupted backups
      }
    }
  }

  return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Perform dry-run of migration
 * Simulates migration without modifying data
 * 
 * @param {Array} v3Transactions - Data to test
 * @param {Object} [options] - Conversion options
 * @returns {Object} Dry-run results
 */
async function performDryRunMigration(v3Transactions, options = {}) {
  console.log('🔄 Starting dry-run migration...');

  // Step 1: Validate v3 data
  const validation = window.Validation.validateV3Ledger(v3Transactions);
  if (!validation.isValid) {
    return {
      success: false,
      phase: 'validation',
      message: 'v3 data validation failed',
      details: validation
    };
  }

  console.log(`✅ v3 data validated: ${validation.validCount}/${validation.totalCount}`);

  // Step 2: Convert to v4
  const conversion = convertV3TransactionsToV4(v3Transactions, options);
  if (!conversion.success) {
    return {
      success: false,
      phase: 'conversion',
      message: 'v3 to v4 conversion failed',
      details: conversion
    };
  }

  console.log(`✅ Converted: ${conversion.stats.converted} transactions`);

  // Step 3: Validate v4 entries
  const multiValidation = window.Validation.validateMultipleEntries(conversion.entries, []);
  if (!multiValidation.isValid) {
    return {
      success: false,
      phase: 'v4_validation',
      message: 'v4 entry validation failed',
      details: multiValidation
    };
  }

  console.log('✅ v4 entries validated');

  // Step 4: Check trial balance
  const trialBalance = window.Validation.validateTrialBalance(conversion.entries);
  if (!trialBalance.isValid) {
    return {
      success: false,
      phase: 'trial_balance',
      message: 'Trial balance check failed',
      details: trialBalance
    };
  }

  console.log('✅ Trial balance verified');

  return {
    success: true,
    phase: 'complete',
    message: 'Dry-run successful - ready for actual migration',
    summary: {
      totalV3Transactions: v3Transactions.length,
      convertedToV4: conversion.entries.length,
      failedConversions: conversion.failed.length,
      trialBalance: trialBalance
    }
  };
}

// ============================================================================
// ACTUAL MIGRATION
// ============================================================================

/**
 * Execute actual migration from v3 to v4
 * CRITICAL: This is ONE-WAY. Cannot undo.
 * 
 * Steps:
 * 1. Load v3 transactions
 * 2. Create backup
 * 3. Perform dry-run
 * 4. Seed default accounts
 * 5. Save all converted entries
 * 6. Verify trial balance
 * 7. Mark migration complete
 * 
 * @param {Object} [options] - Migration options
 * @param {boolean} [options.createBackup=true] - Create backup before migration
 * @param {boolean} [options.dryRun=true] - Perform dry-run first
 * @returns {Promise<Object>} Migration result
 */
async function executeMigration(options = {}) {
  const createBackup = options.createBackup !== false;
  const dryRun = options.dryRun !== false;
  const conversionOptions = options.conversionOptions || {};

  console.log('🚀 Starting v3 to v4 migration...');

  try {
    // Step 1: Load v3 data
    console.log('📥 Loading v3 transactions...');
    const v3Transactions = await loadV3Transactions();
    console.log(`✅ Loaded ${v3Transactions.length} v3 transactions`);

    // Step 2: Create backup
    let backupId = null;
    if (createBackup) {
      console.log('💾 Creating backup...');
      backupId = createV3Backup(v3Transactions, 'Backup before v3->v4 migration');
    }

    // Step 3: Dry-run
    if (dryRun) {
      console.log('🔄 Performing dry-run...');
      const dryRunResult = await performDryRunMigration(v3Transactions, conversionOptions);

      if (!dryRunResult.success) {
        throw new Error(
          `Dry-run failed at ${dryRunResult.phase}: ${dryRunResult.message}`
        );
      }

      console.log('✅ Dry-run passed');
    }

    // Step 4: Seed default accounts
    console.log('🌱 Seeding default accounts...');
    const accountCount = await window.DoubleEntry.seedDefaultAccounts();
    console.log(`✅ Seeded ${accountCount} accounts`);

    // Step 5: Convert and save entries
    console.log('🔄 Converting and saving v3 transactions...');
    const conversion = convertV3TransactionsToV4(v3Transactions, conversionOptions);

    if (!conversion.success) {
      throw new Error(`Conversion failed: ${conversion.stats.failed} transactions failed`);
    }

    // Save each entry
    for (const entry of conversion.entries) {
      await window.DoubleEntry.saveJournalEntry(entry);
    }

    console.log(`✅ Saved ${conversion.entries.length} journal entries`);

    // Step 6: Verify trial balance
    console.log('⚖️ Verifying trial balance...');
    const trialBalance = await window.DoubleEntry.verifyTrialBalance();

    if (!trialBalance.isBalanced) {
      throw new Error(
        `Trial balance failed after migration: ${trialBalance.difference} difference`
      );
    }

    console.log('✅ Trial balance verified');

    // Step 7: Mark complete
    console.log('✨ Migration complete!');
    localStorage.setItem('v4_migration_complete', new Date().toISOString());
    localStorage.setItem('v4_migration_backup_id', backupId || 'none');

    return {
      success: true,
      phase: 'complete',
      message: 'Migration successful',
      summary: {
        v3Transactions: v3Transactions.length,
        convertedEntries: conversion.entries.length,
        failedConversions: conversion.failed.length,
        backupId,
        trialBalance
      }
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      phase: 'error',
      message: error.message,
      error: error.toString()
    };
  }
}

// ============================================================================
// MIGRATION STATUS & RECOVERY
// ============================================================================

/**
 * Check if migration has been completed
 * 
 * @returns {Object} {isMigrated, timestamp, backupId}
 */
function getMigrationStatus() {
  const timestamp = localStorage.getItem('v4_migration_complete');
  const backupId = localStorage.getItem('v4_migration_backup_id');

  return {
    isMigrated: Boolean(timestamp),
    timestamp: timestamp || null,
    backupId: backupId || null
  };
}

/**
 * Restore from backup (if migration had issues)
 * WARNING: This requires manual intervention to fix v3 storage
 * 
 * @param {string} backupId - Backup ID to restore from
 * @returns {Object} Restored backup data
 */
function restoreFromBackup(backupId) {
  const backup = getV3Backup(backupId);

  if (!backup) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  console.warn(
    `⚠️  Restoring from backup ${backupId}. You'll need to manually restore v3 storage.`
  );

  return backup;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.Migration = {
    // Loading
    loadV3Transactions,
    
    // Conversion
    convertV3TransactionToV4,
    convertV3TransactionsToV4,
    
    // Safety
    createV3Backup,
    getV3Backup,
    listV3Backups,
    performDryRunMigration,
    
    // Execution
    executeMigration,
    
    // Status
    getMigrationStatus,
    restoreFromBackup
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadV3Transactions,
    convertV3TransactionToV4,
    convertV3TransactionsToV4,
    createV3Backup,
    getV3Backup,
    listV3Backups,
    performDryRunMigration,
    executeMigration,
    getMigrationStatus,
    restoreFromBackup
  };
}
