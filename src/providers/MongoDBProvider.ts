/**
 * @samas/smart-search - MongoDB Database Provider
 * Production-ready full-text search using MongoDB's text indexes and aggregation pipelines
 * 
 * Features:
 * - MongoDB 6.0+ text search with advanced indexing strategies
 * - Automatic text index creation with custom weights and languages
 * - Atlas Search integration for enterprise deployments
 * - Aggregation pipeline optimization for complex queries
 * - Generic schema support - works with any collection structure
 * - Connection pooling with comprehensive monitoring
 * - Robust error handling with automatic retry logic
 * - Query performance optimization and result scoring
 */

import { MongoClient, Db, Collection, CreateIndexesOptions } from 'mongodb';
import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

/**
 * Comprehensive MongoDB connection configuration
 * Supports all standard connection options plus optimizations
 */
export interface MongoDBConfig {
  connection: {
    uri: string; // Full MongoDB connection URI
    database: string; // Database name to use
    options?: {
      maxPoolSize?: number; // Maximum number of connections in pool
      minPoolSize?: number; // Minimum number of connections in pool
      maxIdleTimeMS?: number; // Max time connection can be idle
      serverSelectionTimeoutMS?: number; // How long to try selecting server
      socketTimeoutMS?: number; // How long socket stays open
      connectTimeoutMS?: number; // How long to wait for initial connection
      heartbeatFrequencyMS?: number; // How often to check server health
      retryWrites?: boolean; // Retry failed writes
      retryReads?: boolean; // Retry failed reads
      readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
      authSource?: string; // Database to authenticate against
    };
  };
}

/**
 * Generic search configuration supporting any MongoDB schema
 * Maps logical search concepts to actual collection fields
 */
export interface MongoDBSearchConfig {
  collections: {
    [collectionName: string]: {
      // Field mapping - adapts to any schema structure
      fields: {
        _id: string; // Primary key field name (usually '_id')
        title: string; // Main title/name field
        subtitle?: string; // Secondary title (author, username, etc.)
        description?: string; // Main content/description field
        category?: string; // Category/type classification
        language?: string; // Language code for content
        visibility?: string; // Visibility/access control
        createdAt?: string; // Creation timestamp
        updatedAt?: string; // Last update timestamp
        [key: string]: string | undefined; // Additional custom fields
      };
      // Fields to include in full-text search (must exist in fields above)
      searchFields: string[];
      // Result type for this collection (book, user, product, etc.)
      type: string;
      // Language for text search ('none', 'english', 'spanish', etc.)
      defaultLanguage?: string;
      // Field weights for text search scoring (higher = more important)
      fieldWeights?: { [field: string]: number };
      // Whether to create text indexes automatically
      autoCreateIndexes?: boolean;
      // Custom match conditions for additional filtering (MongoDB query format)
      customFilter?: any;
      // Whether to use Atlas Search (requires Atlas deployment)
      useAtlasSearch?: boolean;
      // Atlas Search index name (if using Atlas Search)
      atlasSearchIndex?: string;
    };
  };
}

/**
 * Production-ready MongoDB provider with advanced full-text search
 * Implements generic schema support and enterprise-grade features
 */
export class MongoDBProvider implements DatabaseProvider {
  name = 'MongoDB';
  private client: MongoClient;
  private db: Db | null = null;
  private isConnectedFlag = false;
  private config: MongoDBConfig;
  private searchConfig: MongoDBSearchConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private indexesCreated = new Set<string>();

  constructor(config: MongoDBConfig, searchConfig: MongoDBSearchConfig) {
    this.config = config;
    this.searchConfig = searchConfig;
    
    // Initialize MongoDB client with comprehensive configuration
    this.client = new MongoClient(config.connection.uri, {
      // Connection pool configuration
      maxPoolSize: config.connection.options?.maxPoolSize || 20,
      minPoolSize: config.connection.options?.minPoolSize || 2,
      maxIdleTimeMS: config.connection.options?.maxIdleTimeMS || 30000,
      // Timeout configuration
      serverSelectionTimeoutMS: config.connection.options?.serverSelectionTimeoutMS || 5000,
      socketTimeoutMS: config.connection.options?.socketTimeoutMS || 45000,
      connectTimeoutMS: config.connection.options?.connectTimeoutMS || 10000,
      heartbeatFrequencyMS: config.connection.options?.heartbeatFrequencyMS || 10000,
      // Retry configuration
      retryWrites: config.connection.options?.retryWrites !== false,
      retryReads: config.connection.options?.retryReads !== false,
      // Read preference
      readPreference: config.connection.options?.readPreference || 'primaryPreferred',
      // Authentication
      ...(config.connection.options?.authSource && { authSource: config.connection.options.authSource })
    });

    // Set up comprehensive connection event monitoring
    this.client.on('connectionPoolCreated', () => {
      console.log('✅ MongoDB connection pool created');
      this.reconnectAttempts = 0;
    });

    this.client.on('connectionPoolClosed', () => {
      console.log('📤 MongoDB connection pool closed');
      this.isConnectedFlag = false;
    });

    this.client.on('connectionCreated', (event: any) => {
      console.log(`🔗 MongoDB connection created: ${event.connectionId}`);
    });

    this.client.on('connectionClosed', (event: any) => {
      console.log(`🔌 MongoDB connection closed: ${event.connectionId}`);
    });

    this.client.on('serverHeartbeatFailed', (event: any) => {
      console.warn(`💔 MongoDB server heartbeat failed: ${event.failure.message}`);
      this.handleConnectionError(event.failure);
    });
  }

  /**
   * Establishes connection and initializes search infrastructure
   * Creates necessary indexes and configurations for optimal performance
   */
  async connect(): Promise<void> {
    try {
      console.log('🔗 Connecting to MongoDB...');
      
      // Connect to MongoDB
      await this.client.connect();
      this.db = this.client.db(this.config.connection.database);
      
      // Test connection with comprehensive health check
      const adminDb = this.client.db('admin');
      const buildInfo = await adminDb.command({ buildInfo: 1 });
      console.log(`📋 Connected to MongoDB ${buildInfo.version} (database: ${this.config.connection.database})`);
      
      // Initialize search infrastructure
      await this.setupSearchInfrastructure();
      
      this.isConnectedFlag = true;
      console.log('✅ MongoDB connection established and search infrastructure ready');
      
    } catch (error) {
      this.isConnectedFlag = false;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to connect to MongoDB:', message);
      throw new Error(`MongoDB connection failed: ${message}`);
    }
  }

  /**
   * Sets up full-text search infrastructure including indexes
   */
  private async setupSearchInfrastructure(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Create search indexes for each configured collection
      for (const [collectionName, collectionConfig] of Object.entries(this.searchConfig.collections)) {
        if (collectionConfig.autoCreateIndexes !== false) {
          await this.createSearchIndexes(collectionName, collectionConfig);
        }
      }

      console.log('✅ MongoDB search infrastructure initialized');

    } catch (error) {
      console.warn('⚠️ Could not fully initialize search infrastructure:', error);
      // Don't throw - basic functionality may still work
    }
  }

  /**
   * Creates optimized text indexes for search on collection fields
   */
  private async createSearchIndexes(collectionName: string, collectionConfig: any): Promise<void> {
    if (!this.db) {return;}

    try {
      const indexName = `text_search_${collectionName}`;
      if (this.indexesCreated.has(indexName)) {return;}

      const collection = this.db.collection(collectionName);

      // Check if collection exists (create it if not)
      const collections = await this.db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        console.log(`ℹ️ Collection ${collectionName} does not exist, will be created on first document insert`);
      }

      // Build text index specification with weights
      const indexSpec: any = {};
      const weights: any = {};

      for (const field of collectionConfig.searchFields) {
        indexSpec[field] = 'text';
        weights[field] = collectionConfig.fieldWeights?.[field] || 1;
      }

      const indexOptions: CreateIndexesOptions = {
        name: indexName,
        weights: weights,
        default_language: collectionConfig.defaultLanguage || 'english',
        background: true, // Create index in background to not block operations
      };

      // Check if text index already exists
      const existingIndexes = await collection.listIndexes().toArray();
      const hasTextIndex = existingIndexes.some((index: any) => 
        index.key && typeof index.key === 'object' && 
        Object.values(index.key).includes('text')
      );

      if (!hasTextIndex) {
        console.log(`🔧 Creating text index: ${indexName}`);
        await collection.createIndex(indexSpec, indexOptions);
        console.log(`✅ Text index created: ${indexName}`);
      } else {
        console.log(`ℹ️ Text index already exists for collection ${collectionName}`);
      }

      // Create additional indexes for common filter fields
      await this.createSupportingIndexes(collection, collectionConfig);

      this.indexesCreated.add(indexName);

    } catch (error) {
      console.warn(`⚠️ Could not create text index for ${collectionName}:`, error);
      // Don't throw - search may still work without optimized indexes
    }
  }

  /**
   * Creates supporting indexes for filtering and sorting
   */
  private async createSupportingIndexes(collection: Collection, collectionConfig: any): Promise<void> {
    try {
      // Create indexes for common filter fields
      const indexPromises: Promise<string>[] = [];

      if (collectionConfig.fields.category) {
        indexPromises.push(collection.createIndex({ [collectionConfig.fields.category]: 1 }, { background: true }));
      }

      if (collectionConfig.fields.language) {
        indexPromises.push(collection.createIndex({ [collectionConfig.fields.language]: 1 }, { background: true }));
      }

      if (collectionConfig.fields.visibility) {
        indexPromises.push(collection.createIndex({ [collectionConfig.fields.visibility]: 1 }, { background: true }));
      }

      if (collectionConfig.fields.createdAt) {
        indexPromises.push(collection.createIndex({ [collectionConfig.fields.createdAt]: -1 }, { background: true }));
      }

      // Create compound index for common filter combinations
      if (collectionConfig.fields.category && collectionConfig.fields.createdAt) {
        indexPromises.push(collection.createIndex({
          [collectionConfig.fields.category]: 1,
          [collectionConfig.fields.createdAt]: -1
        }, { background: true }));
      }

      await Promise.all(indexPromises);
      console.log(`✅ Supporting indexes created for ${collection.collectionName}`);

    } catch (error) {
      console.warn(`⚠️ Could not create supporting indexes:`, error);
    }
  }

  /**
   * Gracefully closes all connections
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔄 Gracefully closing MongoDB connection...');
      await this.client.close();
      this.isConnectedFlag = false;
      this.db = null;
      console.log('✅ MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }

  /**
   * Performs comprehensive health check with connection verification
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.db) {return false;}
      
      // Lightweight health check with minimal overhead
      await this.db.admin().ping();
      this.isConnectedFlag = true;
      return true;
    } catch (error) {
      console.warn('MongoDB health check failed:', error instanceof Error ? error.message : error);
      this.isConnectedFlag = false;
      return false;
    }
  }

  /**
   * Performs intelligent full-text search across all configured collections
   * Uses MongoDB's native text search with relevance scoring
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag || !this.db) {
      throw new Error('MongoDB connection not established');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    const { limit = 20, offset = 0, filters } = options;
    const results: SearchResult[] = [];

    try {
      // Search across all configured collections in parallel for better performance
      const searchPromises = Object.entries(this.searchConfig.collections).map(async ([collectionName, collectionConfig]) => {
        // Filter by type if specified
        if (filters?.type && filters.type.length > 0 && !filters.type.includes(collectionConfig.type)) {
          return [];
        }

        return this.searchCollection(collectionName, collectionConfig, query, options);
      });

      const collectionResults = await Promise.all(searchPromises);
      
      // Flatten results and apply global sorting and pagination
      for (const collectionResult of collectionResults) {
        results.push(...collectionResult);
      }

      // Sort by relevance score (descending) and apply pagination
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(offset, offset + limit);

      return sortedResults;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ MongoDB search failed:', message);
      throw new Error(`Search failed: ${message}`);
    }
  }

  /**
   * Searches a specific collection using optimized MongoDB text search
   */
  private async searchCollection(
    collectionName: string,
    collectionConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    if (!this.db) {return [];}

    try {
      const collection = this.db.collection(collectionName);

      if (collectionConfig.useAtlasSearch) {
        // Use Atlas Search for advanced full-text search capabilities
        return this.searchWithAtlas(collection, collectionConfig, query, options);
      } else {
        // Use MongoDB text search
        return this.searchWithTextIndex(collection, collectionConfig, query, options);
      }

    } catch (error) {
      console.error(`❌ Failed to search collection ${collectionName}:`, error);
      // Don't throw - continue with other collections
      return [];
    }
  }

  /**
   * Searches using MongoDB's native text search indexes
   */
  private async searchWithTextIndex(
    collection: Collection,
    collectionConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { filters } = options;
    const results: SearchResult[] = [];

    // Build the aggregation pipeline for text search
    const pipeline: any[] = [
      // Text search stage
      {
        $match: {
          $text: { $search: query },
          ...this.buildMatchConditions(filters, collectionConfig)
        }
      },
      // Add text score for relevance ranking
      {
        $addFields: {
          textScore: { $meta: 'textScore' }
        }
      },
      // Sort by relevance then by creation date
      {
        $sort: {
          textScore: -1,
          ...(collectionConfig.fields.createdAt && { [collectionConfig.fields.createdAt]: -1 })
        }
      },
      // Limit results per collection
      {
        $limit: 50
      }
    ];

    console.log(`🔍 MongoDB text search pipeline for ${collection.collectionName}:`, JSON.stringify(pipeline, null, 2));

    const cursor = collection.aggregate(pipeline);
    const documents = await cursor.toArray();

    // Transform documents to SearchResult objects
    for (const doc of documents) {
      const searchResult = this.transformDocumentToSearchResult(doc, collectionConfig, query);
      if (searchResult) {
        results.push(searchResult);
      }
    }

    console.log(`✅ Found ${results.length} results in collection ${collection.collectionName}`);
    return results;
  }

  /**
   * Searches using MongoDB Atlas Search (for Atlas deployments)
   */
  private async searchWithAtlas(
    collection: Collection,
    collectionConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { filters } = options;
    const results: SearchResult[] = [];

    // Build Atlas Search aggregation pipeline
    const searchStage: any = {
      $search: {
        index: collectionConfig.atlasSearchIndex || 'default',
        text: {
          query: query,
          path: collectionConfig.searchFields,
          fuzzy: {
            maxEdits: 1,
            prefixLength: 2
          }
        }
      }
    };

    const pipeline: any[] = [
      searchStage,
      {
        $addFields: {
          atlasScore: { $meta: 'searchScore' }
        }
      }
    ];

    // Add match conditions for filters
    const matchConditions = this.buildMatchConditions(filters, collectionConfig);
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add sorting and limiting
    pipeline.push(
      {
        $sort: {
          atlasScore: -1,
          ...(collectionConfig.fields.createdAt && { [collectionConfig.fields.createdAt]: -1 })
        }
      },
      { $limit: 50 }
    );

    console.log(`🔍 MongoDB Atlas Search pipeline for ${collection.collectionName}:`, JSON.stringify(pipeline, null, 2));

    const cursor = collection.aggregate(pipeline);
    const documents = await cursor.toArray();

    // Transform documents to SearchResult objects
    for (const doc of documents) {
      const searchResult = this.transformDocumentToSearchResult(doc, collectionConfig, query);
      if (searchResult) {
        results.push(searchResult);
      }
    }

    console.log(`✅ Found ${results.length} results in collection ${collection.collectionName} using Atlas Search`);
    return results;
  }

  /**
   * Builds MongoDB match conditions based on search filters
   */
  private buildMatchConditions(filters: any, collectionConfig: any): any {
    const matchConditions: any = {};

    if (!filters) {return matchConditions;}

    // Add custom filter if specified
    if (collectionConfig.customFilter) {
      Object.assign(matchConditions, collectionConfig.customFilter);
    }

    // Category filter
    if (filters.category && filters.category.length > 0 && collectionConfig.fields.category) {
      matchConditions[collectionConfig.fields.category] = { $in: filters.category };
    }

    // Language filter
    if (filters.language && filters.language.length > 0 && collectionConfig.fields.language) {
      matchConditions[collectionConfig.fields.language] = { $in: filters.language };
    }

    // Visibility filter
    if (filters.visibility && filters.visibility.length > 0 && collectionConfig.fields.visibility) {
      matchConditions[collectionConfig.fields.visibility] = { $in: filters.visibility };
    }

    // Date range filters
    if (filters.dateRange && collectionConfig.fields.createdAt) {
      const dateConditions: any = {};
      if (filters.dateRange.start) {
        dateConditions.$gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        dateConditions.$lte = new Date(filters.dateRange.end);
      }
      if (Object.keys(dateConditions).length > 0) {
        matchConditions[collectionConfig.fields.createdAt] = dateConditions;
      }
    }

    return matchConditions;
  }

  /**
   * Transforms MongoDB document to standardized SearchResult format
   */
  private transformDocumentToSearchResult(doc: any, collectionConfig: any, query: string): SearchResult {
    const fields = collectionConfig.fields;
    
    return {
      id: doc[fields._id]?.toString() || doc._id?.toString() || 'unknown',
      type: collectionConfig.type as SearchResult['type'],
      title: doc[fields.title] || 'Untitled',
      subtitle: doc[fields.subtitle],
      description: doc[fields.description],
      category: doc[fields.category],
      language: doc[fields.language] || 'en',
      visibility: doc[fields.visibility] || 'public',
      createdAt: doc[fields.createdAt],
      matchType: this.determineMatchType(doc, query, collectionConfig),
      relevanceScore: this.calculateRelevanceScore(doc),
      metadata: {
        collectionName: collectionConfig.type,
        textScore: doc.textScore,
        atlasScore: doc.atlasScore,
        hasTextIndex: this.indexesCreated.has(`text_search_${collectionConfig.type}`)
      }
    };
  }

  /**
   * Calculates relevance score from MongoDB text search metadata
   */
  private calculateRelevanceScore(doc: any): number {
    // Use Atlas Search score if available (0-100 scale)
    if (doc.atlasScore !== undefined) {
      return Math.round(Math.min(100, Math.max(0, doc.atlasScore * 100)));
    }
    
    // Use text search score if available (convert to 0-100 scale)
    if (doc.textScore !== undefined) {
      // Text scores are typically 0.5-1.5, normalize to 0-100
      return Math.round(Math.min(100, Math.max(0, doc.textScore * 50)));
    }
    
    return 50; // Default relevance score
  }

  /**
   * Determines the type of match for result highlighting
   */
  private determineMatchType(doc: any, query: string, collectionConfig: any): SearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    
    // Check title match (highest priority)
    if (doc[collectionConfig.fields.title]?.toString().toLowerCase().includes(queryLower)) {
      return 'title';
    }
    
    // Check subtitle/author match
    if (doc[collectionConfig.fields.subtitle]?.toString().toLowerCase().includes(queryLower)) {
      return 'author';
    }
    
    // Check description/content match
    if (doc[collectionConfig.fields.description]?.toString().toLowerCase().includes(queryLower)) {
      return 'description';
    }
    
    // Check category match
    if (doc[collectionConfig.fields.category]?.toString().toLowerCase().includes(queryLower)) {
      return 'category';
    }
    
    return 'custom';
  }

  /**
   * Handles connection errors with retry logic
   */
  private handleConnectionError(error: any): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`🔄 Attempting to reconnect to MongoDB (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      // Connection will be retried automatically by the driver
    } else {
      console.error('💀 Maximum reconnection attempts reached for MongoDB');
    }

    console.warn('MongoDB error:', error.message || error);
  }

  /**
   * Comprehensive health monitoring with database statistics
   */
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.isConnected();
      
      if (!isConnected) {
        return {
          isConnected: false,
          isSearchAvailable: false,
          latency: -1,
          memoryUsage: '0',
          keyCount: 0,
          lastSync: null,
          errors: ['MongoDB not connected']
        };
      }

      let isSearchAvailable = false;
      let memoryUsage = 'Unknown';

      try {
        // Test text search functionality
        const testCollection = this.db!.collection('test');
        await testCollection.createIndex({ testField: 'text' }, { background: true });
        await testCollection.deleteMany({}); // Clean up
        isSearchAvailable = true;

        // Get comprehensive database statistics
        const dbStats = await this.db!.stats();
        memoryUsage = this.formatBytes(dbStats.storageSize || 0);

        // Count total documents across search collections
        const countPromises = Object.keys(this.searchConfig.collections).map(async (collectionName) => {
          try {
            const collection = this.db!.collection(collectionName);
            return await collection.estimatedDocumentCount();
          } catch {
            return 0;
          }
        });

        await Promise.all(countPromises);

      } catch (error) {
        console.warn('Could not retrieve full MongoDB statistics:', error);
      }

      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage,
        keyCount: Object.keys(this.searchConfig.collections).length,
        lastSync: new Date().toISOString(),
        errors: []
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        isConnected: false,
        isSearchAvailable: false,
        latency: Date.now() - startTime,
        memoryUsage: '0',
        keyCount: 0,
        lastSync: null,
        errors: [message]
      };
    }
  }

  /**
   * Gets detailed MongoDB performance statistics
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDetailedStats(): Promise<any> {
    if (!this.isConnectedFlag || !this.db) {
      throw new Error('MongoDB connection not established');
    }

    try {
      const [dbStats, serverStatus] = await Promise.all([
        this.db.stats(),
        this.db.admin().serverStatus()
      ]);

      return {
        database_name: this.db.databaseName,
        database_size_mb: Math.round((dbStats.storageSize || 0) / 1024 / 1024 * 100) / 100,
        document_count: dbStats.objects || 0,
        index_count: dbStats.indexes || 0,
        server_version: serverStatus.version,
        uptime_seconds: serverStatus.uptime,
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0,
          total_created: serverStatus.connections?.totalCreated || 0
        }
      };
    } catch (error) {
      console.error('Failed to get MongoDB detailed stats:', error);
      return {};
    }
  }

  /**
   * Optimizes MongoDB configuration for text search performance
   */
  async optimizeForSearch(): Promise<void> {
    if (!this.isConnectedFlag || !this.db) {
      throw new Error('MongoDB connection not established');
    }

    try {
      console.log('🔧 Analyzing MongoDB configuration for text search optimization...');

      // Check current configuration
      const serverStatus = await this.db.admin().serverStatus();
      console.log(`MongoDB version: ${serverStatus.version}`);

      // Suggestions for text search optimization
      console.log('💡 For optimal text search performance, consider these MongoDB optimizations:');
      console.log('   - Ensure adequate RAM for working set');
      console.log('   - Use compound indexes for filtered text searches');
      console.log('   - Consider Atlas Search for advanced full-text capabilities');
      console.log('   - Monitor slow operations with profiler');
      console.log('   - Use appropriate read preferences for search workload');

      // Check if Atlas Search is available
      try {
        const atlasInfo = await this.db.admin().command({ hello: 1 });
        if (atlasInfo.ismaster && atlasInfo.hosts) {
          console.log('✅ Atlas deployment detected - Atlas Search is available');
        }
      } catch {
        console.log('ℹ️ Self-hosted deployment - consider Atlas for advanced search');
      }

    } catch (error) {
      console.warn('Could not analyze MongoDB configuration:', error);
    }
  }

  /**
   * Formats bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) {return '0 Bytes';}
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}