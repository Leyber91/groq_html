let db = null;

export async function openDatabase() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MOACache', 2); // Increase version number

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('responses')) {
                db.createObjectStore('responses', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('meta_learning')) {
                db.createObjectStore('meta_learning', { keyPath: 'id' });
            }
        };
    });
}

export async function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}