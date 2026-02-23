/**
 * DOUBLE-ENTRY BOOKKEEPING - AGGREGATION LAYER
 * File: aggregations.js
 * Purpose: Calculations for income, expenses, balances, net worth, etc.
 * Version: v4.0 MVP (Basic pattern without caching)
 * 
 * Pattern: Basic calculation (v4.0 MVP)
 * Note: If performance issues arise with >5000 entries, upgrade to caching pattern
 */

// ============================================================================
// ACCOUNT TYPE HELPERS
// ============================================================================

/**
 * Determine if account is "debit-increasing" or "credit-increasing"
 * Debits increase: Assets, Expenses
 * Credits increase: Liabilities, Income, Equity
 * 
 * @param {Object} account - Account object
 * @returns {string} 'debit' or 'credit'
 */
function getAccountRuleType(account) {
  return ['asset', 'expense'].includes(account.type) ? 'debit' : 'credit';
}

/**
 * Convert line item to account balance value
 * Examples:
 *   Asset account: debit 100 = +100, credit 50 = -50
 *   Expense account: debit 200 = +200, credit 0 = +200
 *   Income account: debit 10 = -10, credit 500 = +500
 * 
 * @param {Object} line - Line item {accountId, debit, credit}
 * @param {Object} account - Account object
 * @returns {number} Balance contribution
 */
function lineItemToBalance(line, account) {
  const debit = parseFloat(line.debit) || 0;
  const credit = parseFloat(line.credit) || 0;

  if (getAccountRuleType(account) === 'debit') {
    return debit - credit;
  } else {
    return credit - debit;
  }
}

// ============================================================================
// SINGLE ACCOUNT BALANCE
// ============================================================================

/**
 * Get current balance for single account
 * Iterates through all entries to calculate balance
 * 
 * @param {string} accountId - Account ID
 * @param {Array} entries - All journal entries
 * @param {Array} accounts - All accounts
 * @returns {number} Current balance
 */
function getAccountBalance(accountId, entries, accounts) {
  let balance = 0;
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    console.warn(`⚠ Account ${accountId} not found`);
    return 0;
  }

  entries.forEach((entry) => {
    const line = entry.entries.find((e) => e.accountId === accountId);
    if (line) {
      balance += lineItemToBalance(line, account);
    }
  });

  return balance;
}

/**
 * Get balances for ALL accounts at once
 * More efficient than calling getAccountBalance multiple times
 * 
 * @param {Array} entries - All journal entries
 * @param {Array} accounts - All accounts
 * @returns {Object} Map of {accountId: balance}
 */
function getAllAccountBalances(entries, accounts) {
  const balances = {};

  // Initialize all to 0
  accounts.forEach((account) => {
    balances[account.id] = 0;
  });

  // Apply all entries
  entries.forEach((entry) => {
    entry.entries.forEach((line) => {
      const account = accounts.find((a) => a.id === line.accountId);
      if (account) {
        balances[account.id] += lineItemToBalance(line, account);
      }
    });
  });

  return balances;
}

// ============================================================================
// INCOME & EXPENSE CALCULATIONS
// ============================================================================

/**
 * Calculate total income for a time period
 * Sums all credits to income accounts (since they're credit-increasing)
 * 
 * @param {Array} entries - Journal entries to sum
 * @param {Array} accounts - Account list
 * @param {string} [monthStr] - Optional month filter 'YYYY-MM'
 * @returns {number} Total income
 */
function getIncomeTotal(entries, accounts, monthStr = null) {
  let total = 0;
  const incomeAccounts = accounts.filter((a) => a.type === 'income' && a.isActive);

  entries.forEach((entry) => {
    // Skip if month filter and doesn't match
    if (monthStr && !entry.date.startsWith(monthStr)) {
      return;
    }

    entry.entries.forEach((line) => {
      const isIncomeAccount = incomeAccounts.some((a) => a.id === line.accountId);
      if (isIncomeAccount) {
        total += parseFloat(line.credit) || 0; // Income increases on credit
      }
    });
  });

  return total;
}

/**
 * Calculate total expenses for a time period
 * Sums all debits to expense accounts (since they're debit-increasing)
 * 
 * @param {Array} entries - Journal entries to sum
 * @param {Array} accounts - Account list
 * @param {string} [monthStr] - Optional month filter 'YYYY-MM'
 * @returns {number} Total expenses
 */
function getExpenseTotal(entries, accounts, monthStr = null) {
  let total = 0;
  const expenseAccounts = accounts.filter((a) => a.type === 'expense' && a.isActive);

  entries.forEach((entry) => {
    // Skip if month filter and doesn't match
    if (monthStr && !entry.date.startsWith(monthStr)) {
      return;
    }

    entry.entries.forEach((line) => {
      const isExpenseAccount = expenseAccounts.some((a) => a.id === line.accountId);
      if (isExpenseAccount) {
        total += parseFloat(line.debit) || 0; // Expenses increase on debit
      }
    });
  });

  return total;
}

/**
 * Get income breakdown by category (income account)
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {string} [monthStr] - Optional month filter
 * @returns {Object} {accountId: total}
 */
function getIncomeByCategory(entries, accounts, monthStr = null) {
  const breakdown = {};
  const incomeAccounts = accounts.filter((a) => a.type === 'income' && a.isActive);

  incomeAccounts.forEach((acc) => {
    breakdown[acc.id] = 0;
  });

  entries.forEach((entry) => {
    if (monthStr && !entry.date.startsWith(monthStr)) return;

    entry.entries.forEach((line) => {
      const account = incomeAccounts.find((a) => a.id === line.accountId);
      if (account) {
        breakdown[account.id] += parseFloat(line.credit) || 0;
      }
    });
  });

  // Convert to {name: amount} format for display
  const result = {};
  Object.entries(breakdown).forEach(([id, total]) => {
    if (total > 0) {
      const account = accounts.find((a) => a.id === id);
      result[account.name] = total;
    }
  });

  return result;
}

/**
 * Get expense breakdown by category (expense account)
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {string} [monthStr] - Optional month filter
 * @returns {Object} {name: total}
 */
function getExpenseByCategory(entries, accounts, monthStr = null) {
  const breakdown = {};
  const expenseAccounts = accounts.filter((a) => a.type === 'expense' && a.isActive);

  expenseAccounts.forEach((acc) => {
    breakdown[acc.id] = 0;
  });

  entries.forEach((entry) => {
    if (monthStr && !entry.date.startsWith(monthStr)) return;

    entry.entries.forEach((line) => {
      const account = expenseAccounts.find((a) => a.id === line.accountId);
      if (account) {
        breakdown[account.id] += parseFloat(line.debit) || 0;
      }
    });
  });

  // Convert to {name: amount} format, only non-zero
  const result = {};
  Object.entries(breakdown).forEach(([id, total]) => {
    if (total > 0) {
      const account = accounts.find((a) => a.id === id);
      result[account.name] = total;
    }
  });

  return result;
}

// ============================================================================
// NET WORTH CALCULATIONS
// ============================================================================

/**
 * Calculate net worth (Assets - Liabilities)
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @returns {number} Net worth
 */
function getNetWorth(entries, accounts) {
  const balances = getAllAccountBalances(entries, accounts);
  let assets = 0;
  let liabilities = 0;

  accounts.forEach((account) => {
    if (!account.isActive) return;

    const balance = balances[account.id] || 0;

    if (account.type === 'asset') {
      assets += balance;
    } else if (account.type === 'liability') {
      liabilities += balance;
    }
  });

  return assets - liabilities;
}

/**
 * Detailed net worth breakdown
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @returns {Object} {assets, liabilities, netWorth}
 */
function getNetWorthBreakdown(entries, accounts) {
  const balances = getAllAccountBalances(entries, accounts);
  const breakdown = {
    assets: [],
    liabilities: []
  };

  accounts.forEach((account) => {
    if (!account.isActive) return;

    const balance = balances[account.id] || 0;

    if (account.type === 'asset') {
      breakdown.assets.push({
        name: account.name,
        id: account.id,
        balance
      });
    } else if (account.type === 'liability') {
      breakdown.liabilities.push({
        name: account.name,
        id: account.id,
        balance: Math.abs(balance) // Show as positive for liabilities
      });
    }
  });

  const totalAssets = breakdown.assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = breakdown.liabilities.reduce((sum, a) => sum + a.balance, 0);

  return {
    assets: breakdown.assets,
    totalAssets,
    liabilities: breakdown.liabilities,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities
  };
}

// ============================================================================
// MONTHLY SUMMARIES
// ============================================================================

/**
 * Get monthly summary for a specific month
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {string} monthStr - Month string 'YYYY-MM'
 * @returns {Object} {month, income, expenses, net, count}
 */
function getMonthlySummary(entries, accounts, monthStr) {
  const income = getIncomeTotal(entries, accounts, monthStr);
  const expenses = getExpenseTotal(entries, accounts, monthStr);
  const count = entries.filter((e) => e.date.startsWith(monthStr)).length;

  return {
    month: monthStr,
    income,
    expenses,
    net: income - expenses,
    count
  };
}

/**
 * Get all monthly summaries (one for each month with transactions)
 * Helps build charts and trend analysis
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @returns {Array} [{month, income, expenses, net, count}, ...]
 */
function getAllMonthlySummaries(entries, accounts) {
  // Get list of unique months from entries
  const months = new Set();
  entries.forEach((entry) => {
    const month = entry.date.substring(0, 7); // 'YYYY-MM'
    months.add(month);
  });

  // Sort months chronologically
  const sortedMonths = Array.from(months).sort().reverse(); // Newest first

  // Build summary for each month
  const summaries = sortedMonths.map((month) => getMonthlySummary(entries, accounts, month));

  return summaries;
}

/**
 * Get month-over-month change
 * Calculates % change and trending direction
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {string} currentMonth - Current month 'YYYY-MM'
 * @returns {Object} {change, percentChange, trend}
 */
function getMonthOverMonthChange(entries, accounts, currentMonth) {
  // Get previous month string
  const date = new Date(`${currentMonth}-01`);
  date.setMonth(date.getMonth() - 1);
  const previousMonth = date.toISOString().substring(0, 7);

  const current = getMonthlySummary(entries, accounts, currentMonth);
  const previous = getMonthlySummary(entries, accounts, previousMonth);

  const change = current.expenses - previous.expenses;
  const percentChange =
    previous.expenses === 0 ? 100 : ((change / previous.expenses) * 100).toFixed(2);

  return {
    currentMonth,
    previousMonth,
    currentExpenses: current.expenses,
    previousExpenses: previous.expenses,
    change,
    percentChange: parseFloat(percentChange),
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
  };
}

// ============================================================================
// TRIAL BALANCE
// ============================================================================

/**
 * Verify trial balance across all entries
 * Should ALWAYS return true in valid double-entry system
 * 
 * @param {Array} entries - Journal entries
 * @returns {Object} {isBalanced, totalDebits, totalCredits, difference}
 */
function verifyTrialBalance(entries) {
  let totalDebits = 0;
  let totalCredits = 0;

  entries.forEach((entry) => {
    entry.entries.forEach((line) => {
      totalDebits += parseFloat(line.debit) || 0;
      totalCredits += parseFloat(line.credit) || 0;
    });
  });

  return {
    isBalanced: totalDebits === totalCredits,
    totalDebits: Number(totalDebits.toFixed(2)),
    totalCredits: Number(totalCredits.toFixed(2)),
    difference: Number(Math.abs(totalDebits - totalCredits).toFixed(2))
  };
}

// ============================================================================
// SAVINGS RATE CALCULATIONS
// ============================================================================

/**
 * Calculate savings rate for a month
 * Savings = Income - Expenses
 * Savings as % of income
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {string} monthStr - Month 'YYYY-MM'
 * @returns {Object} {month, income, expenses, savings, savingsRate}
 */
function getMonthlySavingsRate(entries, accounts, monthStr) {
  const income = getIncomeTotal(entries, accounts, monthStr);
  const expenses = getExpenseTotal(entries, accounts, monthStr);
  const savings = income - expenses;

  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(2) : 0;

  return {
    month: monthStr,
    income,
    expenses,
    savings,
    savingsRate: parseFloat(savingsRate),
    savingsRateDisplay: `${savingsRate}%`
  };
}

/**
 * Average to highest spending month
 * Useful for budgeting
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {number} [months=3] - How many months to analyze
 * @returns {Object} {average, highest, lowest, range}
 */
function getSpendingAnalysis(entries, accounts, months = 3) {
  const summaries = getAllMonthlySummaries(entries, accounts).slice(0, months);

  if (summaries.length === 0) {
    return { average: 0, highest: 0, lowest: 0, range: 0 };
  }

  const expenses = summaries.map((s) => s.expenses);
  const average = expenses.reduce((a, b) => a + b, 0) / expenses.length;
  const highest = Math.max(...expenses);
  const lowest = Math.min(...expenses);

  return {
    average: Number(average.toFixed(2)),
    highest,
    lowest,
    range: highest - lowest,
    monthsAnalyzed: summaries.length
  };
}

// ============================================================================
// CATEGORY ANALYSIS
// ============================================================================

/**
 * Get spending by category (expense account) over time
 * Good for analyzing where money goes
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {string} [monthStr] - Optional month filter
 * @returns {Array} [{category, amount, percentage}, ...]
 */
function getSpendingByCategory(entries, accounts, monthStr = null) {
  const breakdown = getExpenseByCategory(entries, accounts, monthStr);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // Convert to array and sort by amount descending
  const result = Object.entries(breakdown)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? ((amount / total) * 100).toFixed(2) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return result;
}

/**
 * Find top spending categories
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {number} [limit=5] - How many categories to return
 * @param {string} [monthStr] - Optional month filter
 * @returns {Array} Top N categories
 */
function getTopExpenseCategories(entries, accounts, limit = 5, monthStr = null) {
  return getSpendingByCategory(entries, accounts, monthStr).slice(0, limit);
}

// ============================================================================
// SUMMARY CALCULATION
// ============================================================================

/**
 * Get complete financial summary for dashboard
 * Single function to get most common calculations
 * 
 * @param {Array} entries - Journal entries
 * @param {Array} accounts - Account list
 * @param {string} currentMonth - Current month 'YYYY-MM'
 * @returns {Object} Complete summary object
 */
function getFinancialSummary(entries, accounts, currentMonth) {
  const monthSummary = getMonthlySummary(entries, accounts, currentMonth);
  const netWorth = getNetWorth(entries, accounts);
  const topCategories = getTopExpenseCategories(entries, accounts, 5, currentMonth);
  const trialBalance = verifyTrialBalance(entries);

  return {
    period: currentMonth,
    month: {
      income: monthSummary.income,
      expenses: monthSummary.expenses,
      net: monthSummary.net,
      transactionCount: monthSummary.count
    },
    allTime: {
      netWorth,
      totalIncome: getIncomeTotal(entries, accounts),
      totalExpenses: getExpenseTotal(entries, accounts),
      transactionCount: entries.length
    },
    topExpenses: topCategories,
    trialsBalanced: trialBalance.isBalanced,
    warnings:
      !trialBalance.isBalanced ? [`Trial balance failed: ${trialBalance.difference} diff`] : []
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.Aggregations = {
    // Single values
    getAccountBalance,
    getAllAccountBalances,
    
    // Income/Expense
    getIncomeTotal,
    getExpenseTotal,
    getIncomeByCategory,
    getExpenseByCategory,
    
    // Net worth
    getNetWorth,
    getNetWorthBreakdown,
    
    // Monthly
    getMonthlySummary,
    getAllMonthlySummaries,
    getMonthOverMonthChange,
    
    // Trial balance
    verifyTrialBalance,
    
    // Savings
    getMonthlySavingsRate,
    getSpendingAnalysis,
    
    // Categories
    getSpendingByCategory,
    getTopExpenseCategories,
    
    // Summary
    getFinancialSummary
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAccountBalance,
    getAllAccountBalances,
    getIncomeTotal,
    getExpenseTotal,
    getIncomeByCategory,
    getExpenseByCategory,
    getNetWorth,
    getNetWorthBreakdown,
    getMonthlySummary,
    getAllMonthlySummaries,
    getMonthOverMonthChange,
    verifyTrialBalance,
    getMonthlySavingsRate,
    getSpendingAnalysis,
    getSpendingByCategory,
    getTopExpenseCategories,
    getFinancialSummary
  };
}
