/**
 * DOUBLE-ENTRY BOOKKEEPING - DATABASE LAYER
 * File: double-entry.js
 * Purpose: IndexedDB operations for accounts and journal entries
 * Version: v4.0 MVP
 * 
 * CRITICAL: This file must work offline (no external API calls)
 * All functions are async and return Promises
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_NAME = 'FinChronicleDB';
const DB_VERSION = 2; // Increment when schema changes

const STORES = {
  ACCOUNTS: 'accounts',
  JOURNAL_ENTRIES: 'journal_entries',
  TRANSACTIONS: 'transactions' // Legacy v3, kept for backup
};

// Global reference to IndexedDB connection
let dbConnection = null;

// ============================================================================
// DEFAULT CHART OF ACCOUNTS
// ============================================================================

const DEFAULT_ACCOUNTS = {
  // ASSETS (1000-1999) - Things you OWN
  assets: [
    { id: '1000', name: 'Cash (บาท)', type: 'asset', subtype: 'cash', isActive: true, isSystem: true },
    { id: '1100', name: 'Checking Account', type: 'asset', subtype: 'bank', isActive: true, isSystem: true },
    { id: '1200', name: 'Savings Account', type: 'asset', subtype: 'bank', isActive: true, isSystem: true },
  ],

  // LIABILITIES (2000-2999) - Things you OWE
  liabilities: [
    { id: '2000', name: 'Credit Card Debt', type: 'liability', subtype: 'credit_card', isActive: true, isSystem: true },
    { id: '2100', name: 'Loans', type: 'liability', subtype: 'loan', isActive: true, isSystem: true },
  ],

  // EQUITY (3000-3999) - Owner's stake
  equity: [
    { id: '3000', name: 'Opening Balance', type: 'equity', subtype: 'opening', isActive: true, isSystem: true },
  ],

  // INCOME (4000-4999) - Money IN
  income: [
    { id: '4000', name: 'Salary', type: 'income', subtype: 'salary', isActive: true, isSystem: true },
    { id: '4100', name: 'Freelance Income', type: 'income', subtype: 'business', isActive: true, isSystem: true },
    { id: '4200', name: 'Investment Returns', type: 'income', subtype: 'investment', isActive: false, isSystem: true },
    { id: '4300', name: 'Bonus', type: 'income', subtype: 'bonus', isActive: false, isSystem: true },
    { id: '4900', name: 'Other Income', type: 'income', subtype: 'other', isActive: true, isSystem: true },
  ],

  // EXPENSES (5000-5999) - Money OUT
  expenses: [
    { id: '5000', name: 'Groceries', type: 'expense', subtype: 'food', isActive: true, isSystem: true },
    { id: '5100', name: 'Dining Out', type: 'expense', subtype: 'food', isActive: true, isSystem: true },
    { id: '5200', name: 'Transportation', type: 'expense', subtype: 'transport', isActive: true, isSystem: true },
    { id: '5300', name: 'Utilities/Internet', type: 'expense', subtype: 'bills', isActive: true, isSystem: true },
    { id: '5400', name: 'Rent', type: 'expense', subtype: 'housing', isActive: true, isSystem: true },
    { id: '5500', name: 'Entertainment', type: 'expense', subtype: 'entertainment', isActive: true, isSystem: true },
    { id: '5600', name: 'Healthcare', type: 'expense', subtype: 'health', isActive: true, isSystem: true },
    { id: '5700', name: 'Shopping', type: 'expense', subtype: 'personal', isActive: true, isSystem: true },
    { id: '5800', name: 'Subscriptions', type: 'expense', subtype: 'subscriptions', isActive: true, isSystem: true },
    { id: '5900', name: 'Other Expenses', type: 'expense', subtype: 'other', isActive: true, isSystem: true },
  ]
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize IndexedDB connection
 * Must be called once on app startup
 * 
 * @returns {Promise<IDBDatabase>} Database connection
 * @throws {Error} If database initialization fails
 */
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbConnection = request.result;
      console.log('✅ IndexedDB initialized');
      resolve(dbConnection);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('📦 Upgrading database schema...');

      // Create accounts store
      if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
        const accountStore = db.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id' });
        accountStore.createIndex('type_idx', 'type');
        accountStore.createIndex('isActive_idx', 'isActive');
        accountStore.createIndex('isSystem_idx', 'isSystem');
        console.log('  ✓ Created accounts store');
      }

      // Create journal_entries store
      if (!db.objectStoreNames.contains(STORES.JOURNAL_ENTRIES)) {
        const entryStore = db.createObjectStore(STORES.JOURNAL_ENTRIES, { keyPath: 'id' });
        entryStore.createIndex('date_idx', 'date');
        entryStore.createIndex('date_type_idx', ['date', 'type']);
        console.log('  ✓ Created journal_entries store');
      }

      // Legacy transactions store already exists in v1
      // We just keep it as read-only backup
    };
  });
}

/**
 * Get database connection (or initialize if needed)
 * Safe to call multiple times
 */
async function getDB() {
  if (!dbConnection) {
    await initDB();
  }
  return dbConnection;
}

/**
 * Seed default accounts into database
 * Only call once on first v4 load
 * 
 * @returns {Promise<number>} Number of accounts seeded
 */
async function seedDefaultAccounts() {
  const db = await getDB();
  const tx = db.transaction(STORES.ACCOUNTS, 'readwrite');
  const store = tx.objectStore(STORES.ACCOUNTS);

  // Flatten accounts array
  const allAccounts = [
    ...DEFAULT_ACCOUNTS.assets,
    ...DEFAULT_ACCOUNTS.liabilities,
    ...DEFAULT_ACCOUNTS.equity,
    ...DEFAULT_ACCOUNTS.income,
    ...DEFAULT_ACCOUNTS.expenses,
  ];

  // Check if already seeded (look for salary account)
  const salaryCheck = await new Promise((resolve) => {
    store.get('4000').onsuccess = (e) => resolve(e.target.result);
  });

  if (salaryCheck) {
    console.log('✅ Accounts already seeded');
    return 0;
  }

  // Add all accounts
  for (const account of allAccounts) {
    // Add timestamps if missing
    if (!account.createdAt) {
      account.createdAt = new Date().toISOString();
    }

    await new Promise((resolve, reject) => {
      const request = store.add(account);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  console.log(`✅ Seeded ${allAccounts.length} default accounts`);
  return allAccounts.length;
}

// ============================================================================
// ACCOUNT OPERATIONS
// ============================================================================

/**
 * Get single account by ID
 * 
 * @param {string} accountId - Account ID (e.g., '1100')
 * @returns {Promise<Object|null>} Account object or null if not found
 */
async function getAccount(accountId) {
  const db = await getDB();
  const tx = db.transaction(STORES.ACCOUNTS, 'readonly');
  
  return new Promise((resolve) => {
    const request = tx.objectStore(STORES.ACCOUNTS).get(accountId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

/**
 * Get all accounts, filtered by type
 * 
 * @param {string} [type] - Optional filter: 'asset', 'liability', 'income', 'expense', 'equity'
 * @param {boolean} [activeOnly=true] - Only return active accounts
 * @returns {Promise<Array>} Array of account objects
 */
async function getAccountsByType(type, activeOnly = true) {
  const db = await getDB();
  const tx = db.transaction(STORES.ACCOUNTS, 'readonly');
  const index = tx.objectStore(STORES.ACCOUNTS).index('type_idx');
  const results = [];

  return new Promise((resolve) => {
    const range = type ? IDBKeyRange.only(type) : undefined;
    const request = range ? index.openCursor(range) : tx.objectStore(STORES.ACCOUNTS).openCursor();

    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const account = cursor.value;
        if (!activeOnly || account.isActive) {
          results.push(account);
        }
        cursor.continue();
      } else {
        // Sort by ID for consistent ordering
        results.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        resolve(results);
      }
    };

    request.onerror = () => resolve([]);
  });
}

/**
 * Get all active accounts (not sorted by type)
 * 
 * @returns {Promise<Array>} All active accounts
 */
async function getAllAccounts() {
  const db = await getDB();
  const tx = db.transaction(STORES.ACCOUNTS, 'readonly');
  const results = [];

  return new Promise((resolve) => {
    tx.objectStore(STORES.ACCOUNTS).openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.isActive) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        results.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        resolve(results);
      }
    };
  });
}

/**
 * Update account (rename, deactivate, etc.)
 * NOTE: Cannot change type (prevents trial balance breaks)
 * 
 * @param {string} accountId - Account ID to update
 * @param {Object} updates - Fields to update {name, isActive, etc}
 * @returns {Promise<Object>} Updated account object
 * @throws {Error} If account not found
 */
async function updateAccount(accountId, updates) {
  const db = await getDB();
  const account = await getAccount(accountId);

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Merge updates (prevent certain field changes)
  const updated = {
    ...account,
    ...updates,
    type: account.type,        // Cannot change type
    id: account.id,            // Cannot change ID
    isSystem: account.isSystem, // Cannot change system flag
    modifiedAt: new Date().toISOString()
  };

  const tx = db.transaction(STORES.ACCOUNTS, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(STORES.ACCOUNTS).put(updated);
    request.onsuccess = () => resolve(updated);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Rename an account
 * Convenience method - validates name before calling updateAccount
 * 
 * @param {string} accountId - Account ID
 * @param {string} newName - New account name
 * @returns {Promise<Object>} Updated account
 * @throws {Error} If name invalid or account not found
 */
async function renameAccount(accountId, newName) {
  // Validate name
  if (!newName || typeof newName !== 'string') {
    throw new Error('Invalid account name');
  }

  const trimmed = newName.trim();
  if (trimmed.length < 2) {
    throw new Error('Account name too short (min 2 chars)');
  }

  if (trimmed.length > 50) {
    throw new Error('Account name too long (max 50 chars)');
  }

  return await updateAccount(accountId, { name: trimmed });
}

/**
 * Deactivate/activate account (show/hide from view)
 * Does NOT delete data or transactions
 * 
 * @param {string} accountId - Account ID
 * @param {boolean} isActive - true to show, false to hide
 * @returns {Promise<Object>} Updated account
 */
async function setAccountActive(accountId, isActive) {
  return await updateAccount(accountId, { isActive: Boolean(isActive) });
}

// ============================================================================
// JOURNAL ENTRY OPERATIONS
// ============================================================================

/**
 * Save journal entry to database
 * Entry MUST be validated before calling this
 * Trial balance MUST be verified before calling this
 * 
 * @param {Object} entry - Journal entry object with debits/credits
 * @returns {Promise<Object>} Saved entry with ID and timestamps
 * @throws {Error} If entry invalid or save fails
 */
async function saveJournalEntry(entry) {
  // Validate structure
  if (!entry.entries || !Array.isArray(entry.entries) || entry.entries.length < 2) {
    throw new Error('Entry must have at least 2 line items');
  }

  if (!entry.date) {
    throw new Error('Entry must have a date');
  }

  // Verify trial balance (debits = credits)
  const totalDebits = entry.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredits = entry.entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  if (totalDebits !== totalCredits) {
    throw new Error(`Unbalanced entry: Debits ${totalDebits} ≠ Credits ${totalCredits}`);
  }

  // Add metadata
  const toSave = {
    id: entry.id || `je_${Date.now()}`,
    date: entry.date,
    entries: entry.entries,
    notes: entry.notes || '',
    tags: entry.tags || [],
    type: entry.type || 'transaction', // 'transaction', 'opening-balance', 'migration'
    balanceCheck: true,
    createdAt: entry.createdAt || new Date().toISOString(),
    modifiedAt: null,
    modifiedReason: null
  };

  const db = await getDB();
  const tx = db.transaction(STORES.JOURNAL_ENTRIES, 'readwrite');

  return new Promise((resolve, reject) => {
    const store = tx.objectStore(STORES.JOURNAL_ENTRIES);
    
    // Use 'put' if updating existing, 'add' if new
    const request = entry.id ? store.put(toSave) : store.add(toSave);
    
    request.onsuccess = () => {
      console.log(`✅ Entry saved: ${toSave.id}`);
      resolve(toSave);
    };
    
    request.onerror = () => {
      console.error('❌ Entry save failed:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get single journal entry by ID
 * 
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object|null>} Entry object or null
 */
async function getJournalEntry(entryId) {
  const db = await getDB();
  const tx = db.transaction(STORES.JOURNAL_ENTRIES, 'readonly');

  return new Promise((resolve) => {
    const request = tx.objectStore(STORES.JOURNAL_ENTRIES).get(entryId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

/**
 * Get journal entries for a specific month
 * Returns in date descending order (newest first)
 * 
 * @param {string} monthStr - Format: 'YYYY-MM' (e.g., '2026-02')
 * @returns {Promise<Array>} Journal entries for that month
 */
async function getJournalEntriesForMonth(monthStr) {
  const db = await getDB();
  const tx = db.transaction(STORES.JOURNAL_ENTRIES, 'readonly');
  const index = tx.objectStore(STORES.JOURNAL_ENTRIES).index('date_idx');
  const results = [];

  return new Promise((resolve) => {
    // Use startsWith range to get all entries in that month
    // e.g., '2026-02' matches '2026-02-01', '2026-02-15', etc.
    const range = IDBKeyRange.startsWith(monthStr);
    index.openCursor(range).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        // Sort by date descending (newest first)
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(results);
      }
    };
  });
}

/**
 * Get ALL journal entries
 * WARNING: Can be large dataset - use with caution
 * 
 * @returns {Promise<Array>} All journal entries
 */
async function getAllJournalEntries() {
  const db = await getDB();
  const tx = db.transaction(STORES.JOURNAL_ENTRIES, 'readonly');
  const results = [];

  return new Promise((resolve) => {
    tx.objectStore(STORES.JOURNAL_ENTRIES).openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(results);
      }
    };
  });
}

/**
 * Delete journal entry (with confirmation)
 * WARNING: This breaks audit trail!
 * Only use for user-initiated deletes, not system operations
 * 
 * @param {string} entryId - Entry ID to delete
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function deleteJournalEntry(entryId) {
  const db = await getDB();
  const tx = db.transaction(STORES.JOURNAL_ENTRIES, 'readwrite');

  return new Promise((resolve) => {
    const request = tx.objectStore(STORES.JOURNAL_ENTRIES).delete(entryId);
    request.onsuccess = () => {
      console.log(`✅ Entry deleted: ${entryId}`);
      resolve(true);
    };
    request.onerror = () => {
      console.warn(`⚠ Delete failed for entry ${entryId}`);
      resolve(false);
    };
  });
}

// ============================================================================
// ACCOUNT BALANCE CALCULATIONS
// ============================================================================

/**
 * Calculate current balance for an account
 * Must look at account type to determine debit/credit increase rules
 * 
 * Asset/Expense: Debit increases, Credit decreases
 * Liability/Income/Equity: Credit increases, Debit decreases
 * 
 * @param {string} accountId - Account ID
 * @returns {Promise<number>} Current balance (could be negative for liabilities)
 */
async function calculateAccountBalance(accountId) {
  const db = await getDB();
  const account = await getAccount(accountId);

  if (!account) {
    return 0;
  }

  const entries = await getAllJournalEntries();
  let balance = 0;

  entries.forEach((entry) => {
    const lineItem = entry.entries.find((e) => e.accountId === accountId);
    
    if (!lineItem) return;

    if (['asset', 'expense'].includes(account.type)) {
      // For assets and expenses: debit increases, credit decreases
      balance += lineItem.debit - lineItem.credit;
    } else {
      // For liabilities, income, equity: credit increases, debit decreases
      balance += lineItem.credit - lineItem.debit;
    }
  });

  return balance;
}

/**
 * Get all account balances at once
 * Returns object with format: { '1100': 5000, '5000': 1500, ... }
 * More efficient than calling calculateAccountBalance multiple times
 * 
 * @returns {Promise<Object>} Account ID -> Balance map
 */
async function getAllAccountBalances() {
  const accounts = await getAllAccounts();
  const entries = await getAllJournalEntries();
  const balances = {};

  // Initialize all to 0
  accounts.forEach((account) => {
    balances[account.id] = 0;
  });

  // Apply all entries
  entries.forEach((entry) => {
    entry.entries.forEach((line) => {
      const account = accounts.find((a) => a.id === line.accountId);
      if (!account) return;

      if (['asset', 'expense'].includes(account.type)) {
        balances[account.id] += line.debit - line.credit;
      } else {
        balances[account.id] += line.credit - line.debit;
      }
    });
  });

  return balances;
}

// ============================================================================
// TRIAL BALANCE VERIFICATION
// ============================================================================

/**
 * Verify trial balance (all debits = all credits)
 * This should ALWAYS be true in a valid double-entry system
 * 
 * @returns {Promise<Object>} {isBalanced, totalDebits, totalCredits, difference}
 */
async function verifyTrialBalance() {
  const entries = await getAllJournalEntries();
  let totalDebits = 0;
  let totalCredits = 0;

  entries.forEach((entry) => {
    entry.entries.forEach((line) => {
      totalDebits += line.debit || 0;
      totalCredits += line.credit || 0;
    });
  });

  const isBalanced = totalDebits === totalCredits;

  return {
    isBalanced,
    totalDebits,
    totalCredits,
    difference: Math.abs(totalDebits - totalCredits)
  };
}

// ============================================================================
// EXPORTS (for testing/external use)
// ============================================================================

// Make functions available globally (if using in browser)
if (typeof window !== 'undefined') {
  window.DoubleEntry = {
    // Init
    initDB,
    getDB,
    seedDefaultAccounts,
    
    // Accounts
    getAccount,
    getAccountsByType,
    getAllAccounts,
    updateAccount,
    renameAccount,
    setAccountActive,
    
    // Entries
    saveJournalEntry,
    getJournalEntry,
    getJournalEntriesForMonth,
    getAllJournalEntries,
    deleteJournalEntry,
    
    // Calculations
    calculateAccountBalance,
    getAllAccountBalances,
    verifyTrialBalance
  };
}

// For Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initDB,
    getDB,
    seedDefaultAccounts,
    getAccount,
    getAccountsByType,
    getAllAccounts,
    updateAccount,
    renameAccount,
    setAccountActive,
    saveJournalEntry,
    getJournalEntry,
    getJournalEntriesForMonth,
    getAllJournalEntries,
    deleteJournalEntry,
    calculateAccountBalance,
    getAllAccountBalances,
    verifyTrialBalance
  };
}
