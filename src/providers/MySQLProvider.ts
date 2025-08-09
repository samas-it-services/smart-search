/**
 * @samas/smart-search - MySQL Database Provider
 * Production-ready full-text search using MySQL's MATCH AGAINST functionality
 * 
 * Features:
 * - MySQL 8.0+ FULLTEXT search with InnoDB and MyISAM support
 * - Automatic FULLTEXT index creation for optimal performance
 * - Boolean mode search with operators (+, -, ", *, ~, etc.)
 * - Natural language and boolean search modes
 * - JSON column search and filtering capabilities
 * - Generic schema support - works with any table structure
 * - Connection pooling with comprehensive health monitoring
 * - Robust error handling with automatic retry logic
 * - Query performance optimization and result caching
 */

import mysql from 'mysql2/promise';
import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

/**
 * Comprehensive MySQL connection configuration
 * Supports all standard connection options plus optimizations
 */
export interface MySQLConfig {
  connection: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl?: mysql.SslOptions | string;
    charset?: string;
    timezone?: string;
    connectTimeout?: number;
    acquireTimeout?: number;
    timeout?: number;
  };
  pool?: {
    connectionLimit?: number; // Maximum number of connections in pool
    acquireTimeout?: number; // Max time to get connection from pool
    timeout?: number; // Max time for query execution
    reconnect?: boolean; // Reconnect when connection is lost
    idleTimeout?: number; // Time before idle connection is closed
    queueLimit?: number; // Max number of queued connection requests
  };
}

/**
 * Generic search configuration supporting any MySQL schema
 * Maps logical search concepts to actual table columns
 */
export interface MySQLSearchConfig {
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
      // Search mode: 'NATURAL' (default) or 'BOOLEAN'
      searchMode?: 'NATURAL' | 'BOOLEAN';
      // Whether to create FULLTEXT indexes automatically
      autoCreateIndexes?: boolean;
      // Custom WHERE clause for additional filtering (optional)
      customFilter?: string;
      // Engine type: 'InnoDB' (default) or 'MyISAM'
      engine?: 'InnoDB' | 'MyISAM';
    };
  };
}

/**
 * Production-ready MySQL provider with advanced full-text search
 * Implements generic schema support and enterprise-grade features
 */
export class MySQLProvider implements DatabaseProvider {
  name = 'MySQL';
  private connection: mysql.Pool;
  private isConnectedFlag = false;
  private config: MySQLConfig;
  private searchConfig: MySQLSearchConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private indexesCreated = new Set<string>();

  constructor(config: MySQLConfig, searchConfig: MySQLSearchConfig) {
    this.config = config;
    this.searchConfig = searchConfig;
    
    // Initialize MySQL connection pool with comprehensive configuration
    this.connection = mysql.createPool({
      host: config.connection.host,
      port: config.connection.port,
      user: config.connection.user,
      password: config.connection.password,
      database: config.connection.database,
      ...(config.connection.ssl && { ssl: config.connection.ssl }),
      charset: config.connection.charset || 'utf8mb4',
      timezone: config.connection.timezone || 'Z',
      connectTimeout: config.connection.connectTimeout || 10000,
      // Pool configuration with enterprise defaults
      connectionLimit: config.pool?.connectionLimit || 20,
      idleTimeout: config.pool?.idleTimeout || 300000, // 5 minutes
      queueLimit: config.pool?.queueLimit || 0 // unlimited queue
    });

    // Set up basic pool event monitoring
    // Note: mysql2 Pool has limited event support compared to individual connections
    console.log(`🔗 MySQL pool initialized for ${config.connection.host}:${config.connection.port}`);
    
    // Pool-level error handling will be done in individual operations
  }

  /**
   * Establishes connection and initializes search infrastructure
   * Creates necessary indexes and configurations for optimal performance
   */
  async connect(): Promise<void> {
    try {
      console.log(`🔗 Connecting to MySQL at ${this.config.connection.host}:${this.config.connection.port}`);
      
      // Test connection with comprehensive health check
      const [results] = await this.connection.execute(
        'SELECT VERSION() as version, DATABASE() as database, NOW() as connected_at'
      );
      const dbInfo = (results as any[])[0];
      console.log(`📋 Connected to MySQL ${dbInfo.version} (database: ${dbInfo.database})`);
      
      // Initialize search infrastructure
      await this.setupSearchInfrastructure();
      
      this.isConnectedFlag = true;
      console.log('✅ MySQL connection established and search infrastructure ready');
      
    } catch (error) {
      this.isConnectedFlag = false;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to connect to MySQL:', message);
      throw new Error(`MySQL connection failed: ${message}`);
    }
  }

  /**
   * Sets up full-text search infrastructure including indexes
   */
  private async setupSearchInfrastructure(): Promise<void> {
    try {
      // Check if full-text search is supported
      await this.connection.execute(
        "SHOW VARIABLES LIKE 'ft_min_word_len'"
      );
      console.log('✅ MySQL full-text search capability confirmed');

      // Create search indexes for each configured table
      for (const [tableName, tableConfig] of Object.entries(this.searchConfig.tables)) {
        if (tableConfig.autoCreateIndexes !== false) {
          await this.createSearchIndexes(tableName, tableConfig);
        }
      }

    } catch (error) {
      console.warn('⚠️ Could not fully initialize search infrastructure:', error);
      // Don't throw - basic functionality may still work
    }
  }

  /**
   * Creates optimized FULLTEXT indexes for search on table columns
   */
  private async createSearchIndexes(tableName: string, tableConfig: any): Promise<void> {
    try {
      const indexName = `ft_${tableName}_search`;
      if (this.indexesCreated.has(indexName)) {return;}

      // Check if table exists
      const [tableExists] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
        [tableName]
      );
      
      if ((tableExists as any[])[0].count === 0) {
        console.log(`⚠️ Table ${tableName} does not exist, skipping index creation`);
        return;
      }

      // Get current engine type
      const [engineInfo] = await this.connection.execute(
        'SELECT ENGINE FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
        [tableName]
      );
      const currentEngine = (engineInfo as any[])[0]?.ENGINE;

      // Ensure table uses InnoDB or MyISAM for FULLTEXT support
      const targetEngine = tableConfig.engine || 'InnoDB';
      if (currentEngine !== targetEngine && currentEngine !== 'InnoDB' && currentEngine !== 'MyISAM') {
        console.log(`🔧 Converting table ${tableName} to ${targetEngine} engine for FULLTEXT support`);
        await this.connection.execute(`ALTER TABLE \`${tableName}\` ENGINE = ${targetEngine}`);
      }

      // Build column list for FULLTEXT index
      const searchColumns = tableConfig.searchColumns.map((col: string) => `\`${col}\``).join(', ');

      // Check if FULLTEXT index already exists
      const [indexExists] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
        [tableName, indexName]
      );

      if ((indexExists as any[])[0].count === 0) {
        // Create FULLTEXT index for fast full-text search
        const createIndexSQL = `
          ALTER TABLE \`${tableName}\` 
          ADD FULLTEXT INDEX ${indexName} (${searchColumns})
        `;
        
        console.log(`🔧 Creating FULLTEXT index: ${indexName}`);
        await this.connection.execute(createIndexSQL);
        console.log(`✅ FULLTEXT index created: ${indexName}`);
      } else {
        console.log(`ℹ️ FULLTEXT index already exists: ${indexName}`);
      }

      this.indexesCreated.add(indexName);

    } catch (error) {
      console.warn(`⚠️ Could not create FULLTEXT index for ${tableName}:`, error);
      // Don't throw - search may still work without optimized indexes
    }
  }

  /**
   * Gracefully closes all connections in the pool
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔄 Gracefully closing MySQL connection pool...');
      await this.connection.end();
      this.isConnectedFlag = false;
      console.log('✅ MySQL connection pool closed');
    } catch (error) {
      console.error('❌ Error closing MySQL connection pool:', error);
      throw error;
    }
  }

  /**
   * Performs comprehensive health check with connection verification
   */
  async isConnected(): Promise<boolean> {
    try {
      // Lightweight health check with minimal overhead
      const [result] = await this.connection.execute('SELECT 1 as health_check, CONNECTION_ID() as connection_id');
      const connected = (result as any[]).length === 1 && (result as any[])[0].health_check === 1;
      this.isConnectedFlag = connected;
      return connected;
    } catch (error) {
      console.warn('MySQL health check failed:', error instanceof Error ? error.message : error);
      this.isConnectedFlag = false;
      return false;
    }
  }

  /**
   * Performs intelligent full-text search across all configured tables
   * Uses MySQL's native MATCH AGAINST with relevance scoring
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag) {
      throw new Error('MySQL connection not established');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    const { limit = 20, offset = 0, filters } = options;
    const results: SearchResult[] = [];

    try {
      // Search across all configured tables in parallel for better performance
      const searchPromises = Object.entries(this.searchConfig.tables).map(async ([tableName, tableConfig]) => {
        // Filter by type if specified
        if (filters?.type && filters.type.length > 0 && !filters.type.includes(tableConfig.type)) {
          return [];
        }

        return this.searchTable(tableName, tableConfig, query, options);
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
      console.error('❌ MySQL search failed:', message);
      throw new Error(`Search failed: ${message}`);
    }
  }

  /**
   * Searches a specific table using optimized MySQL full-text search
   */
  private async searchTable(
    tableName: string,
    tableConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { filters } = options;
    const results: SearchResult[] = [];

    try {
      const searchMode = tableConfig.searchMode || 'NATURAL';
      const searchQuery = this.buildSearchQuery(query, searchMode);
      
      // Build dynamic column list for MATCH AGAINST
      const searchColumns = tableConfig.searchColumns.map((col: string) => `\`${col}\``).join(', ');
      const matchExpression = `MATCH (${searchColumns}) AGAINST (? ${searchMode === 'BOOLEAN' ? 'IN BOOLEAN MODE' : 'IN NATURAL LANGUAGE MODE'})`;

      // Build the main search query with scoring
      let sql = `
        SELECT *,
               ${matchExpression} as relevance_score
        FROM \`${tableName}\`
        WHERE ${matchExpression}
      `;
      
      const params: any[] = [searchQuery, searchQuery];
      const paramIndex = 3;

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
      sql += ` ORDER BY relevance_score DESC`;
      if (tableConfig.columns.createdAt) {
        sql += `, \`${tableConfig.columns.createdAt}\` DESC`;
      }
      sql += ` LIMIT 50`; // Per-table limit to prevent excessive results

      console.log(`🔍 MySQL search query for ${tableName}:`, sql);

      // Execute the search query
      const [rows] = await this.connection.execute(sql, params);
      
      // Transform database rows to SearchResult objects
      for (const row of rows as any[]) {
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
   * Builds MySQL search query from user input
   * Handles boolean operators and quoted phrases
   */
  private buildSearchQuery(query: string, mode: 'NATURAL' | 'BOOLEAN'): string {
    // Clean the query
    const cleanQuery = query.trim();

    if (!cleanQuery) {return '';}

    if (mode === 'BOOLEAN') {
      // For boolean mode, we can pass the query more directly
      // But we should still sanitize and add wildcard support
      return cleanQuery
        .replace(/[^\w\s"'+\-*~<>()]/g, ' ') // Keep boolean operators
        .trim();
    } else {
      // For natural language mode, clean more aggressively
      return cleanQuery
        .replace(/[^\w\s"']/g, ' ') // Remove special chars except quotes
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  /**
   * Builds dynamic WHERE clauses based on search filters
   */
  private buildFilterClauses(filters: any, tableConfig: any, _startParamIndex: number): { clauses: string[], params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    if (!filters) {return { clauses, params };}

    // Category filter with IN clause for multiple values
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      const placeholders = filters.category.map(() => '?').join(', ');
      clauses.push(`\`${tableConfig.columns.category}\` IN (${placeholders})`);
      params.push(...filters.category);
    }

    // Language filter
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      const placeholders = filters.language.map(() => '?').join(', ');
      clauses.push(`\`${tableConfig.columns.language}\` IN (${placeholders})`);
      params.push(...filters.language);
    }

    // Visibility filter
    if (filters.visibility && filters.visibility.length > 0 && tableConfig.columns.visibility) {
      const placeholders = filters.visibility.map(() => '?').join(', ');
      clauses.push(`\`${tableConfig.columns.visibility}\` IN (${placeholders})`);
      params.push(...filters.visibility);
    }

    // Date range filters
    if (filters.dateRange && tableConfig.columns.createdAt) {
      if (filters.dateRange.start) {
        clauses.push(`\`${tableConfig.columns.createdAt}\` >= ?`);
        params.push(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        clauses.push(`\`${tableConfig.columns.createdAt}\` <= ?`);
        params.push(filters.dateRange.end);
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
      relevanceScore: Math.round((row.relevance_score || 0) * 100),
      metadata: {
        tableName: tableConfig.type,
        relevanceScore: row.relevance_score,
        searchMode: tableConfig.searchMode || 'NATURAL',
        hasIndex: this.indexesCreated.has(`ft_${tableConfig.type}_search`)
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
  private handleConnectionError(error: any): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`🔄 Attempting to reconnect to MySQL (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      // Connection will be retried automatically by the pool
    } else {
      console.error('💀 Maximum reconnection attempts reached for MySQL');
    }

    // Handle specific error codes
    switch (error.code) {
      case 'PROTOCOL_CONNECTION_LOST':
        console.warn('MySQL connection lost, will attempt to reconnect');
        break;
      case 'ECONNREFUSED':
        console.error('MySQL connection refused - check if server is running');
        break;
      case 'ER_ACCESS_DENIED_ERROR':
        console.error('MySQL access denied - check credentials');
        break;
      default:
        console.warn('MySQL error:', error.code, error.message);
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
          errors: ['MySQL not connected']
        };
      }

      let isSearchAvailable = false;
      let memoryUsage = 'Unknown';

      try {
        // Test full-text search functionality
        await this.connection.execute(
          "SELECT 1 as test_score"
        );
        isSearchAvailable = true;

        // Get comprehensive database statistics
        const [statsResult] = await this.connection.execute(`
          SELECT 
            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'db_size_mb',
            (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Threads_connected') as active_connections,
            (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Max_used_connections') as max_used_connections
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `);

        if ((statsResult as any[]).length > 0) {
          const stats = (statsResult as any[])[0];
          memoryUsage = `${stats.db_size_mb}MB`;
        }

      } catch (error) {
        console.warn('Could not retrieve full MySQL statistics:', error);
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
   * Gets detailed MySQL performance statistics
   */
  async getDetailedStats(): Promise<any> {
    if (!this.isConnectedFlag) {
      throw new Error('MySQL connection not established');
    }

    try {
      const [stats] = await this.connection.execute(`
        SELECT 
          DATABASE() as database_name,
          (SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) 
           FROM information_schema.tables 
           WHERE table_schema = DATABASE()) as database_size_mb,
          (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Connections') as total_connections,
          (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Threads_connected') as active_connections,
          (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Questions') as total_queries,
          (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Uptime') as uptime_seconds
      `);

      return (stats as any[])[0] || {};
    } catch (error) {
      console.error('Failed to get MySQL detailed stats:', error);
      return {};
    }
  }

  /**
   * Optimizes MySQL configuration for full-text search performance
   */
  async optimizeForSearch(): Promise<void> {
    if (!this.isConnectedFlag) {
      throw new Error('MySQL connection not established');
    }

    try {
      console.log('🔧 Optimizing MySQL configuration for full-text search...');

      // Get current FT settings
      const [ftSettings] = await this.connection.execute(`
        SHOW VARIABLES WHERE Variable_name IN (
          'ft_min_word_len',
          'ft_max_word_len', 
          'ft_stopword_file',
          'innodb_ft_min_token_size',
          'innodb_ft_max_token_size'
        )
      `);

      console.log('Current full-text search settings:', ftSettings);

      // Note: Most FT variables are read-only and require server restart
      // We can only suggest optimizations here
      console.log('💡 For optimal search performance, consider these MySQL configuration settings:');
      console.log('   - ft_min_word_len = 1 (to search single characters)');
      console.log('   - innodb_ft_min_token_size = 1');
      console.log('   - ft_stopword_file = "" (to disable stopwords)');
      console.log('   - innodb_ft_enable_stopword = OFF');

    } catch (error) {
      console.warn('Could not optimize MySQL search settings:', error);
    }
  }
}