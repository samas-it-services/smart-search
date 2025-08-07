# @samas/smart-search

[![npm version](https://badge.fury.io/js/@samas/smart-search.svg)](https://badge.fury.io/js/@samas/smart-search)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**Universal search with intelligent fallback for any database + cache combination**

`@samas/smart-search` provides a unified search interface that works with any database (PostgreSQL, MySQL, MongoDB, Supabase) and cache (Redis, Memcached, DragonflyDB) combination. Features intelligent fallback when cache is unavailable, circuit breaker patterns, and comprehensive performance monitoring.

## 🌟 Support the Project

This is an open-source project developed with ❤️ by the community. If you find it useful, please consider supporting:

- ⭐ **[Star on GitHub](https://github.com/samas-it-services/smart-search)** - Show your support
- 💰 **[Sponsor on GitHub](https://github.com/sponsors/bilgrami)** - Monthly sponsorship
- ☕ **[Buy me a coffee](https://ko-fi.com/bilgrami)** - One-time support
- 🐦 **[Follow on X](https://x.com/sbilgrami)** - Stay updated

## ✨ Features

- 🔄 **Intelligent Fallback** - Automatic switching between cache and database
- ⚡ **Circuit Breaker** - Prevents cascade failures with automatic recovery
- 📊 **Performance Monitoring** - Built-in metrics and slow query detection
- 🔧 **Universal Compatibility** - Works with any database and cache combination
- 🏎️ **High Performance** - Optimized for sub-10ms response times
- 🛡️ **Type Safe** - Full TypeScript support with comprehensive types
- 📈 **Scalable** - Handles high-throughput search scenarios

## 🚀 Quick Start

### Installation

```bash
npm install @samas/smart-search
```

### 1. Generate Configuration

Use our CLI to generate a configuration template:

```bash
# Generate JSON configuration
npx @samas/smart-search init json

# Or generate YAML configuration  
npx @samas/smart-search init yaml
```

This creates a `smart-search.config.json` or `smart-search.config.yaml` file.

### 2. Configure Your Database & Cache

**Option A: Configuration File (Recommended)**

Edit your `smart-search.config.json`:

```json
{
  "database": {
    "type": "supabase",
    "connection": {
      "url": "${SUPABASE_URL}",
      "key": "${SUPABASE_ANON_KEY}"
    }
  },
  "cache": {
    "type": "redis", 
    "connection": {
      "url": "${REDIS_URL}"
    }
  },
  "search": {
    "fallback": "database",
    "tables": {
      "books": {
        "columns": {
          "id": "id",
          "title": "title", 
          "author": "author",
          "description": "description"
        },
        "searchColumns": ["title", "author", "description"],
        "type": "book"
      }
    }
  }
}
```

**Option B: Environment Variables**

Set these environment variables in your `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REDIS_URL=redis://localhost:6379
```

### 3. Use SmartSearch

```typescript
import { SmartSearchFactory } from '@samas/smart-search';

// Load from configuration file automatically
const search = SmartSearchFactory.fromConfig();

// Or load from environment variables
// const search = SmartSearchFactory.fromEnvironment();

// Perform search
const results = await search.search('javascript programming', {
  limit: 20,
  filters: {
    category: ['programming', 'technology']
  }
});

console.log(`Found ${results.results.length} results in ${results.performance.searchTime}ms`);
console.log(`Strategy: ${results.strategy.primary} (${results.strategy.reason})`);
```

### 4. Validate & Test Configuration

```bash
# Validate your configuration
npx @samas/smart-search validate

# Test database and cache connections
npx @samas/smart-search test-config
```

## 🔧 Configuration Examples

### Supabase + Redis Configuration (JSON)

**smart-search.config.json:**
```json
{
  "database": {
    "type": "supabase",
    "connection": {
      "url": "${SUPABASE_URL}",
      "key": "${SUPABASE_ANON_KEY}"
    }
  },
  "cache": {
    "type": "redis",
    "connection": {
      "url": "${REDIS_URL}"
    }
  },
  "search": {
    "fallback": "database",
    "tables": {
      "books": {
        "columns": {
          "id": "id",
          "title": "title",
          "author": "author",
          "description": "description"
        },
        "searchColumns": ["title", "author", "description"],
        "type": "book"
      }
    }
  }
}
```

### Supabase + Redis Cloud (API Key) Configuration

**smart-search.config.json:**
```json
{
  "database": {
    "type": "supabase",
    "connection": {
      "url": "${SUPABASE_URL}",
      "key": "${SUPABASE_ANON_KEY}"
    }
  },
  "cache": {
    "type": "redis",
    "connection": {
      "host": "${REDIS_CLOUD_HOST}",
      "port": 12345,
      "apiKey": "${REDIS_CLOUD_API_KEY}",
      "tls": true
    }
  },
  "search": {
    "fallback": "database",
    "tables": {
      "books": {
        "columns": {
          "id": "id",
          "title": "title", 
          "author": "author",
          "description": "description"
        },
        "searchColumns": ["title", "author", "description"],
        "type": "book"
      }
    }
  }
}
```

### MySQL + Redis Configuration (YAML)

**smart-search.config.yaml:**
```yaml
database:
  type: mysql
  connection:
    host: ${DB_HOST}
    port: 3306
    user: ${DB_USER}
    password: ${DB_PASSWORD}
    database: ${DB_NAME}

cache:
  type: redis
  connection:
    host: ${REDIS_HOST}
    port: 6379
    password: ${REDIS_PASSWORD}

search:
  fallback: database
  tables:
    products:
      columns:
        id: product_id
        title: product_name
        description: product_description
      searchColumns:
        - product_name
        - product_description
      type: product
```

### MongoDB + DragonflyDB Configuration

**smart-search.config.json:**
```json
{
  "database": {
    "type": "mongodb",
    "connection": {
      "uri": "${MONGODB_URI}"
    }
  },
  "cache": {
    "type": "dragonfly",
    "connection": {
      "host": "${DRAGONFLY_HOST}",
      "port": 6380
    }
  },
  "search": {
    "fallback": "database",
    "tables": {
      "articles": {
        "columns": {
          "id": "_id",
          "title": "title",
          "author": "author"
        },
        "searchColumns": ["title", "content", "author"],
        "type": "article"
      }
    }
  }
}
```

### Redis API Key Authentication

For managed Redis services that use API keys instead of passwords:

**Redis Cloud Configuration:**
```json
{
  "cache": {
    "type": "redis",
    "connection": {
      "host": "redis-12345.c1.us-east-1.redislabs.com",
      "port": 12345,
      "apiKey": "${REDIS_CLOUD_API_KEY}",
      "tls": true
    }
  }
}
```

**Upstash Redis Configuration:**
```json
{
  "cache": {
    "type": "redis", 
    "connection": {
      "url": "rediss://your-endpoint.upstash.io:6380",
      "apiKey": "${UPSTASH_REDIS_REST_TOKEN}"
    }
  }
}
```

**Environment Variables for API Key Authentication:**

```bash
# Database
SMART_SEARCH_DB_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Redis with API Key (Redis Cloud)
SMART_SEARCH_CACHE_TYPE=redis
REDIS_HOST=redis-12345.c1.us-east-1.redislabs.com  
REDIS_PORT=12345
REDIS_API_KEY=your-redis-cloud-api-key
REDIS_TLS=true

# Or Upstash Redis
REDIS_URL=rediss://your-endpoint.upstash.io:6380
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Performance
SMART_SEARCH_ENABLE_METRICS=true
SMART_SEARCH_FALLBACK=database
```

**Supported Redis API Key Environment Variables:**
- `REDIS_API_KEY` - Generic Redis API key
- `REDIS_TOKEN` - Alternative API key variable name
- `UPSTASH_REDIS_REST_TOKEN` - Upstash-specific token
- `SMART_SEARCH_CACHE_API_KEY` - Package-specific API key variable

Then use:
```typescript
import { SmartSearchFactory } from '@samas/smart-search';

const search = SmartSearchFactory.fromEnvironment();
```

## 🎛️ Advanced Configuration

```typescript
const search = new SmartSearch({
  database: databaseProvider,
  cache: cacheProvider,
  fallback: 'database',
  circuitBreaker: {
    failureThreshold: 5,        // Open circuit after 5 failures
    recoveryTimeout: 30000,     // Try recovery after 30 seconds
    healthCacheTTL: 10000       // Cache health status for 10 seconds
  },
  cache: {
    enabled: true,
    defaultTTL: 300000,         // 5 minute default cache TTL
    maxSize: 10000              // Maximum cached items
  },
  performance: {
    enableMetrics: true,        // Enable performance tracking
    logQueries: false,          // Log all queries (debug mode)
    slowQueryThreshold: 1000    // Log queries slower than 1 second
  }
});
```

## 📊 Performance Monitoring

```typescript
// Get search statistics
const stats = await search.getSearchStats();
console.log('Cache Health:', stats.cacheHealth);
console.log('Database Health:', stats.databaseHealth);
console.log('Circuit Breaker:', stats.circuitBreaker);
console.log('Recommended Strategy:', stats.recommendedStrategy);

// Perform search with performance tracking
const { results, performance, strategy } = await search.search('query');
console.log(`Search completed in ${performance.searchTime}ms`);
console.log(`Results: ${performance.resultCount}`);
console.log(`Strategy: ${performance.strategy} (cache hit: ${performance.cacheHit})`);
```

## 🔄 Circuit Breaker Pattern

The circuit breaker automatically handles failures:

```typescript
// Circuit breaker states:
// - CLOSED: Normal operation, requests flow through
// - OPEN: Failures detected, requests go to fallback
// - HALF_OPEN: Testing if service recovered

const stats = await search.getSearchStats();
if (stats.circuitBreaker.isOpen) {
  console.log(`Circuit breaker is OPEN (${stats.circuitBreaker.failureCount} failures)`);
  console.log(`Next retry in: ${stats.circuitBreaker.nextRetryTime - Date.now()}ms`);
}
```

## 🛠️ Provider Development

Create custom providers by implementing the provider interfaces:

```typescript
import { DatabaseProvider, SearchResult, SearchOptions, HealthStatus } from '@samas/smart-search';

class CustomDatabaseProvider implements DatabaseProvider {
  name = 'CustomDB';

  async connect(): Promise<void> {
    // Implementation
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Implementation
  }

  async checkHealth(): Promise<HealthStatus> {
    // Implementation
  }

  // ... other required methods
}
```

## 📚 API Reference

### SmartSearch Class

#### Constructor

```typescript
constructor(config: SmartSearchConfig)
```

#### Methods

- `search(query: string, options?: SearchOptions)` - Perform intelligent search
- `getSearchStats()` - Get performance and health statistics
- `getCacheHealth()` - Get current cache health status
- `forceHealthCheck()` - Force refresh of health status
- `clearCache(pattern?: string)` - Clear cache data

### Search Options

```typescript
interface SearchOptions {
  limit?: number;              // Maximum results (default: 20)
  offset?: number;             // Pagination offset (default: 0)
  filters?: SearchFilters;     // Search filters
  sortBy?: 'relevance' | 'date' | 'views' | 'name';  // Sort criteria
  sortOrder?: 'asc' | 'desc';  // Sort direction
  cacheEnabled?: boolean;      // Enable/disable caching for this search
  cacheTTL?: number;          // Custom cache TTL for this search
}
```

### Search Filters

```typescript
interface SearchFilters {
  type?: string[];             // Filter by result types
  category?: string[];         // Filter by categories
  language?: string[];         // Filter by languages
  visibility?: string[];       // Filter by visibility
  dateRange?: {               // Filter by date range
    start?: string;
    end?: string;
  };
  custom?: Record<string, any>; // Custom filters
}
```

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm run test:unit

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### End-to-End Testing with Playwright

Smart Search includes comprehensive E2E tests using Playwright to test showcase applications and generate blog post screenshots.

#### Prerequisites
```bash
# Install Playwright (already included in devDependencies)
npm install

# Install Playwright browsers
npx playwright install
```

#### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with browser UI (headed mode)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run specific showcase tests
npx playwright test --grep "postgres-redis"
```

#### Using the Test Showcase Script

We provide a comprehensive testing script for easy showcase testing:

```bash
# Install Playwright dependencies
./scripts/test-showcase.sh install

# Run all showcase tests
./scripts/test-showcase.sh test

# Run tests with interactive UI
./scripts/test-showcase.sh test-ui

# Generate blog post screenshots
./scripts/test-showcase.sh screenshots postgres-redis

# Run performance benchmarks
./scripts/test-showcase.sh performance

# Debug tests interactively
./scripts/test-showcase.sh debug

# View HTML test report
./scripts/test-showcase.sh report

# Clean test artifacts
./scripts/test-showcase.sh clean
```

#### Screenshot Generation for Blog Posts

Automatically generate high-quality screenshots for blog posts and documentation:

```bash
# Generate screenshots for PostgreSQL + Redis showcase
./scripts/test-showcase.sh screenshots postgres-redis

# Generated screenshots will be in screenshots/blog/:
# - 01-homepage-overview.png
# - 02-search-results-postgresql.png
# - 03-search-results-redis.png
# - 04-search-results-typescript.png
# - 05-search-results-performance.png
# - 06-results-section-detail.png
# - 07-performance-stats.png
# - 08-performance-info-detail.png
# - 09-filtered-results.png
# - 10-filter-controls.png
# - 11-mobile-homepage.png
# - 12-mobile-search-results.png
# - 13-api-examples.png
# - 14-no-results-state.png
# - 15-initial-empty-state.png
```

#### Test Configuration

The Playwright configuration includes:
- **Multi-browser testing**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Automatic server startup**: Starts showcase applications during tests
- **Screenshot capture**: On test failures and for blog posts
- **Performance monitoring**: Response time and throughput measurement
- **Global setup/teardown**: Docker service management and cleanup

#### Custom Test Utilities

```javascript
// Screenshot generator utility
const ScreenshotGenerator = require('./tests/utils/screenshot-generator');

const generator = new ScreenshotGenerator({
  baseURL: 'http://localhost:3001',
  outputDir: 'screenshots/blog',
  viewport: { width: 1200, height: 800 }
});

await generator.init();
await generator.generateBlogScreenshots();
await generator.close();
```

#### Environment Variables

```bash
# Run tests with visible browser
HEADLESS=false npm run test:e2e

# Slow down actions for debugging
SLOW_MO=1000 npm run test:e2e

# Enable Playwright debug mode
PWDEBUG=1 npm run test:e2e

# Stop Docker services after tests
STOP_DOCKER=true npm run test:e2e
```

#### Continuous Integration

For CI/CD pipelines:

```bash
# Install dependencies and browsers
npm install
npx playwright install --with-deps

# Start Docker services
./scripts/docker-dev.sh start

# Run tests
npm run test:all

# Generate coverage report
npm run test:coverage

# Stop services
./scripts/docker-dev.sh stop
```

### Linting and Type Checking

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# TypeScript type checking
npm run type-check
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with TypeScript for type safety
- Inspired by enterprise-grade search architectures
- Community-driven development

---

**Made with ❤️ by [Syed A Bilgrami](https://github.com/bilgrami)**

Support this project: [GitHub Sponsors](https://github.com/sponsors/bilgrami) | [Ko-fi](https://ko-fi.com/bilgrami) | [Follow on X](https://x.com/sbilgrami)