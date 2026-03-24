// ============================================================================
// IndexedDB Operations
// ============================================================================

import {
  state,
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  RECURRING_STORE,
} from "./state.js";

// Initialize IndexedDB
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      state.db = request.result;
      resolve(state.db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      const oldVersion = event.oldVersion;

      // v1: transactions store
      if (oldVersion < 1) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("dateType", ["date", "type"], { unique: false });
      }

      // v2: recurringTemplates store
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains(RECURRING_STORE)) {
          const recurringStore = database.createObjectStore(RECURRING_STORE, {
            keyPath: "id",
          });
          recurringStore.createIndex("nextDueDate", "nextDueDate", {
            unique: false,
          });
          recurringStore.createIndex("enabled", "enabled", { unique: false });
        }
      }
    };
  });
}

// Load all transactions from IndexedDB
export function loadDataFromDB() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = state.db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      state.transactions = request.result || [];
      // Cache timestamps for fast numeric sorting
      state.transactions.forEach((t) => {
        t.dateTs = new Date(t.date).getTime();
      });
      state.transactions.sort((a, b) => b.dateTs - a.dateTs);
      resolve(state.transactions);
    };

    request.onerror = () => reject(request.error);
  });
}

// Save single transaction to IndexedDB
export function saveTransactionToDB(transaction) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const tx = state.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(transaction);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete transaction from IndexedDB
export function deleteTransactionFromDB(id) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const tx = state.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all transactions from IndexedDB (for restore)
export function clearAllTransactions() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const tx = state.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Bulk save transactions to IndexedDB (for import)
export function bulkSaveTransactionsToDB(transactionsArray) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const tx = state.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);

    transactionsArray.forEach((transaction) => {
      store.put(transaction);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Recurring Templates ----

export function loadRecurringTemplatesFromDB() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      resolve([]);
      return;
    }
    const tx = state.db.transaction([RECURRING_STORE], "readonly");
    const store = tx.objectStore(RECURRING_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function saveRecurringTemplateToDB(template) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([RECURRING_STORE], "readwrite");
    const store = tx.objectStore(RECURRING_STORE);
    const request = store.put(template);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteRecurringTemplateFromDB(id) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([RECURRING_STORE], "readwrite");
    const store = tx.objectStore(RECURRING_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Migrate localStorage data to IndexedDB (one-time)
export async function migrateFromLocalStorage() {
  const migrationFlag = localStorage.getItem("idb_migrated");

  if (migrationFlag === "true") {
    return;
  }

  const stored = localStorage.getItem("transactions");
  if (stored) {
    try {
      const oldTransactions = JSON.parse(stored);
      if (oldTransactions.length > 0) {
        await bulkSaveTransactionsToDB(oldTransactions);
        console.log(
          `Migrated ${oldTransactions.length} transactions to IndexedDB`,
        );
      }
      localStorage.removeItem("transactions");
    } catch (err) {
      console.error("Migration failed:", err);
      return;
    }
  }

  localStorage.setItem("idb_migrated", "true");
}
