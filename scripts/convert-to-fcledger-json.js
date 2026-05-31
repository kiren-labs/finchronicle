#!/usr/bin/env node
/**
 * convert-to-fcledger-json.js
 *
 * Converts a FinChronicle v3 CSV backup into a FinChronicleLedger
 * full JSON backup that can be restored via Settings → Restore from Backup.
 *
 * Usage:
 *   node scripts/convert-to-fcledger-json.js <input.csv> [output.json]
 *
 * Example:
 *   node scripts/convert-to-fcledger-json.js \
 *     docs/personal/finchronicle-backup-2026-03-31-142159.csv \
 *     docs/personal/fcledger-import-2026-03-31.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Config ──────────────────────────────────────────────────────────────────

const APP_NAME    = 'FinChronicleLedger';
const APP_VERSION = '1.1.0';
const CURRENCY    = 'THB';

// Default asset account used as the second leg of every entry (Checking Account)
const DEFAULT_ASSET_CODE = 1100;

// ─── Chart of Accounts (mirrors chart-of-accounts.js) ────────────────────────

const DEFAULT_ACCOUNTS = [
    { code: 1000, name: 'Cash',                    type: 'asset',     isSystem: false },
    { code: 1100, name: 'Checking Account',         type: 'asset',     isSystem: false },
    { code: 1200, name: 'Savings Account',          type: 'asset',     isSystem: false },
    { code: 1300, name: 'Secondary Checking',       type: 'asset',     isSystem: false },
    { code: 1400, name: 'Fixed Deposits',           type: 'asset',     isSystem: false },
    { code: 1500, name: 'Investment Account',       type: 'asset',     isSystem: false },
    { code: 2000, name: 'Credit Card',              type: 'liability', isSystem: false },
    { code: 2100, name: 'Personal Loan',            type: 'liability', isSystem: false },
    { code: 2200, name: 'Auto Loan',                type: 'liability', isSystem: false },
    { code: 2300, name: 'Home Loan / Mortgage',     type: 'liability', isSystem: false },
    { code: 2400, name: 'Other Liabilities',        type: 'liability', isSystem: false },
    { code: 3000, name: 'Opening Balance Equity',   type: 'equity',    isSystem: true  },
    { code: 3100, name: 'Retained Earnings',        type: 'equity',    isSystem: true  },
    { code: 4000, name: 'Salary',                   type: 'income',    isSystem: false },
    { code: 4100, name: 'Business Income',          type: 'income',    isSystem: false },
    { code: 4200, name: 'Investment Returns',       type: 'income',    isSystem: false },
    { code: 4300, name: 'Rental Income',            type: 'income',    isSystem: false },
    { code: 4400, name: 'Freelance Income',         type: 'income',    isSystem: false },
    { code: 4500, name: 'Bonus',                    type: 'income',    isSystem: false },
    { code: 4600, name: 'Gifts & Refunds Received', type: 'income',    isSystem: false },
    { code: 4900, name: 'Other Income',             type: 'income',    isSystem: false },
    { code: 5000, name: 'Groceries',                type: 'expense',   isSystem: false },
    { code: 5100, name: 'Dining Out',               type: 'expense',   isSystem: false },
    { code: 5150, name: 'Coffee & Snacks',          type: 'expense',   isSystem: false },
    { code: 5200, name: 'Public Transit',           type: 'expense',   isSystem: false },
    { code: 5210, name: 'Fuel & Parking',           type: 'expense',   isSystem: false },
    { code: 5220, name: 'Car Maintenance',          type: 'expense',   isSystem: false },
    { code: 5300, name: 'Electricity & Water',      type: 'expense',   isSystem: false },
    { code: 5310, name: 'Internet & Phone',         type: 'expense',   isSystem: false },
    { code: 5320, name: 'Subscriptions',            type: 'expense',   isSystem: false },
    { code: 5400, name: 'Rent',                     type: 'expense',   isSystem: false },
    { code: 5410, name: 'Mortgage Payment',         type: 'expense',   isSystem: false },
    { code: 5500, name: 'Kids & School',            type: 'expense',   isSystem: false },
    { code: 5510, name: 'Tuition & Education',      type: 'expense',   isSystem: false },
    { code: 5600, name: 'Fees & Documents',         type: 'expense',   isSystem: false },
    { code: 5700, name: 'Medical & Healthcare',     type: 'expense',   isSystem: false },
    { code: 5710, name: 'Fitness & Gym',            type: 'expense',   isSystem: false },
    { code: 5800, name: 'Personal & Shopping',      type: 'expense',   isSystem: false },
    { code: 5810, name: 'Personal Care',            type: 'expense',   isSystem: false },
    { code: 5850, name: 'Clothing',                 type: 'expense',   isSystem: false },
    { code: 5900, name: 'Insurance & Taxes',        type: 'expense',   isSystem: false },
    { code: 5910, name: 'Savings & Investments',    type: 'expense',   isSystem: false },
    { code: 5920, name: 'Debt & Loan Payments',     type: 'expense',   isSystem: false },
    { code: 5930, name: 'Charity & Gifts',          type: 'expense',   isSystem: false },
    { code: 5940, name: 'Household',                type: 'expense',   isSystem: false },
    { code: 5950, name: 'Other Expenses',           type: 'expense',   isSystem: false },
];

// Normal balance direction for each account type
const NORMAL_BALANCE = {
    asset:     'debit',
    liability: 'credit',
    equity:    'credit',
    income:    'credit',
    expense:   'debit',
};

// v3 category → v4 account code (mirrors MIGRATION_CATEGORY_MAP)
const CATEGORY_MAP = {
    // Income
    'Salary':             4000,
    'Business':           4100,
    'Investment':         4200,
    'Rental Income':      4300,
    'Freelance':          4400,
    'Bonus':              4500,
    'Gifts/Refunds':      4600,
    'Other Income':       4900,
    // Expenses
    'Food':               5100,
    'Groceries':          5000,
    'Transport':          5200,
    'Utilities/Bills':    5300,
    'Kids/School':        5500,
    'Fees/Docs':          5600,
    'Debt/Loans':         5920,
    'Household':          5940,
    'Other Expense':      5950,
    'Rent':               5400,
    'Healthcare':         5700,
    'Personal/Shopping':  5800,
    'Insurance/Taxes':    5900,
    'Savings/Investments':5910,
    'Charity/Gifts':      5930,
    'Misc/Buffer':        5950,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
    return crypto.randomBytes(8).toString('hex') + Date.now().toString(36);
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text) {
    const rows = [];
    let current = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') { field += '"'; i += 2; }
                else { inQuotes = false; i++; }
            } else { field += ch; i++; }
        } else {
            if (ch === '"') { inQuotes = true; i++; }
            else if (ch === ',') { current.push(field); field = ''; i++; }
            else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
                current.push(field); field = '';
                rows.push(current); current = [];
                i += ch === '\r' ? 2 : 1;
            } else { field += ch; i++; }
        }
    }
    if (field || current.length > 0) { current.push(field); rows.push(current); }
    return rows;
}

// ─── Parse v3 CSV ─────────────────────────────────────────────────────────────

function parseV3CSV(csvText) {
    const rows = parseCSV(csvText);
    const transactions = [];
    const warnings = [];
    let startRow = 0;

    // Skip comment lines starting with #
    while (startRow < rows.length && rows[startRow][0] && rows[startRow][0].trim().startsWith('#')) {
        startRow++;
    }

    // Skip header row (Date, Type, Category, ...)
    if (startRow < rows.length) {
        const h = rows[startRow][0].trim().toLowerCase();
        if (h === 'date') startRow++;
    }

    for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(c => c.trim() === '')) continue;

        const date     = (row[0] || '').trim();
        const type     = (row[1] || '').trim().toLowerCase();
        const category = (row[2] || '').trim();
        const amount   = parseFloat(row[3]);
        const notes    = (row[4] || '').trim();

        if (!date || isNaN(amount) || amount <= 0) {
            warnings.push(`Row ${i + 1}: skipped — invalid date or amount`);
            continue;
        }
        if (type !== 'income' && type !== 'expense') {
            warnings.push(`Row ${i + 1}: skipped — unknown type "${type}"`);
            continue;
        }

        transactions.push({ date, type, category, amount: round2(amount), notes });
    }

    return { transactions, warnings };
}

// ─── Build Accounts ───────────────────────────────────────────────────────────

function buildAccounts() {
    const now = new Date().toISOString();
    return DEFAULT_ACCOUNTS.map((a, idx) => ({
        id:            generateId(),
        code:          a.code,
        name:          a.name,
        type:          a.type,
        normalBalance: NORMAL_BALANCE[a.type],
        isActive:      true,
        isSystem:      a.isSystem,
        parentId:      null,
        sortOrder:     idx,
        createdAt:     now,
        updatedAt:     now,
    }));
}

// ─── Build Journal Entries ────────────────────────────────────────────────────

function buildJournalEntries(transactions, accounts) {
    const codeToId = new Map(accounts.map(a => [a.code, a.id]));
    const defaultAssetId = codeToId.get(DEFAULT_ASSET_CODE);
    const entries = [];
    const warnings = [];

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];

        // Resolve category → account code → account id
        let categoryCode = CATEGORY_MAP[tx.category];
        if (!categoryCode) {
            const fallback = tx.type === 'income' ? 4900 : 5950;
            warnings.push(`Row ${i + 1} (${tx.date}): unknown category "${tx.category}" → mapped to ${fallback === 4900 ? 'Other Income' : 'Other Expenses'}`);
            categoryCode = fallback;
        }

        const categoryAccountId = codeToId.get(categoryCode);
        if (!categoryAccountId) {
            warnings.push(`Row ${i + 1} (${tx.date}): account code ${categoryCode} not found — skipped`);
            continue;
        }

        const now = new Date().toISOString();
        let lines;

        if (tx.type === 'expense') {
            // DR Expense account, CR Checking
            lines = [
                { id: generateId(), accountId: categoryAccountId, debit: tx.amount, credit: 0,          memo: '' },
                { id: generateId(), accountId: defaultAssetId,    debit: 0,          credit: tx.amount, memo: '' },
            ];
        } else {
            // DR Checking, CR Income account
            lines = [
                { id: generateId(), accountId: defaultAssetId,    debit: tx.amount, credit: 0,          memo: '' },
                { id: generateId(), accountId: categoryAccountId, debit: 0,          credit: tx.amount, memo: '' },
            ];
        }

        entries.push({
            id:          generateId(),
            date:        tx.date,
            type:        tx.type,
            description: tx.notes,
            reference:   null,
            tags:        [],
            source:      'migration',
            lines,
            createdAt:   now,
            updatedAt:   now,
        });
    }

    return { entries, warnings };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node scripts/convert-to-fcledger-json.js <input.csv> [output.json]');
        process.exit(1);
    }

    const inputPath  = path.resolve(args[0]);
    const outputPath = args[1]
        ? path.resolve(args[1])
        : inputPath.replace(/\.csv$/i, '_fcledger.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`File not found: ${inputPath}`);
        process.exit(1);
    }

    const csvText = fs.readFileSync(inputPath, 'utf8');

    console.log('Parsing CSV…');
    const { transactions, warnings: parseWarnings } = parseV3CSV(csvText);
    console.log(`  → ${transactions.length} transactions found`);
    parseWarnings.forEach(w => console.warn(`  ⚠ ${w}`));

    console.log('Building chart of accounts…');
    const accounts = buildAccounts();
    console.log(`  → ${accounts.length} accounts`);

    console.log('Building journal entries…');
    const { entries, warnings: entryWarnings } = buildJournalEntries(transactions, accounts);
    console.log(`  → ${entries.length} journal entries`);
    entryWarnings.forEach(w => console.warn(`  ⚠ ${w}`));

    const backup = {
        app:            APP_NAME,
        version:        APP_VERSION,
        exportedAt:     new Date().toISOString(),
        currency:       CURRENCY,
        accounts,
        journalEntries: entries,
        settings: {
            currency:       CURRENCY,
            darkMode:       false,
            uiMode:         'simple',
            app_version:    APP_VERSION,
            v3_migration_done: true,
        },
    };

    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf8');

    console.log('');
    console.log(`✅ Done! JSON backup written to:`);
    console.log(`   ${outputPath}`);
    console.log('');
    console.log('Next steps in FCLedger:');
    console.log('  1. Settings → Restore from Backup → select the JSON file above');
    console.log('  2. After restore, fix Savings entries: change type to "transfer" (Checking → Savings)');
    console.log('  3. Fix credit card payment entries: change type to "transfer" (Checking → Credit Card)');
    console.log('  4. Set opening balance on account 2000 Credit Card for Dec 2025 carryover debt');

    if (parseWarnings.length + entryWarnings.length > 0) {
        console.log('');
        console.log(`⚠  ${parseWarnings.length + entryWarnings.length} warning(s) above — review before restoring`);
    }
}

main();
