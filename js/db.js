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

// ============================================================================
// Generic IDB Helpers — eliminates repetitive promise/transaction boilerplate
// ============================================================================

function assertDB() {
  if (!state.db) throw new Error("Database not initialized");
}

function hasStore(storeName) {
  return state.db && state.db.objectStoreNames.contains(storeName);
}

/** Promisify a single IDBRequest */
function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Promisify an IDBTransaction (resolves on complete) */
function txToPromise(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all records from a store. Returns [] if DB not ready or store missing. */
function idbGetAll(storeName, fallback = []) {
  if (!state.db || !hasStore(storeName)) return Promise.resolve(fallback);
  const store = state.db
    .transaction([storeName], "readonly")
    .objectStore(storeName);
  return reqToPromise(store.getAll()).then((r) => r || fallback);
}

/** Get all records via an index. */
function idbGetAllByIndex(storeName, indexName, fallback = []) {
  if (!state.db || !hasStore(storeName)) return Promise.resolve(fallback);
  const store = state.db
    .transaction([storeName], "readonly")
    .objectStore(storeName);
  return reqToPromise(store.index(indexName).getAll()).then(
    (r) => r || fallback,
  );
}

/** Get a single record by key. Returns fallback if not found. */
function idbGet(storeName, key, fallback = null) {
  if (!state.db || !hasStore(storeName)) return Promise.resolve(fallback);
  const store = state.db
    .transaction([storeName], "readonly")
    .objectStore(storeName);
  return reqToPromise(store.get(key)).then((r) => r ?? fallback);
}

/** Get a single record by index key. */
function idbGetByIndex(storeName, indexName, key, fallback = null) {
  if (!state.db || !hasStore(storeName)) return Promise.resolve(fallback);
  const store = state.db
    .transaction([storeName], "readonly")
    .objectStore(storeName);
  return reqToPromise(store.index(indexName).get(key)).then(
    (r) => r ?? fallback,
  );
}

/** Put (insert or update) a record. Returns the key. */
function idbPut(storeName, record) {
  assertDB();
  const store = state.db
    .transaction([storeName], "readwrite")
    .objectStore(storeName);
  return reqToPromise(store.put(record));
}

/** Delete a record by key. */
function idbDelete(storeName, key) {
  assertDB();
  const store = state.db
    .transaction([storeName], "readwrite")
    .objectStore(storeName);
  return reqToPromise(store.delete(key));
}

/** Clear all records from a store. */
function idbClear(storeName) {
  assertDB();
  const store = state.db
    .transaction([storeName], "readwrite")
    .objectStore(storeName);
  return reqToPromise(store.clear());
}

/** Put many records in one transaction. */
function idbBulkPut(storeName, records) {
  assertDB();
  const tx = state.db.transaction([storeName], "readwrite");
  const store = tx.objectStore(storeName);
  records.forEach((r) => store.put(r));
  return txToPromise(tx);
}

/** Get-then-modify pattern: read a record, apply mutator, put it back. */
function idbModify(storeName, key, mutator) {
  assertDB();
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction([storeName], "readwrite");
    const store = tx.objectStore(storeName);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) {
        resolve(null);
        return;
      }
      const updated = mutator(record);
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ============================================================================
// Database Initialisation & Schema Migrations
// ============================================================================

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
          budgetsStore.createIndex("category", "category", { unique: false });
        }
      }

      // v4: tags multiEntry index on transactions store
      if (oldVersion < 4) {
        const txStore = event.target.transaction.objectStore(STORE_NAME);
        if (!txStore.indexNames.contains("tags")) {
          txStore.createIndex("tags", "tags", {
            unique: false,
            multiEntry: true,
          });
        }
      }

      // v5: Transfer transaction type support (schema-only, no new stores)
      if (oldVersion < 5) {
        /* existing type index handles 'transfer' */
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
          const qtStore = database.createObjectStore(QUICK_TEMPLATES_STORE, {
            keyPath: "id",
          });
          qtStore.createIndex("sortOrder", "sortOrder", { unique: false });
        }
      }

      // v8: Accounts store for Accounts & Net Worth (v3.18.0)
      if (oldVersion < 8) {
        if (!database.objectStoreNames.contains(ACCOUNTS_STORE)) {
          const accStore = database.createObjectStore(ACCOUNTS_STORE, {
            keyPath: "id",
          });
          accStore.createIndex("name", "name", { unique: true });
          accStore.createIndex("type", "type", { unique: false });
          accStore.createIndex("sortOrder", "sortOrder", { unique: false });
        }
      }

      // v9: Savings Goals store (v3.20.0)
      if (oldVersion < 9) {
        if (!database.objectStoreNames.contains(GOALS_STORE)) {
          const goalsStore = database.createObjectStore(GOALS_STORE, {
            keyPath: "id",
          });
          goalsStore.createIndex("deadline", "deadline", { unique: false });
        }
      }

      // v10: Net Worth Snapshots store (v3.28.0)
      if (oldVersion < 10) {
        if (!database.objectStoreNames.contains(NET_WORTH_SNAPSHOTS_STORE)) {
          const snapshotsStore = database.createObjectStore(
            NET_WORTH_SNAPSHOTS_STORE,
            { keyPath: "id", autoIncrement: true },
          );
          snapshotsStore.createIndex("snapshotDate", "snapshotDate", {
            unique: true,
          });
        }
      }

      // v11: Account classification — asset vs liability (v4.0.0)
      if (oldVersion < 11) {
        if (database.objectStoreNames.contains(ACCOUNTS_STORE)) {
          const accStore = event.target.transaction.objectStore(ACCOUNTS_STORE);
          const getAllReq = accStore.getAll();
          getAllReq.onsuccess = () => {
            const liabilityTypes = ["credit-card", "loan", "mortgage"];
            getAllReq.result.forEach((account) => {
              account.classification ??= liabilityTypes.includes(account.type)
                ? "liability"
                : "asset";
              accStore.put(account);
            });
          };
        }
      }

      // v12: Transaction status field — 'pending' | 'cleared' | 'reconciled' (v4.0.0)
      if (oldVersion < 12) {
        if (database.objectStoreNames.contains(STORE_NAME)) {
          const txStore = event.target.transaction.objectStore(STORE_NAME);
          const getAllReq = txStore.getAll();
          getAllReq.onsuccess = () => {
            getAllReq.result.forEach((record) => {
              if (!record.status) {
                record.status = "cleared";
                txStore.put(record);
              }
            });
          };
        }
      }
    };
  });
}

// ============================================================================
// Transactions
// ============================================================================

export async function loadDataFromDB() {
  assertDB();
  const all = await idbGetAll(STORE_NAME);
  state.transactions = all.filter((t) => !t.deleted);
  state.transactions.forEach((t) => {
    t.dateTs = new Date(t.date).getTime();
  });
  state.transactions.sort((a, b) => b.dateTs - a.dateTs);
  return state.transactions;
}

export async function loadAllTransactionsFromDB() {
  assertDB();
  const all = await idbGetAll(STORE_NAME);
  all.forEach((t) => {
    t.dateTs = new Date(t.date).getTime();
  });
  all.sort((a, b) => b.dateTs - a.dateTs);
  return all;
}

export function saveTransactionToDB(transaction) {
  return idbPut(STORE_NAME, transaction);
}

export function deleteTransactionFromDB(id) {
  return idbModify(STORE_NAME, id, (record) => {
    record.deleted = true;
    record.deletedAt = new Date().toISOString();
    return record;
  });
}

export function markTransactionSettled(id, settledBy = null) {
  return idbModify(STORE_NAME, id, (record) => {
    record.settled = true;
    record.settledAt = new Date().toISOString();
    record.settledBy = settledBy || null;
    record.updatedAt = new Date().toISOString();
    return record;
  });
}

export function clearAllTransactions() {
  return idbClear(STORE_NAME);
}

export function bulkSaveTransactionsToDB(transactionsArray) {
  return idbBulkPut(STORE_NAME, transactionsArray);
}

// ============================================================================
// Recurring Templates
// ============================================================================

export function loadRecurringTemplatesFromDB() {
  return idbGetAll(RECURRING_STORE);
}

export function saveRecurringTemplateToDB(template) {
  return idbPut(RECURRING_STORE, template);
}

export function deleteRecurringTemplateFromDB(id) {
  return idbDelete(RECURRING_STORE, id);
}

// ============================================================================
// Budgets
// ============================================================================

export function loadBudgetsFromDB() {
  return idbGetAll(BUDGETS_STORE);
}

export function saveBudgetToDB(budget) {
  return idbPut(BUDGETS_STORE, budget);
}

export function deleteBudgetFromDB(id) {
  return idbDelete(BUDGETS_STORE, id);
}

export function getBudgetByCategory(category) {
  return idbGetByIndex(BUDGETS_STORE, "category", category);
}

// ============================================================================
// Migration
// ============================================================================

export async function migrateFromLocalStorage() {
  if (localStorage.getItem("idb_migrated") === "true") return;

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
      showMessage(
        "Data migration failed. Your existing transactions may not have loaded.",
      );
      return;
    }
  }

  localStorage.setItem("idb_migrated", "true");
}

// ============================================================================
// App Settings (v3.16.0)
// ============================================================================

export function loadAppSettings() {
  return idbGet(APP_SETTINGS_STORE, "config");
}

export function saveAppSettings(settings) {
  settings.id = "config";
  settings.lastUpdated = new Date().toISOString();
  return idbPut(APP_SETTINGS_STORE, settings);
}

// ============================================================================
// Quick Templates (v3.17.0)
// ============================================================================

export async function loadQuickTemplates() {
  const templates = await idbGetAll(QUICK_TEMPLATES_STORE);
  templates.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return templates;
}

export function saveQuickTemplate(template) {
  return idbPut(QUICK_TEMPLATES_STORE, template);
}

export function deleteQuickTemplate(id) {
  return idbDelete(QUICK_TEMPLATES_STORE, id);
}

export async function bulkSaveQuickTemplates(templates) {
  assertDB();
  const tx = state.db.transaction([QUICK_TEMPLATES_STORE], "readwrite");
  const store = tx.objectStore(QUICK_TEMPLATES_STORE);
  store.clear();
  templates.forEach((t) => store.put(t));
  return txToPromise(tx);
}

// ============================================================================
// Accounts (v3.18.0)
// ============================================================================

export async function loadAccounts() {
  assertDB();
  const all = await idbGetAll(ACCOUNTS_STORE);
  state.accounts = all.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return state.accounts;
}

export function saveAccount(account) {
  return idbPut(ACCOUNTS_STORE, account).then(() => account);
}

export function deleteAccount(id) {
  return idbDelete(ACCOUNTS_STORE, id);
}

// ============================================================================
// Savings Goals (v3.20.0)
// ============================================================================

export async function loadGoals() {
  assertDB();
  state.savingsGoals = await idbGetAll(GOALS_STORE);
  return state.savingsGoals;
}

export function saveGoal(goal) {
  return idbPut(GOALS_STORE, goal);
}

export function deleteGoal(id) {
  return idbDelete(GOALS_STORE, id);
}

// ============================================================================
// Net Worth Snapshots (v3.28.0)
// ============================================================================

export function saveNetWorthSnapshot(snapshot) {
  if (!state.db || !hasStore(NET_WORTH_SNAPSHOTS_STORE))
    return Promise.resolve(null);
  return idbPut(NET_WORTH_SNAPSHOTS_STORE, snapshot);
}

export function loadNetWorthSnapshots() {
  return idbGetAllByIndex(NET_WORTH_SNAPSHOTS_STORE, "snapshotDate");
}

export function getNetWorthSnapshotByDate(snapshotDate) {
  return idbGetByIndex(NET_WORTH_SNAPSHOTS_STORE, "snapshotDate", snapshotDate);
}

export function getAllNetWorthSnapshots() {
  return idbGetAll(NET_WORTH_SNAPSHOTS_STORE);
}

export function bulkSaveNetWorthSnapshots(snapshots) {
  if (!state.db || !hasStore(NET_WORTH_SNAPSHOTS_STORE))
    return Promise.resolve();
  if (snapshots.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const tx = state.db.transaction([NET_WORTH_SNAPSHOTS_STORE], "readwrite");
    const store = tx.objectStore(NET_WORTH_SNAPSHOTS_STORE);
    const index = store.index("snapshotDate");
    let pending = snapshots.length;
    snapshots.forEach((snapshot) => {
      const check = index.get(snapshot.snapshotDate);
      check.onsuccess = () => {
        if (!check.result) store.put(snapshot);
        pending--;
        if (pending === 0) resolve();
      };
      check.onerror = () => {
        pending--;
        if (pending === 0) resolve();
      };
    });
    tx.onerror = () => reject(tx.error);
  });
}

export function clearAllStores(storeNames) {
  if (!state.db) return Promise.resolve();
  const validStores = storeNames.filter((name) => hasStore(name));
  if (validStores.length === 0) return Promise.resolve();

  const tx = state.db.transaction(validStores, "readwrite");
  validStores.forEach((name) => tx.objectStore(name).clear());
  return txToPromise(tx);
}
