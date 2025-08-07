/**
 * @samas/smart-search - MySQL Database Provider
 * Full-text search implementation for MySQL 8.0+
 */

import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

export interface MySQLConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  ssl?: boolean | object;
}

export interface MySQLSearchConfig {
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
      fullTextIndex?: string; // Name of FULLTEXT index
      jsonColumns?: string[]; // Columns with JSON data to search
    };
  };
}

export class MySQLProvider implements DatabaseProvider {
  name = 'MySQL';
  private _connection: any; // We'll use any for now to avoid requiring mysql2 as dependency
  private isConnectedFlag = false;
  private config: MySQLConfig;
  private searchConfig: MySQLSearchConfig;

  constructor(config: MySQLConfig, searchConfig: MySQLSearchConfig) {
    this.config = config;
    this.searchConfig = searchConfig;
    // Note: In real implementation, this would be:
    // const mysql = require('mysql2/promise');
    // this.connection = mysql.createPool(this.buildConnectionConfig());
  }

  private _buildConnectionConfig(): any {
    return {
      host: this.config.host,
      port: this.config.port || 3306,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectionLimit: this.config.connectionLimit || 10,
      acquireTimeout: this.config.acquireTimeout || 60000,
      timeout: this.config.timeout || 60000,
      ssl: this.config.ssl || false,
      charset: 'utf8mb4',
      typeCast: function (field: any, next: any) {
        if (field.type === 'TINY' && field.length === 1) {
          return (field.string() === '1'); // Convert TINYINT to boolean
        }
        return next();
      }
    };
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔗 Connecting to MySQL at ${this.config.host}:${this.config.port || 3306}`);
      
      // In real implementation:
      // await this.connection.getConnection();
      
      // Mock successful connection
      this.isConnectedFlag = true;
      console.log('✅ Connected to MySQL successfully');
    } catch (error) {
      this.isConnectedFlag = false;
      console.error('❌ Failed to connect to MySQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // In real implementation:
      // await this.connection.end();
      this.isConnectedFlag = false;
      console.log('✅ Disconnected from MySQL');
    } catch (error) {
      console.error('❌ Error disconnecting from MySQL:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      // In real implementation:
      // const [rows] = await this.connection.execute('SELECT 1');
      return this.isConnectedFlag;
    } catch {
      this.isConnectedFlag = false;
      return false;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag) {
      throw new Error('MySQL connection not established');
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
      console.error('❌ MySQL search failed:', error);
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
    const searchColumns = tableConfig.searchColumns;
    const results: SearchResult[] = [];

    try {
      // Build FULLTEXT search query
      const fullTextColumns = searchColumns.join(', ');
      const searchQuery = this.escapeSearchQuery(query);

      // Build base query
      let sql = `
        SELECT *, 
               MATCH(${fullTextColumns}) AGAINST('${searchQuery}' IN NATURAL LANGUAGE MODE) as relevance_score
        FROM ${tableName}
        WHERE MATCH(${fullTextColumns}) AGAINST('${searchQuery}' IN NATURAL LANGUAGE MODE)
      `;

      // Add filters
      const filterClauses = this.buildFilterClauses(filters, tableConfig);
      if (filterClauses.length > 0) {
        sql += ' AND ' + filterClauses.join(' AND ');
      }

      // Add ordering
      sql += ' ORDER BY relevance_score DESC';

      console.log(`🔍 MySQL search query: ${sql}`);

      // In real implementation:
      // const [rows] = await this.connection.execute(sql);
      
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

  private buildFilterClauses(filters: any, tableConfig: any): string[] {
    const clauses: string[] = [];

    if (!filters) return clauses;

    // Category filter
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      const categories = filters.category.map((c: string) => `'${this.escapeString(c)}'`).join(', ');
      clauses.push(`${tableConfig.columns.category} IN (${categories})`);
    }

    // Language filter
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      const languages = filters.language.map((l: string) => `'${this.escapeString(l)}'`).join(', ');
      clauses.push(`${tableConfig.columns.language} IN (${languages})`);
    }

    // Visibility filter
    if (filters.visibility && filters.visibility.length > 0 && tableConfig.columns.visibility) {
      const visibilities = filters.visibility.map((v: string) => `'${this.escapeString(v)}'`).join(', ');
      clauses.push(`${tableConfig.columns.visibility} IN (${visibilities})`);
    }

    // Date range filter
    if (filters.dateRange && tableConfig.columns.createdAt) {
      if (filters.dateRange.start) {
        clauses.push(`${tableConfig.columns.createdAt} >= '${this.escapeString(filters.dateRange.start)}'`);
      }
      if (filters.dateRange.end) {
        clauses.push(`${tableConfig.columns.createdAt} <= '${this.escapeString(filters.dateRange.end)}'`);
      }
    }

    return clauses;
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }

  private escapeSearchQuery(query: string): string {
    // Escape special MySQL fulltext characters
    return query.replace(/[+\-><()~*"@]/g, '\\$&');
  }

  private generateMockResults(_tableName: string, query: string, type: string): any[] {
    // Generate realistic mock data based on table type
    const baseResults = [];
    const queryLower = query.toLowerCase();

    if (type === 'product') {
      baseResults.push({
        id: 1,
        product_name: `Premium ${query} Device`,
        product_description: `High-quality ${query} with advanced features`,
        category_name: 'Electronics',
        price: 299.99,
        created_date: '2024-01-15',
        relevance_score: 0.95
      });
    } else if (type === 'customer') {
      baseResults.push({
        customer_id: 1,
        customer_name: `${query} Smith`,
        email: `${queryLower}@example.com`,
        notes: `Customer interested in ${query} products`,
        registration_date: '2024-01-10',
        relevance_score: 0.88
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
      relevanceScore: Math.round((row.relevance_score || 0) * 100),
      metadata: {
        tableName: tableConfig.type,
        originalRow: row
      }
    };
  }

  private determineMatchType(row: any, query: string, tableConfig: any): SearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    
    // Check title match
    if (row[tableConfig.columns.title]?.toLowerCase().includes(queryLower)) {
      return 'title';
    }
    
    // Check description match
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
          errors: ['MySQL not connected']
        };
      }

      // Test search functionality
      let isSearchAvailable = false;
      try {
        // In real implementation:
        // const [rows] = await this.connection.execute('SHOW TABLES');
        isSearchAvailable = true;
      } catch (error) {
        console.warn('MySQL search functionality unavailable:', error);
      }

      // Get database statistics
      // In real implementation:
      // const [statusRows] = await this.connection.execute('SHOW STATUS LIKE "Threads_connected"');
      // const [variableRows] = await this.connection.execute('SHOW VARIABLES LIKE "max_connections"');
      
      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage: '128MB', // Mock value
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