// App Version - Update this when releasing new features
const APP_VERSION = '3.7.1';
const VERSION_KEY = 'app_version';

// IndexedDB Configuration
const DB_NAME = 'FinChronicleDB';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';
let db = null;

// Initialize
let transactions = [];
let currentTab = 'add';
let currentGrouping = 'month';
let selectedMonth = 'all';
let selectedCategory = 'all';
let selectedType = 'all'; // 'all', 'income', 'expense'
let editingId = null;
let deleteId = null;
let updateAvailable = false;

// Pagination
let currentPage = 1;
const itemsPerPage = 20;

// Category definitions
const categories = {
    income: [
        'Salary',
        'Business',
        'Investment',
        'Rental Income',
        'Gifts/Refunds',
        'Freelance',
        'Bonus',
        'Other Income'
    ],
    expense: [
        'Food',
        'Groceries',
        'Transport',
        'Utilities/Bills',
        'Kids/School',
        'Fees/Docs',
        'Debt/Loans',
        'Household',
        'Other Expense',
        'Rent',
        'Healthcare',
        'Personal/Shopping',
        'Insurance/Taxes',
        'Savings/Investments',
        'Charity/Gifts',
        'Misc/Buffer'
    ]
};

// Currency definitions
const currencies = {
    INR: { symbol: '₹', name: 'Indian Rupee' },
    THB: { symbol: '฿', name: 'Thai Baht' },
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    GBP: { symbol: '£', name: 'British Pound' },
    JPY: { symbol: '¥', name: 'Japanese Yen' },
    CNY: { symbol: '¥', name: 'Chinese Yuan' },
    SGD: { symbol: 'S$', name: 'Singapore Dollar' },
    HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
    AUD: { symbol: 'A$', name: 'Australian Dollar' },
    NZD: { symbol: 'NZ$', name: 'New Zealand Dollar' },
    KRW: { symbol: '₩', name: 'South Korean Won' },
    MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
    PHP: { symbol: '₱', name: 'Philippine Peso' },
    IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
    VND: { symbol: '₫', name: 'Vietnamese Dong' },
    AED: { symbol: 'د.إ', name: 'UAE Dirham' },
    SAR: { symbol: 'SR', name: 'Saudi Riyal' },
    CHF: { symbol: 'Fr', name: 'Swiss Franc' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar' }
};

// Get current currency
function getCurrency() {
    const saved = localStorage.getItem('currency');
    return saved && currencies[saved] ? saved : 'INR';
}

// Set currency
function setCurrency(code) {
    localStorage.setItem('currency', code);
    updateCurrencyDisplay();
    updateUI();
    showMessage(`Currency changed to ${currencies[code].name}`);
}

// Get currency symbol
function getCurrencySymbol() {
    const code = getCurrency();
    return currencies[code].symbol;
}

// Format currency
function formatCurrency(amount) {
    return `${getCurrencySymbol()}${formatNumber(amount)}`;
}

// Update currency display in UI
function updateCurrencyDisplay() {
    const code = getCurrency();
    const currency = currencies[code];
    document.getElementById('currencySymbol').textContent = currency.symbol;
    document.getElementById('currencyCode').textContent = code;
    document.querySelector('label[for="amount"]').textContent = `Amount (${currency.symbol})`;
}

// Toggle currency selector
function toggleCurrencySelector() {
    const modal = document.getElementById('currencyModal');
    const list = document.getElementById('currencyList');
    const currentCode = getCurrency();

    // Populate currency list
    list.innerHTML = Object.entries(currencies).map(([code, curr]) => `
        <div class="currency-item ${code === currentCode ? 'active' : ''}" onclick="selectCurrency('${code}')">
            <div class="currency-info">
                <div class="currency-symbol">${curr.symbol}</div>
                <div class="currency-details">
                    <div class="currency-code">${code}</div>
                    <div class="currency-name">${curr.name}</div>
                </div>
            </div>
            <div class="currency-check"><i class="ri-check-line"></i></div>
        </div>
    `).join('');

    modal.style.display = 'flex';
}

// Close currency selector
function closeCurrencySelector() {
    document.getElementById('currencyModal').style.display = 'none';
}

// Select currency
function selectCurrency(code) {
    setCurrency(code);
    closeCurrencySelector();
}

// Select transaction type (toggle button)
function selectType(type) {
    // Update hidden input
    document.getElementById('type').value = type;

    // Update toggle button states
    document.querySelectorAll('.type-option').forEach(btn => {
        const isActive = btn.dataset.type === type;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-checked', isActive);
    });

    // Update categories dropdown
    updateCategoryOptions(type);
}

// Update category dropdown based on type
function updateCategoryOptions(type) {
    const categorySelect = document.getElementById('category');
    const cats = categories[type] || [];

    // Clear and repopulate
    categorySelect.innerHTML = cats.map(cat =>
        `<option value="${cat}">${cat}</option>`
    ).join('');

    // If editing, try to preserve selection if valid
    if (editingId) {
        const currentCategory = categorySelect.dataset.editValue;
        if (currentCategory && cats.includes(currentCategory)) {
            categorySelect.value = currentCategory;
        }
    }
}

// =====================================================================
// IndexedDB Operations
// =====================================================================

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('dateType', ['date', 'type'], { unique: false });
            }
        };
    });
}

// Load all transactions from IndexedDB
function loadDataFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            transactions = request.result || [];
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(transactions);
        };

        request.onerror = () => reject(request.error);
    });
}

// Save single transaction to IndexedDB
function saveTransactionToDB(transaction) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(transaction);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Delete transaction from IndexedDB
function deleteTransactionFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Clear all transactions from IndexedDB (for restore)
function clearAllTransactions() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Bulk save transactions to IndexedDB (for import)
function bulkSaveTransactionsToDB(transactionsArray) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        transactionsArray.forEach(transaction => {
            store.put(transaction);
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Migrate localStorage data to IndexedDB (one-time)
async function migrateFromLocalStorage() {
    const migrationFlag = localStorage.getItem('idb_migrated');

    // Skip if already migrated
    if (migrationFlag === 'true') {
        return;
    }

    const stored = localStorage.getItem('transactions');
    if (stored) {
        try {
            const oldTransactions = JSON.parse(stored);
            if (oldTransactions.length > 0) {
                await bulkSaveTransactionsToDB(oldTransactions);
                console.log(`Migrated ${oldTransactions.length} transactions to IndexedDB`);
            }
            localStorage.removeItem('transactions'); // Clean up old data
        } catch (err) {
            console.error('Migration failed:', err);
            return;
        }
    }

    // Mark migration as complete (even if no data existed)
    localStorage.setItem('idb_migrated', 'true');
}

// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem('transactions');
    if (stored) {
        transactions = JSON.parse(stored);
        // Sort by date descending (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    updateUI();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Set today's date as default
document.getElementById('date').valueAsDate = new Date();

// Initialize categories for default type (expense)
updateCategoryOptions('expense');

// Form submission
document.getElementById('transactionForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const formCard = document.querySelector('#addTab .card');
    const originalBtnText = submitBtn.textContent;

    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Saving...';

    const transaction = {
        id: editingId || Date.now(),
        type: document.getElementById('type').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        notes: document.getElementById('notes').value,
        createdAt: editingId ?
            transactions.find(t => t.id === editingId)?.createdAt :
            new Date().toISOString()
    };

    try {
        await saveTransactionToDB(transaction);

        // Show success state
        submitBtn.classList.remove('loading');
        submitBtn.classList.add('success');
        submitBtn.innerHTML = '<i class="ri-check-line btn-icon"></i> Saved!';

        // Trigger haptic feedback (mobile)
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        // Animate card
        formCard.classList.add('success-pulse');

        if (editingId) {
            // Update existing transaction in memory
            const index = transactions.findIndex(t => t.id === editingId);
            if (index !== -1) {
                transactions[index] = transaction;
            }
            showMessage('Transaction updated!');
        } else {
            // Add new transaction to memory
            transactions.unshift(transaction);
            showMessage('Transaction saved!');
        }

        // Wait for animations to complete
        setTimeout(() => {
            // Clear form
            document.getElementById('transactionForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            editingId = null;
            document.getElementById('formTitle').textContent = 'Add Transaction';
            document.getElementById('cancelEditBtn').style.display = 'none';

            // Reset button state
            submitBtn.classList.remove('success');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Transaction';

            // Remove card animation class
            formCard.classList.remove('success-pulse');

            updateUI();
        }, 800);

    } catch (err) {
        console.error('Save failed:', err);

        // Reset button on error
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;

        showMessage('Failed to save transaction');
    }
});

// Show message
function showMessage(text) {
    const msg = document.getElementById('successMessage');
    msg.textContent = text;
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
}

// Update UI
function updateUI() {
    updateSummary();
    updateTransactionsList();
    updateMonthFilters();
    updateCategoryFilter();
    updateGroupedView();
}

// Update summary cards
function updateSummary() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTxs = transactions.filter(t => t.date.startsWith(currentMonth));

    const income = monthTxs
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTxs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const net = income - expense;

    // Get previous month data for trends
    const previousMonth = getPreviousMonth(currentMonth);
    const prevTotals = getMonthTotals(previousMonth);

    // Calculate trends
    const netDelta = calculateMoMDelta(net, prevTotals.net);
    const incomeDelta = calculateMoMDelta(income, prevTotals.income);
    const expensePercent = calculateExpensePercentage(expense, income);

    // Update full summary cards
    document.getElementById('monthNet').textContent = formatCurrency(net);
    document.getElementById('monthNet').className = 'summary-value';

    // This Month card should always be neutral (blue), not colored
    // Only the trend indicator should be colored

    document.getElementById('totalEntries').textContent = monthTxs.length;
    document.getElementById('monthIncome').textContent = formatCurrency(income);
    document.getElementById('monthExpense').textContent = formatCurrency(expense);

    // Update This Month trend
    const monthNetTrend = document.getElementById('monthNetTrend');
    if (netDelta && netDelta.pct !== null) {
        const arrow = netDelta.direction === 'up' ? '↑' : netDelta.direction === 'down' ? '↓' : '→';
        const sign = netDelta.abs >= 0 ? '+' : '';
        monthNetTrend.innerHTML = `<i class="ri-arrow-${netDelta.direction === 'up' ? 'up' : netDelta.direction === 'down' ? 'down' : 'right'}-line"></i> ${sign}${Math.abs(netDelta.pct).toFixed(1)}% vs last month`;
        monthNetTrend.className = `summary-trend ${netDelta.direction === 'up' ? 'positive' : netDelta.direction === 'down' ? 'negative' : 'neutral'}`;
    } else {
        monthNetTrend.textContent = '';
    }

    // Update Income trend (optional)
    const monthIncomeTrend = document.getElementById('monthIncomeTrend');
    if (incomeDelta && incomeDelta.pct !== null) {
        const sign = incomeDelta.abs >= 0 ? '+' : '';
        monthIncomeTrend.innerHTML = `<i class="ri-arrow-${incomeDelta.direction === 'up' ? 'up' : incomeDelta.direction === 'down' ? 'down' : 'right'}-line"></i> ${sign}${Math.abs(incomeDelta.pct).toFixed(1)}% vs last month`;
        monthIncomeTrend.className = `summary-trend ${incomeDelta.direction === 'up' ? 'positive' : incomeDelta.direction === 'down' ? 'negative' : 'neutral'}`;
    } else {
        monthIncomeTrend.textContent = '';
    }

    // Update Expenses meta (% of income)
    const monthExpenseMeta = document.getElementById('monthExpenseMeta');
    if (expensePercent !== null) {
        monthExpenseMeta.textContent = `${expensePercent.toFixed(1)}% of income`;
    } else {
        monthExpenseMeta.textContent = '';
    }

    // Update compact summary view
    const compactNetElem = document.getElementById('compactNet');
    compactNetElem.textContent = formatCurrency(net);
    compactNetElem.className = 'compact-stat ' + (net >= 0 ? 'compact-income' : 'compact-expense');

    document.getElementById('compactEntries').textContent = monthTxs.length;
    document.getElementById('compactIncome').textContent = formatCurrency(income);
    document.getElementById('compactExpense').textContent = formatCurrency(expense);
}

// Update transactions list
function updateTransactionsList() {
    const list = document.getElementById('transactionsList');
    const paginationControls = document.getElementById('paginationControls');
    let filtered = transactions;

    if (selectedMonth !== 'all') {
        filtered = filtered.filter(t => t.date.startsWith(selectedMonth));
    }

    if (selectedCategory !== 'all') {
        filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (selectedType !== 'all') {
        filtered = filtered.filter(t => t.type === selectedType);
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="ri-file-list-3-line"></i></div>
                <div>No transactions yet</div>
            </div>
        `;
        paginationControls.style.display = 'none';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = filtered.slice(startIndex, endIndex);

    // Update list with paginated transactions
    list.innerHTML = paginatedTransactions.map(t => {
        const isIncome = t.type === 'income';
        const icon = isIncome ? '<i class="ri-arrow-up-circle-fill"></i>' : '<i class="ri-arrow-down-circle-fill"></i>';
        const amountClass = isIncome ? 'positive' : 'negative';
        const sign = isIncome ? '+' : '-';

        return `
            <div class="transaction-item ${t.type}">
                <div class="transaction-icon ${t.type}">
                    ${icon}
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${t.category}</div>
                    ${t.notes ? `<div class="transaction-note">${t.notes}</div>` : ''}
                    <div class="transaction-date">${formatDate(t.date)}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${sign}${formatCurrency(t.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" onclick="editTransaction(${t.id})" aria-label="Edit transaction"><i class="ri-edit-line"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteTransaction(${t.id})" aria-label="Delete transaction"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        `;
    }).join('');

    // Update pagination controls
    if (filtered.length > itemsPerPage) {
        paginationControls.style.display = 'block';
        document.getElementById('pageInfo').textContent =
            `Page ${currentPage} of ${totalPages} (${filtered.length} transactions)`;
        document.getElementById('prevBtn').disabled = currentPage === 1;
        document.getElementById('nextBtn').disabled = currentPage === totalPages;
    } else {
        paginationControls.style.display = 'none';
    }
}

// Update month filters
function updateMonthFilters() {
    const months = [...new Set(transactions.map(t => t.date.slice(0, 7)))];
    months.sort().reverse();

    const filters = document.getElementById('monthFilters');
    filters.innerHTML = `
        <button class="filter-btn ${selectedMonth === 'all' ? 'active' : ''}"
                onclick="filterByMonth('all')">All</button>
        ${months.map(month => `
            <button class="filter-btn ${selectedMonth === month ? 'active' : ''}"
                    onclick="filterByMonth('${month}')">${formatMonth(month)}</button>
        `).join('')}
    `;
}

// Pagination functions
function nextPage() {
    currentPage++;
    updateTransactionsList();
    scrollToTop();
}

function prevPage() {
    currentPage--;
    updateTransactionsList();
    scrollToTop();
}

function goToPage(page) {
    currentPage = page;
    updateTransactionsList();
    scrollToTop();
}

function scrollToTop() {
    const listTab = document.getElementById('listTab');
    if (listTab && listTab.classList.contains('active')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Filter by month
function filterByMonth(month) {
    selectedMonth = month;
    currentPage = 1; // Reset to first page when filter changes
    updateTransactionsList();
    updateMonthFilters();
}

// Update category filter
function updateCategoryFilter() {
    const categories = [...new Set(transactions.map(t => t.category))];
    categories.sort();

    const filter = document.getElementById('categoryFilter');
    filter.innerHTML = `
        <option value="all">All Categories</option>
        ${categories.map(cat => `
            <option value="${cat}" ${selectedCategory === cat ? 'selected' : ''}>${cat}</option>
        `).join('')}
    `;
}

// Filter by category
function filterByCategory() {
    selectedCategory = document.getElementById('categoryFilter').value;
    currentPage = 1; // Reset to first page when filter changes
    updateTransactionsList();
}

// Update grouped view
function updateGroupedView() {
    const content = document.getElementById('groupedContent');

    if (transactions.length === 0) {
        content.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="ri-bar-chart-box-line"></i></div>
                    <div>No data to group yet</div>
                </div>
            </div>
        `;
        return;
    }

    if (currentGrouping === 'month') {
        content.innerHTML = groupByMonth();
    } else {
        content.innerHTML = groupByCategory();
    }
}

// Group by month
function groupByMonth() {
    const grouped = {};

    transactions.forEach(t => {
        const month = t.date.slice(0, 7);
        if (!grouped[month]) {
            grouped[month] = { income: 0, expense: 0, count: 0 };
        }
        grouped[month].count++;
        if (t.type === 'income') {
            grouped[month].income += t.amount;
        } else {
            grouped[month].expense += t.amount;
        }
    });

    const months = Object.keys(grouped).sort().reverse();

    return months.map(month => {
        const data = grouped[month];
        const net = data.income - data.expense;
        const netClass = net >= 0 ? 'positive' : 'negative';

        return `
            <div class="card">
                <div class="group-header">
                    ${formatMonth(month)}
                    <span class="group-total">${data.count} entries</span>
                </div>
                <div class="group-content">
                    <div class="group-row">
                        <span class="group-label">Income</span>
                        <span class="positive">${formatCurrency(data.income)}</span>
                    </div>
                    <div class="group-row">
                        <span class="group-label">Expenses</span>
                        <span class="negative">${formatCurrency(data.expense)}</span>
                    </div>
                    <div class="group-row with-border">
                        <span class="group-label strong">Net</span>
                        <span class="${netClass} group-value">${formatCurrency(net)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Group by category
function groupByCategory() {
    const grouped = {};

    transactions.forEach(t => {
        if (!grouped[t.category]) {
            grouped[t.category] = { total: 0, count: 0, type: t.type };
        }
        grouped[t.category].total += t.amount;
        grouped[t.category].count++;
    });

    const categories = Object.keys(grouped).sort((a, b) =>
        grouped[b].total - grouped[a].total
    );

    return categories.map(category => {
        const data = grouped[category];
        const colorClass = data.type === 'income' ? 'positive' : 'negative';

        return `
            <div class="card">
                <div class="group-header">
                    ${category}
                    <span class="group-total">${data.count} entries</span>
                </div>
                <div class="group-content">
                    <div class="group-row">
                        <span class="group-label">Total</span>
                        <span class="${colorClass} group-value large">
                            ${formatCurrency(data.total)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Switch tabs
function switchTab(tab) {
    currentTab = tab;

    // Update old tab buttons (if they exist)
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });

    // Update bottom navigation items
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        nav.setAttribute('aria-selected', 'false');
    });

    // Set active state on bottom nav
    const activeNav = document.getElementById(tab + '-nav');
    if (activeNav) {
        activeNav.classList.add('active');
        activeNav.setAttribute('aria-selected', 'true');
    }

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
}

// Quick Add Transaction (from header button)
function quickAddTransaction() {
    // Switch to Add tab and navigate
    const addNavBtn = document.getElementById('add-nav');
    if (addNavBtn) {
        addNavBtn.click();
    }

    // Scroll to top and focus on amount input
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        document.getElementById('amount').focus();
    }, 300);
}

// Toggle summary collapse
function toggleSummaryCollapse() {
    const section = document.querySelector('.summary-section');
    const isCollapsed = section.classList.toggle('collapsed');

    // Save state to localStorage
    localStorage.setItem('summaryCollapsed', isCollapsed ? 'true' : 'false');
}

// Load summary collapse state
function loadSummaryState() {
    const isCollapsed = localStorage.getItem('summaryCollapsed') === 'true';
    if (isCollapsed) {
        document.querySelector('.summary-section').classList.add('collapsed');
    }
}

// Get previous calendar month string
function getPreviousMonth(currentMonth) {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1); // Current month's first day
    date.setMonth(date.getMonth() - 1); // Go back one month
    return date.toISOString().slice(0, 7);
}

// Get month totals for trend calculation
function getMonthTotals(month) {
    const filtered = transactions.filter(t => t.date.startsWith(month));
    const income = filtered.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        income,
        expense,
        net: income - expense,
        count: filtered.length
    };
}

// Calculate month-over-month change
function calculateMoMDelta(currentMonth, previousMonth) {
    // Edge case: No previous month data
    if (previousMonth === undefined || previousMonth === null) {
        return null; // Show "—" in UI
    }

    // Edge case: Previous month is 0
    if (previousMonth === 0) {
        if (currentMonth === 0) {
            return { abs: 0, pct: 0, direction: 'neutral' };
        }
        return {
            abs: currentMonth,
            pct: null,
            direction: currentMonth > 0 ? 'up' : 'down'
        };
    }

    const delta_abs = currentMonth - previousMonth;
    const delta_pct = (delta_abs / Math.abs(previousMonth)) * 100;

    return {
        abs: delta_abs,
        pct: delta_pct,
        direction: delta_abs > 0 ? 'up' : delta_abs < 0 ? 'down' : 'neutral'
    };
}

// Calculate expenses as percentage of income
function calculateExpensePercentage(expenses, income) {
    if (income === 0 || income === undefined) {
        return null; // Show "—" in UI
    }
    return (expenses / income) * 100;
}

// Handle summary tile clicks - navigate to filtered list view
function onSummaryTileClick(tileType) {
    // Haptic feedback (mobile)
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    // Switch to List tab
    switchTab('list');

    // Apply filters based on tile type
    switch (tileType) {
        case 'this-month':
            selectedMonth = currentMonth;
            selectedCategory = 'all';
            selectedType = 'all';
            break;

        case 'total-entries':
            selectedMonth = currentMonth;
            selectedCategory = 'all';
            selectedType = 'all';
            break;

        case 'income':
            selectedMonth = currentMonth;
            selectedCategory = 'all';
            selectedType = 'income';
            break;

        case 'expenses':
            selectedMonth = currentMonth;
            selectedCategory = 'all';
            selectedType = 'expense';
            break;
    }

    // Reset pagination
    currentPage = 1;

    // Update UI
    updateUI();
}

// Change grouping
function changeGrouping(type) {
    currentGrouping = type;

    // Update filter buttons
    document.querySelectorAll('#groupsTab .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    updateGroupedView();
}

// Edit transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    editingId = id;

    // Set type and update toggle button
    selectType(transaction.type);

    // Store category for after type change
    const categorySelect = document.getElementById('category');
    categorySelect.dataset.editValue = transaction.category;

    // Update form values
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('date').value = transaction.date;
    document.getElementById('notes').value = transaction.notes;

    // Update categories and set selected category
    updateCategoryOptions(transaction.type);
    document.getElementById('category').value = transaction.category;

    document.getElementById('formTitle').textContent = 'Edit Transaction';
    document.getElementById('submitBtn').textContent = 'Update Transaction';
    document.getElementById('cancelEditBtn').style.display = 'block';

    switchTab('add');
    window.scrollTo(0, 0);
}

// Cancel edit
function cancelEdit() {
    editingId = null;
    document.getElementById('transactionForm').reset();
    document.getElementById('date').valueAsDate = new Date();

    // Reset to expense type
    selectType('expense');

    document.getElementById('formTitle').textContent = 'Add Transaction';
    document.getElementById('submitBtn').textContent = 'Save Transaction';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

// Delete transaction
function deleteTransaction(id) {
    deleteId = id;
    document.getElementById('deleteModal').classList.add('show');
}

// Confirm delete
async function confirmDelete() {
    if (deleteId) {
        try {
            await deleteTransactionFromDB(deleteId);
            transactions = transactions.filter(t => t.id !== deleteId);
            updateUI();
            showMessage('Transaction deleted!');
        } catch (err) {
            console.error('Delete failed:', err);
            showMessage('Failed to delete transaction');
        }
        deleteId = null;
    }
    closeDeleteModal();
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    deleteId = null;
}

// Export to CSV
function exportToCSV() {
    if (transactions.length === 0) {
        showMessage('No transactions to export!');
        return;
    }

    const currencyCode = getCurrency();
    const headers = ['Date', 'Type', 'Category', `Amount (${currencyCode})`, 'Notes'];
    const rows = transactions.map(t => [
        t.date,
        t.type,
        t.category,
        t.amount,
        t.notes || ''
    ]);

    let csv = headers.join(',') + '\n';
    csv += rows.map(row => row.map(cell =>
        `"${String(cell).replace(/"/g, '""')}"`
    ).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finchronicle-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showMessage('Export successful!');
}

// Generate backup metadata header
function generateBackupMetadata() {
    const count = transactions.length;
    const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a - b);
    const oldestDate = dates.length > 0 ? dates[0].toISOString().slice(0, 10) : '';
    const newestDate = dates.length > 0 ? dates[dates.length - 1].toISOString().slice(0, 10) : '';
    const dateRange = dates.length > 0 ? `${oldestDate} to ${newestDate}` : 'No transactions';
    const backupDate = new Date().toISOString();
    const currencyCode = getCurrency();

    return [
        '# FinChronicle Backup',
        `# Version: ${APP_VERSION}`,
        `# Backup Date: ${backupDate}`,
        `# Transaction Count: ${count}`,
        `# Date Range: ${dateRange}`,
        `# Currency: ${currencyCode}`
    ].join('\n');
}

// Create backup with metadata
function createBackup() {
    if (transactions.length === 0) {
        showMessage('No transactions to backup!');
        return;
    }

    const currencyCode = getCurrency();

    // Generate metadata header
    const metadata = generateBackupMetadata();

    // Generate CSV headers (include ID and CreatedAt)
    const headers = ['Date', 'Type', 'Category', `Amount (${currencyCode})`, 'Notes', 'ID', 'CreatedAt'];

    // Generate CSV rows with all fields
    const rows = transactions.map(t => [
        t.date,
        t.type,
        t.category,
        t.amount,
        t.notes || '',
        t.id,
        t.createdAt
    ]);

    // Build CSV content
    let csv = metadata + '\n';
    csv += headers.join(',') + '\n';
    csv += rows.map(row => row.map(cell =>
        `"${String(cell).replace(/"/g, '""')}"`
    ).join(',')).join('\n');

    // Create timestamp-based filename
    const now = new Date();
    const timestamp = now.toISOString()
        .slice(0, 19)
        .replace('T', '-')
        .replace(/:/g, '');
    const filename = `finchronicle-backup-${timestamp}.csv`;

    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    showMessage('Backup created successfully!');
}

function triggerImport() {
    const input = document.getElementById('importFile');
    input.value = '';
    input.click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const result = importFromCSV(reader.result);
            if (result.added === 0) {
                showMessage('No valid rows to import.');
                return;
            }
            showMessage(`Imported ${result.added} transaction(s)` + (result.skipped ? ` • Skipped ${result.skipped}` : ''));
        } catch (err) {
            showMessage('Import failed. Check the CSV format.');
        }
    };
    reader.readAsText(file);
}

// Trigger restore file picker
function triggerRestore() {
    const input = document.getElementById('restoreFile');
    input.value = '';
    input.click();
}

// Handle restore file selection
function handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const backupData = parseBackupCSV(reader.result);

            if (!backupData.valid) {
                showMessage(`Invalid backup file: ${backupData.error}`);
                return;
            }

            // Store backup data temporarily for preview
            window._pendingRestoreData = backupData;

            // Show preview modal
            showRestorePreview(backupData);

        } catch (err) {
            console.error('Backup parse error:', err);
            showMessage('Failed to read backup file. Please check the file format.');
        }
    };

    reader.onerror = () => {
        showMessage('Failed to read file. Please try again.');
    };

    reader.readAsText(file);
}

// Parse backup CSV with metadata
function parseBackupCSV(text) {
    const lines = text.split('\n');
    const metadata = {};
    let dataStartIndex = 0;

    // Extract metadata from comment lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#')) {
            const match = line.match(/^#\s*([^:]+):\s*(.+)$/);
            if (match) {
                metadata[match[1].trim()] = match[2].trim();
            }
        } else {
            dataStartIndex = i;
            break;
        }
    }

    // Parse CSV data starting from data line
    const csvData = lines.slice(dataStartIndex).join('\n');
    const rows = parseCSV(csvData).filter(row => row.some(cell => cell.trim() !== ''));

    if (rows.length < 2) {
        return { valid: false, error: 'No transaction data found' };
    }

    // Validate headers
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const requiredHeaders = ['date', 'type', 'category', 'amount'];
    const hasRequired = requiredHeaders.every(h =>
        headers.some(header => header.includes(h))
    );

    if (!hasRequired) {
        return { valid: false, error: 'Missing required columns (Date, Type, Category, Amount)' };
    }

    // Find column indices
    const dateIndex = headers.findIndex(h => h === 'date');
    const typeIndex = headers.findIndex(h => h === 'type');
    const categoryIndex = headers.findIndex(h => h === 'category');
    const amountIndex = headers.findIndex(h => h.includes('amount'));
    const notesIndex = headers.findIndex(h => h === 'notes');
    const idIndex = headers.findIndex(h => h === 'id');
    const createdAtIndex = headers.findIndex(h => h === 'createdat');

    // Parse transactions
    const parsedTransactions = [];
    const dataRows = rows.slice(1);

    dataRows.forEach((row, i) => {
        const rawDate = (row[dateIndex] || '').trim();
        const rawAmount = (row[amountIndex] || '').replace(/,/g, '').trim();
        const amount = parseFloat(rawAmount);

        if (!rawDate || isNaN(amount)) {
            return; // Skip invalid rows
        }

        const transaction = {
            id: idIndex !== -1 && row[idIndex] ? parseInt(row[idIndex]) : Date.now() + i,
            type: typeIndex !== -1 ? (row[typeIndex] || '').trim().toLowerCase() : 'expense',
            amount: Math.abs(amount),
            category: categoryIndex !== -1 ? (row[categoryIndex] || '').trim() : 'Other Expense',
            date: rawDate,
            notes: notesIndex !== -1 ? (row[notesIndex] || '').trim() : '',
            createdAt: createdAtIndex !== -1 && row[createdAtIndex] ? row[createdAtIndex].trim() : new Date().toISOString()
        };

        // Ensure valid type
        if (transaction.type !== 'income' && transaction.type !== 'expense') {
            transaction.type = 'expense';
        }

        parsedTransactions.push(transaction);
    });

    if (parsedTransactions.length === 0) {
        return { valid: false, error: 'No valid transactions found in backup' };
    }

    return {
        valid: true,
        metadata,
        transactions: parsedTransactions
    };
}

// Show restore preview modal
function showRestorePreview(backupData) {
    const modal = document.getElementById('restorePreviewModal');

    // Populate preview data
    document.getElementById('previewBackupDate').textContent =
        backupData.metadata['Backup Date'] ?
            formatDate(backupData.metadata['Backup Date'].slice(0, 10)) :
            'Unknown';

    document.getElementById('previewCount').textContent = backupData.transactions.length;

    // Calculate date range
    const dates = backupData.transactions.map(t => new Date(t.date)).sort((a, b) => a - b);
    const oldestDate = dates.length > 0 ? formatDate(dates[0].toISOString().slice(0, 10)) : '-';
    const newestDate = dates.length > 0 ? formatDate(dates[dates.length - 1].toISOString().slice(0, 10)) : '-';
    document.getElementById('previewDateRange').textContent = `${oldestDate} to ${newestDate}`;

    document.getElementById('previewCurrency').textContent =
        backupData.metadata['Currency'] || getCurrency();

    // Show modal
    modal.classList.add('show');
}

// Check if transaction is a duplicate
function isDuplicateTransaction(newTransaction, existingTransactions) {
    return existingTransactions.some(existing => {
        return existing.date === newTransaction.date &&
            existing.type === newTransaction.type &&
            existing.category === newTransaction.category &&
            existing.amount === newTransaction.amount &&
            (existing.notes || '') === (newTransaction.notes || '');
    });
}

// Close restore preview modal
function closeRestorePreview() {
    const modal = document.getElementById('restorePreviewModal');
    modal.classList.remove('show');
    window._pendingRestoreData = null;
}

// Close restore report modal
function closeRestoreReport() {
    const modal = document.getElementById('restoreReportModal');
    modal.classList.remove('show');
}

// Show restore report modal
function showRestoreReport(stats) {
    const modal = document.getElementById('restoreReportModal');

    // Populate report statistics
    document.getElementById('reportBackupTotal').textContent = stats.backupTotal;
    document.getElementById('reportAdded').textContent = stats.added;
    document.getElementById('reportDuplicates').textContent = stats.duplicates;
    document.getElementById('reportCurrentTotal').textContent = stats.currentTotal;

    // Show modal
    modal.classList.add('show');
}

// Confirm and execute restore (Merge Mode with Duplicate Detection)
async function confirmRestore() {
    const backupData = window._pendingRestoreData;
    if (!backupData) return;

    // Close preview modal
    closeRestorePreview();

    // Show loading message
    showMessage('Restoring backup...');

    try {
        // Get current transactions from database
        await loadDataFromDB();

        // Track statistics
        const stats = {
            backupTotal: backupData.transactions.length,
            added: 0,
            duplicates: 0,
            currentTotal: 0
        };

        // Filter out duplicates and collect new transactions
        const newTransactions = [];

        backupData.transactions.forEach(backupTxn => {
            if (isDuplicateTransaction(backupTxn, transactions)) {
                stats.duplicates++;
            } else {
                newTransactions.push(backupTxn);
                stats.added++;
            }
        });

        // Import only new (non-duplicate) transactions
        if (newTransactions.length > 0) {
            await bulkSaveTransactionsToDB(newTransactions);

            // Add to in-memory array
            transactions.push(...newTransactions);
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        // Calculate current total
        stats.currentTotal = transactions.length;

        // Refresh UI
        updateUI();

        // Show detailed report
        showRestoreReport(stats);

    } catch (err) {
        console.error('Restore failed:', err);
        showMessage('Restore failed. Your existing data was preserved.');

        // Reload data to ensure consistency
        try {
            await loadDataFromDB();
            updateUI();
        } catch (reloadErr) {
            console.error('Failed to reload data:', reloadErr);
        }
    }
}

function importFromCSV(text) {
    const rows = parseCSV(text).filter(row => row.some(cell => cell.trim() !== ''));
    if (rows.length < 2) {
        return { added: 0, skipped: rows.length };
    }

    const headers = rows[0].map(h => h.trim());
    const dateIndex = findHeaderIndex(headers, /^date$/i);
    const typeIndex = findHeaderIndex(headers, /^type$/i);
    const categoryIndex = findHeaderIndex(headers, /^category$/i);
    const amountIndex = findHeaderIndex(headers, /^amount\b/i);
    const notesIndex = findHeaderIndex(headers, /^notes$/i) ?? findHeaderIndex(headers, /^description$/i);

    if (dateIndex === -1 || categoryIndex === -1 || amountIndex === -1) {
        throw new Error('Missing required headers');
    }

    let added = 0;
    let skipped = 0;
    const nowIso = new Date().toISOString();
    const startId = Date.now();

    rows.slice(1).forEach((row, i) => {
        const rawDate = (row[dateIndex] || '').trim();
        const normalizedDate = normalizeDate(rawDate);
        const rawAmount = (row[amountIndex] || '').replace(/,/g, '').trim();
        const amount = parseFloat(rawAmount);

        if (!normalizedDate || Number.isNaN(amount)) {
            skipped += 1;
            return;
        }

        const rawType = typeIndex !== -1 ? (row[typeIndex] || '').trim().toLowerCase() : 'expense';
        const type = rawType === 'income' ? 'income' : 'expense';
        const baseCategory = (row[categoryIndex] || '').trim();
        const notes = notesIndex !== -1 ? (row[notesIndex] || '').trim() : '';
        const category = normalizeImportedCategory(baseCategory, notes, type);

        transactions.unshift({
            id: startId + i,
            type,
            amount: Math.abs(amount),
            category,
            date: normalizedDate,
            notes,
            createdAt: nowIso
        });
        added += 1;
    });

    if (added > 0) {
        bulkSaveTransactionsToDB(transactions).then(() => {
            updateUI();
        }).catch(err => {
            console.error('Bulk save failed:', err);
        });
    }

    return { added, skipped };
}

function findHeaderIndex(headers, regex) {
    return headers.findIndex(h => regex.test(h));
}

function normalizeDate(value) {
    if (!value) return '';
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    const shortMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})$/);
    if (shortMatch) {
        const day = shortMatch[1].padStart(2, '0');
        const month = monthNameToNumber(shortMatch[2]);
        if (!month) return '';
        const year = new Date().getFullYear();
        return `${year}-${month}-${day}`;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const day = slashMatch[1].padStart(2, '0');
        const month = slashMatch[2].padStart(2, '0');
        const year = slashMatch[3];
        const dateStr = `${year}-${month}-${day}`;
        // Validate the date is actually valid
        const testDate = new Date(dateStr);
        if (!Number.isNaN(testDate.getTime()) &&
            testDate.getFullYear() === parseInt(year) &&
            testDate.getMonth() + 1 === parseInt(month) &&
            testDate.getDate() === parseInt(day)) {
            return dateStr;
        }
        return '';
    }

    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
    }

    return '';
}

function normalizeImportedCategory(baseCategory, notes, type) {
    if (type === 'income') {
        const incomeBase = (baseCategory || '').trim();
        if (incomeBase) {
            return incomeBase;
        }
        const desc = (notes || '').toLowerCase();
        const incomeMap = [
            { category: 'Salary', keys: ['salary', 'payroll', 'paycheck'] },
            { category: 'Bonus', keys: ['bonus'] },
            { category: 'Freelance', keys: ['freelance', 'contract'] },
            { category: 'Business', keys: ['business', 'sale', 'revenue'] },
            { category: 'Investment', keys: ['investment', 'interest', 'dividend', 'capital gain'] },
            { category: 'Rental Income', keys: ['rent', 'rental'] },
            { category: 'Gifts/Refunds', keys: ['gift', 'refund', 'cashback', 'reimbursement'] }
        ];
        for (const entry of incomeMap) {
            if (entry.keys.some(key => desc.includes(key))) {
                return entry.category;
            }
        }
        return 'Other Income';
    }

    const desc = (notes || '').toLowerCase();
    const base = (baseCategory || '').toLowerCase();

    const keywordMap = [
        { category: 'Groceries', keys: ['grocery', 'groceries', 'market', 'big c', 'bigc', 'tops', '7 11', '7-11', 'seven 11', 'lotus', 'taopoon', 'fruits', 'veg', 'vegetable', 'meat', 'fish', 'milk', 'powder', 'diaper'] },
        { category: 'Food', keys: ['kfc', 'mcd', 'mc d', 'subway', 'grab food', 'grab', 'dinner', 'lunch', 'coffee', 'coffe', 'tea', 'ice cream', 'burger', 'biriyani', 'haidilao', 'pepper lunch', 'restaurant', 'food', 'tao bin', 'taobin'] },
        { category: 'Utilities/Bills', keys: ['bill', 'electricity', 'water', 'true', 'phone', 'internet'] },
        { category: 'Transport', keys: ['taxi', 'bus', 'train', 'mrt', 'fuel', 'bike', 'scooter', 'car'] },
        { category: 'Kids/School', keys: ['playschool', 'play school', 'tuition', 'school', 'kid', 'kevin', 'elvin', 'bday', 'kids'] },
        { category: 'Insurance/Taxes', keys: ['insurance', 'premium', 'tax', 'taxes'] },
        { category: 'Charity/Gifts', keys: ['charity', 'donation', 'gift', 'gifts', 'event', 'events', 'birthday'] },
        { category: 'Fees/Docs', keys: ['passport', 'renewal', 'certificate', 'cert', 'photostats', 'fee'] },
        { category: 'Household', keys: ['cleaning', 'repair', 'mirror'] },
        { category: 'Savings/Investments', keys: ['saving', 'savings', 'investment', 'invest', 'mutual fund', 'sip', 'stock', 'equity'] }
    ];

    const hardCategories = ['rent', 'debt/loans', 'nanny salary', 'play school (son)'];
    if (hardCategories.includes(base)) {
        return baseCategory;
    }

    for (const entry of keywordMap) {
        if (entry.keys.some(key => desc.includes(key))) {
            return entry.category;
        }
    }

    if (base === 'transport') return 'Transport';
    if (base === 'groceries') return 'Groceries';
    if (base === 'food' || base === 'dining out') return 'Food';
    if (base === 'utilities/misc') return 'Utilities/Bills';
    if (base === 'gifts/events' || base === 'gifts' || base === 'charity') return 'Charity/Gifts';
    if (base === 'insurance/taxes' || base === 'insurance' || base === 'taxes') return 'Insurance/Taxes';
    if (base === 'savings/investments' || base === 'savings' || base === 'investments') return 'Savings/Investments';
    if (base === 'other expense') return 'Misc/Buffer';

    return baseCategory || 'Other Expense';
}

function monthNameToNumber(month) {
    const map = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    return map[month.toLowerCase()] || '';
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') {
                i++;
            }
            row.push(current);
            rows.push(row);
            row = [];
            current = '';
        } else {
            current += char;
        }
    }

    // Handle remaining data after loop
    if (text.length === 0) {
        // Empty CSV should return one empty cell
        return [['']];
    } else if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
    }

    return rows;
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    const icon = document.getElementById('darkModeIcon');
    icon.className = isDark ? 'ri-sun-line' : 'ri-moon-line';
    document.getElementById('darkModeBtn').setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
}

// Load dark mode preference
function loadDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('darkModeIcon');
        icon.className = 'ri-sun-line';
        document.getElementById('darkModeBtn').setAttribute('aria-label', 'Switch to light mode');
    }
}

// Format number
function formatNumber(num) {
    return Math.abs(num).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Format month
function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric'
    });
}

// Hide install prompt
function hideInstallPrompt() {
    document.getElementById('installPrompt').style.display = 'none';
    localStorage.setItem('installPromptHidden', 'true');
}

// Show install prompt for iOS
function checkInstallPrompt() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    const promptHidden = localStorage.getItem('installPromptHidden');

    if (isIOS && !isStandalone && !promptHidden) {
        document.getElementById('installPrompt').style.display = 'block';
    }
}

// Version Management Functions
function checkAppVersion() {
    const storedVersion = localStorage.getItem(VERSION_KEY);

    if (!storedVersion) {
        // First time install
        localStorage.setItem(VERSION_KEY, APP_VERSION);
        console.log(`✨ FinChronicle ${APP_VERSION} installed!`);
    } else if (storedVersion !== APP_VERSION) {
        // Version has changed - show update notification
        console.log(`🎉 Updated from ${storedVersion} to ${APP_VERSION}`);
        showUpdateNotification(storedVersion, APP_VERSION);
        localStorage.setItem(VERSION_KEY, APP_VERSION);
    } else {
        // Same version, check if service worker has updates
        checkServiceWorkerUpdate();
    }

    // Update version display in UI
    document.getElementById('appVersion').textContent = `v${APP_VERSION}`;
}

function showUpdateNotification(oldVersion, newVersion) {
    const prompt = document.getElementById('updatePrompt');
    const message = prompt.querySelector('p');
    message.textContent = `Updated from v${oldVersion} to v${newVersion}! Check out the new features.`;
    prompt.classList.add('show');

    // Auto-hide after 10 seconds
    setTimeout(() => {
        dismissUpdate();
    }, 10000);
}

function checkServiceWorkerUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available
                            updateAvailable = true;
                            showUpdatePrompt();
                        }
                    });
                });
                // Check for updates now
                registration.update();
            }
        });
    }
}

function showUpdatePrompt() {
    const prompt = document.getElementById('updatePrompt');
    prompt.classList.add('show');
}

function reloadApp() {
    // Tell service worker to skip waiting and activate immediately
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
                // Tell the waiting service worker to activate
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
                // No waiting worker, just reload
                window.location.reload(true);
            }
        });
    } else {
        // Force hard reload
        window.location.reload(true);
    }
}

function dismissUpdate() {
    const prompt = document.getElementById('updatePrompt');
    prompt.classList.remove('show');
}

// Manual update check
function checkForUpdates() {
    const btn = document.getElementById('updateCheckBtn');
    const icon = btn.querySelector('i');

    // Show spinning animation
    icon.style.animation = 'spin 1s linear infinite';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                console.log('🔍 Checking for updates...');
                showMessage('Checking for updates...');

                registration.update().then(() => {
                    setTimeout(() => {
                        icon.style.animation = '';

                        // Check if update is available
                        if (registration.waiting || registration.installing) {
                            showMessage('Update found! Preparing...');
                            showUpdatePrompt();
                        } else {
                            showMessage('You\'re on the latest version!');
                        }
                    }, 1000);
                });
            } else {
                icon.style.animation = '';
                showMessage('No service worker registered');
            }
        });
    } else {
        icon.style.animation = '';
        showMessage('Service Worker not supported');
    }
}

// Initialize app
window.addEventListener('load', async function () {
    try {
        await initDB();
        await migrateFromLocalStorage();
        await loadDataFromDB();
        updateUI();
        checkAppVersion();
        loadDarkMode();
        loadSummaryState();
        updateCurrencyDisplay();
        checkInstallPrompt();
    } catch (err) {
        console.error('App initialization failed:', err);
        showMessage('Failed to load data');
    }
});

// Register service worker for offline support
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    let refreshing = false;

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'SW_UPDATED') {
            console.log('✅ Service Worker updated:', event.data.version);
            // Show update notification
            if (!refreshing) {
                showUpdatePrompt();
            }
        }
    });

    // Detect when new service worker is controlling the page
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        console.log('🔄 New service worker taking control - reloading page...');
        refreshing = true;
        window.location.reload();
    });

    // Register service worker
    navigator.serviceWorker.register('sw.js')
        .then(registration => {
            console.log('✅ Service Worker registered - App works offline!');

            // Check for updates every time the app is opened
            registration.update();

            // Check for updates periodically (every 60 seconds)
            setInterval(() => {
                registration.update();
            }, 60000);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🆕 New service worker found - installing...');

                newWorker.addEventListener('statechange', () => {
                    console.log('Service Worker state:', newWorker.state);

                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available!
                        console.log('🎉 New version ready to activate!');
                        showUpdatePrompt();
                    }
                });
            });
        })
        .catch(err => console.error('❌ Service Worker registration failed:', err));
} else if (window.location.protocol === 'file:') {
    console.log('ℹ️ Service Worker requires HTTP/HTTPS. Run a local server to enable offline mode.');
    console.log('Quick start: python3 -m http.server 8000');
}
