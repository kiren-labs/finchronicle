// Performance Test for Insights Calculations
// Run this in browser console to benchmark

function generateTestData(count) {
    const transactions = [];
    const categories = ['Food', 'Transport', 'Utilities', 'Rent', 'Entertainment', 'Healthcare', 'Shopping', 'Education'];
    const types = ['income', 'expense'];

    for (let i = 0; i < count; i++) {
        const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        transactions.push({
            id: Date.now() + i,
            type: types[Math.floor(Math.random() * types.length)],
            amount: Math.floor(Math.random() * 5000) + 100,
            category: categories[Math.floor(Math.random() * categories.length)],
            date: date.toISOString().slice(0, 10),
            notes: 'Test transaction'
        });
    }
    return transactions;
}

function benchmarkInsights(transactionCount) {
    console.log(`\n=== Benchmarking with ${transactionCount} transactions ===`);

    // Generate test data
    const testTransactions = generateTestData(transactionCount);
    window.transactions = testTransactions; // Use global transactions array

    // Benchmark getMonthTotals
    console.time('getMonthTotals');
    for (let i = 0; i < 100; i++) {
        getMonthTotals('2024-06');
    }
    console.timeEnd('getMonthTotals');

    // Benchmark getTopSpendingCategories
    console.time('getTopSpendingCategories');
    for (let i = 0; i < 100; i++) {
        getTopSpendingCategories('2024-06');
    }
    console.timeEnd('getTopSpendingCategories');

    // Benchmark getAvailableMonths
    console.time('getAvailableMonths');
    for (let i = 0; i < 100; i++) {
        getAvailableMonths();
    }
    console.timeEnd('getAvailableMonths');

    // Benchmark full insights render (single call)
    console.time('Full Insights Render');
    window.insightsMonth = '2024-06';
    renderMonthlyInsights();
    console.timeEnd('Full Insights Render');
}

// Run tests
benchmarkInsights(500);    // Light user: 1 year
benchmarkInsights(2000);   // Average user: 3-4 years
benchmarkInsights(5000);   // Heavy user: 10 years
benchmarkInsights(10000);  // Extreme case: 20 years
