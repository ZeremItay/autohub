// Enhanced in-memory cache for client-side queries with TTL, invalidation, and statistics

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

const cache = new Map<string, CacheEntry>();

// Default TTL values (in milliseconds)
export const CACHE_TTL = {
  SHORT: 60000,      // 1 minute
  MEDIUM: 300000,    // 5 minutes
  LONG: 600000,      // 10 minutes
  VERY_LONG: 1800000, // 30 minutes
  EXTRA_LONG: 3600000 // 60 minutes - for profiles and posts that don't change often
};

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  clears: 0
};

/**
 * Get cached data by key
 * Returns null if not found or expired
 */
export function getCached<T>(key: string, customTTL?: number): T | null {
  const cached = cache.get(key);
  if (!cached) {
    cacheStats.misses++;
    return null;
  }
  
  const now = Date.now();
  const ttl = customTTL || cached.ttl;
  
  // Check if expired
  if (now - cached.timestamp > ttl) {
    cache.delete(key);
    cacheStats.misses++;
    return null;
  }
  
  // Update access statistics
  cached.accessCount++;
  cached.lastAccessed = now;
  cacheStats.hits++;
  
  return cached.data as T;
}

/**
 * Set cached data with optional custom TTL
 */
export function setCached(key: string, data: any, ttl: number = CACHE_TTL.MEDIUM): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    ttl,
    accessCount: 0,
    lastAccessed: now
  });
  cacheStats.sets++;
}

/**
 * Clear cache entries matching a pattern, or all if no pattern provided
 */
export function clearCache(pattern?: string): void {
  if (pattern) {
    let deleted = 0;
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
        deleted++;
      }
    }
    cacheStats.deletes += deleted;
  } else {
    cache.clear();
    cacheStats.clears++;
  }
}

/**
 * Invalidate cache entry by key
 */
export function invalidateCache(key: string): void {
  if (cache.delete(key)) {
    cacheStats.deletes++;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    ...cacheStats,
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed
    }))
  };
}

/**
 * Clear expired entries from cache
 */
export function clearExpiredEntries(): number {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    cacheStats.deletes += cleared;
  }
  
  return cleared;
}

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    clearExpiredEntries();
  }, 5 * 60 * 1000);
}

