/**
 * @samas/smart-search - In-Memory Cache Provider
 * Lightweight in-memory caching for development and testing
 */

import {
  CacheProvider,
  HealthStatus
} from '../types';

export interface InMemoryConfig {
  maxSize?: number; // Maximum number of items to store
  defaultTTL?: number; // Default TTL in milliseconds
  checkInterval?: number; // Cleanup interval in milliseconds
  enableStats?: boolean; // Track statistics
}

interface CacheItem {
  value: string;
  expiry: number | undefined;
  created: number;
  accessed: number;
  accessCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalSize: number;
  memoryUsage: number;
}

export class InMemoryProvider implements CacheProvider {
  name = 'InMemory';
  private cache: Map<string, CacheItem> = new Map();
  private isConnectedFlag = false;
  private config: InMemoryConfig;
  private cleanupTimer: NodeJS.Timeout | undefined;
  private stats: CacheStats;

  constructor(config: InMemoryConfig = {}) {
    this.config = {
      maxSize: 10000,
      defaultTTL: 300000, // 5 minutes
      checkInterval: 60000, // 1 minute
      enableStats: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
      memoryUsage: 0
    };
  }

  async connect(): Promise<void> {
    try {
      console.log('🔗 Initializing In-Memory cache...');
      
      this.isConnectedFlag = true;
      
      // Start cleanup timer if configured
      if (this.config.checkInterval && this.config.checkInterval > 0) {
        this.startCleanupTimer();
      }
      
      console.log(`✅ In-Memory cache initialized (max size: ${this.config.maxSize})`);
    } catch (error) {
      this.isConnectedFlag = false;
      console.error('❌ Failed to initialize In-Memory cache:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }
      
      this.cache.clear();
      this.isConnectedFlag = false;
      console.log('✅ In-Memory cache disconnected and cleared');
    } catch (error) {
      console.error('❌ Error disconnecting In-Memory cache:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    return this.isConnectedFlag;
  }

  async search(query: string, _options: any): Promise<any[]> {
    // Cache providers don't implement search directly - this is handled by SmartSearch
    console.log(`🔍 InMemory search called: ${query}`);
    return [];
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    const item = this.cache.get(key);
    
    if (!item) {
      this.incrementStat('misses');
      return null;
    }

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      this.incrementStat('misses');
      this.decrementSize(this.calculateItemSize(key, item.value));
      return null;
    }

    // Update access information
    item.accessed = Date.now();
    item.accessCount++;
    
    this.incrementStat('hits');
    console.log(`🔍 InMemory GET: ${key} (${item.accessCount} accesses)`);
    
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    const effectiveTTL = ttl || this.config.defaultTTL;
    const expiry = effectiveTTL ? Date.now() + effectiveTTL : undefined;
    
    // Check if we need to evict items
    if (this.cache.size >= (this.config.maxSize || 10000) && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const existingItem = this.cache.get(key);
    if (existingItem) {
      // Update existing item size calculation
      const oldSize = this.calculateItemSize(key, existingItem.value);
      this.decrementSize(oldSize);
    }

    const newItem: CacheItem = {
      value,
      expiry: expiry || undefined,
      created: Date.now(),
      accessed: Date.now(),
      accessCount: 0
    };

    this.cache.set(key, newItem);
    this.incrementStat('sets');
    this.incrementSize(this.calculateItemSize(key, value));
    
    console.log(`📝 InMemory SET: ${key} (TTL: ${effectiveTTL || 'none'}ms, size: ${this.cache.size}/${this.config.maxSize})`);
  }

  async del(key: string): Promise<void> {
    return this.delete(key);
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.incrementStat('deletes');
      this.decrementSize(this.calculateItemSize(key, item.value));
      console.log(`🗑️ InMemory DELETE: ${key}`);
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      this.resetStats();
      console.log(`🧹 InMemory CLEAR: ${size} items removed`);
      return;
    }

    // Pattern-based clearing
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.del(key);
    }

    console.log(`🧹 InMemory CLEAR: ${keysToDelete.length} items matching "${pattern}" removed`);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    console.log(`🔍 InMemory MGET: ${keys.length} keys`);
    
    const results = await Promise.all(keys.map(key => this.get(key)));
    return results;
  }

  async mset(keyValuePairs: { key: string; value: string; ttl?: number }[]): Promise<void> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    console.log(`📝 InMemory MSET: ${keyValuePairs.length} pairs`);
    
    await Promise.all(keyValuePairs.map(pair => this.set(pair.key, pair.value, pair.ttl)));
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      this.decrementSize(this.calculateItemSize(key, item.value));
      return false;
    }

    console.log(`❓ InMemory EXISTS: ${key} = true`);
    return true;
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isConnectedFlag) {
      throw new Error('In-Memory cache not connected');
    }

    const item = this.cache.get(key);
    if (!item) {
      throw new Error(`Key "${key}" not found`);
    }

    item.expiry = Date.now() + ttl;
    console.log(`⏰ InMemory EXPIRE: ${key} (TTL: ${ttl}ms)`);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.config.checkInterval);
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        this.cache.delete(key);
        this.decrementSize(this.calculateItemSize(key, item.value));
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 InMemory cleanup: removed ${cleanedCount} expired items`);
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.accessed < oldestTime) {
        oldestTime = item.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const item = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      if (item) {
        this.decrementSize(this.calculateItemSize(oldestKey, item.value));
      }
      this.incrementStat('evictions');
      console.log(`📤 InMemory EVICT: ${oldestKey} (LRU)`);
    }
  }

  private calculateItemSize(key: string, value: string): number {
    // Rough estimation of memory usage in bytes
    return (key.length + value.length) * 2 + 64; // 2 bytes per char + overhead
  }

  private incrementStat(stat: keyof CacheStats): void {
    if (this.config.enableStats) {
      (this.stats[stat] as number)++;
    }
  }

  private incrementSize(bytes: number): void {
    if (this.config.enableStats) {
      this.stats.totalSize++;
      this.stats.memoryUsage += bytes;
    }
  }

  private decrementSize(bytes: number): void {
    if (this.config.enableStats) {
      this.stats.totalSize = Math.max(0, this.stats.totalSize - 1);
      this.stats.memoryUsage = Math.max(0, this.stats.memoryUsage - bytes);
    }
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
      memoryUsage: 0
    };
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.isConnected();
      
      if (!isConnected) {
        return {
          isConnected: false,
          isSearchAvailable: false,
          latency: -1,
          memoryUsage: '0',
          keyCount: 0,
          lastSync: null,
          errors: ['In-Memory cache not connected']
        };
      }

      // Test cache operations
      let isSearchAvailable = false;
      try {
        const testKey = 'health-check-' + Date.now();
        await this.set(testKey, 'test', 1000);
        const value = await this.get(testKey);
        await this.del(testKey);
        isSearchAvailable = value === 'test';
      } catch (error) {
        console.warn('In-Memory cache operations failed:', error);
      }

      const latency = Date.now() - startTime;
      const memoryMB = Math.round(this.stats.memoryUsage / 1024 / 1024 * 100) / 100;
      
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage: `${memoryMB}MB`,
        keyCount: this.cache.size,
        lastSync: new Date().toISOString(),
        errors: []
      };

    } catch (error) {
      return {
        isConnected: false,
        isSearchAvailable: false,
        latency: Date.now() - startTime,
        memoryUsage: '0',
        keyCount: 0,
        lastSync: null,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // In-Memory specific methods
  getStats(): CacheStats {
    return { ...this.stats };
  }

  getCacheInfo(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    items: Array<{ key: string; size: number; created: number; accessed: number; accessCount: number; expiry: number | undefined }>;
  } {
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      size: this.calculateItemSize(key, item.value),
      created: item.created,
      accessed: item.accessed,
      accessCount: item.accessCount,
      expiry: item.expiry
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize || 10000,
      utilizationPercent: Math.round((this.cache.size / (this.config.maxSize || 10000)) * 100),
      items: items.sort((a, b) => b.accessCount - a.accessCount) // Sort by most accessed
    };
  }

  // Get cache hit ratio
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
  }
}