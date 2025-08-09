# Smart Search - Data Hydration & Cache-Database Synchronization Guide

A comprehensive guide to implementing efficient data synchronization strategies between in-memory caches (Redis, DragonflyDB, Memcached) and persistent databases (PostgreSQL, MySQL, MongoDB).

## Table of Contents

1. [Overview](#overview)
2. [Cache Patterns](#cache-patterns)
3. [Implementation Examples](#implementation-examples)
4. [Performance Analysis](#performance-analysis)
5. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
6. [Production Considerations](#production-considerations)

## Overview

### 🎯 What is Data Hydration?

Data hydration is the process of loading and synchronizing data between your persistent database and high-speed cache layers. In Smart Search, this ensures fast query responses while maintaining data consistency.

### 📊 Performance Impact

Proper data hydration can provide:
- **800x faster search queries** (1500ms → 2ms)
- **95%+ cache hit ratios** in production
- **Reduced database load** by 80-90%
- **Better user experience** with sub-100ms response times

### 🏗️ Supported Architectures

| Database | Cache | Sync Strategy | Use Case |
|----------|-------|---------------|----------|
| PostgreSQL | Redis | Cache-Aside | Healthcare, Finance |
| MySQL | DragonflyDB | Write-Through | E-commerce, Inventory |
| MongoDB | Memcached | Write-Behind | Content, Social Media |
| All | All | Hybrid | Multi-tenant, Enterprise |

## Cache Patterns

### 1. Cache-Aside Pattern (Lazy Loading)

**Best for**: Read-heavy workloads, healthcare data, financial records

```typescript
// Cache-Aside Implementation
class CacheAsideStrategy {
  async search(query: string): Promise<SearchResult> {
    // 1. Try cache first
    const cacheKey = `search:${hashQuery(query)}`;
    let results = await this.cache.get(cacheKey);
    
    if (results) {
      return { data: results, source: 'cache', latency: 2 };
    }
    
    // 2. Cache miss - query database
    results = await this.database.search(query);
    
    // 3. Store in cache for future requests
    await this.cache.set(cacheKey, results, { ttl: 3600 });
    
    return { data: results, source: 'database', latency: 45 };
  }
  
  // Handle updates
  async updateRecord(id: string, data: any): Promise<void> {
    await this.database.update(id, data);
    
    // Invalidate related cache entries
    await this.cache.del(`record:${id}`);
    await this.cache.delPattern('search:*'); // Clear search cache
  }
}
```

**Shell Script Example**:
```bash
# Test cache-aside pattern
./scripts/data-hydration/test-cache-aside.sh postgres redis

# Monitor cache performance
./scripts/data-hydration/monitor-cache-hits.sh redis
```

### 2. Write-Through Pattern

**Best for**: Consistent data requirements, inventory management, financial transactions

```typescript
// Write-Through Implementation  
class WriteThroughStrategy {
  async updateRecord(id: string, data: any): Promise<void> {
    // 1. Write to database first
    await this.database.update(id, data);
    
    // 2. Immediately update cache
    await this.cache.set(`record:${id}`, data);
    
    // 3. Update search index cache
    await this.updateSearchCache(data);
  }
  
  async search(query: string): Promise<SearchResult> {
    const cacheKey = `search:${hashQuery(query)}`;
    
    // Cache should always have latest data
    const results = await this.cache.get(cacheKey);
    if (results) {
      return { data: results, source: 'cache', latency: 1 };
    }
    
    // Fallback to database (should be rare)
    const dbResults = await this.database.search(query);
    await this.cache.set(cacheKey, dbResults, { ttl: 7200 });
    
    return { data: dbResults, source: 'database', latency: 50 };
  }
}
```

**Production Example**:
```bash
# Enable write-through for e-commerce
./scripts/data-hydration/enable-write-through.sh mysql dragonfly

# Load test write-through performance
./scripts/data-hydration/load-test-writes.sh 1000 concurrent
```

### 3. Write-Behind Pattern (Lazy Writing)

**Best for**: High-write workloads, analytics, logging systems

```typescript
// Write-Behind Implementation
class WriteBehindStrategy {
  private writeQueue: Map<string, any> = new Map();
  private batchTimer: NodeJS.Timeout;
  
  constructor() {
    // Flush to database every 5 seconds
    this.batchTimer = setInterval(() => this.flushToDatabase(), 5000);
  }
  
  async updateRecord(id: string, data: any): Promise<void> {
    // 1. Write to cache immediately
    await this.cache.set(`record:${id}`, data);
    
    // 2. Queue for database write
    this.writeQueue.set(id, data);
    
    // 3. Update search cache immediately
    await this.updateSearchCache(data);
  }
  
  private async flushToDatabase(): Promise<void> {
    if (this.writeQueue.size === 0) return;
    
    const batch = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();
    
    // Batch write to database
    await this.database.batchUpdate(batch);
    
    console.log(`Flushed ${batch.length} records to database`);
  }
  
  async search(query: string): Promise<SearchResult> {
    // Always serve from cache (fastest)
    const cacheKey = `search:${hashQuery(query)}`;
    const results = await this.cache.get(cacheKey);
    
    if (results) {
      return { data: results, source: 'cache', latency: 1 };
    }
    
    // Build cache from database
    const dbResults = await this.database.search(query);
    await this.cache.set(cacheKey, dbResults, { ttl: 1800 });
    
    return { data: dbResults, source: 'database', latency: 40 };
  }
}
```

**Monitoring Script**:
```bash
# Monitor write-behind queue health
./scripts/data-hydration/monitor-write-queue.sh mongodb memcached

# Check database sync status
./scripts/data-hydration/verify-sync-status.sh
```

## Implementation Examples

### Healthcare Data Synchronization

```typescript
// Healthcare-specific cache hydration
class HealthcareDataHydration {
  async hydratePatientData(patientId: string): Promise<void> {
    // Load patient record
    const patient = await this.database.getPatient(patientId);
    
    // Cache patient data with field masking
    const maskedPatient = this.applyFieldMasking(patient);
    await this.cache.set(`patient:${patientId}`, maskedPatient, { ttl: 1800 });
    
    // Pre-populate common searches
    await this.preloadCommonSearches(patient);
  }
  
  private async preloadCommonSearches(patient: any): Promise<void> {
    const commonQueries = [
      `patient ${patient.name}`,
      `condition ${patient.primaryCondition}`,
      `doctor ${patient.attendingPhysician}`
    ];
    
    for (const query of commonQueries) {
      const results = await this.database.search(query);
      const cacheKey = `search:${hashQuery(query)}`;
      await this.cache.set(cacheKey, results, { ttl: 3600 });
    }
  }
  
  private applyFieldMasking(patient: any): any {
    return {
      ...patient,
      ssn: this.maskSSN(patient.ssn),
      phone: this.maskPhone(patient.phone),
      email: this.maskEmail(patient.email)
    };
  }
}
```

### Redis-PostgreSQL Sync Script

```bash
#!/bin/bash
# ./scripts/data-hydration/sync-redis-postgres.sh

echo "🔄 Starting Redis-PostgreSQL Synchronization"

# Configuration
PG_HOST=${1:-localhost}
REDIS_HOST=${2:-localhost}
BATCH_SIZE=${3:-1000}

# Warm cache with recent records
echo "📥 Loading recent records into Redis cache..."
psql -h $PG_HOST -d smartsearch -c "
  SELECT json_build_object(
    'id', id,
    'title', title,
    'content', content,
    'updated_at', updated_at
  ) as record
  FROM healthcare 
  WHERE updated_at > NOW() - INTERVAL '24 hours'
  ORDER BY updated_at DESC
  LIMIT $BATCH_SIZE;
" -t -A | while IFS= read -r record; do
  if [ "$record" != "" ]; then
    RECORD_ID=$(echo $record | jq -r '.id')
    redis-cli -h $REDIS_HOST SET "record:$RECORD_ID" "$record" EX 3600
  fi
done

# Pre-populate common search queries
echo "🔍 Pre-populating common search queries..."
COMMON_QUERIES=(
  "heart disease treatment"
  "diabetes management" 
  "cancer patient care"
  "emergency surgery"
  "patient discharge"
)

for query in "${COMMON_QUERIES[@]}"; do
  echo "  Pre-loading: $query"
  QUERY_HASH=$(echo -n "$query" | sha256sum | cut -d' ' -f1)
  
  # Execute search and cache result
  SEARCH_RESULTS=$(psql -h $PG_HOST -d smartsearch -t -A -c "
    SELECT json_agg(
      json_build_object('id', id, 'title', title, 'relevance', 
        ts_rank(to_tsvector('english', title || ' ' || content), 
                plainto_tsquery('english', '$query'))
      )
    )
    FROM healthcare 
    WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', '$query')
    ORDER BY ts_rank(to_tsvector('english', title || ' ' || content), 
                     plainto_tsquery('english', '$query')) DESC
    LIMIT 20;
  ")
  
  redis-cli -h $REDIS_HOST SET "search:$QUERY_HASH" "$SEARCH_RESULTS" EX 1800
done

echo "✅ Synchronization complete!"

# Display cache statistics
echo "📊 Cache Statistics:"
redis-cli -h $REDIS_HOST INFO keyspace
redis-cli -h $REDIS_HOST INFO stats | grep cache_hits
```

## Performance Analysis

### Cache Performance Benchmarking

```typescript
// Performance monitoring class
class CachePerformanceMonitor {
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    avgLatency: 0,
    maxLatency: 0,
    totalRequests: 0
  };
  
  async recordSearchMetrics(query: string, result: SearchResult): Promise<void> {
    this.metrics.totalRequests++;
    
    if (result.source === 'cache') {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    // Update latency metrics
    this.updateLatencyMetrics(result.latency);
    
    // Log to monitoring system
    await this.sendToMonitoring({
      query,
      source: result.source,
      latency: result.latency,
      timestamp: Date.now()
    });
  }
  
  getCacheHitRatio(): number {
    return this.metrics.cacheHits / this.metrics.totalRequests;
  }
  
  getPerformanceReport(): PerformanceReport {
    const hitRatio = this.getCacheHitRatio();
    
    return {
      cacheHitRatio: hitRatio,
      avgLatency: this.metrics.avgLatency,
      maxLatency: this.metrics.maxLatency,
      totalRequests: this.metrics.totalRequests,
      grade: this.calculatePerformanceGrade(hitRatio),
      recommendations: this.getOptimizationRecommendations(hitRatio)
    };
  }
  
  private calculatePerformanceGrade(hitRatio: number): string {
    if (hitRatio >= 0.95) return 'A+';
    if (hitRatio >= 0.90) return 'A';
    if (hitRatio >= 0.85) return 'B+';
    if (hitRatio >= 0.80) return 'B';
    return 'C';
  }
}
```

### Performance Comparison Script

```bash
#!/bin/bash
# ./scripts/data-hydration/performance-comparison.sh

echo "🏃 Smart Search Performance Comparison"
echo "======================================"

# Test configurations
CONFIGS=(
  "postgres-redis:cache-aside"
  "mysql-dragonfly:write-through" 
  "mongodb-memcached:write-behind"
)

for config in "${CONFIGS[@]}"; do
  IFS=':' read -r stack pattern <<< "$config"
  
  echo ""
  echo "Testing $stack with $pattern pattern..."
  
  # Start the stack
  docker-compose -f docker/${stack}.docker-compose.yml up -d
  sleep 30
  
  # Run performance test
  ./scripts/data-hydration/cache-patterns.sh $pattern
  
  # Run load test
  echo "Running 1000 concurrent searches..."
  hey -n 1000 -c 50 -m POST \
    -H "Content-Type: application/json" \
    -d '{"query": "heart disease treatment", "options": {"limit": 20}}' \
    http://localhost:3000/api/search > results-${stack}-${pattern}.txt
  
  # Extract metrics
  AVG_LATENCY=$(grep "Average:" results-${stack}-${pattern}.txt | awk '{print $2}')
  REQUESTS_PER_SEC=$(grep "Requests/sec:" results-${stack}-${pattern}.txt | awk '{print $2}')
  
  echo "  Average Latency: $AVG_LATENCY"
  echo "  Requests/sec: $REQUESTS_PER_SEC"
  
  # Clean up
  docker-compose -f docker/${stack}.docker-compose.yml down
done

echo ""
echo "🎯 Performance Summary:"
echo "Best Latency: $(ls results-*.txt | xargs grep "Average:" | sort -k2 -n | head -1)"
echo "Best Throughput: $(ls results-*.txt | xargs grep "Requests/sec:" | sort -k2 -nr | head -1)"
```

## Monitoring & Troubleshooting

### Cache Health Monitoring

```typescript
// Automated cache health monitoring
class CacheHealthMonitor {
  async runHealthChecks(): Promise<HealthReport> {
    const report: HealthReport = {
      timestamp: new Date(),
      checks: [],
      overallStatus: 'HEALTHY'
    };
    
    // Check 1: Cache connectivity
    try {
      await this.cache.ping();
      report.checks.push({ name: 'Cache Connectivity', status: 'PASS' });
    } catch (error) {
      report.checks.push({ name: 'Cache Connectivity', status: 'FAIL', error: error.message });
      report.overallStatus = 'CRITICAL';
    }
    
    // Check 2: Cache hit ratio
    const hitRatio = await this.getCacheHitRatio();
    if (hitRatio >= 0.8) {
      report.checks.push({ name: 'Cache Hit Ratio', status: 'PASS', value: hitRatio });
    } else if (hitRatio >= 0.6) {
      report.checks.push({ name: 'Cache Hit Ratio', status: 'WARN', value: hitRatio });
      report.overallStatus = 'WARNING';
    } else {
      report.checks.push({ name: 'Cache Hit Ratio', status: 'FAIL', value: hitRatio });
      report.overallStatus = 'CRITICAL';
    }
    
    // Check 3: Memory usage
    const memUsage = await this.cache.getMemoryUsage();
    if (memUsage < 0.8) {
      report.checks.push({ name: 'Memory Usage', status: 'PASS', value: memUsage });
    } else if (memUsage < 0.9) {
      report.checks.push({ name: 'Memory Usage', status: 'WARN', value: memUsage });
    } else {
      report.checks.push({ name: 'Memory Usage', status: 'FAIL', value: memUsage });
      report.overallStatus = 'CRITICAL';
    }
    
    // Check 4: Database sync lag
    const syncLag = await this.measureSyncLag();
    if (syncLag < 1000) { // Less than 1 second
      report.checks.push({ name: 'Sync Lag', status: 'PASS', value: `${syncLag}ms` });
    } else if (syncLag < 5000) {
      report.checks.push({ name: 'Sync Lag', status: 'WARN', value: `${syncLag}ms` });
    } else {
      report.checks.push({ name: 'Sync Lag', status: 'FAIL', value: `${syncLag}ms` });
      report.overallStatus = 'CRITICAL';
    }
    
    return report;
  }
}
```

### Troubleshooting Common Issues

#### Issue 1: Low Cache Hit Ratio

**Symptoms**: High database load, slow responses, < 80% cache hit ratio

**Diagnosis**:
```bash
# Check cache statistics
./scripts/data-hydration/diagnose-cache-performance.sh redis

# Monitor query patterns
./scripts/data-hydration/analyze-query-patterns.sh

# Check TTL settings
redis-cli --scan --pattern "search:*" | head -10 | xargs -I {} redis-cli TTL {}
```

**Solutions**:
1. Increase TTL for stable data
2. Pre-warm cache with common queries
3. Implement query optimization
4. Add more cache memory

#### Issue 2: Cache-Database Inconsistency

**Symptoms**: Stale data in search results, user complaints about outdated information

**Diagnosis**:
```bash
# Compare cache vs database
./scripts/data-hydration/verify-data-consistency.sh postgres redis

# Check write patterns
./scripts/data-hydration/audit-write-operations.sh
```

**Solutions**:
1. Implement proper cache invalidation
2. Use write-through pattern for critical updates
3. Add cache versioning
4. Set up data validation checks

#### Issue 3: Memory Pressure

**Symptoms**: Cache evictions, increasing latency, OOM errors

**Diagnosis**:
```bash
# Check memory usage patterns
redis-cli INFO memory

# Analyze key distribution
redis-cli --bigkeys

# Monitor eviction patterns
redis-cli INFO stats | grep evicted
```

**Solutions**:
1. Implement LRU eviction policy
2. Reduce TTL for less important data
3. Increase cache memory
4. Implement data compression

## Production Considerations

### High Availability Setup

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    ports:
      - "6379:6379"
    volumes:
      - redis-master-data:/data
    
  redis-replica:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379 --save 60 1
    ports:
      - "6380:6379"
    depends_on:
      - redis-master
    volumes:
      - redis-replica-data:/data
      
  redis-sentinel:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    ports:
      - "26379:26379"
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
      - redis-replica

volumes:
  redis-master-data:
  redis-replica-data:
```

### Production Monitoring Stack

```typescript
// Production monitoring configuration
const monitoringConfig = {
  prometheus: {
    enabled: true,
    port: 9090,
    metrics: [
      'cache_hit_ratio',
      'search_latency_histogram',
      'database_connection_pool',
      'memory_usage_percentage',
      'query_rate_per_second'
    ]
  },
  
  grafana: {
    dashboards: [
      'smart-search-overview',
      'cache-performance',
      'database-health',
      'user-experience'
    ]
  },
  
  alerting: {
    rules: [
      { metric: 'cache_hit_ratio', threshold: 0.8, severity: 'warning' },
      { metric: 'search_latency_p95', threshold: 100, severity: 'warning' },
      { metric: 'memory_usage', threshold: 0.9, severity: 'critical' },
      { metric: 'error_rate', threshold: 0.01, severity: 'critical' }
    ]
  }
};
```

### Production Deployment Script

```bash
#!/bin/bash
# ./scripts/data-hydration/deploy-production.sh

echo "🚀 Deploying Smart Search with Data Hydration"

# Validate configuration
./scripts/validate-config.js --config production.json

# Pre-deployment health checks
./scripts/data-hydration/pre-deployment-checks.sh

# Deploy with zero downtime
kubectl set image deployment/smart-search-service \
  smart-search=smart-search:latest \
  -n smart-search-production

# Wait for rollout
kubectl rollout status deployment/smart-search-service \
  -n smart-search-production --timeout=300s

# Warm cache with production data
echo "🔥 Warming production cache..."
./scripts/data-hydration/warm-production-cache.sh

# Verify deployment
echo "🔍 Running post-deployment verification..."
./scripts/data-hydration/verify-production-health.sh

# Monitor for 10 minutes
echo "📊 Monitoring deployment for 10 minutes..."
timeout 600 ./scripts/data-hydration/monitor-deployment.sh

echo "✅ Production deployment complete!"
```

## Quick Start Commands

```bash
# Setup data hydration for your stack
./scripts/data-hydration/setup.sh postgres redis

# Test different cache patterns
./scripts/data-hydration/test-patterns.sh

# Monitor cache performance
./scripts/data-hydration/monitor.sh

# Benchmark your configuration
./scripts/data-hydration/benchmark.sh

# Deploy to production
./scripts/data-hydration/deploy-production.sh
```

---

## Summary

Data hydration is critical for Smart Search performance. Choose the right pattern for your use case:

- **Cache-Aside**: Healthcare, financial data (read-heavy)
- **Write-Through**: E-commerce, inventory (consistency critical)
- **Write-Behind**: Analytics, logging (write-heavy)

Monitor cache hit ratios, implement proper invalidation, and use the provided scripts for production deployment.

For more specific guidance, see the individual blog posts for [Junior Developers](smart-search-junior-developers.md), [Senior Developers](smart-search-senior-developers.md), and [Testers](smart-search-testers.md).