# Smart Search - Development Guide

> **Best practices, patterns, and tips for developing with Smart Search**

[![Open Source](https://img.shields.io/badge/Open%20Source-Apache%202.0-blue)](https://github.com/samas-it-services/smart-search)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](#typescript-development)
[![Community](https://img.shields.io/badge/Community-Driven-brightgreen)](#community-patterns)

## 🎯 Development Philosophy

Smart Search is designed to be **simple to integrate** while being **powerful under the hood**. This guide shares proven patterns and practices from the community to help you build robust search applications.

### 🌟 Core Principles

- **🔧 Configuration Over Code**: Set up behavior through config files
- **🏗️ Composition Over Inheritance**: Build complex behavior from simple parts
- **📊 Explicit Over Implicit**: Clear, predictable behavior
- **🛡️ Fail Fast and Safe**: Quick error detection with graceful degradation
- **🤝 Community Patterns**: Learn from others' implementations

---

## 🚀 Getting Started

### Quick Setup Pattern

The most common setup pattern in the community:

```typescript
import { SmartSearch } from '@samas/smart-search';
import { ConfigLoader } from '@samas/smart-search/config';

// 1. Load configuration (file or environment)
const config = new ConfigLoader().loadConfig();

// 2. Initialize Smart Search
const smartSearch = new SmartSearch(config);

// 3. Connect to providers
await smartSearch.initialize();

// 4. Start searching
const results = await smartSearch.search('query', { limit: 10 });
```

### Environment-Specific Patterns

**Development Setup:**
```typescript
// dev.config.js
export default {
  database: {
    type: 'sqlite',
    connection: { filename: './dev.db' }
  },
  cache: {
    type: 'redis', 
    connection: { host: 'localhost', port: 6379 }
  },
  performance: {
    logQueries: true,
    enableMetrics: true
  }
};
```

**Production Setup:**
```typescript
// prod.config.js
export default {
  database: {
    type: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: true
    }
  },
  cache: {
    type: 'redis',
    connection: {
      url: process.env.REDIS_URL,
      tls: true
    }
  },
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000
  }
};
```

---

## 🏗️ Architecture Patterns

### 1. Repository Pattern

Wrap Smart Search in a repository for cleaner architecture:

```typescript
// UserSearchRepository.ts
export class UserSearchRepository {
  constructor(private smartSearch: SmartSearch) {}

  async searchUsers(query: string, filters?: UserFilters): Promise<User[]> {
    const searchOptions = {
      table: 'users',
      filters: this.buildFilters(filters),
      limit: filters?.limit || 20
    };

    const results = await this.smartSearch.search(query, searchOptions);
    return results.map(result => this.mapToUser(result));
  }

  private buildFilters(filters?: UserFilters) {
    const sqlFilters = [];
    
    if (filters?.role) {
      sqlFilters.push(`role = '${filters.role}'`);
    }
    
    if (filters?.department) {
      sqlFilters.push(`department = '${filters.department}'`);
    }
    
    return sqlFilters.join(' AND ');
  }

  private mapToUser(searchResult: any): User {
    return {
      id: searchResult.id,
      name: searchResult.title,
      email: searchResult.email,
      role: searchResult.role
    };
  }
}
```

### 2. Service Layer Pattern

Use services to handle business logic:

```typescript
// SearchService.ts
export class SearchService {
  constructor(
    private smartSearch: SmartSearch,
    private authService: AuthService,
    private auditService: AuditService
  ) {}

  async performSearch(
    userId: string, 
    query: string, 
    options: SearchOptions
  ): Promise<SearchResults> {
    // 1. Authentication & Authorization
    const user = await this.authService.getUser(userId);
    this.validateSearchPermissions(user, options);

    // 2. Audit the search request
    await this.auditService.logSearchAttempt(userId, query, options);

    try {
      // 3. Execute search with user context
      const results = await this.smartSearch.secureSearch(query, {
        ...options,
        securityContext: {
          userId,
          userRole: user.role,
          timestamp: new Date()
        }
      });

      // 4. Post-process results based on user permissions
      const filteredResults = await this.filterResultsByPermissions(
        user, 
        results
      );

      // 5. Log successful search
      await this.auditService.logSearchSuccess(userId, filteredResults.length);

      return filteredResults;

    } catch (error) {
      // 6. Log search failure
      await this.auditService.logSearchFailure(userId, error);
      throw error;
    }
  }

  private validateSearchPermissions(user: User, options: SearchOptions) {
    // Implement your authorization logic
    if (options.table === 'sensitive_data' && user.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
  }
}
```

### 3. Factory Pattern for Multi-Tenant

Handle multiple tenants or environments:

```typescript
// SmartSearchFactory.ts
export class SmartSearchFactory {
  private static instances = new Map<string, SmartSearch>();

  static async getSmartSearch(tenantId: string): Promise<SmartSearch> {
    if (!this.instances.has(tenantId)) {
      const config = await this.loadTenantConfig(tenantId);
      const instance = new SmartSearch(config);
      await instance.initialize();
      
      this.instances.set(tenantId, instance);
    }

    return this.instances.get(tenantId)!;
  }

  private static async loadTenantConfig(tenantId: string) {
    // Load tenant-specific configuration
    return {
      database: {
        type: 'postgresql',
        connection: {
          // Tenant-specific database connection
          database: `tenant_${tenantId}`,
          // ... other connection details
        }
      },
      cache: {
        type: 'redis',
        connection: {
          // Tenant-specific cache namespace
          keyPrefix: `tenant:${tenantId}:`
        }
      }
    };
  }

  static async cleanup() {
    // Cleanup connections when shutting down
    for (const [tenantId, instance] of this.instances) {
      await instance.disconnect();
    }
    this.instances.clear();
  }
}
```

---

## 💡 Common Development Patterns

### Error Handling Patterns

**1. Graceful Degradation:**
```typescript
async function searchWithFallback(query: string): Promise<SearchResult[]> {
  try {
    // Try cache-enabled search first
    return await smartSearch.search(query, { useCache: true });
  } catch (cacheError) {
    console.warn('Cache search failed, falling back to database:', cacheError);
    
    try {
      // Fallback to database-only search
      return await smartSearch.search(query, { useCache: false });
    } catch (dbError) {
      console.error('Database search failed:', dbError);
      
      // Final fallback - return empty results or cached results
      return await getCachedResultsOrEmpty(query);
    }
  }
}
```

**2. Circuit Breaker Monitoring:**
```typescript
class SearchMonitor {
  constructor(private smartSearch: SmartSearch) {
    this.setupCircuitBreakerMonitoring();
  }

  private setupCircuitBreakerMonitoring() {
    this.smartSearch.on('circuitBreakerOpen', (provider) => {
      console.warn(`Circuit breaker opened for ${provider}`);
      this.alertOpsTeam(`Search provider ${provider} is down`);
    });

    this.smartSearch.on('circuitBreakerRecovered', (provider) => {
      console.info(`Circuit breaker recovered for ${provider}`);
      this.notifyOpsTeam(`Search provider ${provider} recovered`);
    });
  }
}
```

### Performance Patterns

**1. Query Optimization:**
```typescript
class QueryOptimizer {
  optimizeQuery(query: string, options: SearchOptions): SearchOptions {
    return {
      ...options,
      
      // Add search columns for better performance
      searchColumns: this.getOptimalColumns(options.table),
      
      // Optimize pagination
      limit: Math.min(options.limit || 20, 100),
      
      // Add indexes hint if available
      useIndexes: this.getRecommendedIndexes(options.table),
      
      // Cache frequently searched terms
      cacheTTL: this.calculateOptimalTTL(query, options)
    };
  }

  private calculateOptimalTTL(query: string, options: SearchOptions): number {
    // Short TTL for user-specific searches
    if (this.isUserSpecific(query)) return 300; // 5 minutes
    
    // Medium TTL for dynamic content
    if (options.table === 'posts' || options.table === 'articles') {
      return 1800; // 30 minutes
    }
    
    // Long TTL for static content
    return 3600; // 1 hour
  }
}
```

**2. Batch Operations:**
```typescript
class BatchSearchService {
  async searchMultiple(queries: string[]): Promise<SearchResult[][]> {
    // Batch queries for better performance
    const batchSize = 10;
    const batches = this.chunk(queries, batchSize);
    
    const results = [];
    for (const batch of batches) {
      const batchPromises = batch.map(query => 
        this.smartSearch.search(query).catch(error => {
          console.warn(`Query failed: ${query}`, error);
          return []; // Return empty results for failed queries
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
      array.slice(index * size, index * size + size)
    );
  }
}
```

### Caching Strategies

**1. Cache Warming:**
```typescript
class CacheWarmer {
  constructor(private smartSearch: SmartSearch) {}

  async warmFrequentSearches(): Promise<void> {
    const frequentQueries = await this.getFrequentQueries();
    
    console.log(`Warming cache with ${frequentQueries.length} frequent queries`);
    
    for (const query of frequentQueries) {
      try {
        await this.smartSearch.search(query.term, {
          ...query.options,
          // Force cache update
          refreshCache: true
        });
        
        await this.delay(100); // Rate limit cache warming
      } catch (error) {
        console.warn(`Failed to warm cache for: ${query.term}`, error);
      }
    }
  }

  private async getFrequentQueries() {
    // Get frequent queries from analytics or database
    return [
      { term: 'user dashboard', options: { table: 'users' } },
      { term: 'latest posts', options: { table: 'posts', orderBy: 'created_at DESC' } },
      // ... more frequent queries
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**2. Smart Cache Invalidation:**
```typescript
class SmartCacheInvalidator {
  constructor(private smartSearch: SmartSearch) {}

  async invalidateRelatedCaches(tableName: string, recordId: string) {
    // Invalidate specific patterns based on data changes
    const patterns = this.getCachePatterns(tableName, recordId);
    
    for (const pattern of patterns) {
      await this.smartSearch.invalidateCache(pattern);
    }
  }

  private getCachePatterns(tableName: string, recordId: string): string[] {
    const patterns = [`${tableName}:*`]; // Invalidate all queries for this table
    
    if (tableName === 'users') {
      patterns.push(
        `search:users:${recordId}:*`,  // User-specific caches
        'search:users:list:*',         // User listing caches
        'search:users:count:*'         // User count caches
      );
    }
    
    return patterns;
  }
}
```

---

## 🧪 Testing Patterns

### Unit Testing

```typescript
// SmartSearch.test.ts
import { SmartSearch } from '@samas/smart-search';
import { MockDatabaseProvider, MockCacheProvider } from '../__mocks__';

describe('SmartSearch', () => {
  let smartSearch: SmartSearch;
  let mockDatabase: MockDatabaseProvider;
  let mockCache: MockCacheProvider;

  beforeEach(() => {
    mockDatabase = new MockDatabaseProvider();
    mockCache = new MockCacheProvider();
    
    smartSearch = new SmartSearch({
      database: mockDatabase,
      cache: mockCache,
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 5000
      }
    });
  });

  it('should fallback to database when cache fails', async () => {
    // Arrange
    mockCache.search.mockRejectedValue(new Error('Cache unavailable'));
    mockDatabase.search.mockResolvedValue([
      { id: 1, title: 'Result 1' }
    ]);

    // Act
    const results = await smartSearch.search('test query');

    // Assert
    expect(results).toHaveLength(1);
    expect(mockDatabase.search).toHaveBeenCalledWith('test query', expect.any(Object));
  });

  it('should trigger circuit breaker after threshold failures', async () => {
    // Arrange
    mockCache.search.mockRejectedValue(new Error('Service unavailable'));
    mockDatabase.search.mockResolvedValue([]);

    // Act - trigger failures
    for (let i = 0; i < 3; i++) {
      await smartSearch.search('test').catch(() => {}); // Ignore errors
    }

    // Assert - circuit breaker should be open
    const health = await smartSearch.getHealthStatus();
    expect(health.circuitBreaker.isOpen).toBe(true);
  });
});
```

### Integration Testing

```typescript
// integration.test.ts
import { SmartSearch } from '@samas/smart-search';
import { TestContainers } from './test-containers';

describe('SmartSearch Integration', () => {
  let containers: TestContainers;
  let smartSearch: SmartSearch;

  beforeAll(async () => {
    // Start test containers (PostgreSQL + Redis)
    containers = new TestContainers();
    await containers.start();
    
    smartSearch = new SmartSearch({
      database: {
        type: 'postgresql',
        connection: containers.getPostgresConnection()
      },
      cache: {
        type: 'redis',
        connection: containers.getRedisConnection()
      }
    });
    
    await smartSearch.initialize();
  });

  afterAll(async () => {
    await smartSearch.disconnect();
    await containers.stop();
  });

  it('should perform end-to-end search with real database', async () => {
    // Insert test data
    await containers.insertTestData('users', [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ]);

    // Search for users
    const results = await smartSearch.search('John', {
      table: 'users',
      searchColumns: ['name', 'email']
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('John Doe');
  });
});
```

### Load Testing

```typescript
// load.test.ts
import { SmartSearch } from '@samas/smart-search';

describe('SmartSearch Load Testing', () => {
  it('should handle concurrent searches', async () => {
    const smartSearch = new SmartSearch(config);
    await smartSearch.initialize();
    
    const concurrentSearches = 100;
    const searchPromises = Array.from({ length: concurrentSearches }, (_, i) =>
      smartSearch.search(`query ${i}`, { table: 'test_table' })
    );

    const start = Date.now();
    const results = await Promise.allSettled(searchPromises);
    const duration = Date.now() - start;

    // Assert performance criteria
    expect(duration).toBeLessThan(5000); // All searches complete in 5 seconds
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const successRate = successful / concurrentSearches;
    expect(successRate).toBeGreaterThan(0.95); // 95% success rate
  });
});
```

---

## 🔧 Configuration Patterns

### Environment-Based Configuration

```typescript
// config/ConfigManager.ts
export class ConfigManager {
  private static configs = new Map<string, any>();

  static getConfig(environment = process.env.NODE_ENV || 'development') {
    if (!this.configs.has(environment)) {
      this.configs.set(environment, this.loadConfig(environment));
    }
    return this.configs.get(environment);
  }

  private static loadConfig(env: string) {
    const baseConfig = {
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000
      }
    };

    const envConfigs = {
      development: {
        ...baseConfig,
        database: {
          type: 'sqlite',
          connection: { filename: './dev.db' }
        },
        performance: {
          logQueries: true,
          enableMetrics: true
        }
      },

      test: {
        ...baseConfig,
        database: {
          type: 'sqlite',
          connection: { filename: ':memory:' }
        },
        circuitBreaker: {
          failureThreshold: 2, // Faster failure for tests
          recoveryTimeout: 1000
        }
      },

      production: {
        ...baseConfig,
        database: {
          type: 'postgresql',
          connection: {
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
          }
        },
        cache: {
          type: 'redis',
          connection: { url: process.env.REDIS_URL }
        }
      }
    };

    return envConfigs[env] || envConfigs.development;
  }
}
```

### Feature Flags

```typescript
// config/FeatureFlags.ts
export class FeatureFlags {
  private static flags = new Map<string, boolean>();

  static initialize() {
    this.flags.set('experimental_caching', process.env.ENABLE_EXPERIMENTAL_CACHING === 'true');
    this.flags.set('advanced_analytics', process.env.ENABLE_ANALYTICS === 'true');
    this.flags.set('debug_mode', process.env.NODE_ENV === 'development');
  }

  static isEnabled(flag: string): boolean {
    return this.flags.get(flag) || false;
  }
}

// Usage in SmartSearch configuration
const config = {
  ...baseConfig,
  
  performance: {
    enableMetrics: FeatureFlags.isEnabled('advanced_analytics'),
    logQueries: FeatureFlags.isEnabled('debug_mode')
  },
  
  cache: {
    ...cacheConfig,
    experimentalFeatures: FeatureFlags.isEnabled('experimental_caching')
  }
};
```

---

## 📊 Monitoring & Observability

### Custom Metrics

```typescript
// monitoring/MetricsCollector.ts
export class MetricsCollector {
  private metrics = {
    searchCount: 0,
    cacheHitRatio: 0,
    averageResponseTime: 0,
    errorRate: 0
  };

  constructor(private smartSearch: SmartSearch) {
    this.setupMetricsCollection();
  }

  private setupMetricsCollection() {
    this.smartSearch.on('searchCompleted', (event) => {
      this.metrics.searchCount++;
      this.updateAverageResponseTime(event.responseTime);
      
      if (event.servedFromCache) {
        this.updateCacheHitRatio(true);
      } else {
        this.updateCacheHitRatio(false);
      }
    });

    this.smartSearch.on('searchError', (error) => {
      this.metrics.errorRate = this.calculateErrorRate();
    });
  }

  getMetrics() {
    return { ...this.metrics };
  }

  private updateAverageResponseTime(newTime: number) {
    // Simple moving average calculation
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.searchCount - 1) + newTime) / 
      this.metrics.searchCount;
  }

  private updateCacheHitRatio(wasHit: boolean) {
    // Update cache hit ratio calculation
    // Implementation depends on your tracking approach
  }
}
```

### Health Checks

```typescript
// health/HealthChecker.ts
export class HealthChecker {
  constructor(private smartSearch: SmartSearch) {}

  async getDetailedHealth(): Promise<HealthStatus> {
    const [dbHealth, cacheHealth, circuitBreakerStatus] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      this.smartSearch.getCircuitBreakerStatus()
    ]);

    return {
      overall: this.calculateOverallHealth(dbHealth, cacheHealth),
      database: dbHealth,
      cache: cacheHealth,
      circuitBreaker: circuitBreakerStatus,
      timestamp: new Date()
    };
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await this.smartSearch.healthCheck('database');
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      };
    }
  }

  private calculateOverallHealth(...components: ComponentHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy');
    if (unhealthyComponents.length > 0) return 'unhealthy';
    
    const degradedComponents = components.filter(c => c.status === 'degraded');
    if (degradedComponents.length > 0) return 'degraded';
    
    return 'healthy';
  }
}
```

---

## 🤝 Community Development Patterns

### Contribution Patterns

Many community contributors have shared these helpful patterns:

**1. Provider Development Pattern:**
```typescript
// Example: Adding a new database provider
export class CustomDatabaseProvider implements DatabaseProvider {
  constructor(private config: CustomDatabaseConfig) {}

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Implement search logic for your database
    const results = await this.executeCustomQuery(query, options);
    return this.formatResults(results);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Implement other required methods...
}
```

**2. Plugin Pattern:**
```typescript
// Example: Adding search result enhancement
export class SearchResultEnhancer {
  constructor(private smartSearch: SmartSearch) {
    this.setupEnhancements();
  }

  private setupEnhancements() {
    this.smartSearch.addResultProcessor(async (results, context) => {
      return await Promise.all(results.map(result => 
        this.enhanceResult(result, context)
      ));
    });
  }

  private async enhanceResult(result: SearchResult, context: SearchContext) {
    // Add computed fields, fetch related data, etc.
    return {
      ...result,
      relevanceScore: await this.calculateRelevance(result, context),
      relatedItems: await this.getRelatedItems(result.id),
      userPermissions: await this.getUserPermissions(context.userId, result)
    };
  }
}
```

### Debugging Patterns

Community-contributed debugging helpers:

```typescript
// debug/SearchDebugger.ts
export class SearchDebugger {
  constructor(private smartSearch: SmartSearch) {}

  async debugSearch(query: string, options: SearchOptions) {
    console.group(`🔍 Debug Search: "${query}"`);
    
    const start = Date.now();
    
    try {
      // Log search attempt
      console.log('Search Options:', JSON.stringify(options, null, 2));
      
      // Check cache status
      const cacheStatus = await this.smartSearch.getCacheStatus();
      console.log('Cache Status:', cacheStatus);
      
      // Execute search
      const results = await this.smartSearch.search(query, options);
      
      const duration = Date.now() - start;
      console.log(`✅ Search completed in ${duration}ms`);
      console.log(`📊 Results: ${results.length} items`);
      
      // Log performance metrics
      const metrics = await this.smartSearch.getPerformanceMetrics();
      console.table(metrics);
      
      return results;
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      
      // Log diagnostic info
      await this.logDiagnosticInfo();
      
      throw error;
    } finally {
      console.groupEnd();
    }
  }

  private async logDiagnosticInfo() {
    const health = await this.smartSearch.getHealthStatus();
    console.warn('Health Status:', health);
    
    const circuitBreaker = await this.smartSearch.getCircuitBreakerStatus();
    console.warn('Circuit Breaker:', circuitBreaker);
  }
}
```

---

## 📚 Learning Resources

### Recommended Learning Path

**1. Beginner (First Week)**
- Set up Smart Search in a simple project
- Try different database/cache combinations
- Experiment with basic search queries
- Read through the configuration options

**2. Intermediate (First Month)**
- Implement error handling and fallback strategies
- Set up monitoring and health checks
- Try different caching strategies
- Build a small project with user authentication

**3. Advanced (First Quarter)**
- Implement custom providers if needed
- Set up performance monitoring
- Contribute to the open source project
- Help other community members

### Code Examples Repository

The community maintains a repository of patterns and examples:

```bash
# Clone the community examples
git clone https://github.com/samas-it-services/smart-search-examples

# Browse patterns by use case
ls smart-search-examples/patterns/
# authentication/
# caching-strategies/
# error-handling/
# monitoring/
# multi-tenant/
# performance/
```

### Community Resources

- **[GitHub Discussions](https://github.com/samas-it-services/smart-search/discussions)** - Ask questions, share patterns
- **[Example Projects](https://github.com/samas-it-services/smart-search/tree/main/examples)** - Working code examples
- **[Community Wiki](https://github.com/samas-it-services/smart-search/wiki)** - Collaborative documentation
- **[Issue Tracker](https://github.com/samas-it-services/smart-search/issues)** - Bug reports and feature requests

---

## 🎯 Development Tips

### Performance Tips
- Use connection pooling for databases
- Implement proper cache TTL strategies
- Monitor query performance and optimize slow queries
- Use pagination for large result sets

### Security Tips  
- Never log sensitive data in search queries
- Implement proper user authorization
- Use environment variables for credentials
- Regularly update dependencies

### Reliability Tips
- Implement circuit breakers for external dependencies
- Use comprehensive error handling
- Set up proper health checks
- Monitor application metrics

### Testing Tips
- Use test containers for integration tests
- Mock external dependencies in unit tests
- Test error scenarios and edge cases
- Measure and verify performance requirements

---

**Ready to start developing with Smart Search?**

[📖 **Read Documentation**](https://github.com/samas-it-services/smart-search#readme) | [💬 **Join Community**](https://github.com/samas-it-services/smart-search/discussions) | [🚀 **Contribute Code**](https://github.com/samas-it-services/smart-search/blob/main/CONTRIBUTING.md)

---

*This development guide is maintained by the Smart Search community. All patterns and examples are contributed by real users solving real problems.*