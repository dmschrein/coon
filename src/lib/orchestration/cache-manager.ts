/**
 * Cache Manager - TTL-based caching for Claude API responses.
 *
 * Reduces API costs by caching responses for identical agent inputs.
 * Uses a hash of (agentType + input) as the cache key.
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
}

export interface CacheManagerOptions {
  /** Default TTL in milliseconds */
  defaultTtlMs: number;
  /** Maximum number of entries to store */
  maxEntries: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor(private options: CacheManagerOptions) {}

  /**
   * Get a cached value. Returns null if not found or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hitCount++;
    this.hits++;
    return entry.value as T;
  }

  /**
   * Store a value in the cache.
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.options.maxEntries && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.options.defaultTtlMs),
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Remove a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Generate a cache key from agent type and input data.
   */
  static buildKey(agentType: string, input: unknown): string {
    const inputStr = typeof input === "string" ? input : JSON.stringify(input);
    return `${agentType}:${simpleHash(inputStr)}`;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    // Clean expired entries first
    this.removeExpired();

    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get or compute: returns cached value or executes the function and caches the result.
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const result = await compute();
    this.set(key, result, ttlMs);
    return result;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Simple string hash for cache keys. Not cryptographic — just fast and consistent.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
