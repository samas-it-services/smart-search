/**
 * @samas/smart-search - Supabase Database Provider
 * Universal Supabase integration for @samas/smart-search
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DatabaseProvider,
  SearchResult,
  SearchOptions,
  HealthStatus
} from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
    };
  };
}

export interface SupabaseSearchConfig {
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
    };
  };
}

export class SupabaseProvider implements DatabaseProvider {
  name = 'Supabase';
  private supabase: SupabaseClient;
  private isConnectedFlag = false;
  private searchConfig: SupabaseSearchConfig;

  constructor(config: SupabaseConfig, searchConfig: SupabaseSearchConfig) {
    this.supabase = createClient(config.url, config.key, config.options);
    this.searchConfig = searchConfig;
  }

  async connect(): Promise<void> {
    try {
      // Test connection by checking if we can access the database
      // Try to query the first configured table, or use a system table if none configured
      const tableNames = Object.keys(this.searchConfig.tables);
      const testTable = tableNames.length > 0 ? tableNames[0] : 'information_schema.tables';
      
      const { error } = await this.supabase
        .from(testTable)
        .select('*')
        .limit(1);
      
      // PGRST116 = no rows returned (table exists but empty) - this is OK
      // PGRST106 = table not found - this is OK for testing connection
      if (error && !['PGRST116', 'PGRST106'].includes(error.code)) {
        throw error;
      }
      
      this.isConnectedFlag = true;
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnectedFlag = false;
  }

  async isConnected(): Promise<boolean> {
    return this.isConnectedFlag;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConnectedFlag) {
      await this.connect();
    }

    const results: SearchResult[] = [];
    const { filters, limit = 20 } = options;

    // Get tables to search based on filter types or default to all configured tables
    let tablesToSearch: string[];
    
    if (filters?.type && filters.type.length > 0) {
      // Find tables that match the requested types
      tablesToSearch = Object.keys(this.searchConfig.tables).filter(tableName => {
        const tableConfig = this.searchConfig.tables[tableName];
        return filters.type!.includes(tableConfig.type);
      });
    } else {
      tablesToSearch = Object.keys(this.searchConfig.tables);
    }

    // Search each configured table type
    for (const tableType of tablesToSearch) {
      const tableConfig = this.searchConfig.tables[tableType];
      if (!tableConfig) {continue;}

      try {
        const tableResults = await this.searchTable(query, tableType, tableConfig, options);
        results.push(...tableResults);
      } catch (error) {
        console.error(`❌ Error searching ${tableType}:`, error);
      }
    }

    // Sort by relevance and apply limit
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, limit);
  }

  private async searchTable(
    query: string, 
    tableType: string, 
    tableConfig: SupabaseSearchConfig['tables'][string],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { columns, searchColumns, type } = tableConfig;
    const { filters } = options;

    // Build the column selection
    const selectColumns = Object.values(columns).filter(Boolean).join(', ');

    // Build the search query
    let queryBuilder = this.supabase
      .from(tableType)
      .select(selectColumns);

    // Build OR condition for search columns
    const orConditions = searchColumns.map(col => `${col}.ilike.%${query}%`);
    if (orConditions.length > 0) {
      queryBuilder = queryBuilder.or(orConditions.join(','));
    }

    // Apply filters
    if (filters?.category && filters.category.length > 0 && columns.category) {
      queryBuilder = queryBuilder.in(columns.category, filters.category);
    }

    if (filters?.language && filters.language.length > 0 && columns.language) {
      queryBuilder = queryBuilder.in(columns.language, filters.language);
    }

    if (filters?.visibility && filters.visibility.length > 0 && columns.visibility) {
      queryBuilder = queryBuilder.in(columns.visibility, filters.visibility);
    }

    // Apply date range filter
    if (filters?.dateRange && columns.createdAt) {
      if (filters.dateRange.start) {
        queryBuilder = queryBuilder.gte(columns.createdAt, filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        queryBuilder = queryBuilder.lte(columns.createdAt, filters.dateRange.end);
      }
    }

    // Execute query
    const { data, error } = await queryBuilder.limit(20);

    if (error) {
      throw error;
    }

    // Transform results to SearchResult format
    return (data || []).map((item: any) => ({
      id: item[columns.id],
      type: type as SearchResult['type'],
      title: item[columns.title] || 'Unknown Title',
      subtitle: columns.subtitle ? item[columns.subtitle] : undefined,
      description: columns.description ? item[columns.description] : undefined,
      category: columns.category ? item[columns.category] : undefined,
      language: columns.language ? item[columns.language] : undefined,
      visibility: columns.visibility ? item[columns.visibility] : undefined,
      createdAt: columns.createdAt ? item[columns.createdAt] : undefined,
      matchType: this.determineMatchType(query, item, searchColumns),
      relevanceScore: this.calculateRelevanceScore(query, item, columns),
      metadata: item // Store full object for custom use
    }));
  }

  private determineMatchType(query: string, item: any, searchColumns: string[]): SearchResult['matchType'] {
    const queryLower = query.toLowerCase();
    
    for (const column of searchColumns) {
      const value = item[column];
      if (value && typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
        // Map database columns to match types
        switch (column) {
          case 'title':
          case 'name':
            return 'title';
          case 'author':
            return 'author';
          case 'description':
          case 'bio':
            return 'description';
          case 'username':
            return 'username';
          case 'category':
            return 'category';
          case 'language':
            return 'language';
          case 'question':
            return 'question';
          case 'answer':
            return 'answer';
          default:
            return 'custom';
        }
      }
    }
    
    return 'title'; // Default
  }

  private calculateRelevanceScore(query: string, item: any, columns: SupabaseSearchConfig['tables'][string]['columns']): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title/name match gets highest score
    const titleField = item[columns.title];
    if (titleField && typeof titleField === 'string') {
      const titleLower = titleField.toLowerCase();
      if (titleLower === queryLower) {score += 100;}
      else if (titleLower.startsWith(queryLower)) {score += 80;}
      else if (titleLower.includes(queryLower)) {score += 60;}
    }

    // Subtitle match gets medium-high score
    if (columns.subtitle) {
      const subtitleField = item[columns.subtitle];
      if (subtitleField && typeof subtitleField === 'string') {
        const subtitleLower = subtitleField.toLowerCase();
        if (subtitleLower === queryLower) {score += 80;}
        else if (subtitleLower.startsWith(queryLower)) {score += 60;}
        else if (subtitleLower.includes(queryLower)) {score += 40;}
      }
    }

    // Description match gets lower score
    if (columns.description) {
      const descField = item[columns.description];
      if (descField && typeof descField === 'string') {
        const descLower = descField.toLowerCase();
        if (descLower.includes(queryLower)) {score += 20;}
      }
    }

    // Category exact match gets bonus
    if (columns.category) {
      const categoryField = item[columns.category];
      if (categoryField && typeof categoryField === 'string' && categoryField.toLowerCase() === queryLower) {
        score += 50;
      }
    }

    return score;
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity using the same approach as connect()
      const tableNames = Object.keys(this.searchConfig.tables);
      const testTable = tableNames.length > 0 ? tableNames[0] : 'information_schema.tables';
      
      const { error } = await this.supabase
        .from(testTable)
        .select('*')
        .limit(1);
      
      const latency = Math.max(1, Date.now() - startTime); // Ensure minimum 1ms latency
      
      // PGRST116 = no rows returned, PGRST106 = table not found - both OK for health check
      if (error && !['PGRST116', 'PGRST106'].includes(error.code)) {
        return {
          isConnected: false,
          isSearchAvailable: false,
          latency,
          memoryUsage: 'N/A',
          keyCount: 0,
          lastSync: null,
          errors: [error.message || 'Connection failed']
        };
      }

      return {
        isConnected: true,
        isSearchAvailable: true,
        latency,
        memoryUsage: 'N/A',
        keyCount: Object.keys(this.searchConfig.tables).length,
        lastSync: new Date().toISOString(),
        errors: []
      };

    } catch (error) {
      return {
        isConnected: false,
        isSearchAvailable: false,
        latency: Math.max(1, Date.now() - startTime), // Ensure minimum 1ms latency
        memoryUsage: 'N/A',
        keyCount: 0,
        lastSync: null,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}