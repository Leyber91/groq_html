// caching.js

import { moaConfig } from '../config/config.js';
import { logger } from '../utils/logger.js';

// Constants
const CACHE_COMPRESSION_THRESHOLD = 1024; // 1KB
const CACHE_PARTITION_COUNT = 4; // For rebalancing

// Use localStorage for persistent storage in browser environment
const storage = window.localStorage;

/**
 * Stores a cache entry in the persistent storage.
 * 
 * How it works:
 * 1. Generates a unique key for the cache entry using its ID.
 * 2. Converts the cache entry object to a JSON string.
 * 3. Stores the JSON string in localStorage using the generated key.
 * 4. Logs any errors that occur during the storage process.
 * 
 * Usage example:
 * ```
 * const cacheEntry = { id: 'user123', data: { name: 'John Doe', age: 30 } };
 * await storeCacheEntryInDatabase(cacheEntry);
 * ```
 * 
 * Files using this function:
 * - js/chat/chatManager.js
 * - js/user/userProfile.js
 * 
 * Role in program logic:
 * This function is crucial for maintaining persistent cache storage across browser sessions.
 * It allows the application to store large amounts of data locally, reducing server load and
 * improving application performance.
 * 
 * @param {Object} cacheEntry - The cache entry to store.
 * @returns {Promise<void>}
 */
export async function storeCacheEntryInDatabase(cacheEntry) {
    try {
        const key = `cache_${cacheEntry.id}`;
        const value = JSON.stringify(cacheEntry);
        storage.setItem(key, value);
    } catch (error) {
        logger.error('Error storing cache entry in storage:', error);
        throw error;
    }
}

/**
 * A simple compression function using run-length encoding.
 * 
 * How it works:
 * 1. Iterates through the input data.
 * 2. Counts consecutive occurrences of each byte.
 * 3. Stores the count and the byte value in the result array.
 * 
 * Usage example:
 * ```
 * const data = new Uint8Array([1, 1, 1, 2, 2, 3, 3, 3, 3]);
 * const compressed = compress(data);
 * console.log(compressed); // Uint8Array [3, 1, 2, 2, 4, 3]
 * ```
 * 
 * Files using this function:
 * - js/chat/caching.js (internal use only)
 * 
 * Role in program logic:
 * This function is a helper for the compressContext function, providing a simple
 * compression algorithm to reduce the size of cached data.
 * 
 * @param {Uint8Array} data - The data to compress.
 * @returns {Uint8Array} The compressed data.
 */
function compress(data) {
    const result = [];
    let count = 1;
    let current = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i] === current && count < 255) {
            count++;
        } else {
            result.push(count, current);
            count = 1;
            current = data[i];
        }
    }
    result.push(count, current);

    return new Uint8Array(result);
}

/**
 * Compresses the given context using a simple compression algorithm.
 * 
 * How it works:
 * 1. Encodes the input string into a Uint8Array.
 * 2. Calls the compress function to perform run-length encoding.
 * 3. Returns the compressed data or null if compression fails.
 * 
 * Usage example:
 * ```
 * const context = "This is a long string that needs compression";
 * const compressed = await compressContext(context);
 * if (compressed) {
 *     console.log("Compressed size:", compressed.byteLength);
 * }
 * ```
 * 
 * Files using this function:
 * - js/chat/chatHistory.js
 * - js/data/dataCompression.js
 * 
 * Role in program logic:
 * This function is used to compress large chunks of text data before caching,
 * significantly reducing memory usage and improving cache efficiency.
 * 
 * @param {string} context - The context to compress.
 * @returns {Promise<Uint8Array|null>} The compressed data or null if compression fails.
 */
export function compressContext(context) {
    return new Promise((resolve) => {
        try {
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(context);
            const compressed = compress(uint8Array);
            resolve(compressed);
        } catch (error) {
            logger.error('Error compressing context:', error);
            resolve(null);
        }
    });
}

/**
 * Estimates the compressed size of the given data.
 * 
 * How it works:
 * 1. Calls compressContext to compress the input data.
 * 2. Returns the byte length of the compressed data, or 0 if compression fails.
 * 
 * Usage example:
 * ```
 * const data = "This is some sample data to estimate compression";
 * const estimatedSize = await estimateCompressedSize(data);
 * console.log("Estimated compressed size:", estimatedSize, "bytes");
 * ```
 * 
 * Files using this function:
 * - js/chat/chatOptimization.js
 * - js/storage/storageManager.js
 * 
 * Role in program logic:
 * This function helps in making decisions about whether to compress data before
 * caching, optimizing storage usage and performance.
 * 
 * @param {string} data - The data to compress and measure.
 * @returns {Promise<number>} The size of the compressed data in bytes.
 */
export async function estimateCompressedSize(data) {
    const compressed = await compressContext(data);
    return compressed ? compressed.byteLength : 0;
}

/**
 * Updates the in-memory cache with a new entry, implementing eviction and prioritization strategies.
 * Utilizes a robust LRU cache mechanism.
 * 
 * How it works:
 * 1. Checks if the key already exists in the cache.
 * 2. If it does, removes the existing entry to update its position (LRU order).
 * 3. If the cache is full, removes the oldest entry.
 * 4. Adds the new entry with additional metadata (lastAccessed, hitCount, missCount).
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * const key = "user_123";
 * const entry = { name: "John Doe", age: 30 };
 * updateInMemoryCache(cache, key, entry);
 * ```
 * 
 * Files using this function:
 * - js/chat/chatCache.js
 * - js/user/userDataManager.js
 * 
 * Role in program logic:
 * This function is central to the caching system, managing the in-memory cache
 * to ensure efficient use of memory and quick access to frequently used data.
 * 
 * @param {Map} cache - The in-memory cache.
 * @param {string} key - The key for the cache entry.
 * @param {Object} entry - The cache entry.
 */
export function updateInMemoryCache(cache, key, entry) {
    if (cache.has(key)) {
        cache.delete(key); // Remove to re-insert for LRU ordering
    } else if (cache.size >= moaConfig.caching.max_cache_size) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
    cache.set(key, { 
        ...entry, 
        lastAccessed: Date.now(), 
        hitCount: 0, 
        missCount: 0 
    });
}

/**
 * Optimizes cache storage by compressing large entries and storing them persistently.
 * 
 * How it works:
 * 1. Iterates through all cache entries.
 * 2. Checks if an entry's content is a string and exceeds the compression threshold.
 * 3. If so, compresses the content using compressContext.
 * 4. Updates the cache with the compressed entry.
 * 5. Stores the compressed entry in the persistent database.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate cache ...
 * await optimizeCacheStorage(cache);
 * ```
 * 
 * Files using this function:
 * - js/chat/chatOptimizer.js
 * - js/system/maintenanceTask.js
 * 
 * Role in program logic:
 * This function plays a crucial role in optimizing memory usage and storage efficiency
 * by compressing large cache entries and ensuring they are persistently stored.
 * 
 * @param {Map} cache - The in-memory cache.
 * @returns {Promise<void>}
 */
export async function optimizeCacheStorage(cache) {
    const promises = [];

    for (const [key, entry] of cache.entries()) {
        if (typeof entry.content === 'string' && entry.content.length > CACHE_COMPRESSION_THRESHOLD && !entry.compressed) {
            const compressedContent = await compressContext(entry.content);
            if (compressedContent) {
                const compressedEntry = { 
                    ...entry, 
                    content: compressedContent, 
                    compressed: true 
                };
                cache.set(key, compressedEntry);
                promises.push(storeCacheEntryInDatabase(compressedEntry));
            }
        }
    }

    await Promise.all(promises);
}

/**
 * Implements Least Recently Used (LRU) eviction policy on the cache.
 * 
 * How it works:
 * 1. Iterates through all cache entries.
 * 2. Finds the entry with the oldest lastAccessed timestamp.
 * 3. Removes the oldest entry from the cache.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate and use cache ...
 * implementLRUEviction(cache);
 * ```
 * 
 * Files using this function:
 * - js/chat/chatCache.js
 * - js/system/cacheManager.js
 * 
 * Role in program logic:
 * This function ensures that the cache doesn't exceed its size limit by removing
 * the least recently used items, maintaining an efficient use of memory.
 * 
 * @param {Map} cache - The in-memory cache.
 */
export function implementLRUEviction(cache) {
    let oldestKey = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of cache.entries()) {
        if (entry.lastAccessed < oldestTimestamp) {
            oldestTimestamp = entry.lastAccessed;
            oldestKey = key;
        }
    }

    if (oldestKey) {
        cache.delete(oldestKey);
    }
}

/**
 * Prioritizes cache entries based on access count.
 * 
 * How it works:
 * 1. Sorts cache entries based on their hit count in descending order.
 * 2. Calculates the number of entries to prioritize (80% of max cache size).
 * 3. Marks the top entries as priority items in the cache.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate and use cache ...
 * prioritizeCacheEntries(cache);
 * ```
 * 
 * Files using this function:
 * - js/chat/chatPerformance.js
 * - js/system/cacheOptimizer.js
 * 
 * Role in program logic:
 * This function improves cache efficiency by ensuring that frequently accessed
 * items are less likely to be evicted, enhancing overall system performance.
 * 
 * @param {Map} cache - The in-memory cache.
 */
export function prioritizeCacheEntries(cache) {
    const priorityThreshold = 0.8; // 80% of max cache size
    const sortedEntries = [...cache.entries()].sort((a, b) => 
        (b[1].hitCount || 0) - (a[1].hitCount || 0)
    );
    const priorityCount = Math.floor(moaConfig.caching.max_cache_size * priorityThreshold);

    for (let i = 0; i < priorityCount && i < sortedEntries.length; i++) {
        const [key, entry] = sortedEntries[i];
        cache.set(key, { 
            ...entry, 
            priority: true 
        });
    }
}

/**
 * Maintains the cache by optimizing storage, removing stale entries, updating statistics, and rebalancing if necessary.
 * 
 * How it works:
 * 1. Calls optimizeCacheStorage to compress and store large entries.
 * 2. Removes stale entries from the cache.
 * 3. Updates cache statistics.
 * 4. Checks if rebalancing is needed and performs it if necessary.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate and use cache ...
 * await maintainCache(cache);
 * ```
 * 
 * Files using this function:
 * - js/system/maintenanceScheduler.js
 * - js/chat/chatSystem.js
 * 
 * Role in program logic:
 * This function is crucial for maintaining the health and efficiency of the cache system,
 * ensuring optimal performance and resource utilization over time.
 * 
 * @param {Map} cache - The in-memory cache.
 * @returns {Promise<void>}
 */
export async function maintainCache(cache) {
    await optimizeCacheStorage(cache);
    removeStaleEntries(cache);
    updateCacheStatistics(cache);

    if (shouldRebalanceCache(cache)) {
        await rebalanceCache(cache);
    }
}

/**
 * Removes stale entries from the cache based on the stale threshold.
 * 
 * How it works:
 * 1. Gets the current timestamp.
 * 2. Iterates through all cache entries.
 * 3. Removes entries whose lastAccessed time is older than the stale threshold.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate and use cache ...
 * removeStaleEntries(cache);
 * ```
 * 
 * Files using this function:
 * - js/chat/chatCache.js
 * - js/system/cacheCleanup.js
 * 
 * Role in program logic:
 * This function helps maintain cache freshness by removing outdated entries,
 * ensuring that the cache contains only relevant and recent data.
 * 
 * @param {Map} cache - The in-memory cache.
 */
export function removeStaleEntries(cache) {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now - entry.lastAccessed > moaConfig.caching.stale_threshold) {
            cache.delete(key);
        }
    }
}

/**
 * Updates and logs cache hit ratio statistics.
 * 
 * How it works:
 * 1. Iterates through all cache entries, summing up hit and miss counts.
 * 2. Calculates the hit ratio.
 * 3. Logs the hit ratio as a percentage.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate and use cache ...
 * updateCacheStatistics(cache);
 * ```
 * 
 * Files using this function:
 * - js/system/performanceMonitor.js
 * - js/chat/chatAnalytics.js
 * 
 * Role in program logic:
 * This function provides insights into cache performance, helping developers
 * and system administrators optimize cache strategies and configurations.
 * 
 * @param {Map} cache - The in-memory cache.
 */
export function updateCacheStatistics(cache) {
    let hitCount = 0;
    let missCount = 0;

    for (const entry of cache.values()) {
        hitCount += entry.hitCount || 0;
        missCount += entry.missCount || 0;
    }

    const total = hitCount + missCount;
    const hitRatio = total > 0 ? (hitCount / total) : 0;
    logger.info(`Cache hit ratio: ${(hitRatio * 100).toFixed(2)}%`);
}

/**
 * Determines whether the cache needs rebalancing based on the rebalance threshold.
 * 
 * How it works:
 * Compares the current cache size with the rebalance threshold from the configuration.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate cache ...
 * if (shouldRebalanceCache(cache)) {
 *     // Perform rebalancing
 * }
 * ```
 * 
 * Files using this function:
 * - js/chat/caching.js (internal use)
 * - js/system/cacheOptimizer.js
 * 
 * Role in program logic:
 * This function helps maintain optimal cache performance by identifying when
 * the cache structure needs to be reorganized for better efficiency.
 * 
 * @param {Map} cache - The in-memory cache.
 * @returns {boolean} True if rebalancing is needed, otherwise false.
 */
export function shouldRebalanceCache(cache) {
    return cache.size > moaConfig.caching.rebalance_threshold;
}

/**
 * Rebalances the cache by dividing it into partitions and redistributing entries.
 * 
 * How it works:
 * 1. Calculates the size of each partition based on the total cache size.
 * 2. Creates an array of partition Maps.
 * 3. Distributes cache entries evenly across the partitions.
 * 4. Clears the original cache and repopulates it with the balanced partitions.
 * 
 * Usage example:
 * ```
 * const cache = new Map();
 * // ... populate cache ...
 * await rebalanceCache(cache);
 * ```
 * 
 * Files using this function:
 * - js/chat/caching.js (internal use)
 * - js/system/cacheManager.js
 * 
 * Role in program logic:
 * This function is crucial for maintaining optimal cache performance as the cache grows,
 * @param {Map} cache - The in-memory cache.
 * @returns {Promise<void>}
 */
export async function rebalanceCache(cache) {
    const partitionSize = Math.ceil(cache.size / CACHE_PARTITION_COUNT);
    const partitions = Array.from({ length: CACHE_PARTITION_COUNT }, () => new Map());

    [...cache.entries()].forEach(([key, value], index) => {
        const partitionIndex = Math.floor(index / partitionSize);
        partitions[partitionIndex].set(key, value);
    });

    // Clear the original cache and repopulate with balanced partitions
    cache.clear();
    for (const partition of partitions) {
        for (const [key, value] of partition.entries()) {
            cache.set(key, value);
        }
    }
}
