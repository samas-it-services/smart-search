/**
 * @samas/smart-search - Supabase Production Configuration Example
 * 
 * This example shows how to configure SmartSearch for production use with Supabase.
 * Includes authentication, RLS, monitoring, and error handling.
 */

import { SmartSearchFactory } from '@samas/smart-search';
import { createClient } from '@supabase/supabase-js';

// Environment configuration
const config = {
  database: {
    type: 'supabase',
    connection: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY,
    },
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-App-Name': 'smart-search-production'
        }
      }
    }
  },
  cache: {
    type: 'redis',
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      // Production optimizations
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      lazyConnect: true
    }
  },
  search: {
    tables: {
      // Example: Articles table
      articles: {
        columns: {
          id: 'id',
          title: 'title',
          description: 'content',
          category: 'category',
          language: 'language',
          createdAt: 'created_at',
          visibility: 'visibility'
        },
        searchColumns: ['title', 'content', 'excerpt', 'tags'],
        type: 'article'
      },
      // Example: Products table
      products: {
        columns: {
          id: 'id',
          title: 'name',
          description: 'description',
          category: 'category_name',
          createdAt: 'created_at'
        },
        searchColumns: ['name', 'description', 'brand', 'tags'],
        type: 'product'
      }
    }
  },
  // Production circuit breaker settings
  circuitBreaker: {
    failureThreshold: 5,        // Open after 5 consecutive failures
    recoveryTimeout: 60000,     // Try recovery after 1 minute
    healthCacheMs: 15000        // Cache health status for 15 seconds
  },
  // Cache configuration
  cacheConfig: {
    enabled: true,
    defaultTTL: 300000,         // 5 minutes
    maxKeys: 50000              // Maximum cached search results
  },
  // Performance monitoring
  performance: {
    enableMetrics: true,
    logQueries: process.env.NODE_ENV === 'development',
    slowQueryThreshold: 1000    // Log queries slower than 1 second
  }
};

class ProductionSmartSearch {
  constructor() {
    this.smartSearch = null;
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing SmartSearch for production...');
      
      // Validate environment variables
      this.validateEnvironment();
      
      // Create SmartSearch instance
      this.smartSearch = SmartSearchFactory.fromConfig(config);
      
      // Connect with retry logic
      await this.connectWithRetry();
      
      // Setup monitoring
      this.setupMonitoring();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      this.isInitialized = true;
      console.log('✅ SmartSearch initialized successfully');
      
      return this.smartSearch;
      
    } catch (error) {
      console.error('❌ Failed to initialize SmartSearch:', error);
      throw error;
    }
  }

  validateEnvironment() {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'REDIS_HOST'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async connectWithRetry() {
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.smartSearch.connect();
        this.reconnectAttempts = 0; // Reset on successful connection
        return;
      } catch (error) {
        this.reconnectAttempts++;
        console.warn(`Connection attempt ${this.reconnectAttempts} failed:`, error.message);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  setupMonitoring() {
    // Periodic health checks
    setInterval(async () => {
      try {
        const stats = await this.smartSearch.getSearchStats();
        
        // Log metrics for monitoring systems
        console.log('📊 Health Check:', {
          database: {
            connected: stats.databaseHealth?.isConnected,
            latency: stats.databaseHealth?.latency
          },
          cache: {
            connected: stats.cacheHealth?.isConnected,
            hitRate: stats.cacheHealth?.hitRate,
            memoryUsage: stats.cacheHealth?.memoryUsage
          },
          circuitBreaker: {
            state: stats.circuitBreaker?.state
          }
        });
        
        // Alert on issues
        if (!stats.databaseHealth?.isConnected) {
          console.error('🚨 Database connection lost');
        }
        
        if (!stats.cacheHealth?.isConnected) {
          console.warn('⚠️ Cache connection lost');
        }
        
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`🔄 Received ${signal}, shutting down gracefully...`);
      
      if (this.smartSearch) {
        try {
          await this.smartSearch.disconnect();
          console.log('✅ SmartSearch disconnected');
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
        }
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  // Production search method with error handling and logging
  async search(query, options = {}) {
    if (!this.isInitialized) {
      throw new Error('SmartSearch not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Add default options
      const searchOptions = {
        limit: 20,
        strategy: 'cache-first',
        ...options
      };

      const result = await this.smartSearch.search(query, searchOptions);
      
      const duration = Date.now() - startTime;
      
      // Log search performance
      if (duration > 1000) {
        console.warn(`🐌 Slow search query: "${query}" took ${duration}ms`);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log search errors
      console.error('🔍 Search failed:', {
        query,
        duration,
        error: error.message,
        options
      });
      
      throw error;
    }
  }

  // Health check endpoint for load balancers
  async healthCheck() {
    if (!this.isInitialized) {
      return {
        status: 'unhealthy',
        reason: 'Not initialized'
      };
    }

    try {
      const stats = await this.smartSearch.getSearchStats();
      
      return {
        status: 'healthy',
        database: stats.databaseHealth?.isConnected ? 'connected' : 'disconnected',
        cache: stats.cacheHealth?.isConnected ? 'connected' : 'disconnected',
        circuitBreaker: stats.circuitBreaker?.state || 'unknown',
        uptime: process.uptime()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        reason: error.message
      };
    }
  }
}

// Export for use in your application
export default ProductionSmartSearch;

// Usage example:
async function example() {
  const searchService = new ProductionSmartSearch();
  await searchService.initialize();
  
  // Perform searches
  const results = await searchService.search('artificial intelligence', {
    filters: {
      category: ['technology', 'research'],
      language: ['en']
    },
    limit: 10
  });
  
  console.log(`Found ${results.results.length} results`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error);
}