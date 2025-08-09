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
import { DataGovernanceService, SecurityContext, DataGovernanceConfig } from './security/DataGovernance';
import { CircuitBreakerManager } from './strategies/CircuitBreaker';
import { 
  SearchError, 
  ErrorHandler, 
  SearchTimeoutError,
  SecurityAccessDeniedError 
} from './errors/SearchErrors';

interface EnhancedSmartSearchConfig extends SmartSearchConfig {
  dataGovernance?: DataGovernanceConfig;
  hybridSearch?: {
    enabled: boolean;
    cacheWeight: number; // 0-1
    databaseWeight: number; // 0-1
    mergingAlgorithm: 'union' | 'intersection' | 'weighted';
  };
}

export class SmartSearch {
  private database: DatabaseProvider;
  private cache?: CacheProvider;
  private dataGovernance?: DataGovernanceService;
  private circuitBreakerManager: CircuitBreakerManager;
  
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
  
  // Enterprise features
  private readonly hybridSearchEnabled: boolean;
  private readonly hybridSearchConfig: {
    cacheWeight: number;
    databaseWeight: number;
    mergingAlgorithm: 'union' | 'intersection' | 'weighted';
  };

  constructor(config: EnhancedSmartSearchConfig) {
    this.database = config.database;
    if (config.cache) {
      this.cache = config.cache;
      // Initialize cache connection and create search indexes
      this.initializeCacheConnection();
    }
    
    // Initialize enterprise features
    if (config.dataGovernance) {
      this.dataGovernance = new DataGovernanceService(config.dataGovernance);
    }
    
    this.circuitBreakerManager = new CircuitBreakerManager({
      failureThreshold: config.circuitBreaker?.failureThreshold ?? 5,
      recoveryTimeout: config.circuitBreaker?.recoveryTimeout ?? 60000,
      healthCheckTimeout: config.circuitBreaker?.healthCacheTTL ?? 5000,
    });
    
    // Circuit breaker configuration (legacy support)
    this.FAILURE_THRESHOLD = config.circuitBreaker?.failureThreshold ?? 3;
    this.RECOVERY_TIMEOUT = config.circuitBreaker?.recoveryTimeout ?? 60000;
    this.HEALTH_CACHE_TTL = config.circuitBreaker?.healthCacheTTL ?? 30000;
    
    // Performance configuration
    this.enableMetrics = config.performance?.enableMetrics ?? true;
    this.logQueries = config.performance?.logQueries ?? false;
    this.slowQueryThreshold = config.performance?.slowQueryThreshold ?? 1000;
    
    // Cache configuration
    this.cacheEnabled = config.cacheConfig?.enabled ?? true;
    this.defaultCacheTTL = config.cacheConfig?.defaultTTL ?? 300000; // 5 minutes
    
    // Hybrid search configuration
    this.hybridSearchEnabled = config.hybridSearch?.enabled ?? false;
    this.hybridSearchConfig = {
      cacheWeight: config.hybridSearch?.cacheWeight ?? 0.7,
      databaseWeight: config.hybridSearch?.databaseWeight ?? 0.3,
      mergingAlgorithm: config.hybridSearch?.mergingAlgorithm ?? 'weighted'
    };

    this.initializeHealthMonitoring();
  }

  /**
   * Enterprise search with data governance and security
   */
  async secureSearch(
    query: string, 
    userContext: SecurityContext,
    options: SearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    performance: SearchPerformance;
    strategy: SearchStrategy;
    auditId: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Apply data governance and security checks
      if (this.dataGovernance) {
        // Apply row-level security to search options
        const tableName = 'default'; // In real implementation, derive from options
        options = await this.dataGovernance.applyRowLevelSecurity(options, tableName, userContext);
      }
      
      // Perform the search
      const searchResult = await this.search(query, options);
      
      // Apply field-level masking to results
      let maskedResults = searchResult.results;
      if (this.dataGovernance) {
        maskedResults = await this.dataGovernance.maskSensitiveFields(
          searchResult.results,
          userContext.userRole,
          userContext
        );
      }
      
      // Audit the search operation
      let auditId = '';
      if (this.dataGovernance) {
        auditId = await this.dataGovernance.auditSearchAccess(
          query,
          userContext,
          maskedResults,
          searchResult.performance.searchTime,
          true
        );
      }
      
      return {
        results: maskedResults,
        performance: searchResult.performance,
        strategy: searchResult.strategy,
        auditId
      };
      
    } catch (error) {
      // Audit the failed search
      let auditId = '';
      if (this.dataGovernance) {
        auditId = await this.dataGovernance.auditSearchAccess(
          query,
          userContext,
          [],
          Math.max(1, Date.now() - startTime),
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      
      throw new Error(
        `Secure search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Hybrid search combining cache and database results
   */
  async hybridSearch(query: string, options: SearchOptions = {}): Promise<{
    results: SearchResult[];
    performance: SearchPerformance;
    strategy: SearchStrategy;
  }> {
    if (!this.hybridSearchEnabled || !this.cache) {
      return this.search(query, options);
    }

    const startTime = Date.now();
    
    try {
      // Execute both searches in parallel
      const [cacheResults, dbResults] = await Promise.allSettled([
        this.searchWithCache(query, options),
        this.searchWithDatabase(query, options)
      ]);

      // Process results
      const cacheSuccess = cacheResults.status === 'fulfilled';
      const dbSuccess = dbResults.status === 'fulfilled';

      let mergedResults: SearchResult[] = [];
      let strategy: SearchStrategy;

      if (cacheSuccess && dbSuccess) {
        // Both succeeded - merge results
        mergedResults = this.mergeSearchResults(
          cacheResults.value,
          dbResults.value,
          this.hybridSearchConfig
        );
        strategy = {
          primary: 'hybrid' as any,
          fallback: 'database',
          reason: `Hybrid search: merged ${cacheResults.value.length} cache + ${dbResults.value.length} database results`
        };
      } else if (cacheSuccess && !dbSuccess) {
        mergedResults = cacheResults.value;
        strategy = {
          primary: 'cache',
          fallback: 'database',
          reason: 'Database failed, using cache results only'
        };
      } else if (!cacheSuccess && dbSuccess) {
        mergedResults = dbResults.value;
        strategy = {
          primary: 'database',
          fallback: 'cache',
          reason: 'Cache failed, using database results only'
        };
      } else {
        throw new Error(
          'Both cache and database searches failed'
        );
      }

      const performance: SearchPerformance = {
        searchTime: Math.max(1, Date.now() - startTime),
        resultCount: mergedResults.length,
        strategy: strategy.primary as any,
        cacheHit: cacheSuccess,
        errors: [
          ...(cacheSuccess ? [] : [`Cache error: ${(cacheResults as PromiseRejectedResult).reason.message}`]),
          ...(dbSuccess ? [] : [`Database error: ${(dbResults as PromiseRejectedResult).reason.message}`])
        ].filter(Boolean)
      };

      return {
        results: mergedResults,
        performance,
        strategy
      };

    } catch (error) {
      throw new Error(
        `Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
            searchTime: Math.max(1, Date.now() - startTime),
            resultCount: results.length,
            strategy: 'cache',
            cacheHit: true
          };
        } else {
          results = await this.searchWithDatabase(query, options);
          performance = {
            searchTime: Math.max(1, Date.now() - startTime),
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
            searchTime: Math.max(1, Date.now() - startTime),
            resultCount: results.length,
            strategy: 'cache',
            cacheHit: true,
            errors: [primaryError instanceof Error ? primaryError.message : 'Unknown primary error']
          };
        } else {
          results = await this.searchWithDatabase(query, options);
          performance = {
            searchTime: Math.max(1, Date.now() - startTime),
            resultCount: results.length,
            strategy: 'database',
            cacheHit: false,
            errors: [primaryError instanceof Error ? primaryError.message : 'Unknown primary error']
          };
        }
      }

      // Cache results if cache is available and enabled (including empty results)
      if (this.cache && this.cacheEnabled && strategy.primary === 'database') {
        try {
          const cacheKey = this.generateCacheKey(query, options);
          // Use shorter TTL for empty results to balance performance vs freshness
          const ttl = results.length > 0 
            ? (options.cacheTTL ?? this.defaultCacheTTL)
            : Math.min(options.cacheTTL ?? this.defaultCacheTTL, 60000); // Max 1 minute for empty results
          
          await this.cache.set(cacheKey, results, ttl);
          
          if (this.logQueries && results.length === 0) {
            console.log(`🔄 Cached empty results for "${query}" (TTL: ${ttl}ms)`);
          }
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
          searchTime: Math.max(1, Date.now() - startTime),
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
    if (health && health.isConnected && health.isSearchAvailable && health.latency !== undefined && health.latency < 1000) {
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
    if (health && health.isConnected && health.latency !== undefined && health.latency > 1000) {
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

    // Generate cache key from query and options
    const cacheKey = this.generateCacheKey(query, options);
    
    try {
      // Try to get results from cache first
      const cachedResults = await this.cache.get(cacheKey);
      if (cachedResults && Array.isArray(cachedResults)) {
        if (this.logQueries) {
          console.log(`✅ Cache hit for query: "${query}"`);
        }
        return cachedResults;
      }

      // If not in cache, search database and cache results
      if (this.logQueries) {
        console.log(`⚠️ Cache miss for query: "${query}", searching database`);
      }
      
      const databaseResults = await this.database.search(query, options);
      
      // Cache the results with TTL
      const ttl = this.defaultCacheTTL; // Use configured TTL
      await this.cache.set(cacheKey, databaseResults, ttl);
      
      if (this.logQueries) {
        console.log(`✅ Cached ${databaseResults.length} results for query: "${query}"`);
      }
      
      return databaseResults;
    } catch (error) {
      console.error('❌ Cache search failed:', error);
      // Don't fall back to database here - let the higher level search() handle fallback strategy
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

  private generateCacheKey(query: string, options: SearchOptions): string {
    // Create a deterministic cache key from query and options
    const normalizedQuery = query.toLowerCase().trim();
    const keyData = {
      q: normalizedQuery,
      filters: options.filters || {},
      sortBy: options.sortBy || 'relevance',
      sortOrder: options.sortOrder || 'desc',
      limit: options.limit || 20,
      offset: options.offset || 0
    };
    
    // Use base64 encoding of JSON for a clean key
    const keyString = JSON.stringify(keyData);
    const keyPrefix = 'search:'; // Default key prefix for cache
    return keyPrefix + Buffer.from(keyString).toString('base64');
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
    if (typeof globalThis !== 'undefined' && 'window' in globalThis && (globalThis as any).window) {
      setInterval(() => {
        this.forceHealthCheck().catch(error => {
          console.warn('⚠️ Periodic health check failed:', error);
        });
      }, this.healthCheckInterval);
    }
  }

  /**
   * Merge search results from cache and database using specified algorithm
   */
  private mergeSearchResults(
    cacheResults: SearchResult[],
    dbResults: SearchResult[],
    config: {
      cacheWeight: number;
      databaseWeight: number;
      mergingAlgorithm: 'union' | 'intersection' | 'weighted';
    }
  ): SearchResult[] {
    switch (config.mergingAlgorithm) {
      case 'union':
        return this.unionMerge(cacheResults, dbResults);
      
      case 'intersection':
        return this.intersectionMerge(cacheResults, dbResults);
      
      case 'weighted':
        return this.weightedMerge(cacheResults, dbResults, config.cacheWeight, config.databaseWeight);
      
      default:
        return this.unionMerge(cacheResults, dbResults);
    }
  }

  private unionMerge(cacheResults: SearchResult[], dbResults: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const merged: SearchResult[] = [];

    // Add cache results first (higher priority)
    for (const result of cacheResults) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }

    // Add database results that aren't already included
    for (const result of dbResults) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }

    // Sort by relevance score
    return merged.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private intersectionMerge(cacheResults: SearchResult[], dbResults: SearchResult[]): SearchResult[] {
    const dbResultsMap = new Map(dbResults.map(r => [r.id, r]));
    const intersection: SearchResult[] = [];

    for (const cacheResult of cacheResults) {
      const dbResult = dbResultsMap.get(cacheResult.id);
      if (dbResult) {
        // Use the result with higher relevance score
        const bestResult = cacheResult.relevanceScore >= dbResult.relevanceScore ? cacheResult : dbResult;
        intersection.push(bestResult);
      }
    }

    return intersection.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private weightedMerge(
    cacheResults: SearchResult[], 
    dbResults: SearchResult[], 
    cacheWeight: number, 
    dbWeight: number
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();

    // Process cache results with weight
    for (const result of cacheResults) {
      const weightedScore = result.relevanceScore * cacheWeight;
      resultMap.set(result.id, {
        ...result,
        relevanceScore: Math.round(weightedScore),
        metadata: {
          ...result.metadata,
          source: 'cache',
          originalScore: result.relevanceScore,
          weightedScore
        }
      });
    }

    // Process database results with weight, merging if already exists
    for (const result of dbResults) {
      const existing = resultMap.get(result.id);
      const weightedScore = result.relevanceScore * dbWeight;

      if (existing) {
        // Combine scores from both sources
        const combinedScore = (existing.metadata?.weightedScore || 0) + weightedScore;
        resultMap.set(result.id, {
          ...existing,
          relevanceScore: Math.round(combinedScore),
          metadata: {
            ...existing.metadata,
            source: 'hybrid',
            cacheScore: existing.metadata?.originalScore,
            databaseScore: result.relevanceScore,
            combinedScore
          }
        });
      } else {
        resultMap.set(result.id, {
          ...result,
          relevanceScore: Math.round(weightedScore),
          metadata: {
            ...result.metadata,
            source: 'database',
            originalScore: result.relevanceScore,
            weightedScore
          }
        });
      }
    }

    return Array.from(resultMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Enhanced search with circuit breaker protection
   */
  private async searchWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.circuitBreakerManager.execute(operationName, operation);
  }

  /**
   * Initialize cache connection and create search indexes
   */
  private initializeCacheConnection(): void {
    if (!this.cache) return;
    
    // Connect to cache asynchronously to create search indexes
    this.cache.connect?.().then(() => {
      if (this.logQueries) {
        console.log('✅ Cache connection and search indexes initialized');
      }
    }).catch((error) => {
      console.warn('⚠️ Cache connection failed, continuing without cache:', error?.message || error);
    });
  }
}