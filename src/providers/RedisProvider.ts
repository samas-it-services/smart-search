/**
 * @samas/smart-search - Redis Cache Provider
 * Universal Redis integration for @samas/smart-search
 */

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
  private redis: any; // We'll use any for now to avoid requiring ioredis as dependency
  private isConnectedFlag = false;
  private searchIndexes: Map<string, RedisSearchIndexConfig> = new Map();
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
    // Note: In real implementation, this would be:
    // this.redis = new Redis(this.buildRedisConfig(config));
  }

  /**
   * Build Redis configuration with support for different authentication methods
   */
  private buildRedisConfig(config: RedisConfig): any {
    const redisConfig: any = {
      connectTimeout: config.connectTimeout || 10000,
      lazyConnect: config.lazyConnect !== false,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3
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
    try {
      const redisConfig = this.buildRedisConfig(this.config);
      
      // Log connection method (without sensitive data)
      this.logConnectionMethod();
      
      // In real implementation:
      // this.redis = new Redis(redisConfig);
      
      // Test connection
      await this.redis.ping();
      this.isConnectedFlag = true;
      
      console.log('✅ Connected to Redis successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
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
      if (!this.redis) return false;
      await this.redis.ping();
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
    if (!this.isConnectedFlag) {
      await this.connect();
    }

    try {
      const results: SearchResult[] = [];
      const { filters, limit = 20 } = options;

      // Search across all configured indexes
      for (const [indexName, indexConfig] of this.searchIndexes) {
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
      throw error;
    }
  }

  private async searchIndex(indexName: string, query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const { limit = 20, sortBy = 'relevance', sortOrder = 'desc' } = options;

      // Build Redis Search query
      let searchQuery = `*${query}*`; // Simple wildcard search

      // Build FT.SEARCH command
      const searchArgs = [indexName, searchQuery];

      // Add LIMIT
      searchArgs.push('LIMIT', '0', String(limit));

      // Add SORTBY if not relevance
      if (sortBy !== 'relevance') {
        const redisSortBy = this.mapSortBy(sortBy);
        if (redisSortBy) {
          searchArgs.push('SORTBY', redisSortBy, sortOrder.toUpperCase());
        }
      }

      // Execute search
      const result = await this.redis.call('FT.SEARCH', ...searchArgs);
      
      if (!Array.isArray(result) || result.length < 2) {
        return [];
      }

      const totalResults = result[0];
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
      memberCount: doc.member_count ? parseInt(doc.member_count) : undefined,
      bookCount: doc.book_count ? parseInt(doc.book_count) : undefined,
      viewCount: doc.view_count ? parseInt(doc.view_count) : undefined,
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
    
    if (doc.title && doc.title.toLowerCase().includes(queryLower)) return 'title';
    if (doc.author && doc.author.toLowerCase().includes(queryLower)) return 'author';
    if (doc.username && doc.username.toLowerCase().includes(queryLower)) return 'username';
    if (doc.name && doc.name.toLowerCase().includes(queryLower)) return 'name';
    if (doc.description && doc.description.toLowerCase().includes(queryLower)) return 'description';
    if (doc.category && doc.category.toLowerCase().includes(queryLower)) return 'category';
    if (doc.question && doc.question.toLowerCase().includes(queryLower)) return 'question';
    if (doc.answer && doc.answer.toLowerCase().includes(queryLower)) return 'answer';
    
    return 'custom';
  }

  private calculateRelevanceScore(query: string, doc: Record<string, any>): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title/name match gets highest score
    const titleField = doc.title || doc.name;
    if (titleField) {
      const titleLower = titleField.toLowerCase();
      if (titleLower === queryLower) score += 100;
      else if (titleLower.startsWith(queryLower)) score += 80;
      else if (titleLower.includes(queryLower)) score += 60;
    }

    // Author/username match gets medium score
    const authorField = doc.author || doc.username;
    if (authorField) {
      const authorLower = authorField.toLowerCase();
      if (authorLower === queryLower) score += 80;
      else if (authorLower.startsWith(queryLower)) score += 60;
      else if (authorLower.includes(queryLower)) score += 40;
    }

    // Description/bio match gets lower score
    const descField = doc.description || doc.bio;
    if (descField) {
      const descLower = descField.toLowerCase();
      if (descLower.includes(queryLower)) score += 20;
    }

    return score;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, Math.floor(ttl / 1000), serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error('❌ Failed to set cache value:', error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Failed to get cache value:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('❌ Failed to delete cache value:', error);
      throw error;
    }
  }

  async clear(pattern?: string): Promise<void> {
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
        // Try a simple search on the first available index
        const firstIndex = this.searchIndexes.keys().next().value;
        if (firstIndex) {
          await this.redis.call('FT.SEARCH', firstIndex, '*', 'LIMIT', '0', '1');
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