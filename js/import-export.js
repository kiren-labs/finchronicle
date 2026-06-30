// ============================================================================
// Import / Export / Backup / Restore
// ============================================================================

import { APP_VERSION, state, PAYMENT_METHODS, EXPENSE_TYPES } from "./state.js";
import {
  sanitizeHTML,
  showMessage,
  parseCSV,
  findHeaderIndex,
  normalizeDate,
  normalizeImportedCategory,
  formatDate,
  generateId,
} from "./utils.js";
import { t } from "./i18n.js";
import { getCurrency } from "./currency.js";
import {
  loadDataFromDB,
  bulkSaveTransactionsToDB,
  loadAllTransactionsFromDB,
  saveRecurringTemplateToDB,
  saveBudgetToDB,
  saveAccount,
  saveGoal,
  bulkSaveQuickTemplates,
  saveAppSettings,
  bulkSaveNetWorthSnapshots,
  clearAllStores,
} from "./db.js";
import { importEncryptedBackup } from "./auto-backup.js";
import { updateBackupTimestamp } from "./settings.js";
import { updateUI } from "./ui.js";

// ---- Export to CSV ----

export function exportToCSV() {
  if (state.transactions.length === 0) {
    showMessage(t("error.no_transaction_data"));
    return;
  }

  const currencyCode = getCurrency();
  const headers = [
    "Date",
    "Type",
    "Category",
    `Amount (${currencyCode})`,
    "Notes",
    "Tags",
    "Status",
    "From Account",
    "To Account",
    "UpdatedAt",
    "Payment Method",
    "Merchant",
    "Expense Type",
    "Attached To",
    "Reference ID",
    "Location",
    "Transaction Currency",
    "Exchange Rate",
    "Home Amount",
  ];
  const rows = state.transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.notes || "",
    (t.tags || []).join(";"),
    t.status || "",
    t.fromAccount || "",
    t.toAccount || "",
    t.updatedAt || "",
    t.paymentMethod || "",
    t.merchant || "",
    t.expenseType || "",
    t.attachedTo || "",
    t.referenceId || "",
    t.location || "",
    t.transactionCurrency || "",
    t.exchangeRate || "",
    t.homeAmount || "",
  ]);

  const sanitizeCell = (cell) => {
    const s = String(cell).replace(/"/g, '""');
    return /^[=+\-@\t]/.test(s) ? `'${s}` : s;
  };
  let csv = `${headers.join(",")}\n`;
  csv += rows
    .map((row) => row.map((cell) => `"${sanitizeCell(cell)}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finchronicle-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);

  updateBackupTimestamp();
  showMessage(t("message.export_success"));
}

// ---- Generate Backup Metadata ----

function generateBackupMetadata() {
  const count = state.transactions.length;
  const dates = state.transactions
    .map((t) => t.dateTs || new Date(t.date).getTime())
    .sort((a, b) => a - b);
  const oldestDate =
    dates.length > 0 ? new Date(dates[0]).toISOString().slice(0, 10) : "";
  const newestDate =
    dates.length > 0 ? new Date(dates.at(-1)).toISOString().slice(0, 10) : "";
  const dateRange =
    dates.length > 0 ? `${oldestDate} to ${newestDate}` : "No transactions";
  const backupDate = new Date().toISOString();
  const currencyCode = getCurrency();

  return [
    "# FinChronicle Backup",
    `# Version: ${APP_VERSION}`,
    `# Backup Date: ${backupDate}`,
    `# Transaction Count: ${count}`,
    `# Date Range: ${dateRange}`,
    `# Currency: ${currencyCode}`,
  ].join("\n");
}

// ---- Create Full Backup ----

export async function createBackup() {
  if (state.transactions.length === 0) {
    showMessage("No transactions to back up.");
    return;
  }

  const currencyCode = getCurrency();
  const metadata = generateBackupMetadata();

  // Load ALL records including soft-deleted for complete audit backup
  let allRecords;
  try {
    allRecords = await loadAllTransactionsFromDB();
  } catch {
    allRecords = state.transactions;
  }

  const headers = [
    "Date",
    "Type",
    "Category",
    `Amount (${currencyCode})`,
    "Notes",
    "Tags",
    "Status",
    "ID",
    "CreatedAt",
    "UpdatedAt",
    "From Account",
    "To Account",
    "Deleted",
    "DeletedAt",
    "RecurringId",
    "Settled",
    "SettledAt",
    "SettledBy",
    "Payment Method",
    "Merchant",
    "Expense Type",
    "Attached To",
    "Reference ID",
    "Location",
    "Transaction Currency",
    "Exchange Rate",
    "Home Amount",
  ];
  const rows = allRecords.map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.notes || "",
    (t.tags || []).join(";"),
    t.status || "",
    t.id,
    t.createdAt,
    t.updatedAt || "",
    t.fromAccount || "",
    t.toAccount || "",
    t.deleted ? "yes" : "",
    t.deletedAt || "",
    t.recurringId || "",
    t.settled ? "yes" : "",
    t.settledAt || "",
    t.settledBy || "",
    t.paymentMethod || "",
    t.merchant || "",
    t.expenseType || "",
    t.attachedTo || "",
    t.referenceId || "",
    t.location || "",
    t.transactionCurrency || "",
    t.exchangeRate || "",
    t.homeAmount || "",
  ]);

  const sanitizeBackupCell = (cell) => {
    const s = String(cell).replace(/"/g, '""');
    return /^[=+\-@\t]/.test(s) ? `'${s}` : s;
  };

  let csv = `${metadata}\n`;
  csv += `${headers.join(",")}\n`;
  csv += rows
    .map((row) => row.map((cell) => `"${sanitizeBackupCell(cell)}"`).join(","))
    .join("\n");

  const now = new Date();
  const timestamp = now
    .toISOString()
    .slice(0, 19)
    .replace("T", "-")
    .replace(/:/g, "");
  const filename = `finchronicle-backup-${timestamp}.csv`;

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);

  showMessage("Backup created successfully.");
}

// ---- Import CSV ----

export function triggerImport() {
  const input = document.getElementById("spreadsheetImportFile");
  if (!input) return;
  input.value = "";
  input.click();
}

export function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const result = await importFromCSV(reader.result);
      if (result.added === 0) {
        showMessage("No valid transactions found in this file.");
        return;
      }
      showMessage(
        `Imported ${result.added} transaction${result.added !== 1 ? "s" : ""}${
          result.skipped
            ? ` • Skipped ${result.skipped} row${result.skipped !== 1 ? "s" : ""}`
            : ""
        }`,
      );
    } catch (err) {
      console.error("Import failed:", err);
      showMessage(
        "Import failed. Make sure the file is in the correct format.",
      );
    }
  };
  reader.readAsText(file);
}

export function handleCsvImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const result = await importFromCSV(reader.result);
      if (result.added === 0) {
        showMessage("No valid transactions found in this file.");
        return;
      }
      showMessage(
        `Imported ${result.added} transaction${result.added !== 1 ? "s" : ""}${
          result.skipped
            ? ` • Skipped ${result.skipped} row${result.skipped !== 1 ? "s" : ""}`
            : ""
        }`,
      );
    } catch (err) {
      console.error("Import failed:", err);
      showMessage(
        "Import failed. Make sure the file is in the correct format.",
      );
    }
  };
  reader.readAsText(file);
}

export async function importFromCSV(text) {
  const rows = parseCSV(text).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );
  if (rows.length < 2) {
    return { added: 0, skipped: rows.length };
  }

  const headers = rows[0].map((h) => h.trim());
  const dateIndex = findHeaderIndex(headers, /^date$/i);
  const typeIndex = findHeaderIndex(headers, /^type$/i);
  const categoryIndex = findHeaderIndex(headers, /^category$/i);
  const amountIndex = findHeaderIndex(headers, /^amount\b/i);
  const notesIndex =
    findHeaderIndex(headers, /^notes$/i) ??
    findHeaderIndex(headers, /^description$/i);
  const fromAccountIndex = findHeaderIndex(headers, /^from account$/i);
  const toAccountIndex = findHeaderIndex(headers, /^to account$/i);
  const paymentMethodIndex = findHeaderIndex(headers, /^payment method$/i);
  const merchantIndex = findHeaderIndex(headers, /^merchant$/i);
  const expenseTypeIndex = findHeaderIndex(headers, /^expense type$/i);
  const attachedToIndex = findHeaderIndex(headers, /^attached to$/i);
  const referenceIdIndex = findHeaderIndex(headers, /^reference id$/i);
  const locationIndex = findHeaderIndex(headers, /^location$/i);
  const txCurrencyIndex = findHeaderIndex(headers, /^transaction currency$/i);
  const exchangeRateIndex = findHeaderIndex(headers, /^exchange rate$/i);
  const homeAmountIndex = findHeaderIndex(headers, /^home amount$/i);
  const tagsIndex = findHeaderIndex(headers, /^tags$/i);
  const statusIndex = findHeaderIndex(headers, /^status$/i);

  if (dateIndex === -1 || categoryIndex === -1 || amountIndex === -1) {
    throw new Error("Missing required headers");
  }

  let added = 0;
  let skipped = 0;
  const nowIso = new Date().toISOString();
  const newTransactions = [];

  rows.slice(1).forEach((row) => {
    const rawDate = (row[dateIndex] || "").trim();
    const normalizedDateVal = normalizeDate(rawDate);
    const rawAmount = (row[amountIndex] || "").replace(/,/g, "");
    const amount = parseFloat(rawAmount);

    if (!normalizedDateVal || isNaN(amount) || amount <= 0) {
      skipped += 1;
      return;
    }

    const rawType =
      typeIndex !== -1
        ? (row[typeIndex] || "").trim().toLowerCase()
        : "expense";
    const type =
      rawType === "income"
        ? "income"
        : rawType === "transfer"
          ? "transfer"
          : "expense";
    const stripFormula = (s) => s.replace(/^[=+\-@\t]+/, "");
    const baseCategory = stripFormula((row[categoryIndex] || "").trim());
    const rawNotes =
      notesIndex !== -1 ? stripFormula((row[notesIndex] || "").trim()) : "";
    const category =
      type === "transfer"
        ? "Transfer"
        : normalizeImportedCategory(baseCategory, rawNotes, type);

    const txn = {
      id: generateId(),
      type,
      amount: Math.abs(amount),
      category,
      date: normalizedDateVal,
      notes: sanitizeHTML(rawNotes),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Add transfer fields if present
    if (type === "transfer") {
      txn.fromAccount =
        fromAccountIndex !== -1
          ? sanitizeHTML((row[fromAccountIndex] || "").trim())
          : null;
      txn.toAccount =
        toAccountIndex !== -1
          ? sanitizeHTML((row[toAccountIndex] || "").trim())
          : null;
      txn.transferNote = null;
    }

    // Add optional fields if present (v3.16.0)
    if (paymentMethodIndex !== -1) {
      const val = (row[paymentMethodIndex] || "").trim();
      if (val && PAYMENT_METHODS.includes(val))
        txn.paymentMethod = sanitizeHTML(val);
    }
    if (merchantIndex !== -1) {
      const val = stripFormula((row[merchantIndex] || "").trim());
      if (val) txn.merchant = sanitizeHTML(val);
    }
    if (expenseTypeIndex !== -1) {
      const val = (row[expenseTypeIndex] || "").trim();
      if (val && EXPENSE_TYPES.includes(val))
        txn.expenseType = sanitizeHTML(val);
    }
    if (attachedToIndex !== -1) {
      const val = stripFormula((row[attachedToIndex] || "").trim());
      if (val) txn.attachedTo = sanitizeHTML(val);
    }
    if (referenceIdIndex !== -1) {
      const val = (row[referenceIdIndex] || "").trim();
      if (val) txn.referenceId = sanitizeHTML(val);
    }
    if (locationIndex !== -1) {
      const val = stripFormula((row[locationIndex] || "").trim());
      if (val) txn.location = sanitizeHTML(val);
    }
    // Multi-currency fields (v3.24.0)
    if (txCurrencyIndex !== -1) {
      const val = (row[txCurrencyIndex] || "").trim();
      if (val) txn.transactionCurrency = val;
    }
    if (exchangeRateIndex !== -1) {
      const val = parseFloat((row[exchangeRateIndex] || "").trim());
      if (!isNaN(val) && val > 0) txn.exchangeRate = val;
    }
    if (homeAmountIndex !== -1) {
      const val = parseFloat((row[homeAmountIndex] || "").trim());
      if (!isNaN(val) && val > 0) txn.homeAmount = val;
    }
    // Tags
    if (tagsIndex !== -1) {
      const raw = (row[tagsIndex] || "").trim();
      if (raw)
        txn.tags = raw
          .split(";")
          .map((s) => sanitizeHTML(s.trim()))
          .filter(Boolean);
    }
    // Status (v4.0.0)
    if (statusIndex !== -1) {
      const val = (row[statusIndex] || "").trim().toLowerCase();
      if (val === "cleared" || val === "reconciled") txn.status = val;
    }

    newTransactions.push(txn);
    added += 1;
  });

  if (newTransactions.length > 0) {
    await bulkSaveTransactionsToDB(newTransactions);
    newTransactions.forEach((t) => {
      t.dateTs = new Date(t.date).getTime();
    });
    state.transactions.push(...newTransactions);
    state.transactions.sort((a, b) => b.dateTs - a.dateTs);
    updateUI();
  }

  return { added, skipped };
}

// ---- Restore Backup ----

export function triggerRestore() {
  const input = document.getElementById("dataRestoreFile");
  if (!input) return;
  input.value = "";
  input.click();
}

export function handleRestore(event) {
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

      state.pendingRestoreData = backupData;
      showRestorePreview(backupData);
    } catch (err) {
      console.error("Backup parse error:", err);
      showMessage("Failed to read backup file. Check the file format.");
    }
  };

  reader.onerror = () => {
    showMessage(t("error.import_failed"));
  };

  reader.readAsText(file);
}

export function parseBackupCSV(text) {
  const lines = text.split("\n");
  const metadata = {};
  let dataStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#")) {
      const match = line.match(/^#\s*([^:]+):\s*(.+)$/);
      if (match) {
        metadata[match[1].trim()] = match[2].trim();
      }
    } else {
      dataStartIndex = i;
      break;
    }
  }

  const csvData = lines.slice(dataStartIndex).join("\n");
  const rows = parseCSV(csvData).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );

  if (rows.length < 2) {
    return { valid: false, error: "No transaction data found" };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const requiredHeaders = ["date", "type", "category", "amount"];
  const hasRequired = requiredHeaders.every((h) =>
    headers.some((header) => header.includes(h)),
  );

  if (!hasRequired) {
    return {
      valid: false,
      error: "File is missing required columns: Date, Type, Category, Amount.",
    };
  }

  const dateIndex = headers.findIndex((h) => h === "date");
  const typeIndex = headers.findIndex((h) => h === "type");
  const categoryIndex = headers.findIndex((h) => h === "category");
  const amountIndex = headers.findIndex((h) => h.includes("amount"));
  const notesIndex = headers.findIndex((h) => h === "notes");
  const idIndex = headers.findIndex((h) => h === "id");
  const createdAtIndex = headers.findIndex((h) => h === "createdat");
  const fromAccountIndex = headers.findIndex((h) => h === "from account");
  const toAccountIndex = headers.findIndex((h) => h === "to account");
  const updatedAtIndex = headers.findIndex((h) => h === "updatedat");
  const deletedIndex = headers.findIndex((h) => h === "deleted");
  const deletedAtIndex = headers.findIndex((h) => h === "deletedat");
  const paymentMethodIdx = headers.findIndex((h) => h === "payment method");
  const merchantIdx = headers.findIndex((h) => h === "merchant");
  const expenseTypeIdx = headers.findIndex((h) => h === "expense type");
  const attachedToIdx = headers.findIndex((h) => h === "attached to");
  const referenceIdIdx = headers.findIndex((h) => h === "reference id");
  const locationIdx = headers.findIndex((h) => h === "location");
  const txCurrencyIdx = headers.findIndex((h) => h === "transaction currency");
  const exchangeRateIdx = headers.findIndex((h) => h === "exchange rate");
  const homeAmountIdx = headers.findIndex((h) => h === "home amount");
  const tagsIdx = headers.findIndex((h) => h === "tags");
  const statusIdx = headers.findIndex((h) => h === "status");
  const recurringIdIdx = headers.findIndex((h) => h === "recurringid");
  const settledIdx = headers.findIndex((h) => h === "settled");
  const settledAtIdx = headers.findIndex((h) => h === "settledat");
  const settledByIdx = headers.findIndex((h) => h === "settledby");

  // Strip CSV formula-escape apostrophe added by sanitizeBackupCell on export
  const stripCSVEscape = (s) =>
    s.startsWith("'") && /^'[=+\-@\t]/.test(s) ? s.slice(1) : s;

  const parsedTransactions = [];
  const dataRows = rows.slice(1);

  dataRows.forEach((row) => {
    const rawDate = (row[dateIndex] || "").trim();
    const rawAmount = (row[amountIndex] || "").replace(/,/g, "");
    const amount = parseFloat(rawAmount);

    if (!rawDate || isNaN(amount) || amount <= 0) {
      return;
    }

    const rawNotes =
      notesIndex !== -1 ? stripCSVEscape((row[notesIndex] || "").trim()) : "";

    const transaction = {
      id:
        idIndex !== -1 && row[idIndex] && row[idIndex].trim()
          ? row[idIndex].trim()
          : generateId(),
      type:
        typeIndex !== -1
          ? (row[typeIndex] || "").trim().toLowerCase()
          : "expense",
      amount: Math.abs(amount),
      category:
        categoryIndex !== -1
          ? (row[categoryIndex] || "").trim()
          : "Other Expense",
      date: rawDate,
      notes: sanitizeHTML(rawNotes),
      createdAt:
        createdAtIndex !== -1 && row[createdAtIndex]
          ? row[createdAtIndex].trim()
          : new Date().toISOString(),
      updatedAt:
        updatedAtIndex !== -1 && row[updatedAtIndex]
          ? row[updatedAtIndex].trim()
          : null,
    };

    // Restore soft-delete state from backup
    if (
      deletedIndex !== -1 &&
      (row[deletedIndex] || "").trim().toLowerCase() === "yes"
    ) {
      transaction.deleted = true;
      transaction.deletedAt =
        deletedAtIndex !== -1 && row[deletedAtIndex]
          ? row[deletedAtIndex].trim()
          : new Date().toISOString();
    }

    if (transaction.type === "transfer") {
      transaction.category = "Transfer";
      transaction.fromAccount =
        fromAccountIndex !== -1
          ? sanitizeHTML((row[fromAccountIndex] || "").trim())
          : null;
      transaction.toAccount =
        toAccountIndex !== -1
          ? sanitizeHTML((row[toAccountIndex] || "").trim())
          : null;
      transaction.transferNote = null;
    } else if (
      transaction.type !== "income" &&
      transaction.type !== "expense"
    ) {
      transaction.type = "expense";
    }

    // Restore optional fields (v3.16.0)
    if (paymentMethodIdx !== -1) {
      const val = (row[paymentMethodIdx] || "").trim();
      if (val && PAYMENT_METHODS.includes(val))
        transaction.paymentMethod = sanitizeHTML(val);
    }
    if (merchantIdx !== -1) {
      const val = stripCSVEscape((row[merchantIdx] || "").trim());
      if (val) transaction.merchant = sanitizeHTML(val);
    }
    if (expenseTypeIdx !== -1) {
      const val = (row[expenseTypeIdx] || "").trim();
      if (val && EXPENSE_TYPES.includes(val))
        transaction.expenseType = sanitizeHTML(val);
    }
    if (attachedToIdx !== -1) {
      const val = stripCSVEscape((row[attachedToIdx] || "").trim());
      if (val) transaction.attachedTo = sanitizeHTML(val);
    }
    if (referenceIdIdx !== -1) {
      const val = (row[referenceIdIdx] || "").trim();
      if (val) transaction.referenceId = sanitizeHTML(val);
    }
    if (locationIdx !== -1) {
      const val = stripCSVEscape((row[locationIdx] || "").trim());
      if (val) transaction.location = sanitizeHTML(val);
    }
    // Multi-currency fields (v3.24.0)
    if (txCurrencyIdx !== -1) {
      const val = (row[txCurrencyIdx] || "").trim();
      if (val) transaction.transactionCurrency = val;
    }
    if (exchangeRateIdx !== -1) {
      const val = parseFloat((row[exchangeRateIdx] || "").trim());
      if (!isNaN(val) && val > 0) transaction.exchangeRate = val;
    }
    if (homeAmountIdx !== -1) {
      const val = parseFloat((row[homeAmountIdx] || "").trim());
      if (!isNaN(val) && val > 0) transaction.homeAmount = val;
    }
    // Tags
    if (tagsIdx !== -1) {
      const raw = (row[tagsIdx] || "").trim();
      if (raw)
        transaction.tags = raw
          .split(";")
          .map((s) => sanitizeHTML(s.trim()))
          .filter(Boolean);
    }
    // Status (v4.0.0)
    if (statusIdx !== -1) {
      const val = (row[statusIdx] || "").trim().toLowerCase();
      if (val === "cleared" || val === "reconciled") transaction.status = val;
    }
    // Recurring link
    if (recurringIdIdx !== -1) {
      const val = (row[recurringIdIdx] || "").trim();
      if (val) transaction.recurringId = val;
    }
    // Settlement fields (v3.27.0)
    if (
      settledIdx !== -1 &&
      (row[settledIdx] || "").trim().toLowerCase() === "yes"
    ) {
      transaction.settled = true;
      transaction.settledAt =
        settledAtIdx !== -1 && row[settledAtIdx]
          ? row[settledAtIdx].trim()
          : new Date().toISOString();
      transaction.settledBy =
        settledByIdx !== -1 ? (row[settledByIdx] || "").trim() || null : null;
    }

    parsedTransactions.push(transaction);
  });

  if (parsedTransactions.length === 0) {
    return {
      valid: false,
      error: "This backup file doesn't contain any transactions.",
    };
  }

  return { valid: true, metadata, transactions: parsedTransactions };
}

// ---- Restore Preview / Report Modals ----

export function showRestorePreview(backupData) {
  const modal = document.getElementById("restorePreviewModal");

  document.getElementById("previewBackupDate").textContent = backupData
    .metadata["Backup Date"]
    ? formatDate(backupData.metadata["Backup Date"].slice(0, 10))
    : "Unknown";

  document.getElementById("previewCount").textContent =
    backupData.transactions.length;

  const dates = backupData.transactions
    .map((t) => new Date(t.date))
    .sort((a, b) => a - b);
  const oldestDate =
    dates.length > 0 ? formatDate(dates[0].toISOString().slice(0, 10)) : "-";
  const newestDate =
    dates.length > 0
      ? formatDate(dates.at(-1).toISOString().slice(0, 10))
      : "-";
  document.getElementById("previewDateRange").textContent =
    `${oldestDate} to ${newestDate}`;

  document.getElementById("previewCurrency").textContent =
    backupData.metadata["Currency"] || getCurrency();

  // Integrity indicator
  const integrityRow = document.getElementById("previewIntegrityRow");
  const integrityEl = document.getElementById("previewIntegrity");
  if (integrityRow && integrityEl) {
    if (backupData.integrityOk === true) {
      integrityRow.style.display = "";
      integrityEl.textContent = "Verified ✓";
      integrityEl.style.color = "var(--color-income-text)";
    } else if (backupData.integrityOk === false) {
      integrityRow.style.display = "";
      integrityEl.textContent =
        "⚠ File check failed — this backup may be damaged";
      integrityEl.style.color = "var(--color-expense-text)";
    } else {
      integrityRow.style.display = "none";
    }
  }

  modal.classList.add("show");
}

function isBankDuplicate(newTxn, existingTransactions) {
  return existingTransactions.some(
    (e) =>
      e.date === newTxn.date &&
      e.type === newTxn.type &&
      e.amount === newTxn.amount &&
      (e.notes || "") === (newTxn.notes || ""),
  );
}

function isDuplicateTransaction(newTransaction, existingTransactions) {
  return existingTransactions.some((existing) => {
    return (
      existing.date === newTransaction.date &&
      existing.type === newTransaction.type &&
      existing.category === newTransaction.category &&
      existing.amount === newTransaction.amount &&
      (existing.notes || "") === (newTransaction.notes || "")
    );
  });
}

export function closeRestorePreview() {
  const modal = document.getElementById("restorePreviewModal");
  modal.classList.remove("show");
  state.pendingRestoreData = null;
}

export function closeRestoreReport() {
  const modal = document.getElementById("restoreReportModal");
  modal.classList.remove("show");
}

function showRestoreReport(stats) {
  const modal = document.getElementById("restoreReportModal");

  document.getElementById("reportBackupTotal").textContent = stats.backupTotal;
  document.getElementById("reportAdded").textContent = stats.added;
  document.getElementById("reportDuplicates").textContent = stats.duplicates;
  document.getElementById("reportCurrentTotal").textContent =
    stats.currentTotal;

  modal.classList.add("show");
}

export async function confirmRestore(mode = "merge") {
  const backupData = state.pendingRestoreData;
  if (!backupData) return;

  if (mode === "replace") {
    const confirmed = confirm(
      `Replace all your current data with ${backupData.transactions.length} transactions from this backup? You can't undo this.`,
    );
    if (!confirmed) return;
  }

  closeRestorePreview();
  showMessage(t("message.restoring_backup"));

  try {
    const CLEARABLE_STORES = [
      "transactions",
      "recurringTemplates",
      "budgets",
      "accounts",
      "savingsGoals",
      "quickTemplates",
      "appSettings",
      "netWorthSnapshots",
    ];

    if (mode === "replace") {
      await clearAllStores(CLEARABLE_STORES);
      await loadDataFromDB();
    } else {
      await loadDataFromDB();
    }

    const stats = {
      backupTotal: backupData.transactions.length,
      added: 0,
      duplicates: 0,
      currentTotal: 0,
    };

    const newTransactions = [];
    backupData.transactions.forEach((backupTxn) => {
      if (
        mode === "merge" &&
        isDuplicateTransaction(backupTxn, state.transactions)
      ) {
        stats.duplicates++;
      } else {
        newTransactions.push(backupTxn);
        stats.added++;
      }
    });

    if (newTransactions.length > 0) {
      await bulkSaveTransactionsToDB(newTransactions);
      newTransactions.forEach((t) => {
        t.dateTs = new Date(t.date).getTime();
      });
      state.transactions.push(...newTransactions);
      state.transactions.sort((a, b) => b.dateTs - a.dateTs);
    }

    if (backupData.recurringTemplates) {
      for (const tmpl of backupData.recurringTemplates) {
        await saveRecurringTemplateToDB(tmpl);
      }
    }
    if (backupData.budgets) {
      for (const budget of backupData.budgets) {
        await saveBudgetToDB(budget);
      }
    }
    if (backupData.accounts) {
      for (const account of backupData.accounts) {
        await saveAccount(account);
      }
    }
    if (backupData.savingsGoals) {
      for (const goal of backupData.savingsGoals) {
        await saveGoal(goal);
      }
    }
    if (backupData.quickTemplates && backupData.quickTemplates.length > 0) {
      await bulkSaveQuickTemplates(backupData.quickTemplates);
    }
    if (backupData.appSettings) {
      await saveAppSettings(backupData.appSettings);
    }
    if (
      backupData.netWorthSnapshots &&
      backupData.netWorthSnapshots.length > 0
    ) {
      await bulkSaveNetWorthSnapshots(backupData.netWorthSnapshots);
    }
    if (backupData.localStorage) {
      if (backupData.localStorage.exchangeRateHistory) {
        localStorage.setItem(
          "exchangeRateHistory",
          JSON.stringify(backupData.localStorage.exchangeRateHistory),
        );
      }
      if (backupData.localStorage.tagColors) {
        localStorage.setItem(
          "tagColors",
          JSON.stringify(backupData.localStorage.tagColors),
        );
      }
    }
    // Restore currency only on full replace — don't overwrite active currency on merge
    if (
      mode === "replace" &&
      backupData.metadata &&
      backupData.metadata["Currency"]
    ) {
      localStorage.setItem("currency", backupData.metadata["Currency"]);
    }

    await loadDataFromDB();

    stats.currentTotal = state.transactions.length;
    updateUI();
    showRestoreReport(stats);
  } catch (err) {
    console.error("Restore failed:", err);
    showMessage(t("error.restore_failed"));
    try {
      await loadDataFromDB();
      updateUI();
    } catch (reloadErr) {
      console.error("Failed to reload data:", reloadErr);
    }
  }
}

// ---- Backup Schema Migration ----

function migrateBackupPayload(data) {
  if (!data.backupSchemaVersion) {
    data.backupSchemaVersion = 0;
    data.netWorthSnapshots = data.netWorthSnapshots || [];
    data.localStorage = data.localStorage || {};
  }
  return data;
}

async function verifyIntegrity(data) {
  if (!data.integrity || !data.integrity.startsWith("sha256:")) return null;
  const storedHash = data.integrity.slice(7);
  try {
    // Preserve original key order by zeroing integrity in-place, hashing, then restoring.
    // Spread copies do not guarantee key order matches the serialized backup.
    const original = data.integrity;
    data.integrity = "";
    const jsonStr = JSON.stringify(data, null, 2);
    data.integrity = original;
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(jsonStr),
    );
    const computedHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computedHash === storedHash;
  } catch {
    return null;
  }
}

// ---- Process Restored Data from Encrypted Backup (v3.22.0) ----

export async function processRestoredData(data) {
  migrateBackupPayload(data);

  const integrityOk = await verifyIntegrity(data);

  const backupData = {
    valid: true,
    integrityOk,
    metadata: {
      "Backup Date": data.exportDate || new Date().toISOString(),
      "App Version": data.version || "unknown",
      Currency: data.currency || "INR",
      "Schema Version": data.backupSchemaVersion ?? 0,
    },
    transactions: data.transactions || [],
    recurringTemplates: data.recurringTemplates || null,
    budgets: data.budgets || null,
    accounts: data.accounts || null,
    savingsGoals: data.savingsGoals || null,
    quickTemplates: data.quickTemplates || null,
    appSettings: data.appSettings || null,
    netWorthSnapshots: data.netWorthSnapshots || null,
    localStorage: data.localStorage || null,
  };

  state.pendingRestoreData = backupData;
  showRestorePreview(backupData);
}

// ---- Unified Restore File Handler (v4.2.0) ----

export async function handleRestoreFileInput(file) {
  if (!file) return;
  const name = file.name.toLowerCase();

  if (name.endsWith(".enc")) {
    const passphrase = prompt(
      "Enter the password you used to encrypt this backup:",
    );
    if (!passphrase) return;
    const data = await importEncryptedBackup(file, passphrase);
    if (data) await processRestoredData(data);
  } else if (name.endsWith(".json")) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await processRestoredData(data);
    } catch {
      showMessage(t("error.invalid_backup"));
    }
  } else if (name.endsWith(".csv")) {
    showMessage(t("error.csv_transactions_only"), "warning");
    handleCsvRestore(file);
  } else {
    showMessage(t("error.unrecognized_file"));
  }
}

export function handleCsvRestore(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backupData = parseBackupCSV(reader.result);
      if (!backupData.valid) {
        showMessage(t("error.invalid_backup"));
        return;
      }
      state.pendingRestoreData = backupData;
      showRestorePreview(backupData);
    } catch (err) {
      console.error("Backup parse error:", err);
      showMessage(t("error.restore_failed"));
    }
  };
  reader.onerror = () => showMessage(t("error.import_failed"));
  reader.readAsText(file);
}

// ============================================================================
// Bank Statement CSV Importer (v4.9.0)
// ============================================================================

const MAX_BANK_MAPPINGS = 5;

const BANK_PRESETS = {
  kbank: {
    name: "KBank",
    skipRows: 6,
    dateCol: 1,
    descriptionCol: 2,
    debitCol: 3,
    creditCol: 4,
    dateFormat: "DD Mon YYYY HH:MM",
    defaultAccount: "",
  },
};

function detectBankPreset(rows) {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const row = rows[i];
    if (!row) continue;
    const joined = row.join(" ").toLowerCase();
    if (
      joined.includes("kbank") ||
      joined.includes("be1st card") ||
      joined.includes("048-")
    ) {
      return "kbank";
    }
  }
  return null;
}

function parseBankDate(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  // "26 Jun 2026 17:08" or "26 Jun 2026"
  const longMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (longMatch) {
    const day = longMatch[1].padStart(2, "0");
    const month = monthAbbrevToNum(longMatch[2]);
    const year = longMatch[3];
    if (month) return `${year}-${month}-${day}`;
  }
  return normalizeDate(trimmed);
}

function monthAbbrevToNum(abbrev) {
  const map = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  return map[abbrev.toLowerCase()] || "";
}

async function loadBankMappings() {
  const { loadAppSettings } = await import("./db.js");
  const settings = await loadAppSettings();
  return settings && settings.bankMappings ? settings.bankMappings : [];
}

async function saveBankMapping(mapping) {
  const { loadAppSettings, saveAppSettings } = await import("./db.js");
  let settings = (await loadAppSettings()) || { id: "config" };
  const mappings = settings.bankMappings || [];
  const existingIdx = mappings.findIndex((m) => m.name === mapping.name);
  if (existingIdx >= 0) {
    mappings[existingIdx] = mapping;
  } else {
    if (mappings.length >= MAX_BANK_MAPPINGS) mappings.shift();
    mappings.push(mapping);
  }
  settings.bankMappings = mappings;
  await saveAppSettings(settings);
}

export function triggerBankImport() {
  const input = document.getElementById("bankImportFile");
  if (!input) return;
  input.value = "";
  input.click();
}

export function handleBankImportFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await openBankImportMapper(reader.result, file.name);
    } catch (err) {
      console.error("Bank import error:", err);
      showMessage("Failed to read bank file.");
    }
  };
  reader.onerror = () => showMessage(t("error.import_failed"));
  reader.readAsText(file);
}

async function openBankImportMapper(text, filename) {
  const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length < 2) {
    showMessage("File appears empty.");
    return;
  }

  const presetKey = detectBankPreset(rows);
  const savedMappings = await loadBankMappings();
  const savedMapping = savedMappings.find(
    (m) => m.filename === filename || (presetKey && m.presetKey === presetKey),
  );

  const config = savedMapping || (presetKey ? BANK_PRESETS[presetKey] : null);

  state.pendingBankImport = { rows, filename, presetKey, config };
  renderBankImportMapper(rows, filename, presetKey, config, savedMappings);
}

function renderBankImportMapper(
  rows,
  filename,
  presetKey,
  config,
  savedMappings,
) {
  const modal = document.getElementById("bankImportModal");
  if (!modal) return;

  const bankName = document.getElementById("bankImportName");
  const presetBadge = document.getElementById("bankImportPresetBadge");
  const mapperForm = document.getElementById("bankImportMapperForm");
  const savedMappingsEl = document.getElementById("bankImportSavedMappings");
  const previewEl = document.getElementById("bankImportPreview");
  const accountSelect = document.getElementById("bankImportAccount");

  if (bankName) bankName.textContent = filename;

  if (presetBadge) {
    if (presetKey) {
      presetBadge.textContent = BANK_PRESETS[presetKey].name + " detected";
      presetBadge.classList.remove("hidden");
    } else {
      presetBadge.classList.add("hidden");
    }
  }

  // Populate account selector
  if (accountSelect) {
    const accounts = state.accounts || [];
    accountSelect.innerHTML = '<option value="">— none —</option>';
    accounts.forEach((acc) => {
      const opt = document.createElement("option");
      opt.value = acc.name;
      opt.textContent = acc.name;
      if (config && config.defaultAccount === acc.name) opt.selected = true;
      accountSelect.appendChild(opt);
    });
  }

  // Populate column index selectors from first data row headers
  const skipRows = config && config.skipRows ? config.skipRows : 0;
  const dataStartRow = rows[skipRows] || rows[0];
  const colOptions = dataStartRow
    .map((cell, i) => {
      const label = cell.trim() || `Col ${i + 1}`;
      return `<option value="${i}">${label} (col ${i + 1})</option>`;
    })
    .join("");

  const addBlank = `<option value="">— skip —</option>`;

  const fields = [
    { id: "bankMapDate", label: "Date column", key: "dateCol", required: true },
    {
      id: "bankMapDesc",
      label: "Description column",
      key: "descriptionCol",
      required: false,
    },
    {
      id: "bankMapDebit",
      label: "Debit column",
      key: "debitCol",
      required: true,
    },
    {
      id: "bankMapCredit",
      label: "Credit column",
      key: "creditCol",
      required: false,
    },
  ];

  if (mapperForm) {
    mapperForm.innerHTML =
      fields
        .map((f) => {
          const selected =
            config && config[f.key] !== undefined ? config[f.key] : "";
          const opts =
            (f.required ? "" : addBlank) +
            colOptions
              .split("</option>")
              .map((o, i) => {
                if (o.includes(`value="${selected}"`))
                  return o.replace(">", " selected>") + "</option>";
                return o + (o ? "</option>" : "");
              })
              .join("");
          return `<div class="bank-map-row">
        <label for="${f.id}" class="bank-map-label">${f.label}${f.required ? " *" : ""}</label>
        <select id="${f.id}" class="bank-map-select">${addBlank}${colOptions}</select>
      </div>`;
        })
        .join("") +
      `<div class="bank-map-row">
      <label for="bankMapSkipRows" class="bank-map-label">Header rows to skip</label>
      <input id="bankMapSkipRows" class="bank-map-input" type="number" min="0" max="20" value="${skipRows}" />
    </div>`;

    // Set pre-selected values from config
    fields.forEach((f) => {
      const el = document.getElementById(f.id);
      if (el && config && config[f.key] !== undefined && config[f.key] !== "") {
        el.value = String(config[f.key]);
      }
    });
  }

  // Saved mappings list
  if (savedMappingsEl) {
    if (savedMappings.length === 0) {
      savedMappingsEl.innerHTML = "";
    } else {
      savedMappingsEl.innerHTML =
        `<p class="bank-import-section-label">Saved mappings</p>` +
        savedMappings
          .map(
            (m) => `
          <button class="bank-mapping-pill" data-mapping-name="${sanitizeHTML(m.name)}" type="button">
            <i class="ri-bank-line" aria-hidden="true"></i> ${sanitizeHTML(m.name)}
          </button>`,
          )
          .join("");
    }
  }

  // Preview first rows
  refreshBankImportPreview(rows, config);

  // Bind live preview refresh — re-bind every render (fresh DOM nodes)
  [
    "bankMapDate",
    "bankMapDesc",
    "bankMapDebit",
    "bankMapCredit",
    "bankMapSkipRows",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      const pending = state.pendingBankImport;
      if (pending) refreshBankImportPreview(pending.rows, pending.config);
    });
  });

  // Saved-mapping pill clicks — re-bind via the container each render
  if (savedMappingsEl) {
    savedMappingsEl.addEventListener("click", async (e) => {
      const pill = e.target.closest("[data-mapping-name]");
      if (!pill) return;
      const name = pill.dataset.mappingName;
      const mappings = await loadBankMappings();
      const mapping = mappings.find((m) => m.name === name);
      if (!mapping || !state.pendingBankImport) return;
      state.pendingBankImport.config = mapping;
      const { rows: r, filename: fn, presetKey: pk } = state.pendingBankImport;
      renderBankImportMapper(r, fn, pk, mapping, mappings);
    });
  }

  modal.classList.add("show");
}

function refreshBankImportPreview(rows, config) {
  const previewEl = document.getElementById("bankImportPreview");
  if (!previewEl) return;

  const skipRows =
    parseInt(document.getElementById("bankMapSkipRows")?.value || "0", 10) || 0;
  const dateColEl = document.getElementById("bankMapDate");
  const descColEl = document.getElementById("bankMapDesc");
  const debitColEl = document.getElementById("bankMapDebit");
  const creditColEl = document.getElementById("bankMapCredit");

  const dateCol = dateColEl
    ? parseInt(dateColEl.value, 10)
    : config
      ? config.dateCol
      : 0;
  const descCol =
    descColEl && descColEl.value !== ""
      ? parseInt(descColEl.value, 10)
      : config
        ? config.descriptionCol
        : -1;
  const debitCol = debitColEl
    ? parseInt(debitColEl.value, 10)
    : config
      ? config.debitCol
      : 2;
  const creditCol =
    creditColEl && creditColEl.value !== ""
      ? parseInt(creditColEl.value, 10)
      : config
        ? config.creditCol
        : -1;

  const dataRows = rows
    .slice(skipRows + 1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .slice(0, 10);

  if (dataRows.length === 0) {
    previewEl.innerHTML =
      "<p class='bank-import-empty'>No data rows found with current settings.</p>";
    return;
  }

  const thead = `<tr>
    <th>Date</th>
    ${descCol >= 0 ? "<th>Description</th>" : ""}
    <th>Amount</th>
    <th>Type</th>
  </tr>`;

  const tbody = dataRows
    .map((row) => {
      const rawDate = (row[dateCol] || "").trim();
      const date = parseBankDate(rawDate) || rawDate;
      const desc = descCol >= 0 ? (row[descCol] || "").trim() : "";
      const rawDebit = (row[debitCol] || "").replace(/,/g, "");
      const rawCredit =
        creditCol >= 0 ? (row[creditCol] || "").replace(/,/g, "") : "";
      const debitAmt = parseFloat(rawDebit);
      const creditAmt = parseFloat(rawCredit);
      const isIncome =
        !isNaN(creditAmt) &&
        creditAmt > 0 &&
        (isNaN(debitAmt) || debitAmt <= 0);
      const amount = isIncome
        ? creditAmt
        : !isNaN(debitAmt) && debitAmt > 0
          ? debitAmt
          : null;
      const type = isIncome ? "income" : "expense";

      if (!amount) return "";
      return `<tr>
      <td>${sanitizeHTML(date)}</td>
      ${descCol >= 0 ? `<td>${sanitizeHTML(desc.slice(0, 40))}</td>` : ""}
      <td>${amount.toFixed(2)}</td>
      <td class="bank-preview-type-${type}">${type}</td>
    </tr>`;
    })
    .filter(Boolean)
    .join("");

  previewEl.innerHTML = `<table class="bank-import-preview-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

export function closeBankImportModal() {
  const modal = document.getElementById("bankImportModal");
  if (modal) modal.classList.remove("show");
  state.pendingBankImport = null;
}

export async function confirmBankImport() {
  const pending = state.pendingBankImport;
  if (!pending) return;

  const { rows, filename, presetKey } = pending;

  const skipRows =
    parseInt(document.getElementById("bankMapSkipRows")?.value || "0", 10) || 0;
  const dateCol = parseInt(
    document.getElementById("bankMapDate")?.value || "0",
    10,
  );
  const descColEl = document.getElementById("bankMapDesc");
  const descCol =
    descColEl && descColEl.value !== "" ? parseInt(descColEl.value, 10) : -1;
  const debitCol = parseInt(
    document.getElementById("bankMapDebit")?.value || "2",
    10,
  );
  const creditColEl = document.getElementById("bankMapCredit");
  const creditCol =
    creditColEl && creditColEl.value !== ""
      ? parseInt(creditColEl.value, 10)
      : -1;
  const fromAccount = document.getElementById("bankImportAccount")?.value || "";
  const saveMapping = document.getElementById("bankImportSaveMapping")?.checked;

  const dataRows = rows
    .slice(skipRows + 1)
    .filter((r) => r.some((c) => c.trim() !== ""));
  const nowIso = new Date().toISOString();
  const newTransactions = [];
  let skipped = 0;

  dataRows.forEach((row) => {
    const rawDate = (row[dateCol] || "").trim();
    const date = parseBankDate(rawDate);
    if (!date) {
      skipped++;
      return;
    }

    const rawDebit = (row[debitCol] || "").replace(/,/g, "");
    const debitAmt = parseFloat(rawDebit);
    const rawCredit =
      creditCol >= 0 ? (row[creditCol] || "").replace(/,/g, "") : "";
    const creditAmt = parseFloat(rawCredit);

    const isIncome =
      !isNaN(creditAmt) && creditAmt > 0 && (isNaN(debitAmt) || debitAmt <= 0);
    const amount = isIncome
      ? creditAmt
      : !isNaN(debitAmt) && debitAmt > 0
        ? debitAmt
        : NaN;

    if (isNaN(amount) || amount <= 0) {
      skipped++;
      return;
    }

    const desc = descCol >= 0 ? sanitizeHTML((row[descCol] || "").trim()) : "";
    const type = isIncome ? "income" : "expense";

    const txn = {
      id: generateId(),
      type,
      amount,
      category: "Uncategorized",
      date,
      notes: desc,
      tags: [],
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso,
      dateTs: new Date(date).getTime(),
    };

    if (fromAccount) {
      if (type === "expense") txn.fromAccount = fromAccount;
      else txn.toAccount = fromAccount;
    }

    if (isBankDuplicate(txn, state.transactions)) {
      skipped++;
      return;
    }

    newTransactions.push(txn);
  });

  if (newTransactions.length === 0) {
    showMessage(
      `Nothing imported. ${skipped} rows skipped (duplicates or invalid).`,
      "warning",
    );
    closeBankImportModal();
    return;
  }

  await bulkSaveTransactionsToDB(newTransactions);
  state.transactions.push(...newTransactions);
  state.transactions.sort((a, b) => b.dateTs - a.dateTs);
  updateUI();

  if (saveMapping) {
    const mappingName =
      document.getElementById("bankImportMappingName")?.value.trim() ||
      filename;
    await saveBankMapping({
      name: mappingName,
      filename,
      presetKey: presetKey || null,
      skipRows,
      dateCol,
      descriptionCol: descCol,
      debitCol,
      creditCol,
      defaultAccount: fromAccount,
    });
  }

  closeBankImportModal();
  showMessage(
    `Imported ${newTransactions.length} transactions. ${skipped} skipped.`,
  );
}
