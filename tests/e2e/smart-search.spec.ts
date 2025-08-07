/**
 * @samas/smart-search - E2E Tests
 * Tests the complete functionality in browser environment
 */

import { test, expect } from '@playwright/test';

test.describe('@samas/smart-search E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Basic Search Functionality', () => {
    test('should perform search with Supabase provider', async ({ page }) => {
      // Inject SmartSearch into the page
      await page.evaluate(() => {
        // Mock Supabase client for browser testing
        (window as any).mockSupabaseClient = {
          from: () => ({
            select: () => ({
              or: () => ({
                limit: () => Promise.resolve({
                  data: [
                    {
                      id: '1',
                      title: 'JavaScript Guide',
                      author: 'John Doe',
                      description: 'A comprehensive guide',
                      category: 'programming',
                      language: 'en',
                      uploaded_at: '2024-01-01T00:00:00Z'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        };
      });

      // Test search functionality
      const searchResult = await page.evaluate(async () => {
        // Import would normally happen here, but we'll simulate for testing
        const { SmartSearch, SupabaseProvider } = (window as any).SamasSmartSearch;
        
        const database = new SupabaseProvider(
          { url: 'test-url', key: 'test-key' },
          {
            tables: {
              books: {
                columns: { id: 'id', title: 'title', subtitle: 'author', description: 'description' },
                searchColumns: ['title', 'author', 'description'],
                type: 'book'
              }
            }
          }
        );

        // Mock the supabase client
        (database as any).supabase = (window as any).mockSupabaseClient;

        const search = new SmartSearch({
          database,
          fallback: 'database'
        });

        return await search.search('javascript');
      });

      expect(searchResult.results).toHaveLength(1);
      expect(searchResult.results[0].title).toBe('JavaScript Guide');
      expect(searchResult.performance.searchTime).toBeGreaterThan(0);
    });

    test('should handle cache fallback correctly', async ({ page }) => {
      // Test cache failure scenario
      const searchResult = await page.evaluate(async () => {
        const { SmartSearch, SupabaseProvider, RedisProvider } = (window as any).SamasSmartSearch;

        // Mock failing Redis client
        const mockRedisClient = {
          ping: () => Promise.reject(new Error('Redis connection failed')),
          call: () => Promise.reject(new Error('Search failed'))
        };

        // Mock working Supabase client
        const mockSupabaseClient = {
          from: () => ({
            select: () => ({
              or: () => ({
                limit: () => Promise.resolve({
                  data: [{ id: '1', title: 'Fallback Result', author: 'Test' }],
                  error: null
                })
              })
            })
          })
        };

        const database = new SupabaseProvider(
          { url: 'test-url', key: 'test-key' },
          {
            tables: {
              books: {
                columns: { id: 'id', title: 'title', subtitle: 'author' },
                searchColumns: ['title', 'author'],
                type: 'book'
              }
            }
          }
        );

        const cache = new RedisProvider({ host: 'localhost' });
        
        // Mock clients
        (database as any).supabase = mockSupabaseClient;
        (cache as any).redis = mockRedisClient;

        const search = new SmartSearch({
          database,
          cache,
          fallback: 'database'
        });

        return await search.search('test');
      });

      expect(searchResult.results).toHaveLength(1);
      expect(searchResult.results[0].title).toBe('Fallback Result');
      expect(searchResult.strategy.primary).toBe('database');
      expect(searchResult.strategy.reason).toContain('unavailable');
    });
  });

  test.describe('Circuit Breaker Functionality', () => {
    test('should open circuit breaker after failures', async ({ page }) => {
      const circuitBreakerTest = await page.evaluate(async () => {
        const { SmartSearch, SupabaseProvider, RedisProvider } = (window as any).SamasSmartSearch;

        // Mock consistently failing Redis
        const mockRedisClient = {
          ping: () => Promise.resolve('PONG'),
          call: () => Promise.reject(new Error('Search consistently failing'))
        };

        // Mock working Supabase
        const mockSupabaseClient = {
          from: () => ({
            select: () => ({
              or: () => ({
                limit: () => Promise.resolve({
                  data: [{ id: '1', title: 'DB Result' }],
                  error: null
                })
              })
            })
          })
        };

        const database = new SupabaseProvider(
          { url: 'test', key: 'test' },
          {
            tables: {
              books: {
                columns: { id: 'id', title: 'title' },
                searchColumns: ['title'],
                type: 'book'
              }
            }
          }
        );

        const cache = new RedisProvider({ host: 'localhost' });
        
        (database as any).supabase = mockSupabaseClient;
        (cache as any).redis = mockRedisClient;

        const search = new SmartSearch({
          database,
          cache,
          fallback: 'database',
          circuitBreaker: {
            failureThreshold: 2, // Lower threshold for testing
            recoveryTimeout: 100
          }
        });

        // Trigger failures to open circuit breaker
        await search.search('test1');
        await search.search('test2');
        
        const stats = await search.getSearchStats();
        const finalSearch = await search.search('test3');

        return {
          circuitBreakerOpen: stats.circuitBreaker.isOpen,
          failureCount: stats.circuitBreaker.failureCount,
          finalStrategy: finalSearch.strategy.reason
        };
      });

      expect(circuitBreakerTest.failureCount).toBeGreaterThanOrEqual(2);
      expect(circuitBreakerTest.finalStrategy).toContain('circuit breaker');
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track search performance metrics', async ({ page }) => {
      const performanceTest = await page.evaluate(async () => {
        const { SmartSearch, SupabaseProvider } = (window as any).SamasSmartSearch;

        const mockSupabaseClient = {
          from: () => ({
            select: () => ({
              or: () => ({
                limit: () => new Promise(resolve => {
                  // Add artificial delay to test performance tracking
                  setTimeout(() => {
                    resolve({
                      data: [{ id: '1', title: 'Performance Test' }],
                      error: null
                    });
                  }, 100);
                })
              })
            })
          })
        };

        const database = new SupabaseProvider(
          { url: 'test', key: 'test' },
          {
            tables: {
              books: {
                columns: { id: 'id', title: 'title' },
                searchColumns: ['title'],
                type: 'book'
              }
            }
          }
        );

        (database as any).supabase = mockSupabaseClient;

        const search = new SmartSearch({
          database,
          fallback: 'database',
          performance: {
            enableMetrics: true,
            slowQueryThreshold: 50
          }
        });

        const result = await search.search('performance test');
        
        return {
          searchTime: result.performance.searchTime,
          resultCount: result.performance.resultCount,
          strategy: result.performance.strategy
        };
      });

      expect(performanceTest.searchTime).toBeGreaterThan(90); // Should be ~100ms due to artificial delay
      expect(performanceTest.resultCount).toBe(1);
      expect(performanceTest.strategy).toBe('database');
    });
  });

  test.describe('Health Monitoring', () => {
    test('should monitor provider health', async ({ page }) => {
      const healthTest = await page.evaluate(async () => {
        const { SmartSearch, SupabaseProvider, RedisProvider } = (window as any).SamasSmartSearch;

        // Mock healthy providers
        const mockSupabaseClient = {
          from: () => ({
            select: () => ({
              limit: () => Promise.resolve({ data: [], error: null })
            })
          })
        };

        const mockRedisClient = {
          ping: () => Promise.resolve('PONG'),
          call: () => Promise.resolve([0]), // Empty search
          info: () => Promise.resolve('used_memory_human:10MB'),
          dbsize: () => Promise.resolve(100)
        };

        const database = new SupabaseProvider(
          { url: 'test', key: 'test' },
          { tables: {} }
        );

        const cache = new RedisProvider({ host: 'localhost' });
        
        (database as any).supabase = mockSupabaseClient;
        (cache as any).redis = mockRedisClient;

        const search = new SmartSearch({
          database,
          cache,
          fallback: 'database'
        });

        const stats = await search.getSearchStats();
        
        return {
          cacheHealth: stats.cacheHealth,
          databaseHealth: stats.databaseHealth,
          recommendedStrategy: stats.recommendedStrategy
        };
      });

      expect(healthTest.cacheHealth?.isConnected).toBe(true);
      expect(healthTest.cacheHealth?.isSearchAvailable).toBe(true);
      expect(healthTest.databaseHealth.isConnected).toBe(true);
      expect(healthTest.recommendedStrategy.primary).toBe('cache');
    });
  });

  test.describe('Filter and Sort Functionality', () => {
    test('should apply filters and sorting correctly', async ({ page }) => {
      const filterTest = await page.evaluate(async () => {
        const { SmartSearch, SupabaseProvider } = (window as any).SamasSmartSearch;

        const mockData = [
          { id: '1', title: 'JavaScript Book', category: 'programming', uploaded_at: '2024-01-01' },
          { id: '2', title: 'Python Guide', category: 'programming', uploaded_at: '2024-02-01' },
          { id: '3', title: 'Cooking Recipes', category: 'lifestyle', uploaded_at: '2024-01-15' }
        ];

        let lastQuery: any = null;

        const mockSupabaseClient = {
          from: (table: string) => ({
            select: () => ({
              or: () => ({
                in: (field: string, values: string[]) => {
                  lastQuery = { field, values };
                  return {
                    limit: () => Promise.resolve({
                      data: mockData.filter(item => values.includes(item.category)),
                      error: null
                    });
                  };
                },
                limit: () => Promise.resolve({ data: mockData, error: null })
              })
            })
          })
        };

        const database = new SupabaseProvider(
          { url: 'test', key: 'test' },
          {
            tables: {
              books: {
                columns: { 
                  id: 'id', 
                  title: 'title', 
                  category: 'category',
                  createdAt: 'uploaded_at'
                },
                searchColumns: ['title'],
                type: 'book'
              }
            }
          }
        );

        (database as any).supabase = mockSupabaseClient;

        const search = new SmartSearch({
          database,
          fallback: 'database'
        });

        const result = await search.search('test', {
          filters: {
            category: ['programming'],
            type: ['book']
          },
          sortBy: 'date',
          sortOrder: 'desc'
        });

        return {
          resultCount: result.results.length,
          appliedFilter: lastQuery,
          firstResultCategory: result.results[0]?.category
        };
      });

      expect(filterTest.resultCount).toBe(2); // Only programming books
      expect(filterTest.appliedFilter.field).toBe('category');
      expect(filterTest.appliedFilter.values).toEqual(['programming']);
      expect(filterTest.firstResultCategory).toBe('programming');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle complete provider failures gracefully', async ({ page }) => {
      const errorTest = await page.evaluate(async () => {
        const { SmartSearch, SupabaseProvider, RedisProvider } = (window as any).SamasSmartSearch;

        // Mock completely failing providers
        const mockSupabaseClient = {
          from: () => ({
            select: () => ({
              or: () => ({
                limit: () => Promise.reject(new Error('Database completely down'))
              })
            })
          })
        };

        const mockRedisClient = {
          ping: () => Promise.reject(new Error('Redis completely down')),
          call: () => Promise.reject(new Error('Redis search down'))
        };

        const database = new SupabaseProvider(
          { url: 'test', key: 'test' },
          {
            tables: {
              books: {
                columns: { id: 'id', title: 'title' },
                searchColumns: ['title'],
                type: 'book'
              }
            }
          }
        );

        const cache = new RedisProvider({ host: 'localhost' });
        
        (database as any).supabase = mockSupabaseClient;
        (cache as any).redis = mockRedisClient;

        const search = new SmartSearch({
          database,
          cache,
          fallback: 'database'
        });

        const result = await search.search('test');
        
        return {
          resultCount: result.results.length,
          hasErrors: result.performance.errors && result.performance.errors.length > 0,
          strategy: result.strategy.reason
        };
      });

      expect(errorTest.resultCount).toBe(0);
      expect(errorTest.hasErrors).toBe(true);
      expect(errorTest.strategy).toContain('failed');
    });
  });
});