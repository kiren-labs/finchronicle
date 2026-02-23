# Opening Balances & Cash Transactions in Double-Entry

**Your Questions:**
1. How to record starting balances for multiple accounts?
2. How to record ATM withdrawal and cash use?

**Short Answer:**
- Opening balances = special journal entry on day 1
- ATM withdrawal = transfer between asset accounts (Checking → Cash)
- Cash grocery purchase = simple transaction (Cash → Expense)

---

## Part 1: Recording Opening Balances

### Your Situation

**You have:**
- Account 1: Checking Account with salary deposits → 50,000 THB
- Account 2: Savings Account (emergency fund) → 20,000 THB
- Account 3: Cash in wallet → 2,000 THB
- Account 4: Credit Card Debt you owe → 5,000 THB

**Question:** How to record these in v4 if v3 never asked for them?

### Answer: Opening Balance Journal Entry

On migration day (e.g., 2026-01-01), create ONE special entry:

```javascript
// Opening Balance Entry
{
  id: 'opening_2026-01-01',
  date: '2026-01-01',
  notes: 'Opening Balances as of 2026-01-01',
  entries: [
    // ASSETS (what you have)
    { accountId: '1100', accountName: 'Checking Account', debit: 50000, credit: 0 },
    { accountId: '1200', accountName: 'Savings Account', debit: 20000, credit: 0 },
    { accountId: '1000', accountName: 'Cash', debit: 2000, credit: 0 },

    // LIABILITIES (what you owe)
    { accountId: '2000', accountName: 'Credit Card Debt', debit: 0, credit: 5000 },

    // EQUITY (to balance it)
    { accountId: '3000', accountName: 'Opening Balance Equity', debit: 0, credit: 67000 }
  ],
  tags: ['opening-balance'],
  createdAt: '2026-01-01T00:00:00.000Z'
}

// Verification:
// Debits:   50,000 + 20,000 + 2,000 = 72,000
// Credits:  5,000 + 67,000 = 72,000 ✅ BALANCED!

// Net Worth on Day 1:
// Assets (72,000) - Liabilities (5,000) = 67,000 ✅
```

### Why This Works

**Before (v3):** App has NO idea you even have these accounts!
```javascript
// v3 transactions don't tell us account balances
{ type: 'income', category: 'Salary', amount: 50000 }
// Does this mean:
// - You have 50,000 in checking? 
// - Or just that you earned 50,000 one time?
// - Do you have 10,000 saved somewhere?
// Nobody knows! ❌
```

**After (v4):** Opening entry creates starting position
```javascript
// Now we KNOW:
// - Checking has 50,000 on day 1
// - Savings has 20,000 on day 1
// - You owe 5,000 on credit card
// - Net worth = 67,000
// This is the STARTING POINT ✅
```

### User Experience During Migration

**In migration modal:**
```
┌─────────────────────────────────────┐
│ Prepare for v4 Upgrade              │
├─────────────────────────────────────┤
│                                     │
│ We need your current balances:      │
│                                     │
│ Checking Account: [50000]           │
│ Savings Account:  [20000]           │
│ Cash in Wallet:   [2000]            │
│ Credit Card Debt: [-5000]           │
│                                     │
│ [These are entered once on day 1]   │
│                                     │
│ [Cancel]  [Create Opening Balance]  │
└─────────────────────────────────────┘
```

**Code for this:**
```javascript
async function setupOpeningBalances(balances) {
    // balances = { checking: 50000, savings: 20000, cash: 2000, ccDebt: 5000 }

    const totalAssets = balances.checking + balances.savings + balances.cash;
    const totalLiabilities = balances.ccDebt;
    const equity = totalAssets - totalLiabilities;

    const openingEntry = {
        id: `opening_${Date.now()}`,
        date: '2026-01-01',
        notes: 'Opening Balances',
        entries: [
            { accountId: '1100', debit: balances.checking, credit: 0 },
            { accountId: '1200', debit: balances.savings, credit: 0 },
            { accountId: '1000', debit: balances.cash, credit: 0 },
            { accountId: '2000', debit: 0, credit: balances.ccDebt },
            { accountId: '3000', debit: 0, credit: equity }
        ],
        tags: ['opening-balance']
    };

    return await saveJournalEntry(openingEntry);
}
```

### Key Points About Opening Balances

✅ **Created ONCE** on migration day
❌ **Never edited** (this is historical data)
✅ **Must balance** (debits = credits)
✅ **Is the starting point** for all calculations
✅ **Uses Equity account** to balance out mismatches

---

## Part 2: ATM Withdrawal & Cash Transactions

### Your Scenario

**Step 1: Withdraw 5,000 THB from ATM**
```
You: Go to ATM
Action: Withdraw 5,000 THB using debit card
Result: Checking account decreases, Cash increases
```

**Step 2: Buy Groceries with Cash (1,500 THB)**
```
You: Go to grocery store
Action: Pay with cash (1,500 THB)
Result: Cash decreases, Groceries expense increases
```

**Remaining Cash:** 5,000 - 1,500 = 3,500 THB in wallet

### How to Record This in v4

#### Transaction 1: ATM Withdrawal (5,000 THB)

**Type:** Transfer (between two asset accounts)

**Journal Entry:**
```javascript
{
  id: '1708700000001',
  date: '2026-02-23',  // Date of ATM withdrawal
  notes: 'ATM Withdrawal at Bangkok Bank',
  entries: [
    // Cash increases (debit an asset)
    { accountId: '1000', accountName: 'Cash', debit: 5000, credit: 0 },
    
    // Checking decreases (credit an asset)
    { accountId: '1100', accountName: 'Checking Account', debit: 0, credit: 5000 }
  ],
  tags: ['atm', 'cash-withdrawal'],
  createdAt: '2026-02-23T10:00:00Z'
}

// Verification:
// Debits:  5,000
// Credits: 5,000 ✅ BALANCED!

// Account Changes:
// Checking: -5,000 (credit decreases)
// Cash:     +5,000 (debit increases)
```

**In the App Form:**
```
┌─────────────────────────────────┐
│ Add Transaction                 │
├─────────────────────────────────┤
│ Type: [○ Expense] [○ Income]    │
│        [◉ Transfer]             │
│                                 │
│ From Account: [Checking ▼]      │
│ To Account:   [Cash ▼]          │
│ Amount:       [5000]            │
│ Date:         [2026-02-23]      │
│ Notes:        [ATM Withdrawal]  │
│ Tags:         [atm, cash]       │
│                                 │
│ [Save Transaction]              │
└─────────────────────────────────┘

After Save:
✅ Checking Account: 50,000 - 5,000 = 45,000 THB
✅ Cash Account:     2,000 + 5,000 = 7,000 THB
```

#### Transaction 2: Grocery Purchase with Cash (1,500 THB)

**Type:** Expense (from Cash account)

**Journal Entry:**
```javascript
{
  id: '1708700000002',
  date: '2026-02-23',  // Date of grocery purchase
  notes: 'Groceries at Big C',
  entries: [
    // Groceries expense increases (debit expense)
    { accountId: '5000', accountName: 'Groceries Expense', debit: 1500, credit: 0 },
    
    // Cash decreases (credit an asset)
    { accountId: '1000', accountName: 'Cash', debit: 0, credit: 1500 }
  ],
  tags: ['groceries', 'cash-payment'],
  createdAt: '2026-02-23T14:30:00Z'
}

// Verification:
// Debits:  1,500 (expense)
// Credits: 1,500 (cash) ✅ BALANCED!

// Account Changes:
// Cash:       -1,500 (credit decreases asset)
// Groceries:  +1,500 (debit increases expense)
```

**In the App Form:**
```
┌─────────────────────────────────┐
│ Add Transaction                 │
├─────────────────────────────────┤
│ Type: [◉ Expense] [○ Income]    │
│        [○ Transfer]             │
│                                 │
│ From Account: [Cash ▼]          │
│ To Account:   [Groceries ▼]     │
│ Amount:       [1500]            │
│ Date:         [2026-02-23]      │
│ Notes:        [Groceries]       │
│ Tags:         [groceries]       │
│                                 │
│ [Save Transaction]              │
└─────────────────────────────────┘

After Save:
✅ Cash Account:      7,000 - 1,500 = 5,500 THB
✅ Groceries:         0 + 1,500 = 1,500 THB (expense)
```

### Complete Flow Visualization

```
DAY 1 - OPENING BALANCES (2026-01-01)
┌─────────────────────────────────────────┐
│ Checking:        50,000 THB             │
│ Savings:         20,000 THB             │
│ Cash:            2,000 THB              │
│ CC Debt:         -5,000 THB             │
│ Net Worth:       67,000 THB             │
└─────────────────────────────────────────┘

↓ (ATM Withdrawal: 5,000 THB)

DAY 23 - AFTER ATM (2026-02-23 morning)
┌─────────────────────────────────────────┐
│ Checking:        45,000 THB  ← decreased │
│ Savings:         20,000 THB             │
│ Cash:            7,000 THB   ← increased │
│ CC Debt:         -5,000 THB             │
│ Net Worth:       67,000 THB (unchanged) │
└─────────────────────────────────────────┘

↓ (Grocery: 1,500 THB from cash)

DAY 23 - AFTER GROCERY (2026-02-23 afternoon)
┌─────────────────────────────────────────┐
│ Checking:        45,000 THB             │
│ Savings:         20,000 THB             │
│ Cash:            5,500 THB  ← decreased  │
│ CC Debt:         -5,000 THB             │
│ Net Worth:       65,500 THB  ← decreased │
│ Groceries:       1,500 THB   ← expense   │
└─────────────────────────────────────────┘

Note: Net worth decreased by 1,500 because we SPENT that money
```

---

## Key Differences: Cash vs Checking Accounts

### Are They Separate?

**YES! They must be separate accounts:**

| Account | Type | What It Tracks |
|---------|------|----------------|
| **Checking** | Asset | Money in bank account |
| **Savings** | Asset | Money in savings account |
| **Cash** | Asset | Physical bills in wallet |
| **Credit Card** | Liability | Debt you owe |

### Why Separate?

```javascript
// If Checking and Cash were the SAME account:
// 
// You have 50,000 in checking at bank
// You withdraw 5,000 cash
// Account balance = 45,000
// But in your WALLET you have 5,000!
// Total = 45,000 + 5,000 = 50,000 ✅
//
// This works! But you lose visibility!

// Better approach (SEPARATE accounts):
// Checking Account: 45,000 (in bank)
// Cash Account:     5,000 (in wallet)
// You can see BOTH balances separately
// And verify: Checking + Cash = Your total liquid money
```

### Real-World Benefit

You can now answer questions like:
- "How much cash do I have in my wallet?" → Look at Cash account
- "How much is in my checking account?" → Look at Checking account
- "How much have I spent on groceries?" → Look at Groceries expense
- "What's my net worth?" → Assets - Liabilities

**v3 couldn't answer these questions!**

---

## Complete Example: Your Daily Routine

### Starting Position (2026-01-01)
```javascript
// Opening balance
{
  date: '2026-01-01',
  entries: [
    { accountId: '1100', debit: 50000, credit: 0 },    // Checking
    { accountId: '1200', debit: 20000, credit: 0 },    // Savings
    { accountId: '1000', debit: 2000, credit: 0 },     // Cash
    { accountId: '2000', debit: 0, credit: 5000 },     // CC Debt
    { accountId: '3000', debit: 0, credit: 67000 }     // Equity
  ]
}

// Balances:
// Checking: 50,000
// Savings:  20,000
// Cash:     2,000
// Total Assets: 72,000
// Liabilities: 5,000
// Net Worth: 67,000
```

### Feb 23 Morning: Receive Salary 60,000 THB (to Checking)
```javascript
{
  date: '2026-02-23',
  notes: 'Monthly Salary',
  entries: [
    { accountId: '1100', debit: 60000, credit: 0 },     // Checking increases
    { accountId: '4000', debit: 0, credit: 60000 }      // Salary income
  ]
}

// Balances:
// Checking: 50,000 + 60,000 = 110,000
// Savings:  20,000
// Cash:     2,000
// Net Worth: 67,000 + 60,000 = 127,000
```

### Feb 23 11:00 AM: ATM Withdrawal 5,000 THB
```javascript
{
  date: '2026-02-23',
  notes: 'ATM withdrawal Bangkok Bank',
  entries: [
    { accountId: '1000', debit: 5000, credit: 0 },      // Cash increases
    { accountId: '1100', debit: 0, credit: 5000 }       // Checking decreases
  ]
}

// Balances:
// Checking: 110,000 - 5,000 = 105,000
// Savings:  20,000
// Cash:     2,000 + 5,000 = 7,000
// Net Worth: 127,000 (unchanged - just moved money)
```

### Feb 23 2:30 PM: Grocery Shopping 1,500 THB (Cash)
```javascript
{
  date: '2026-02-23',
  notes: 'Groceries at Big C',
  entries: [
    { accountId: '5000', debit: 1500, credit: 0 },      // Groceries expense
    { accountId: '1000', debit: 0, credit: 1500 }       // Cash decreases
  ]
}

// Balances:
// Checking: 105,000
// Savings:  20,000
// Cash:     7,000 - 1,500 = 5,500
// Groceries Expense: 1,500
// Net Worth: 127,000 - 1,500 = 125,500
```

### Feb 23 3:00 PM: Pay Down Credit Card 3,000 THB (from Checking)
```javascript
{
  date: '2026-02-23',
  notes: 'Credit card payment',
  entries: [
    { accountId: '2000', debit: 3000, credit: 0 },      // CC Debt decreases
    { accountId: '1100', debit: 0, credit: 3000 }       // Checking decreases
  ]
}

// Balances:
// Checking: 105,000 - 3,000 = 102,000
// Savings:  20,000
// Cash:     5,500
// CC Debt:  5,000 - 3,000 = 2,000
// Net Worth: 125,500 + 3,000 = 128,500
// (Net worth improved because we paid down debt)
```

### End of Day Summary
```
ACCOUNT BALANCES (Feb 23, 2026):
┌────────────────────────────────┐
│ Checking:    102,000 THB       │
│ Savings:     20,000 THB        │
│ Cash:        5,500 THB         │
│ ────────────────────────────   │
│ Total Assets: 127,500 THB      │
│ CC Debt:     -2,000 THB        │
│ ════════════════════════════   │
│ NET WORTH:   125,500 THB       │
└────────────────────────────────┘

MONTHLY SUMMARY (Feb 2026):
┌────────────────────────────────┐
│ Income:                        │
│   Salary:    +60,000 THB       │
│                                │
│ Expenses:                      │
│   Groceries: -1,500 THB        │
│                                │
│ Net Income:  +58,500 THB       │
└────────────────────────────────┘

TRIAL BALANCE VERIFICATION:
┌────────────────────────────────┐
│ Total Debits:  127,500 THB     │
│ Total Credits: 127,500 THB     │
│ ✅ BALANCED!                   │
└────────────────────────────────┘
```

---

## Common Questions Answered

### Q1: Is "Cash" Account Same as Checking?
**A:** NO! Keep them separate:
- **Checking:** Money in bank (can use card/checks/online transfer)
- **Cash:** Physical money in wallet (need to carry)

### Q2: Do I Need a "Cash" Account?
**A:** 
- If you mostly use cards → Maybe not needed (simple)
- If you use cash regularly → YES, definitely track it
- If you want to know "how much cash do I have?" → YES

### Q3: How Do I Track Cash Spending in v3?
**A:** You can't track WHERE cash came from in v3!
```
v3: { type: 'expense', category: 'Groceries', amount: 1500 }
// Did you pay with cash? Credit card? Checking card?
// Nobody knows! ❌

v4: Clearly shows:
// From Account: Cash
// To Account: Groceries
// Amount: 1500
// Now we know you paid with CASH ✅
```

### Q4: What If I Lose 500 THB Cash?
**A:** Record it as an expense!
```javascript
{
  date: '2026-02-23',
  notes: 'Lost cash (fell out of wallet)',
  entries: [
    { accountId: '7000', debit: 500, credit: 0 },       // Misc Loss
    { accountId: '1000', debit: 0, credit: 500 }        // Cash decreases
  ]
}

// Now your Cash balance is accurate!
// And you know you lost money (for insurance/tracking)
```

### Q5: What About Credit Card Payments?
**A:** Payment is NOT an expense, it's paying down debt!
```javascript
// WRONG:
{
  entries: [
    { debit: 3000 },  // Checking
    { credit: 3000 }  // Groceries ❌ This is wrong!
  ]
}
// Makes it look like you spent 3000 on groceries

// RIGHT:
{
  entries: [
    { debit: 3000 },  // CC Debt decreases
    { credit: 3000 }  // Checking decreases ✅ Correct!
  ]
}
// Shows you paid down debt, not spent money
```

### Q6: What If I Transfer Salary to Savings?
**A:** Simple transfer between asset accounts!
```javascript
{
  date: '2026-02-23',
  notes: 'Transfer to emergency fund',
  type: 'transfer',
  entries: [
    { accountId: '1200', debit: 10000, credit: 0 },     // Savings increases
    { accountId: '1100', debit: 0, credit: 10000 }      // Checking decreases
  ]
}

// NOT counted as expense or income
// Just movement of money between your own accounts
```

---

## Key Takeaways

✅ **Opening Balance:** Created ONCE on day 1, includes all starting amounts
✅ **ATM Withdrawal:** Transfer from Checking → Cash
✅ **Cash Spending:** Simple transaction from Cash → Expense
✅ **Cash is Separate:** Track it separately from Checking
✅ **All Balanced:** Every entry debits = credits
✅ **Clear Visibility:** Now you know exactly where money is

---

**Next:** Ready to move to practical questions like "How to handle credit card purchases?" or "What about loans?"
