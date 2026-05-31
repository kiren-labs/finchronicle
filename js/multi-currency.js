// ============================================================================
// Multi-Currency Transactions (v3.24.0)
// ============================================================================

import { state, currencies } from "./state.js";
import { getCurrency } from "./currency.js";
import { formatNumber } from "./utils.js";

// ============================================================================
// Exchange Rate History (stored in localStorage)
// ============================================================================

const RATE_STORAGE_KEY = "exchangeRateHistory";

/**
 * Get saved exchange rates. Returns { "USD_INR": 83.5, ... }
 */
export function getSavedRates() {
  try {
    return JSON.parse(localStorage.getItem(RATE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Save exchange rate for a currency pair.
 */
function saveRate(fromCurrency, toCurrency, rate) {
  const rates = getSavedRates();
  rates[`${fromCurrency}_${toCurrency}`] = rate;
  localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(rates));
}

/**
 * Get the last known rate for a currency pair, or null.
 */
export function getLastRate(fromCurrency, toCurrency) {
  const rates = getSavedRates();
  return rates[`${fromCurrency}_${toCurrency}`] || null;
}

// ============================================================================
// Form Rendering
// ============================================================================

/**
 * Render the multi-currency form fields inside the optional fields container.
 * Called when the transactionCurrency optional field is enabled.
 */
export function renderMultiCurrencyFields() {
  const container = document.querySelector('[data-optional-field="transactionCurrency"]');
  if (!container) return;

  const homeCurrency = getCurrency();
  const isEnabled = state.appSettings && state.appSettings.enabledFields.transactionCurrency;

  container.hidden = !isEnabled;
  if (!isEnabled) return;

  // Only render once — check if already populated
  if (container.querySelector("#txCurrencySelect")) return;

  container.innerHTML = `
    <label for="txCurrencySelect">Transaction Currency</label>
    <select id="txCurrencySelect">
      <option value="">Same as home (${homeCurrency})</option>
      ${Object.entries(currencies)
        .filter(([code]) => code !== homeCurrency)
        .map(([code, c]) => `<option value="${code}">${c.symbol} ${code} — ${c.name}</option>`)
        .join("")}
    </select>
    <div id="exchangeRateGroup" class="exchange-rate-group" hidden>
      <div class="form-group" style="margin-top:8px; margin-bottom:0;">
        <label for="exchangeRateInput">Exchange Rate <span class="form-hint-inline" id="rateHint"></span></label>
        <input type="number" id="exchangeRateInput" placeholder="e.g. 83.5" min="0.0001" step="any" inputmode="decimal">
        <div class="form-hint" id="homeAmountPreview"></div>
      </div>
    </div>
  `;

  bindMultiCurrencyEvents();
}

/**
 * Bind events for the multi-currency form fields.
 */
function bindMultiCurrencyEvents() {
  const select = document.getElementById("txCurrencySelect");
  const rateGroup = document.getElementById("exchangeRateGroup");
  const rateInput = document.getElementById("exchangeRateInput");
  const rateHint = document.getElementById("rateHint");
  const preview = document.getElementById("homeAmountPreview");

  if (!select) return;

  select.addEventListener("change", () => {
    const txCurrency = select.value;
    const homeCurrency = getCurrency();

    if (!txCurrency || txCurrency === homeCurrency) {
      rateGroup.hidden = true;
      rateInput.value = "";
      return;
    }

    rateGroup.hidden = false;
    rateHint.textContent = `(1 ${txCurrency} = ? ${homeCurrency})`;

    // Auto-fill last known rate
    const lastRate = getLastRate(txCurrency, homeCurrency);
    if (lastRate && !rateInput.value) {
      rateInput.value = lastRate;
      updateHomeAmountPreview();
    }
  });

  rateInput.addEventListener("input", updateHomeAmountPreview);

  function updateHomeAmountPreview() {
    const rate = parseFloat(rateInput.value);
    const amountInput = document.getElementById("amount");
    const amount = parseFloat(amountInput ? amountInput.value : 0);
    const homeCurrency = getCurrency();
    const symbol = currencies[homeCurrency] ? currencies[homeCurrency].symbol : "";

    if (rate > 0 && amount > 0) {
      const homeAmount = amount * rate;
      preview.textContent = `≈ ${symbol}${formatNumber(homeAmount)} in ${homeCurrency}`;
    } else if (rate > 0) {
      preview.textContent = `Enter amount to see conversion`;
    } else {
      preview.textContent = "";
    }
  }

  // Also update preview when amount changes
  const amountInput = document.getElementById("amount");
  if (amountInput) {
    amountInput.addEventListener("input", () => {
      if (!rateGroup.hidden) updateHomeAmountPreview();
    });
  }
}

// ============================================================================
// Form Data Extraction
// ============================================================================

/**
 * Get multi-currency field values from the form.
 * Returns { transactionCurrency, exchangeRate, homeAmount } or empty values.
 */
export function getMultiCurrencyFormData() {
  const select = document.getElementById("txCurrencySelect");
  const rateInput = document.getElementById("exchangeRateInput");
  const amountInput = document.getElementById("amount");

  if (!select || !select.value) {
    return { transactionCurrency: null, exchangeRate: null, homeAmount: null };
  }

  const txCurrency = select.value;
  const rate = parseFloat(rateInput ? rateInput.value : "");
  const amount = parseFloat(amountInput ? amountInput.value : "");
  const homeCurrency = getCurrency();

  if (!txCurrency || txCurrency === homeCurrency) {
    return { transactionCurrency: null, exchangeRate: null, homeAmount: null };
  }

  if (isNaN(rate) || rate <= 0) {
    return { transactionCurrency: txCurrency, exchangeRate: null, homeAmount: null };
  }

  // Save this rate for future auto-fill
  saveRate(txCurrency, homeCurrency, rate);

  const homeAmount = isNaN(amount) ? null : Math.round(amount * rate * 100) / 100;

  return {
    transactionCurrency: txCurrency,
    exchangeRate: rate,
    homeAmount: homeAmount,
  };
}

/**
 * Set multi-currency form fields when editing a transaction.
 */
export function setMultiCurrencyFormData(transaction) {
  const select = document.getElementById("txCurrencySelect");
  const rateInput = document.getElementById("exchangeRateInput");
  const rateGroup = document.getElementById("exchangeRateGroup");
  const rateHint = document.getElementById("rateHint");

  if (!select) return;

  if (transaction.transactionCurrency) {
    select.value = transaction.transactionCurrency;
    if (rateGroup) rateGroup.hidden = false;
    if (rateInput && transaction.exchangeRate) {
      rateInput.value = transaction.exchangeRate;
    }
    if (rateHint) {
      const homeCurrency = getCurrency();
      rateHint.textContent = `(1 ${transaction.transactionCurrency} = ? ${homeCurrency})`;
    }
  } else {
    select.value = "";
    if (rateGroup) rateGroup.hidden = true;
    if (rateInput) rateInput.value = "";
  }
}

/**
 * Clear multi-currency form fields.
 */
export function clearMultiCurrencyFields() {
  const select = document.getElementById("txCurrencySelect");
  const rateInput = document.getElementById("exchangeRateInput");
  const rateGroup = document.getElementById("exchangeRateGroup");
  const preview = document.getElementById("homeAmountPreview");

  if (select) select.value = "";
  if (rateInput) rateInput.value = "";
  if (rateGroup) rateGroup.hidden = true;
  if (preview) preview.textContent = "";
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Format a transaction amount showing both foreign and home currency.
 * e.g. "$50 (₹4,175)"
 */
export function formatMultiCurrency(transaction) {
  if (!transaction.transactionCurrency || !transaction.homeAmount) {
    return null; // caller uses regular formatCurrency
  }

  const foreignSymbol = currencies[transaction.transactionCurrency]
    ? currencies[transaction.transactionCurrency].symbol
    : transaction.transactionCurrency + " ";

  const homeSymbol = currencies[getCurrency()]
    ? currencies[getCurrency()].symbol
    : "";

  return {
    foreign: `${foreignSymbol}${formatNumber(transaction.amount)}`,
    home: `${homeSymbol}${formatNumber(transaction.homeAmount)}`,
  };
}

// ============================================================================
// Conversion Helper (Settings utility)
// ============================================================================

/**
 * Quick conversion lookup using saved rates.
 */
export function convertAmount(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const rate = getLastRate(fromCurrency, toCurrency);
  if (!rate) return null;
  return Math.round(amount * rate * 100) / 100;
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindMultiCurrencyEvents() {
  document.getElementById("optionalFieldToggles").addEventListener("change", (e) => {
    const checkbox = e.target.closest("[data-field-toggle]");
    if (checkbox && checkbox.dataset.fieldToggle === "transactionCurrency") {
      setTimeout(() => renderMultiCurrencyFields(), 50);
    }
  });
}
