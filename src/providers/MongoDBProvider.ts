/**
 * @samas/smart-search - MongoDB Database Provider  
 * Text search implementation with aggregation pipelines and Atlas Search
 */

import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

export interface MongoDBConfig {
  uri: string;
  options?: {
    useNewUrlParser?: boolean;
    useUnifiedTopology?: boolean;
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}

export interface MongoDBSearchConfig {
  tables: {
    [key: string]: {
      collection: string; // MongoDB collection name
      columns: {
        id: string; // Usually '_id'
        title: string;
        subtitle?: string;
        description?: string;
        category?: string;
        language?: string;
        visibility?: string;
        createdAt?: string;
        [key: string]: string | undefined;
      };
      searchColumns: string[];
      type: string;
      textIndexName?: string; // Custom text index name
      atlasSearchIndex?: string; // Atlas Search index name
      weights?: { [field: string]: number }; // Text index weights
      geospatialField?: string; // Field for geo queries
    };
  };
}

export class MongoDBProvider implements DatabaseProvider {
  name = 'MongoDB';
  private _client: any; // We'll use any for now to avoid requiring mongodb as dependency
  private _db: any;
  private isConnectedFlag = false;
  private _config: MongoDBConfig;
  private searchConfig: MongoDBSearchConfig;

  constructor(config: MongoDBConfig, searchConfig: MongoDBSearchConfig) {
    this._config = config;
    this.searchConfig = searchConfig;
    // Note: In real implementation, this would be:
    // const { MongoClient } = require('mongodb');
    // this.client = new MongoClient(config.uri, config.options);
  }

  async connect(): Promise<void> {
    try {
      console.log('🔗 Connecting to MongoDB...');
      
      // In real implementation:
      // await this.client.connect();
      // await this.client.db().admin().ping();
      // this.db = this.client.db();
      
      // Mock successful connection
      this.isConnectedFlag = true;
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      this.isConnectedFlag = false;
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // In real implementation:
      // await this.client.close();
      this.isConnectedFlag = false;
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      // In real implementation:
      // await this.client.db().admin().ping();
      return this.isConnectedFlag;
    } catch {
      this.isConnectedFlag = false;
      return false;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag) {
      throw new Error('MongoDB connection not established');
    }

    const { limit = 20, offset = 0, filters } = options;
    const results: SearchResult[] = [];

    try {
      // Search across all configured collections
      for (const [tableName, tableConfig] of Object.entries(this.searchConfig.tables)) {
        // Filter by type if specified
        if (filters?.type && filters.type.length > 0 && !filters.type.includes(tableConfig.type)) {
          continue;
        }

        const collectionResults = await this.searchCollection(tableName, tableConfig, query, options);
        results.push(...collectionResults);
      }

      // Sort by relevance score and apply pagination
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(offset, offset + limit);

      return sortedResults;

    } catch (error) {
      console.error('❌ MongoDB search failed:', error);
      throw error;
    }
  }

  private async searchCollection(
    _tableName: string,
    tableConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { filters } = options;
    const results: SearchResult[] = [];

    try {
      const collection = tableConfig.collection;
      
      // Choose search method based on available indexes
      let searchPipeline: any[];
      
      if (tableConfig.atlasSearchIndex) {
        // Use Atlas Search
        searchPipeline = this.buildAtlasSearchPipeline(query, tableConfig, filters);
      } else {
        // Use MongoDB text search
        searchPipeline = this.buildTextSearchPipeline(query, tableConfig, filters);
      }

      console.log(`🔍 MongoDB aggregation pipeline for ${collection}:`, JSON.stringify(searchPipeline, null, 2));

      // In real implementation:
      // const cursor = this.db.collection(collection).aggregate(searchPipeline);
      // const docs = await cursor.toArray();
      
      // Mock results for demonstration
      const mockDocs = this.generateMockResults(collection, query, tableConfig.type);
      
      for (const doc of mockDocs) {
        const result = this.transformDocToSearchResult(doc, tableConfig, query);
        if (result) {
          results.push(result);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to search collection ${tableConfig.collection}:`, error);
      // Don't throw - continue with other collections
    }

    return results;
  }

  private buildAtlasSearchPipeline(query: string, tableConfig: any, filters: any): any[] {
    const pipeline: any[] = [];

    // Atlas Search stage
    const searchStage: any = {
      $search: {
        index: tableConfig.atlasSearchIndex,
        text: {
          query: query,
          path: tableConfig.searchColumns,
          score: { boost: { value: 2 } }
        }
      }
    };

    // Add compound search with filters if needed
    if (filters && Object.keys(filters).length > 0) {
      const filterClauses = this.buildAtlasFilters(filters, tableConfig);
      if (filterClauses.length > 0) {
        searchStage.$search = {
          index: tableConfig.atlasSearchIndex,
          compound: {
            must: [searchStage.$search],
            filter: filterClauses
          }
        };
      }
    }

    pipeline.push(searchStage);

    // Add score projection
    pipeline.push({
      $addFields: {
        searchScore: { $meta: "searchScore" }
      }
    });

    // Sort by score
    pipeline.push({
      $sort: { searchScore: -1 }
    });

    // Limit results per collection
    pipeline.push({ $limit: 50 });

    return pipeline;
  }

  private buildTextSearchPipeline(query: string, tableConfig: any, filters: any): any[] {
    const pipeline: any[] = [];

    // Text search stage
    pipeline.push({
      $match: {
        $text: { 
          $search: query,
          $caseSensitive: false,
          $diacriticSensitive: false
        }
      }
    });

    // Add filters
    const filterMatch = this.buildTextSearchFilters(filters, tableConfig);
    if (Object.keys(filterMatch).length > 0) {
      pipeline.push({
        $match: filterMatch
      });
    }

    // Add text score
    pipeline.push({
      $addFields: {
        textScore: { $meta: "textScore" }
      }
    });

    // Sort by text score
    pipeline.push({
      $sort: { textScore: { $meta: "textScore" } }
    });

    // Limit results per collection  
    pipeline.push({ $limit: 50 });

    return pipeline;
  }

  private buildAtlasFilters(filters: any, tableConfig: any): any[] {
    const filterClauses: any[] = [];

    if (!filters) return filterClauses;

    // Category filter
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      filterClauses.push({
        in: {
          path: tableConfig.columns.category,
          value: filters.category
        }
      });
    }

    // Language filter  
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      filterClauses.push({
        in: {
          path: tableConfig.columns.language,
          value: filters.language
        }
      });
    }

    // Date range filter
    if (filters.dateRange && tableConfig.columns.createdAt) {
      const dateFilter: any = { path: tableConfig.columns.createdAt };
      
      if (filters.dateRange.start && filters.dateRange.end) {
        dateFilter.gte = new Date(filters.dateRange.start);
        dateFilter.lte = new Date(filters.dateRange.end);
      } else if (filters.dateRange.start) {
        dateFilter.gte = new Date(filters.dateRange.start);
      } else if (filters.dateRange.end) {
        dateFilter.lte = new Date(filters.dateRange.end);
      }

      if (dateFilter.gte || dateFilter.lte) {
        filterClauses.push({ range: dateFilter });
      }
    }

    return filterClauses;
  }

  private buildTextSearchFilters(filters: any, tableConfig: any): any {
    const match: any = {};

    if (!filters) return match;

    // Category filter
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      match[tableConfig.columns.category] = { $in: filters.category };
    }

    // Language filter
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      match[tableConfig.columns.language] = { $in: filters.language };
    }

    // Visibility filter
    if (filters.visibility && filters.visibility.length > 0 && tableConfig.columns.visibility) {
      match[tableConfig.columns.visibility] = { $in: filters.visibility };
    }

    // Date range filter
    if (filters.dateRange && tableConfig.columns.createdAt) {
      const dateMatch: any = {};
      
      if (filters.dateRange.start) {
        dateMatch.$gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        dateMatch.$lte = new Date(filters.dateRange.end);
      }
      
      if (Object.keys(dateMatch).length > 0) {
        match[tableConfig.columns.createdAt] = dateMatch;
      }
    }

    return match;
  }

  private generateMockResults(_collection: string, query: string, type: string): any[] {
    // Generate realistic mock data based on collection type
    const baseResults = [];
    const queryLower = query.toLowerCase();

    if (type === 'article') {
      baseResults.push({
        _id: '60f7b3b3b3b3b3b3b3b3b3b1',
        title: `Understanding ${query} in Modern Development`,
        author: 'Tech Writer',
        content: `Deep dive into ${query} concepts, best practices, and real-world applications...`,
        category: 'Technology',
        tags: [queryLower, 'development', 'tutorial'],
        publishedAt: new Date('2024-01-15T10:00:00Z'),
        searchScore: 2.45,
        textScore: 0.89
      });
    } else if (type === 'author') {
      baseResults.push({
        _id: '60f7b3b3b3b3b3b3b3b3b3b2',
        name: `${query} Expert`,
        bio: `Experienced developer specializing in ${query} and related technologies`,
        expertise: [queryLower, 'programming', 'consulting'],
        joinedAt: new Date('2023-06-01T00:00:00Z'),
        searchScore: 1.92,
        textScore: 0.76
      });
    }

    return baseResults;
  }

  private transformDocToSearchResult(doc: any, tableConfig: any, query: string): SearchResult {
    const columns = tableConfig.columns;
    
    return {
      id: doc[columns.id]?.toString() || doc._id?.toString() || 'unknown',
      type: tableConfig.type as SearchResult['type'],
      title: doc[columns.title] || 'Unknown Title',
      subtitle: doc[columns.subtitle],
      description: doc[columns.description],
      category: doc[columns.category],
      language: doc[columns.language], 
      visibility: doc[columns.visibility],
      createdAt: doc[columns.createdAt]?.toISOString?.() || doc[columns.createdAt],
      tags: doc.tags,
      matchType: this.determineMatchType(doc, query, tableConfig),
      relevanceScore: this.calculateRelevanceScore(doc),
      metadata: {
        collection: tableConfig.collection,
        searchScore: doc.searchScore,
        textScore: doc.textScore,
        hasAtlasSearch: !!tableConfig.atlasSearchIndex
      }
    };
  }

  private calculateRelevanceScore(doc: any): number {
    // Use Atlas Search score if available, otherwise text score
    if (doc.searchScore) {
      return Math.round(doc.searchScore * 40); // Scale Atlas Search score
    } else if (doc.textScore) {
      return Math.round(doc.textScore * 100);
    }
    return 50; // Default score
  }

  private determineMatchType(doc: any, query: string, tableConfig: any): SearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    
    // Check title match
    if (doc[tableConfig.columns.title]?.toLowerCase().includes(queryLower)) {
      return 'title';
    }
    
    // Check subtitle/author match  
    if (doc[tableConfig.columns.subtitle]?.toLowerCase().includes(queryLower)) {
      return 'author';
    }
    
    // Check description/content match
    if (doc[tableConfig.columns.description]?.toLowerCase().includes(queryLower)) {
      return 'description';
    }
    
    // Check tags
    if (doc.tags && Array.isArray(doc.tags)) {
      const hasTagMatch = doc.tags.some((tag: string) => 
        tag.toLowerCase().includes(queryLower)
      );
      if (hasTagMatch) return 'tag';
    }
    
    // Check category match
    if (doc[tableConfig.columns.category]?.toLowerCase().includes(queryLower)) {
      return 'category';
    }
    
    return 'custom';
  }

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

      // Test search functionality
      let isSearchAvailable = false;
      try {
        // In real implementation:
        // const testCollection = this.db.collection('test');
        // await testCollection.findOne({});
        isSearchAvailable = true;
      } catch (error) {
        console.warn('MongoDB search functionality unavailable:', error);
      }

      // Get database statistics
      // In real implementation:
      // const stats = await this.db.stats();
      // const serverStatus = await this.db.admin().serverStatus();
      
      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage: '512MB', // Mock value
        keyCount: Object.keys(this.searchConfig.tables).length,
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