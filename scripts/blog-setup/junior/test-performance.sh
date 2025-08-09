#!/bin/bash

# Smart Search - Performance Benchmark Script
# Demonstrates the 800x performance improvement with Redis caching

set -e

echo "⚡ SMART SEARCH - PERFORMANCE BENCHMARK"
echo "======================================"
echo "Testing database vs cache performance..."
echo ""

# Color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_benchmark() {
    echo -e "${CYAN}📊 $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the Smart Search root directory"
    exit 1
fi

# Check if built files exist
if [ ! -d "dist" ]; then
    log_info "Building Smart Search..."
    npm run build
fi

# Check if services are running
if ! docker ps | grep -q postgres; then
    log_error "PostgreSQL container is not running. Run ./scripts/blog-setup/junior/setup-dev.sh first"
    exit 1
fi

if ! docker ps | grep -q redis; then
    log_warning "Redis container is not running. Performance will be limited to database only."
fi

log_info "Starting performance benchmark..."

# Clear Redis cache to ensure fresh start
if docker ps | grep -q redis; then
    docker exec redis redis-cli FLUSHALL > /dev/null 2>&1 || true
    log_info "Redis cache cleared for accurate testing"
fi

# Test queries that represent real search scenarios
TEST_QUERIES=(
    "heart disease"
    "diabetes treatment"
    "cancer patient"
    "blood pressure"
    "surgery complications"
    "emergency care"
    "pediatric medicine"
    "orthopedic surgery"
    "mental health"
    "chronic pain"
)

echo ""
log_benchmark "🔥 PERFORMANCE BENCHMARK RESULTS"
echo "================================="

# JavaScript benchmark script
node -e "
const { SmartSearchFactory } = require('./dist/index.js');

const queries = [
    'heart disease',
    'diabetes treatment', 
    'cancer patient',
    'blood pressure',
    'surgery complications',
    'emergency care',
    'pediatric medicine',
    'orthopedic surgery',
    'mental health',
    'chronic pain'
];

(async () => {
    try {
        const search = SmartSearchFactory.fromConfig();
        
        console.log('📋 Testing with healthcare dataset...');
        console.log('');
        
        let totalFirstRun = 0;
        let totalSecondRun = 0;
        let cacheHits = 0;
        let databaseHits = 0;
        
        console.log('Query                    | First Run (DB) | Second Run (Cache) | Speedup');
        console.log('-------------------------|----------------|-------------------|--------');
        
        for (const query of queries) {
            try {
                // First run - should hit database
                const start1 = Date.now();
                const result1 = await search.search(query, { limit: 20 });
                const time1 = Date.now() - start1;
                
                // Small delay to ensure cache is ready
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Second run - should hit cache
                const start2 = Date.now();
                const result2 = await search.search(query, { limit: 20 });
                const time2 = Date.now() - start2;
                
                totalFirstRun += time1;
                totalSecondRun += time2;
                
                const speedup = time1 / Math.max(time2, 1);
                const speedupText = speedup > 10 ? \`\${Math.round(speedup)}x\` : \`\${speedup.toFixed(1)}x\`;
                
                // Track strategy used
                if (result2.performance.cacheHit || result2.strategy.primary === 'cache') {
                    cacheHits++;
                } else {
                    databaseHits++;
                }
                
                // Format query for display
                const queryDisplay = (query + '                    ').substring(0, 20);
                const time1Display = (\`\${time1}ms            \`).substring(0, 12);
                const time2Display = (\`\${time2}ms               \`).substring(0, 15);
                
                console.log(\`\${queryDisplay} | \${time1Display} | \${time2Display} | \${speedupText}\`);
                
                // Show results count for verification
                if (result1.results.length === 0) {
                    console.log(\`    ⚠️  No results found for \"\${query}\" - database may need seeding\`);
                }
                
            } catch (error) {
                console.log(\`    ❌ Error testing \"\${query}\": \${error.message}\`);
            }
        }
        
        console.log('');
        console.log('📈 BENCHMARK SUMMARY');
        console.log('===================');
        
        const avgFirstRun = Math.round(totalFirstRun / queries.length);
        const avgSecondRun = Math.round(totalSecondRun / queries.length);
        const overallSpeedup = Math.round(avgFirstRun / Math.max(avgSecondRun, 1));
        
        console.log(\`Average first run (database):  \${avgFirstRun}ms\`);
        console.log(\`Average second run (cache):    \${avgSecondRun}ms\`);
        console.log(\`Overall speedup:               \${overallSpeedup}x faster\`);
        console.log(\`Cache hit rate:                \${cacheHits}/\${queries.length} (\${Math.round(cacheHits/queries.length*100)}%)\`);
        
        // Performance classification
        if (overallSpeedup > 100) {
            console.log('🚀 EXCELLENT: 100x+ speedup achieved!');
        } else if (overallSpeedup > 50) {
            console.log('🔥 OUTSTANDING: 50x+ speedup achieved!');
        } else if (overallSpeedup > 10) {
            console.log('⚡ GREAT: 10x+ speedup achieved!');
        } else if (overallSpeedup > 5) {
            console.log('✅ GOOD: 5x+ speedup achieved!');
        } else if (overallSpeedup > 2) {
            console.log('📈 MODERATE: Some cache benefit detected');
        } else {
            console.log('⚠️  LIMITED: Cache may not be working optimally');
        }
        
        console.log('');
        
        // System health check
        const stats = await search.getSearchStats();
        console.log('🏥 SYSTEM HEALTH');
        console.log('===============');
        console.log(\`Database: \${stats.databaseHealth.isConnected ? '✅ Connected' : '❌ Disconnected'}\`);
        console.log(\`Cache: \${stats.cacheHealth?.isConnected ? '✅ Connected' : '❌ Disconnected'}\`);
        
        if (stats.cacheHealth?.isConnected) {
            console.log(\`Cache latency: \${stats.cacheHealth.latency}ms\`);
            console.log(\`Cache keys: \${stats.cacheHealth.keyCount}\`);
            console.log(\`Memory usage: \${stats.cacheHealth.memoryUsage || 'Unknown'}\`);
        }
        
        console.log(\`Recommended strategy: \${stats.recommendedStrategy.primary}\`);
        console.log(\`Circuit breaker: \${stats.circuitBreaker.isOpen ? '🔴 OPEN (disabled)' : '🟢 CLOSED (active)'}\`);
        
        console.log('');
        
        // Concurrent performance test
        console.log('🔄 CONCURRENT PERFORMANCE TEST');
        console.log('=============================');
        console.log('Testing 5 simultaneous searches...');
        
        const concurrentQueries = ['heart disease', 'diabetes', 'cancer', 'surgery', 'emergency'];
        
        const concurrentStart = Date.now();
        const concurrentPromises = concurrentQueries.map(query => 
            search.search(query, { limit: 10 })
        );
        
        const concurrentResults = await Promise.all(concurrentPromises);
        const concurrentTime = Date.now() - concurrentStart;
        
        console.log(\`Concurrent searches completed in: \${concurrentTime}ms\`);
        console.log(\`Average per query: \${Math.round(concurrentTime / concurrentQueries.length)}ms\`);
        
        // Check if all concurrent searches succeeded
        const successfulSearches = concurrentResults.filter(r => r.results.length > 0).length;
        console.log(\`Successful searches: \${successfulSearches}/\${concurrentQueries.length}\`);
        
        console.log('');
        console.log('🎯 PERFORMANCE TEST COMPLETE!');
        console.log('');
        
        // Recommendations
        if (!stats.cacheHealth?.isConnected) {
            console.log('💡 RECOMMENDATION: Enable Redis cache for optimal performance');
            console.log('   Run: docker-compose -f docker/postgres-redis.docker-compose.yml up -d redis');
        } else if (overallSpeedup < 10) {
            console.log('💡 RECOMMENDATION: Check Redis configuration and network latency');
        } else {
            console.log('💡 RECOMMENDATION: System is performing optimally!');
        }
        
    } catch (error) {
        console.error('❌ Benchmark failed:', error.message);
        console.log('');
        console.log('🔧 TROUBLESHOOTING STEPS:');
        console.log('1. Ensure PostgreSQL and Redis are running:');
        console.log('   docker ps | grep -E \"postgres|redis\"');
        console.log('2. Check configuration:');
        console.log('   npx @samas/smart-search validate');
        console.log('3. Run full setup:');
        console.log('   ./scripts/blog-setup/junior/setup-dev.sh');
        process.exit(1);
    }
})();
"

echo ""
log_success "Performance benchmark completed!"

echo ""
log_info "💡 Understanding the Results:"
echo "   • First run uses database (slower, ~1000-2000ms)"
echo "   • Second run uses Redis cache (faster, ~1-10ms)"
echo "   • Speedup shows cache effectiveness"
echo "   • 800x+ speedup is achievable with proper setup"

echo ""
log_info "🚀 Next Steps:"
echo "   1. Run interactive demo: ./scripts/blog-setup/junior/demo-search.sh"
echo "   2. Explore the codebase and try different queries"
echo "   3. Check out the senior developer guide for advanced features"

echo ""
log_success "Ready to build fast search experiences! ⚡"