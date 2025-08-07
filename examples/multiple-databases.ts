/**
 * @samas/smart-search - Multiple Database Examples
 * Demonstrates usage with different database and cache combinations
 */

import { SmartSearch, SupabaseProvider, RedisProvider } from '@samas/smart-search';

// Example: Supabase + Redis (Your current stack)
async function supabaseRedisExample() {
  console.log('🟢 Supabase + Redis Example');

  const search = new SmartSearch({
    database: new SupabaseProvider(
      {
        url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
        key: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
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
      }
    ),
    cache: new RedisProvider({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    }),
    fallback: 'database'
  });

  // Setup Redis indexes for your current data structure
  await setupSupabaseIndexes(search);

  const result = await search.search('programming books');
  console.log(`Found ${result.results.length} results in ${result.performance.searchTime}ms`);
  
  return search;
}

async function setupSupabaseIndexes(search: SmartSearch) {
  const cache = (search as any).cache as RedisProvider;
  if (!cache) return;

  try {
    // Books index matching your current schema
    await cache.createSearchIndex({
      indexName: 'idx:books',
      prefix: 'book:',
      schema: {
        title: 'TEXT WEIGHT 5.0 SORTABLE',
        author: 'TEXT WEIGHT 3.0 SORTABLE',
        description: 'TEXT WEIGHT 1.0',
        category: 'TAG SORTABLE',
        language: 'TAG SORTABLE',
        visibility: 'TAG',
        tags: 'TAG SEPARATOR |',
        isbn: 'TEXT NOSTEM',
        uploader_name: 'TEXT',
        uploader_email: 'TEXT',
        thumbnail_path: 'TEXT',
        uploaded_at: 'NUMERIC SORTABLE',
        view_count: 'NUMERIC SORTABLE'
      }
    });

    // Users/Profiles index
    await cache.createSearchIndex({
      indexName: 'idx:users',
      prefix: 'user:',
      schema: {
        username: 'TEXT WEIGHT 4.0 SORTABLE',
        full_name: 'TEXT WEIGHT 5.0 SORTABLE',
        email: 'TEXT',
        bio: 'TEXT WEIGHT 2.0',
        avatar_url: 'TEXT',
        created_at: 'NUMERIC SORTABLE'
      }
    });

    console.log('✅ Supabase indexes created');
  } catch (error) {
    console.error('❌ Index creation failed:', error);
  }
}

// Example: MySQL + Redis
async function mysqlRedisExample() {
  console.log('🔵 MySQL + Redis Example (Mock)');

  // Note: This is a mock example since MySQLProvider would need to be implemented
  // In the real package, you would import MySQLProvider
  
  /*
  const search = new SmartSearch({
    database: new MySQLProvider({
      host: 'localhost',
      user: 'root',
      password: 'password',
      database: 'myapp',
      port: 3306
    }),
    cache: new RedisProvider({
      host: 'localhost',
      port: 6379,
      password: 'redis-password'
    }),
    fallback: 'database'
  });

  const result = await search.search('user profiles');
  console.log(`MySQL+Redis: ${result.results.length} results`);
  */

  console.log('MySQL+Redis configuration example:');
  console.log(`
const search = new SmartSearch({
  database: new MySQLProvider({
    host: 'localhost',
    user: 'root', 
    password: 'password',
    database: 'myapp'
  }),
  cache: new RedisProvider({
    host: 'localhost',
    port: 6379
  }),
  fallback: 'database'
});
  `);
}

// Example: MongoDB + DragonflyDB
async function mongoDbDragonflyExample() {
  console.log('🟡 MongoDB + DragonflyDB Example (Mock)');

  // Note: This is a mock example since these providers would need to be implemented
  
  console.log('MongoDB+DragonflyDB configuration example:');
  console.log(`
const search = new SmartSearch({
  database: new MongoDBProvider({
    uri: 'mongodb://localhost:27017/myapp',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  }),
  cache: new DragonflyProvider({
    host: 'localhost',
    port: 6380,
    protocol: 'redis' // DragonflyDB is Redis-compatible
  }),
  fallback: 'database'
});
  `);
}

// Example: PostgreSQL + Memcached
async function postgresMemcachedExample() {
  console.log('🟠 PostgreSQL + Memcached Example (Mock)');

  console.log('PostgreSQL+Memcached configuration example:');
  console.log(`
const search = new SmartSearch({
  database: new PostgreSQLProvider({
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'postgres',
    password: 'password'
  }),
  cache: new MemcachedProvider({
    servers: ['localhost:11211'],
    options: {
      maxExpiration: 2592000, // 30 days
      namespace: 'search:'
    }
  }),
  fallback: 'database'
});
  `);
}

// Example: Multi-database architecture
async function multiDatabaseArchitecture() {
  console.log('🏗️ Multi-database Architecture Example');

  // Primary search for main content
  const primarySearch = new SmartSearch({
    database: new SupabaseProvider(
      { url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_ANON_KEY! },
      {
        tables: {
          books: {
            columns: { id: 'id', title: 'title', description: 'description' },
            searchColumns: ['title', 'description'],
            type: 'book'
          }
        }
      }
    ),
    cache: new RedisProvider({ url: process.env.REDIS_URL! }),
    fallback: 'database'
  });

  // Analytics search for metrics and logs
  // const analyticsSearch = new SmartSearch({
  //   database: new MySQLProvider({ ... }),
  //   cache: new RedisProvider({ ... }),
  //   fallback: 'database'
  // });

  // Archive search for historical data
  // const archiveSearch = new SmartSearch({
  //   database: new MongoDBProvider({ ... }),
  //   fallback: 'database' // No cache for archive data
  // });

  // Federated search across all systems
  async function federatedSearch(query: string, options = {}) {
    const [primaryResults] = await Promise.allSettled([
      primarySearch.search(query, options),
      // analyticsSearch.search(query, options),
      // archiveSearch.search(query, options)
    ]);

    const allResults = [];
    
    if (primaryResults.status === 'fulfilled') {
      allResults.push(...primaryResults.value.results);
    }

    // Combine and deduplicate results
    const uniqueResults = allResults.reduce((acc, result) => {
      const key = `${result.type}:${result.id}`;
      if (!acc.has(key)) {
        acc.set(key, result);
      }
      return acc;
    }, new Map());

    return Array.from(uniqueResults.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  const results = await federatedSearch('programming');
  console.log(`Federated search: ${results.length} results across all databases`);

  return { primarySearch, federatedSearch };
}

// Example: Environment-specific configurations
async function environmentConfigurations() {
  console.log('🌍 Environment-specific Configurations');

  const getSearchConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'development':
        return {
          database: new SupabaseProvider(
            { url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_ANON_KEY! },
            { tables: {} }
          ),
          fallback: 'database', // No cache in development
          performance: {
            enableMetrics: true,
            logQueries: true,
            slowQueryThreshold: 100
          }
        };

      case 'staging':
        return {
          database: new SupabaseProvider(
            { url: process.env.SUPABASE_STAGING_URL!, key: process.env.SUPABASE_STAGING_KEY! },
            { tables: {} }
          ),
          cache: new RedisProvider({ url: process.env.REDIS_STAGING_URL! }),
          fallback: 'database',
          circuitBreaker: {
            failureThreshold: 2,
            recoveryTimeout: 10000
          },
          performance: {
            enableMetrics: true,
            logQueries: false,
            slowQueryThreshold: 200
          }
        };

      case 'production':
        return {
          database: new SupabaseProvider(
            { url: process.env.SUPABASE_PROD_URL!, key: process.env.SUPABASE_PROD_KEY! },
            { tables: {} }
          ),
          cache: new RedisProvider({ 
            url: process.env.REDIS_PROD_URL!,
            connectTimeout: 10000,
            lazyConnect: true,
            retryDelayOnFailover: 100
          }),
          fallback: 'database',
          circuitBreaker: {
            failureThreshold: 5,
            recoveryTimeout: 30000,
            healthCacheTTL: 10000
          },
          cache: {
            enabled: true,
            defaultTTL: 600000,
            maxSize: 100000
          },
          performance: {
            enableMetrics: true,
            logQueries: false,
            slowQueryThreshold: 500
          }
        };

      default:
        throw new Error(`Unknown environment: ${env}`);
    }
  };

  const config = getSearchConfig();
  const search = new SmartSearch(config);

  console.log(`Configured for ${process.env.NODE_ENV || 'development'} environment`);
  return search;
}

// Example: Database migration and compatibility
async function migrationCompatibilityExample() {
  console.log('🔄 Database Migration & Compatibility Example');

  // Old system (legacy database)
  const legacySearch = new SmartSearch({
    database: new SupabaseProvider(
      { url: process.env.LEGACY_DB_URL!, key: process.env.LEGACY_DB_KEY! },
      {
        tables: {
          old_books: {
            columns: {
              id: 'book_id',
              title: 'book_title',
              description: 'book_desc',
              createdAt: 'created'
            },
            searchColumns: ['book_title', 'book_desc'],
            type: 'book'
          }
        }
      }
    ),
    fallback: 'database'
  });

  // New system (modern database)
  const modernSearch = new SmartSearch({
    database: new SupabaseProvider(
      { url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_ANON_KEY! },
      {
        tables: {
          books: {
            columns: {
              id: 'id',
              title: 'title',
              description: 'description',
              createdAt: 'uploaded_at'
            },
            searchColumns: ['title', 'description'],
            type: 'book'
          }
        }
      }
    ),
    cache: new RedisProvider({ url: process.env.REDIS_URL! }),
    fallback: 'database'
  });

  // Hybrid search during migration period
  async function hybridSearch(query: string, options = {}) {
    const [legacyResults, modernResults] = await Promise.allSettled([
      legacySearch.search(query, options),
      modernSearch.search(query, options)
    ]);

    const allResults = [];
    
    if (legacyResults.status === 'fulfilled') {
      // Mark legacy results
      const marked = legacyResults.value.results.map(r => ({
        ...r,
        metadata: { ...r.metadata, source: 'legacy' }
      }));
      allResults.push(...marked);
    }
    
    if (modernResults.status === 'fulfilled') {
      // Mark modern results
      const marked = modernResults.value.results.map(r => ({
        ...r,
        metadata: { ...r.metadata, source: 'modern' }
      }));
      allResults.push(...marked);
    }

    return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  const results = await hybridSearch('javascript');
  console.log(`Hybrid search: ${results.length} results from both systems`);
  
  const sourceBreakdown = results.reduce((acc, result) => {
    const source = result.metadata?.source || 'unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Results by source:', sourceBreakdown);

  return { legacySearch, modernSearch, hybridSearch };
}

// Run all multiple database examples
async function runMultipleDatabaseExamples() {
  console.log('🌟 @samas/smart-search - Multiple Database Examples');
  console.log('Support this project: https://github.com/sponsors/bilgrami');
  console.log('====================================================\n');

  try {
    await supabaseRedisExample();
    await mysqlRedisExample();
    await mongoDbDragonflyExample();
    await postgresMemcachedExample();
    await multiDatabaseArchitecture();
    await environmentConfigurations();
    await migrationCompatibilityExample();

    console.log('\n✅ All multiple database examples completed!');
  } catch (error) {
    console.error('❌ Multiple database examples failed:', error);
  }
}

// Export for use in other files
export {
  supabaseRedisExample,
  mysqlRedisExample,
  mongoDbDragonflyExample,
  postgresMemcachedExample,
  multiDatabaseArchitecture,
  environmentConfigurations,
  migrationCompatibilityExample
};

// Run if this file is executed directly
if (require.main === module) {
  runMultipleDatabaseExamples().catch(console.error);
}