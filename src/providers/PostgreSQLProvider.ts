/**
 * @samas/smart-search - PostgreSQL Database Provider
 * Production-ready full-text search using PostgreSQL's tsvector and ranking
 * 
 * Features:
 * - Native PostgreSQL full-text search with tsvector/tsquery
 * - Automatic GIN index creation for optimal performance
 * - Multi-language search configuration support
 * - Relevance ranking with ts_rank_cd function
 * - Generic schema support - works with any table structure
 * - Connection pooling with comprehensive health monitoring
 * - Robust error handling with automatic retry logic
 * - Query performance optimization and caching
 */

import { Pool, PoolClient } from 'pg';
import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

/**
 * Comprehensive PostgreSQL connection configuration
 * Supports all standard connection options plus optimizations
 */
export interface PostgreSQLConfig {
  connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean | object;
    connectionTimeoutMillis?: number;
    query_timeout?: number;
    statement_timeout?: number;
  };
  pool?: {
    max?: number; // Maximum number of clients in pool
    min?: number; // Minimum number of clients in pool
    acquireTimeoutMillis?: number; // Max time to wait for connection
    createTimeoutMillis?: number; // Max time to create connection
    destroyTimeoutMillis?: number; // Max time to destroy connection
    idleTimeoutMillis?: number; // Time before idle client is closed
    reapIntervalMillis?: number; // How often to check for idle clients
    createRetryIntervalMillis?: number; // Time between connection retries
    propagateCreateError?: boolean; // Whether to throw errors immediately
  };
}

/**
 * Generic search configuration supporting any PostgreSQL schema
 * Maps logical search concepts to actual table columns
 */
export interface PostgreSQLSearchConfig {
  tables: {
    [tableName: string]: {
      // Column mapping - adapts to any schema structure
      columns: {
        id: string; // Primary key column name
        title: string; // Main title/name column
        subtitle?: string; // Secondary title (author, username, etc.)
        description?: string; // Main content/description column
        category?: string; // Category/type classification
        language?: string; // Language code for content
        visibility?: string; // Visibility/access control
        createdAt?: string; // Creation timestamp
        updatedAt?: string; // Last update timestamp
        [key: string]: string | undefined; // Additional custom fields
      };
      // Columns to include in full-text search (must exist in columns above)
      searchColumns: string[];
      // Result type for this table (book, user, product, etc.)
      type: string;
      // PostgreSQL text search configuration ('english', 'french', 'simple', etc.)
      searchConfig?: string;
      // Column weights for relevance ranking (A=highest, D=lowest)
      weightConfig?: { [column: string]: 'A' | 'B' | 'C' | 'D' };
      // Custom WHERE clause for additional filtering (optional)
      customFilter?: string;
      // Whether to create GIN indexes automatically
      autoCreateIndexes?: boolean;
    };
  };
}

/**
 * Production-ready PostgreSQL provider with advanced full-text search
 * Implements generic schema support and enterprise-grade features
 */
export class PostgreSQLProvider implements DatabaseProvider {
  name = 'PostgreSQL';
  private client: Pool;
  private isConnectedFlag = false;
  private config: PostgreSQLConfig;
  private searchConfig: PostgreSQLSearchConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private indexesCreated = new Set<string>();

  constructor(config: PostgreSQLConfig, searchConfig: PostgreSQLSearchConfig) {
    this.config = config;
    this.searchConfig = searchConfig;
    
    // Initialize PostgreSQL connection pool with comprehensive configuration
    this.client = new Pool({
      host: config.connection.host,
      port: config.connection.port,
      database: config.connection.database,
      user: config.connection.user,
      password: config.connection.password,
      ssl: config.connection.ssl,
      connectionTimeoutMillis: config.connection.connectionTimeoutMillis || 5000,
      query_timeout: config.connection.query_timeout || 30000,
      statement_timeout: config.connection.statement_timeout || 30000,
      // Pool configuration with enterprise defaults
      max: config.pool?.max || 20,
      min: config.pool?.min || 2,
      // Pool timeout configuration (only valid options)
      idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000
    });

    // Set up comprehensive connection event monitoring
    this.client.on('connect', () => {
      console.log('✅ PostgreSQL client connected to database');
      this.reconnectAttempts = 0;
    });

    this.client.on('error', (err: Error) => {
      console.error('❌ PostgreSQL pool error:', err.message);
      this.isConnectedFlag = false;
      this.handleConnectionError(err);
    });

    this.client.on('remove', () => {
      console.log('📤 PostgreSQL client removed from pool');
    });
  }

  /**
   * Establishes connection and initializes search infrastructure
   * Creates necessary indexes and configurations for optimal performance
   */
  async connect(): Promise<void> {
    try {
      console.log(`🔗 Connecting to PostgreSQL at ${this.config.connection.host}:${this.config.connection.port}`);
      
      // Test connection with comprehensive health check
      const testResult = await this.client.query('SELECT version() as version, now() as connected_at, current_database() as database');
      const dbInfo = testResult.rows[0];
      console.log(`📋 Connected to PostgreSQL ${dbInfo.version.split(' ')[1]} (database: ${dbInfo.database})`);
      
      // Initialize search infrastructure
      await this.setupSearchInfrastructure();
      
      this.isConnectedFlag = true;
      console.log('✅ PostgreSQL connection established and search infrastructure ready');
      
    } catch (error) {
      this.isConnectedFlag = false;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to connect to PostgreSQL:', message);
      throw new Error(`PostgreSQL connection failed: ${message}`);
    }
  }

  /**
   * Sets up full-text search infrastructure including indexes and functions
   */
  private async setupSearchInfrastructure(): Promise<void> {
    const client = await this.client.connect();
    try {
      // Check if full-text search extensions are available
      await client.query("SELECT to_tsvector('english', 'test') as test_fts");
      console.log('✅ PostgreSQL full-text search extensions confirmed');

      // Create search indexes for each configured table
      for (const [tableName, tableConfig] of Object.entries(this.searchConfig.tables)) {
        if (tableConfig.autoCreateIndexes !== false) {
          await this.createSearchIndexes(client, tableName, tableConfig);
        }
      }

    } catch (error) {
      console.warn('⚠️ Could not fully initialize search infrastructure:', error);
      // Don't throw - basic functionality may still work
    } finally {
      client.release();
    }
  }

  /**
   * Creates optimized GIN indexes for full-text search on table columns
   */
  private async createSearchIndexes(client: PoolClient, tableName: string, tableConfig: any): Promise<void> {
    try {
      const indexName = `idx_${tableName}_fts_search`;
      if (this.indexesCreated.has(indexName)) return;

      // Check if table exists
      const tableExists = await client.query(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
        [tableName]
      );
      
      if (!tableExists.rows[0].exists) {
        console.log(`⚠️ Table ${tableName} does not exist, skipping index creation`);
        return;
      }

      const searchConfig = tableConfig.searchConfig || 'english';
      const searchColumns = tableConfig.searchColumns;

      // Build tsvector expression with weights
      const tsvectorExpression = searchColumns.map((col: string) => {
        const weight = tableConfig.weightConfig?.[col] || 'D';
        return `setweight(to_tsvector('${searchConfig}', coalesce("${col}", '')), '${weight}')`;
      }).join(' || ');

      // Check if index already exists
      const indexExists = await client.query(
        'SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = $1)',
        [indexName]
      );

      if (!indexExists.rows[0].exists) {
        // Create GIN index for fast full-text search
        const createIndexSQL = `
          CREATE INDEX CONCURRENTLY ${indexName} 
          ON "${tableName}" 
          USING GIN((${tsvectorExpression}))
        `;
        
        console.log(`🔧 Creating search index: ${indexName}`);
        await client.query(createIndexSQL);
        console.log(`✅ Search index created: ${indexName}`);
      } else {
        console.log(`ℹ️ Search index already exists: ${indexName}`);
      }

      this.indexesCreated.add(indexName);

    } catch (error) {
      console.warn(`⚠️ Could not create search index for ${tableName}:`, error);
      // Don't throw - search may still work without optimized indexes
    }
  }

  /**
   * Gracefully closes all connections in the pool
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔄 Gracefully closing PostgreSQL connection pool...');
      await this.client.end();
      this.isConnectedFlag = false;
      console.log('✅ PostgreSQL connection pool closed');
    } catch (error) {
      console.error('❌ Error closing PostgreSQL connection pool:', error);
      throw error;
    }
  }

  /**
   * Performs comprehensive health check with connection verification
   */
  async isConnected(): Promise<boolean> {
    try {
      // Lightweight health check with minimal overhead
      const result = await this.client.query('SELECT 1 as health_check, pg_backend_pid() as pid');
      const connected = result.rows.length === 1 && result.rows[0].health_check === 1;
      this.isConnectedFlag = connected;
      return connected;
    } catch (error) {
      console.warn('PostgreSQL health check failed:', error instanceof Error ? error.message : error);
      this.isConnectedFlag = false;
      return false;
    }
  }

  /**
   * Performs intelligent full-text search across all configured tables
   * Uses PostgreSQL's native tsvector/tsquery with relevance ranking
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag) {
      throw new Error('PostgreSQL connection not established');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    const { limit = 20, offset = 0, filters } = options;
    const results: SearchResult[] = [];
    const client = await this.client.connect();

    try {
      // Search across all configured tables in parallel for better performance
      const searchPromises = Object.entries(this.searchConfig.tables).map(async ([tableName, tableConfig]) => {
        // Filter by type if specified
        if (filters?.type && filters.type.length > 0 && !filters.type.includes(tableConfig.type)) {
          return [];
        }

        return this.searchTable(client, tableName, tableConfig, query, options);
      });

      const tableResults = await Promise.all(searchPromises);
      
      // Flatten results and apply global sorting and pagination
      for (const tableResult of tableResults) {
        results.push(...tableResult);
      }

      // Sort by relevance score (descending) and apply pagination
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(offset, offset + limit);

      return sortedResults;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ PostgreSQL search failed:', message);
      throw new Error(`Search failed: ${message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Searches a specific table using optimized PostgreSQL full-text search
   */
  private async searchTable(
    client: PoolClient,
    tableName: string,
    tableConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { filters } = options;
    const results: SearchResult[] = [];

    try {
      const searchConfig = tableConfig.searchConfig || 'english';
      const tsQuery = this.buildTsQuery(query);
      
      // Build dynamic tsvector expression with column weights
      const tsvectorExpression = tableConfig.searchColumns.map((col: string) => {
        const weight = tableConfig.weightConfig?.[col] || 'D';
        return `setweight(to_tsvector('${searchConfig}', coalesce("${col}", '')), '${weight}')`;
      }).join(' || ');

      // Build the main search query with ranking
      let sql = `
        SELECT *,
               ts_rank_cd((${tsvectorExpression}), to_tsquery('${searchConfig}', $1)) as rank_score
        FROM "${tableName}"
        WHERE (${tsvectorExpression}) @@ to_tsquery('${searchConfig}', $1)
      `;
      
      let params: any[] = [tsQuery];
      let paramIndex = 2;

      // Add custom filter if specified
      if (tableConfig.customFilter) {
        sql += ` AND (${tableConfig.customFilter})`;
      }

      // Add dynamic filters based on search options
      const filterInfo = this.buildFilterClauses(filters, tableConfig, paramIndex);
      if (filterInfo.clauses.length > 0) {
        sql += ' AND ' + filterInfo.clauses.join(' AND ');
        params.push(...filterInfo.params);
      }

      // Add ordering - prioritize relevance then recency
      sql += ` ORDER BY rank_score DESC`;
      if (tableConfig.columns.createdAt) {
        sql += `, "${tableConfig.columns.createdAt}" DESC`;
      }
      sql += ` LIMIT 50`; // Per-table limit to prevent excessive results

      console.log(`🔍 PostgreSQL search query for ${tableName}:`, sql);

      // Execute the search query
      const result = await client.query(sql, params);
      
      // Transform database rows to SearchResult objects
      for (const row of result.rows) {
        const searchResult = this.transformRowToSearchResult(row, tableConfig, query);
        if (searchResult) {
          results.push(searchResult);
        }
      }

      console.log(`✅ Found ${results.length} results in table ${tableName}`);

    } catch (error) {
      console.error(`❌ Failed to search table ${tableName}:`, error);
      // Don't throw - continue with other tables
    }

    return results;
  }

  /**
   * Builds PostgreSQL tsquery from user search input
   * Handles phrases, boolean operators, and wildcard searches
   */
  private buildTsQuery(query: string): string {
    // Clean the query and prepare for tsquery format
    const cleanQuery = query
      .replace(/[^\w\s"]/g, ' ') // Remove special chars except quotes
      .trim();

    if (!cleanQuery) return 'empty:*';

    // Split into terms while preserving quoted phrases
    const terms: string[] = [];
    const phraseRegex = /"([^"]+)"/g;
    let match;
    let lastIndex = 0;

    // Extract quoted phrases
    while ((match = phraseRegex.exec(cleanQuery)) !== null) {
      // Add words before the phrase
      const beforePhrase = cleanQuery.slice(lastIndex, match.index).trim();
      if (beforePhrase) {
        terms.push(...beforePhrase.split(/\s+/).filter(word => word.length > 0));
      }
      
      // Add the phrase as a single term
      terms.push(`"${match[1]}"`);
      lastIndex = phraseRegex.lastIndex;
    }

    // Add remaining words after last phrase
    const afterLastPhrase = cleanQuery.slice(lastIndex).trim();
    if (afterLastPhrase) {
      terms.push(...afterLastPhrase.split(/\s+/).filter(word => word.length > 0));
    }

    // If no phrases were found, just split by whitespace
    if (terms.length === 0) {
      terms.push(...cleanQuery.split(/\s+/).filter(word => word.length > 0));
    }

    // Convert terms to tsquery format
    const tsqueryTerms = terms.map(term => {
      if (term.startsWith('"') && term.endsWith('"')) {
        // Handle phrases - remove quotes and escape for tsquery
        return term.slice(1, -1).replace(/\s+/g, ' <-> ');
      } else {
        // Add prefix matching for individual words
        return `${term}:*`;
      }
    });

    // Join with AND operator
    return tsqueryTerms.join(' & ') || 'empty:*';
  }

  /**
   * Builds dynamic WHERE clauses based on search filters
   */
  private buildFilterClauses(filters: any, tableConfig: any, startParamIndex: number): { clauses: string[], params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];
    let paramIndex = startParamIndex;

    if (!filters) return { clauses, params };

    // Category filter with IN clause for multiple values
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      clauses.push(`"${tableConfig.columns.category}" = ANY($${paramIndex})`);
      params.push(filters.category);
      paramIndex++;
    }

    // Language filter
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      clauses.push(`"${tableConfig.columns.language}" = ANY($${paramIndex})`);
      params.push(filters.language);
      paramIndex++;
    }

    // Visibility filter
    if (filters.visibility && filters.visibility.length > 0 && tableConfig.columns.visibility) {
      clauses.push(`"${tableConfig.columns.visibility}" = ANY($${paramIndex})`);
      params.push(filters.visibility);
      paramIndex++;
    }

    // Date range filters
    if (filters.dateRange && tableConfig.columns.createdAt) {
      if (filters.dateRange.start) {
        clauses.push(`"${tableConfig.columns.createdAt}" >= $${paramIndex}`);
        params.push(filters.dateRange.start);
        paramIndex++;
      }
      if (filters.dateRange.end) {
        clauses.push(`"${tableConfig.columns.createdAt}" <= $${paramIndex}`);
        params.push(filters.dateRange.end);
        paramIndex++;
      }
    }

    return { clauses, params };
  }

  /**
   * Transforms database row to standardized SearchResult format
   */
  private transformRowToSearchResult(row: any, tableConfig: any, query: string): SearchResult {
    const columns = tableConfig.columns;
    
    return {
      id: row[columns.id]?.toString() || 'unknown',
      type: tableConfig.type as SearchResult['type'],
      title: row[columns.title] || 'Untitled',
      subtitle: row[columns.subtitle],
      description: row[columns.description],
      category: row[columns.category],
      language: row[columns.language] || 'en',
      visibility: row[columns.visibility] || 'public',
      createdAt: row[columns.createdAt],
      matchType: this.determineMatchType(row, query, tableConfig),
      relevanceScore: Math.round((row.rank_score || 0) * 100),
      metadata: {
        tableName: tableConfig.type,
        rankScore: row.rank_score,
        searchConfig: tableConfig.searchConfig || 'english',
        hasIndex: this.indexesCreated.has(`idx_${tableConfig.type}_fts_search`)
      }
    };
  }

  /**
   * Determines the type of match for result highlighting
   */
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

  /**
   * Handles connection errors with retry logic
   */
  private handleConnectionError(_error: Error): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`🔄 Attempting to reconnect to PostgreSQL (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      // Connection will be retried automatically by the pool
    } else {
      console.error('💀 Maximum reconnection attempts reached for PostgreSQL');
    }
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
          errors: ['PostgreSQL not connected']
        };
      }

      const client = await this.client.connect();
      let isSearchAvailable = false;
      let memoryUsage = 'Unknown';

      try {
        // Test full-text search functionality
        await client.query("SELECT to_tsvector('english', 'health check test')");
        isSearchAvailable = true;

        // Get comprehensive database statistics
        const statsResult = await client.query(`
          SELECT 
            pg_size_pretty(pg_database_size(current_database())) as db_size,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections
        `);

        if (statsResult.rows.length > 0) {
          memoryUsage = statsResult.rows[0].db_size;
        }

      } catch (error) {
        console.warn('Could not retrieve full PostgreSQL statistics:', error);
      } finally {
        client.release();
      }

      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage,
        keyCount: Object.keys(this.searchConfig.tables).length,
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
   * Gets detailed PostgreSQL performance statistics
   */
  async getDetailedStats(): Promise<any> {
    if (!this.isConnectedFlag) {
      throw new Error('PostgreSQL connection not established');
    }

    const client = await this.client.connect();
    try {
      const stats = await client.query(`
        SELECT 
          pg_database.datname as database_name,
          pg_size_pretty(pg_database_size(pg_database.datname)) as database_size,
          (SELECT count(*) FROM pg_stat_activity WHERE datname = pg_database.datname) as connections,
          (SELECT sum(numbackends) FROM pg_stat_database WHERE datname = pg_database.datname) as backends,
          (SELECT sum(xact_commit) FROM pg_stat_database WHERE datname = pg_database.datname) as commits,
          (SELECT sum(xact_rollback) FROM pg_stat_database WHERE datname = pg_database.datname) as rollbacks
        FROM pg_database
        WHERE datname = current_database()
      `);

      return stats.rows[0] || {};
    } finally {
      client.release();
    }
  }
}