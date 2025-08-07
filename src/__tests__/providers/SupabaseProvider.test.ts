/**
 * @samas/smart-search - SupabaseProvider Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseProvider, SupabaseConfig, SupabaseSearchConfig } from '../../providers/SupabaseProvider';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

describe('SupabaseProvider', () => {
  let provider: SupabaseProvider;
  let config: SupabaseConfig;
  let searchConfig: SupabaseSearchConfig;

  beforeEach(() => {
    config = {
      url: 'https://test.supabase.co',
      key: 'test-anon-key'
    };

    searchConfig = {
      tables: {
        books: {
          columns: {
            id: 'id',
            title: 'title',
            subtitle: 'author',
            description: 'description',
            category: 'category',
            language: 'language',
            visibility: 'visibility',
            createdAt: 'uploaded_at'
          },
          searchColumns: ['title', 'author', 'description'],
          type: 'book'
        },
        profiles: {
          columns: {
            id: 'id',
            title: 'full_name',
            subtitle: 'username',
            description: 'bio',
            createdAt: 'created_at'
          },
          searchColumns: ['full_name', 'username', 'bio'],
          type: 'user'
        }
      }
    };

    provider = new SupabaseProvider(config, searchConfig);
    // Mock the supabase client
    (provider as any).supabase = mockSupabaseClient;
  });

  describe('Constructor', () => {
    it('should create SupabaseProvider instance', () => {
      expect(provider).toBeInstanceOf(SupabaseProvider);
      expect(provider.name).toBe('Supabase');
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      await expect(provider.connect()).resolves.toBeUndefined();
      expect(await provider.isConnected()).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'CONNECTION_ERROR', message: 'Connection failed' }
          })
        })
      });

      await expect(provider.connect()).rejects.toThrow();
    });

    it('should disconnect successfully', async () => {
      await provider.disconnect();
      expect(await provider.isConnected()).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Mock successful connection
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });
      await provider.connect();
    });

    it('should search books successfully', async () => {
      const mockBookData = [
        {
          id: '1',
          title: 'JavaScript Guide',
          author: 'John Doe',
          description: 'A comprehensive guide to JavaScript',
          category: 'programming',
          language: 'en',
          visibility: 'public',
          uploaded_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Mock the query builder chain
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockBookData, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const results = await provider.search('javascript', {
        limit: 10,
        filters: {
          type: ['book'],
          category: ['programming']
        }
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: '1',
        type: 'book',
        title: 'JavaScript Guide',
        subtitle: 'John Doe',
        description: 'A comprehensive guide to JavaScript',
        category: 'programming',
        language: 'en',
        matchType: 'title',
        relevanceScore: expect.any(Number)
      });

      // Verify query builder calls
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.or).toHaveBeenCalled();
      expect(mockQueryBuilder.in).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });

    it('should search users successfully', async () => {
      const mockUserData = [
        {
          id: '1',
          full_name: 'Jane Doe',
          username: 'janedoe',
          bio: 'JavaScript developer',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const results = await provider.search('jane', {
        filters: { type: ['user'] }
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: '1',
        type: 'user',
        title: 'Jane Doe',
        subtitle: 'janedoe',
        description: 'JavaScript developer'
      });
    });

    it('should handle search errors gracefully', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Search failed' }
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const results = await provider.search('test');
      expect(results).toHaveLength(0);
    });

    it('should apply date range filters', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      await provider.search('test', {
        filters: {
          type: ['book'],
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          }
        }
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('uploaded_at', '2024-01-01');
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('uploaded_at', '2024-12-31');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when connected', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      const health = await provider.checkHealth();

      expect(health.isConnected).toBe(true);
      expect(health.isSearchAvailable).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.errors).toHaveLength(0);
    });

    it('should return unhealthy status when connection fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Connection failed' }
          })
        })
      });

      const health = await provider.checkHealth();

      expect(health.isConnected).toBe(false);
      expect(health.isSearchAvailable).toBe(false);
      expect(health.errors).toContain('Connection failed');
    });
  });

  describe('Relevance Scoring', () => {
    it('should calculate relevance scores correctly', async () => {
      const mockData = [
        {
          id: '1',
          title: 'JavaScript',
          author: 'John Doe',
          description: 'About programming'
        },
        {
          id: '2', 
          title: 'Python Guide',
          author: 'JavaScript Expert',
          description: 'Python tutorial'
        },
        {
          id: '3',
          title: 'Web Development',
          author: 'Jane Doe',
          description: 'Learn JavaScript programming'
        }
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const results = await provider.search('javascript');

      // Results should be sorted by relevance score
      expect(results[0].title).toBe('JavaScript'); // Exact title match should score highest
      expect(results[0].relevanceScore).toBeGreaterThan(results[1].relevanceScore);
    });
  });

  describe('Match Type Detection', () => {
    it('should detect match types correctly', async () => {
      const mockData = [
        { id: '1', title: 'JavaScript Guide', author: 'John Doe', description: 'Programming' },
        { id: '2', title: 'Python Guide', author: 'JavaScript Expert', description: 'Tutorial' },
        { id: '3', title: 'Web Dev', author: 'Jane', description: 'JavaScript programming' }
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const results = await provider.search('javascript');

      expect(results[0].matchType).toBe('title');    // Title match
      expect(results[1].matchType).toBe('author');   // Author match  
      expect(results[2].matchType).toBe('description'); // Description match
    });
  });
});