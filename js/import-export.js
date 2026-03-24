// ============================================================================
// Import / Export / Backup / Restore
// ============================================================================

import { APP_VERSION, state } from "./state.js";
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
import { loadDataFromDB, bulkSaveTransactionsToDB } from "./db.js";
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
  ];
  const rows = state.transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.notes || "",
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

export function createBackup() {
  if (state.transactions.length === 0) {
    showMessage("No transactions to backup!");
    return;
  }

  const currencyCode = getCurrency();
  const metadata = generateBackupMetadata();

  const headers = [
    "Date",
    "Type",
    "Category",
    `Amount (${currencyCode})`,
    "Notes",
    "ID",
    "CreatedAt",
  ];
  const rows = state.transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    t.amount,
    t.notes || "",
    t.id,
    t.createdAt,
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
    const type = rawType === "income" ? "income" : "expense";
    const baseCategory = (row[categoryIndex] || "").trim();
    const rawNotes = notesIndex !== -1 ? (row[notesIndex] || "").trim() : "";
    const category = normalizeImportedCategory(baseCategory, rawNotes, type);

    const txn = {
      id: startId + i,
      type,
      amount: Math.abs(amount),
      category,
      date: normalizedDateVal,
      notes: sanitizeHTML(rawNotes),
      createdAt: nowIso,
    };

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
    };

    if (transaction.type !== "income" && transaction.type !== "expense") {
      transaction.type = "expense";
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
