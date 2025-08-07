/**
 * @samas/smart-search - RedisProvider Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisProvider, RedisConfig } from '../../providers/RedisProvider';

// Mock Redis client
const mockRedisClient = {
  ping: vi.fn(),
  quit: vi.fn(),
  call: vi.fn(),
  hset: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  flushdb: vi.fn(),
  info: vi.fn(),
  dbsize: vi.fn()
};

describe('RedisProvider', () => {
  let provider: RedisProvider;
  let config: RedisConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 6379,
      password: 'test-password'
    };

    provider = new RedisProvider(config);
    // Mock the redis client
    (provider as any).redis = mockRedisClient;

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create RedisProvider instance', () => {
      expect(provider).toBeInstanceOf(RedisProvider);
      expect(provider.name).toBe('Redis');
    });

    it('should handle URL-based configuration', () => {
      const urlConfig = {
        url: 'redis://localhost:6379'
      };
      const urlProvider = new RedisProvider(urlConfig);
      expect(urlProvider).toBeInstanceOf(RedisProvider);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      await expect(provider.connect()).resolves.toBeUndefined();
      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(await provider.isConnected()).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      await expect(provider.connect()).rejects.toThrow('Connection failed');
    });

    it('should disconnect successfully', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await provider.disconnect();
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(await provider.isConnected()).toBe(false);
    });

    it('should check connection status', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      expect(await provider.isConnected()).toBe(true);

      mockRedisClient.ping.mockRejectedValue(new Error('Connection lost'));
      expect(await provider.isConnected()).toBe(false);
    });
  });

  describe('Search Index Management', () => {
    it('should create search index successfully', async () => {
      mockRedisClient.call.mockResolvedValue('OK');

      const indexConfig = {
        indexName: 'idx:books',
        prefix: 'book:',
        schema: {
          title: 'TEXT SORTABLE',
          author: 'TEXT SORTABLE',
          description: 'TEXT',
          category: 'TAG'
        }
      };

      await expect(provider.createSearchIndex(indexConfig)).resolves.toBeUndefined();
      
      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'FT.CREATE',
        'idx:books',
        'ON', 'HASH',
        'PREFIX', '1', 'book:',
        'SCHEMA',
        'title', 'TEXT SORTABLE',
        'author', 'TEXT SORTABLE',
        'description', 'TEXT',
        'category', 'TAG'
      );
    });

    it('should handle index already exists error', async () => {
      const indexExistsError = new Error('Index already exists');
      mockRedisClient.call.mockRejectedValue(indexExistsError);

      const indexConfig = {
        indexName: 'idx:books',
        prefix: 'book:',
        schema: { title: 'TEXT' }
      };

      await expect(provider.createSearchIndex(indexConfig)).resolves.toBeUndefined();
    });

    it('should add document to index', async () => {
      mockRedisClient.hset.mockResolvedValue(1);
      
      // First create the index
      await provider.createSearchIndex({
        indexName: 'idx:books',
        prefix: 'book:',
        schema: { title: 'TEXT' }
      });

      const document = {
        title: 'JavaScript Guide',
        author: 'John Doe',
        description: 'A comprehensive guide'
      };

      await provider.addToIndex('idx:books', 'book:1', document);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'book:1',
        'title', 'JavaScript Guide',
        'author', 'John Doe',
        'description', 'A comprehensive guide'
      );
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Mock successful connection
      mockRedisClient.ping.mockResolvedValue('PONG');
      await provider.connect();

      // Create mock index
      await provider.createSearchIndex({
        indexName: 'idx:books',
        prefix: 'book:',
        schema: {
          title: 'TEXT SORTABLE',
          author: 'TEXT SORTABLE'
        }
      });
    });

    it('should search successfully', async () => {
      const mockSearchResult = [
        2, // Total count
        'book:1', ['title', 'JavaScript Guide', 'author', 'John Doe'],
        'book:2', ['title', 'Python Guide', 'author', 'Jane Doe']
      ];

      mockRedisClient.call.mockResolvedValue(mockSearchResult);

      const results = await provider.search('guide', { limit: 10 });

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: '1',
        type: 'book',
        title: 'JavaScript Guide',
        subtitle: 'John Doe',
        matchType: 'title',
        relevanceScore: expect.any(Number)
      });

      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'FT.SEARCH',
        'idx:books',
        '*guide*',
        'LIMIT', '0', '10'
      );
    });

    it('should handle empty search results', async () => {
      mockRedisClient.call.mockResolvedValue([0]); // No results

      const results = await provider.search('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should handle search errors gracefully', async () => {
      mockRedisClient.call.mockRejectedValue(new Error('Search failed'));

      const results = await provider.search('test');
      expect(results).toHaveLength(0);
    });

    it('should apply filters correctly', async () => {
      const mockSearchResult = [1, 'book:1', ['title', 'JavaScript Guide']];
      mockRedisClient.call.mockResolvedValue(mockSearchResult);

      await provider.search('guide', {
        filters: {
          type: ['book'],
          category: ['programming']
        },
        sortBy: 'date',
        sortOrder: 'desc'
      });

      // Should have called search for books index only
      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'FT.SEARCH',
        'idx:books',
        '*guide*',
        'LIMIT', '0', '20',
        'SORTBY', 'created_at', 'DESC'
      );
    });
  });

  describe('Cache Operations', () => {
    beforeEach(async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      await provider.connect();
    });

    it('should set value without TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await provider.set('test:key', { data: 'test' });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify({ data: 'test' })
      );
    });

    it('should set value with TTL', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await provider.set('test:key', { data: 'test' }, 60000);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test:key',
        60, // 60000ms / 1000 = 60 seconds
        JSON.stringify({ data: 'test' })
      );
    });

    it('should get value successfully', async () => {
      const testData = { data: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await provider.get('test:key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await provider.get('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should delete key successfully', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await provider.delete('test:key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test:key');
    });

    it('should clear cache with pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['test:1', 'test:2']);
      mockRedisClient.del.mockResolvedValue(2);

      await provider.clear('test:');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:1', 'test:2');
    });

    it('should clear entire cache without pattern', async () => {
      mockRedisClient.flushdb.mockResolvedValue('OK');

      await provider.clear();

      expect(mockRedisClient.flushdb).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when connected', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.call.mockResolvedValue([0]); // Empty search result
      mockRedisClient.info.mockResolvedValue('used_memory_human:50MB\r\n');
      mockRedisClient.dbsize.mockResolvedValue(1000);

      const health = await provider.checkHealth();

      expect(health.isConnected).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.memoryUsage).toBe('50MB');
      expect(health.keyCount).toBe(1000);
      expect(health.errors).toHaveLength(0);
    });

    it('should return unhealthy status when disconnected', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const health = await provider.checkHealth();

      expect(health.isConnected).toBe(false);
      expect(health.isSearchAvailable).toBe(false);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.errors).toContain('Connection failed');
    });

    it('should detect search unavailability', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.call.mockRejectedValue(new Error('Search module not loaded'));
      mockRedisClient.info.mockResolvedValue('used_memory_human:50MB\r\n');
      mockRedisClient.dbsize.mockResolvedValue(1000);

      const health = await provider.checkHealth();

      expect(health.isConnected).toBe(true);
      expect(health.isSearchAvailable).toBe(false);
    });
  });

  describe('Relevance Scoring', () => {
    it('should calculate relevance scores correctly', () => {
      const mockDoc1 = { title: 'JavaScript', author: 'John', description: 'Programming' };
      const mockDoc2 = { title: 'Python Guide', author: 'JavaScript Expert', description: 'Tutorial' };
      const mockDoc3 = { title: 'Web Dev', author: 'Jane', description: 'JavaScript tutorial' };

      // Access private method through any cast for testing
      const calculateScore = (provider as any).calculateRelevanceScore.bind(provider);

      const score1 = calculateScore('javascript', mockDoc1);
      const score2 = calculateScore('javascript', mockDoc2);
      const score3 = calculateScore('javascript', mockDoc3);

      expect(score1).toBeGreaterThan(score2); // Exact title match scores higher
      expect(score2).toBeGreaterThan(score3); // Author match scores higher than description
    });
  });

  describe('Error Handling', () => {
    it('should handle cache operation errors gracefully', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Cache error'));

      await expect(provider.set('test', 'value')).rejects.toThrow('Cache error');
    });

    it('should handle get operation errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Get error'));

      const result = await provider.get('test');
      expect(result).toBeNull();
    });
  });
});