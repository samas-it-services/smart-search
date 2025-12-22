import { SupabaseClient } from '@supabase/supabase-js';

/**
 * @samas/smart-search - Universal Types
 * Common interfaces and types for universal database search
 */
interface SearchResult {
    id: string;
    type: 'book' | 'user' | 'book_club' | 'author' | 'qa' | 'custom' | 'financial_data' | 'healthcare_data' | 'retail_data' | 'education_data' | 'real_estate_data';
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
    url?: string;
    score?: number;
    matchType: 'title' | 'author' | 'description' | 'username' | 'name' | 'tag' | 'category' | 'language' | 'isbn' | 'uploader' | 'question' | 'answer' | 'custom';
    relevanceScore: number;
    bookTitle?: string;
    metadata?: Record<string, any>;
}
interface SearchFilters {
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
interface SearchOptions {
    limit?: number;
    offset?: number;
    filters?: SearchFilters;
    sortBy?: 'relevance' | 'date' | 'views' | 'name' | 'custom';
    sortOrder?: 'asc' | 'desc';
    cacheEnabled?: boolean;
    cacheTTL?: number;
    fallbackEnabled?: boolean;
}
interface SearchStrategy {
    primary: 'cache' | 'database';
    fallback: 'cache' | 'database';
    reason: string;
}
interface SearchPerformance {
    searchTime: number;
    resultCount: number;
    strategy: 'cache' | 'database' | 'hybrid';
    cacheHit: boolean;
    errors?: string[];
}
interface CircuitBreakerState {
    isOpen: boolean;
    failureCount: number;
    lastFailure: number;
    nextRetryTime: number;
}
interface HealthStatus {
    status?: 'healthy' | 'unhealthy' | 'degraded';
    isConnected: boolean;
    isSearchAvailable: boolean;
    latency?: number;
    responseTime?: number;
    memoryUsage?: string;
    keyCount?: number;
    lastSync?: string | null;
    errors?: string[];
    message?: string;
    timestamp?: string;
    details?: Record<string, any>;
}
interface DatabaseProvider {
    name: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): Promise<boolean>;
    search(query: string, options: SearchOptions): Promise<SearchResult[]>;
    checkHealth(): Promise<HealthStatus>;
}
interface CacheProvider {
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
interface SmartSearchConfig {
    database: DatabaseProvider;
    cache?: CacheProvider;
    fallback: 'database' | 'cache';
    circuitBreaker?: {
        failureThreshold?: number;
        recoveryTimeout?: number;
        healthCacheTTL?: number;
    };
    cacheConfig?: {
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

/**
 * @samas/smart-search - Enterprise Data Governance
 * Field-level security, audit logging, and row-level access control
 */

interface SecurityContext {
    userId: string;
    userRole: string;
    institutionId?: string;
    clearanceLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
interface DataGovernanceConfig {
    fieldMasking: {
        [fieldPath: string]: (value: any, userRole: string, context: SecurityContext) => any;
    };
    rowLevelSecurity: {
        [tableName: string]: (userId: string, userRole: string, context: SecurityContext) => string;
    };
    auditLogging: {
        enabled: boolean;
        logLevel: 'basic' | 'detailed' | 'comprehensive';
        fields: string[];
        retention?: number;
        destination: 'console' | 'database' | 'file' | 'external';
        sensitiveDataRedaction: boolean;
    };
    dataClassification: {
        [fieldPath: string]: 'public' | 'internal' | 'confidential' | 'restricted' | 'pii' | 'phi';
    };
    encryptionAtRest: {
        enabled: boolean;
        algorithm: 'AES256' | 'RSA';
        keyManagement: 'internal' | 'aws-kms' | 'azure-kv' | 'gcp-kms';
    };
    accessControl: {
        roleBasedAccess: boolean;
        attributeBasedAccess: boolean;
        timeBasedAccess: boolean;
    };
}

/**
 * @samas/smart-search - Core Smart Search Class
 * Universal search with intelligent fallback for any database + cache combination
 *
 * Features:
 * - Automatic cache/database health monitoring
 * - Seamless fallback when cache is unavailable
 * - Performance tracking and analytics
 * - Circuit breaker pattern for cache failures
 * - Intelligent caching strategy
 * - Universal provider system
 */

interface EnhancedSmartSearchConfig extends SmartSearchConfig {
    dataGovernance?: DataGovernanceConfig;
    hybridSearch?: {
        enabled: boolean;
        cacheWeight: number;
        databaseWeight: number;
        mergingAlgorithm: 'union' | 'intersection' | 'weighted';
    };
}
declare class SmartSearch {
    private database;
    private cache?;
    private dataGovernance?;
    private circuitBreakerManager;
    private healthCheckInterval;
    private lastHealthCheck;
    private cachedHealthStatus;
    private circuitBreaker;
    private readonly FAILURE_THRESHOLD;
    private readonly RECOVERY_TIMEOUT;
    private readonly HEALTH_CACHE_TTL;
    private readonly enableMetrics;
    private readonly logQueries;
    private readonly slowQueryThreshold;
    private readonly cacheEnabled;
    private readonly defaultCacheTTL;
    private readonly hybridSearchEnabled;
    private readonly hybridSearchConfig;
    constructor(config: EnhancedSmartSearchConfig);
    /**
     * Enterprise search with data governance and security
     */
    secureSearch(query: string, userContext: SecurityContext, options?: SearchOptions): Promise<{
        results: SearchResult[];
        performance: SearchPerformance;
        strategy: SearchStrategy;
        auditId: string;
    }>;
    /**
     * Hybrid search combining cache and database results
     */
    hybridSearch(query: string, options?: SearchOptions): Promise<{
        results: SearchResult[];
        performance: SearchPerformance;
        strategy: SearchStrategy;
    }>;
    /**
     * Intelligent search with automatic cache/database switching
     */
    search(query: string, options?: SearchOptions): Promise<{
        results: SearchResult[];
        performance: SearchPerformance;
        strategy: SearchStrategy;
    }>;
    /**
     * Get current cache health status with caching
     */
    getCacheHealth(): Promise<HealthStatus | null>;
    /**
     * Force a cache health check and update cache
     */
    forceHealthCheck(): Promise<HealthStatus | null>;
    /**
     * Get search service statistics
     */
    getSearchStats(): Promise<{
        cacheHealth: HealthStatus | null;
        databaseHealth: HealthStatus;
        circuitBreaker: CircuitBreakerState;
        recommendedStrategy: SearchStrategy;
    }>;
    /**
     * Clear cache data
     */
    clearCache(pattern?: string): Promise<void>;
    private determineSearchStrategy;
    private searchWithCache;
    private searchWithDatabase;
    private generateCacheKey;
    private isCircuitBreakerOpen;
    private recordCacheFailure;
    private resetCircuitBreaker;
    private logSearchPerformance;
    private initializeHealthMonitoring;
    /**
     * Merge search results from cache and database using specified algorithm
     */
    private mergeSearchResults;
    private unionMerge;
    private intersectionMerge;
    private weightedMerge;
    /**
     * Enhanced search with circuit breaker protection
     */
    private searchWithCircuitBreaker;
    /**
     * Initialize cache connection and create search indexes
     */
    private initializeCacheConnection;
}

/**
 * @samas/smart-search - Configuration Loader
 * Loads configuration from YAML, JSON, or environment variables
 */
interface SmartSearchConfigFile {
    database: {
        type: 'supabase' | 'mysql' | 'postgresql' | 'mongodb';
        connection: {
            url?: string;
            host?: string;
            port?: number;
            user?: string;
            username?: string;
            password?: string;
            database?: string;
            key?: string;
            uri?: string;
        };
        options?: Record<string, string | number | boolean>;
    };
    cache?: {
        type: 'redis' | 'memcached' | 'dragonfly';
        connection: {
            url?: string;
            host?: string;
            port?: number;
            password?: string;
            username?: string;
            apiKey?: string;
            db?: number;
            tls?: boolean | object;
            servers?: string[];
        };
        options?: Record<string, string | number | boolean>;
    };
    search: {
        fallback: 'database' | 'cache';
        tables: Record<string, {
            columns: Record<string, string>;
            searchColumns: string[];
            type: string;
        }>;
    };
    circuitBreaker?: {
        failureThreshold?: number;
        recoveryTimeout?: number;
        healthCacheTTL?: number;
    };
    cacheConfig?: {
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
declare class ConfigLoader {
    private static instance;
    private config;
    private configPath;
    static getInstance(): ConfigLoader;
    /**
     * Load configuration from file or environment
     */
    loadConfig(configPath?: string): SmartSearchConfigFile;
    /**
     * Get current configuration
     */
    getConfig(): SmartSearchConfigFile | null;
    /**
     * Reload configuration
     */
    reloadConfig(): SmartSearchConfigFile;
    private getDefaultConfigPaths;
    private loadFromFile;
    loadFromEnvironment(): SmartSearchConfigFile;
    private validateAndMergeDefaults;
    /**
     * Create a config template
     */
    static createTemplate(format?: 'json' | 'yaml'): string;
}

/**
 * @samas/smart-search - Factory for creating SmartSearch instances from configuration
 */

declare class SmartSearchFactory {
    private static configLoader;
    /**
     * Create SmartSearch instance from configuration file
     */
    static fromConfig(configPath?: string): SmartSearch;
    /**
     * Create SmartSearch instance from environment variables
     */
    static fromEnvironment(): SmartSearch;
    /**
     * Create SmartSearch instance from configuration object
     */
    static fromConfigObject(config: SmartSearchConfigFile): SmartSearch;
    private static createFromConfigObject;
    private static createDatabaseProvider;
    private static createCacheProvider;
    /**
     * Generate configuration template files
     */
    static generateConfigTemplate(format?: 'json' | 'yaml', outputPath?: string): string;
    /**
     * Validate configuration
     */
    static validateConfig(config: SmartSearchConfigFile): {
        valid: boolean;
        errors: string[];
    };
}

/**
 * @samas/smart-search - Supabase Database Provider
 * Universal Supabase integration for @samas/smart-search
 */

interface SupabaseConfig {
    url: string;
    key: string;
    options?: {
        auth?: {
            autoRefreshToken?: boolean;
            persistSession?: boolean;
        };
    };
}
interface SupabaseSearchConfig {
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
declare class SupabaseProvider implements DatabaseProvider {
    name: string;
    client: SupabaseClient;
    private isConnectedFlag;
    private searchConfig;
    constructor(config: SupabaseConfig, searchConfig?: SupabaseSearchConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): Promise<boolean>;
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    private searchTable;
    private determineMatchType;
    private calculateRelevanceScore;
    checkHealth(): Promise<HealthStatus>;
}

/**
 * @samas/smart-search - Redis Cache Provider
 * Universal Redis integration for @samas/smart-search
 */

interface RedisConfig {
    host?: string;
    port?: number;
    password?: string;
    username?: string;
    apiKey?: string;
    db?: number;
    url?: string;
    connectTimeout?: number;
    lazyConnect?: boolean;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    tls?: boolean | object;
}
interface RedisSearchIndexConfig {
    indexName: string;
    prefix: string;
    schema: Record<string, string>;
}
declare class RedisProvider implements CacheProvider {
    name: string;
    private redis;
    private isConnectedFlag;
    private searchIndexes;
    private config;
    constructor(config: RedisConfig);
    /**
     * Build Redis configuration with support for different authentication methods
     */
    private buildRedisConfig;
    connect(): Promise<void>;
    /**
     * Auto-create search indexes for common data structures
     */
    private createDefaultSearchIndexes;
    /**
     * Create healthcare-specific search index
     */
    private createHealthcareSearchIndex;
    /**
     * Create generic search index for other data types
     */
    private createGenericSearchIndex;
    /**
     * Log connection method for debugging (without exposing sensitive data)
     */
    private logConnectionMethod;
    disconnect(): Promise<void>;
    isConnected(): Promise<boolean>;
    /**
     * Create search index for Redis Search
     */
    createSearchIndex(config: RedisSearchIndexConfig): Promise<void>;
    /**
     * Add document to search index
     */
    addToIndex(indexName: string, key: string, document: Record<string, any>): Promise<void>;
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    private searchIndex;
    private parseRedisDocument;
    private transformToSearchResult;
    private getIndexType;
    private mapSortBy;
    private determineMatchType;
    private calculateRelevanceScore;
    set(key: string, value: any, ttl?: number): Promise<void>;
    get(key: string): Promise<any>;
    delete(key: string): Promise<void>;
    clear(pattern?: string): Promise<void>;
    checkHealth(): Promise<HealthStatus>;
}

/**
 * @samas/smart-search - Universal Search Library
 * Intelligent search with fallback for any database + cache combination
 *
 * Licensed under Apache-2.0
 *
 * Support the project:
 * - ⭐ Star on GitHub: https://github.com/samas-it-services/smart-search
 * - 💰 Sponsor: https://github.com/sponsors/bilgrami
 * - ☕ Buy me a coffee: https://ko-fi.com/bilgrami
 * - 🐦 Follow: https://x.com/sbilgrami
 */

export { CacheProvider, CircuitBreakerState, ConfigLoader, DatabaseProvider, HealthStatus, RedisConfig, RedisProvider, RedisSearchIndexConfig, SearchFilters, SearchOptions, SearchPerformance, SearchResult, SearchStrategy, SmartSearch, SmartSearchConfig, SmartSearchConfigFile, SmartSearchFactory, SupabaseConfig, SupabaseProvider, SupabaseSearchConfig, SmartSearch as default };
