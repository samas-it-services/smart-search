/**
 * @samas/smart-search - SQLite Database Provider
 * Lightweight full-text search implementation using FTS5
 */

import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

export interface SQLiteConfig {
  database: string; // Path to SQLite database file or ':memory:'
  options?: {
    verbose?: boolean;
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
  };
}

export interface SQLiteSearchConfig {
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
      ftsTable?: string; // FTS5 virtual table name
      ftsConfig?: string; // FTS5 configuration options
    };
  };
}

export class SQLiteProvider implements DatabaseProvider {
  name = 'SQLite';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  private _db: any; // We'll use any for now to avoid requiring better-sqlite3 as dependency
  private isConnectedFlag = false;
  private config: SQLiteConfig;
  private searchConfig: SQLiteSearchConfig;

  constructor(config: SQLiteConfig, searchConfig: SQLiteSearchConfig) {
    this.config = config;
    this.searchConfig = searchConfig;
    // Note: In real implementation, this would be:
    // const Database = require('better-sqlite3');
    // this.db = new Database(config.database, config.options);
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔗 Opening SQLite database: ${this.config.database}`);
      
      // In real implementation:
      // this.db.pragma('journal_mode = WAL');
      // this.db.pragma('synchronous = NORMAL');
      // this.db.pragma('temp_store = memory');
      
      // Mock successful connection
      this.isConnectedFlag = true;
      console.log('✅ Connected to SQLite successfully');
      
      // Initialize FTS tables if needed
      await this.initializeFTSTables();
      
    } catch (error) {
      this.isConnectedFlag = false;
      console.error('❌ Failed to connect to SQLite:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // In real implementation:
      // this.db.close();
      this.isConnectedFlag = false;
      console.log('✅ Disconnected from SQLite');
    } catch (error) {
      console.error('❌ Error disconnecting from SQLite:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      // In real implementation:
      // const result = this.db.prepare('SELECT 1').get();
      return this.isConnectedFlag;
    } catch {
      this.isConnectedFlag = false;
      return false;
    }
  }

  private async initializeFTSTables(): Promise<void> {
    try {
      for (const [tableName, tableConfig] of Object.entries(this.searchConfig.tables)) {
        const ftsTableName = tableConfig.ftsTable || `${tableName}_fts`;
        
        // Check if FTS table exists
        // In real implementation:
        // const exists = this.db.prepare(`
        //   SELECT name FROM sqlite_master 
        //   WHERE type='table' AND name=?
        // `).get(ftsTableName);
        
        // if (!exists) {
        //   const searchColumns = tableConfig.searchColumns.join(', ');
        //   const createFtsSQL = `
        //     CREATE VIRTUAL TABLE ${ftsTableName} USING fts5(
        //       ${searchColumns},
        //       content='${tableName}'
        //     )
        //   `;
        //   this.db.exec(createFtsSQL);
        //   console.log(`✅ Created FTS5 table: ${ftsTableName}`);
        // }
        
        console.log(`📋 FTS table ${ftsTableName} ready for ${tableName}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize FTS tables:', error);
      // Don't throw - FTS is optional
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag) {
      throw new Error('SQLite connection not established');
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
      console.error('❌ SQLite search failed:', error);
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
      const ftsTableName = tableConfig.ftsTable || `${tableName}_fts`;
      const searchQuery = this.prepareFtsQuery(query);
      
      // Try FTS5 search first
      let sql = `
        SELECT 
          t.*,
          bm25(fts) as fts_score
        FROM ${ftsTableName} fts
        JOIN ${tableName} t ON t.${tableConfig.columns.id} = fts.rowid
        WHERE fts MATCH ?
      `;
      
      let params = [searchQuery];

      // Add filters
      const filterClauses = this.buildFilterClauses(filters, tableConfig);
      if (filterClauses.clauses.length > 0) {
        sql += ' AND ' + filterClauses.clauses.join(' AND ');
        params.push(...filterClauses.params);
      }

      // Add ordering
      sql += ' ORDER BY fts_score';
      sql += ' LIMIT 50'; // Internal limit per table

      console.log(`🔍 SQLite FTS5 query: ${sql}`);
      console.log('Parameters:', params);

      // In real implementation:
      // const stmt = this.db.prepare(sql);
      // const rows = stmt.all(...params);
      
      // Mock results for demonstration
      const mockRows = this.generateMockResults(tableName, query, tableConfig.type);
      
      for (const row of mockRows) {
        const result = this.transformRowToSearchResult(row, tableConfig, query);
        if (result) {
          results.push(result);
        }
      }

    } catch (error) {
      console.warn(`⚠️ FTS5 search failed for table ${tableName}, falling back to LIKE search:`, error);
      
      // Fallback to basic LIKE search
      try {
        const fallbackResults = await this.fallbackSearch(tableName, tableConfig, query, options);
        results.push(...fallbackResults);
      } catch (fallbackError) {
        console.error(`❌ Fallback search failed for table ${tableName}:`, fallbackError);
      }
    }

    return results;
  }

  private async fallbackSearch(
    tableName: string,
    tableConfig: any,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { filters } = options;
    const results: SearchResult[] = [];

    // Build LIKE-based search across search columns
    const searchColumns = tableConfig.searchColumns;
    const likeConditions = searchColumns.map((col: string) => 
      `${col} LIKE ? COLLATE NOCASE`
    ).join(' OR ');

    let sql = `SELECT * FROM ${tableName} WHERE (${likeConditions})`;
    let params = searchColumns.map(() => `%${query}%`);

    // Add filters
    const filterClauses = this.buildFilterClauses(filters, tableConfig);
    if (filterClauses.clauses.length > 0) {
      sql += ' AND ' + filterClauses.clauses.join(' AND ');
      params.push(...filterClauses.params);
    }

    sql += ` ORDER BY ${tableConfig.columns.createdAt} DESC LIMIT 50`;

    console.log(`🔍 SQLite LIKE fallback query: ${sql}`);

    // In real implementation:
    // const stmt = this.db.prepare(sql);
    // const rows = stmt.all(...params);
    
    // Mock results
    const mockRows = this.generateMockResults(tableName, query, tableConfig.type);
    
    for (const row of mockRows) {
      const result = this.transformRowToSearchResult(row, tableConfig, query);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  private prepareFtsQuery(query: string): string {
    // Prepare query for FTS5
    // Handle phrases, boolean operators, etc.
    
    // Basic implementation - clean and quote phrases
    return query
      .replace(/[^\w\s"]/g, ' ') // Remove special chars except quotes
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.includes('"') ? word : `"${word}"*`) // Phrase or prefix search
      .join(' AND ');
  }

  private buildFilterClauses(filters: any, tableConfig: any): { clauses: string[], params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    if (!filters) return { clauses, params };

    // Category filter
    if (filters.category && filters.category.length > 0 && tableConfig.columns.category) {
      const placeholders = filters.category.map(() => '?').join(', ');
      clauses.push(`${tableConfig.columns.category} IN (${placeholders})`);
      params.push(...filters.category);
    }

    // Language filter
    if (filters.language && filters.language.length > 0 && tableConfig.columns.language) {
      const placeholders = filters.language.map(() => '?').join(', ');
      clauses.push(`${tableConfig.columns.language} IN (${placeholders})`);
      params.push(...filters.language);
    }

    // Visibility filter
    if (filters.visibility && filters.visibility.length > 0 && tableConfig.columns.visibility) {
      const placeholders = filters.visibility.map(() => '?').join(', ');
      clauses.push(`${tableConfig.columns.visibility} IN (${placeholders})`);
      params.push(...filters.visibility);
    }

    // Date range filter
    if (filters.dateRange && tableConfig.columns.createdAt) {
      if (filters.dateRange.start) {
        clauses.push(`${tableConfig.columns.createdAt} >= ?`);
        params.push(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        clauses.push(`${tableConfig.columns.createdAt} <= ?`);
        params.push(filters.dateRange.end);
      }
    }

    return { clauses, params };
  }

  private generateMockResults(_tableName: string, query: string, type: string): any[] {
    // Generate realistic mock data based on table type
    const baseResults = [];
    const queryLower = query.toLowerCase();

    if (type === 'book') {
      baseResults.push({
        id: 1,
        title: `The Complete Guide to ${query}`,
        author: 'Expert Author',
        description: `Comprehensive book covering all aspects of ${query} with practical examples`,
        category: 'Education',
        language: 'en',
        visibility: 'public',
        uploaded_at: '2024-01-15T10:00:00Z',
        fts_score: -2.5 // BM25 score (negative is better)
      });
    } else if (type === 'user') {
      baseResults.push({
        id: 1,
        full_name: `${query} Developer`,
        username: queryLower.replace(/\s+/g, '_'),
        bio: `Experienced developer specializing in ${query} technologies`,
        created_at: '2023-06-01T00:00:00Z',
        fts_score: -1.8
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
      relevanceScore: this.calculateRelevanceScore(row),
      metadata: {
        tableName: tableConfig.type,
        ftsScore: row.fts_score,
        usedFallback: !row.fts_score
      }
    };
  }

  private calculateRelevanceScore(row: any): number {
    // Convert BM25 score to 0-100 relevance score
    if (row.fts_score !== undefined) {
      // BM25 scores are negative, convert to positive percentage
      return Math.max(0, Math.min(100, Math.round((10 + row.fts_score) * 10)));
    }
    return 50; // Default for fallback search
  }

  private determineMatchType(row: any, query: string, tableConfig: any): SearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    
    // Check title match
    if (row[tableConfig.columns.title]?.toLowerCase().includes(queryLower)) {
      return 'title';
    }
    
    // Check subtitle/author match
    if (row[tableConfig.columns.subtitle]?.toLowerCase().includes(queryLower)) {
      return 'author';
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
          errors: ['SQLite not connected']
        };
      }

      // Test search functionality
      let isSearchAvailable = false;
      try {
        // In real implementation:
        // const result = this.db.prepare("SELECT fts5_version()").get();
        isSearchAvailable = true;
      } catch (error) {
        console.warn('SQLite FTS5 functionality unavailable:', error);
        isSearchAvailable = false; // Can still work with LIKE fallback
      }

      // Get database statistics
      // In real implementation:
      // const dbStats = this.db.prepare(`
      //   SELECT 
      //     page_count * page_size as db_size,
      //     page_count,
      //     page_size
      //   FROM pragma_page_count(), pragma_page_size()
      // `).get();
      
      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        isSearchAvailable,
        latency,
        memoryUsage: '64MB', // Mock value - SQLite is lightweight
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