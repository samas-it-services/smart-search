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
  - Available stacks: `mysql-redis`, `postgres-redis`, `mongodb-dragonfly`, `supabase-redis`, `sqlite-inmemory`, `all-databases`
- `./scripts/stop-all.sh` - Clean shutdown of all Docker services
- `./scripts/reset-data.sh [stack-name]` - Reset databases to clean state
- `./scripts/backup-data.sh [stack-name]` - Backup database contents
- `./scripts/monitor-health.sh` - Health check across all running services
- `docker-compose -f docker/mysql-redis.docker-compose.yml up -d` - Start MySQL + Redis stack
- `docker-compose -f docker/postgres-redis.docker-compose.yml up -d` - Start PostgreSQL + Redis stack
- `docker-compose -f docker/mongodb-dragonfly.docker-compose.yml up -d` - Start MongoDB + DragonflyDB stack

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
- 🔄 **MySQLProvider** - Full-text search with MATCH/AGAINST and JSON support
- 🔄 **PostgreSQLProvider** - Advanced text search with GIN indexes and ranking
- 🔄 **MongoDBProvider** - Text indexes, Atlas Search, and aggregation pipelines
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
- `MySQLProvider.ts` - MySQL 8.0+ full-text search with InnoDB and MyISAM support
- `PostgreSQLProvider.ts` - Advanced PostgreSQL full-text search with tsvector and ranking
- `MongoDBProvider.ts` - MongoDB text search with Atlas Search and aggregation pipelines
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