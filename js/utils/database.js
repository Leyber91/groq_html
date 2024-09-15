// database.js
let db = null;

/**
 * Opens the IndexedDB database with dynamic version handling.
 * @returns {Promise<IDBDatabase>} The opened database instance.
 */
export async function openDatabase() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MOACache', 3); // Increment version to 3

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains('responses')) {
                dbInstance.createObjectStore('responses', { keyPath: 'id', autoIncrement: true });
            }
            if (!dbInstance.objectStoreNames.contains('meta_learning')) {
                dbInstance.createObjectStore('meta_learning', { keyPath: 'id', autoIncrement: true });
            }
            if (!dbInstance.objectStoreNames.contains('rate_limits')) {
                dbInstance.createObjectStore('rate_limits', { keyPath: 'id' });
            }
            // Add new object stores here as needed in future versions
        };
    });
}

/**
 * Closes the IndexedDB database.
 */
export async function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

/**
 * Executes a transaction on the specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {string} mode - The transaction mode ('readonly' or 'readwrite').
 * @param {Function} callback - The callback function to execute within the transaction.
 * @returns {Promise<any>} The result of the callback function.
 */
async function executeTransaction(storeName, mode, callback) {
    if (!db) {
        await openDatabase();
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        let result;

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = (event) => {
            console.error(`Transaction error on store ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
        transaction.onabort = (event) => {
            console.warn(`Transaction aborted on store ${storeName}:`, event.target.error);
            reject(event.target.error);
        };

        try {
            result = callback(store);
        } catch (error) {
            console.error('Callback error:', error);
            transaction.abort();
            reject(error);
        }
    });
}

/**
 * Adds or updates a record in a specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {Object} record - The record to add or update.
 * @returns {Promise<void>}
 */
export async function upsertRecord(storeName, record) {
    await executeTransaction(storeName, 'readwrite', (store) => {
        store.put(record);
    });
}

/**
 * Retrieves a record by key from a specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the record to retrieve.
 * @returns {Promise<Object|null>} The retrieved record or null if not found.
 */
export async function getRecord(storeName, key) {
    return executeTransaction(storeName, 'readonly', (store) => {
        const request = store.get(key);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (event) => {
                console.error(`Error getting record from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    });
}

/**
 * Deletes a record by key from a specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the record to delete.
 * @returns {Promise<void>}
 */
export async function deleteRecord(storeName, key) {
    await executeTransaction(storeName, 'readwrite', (store) => {
        store.delete(key);
    });
}

/**
 * Clears all records from a specified object store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
    await executeTransaction(storeName, 'readwrite', (store) => {
        store.clear();
    });
}

/**
 * Retrieves all records from a specified object store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<Array<Object>>} Array of records.
 */
export async function getAllRecords(storeName) {
    return executeTransaction(storeName, 'readonly', (store) => {
        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`Error getting all records from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    });
}
