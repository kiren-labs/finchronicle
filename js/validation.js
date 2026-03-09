// ============================================================================
// Transaction Validation Layer (v3.10.2)
// ============================================================================

import { categories } from './state.js';
import { sanitizeHTML } from './utils.js';

// Validate transaction before saving
export function validateTransaction(transaction) {
    const errors = [];

    // 1. Type validation
    if (!['income', 'expense'].includes(transaction.type)) {
        errors.push({ field: 'type', message: 'Invalid transaction type' });
    }

    // 2. Amount validation
    if (isNaN(transaction.amount) || transaction.amount <= 0) {
        errors.push({ field: 'amount', message: 'Amount must be a positive number' });
    }
    if (transaction.amount > 999999999) {
        errors.push({ field: 'amount', message: 'Amount exceeds maximum limit' });
    }

    // 3. Category validation
    const validCategories = transaction.type === 'income' ? categories.income : categories.expense;
    if (!validCategories.includes(transaction.category)) {
        errors.push({ field: 'category', message: 'Invalid category for transaction type' });
    }

    // 4. Date validation
    // Check format and parse components
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!transaction.date || !dateFormatRegex.test(transaction.date)) {
        errors.push({ field: 'date', message: 'Invalid date format' });
    } else {
        const date = new Date(transaction.date);
        // Verify the date is valid and components match input
        const [year, month, day] = transaction.date.split('-').map(Number);
        if (isNaN(date.getTime()) ||
            date.getFullYear() !== year ||
            date.getMonth() + 1 !== month ||
            date.getDate() !== day) {
            errors.push({ field: 'date', message: 'Invalid date format' });
        } else {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (date > today) {
                errors.push({ field: 'date', message: 'Future dates are not allowed' });
            }
            if (date < new Date('1900-01-01')) {
                errors.push({ field: 'date', message: 'Date is too far in the past' });
            }
        }
    }

    // 5. Notes sanitization and length validation
    if (transaction.notes && transaction.notes.length > 500) {
        errors.push({ field: 'notes', message: 'Notes too long (max 500 characters)' });
    }
    transaction.notes = sanitizeHTML(transaction.notes || '');

    return {
        valid: errors.length === 0,
        errors: errors,
        sanitized: transaction
    };
}
