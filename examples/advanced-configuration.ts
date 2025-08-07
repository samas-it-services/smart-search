/**
 * @samas/smart-search - Advanced Configuration Examples
 * Demonstrates advanced features, configurations, and use cases
 */

import { SmartSearch, SupabaseProvider, RedisProvider } from '@samas/smart-search';

// Example: Production-ready configuration with monitoring
async function productionConfigExample() {
  console.log('🏭 Production Configuration Example');

  const database = new SupabaseProvider(
    {
      url: process.env.SUPABASE_URL!,
      key: process.env.SUPABASE_ANON_KEY!,
      options: {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        }
      }
    },
    {
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
          searchColumns: ['title', 'author', 'description', 'tags'],
          type: 'book'
        },
        users: {
          columns: {
            id: 'id',
            title: 'full_name',
            subtitle: 'username',
            description: 'bio',
            createdAt: 'created_at'
          },
          searchColumns: ['full_name', 'username', 'bio', 'skills'],
          type: 'user'
        }
      }
    }
  );

  const cache = new RedisProvider({
    url: process.env.REDIS_URL!,
    connectTimeout: 10000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  });

  const search = new SmartSearch({
    database,
    cache,
    fallback: 'database',
    circuitBreaker: {
      failureThreshold: 5,        // More tolerant in production
      recoveryTimeout: 30000,     // 30-second recovery
      healthCacheTTL: 10000       // 10-second health cache
    },
    cache: {
      enabled: true,
      defaultTTL: 600000,         // 10-minute cache TTL
      maxSize: 50000              // Large cache for production
    },
    performance: {
      enableMetrics: true,        // Enable for monitoring
      logQueries: false,          // Disable in production
      slowQueryThreshold: 500     // Alert on queries > 500ms
    }
  });

  // Setup Redis search indexes for optimal performance
  await setupProductionIndexes(cache);

  // Performance monitoring example
  const performanceMonitor = new SearchPerformanceMonitor(search);
  await performanceMonitor.runDiagnostics();

  return search;
}

// Example: Custom Redis indexes for high performance
async function setupProductionIndexes(cache: RedisProvider) {
  console.log('⚡ Setting up Redis search indexes...');

  try {
    // Books index with full-text search and filtering
    await cache.createSearchIndex({
      indexName: 'idx:books',
      prefix: 'book:',
      schema: {
        title: 'TEXT WEIGHT 5.0 SORTABLE',           // Higher weight for title matches
        author: 'TEXT WEIGHT 3.0 SORTABLE',         // Medium weight for author
        description: 'TEXT WEIGHT 1.0',             // Lower weight for description
        category: 'TAG SORTABLE',                    // Exact match filtering
        language: 'TAG SORTABLE',                    // Language filtering
        visibility: 'TAG',                           // Visibility filtering
        tags: 'TAG SEPARATOR |',                     // Multi-value tags
        isbn: 'TEXT NOSTEM',                         // Exact ISBN search
        uploaded_at: 'NUMERIC SORTABLE',             // Date sorting
        view_count: 'NUMERIC SORTABLE',              // Popularity sorting
        rating: 'NUMERIC SORTABLE'                   // Rating sorting
      }
    });

    // Users index with profile search
    await cache.createSearchIndex({
      indexName: 'idx:users',
      prefix: 'user:',
      schema: {
        full_name: 'TEXT WEIGHT 5.0 SORTABLE',
        username: 'TEXT WEIGHT 4.0 SORTABLE',
        bio: 'TEXT WEIGHT 2.0',
        skills: 'TAG SEPARATOR ,',
        location: 'TAG SORTABLE',
        created_at: 'NUMERIC SORTABLE',
        reputation: 'NUMERIC SORTABLE'
      }
    });

    // Q&A index for knowledge base search
    await cache.createSearchIndex({
      indexName: 'idx:qa',
      prefix: 'qa:',
      schema: {
        question: 'TEXT WEIGHT 4.0',
        answer: 'TEXT WEIGHT 2.0',
        title: 'TEXT WEIGHT 3.0',
        category: 'TAG SORTABLE',
        tags: 'TAG SEPARATOR ,',
        view_count: 'NUMERIC SORTABLE',
        created_at: 'NUMERIC SORTABLE'
      }
    });

    console.log('✅ Redis indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create Redis indexes:', error);
  }
}

// Example: Performance monitoring and alerting
class SearchPerformanceMonitor {
  constructor(private search: SmartSearch) {}

  async runDiagnostics() {
    console.log('🔍 Running performance diagnostics...');

    const diagnostics = {
      healthCheck: await this.checkProviderHealth(),
      performanceTest: await this.runPerformanceTest(),
      loadTest: await this.runLoadTest(),
      circuitBreakerTest: await this.testCircuitBreaker()
    };

    console.log('📊 Diagnostics Results:', diagnostics);
    return diagnostics;
  }

  private async checkProviderHealth() {
    const stats = await this.search.getSearchStats();
    
    return {
      cacheHealthy: stats.cacheHealth?.isConnected && stats.cacheHealth?.isSearchAvailable,
      cacheLatency: stats.cacheHealth?.latency,
      databaseHealthy: stats.databaseHealth.isConnected && stats.databaseHealth.isSearchAvailable,
      databaseLatency: stats.databaseHealth.latency,
      recommendedStrategy: stats.recommendedStrategy.primary
    };
  }

  private async runPerformanceTest() {
    const testQueries = [
      'javascript programming',
      'react development',
      'database optimization',
      'machine learning',
      'web development'
    ];

    const results = [];
    
    for (const query of testQueries) {
      const startTime = Date.now();
      const result = await this.search.search(query, { limit: 20 });
      const endTime = Date.now();
      
      results.push({
        query,
        searchTime: result.performance.searchTime,
        totalTime: endTime - startTime,
        resultCount: result.results.length,
        strategy: result.performance.strategy,
        cacheHit: result.performance.cacheHit
      });
    }

    const avgSearchTime = results.reduce((sum, r) => sum + r.searchTime, 0) / results.length;
    const cacheHitRate = results.filter(r => r.cacheHit).length / results.length;

    return {
      averageSearchTime: avgSearchTime,
      cacheHitRate,
      results
    };
  }

  private async runLoadTest() {
    const concurrentSearches = 10;
    const searchesPerConcurrent = 5;
    
    const loadTestPromises = Array.from({ length: concurrentSearches }, async (_, i) => {
      const results = [];
      
      for (let j = 0; j < searchesPerConcurrent; j++) {
        const result = await this.search.search(`load test ${i}-${j}`, { limit: 10 });
        results.push({
          searchTime: result.performance.searchTime,
          strategy: result.performance.strategy
        });
      }
      
      return results;
    });

    const allResults = (await Promise.all(loadTestPromises)).flat();
    
    return {
      totalSearches: allResults.length,
      averageTime: allResults.reduce((sum, r) => sum + r.searchTime, 0) / allResults.length,
      maxTime: Math.max(...allResults.map(r => r.searchTime)),
      minTime: Math.min(...allResults.map(r => r.searchTime))
    };
  }

  private async testCircuitBreaker() {
    // This would require intentionally failing the cache to test circuit breaker
    // In a real scenario, you might want to have a test mode for this
    const stats = await this.search.getSearchStats();
    
    return {
      circuitBreakerOpen: stats.circuitBreaker.isOpen,
      failureCount: stats.circuitBreaker.failureCount,
      lastFailure: stats.circuitBreaker.lastFailure,
      nextRetryTime: stats.circuitBreaker.nextRetryTime
    };
  }
}

// Example: Multi-database configuration
async function multiDatabaseExample() {
  console.log('🗃️ Multi-database Configuration Example');

  // Primary database (Supabase)
  const primaryDatabase = new SupabaseProvider(
    {
      url: process.env.SUPABASE_URL!,
      key: process.env.SUPABASE_ANON_KEY!
    },
    {
      tables: {
        books: {
          columns: { id: 'id', title: 'title', description: 'description' },
          searchColumns: ['title', 'description'],
          type: 'book'
        }
      }
    }
  );

  // Search service for primary data
  const primarySearch = new SmartSearch({
    database: primaryDatabase,
    fallback: 'database'
  });

  // You could also setup secondary databases for different data types
  // const analyticsDatabase = new MySQLProvider(...);
  // const logsDatabase = new MongoDBProvider(...);

  return { primarySearch };
}

// Example: Custom search result aggregation
async function aggregatedSearchExample() {
  console.log('📊 Aggregated Search Example');

  const database = new SupabaseProvider(
    {
      url: process.env.SUPABASE_URL!,
      key: process.env.SUPABASE_ANON_KEY!
    },
    {
      tables: {
        books: {
          columns: {
            id: 'id',
            title: 'title',
            author: 'author',
            category: 'category',
            createdAt: 'uploaded_at'
          },
          searchColumns: ['title', 'author'],
          type: 'book'
        }
      }
    }
  );

  const search = new SmartSearch({
    database,
    fallback: 'database'
  });

  // Search with aggregation
  const result = await search.search('programming', { limit: 100 });

  // Aggregate results by category
  const categoryStats = result.results.reduce((acc, item) => {
    const category = item.category || 'uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Aggregate by match type
  const matchTypeStats = result.results.reduce((acc, item) => {
    acc[item.matchType] = (acc[item.matchType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Search Results Aggregation:');
  console.log('By Category:', categoryStats);
  console.log('By Match Type:', matchTypeStats);
  console.log('Performance:', {
    totalResults: result.results.length,
    searchTime: result.performance.searchTime,
    strategy: result.performance.strategy
  });

  return { categoryStats, matchTypeStats };
}

// Example: A/B testing different configurations
async function abTestingExample() {
  console.log('🧪 A/B Testing Configuration Example');

  const baseConfig = {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_ANON_KEY!
  };

  const searchConfig = {
    tables: {
      books: {
        columns: { id: 'id', title: 'title', description: 'description' },
        searchColumns: ['title', 'description'],
        type: 'book'
      }
    }
  };

  // Configuration A: Cache-first with aggressive caching
  const searchA = new SmartSearch({
    database: new SupabaseProvider(baseConfig, searchConfig),
    cache: new RedisProvider({ url: process.env.REDIS_URL! }),
    fallback: 'database',
    cache: {
      enabled: true,
      defaultTTL: 900000  // 15 minutes
    }
  });

  // Configuration B: Database-first with minimal caching
  const searchB = new SmartSearch({
    database: new SupabaseProvider(baseConfig, searchConfig),
    cache: new RedisProvider({ url: process.env.REDIS_URL! }),
    fallback: 'cache',
    cache: {
      enabled: true,
      defaultTTL: 60000   // 1 minute
    }
  });

  // Run A/B test
  const testQuery = 'javascript programming';
  const iterations = 10;

  const resultsA = [];
  const resultsB = [];

  for (let i = 0; i < iterations; i++) {
    const [resultA, resultB] = await Promise.all([
      searchA.search(testQuery),
      searchB.search(testQuery)
    ]);

    resultsA.push(resultA.performance.searchTime);
    resultsB.push(resultB.performance.searchTime);
  }

  const avgA = resultsA.reduce((sum, time) => sum + time, 0) / resultsA.length;
  const avgB = resultsB.reduce((sum, time) => sum + time, 0) / resultsB.length;

  console.log('A/B Test Results:');
  console.log(`Configuration A (Cache-first): ${avgA.toFixed(2)}ms average`);
  console.log(`Configuration B (Database-first): ${avgB.toFixed(2)}ms average`);
  console.log(`Winner: ${avgA < avgB ? 'A (Cache-first)' : 'B (Database-first)'} by ${Math.abs(avgA - avgB).toFixed(2)}ms`);

  return { avgA, avgB, winner: avgA < avgB ? 'A' : 'B' };
}

// Run advanced examples
async function runAdvancedExamples() {
  console.log('🌟 @samas/smart-search Advanced Examples');
  console.log('Support this project: https://github.com/sponsors/bilgrami');
  console.log('=============================================\n');

  try {
    const productionSearch = await productionConfigExample();
    await multiDatabaseExample();
    await aggregatedSearchExample();
    await abTestingExample();

    console.log('\n✅ All advanced examples completed successfully!');
    return productionSearch;
  } catch (error) {
    console.error('❌ Advanced examples failed:', error);
    throw error;
  }
}

// Export for use in other files
export {
  productionConfigExample,
  setupProductionIndexes,
  SearchPerformanceMonitor,
  multiDatabaseExample,
  aggregatedSearchExample,
  abTestingExample
};

// Run if this file is executed directly
if (require.main === module) {
  runAdvancedExamples().catch(console.error);
}