/**
 * @samas/smart-search - Basic Usage Example
 * Demonstrates fundamental search functionality using configuration files
 */

import { SmartSearchFactory } from '@samas/smart-search';

// Example 1: Using configuration file
async function basicConfigFileExample() {
  console.log('🚀 @samas/smart-search - Basic Configuration File Example');
  
  // Load from configuration file (smart-search.config.json or .yaml)
  // The factory will automatically look for config files in common locations:
  // - smart-search.config.yaml/yml
  // - smart-search.config.json
  // - config/smart-search.yaml
  // - .smart-search.yaml
  const search = SmartSearchFactory.fromConfig();

  return search;
}

// Example 2: Using specific configuration file path
async function specificConfigExample() {
  console.log('📁 Using specific configuration file');
  
  // Load from specific config file path
  const search = SmartSearchFactory.fromConfig('./my-custom-config.json');
  
  return search;
}

// Example 3: Using environment variables only
async function environmentVariablesExample() {
  console.log('🌍 Using environment variables');
  
  // This will load configuration from environment variables:
  // SUPABASE_URL, SUPABASE_ANON_KEY, REDIS_URL, etc.
  const search = SmartSearchFactory.fromEnvironment();
  
  return search;
}

// Example 4: Using configuration object (for dynamic configuration)
async function configObjectExample() {
  console.log('⚙️ Using configuration object');
  
  const config = {
    database: {
      type: 'supabase' as const,
      connection: {
        url: process.env.SUPABASE_URL!,
        key: process.env.SUPABASE_ANON_KEY!
      }
    },
    cache: {
      type: 'redis' as const,
      connection: {
        url: process.env.REDIS_URL!
      }
    },
    search: {
      fallback: 'database' as const,
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
        users: {
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
    }
  };
  
  const search = SmartSearchFactory.fromConfigObject(config);
  return search;
}

// Main example function demonstrating search functionality
async function demonstrateSearchFunctionality() {
  console.log('🔍 Demonstrating search functionality...');
  
  // Use config file approach (recommended)
  const search = SmartSearchFactory.fromConfig();

  try {
    // 1. Basic search
    console.log('\n📖 Basic Search:');
    const basicResult = await search.search('javascript programming');
    console.log(`Found ${basicResult.results.length} results in ${basicResult.performance.searchTime}ms`);
    console.log(`Strategy: ${basicResult.strategy.primary} (${basicResult.strategy.reason})`);
    
    basicResult.results.slice(0, 3).forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.title} (${result.type}) - Score: ${result.relevanceScore}`);
    });

    // 2. Search with filters
    console.log('\n🔍 Filtered Search:');
    const filteredResult = await search.search('web development', {
      limit: 10,
      filters: {
        type: ['book'],
        category: ['programming', 'technology'],
        language: ['en']
      },
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
    console.log(`Filtered results: ${filteredResult.results.length}`);

    // 3. Search with date range
    console.log('\n📅 Date Range Search:');
    const dateRangeResult = await search.search('react', {
      filters: {
        type: ['book'],
        dateRange: {
          start: '2023-01-01',
          end: '2024-12-31'
        }
      }
    });
    console.log(`Date range results: ${dateRangeResult.results.length}`);

    // 4. Multi-type search
    console.log('\n🔄 Multi-type Search:');
    const multiTypeResult = await search.search('programming', {
      filters: {
        type: ['book', 'user', 'book_club']
      },
      limit: 15
    });
    
    const typeCount = multiTypeResult.results.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Results by type:', typeCount);

    // 5. Performance monitoring
    console.log('\n📊 Performance Stats:');
    const stats = await search.getSearchStats();
    console.log('Cache Health:', {
      connected: stats.cacheHealth?.isConnected,
      searchAvailable: stats.cacheHealth?.isSearchAvailable,
      latency: `${stats.cacheHealth?.latency}ms`,
      memoryUsage: stats.cacheHealth?.memoryUsage
    });
    
    console.log('Database Health:', {
      connected: stats.databaseHealth.isConnected,
      searchAvailable: stats.databaseHealth.isSearchAvailable,
      latency: `${stats.databaseHealth.latency}ms`
    });

    console.log('Recommended Strategy:', stats.recommendedStrategy.primary);

  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

// Example: Database-only setup (no cache)
async function databaseOnlyExample() {
  console.log('\n🗄️ Database-only Example:');

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
            subtitle: 'author',
            description: 'description'
          },
          searchColumns: ['title', 'author', 'description'],
          type: 'book'
        }
      }
    }
  );

  const search = new SmartSearch({
    database,
    fallback: 'database'
  });

  const result = await search.search('science fiction');
  console.log(`Database-only search: ${result.results.length} results in ${result.performance.searchTime}ms`);
}

// Example: Error handling and resilience
async function errorHandlingExample() {
  console.log('\n⚠️ Error Handling Example:');

  const database = new SupabaseProvider(
    { url: 'invalid-url', key: 'invalid-key' },
    { tables: {} }
  );

  const cache = new RedisProvider({
    host: 'invalid-host',
    port: 9999
  });

  const search = new SmartSearch({
    database,
    cache,
    fallback: 'database',
    circuitBreaker: {
      failureThreshold: 1,
      recoveryTimeout: 5000
    }
  });

  try {
    const result = await search.search('test query');
    console.log('Search completed despite errors:', {
      resultCount: result.results.length,
      errors: result.performance.errors,
      strategy: result.strategy.reason
    });
  } catch (error) {
    console.error('Search failed completely:', error.message);
  }
}

// Example: Cache management
async function cacheManagementExample() {
  console.log('\n🧹 Cache Management Example:');

  const database = new SupabaseProvider(
    {
      url: process.env.SUPABASE_URL!,
      key: process.env.SUPABASE_ANON_KEY!
    },
    { tables: {} }
  );

  const cache = new RedisProvider({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  const search = new SmartSearch({
    database,
    cache,
    fallback: 'database'
  });

  try {
    // Perform some searches to populate cache
    await search.search('javascript');
    await search.search('python');
    await search.search('react');

    console.log('Cache populated with search results');

    // Clear specific cache pattern
    await search.clearCache('search:');
    console.log('Cleared search cache');

    // Force health check
    const health = await search.forceHealthCheck();
    console.log('Cache health after clear:', {
      connected: health?.isConnected,
      keyCount: health?.keyCount
    });

  } catch (error) {
    console.error('Cache management failed:', error.message);
  }
}

// Run examples
async function runExamples() {
  console.log('🌟 @samas/smart-search Examples');
  console.log('Support this project: https://github.com/sponsors/bilgrami');
  console.log('=====================================\n');

  try {
    await basicUsageExample();
    await databaseOnlyExample();
    await errorHandlingExample();
    await cacheManagementExample();
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export for use in other files
export {
  basicUsageExample,
  databaseOnlyExample,
  errorHandlingExample,
  cacheManagementExample
};

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}