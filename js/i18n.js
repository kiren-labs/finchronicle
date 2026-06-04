// ============================================================================
// i18n — String Localization & Variable Interpolation
// ============================================================================

import en from './lang/en.js';

/**
 * Translate a key path to its string value, optionally interpolating variables.
 * @param {string} key - Dot-separated path (e.g., "message.transaction_saved")
 * @param {Object} vars - Variables to interpolate in {braces}
 * @returns {string} Translated string, or the key if not found
 */
export function t(key, vars = {}) {
  const val = key.split(".").reduce((obj, k) => obj?.[k], en) ?? key;
  return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
