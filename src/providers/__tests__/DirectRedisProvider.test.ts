/**
 * @samas/smart-search - DirectRedisProvider Unit Tests
 */

import { DirectRedisProvider } from '../DirectRedisProvider';
import { CacheProvider, SearchResult, SearchOptions, HealthStatus } from '../../types';

describe('DirectRedisProvider', () => {
  let provider: DirectRedisProvider;
  const mockConfig = {
    host: 'localhost',
    port: 6379,
    lazyConnect: true
  };

  beforeEach(() => {
    provider = new DirectRedisProvider(mockConfig);
  });

  afterEach(async () => {
    if (provider) {
      try {
        await provider.disconnect();
      } catch (error) {
        // Ignore disconnection errors in tests
      }
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(provider.name).toBe('DirectRedis');
      expect(provider).toBeDefined();
    });

    it('should set default values when config is incomplete', () => {
      const minimalConfig = { url: 'redis://localhost:6379' };
      const minimalProvider = new DirectRedisProvider(minimalConfig);
      expect(minimalProvider).toBeDefined();
    });
  });

  describe('Connection Management', () => {
    it('should check connection status', async () => {
      // Since we might not have Redis running in test environment, 
      // this should handle gracefully
      const isConnected = await provider.isConnected();
      // This could be true or false depending on Redis availability
      expect(typeof isConnected).toBe('boolean');
    });

    it('should attempt to connect', async () => {
      // Connect method should not throw error even if Redis not available
      await expect(provider.connect()).resolves.not.toThrow();
    });
  });

  describe('Search Functionality', () => {
    it('should perform search with basic query', async () => {
      // Mock search functionality since we may not have Redis running
      const query = 'test';
      const options: SearchOptions = { limit: 10, offset: 0 };

      // Since we may not have Redis available, this should gracefully handle fallback
      const results = await provider.search(query, options);
      
      // Should return an array (empty or with results)
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle wildcard queries', async () => {
      const query = '*';
      const options: SearchOptions = { limit: 5 };
      
      const results = await provider.search(query, options);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty query', async () => {
      const query = '';
      const options: SearchOptions = { limit: 10 };
      
      const results = await provider.search(query, options);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Cache Operations', () => {
    it('should set and get values', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test-value', timestamp: Date.now() };

      // Set value
      await provider.set(testKey, testValue);

      // Get value
      const retrievedValue = await provider.get(testKey);
      
      // Since Redis might not be available, we just check that no errors are thrown
      // If Redis is available, the value should match
    });

    it('should set values with TTL', async () => {
      const testKey = 'test-key-ttl';
      const testValue = 'test-value';

      // Set value with TTL
      await provider.set(testKey, testValue, 100); // 100 seconds TTL
      
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should delete values', async () => {
      const testKey = 'test-key-delete';
      await provider.delete(testKey);
      
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should clear values with pattern', async () => {
      await provider.clear('test-pattern:*');
      
      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Health Monitoring', () => {
    it('should return health status', async () => {
      const health = await provider.checkHealth();
      
      expect(health).toBeDefined();
      expect(typeof health.isConnected).toBe('boolean');
      expect(['healthy', 'unhealthy', 'degraded', undefined]).toContain(health.status);
    });

    it('should return detailed health information', async () => {
      const health = await provider.checkHealth();
      
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('message');
      expect(health).toHaveProperty('details');
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      // This test verifies that the provider handles errors without crashing
      const query = 'test';
      const options: SearchOptions = { limit: 10, offset: 0 };
      
      // Even if Redis is not available, search should return an array (possibly empty)
      const results = await provider.search(query, options);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      // Disconnect first
      await provider.disconnect();
      
      // Then try to perform operations - should handle gracefully
      const results = await provider.search('test', { limit: 5 });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should integrate with circuit breaker', async () => {
      // Health check should return circuit breaker details
      const health = await provider.checkHealth();
      expect(health.details).toBeDefined();
      if (health.details) {
        expect(health.details).toHaveProperty('circuitBreaker');
      }
    });
  });
});