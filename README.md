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

## 🎯 Showcases & Demos

We provide comprehensive showcase applications demonstrating real-world usage patterns with different database and cache combinations:

### Interactive Showcases

| **Showcase** | **Database + Cache** | **Industry Focus** | **Port** | **Features** |
|--------------|---------------------|-------------------|----------|-------------|
| [**PostgreSQL + Redis**](./showcases/postgres-redis/) | PostgreSQL + Redis | Healthcare Research | 3002 | Advanced full-text search, GIN indexes, relevance ranking |
| [**MySQL + DragonflyDB**](./showcases/mysql-dragonfly/) | MySQL + DragonflyDB | Financial Services | 3003 | FULLTEXT indexes, high-performance caching |
| [**MongoDB + Memcached**](./showcases/mongodb-memcached/) | MongoDB + Memcached | E-commerce Retail | 3004 | Text indexes, aggregation pipelines, distributed caching |
| [**Delta Lake + Redis**](./showcases/deltalake-redis/) | Delta Lake + Redis | Financial Analytics | 3005 | ACID transactions, time travel, columnar storage |

### Data Scale Options

Each showcase supports multiple dataset sizes for performance testing:

- **Tiny (1K records)** - Quick demos and development
- **Small (10K records)** - Standard testing and integration
- **Medium (100K records)** - Performance benchmarking
- **Large (1M+ records)** - Production-scale testing

### Running Showcases

The enhanced screenshot generation system provides comprehensive Docker-integrated testing and documentation generation:

#### **Basic Usage**

```bash
# Generate screenshots for a specific showcase
./scripts/generate-screenshots-docker.sh postgres-redis

# Generate screenshots for all showcases (comprehensive demo)
./scripts/generate-screenshots-docker.sh all

# Keep Docker services running for development/debugging
./scripts/generate-screenshots-docker.sh deltalake-redis --keep-services
```

#### **Development & Testing Workflows**

```bash
# 🏥 Healthcare Research Testing
# Generates screenshots with medical data, clinical trials, drug information
./scripts/generate-screenshots-docker.sh postgres-redis
# → Creates: screenshots/blog/postgres-redis/
# → Demonstrates: PostgreSQL full-text search, GIN indexes, healthcare data patterns

# 💰 Financial Analytics Testing  
# Generates screenshots with trading data, market analysis, portfolio management
./scripts/generate-screenshots-docker.sh mysql-dragonfly
# → Creates: screenshots/blog/mysql-dragonfly/
# → Demonstrates: MySQL FULLTEXT search, DragonflyDB caching, financial datasets

# 🛒 E-commerce Platform Testing
# Generates screenshots with product catalogs, customer data, order histories
./scripts/generate-screenshots-docker.sh mongodb-memcached
# → Creates: screenshots/blog/mongodb-memcached/
# → Demonstrates: MongoDB text indexes, Memcached distribution, retail workflows

# 📊 Big Data Analytics Testing
# Generates screenshots with time-series data, ACID transactions, columnar storage
./scripts/generate-screenshots-docker.sh deltalake-redis
# → Creates: screenshots/blog/deltalake-redis/
# → Demonstrates: Delta Lake time travel, Spark processing, analytics patterns
```

#### **Documentation Generation**

```bash
# Generate blog post screenshots with real data
./scripts/generate-screenshots-docker.sh all

# Specific use cases:
# 📝 Create documentation for healthcare guide
./scripts/generate-screenshots-docker.sh postgres-redis

# 📈 Create financial analytics screenshots
./scripts/generate-screenshots-docker.sh deltalake-redis --keep-services

# 🔄 Full platform demonstration (all 4 showcases)
./scripts/generate-screenshots-docker.sh all
```

#### **Performance Testing Scenarios**

The screenshot system now supports separate folders for different dataset sizes and displays the dataset size prominently in the UI with distinctive colors:

```bash
# 🟢 Tiny Dataset Testing (1K records) - Teal/Green Badge
DATA_SIZE=tiny ./scripts/generate-screenshots-docker.sh postgres-redis
# → Creates: screenshots/blog/postgres-redis/tiny/
# → UI shows: "TINY DATASET" badge in teal/green
# → Records: "1,000 Healthcare Records"

# 🔵 Small Dataset Testing (10K records) - Blue Badge  
DATA_SIZE=small ./scripts/generate-screenshots-docker.sh mysql-dragonfly
# → Creates: screenshots/blog/mysql-dragonfly/small/
# → UI shows: "SMALL DATASET" badge in blue
# → Records: "10,000 Financial Records"

# 🟠 Medium Dataset Testing (100K records) - Orange Badge
DATA_SIZE=medium ./scripts/generate-screenshots-docker.sh mongodb-memcached
# → Creates: screenshots/blog/mongodb-memcached/medium/
# → UI shows: "MEDIUM DATASET" badge in orange
# → Records: "100,000 E-commerce Records"

# 🔴 Large Dataset Testing (1M+ records) - Red Badge
DATA_SIZE=large ./scripts/generate-screenshots-docker.sh deltalake-redis
# → Creates: screenshots/blog/deltalake-redis/large/
# → UI shows: "LARGE DATASET" badge in red
# → Records: "1,000,000+ Analytics Records"
```

**Visual Dataset Indicators:**
- **Badge Color**: Each dataset size has a distinctive background color for easy identification
- **Record Count**: Prominently displayed total records being searched
- **Cache Status**: Real-time cache connection and item count
- **Responsive Design**: Both desktop and mobile screenshots show dataset information

**Performance Comparison Examples:**
```bash
# Compare response times across different dataset sizes
DATA_SIZE=tiny ./scripts/generate-screenshots-docker.sh postgres-redis    # ~5-10ms queries
DATA_SIZE=medium ./scripts/generate-screenshots-docker.sh postgres-redis  # ~25-100ms queries  
DATA_SIZE=large ./scripts/generate-screenshots-docker.sh postgres-redis   # ~100-500ms queries

# Each generates screenshots in separate folders showing:
# - Different colored dataset badges (teal → orange → red)
# - Varying record counts (1K → 100K → 1M+)
# - Performance impact visualization
```

#### **Advanced Usage Patterns**

```bash
# Development Mode - Keep services running for interactive testing
./scripts/generate-screenshots-docker.sh postgres-redis --keep-services
# → Access at: http://localhost:3002
# → Test queries: /api/search?q=diabetes
# → View metrics: /api/stats

# CI/CD Integration - Skip data seeding for faster runs  
./scripts/generate-screenshots-docker.sh mongodb-memcached --no-seed

# Continuous Documentation - Generate screenshots on code changes
for showcase in postgres-redis mysql-dragonfly mongodb-memcached deltalake-redis; do
  ./scripts/generate-screenshots-docker.sh $showcase
done
```

#### **What Each Screenshot Captures**

| **Screenshot Type** | **Purpose** | **Content** |
|-------------------|-------------|-------------|
| **Homepage Overview** | Initial platform view | Clean interface, feature highlights, data size selector |
| **Search Results** | Core functionality demo | Real search results with relevant data, performance metrics |
| **Industry-Specific Queries** | Domain expertise | Healthcare terms, financial symbols, retail categories |
| **Performance Statistics** | Technical metrics | Response times, cache hit rates, database performance |
| **Mobile Responsive** | Cross-platform compatibility | Mobile-optimized views, touch-friendly interface |

Each showcase generates 8-12 professional screenshots automatically, perfect for:
- **Blog Posts**: Visual demonstrations of real-world usage
- **Documentation**: Technical guides with actual screenshots  
- **Presentations**: Professional slides with live data examples
- **Marketing Materials**: Compelling visuals of platform capabilities

## 📝 Blog Posts & Documentation

Comprehensive guides and tutorials for different user personas:

### 🏥 **Industry-Specific Guides**

| **Blog Post** | **Focus** | **Database + Cache** | **Use Case** |
|---------------|-----------|---------------------|--------------|
| [**PostgreSQL + Redis for Healthcare**](./blog/postgres-redis-showcase.md) | Healthcare Research | PostgreSQL + Redis | Medical data search, research papers, clinical trials |
| [**MySQL + DragonflyDB for Finance**](./blog/mysql-dragonfly-showcase.md) | Financial Services | MySQL + DragonflyDB | Trading data, market analysis, portfolio management |
| [**MongoDB + Memcached for Retail**](./blog/mongodb-memcached-showcase.md) | E-commerce | MongoDB + Memcached | Product catalogs, customer analytics, inventory |
| [**Delta Lake + Redis Analytics**](./blog/deltalake-redis-showcase.md) | Big Data Analytics | Delta Lake + Redis | Time-series data, ACID transactions, data versioning |

### 👨‍💻 **Developer Guides**

| **Blog Post** | **Target Audience** | **Key Topics** |
|---------------|-------------------|----------------|
| [**Smart Search for Junior Developers**](./blog/smart-search-junior-developers.md) | Junior Developers | Getting started, basic concepts, simple integrations |
| [**Smart Search for Senior Developers**](./blog/smart-search-senior-developers.md) | Senior Developers | Advanced patterns, performance optimization, architecture |
| [**Smart Search for Testers**](./blog/smart-search-testers.md) | QA Engineers | Testing strategies, performance benchmarks, automation |
| [**Screenshot Generation Guide**](./blog/screenshot-generator-junior-developers.md) | All Developers | Documentation automation, visual testing, CI/CD integration |

### 🔧 **Technical Deep Dives**

- **Performance Comparison**: Benchmarks across database and cache combinations
- **Scaling Strategies**: Handling millions of records with different architectures  
- **Production Deployment**: Best practices for high-availability setups
- **Monitoring & Observability**: Metrics, logging, and alerting strategies

## 🚀 **New Features & Enhancements**

### Delta Lake Integration
- **ACID Transactions**: Reliable data consistency with schema enforcement
- **Time Travel Queries**: Access historical versions and audit data changes
- **Columnar Storage**: Optimized Parquet format with compression and predicate pushdown
- **Large Scale Processing**: Handle millions of records with Spark integration

### Enhanced Data Management
- **Real Public Datasets**: Healthcare, finance, retail, education, and real estate data
- **Multiple Load Sizes**: Tiny (1K), Small (10K), Medium (100K), Large (1M+) records
- **Automated Data Downloads**: Scripts to fetch real datasets from public APIs
- **Docker Integration**: Automated seeding and health checks for all services

### Improved Developer Experience
- **Docker-First Development**: Complete development environment with `docker-compose`
- **Automated Screenshots**: Generate documentation screenshots from real running services
- **Health Monitoring**: Built-in health checks and performance metrics
- **Load Testing**: Performance benchmarks across different data sizes

### Production-Ready Features
- **Circuit Breaker Pattern**: Automatic failover and recovery
- **Performance Monitoring**: Built-in metrics collection and slow query detection
- **Multiple Cache Backends**: Redis, DragonflyDB, Memcached, In-Memory support
- **Flexible Configuration**: JSON, YAML, and environment variable support

## 📋 Technical Specification Tables

### Multi-Strategy Search Performance Comparison

| **Strategy** | **Response Time** | **Cache Hit Rate** | **Use Case** | **Failure Handling** | **Resource Usage** |
|--------------|------------------|-------------------|--------------|---------------------|-------------------|
| **⚡ Cache-First** | 10-30ms | 90-95% | Real-time search, frequent queries | Automatic database fallback | Low CPU, High memory |
| **🗄️ Database-Only** | 40-80ms | 0% (bypassed) | Real-time data, audit trails | N/A (direct database) | High CPU, Low memory |
| **🔧 Circuit Breaker** | 100-180ms | Variable | Fault-tolerant systems, failover | Automatic recovery with backoff | Medium CPU/memory |
| **🤖 Hybrid** | 8-80ms | 60-80% | Intelligent routing, mixed workloads | Smart routing with fallback | Balanced CPU/memory |

### Dataset Size Performance Benchmarks

| **Data Size** | **UI Badge Color** | **Record Count** | **Avg Response Time** | **Cache Performance** | **Docker Command** | **Screenshot Command** |
|---------------|-------------------|------------------|----------------------|---------------------|-------------------|----------------------|
| **Tiny** | 🟢 Teal/Green | ~1,000 | 5-15ms | >95% hit rate | `DATA_SIZE=tiny docker-compose up -d` | `DATA_SIZE=tiny ./scripts/generate-screenshots-docker.sh postgres-redis` |
| **Small** | 🔵 Blue | ~10,000 | 15-35ms | 85-95% hit rate | `DATA_SIZE=small docker-compose up -d` | `DATA_SIZE=small ./scripts/generate-screenshots-docker.sh postgres-redis` |
| **Medium** | 🟠 Orange | ~100,000 | 25-100ms | 70-85% hit rate | `DATA_SIZE=medium docker-compose up -d` | `DATA_SIZE=medium ./scripts/generate-screenshots-docker.sh postgres-redis` |
| **Large** | 🔴 Red | ~1,000,000+ | 100-500ms | 50-70% hit rate | `DATA_SIZE=large docker-compose up -d` | `DATA_SIZE=large ./scripts/generate-screenshots-docker.sh postgres-redis` |

### Database + Cache Combinations Technical Specifications

| **Showcase** | **Database** | **Memory** | **Cache** | **Memory** | **Industry** | **Port** | **Specialty Features** | **Container Commands** |
|--------------|-------------|-----------|-----------|-----------|-------------|----------|----------------------|----------------------|
| **PostgreSQL + Redis** | PostgreSQL 15 | 512MB | Redis 7.2 | 256MB | Healthcare | 3002 | GIN indexes, tsvector ranking, real-time subscriptions | `docker-compose -f docker/postgres-redis.docker-compose.yml up -d` |
| **MySQL + DragonflyDB** | MySQL 8.0 | 512MB | DragonflyDB | 256MB | Financial | 3003 | FULLTEXT search, high-performance multi-threading | `docker-compose -f docker/mysql-dragonfly.docker-compose.yml up -d` |
| **MongoDB + Memcached** | MongoDB 6.0 | 512MB | Memcached | 128MB | E-commerce | 3004 | Text indexes, aggregation pipelines, distributed caching | `docker-compose -f docker/mongodb-memcached.docker-compose.yml up -d` |
| **Delta Lake + Redis** | Delta Lake | 1GB | Redis Stack | 512MB | Analytics | 3005 | ACID transactions, time travel, columnar storage | `docker-compose -f docker/deltalake-redis.docker-compose.yml up -d` |

### Multi-Strategy Screenshot Generation Commands

| **Strategy** | **Description** | **Response Time** | **Visual Indicators** | **API Command** | **Screenshot Command** |
|--------------|-----------------|-------------------|---------------------|----------------|----------------------|
| **Cache-First** | Redis-optimized fast responses | 10-30ms | Green borders, ⚡ icons | `curl "localhost:3002/api/search?q=diabetes&strategy=cache-first"` | Select "⚡ Cache-First" in UI dropdown |
| **Database-Only** | Direct PostgreSQL queries | 40-80ms | Blue borders, 🗄️ icons | `curl "localhost:3002/api/search?q=diabetes&strategy=database-only"` | Select "🗄️ Database-Only" in UI dropdown |
| **Circuit Breaker** | Simulated failover scenarios | 100-180ms | Orange warnings, 🔧 icons | `curl "localhost:3002/api/search?q=diabetes&strategy=circuit-breaker"` | Select "🔧 Circuit Breaker" in UI dropdown |
| **Hybrid** | Intelligent query routing | 8-80ms | Purple hybrid, 🤖 icons | `curl "localhost:3002/api/search?q=diabetes&strategy=hybrid"` | Select "🤖 Hybrid" in UI dropdown |

### Health Check Commands Reference

| **Component** | **Health Check Command** | **Expected Response** | **Troubleshooting** |
|---------------|-------------------------|---------------------|-------------------|
| **Application** | `curl http://localhost:3002/api/health` | `{"success":true,"status":"healthy"}` | Check container logs: `docker logs docker-saMas-smart-search-postgres-redis-showcase` |
| **PostgreSQL** | `docker exec docker-saMas-smart-search-postgres-main pg_isready -U search_user -d smartsearch_healthcare` | `accepting connections` | Verify connection: `docker exec -it docker-saMas-smart-search-postgres-main psql -U search_user -d smartsearch_healthcare` |
| **Redis** | `docker exec docker-saMas-smart-search-redis-main redis-cli ping` | `PONG` | Check Redis CLI: `docker exec -it docker-saMas-smart-search-redis-main redis-cli` |
| **All Services** | `docker ps --filter "name=docker-saMas-smart-search" --format "table {{.Names}}\t{{.Status}}"` | All containers `Up` | Restart services: `docker-compose down && docker-compose up -d` |
| **Search Stats** | `curl http://localhost:3002/api/stats` | JSON with dataset info | Check API logs and database connections |

### Development Workflow Commands

| **Use Case** | **Command** | **Purpose** | **Output Location** |
|--------------|-------------|-------------|-------------------|
| **Quick Demo** | `DATA_SIZE=tiny ./scripts/generate-screenshots-docker.sh postgres-redis` | Fast testing with 1K records | `screenshots/blog/postgres-redis/tiny/` |
| **Performance Testing** | `DATA_SIZE=medium ./scripts/generate-screenshots-docker.sh postgres-redis` | Standard benchmarking with 100K records | `screenshots/blog/postgres-redis/medium/` |
| **Production Scale** | `DATA_SIZE=large ./scripts/generate-screenshots-docker.sh postgres-redis` | Production testing with 1M+ records | `screenshots/blog/postgres-redis/large/` |
| **Manual Testing** | `DATA_SIZE=medium docker-compose -f docker/postgres-redis.docker-compose.yml up -d` | Interactive development and debugging | Browser: `http://localhost:3002` |
| **All Strategies** | `./scripts/generate-screenshots-docker.sh postgres-redis` | Complete strategy comparison screenshots | Multiple strategy folders with UI variations |
| **Health Monitor** | `watch 'curl -s http://localhost:3002/api/health && curl -s http://localhost:3002/api/stats'` | Continuous health and performance monitoring | Real-time terminal output |

### Production Deployment Specifications

| **Environment** | **Database Config** | **Cache Config** | **Memory Requirements** | **CPU Requirements** | **Network** |
|-----------------|-------------------|----------------|----------------------|-------------------|------------|
| **Development** | PostgreSQL 15 (512MB) | Redis 7.2 (256MB) | 2GB total | 2 cores | Local networking |
| **Staging** | PostgreSQL 15 (1GB) | Redis 7.2 (512MB) | 4GB total | 4 cores | Private VPC |
| **Production** | PostgreSQL 15 (2-4GB) | Redis Cluster (1-2GB) | 8-16GB total | 8+ cores | Load balanced, multi-AZ |
| **High Scale** | Read replicas (4-8GB) | Redis Cluster (2-4GB) | 16-32GB total | 16+ cores | CDN, global distribution |

**Key Features by Environment:**
- **Development**: Single-node setup, Docker Compose, local testing
- **Staging**: Multi-container setup, automated health checks, integration testing
- **Production**: High availability, automatic failover, comprehensive monitoring
- **High Scale**: Horizontal scaling, multiple regions, advanced caching strategies

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
  baseURL: 'http://localhost:3002',
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