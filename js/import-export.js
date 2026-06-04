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
import { getCurrency, formatCurrency } from "./currency.js";
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
    showMessage("No transactions to export!");
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

  let csv = `${headers.join(",")}\n`;
  csv += rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finchronicle-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);

  updateBackupTimestamp();
  showMessage("✅ Export successful & backup recorded!");
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
    showMessage("No transactions to backup!");
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

  let csv = `${metadata}\n`;
  csv += `${headers.join(",")}\n`;
  csv += rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
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

  showMessage("Backup created successfully!");
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
        showMessage("No valid rows to import.");
        return;
      }
      showMessage(
        `Imported ${result.added} transaction(s)${
          result.skipped ? ` • Skipped ${result.skipped}` : ""
        }`,
      );
    } catch (err) {
      console.error("Import failed:", err);
      showMessage("Import failed. Check the CSV format.");
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
        showMessage("No valid rows to import.");
        return;
      }
      showMessage(
        `Imported ${result.added} transaction(s)${
          result.skipped ? ` • Skipped ${result.skipped}` : ""
        }`,
      );
    } catch (err) {
      console.error("Import failed:", err);
      showMessage("Import failed. Check the CSV format.");
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

  rows.slice(1).forEach((row, i) => {
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
    const baseCategory = (row[categoryIndex] || "").trim();
    const rawNotes = notesIndex !== -1 ? (row[notesIndex] || "").trim() : "";
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
      const val = (row[merchantIndex] || "").trim();
      if (val) txn.merchant = sanitizeHTML(val);
    }
    if (expenseTypeIndex !== -1) {
      const val = (row[expenseTypeIndex] || "").trim();
      if (val && EXPENSE_TYPES.includes(val))
        txn.expenseType = sanitizeHTML(val);
    }
    if (attachedToIndex !== -1) {
      const val = (row[attachedToIndex] || "").trim();
      if (val) txn.attachedTo = sanitizeHTML(val);
    }
    if (referenceIdIndex !== -1) {
      const val = (row[referenceIdIndex] || "").trim();
      if (val) txn.referenceId = sanitizeHTML(val);
    }
    if (locationIndex !== -1) {
      const val = (row[locationIndex] || "").trim();
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
      showMessage("Failed to read backup file. Please check the file format.");
    }
  };

  reader.onerror = () => {
    showMessage("Failed to read file. Please try again.");
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
      error: "Missing required columns (Date, Type, Category, Amount)",
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

  const parsedTransactions = [];
  const dataRows = rows.slice(1);

  dataRows.forEach((row, i) => {
    const rawDate = (row[dateIndex] || "").trim();
    const rawAmount = (row[amountIndex] || "").replace(/,/g, "");
    const amount = parseFloat(rawAmount);

    if (!rawDate || isNaN(amount) || amount <= 0) {
      return;
    }

    const rawNotes = notesIndex !== -1 ? (row[notesIndex] || "").trim() : "";

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
      const val = (row[merchantIdx] || "").trim();
      if (val) transaction.merchant = sanitizeHTML(val);
    }
    if (expenseTypeIdx !== -1) {
      const val = (row[expenseTypeIdx] || "").trim();
      if (val && EXPENSE_TYPES.includes(val))
        transaction.expenseType = sanitizeHTML(val);
    }
    if (attachedToIdx !== -1) {
      const val = (row[attachedToIdx] || "").trim();
      if (val) transaction.attachedTo = sanitizeHTML(val);
    }
    if (referenceIdIdx !== -1) {
      const val = (row[referenceIdIdx] || "").trim();
      if (val) transaction.referenceId = sanitizeHTML(val);
    }
    if (locationIdx !== -1) {
      const val = (row[locationIdx] || "").trim();
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
    return { valid: false, error: "No valid transactions found in backup" };
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
      integrityEl.textContent = "⚠ Hash mismatch — file may be corrupted";
      integrityEl.style.color = "var(--color-expense-text)";
    } else {
      integrityRow.style.display = "none";
    }
  }

  modal.classList.add("show");
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
      `This will DELETE all current data and replace it with the backup (${backupData.transactions.length} transactions). This cannot be undone. Continue?`,
    );
    if (!confirmed) return;
  }

  closeRestorePreview();
  showMessage("Restoring backup...");

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
    showMessage("Restore failed. Your existing data was preserved.");
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
      "Enter the passphrase used to encrypt this backup:",
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
      showMessage("Invalid JSON backup file.");
    }
  } else if (name.endsWith(".csv")) {
    showMessage(
      "CSV restores transactions only. Use a .json backup for full restore.",
      "warning",
    );
    handleCsvRestore(file);
  } else {
    showMessage("Unsupported file format. Use .json, .enc, or .csv");
  }
}

export function handleCsvRestore(file) {
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
      showMessage("Failed to read backup file. Please check the file format.");
    }
  };
  reader.onerror = () => showMessage("Failed to read file. Please try again.");
  reader.readAsText(file);
}
