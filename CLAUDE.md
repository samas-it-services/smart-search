# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Build in watch mode for development
- `npm run build` - Build the library using tsup (generates CJS, ESM, and TypeScript declarations)
- `npm run type-check` - Run TypeScript type checking without building

### Testing
- `npm test` - Run tests in watch mode (uses Vitest)
- `npm run test:unit` - Run unit tests once with verbose output
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (80% minimum coverage required)
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:headed` - Run E2E tests in headed mode
- `npm run test:e2e:debug` - Debug E2E tests
- `npm run test:serve` - Start test server for E2E tests (Python HTTP server on port 3000)
- `npm run test:all` - Run both unit and E2E tests

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run prepublishOnly` - Pre-publish checks (type-check + unit tests + build)

### Examples
- `npm run examples:basic` - Run basic usage example
- `npm run examples:advanced` - Run advanced configuration example
- `npm run examples:multi-db` - Run multiple databases example
- `npm run examples:all` - Run all examples

### CLI Commands
- `npx @samas/smart-search init [json|yaml]` - Generate configuration template
- `npx @samas/smart-search validate [config-path]` - Validate configuration file
- `npx @samas/smart-search test-config` - Test configuration and connections

### Docker Infrastructure Commands
- `./scripts/start-stack.sh <stack-name>` - Launch specific database+cache combination
  - Available stacks: `postgres-redis`, `mysql-dragonfly`, `mongodb-memcached`, `deltalake-redis`, `all-databases`
- `./scripts/stop-all.sh` - Clean shutdown of all Docker services
- `./scripts/reset-data.sh [stack-name]` - Reset databases to clean state
- `./scripts/backup-data.sh [stack-name]` - Backup database contents
- `./scripts/monitor-health.sh` - Health check across all running services
- `docker-compose -f docker/postgres-redis.docker-compose.yml up -d` - Start PostgreSQL + Redis stack
- `docker-compose -f docker/mysql-dragonfly.docker-compose.yml up -d` - Start MySQL + DragonflyDB stack
- `docker-compose -f docker/mongodb-memcached.docker-compose.yml up -d` - Start MongoDB + Memcached stack
- `docker-compose -f docker/deltalake-redis.docker-compose.yml up -d` - Start Delta Lake + Redis stack

### Data Management Commands
- `./scripts/download-data.sh [industry] [size]` - Download real datasets from public sources
  - Industries: `healthcare`, `finance`, `retail`, `education`, `real-estate`, `all`
  - Sizes: `tiny` (1K), `small` (10K), `medium` (100K), `large` (1M+), `all`
- `./scripts/seed-data.sh [industry] [size] [database]` - Seed Docker containers with real data
  - Databases: `postgres`, `mysql`, `mongodb`, `redis`, `all`
- `./scripts/generate-config.js --interactive` - Interactive configuration generator
- `./scripts/validate-config.js --config path/to/config.json` - Comprehensive config validation

### Enhanced Screenshot Generation Commands
- `./scripts/generate-screenshots-docker.sh [showcase]` - Generate screenshots with Docker integration
- `./scripts/generate-screenshots-docker.sh all` - Generate screenshots for all showcases
- `./scripts/generate-screenshots-docker.sh postgres-redis --keep-services` - Keep services running after screenshots
- `node generate-screenshots.js [showcase]` - Legacy screenshot generation (without Docker)

### Database-Specific Commands
- `./scripts/seed-mysql.sh` - Populate MySQL with e-commerce demo data
- `./scripts/seed-postgres.sh` - Populate PostgreSQL with CMS demo data
- `./scripts/seed-mongodb.sh` - Populate MongoDB with social media demo data
- `./scripts/seed-all.sh` - Populate all databases with their respective demo data
- `./scripts/migrate-data.js --from mysql --to postgres` - Cross-database migration

### Benchmark and Performance Commands
- `./scripts/benchmark-runner.js --stack mysql-redis --queries 1000` - Performance benchmarking
- `./scripts/compare-databases.js` - Side-by-side database performance comparison
- `./scripts/compare-caches.js` - Cache performance comparison
- `./scripts/generate-reports.js` - Generate comprehensive performance reports
- `./scripts/visualize-metrics.js` - Launch real-time performance visualization

### Showcase Commands
- `./scripts/start-showcase.sh mysql` - Launch MySQL e-commerce showcase
- `./scripts/start-showcase.sh postgres` - Launch PostgreSQL CMS showcase
- `./scripts/start-showcase.sh mongodb` - Launch MongoDB social media showcase
- `./scripts/start-showcase.sh unified` - Launch multi-database comparison showcase
- `npm run showcase:dev` - Development mode for showcase applications

### Data Management Commands
- `./scripts/generate-config.js --interactive` - Interactive configuration generator
- `./scripts/validate-config.js --config path/to/config.json` - Comprehensive config validation
- `./scripts/export-schema.js --database mysql --output schema.sql` - Export database schema
- `./scripts/import-data.js --database postgres --file data.json` - Import data into database

## Architecture

This is a universal search library with intelligent cache/database fallback capabilities. The architecture follows a provider-based pattern:

### Core Components

**SmartSearch** (`src/SmartSearch.ts`) - Main orchestrator class that:
- Manages intelligent search strategy selection (cache vs database)
- Implements circuit breaker pattern for cache failures
- Provides performance monitoring and metrics
- Handles automatic fallback between cache and database
- Supports configurable health checking and recovery

**SmartSearchFactory** (`src/SmartSearchFactory.ts`) - Factory for creating SmartSearch instances:
- Creates instances from configuration files (JSON/YAML)
- Creates instances from environment variables
- Handles provider instantiation and dependency injection
- Provides configuration validation

**ConfigLoader** (`src/config/ConfigLoader.ts`) - Configuration management:
- Supports multiple config file formats (JSON, YAML)
- Environment variable loading with prefixes
- Configuration validation and defaults merging
- Template generation for quick setup

### Provider System

The library uses a provider pattern for database and cache abstraction:

**DatabaseProvider Interface** - Defines contract for database implementations:
- ✅ **SupabaseProvider** - Production ready with real-time features
- ✅ **PostgreSQLProvider** - Advanced text search with GIN indexes and ranking
- ✅ **MySQLProvider** - Full-text search with MATCH/AGAINST and JSON support
- ✅ **MongoDBProvider** - Text indexes, Atlas Search, and aggregation pipelines
- ✅ **DeltaLakeProvider** - ACID transactions, time travel, columnar storage
- 📋 **SQLiteProvider** - FTS5 extension for lightweight applications

**CacheProvider Interface** - Defines contract for cache implementations:
- ✅ **RedisProvider** - Production ready with RediSearch and JSON modules
- 🔄 **DragonflyProvider** - High-performance Redis-compatible cache
- 📋 **MemcachedProvider** - Traditional distributed caching
- 📋 **InMemoryProvider** - Development and testing cache

**Legend:** ✅ Complete | 🔄 In Progress | 📋 Planned

**Provider Implementations** (`src/providers/`):

**Database Providers:**
- `SupabaseProvider.ts` - Full-text search via Supabase with real-time subscriptions
- `PostgreSQLProvider.ts` - Advanced PostgreSQL full-text search with tsvector and ranking
- `MySQLProvider.ts` - MySQL 8.0+ full-text search with InnoDB and MyISAM support
- `MongoDBProvider.ts` - MongoDB text search with Atlas Search and aggregation pipelines
- `DeltaLakeProvider.ts` - Delta Lake with ACID transactions, time travel, and Parquet storage
- `SQLiteProvider.ts` - Lightweight SQLite FTS5 for demos and embedded applications

**Cache Providers:**
- `RedisProvider.ts` - Redis 7+ with RediSearch, JSON, and TimeSeries modules
- `DragonflyProvider.ts` - High-performance DragonflyDB with multi-threading support
- `MemcachedProvider.ts` - Traditional Memcached for simple key-value caching
- `InMemoryProvider.ts` - Simple in-memory cache for development and testing

### Key Features

**Circuit Breaker Pattern** - Prevents cascade failures by:
- Monitoring cache failure rates
- Opening circuit after configurable threshold
- Automatic recovery attempts with backoff

**Intelligent Fallback** - Strategy selection based on:
- Cache health and availability
- Response time metrics
- Circuit breaker state
- Configuration preferences

**Performance Monitoring** - Tracks:
- Search response times
- Cache hit/miss rates
- Circuit breaker events
- Slow query detection

### Configuration Structure

The library supports flexible configuration through:
- JSON/YAML config files
- Environment variables
- Programmatic configuration

Key configuration sections:
- `database` - Database provider configuration
- `cache` - Cache provider configuration (optional)
- `search` - Table mappings and search columns
- `circuitBreaker` - Failure handling parameters
- `performance` - Monitoring and logging settings

### Testing Strategy

**Unit Tests** (`src/__tests__/`) - Test core functionality and providers
**E2E Tests** (`tests/e2e/`) - Test full integration scenarios with Playwright
**Integration Tests** - Cross-database compatibility testing with Docker stacks
**Performance Tests** (`benchmarks/`) - Automated performance regression testing
**Chaos Tests** - Fault injection and resilience testing
**Coverage Requirements** - 80% minimum coverage across branches, functions, lines, and statements

## Development Notes

- TypeScript strict mode enabled with comprehensive type checking
- ESLint configured with TypeScript rules
- Uses tsup for building with multiple output formats (CJS, ESM, types)
- Vitest for unit testing with coverage tracking
- Playwright for end-to-end testing
- CLI tool for configuration management and testing

### Testing a Single Provider

To test a specific provider in isolation:
```bash
npm run test -- src/__tests__/providers/RedisProvider.test.ts
```

### Building and Testing Before Release

Always run before making significant changes:
```bash
npm run type-check && npm run test:unit && npm run build
```

## Docker Infrastructure

### Available Database + Cache Stacks

The project provides pre-configured Docker stacks for comprehensive testing and showcasing:

#### Production-Ready Stacks
- **`mysql-redis`** - MySQL 8.0 + Redis 7 (E-commerce showcase)
- **`postgres-redis`** - PostgreSQL 15 + Redis 7 (CMS showcase) 
- **`mongodb-dragonfly`** - MongoDB 6.0 + DragonflyDB (Social media showcase)
- **`supabase-redis`** - Local Supabase + Redis Stack (Real-time showcase)

#### Development & Testing Stacks
- **`sqlite-inmemory`** - SQLite + In-memory cache (Lightweight development)
- **`all-databases`** - Multi-database comparison environment
- **`monitoring-stack`** - Grafana + Prometheus + all databases

#### Quick Start Commands
```bash
# Start MySQL + Redis with demo data
./scripts/start-stack.sh mysql-redis

# Start all databases for comparison
./scripts/start-stack.sh all-databases

# Stop all services
./scripts/stop-all.sh
```

### Docker Compose Files Structure

```
docker/
├── mysql-redis.docker-compose.yml       # MySQL + Redis + demo data
├── postgres-redis.docker-compose.yml    # PostgreSQL + Redis + CMS data  
├── mongodb-dragonfly.docker-compose.yml # MongoDB + DragonflyDB + social data
├── supabase-redis.docker-compose.yml    # Supabase + Redis Stack
├── sqlite-inmemory.docker-compose.yml   # Lightweight development stack
├── all-databases.docker-compose.yml     # All databases + caches
├── monitoring.docker-compose.yml        # Grafana + Prometheus monitoring
└── nginx/
    ├── nginx.conf                       # Load balancer configuration
    └── ssl/                            # SSL certificates for HTTPS
```

## Showcase Applications

### Individual Database Showcases

#### MySQL E-commerce Showcase (`showcases/mysql-showcase/`)
**Features:**
- 100k products with categories, reviews, inventory
- Real-time search with faceted filtering
- Performance comparison: MySQL full-text vs Redis cache
- Shopping cart with search history
- Admin dashboard with search analytics

**Key Demonstrations:**
- MySQL 8.0 MATCH/AGAINST full-text search
- JSON column search and filtering
- Index optimization strategies
- Cache warming and invalidation patterns

**Access:** `http://localhost:3001` (after running `./scripts/start-showcase.sh mysql`)

#### PostgreSQL CMS Showcase (`showcases/postgres-showcase/`)
**Features:**
- 50k articles, authors, comments, tags
- Advanced search with relevance ranking
- Multi-language content search
- Full-text search with highlighting
- Content recommendation engine

**Key Demonstrations:**
- PostgreSQL tsvector and tsquery
- GIN and GiST indexing strategies
- Custom ranking algorithms
- Search result highlighting and snippets

**Access:** `http://localhost:3002` (after running `./scripts/start-showcase.sh postgres`)

#### MongoDB Social Media Showcase (`showcases/mongodb-showcase/`)
**Features:**
- 200k users, posts, comments, interactions
- Real-time search with live updates
- Geospatial search capabilities
- Flexible schema search
- Social graph search

**Key Demonstrations:**
- MongoDB text indexes and aggregation pipelines
- Atlas Search integration (with local Atlas)
- Geospatial queries and indexing
- Real-time search with change streams

**Access:** `http://localhost:3003` (after running `./scripts/start-showcase.sh mongodb`)

#### Supabase Real-time Showcase (`showcases/supabase-showcase/`)
**Features:**
- Real-time collaborative search
- Row-level security demonstrations
- Edge function integration
- Real-time subscriptions with search filters
- Multi-tenant search patterns

**Key Demonstrations:**
- Supabase real-time subscriptions
- PostgreSQL RLS policies
- Edge function search enhancements
- Multi-tenant data isolation

**Access:** `http://localhost:3004` (after running `./scripts/start-showcase.sh supabase`)

### Unified Multi-Stack Showcase (`showcases/unified-showcase/`)

**Interactive Features:**
- **Database Selector** - Switch between MySQL, PostgreSQL, MongoDB live
- **Cache Provider Toggle** - Compare Redis, DragonflyDB, Memcached performance
- **Real-time Metrics** - Search latency, throughput, cache hit rates
- **Configuration Editor** - Live configuration changes with instant results
- **Query Analyzer** - Explain query execution across different databases

**Performance Comparisons:**
- Search latency across different database types
- Cache effectiveness for different query patterns
- Scaling characteristics under load
- Memory usage and connection pooling

**Access:** `http://localhost:3000` (after running `./scripts/start-showcase.sh unified`)

## Performance Benchmarking

### Benchmark Suite

The project includes comprehensive benchmarking tools for performance analysis:

#### Load Testing Scenarios
```bash
# Basic search performance
./scripts/benchmark-runner.js --test search-latency --duration 300s --rps 100

# Cache effectiveness
./scripts/benchmark-runner.js --test cache-performance --queries 10000

# Concurrent user simulation  
./scripts/benchmark-runner.js --test concurrent-users --users 50 --duration 600s

# Failover performance
./scripts/benchmark-runner.js --test failover-timing --failure-scenarios all
```

#### Database Comparison Framework
```bash
# Compare all databases with same query set
./scripts/compare-databases.js --queries benchmarks/query-sets/ecommerce.json

# Cache provider comparison
./scripts/compare-caches.js --providers redis,dragonfly,memcached --load-pattern high-frequency

# Memory usage comparison
./scripts/memory-benchmark.js --databases all --data-size 1M
```

#### Performance Regression Testing
```bash
# Run performance regression suite
./scripts/performance-regression.js --baseline v1.0.0 --current HEAD

# Generate performance report
./scripts/generate-reports.js --format html --output reports/performance.html
```

### Monitoring and Observability

#### Grafana Dashboards
- **Search Performance Dashboard** - Real-time search metrics
- **Database Health Dashboard** - Connection pools, query performance  
- **Cache Analytics Dashboard** - Hit rates, memory usage, eviction patterns
- **Circuit Breaker Dashboard** - Failure patterns and recovery metrics

#### Custom Metrics
- Search request rate and latency percentiles
- Cache hit/miss ratios by query pattern
- Database connection pool utilization
- Circuit breaker state changes
- Query execution plan analysis

#### Alerts and Monitoring
- High latency alerts (>100ms p95)
- Cache hit rate degradation (<80%)
- Circuit breaker activation
- Database connection pool exhaustion

## Provider Development Guide

### Creating a New Database Provider

#### 1. Implement DatabaseProvider Interface
```typescript
// src/providers/CustomDBProvider.ts
export class CustomDBProvider implements DatabaseProvider {
  name = 'CustomDB';
  
  async connect(): Promise<void> {
    // Connection logic
  }
  
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Search implementation
  }
  
  async checkHealth(): Promise<HealthStatus> {
    // Health check logic
  }
}
```

#### 2. Add Configuration Support
```typescript
// Add to SmartSearchFactory.ts
case 'customdb':
  return new CustomDBProvider({
    connectionString: connection.uri,
    options: options || {}
  });
```

#### 3. Create Docker Configuration
```yaml
# docker/customdb-redis.docker-compose.yml
version: '3.8'
services:
  customdb:
    image: customdb:latest
    environment:
      - CUSTOMDB_DATABASE=testdb
    ports:
      - "5433:5432"
```

#### 4. Add Test Suite
```typescript
// src/__tests__/providers/CustomDBProvider.test.ts
describe('CustomDBProvider', () => {
  // Comprehensive test suite
});
```

#### 5. Create Showcase Application
```bash
# Create showcase directory
mkdir showcases/customdb-showcase
# Implement showcase with realistic demo data
```

### Creating a New Cache Provider

Follow similar pattern for cache providers, implementing the `CacheProvider` interface with `connect()`, `search()`, `set()`, `get()`, `delete()`, `clear()`, and `checkHealth()` methods.

## Production Deployment

### Database-Specific Optimization

#### MySQL Production Setup
```sql
-- Optimize for full-text search
SET GLOBAL innodb_ft_min_token_size=1;
SET GLOBAL innodb_ft_server_stopword_table='';

-- Create optimized indexes
ALTER TABLE products ADD FULLTEXT(name, description);
```

#### PostgreSQL Production Setup
```sql
-- Create GIN indexes for text search
CREATE INDEX CONCURRENTLY idx_articles_fts 
ON articles USING gin(to_tsvector('english', title || ' ' || content));

-- Configure text search
ALTER DATABASE myapp SET default_text_search_config = 'english';
```

#### MongoDB Production Setup
```javascript
// Create text indexes
db.articles.createIndex({
  "title": "text",
  "content": "text", 
  "author": "text"
}, {
  weights: { title: 10, content: 1, author: 5 }
});
```

### Cache Optimization

#### Redis Configuration
```conf
# redis.conf optimization
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
```

#### DragonflyDB Configuration  
```conf
# dragonfly.conf
--maxmemory=4gb
--cache_mode=true
--proactor_threads=8
```

### Scaling Considerations

#### Read Replicas
- Configure read replicas for database providers
- Implement read/write splitting in search operations
- Load balance search queries across replicas

#### Cache Clustering
- Redis Cluster configuration for horizontal scaling
- Consistent hashing for cache key distribution
- Failover and recovery procedures

#### Monitoring at Scale
- Prometheus metrics collection
- Grafana alerting rules
- Log aggregation with ELK stack
- Distributed tracing with OpenTelemetry