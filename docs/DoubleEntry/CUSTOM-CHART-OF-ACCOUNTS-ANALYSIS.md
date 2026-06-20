# Custom Chart of Accounts: Design Decision

**Your Question:** Should users be able to customize accounts, or are predefined accounts better?

**Short Answer:** 🟢 **Start with defaults (v4.0), enable customization later (v4.1+)**

---

## Two Approaches

### Approach 1: Fixed Chart of Accounts (v4.0 - MVP) 🟢 RECOMMENDED

**Idea:** Users get a built-in chart of accounts they CANNOT change.

```javascript
// Fixed accounts that come with v4
const DEFAULT_ACCOUNTS = {
  1000: "Cash",
  1100: "Checking Account",
  1200: "Savings Account",
  2000: "Credit Card Debt",
  2100: "Loans",
  3000: "Opening Balance Equity",
  4000: "Salary",
  4100: "Freelance Income",
  5000: "Groceries",
  5100: "Dining Out",
  5200: "Transportation",
  // ... more predefined
};

// User cannot:
// ❌ Add custom accounts
// ❌ Delete accounts
// ❌ Rename accounts
// ✅ Mark as inactive (hide from view)
```

#### Advantages:

- ✅ **Simple:** No account management UI needed
- ✅ **Safe:** Can't break trial balance
- ✅ **Consistent:** All users same structure
- ✅ **Easy migration:** No mapping confusion
- ✅ **Easy testing:** Predictable data model
- ✅ **Fast MVP:** Focus on core features

#### Disadvantages:

- ❌ **Not personal:** "Why can't I add my own categories?"
- ❌ **Missing categories:** "I have a boat expense, not in list"
- ❌ **Can't rename:** "I want to call it 'Salary' not 'Job Income'"
- ❌ **Some unused:** "I don't have credit card debt"

#### Risk Assessment:

- 🟢 **Complexity:** Low
- 🟢 **User friction:** Moderate (some complaints)
- 🟢 **Data integrity:** Excellent (can't break)
- 🟢 **Migration difficulty:** Easy

---

### Approach 2: Customizable Chart of Accounts (Full Version) 🟡 COMPLEX

**Idea:** Users add/edit/delete accounts freely.

```javascript
// User can do this:
const userAccounts = [
  // Built-in (can't delete)
  { id: "1100", name: "Checking Account", isSystem: true },

  // User-added (can delete)
  { id: "1300", name: "My Boat Fund", type: "asset", isSystem: false },
  { id: "5500", name: "Boat Expenses", type: "expense", isSystem: false },
  { id: "5600", name: "Cryptocurrency", type: "asset", isSystem: false },
];

// Full UI:
// - Add Account
// - Edit Account
// - Deactivate Account
// - Delete Account (with warnings)
```

#### Advantages:

- ✅ **Very personal:** Users customize to their needs
- ✅ **Handles edge cases:** Boat owner, crypto holder, etc.
- ✅ **Rename freedom:** "Job Income" → "Salary"
- ✅ **Remove clutter:** Hide unused accounts
- ✅ **Professional:** Feels more powerful

#### Disadvantages:

- ❌ **Added complexity:** Account management screens
- ❌ **Data integrity risks:** User deletes critical account
- ❌ **Migration complexity:** Map old categories to custom accounts
- ❌ **Confusing:** Too many options for beginners
- ❌ **Bugs:** Account used in transactions, user deletes it
- ❌ **Validation:** Account type must match usage

#### Key Risks:

```javascript
// Risk 1: User deletes account that has transactions
// Before: Groceries account has 50 transactions
// User: "I hate this account, delete it!"
// App: "But your data will be orphaned!"
// User: "DO IT ANYWAY!"
// Result: Orphaned transactions, trial balance breaks ❌

// Risk 2: User renames account incorrectly
// Before: { id: '1100', name: 'Checking Account', type: 'asset' }
// User renames to: { name: 'Income from Salary', type: 'expense' } ❌
// Result: Trial balance breaks!

// Risk 3: User adds wrong account type
// User adds: { name: 'My Business', type: 'asset' }
// But tries to record expense to it
// Result: Trial balance broken!

// Risk 4: Migration nightmare
// Old categories map to:
// - User's custom account (still exists? renamed? deleted?)
// - Default account (user marked as deleted/inactive?)
// Need complex logic to handle all cases
```

#### Risk Assessment:

- 🔴 **Complexity:** Very High
- 🔴 **User friction:** Low (users happy with options)
- 🟡 **Data integrity:** High if good validation, risky without it
- 🔴 **Migration difficulty:** Hard (need to map to custom accounts)

---

## Comparison Matrix

| Factor                   | Fixed Accounts | Customizable    |
| ------------------------ | -------------- | --------------- |
| **MVP Timeline**         | 🟢 6 weeks     | 🔴 9 weeks      |
| **Code Complexity**      | 🟢 LOW         | 🟡 MEDIUM-HIGH  |
| **Data Integrity Risk**  | 🟢 SAFE        | 🟡 RISKY        |
| **User Satisfaction**    | 🟡 MODERATE    | 🟢 HIGH         |
| **New User Friendly**    | 🟢 YES         | 🔴 OVERWHELMING |
| **Power User Friendly**  | 🔴 NO          | 🟢 YES          |
| **Testing Burden**       | 🟢 SIMPLE      | 🔴 COMPLEX      |
| **Migration Complexity** | 🟢 EASY        | 🔴 HARD         |

---

## Real-World Examples

### Example 1: QuickBooks (Customizable)

```
QuickBooks allows full chart of accounts customization
Problem: New users overwhelmed, make mistakes
Solution: Templates (Freelancer, Small Business, Store, etc.)
Lesson: Customization is great... if you guide users carefully
```

### Example 2: YNAB (Fixed)

```
You Need A Budget uses fixed categories
Strategy: Built-in categories are well-researched
Problem: Some users feel restricted
Solution: Allow renaming (but not structure changes)
Lesson: Fixed structure works if it's well-designed
```

### Example 3: Stripe (Progressive)

```
Stripe started with fixed (simple)
Later: Added custom fields for power users
Lesson: Start simple, add customization as users mature
```

---

## RECOMMENDATION: Hybrid Approach (Best of Both)

### Phase 1: v4.0 MVP (Fixed Accounts)

```javascript
// ✅ DO:
- Provide 30-40 well-researched default accounts
- Allow users to RENAME accounts (keep structure)
- Allow users to DEACTIVATE unused accounts (hide from view)
- Make defaults personalized to user role

// ❌ DON'T:
- Allow add/delete/modify account type
- Allow custom account IDs
- Allow changing account structure
```

**User Experience:**

```
┌──────────────────────────────────────┐
│ Accounts (View/Hide)                 │
├──────────────────────────────────────┤
│ Assets:                              │
│ ☑ Checking Account          [hide]   │
│ ☑ Savings Account           [hide]   │
│ ☑ Cash                      [hide]   │
│ ☐ Credit Card Debt          [show]   │
│                                      │
│ [Rename] [Deactivate]        [done]  │
└──────────────────────────────────────┘
```

**Code:**

```javascript
// User can rename (not delete/restructure)
async function renameAccount(accountId, newName) {
  // Validate
  if (!newName || newName.length < 2) {
    throw new Error("Account name too short");
  }

  if (newName.length > 50) {
    throw new Error("Account name too long");
  }

  // Update (type, structure unchanged)
  const account = await getAccount(accountId);
  account.name = newName;
  return await updateAccount(accountId, account);
}

// User can hide/show (not delete)
async function deactivateAccount(accountId, isActive) {
  const account = await getAccount(accountId);
  account.isActive = isActive; // true = show, false = hide
  return await updateAccount(accountId, account);

  // Hidden accounts don't appear in dropdowns
  // But data isn't deleted, so trial balance stays intact
}
```

**Benefits:**

- ✅ Users can personalize (rename "Salary" → "Job")
- ✅ Users can hide clutter (deactivate unused accounts)
- ✅ No risk of breaking data structure
- ✅ Simple to implement (+3 hours)
- ✅ Easy migration (structure unchanged)
- ✅ Trial balance always safe

---

### Phase 2: v4.1 Custom Accounts (With Guardrails)

```javascript
// Later, add custom account creation WITH validation

// ✅ ALLOW:
- Add custom expense categories (e.g., "Boat Expenses")
- Add custom income sources (e.g., "Rental Income")
- Add custom asset types (e.g., "Crypto Wallet")
- Rename anything

// ❌ PREVENT:
- Delete accounts with transactions
- Change account type if it has transactions
- Create accounts with invalid structure
- Break trial balance

// ✅ REQUIRE:
- Account naming conventions
- Account type selection (asset, liability, income, expense)
- Confirmation before deletes
- Validation that account type matches usage
```

**Advanced UI (v4.1+):**

```
┌──────────────────────────────────────┐
│ Chart of Accounts                    │
├──────────────────────────────────────┤
│ ASSETS (1000-1999)                   │
│ ✏ 1100 Checking Account     [edit]   │
│ ✏ 1200 Savings Account      [edit]   │
│ ✏ 1300 Cryptocurrency       [delete] │
│ [+ Add Custom Asset]                 │
│                                      │
│ EXPENSES (5000-5999)                 │
│ ✏ 5000 Groceries            [edit]   │
│ ✏ 5100 Dining Out           [edit]   │
│ ✏ 5500 Boat Expenses        [delete] │
│ [+ Add Custom Expense]               │
│                                      │
│ [Save]  [Cancel]                     │
└──────────────────────────────────────┘
```

---

## Implementation Strategy: PHASE-BY-PHASE

### v4.0 (MVP - Weeks 1-6): Fixed + Rename/Hide

```javascript
// What users CAN do:
1. Rename accounts (e.g., "Salary" → "Job Income")
2. Deactivate unused accounts (hide from view)
3. Choose default accounts that match their role

// What users CANNOT do:
❌ Add new accounts
❌ Delete accounts
❌ Change account type
❌ Change account structure

// Implementation: ~8 hours
- Add "name" field to UI (editable)
- Add "isActive" field to UI (toggle)
- Update account save function (validate name only)
- Hide deactivated accounts from dropdowns
```

**Cost:** +8 hours = Minimal impact

---

### v4.1+ (Post-MVP - Later): Full Customization (With Validation)

```javascript
// What users CAN do (with guardrails):
1. Create custom accounts with proper validation
2. Edit account names (even system accounts)
3. Delete custom accounts (but not system accounts)
4. Deactivate any account (even system)
5. Choose account type (asset, liability, income, expense)

// What we PREVENT:
❌ Delete account with transactions
❌ Change type of account with transactions
❌ Create duplicate account names
❌ Create invalid account structure
❌ Break trial balance

// Implementation: ~40 hours
- Account management CRUD
- Validation for custom accounts
- Prevent breaking data integrity
- UI for add/edit/delete
- Tests for all edge cases
// This is a full feature (Phase 2)
```

**Cost:** Major feature, defer to v4.1

---

## Decision Matrix: What to Do When

```
TIMELINE  │ FUNCTIONALITY          │ REASON
──────────┼─────────────────────────┼──────────────────────
v4.0 (MVP)│ Rename + Deactivate    │ Personalization without risk
          │ Fixed structure         │ Keep trial balance safe
          │ Role-based defaults     │ Help first-time users
          │
v4.1      │ Add custom accounts    │ Once core is stable
          │ Full CRUD              │ Users trust system now
          │ Validation + warnings  │ Prevent data corruption
          │
v4.2+     │ Account templates      │ For different use cases
          │ Bulk account import    │ For power users
```

---

## Default Chart of Accounts: Optimized for 80% of Users

### Your Specific Case (Thailand, Personal Finance)

```javascript
const DEFAULT_ACCOUNTS = {
  // ASSETS (1000-1999)
  assets: [
    { id: "1000", name: "Cash (บาท)", type: "asset" },
    { id: "1100", name: "Checking Account", type: "asset" },
    { id: "1200", name: "Savings Account", type: "asset" },
    { id: "1300", name: "Investment Account", type: "asset" }, // Optional
  ],

  // LIABILITIES (2000-2999)
  liabilities: [
    { id: "2000", name: "Credit Card Debt", type: "liability" },
    { id: "2100", name: "Loans", type: "liability" },
  ],

  // EQUITY (3000-3999)
  equity: [{ id: "3000", name: "Opening Balance", type: "equity" }],

  // INCOME (4000-4999) - Common for Thailand
  income: [
    { id: "4000", name: "Salary", type: "income" },
    { id: "4100", name: "Freelance/Side Income", type: "income" },
    { id: "4200", name: "Investment Returns", type: "income" },
    { id: "4300", name: "Bonus", type: "income" },
    { id: "4900", name: "Other Income", type: "income" },
  ],

  // EXPENSES (5000-5999) - Common for Thailand
  expenses: [
    { id: "5000", name: "Groceries", type: "expense" },
    { id: "5100", name: "Coffee/Dining", type: "expense" },
    { id: "5200", name: "Transportation", type: "expense" },
    { id: "5300", name: "Utilities/Internet", type: "expense" },
    { id: "5400", name: "Rent", type: "expense" },
    { id: "5500", name: "Entertainment", type: "expense" },
    { id: "5600", name: "Healthcare", type: "expense" },
    { id: "5700", name: "Shopping", type: "expense" },
    { id: "5800", name: "Subscriptions", type: "expense" },
    { id: "5900", name: "Other Expenses", type: "expense" },
  ],
};
```

### How to Add More (Later)

When users ask "I need X category":

**v4.0 Response:** "Rename an existing category, or we'll add it in v4.1"
**v4.1 Response:** "You can add custom categories now!"

---

## User Onboarding Strategy

### First-Time User Flow

```
1. Ask User Role:
   [ ] Employee (salary + standard expenses)
   [ ] Freelancer (variable income + business expenses)
   [ ] Student (limited expenses + part-time income)
   [ ] Business Owner (multiple accounts + complex)

2. Show Matching Chart of Accounts:
   Employee:
   ✅ Checking, Savings, Cash
   ✅ Groceries, Utilities, Rent, Transport
   ✅ Salary, Bonus
   ✅ Hide: Business Income, Loans, Investments

3. Let User Rename Key Ones:
   "Salary" → "Job Income" (optional)
   "Rent" → "Apartment Rental" (optional)

4. Start Using:
   Ready to go! ✅
```

---

## Summary: When to Allow Customization

### v4.0 MVP: ✅ DO THIS

- ✅ Rename accounts (Safety: Structure unchanged)
- ✅ Deactivate/hide accounts (Safety: Data preserved)
- ✅ Show role-based defaults (80% coverage)
- ❌ Don't allow add/delete/restructure

### v4.1+: ✅ ADD LATER

- ✅ Add custom accounts (with validation)
- ✅ Delete custom accounts (but not system)
- ✅ Plan for migrations (handle custom accounts)
- ✅ Templates (Freelancer, Business, etc.)

---

## Final Decision

**For v4.0:**

```javascript
DEFAULT_CHART_OF_ACCOUNTS = {
  // ~30-40 well-designed accounts
  // Covers 80% of use cases
  // Users can rename + hide
  // Structure is protected
  // Timeline: No impact (already included)
  // Risk: None (can't break data)
  // User satisfaction: Good (can personalize names)
};
```

**For v4.1:**

```python
CUSTOM_ACCOUNTS = {
  # Full account management
  # User-created accounts with validation
  # Delete with safeguards
  # Timeline: +2 weeks
  # Risk: Medium (need validation)
  # User satisfaction: Excellent
}
```

---

**Your Answer:**

**v4.0:** Start with a good default chart of accounts (users can rename + hide), protect the structure
**v4.1:** Add full customization with validation once core is solid

This is the **professional approach** - Facebook, Slack, Stripe all started with opinionated defaults, then added customization later.

**Want me to:**

1. Expand the default chart of accounts for your use case?
2. Design the renaming/deactivation UI?
3. Plan the v4.1 custom accounts feature?
