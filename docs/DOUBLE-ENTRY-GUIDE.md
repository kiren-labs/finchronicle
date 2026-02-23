# Double-Entry Bookkeeping Guide for FinChronicle

**Audience:** Developers, Product Managers, and Non-Accountants  
**Purpose:** Complete guide covering theory, implementation, and practical decisions  
**Version:** 1.0  
**Last Updated:** February 23, 2026

---

## Table of Contents

1. [Understanding Double-Entry Bookkeeping](#1-understanding-double-entry-bookkeeping)
2. [Why FinChronicle Needs It](#2-why-finchronicle-needs-it)
3. [Form Changes: What Users Will See](#3-form-changes-what-users-will-see)
4. [Data Model Changes](#4-data-model-changes)
5. [Critical Implementation Decisions](#5-critical-implementation-decisions)
6. [Honest Assessment & Recommendations](#6-honest-assessment--recommendations)
7. [Quick Reference](#7-quick-reference)

---

## 1. Understanding Double-Entry Bookkeeping

### 1.1 The Basic Concept (For Non-Accountants)

**Single-Entry (Current FinChronicle):**
```
You spend $50 on groceries
→ Record: "-$50 (Groceries)"
Done. ✅
```

**Problem:** You only know "I spent $50." You DON'T know:
- What account did money come FROM? (Checking? Credit Card? Cash?)
- Where did salary GO? (Checking? Savings?)
- Do you actually HAVE $50 in your account?

**Double-Entry Solution:**
```
Every transaction has TWO sides:
  Money leaves one place → Money arrives somewhere else

Grocery example:
  Checking Account: -$50  (money leaves your bank)
  Grocery Expense: +$50   (expense category grows)
  
  Total: -$50 + $50 = $0 ✅ BALANCED
```

### 1.2 Real-World Examples

#### Example 1: Buy Groceries ($50)

**Single-Entry:**
```javascript
{ type: 'expense', category: 'Groceries', amount: 50 }
```

**Double-Entry:**
```javascript
{
  entries: [
    { account: 'Checking Account', debit: 50, credit: 0 },
    { account: 'Grocery Expense', debit: 0, credit: 50 }
  ]
}
// You know: $50 left checking, went to groceries
```

---

#### Example 2: Get Paid Salary ($2,000)

**Single-Entry:**
```javascript
{ type: 'income', category: 'Salary', amount: 2000 }
```

**Double-Entry:**
```javascript
{
  entries: [
    { account: 'Checking Account', debit: 2000, credit: 0 },  // Money arrives
    { account: 'Salary Income', debit: 0, credit: 2000 }      // Income recorded
  ]
}
// You know: $2,000 arrived in checking from salary
```

---

#### Example 3: Transfer to Savings ($1,000)

**Single-Entry:**
```javascript
// PROBLEM: Have to record as two separate transactions
Transaction 1: { type: 'expense', category: 'Transfer', amount: 1000 }
Transaction 2: { type: 'income', category: 'Transfer', amount: 1000 }
// Confusing! Looks like income AND expense
```

**Double-Entry:**
```javascript
{
  entries: [
    { account: 'Savings Account', debit: 1000, credit: 0 },   // Money arrives
    { account: 'Checking Account', debit: 0, credit: 1000 }   // Money leaves
  ]
}
// Clear: Money moved from checking to savings
// NOT income, NOT expense ✅
```

---

#### Example 4: Credit Card Purchase ($100 Coffee)

**Single-Entry:**
```javascript
{ type: 'expense', category: 'Coffee', amount: 100 }
// User has to remember: "I bought this on credit card"
```

**Double-Entry:**
```javascript
{
  entries: [
    { account: 'Coffee Expense', debit: 100, credit: 0 },
    { account: 'Credit Card Debt', debit: 0, credit: 100 }  // You now owe $100
  ]
}
// App KNOWS this is credit card debt, not cash
```

---

#### Example 5: Pay Credit Card Bill ($500)

**Single-Entry:**
```javascript
// Confusing: Is this income? Expense? Transfer?
// Many users don't record this at all
```

**Double-Entry:**
```javascript
{
  entries: [
    { account: 'Credit Card Debt', debit: 500, credit: 0 },  // Debt decreases
    { account: 'Checking Account', debit: 0, credit: 500 }   // Money leaves
  ]
}
// Clear: Paid down debt, NOT an expense
```

---

### 1.3 The Power: Trial Balance

**Key Rule:** All debits must equal all credits.

If they don't → Something is WRONG (data entry error, missing transaction)

```
Your Full Financial Picture:

ASSETS (what you own):
  Checking Account:    $1,950
  Savings Account:     $1,000
  Cash:                $50
  Total Assets:        $3,000

LIABILITIES (what you owe):
  Credit Card Debt:    $0
  Total Liabilities:   $0

EQUITY (net worth):
  Starting Balance:    $1,000
  + Income:            $2,000
  - Expenses:          $50
  = Total Equity:      $2,950

EQUATION (MUST be true):
Assets ($3,000) = Liabilities ($0) + Equity ($2,950) + Unspent Income ($50)
```

If this equation doesn't balance → You made a mistake somewhere.

---

## 2. Why FinChronicle Needs It

### 2.1 Current Limitations (Single-Entry)

| Problem | Impact | User Story |
|---------|--------|------------|
| Can't track multiple accounts | Users with checking + savings + credit card lose visibility | "I have 3 bank accounts but can only see one total" |
| Can't track credit card debt | CC purchases look like cash, payments are confusing | "I don't know how much I owe on my credit card" |
| Transfers mess up reports | Moving money looks like income/expense | "My report says I spent $10,000 but that was just a transfer!" |
| No net worth calculation | Can't see total assets - liabilities | "What's my actual net worth?" |
| No balance sheet | Can't generate proper financial statements | "I need a balance sheet for my accountant/taxes" |

### 2.2 Who Benefits (Target Users)

**Will LOVE Double-Entry:**
- Small business owners (need proper accounting)
- Freelancers (track business vs personal)
- Power users (manage multiple accounts)
- Investors (track portfolios and net worth)
- People with credit cards (proper debt tracking)

**Won't Care:**
- Casual users (just want to track spending)
- Single-account users (only one bank account)
- Students (simple finances)

**Recommendation:** Make it OPTIONAL. Don't force everyone to upgrade.

---

## 3. Form Changes: What Users Will See

### 3.1 Current Form (Single-Entry v3)

```
┌──────────────────────────────────────┐
│       Add Transaction                │
├──────────────────────────────────────┤
│                                      │
│ Type: [○ Expense] [○ Income]         │
│ Category: [Groceries ▼]              │
│ Amount: [50]                         │
│ Date: [2026-02-23]                   │
│ Notes: [Weekly shopping]             │
│                                      │
│ [Save Transaction]                   │
└──────────────────────────────────────┘

Fields: 5 (Type, Category, Amount, Date, Notes)
```

### 3.2 New Form (Double-Entry v4) - Simplified Mode

```
┌──────────────────────────────────────┐
│       Add Transaction                │
├──────────────────────────────────────┤
│                                      │
│ Type: [○ Expense] [○ Income] [○ Transfer] ← NEW!
│                                      │
│ From Account: [Checking Account ▼]   ← NEW!
│   Options: Checking, Savings, CC     │
│                                      │
│ To Account: [Groceries ▼]            │
│   (Shows categories for expenses)    │
│                                      │
│ Amount: [50]                         │
│ Date: [2026-02-23]                   │
│ Tags: [groceries, weekly]            ← NEW! (Optional)
│ Notes: [Weekly shopping]             │
│                                      │
│ [Save Transaction]                   │
└──────────────────────────────────────┘

Fields: 6 (Type, From Account, To Account, Amount, Date, Tags, Notes)
```

### 3.3 Form Behavior by Transaction Type

#### EXPENSE: Buy Something

**User Flow:**
1. Select Type: **[Expense]**
2. From Account dropdown shows: **Checking, Savings, Credit Card, Cash**
3. Pick: **Checking Account**
4. To Account shows: **Groceries, Rent, Coffee, etc.** (expense categories)
5. Enter amount, date, save

**Behind the scenes:**
```javascript
// Automatically creates:
{
  entries: [
    { account: 'Checking (1100)', debit: 50, credit: 0 },
    { account: 'Groceries (5000)', debit: 0, credit: 50 }
  ]
}
// Verification: 50 = 50 ✅
```

---

#### INCOME: Get Paid

**User Flow:**
1. Select Type: **[Income]**
2. From Account dropdown shows: **Salary, Freelance, Investment** (income sources)
3. Pick: **Salary**
4. To Account auto-selects: **Checking Account** (but can change to Savings)
5. Enter amount, date, save

**Behind the scenes:**
```javascript
{
  entries: [
    { account: 'Checking (1100)', debit: 2000, credit: 0 },
    { account: 'Salary (4000)', debit: 0, credit: 2000 }
  ]
}
```

---

#### TRANSFER: Move Money Between Accounts

**User Flow:**
1. Select Type: **[Transfer]** ← NEW!
2. From Account: **Checking Account**
3. To Account shows: **Savings, Cash, Investment** (other asset accounts)
4. Pick: **Savings Account**
5. Enter amount, date, save

**Behind the scenes:**
```javascript
{
  entries: [
    { account: 'Savings (1200)', debit: 1000, credit: 0 },
    { account: 'Checking (1100)', debit: 0, credit: 1000 }
  ]
}
// ✅ NOT counted as income or expense
```

---

### 3.4 Complete Field Comparison

| Field | Current (v3) | New (v4) | Auto-Populated? | Example |
|-------|---------------|----------|-----------------|---------|
| **Type** | Expense, Income | Expense, Income, **Transfer** | Manual | User clicks |
| **From Account** | ❌ Doesn't exist | ✅ NEW (Required) | Manual (dropdown) | Checking Account |
| **To Account** | Was "Category" | Maps to account | Auto-suggested | Groceries → maps to account 5000 |
| **Amount** | Single value | Split (hidden) | Manual | User enters 50 → stored as 50 debit, 50 credit |
| **Date** | Same | Same | Auto (today) | 2026-02-23 |
| **Tags** | ❌ Doesn't exist | ✅ NEW (Optional) | Manual | #groceries #weekly |
| **Notes** | Optional | Optional | Manual | "Weekly shopping" |
| **Balance Check** | ❌ None | ✅ Auto (hidden) | Automatic | Verifies debits = credits before save |

---

## 4. Data Model Changes

### 4.1 Current Data Structure (v3)

**IndexedDB Stores:**
```
FinChronicleDB
├─ transactions
│   └─ { id, type, amount, category, date, notes, createdAt }
└─ (localStorage for settings)
```

**Transaction Object:**
```javascript
{
  id: 1708700000000,
  type: 'expense',
  amount: 50,
  category: 'Groceries',
  date: '2026-02-23',
  notes: 'Weekly shopping',
  createdAt: '2026-02-23T10:00:00.000Z'
}
```

### 4.2 New Data Structure (v4)

**IndexedDB Stores:**
```
FinChronicleDB
├─ transactions (legacy, read-only)
├─ accounts (NEW)
├─ journal_entries (NEW)
├─ journal_lines (NEW) OR nested in journal_entries
└─ settings
```

**Account Object:**
```javascript
{
  id: '1100',                    // Number-based ID
  name: 'Checking Account',
  type: 'asset',                 // asset | liability | equity | income | expense
  subtype: 'bank',               // bank | cash | credit_card | loan | etc.
  balance: 2500,                 // Calculated, not stored per transaction
  currency: 'INR',
  isActive: true,
  createdAt: '2026-02-23T10:00:00.000Z'
}
```

**Journal Entry Object (Denormalized - Recommended):**
```javascript
{
  id: '1708700000000',
  date: '2026-02-23',
  description: 'Groceries purchase',
  entries: [                     // Nested array
    {
      accountId: '1100',
      accountName: 'Checking Account',
      debit: 50,
      credit: 0
    },
    {
      accountId: '5000',
      accountName: 'Groceries Expense',
      debit: 0,
      credit: 50
    }
  ],
  tags: ['groceries', 'weekly'],
  notes: 'Weekly shopping',
  balanceCheck: true,            // Verified balanced
  createdAt: '2026-02-23T10:00:00.000Z',
  modifiedAt: null,
  modifiedReason: null
}
```

### 4.3 Chart of Accounts (Default Accounts)

```javascript
const DEFAULT_ACCOUNTS = {
  // ASSETS (1000-1999) - Things you OWN
  assets: [
    { id: '1000', name: 'Cash', type: 'asset', subtype: 'cash' },
    { id: '1100', name: 'Checking Account', type: 'asset', subtype: 'bank' },
    { id: '1200', name: 'Savings Account', type: 'asset', subtype: 'bank' },
  ],

  // LIABILITIES (2000-2999) - Things you OWE
  liabilities: [
    { id: '2000', name: 'Credit Card Debt', type: 'liability', subtype: 'credit_card' },
    { id: '2100', name: 'Loans', type: 'liability', subtype: 'loan' },
  ],

  // EQUITY (3000-3999) - Net Worth
  equity: [
    { id: '3000', name: 'Opening Balance', type: 'equity', subtype: 'opening' },
  ],

  // INCOME (4000-4999) - Money IN
  income: [
    { id: '4000', name: 'Salary', type: 'income', subtype: 'salary' },
    { id: '4100', name: 'Freelance Income', type: 'income', subtype: 'business' },
    { id: '4900', name: 'Other Income', type: 'income', subtype: 'other' },
  ],

  // EXPENSES (5000-5999) - Money OUT
  expenses: [
    { id: '5000', name: 'Groceries', type: 'expense', subtype: 'food' },
    { id: '5100', name: 'Dining Out', type: 'expense', subtype: 'food' },
    { id: '5200', name: 'Transportation', type: 'expense', subtype: 'transport' },
    { id: '5300', name: 'Utilities', type: 'expense', subtype: 'bills' },
    { id: '5400', name: 'Rent', type: 'expense', subtype: 'housing' },
    { id: '5900', name: 'Other Expenses', type: 'expense', subtype: 'other' },
  ]
};
```

### 4.4 Category → Account Mapping (For Migration)

```javascript
const CATEGORY_TO_ACCOUNT_MAP = {
  // Income categories
  'Salary': '4000',
  'Freelance': '4100',
  'Investment': '4200',
  
  // Expense categories
  'Groceries': '5000',
  'Food': '5000',
  'Dining': '5100',
  'Transportation': '5200',
  'Utilities': '5300',
  'Rent': '5400',
  'Entertainment': '5500',
  'Healthcare': '5600',
  'Shopping': '5700',
  
  // Fallbacks
  'Other Expense': '5900',
  'Other Income': '4900'
};
```

---

## 5. Critical Implementation Decisions

### 5.1 MUST FIX Before Coding Starts

#### Issue 1: Credit Card Classification Error ⚠️ CRITICAL

**Problem:** Implementation plan has "Credit Card" as both Asset AND Liability

**Fix:**
```javascript
// WRONG:
assets: [
  { id: '1300', name: 'Credit Card', type: 'asset' }, // ❌ NO!
]
liabilities: [
  { id: '2000', name: 'Credit Card Debt', type: 'liability' }
]

// CORRECT:
liabilities: [
  { id: '2000', name: 'Credit Card', type: 'liability', subtype: 'credit_card' }
]
// Credit cards are ALWAYS liabilities (money you owe)
```

---

#### Issue 2: Data Store Structure ⚠️ CRITICAL

**Decision Needed:** 2 stores vs 3 stores

**Option A: Normalized (3 stores) - Complex but queryable**
```javascript
// Store 1: accounts
{ id: '1100', name: 'Checking Account', type: 'asset' }

// Store 2: journal_entries (header only)
{ id: '123', date: '2026-02-23', description: 'Groceries' }

// Store 3: journal_lines (detailed splits)
{ entryId: '123', accountId: '1100', debit: 50, credit: 0 }
{ entryId: '123', accountId: '5000', debit: 0, credit: 50 }
```

**Option B: Denormalized (2 stores) - Simpler, recommended**
```javascript
// Store 1: accounts
{ id: '1100', name: 'Checking Account', type: 'asset' }

// Store 2: journal_entries (nested)
{
  id: '123',
  date: '2026-02-23',
  entries: [
    { accountId: '1100', debit: 50, credit: 0 },
    { accountId: '5000', debit: 0, credit: 50 }
  ]
}
```

**Recommendation:** **Option B (2 stores)** - Simpler, less joins, easier migration

---

#### Issue 3: Trial Balance Enforcement ⚠️ HIGH

**Fix:**
```javascript
function saveJournalEntry(entry) {
  // 1. Calculate totals
  const totalDebits = entry.entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = entry.entries.reduce((sum, e) => sum + e.credit, 0);
  
  // 2. REJECT if not balanced
  if (totalDebits !== totalCredits) {
    throw new Error(`Unbalanced entry: Debits ${totalDebits} ≠ Credits ${totalCredits}`);
  }
  
  // 3. Save only if balanced
  return saveToIndexedDB(entry);
}
```

**Enforcement Points:**
- ✅ On every save
- ✅ During migration (halt and rollback if imbalanced)
- ✅ On CSV import

---

#### Issue 4: Opening Balances - Missing Liabilities ⚠️ HIGH

**Problem:** Plan only shows asset opening balances

**Fix:**
```javascript
// User's starting position:
// - Checking: ₹10,000
// - Credit Card Debt: ₹2,000

// Opening balance journal entry:
{
  date: '2026-01-01',
  description: 'Opening Balances',
  entries: [
    { account: 'Checking (1100)', debit: 10000, credit: 0 },   // Asset
    { account: 'CC Debt (2000)', debit: 0, credit: 2000 },     // Liability
    { account: 'Opening Equity (3000)', debit: 0, credit: 8000 } // Balancing
  ]
}

// Verification:
// Debits: 10,000
// Credits: 2,000 + 8,000 = 10,000 ✅
// Net Worth: Assets (10,000) - Liabilities (2,000) = 8,000 ✅
```

---

### 5.2 Timeline & Scope Reality Check

**Business Case Says:** 2-3 weeks development + 1 week testing = **4 weeks total**

**Implementation Plan Says:** 8 phases over **15 weeks**

**Reality Check:**
- Core data layer: 2-3 weeks
- Migration logic: 2-3 weeks (this is tricky!)
- Testing + edge cases: 1-2 weeks
- **Realistic MVP: 5-8 weeks**

**Scope Creep in Plan:**
| Feature | Business Case | Implementation Plan | Recommendation |
|---------|---------------|---------------------|----------------|
| Trial Balance | ✅ Mentioned | ✅ Full UI | MVP: Just verify, no UI |
| Balance Sheet | ✅ Mentioned | ✅ Full report | MVP: Skip, add v4.1 |
| Chart of Accounts Management | ❌ Out of scope | ✅ Full Phase 6 | v4.2+ |
| Reconciliation UI | ❌ Out of scope | ✅ Phase 5 | v4.2+ |
| Net Worth Chart | ❌ Not mentioned | ✅ Phase 5 | v4.1+ |

**Recommended MVP (4-6 weeks):**
```
v4.0 MVP:
✅ Accounts table + CRUD
✅ Journal entries that balance
✅ Migration from single-entry
✅ Simple transaction form (from/to accounts)
✅ Account balances display
✅ Trial balance verification (behind scenes, not UI)
❌ Skip: Advanced reports, reconciliation, charts
```

---

## 6. Honest Assessment & Recommendations

### 6.1 What Actually Matters

**Priority 1: Data Integrity (Existential)**
- Migration must not lose data
- Trial balance must always = 0
- Backward compatibility for old data

**Priority 2: Core Functionality (High)**
- Accounts work correctly
- Journal entries balance
- Simple UI for transactions

**Priority 3: Features (Medium)**
- Account balances display
- Basic reports (one or two)

**Priority 4: Nice-to-Have (Low)**
- Advanced reports
- Reconciliation tools
- Charts and graphs

### 6.2 Real Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Migration breaks** | Users lose data, trust destroyed | Mandatory backup before migration; extensive testing |
| **Complexity overwhelms users** | Users abandon app | Keep UI simple; double-entry runs behind scenes |
| **8-week estimate becomes 16 weeks** | Delayed launch, cost overrun | Ship MVP first; get feedback; iterate |
| **Edge cases in old data** | Migration halts for some users | Handle gracefully; allow partial migration |

### 6.3 What I Would Actually Do

**Phase 1: MVP (Weeks 1-6)**
- ✅ Accounts + journal entries (data layer only)
- ✅ Migration (tested with 100, 1000, 10000 transactions)
- ✅ Simple form UI (from/to accounts)
- ✅ Basic account balances view
- ✅ Trial balance enforced (no UI, just backend check)
- 🚀 Ship to 10 beta testers

**Phase 2: Feedback (Weeks 7-8)**
- Listen to beta testers
- Fix critical bugs
- Identify what they ACTUALLY need (not what we think)

**Phase 3: v4.1 (Weeks 9-12)**
- ONE useful report (probably: Account Balances Over Time)
- Transfer transaction UI polish
- Edit/delete with balance validation

**Phase 4: v4.2+ (Future)**
- Balance Sheet (if users ask)
- Reconciliation (if users ask)
- Chart of Accounts management (if users ask)

**Why this approach?**
- Gets something working quickly
- Real user feedback drives priorities
- Avoids building features nobody uses
- Reduces risk of 6-month project that ships nothing

---

## 7. Quick Reference

### 7.1 Debit/Credit Cheat Sheet

| Account Type | Debit (+) | Credit (-) | Normal Balance |
|--------------|-----------|------------|----------------|
| **Asset** (Checking, Cash) | Increase | Decrease | Debit |
| **Liability** (Credit Card) | Decrease | Increase | Credit |
| **Equity** (Net Worth) | Decrease | Increase | Credit |
| **Income** (Salary) | Decrease | Increase | Credit |
| **Expense** (Groceries) | Increase | Decrease | Debit |

### 7.2 Common Transaction Templates

**Buy groceries (cash):**
```
DR Groceries Expense    50
  CR Checking Account      50
```

**Get paid salary:**
```
DR Checking Account   2000
  CR Salary Income        2000
```

**Transfer to savings:**
```
DR Savings Account    1000
  CR Checking Account     1000
```

**Buy on credit card:**
```
DR Coffee Expense        5
  CR Credit Card Debt      5
```

**Pay credit card:**
```
DR Credit Card Debt   500
  CR Checking Account     500
```

### 7.3 Validation Checklist

Before saving ANY transaction:
```javascript
✅ Total Debits = Total Credits
✅ At least 2 entries (from/to)
✅ All accounts exist in chart of accounts
✅ Amount is valid number (not NaN)
✅ Date is valid
✅ Account types make sense (can't transfer TO an expense account)
```

### 7.4 Key Formulas

**Account Balance:**
```javascript
balance = SUM(debits) - SUM(credits)  // For asset/expense accounts
balance = SUM(credits) - SUM(debits)  // For liability/income/equity accounts
```

**Net Worth:**
```javascript
netWorth = totalAssets - totalLiabilities
```

**Trial Balance:**
```javascript
totalDebits === totalCredits  // MUST be true
```

**Accounting Equation:**
```javascript
Assets = Liabilities + Equity
```

---

## Appendix: For Product Decision

### Should FinChronicle Implement Double-Entry?

**YES, if:**
- Target users are small business owners, freelancers, power users
- You want to differentiate from Mint, YNAB, etc.
- You're willing to invest 6-8 weeks minimum
- You have resources to maintain complexity

**NO (or DEFER), if:**
- Core users are casual expense trackers
- Timeline is tight (< 1 month)
- Team is small (1-2 developers)
- Current single-entry works for 90% of users

**My Recommendation:** 
Build a **lightweight MVP** (6 weeks) → Beta test with 20 users → Decide based on feedback whether to invest in full feature set.

Don't commit to 15-week full roadmap until you know users actually want/use it.

---

**Document Version:** 1.0  
**Author:** AI Assistant + Paul (Kiren Labs)  
**Date:** February 23, 2026  
**Status:** Draft for Review
