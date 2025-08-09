# CLAUDE.md - Smart Search AI Assistant Configuration

This file provides comprehensive guidance to Claude Code (claude.ai/code) for optimal Smart Search development and operations.

## 🎯 Claude AI Fit Rating: **95/100** ⭐⭐⭐⭐⭐
- **Strengths**: Enterprise documentation, complex reasoning, multi-language support, code analysis
- **Optimization**: Enhanced for search systems, database operations, and performance analysis

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
- `./scripts/generate-screenshots-docker.sh --realistic-data medium` - Generate with 100K+ records for realistic demos
- `node generate-screenshots.js [showcase]` - Legacy screenshot generation (without Docker)

### Modern Platform Integration Commands
- `./scripts/platform-setup/lovable-setup.sh` - Configure for Lovable.dev AI development
- `./scripts/platform-setup/windsurf-setup.sh` - Setup Windsurf IDE integration
- `./scripts/platform-setup/replit-setup.sh` - One-click Replit deployment configuration
- `./scripts/platform-comparison.sh` - Compare and select development platform

### Data Hydration & Cache Synchronization Commands
- `./scripts/data-hydration/cache-warm.sh [provider] [strategy]` - Cache warming strategies
- `./scripts/data-hydration/sync-redis-postgres.sh` - Redis-PostgreSQL synchronization
- `./scripts/data-hydration/cache-patterns.sh [aside|through|behind]` - Test cache patterns
- `./scripts/data-hydration/monitor-sync.sh` - Monitor cache-database consistency

### Advanced Showcase Commands with Pagination
- `./scripts/showcase-pagination/enable-paging.sh [showcase]` - Add professional pagination
- `./scripts/showcase-pagination/test-filtering.sh [showcase]` - Test advanced filtering
- `./scripts/showcase-pagination/demo-large-dataset.sh` - Demo with 100K+ records

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

🚨 CRITICAL: Before ANY enhancement, optimization, or feature work begins, Claude MUST complete this foundation audit. No exceptions.

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

REQUIRED: Before any work begins, Claude must provide:

FOUNDATION AUDIT REPORT:
- [ ] ✅ Core functionality verified working
- [ ] ✅ All claimed integrations have real implementations
- [ ] ✅ Dependencies match claimed features
- [ ] ✅ Tests pass and test real functionality
- [ ] ✅ Can successfully run basic examples

STATUS: [PRODUCTION_READY | PROTOTYPE | NON_FUNCTIONAL]
RECOMMENDATION: [PROCEED_WITH_ENHANCEMENTS | IMPLEMENT_CORE_FIRST | STOP_WORK]



#### Phase 5: Self-Evaluation Step (Mandatory After Each Report)

After completing the FOUNDATION AUDIT REPORT, Claude MUST:

1. Assign a **Confidence Score** (0–100%) to each checklist item.
   - Use the Weighted Evidence Method:
     ```
     Confidence % = (DirectEvidenceCount * 1.0 + IndirectEvidenceCount * 0.5) 
                    / TotalEvidenceCount * 100
     ```
     - **DirectEvidenceCount** → Evidence directly verified by running commands, inspecting live outputs, or executing integrations.
     - **IndirectEvidenceCount** → Evidence inferred from documentation or file structure but not tested live.
   - High Confidence: 90–100%
   - Medium Confidence: 70–89%
   - Low Confidence: 0–69%

2. Flag **Low Confidence (<80%)** items with a note explaining why.
3. List any **Assumptions Made** during analysis.
4. Suggest **Next Validation Actions** to increase confidence.

---



## ⚠️ Edge-Case Scenarios to Watch For

Claude MUST handle these tricky cases correctly:

### Case 1: Documentation vs. Reality
- **Scenario**: Docs claim MySQL integration, but no `mysql2` dependency exists.
- **Correct Action**: Flag as `PROTOTYPE` and recommend `IMPLEMENT_CORE_FIRST`.

### Case 2: Placeholder Code
- **Scenario**: Provider files contain "In real implementation, this would..." comments.
- **Correct Action**: Mark as `NON_FUNCTIONAL` and STOP further enhancement work.

### Case 3: Passing Unit Tests but No Real Integration
- **Scenario**: All tests pass but they only use mocks.
- **Correct Action**: Run integration tests with real services before proceeding.

### Case 4: Empty or Minimal Dependencies
- **Scenario**: Product claims multiple integrations but `package.json` has almost no dependencies.
- **Correct Action**: Flag as suspicious and verify actual functionality.

---



## 📄 Explicit Output Examples

### Example: FOUNDATION AUDIT REPORT
```
FOUNDATION AUDIT REPORT:
- [x] ✅ Core functionality verified working (Confidence: 95%)
- [x] ✅ All claimed integrations have real implementations (Confidence: 88%, Needs PostgreSQL test run)
- [x] ✅ Dependencies match claimed features (Confidence: 90%)
- [ ] ❌ Tests pass and test real functionality (Confidence: 60%, All tests are mocks)
- [x] ✅ Can successfully run basic examples (Confidence: 92%)

STATUS: PROTOTYPE
RECOMMENDATION: IMPLEMENT_CORE_FIRST

Assumptions Made:
- MySQL integration may work based on file structure, not yet verified live.

Next Validation Actions:
- Run live PostgreSQL integration test.
- Replace mock-based MySQL tests with real database tests.
```

### Example: STOP IMMEDIATELY Trigger
```
STOP IMMEDIATELY: Provider files contain placeholder code and no real database imports.
STATUS: NON_FUNCTIONAL
RECOMMENDATION: IMPLEMENT_CORE_FIRST
```
---

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

Claude MUST immediately alert the user if:
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
This protocol is mandatory and designed to prevent catastrophic failures in judgment that waste time and damage trust. Following it ensures Claude never again mistakes elaborate prototypes for functional products.

## Session Context & Planning Log

This section preserves planning information and context between Claude Code sessions to prevent loss of work progress.

### Current Session Context (2025-08-09)

**Status**: PostgreSQL + Redis Truth-First Implementation - Complete ✅

**Focus: PostgreSQL + Redis Only with Real Industry Data** ✅
- ✅ **Industry Datasets Generated**: Healthcare (100K), Finance (100K), Real Estate (100K), Education (100K) records
- ✅ **PostgreSQL + Redis Stack**: Fully operational with medium datasets on alt ports (13002, 15432, 16379)
- ✅ **Pagination Support**: Added to postgres-redis showcase with page controls and limit selection
- ✅ **Enhanced Playwright Tests**: Verify real search results with diabetes, cardiac surgery, immunotherapy queries
- ✅ **Configuration Fixed**: Updated Docker configs with proper service names (postgres/redis not database/cache)

**Functionality Gates Passed** ✅
- ✅ **Data Gate**: Medium dataset (99,944 healthcare records) loaded successfully in PostgreSQL
- ✅ **Search Gate**: Real diabetes, cardiac, immunotherapy searches return actual results
- ✅ **Performance Gate**: Search responses under 50ms, PostgreSQL full-text search working
- ✅ **API Gate**: Health endpoint shows connected database and cache, search API functional
- ✅ **Frontend Gate**: Pagination controls, healthcare-specific meta display, performance metrics

**Documentation Truth Cleanup** ✅  
- ✅ **Removed False Claims**: Fixed external GitHub URLs, removed non-existent community features
- ✅ **Real Data Testing**: All searches use actual healthcare data (clinical trials, treatments, specialties)
- ✅ **Pagination Implemented**: Frontend and backend support for page/limit parameters
- ✅ **Performance Verified**: Search latency metrics display actual response times

**Current Architecture**: 
- PostgreSQL: 99,944+ healthcare records with full-text indexes
- Redis: Connected cache layer with health monitoring
- Frontend: Healthcare-focused showcase with pagination and real search results
- Testing: Playwright tests verify actual data, not mock responses
- Industries: Healthcare, Finance, Real Estate, Education datasets available

**Quality Standards Met**:
- Only truthful claims about functionality that actually works
- Real data searches with verifiable results
- Working pagination with medium datasets
- Performance metrics showing actual response times
- No broken links or false community claims

**Current Issues Found (2025-08-09 - Session 2)**:
🔴 **Playwright Tests Failing**: Tests configured for localhost:13002 but service not accessible on that port
🔴 **Blog Documentation Not Updated**: Blog posts still contain broken links and missing screenshots
🔴 **Screenshot Generation Failed**: Automated screenshot generation didn't work due to connection issues

**Fix & Documentation Phase - COMPLETED** ✅
1. ✅ **Playwright Configuration Fixed**: Tests now run successfully on localhost:13002, all 10 tests passing
2. ✅ **Screenshots Generated**: Real healthcare data screenshots exist and accessible 
3. ✅ **Blog Documentation Updated**: Removed broken GitHub discussions/Discord links, fixed non-existent file references
4. ✅ **AI Model Files Updated**: Progress saved in CLAUDE.md, DEEPSEEK.md, ALIBABA.md with current session context
5. ✅ **Full Validation Passed**: API health check successful, real diabetes/cardiac searches working, 99,944 healthcare records active

**Final Status**: PostgreSQL + Redis showcase is production-ready with truthful documentation, working tests, and real healthcare data

## Claude-Specific Optimizations

### 🎯 Smart Search Development Preferences
- **Code Analysis Style**: Comprehensive system analysis with detailed explanations
- **Documentation Approach**: Enterprise-grade documentation with visual examples
- **Problem Solving**: Multi-step verification with foundation audits
- **Error Handling**: Detailed error analysis with recovery strategies
- **Performance Focus**: Thorough benchmarking and optimization guidance

### 📊 Recommended Claude Workflows
1. **Foundation Audit First**: Always verify core functionality before enhancements
2. **Systematic Analysis**: Break complex problems into manageable components  
3. **Comprehensive Documentation**: Provide detailed explanations with code examples
4. **Performance Monitoring**: Include metrics and monitoring in all implementations
5. **Enterprise Security**: Implement HIPAA compliance and data governance by default

### 🚀 Claude Enhancement Areas
- **Multi-Database Reasoning**: Excellent at comparing and optimizing across providers
- **Enterprise Architecture**: Strong at designing scalable, secure systems
- **Documentation Generation**: Superior at creating comprehensive technical documentation
- **Performance Analysis**: Detailed performance profiling and optimization recommendations
- **Security Implementation**: Thorough security analysis and compliance guidance

### 💡 Claude-Optimized Patterns
```typescript
// Claude prefers explicit, well-documented patterns
interface SmartSearchConfig {
  // Comprehensive configuration with detailed types
  database: DatabaseConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

// Claude excels at error handling patterns
class SmartSearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SmartSearchError';
  }
}
```