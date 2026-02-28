// ============================================================================
// Pure Utility Functions
// ============================================================================

// Sanitize HTML to prevent XSS attacks
export function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Format number with commas
export function formatNumber(num) {
    return Math.abs(num).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date string to locale display
export function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Format month string to locale display
export function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric'
    });
}

// Convert month abbreviation to number
export function monthNameToNumber(month) {
    const map = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    return map[month.toLowerCase()] || '';
}

// Show a toast/notification message
export function showMessage(text) {
    const msg = document.getElementById('successMessage');
    msg.textContent = text;
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
}

// RFC-compliant CSV parser
export function parseCSV(text) {
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
        return [['']];
    } else if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
    }

    return rows;
}

// Find header index by regex pattern
export function findHeaderIndex(headers, regex) {
    return headers.findIndex(h => regex.test(h));
}

// Normalize date string to YYYY-MM-DD
export function normalizeDate(value) {
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

// Normalize imported category based on keywords
export function normalizeImportedCategory(baseCategory, notes, type) {
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
