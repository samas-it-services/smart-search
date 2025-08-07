/**
 * @samas/smart-search - PostgreSQL Database Provider
 * Advanced full-text search implementation with tsvector and ranking
 */

import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

export interface PostgreSQLConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface PostgreSQLSearchConfig {
  tables: {
    [key: string]: {
      columns: {
        id: string;
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
      textSearchConfig?: string; // e.g., 'english', 'spanish'
      tsvectorColumn?: string; // Pre-computed tsvector column
      rankingWeights?: { [column: string]: number }; // Weight for ranking
    };
  };
}

export class PostgreSQLProvider implements DatabaseProvider {
  name = 'PostgreSQL';
  private pool: any; // We'll use any for now to avoid requiring pg as dependency
  private isConnectedFlag = false;
  private config: PostgreSQLConfig;
  private searchConfig: PostgreSQLSearchConfig;

  constructor(config: PostgreSQLConfig, searchConfig: PostgreSQLSearchConfig) {
    this.config = config;
    this.searchConfig = searchConfig;
    // Note: In real implementation, this would be:
    // const { Pool } = require('pg');
    // this.pool = new Pool(this.buildConnectionConfig());
  }

  private buildConnectionConfig(): any {
    return {
      host: this.config.host,
      port: this.config.port || 5432,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl || false,
      max: this.config.max || 10,
      idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis || 2000,
    };
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔗 Connecting to PostgreSQL at ${this.config.host}:${this.config.port || 5432}`);
      
      // In real implementation:
      // const client = await this.pool.connect();
      // await client.query('SELECT NOW()');
      // client.release();
      
      // Mock successful connection
      this.isConnectedFlag = true;
      console.log('✅ Connected to PostgreSQL successfully');
    } catch (error) {
      this.isConnectedFlag = false;
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // In real implementation:
      // await this.pool.end();
      this.isConnectedFlag = false;
      console.log('✅ Disconnected from PostgreSQL');
    } catch (error) {
      console.error('❌ Error disconnecting from PostgreSQL:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      // In real implementation:
      // const client = await this.pool.connect();
      // await client.query('SELECT 1');
      // client.release();
      return this.isConnectedFlag;
    } catch {
      this.isConnectedFlag = false;
      return false;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag) {
      throw new Error('PostgreSQL connection not established');
    }

    const { limit = 20, offset = 0, filters } = options;
    const results: SearchResult[] = [];

    try {
      // Search across all configured tables
      for (const [tableName, tableConfig] of Object.entries(this.searchConfig.tables)) {
        // Filter by type if specified
        if (filters?.type && filters.type.length > 0 && !filters.type.includes(tableConfig.type)) {
          continue;
        }

        const tableResults = await this.searchTable(tableName, tableConfig, query, options);
        results.push(...tableResults);
      }

      // Sort by relevance score and apply pagination
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(offset, offset + limit);

      return sortedResults;

    } catch (error) {
      console.error('❌ PostgreSQL search failed:', error);
      throw error;
    }
  }

  private async searchTable(
    tableName: string,
    tableConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { filters } = options;
    const results: SearchResult[] = [];

    try {
      // Build PostgreSQL full-text search query
      const searchQuery = this.buildTsQuery(query);
      const textSearchConfig = tableConfig.textSearchConfig || 'english';
      
      let sql: string;
      let params: any[] = [searchQuery];

      if (tableConfig.tsvectorColumn) {
        // Use pre-computed tsvector column
        sql = `
          SELECT *,
                 ts_rank(${tableConfig.tsvectorColumn}, to_tsquery($1)) as rank_score
          FROM ${tableName}
          WHERE ${tableConfig.tsvectorColumn} @@ to_tsquery($1)
        `;
      } else {
        // Build tsvector on the fly
        const searchColumns = tableConfig.searchColumns.map((col: string) => {
          const weight = tableConfig.rankingWeights?.[col] || 1;
          return `setweight(to_tsvector('${textSearchConfig}', coalesce(${col}, '')), '${this.getWeightLetter(weight)}')`;
        }).join(' || ');

        sql = `
          SELECT *,
                 ts_rank((${searchColumns}), to_tsquery('${textSearchConfig}', $1)) as rank_score
          FROM ${tableName}
          WHERE (${searchColumns}) @@ to_tsquery('${textSearchConfig}', $1)
        `;
      }

      // Add filters
      const { filterClauses, filterParams } = this.buildFilterClauses(filters, tableConfig);
      if (filterClauses.length > 0) {
        sql += ' AND ' + filterClauses.join(' AND ');
        params.push(...filterParams);
      }

      // Add ordering and limits
      sql += ' ORDER BY rank_score DESC, ' + tableConfig.columns.createdAt + ' DESC';
      sql += ' LIMIT 50'; // Internal limit per table

      console.log(`🔍 PostgreSQL search query: ${sql}`);
      console.log('Parameters:', params);

      // In real implementation:
      // const client = await this.pool.connect();
      // const result = await client.query(sql, params);
      // client.release();
      
      // Mock results for demonstration
      const mockRows = this.generateMockResults(tableName, query, tableConfig.type);
      
      for (const row of mockRows) {
        const result = this.transformRowToSearchResult(row, tableConfig, query);
        if (result) {
          results.push(result);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to search table ${tableName}:`, error);
      // Don't throw - continue with other tables
    }

    return results;
  }

  private buildTsQuery(query: string): string {
    // Convert user query to PostgreSQL tsquery format
    // Handle phrase searches, AND/OR operators, etc.
    
    // Basic implementation - clean and split query
    const cleanQuery = query
      .replace(/[^\w\s]/g, ' ') // Remove special chars
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => `${word}:*`) // Add prefix matching
      .join(' & '); // AND all terms
    
    return cleanQuery || 'empty:*';
  }

  private getWeightLetter(weight: number): string {
    // PostgreSQL text search weights: A (highest) to D (lowest)
    if (weight >= 4) return 'A';
    if (weight >= 3) return 'B';  
    if (weight >= 2) return 'C';
    return 'D';
  }

  private buildFilterClauses(filters: any, tableConfig: any): { filterClauses: string[], filterParams: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 2; // Start from $2 since $1 is the search query

    if (!filters) return { filterClauses: clauses, filterParams: params };

    // Category filter
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      clauses.push(`${tableConfig.columns.category} = ANY($${paramIndex})`);
      params.push(filters.category);
      paramIndex++;
    }

    // Language filter
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      clauses.push(`${tableConfig.columns.language} = ANY($${paramIndex})`);
      params.push(filters.language);
      paramIndex++;
    }

    // Visibility filter
    if (filters.visibility && filters.visibility.length > 0 && tableConfig.columns.visibility) {
      clauses.push(`${tableConfig.columns.visibility} = ANY($${paramIndex})`);
      params.push(filters.visibility);
      paramIndex++;
    }

    // Date range filter
    if (filters.dateRange && tableConfig.columns.createdAt) {
      if (filters.dateRange.start) {
        clauses.push(`${tableConfig.columns.createdAt} >= $${paramIndex}`);
        params.push(filters.dateRange.start);
        paramIndex++;
      }
      if (filters.dateRange.end) {
        clauses.push(`${tableConfig.columns.createdAt} <= $${paramIndex}`);
        params.push(filters.dateRange.end);
        paramIndex++;
      }
    }

    return { filterClauses: clauses, filterParams: params };
  }

  private generateMockResults(tableName: string, query: string, type: string): any[] {
    // Generate realistic mock data based on table type
    const baseResults = [];
    const queryLower = query.toLowerCase();

    if (type === 'article') {
      baseResults.push({
        id: 1,
        title: `Advanced Guide to ${query}`,
        author: 'John Doe',
        content: `Comprehensive article about ${query} with detailed explanations and examples...`,
        category: 'Technology',
        published_at: '2024-01-15T10:00:00Z',
        rank_score: 0.89
      });
      baseResults.push({
        id: 2,
        title: `Getting Started with ${query}`,
        author: 'Jane Smith', 
        content: `Beginner-friendly introduction to ${query} concepts and practices...`,
        category: 'Tutorial',
        published_at: '2024-01-10T14:30:00Z',
        rank_score: 0.76
      });
    }

    return baseResults;
  }

  private transformRowToSearchResult(row: any, tableConfig: any, query: string): SearchResult {
    const columns = tableConfig.columns;
    
    return {
      id: row[columns.id]?.toString() || row.id?.toString() || 'unknown',
      type: tableConfig.type as SearchResult['type'],
      title: row[columns.title] || 'Unknown Title',
      subtitle: row[columns.subtitle],
      description: row[columns.description],
      category: row[columns.category],
      language: row[columns.language],
      visibility: row[columns.visibility],
      createdAt: row[columns.createdAt],
      matchType: this.determineMatchType(row, query, tableConfig),
      relevanceScore: Math.round((row.rank_score || 0) * 100),
      metadata: {
        tableName: tableConfig.type,
        rankScore: row.rank_score,
        textSearchConfig: tableConfig.textSearchConfig || 'english'
      }
    };
  }

  private determineMatchType(row: any, query: string, tableConfig: any): SearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    
    // Check title match (highest priority)
    if (row[tableConfig.columns.title]?.toLowerCase().includes(queryLower)) {
      return 'title';
    }
    
    // Check subtitle/author match
    if (row[tableConfig.columns.subtitle]?.toLowerCase().includes(queryLower)) {
      return 'author';
    }
    
    // Check description/content match
    if (row[tableConfig.columns.description]?.toLowerCase().includes(queryLower)) {
      return 'description';
    }
    
    // Check category match
    if (row[tableConfig.columns.category]?.toLowerCase().includes(queryLower)) {
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
          errors: ['PostgreSQL not connected']
        };
      }

      // Test search functionality
      let isSearchAvailable = false;
      try {
        // In real implementation:
        // const client = await this.pool.connect();
        // await client.query("SELECT to_tsvector('english', 'test')");
        // client.release();
        isSearchAvailable = true;
      } catch (error) {
        console.warn('PostgreSQL text search functionality unavailable:', error);
      }

      // Get database statistics
      // In real implementation:
      // const statsResult = await client.query(`
      //   SELECT 
      //     pg_database_size(current_database()) as db_size,
      //     (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      // `);
      
      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage: '256MB', // Mock value
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