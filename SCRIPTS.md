# 📋 Smart Search Scripts Reference

Complete reference for all automation-ready scripts in the Smart Search project. All scripts support non-interactive operation via environment variables and command-line arguments.

## 🚀 Quick Start

```bash
# Launch PostgreSQL + Redis showcase with medium healthcare dataset
DATA_SIZE=medium ./run-postgres-redis-showcase.sh

# Sync any dataset to any provider (Universal System)
./scripts/sync-data.sh postgres-redis healthcare large --dry-run

# Run all tests
./scripts/test-universal-system.sh full
```

## 📊 Script Categories

### 🎯 Main Showcase Scripts (Root Level)

| Script | Purpose | Arguments | Example |
|--------|---------|-----------|---------|
| `./run-postgres-redis-showcase.sh` | Launch PostgreSQL+Redis showcase | `[--size SIZE] [--industry IND] [--force] [--dry-run] [--help]` | `./run-postgres-redis-showcase.sh --size large --force` |

**Environment Variables:**
- `DATA_SIZE` - Dataset size (tiny, small, medium, large)
- `INDUSTRY` - Industry dataset (healthcare, finance, retail, education, real_estate)
- `FORCE` - Skip confirmations (true/false)
- `DRY_RUN` - Show what would happen (true/false)

### 🔧 Universal Data Management

| Script | Purpose | Arguments | Example |
|--------|---------|-----------|---------|
| `./scripts/sync-data.sh` | Universal data synchronization | `<provider> <dataset> <size> [--dry-run] [--validate-only] [--force-transform] [--skip-cache] [--verbose]` | `./scripts/sync-data.sh postgres-redis healthcare large --verbose` |
| `./scripts/download-data.sh` | Download dataset files | `<industry> <size>` | `./scripts/download-data.sh healthcare large` |
| `./scripts/seed-data.sh` | Seed databases with data | `<industry> <size> <database>` | `./scripts/seed-data.sh healthcare medium postgres` |

**Key Features:**
- **Revolutionary Capability**: ANY dataset + ANY provider combination
- **Automatic Container Management**: Detects and starts required services
- **Intelligent Schema Transformation**: Optimizes for each database type

### 🏗️ Provider-Specific Scripts

#### PostgreSQL + Redis Provider (`scripts/providers/postgres-redis/`)

| Script | Purpose | Arguments | Example |
|--------|---------|-----------|---------|
| `interactive.sh` | Non-interactive launcher | `[--size SIZE] [--industry IND] [--force] [--dry-run]` | `./interactive.sh --size medium --industry finance` |
| `start-tiny.sh` | Launch tiny dataset (1K) | `[start\|stop\|status\|logs]` | `./start-tiny.sh start` |
| `start-small.sh` | Launch small dataset (10K) | `[start\|stop\|status\|logs]` | `./start-small.sh start` |
| `start-medium.sh` | Launch medium dataset (100K) | `[start\|stop\|status\|logs]` | `./start-medium.sh start` |
| `start-large.sh` | Launch large dataset (1M+) | `[start\|stop\|status\|logs] [--force]` | `./start-large.sh start --force` |
| `stop.sh` | Stop all services | `[stop\|status]` | `./stop.sh stop` |

### 🧪 Testing & Validation

| Script | Purpose | Arguments | Example |
|--------|---------|-----------|---------|
| `./scripts/test-universal-system.sh` | Test universal system | `[full\|quick\|matrix\|examples\|help]` | `./scripts/test-universal-system.sh full` |
| `./scripts/benchmark.sh` | Performance benchmarking | `<provider> [options]` | `./scripts/benchmark.sh postgres-redis --queries 1000` |
| `./scripts/test-showcase.sh` | Test showcase applications | `[provider]` | `./scripts/test-showcase.sh postgres-redis` |

### 🛠️ Utility Scripts

| Script | Purpose | Arguments | Example |
|--------|---------|-----------|---------|
| `./scripts/generate-screenshots-docker.sh` | Generate showcase screenshots | `[showcase] [--keep-services]` | `./scripts/generate-screenshots-docker.sh postgres-redis --keep-services` |
| `./scripts/clear-data.sh` | Clear database data | `<database> [--force]` | `./scripts/clear-data.sh postgres --force` |
| `./scripts/docker-dev.sh` | Development Docker utils | `[command]` | `./scripts/docker-dev.sh cleanup` |
| `./scripts/start-all-scenarios.sh` | Start all provider scenarios | None | `./scripts/start-all-scenarios.sh` |
| `./scripts/stop-all-scenarios.sh` | Stop all provider scenarios | None | `./scripts/stop-all-scenarios.sh` |

## 🌟 Universal Data Sync Examples

The **Revolutionary Capability** - ANY dataset can work with ANY provider:

```bash
# Healthcare data with finance-optimized infrastructure
./scripts/sync-data.sh mysql-dragonfly healthcare large

# Finance data with healthcare-optimized infrastructure  
./scripts/sync-data.sh postgres-redis finance medium

# Retail data with document-oriented storage
./scripts/sync-data.sh mongodb-memcached retail small

# Education data with cloud-native infrastructure
./scripts/sync-data.sh supabase-redis education tiny

# Real estate data with geospatial optimization
./scripts/sync-data.sh postgres-redis real_estate large
```

## 📋 Environment Variables Reference

### Global Variables (All Scripts)

| Variable | Values | Description | Default |
|----------|--------|-------------|---------|
| `DATA_SIZE` | `tiny`, `small`, `medium`, `large` | Dataset size | `tiny` |
| `INDUSTRY` | `healthcare`, `finance`, `retail`, `education`, `real_estate` | Industry dataset | `healthcare` |
| `PROVIDER` | `postgres-redis`, `mysql-dragonfly`, `mongodb-memcached`, `supabase-redis` | Provider combination | - |
| `FORCE` | `true`, `false` | Skip confirmations | `false` |
| `DRY_RUN` | `true`, `false` | Preview mode | `false` |
| `VERBOSE` | `true`, `false` | Detailed output | `false` |

### Service Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT_OFFSET` | Port offset for services | - |
| `SKIP_IF_EXISTS` | Skip if data already exists | `false` |

## 🎯 Common Workflows

### Development Workflow

```bash
# 1. Quick testing with tiny dataset
DATA_SIZE=tiny ./run-postgres-redis-showcase.sh

# 2. Realistic testing with medium dataset
./scripts/sync-data.sh postgres-redis healthcare medium
./run-postgres-redis-showcase.sh --size medium

# 3. Performance testing with large dataset
./scripts/sync-data.sh postgres-redis healthcare large --verbose
FORCE=true ./run-postgres-redis-showcase.sh --size large
```

### CI/CD Automation

```bash
# Non-interactive testing pipeline
export DATA_SIZE=small
export FORCE=true
export DRY_RUN=false

# Test universal system
./scripts/test-universal-system.sh full

# Test all provider combinations  
./scripts/sync-data.sh postgres-redis healthcare $DATA_SIZE --validate-only
./scripts/sync-data.sh mysql-dragonfly finance $DATA_SIZE --validate-only
./scripts/sync-data.sh mongodb-memcached retail $DATA_SIZE --validate-only

# Launch and test showcases
./run-postgres-redis-showcase.sh
```

### Cross-Industry Data Migration

```bash
# Migrate healthcare data across different infrastructures
./scripts/sync-data.sh postgres-redis healthcare large
./scripts/sync-data.sh mysql-dragonfly healthcare large  
./scripts/sync-data.sh mongodb-memcached healthcare large

# Compare performance across providers
./scripts/benchmark.sh postgres-redis --dataset healthcare
./scripts/benchmark.sh mysql-dragonfly --dataset healthcare
./scripts/benchmark.sh mongodb-memcached --dataset healthcare
```

## 📈 Dataset Sizes & Performance

| Size | Records | Startup Time | RAM Required | Use Case |
|------|---------|--------------|--------------|----------|
| `tiny` | 1K | ~30 seconds | 512MB | Quick testing, development |
| `small` | 10K | ~2 minutes | 1GB | Basic demos, CI/CD |
| `medium` | 100K | ~5 minutes | 2GB | Realistic testing |
| `large` | 1M+ | ~10 minutes | 4GB+ | Performance testing, production simulation |

## 🔧 Provider Combinations

| Provider | Database | Cache | Optimizations | Best For |
|----------|----------|--------|---------------|----------|
| `postgres-redis` | PostgreSQL | Redis | Advanced indexing, full-text search, JSONB | Healthcare, general purpose |
| `mysql-dragonfly` | MySQL | DragonflyDB | FULLTEXT indexing, high performance | Finance, high throughput |
| `mongodb-memcached` | MongoDB | Memcached | Document storage, flexible schema | Retail, content management |
| `supabase-redis` | Supabase | Redis | Cloud-native, real-time | Education, modern apps |
| `deltalake-redis` | Delta Lake | Redis | Time-travel, versioning | Analytics, data science |

## 🚨 Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
# Scripts automatically detect and use alternative ports
# Check port usage: ./run-postgres-redis-showcase.sh --dry-run
```

**Large Dataset Resources:**
```bash
# Large datasets require explicit confirmation
FORCE=true ./scripts/sync-data.sh postgres-redis healthcare large
```

**Container Issues:**
```bash
# Scripts automatically manage Docker containers
# Manual cleanup: docker system prune -f
```

### Getting Help

```bash
# Show help for any script
./script-name.sh --help

# Test system status
./scripts/test-universal-system.sh quick

# Validate configuration
./scripts/sync-data.sh provider dataset size --validate-only
```

## 🎉 Revolutionary Features

1. **Zero Interactive Prompts** - Perfect for automation and CI/CD
2. **Universal Dataset Support** - Any dataset + any provider = 30+ combinations
3. **Automatic Service Management** - Detects, starts, and configures Docker services
4. **Intelligent Schema Transformation** - Optimizes for each database type
5. **Comprehensive CLI Support** - Environment variables, flags, and positional args
6. **Consistent Interface** - Same patterns across all scripts

---

**Ready for production automation! 🚀**