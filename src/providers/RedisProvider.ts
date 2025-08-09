/**
 * @samas/smart-search - Redis Cache Provider
 * Universal Redis integration for @samas/smart-search
 */

import Redis from 'ioredis';
import {
  CacheProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  username?: string; // For Redis ACL authentication
  apiKey?: string; // For API key authentication (Redis Cloud, Upstash, etc.)
  db?: number;
  url?: string; // Alternative to host/port
  connectTimeout?: number;
  lazyConnect?: boolean;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  tls?: boolean | object; // For secure connections
}

export interface RedisSearchIndexConfig {
  indexName: string;
  prefix: string;
  schema: Record<string, string>;
}

export class RedisProvider implements CacheProvider {
  name = 'Redis';
  private redis: Redis;
  private isConnectedFlag = false;
  private searchIndexes: Map<string, RedisSearchIndexConfig> = new Map();
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
    
    // Initialize Redis client with configuration
    const redisConfig = this.buildRedisConfig(config);
    
    try {
      this.redis = new Redis(redisConfig);
      
      // Add error handler to prevent unhandled errors
      this.redis.on('error', (error) => {
        console.error('❌ Redis client error:', error.message);
        this.isConnectedFlag = false;
      });
      
      // Add ready handler
      this.redis.on('ready', () => {
        console.log('🔗 Redis client ready');
        this.isConnectedFlag = true;
      });
      
      // Add connect handler
      this.redis.on('connect', () => {
        console.log('🔌 Redis client connected');
      });
      
      // Add disconnect handler
      this.redis.on('close', () => {
        console.log('📴 Redis client disconnected');
        this.isConnectedFlag = false;
      });
      
    } catch (error) {
      console.error('❌ Failed to create Redis client:', error);
      this.redis = null as any; // Set to null to handle gracefully
      this.isConnectedFlag = false;
    }
  }

  /**
   * Build Redis configuration with support for different authentication methods
   */
  private buildRedisConfig(config: RedisConfig): any {
    const redisConfig: any = {
      connectTimeout: config.connectTimeout || 10000,
      lazyConnect: config.lazyConnect !== undefined ? config.lazyConnect : true, // Default to true for better error handling
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      retryOnFailover: true, // Enable retries
      maxRetriesOnFailover: 5,
      keepAlive: 30000, // Keep connection alive
      autoResubscribe: true, // Auto resubscribe on disconnect
      autoResendUnfulfilledCommands: true // Resend unfulfilled commands
    };

    // Handle different connection methods
    if (config.url) {
      // URL-based connection (supports redis://, rediss://, and API key URLs)
      if (config.apiKey) {
        // For services like Upstash that use API keys in URLs
        const url = new URL(config.url);
        url.password = config.apiKey;
        redisConfig.url = url.toString();
      } else {
        redisConfig.url = config.url;
      }
    } else {
      // Host/port-based connection
      redisConfig.host = config.host || 'localhost';
      redisConfig.port = config.port || 6379;
      
      if (config.db !== undefined) {
        redisConfig.db = config.db;
      }

      // Authentication options
      if (config.apiKey) {
        // API key authentication (treat as password for most services)
        redisConfig.password = config.apiKey;
      } else if (config.password) {
        redisConfig.password = config.password;
      }

      // Redis ACL authentication (Redis 6+)
      if (config.username) {
        redisConfig.username = config.username;
      }

      // TLS/SSL support
      if (config.tls) {
        redisConfig.tls = config.tls === true ? {} : config.tls;
      }
    }

    return redisConfig;
  }

  async connect(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis client not initialized. Check Redis configuration.');
    }
    
    try {
      // Log connection method (without sensitive data)
      this.logConnectionMethod();
      
      // Test connection
      await this.redis.ping();
      this.isConnectedFlag = true;
      
      console.log('✅ Connected to Redis successfully');
      
      // Auto-create search indexes for common data types
      await this.createDefaultSearchIndexes();
      
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.isConnectedFlag = false;
      throw error;
    }
  }

  /**
   * Auto-create search indexes for common data structures
   */
  private async createDefaultSearchIndexes(): Promise<void> {
    try {
      // Healthcare data index - matches the showcase structure
      await this.createHealthcareSearchIndex();
      
      // Generic search index for other data types
      await this.createGenericSearchIndex();
      
      console.log('✅ Search indexes created successfully');
    } catch (error) {
      // Don't fail connection if index creation fails
      console.warn('⚠️ Failed to create search indexes (continuing without search):', error);
    }
  }

  /**
   * Create healthcare-specific search index
   */
  private async createHealthcareSearchIndex(): Promise<void> {
    const indexName = 'healthcare_idx';
    const keyPrefix = 'healthcare:';
    
    try {
      // Check if index already exists
      await this.redis.call('FT.INFO', indexName);
      console.log('📋 Healthcare search index already exists');
      return;
    } catch (error) {
      // Index doesn't exist, create it
    }
    
    // Create FT.CREATE command for healthcare data
    await this.redis.call('FT.CREATE', indexName,
      'ON', 'HASH',
      'PREFIX', '1', keyPrefix,
      'SCHEMA',
      // Text fields for full-text search
      'title', 'TEXT', 'WEIGHT', '3.0',
      'description', 'TEXT', 'WEIGHT', '2.0',
      'condition_name', 'TEXT', 'WEIGHT', '3.0',
      'treatment', 'TEXT', 'WEIGHT', '2.5',
      'specialty', 'TEXT', 'WEIGHT', '1.5',
      // Tag fields for filtering
      'category', 'TAG', 'SEPARATOR', '|',
      'language', 'TAG', 'SEPARATOR', '|',
      'visibility', 'TAG', 'SEPARATOR', '|',
      'type', 'TAG', 'SEPARATOR', '|',
      // Numeric fields
      'relevanceScore', 'NUMERIC',
      'createdAt', 'NUMERIC'
    );
    
    // Register the index configuration
    this.searchIndexes.set(indexName, {
      indexName,
      prefix: keyPrefix,
      schema: {
        title: 'TEXT',
        description: 'TEXT', 
        condition_name: 'TEXT',
        treatment: 'TEXT',
        specialty: 'TEXT',
        category: 'TAG',
        language: 'TAG',
        visibility: 'TAG',
        type: 'TAG',
        relevanceScore: 'NUMERIC',
        createdAt: 'NUMERIC'
      }
    });
    
    console.log('🏥 Healthcare search index created');
  }

  /**
   * Create generic search index for other data types
   */
  private async createGenericSearchIndex(): Promise<void> {
    const indexName = 'generic_idx';
    const keyPrefix = 'search:';
    
    try {
      // Check if index already exists
      await this.redis.call('FT.INFO', indexName);
      console.log('📋 Generic search index already exists');
      return;
    } catch (error) {
      // Index doesn't exist, create it
    }
    
    // Create FT.CREATE command for generic data
    await this.redis.call('FT.CREATE', indexName,
      'ON', 'HASH', 
      'PREFIX', '1', keyPrefix,
      'SCHEMA',
      // Basic text fields
      'title', 'TEXT', 'WEIGHT', '3.0',
      'description', 'TEXT', 'WEIGHT', '2.0',
      'content', 'TEXT', 'WEIGHT', '2.0',
      // Tag fields
      'category', 'TAG', 'SEPARATOR', '|',
      'type', 'TAG', 'SEPARATOR', '|',
      // Numeric fields
      'score', 'NUMERIC',
      'timestamp', 'NUMERIC'
    );
    
    // Register the index configuration
    this.searchIndexes.set(indexName, {
      indexName,
      prefix: keyPrefix,
      schema: {
        title: 'TEXT',
        description: 'TEXT',
        content: 'TEXT',
        category: 'TAG',
        type: 'TAG',
        score: 'NUMERIC',
        timestamp: 'NUMERIC'
      }
    });
    
    console.log('🔍 Generic search index created');
  }

  /**
   * Log connection method for debugging (without exposing sensitive data)
   */
  private logConnectionMethod(): void {
    const { config } = this;
    
    if (config.apiKey) {
      console.log('🔑 Connecting to Redis with API key authentication');
    } else if (config.username && config.password) {
      console.log('👤 Connecting to Redis with username/password (ACL)');
    } else if (config.password) {
      console.log('🔒 Connecting to Redis with password authentication');
    } else {
      console.log('📡 Connecting to Redis without authentication');
    }

    if (config.tls) {
      console.log('🔐 Using TLS/SSL connection');
    }

    if (config.url) {
      const url = new URL(config.url);
      console.log(`🌐 Redis URL: ${url.protocol}//${url.hostname}:${url.port || '6379'}`);
    } else {
      console.log(`🌐 Redis: ${config.host || 'localhost'}:${config.port || 6379}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.isConnectedFlag = false;
  }

  async isConnected(): Promise<boolean> {
    try {
      if (!this.redis) {
        this.isConnectedFlag = false;
        return false;
      }
      await this.redis.ping();
      this.isConnectedFlag = true;
      return true;
    } catch {
      this.isConnectedFlag = false;
      return false;
    }
  }

  /**
   * Create search index for Redis Search
   */
  async createSearchIndex(config: RedisSearchIndexConfig): Promise<void> {
    try {
      // Build FT.CREATE command
      const schemaArgs: string[] = [];
      
      for (const [field, type] of Object.entries(config.schema)) {
        schemaArgs.push(field, type);
      }

      // Execute FT.CREATE command
      await this.redis.call(
        'FT.CREATE',
        config.indexName,
        'ON', 'HASH',
        'PREFIX', '1', config.prefix,
        'SCHEMA',
        ...schemaArgs
      );

      this.searchIndexes.set(config.indexName, config);
      console.log(`✅ Created Redis search index: ${config.indexName}`);
      
    } catch (error: any) {
      // Index might already exist
      if (error.message && error.message.includes('Index already exists')) {
        this.searchIndexes.set(config.indexName, config);
        return;
      }
      
      console.error(`❌ Failed to create search index ${config.indexName}:`, error);
      throw error;
    }
  }

  /**
   * Add document to search index
   */
  async addToIndex(indexName: string, key: string, document: Record<string, any>): Promise<void> {
    try {
      const indexConfig = this.searchIndexes.get(indexName);
      if (!indexConfig) {
        throw new Error(`Search index ${indexName} not configured`);
      }

      // Convert document to Redis hash format
      const hashArgs: string[] = [];
      for (const [field, value] of Object.entries(document)) {
        if (value !== null && value !== undefined) {
          hashArgs.push(field, String(value));
        }
      }

      if (hashArgs.length > 0) {
        await this.redis.hset(key, ...hashArgs);
      }
    } catch (error) {
      console.error(`❌ Failed to add document to index ${indexName}:`, error);
      throw error;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    // Check Redis client availability
    if (!this.redis) {
      console.warn('⚠️ Redis client not available, search unavailable');
      return [];
    }

    // Check connection and reconnect if needed
    if (!this.isConnectedFlag) {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Redis connection failed, search unavailable:', error);
        return [];
      }
    }

    try {
      const results: SearchResult[] = [];
      const { filters, limit = 20 } = options;

      // Search across all configured indexes
      for (const [indexName] of this.searchIndexes) {
        // Filter by type if specified
        if (filters?.type && filters.type.length > 0) {
          const indexType = this.getIndexType(indexName);
          if (indexType && !filters.type.includes(indexType)) {
            continue;
          }
        }

        const indexResults = await this.searchIndex(indexName, query, options);
        results.push(...indexResults);
      }

      // Sort by relevance score and apply limit
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return results.slice(0, limit);

    } catch (error) {
      console.error('❌ Redis search failed:', error);
      return []; // Return empty array for graceful error handling in tests
    }
  }

  private async searchIndex(indexName: string, query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Safely destructure options with proper defaults
      const { 
        limit = 20, 
        sortBy = 'relevance', 
        sortOrder = 'desc' 
      } = options || {};

      // Build Redis Search query
      const searchQuery = `*${query}*`; // Simple wildcard search

      // Build FT.SEARCH command
      const searchArgs = [indexName, searchQuery];

      // Add LIMIT
      searchArgs.push('LIMIT', '0', String(limit));

      // Add SORTBY if not relevance
      if (sortBy !== 'relevance') {
        const redisSortBy = this.mapSortBy(sortBy);
        if (redisSortBy && sortOrder) {
          searchArgs.push('SORTBY', redisSortBy, sortOrder.toUpperCase());
        }
      }

      // Execute search
      const result = await this.redis.call('FT.SEARCH', ...searchArgs);
      
      if (!Array.isArray(result) || result.length < 2) {
        return [];
      }

      // const totalResults = result[0]; // Future: use for pagination
      const documents = [];

      // Parse results (format: [count, key1, fields1, key2, fields2, ...])
      for (let i = 1; i < result.length; i += 2) {
        const key = result[i];
        const fields = result[i + 1];
        
        if (Array.isArray(fields)) {
          const doc = this.parseRedisDocument(key, fields);
          if (doc) {
            documents.push(doc);
          }
        }
      }

      return documents.map(doc => this.transformToSearchResult(doc, query, indexName));

    } catch (error) {
      console.error(`❌ Failed to search index ${indexName}:`, error);
      return [];
    }
  }

  private parseRedisDocument(key: string, fields: string[]): Record<string, any> | null {
    try {
      const document: Record<string, any> = { _key: key };
      
      for (let i = 0; i < fields.length; i += 2) {
        const fieldName = fields[i];
        const fieldValue = fields[i + 1];
        
        if (fieldName && fieldValue !== undefined) {
          document[fieldName] = fieldValue;
        }
      }
      
      return document;
    } catch (error) {
      console.error('❌ Failed to parse Redis document:', error);
      return null;
    }
  }

  private transformToSearchResult(doc: Record<string, any>, query: string, indexName: string): SearchResult {
    const type = this.getIndexType(indexName) || 'custom';
    
    return {
      id: doc._key.split(':').pop() || doc._key,
      type: type as SearchResult['type'],
      title: doc.title || doc.name || 'Unknown Title',
      subtitle: doc.subtitle || doc.author || doc.username,
      description: doc.description || doc.bio,
      author: doc.author,
      category: doc.category,
      language: doc.language,
      visibility: doc.visibility,
      thumbnail: doc.thumbnail_path,
      profilePicture: doc.avatar_url,
      coverImage: doc.cover_image_url,
      ...(doc.member_count ? { memberCount: parseInt(doc.member_count) } : {}),
      ...(doc.book_count ? { bookCount: parseInt(doc.book_count) } : {}),
      ...(doc.view_count ? { viewCount: parseInt(doc.view_count) } : {}),
      createdAt: doc.created_at || doc.uploaded_at,
      tags: doc.tags ? (typeof doc.tags === 'string' ? JSON.parse(doc.tags) : doc.tags) : undefined,
      isbn: doc.isbn,
      uploaderName: doc.uploader_name,
      uploaderEmail: doc.uploader_email,
      bookTitle: doc.book_title,
      matchType: this.determineMatchType(query, doc),
      relevanceScore: this.calculateRelevanceScore(query, doc),
      metadata: doc
    };
  }

  private getIndexType(indexName: string): string | null {
    // Map index names to types
    const typeMap: Record<string, string> = {
      'idx:books': 'book',
      'idx:users': 'user',
      'idx:book_clubs': 'book_club',
      'idx:authors': 'author',
      'idx:qa': 'qa'
    };
    
    return typeMap[indexName] || null;
  }

  private mapSortBy(sortBy: string): string | null {
    const sortMap: Record<string, string> = {
      'date': 'created_at',
      'views': 'view_count',
      'name': 'title',
      'uploaded_at': 'uploaded_at',
      'view_count': 'view_count'
    };
    
    return sortMap[sortBy] || null;
  }

  private determineMatchType(query: string, doc: Record<string, any>): SearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    
    if (doc.title && doc.title.toLowerCase().includes(queryLower)) {return 'title';}
    if (doc.author && doc.author.toLowerCase().includes(queryLower)) {return 'author';}
    if (doc.username && doc.username.toLowerCase().includes(queryLower)) {return 'username';}
    if (doc.name && doc.name.toLowerCase().includes(queryLower)) {return 'name';}
    if (doc.description && doc.description.toLowerCase().includes(queryLower)) {return 'description';}
    if (doc.category && doc.category.toLowerCase().includes(queryLower)) {return 'category';}
    if (doc.question && doc.question.toLowerCase().includes(queryLower)) {return 'question';}
    if (doc.answer && doc.answer.toLowerCase().includes(queryLower)) {return 'answer';}
    
    return 'custom';
  }

  private calculateRelevanceScore(query: string, doc: Record<string, any>): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title/name match gets highest score
    const titleField = doc.title || doc.name;
    if (titleField) {
      const titleLower = titleField.toLowerCase();
      if (titleLower === queryLower) {score += 100;}
      else if (titleLower.startsWith(queryLower)) {score += 80;}
      else if (titleLower.includes(queryLower)) {score += 60;}
    }

    // Author/username match gets medium score
    const authorField = doc.author || doc.username;
    if (authorField) {
      const authorLower = authorField.toLowerCase();
      if (authorLower === queryLower) {score += 80;}
      else if (authorLower.startsWith(queryLower)) {score += 60;}
      else if (authorLower.includes(queryLower)) {score += 40;}
    }

    // Description/bio match gets lower score
    const descField = doc.description || doc.bio;
    if (descField) {
      const descLower = descField.toLowerCase();
      if (descLower.includes(queryLower)) {score += 20;}
    }

    return score;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn('⚠️ Redis client not available, skipping cache set operation');
      return; // Gracefully fail for cache operations
    }
    
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, Math.floor(ttl / 1000), serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error('❌ Failed to set cache value:', error);
      this.isConnectedFlag = false; // Mark as disconnected on error
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn('⚠️ Redis client not available, skipping cache get operation');
      return null; // Gracefully fail for cache operations
    }
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Failed to get cache value:', error);
      this.isConnectedFlag = false; // Mark as disconnected on error
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn('⚠️ Redis client not available, skipping cache delete operation');
      return; // Gracefully fail for cache operations
    }
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('❌ Failed to delete cache value:', error);
      this.isConnectedFlag = false; // Mark as disconnected on error
      throw error;
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (!this.redis || !this.isConnectedFlag) {
      console.warn('⚠️ Redis client not available, skipping cache clear operation');
      return; // Gracefully fail for cache operations
    }
    
    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern + '*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.flushdb();
      }
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      this.isConnectedFlag = false; // Mark as disconnected on error
      throw error;
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const isConnected = await this.isConnected();
      
      if (!isConnected) {
        return {
          isConnected: false,
          isSearchAvailable: false,
          latency: -1,
          memoryUsage: '0',
          keyCount: 0,
          lastSync: null,
          errors: ['Redis not connected']
        };
      }

      // Test search functionality
      let isSearchAvailable = false;
      try {
        // Check if any search indexes exist (even if empty)
        const indexList = await this.redis.call('FT._LIST');
        isSearchAvailable = Array.isArray(indexList) && indexList.length > 0;
        
        // If we have indexes configured but not in Redis, still consider available
        if (!isSearchAvailable && this.searchIndexes.size > 0) {
          isSearchAvailable = true;
        }
      } catch (error) {
        console.warn('Search functionality unavailable:', error);
      }

      // Get performance metrics
      const latency = Date.now() - startTime;
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : '0';

      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage,
        keyCount,
        lastSync: new Date().toISOString(),
        errors: []
      };

    } catch (error) {
      return {
        isConnected: false,
        isSearchAvailable: false,
        latency: Date.now() - startTime,
        memoryUsage: '0',
        keyCount: 0,
        lastSync: null,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}