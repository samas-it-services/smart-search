# Smart Search Package - Test-Driven Development (TDD) Plan

## 1. Introduction to TDD Approach

### 1.1 TDD Philosophy
The Smart Search Package will follow a Test-Driven Development approach where tests are written before the actual implementation code. This ensures:
- Clear requirements understanding before implementation
- Higher code quality and maintainability
- Better design through test-focused development
- Reduced bugs and regressions
- Confidence in refactoring and feature additions

### 1.2 Testing Pyramid
- **Unit Tests**: 70% - Test individual functions, classes, and providers
- **Integration Tests**: 20% - Test interactions between components and providers
- **End-to-End Tests**: 10% - Test complete search workflows

## 2. Testing Framework and Tools

### 2.1 Primary Testing Tools
- **Unit/Integration Testing**: Vitest with JSDOM for browser APIs
- **UI Component Testing**: React Testing Library with Jest matchers
- **End-to-End Testing**: Playwright for browser automation
- **API Testing**: Vitest for backend API endpoints
- **Code Coverage**: Vitest built-in coverage with Istanbul reporter

### 2.2 Assertion Libraries
- Jest expect for assertions
- React Testing Library queries for DOM interactions
- Playwright locators for end-to-end tests

### 2.3 Mocking and Stubbing
- Vitest's built-in mocking utilities
- MSW (Mock Service Worker) for API mocking
- Provider mocking for database and cache interactions

## 3. Test Organization and Structure

### 3.1 File Structure Convention
```
smart-search/
├── tests/
│   ├── unit/
│   │   ├── SmartSearch/
│   │   ├── providers/
│   │   ├── strategies/
│   │   └── types/
│   ├── integration/
│   │   ├── SmartSearch/
│   │   ├── provider-compatibility/
│   │   └── circuit-breaker/
│   ├── e2e/
│   │   ├── showcase-apps/
│   │   └── performance/
│   └── fixtures/
│       ├── mock-data/
│       └── test-config/
```

### 3.2 Naming Conventions
- Unit tests: `ComponentName.test.ts` or `functionName.test.ts`
- Integration tests: `featureName.integration.test.ts`
- E2E tests: `featureName.e2e.test.ts`
- Mock data: `mock-data.featureName.ts`

## 4. Unit Testing Strategy

### 4.1 SmartSearch Class Testing
**Objective**: Test the core SmartSearch class functionality

**Example Test Structure**:
```typescript
// tests/unit/SmartSearch/SmartSearch.test.ts
describe('SmartSearch Class', () => {
  let smartSearch: SmartSearch;
  let mockDatabase: DatabaseProvider;
  let mockCache: CacheProvider;

  beforeEach(() => {
    mockDatabase = {
      name: 'MockDatabase',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockResolvedValue(true),
      search: vi.fn().mockResolvedValue([]),
      checkHealth: vi.fn().mockResolvedValue({ isConnected: true, isSearchAvailable: true })
    };

    mockCache = {
      name: 'MockCache',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockResolvedValue(true),
      search: vi.fn().mockResolvedValue([]),
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      checkHealth: vi.fn().mockResolvedValue({ isConnected: true, isSearchAvailable: true })
    };

    smartSearch = new SmartSearch({
      database: mockDatabase,
      cache: mockCache,
      fallback: 'database'
    });
  });

  test('initializes with database and cache providers', () => {
    expect(smartSearch).toBeDefined();
    expect(mockDatabase.connect).toHaveBeenCalled();
    expect(mockCache.connect).toHaveBeenCalled();
  });

  test('performs search with cache-first strategy when cache is healthy', async () => {
    const mockResults = [{ id: '1', title: 'Test Result', type: 'book', relevanceScore: 0.9 }];
    mockCache.get = vi.fn().mockResolvedValue(null); // Cache miss
    mockCache.set = vi.fn().mockResolvedValue(undefined);
    mockDatabase.search = vi.fn().mockResolvedValue(mockResults);

    const result = await smartSearch.search('test query');

    expect(mockCache.get).toHaveBeenCalled();
    expect(mockDatabase.search).toHaveBeenCalledWith('test query', {});
    expect(mockCache.set).toHaveBeenCalledWith(
      expect.stringContaining('search:'),
      mockResults,
      expect.any(Number)
    );
    expect(result.results).toEqual(mockResults);
    expect(result.strategy.primary).toBe('cache'); // Based on health check
  });

  test('falls back to database when cache is unavailable', async () => {
    // Simulate cache failure
    mockCache.checkHealth = vi.fn().mockResolvedValue({
      isConnected: false,
      isSearchAvailable: false
    });

    const mockResults = [{ id: '1', title: 'Test Result', type: 'book', relevanceScore: 0.9 }];
    mockDatabase.search = vi.fn().mockResolvedValue(mockResults);

    const result = await smartSearch.search('test query');

    expect(result.strategy.primary).toBe('database');
    expect(result.strategy.reason).toContain('Cache unavailable');
    expect(result.results).toEqual(mockResults);
  });
});
```

### 4.2 Provider Testing
**Objective**: Test individual provider implementations

**Example Test Structure**:
```typescript
// tests/unit/providers/RedisProvider.test.ts
describe('RedisProvider', () => {
  test('connects to Redis server', async () => {
    const redisProvider = new RedisProvider({
      host: 'localhost',
      port: 6379
    });

    await redisProvider.connect();
    
    expect(redisProvider.isConnected()).toBe(true);
  });

  test('performs search operations', async () => {
    const redisProvider = new RedisProvider({
      host: 'localhost',
      port: 6379
    });

    const results = await redisProvider.search('test query', { limit: 10 });
    
    expect(results).toBeInstanceOf(Array);
    // Verify search implementation details
  });
});
```

### 4.3 Circuit Breaker Testing
**Objective**: Test circuit breaker functionality

**Example Test Structure**:
```typescript
// tests/unit/strategies/CircuitBreaker.test.ts
describe('Circuit Breaker', () => {
  test('opens circuit after failure threshold', async () => {
    const circuitBreaker = new CircuitBreakerManager({
      failureThreshold: 3,
      recoveryTimeout: 1000
    });

    // Simulate 3 consecutive failures
    await circuitBreaker.execute('test', async () => { throw new Error('Simulated failure'); });
    await circuitBreaker.execute('test', async () => { throw new Error('Simulated failure'); });
    await circuitBreaker.execute('test', async () => { throw new Error('Simulated failure'); });

    // Next call should be blocked by open circuit
    await expect(circuitBreaker.execute('test', async () => 'success')).rejects.toThrow();
  });

  test('closes circuit after recovery timeout', async () => {
    const circuitBreaker = new CircuitBreakerManager({
      failureThreshold: 1,
      recoveryTimeout: 10 // 10ms for testing
    });

    // Open the circuit
    await circuitBreaker.execute('test', async () => { throw new Error('Simulated failure'); });
    
    // Wait for recovery timeout
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Next call should succeed
    const result = await circuitBreaker.execute('test', async () => 'success');
    expect(result).toBe('success');
  });
});
```

## 5. Integration Testing Strategy

### 5.1 Provider Compatibility Tests
**Objective**: Test different database/cache combinations

**Example Test Structure**:
```typescript
// tests/integration/provider-compatibility/PostgreSQL-Redis.test.ts
describe('PostgreSQL + Redis Integration', () => {
  test('search works with PostgreSQL database and Redis cache', async () => {
    const postgresProvider = new PostgreSQLProvider({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'test',
      user: process.env.POSTGRES_USER || 'test',
      password: process.env.POSTGRES_PASSWORD || 'test'
    });

    const redisProvider = new RedisProvider({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    const smartSearch = new SmartSearch({
      database: postgresProvider,
      cache: redisProvider,
      fallback: 'database'
    });

    // Insert test data
    const testData = {
      id: 'test-1',
      title: 'Test Book',
      type: 'book',
      relevanceScore: 0.9
    };
    // Insert into database for testing...

    const results = await smartSearch.search('Test Book');
    
    expect(results.results).toContainEqual(testData);
    expect(results.strategy.primary).toBe('cache'); // Should use cache if healthy
  });
});
```

### 5.2 Circuit Breaker Integration Tests
**Objective**: Test circuit breaker with real providers

**Example Test Structure**:
```typescript
// tests/integration/circuit-breaker/circuit-breaker-integration.test.ts
describe('Circuit Breaker Integration', () => {
  test('circuit breaker protects against failing cache', async () => {
    // Mock a failing cache provider
    const mockDatabase = new MockDatabaseProvider();
    const failingCache = {
      name: 'FailingCache',
      connect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockResolvedValue(true),
      search: vi.fn().mockRejectedValue(new Error('Cache unavailable')),
      set: vi.fn().mockRejectedValue(new Error('Cache unavailable')),
      get: vi.fn().mockRejectedValue(new Error('Cache unavailable')),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      checkHealth: vi.fn().mockResolvedValue({
        isConnected: false,
        isSearchAvailable: false
      })
    };

    const smartSearch = new SmartSearch({
      database: mockDatabase,
      cache: failingCache,
      fallback: 'database',
      circuitBreaker: {
        failureThreshold: 2,
        recoveryTimeout: 100
      }
    });

    // First two calls should fail and trigger circuit breaker
    await expect(smartSearch.search('test')).resolves.toEqual(
      expect.objectContaining({ strategy: expect.objectContaining({ primary: 'database' }) })
    );
    await expect(smartSearch.search('test')).resolves.toEqual(
      expect.objectContaining({ strategy: expect.objectContaining({ primary: 'database' }) })
    );

    // Third call should be blocked by circuit breaker
    await expect(smartSearch.search('test')).resolves.toEqual(
      expect.objectContaining({ strategy: expect.objectContaining({ primary: 'database' }) })
    );
  });
});
```

## 6. End-to-End Testing Strategy

### 6.1 Showcase Application Tests
**Objective**: Test complete showcase applications with real data

**Example Test Structure**:
```typescript
// tests/e2e/showcase-apps/postgres-redis-showcase.test.ts
describe('PostgreSQL + Redis Showcase App', () => {
  test('search functionality works end-to-end', async ({ page }) => {
    // Start the showcase app
    const app = await startShowcaseApp('postgres-redis');
    
    await page.goto('http://localhost:3002');
    
    // Perform search
    await page.fill('input[placeholder=Search...]', 'diabetes');
    await page.click('button[type=submit]');
    
    // Verify results appear
    await expect(page.locator('.search-result')).toBeVisible();
    await expect(page.locator('.search-result')).toHaveCountGreaterThan(0);
    
    // Verify performance metrics
    const responseTime = await page.locator('.response-time').textContent();
    expect(parseInt(responseTime)).toBeLessThan(100); // Should be under 100ms
    
    // Clean up
    await app.stop();
  });
});
```

### 6.2 Performance Tests
**Objective**: Test performance under load

**Example Test Structure**:
```typescript
// tests/e2e/performance/load-test.test.ts
describe('Performance Tests', () => {
  test('handles concurrent search requests', async () => {
    const smartSearch = new SmartSearch({
      database: new PostgreSQLProvider({...}),
      cache: new RedisProvider({...}),
      fallback: 'database'
    });

    // Execute 100 concurrent search requests
    const concurrentRequests = Array.from({ length: 100 }, () => 
      smartSearch.search('performance test')
    );

    const results = await Promise.allSettled(concurrentRequests);
    
    // Verify most requests succeeded
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(95); // 95% success rate
    
    // Verify average response time
    // Implementation would track response times
  });
});
```

## 7. Testing Best Practices

### 7.1 Test Writing Principles
1. **One assertion per test** when possible for clear failure identification
2. **Descriptive test names** that clearly state what is being tested
3. **Independent tests** that don't rely on other tests' state
4. **Arrange-Act-Assert** pattern for clear test structure
5. **Test behavior, not implementation** - focus on what the code does, not how

### 7.2 Mocking Strategies
- **Provider mocking**: Mock database and cache providers for unit tests
- **Network mocking**: Mock network calls for provider tests
- **Configuration mocking**: Mock environment variables and config files
- **Performance mocking**: Mock timing for circuit breaker tests

### 7.3 Data Management
- **Test fixtures**: Maintain consistent test data in fixtures directory
- **Database seeding**: Use seeding for integration tests with known data state
- **Cleanup**: Ensure tests clean up after themselves to prevent data pollution
- **Isolation**: Each test should run in isolation without affecting others

## 8. Continuous Integration (CI) Testing

### 8.1 Test Execution Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:coverage
        env:
          CI: true

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd redis-cli ping
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:integration
        env:
          POSTGRES_HOST: localhost
          REDIS_HOST: localhost

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### 8.2 Code Coverage Requirements
- **Minimum coverage**: 80% for all new features
- **Critical paths**: 90% coverage for circuit breaker and health checks
- **Coverage reports**: Generate and upload to Codecov
- **Coverage gates**: Fail builds if coverage drops below thresholds

## 9. Performance Testing

### 9.1 Load Testing
- **Tools**: Artillery.js for API load testing
- **Scenarios**: Simulate concurrent search requests across different providers
- **Metrics**: Response times, error rates, throughput

### 9.2 Stress Testing
- **Provider combinations**: Test with maximum provider loads
- **Circuit breaker**: Test under sustained failure conditions
- **Cache performance**: Test under high cache miss rates

## 10. Security Testing

### 10.1 Data Governance Tests
- Verify security context validation
- Test row-level security enforcement
- Validate field-level masking

### 10.2 Input Validation Tests
- Test for injection attempts
- Validate query parameter sanitization
- Test for buffer overflow vulnerabilities

## 11. Monitoring and Maintenance

### 11.1 Test Maintenance
- **Regular reviews**: Quarterly review of test suite effectiveness
- **Flaky test handling**: Identify and fix flaky tests promptly
- **Test refactoring**: Update tests when implementation changes

### 11.2 Test Reporting
- **Dashboard**: Centralized test results dashboard
- **Notifications**: Alert on test failures in CI
- **Trends**: Track test performance and reliability over time

## 12. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up testing framework and tools
- Create basic test structure and utilities
- Write tests for core SmartSearch functionality

### Phase 2: Core Features (Weeks 3-4)
- Implement tests for all provider implementations
- Write tests for circuit breaker functionality
- Create integration tests for provider compatibility

### Phase 3: Advanced Features (Weeks 5-6)
- Develop tests for data governance features
- Create end-to-end tests for showcase applications
- Implement performance and security tests

### Phase 4: Optimization (Weeks 7-8)
- Optimize test performance and reliability
- Implement monitoring and reporting
- Establish continuous integration pipeline

---

This TDD plan provides a comprehensive framework for implementing test-driven development across the Smart Search Package, ensuring high-quality code, proper functionality, and maintainable architecture.


### 5.3 Direct Redis Provider Testing
**Objective**: Test the DirectRedisProvider implementation with direct Redis connections

**Example Test Structure**:
```typescript
// tests/unit/providers/DirectRedisProvider.test.ts
describe('DirectRedisProvider', () => {
  let directRedisProvider: DirectRedisProvider;
  let config: DirectRedisConfig;

  beforeEach(() => {
    config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      connectTimeout: 10000
    };
    
    directRedisProvider = new DirectRedisProvider(config);
  });

  test('initializes with direct Redis connection parameters', () => {
    expect(directRedisProvider).toBeDefined();
    expect(directRedisProvider.name).toBe('DirectRedis');
  });

  test('connects directly to Redis server', async () => {
    const connectSpy = jest.spyOn(directRedisProvider as any, 'connect');
    
    await directRedisProvider.connect();
    
    expect(connectSpy).toHaveBeenCalled();
    expect(await directRedisProvider.isConnected()).toBe(true);
  });

  test('performs search operations with direct Redis connection', async () => {
    await directRedisProvider.connect();
    
    const results = await directRedisProvider.search('test query', { limit: 10 });
    
    expect(Array.isArray(results)).toBe(true);
    // Verify search results format
  });

  test('implements cache provider interface correctly', () => {
    expect(typeof directRedisProvider.set).toBe('function');
    expect(typeof directRedisProvider.get).toBe('function');
    expect(typeof directRedisProvider.delete).toBe('function');
    expect(typeof directRedisProvider.clear).toBe('function');
    expect(typeof directRedisProvider.checkHealth).toBe('function');
  });

  test('handles Redis connection failures gracefully', async () => {
    const badConfig = {
      host: 'invalid-host',
      port: 6379
    };
    
    const badProvider = new DirectRedisProvider(badConfig);
    
    await expect(badProvider.connect()).rejects.toThrow();
  });
});
```

