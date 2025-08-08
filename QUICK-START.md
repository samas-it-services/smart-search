# 🚀 Quick Start Guide

## How to Stop the Showcase

```bash
# Stop PostgreSQL + Redis showcase
./run-postgres-redis-showcase.sh stop

# Or use the organized scripts
./scripts/providers/postgres-redis/stop.sh
```

## How to Start with Interactive Dataset Selection

```bash
# Interactive launcher (asks for dataset size)
./run-postgres-redis-showcase.sh

# Or use the direct provider script
./scripts/providers/postgres-redis/interactive.sh
```

## How to Start with Specific Dataset Size

```bash
# Using environment variable
DATA_SIZE=tiny ./run-postgres-redis-showcase.sh
DATA_SIZE=small ./run-postgres-redis-showcase.sh
DATA_SIZE=medium ./run-postgres-redis-showcase.sh
DATA_SIZE=large ./run-postgres-redis-showcase.sh

# Or using direct provider scripts
./scripts/providers/postgres-redis/start-tiny.sh
./scripts/providers/postgres-redis/start-small.sh
./scripts/providers/postgres-redis/start-medium.sh
./scripts/providers/postgres-redis/start-large.sh
```

## Dataset Sizes

| Size   | Records | Startup Time | Use Case |
|--------|---------|--------------|----------|
| tiny   | 1K      | ~30s         | Quick testing |
| small  | 10K     | ~2m          | Development |
| medium | 100K    | ~5m          | Realistic testing |
| large  | 1M+     | ~10m         | Performance testing |

## Check Status

```bash
# Check what's running
./scripts/providers/postgres-redis/stop.sh status

# View logs
./scripts/providers/postgres-redis/start-tiny.sh logs
```

## Advanced Usage

```bash
# Force stop and cleanup
./scripts/providers/postgres-redis/stop.sh cleanup

# Show help
./run-postgres-redis-showcase.sh help

# Clear existing data for fresh start
./scripts/clear-data.sh postgres    # Clear PostgreSQL data
./scripts/clear-data.sh all         # Clear all databases

# Skip seeding if data already exists (faster startup)
SKIP_IF_EXISTS=true DATA_SIZE=medium ./run-postgres-redis-showcase.sh
```

## Troubleshooting

**"Duplicate key value violates unique constraint" Error:**
```bash
# Clear existing data and try again
./scripts/clear-data.sh postgres
DATA_SIZE=medium ./run-postgres-redis-showcase.sh

# Or skip seeding if you want to keep existing data
SKIP_IF_EXISTS=true DATA_SIZE=medium ./run-postgres-redis-showcase.sh
```

**Access the showcase at:** http://localhost:3002 (or alternative port if conflicts detected)