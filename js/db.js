// ============================================================================
// IndexedDB Operations
// ============================================================================

import {
  state,
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  RECURRING_STORE,
  BUDGETS_STORE,
} from "./state.js";

function getObjectStore(storeName, mode = "readonly") {
  if (!state.db) {
    throw new Error("Database not initialized");
  }
  return state.db.transaction([storeName], mode).objectStore(storeName);
}

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

      // v3: budgets store
      if (oldVersion < 3) {
        if (!database.objectStoreNames.contains(BUDGETS_STORE)) {
          const budgetsStore = database.createObjectStore(BUDGETS_STORE, {
            keyPath: "id",
          });
          budgetsStore.createIndex("category", "category", {
            unique: false,
          });
        }
      }

      // v4: tags multiEntry index on transactions store
      if (oldVersion < 4) {
        const txStore = event.target.transaction.objectStore(STORE_NAME);
        if (!txStore.indexNames.contains("tags")) {
          txStore.createIndex("tags", "tags", { unique: false, multiEntry: true });
        }
      }
    };
  });
}

// Load all transactions from IndexedDB
export function loadDataFromDB() {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = getObjectStore(STORE_NAME, "readonly").getAll();
    } catch (err) {
      reject(err);
      return;
    }

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
    let request;
    try {
      request = getObjectStore(STORE_NAME, "readwrite").put(transaction);
    } catch (err) {
      reject(err);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete transaction from IndexedDB
export function deleteTransactionFromDB(id) {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = getObjectStore(STORE_NAME, "readwrite").delete(id);
    } catch (err) {
      reject(err);
      return;
    }

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all transactions from IndexedDB (for restore)
export function clearAllTransactions() {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = getObjectStore(STORE_NAME, "readwrite").clear();
    } catch (err) {
      reject(err);
      return;
    }

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
    let request;
    try {
      request = getObjectStore(RECURRING_STORE, "readwrite").put(template);
    } catch (err) {
      reject(err);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteRecurringTemplateFromDB(id) {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = getObjectStore(RECURRING_STORE, "readwrite").delete(id);
    } catch (err) {
      reject(err);
      return;
    }
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---- Budgets ----

export function loadBudgetsFromDB() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      resolve([]);
      return;
    }
    const tx = state.db.transaction([BUDGETS_STORE], "readonly");
    const store = tx.objectStore(BUDGETS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function saveBudgetToDB(budget) {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = getObjectStore(BUDGETS_STORE, "readwrite").put(budget);
    } catch (err) {
      reject(err);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteBudgetFromDB(id) {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = getObjectStore(BUDGETS_STORE, "readwrite").delete(id);
    } catch (err) {
      reject(err);
      return;
    }
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function getBudgetByCategory(category) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      resolve(null);
      return;
    }

    const request = getObjectStore(BUDGETS_STORE, "readonly")
      .index("category")
      .get(category);
    request.onsuccess = () => resolve(request.result || null);
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
