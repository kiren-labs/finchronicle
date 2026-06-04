// ============================================================================
// Transaction Validation Layer (v3.10.2)
// ============================================================================

import {
  getAllCategoryNames,
  PAYMENT_METHODS,
  EXPENSE_TYPES,
  currencies,
  state,
} from "./state.js";
import { sanitizeHTML } from "./utils.js";

// Validate transaction before saving
export function validateTransaction(transaction) {
  const errors = [];

  // 1. Type validation
  if (!["income", "expense", "transfer"].includes(transaction.type)) {
    errors.push({ field: "type", message: "Invalid transaction type" });
  }

  // 2. Amount validation
  if (isNaN(transaction.amount) || transaction.amount <= 0) {
    errors.push({
      field: "amount",
      message: "Amount must be a positive number",
    });
  }
  if (transaction.amount > 999999999) {
    errors.push({ field: "amount", message: "Amount exceeds maximum limit" });
  }

  // 3. Category validation
  if (transaction.type === "transfer") {
    // Transfers always have category "Transfer" — auto-set it
    transaction.category = "Transfer";
  } else {
    const validCategories = getAllCategoryNames(transaction.type);
    if (!validCategories.includes(transaction.category)) {
      errors.push({
        field: "category",
        message: "Invalid category for transaction type",
      });
    }
  }

  // 3b. Transfer account validation (require both)
  if (transaction.type === "transfer") {
    const from = (transaction.fromAccount || "").trim();
    const to = (transaction.toAccount || "").trim();
    if (!from) {
      errors.push({
        field: "fromAccount",
        message: "Source account is required for transfers",
      });
    }
    if (!to) {
      errors.push({
        field: "toAccount",
        message: "Destination account is required for transfers",
      });
    }
    if (from && to && from.toLowerCase() === to.toLowerCase()) {
      errors.push({
        field: "toAccount",
        message: "Source and destination cannot be the same",
      });
    }
    // Sanitize account names
    transaction.fromAccount = sanitizeHTML(from);
    transaction.toAccount = sanitizeHTML(to);
    transaction.transferNote = sanitizeHTML(
      (transaction.transferNote || "").trim(),
    );
  }

  // 4. Date validation
  // Check format and parse components
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!transaction.date || !dateFormatRegex.test(transaction.date)) {
    errors.push({ field: "date", message: "Invalid date format" });
  } else {
    const date = new Date(transaction.date);
    // Verify the date is valid and components match input
    const [year, month, day] = transaction.date.split("-").map(Number);
    if (
      isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    ) {
      errors.push({ field: "date", message: "Invalid date format" });
    } else {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (date > today) {
        errors.push({ field: "date", message: "Future dates are not allowed" });
      }
      if (date < new Date("1900-01-01")) {
        errors.push({ field: "date", message: "Date is too far in the past" });
      }
    }
  }

  // 5. Notes sanitization and length validation
  if (transaction.notes && transaction.notes.length > 500) {
    errors.push({
      field: "notes",
      message: "Notes too long (max 500 characters)",
    });
  }
  transaction.notes = sanitizeHTML(transaction.notes || "");

  // 6. Tags sanitization and length validation
  const rawTags = Array.isArray(transaction.tags) ? transaction.tags : [];
  const sanitizedTags = rawTags
    .map((tag) => sanitizeHTML(String(tag).trim()))
    .filter((tag) => tag.length > 0 && tag.length <= 30);
  if (sanitizedTags.length > 15) {
    errors.push({ field: "tags", message: "Maximum 15 tags allowed" });
  }
  transaction.tags = sanitizedTags.slice(0, 15);

  // 7. Optional fields validation (v3.16.0) — all nullable, validate only if present
  if (
    transaction.paymentMethod &&
    !PAYMENT_METHODS.includes(transaction.paymentMethod)
  ) {
    errors.push({ field: "paymentMethod", message: "Invalid payment method" });
  }

  if (
    transaction.expenseType &&
    !EXPENSE_TYPES.includes(transaction.expenseType)
  ) {
    errors.push({ field: "expenseType", message: "Invalid expense type" });
  }

  if (transaction.merchant) {
    if (transaction.merchant.length > 100) {
      errors.push({
        field: "merchant",
        message: "Merchant name too long (max 100)",
      });
    }
    transaction.merchant = sanitizeHTML(transaction.merchant);
  }

  if (transaction.attachedTo) {
    if (transaction.attachedTo.length > 50) {
      errors.push({
        field: "attachedTo",
        message: "Person name too long (max 50)",
      });
    }
    transaction.attachedTo = sanitizeHTML(transaction.attachedTo);
  }

  if (transaction.referenceId) {
    if (transaction.referenceId.length > 100) {
      errors.push({
        field: "referenceId",
        message: "Reference ID too long (max 100)",
      });
    }
    transaction.referenceId = sanitizeHTML(transaction.referenceId);
  }

  if (transaction.location) {
    if (transaction.location.length > 100) {
      errors.push({
        field: "location",
        message: "Location too long (max 100)",
      });
    }
    transaction.location = sanitizeHTML(transaction.location);
  }

  // 8. Multi-currency validation (v3.24.0)
  if (transaction.transactionCurrency) {
    if (!currencies[transaction.transactionCurrency]) {
      errors.push({
        field: "transactionCurrency",
        message: "Invalid transaction currency",
      });
    }
    const homeCurrency =
      state.currency ?? localStorage.getItem("currency") ?? "USD";
    if (transaction.transactionCurrency !== homeCurrency) {
      if (
        !transaction.exchangeRate ||
        isNaN(transaction.exchangeRate) ||
        transaction.exchangeRate <= 0
      ) {
        errors.push({
          field: "exchangeRate",
          message:
            "Exchange rate is required for foreign currency transactions",
        });
      }
    } else if (
      transaction.exchangeRate !== null &&
      transaction.exchangeRate !== undefined
    ) {
      if (isNaN(transaction.exchangeRate) || transaction.exchangeRate <= 0) {
        errors.push({
          field: "exchangeRate",
          message: "Exchange rate must be a positive number",
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: transaction,
  };
}
