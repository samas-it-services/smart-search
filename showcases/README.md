# @samas/smart-search - Showcases

This directory contains interactive showcases demonstrating the capabilities of Smart Search with different database and cache combinations.

## Available Showcases

### PostgreSQL + Redis
- **Location**: `postgres-redis/`
- **Description**: Full-text search with PostgreSQL tsvector and Redis caching
- **Features**: Advanced text search, weighted ranking, intelligent caching
- **URL**: http://localhost:3001

### MySQL + DragonflyDB (Coming Soon)
- **Location**: `mysql-dragonfly/`
- **Description**: MySQL FULLTEXT search with high-performance DragonflyDB caching
- **Features**: Boolean search modes, JSON column support, ultra-fast cache

### MongoDB + Memcached (Coming Soon)
- **Location**: `mongodb-memcached/`
- **Description**: MongoDB Atlas Search with distributed Memcached caching
- **Features**: Aggregation pipelines, geospatial search, scalable cache

### SQLite + InMemory (Coming Soon)
- **Location**: `sqlite-inmemory/`
- **Description**: Lightweight SQLite FTS5 with in-memory caching
- **Features**: Embedded search, BM25 ranking, zero-dependency cache

## Quick Start

### Prerequisites

1. **Start Development Environment**:
   ```bash
   # Start all databases and caches
   ./scripts/docker-dev.sh start
   
   # Wait for services to be ready (30-60 seconds)
   ./scripts/docker-dev.sh test
   ```

2. **Build Smart Search Library**:
   ```bash
   # From project root
   npm run build
   ```

### Running Showcases

#### PostgreSQL + Redis Showcase

1. **Navigate to showcase**:
   ```bash
   cd showcases/postgres-redis
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the showcase**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   - Web Interface: http://localhost:3001
   - API: http://localhost:3001/api/search?q=postgresql
   - Stats: http://localhost:3001/api/stats

### API Endpoints

All showcases provide consistent API endpoints:

#### Search Endpoint
```bash
GET /api/search?q=<query>&limit=<number>&category=<filter>
```

**Example**:
```bash
curl "http://localhost:3001/api/search?q=postgresql&limit=10&category=Database"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "1",
        "type": "article",
        "title": "Getting Started with PostgreSQL Full-Text Search",
        "author": "John Database",
        "description": "Learn how to implement powerful full-text search...",
        "category": "Database",
        "relevanceScore": 95,
        "matchType": "title"
      }
    ],
    "performance": {
      "searchTime": 25.3,
      "resultCount": 1,
      "strategy": "cache",
      "cacheHit": true
    },
    "strategy": {
      "primary": "cache",
      "fallback": "database",
      "reason": "Cache is healthy and available"
    }
  }
}
```

#### System Stats Endpoint
```bash
GET /api/stats
```

**Response**:
```json
{
  "success": true,
  "data": {
    "cacheHealth": {
      "isConnected": true,
      "latency": 2.1,
      "memoryUsage": "128MB",
      "keyCount": 847
    },
    "databaseHealth": {
      "isConnected": true,
      "latency": 15.7,
      "memoryUsage": "256MB"
    },
    "circuitBreaker": {
      "isOpen": false,
      "failureCount": 0
    },
    "recommendedStrategy": "cache"
  }
}
```

#### Health Check Endpoint
```bash
GET /api/health
```

## Web Interface Features

Each showcase includes a rich web interface with:

### 🔍 Advanced Search
- Real-time search with instant results
- Query highlighting in results
- Advanced filtering options
- Pagination support

### 📊 Performance Metrics
- Live performance statistics
- Cache hit/miss ratios
- Response time monitoring
- System health indicators

### 🎛️ Interactive Controls
- Category filters
- Result limit controls
- Real-time query suggestions
- Mobile-responsive design

### 📈 Visual Feedback
- Loading states
- Error handling
- Performance indicators
- Strategy visualization

## Architecture

Each showcase demonstrates:

1. **Provider Architecture**: How different database and cache providers work together
2. **Intelligent Fallback**: Automatic switching between cache and database
3. **Circuit Breaker**: Failure detection and recovery
4. **Performance Monitoring**: Real-time metrics and health checks

## Development

### Creating New Showcases

1. **Create showcase directory**:
   ```bash
   ./scripts/docker-dev.sh showcase <database> <cache>
   ```

2. **Copy template**:
   ```bash
   cp -r showcases/postgres-redis showcases/<database>-<cache>
   ```

3. **Update configuration**:
   - Modify `package.json` with new name and port
   - Update `app.js` with specific database/cache settings
   - Customize sample data and UI

### Testing Showcases

1. **Unit tests**:
   ```bash
   npm test
   ```

2. **Performance benchmarks**:
   ```bash
   ./scripts/benchmark.sh single <database> <cache>
   ```

3. **Load testing**:
   ```bash
   # Set environment variables
   export BENCHMARK_DURATION=120
   export CONCURRENT_USERS=50
   
   # Run comprehensive benchmark
   ./scripts/benchmark.sh all
   ```

## Deployment

### Local Development
```bash
# Start all services
./scripts/docker-dev.sh start

# Run showcase
cd showcases/postgres-redis && npm start
```

### Production Deployment
```bash
# Build for production
npm run build

# Set production environment
export NODE_ENV=production
export PORT=3000

# Start with PM2 or similar process manager
pm2 start showcases/postgres-redis/app.js --name "smart-search-showcase"
```

### Docker Deployment
```bash
# Build showcase image
docker build -t smart-search-showcase:latest showcases/postgres-redis/

# Run with docker-compose
docker-compose -f docker/docker-compose.yml up -d
```

## Performance Tuning

### Database Optimization
- **PostgreSQL**: Tune `work_mem`, `shared_buffers`, and text search configuration
- **MySQL**: Optimize `innodb_buffer_pool_size` and FULLTEXT index settings
- **MongoDB**: Configure proper indexes and aggregation pipeline optimization

### Cache Optimization
- **Redis**: Tune `maxmemory-policy`, `tcp-keepalive`, and persistence settings
- **DragonflyDB**: Configure memory limits and snapshot settings
- **Memcached**: Optimize connection pools and memory allocation

### Application Optimization
- **Connection Pooling**: Configure appropriate pool sizes
- **Query Optimization**: Use prepared statements and query caching
- **Circuit Breaker**: Fine-tune failure thresholds and recovery timeouts

## Monitoring

### Metrics Collection
- Response times and throughput
- Cache hit ratios and memory usage
- Database connection health
- Circuit breaker states

### Alerting
- High error rates or slow responses
- Cache or database connectivity issues
- Memory usage thresholds
- Circuit breaker activations

## Support

For questions or issues with the showcases:

1. Check the [main documentation](../README.md)
2. Review the [CLAUDE.md](../CLAUDE.md) development guide
3. Open an issue on [GitHub](https://github.com/samas-org/smart-search)
4. Join our [Discord community](https://discord.gg/smart-search)

## License

Apache License 2.0 - see [LICENSE](../LICENSE) for details.