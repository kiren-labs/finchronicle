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
  APP_SETTINGS_STORE,
  QUICK_TEMPLATES_STORE,
  ACCOUNTS_STORE,
  GOALS_STORE,
  NET_WORTH_SNAPSHOTS_STORE,
  DEFAULT_APP_SETTINGS,
} from "./state.js";
import { showMessage } from "./utils.js";

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

      // v5: Transfer transaction type support (schema-only, no new stores)
      // New nullable fields: fromAccount, toAccount, transferNote
      // No index needed — transfers filtered in-memory via type field
      if (oldVersion < 5) {
        // No structural changes needed — existing type index handles 'transfer'
      }

      // v6: App settings store for optional fields configuration
      if (oldVersion < 6) {
        if (!database.objectStoreNames.contains(APP_SETTINGS_STORE)) {
          database.createObjectStore(APP_SETTINGS_STORE, { keyPath: "id" });
        }
      }

      // v7: Quick templates store for Quick Entry (v3.17.0)
      if (oldVersion < 7) {
        if (!database.objectStoreNames.contains(QUICK_TEMPLATES_STORE)) {
          const qtStore = database.createObjectStore(QUICK_TEMPLATES_STORE, { keyPath: "id" });
          qtStore.createIndex("sortOrder", "sortOrder", { unique: false });
        }
      }

      // v8: Accounts store for Accounts & Net Worth (v3.18.0)
      if (oldVersion < 8) {
        if (!database.objectStoreNames.contains(ACCOUNTS_STORE)) {
          const accStore = database.createObjectStore(ACCOUNTS_STORE, { keyPath: "id" });
          accStore.createIndex("name", "name", { unique: true });
          accStore.createIndex("type", "type", { unique: false });
          accStore.createIndex("sortOrder", "sortOrder", { unique: false });
        }
      }

      // v9: Savings Goals store (v3.20.0)
      if (oldVersion < 9) {
        if (!database.objectStoreNames.contains(GOALS_STORE)) {
          const goalsStore = database.createObjectStore(GOALS_STORE, { keyPath: "id" });
          goalsStore.createIndex("deadline", "deadline", { unique: false });
        }
      }

      // v10: Net Worth Snapshots store (v3.28.0)
      if (oldVersion < 10) {
        if (!database.objectStoreNames.contains(NET_WORTH_SNAPSHOTS_STORE)) {
          const snapshotsStore = database.createObjectStore(NET_WORTH_SNAPSHOTS_STORE, { keyPath: "id", autoIncrement: true });
          snapshotsStore.createIndex("snapshotDate", "snapshotDate", { unique: true });
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
      const all = request.result || [];
      // Filter out soft-deleted records (kept in DB for audit trail)
      state.transactions = all.filter((t) => !t.deleted);
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

// Load ALL transactions including soft-deleted (for audit backup)
export function loadAllTransactionsFromDB() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = state.db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      all.forEach((t) => {
        t.dateTs = new Date(t.date).getTime();
      });
      all.sort((a, b) => b.dateTs - a.dateTs);
      resolve(all);
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

// Soft-delete transaction (preserves record for audit trail)
export function deleteTransactionFromDB(id) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const tx = state.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        resolve();
        return;
      }
      record.deleted = true;
      record.deletedAt = new Date().toISOString();
      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Mark a reimbursable transaction as settled (v3.27.0)
export function markTransactionSettled(id, settledBy = null) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const tx = state.db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        resolve();
        return;
      }
      record.settled = true;
      record.settledAt = new Date().toISOString();
      record.settledBy = settledBy || null;
      record.updatedAt = new Date().toISOString();
      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve(record);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
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
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([BUDGETS_STORE], "readwrite");
    const store = tx.objectStore(BUDGETS_STORE);
    const request = store.put(budget);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteBudgetFromDB(id) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([BUDGETS_STORE], "readwrite");
    const store = tx.objectStore(BUDGETS_STORE);
    const request = store.delete(id);
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
    const tx = state.db.transaction([BUDGETS_STORE], "readonly");
    const store = tx.objectStore(BUDGETS_STORE);
    const index = store.index("category");
    const request = index.get(category);
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
      showMessage("Data migration failed. Your existing transactions may not have loaded.");
      return;
    }
  }

  localStorage.setItem("idb_migrated", "true");
}

// ---- App Settings (v3.16.0) ----

export function loadAppSettings() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      resolve(null);
      return;
    }
    if (!state.db.objectStoreNames.contains(APP_SETTINGS_STORE)) {
      resolve(null);
      return;
    }
    const tx = state.db.transaction([APP_SETTINGS_STORE], "readonly");
    const store = tx.objectStore(APP_SETTINGS_STORE);
    const request = store.get("config");
    request.onsuccess = () => {
      const result = request.result || null;
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

export function saveAppSettings(settings) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    settings.id = "config";
    settings.lastUpdated = new Date().toISOString();
    const tx = state.db.transaction([APP_SETTINGS_STORE], "readwrite");
    const store = tx.objectStore(APP_SETTINGS_STORE);
    const request = store.put(settings);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- Quick Templates (v3.17.0) ----

export function loadQuickTemplates() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      resolve([]);
      return;
    }
    if (!state.db.objectStoreNames.contains(QUICK_TEMPLATES_STORE)) {
      resolve([]);
      return;
    }
    const tx = state.db.transaction([QUICK_TEMPLATES_STORE], "readonly");
    const store = tx.objectStore(QUICK_TEMPLATES_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const templates = request.result || [];
      templates.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      resolve(templates);
    };
    request.onerror = () => reject(request.error);
  });
}

export function saveQuickTemplate(template) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([QUICK_TEMPLATES_STORE], "readwrite");
    const store = tx.objectStore(QUICK_TEMPLATES_STORE);
    const request = store.put(template);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteQuickTemplate(id) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([QUICK_TEMPLATES_STORE], "readwrite");
    const store = tx.objectStore(QUICK_TEMPLATES_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function bulkSaveQuickTemplates(templates) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([QUICK_TEMPLATES_STORE], "readwrite");
    const store = tx.objectStore(QUICK_TEMPLATES_STORE);
    store.clear();
    templates.forEach((t) => store.put(t));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Accounts CRUD (v3.18.0) ----

export function loadAccounts() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([ACCOUNTS_STORE], "readonly");
    const store = tx.objectStore(ACCOUNTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      state.accounts = (request.result || []).sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
      );
      resolve(state.accounts);
    };
    request.onerror = () => reject(request.error);
  });
}

export function saveAccount(account) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([ACCOUNTS_STORE], "readwrite");
    const store = tx.objectStore(ACCOUNTS_STORE);
    const request = store.put(account);
    request.onsuccess = () => resolve(account);
    request.onerror = () => reject(request.error);
  });
}

export function deleteAccount(id) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([ACCOUNTS_STORE], "readwrite");
    const store = tx.objectStore(ACCOUNTS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Savings Goals CRUD (v3.20.0)
// ============================================================================

export function loadGoals() {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([GOALS_STORE], "readonly");
    const store = tx.objectStore(GOALS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      state.savingsGoals = request.result || [];
      resolve(state.savingsGoals);
    };
    request.onerror = () => reject(request.error);
  });
}

export function saveGoal(goal) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([GOALS_STORE], "readwrite");
    const store = tx.objectStore(GOALS_STORE);
    const request = store.put(goal);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteGoal(id) {
  return new Promise((resolve, reject) => {
    if (!state.db) {
      reject(new Error("Database not initialized"));
      return;
    }
    const tx = state.db.transaction([GOALS_STORE], "readwrite");
    const store = tx.objectStore(GOALS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---- Net Worth Snapshots (v3.28.0) ----

export function saveNetWorthSnapshot(snapshot) {
  return new Promise((resolve, reject) => {
    if (!state.db || !state.db.objectStoreNames.contains(NET_WORTH_SNAPSHOTS_STORE)) {
      resolve(null);
      return;
    }
    const tx = state.db.transaction([NET_WORTH_SNAPSHOTS_STORE], "readwrite");
    const store = tx.objectStore(NET_WORTH_SNAPSHOTS_STORE);
    const request = store.put(snapshot);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function loadNetWorthSnapshots() {
  return new Promise((resolve, reject) => {
    if (!state.db || !state.db.objectStoreNames.contains(NET_WORTH_SNAPSHOTS_STORE)) {
      resolve([]);
      return;
    }
    const tx = state.db.transaction([NET_WORTH_SNAPSHOTS_STORE], "readonly");
    const store = tx.objectStore(NET_WORTH_SNAPSHOTS_STORE);
    const index = store.index("snapshotDate");
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function getNetWorthSnapshotByDate(snapshotDate) {
  return new Promise((resolve, reject) => {
    if (!state.db || !state.db.objectStoreNames.contains(NET_WORTH_SNAPSHOTS_STORE)) {
      resolve(null);
      return;
    }
    const tx = state.db.transaction([NET_WORTH_SNAPSHOTS_STORE], "readonly");
    const store = tx.objectStore(NET_WORTH_SNAPSHOTS_STORE);
    const index = store.index("snapshotDate");
    const request = index.get(snapshotDate);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
