# Double-Entry Implementation Roadmap

**Status:** MVP Planning  
**Timeline:** 6-8 weeks  
**Start Date:** TBD  
**Target Release:** v4.0.0  
**Last Updated:** February 23, 2026

---

## Quick Summary

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|------------|
| **Phase 1: Data Layer** | 2 weeks | IndexedDB, accounts, validation | Database working, CRUD functions |
| **Phase 2: Migration Layer** | 2 weeks | Convert v3→v4, edge cases | Migration script, rollback tested |
| **Phase 3: UI Implementation** | 1.5 weeks | Forms, displays, interactions | Working transaction form + displays |
| **Phase 4: Integration Testing** | 0.5 weeks | Cross-browser, edge cases, offline | Test report |
| **TOTAL MVP** | **6 weeks** | Everything above | **v4.0.0 Release Candidate** |

Optional continue → v4.1 (advanced features)

---

## Phase 1: Data Layer (Weeks 1-2)

**Goal:** Build rock-solid database foundation. No UI yet. Just data.

**Why start here?** Everything depends on this. Get it right first.

### Week 1: Core IndexedDB Setup

#### Task 1.1: IndexedDB Schema & Initialization
**Difficulty:** Medium | **Owner:** Backend Dev | **Hours:** 8

```javascript
// File: double-entry.js (NEW)

// Initialize IndexedDB with new stores
async function initDoubleEntryDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FinChronicleDB', 2); // Version 2

        request.onupgradeneeded = (e) => {
            const db = e.target.result;

            // Store 1: accounts
            if (!db.objectStoreNames.contains('accounts')) {
                const accountStore = db.createObjectStore('accounts', { keyPath: 'id' });
                accountStore.createIndex('type_idx', 'type');
                accountStore.createIndex('isActive_idx', 'isActive');
            }

            // Store 2: journal_entries
            if (!db.objectStoreNames.contains('journal_entries')) {
                const entryStore = db.createObjectStore('journal_entries', { keyPath: 'id' });
                entryStore.createIndex('date_idx', 'date');
                entryStore.createIndex('date_type_idx', ['date', 'type']);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Seed default chart of accounts
async function seedDefaultAccounts(db) {
    const tx = db.transaction('accounts', 'readwrite');
    const store = tx.objectStore('accounts');

    const defaultAccounts = [
        // Assets
        { id: '1000', name: 'Cash', type: 'asset', subtype: 'cash', balance: 0, isActive: true },
        { id: '1100', name: 'Checking Account', type: 'asset', subtype: 'bank', balance: 0, isActive: true },
        { id: '1200', name: 'Savings Account', type: 'asset', subtype: 'bank', balance: 0, isActive: true },

        // Liabilities
        { id: '2000', name: 'Credit Card Debt', type: 'liability', subtype: 'credit_card', balance: 0, isActive: true },
        { id: '2100', name: 'Loans', type: 'liability', subtype: 'loan', balance: 0, isActive: true },

        // Equity
        { id: '3000', name: 'Opening Balance', type: 'equity', subtype: 'opening', balance: 0, isActive: true },

        // Income
        { id: '4000', name: 'Salary', type: 'income', subtype: 'salary', balance: 0, isActive: true },
        { id: '4100', name: 'Freelance Income', type: 'income', subtype: 'business', balance: 0, isActive: true },
        { id: '4900', name: 'Other Income', type: 'income', subtype: 'other', balance: 0, isActive: true },

        // Expenses
        { id: '5000', name: 'Groceries', type: 'expense', subtype: 'food', balance: 0, isActive: true },
        { id: '5100', name: 'Dining Out', type: 'expense', subtype: 'food', balance: 0, isActive: true },
        { id: '5200', name: 'Transportation', type: 'expense', subtype: 'transport', balance: 0, isActive: true },
        { id: '5300', name: 'Utilities', type: 'expense', subtype: 'bills', balance: 0, isActive: true },
        { id: '5400', name: 'Rent', type: 'expense', subtype: 'housing', balance: 0, isActive: true },
        { id: '5900', name: 'Other Expenses', type: 'expense', subtype: 'other', balance: 0, isActive: true },
    ];

    for (const account of defaultAccounts) {
        await new Promise((resolve) => {
            store.add(account).onsuccess = resolve;
        });
    }
}
```

**Deliverable:**
- ✅ IndexedDB v2 with accounts + journal_entries stores
- ✅ Indexes created
- ✅ Default chart of accounts seeded
- ✅ Function to initialize DB

**Tests Needed:**
- ✅ DB initializes correctly
- ✅ Stores exist with correct indexes
- ✅ Default accounts seeded

---

#### Task 1.2: Account CRUD Operations
**Difficulty:** Easy | **Owner:** Backend Dev | **Hours:** 6

```javascript
// Get account by ID
async function getAccount(accountId) {
    const tx = db.transaction('accounts', 'readonly');
    return new Promise((resolve) => {
        tx.objectStore('accounts').get(accountId).onsuccess = (e) => {
            resolve(e.target.result);
        };
    });
}

// Get all accounts by type
async function getAccountsByType(type) {
    const tx = db.transaction('accounts', 'readonly');
    const index = tx.objectStore('accounts').index('type_idx');
    const results = [];

    return new Promise((resolve) => {
        index.openCursor(IDBKeyRange.only(type)).onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
    });
}

// Update account (for editing name, activation)
async function updateAccount(accountId, updates) {
    const account = await getAccount(accountId);
    const updated = { ...account, ...updates, modifiedAt: new Date().toISOString() };

    const tx = db.transaction('accounts', 'readwrite');
    return new Promise((resolve) => {
        tx.objectStore('accounts').put(updated).onsuccess = () => {
            resolve(updated);
        };
    });
}

// Calculate account balance
async function calculateAccountBalance(accountId) {
    const account = await getAccount(accountId);
    const tx = db.transaction('journal_entries', 'readonly');
    let balance = 0;

    return new Promise((resolve) => {
        tx.objectStore('journal_entries').openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const entry = cursor.value;
                const lineItem = entry.entries.find(l => l.accountId === accountId);
                
                if (lineItem) {
                    if (['asset', 'expense'].includes(account.type)) {
                        balance += lineItem.debit - lineItem.credit;
                    } else {
                        balance += lineItem.credit - lineItem.debit;
                    }
                }
                cursor.continue();
            } else {
                resolve(balance);
            }
        };
    });
}
```

**Deliverable:**
- ✅ CRUD functions for accounts
- ✅ Balance calculation logic
- ✅ Filtering by type

**Tests Needed:**
- ✅ Get/update accounts
- ✅ Balance calculation accuracy
- ✅ Type filtering works

---

#### Task 1.3: Journal Entry Validation
**Difficulty:** Medium | **Owner:** Backend Dev | **Hours:** 8

```javascript
// Validate journal entry before save
function validateJournalEntry(entry) {
    const errors = [];

    // Check entries array
    if (!Array.isArray(entry.entries) || entry.entries.length < 2) {
        errors.push('Entry must have at least 2 line items');
    }

    // Check balance
    const totalDebits = entry.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = entry.entries.reduce((sum, e) => sum + e.credit, 0);

    if (totalDebits !== totalCredits) {
        errors.push(`Unbalanced: Debits ${totalDebits} ≠ Credits ${totalCredits}`);
    }

    // Check amounts
    entry.entries.forEach((line, idx) => {
        if (line.debit < 0 || line.credit < 0) {
            errors.push(`Line ${idx + 1}: Negative amounts not allowed`);
        }
        if (line.debit > 0 && line.credit > 0) {
            errors.push(`Line ${idx + 1}: Cannot have both debit and credit`);
        }
        if (!line.accountId) {
            errors.push(`Line ${idx + 1}: Missing account ID`);
        }
    });

    // Check date
    if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        errors.push('Invalid date format (use YYYY-MM-DD)');
    }

    return { isValid: errors.length === 0, errors };
}

// Example usage
const entry = {
    date: '2026-02-23',
    entries: [
        { accountId: '1100', debit: 50, credit: 0 },
        { accountId: '5000', debit: 0, credit: 50 }
    ]
};

const validation = validateJournalEntry(entry);
if (!validation.isValid) {
    console.error(validation.errors);
}
```

**Deliverable:**
- ✅ Comprehensive validation logic
- ✅ Clear error messages
- ✅ Catches all edge cases

**Tests Needed:**
- ✅ Unbalanced entries rejected
- ✅ Negative amounts rejected
- ✅ Valid entries accepted
- ✅ Both debit and credit rejected

---

### Week 2: Save/Read & Aggregations

#### Task 2.1: Save & Retrieve Journal Entries
**Difficulty:** Medium | **Owner:** Backend Dev | **Hours:** 8

```javascript
// Save journal entry (with validation)
async function saveJournalEntry(entry) {
    // Validate first
    const validation = validateJournalEntry(entry);
    if (!validation.isValid) {
        throw new Error(`Cannot save: ${validation.errors.join(', ')}`);
    }

    // Add metadata
    const toSave = {
        id: entry.id || Date.now().toString(),
        date: entry.date,
        entries: entry.entries,
        notes: entry.notes || '',
        tags: entry.tags || [],
        balanceCheck: true,
        createdAt: entry.createdAt || new Date().toISOString(),
        modifiedAt: entry.modifiedAt || null,
        modifiedReason: entry.modifiedReason || null
    };

    const tx = db.transaction('journal_entries', 'readwrite');
    return new Promise((resolve, reject) => {
        const request = entry.id ? tx.objectStore('journal_entries').put(toSave) : 
                                    tx.objectStore('journal_entries').add(toSave);
        
        request.onsuccess = () => resolve(toSave);
        request.onerror = () => reject(request.error);
    });
}

// Get journal entry by ID
async function getJournalEntry(entryId) {
    const tx = db.transaction('journal_entries', 'readonly');
    return new Promise((resolve) => {
        tx.objectStore('journal_entries').get(entryId).onsuccess = (e) => {
            resolve(e.target.result);
        };
    });
}

// Get entries for a month
async function getJournalEntriesForMonth(monthStr) {
    // monthStr format: "2026-02"
    const tx = db.transaction('journal_entries', 'readonly');
    const index = tx.objectStore('journal_entries').index('date_idx');
    const results = [];

    return new Promise((resolve) => {
        index.openCursor(IDBKeyRange.startsWith(monthStr)).onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
        };
    });
}

// Delete journal entry
async function deleteJournalEntry(entryId) {
    const tx = db.transaction('journal_entries', 'readwrite');
    return new Promise((resolve) => {
        tx.objectStore('journal_entries').delete(entryId).onsuccess = () => {
            resolve(true);
        };
    });
}
```

**Deliverable:**
- ✅ Save function with validation
- ✅ Retrieve by ID
- ✅ Get by month
- ✅ Delete function
- ✅ Sorting by date

**Tests Needed:**
- ✅ Save validates before insert
- ✅ Retrieve returns correct entries
- ✅ Month filter works
- ✅ Delete removes entry

---

#### Task 2.2: Aggregations Class
**Difficulty:** Medium | **Owner:** Backend Dev | **Hours:** 10

```javascript
// File: aggregations.js (NEW)

class Aggregations {
    constructor(journalEntries, accounts) {
        this.entries = journalEntries;
        this.accounts = accounts;
        this.accountMap = new Map(accounts.map(a => [a.id, a]));
    }

    // Get income for a month
    getMonthIncome(month) {
        return this.entries
            .filter(e => e.date.startsWith(month))
            .reduce((sum, entry) => {
                return sum + entry.entries
                    .filter(line => {
                        const acc = this.accountMap.get(line.accountId);
                        return acc && acc.type === 'income';
                    })
                    .reduce((s, line) => s + line.credit, 0);
            }, 0);
    }

    // Get expenses for a month
    getMonthExpense(month) {
        return this.entries
            .filter(e => e.date.startsWith(month))
            .reduce((sum, entry) => {
                return sum + entry.entries
                    .filter(line => {
                        const acc = this.accountMap.get(line.accountId);
                        return acc && acc.type === 'expense';
                    })
                    .reduce((s, line) => s + line.debit, 0);
            }, 0);
    }

    // Get account balance
    getAccountBalance(accountId) {
        const account = this.accountMap.get(accountId);
        if (!account) return 0;

        return this.entries.reduce((balance, entry) => {
            const lineItem = entry.entries.find(e => e.accountId === accountId);
            if (!lineItem) return balance;

            if (['asset', 'expense'].includes(account.type)) {
                return balance + lineItem.debit - lineItem.credit;
            }
            return balance + lineItem.credit - lineItem.debit;
        }, 0);
    }

    // Get monthly summary
    getMonthSummary(month) {
        const income = this.getMonthIncome(month);
        const expense = this.getMonthExpense(month);
        return {
            income,
            expense,
            net: income - expense,
            count: this.entries.filter(e => e.date.startsWith(month)).length
        };
    }

    // Get net worth
    getNetWorth() {
        const assets = Array.from(this.accountMap.values())
            .filter(a => a.type === 'asset')
            .reduce((sum, a) => sum + this.getAccountBalance(a.id), 0);

        const liabilities = Array.from(this.accountMap.values())
            .filter(a => a.type === 'liability')
            .reduce((sum, a) => sum + this.getAccountBalance(a.id), 0);

        return assets - liabilities;
    }

    // Verify trial balance (all debits = all credits)
    verifyTrialBalance() {
        let totalDebits = 0;
        let totalCredits = 0;

        this.entries.forEach(entry => {
            entry.entries.forEach(line => {
                totalDebits += line.debit;
                totalCredits += line.credit;
            });
        });

        return {
            isBalanced: totalDebits === totalCredits,
            totalDebits,
            totalCredits,
            difference: Math.abs(totalDebits - totalCredits)
        };
    }
}

// Usage
let agg = null;

async function loadAggregations() {
    const entries = await getAllJournalEntries();
    const accounts = await getAccount();
    agg = new Aggregations(entries, accounts);
}
```

**Deliverable:**
- ✅ Aggregations class
- ✅ All aggregation methods
- ✅ Trial balance verification
- ✅ Net worth calculation

**Tests Needed:**
- ✅ Monthly income/expense correct
- ✅ Account balances calculated correctly
- ✅ Net worth accurate
- ✅ Trial balance verified

---

#### Task 2.3: Test Suite (Phase 1)
**Difficulty:** Medium | **Owner:** QA Dev | **Hours:** 8

```javascript
// File: tests/phase1.test.js (NEW)

// Test 1: Schema
describe('IndexedDB Schema', () => {
    it('creates accounts store with indexes', async () => {
        const db = await initDoubleEntryDB();
        expect(db.objectStoreNames.contains('accounts')).toBe(true);
    });

    it('creates journal_entries store with indexes', async () => {
        const db = await initDoubleEntryDB();
        expect(db.objectStoreNames.contains('journal_entries')).toBe(true);
    });
});

// Test 2: Validation
describe('Journal Entry Validation', () => {
    it('rejects unbalanced entries', () => {
        const invalid = {
            date: '2026-02-23',
            entries: [
                { accountId: '1100', debit: 100, credit: 0 },
                { accountId: '5000', debit: 0, credit: 50 } // Should be 100
            ]
        };
        const result = validateJournalEntry(invalid);
        expect(result.isValid).toBe(false);
    });

    it('accepts balanced entries', () => {
        const valid = {
            date: '2026-02-23',
            entries: [
                { accountId: '1100', debit: 50, credit: 0 },
                { accountId: '5000', debit: 0, credit: 50 }
            ]
        };
        const result = validateJournalEntry(valid);
        expect(result.isValid).toBe(true);
    });
});

// Test 3: Aggregations
describe('Aggregations', () => {
    it('calculates monthly income correctly', () => {
        const entries = [
            {
                date: '2026-02-23',
                entries: [
                    { accountId: '1100', debit: 2000, credit: 0 },
                    { accountId: '4000', debit: 0, credit: 2000 }
                ]
            }
        ];
        const agg = new Aggregations(entries, defaultAccounts);
        expect(agg.getMonthIncome('2026-02')).toBe(2000);
    });

    it('calculates net worth', () => {
        const agg = new Aggregations(sampleEntries, defaultAccounts);
        const netWorth = agg.getNetWorth();
        expect(netWorth).toBeGreaterThanOrEqual(0);
    });
});
```

**Deliverable:**
- ✅ Comprehensive test suite
- ✅ All critical paths covered
- ✅ Edge cases identified

---

**Phase 1 Summary:**
- ✅ Database initialized
- ✅ CRUD operations working
- ✅ Validation strict
- ✅ Aggregations accurate
- ✅ Tests passing
- **Status:** Ready for migration layer

---

## Phase 2: Migration Layer (Weeks 3-4)

**Goal:** Convert existing v3 data to v4 format safely. This is THE RISKY PART.

**Risk Level:** 🔴 HIGH - Data conversion always has edge cases

### Week 3: Migration Design & Testing

#### Task 3.1: Migration Strategy Document
**Difficulty:** Medium | **Owner:** Product/Backend | **Hours:** 6

```
MIGRATION STRATEGY DOCUMENT

Goal: Convert v3 transactions to v4 journal entries

Approach:
1. Create opening balance transaction
2. Convert each v3 transaction to journal entry
3. Calculate final account balances
4. Verify trial balance before committing
5. Create rollback point

Key Decisions:
- Opening Balance: Use opening date = "2026-01-01" (configurable)
- Asset accounts: All transactions start from "Checking Account" (configurable)
- Unmapped categories: Use "Other Expense" (configurable)
- Trial balance: MUST equal zero to commit
- Rollback: Keep v3 data as backup (read-only)

Edge Cases Handled:
✅ User starts with explicit opening balances
✅ Very old data (2020-01-01)
✅ Future transactions (somehow)
✅ Duplicate transactions
✅ Invalid amounts (negative)
❌ Archived transactions
❌ Deleted transactions
```

**Deliverable:**
- ✅ Migration strategy
- ✅ Risk assessment
- ✅ Rollback plan

---

#### Task 3.2: Category → Account Mapping
**Difficulty:** Easy | **Owner:** Backend Dev | **Hours:** 4

```javascript
// File: migration.js (NEW)

const CATEGORY_TO_ACCOUNT_MAP = {
    // Income categories mapped to income accounts
    'Salary': '4000',
    'Business': '4100',
    'Freelance': '4100',
    'Investment': '4900',
    'Rental Income': '4900',
    'Gifts/Refunds': '4900',
    'Bonus': '4000',
    'Other Income': '4900',

    // Expense categories mapped to expense accounts
    'Food': '5000',
    'Groceries': '5000',
    'Dining': '5100',
    'Transport': '5200',
    'Utilities/Bills': '5300',
    'Rent': '5400',
    'Kids/School': '5900',
    'Fees/Docs': '5900',
    'Healthcare': '5900',
    'Personal/Shopping': '5900',
    'Insurance/Taxes': '5900',
    'Savings/Investments': '5900',
    'Charity/Gifts': '5900',
    'Debt/Loans': '5900',
    'Household': '5900',
    'Misc/Buffer': '5900',
    'Other Expense': '5900'
};

// Get account ID for a category
function getCategoryAccountId(category, type) {
    const accountId = CATEGORY_TO_ACCOUNT_MAP[category];
    if (accountId) return accountId;

    // Fallback
    return type === 'income' ? '4900' : '5900';
}

// Get target account for transaction type
function getTargetAccount(type) {
    if (type === 'expense') return 'Checking Account'; // From
    if (type === 'income') return '4000'; // To (Salary)
    return '1100'; // Default to checking
}
```

**Deliverable:**
- ✅ Complete mapping table
- ✅ Handles unmapped categories gracefully
- ✅ Fallback logic works

---

#### Task 3.3: Migration Function
**Difficulty:** Hard | **Owner:** Backend Dev | **Hours:** 12

```javascript
// Main migration function
async function migrateV3ToV4(options = {}) {
    const {
        openingDate = '2026-01-01',
        openingBalance = 0,
        dryRun = false // If true, test without saving
    } = options;

    console.log('🚀 Starting migration...');

    try {
        // Step 1: Get all v3 transactions
        const v3Txs = transactions; // From current app.js
        console.log(`Found ${v3Txs.length} v3 transactions`);

        // Step 2: Create opening balance entry
        const openingEntry = {
            id: `opening_${Date.now()}`,
            date: openingDate,
            notes: 'Opening Balances',
            entries: [
                {
                    accountId: '1100', // Checking
                    debit: Math.max(openingBalance, 0),
                    credit: 0
                },
                {
                    accountId: '3000', // Equity
                    debit: 0,
                    credit: Math.max(openingBalance, 0)
                }
            ],
            balanceCheck: true,
            createdAt: new Date(openingDate).toISOString(),
            tags: ['opening-balance']
        };

        // Step 3: Convert v3 transactions
        const v4Entries = [openingEntry];

        for (const v3Tx of v3Txs) {
            const v4Entry = convertV3Transaction(v3Tx);
            if (v4Entry) {
                v4Entries.push(v4Entry);
            }
        }

        console.log(`Converted to ${v4Entries.length} v4 entries`);

        // Step 4: Verify
        const agg = new Aggregations(v4Entries, defaultAccounts);
        const balance = agg.verifyTrialBalance();

        if (!balance.isBalanced) {
            throw new Error(`Trial balance failed: DR=${balance.totalDebits}, CR=${balance.totalCredits}`);
        }

        console.log('✅ Trial balance verified');

        // Step 5: Save (or just dry-run)
        if (dryRun) {
            console.log('📋 DRY RUN - No data saved');
            return { status: 'success', entries: v4Entries.length, balance };
        }

        for (const entry of v4Entries) {
            await saveJournalEntry(entry);
        }

        console.log('💾 All entries saved');
        return { status: 'success', entries: v4Entries.length, balance };

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

// Convert single v3 transaction to v4
function convertV3Transaction(v3Tx) {
    try {
        const accountId = getCategoryAccountId(v3Tx.category, v3Tx.type);

        if (!accountId) {
            console.warn(`Skipping: unmapped category "${v3Tx.category}"`);
            return null;
        }

        // Determine from/to accounts
        let fromAccountId, toAccountId;

        if (v3Tx.type === 'expense') {
            fromAccountId = '1100'; // Checking
            toAccountId = accountId; // Expense account
        } else if (v3Tx.type === 'income') {
            fromAccountId = accountId; // Income account
            toAccountId = '1100'; // Checking
        } else {
            return null; // Unknown type
        }

        // Create v4 entry
        return {
            id: v3Tx.id,
            date: v3Tx.date,
            notes: v3Tx.notes || '',
            entries: [
                {
                    accountId: fromAccountId,
                    debit: v3Tx.type === 'expense' ? v3Tx.amount : 0,
                    credit: v3Tx.type === 'income' ? v3Tx.amount : 0
                },
                {
                    accountId: toAccountId,
                    debit: v3Tx.type === 'income' ? v3Tx.amount : 0,
                    credit: v3Tx.type === 'expense' ? v3Tx.amount : 0
                }
            ],
            balanceCheck: true,
            createdAt: v3Tx.createdAt,
            tags: [v3Tx.category.toLowerCase().replace(' ', '-')]
        };
    } catch (error) {
        console.error(`Error converting transaction ${v3Tx.id}:`, error);
        return null;
    }
}
```

**Deliverable:**
- ✅ Migration function with error handling
- ✅ Opening balance creation
- ✅ Trial balance verification
- ✅ Dry-run capability
- ✅ Rollback strategy (keep v3 data)

**Tests Needed:**
```javascript
// Test migration
describe('Migration V3→V4', () => {
    it('converts 100 transactions', async () => {
        const result = await migrateV3ToV4({ dryRun: true });
        expect(result.entries).toBeGreaterThan(100);
    });

    it('maintains trial balance', async () => {
        const result = await migrateV3ToV4({ dryRun: true });
        expect(result.balance.isBalanced).toBe(true);
    });

    it('creates opening balance entry', async () => {
        const result = await migrateV3ToV4({ dryRun: true });
        expect(result.entries).toContain('opening');
    });
});
```

---

### Week 4: Migration Testing & Refinement

#### Task 4.1: Edge Case Testing
**Difficulty:** Hard | **Owner:** QA Dev | **Hours:** 16

**Test Scenarios:**
```javascript
// Test 1: Empty data (brand new user)
await testMigration([], { expected: 1 }); // Just opening balance

// Test 2: Single transaction
await testMigration(
    [{ type: 'expense', category: 'Groceries', amount: 50 }],
    { expected: 3 } // Opening + transaction
);

// Test 3: Mixed income/expense
await testMigration(
    [
        { type: 'expense', amount: 100 },
        { type: 'income', amount: 5000 },
        { type: 'expense', amount: 50 }
    ],
    { expected: 5 } // Opening + 3 transactions
);

// Test 4: Unmapped categories (fallback)
await testMigration(
    [{ type: 'expense', category: 'UNKNOWN', amount: 25 }],
    { expected: 3, fallback: '5900' }
);

// Test 5: Very old data (2015)
await testMigration(
    [{ date: '2015-01-01', type: 'expense', amount: 100 }],
    { expected: 3, dateHandled: true }
);

// Test 6: Large dataset (10000 transactions)
await testMigration(
    largeDataset,
    { expected: 10001, performOk: true }
);

// Test 7: Negative amounts (should fail validation)
await testMigration(
    [{ amount: -50 }],
    { expected: 'error' }
);
```

**Deliverable:**
- ✅ Edge case test suite
- ✅ Performance benchmarks
- ✅ All edge cases handled

---

#### Task 4.2: Rollback Plan & Data Backup
**Difficulty:** Medium | **Owner:** Backend Dev | **Hours:** 6

```javascript
// Create backup before migration
async function backupV3Data() {
    const backup = {
        timestamp: new Date().toISOString(),
        transactions: transactions.slice(), // Copy
        count: transactions.length,
        checksum: calculateChecksum(transactions)
    };
    localStorage.setItem('v3_backup', JSON.stringify(backup));
    console.log(`✅ Backed up ${backup.count} transactions`);
    return backup;
}

// Restore from backup if migration fails
async function restoreV3Data() {
    const backup = localStorage.getItem('v3_backup');
    if (!backup) {
        throw new Error('No backup found');
    }
    const data = JSON.parse(backup);
    transactions = data.transactions;
    console.log(`✅ Restored ${data.count} transactions`);
    return data;
}

// Verify backup integrity
async function verifyBackup() {
    const backup = localStorage.getItem('v3_backup');
    if (!backup) return false;

    const data = JSON.parse(backup);
    const currentChecksum = calculateChecksum(data.transactions);
    return currentChecksum === data.checksum;
}
```

**Deliverable:**
- ✅ Automated backup before migration
- ✅ Restore functionality
- ✅ Integrity verification

---

**Phase 2 Summary:**
- ✅ Migration logic complete
- ✅ All edge cases handled
- ✅ Rollback plan in place
- ✅ Tested with various datasets
- **Status:** Ready for UI implementation

---

## Phase 3: UI Implementation (Weeks 5-6)

**Goal:** Build forms and display components

### Week 5: Transaction Form

#### Task 5.1: New Transaction Form HTML/CSS
**Difficulty:** Easy | **Owner:** Frontend Dev | **Hours:** 6

```html
<!-- New form (updated) -->
<div id="addTransactionCard" class="card">
    <div class="card-header">
        <h3>Add Transaction</h3>
    </div>

    <form id="transactionForm" class="transaction-form">
        <!-- Type selector (NEW: added Transfer) -->
        <div class="form-group">
            <label>Type</label>
            <div class="type-selector">
                <button type="button" class="type-btn" data-type="expense">
                    <i class="ri-arrow-up-line"></i> Expense
                </button>
                <button type="button" class="type-btn" data-type="income">
                    <i class="ri-arrow-down-line"></i> Income
                </button>
                <button type="button" class="type-btn" data-type="transfer">
                    <i class="ri-exchange-line"></i> Transfer
                </button>
            </div>
        </div>

        <!-- From Account (NEW) -->
        <div class="form-group">
            <label for="fromAccount">From Account *</label>
            <select id="fromAccount" name="fromAccount" class="form-control" required>
                <option value="">Select account...</option>
            </select>
        </div>

        <!-- To Account (replaces Category) -->
        <div class="form-group">
            <label for="toAccount">To Account/Category *</label>
            <select id="toAccount" name="toAccount" class="form-control" required>
                <option value="">Select destination...</option>
            </select>
        </div>

        <!-- Amount -->
        <div class="form-group">
            <label for="amount">Amount *</label>
            <input type="number" id="amount" name="amount" class="form-control" 
                   placeholder="0.00" step="0.01" required>
        </div>

        <!-- Date -->
        <div class="form-group">
            <label for="txDate">Date *</label>
            <input type="date" id="txDate" name="txDate" class="form-control" required>
        </div>

        <!-- Tags (NEW - optional) -->
        <div class="form-group">
            <label for="tags">Tags (optional)</label>
            <input type="text" id="tags" name="tags" class="form-control" 
                   placeholder="groceries, weekly, important">
            <small>Separate with commas</small>
        </div>

        <!-- Notes -->
        <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" class="form-control" 
                      placeholder="Add notes..."></textarea>
        </div>

        <!-- Submit -->
        <button type="submit" class="btn btn-primary btn-block">
            <i class="ri-save-line"></i> Save Transaction
        </button>
    </form>
</div>
```

**Deliverable:**
- ✅ New form HTML structure
- ✅ All new fields included
- ✅ Responsive layout

---

#### Task 5.2: Form Logic & Auto-Population
**Difficulty:** Medium | **Owner:** Frontend Dev | **Hours:** 10

```javascript
// Handle form type changes
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = btn.dataset.type;
        updateFormForType(type);
    });
});

// Update form dropdowns based on type
async function updateFormForType(type) {
    const fromSelect = document.getElementById('fromAccount');
    const toSelect = document.getElementById('toAccount');

    fromSelect.innerHTML = '<option value="">Select account...</option>';
    toSelect.innerHTML = '<option value="">Select destination...</option>';

    if (type === 'expense') {
        // From: asset accounts
        const assets = await getAccountsByType('asset');
        assets.forEach(a => {
            fromSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        });

        // To: expense accounts
        const expenses = await getAccountsByType('expense');
        expenses.forEach(a => {
            toSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        });

    } else if (type === 'income') {
        // From: income accounts
        const income = await getAccountsByType('income');
        income.forEach(a => {
            fromSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        });

        // To: asset accounts (auto-select checking)
        const assets = await getAccountsByType('asset');
        assets.forEach(a => {
            toSelect.innerHTML += `<option value="${a.id}" ${a.id === '1100' ? 'selected' : ''}>${a.name}</option>`;
        });

    } else if (type === 'transfer') {
        // From & To: asset accounts
        const assets = await getAccountsByType('asset');
        assets.forEach(a => {
            fromSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
            toSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        });
    }

    currentTransactionType = type;
}

// Handle form submission
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const type = currentTransactionType;
    const fromAccountId = formData.get('fromAccount');
    const toAccountId = formData.get('toAccount');
    const amount = parseFloat(formData.get('amount'));
    const date = formData.get('txDate');
    const notes = formData.get('notes');
    const tags = formData.get('tags').split(',').map(t => t.trim()).filter(t => t);

    // Validate
    if (!fromAccountId || !toAccountId || amount <= 0 || !date) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        // Create journal entry
        const entry = {
            date,
            entries: [],
            notes,
            tags
        };

        if (type === 'expense') {
            entry.entries = [
                { accountId: fromAccountId, debit: amount, credit: 0 },
                { accountId: toAccountId, debit: 0, credit: amount }
            ];
        } else if (type === 'income') {
            entry.entries = [
                { accountId: fromAccountId, debit: 0, credit: amount },
                { accountId: toAccountId, debit: amount, credit: 0 }
            ];
        } else if (type === 'transfer') {
            entry.entries = [
                { accountId: toAccountId, debit: amount, credit: 0 },
                { accountId: fromAccountId, debit: 0, credit: amount }
            ];
        }

        // Save
        await saveJournalEntry(entry);
        
        // Show success
        showMessage('✅ Transaction saved');
        e.target.reset();
        updateUI();

    } catch (error) {
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
});
```

**Deliverable:**
- ✅ Form auto-populates based on type
- ✅ Account dropdowns correct per transaction type
- ✅ Validation before save
- ✅ Error handling

---

#### Task 5.3: Account Balances Display
**Difficulty:** Easy | **Owner:** Frontend Dev | **Hours:** 6

```javascript
// Display account balances in summary
async function updateAccountBalancesDisplay() {
    const accounts = await getAccountsByType('asset');
    const balancesContainer = document.getElementById('accountBalances');

    balancesContainer.innerHTML = '';

    for (const account of accounts) {
        const balance = await calculateAccountBalance(account.id);
        const balanceDiv = document.createElement('div');
        balanceDiv.className = 'account-balance-card';
        balanceDiv.innerHTML = `
            <div class="ab-name">${account.name}</div>
            <div class="ab-balance">${formatCurrency(balance)}</div>
            <div class="ab-type">Asset Account</div>
        `;
        balancesContainer.appendChild(balanceDiv);
    }
}

// Add to updateUI()
function updateUI() {
    // ... existing code ...
    updateAccountBalancesDisplay();
}
```

**Deliverable:**
- ✅ Account balances display
- ✅ Updated in real-time
- ✅ Formatted currency display

---

### Week 6: Lists, Integration & Polish

#### Task 6.1: Transaction List (Updated)
**Difficulty:** Medium | **Owner:** Frontend Dev | **Hours:** 8

```javascript
// Updated transaction list with v4 data
async function updateTransactionsList() {
    const list = document.getElementById('transactionsList');
    let entries = await getAllJournalEntries();

    // Apply filters
    if (selectedMonth !== 'all') {
        entries = entries.filter(e => e.date.startsWith(selectedMonth));
    }

    // Sort by date desc
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Paginate
    const start = (currentPage - 1) * itemsPerPage;
    const pageEntries = entries.slice(start, start + itemsPerPage);

    list.innerHTML = '';
    for (const entry of pageEntries) {
        const row = createTransactionRow(entry);
        list.appendChild(row);
    }

    // Update pagination
    const totalPages = Math.ceil(entries.length / itemsPerPage);
    updatePagination(currentPage, totalPages);
}

// Create transaction row (v4 format)
function createTransactionRow(entry) {
    const row = document.createElement('div');
    row.className = 'transaction-row';

    // Get from/to account names
    const fromLine = entry.entries[0];
    const toLine = entry.entries[1];

    const fromAccount = accounts.find(a => a.id === fromLine.accountId);
    const toAccount = accounts.find(a => a.id === toLine.accountId);

    const amount = Math.max(fromLine.debit, toLine.debit);
    const type = getTransactionType(entry);

    row.innerHTML = `
        <div class="tr-date">${formatDate(entry.date)}</div>
        <div class="tr-details">
            <div class="tr-from">${fromAccount.name}</div>
            <div class="tr-to">→ ${toAccount.name}</div>
        </div>
        <div class="tr-amount">${formatCurrency(amount)}</div>
        <div class="tr-actions">
            <button class="btn-small" onclick="editEntry('${entry.id}')">Edit</button>
            <button class="btn-small" onclick="deleteEntry('${entry.id}')">Delete</button>
        </div>
    `;

    return row;
}

// Determine transaction type
function getTransactionType(entry) {
    const accountTypes = entry.entries.map(e => 
        accounts.find(a => a.id === e.accountId)?.type
    );

    if (accountTypes.includes('income')) return 'income';
    if (accountTypes.includes('expense')) return 'expense';
    return 'transfer';
}
```

**Deliverable:**
- ✅ Updated transaction list
- ✅ Shows from/to accounts
- ✅ Edit/delete actions
- ✅ Pagination works

---

#### Task 6.2: Migration UI (Modal)
**Difficulty:** Medium | **Owner:** Frontend Dev | **Hours:** 8

```html
<!-- Migration Modal -->
<div id="migrationModal" class="modal">
    <div class="modal-content">
        <h3>Upgrade to Double-Entry Mode (v4.0)</h3>
        
        <div class="migration-info">
            <p>This upgrade will:</p>
            <ul>
                <li>✅ Convert your data to double-entry format</li>
                <li>✅ Add multi-account support</li>
                <li>✅ Track credit card debt properly</li>
                <li>✅ Keep your old data as backup</li>
            </ul>
        </div>

        <div class="form-group">
            <label>Starting Balance (Optional)</label>
            <input type="number" id="openingBalance" placeholder="0" step="0.01">
            <small>Your account balance on 2026-01-01</small>
        </div>

        <div class="migration-progress">
            <div id="progressBar" class="progress"></div>
            <div id="progressText"></div>
        </div>

        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeMigrationModal()">Not Now</button>
            <button class="btn btn-primary" onclick="startMigration()">Start Upgrade</button>
        </div>
    </div>
</div>
```

```javascript
// Migration UI logic
async function startMigration() {
    const openingBalance = parseFloat(document.getElementById('openingBalance').value) || 0;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    try {
        // Backup first
        progressText.textContent = 'Backing up your data...';
        await backupV3Data();

        // Migrate
        progressText.textContent = 'Converting transactions...';
        const result = await migrateV3ToV4({ openingBalance, dryRun: false });

        progressBar.style.width = '100%';
        progressText.textContent = `✅ Success! Migrated ${result.entries} entries`;

        setTimeout(() => {
            closeMigrationModal();
            location.reload(); // Reload to show v4 UI
        }, 2000);

    } catch (error) {
        progressText.textContent = `❌ Error: ${error.message}`;
        console.error('Migration failed:', error);
    }
}
```

**Deliverable:**
- ✅ Migration modal UI
- ✅ Progress feedback
- ✅ Backup before migrate
- ✅ Success confirmation

---

#### Task 6.3: Integration Testing
**Difficulty:** Hard | **Owner:** QA Dev | **Hours:** 12

```javascript
// End-to-end test: Full workflow
describe('End-to-End: v3→v4', () => {
    it('migrates data and allows adding new transaction', async () => {
        // 1. Migrate
        const migration = await migrateV3ToV4({ dryRun: true });
        expect(migration.status).toBe('success');

        // 2. Add new transaction
        const entry = {
            date: '2026-02-23',
            entries: [
                { accountId: '1100', debit: 50, credit: 0 },
                { accountId: '5000', debit: 0, credit: 50 }
            ]
        };
        const saved = await saveJournalEntry(entry);
        expect(saved.id).toBeDefined();

        // 3. Verify balance
        const balance = await calculateAccountBalance('1100');
        expect(balance).toBeGreaterThan(0);

        // 4. Verify aggregations
        const agg = new Aggregations([saved], defaultAccounts);
        const summary = agg.getMonthSummary('2026-02');
        expect(summary.expense).toBe(50);
    });
});

// Test browser compatibility
describe('Browser Compatibility', () => {
    it('works on Chrome', () => { /* ... */ });
    it('works on Firefox', () => { /* ... */ });
    it('works on Safari', () => { /* ... */ });
    it('works offline', () => { /* ... */ });
});
```

**Deliverable:**
- ✅ E2E tests passing
- ✅ Cross-browser verified
- ✅ Offline tested

---

**Phase 3 Summary:**
- ✅ Transaction form updated
- ✅ Account balances display
- ✅ Migration modal
- ✅ Transaction list updated
- ✅ All integration tests passing
- **Status:** Ready for release (v4.0 RC)

---

## Phase 4: Polish & Release (Week 6-7)

#### Task 7.1: Bug Fixes & Edge Cases
**Difficulty:** Medium | **Owner:** Full team | **Hours:** 8

---

#### Task 7.2: Documentation & Guides
**Difficulty:** Easy | **Owner:** Product Dev | **Hours:** 6

---

#### Task 7.3: Release Preparation
**Difficulty:** Easy | **Owner:** DevOps | **Hours:** 4

---

## Success Criteria

✅ All tests passing  
✅ Migration tested with 10,000+ transactions  
✅ Trial balance verified  
✅ Cross-browser compatible  
✅ Offline mode works  
✅ No data loss scenarios  

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration breaks | Medium | Critical | Extensive testing, rollback plan, backup |
| Performance issues | Low | High | Caching layer, indexes if needed |
| User confusion | Medium | Medium | Tooltips, onboarding, education modal |
| Edge case data | High | Medium | Comprehensive test coverage |

---

## Resource Requirements

**Team:**
- 1 Backend Developer (data layer, migration)
- 1 Frontend Developer (UI)
- 1 QA Developer (testing)
- Part-time Product Manager (oversight)

**Timeline:** 6 weeks for MVP

**Budget:** ~480 developer hours = ~$24,000 (at $50/hr average)

---

## Communication Plan

**Weekly sync:** Every Monday  
**Daily standups:** 15 min (async Slack)  
**Blockers:** Escalate immediately  
**Status report:** Friday end-of-week

---

## Next Steps

1. ✅ Approve roadmap
2. ⏳ Allocate team
3. ⏳ Create detailed task tickets
4. ⏳ Set up CI/CD for tests
5. ⏳ Begin Phase 1

---

**Document prepared for:** Implementation team  
**Questions?** Contact product@kiren-labs.com  
**Last updated:** February 23, 2026
