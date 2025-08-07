/**
 * @samas/smart-search - Universal Types
 * Common interfaces and types for universal database search
 */

export interface SearchResult {
  id: string;
  type: 'book' | 'user' | 'book_club' | 'author' | 'qa' | 'custom';
  title: string;
  subtitle?: string;
  description?: string;
  author?: string;
  category?: string;
  language?: string;
  visibility?: string;
  thumbnail?: string;
  profilePicture?: string;
  coverImage?: string;
  memberCount?: number;
  bookCount?: number;
  createdAt?: string;
  viewCount?: number;
  tags?: string[];
  isbn?: string;
  uploaderName?: string;
  uploaderEmail?: string;
  matchType: 'title' | 'author' | 'description' | 'username' | 'name' | 'tag' | 'category' | 'language' | 'isbn' | 'uploader' | 'question' | 'answer' | 'custom';
  relevanceScore: number;
  bookTitle?: string; // For Q&A results
  metadata?: Record<string, any>; // For custom data
}

export interface SearchFilters {
  type?: string[];
  category?: string[];
  language?: string[];
  visibility?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  custom?: Record<string, any>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'date' | 'views' | 'name' | 'custom';
  sortOrder?: 'asc' | 'desc';
  cacheEnabled?: boolean;
  cacheTTL?: number;
  fallbackEnabled?: boolean;
}

export interface SearchStrategy {
  primary: 'cache' | 'database';
  fallback: 'cache' | 'database';
  reason: string;
}

export interface SearchPerformance {
  searchTime: number;
  resultCount: number;
  strategy: 'cache' | 'database' | 'hybrid';
  cacheHit: boolean;
  errors?: string[];
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailure: number;
  nextRetryTime: number;
}

export interface HealthStatus {
  isConnected: boolean;
  isSearchAvailable: boolean;
  latency: number;
  memoryUsage: string;
  keyCount: number;
  lastSync: string | null;
  errors: string[];
}

// Provider Interfaces
export interface DatabaseProvider {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  checkHealth(): Promise<HealthStatus>;
}

export interface CacheProvider {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  checkHealth(): Promise<HealthStatus>;
}

export interface SmartSearchConfig {
  database: DatabaseProvider;
  cache?: CacheProvider;
  fallback: 'database' | 'cache';
  circuitBreaker?: {
    failureThreshold?: number;
    recoveryTimeout?: number;
    healthCacheTTL?: number;
  };
  cache?: {
    enabled?: boolean;
    defaultTTL?: number;
    maxSize?: number;
  };
  performance?: {
    enableMetrics?: boolean;
    logQueries?: boolean;
    slowQueryThreshold?: number;
  };
}