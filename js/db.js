// ============================================================================
// IndexedDB Operations
// ============================================================================

import { state, DB_NAME, DB_VERSION, STORE_NAME } from './state.js';

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

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('dateType', ['date', 'type'], { unique: false });
            }
        };
    });
}

// Load all transactions from IndexedDB
export function loadDataFromDB() {
    return new Promise((resolve, reject) => {
        if (!state.db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = state.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            state.transactions = request.result || [];
            state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(state.transactions);
        };

        request.onerror = () => reject(request.error);
    });
}

// Save single transaction to IndexedDB
export function saveTransactionToDB(transaction) {
    return new Promise((resolve, reject) => {
        if (!state.db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = state.db.transaction([STORE_NAME], 'readwrite');
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
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = state.db.transaction([STORE_NAME], 'readwrite');
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
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = state.db.transaction([STORE_NAME], 'readwrite');
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
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = state.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        transactionsArray.forEach(transaction => {
            store.put(transaction);
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Migrate localStorage data to IndexedDB (one-time)
export async function migrateFromLocalStorage() {
    const migrationFlag = localStorage.getItem('idb_migrated');

    if (migrationFlag === 'true') {
        return;
    }

    const stored = localStorage.getItem('transactions');
    if (stored) {
        try {
            const oldTransactions = JSON.parse(stored);
            if (oldTransactions.length > 0) {
                await bulkSaveTransactionsToDB(oldTransactions);
                console.log(`Migrated ${oldTransactions.length} transactions to IndexedDB`);
            }
            localStorage.removeItem('transactions');
        } catch (err) {
            console.error('Migration failed:', err);
            return;
        }
    }

    localStorage.setItem('idb_migrated', 'true');
}
