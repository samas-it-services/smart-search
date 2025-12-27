/**
 * @samas/smart-search - Direct Redis Cache Provider
 * Direct Redis integration for @samas/smart-search with optimized performance
 * 
 * This provider connects directly to Redis servers bypassing edge functions
 * for optimal performance with sub-10ms response times.
 */

import Redis from 'ioredis';
import {
  CacheProvider,
  SearchResult,
  SearchOptions,
  HealthStatus,
  CircuitBreakerState
} from '../types';
import { CircuitBreakerManager } from '../strategies/CircuitBreaker';

export interface DirectRedisConfig {
  host?: string;              // Redis host (default: localhost)
  port?: number;              // Redis port (default: 6379)
  password?: string;          // Redis password
  username?: string;          // Redis ACL username
  apiKey?: string;            // For API key authentication (Redis Cloud, Upstash, etc.)
  db?: number;                // Redis database number
  url?: string;               // Redis connection URL
  connectTimeout?: number;    // Connection timeout (default: 10000ms)
  lazyConnect?: boolean;      // Lazy connection (default: true)
  retryDelayOnFailover?: number;  // Failover retry delay (default: 100ms)
  maxRetriesPerRequest?: number;   // Max retries (default: 3)
  tls?: boolean | object;     // TLS configuration
  // Performance options
  keepAlive?: number;         // Keep alive interval (default: 30000ms)
  maxConnections?: number;    // Maximum connections in pool (default: 10)
  minConnections?: number;    // Minimum connections in pool (default: 2)
  connectionTimeout?: number; // Connection timeout (default: 10000ms)
  commandTimeout?: number;    // Command timeout (default: 5000ms)
}

export class DirectRedisProvider implements CacheProvider {
  name = 'DirectRedis';
  private redis: Redis;
  private isConnectedFlag = false;
  private config: DirectRedisConfig;
  private searchIndexes: Map<string, string> = new Map(); // Store index names
  private circuitBreakerManager: CircuitBreakerManager;

  constructor(config: DirectRedisConfig) {
    this.config = {
      // Set default values
      host: 'localhost',
      port: 6379,
      maxConnections: 10,
      minConnections: 2,
      connectionTimeout: 10000,
      commandTimeout: 5000,
      ...config
    };

    // Initialize circuit breaker manager with configuration
    this.circuitBreakerManager = new CircuitBreakerManager({
      failureThreshold: config.maxRetriesPerRequest || 3,
      recoveryTimeout: config.retryDelayOnFailover ? config.retryDelayOnFailover * 1000 : 60000,
      healthCacheTTL: 30000
    });

    // Initialize Redis client with direct connection configuration
    const redisConfig = this.buildRedisConfig(this.config);

    try {
      this.redis = new Redis(redisConfig);

      // Add error handler to prevent unhandled errors
      this.redis.on('error', (error) => {
        console.error('❌ Direct Redis client error:', error.message);
        this.isConnectedFlag = false;
        // Record failure in circuit breaker
        this.circuitBreakerManager.recordFailure();
      });

      // Add ready handler
      this.redis.on('ready', () => {
        console.log('🔗 Direct Redis client ready');
        this.isConnectedFlag = true;

        // Initialize search indexes if available
        this.initializeSearchIndexes();
        // Reset circuit breaker on successful connection
        this.circuitBreakerManager.reset();
      });

      // Add connect handler
      this.redis.on('connect', () => {
        console.log('🔌 Direct Redis client connected');
      });

      // Add disconnect handler
      this.redis.on('close', () => {
        console.log('📴 Direct Redis client disconnected');
        this.isConnectedFlag = false;
      });

    } catch (error) {
      console.error('❌ Failed to create Direct Redis client:', error);
      this.redis = null as any; // Set to null to handle gracefully
      this.isConnectedFlag = false;
      // Record failure in circuit breaker
      this.circuitBreakerManager.recordFailure();
    }
  }

  /**
   * Build Redis configuration with support for different authentication methods
   */
  private buildRedisConfig(config: DirectRedisConfig): any {
    const redisConfig: any = {
      connectTimeout: config.connectionTimeout || 10000,
      lazyConnect: config.lazyConnect !== undefined ? config.lazyConnect : true, // Default to true for better error handling
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      retryOnFailover: true, // Enable retries
      maxRetriesOnFailover: 5,
      keepAlive: config.keepAlive || 30000, // Keep connection alive
      autoResubscribe: true, // Auto resubscribe on disconnect
      autoResendUnfulfilledCommands: true, // Resend unfulfilled commands
      maxLoadingTimeout: 10000, // Timeout for loading Lua scripts
      enableReadyCheck: true, // Perform ready check
      lazyConnect: config.lazyConnect !== false, // Allow lazy connection
    };

    // Handle different connection methods
    if (config.url) {
      // URL-based connection (supports redis://, rediss://, and API key URLs)
      redisConfig.port = undefined; // Don't set port if using URL
      redisConfig.host = undefined; // Don't set host if using URL
      redisConfig.path = undefined; // Don't set path if using URL
      redisConfig.db = undefined;   // Don't set db if using URL
      
      // Extract auth info from URL if present
      try {
        const urlObj = new URL(config.url);
        if (urlObj.username) redisConfig.username = urlObj.username;
        if (urlObj.password) redisConfig.password = urlObj.password;
      } catch (e) {
        // URL parsing failed, continue with basic URL config
      }
    } else {
      // Host/port configuration
      redisConfig.host = config.host || 'localhost';
      redisConfig.port = config.port || 6379;
      
      // Authentication
      if (config.username) redisConfig.username = config.username;
      if (config.password) redisConfig.password = config.password;
      if (config.db !== undefined) redisConfig.db = config.db;
    }

    // TLS configuration
    if (config.tls) {
      redisConfig.tls = typeof config.tls === 'object' ? config.tls : {};
    }

    return redisConfig;
  }

  /**
   * Initialize search indexes - create if they don't exist
   */
  private async initializeSearchIndexes(): Promise<void> {
    try {
      // Check if the books index exists
      const booksIndexExists = await this.indexExists('idx:books');
      if (!booksIndexExists) {
        // Create the books index if it doesn't exist
        await this.createBooksIndex();
      }
      
      this.searchIndexes.set('books', 'idx:books');
      console.log('✅ Direct Redis search indexes initialized');
    } catch (error) {
      console.error('⚠️ Could not initialize search indexes:', error);
      // Continue without indexes - search may be limited
    }
  }

  /**
   * Check if a RediSearch index exists
   */
  private async indexExists(indexName: string): Promise<boolean> {
    try {
      await this.redis.call('FT.INFO', [indexName]);
      return true;
    } catch (error) {
      // Index doesn't exist or RediSearch module not loaded
      return false;
    }
  }

  /**
   * Create the books index for search functionality
   */
  private async createBooksIndex(): Promise<void> {
    try {
      // Create a search index for books with common fields
      await this.redis.call('FT.CREATE', [
        'idx:books',
        'ON', 'HASH',
        'PREFIX', '1', 'book:',
        'SCHEMA',
        'title', 'TEXT', 'WEIGHT', '1.0',
        'author', 'TEXT', 'WEIGHT', '1.0',
        'description', 'TEXT', 'WEIGHT', '0.5',
        'category', 'TAG',
        'language', 'TAG',
        'visibility', 'TAG',
        'uploader_name', 'TEXT', 'WEIGHT', '0.8',
        'isbn', 'TAG'
      ]);
      console.log('✅ Books search index created');
    } catch (error) {
      console.error('⚠️ Could not create books index:', error);
      // Continue without the index - search will fall back to KEYS or other methods
    }
  }

  /**
   * Connect to Redis - usually handled automatically by ioredis
   */
  async connect(): Promise<void> {
    if (this.redis && !this.isConnectedFlag) {
      try {
        // ioredis handles connection automatically, but we can force a test
        await this.redis.ping();
        this.isConnectedFlag = true;
      } catch (error) {
        console.error('❌ Direct Redis connection failed:', error);
        this.isConnectedFlag = false;
        throw error;
      }
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isConnectedFlag = false;
    }
  }

  /**
   * Check if connected to Redis
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.redis) return false;
      
      // Check if we can ping Redis
      await this.redis.ping();
      return true;
    } catch (error) {
      this.isConnectedFlag = false;
      return false;
    }
  }

  /**
   * Perform search using direct Redis connection
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.redis) {
      throw new Error('DirectRedisProvider not initialized');
    }

    // Check if circuit breaker is open before proceeding
    if (this.circuitBreakerManager.isCircuitBreakerOpen()) {
      console.warn('⚠️ Circuit breaker is open, returning empty results');
      return [];
    }

    if (!this.isConnectedFlag) {
      await this.connect();
    }

    try {
      // Escape special characters and build query
      const escapedQuery = query.replace(/[\\@{}[\]()!*:|-]/g, '\\$&');
      const searchQuery = query === '*'
        ? '*'
        : `(@title:(${escapedQuery}*) | @author:(${escapedQuery}*) | @description:(${escapedQuery}*))`;

      // Execute FT.SEARCH command directly on Redis
      const result = await this.redis.call('FT.SEARCH', [
        'idx:books',  // This could be configurable
        searchQuery,
        'LIMIT',
        String(options.offset || 0),
        String(options.limit || 20)
      ]);

      // Parse Redis FT.SEARCH results into SearchResult format
      const results = this.parseRedisResults(result);

      // Reset circuit breaker on success
      this.circuitBreakerManager.reset();

      return results;
    } catch (error) {
      console.error('❌ Direct Redis search failed:', error);

      // Record failure in circuit breaker
      this.circuitBreakerManager.recordFailure();

      // If search fails, fall back to KEYS-based search for basic functionality
      return await this.fallbackSearch(query, options);
    }
  }

  /**
   * Parse Redis FT.SEARCH results into SearchResult format
   */
  private parseRedisResults(redisResponse: any[]): SearchResult[] {
    // FT.SEARCH returns: [totalCount, docId1, [field1, val1, ...], docId2, [...], ...]
    if (!Array.isArray(redisResponse) || redisResponse.length < 1) {
      return [];
    }

    const results: SearchResult[] = [];
    // Skip the first element (total count), process pairs of [docId, fields]
    for (let i = 1; i < redisResponse.length; i += 2) {
      const docId = redisResponse[i];
      const fields = redisResponse[i + 1];

      if (!Array.isArray(fields)) continue;

      // Convert field array to object
      const doc: Record<string, string> = {};
      for (let j = 0; j < fields.length; j += 2) {
        const key = fields[j];
        const value = fields[j + 1];
        if (typeof key === 'string') {
          doc[key] = value;
        }
      }

      // Extract ID from docId (format: "idx:books:123" or just the stored id)
      const id = doc.id || docId.split(':').pop() || docId;

      results.push({
        id,
        type: 'book',
        title: doc.title || 'Untitled',
        subtitle: doc.subtitle,
        description: doc.description,
        author: doc.author,
        category: doc.category,
        language: doc.language,
        visibility: doc.visibility,
        thumbnail: doc.thumbnail,
        profilePicture: doc.profile_picture,
        coverImage: doc.cover_image,
        memberCount: doc.member_count ? parseInt(doc.member_count) : undefined,
        bookCount: doc.book_count ? parseInt(doc.book_count) : undefined,
        createdAt: doc.created_at,
        viewCount: doc.view_count ? parseInt(doc.view_count) : undefined,
        tags: doc.tags ? doc.tags.split(',') : undefined,
        isbn: doc.isbn,
        uploaderName: doc.uploader_name,
        uploaderEmail: doc.uploader_email,
        url: doc.url,
        score: doc.score ? parseFloat(doc.score) : 1.0,
        matchType: 'title',
        relevanceScore: doc.relevance_score ? parseFloat(doc.relevance_score) : 1.0,
        bookTitle: doc.book_title,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : {},
      });
    }

    return results;
  }

  /**
   * Fallback search using KEYS pattern matching when FT.SEARCH is not available
   */
  private async fallbackSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      // Simple fallback: find keys matching pattern and search within them
      const pattern = `book:*`;
      const keys = await this.redis.keys(pattern);

      const results: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      for (const key of keys) {
        const value = await this.redis.hgetall(key);

        // Basic text matching in title, author, description
        if (
          (value.title && value.title.toLowerCase().includes(lowerQuery)) ||
          (value.author && value.author.toLowerCase().includes(lowerQuery)) ||
          (value.description && value.description.toLowerCase().includes(lowerQuery))
        ) {
          results.push({
            id: key.split(':').pop() || key,
            type: 'book',
            title: value.title || 'Untitled',
            author: value.author,
            description: value.description,
            category: value.category,
            language: value.language,
            visibility: value.visibility,
            thumbnail: value.thumbnail,
            isbn: value.isbn,
            uploaderName: value.uploader_name,
            matchType: 'title',
            relevanceScore: 0.5, // Lower score for fallback search
          });

          // Limit results if we have enough
          if (results.length >= (options.limit || 20)) {
            break;
          }
        }
      }

      // Reset circuit breaker on success of fallback method
      this.circuitBreakerManager.reset();

      return results.slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
    } catch (error) {
      console.error('❌ Fallback search also failed:', error);

      // Record failure in circuit breaker
      this.circuitBreakerManager.recordFailure();

      return []; // Return empty array if all search methods fail
    }
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redis) {
      throw new Error('DirectRedisProvider not initialized');
    }

    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }

    if (ttl !== undefined) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<any> {
    if (!this.redis) {
      throw new Error('DirectRedisProvider not initialized');
    }

    const value = await this.redis.get(key);
    
    try {
      // Attempt to parse as JSON, return as-is if not valid JSON
      return JSON.parse(value as string);
    } catch (error) {
      // Not JSON, return as string
      return value;
    }
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<void> {
    if (!this.redis) {
      throw new Error('DirectRedisProvider not initialized');
    }

    await this.redis.del(key);
  }

  /**
   * Clear keys matching a pattern
   */
  async clear(pattern?: string): Promise<void> {
    if (!this.redis) {
      throw new Error('DirectRedisProvider not initialized');
    }

    const searchPattern = pattern || '*';
    const keys = await this.redis.keys(searchPattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Check health of the Redis connection
   */
  async checkHealth(): Promise<HealthStatus> {
    if (!this.redis) {
      return {
        status: 'unhealthy',
        isConnected: false,
        isSearchAvailable: false,
        message: 'DirectRedisProvider not initialized',
        errors: ['Redis client not initialized'],
        timestamp: new Date().toISOString(),
        details: {
          circuitBreaker: this.circuitBreakerManager.getState()
        }
      };
    }

    try {
      const startTime = Date.now();

      // Test basic connectivity
      const pingResult = await this.redis.ping();

      // Check if we can access some basic Redis info
      const info = await this.redis.info('memory');
      const latency = Date.now() - startTime;

      // Check if search functionality is available by trying to get index info
      let isSearchAvailable = false;
      try {
        await this.redis.call('FT.INFO', ['idx:books']);
        isSearchAvailable = true;
      } catch (error) {
        // RediSearch module might not be available
        isSearchAvailable = false;
      }

      // Extract memory usage from info
      let memoryUsage = 'unknown';
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        const bytes = parseInt(memoryMatch[1]);
        memoryUsage = `${Math.round(bytes / 1024 / 1024)} MB`;
      }

      // Count keys
      const keyCount = await this.redis.dbsize();

      // Check circuit breaker state
      const circuitBreakerState = this.circuitBreakerManager.getState();

      return {
        status: circuitBreakerState.isOpen ? 'degraded' : 'healthy',
        isConnected: true,
        isSearchAvailable,
        latency,
        responseTime: latency,
        memoryUsage,
        keyCount: keyCount,
        lastSync: new Date().toISOString(),
        message: circuitBreakerState.isOpen
          ? 'Direct Redis connection healthy but circuit breaker is open'
          : 'Direct Redis connection healthy',
        timestamp: new Date().toISOString(),
        details: {
          ping: pingResult,
          searchIndex: isSearchAvailable ? 'idx:books' : 'not available',
          circuitBreaker: circuitBreakerState
        }
      };
    } catch (error) {
      console.error('❌ Direct Redis health check failed:', error);

      // Record failure in circuit breaker
      this.circuitBreakerManager.recordFailure();

      return {
        status: 'unhealthy',
        isConnected: false,
        isSearchAvailable: false,
        latency: -1,
        responseTime: -1,
        errors: [error instanceof Error ? error.message : 'Health check failed'],
        message: 'Direct Redis connection failed',
        timestamp: new Date().toISOString(),
        details: {
          circuitBreaker: this.circuitBreakerManager.getState()
        }
      };
    }
  }
}