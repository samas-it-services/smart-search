/**
 * @samas/smart-search - Core Smart Search Class
 * Universal search with intelligent fallback for any database + cache combination
 * 
 * Features:
 * - Automatic cache/database health monitoring
 * - Seamless fallback when cache is unavailable
 * - Performance tracking and analytics
 * - Circuit breaker pattern for cache failures
 * - Intelligent caching strategy
 * - Universal provider system
 */

import {
  SearchResult,
  SearchOptions,
  SearchStrategy,
  SearchPerformance,
  CircuitBreakerState,
  HealthStatus,
  SmartSearchConfig,
  DatabaseProvider,
  CacheProvider
} from './types';

export class SmartSearch {
  private database: DatabaseProvider;
  private cache?: CacheProvider;
  private fallbackStrategy: 'database' | 'cache';
  
  private healthCheckInterval = 30000; // 30 seconds
  private lastHealthCheck = 0;
  private cachedHealthStatus: HealthStatus | null = null;
  
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailure: 0,
    nextRetryTime: 0
  };
  
  // Circuit breaker thresholds
  private readonly FAILURE_THRESHOLD: number;
  private readonly RECOVERY_TIMEOUT: number;
  private readonly HEALTH_CACHE_TTL: number;
  
  // Performance settings
  private readonly enableMetrics: boolean;
  private readonly logQueries: boolean;
  private readonly slowQueryThreshold: number;
  
  // Cache settings
  private readonly cacheEnabled: boolean;
  private readonly defaultCacheTTL: number;

  constructor(config: SmartSearchConfig) {
    this.database = config.database;
    this.cache = config.cache;
    this.fallbackStrategy = config.fallback;
    
    // Circuit breaker configuration
    this.FAILURE_THRESHOLD = config.circuitBreaker?.failureThreshold ?? 3;
    this.RECOVERY_TIMEOUT = config.circuitBreaker?.recoveryTimeout ?? 60000;
    this.HEALTH_CACHE_TTL = config.circuitBreaker?.healthCacheTTL ?? 30000;
    
    // Performance configuration
    this.enableMetrics = config.performance?.enableMetrics ?? true;
    this.logQueries = config.performance?.logQueries ?? false;
    this.slowQueryThreshold = config.performance?.slowQueryThreshold ?? 1000;
    
    // Cache configuration
    this.cacheEnabled = config.cache?.enabled ?? true;
    this.defaultCacheTTL = config.cache?.defaultTTL ?? 300000; // 5 minutes

    this.initializeHealthMonitoring();
  }

  /**
   * Intelligent search with automatic cache/database switching
   */
  async search(query: string, options: SearchOptions = {}): Promise<{
    results: SearchResult[];
    performance: SearchPerformance;
    strategy: SearchStrategy;
  }> {
    const startTime = Date.now();
    
    try {
      // Determine optimal search strategy
      const strategy = await this.determineSearchStrategy();
      
      if (this.logQueries) {
        console.log(`🔍 Using ${strategy.primary} search strategy: ${strategy.reason}`);
      }

      let results: SearchResult[] = [];
      let performance: SearchPerformance;

      // Try primary strategy
      try {
        if (strategy.primary === 'cache' && this.cache) {
          results = await this.searchWithCache(query, options);
          performance = {
            searchTime: Date.now() - startTime,
            resultCount: results.length,
            strategy: 'cache',
            cacheHit: true
          };
        } else {
          results = await this.searchWithDatabase(query, options);
          performance = {
            searchTime: Date.now() - startTime,
            resultCount: results.length,
            strategy: 'database',
            cacheHit: false
          };
        }

        // Reset circuit breaker on success
        if (strategy.primary === 'cache' && this.circuitBreaker.failureCount > 0) {
          this.resetCircuitBreaker();
        }

      } catch (primaryError) {
        console.warn(`⚠️ ${strategy.primary} search failed, falling back to ${strategy.fallback}:`, primaryError);
        
        // Update circuit breaker for cache failures
        if (strategy.primary === 'cache') {
          this.recordCacheFailure();
        }

        // Try fallback strategy
        if (strategy.fallback === 'cache' && this.cache) {
          results = await this.searchWithCache(query, options);
          performance = {
            searchTime: Date.now() - startTime,
            resultCount: results.length,
            strategy: 'cache',
            cacheHit: true,
            errors: [primaryError instanceof Error ? primaryError.message : 'Unknown primary error']
          };
        } else {
          results = await this.searchWithDatabase(query, options);
          performance = {
            searchTime: Date.now() - startTime,
            resultCount: results.length,
            strategy: 'database',
            cacheHit: false,
            errors: [primaryError instanceof Error ? primaryError.message : 'Unknown primary error']
          };
        }
      }

      // Cache results if cache is available and enabled
      if (this.cache && this.cacheEnabled && strategy.primary === 'database' && results.length > 0) {
        try {
          const cacheKey = this.generateCacheKey(query, options);
          await this.cache.set(cacheKey, results, options.cacheTTL ?? this.defaultCacheTTL);
        } catch (cacheError) {
          // Don't fail the search if caching fails
          if (this.logQueries) {
            console.warn('⚠️ Failed to cache search results:', cacheError);
          }
        }
      }

      // Log performance metrics
      if (this.enableMetrics) {
        this.logSearchPerformance(query, performance, strategy);
      }

      return {
        results,
        performance,
        strategy
      };

    } catch (error) {
      // Complete failure - return empty results
      console.error('❌ All search strategies failed:', error);
      
      return {
        results: [],
        performance: {
          searchTime: Date.now() - startTime,
          resultCount: 0,
          strategy: 'database',
          cacheHit: false,
          errors: [error instanceof Error ? error.message : 'Complete search failure']
        },
        strategy: {
          primary: 'database',
          fallback: 'database',
          reason: 'All search methods failed'
        }
      };
    }
  }

  /**
   * Get current cache health status with caching
   */
  async getCacheHealth(): Promise<HealthStatus | null> {
    if (!this.cache) return null;
    
    const now = Date.now();
    
    // Return cached health status if recent
    if (this.cachedHealthStatus && (now - this.lastHealthCheck) < this.HEALTH_CACHE_TTL) {
      return this.cachedHealthStatus;
    }

    try {
      this.cachedHealthStatus = await this.cache.checkHealth();
      this.lastHealthCheck = now;
      
      return this.cachedHealthStatus;
    } catch (error) {
      console.error('❌ Cache health check failed:', error);
      
      // Return cached status or default unhealthy status
      return this.cachedHealthStatus || {
        isConnected: false,
        isSearchAvailable: false,
        latency: -1,
        memoryUsage: '0',
        keyCount: 0,
        lastSync: null,
        errors: ['Health check failed']
      };
    }
  }

  /**
   * Force a cache health check and update cache
   */
  async forceHealthCheck(): Promise<HealthStatus | null> {
    this.lastHealthCheck = 0; // Force refresh
    return this.getCacheHealth();
  }

  /**
   * Get search service statistics
   */
  async getSearchStats(): Promise<{
    cacheHealth: HealthStatus | null;
    databaseHealth: HealthStatus;
    circuitBreaker: CircuitBreakerState;
    recommendedStrategy: SearchStrategy;
  }> {
    const cacheHealth = await this.getCacheHealth();
    const databaseHealth = await this.database.checkHealth();
    const recommendedStrategy = await this.determineSearchStrategy();
    
    return {
      cacheHealth,
      databaseHealth,
      circuitBreaker: { ...this.circuitBreaker },
      recommendedStrategy
    };
  }

  /**
   * Clear cache data
   */
  async clearCache(pattern?: string): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cache.clear(pattern);
      if (this.logQueries) {
        console.log('✅ Cache cleared');
      }
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  // Private methods
  private async determineSearchStrategy(): Promise<SearchStrategy> {
    // If no cache, always use database
    if (!this.cache) {
      return {
        primary: 'database',
        fallback: 'database',
        reason: 'No cache provider configured'
      };
    }

    // Check circuit breaker first
    if (this.isCircuitBreakerOpen()) {
      return {
        primary: 'database',
        fallback: 'database',
        reason: 'Cache circuit breaker is open due to repeated failures'
      };
    }

    const health = await this.getCacheHealth();
    
    // Cache is healthy and search is available
    if (health && health.isConnected && health.isSearchAvailable && health.latency < 1000) {
      return {
        primary: 'cache',
        fallback: 'database',
        reason: `Cache healthy (${health.latency}ms latency, ${health.keyCount} keys)`
      };
    }

    // Cache is connected but search is slow or unavailable
    if (health && health.isConnected && !health.isSearchAvailable) {
      return {
        primary: 'database',
        fallback: 'cache',
        reason: 'Cache connected but search unavailable'
      };
    }

    // Cache has high latency
    if (health && health.isConnected && health.latency > 1000) {
      return {
        primary: 'database',
        fallback: 'cache',
        reason: `Cache high latency (${health.latency}ms)`
      };
    }

    // Cache is completely unavailable
    return {
      primary: 'database',
      fallback: 'database',
      reason: 'Cache unavailable or unhealthy'
    };
  }

  private async searchWithCache(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.cache) {
      throw new Error('Cache provider not configured');
    }

    try {
      return await this.cache.search(query, options);
    } catch (error) {
      console.error('❌ Cache search failed:', error);
      throw error;
    }
  }

  private async searchWithDatabase(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      return await this.database.search(query, options);
    } catch (error) {
      console.error('❌ Database search failed:', error);
      throw error;
    }
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }

    // Check if recovery timeout has passed
    if (Date.now() >= this.circuitBreaker.nextRetryTime) {
      if (this.logQueries) {
        console.log('🔄 Circuit breaker recovery timeout reached, allowing retry...');
      }
      this.circuitBreaker.isOpen = false;
      return false;
    }

    return true;
  }

  private recordCacheFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailure = Date.now();

    if (this.circuitBreaker.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = Date.now() + this.RECOVERY_TIMEOUT;
      
      console.warn(
        `⚡ Cache circuit breaker opened after ${this.circuitBreaker.failureCount} failures. ` +
        `Will retry in ${this.RECOVERY_TIMEOUT / 1000}s`
      );
    }
  }

  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.failureCount > 0) {
      if (this.logQueries) {
        console.log('✅ Cache circuit breaker reset - service recovered');
      }
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.lastFailure = 0;
      this.circuitBreaker.nextRetryTime = 0;
    }
  }

  private generateCacheKey(query: string, options: SearchOptions): string {
    const filterString = options.filters ? JSON.stringify(options.filters) : '';
    const sortString = `${options.sortBy || 'relevance'}_${options.sortOrder || 'desc'}`;
    const limitString = `${options.limit || 20}_${options.offset || 0}`;
    
    return `search:${Buffer.from(`${query}_${filterString}_${sortString}_${limitString}`).toString('base64')}`;
  }

  private logSearchPerformance(
    query: string, 
    performance: SearchPerformance, 
    strategy: SearchStrategy
  ): void {
    const logLevel = performance.errors ? 'warn' : 'log';
    
    if (this.logQueries || performance.searchTime > this.slowQueryThreshold) {
      console[logLevel](
        `🔍 Search "${query}": ${performance.resultCount} results in ${performance.searchTime}ms ` +
        `via ${performance.strategy} (${strategy.reason})`
      );
    }

    // Log slow queries
    if (performance.searchTime > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected: ${performance.searchTime}ms for "${query}"`);
    }
  }

  private initializeHealthMonitoring(): void {
    // Perform initial health check
    if (this.cache) {
      this.getCacheHealth().catch(error => {
        console.warn('⚠️ Initial cache health check failed:', error);
      });
    }

    // Set up periodic health monitoring (only in browser environment)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.forceHealthCheck().catch(error => {
          console.warn('⚠️ Periodic health check failed:', error);
        });
      }, this.healthCheckInterval);
    }
  }
}