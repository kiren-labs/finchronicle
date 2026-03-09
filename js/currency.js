// ============================================================================
// Currency Operations
// ============================================================================

import { currencies } from './state.js';
import { formatNumber } from './utils.js';

// Get current currency code from localStorage
export function getCurrency() {
    const saved = localStorage.getItem('currency');
    return saved && currencies[saved] ? saved : 'INR';
}

// Persist currency choice (UI refresh done by caller)
export function setCurrency(code) {
    localStorage.setItem('currency', code);
}

// Get currency symbol for current currency
export function getCurrencySymbol() {
    const code = getCurrency();
    return currencies[code].symbol;
}

// Format number as currency string
export function formatCurrency(amount) {
    return `${getCurrencySymbol()}${formatNumber(amount)}`;
}

// Update currency display elements
export function updateCurrencyDisplay() {
    const code = getCurrency();
    const currency = currencies[code];
    document.getElementById('currencySymbol').textContent = currency.symbol;
    document.getElementById('currencyCode').textContent = code;
    document.querySelector('label[for="amount"]').textContent = `Amount (${currency.symbol})`;
}

// Toggle currency selector modal visibility
export function toggleCurrencySelector() {
    const modal = document.getElementById('currencyModal');
    const list = document.getElementById('currencyList');
    const currentCode = getCurrency();

    // Populate currency list (event delegation handles click)
    list.innerHTML = Object.entries(currencies).map(([code, curr]) => `
        <div class="currency-item ${code === currentCode ? 'active' : ''}" data-code="${code}">
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

// Close currency selector modal
export function closeCurrencySelector() {
    document.getElementById('currencyModal').style.display = 'none';
}
