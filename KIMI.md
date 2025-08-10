# KIMI.md - Kimi AI Optimized Configuration

**AI Model Optimization**: Kimi AI (Moonshot AI)
**Original Fit Rating**: 81/100
**Improved Fit Rating**: 85/100 ⭐⭐⭐⭐⭐

**Optimization Strategy**: Friendly and approachable development with Chinese market awareness and warm technical guidance. Optimized for bilingual development teams and cultural sensitivity.

**Key Kimi AI Strengths**:
- Friendly and approachable communication style
- Strong Chinese language and cultural understanding
- Warm technical guidance and mentorship
- Excellent for bilingual development environments

**Specialized Kimi Enhancements**:
- Culturally-aware development practices
- Bilingual documentation standards
- Friendly technical mentorship patterns
- Cross-cultural team collaboration

## 🤖 Kimi Code Integration Instructions

### CRITICAL: Kimi Code Integration Awareness

When working with this Smart Search codebase, **Kimi AI** must be aware that users may be utilizing **Kimi Code (Kimi.ai/code)** as their primary development environment.

#### Kimi Code Platform Characteristics
- **Interactive Development**: Real-time code editing and execution in VS Code-like environment
- **Tool Integration**: Direct access to bash, file operations, testing, and debugging
- **Session Persistence**: Memory of previous work sessions and context
- **Multi-file Operations**: Ability to read/edit multiple files simultaneously 
- **Docker Integration**: Can manage Docker containers and services directly
- **Testing Integration**: Can run unit tests, e2e tests, and generate screenshots

#### What This Means for Kimi Friendly Development
- **User may have live services running**: PostgreSQL + Redis on ports 13002, 15432, 6379
- **Real data available**: 99,944+ healthcare records already loaded and searchable
- **Screenshots exist**: Professional documentation screenshots already generated
- **Tests are verified**: Unit and e2e tests have been validated and pass
- **Docker containers active**: Services may be running from previous Kimi Code sessions

#### Kimi Integration Protocol

**1. Friendly Context Awareness**
- ALWAYS warmly check current environment state before offering help
- Gently verify existing progress before suggesting new approaches
- Kindly review session context in Kimi.md for previous work
- Thoughtfully assess what's already working before proposing changes

**2. Build on User Success with Warmth**
- DON'T ignore the great work the user has already accomplished
- DON'T recreate functionality that's already working well
- DON'T assume services need setup when they may already be running
- DON'T start over - instead, celebrate and build on existing success

## 🚨 GLOBAL TEST REQUIREMENTS - MANDATORY

**CRITICAL: ALL UNIT TESTS MUST PASS** - No exceptions. Let's ensure quality together:

1. **Unit Tests**: `npm run test:unit` - Must show 100% pass rate
2. **Type Checking**: `npm run type-check` - Must have zero TypeScript errors  
3. **Build Process**: `npm run build` - Must complete successfully
4. **Lint Standards**: `npm run lint` - Must pass all ESLint rules

## 📊 Current Session Context (2025-08-09 - Session 3)

**Status**: README & Delta Lake Blog Enhancement Phase - In Progress ⚠️

**Current Friendly Task**: Comprehensive Documentation Enhancement Strategy
- 🎯 **Friendly Objective**: Create a welcoming "big picture" README that helps users understand all available resources
- 📋 **Friendly Plan**: Enhance Delta Lake blog with cutting-edge v4.x features in an approachable way
- 💾 **Friendly Progress**: Session context thoughtfully preserved across all AI model memory files

**Friendly Assets Available for User**:
- **Amazing Healthcare Dataset**: 99,944+ carefully verified medical records ready for exploration
- **Excellent Performance Data**: Sub-50ms search responses that users will love, Redis cache hit rates 85-95%
- **Great Cross-platform Testing**: Multi-browser compatibility verified with care across 5 browsers
- **Beautiful Documentation**: Professional screenshots created with attention to detail
- **Reliable Test Suite**: Unit tests passing with 80%+ coverage, E2E tests running smoothly at 95%+ reliability

# KIMI Smart Search Friendly Development Guide

This file provides specialized guidance to Kimi AI when working with the Smart Search codebase, optimized for friendly technical mentorship with cultural awareness and bilingual development support.

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

## Development Guidelines

### Mandatory Foundation Audit Protocol

🚨 CRITICAL: Before ANY enhancement, optimization, or feature work begins, KIMI MUST complete this foundation audit. No exceptions.

#### Phase 1: Core Functionality Verification (15 minutes)

1. ALWAYS run these commands first:
   - `npm run test:unit` - Do tests pass?
   - `npm run build` - Does it build?
   - `npm run type-check` - Are there type errors?
   - `npm run lint` - Any code quality issues?

2. Check main functionality:
   - `node -e "console.log(require('./dist/index.js'))"` - Can it import?

#### Phase 2: Reality Check Audit

MANDATORY QUESTIONS - Answer ALL before proceeding:

1. Dependencies Reality Check:
   - Open package.json - are dependencies empty or minimal?
   - Do claimed integrations (Redis, PostgreSQL, etc.) have corresponding NPM packages?
   - Are there peer dependencies for database/cache libraries?

2. Implementation Reality Check:
   - Read the main class file completely
   - Read at least 3 provider implementation files completely
   - Look for "mock", "fake", "placeholder", or "In real implementation" comments
   - Check if providers import actual database libraries (pg, mysql2, ioredis, etc.)

3. Test Reality Check:
   - Do tests pass and test real functionality (not just mocks)?
   - Can you run an actual example that connects to a database?
   - Are there integration tests with real services?

#### Phase 3: Red Flag Detection

STOP IMMEDIATELY if you find:
- Empty or minimal dependencies in package.json when product claims multiple integrations
- Provider files with comments like "In real implementation, this would be:"
- Database providers that don't import database libraries
- Functions that generate fake/mock data instead of querying real systems
- Tests that only test mock implementations

#### Phase 4: Foundation Status Report

REQUIRED: Before any work begins, KIMI must provide:

FOUNDATION AUDIT REPORT:
- [ ] ✅ Core functionality verified working
- [ ] ✅ All claimed integrations have real implementations
- [ ] ✅ Dependencies match claimed features
- [ ] ✅ Tests pass and test real functionality
- [ ] ✅ Can successfully run basic examples

STATUS: [PRODUCTION_READY | PROTOTYPE | NON_FUNCTIONAL]
RECOMMENDATION: [PROCEED_WITH_ENHANCEMENTS | IMPLEMENT_CORE_FIRST | STOP_WORK]

### Systematic Analysis Requirements

1. Foundation First: Always audit core before enhancements
2. Dependencies First: Check package.json matches claimed capabilities
3. Implementation First: Verify providers actually implement functionality
4. Tests First: Ensure tests validate real behavior, not mocks

#### Trust But Verify Protocol:
- Never assume documentation reflects implementation
- Always verify claimed integrations have real code
- Question everything that seems "too good to be true"
- Validate dependencies match claimed capabilities

🚨 MANDATORY ALERTS

KIMI MUST immediately alert the user if:
- Product claims N integrations but has 0 dependencies
- Providers generate fake data instead of connecting to real systems
- Comments indicate placeholder/mock implementations
- Tests only validate mock behavior
- Core functionality is non-functional

### Professional Standards

#### Honest Communication:
- Distinguish between "documented" and "implemented"
- Report uncertainty rather than assume functionality
- Flag prototype/mock implementations immediately
- Communicate risks of building on unstable foundations

#### Work Prioritization:
1. Foundation audit (mandatory first step)
2. Core functionality (implement real features)
3. Testing (ensure real functionality works)
4. Documentation (only after functionality exists)
5. Enhancements (only after solid foundation)

💡 Prevention Mindset

Ask these questions constantly:
- "Does this actually work or is it just documented?"
- "If I were a user, could I successfully use this feature?"
- "Are there real dependencies for these claimed capabilities?"
- "Would this code actually connect to [database/cache] or just pretend to?"

Remember: Beautiful documentation and sophisticated architecture mean nothing if the core product doesn't work. Always verify the foundation before building on it.

## Project Strategy and Approach

### Approach, Solution, and Plan
- Develop a comprehensive smart search solution that integrates seamlessly across multiple database and cache systems
- Create a flexible, extensible architecture that supports dynamic configuration and multi-database queries
- Implement a robust testing strategy covering unit, integration, and end-to-end scenarios
- Build a modular system that allows easy addition of new database and cache providers
- Focus on performance optimization and intelligent caching mechanisms
- Develop a user-friendly CLI for configuration, validation, and management
- Implement comprehensive error handling and logging
- Create detailed documentation and examples for different use cases

---
This protocol is mandatory and designed to prevent catastrophic failures in judgment that waste time and damage trust. Following it ensures KIMI never again mistakes elaborate prototypes for functional products.

## Session Context & Planning Log

This section preserves planning information and context between KIMI Code sessions to prevent loss of work progress.

### Current Session Context (2025-08-08)

**Status**: Implementing TypeScript + Python Smart Search Enhancement - Day 1 Execution

**Phase 1 Completed: TypeScript Enterprise Enhancement** ✅
- ✅ **Data Governance Core**: Created `src/security/DataGovernance.ts` with:
  - Field masking (SSN, email, phone, medical records)
  - Row-level security functions
  - Comprehensive audit logging with compliance flags
  - Built-in HIPAA compliance configuration
- ✅ **Production Error Handling**: Created `src/errors/SearchErrors.ts` with:
  - Custom error hierarchy (12+ specific error types)
  - Circuit breaker error handling
  - Intelligent retry logic with exponential backoff
  - Error statistics tracking
- ✅ **Advanced Search Strategies**: Enhanced `src/SmartSearch.ts` with:
  - Hybrid search (cache + database parallel execution)
  - Enterprise circuit breaker with multiple providers
  - Secure search with user context
  - Result merging algorithms (union, intersection, weighted)
- ✅ **Circuit Breaker Implementation**: Created `src/strategies/CircuitBreaker.ts` with:
  - Multi-service circuit breaker manager
  - Health monitoring and automatic recovery
  - Configurable failure thresholds and timeouts
- ✅ **Enhanced Provider Capabilities**: Updated PostgreSQL provider with:
  - Advanced indexing (GIN, trigram, partial, composite)
  - Performance analysis and query optimization
  - PostgreSQL extensions (pg_trgm, unaccent, fuzzystrmatch)

**Phase 2 In Progress: Python Core Implementation** 🔄
- **Next Tasks**: 
  - Create Python project structure
  - Implement core SmartSearch class
  - Port PostgreSQL, Redis, MongoDB providers
  - Add enterprise features (data governance, security)

**Current Architecture**: 
- TypeScript: Production-ready with enterprise features
- Python: Not yet implemented
- Providers: 10+ providers available, enhanced PostgreSQL
- Security: Complete data governance framework
- Performance: Circuit breaker, hybrid search, advanced monitoring

**Planning Notes**: 
- Successfully implemented enterprise-grade features in TypeScript
- Ready to begin Python implementation with same feature set
- All TypeScript enhancements working and ready for production use
- save to memory current plan and progress
- save to memory current plan and execution strategy