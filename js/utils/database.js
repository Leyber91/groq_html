// database.js
let db = null;

/**
 * Opens the IndexedDB database with dynamic version handling.
 * 
 * How it works:
 * 1. Checks if a database connection already exists, if so, returns it.
 * 2. Creates a new connection to the 'MOACache' database with version 3.
 * 3. Sets up error and success handlers for the database opening request.
 * 4. Implements an 'onupgradeneeded' handler to create or update object stores.
 * 
 * Usage example:
 * ```javascript
 * try {
 *   const database = await openDatabase();
 *   console.log('Database opened successfully:', database.name);
 * } catch (error) {
 *   console.error('Failed to open database:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/utils/caching.js
 * - js/services/dataService.js
 * - js/components/DatabaseManager.js
 * 
 * Role in overall program logic:
 * This function is crucial for initializing and managing the IndexedDB database connection.
 * It ensures that the database is properly set up with the required object stores,
 * allowing other parts of the application to perform data operations.
 * 
 * @returns {Promise<IDBDatabase>} The opened database instance.
 * 
 * @see [IndexedDB API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
 * @see [Database Schema Documentation](./docs/database-schema.md)
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
 * 
 * How it works:
 * 1. Checks if a database connection exists.
 * 2. If it does, closes the connection and sets the db variable to null.
 * 
 * Usage example:
 * ```javascript
 * await closeDatabase();
 * console.log('Database connection closed');
 * ```
 * 
 * Files that use this function:
 * - js/utils/cleanup.js
 * - js/components/DatabaseManager.js
 * 
 * Role in overall program logic:
 * This function ensures proper cleanup of database resources when they are no longer needed,
 * preventing memory leaks and allowing for graceful shutdown of database operations.
 * 
 * @see [IndexedDB API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/close)
 */
export async function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

/**
 * Executes a transaction on the specified object store.
 * 
 * How it works:
 * 1. Opens the database if it's not already open.
 * 2. Creates a transaction on the specified object store with the given mode.
 * 3. Executes the provided callback function within the transaction.
 * 4. Handles transaction completion, errors, and aborts.
 * 
 * Usage example:
 * ```javascript
 * try {
 *   const result = await executeTransaction('responses', 'readonly', (store) => {
 *     return store.get(someKey);
 *   });
 *   console.log('Transaction result:', result);
 * } catch (error) {
 *   console.error('Transaction failed:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/utils/database.js (internal use in other exported functions)
 * - js/services/dataService.js
 * 
 * Role in overall program logic:
 * This function provides a robust way to perform database operations within transactions,
 * ensuring data consistency and proper error handling for all database interactions.
 * 
 * @param {string} storeName - The name of the object store.
 * @param {string} mode - The transaction mode ('readonly' or 'readwrite').
 * @param {Function} callback - The callback function to execute within the transaction.
 * @returns {Promise<any>} The result of the callback function.
 * 
 * @see [IndexedDB Transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
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
 * 
 * How it works:
 * 1. Executes a readwrite transaction on the specified object store.
 * 2. Uses the `put` method to add or update the record.
 * 
 * Usage example:
 * ```javascript
 * const newRecord = { id: 1, data: 'Some data' };
 * try {
 *   await upsertRecord('responses', newRecord);
 *   console.log('Record upserted successfully');
 * } catch (error) {
 *   console.error('Failed to upsert record:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/services/cacheService.js
 * - js/components/DataManager.js
 * 
 * Role in overall program logic:
 * This function is essential for maintaining and updating data in the IndexedDB stores,
 * allowing the application to persist and modify information as needed.
 * 
 * @param {string} storeName - The name of the object store.
 * @param {Object} record - The record to add or update.
 * @returns {Promise<void>}
 * 
 * @see [IDBObjectStore.put()](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/put)
 */
export async function upsertRecord(storeName, record) {
    await executeTransaction(storeName, 'readwrite', (store) => {
        store.put(record);
    });
}

/**
 * Retrieves a record by key from a specified object store.
 * 
 * How it works:
 * 1. Executes a readonly transaction on the specified object store.
 * 2. Uses the `get` method to retrieve the record by its key.
 * 3. Returns the record if found, or null if not found.
 * 
 * Usage example:
 * ```javascript
 * try {
 *   const record = await getRecord('responses', 1);
 *   if (record) {
 *     console.log('Retrieved record:', record);
 *   } else {
 *     console.log('Record not found');
 *   }
 * } catch (error) {
 *   console.error('Failed to retrieve record:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/services/dataService.js
 * - js/components/RecordViewer.js
 * 
 * Role in overall program logic:
 * This function allows the application to retrieve specific data items from the database,
 * enabling data-driven features and dynamic content loading based on stored information.
 * 
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the record to retrieve.
 * @returns {Promise<Object|null>} The retrieved record or null if not found.
 * 
 * @see [IDBObjectStore.get()](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/get)
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
 * 
 * How it works:
 * 1. Executes a readwrite transaction on the specified object store.
 * 2. Uses the `delete` method to remove the record with the given key.
 * 
 * Usage example:
 * ```javascript
 * try {
 *   await deleteRecord('responses', 1);
 *   console.log('Record deleted successfully');
 * } catch (error) {
 *   console.error('Failed to delete record:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/services/dataCleanupService.js
 * - js/components/RecordManager.js
 * 
 * Role in overall program logic:
 * This function allows the application to remove specific data items from the database,
 * supporting data management features like cleanup processes or user-initiated deletions.
 * 
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the record to delete.
 * @returns {Promise<void>}
 * 
 * @see [IDBObjectStore.delete()](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/delete)
 */
export async function deleteRecord(storeName, key) {
    await executeTransaction(storeName, 'readwrite', (store) => {
        store.delete(key);
    });
}

/**
 * Clears all records from a specified object store.
 * 
 * How it works:
 * 1. Executes a readwrite transaction on the specified object store.
 * 2. Uses the `clear` method to remove all records from the store.
 * 
 * Usage example:
 * ```javascript
 * try {
 *   await clearStore('responses');
 *   console.log('Store cleared successfully');
 * } catch (error) {
 *   console.error('Failed to clear store:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/services/databaseMaintenanceService.js
 * - js/components/DatabaseResetTool.js
 * 
 * Role in overall program logic:
 * This function provides a way to completely reset or clear a specific data store,
 * which can be useful for maintenance tasks, testing, or user-requested data purges.
 * 
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<void>}
 * 
 * @see [IDBObjectStore.clear()](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/clear)
 */
export async function clearStore(storeName) {
    await executeTransaction(storeName, 'readwrite', (store) => {
        store.clear();
    });
}

/**
 * Retrieves all records from a specified object store.
 * 
 * How it works:
 * 1. Executes a readonly transaction on the specified object store.
 * 2. Uses the `getAll` method to retrieve all records from the store.
 * 3. Returns an array of all records in the store.
 * 
 * Usage example:
 * ```javascript
 * try {
 *   const allRecords = await getAllRecords('responses');
 *   console.log('All records:', allRecords);
 * } catch (error) {
 *   console.error('Failed to retrieve all records:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/services/dataAnalysisService.js
 * - js/components/RecordListViewer.js
 * 
 * Role in overall program logic:
 * This function enables bulk data retrieval, which is crucial for features like
 * data export, comprehensive analysis, or displaying all items in a list view.
 * 
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<Array<Object>>} Array of records.
 * 
 * @see [IDBObjectStore.getAll()](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll)
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
