# Amount Validation Test Plan

**Implemented:** 2026-02-08
**Version:** 3.9.0
**Critical Fix:** Input validation to prevent data corruption

---

## ✅ What Was Fixed

### JavaScript Validation (app.js:368-405)

**Added 5 validation checks:**

1. **Empty Check**
   - Input: "" (empty)
   - Expected: "⚠️ Please enter an amount"

2. **NaN Check**
   - Input: "abc", "test", "!@#"
   - Expected: "⚠️ Please enter a valid number"

3. **Zero/Negative Check**
   - Input: "0", "-100", "-500"
   - Expected: "⚠️ Amount must be greater than zero"

4. **Too Large Check**
   - Input: "50000000", "999999999"
   - Expected: "⚠️ Amount is too large (max: 10,000,000)"

5. **Decimal Places Check**
   - Input: "100.123", "50.9999"
   - Expected: "⚠️ Amount can have at most 2 decimal places"

### HTML5 Validation (index.html:307)

**Updated input attributes:**
```html
<input
  type="number"
  id="amount"
  required
  min="0.01"              ← NEW: Prevent zero/negative
  max="10000000"          ← NEW: Prevent absurdly large
  step="0.01"             ← Existing: Allow 2 decimals
  inputmode="decimal"     ← Existing: Mobile keyboard
  aria-label="Transaction amount in selected currency"  ← NEW: Accessibility
>
```

---

## 🧪 Test Cases

### Test 1: Valid Amounts (Should Save)

| Input | Expected Behavior |
|-------|-------------------|
| `100` | ✅ Saves successfully |
| `50.50` | ✅ Saves successfully |
| `0.01` | ✅ Saves successfully (minimum) |
| `9999999` | ✅ Saves successfully (just under max) |
| `1234.56` | ✅ Saves successfully (2 decimals) |

### Test 2: Invalid Amounts (Should Show Error)

| Input | Expected Error Message |
|-------|----------------------|
| `` (empty) | "⚠️ Please enter an amount" |
| `0` | "⚠️ Amount must be greater than zero" |
| `-100` | "⚠️ Amount must be greater than zero" |
| `abc` | "⚠️ Please enter a valid number" |
| `10.123` | "⚠️ Amount can have at most 2 decimal places" |
| `50000000` | "⚠️ Amount is too large (max: 10,000,000)" |
| `Infinity` | "⚠️ Please enter a valid number" |
| `NaN` | "⚠️ Please enter a valid number" |

### Test 3: Edge Cases

| Input | Expected Behavior |
|-------|-------------------|
| `0.001` | ❌ "Amount can have at most 2 decimal places" |
| `0.01` | ✅ Saves (minimum valid) |
| `10000000` | ✅ Saves (exactly at max) |
| `10000001` | ❌ "Amount is too large" |
| `1,000` | ❌ "Please enter a valid number" (comma not allowed) |
| `$100` | ❌ "Please enter a valid number" (symbol not allowed) |
| `  100  ` | ✅ Saves as 100 (trimmed) |

---

## 📋 Manual Testing Checklist

### Open the App
```bash
python3 -m http.server 8000
open http://localhost:8000
```

### Test Sequence

**1. Test Empty Amount:**
- [ ] Go to Add tab
- [ ] Select Type: Expense
- [ ] Select Category: Food
- [ ] Leave Amount EMPTY
- [ ] Click "Add Transaction"
- [ ] **Expected:** Error message "Please enter an amount"
- [ ] **Verify:** Transaction NOT saved

**2. Test Invalid Text:**
- [ ] Enter Amount: `abc`
- [ ] Click "Add Transaction"
- [ ] **Expected:** "Please enter a valid number"
- [ ] **Verify:** Transaction NOT saved

**3. Test Zero:**
- [ ] Enter Amount: `0`
- [ ] Click "Add Transaction"
- [ ] **Expected:** "Amount must be greater than zero"
- [ ] **Verify:** Transaction NOT saved

**4. Test Negative:**
- [ ] Enter Amount: `-100`
- [ ] Click "Add Transaction"
- [ ] **Expected:** "Amount must be greater than zero"
- [ ] **Verify:** Transaction NOT saved

**5. Test Too Many Decimals:**
- [ ] Enter Amount: `100.123`
- [ ] Click "Add Transaction"
- [ ] **Expected:** "Amount can have at most 2 decimal places"
- [ ] **Verify:** Transaction NOT saved

**6. Test Too Large:**
- [ ] Enter Amount: `50000000`
- [ ] Click "Add Transaction"
- [ ] **Expected:** "Amount is too large (max: 10,000,000)"
- [ ] **Verify:** Transaction NOT saved

**7. Test Valid Amounts:**
- [ ] Enter Amount: `100`
- [ ] Click "Add Transaction"
- [ ] **Expected:** "Transaction saved!" ✅
- [ ] **Verify:** Transaction appears in List tab

- [ ] Enter Amount: `50.50`
- [ ] **Expected:** Saves successfully ✅

- [ ] Enter Amount: `0.01`
- [ ] **Expected:** Saves successfully ✅

- [ ] Enter Amount: `9999999`
- [ ] **Expected:** Saves successfully ✅

**8. Test Edit Flow:**
- [ ] Edit existing transaction
- [ ] Change amount to invalid value (e.g., `-50`)
- [ ] Click "Update Transaction"
- [ ] **Expected:** Error message, transaction NOT updated
- [ ] Change amount to valid value (`100`)
- [ ] **Expected:** Updates successfully ✅

---

## 🎯 Expected Results

### Before Fix (Vulnerable)
```
User enters: -100
Result: Saves as -100 ❌
Impact: Negative balance, broken calculations
```

### After Fix (Secure)
```
User enters: -100
Result: Shows error "Amount must be greater than zero" ✅
Impact: Data integrity maintained
```

---

## 🐛 What Could Still Go Wrong?

### Potential Issues to Watch:

**1. HTML5 Validation Conflicts**
- HTML input has `min="0.01"`, JS checks `amount <= 0`
- Both should trigger, JS validation is backup
- **Test:** Disable HTML5 validation (`novalidate` on form), verify JS catches it

**2. Loading State Stuck**
- If validation fails, loading state should reset
- Added `submitBtn.classList.remove('loading')` in all error cases
- **Test:** Trigger error, verify button returns to normal

**3. Decimal Precision**
- Check `Number.isInteger(amount * 100)` catches 3+ decimals
- **Test:** Try `100.999`, should fail

**4. Mobile Keyboard**
- `inputmode="decimal"` shows number keyboard
- **Test:** On mobile, verify number pad appears

---

## 🔒 Security Benefits

### Vulnerabilities Prevented

**1. Data Corruption**
- ❌ Before: `NaN + 500 = NaN` (breaks all calculations)
- ✅ After: Only valid numbers saved

**2. Invalid Transactions**
- ❌ Before: `-$1000` expense = free money bug
- ✅ After: Only positive amounts allowed

**3. Calculation Errors**
- ❌ Before: `Infinity * 2 = Infinity` (meaningless data)
- ✅ After: Reasonable bounds enforced

**4. Export/Import Integrity**
- ❌ Before: CSV with `NaN`, `-100` breaks re-import
- ✅ After: Clean data exports correctly

---

## 📊 Validation Logic

### Decision Tree

```
User enters amount
  ↓
Is it empty?
  Yes → ❌ "Please enter an amount"
  No → Continue
    ↓
Is it a number (not NaN)?
  No → ❌ "Please enter a valid number"
  Yes → Continue
    ↓
Is it > 0?
  No → ❌ "Amount must be greater than zero"
  Yes → Continue
    ↓
Is it ≤ 10,000,000?
  No → ❌ "Amount is too large"
  Yes → Continue
    ↓
Has ≤ 2 decimal places?
  No → ❌ "At most 2 decimal places"
  Yes → Continue
    ↓
✅ Valid! Save transaction
```

---

## 🎯 Success Criteria

**Validation is working if:**
- ✅ Cannot save empty amount
- ✅ Cannot save text (abc, test)
- ✅ Cannot save zero or negative
- ✅ Cannot save > 10 million
- ✅ Cannot save > 2 decimal places
- ✅ CAN save valid amounts (100, 50.50, 0.01)
- ✅ Error messages clear and helpful
- ✅ Button state resets after error
- ✅ Existing transactions still editable

---

## 🚀 Next Steps

1. **Test Now** (15 minutes)
   - Open http://localhost:8000
   - Run through test checklist above
   - Verify all invalid amounts rejected

2. **If Tests Pass:**
   - Commit changes
   - Push to GitHub
   - Done! ✅

3. **If Tests Fail:**
   - Note which tests fail
   - Fix issues
   - Re-test

---

## ✅ Completion Checklist

- [ ] JavaScript validation added (app.js)
- [ ] HTML5 validation enhanced (index.html)
- [ ] Syntax check passed (no errors)
- [ ] Manual testing completed (all scenarios)
- [ ] Accessibility still working
- [ ] No regressions (existing features work)
- [ ] Committed to git
- [ ] Pushed to GitHub

---

**Ready to test? Open http://localhost:8000 and try entering invalid amounts!** 🧪
