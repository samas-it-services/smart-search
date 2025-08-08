# 🚀 Smart Search Showcase Scripts - Complete Guide

Comprehensive guide for running healthcare showcases with different database providers and dataset sizes.

## 📂 New Organized Structure (Recommended)

We've reorganized scripts for better maintainability and added multi-provider support:

```
scripts/
├── providers/
│   ├── postgres-redis/          # PostgreSQL + Redis Healthcare
│   │   ├── interactive.sh       # Interactive dataset selector
│   │   ├── start-tiny.sh        # 1K records (~30s)
│   │   ├── start-small.sh       # 10K records (~2m)
│   │   ├── start-medium.sh      # 100K records (~5m)
│   │   ├── start-large.sh       # 1M+ records (~10m)
│   │   └── stop.sh              # Universal stop script
│   └── [other providers coming soon]
└── common/                      # Shared utilities
    ├── docker-helpers.sh        # Docker operations
    ├── port-management.sh       # Port conflict resolution
    └── dataset-helpers.sh       # Dataset management
```

## 🚀 Quick Start Methods

### Method 1: Interactive Launcher (Recommended)
```bash
# New organized approach - guides you through dataset selection
./scripts/providers/postgres-redis/interactive.sh

# Or use the wrapper
./run-postgres-redis-showcase.sh
```
**Best option** - Interactive dataset selection with system analysis.

### Method 2: Direct Dataset Size
```bash
# New organized scripts (recommended)
./scripts/providers/postgres-redis/start-tiny.sh     # 1K records
./scripts/providers/postgres-redis/start-small.sh    # 10K records
./scripts/providers/postgres-redis/start-medium.sh   # 100K records
./scripts/providers/postgres-redis/start-large.sh    # 1M+ records

# Or use environment variable with wrapper
DATA_SIZE=tiny ./run-postgres-redis-showcase.sh
DATA_SIZE=medium ./run-postgres-redis-showcase.sh
```

### Method 3: Legacy Scripts (Still Supported)
```bash
./choose-dataset.sh                  # System analysis + launch
./run-postgres-redis-showcase.sh     # TINY dataset (default)
./run-small-dataset.sh               # SMALL dataset  
./run-medium-dataset.sh              # MEDIUM dataset
./run-large-dataset.sh               # LARGE dataset
```

## 🛑 How to Stop Services

Multiple ways to stop the showcase:

```bash
# Method 1: Universal stop (recommended)
./scripts/providers/postgres-redis/stop.sh

# Method 2: Main script wrapper  
./run-postgres-redis-showcase.sh stop

# Method 3: Specific dataset script
./scripts/providers/postgres-redis/start-medium.sh stop

# Method 4: Force cleanup
./scripts/providers/postgres-redis/stop.sh cleanup
./scripts/providers/postgres-redis/stop.sh force
```

## 📊 Dataset Comparison

| Size   | Records | Startup Time | Memory Usage | Ideal For |
|--------|---------|--------------|--------------|-----------|
| **TINY**   | 1K      | ~30 sec      | ~50MB        | Quick demo |
| **SMALL**  | 10K     | ~2-3 min     | ~200MB       | Development |
| **MEDIUM** | 100K    | ~5-8 min     | ~1GB         | Testing |
| **LARGE**  | 1M+     | ~10-15 min   | ~4GB         | Enterprise |

## 🎯 Choose Your Dataset

### 🔬 TINY - Quick Demo
```bash
./run-postgres-redis-showcase.sh
```
- **Perfect for**: First-time exploration, quick demos
- **Features**: Basic search functionality, caching demonstration
- **System requirements**: Any modern computer
- **Search examples**: `diabetes`, `surgery`, `therapy`

### 🧪 SMALL - Development  
```bash
./run-small-dataset.sh
```
- **Perfect for**: Development, moderate testing
- **Features**: Multi-strategy search, performance metrics
- **System requirements**: 2GB+ RAM, 500MB+ disk
- **Search examples**: `diabetes management`, `cardiac procedures`

### 🔬 MEDIUM - Comprehensive Testing
```bash
./run-medium-dataset.sh
```
- **Perfect for**: Comprehensive testing, performance analysis
- **Features**: Advanced indexing, benchmarking tools
- **System requirements**: 4GB+ RAM, 2GB+ disk, 4+ cores
- **Search examples**: `CAR-T immunotherapy`, `clinical trials`

### 🏭 LARGE - Enterprise Scale
```bash
./run-large-dataset.sh
```
- **Perfect for**: Enterprise testing, production simulation
- **Features**: Production-grade performance, monitoring, backups
- **System requirements**: 8GB+ RAM, 5GB+ disk, 8+ cores
- **Search examples**: Complex medical terminology, research data

## 🛠️ Available Commands

### New Organized Scripts
All provider scripts support these commands:
```bash
# Dataset-specific scripts
./scripts/providers/postgres-redis/start-tiny.sh [command]
./scripts/providers/postgres-redis/start-small.sh [command]
./scripts/providers/postgres-redis/start-medium.sh [command]
./scripts/providers/postgres-redis/start-large.sh [command]

# Universal stop script
./scripts/providers/postgres-redis/stop.sh [command]

# Commands available:
start      # Start services (default)
stop       # Stop services
status     # Show current status
logs       # Show service logs
```

### Legacy Scripts  
```bash
./script-name.sh start      # Start services (default)
./script-name.sh stop       # Stop services
./script-name.sh restart    # Restart services
./script-name.sh status     # Show status and URLs
./script-name.sh logs       # Show service logs
./script-name.sh help       # Show help
```

### Additional Commands (Medium/Large datasets)
```bash
./run-medium-dataset.sh benchmark    # Run performance tests
./run-large-dataset.sh monitor       # Launch monitoring dashboard
./run-large-dataset.sh backup        # Create database backup
```

## 🌐 Access URLs

Once running, access your showcase at:
- **Showcase App**: http://localhost:3002
- **Health Check**: http://localhost:3002/api/health
- **Metrics**: http://localhost:3002/metrics (Large dataset)

## 🔧 Troubleshooting

### Port Conflicts
```bash
./stop-conflicting-services.sh      # Check what's using ports
```
The scripts automatically detect port conflicts and use alternative ports if needed.

### System Requirements Check
```bash
./choose-dataset.sh                 # Analyzes your system capabilities
```

### Alternative Ports (Automatic)
If standard ports are busy, scripts automatically use:
- PostgreSQL: `15432` instead of `5432`
- Redis: `16379` instead of `6379`  
- Showcase: `13002` instead of `3002`

## 🏥 Healthcare Search Examples

### Basic Searches (All Datasets)
- `diabetes`
- `cardiac surgery`
- `immunotherapy`
- `mental health`
- `medical research`

### Advanced Searches (Medium/Large)
- `diabetes mellitus type 2 treatment`
- `minimally invasive cardiac surgery`
- `CAR-T cell immunotherapy protocols`
- `cognitive behavioral therapy`
- `randomized controlled trial`
- `drug interaction screening`

### Enterprise Searches (Large Only)
- `precision medicine biomarkers`
- `artificial intelligence radiology`
- `telemedicine remote monitoring`
- `robotic-assisted surgical procedures`

## 🚀 Features by Dataset Size

### All Sizes Include:
- ✅ Multi-strategy search (Cache-first, Database-only, Circuit-breaker, Hybrid)
- ✅ Real-time performance metrics
- ✅ PostgreSQL full-text search with tsvector/tsquery
- ✅ Redis intelligent caching with fallback
- ✅ Healthcare dataset with medical terminology

### Medium+ Includes:
- ✅ Advanced PostgreSQL indexing (GIN, GiST)
- ✅ Performance benchmarking tools
- ✅ Query optimization with execution plans
- ✅ Circuit breaker patterns with adaptive thresholds

### Large Includes:
- ✅ Enterprise monitoring dashboard
- ✅ Database backup/recovery simulation
- ✅ Production-grade connection pooling
- ✅ Load balancing across read replicas
- ✅ Security features demonstration

## 💡 Tips

1. **First time?** Use `./choose-dataset.sh` for guided setup
2. **Development work?** Use SMALL dataset for fast iterations
3. **Performance testing?** Use MEDIUM dataset for realistic loads
4. **Enterprise demo?** Use LARGE dataset for production simulation
5. **Port conflicts?** Scripts automatically handle them
6. **Slow startup?** Try a smaller dataset size

## 📞 Need Help?

- Run any script with `help` command: `./script-name.sh help`
- Check system requirements: `./choose-dataset.sh`
- View port conflicts: `./stop-conflicting-services.sh`
- Check service logs: `./script-name.sh logs`

---

**Ready to explore healthcare search?** Start with `./choose-dataset.sh` and dive into the world of intelligent search! 🚀