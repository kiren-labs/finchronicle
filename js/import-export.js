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
} from "./utils.js";
import { getCurrency, formatCurrency } from "./currency.js";
import { loadDataFromDB, bulkSaveTransactionsToDB, loadAllTransactionsFromDB } from "./db.js";
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

  let csv = headers.join(",") + "\n";
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
    dates.length > 0
      ? new Date(dates[dates.length - 1]).toISOString().slice(0, 10)
      : "";
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
    "ID",
    "CreatedAt",
    "UpdatedAt",
    "From Account",
    "To Account",
    "Deleted",
    "DeletedAt",
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
    t.id,
    t.createdAt,
    t.updatedAt || "",
    t.fromAccount || "",
    t.toAccount || "",
    t.deleted ? "yes" : "",
    t.deletedAt || "",
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

  let csv = metadata + "\n";
  csv += headers.join(",") + "\n";
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
  const input = document.getElementById("importFile");
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
        `Imported ${result.added} transaction(s)` +
          (result.skipped ? ` • Skipped ${result.skipped}` : ""),
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

  if (dateIndex === -1 || categoryIndex === -1 || amountIndex === -1) {
    throw new Error("Missing required headers");
  }

  let added = 0;
  let skipped = 0;
  const nowIso = new Date().toISOString();
  const startId = Date.now();
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
    const type = rawType === "income" ? "income" : rawType === "transfer" ? "transfer" : "expense";
    const baseCategory = (row[categoryIndex] || "").trim();
    const rawNotes = notesIndex !== -1 ? (row[notesIndex] || "").trim() : "";
    const category = type === "transfer" ? "Transfer" : normalizeImportedCategory(baseCategory, rawNotes, type);

    const txn = {
      id: startId + i,
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
      txn.fromAccount = fromAccountIndex !== -1 ? sanitizeHTML((row[fromAccountIndex] || "").trim()) : null;
      txn.toAccount = toAccountIndex !== -1 ? sanitizeHTML((row[toAccountIndex] || "").trim()) : null;
      txn.transferNote = null;
    }

    // Add optional fields if present (v3.16.0)
    if (paymentMethodIndex !== -1) {
      const val = (row[paymentMethodIndex] || "").trim();
      if (val && PAYMENT_METHODS.includes(val)) txn.paymentMethod = sanitizeHTML(val);
    }
    if (merchantIndex !== -1) {
      const val = (row[merchantIndex] || "").trim();
      if (val) txn.merchant = sanitizeHTML(val);
    }
    if (expenseTypeIndex !== -1) {
      const val = (row[expenseTypeIndex] || "").trim();
      if (val && EXPENSE_TYPES.includes(val)) txn.expenseType = sanitizeHTML(val);
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

    newTransactions.push(txn);
    state.transactions.unshift(txn);
    added += 1;
  });

  if (newTransactions.length > 0) {
    await bulkSaveTransactionsToDB(newTransactions);
    updateUI();
  }

  return { added, skipped };
}

// ---- Restore Backup ----

export function triggerRestore() {
  const input = document.getElementById("restoreFile");
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
        idIndex !== -1 && row[idIndex]
          ? parseInt(row[idIndex])
          : Date.now() + i,
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
    if (deletedIndex !== -1 && (row[deletedIndex] || "").trim().toLowerCase() === "yes") {
      transaction.deleted = true;
      transaction.deletedAt =
        deletedAtIndex !== -1 && row[deletedAtIndex]
          ? row[deletedAtIndex].trim()
          : new Date().toISOString();
    }

    if (transaction.type === "transfer") {
      transaction.category = "Transfer";
      transaction.fromAccount = fromAccountIndex !== -1 ? sanitizeHTML((row[fromAccountIndex] || "").trim()) : null;
      transaction.toAccount = toAccountIndex !== -1 ? sanitizeHTML((row[toAccountIndex] || "").trim()) : null;
      transaction.transferNote = null;
    } else if (transaction.type !== "income" && transaction.type !== "expense") {
      transaction.type = "expense";
    }

    // Restore optional fields (v3.16.0)
    if (paymentMethodIdx !== -1) {
      const val = (row[paymentMethodIdx] || "").trim();
      if (val && PAYMENT_METHODS.includes(val)) transaction.paymentMethod = sanitizeHTML(val);
    }
    if (merchantIdx !== -1) {
      const val = (row[merchantIdx] || "").trim();
      if (val) transaction.merchant = sanitizeHTML(val);
    }
    if (expenseTypeIdx !== -1) {
      const val = (row[expenseTypeIdx] || "").trim();
      if (val && EXPENSE_TYPES.includes(val)) transaction.expenseType = sanitizeHTML(val);
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
      ? formatDate(dates[dates.length - 1].toISOString().slice(0, 10))
      : "-";
  document.getElementById("previewDateRange").textContent =
    `${oldestDate} to ${newestDate}`;

  document.getElementById("previewCurrency").textContent =
    backupData.metadata["Currency"] || getCurrency();

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

export async function confirmRestore() {
  const backupData = state.pendingRestoreData;
  if (!backupData) return;

  closeRestorePreview();
  showMessage("Restoring backup...");

  try {
    await loadDataFromDB();

    const stats = {
      backupTotal: backupData.transactions.length,
      added: 0,
      duplicates: 0,
      currentTotal: 0,
    };

    const newTransactions = [];

    backupData.transactions.forEach((backupTxn) => {
      if (isDuplicateTransaction(backupTxn, state.transactions)) {
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

// ---- Process Restored Data from Encrypted Backup (v3.22.0) ----

export function processRestoredData(data) {
  // Convert JSON backup format to the internal restore format
  const backupData = {
    valid: true,
    metadata: {
      "Backup Date": data.exportDate || new Date().toISOString(),
      "App Version": data.version || "unknown",
      Currency: data.currency || "INR",
    },
    transactions: data.transactions || [],
  };

  state.pendingRestoreData = backupData;
  showRestorePreview(backupData);
}
