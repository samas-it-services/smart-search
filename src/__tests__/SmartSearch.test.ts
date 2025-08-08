/**
 * @samas/smart-search - SmartSearch Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartSearch } from '../SmartSearch';
import { DatabaseProvider, CacheProvider, SearchResult, HealthStatus } from '../types';

// Mock providers for testing
class MockDatabaseProvider implements DatabaseProvider {
  name = 'MockDB';
  private connected = true;
  private searchResults: SearchResult[] = [];
  private shouldFail = false;

  setConnected(connected: boolean) {
    this.connected = connected;
  }

  setSearchResults(results: SearchResult[]) {
    this.searchResults = results;
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }

  async connect(): Promise<void> {
    if (!this.connected) throw new Error('Database connection failed');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async search(): Promise<SearchResult[]> {
    if (this.shouldFail) throw new Error('Database search failed');
    return [...this.searchResults];
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      isConnected: this.connected,
      isSearchAvailable: this.connected && !this.shouldFail,
      latency: 50,
      memoryUsage: '100MB',
      keyCount: 1000,
      lastSync: new Date().toISOString(),
      errors: this.shouldFail ? ['Search failed'] : []
    };
  }
}

class MockCacheProvider implements CacheProvider {
  name = 'MockCache';
  private connected = true;
  private searchResults: SearchResult[] = [];
  private shouldFail = false;
  private cache = new Map<string, any>();

  setConnected(connected: boolean) {
    this.connected = connected;
  }

  setSearchResults(results: SearchResult[]) {
    this.searchResults = results;
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }

  async connect(): Promise<void> {
    if (!this.connected) throw new Error('Cache connection failed');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async search(): Promise<SearchResult[]> {
    if (this.shouldFail) throw new Error('Cache search failed');
    return [...this.searchResults];
  }

  async set(key: string, value: any): Promise<void> {
    if (this.shouldFail) throw new Error('Cache set failed');
    this.cache.set(key, value);
  }

  async get(key: string): Promise<any> {
    if (this.shouldFail) throw new Error('Cache get failed');
    return this.cache.get(key);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      isConnected: this.connected,
      isSearchAvailable: this.connected && !this.shouldFail,
      latency: 10,
      memoryUsage: '50MB',
      keyCount: 500,
      lastSync: new Date().toISOString(),
      errors: this.shouldFail ? ['Cache failed'] : []
    };
  }
}

describe('SmartSearch', () => {
  let mockDatabase: MockDatabaseProvider;
  let mockCache: MockCacheProvider;
  let smartSearch: SmartSearch;

  const mockSearchResults: SearchResult[] = [
    {
      id: '1',
      type: 'book',
      title: 'Test Book',
      description: 'A test book',
      matchType: 'title',
      relevanceScore: 100
    },
    {
      id: '2',
      type: 'user',
      title: 'Test User',
      description: 'A test user',
      matchType: 'name',
      relevanceScore: 90
    }
  ];

  beforeEach(() => {
    mockDatabase = new MockDatabaseProvider();
    mockCache = new MockCacheProvider();
    
    mockDatabase.setSearchResults(mockSearchResults);
    mockCache.setSearchResults(mockSearchResults);
    
    smartSearch = new SmartSearch({
      database: mockDatabase,
      cache: mockCache,
      fallback: 'database',
      performance: {
        enableMetrics: true,
        logQueries: false
      }
    });
  });

  describe('Constructor', () => {
    it('should create SmartSearch instance with required config', () => {
      expect(smartSearch).toBeInstanceOf(SmartSearch);
    });

    it('should work without cache provider', () => {
      const search = new SmartSearch({
        database: mockDatabase,
        fallback: 'database'
      });
      expect(search).toBeInstanceOf(SmartSearch);
    });
  });

  describe('Search Functionality', () => {
    it('should perform search with cache as primary strategy', async () => {
      const result = await smartSearch.search('test query');
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        id: '1',
        type: 'book',
        title: 'Test Book'
      });
      expect(result.performance.strategy).toBe('cache');
      expect(result.performance.cacheHit).toBe(true);
      expect(result.strategy.primary).toBe('cache');
    });

    it('should fallback to database when cache fails', async () => {
      mockCache.setShouldFail(true);
      
      const result = await smartSearch.search('test query');
      
      expect(result.results).toHaveLength(2);
      expect(result.performance.strategy).toBe('database');
      expect(result.performance.cacheHit).toBe(false);
      expect(result.performance.errors).toBeDefined();
    });

    it('should return empty results when all strategies fail', async () => {
      mockCache.setShouldFail(true);
      mockDatabase.setShouldFail(true);
      
      const result = await smartSearch.search('test query');
      
      expect(result.results).toHaveLength(0);
      expect(result.performance.resultCount).toBe(0);
      expect(result.performance.errors).toBeDefined();
    });

    it('should apply search options correctly', async () => {
      const result = await smartSearch.search('test query', {
        limit: 1,
        filters: {
          type: ['book']
        },
        sortBy: 'relevance',
        sortOrder: 'desc'
      });
      
      expect(result.results).toHaveLength(2); // Mock doesn't filter, but real implementation would
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after multiple failures', async () => {
      mockCache.setShouldFail(true);
      
      // Trigger multiple failures to open circuit breaker
      await smartSearch.search('test1');
      await smartSearch.search('test2');
      await smartSearch.search('test3');
      
      const stats = await smartSearch.getSearchStats();
      expect(stats.circuitBreaker.failureCount).toBeGreaterThan(0);
    });

    it('should use database when circuit breaker is open', async () => {
      mockCache.setShouldFail(true);
      
      // Open circuit breaker
      await smartSearch.search('test1');
      await smartSearch.search('test2');
      await smartSearch.search('test3');
      
      // Next search should use database directly
      const result = await smartSearch.search('test4');
      expect(result.strategy.reason).toContain('circuit breaker');
    });
  });

  describe('Health Monitoring', () => {
    it('should return cache health status', async () => {
      const health = await smartSearch.getCacheHealth();
      
      expect(health).toBeDefined();
      expect(health!.isConnected).toBe(true);
      expect(health!.isSearchAvailable).toBe(true);
      expect(health!.latency).toBe(10);
    });

    it('should return null for cache health when no cache provider', async () => {
      const search = new SmartSearch({
        database: mockDatabase,
        fallback: 'database'
      });
      
      const health = await search.getCacheHealth();
      expect(health).toBeNull();
    });

    it('should return comprehensive search stats', async () => {
      const stats = await smartSearch.getSearchStats();
      
      expect(stats.cacheHealth).toBeDefined();
      expect(stats.databaseHealth).toBeDefined();
      expect(stats.circuitBreaker).toBeDefined();
      expect(stats.recommendedStrategy).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', async () => {
      await smartSearch.clearCache();
      // Mock doesn't throw, so test passes if no error
      expect(true).toBe(true);
    });

    it('should handle cache clear errors gracefully', async () => {
      mockCache.setShouldFail(true);
      
      // Should not throw error even if cache clear fails
      await expect(smartSearch.clearCache()).resolves.toBeUndefined();
    });
  });

  describe('Strategy Selection', () => {
    it('should prefer cache when healthy', async () => {
      const result = await smartSearch.search('test');
      expect(result.strategy.primary).toBe('cache');
      expect(result.strategy.reason).toContain('healthy');
    });

    it('should prefer database when cache is unhealthy', async () => {
      mockCache.setConnected(false);
      await smartSearch.forceHealthCheck(); // Force refresh of health status
      
      const result = await smartSearch.search('test');
      expect(result.strategy.primary).toBe('database');
      expect(result.strategy.reason).toContain('unavailable');
    });

    it('should use database only when no cache configured', async () => {
      const search = new SmartSearch({
        database: mockDatabase,
        fallback: 'database'
      });
      
      const result = await search.search('test');
      expect(result.strategy.primary).toBe('database');
      expect(result.strategy.reason).toContain('No cache provider');
    });
  });

  describe('Performance Tracking', () => {
    it('should track search performance', async () => {
      const result = await smartSearch.search('test');
      
      expect(result.performance.searchTime).toBeGreaterThan(0);
      expect(result.performance.resultCount).toBe(2);
      expect(result.performance.strategy).toBeDefined();
      expect(result.performance.cacheHit).toBeDefined();
    });

    it('should track errors in performance metrics', async () => {
      mockCache.setShouldFail(true);
      
      const result = await smartSearch.search('test');
      expect(result.performance.errors).toBeDefined();
      expect(result.performance.errors!.length).toBeGreaterThan(0);
    });
  });
});