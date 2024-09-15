// caching.js

import { moaConfig } from '../config/config.js';
import { openDatabase } from '../utils/database.js';

// Constants
const CACHE_COMPRESSION_THRESHOLD = 1024; // 1KB
const CACHE_PARTITION_COUNT = 4; // For rebalancing

/**
 * Stores a cache entry in the persistent database.
 * Optimized for concurrent access and enhanced error handling.
 * @param {Object} cacheEntry - The cache entry to store.
 * @returns {Promise<void>}
 */
export async function storeCacheEntryInDatabase(cacheEntry) {
    try {
        const db = await openDatabase();
        const tx = db.transaction(['responses'], 'readwrite');
        const store = tx.objectStore('responses');

        // Ensure all properties of cacheEntry are resolved
        const resolvedEntry = await Promise.all(Object.entries(cacheEntry).map(async ([key, value]) => {
            return [key, value instanceof Promise ? await value : value];
        }));

        const cloneableCacheEntry = Object.fromEntries(resolvedEntry);
        await store.put(cloneableCacheEntry);
        await tx.done;
    } catch (error) {
        console.error('Error storing cache entry in database:', error);
        throw error;
    }
}

/**
 * A simple compression function using run-length encoding.
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
            console.error('Error compressing context:', error);
            resolve(null);
        }
    });
}

/**
 * Estimates the compressed size of the given data.
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
    console.log(`Cache hit ratio: ${(hitRatio * 100).toFixed(2)}%`);
}

/**
 * Determines whether the cache needs rebalancing based on the rebalance threshold.
 * @param {Map} cache - The in-memory cache.
 * @returns {boolean} True if rebalancing is needed, otherwise false.
 */
export function shouldRebalanceCache(cache) {
    return cache.size > moaConfig.caching.rebalance_threshold;
}

/**
 * Rebalances the cache by dividing it into partitions and redistributing entries.
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
