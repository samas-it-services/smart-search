#!/bin/bash

# Smart Search - Interactive Demo Script
# Provides hands-on search experience for junior developers

set -e

echo "🔍 SMART SEARCH - INTERACTIVE DEMO"
echo "=================================="
echo "Experience Smart Search in action!"
echo ""

# Color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
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

log_demo() {
    echo -e "${PURPLE}🎬 $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the Smart Search root directory${NC}"
    exit 1
fi

# Check if built files exist
if [ ! -d "dist" ]; then
    log_info "Building Smart Search..."
    npm run build
fi

# Check if services are running
if ! docker ps | grep -q postgres; then
    echo -e "${RED}❌ PostgreSQL container is not running.${NC}"
    echo "Run this first: ./scripts/blog-setup/junior/setup-dev.sh"
    exit 1
fi

log_success "Services are running, starting interactive demo!"

echo ""
log_demo "🎯 DEMO SCENARIOS"
echo ""
echo "Choose a demo scenario:"
echo ""
echo "1. 🏥 Healthcare Search (Real patient data)"
echo "2. ⚡ Performance Comparison (Database vs Cache)" 
echo "3. 🔧 System Health Dashboard"
echo "4. 🎮 Interactive Search Playground"
echo "5. 📊 Advanced Features Showcase"
echo "6. 🚀 All Demos (Full Experience)"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        log_demo "🏥 HEALTHCARE SEARCH DEMO"
        echo "========================="
        ;;
    2)
        echo ""
        log_demo "⚡ PERFORMANCE COMPARISON"
        echo "========================"
        ;;
    3)
        echo ""
        log_demo "🔧 SYSTEM HEALTH DASHBOARD"
        echo "=========================="
        ;;
    4)
        echo ""
        log_demo "🎮 INTERACTIVE SEARCH PLAYGROUND"
        echo "==============================="
        ;;
    5)
        echo ""
        log_demo "📊 ADVANCED FEATURES SHOWCASE"
        echo "============================="
        ;;
    6)
        echo ""
        log_demo "🚀 FULL DEMO EXPERIENCE"
        echo "======================="
        ;;
    *)
        echo "Invalid choice. Running full demo..."
        choice=6
        ;;
esac

# Main demo script
node -e "
const { SmartSearchFactory } = require('./dist/index.js');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const choice = '$choice';

const Colors = {
    RED: '\\033[0;31m',
    GREEN: '\\033[0;32m',
    YELLOW: '\\033[1;33m',
    BLUE: '\\033[0;34m',
    CYAN: '\\033[0;36m',
    PURPLE: '\\033[0;35m',
    NC: '\\033[0m'
};

function colorLog(color, message) {
    console.log(color + message + Colors.NC);
}

async function healthcareDemo(search) {
    colorLog(Colors.PURPLE, '\\n🏥 HEALTHCARE SEARCH DEMO');
    console.log('==========================');
    
    const sampleQueries = [
        'heart disease',
        'diabetes treatment',
        'emergency surgery',
        'cancer patient',
        'blood pressure medication'
    ];
    
    console.log('\\n📋 Sample healthcare searches:');
    
    for (const query of sampleQueries) {
        try {
            const start = Date.now();
            const results = await search.search(query, { limit: 3 });
            const time = Date.now() - start;
            
            colorLog(Colors.CYAN, \\`\\n🔍 Query: \"\${query}\"\\`);
            console.log(\\`   ⏱️  Search time: \${results.performance.searchTime}ms (Total: \${time}ms)\\`);
            console.log(\\`   🎯 Strategy: \${results.strategy.primary} (\${results.strategy.reason})\\`);
            console.log(\\`   📊 Results: \${results.results.length} found\\`);
            console.log(\\`   ⚡ Cache hit: \${results.performance.cacheHit ? '✅ Yes' : '❌ No'}\\`);
            
            if (results.results.length > 0) {
                console.log('   📄 Sample result:');
                const sample = results.results[0];
                console.log(\\`      • Patient: \${sample.patient_name || sample.title || 'N/A'}\\`);
                console.log(\\`      • Condition: \${sample.condition || sample.description || 'N/A'}\\`);
                console.log(\\`      • Doctor: \${sample.doctor || 'N/A'}\\`);
                console.log(\\`      • Score: \${sample.score?.toFixed(2) || 'N/A'}\\`);
            }
            
        } catch (error) {
            colorLog(Colors.RED, \\`   ❌ Error: \${error.message}\\`);
        }
    }
    
    console.log('\\n💡 Notice how subsequent searches are faster due to caching!');
}

async function performanceDemo(search) {
    colorLog(Colors.PURPLE, '\\n⚡ PERFORMANCE COMPARISON DEMO');
    console.log('===============================');
    
    const query = 'heart disease patients';
    
    // Clear cache first
    try {
        await search.clearCache();
        colorLog(Colors.YELLOW, '🧹 Cache cleared for accurate testing');
    } catch (error) {
        // Cache clearing might fail if Redis is not available
    }
    
    console.log(\\`\\n🧪 Testing query: \"\${query}\"\\`);
    
    // First search (cache miss)
    console.log('\\n📊 First search (Database):');
    const start1 = Date.now();
    const result1 = await search.search(query, { limit: 20 });
    const time1 = Date.now() - start1;
    
    console.log(\\`   ⏱️  Time: \${result1.performance.searchTime}ms\\`);
    console.log(\\`   🎯 Strategy: \${result1.strategy.primary}\\`);
    console.log(\\`   📊 Results: \${result1.results.length}\\`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Second search (cache hit)
    console.log('\\n📊 Second search (Cache):');
    const start2 = Date.now();
    const result2 = await search.search(query, { limit: 20 });
    const time2 = Date.now() - start2;
    
    console.log(\\`   ⏱️  Time: \${result2.performance.searchTime}ms\\`);
    console.log(\\`   🎯 Strategy: \${result2.strategy.primary}\\`);
    console.log(\\`   ⚡ Cache hit: \${result2.performance.cacheHit ? '✅ Yes' : '❌ No'}\\`);
    console.log(\\`   📊 Results: \${result2.results.length}\\`);
    
    // Calculate speedup
    const speedup = Math.round(result1.performance.searchTime / Math.max(result2.performance.searchTime, 1));
    
    console.log('\\n🚀 PERFORMANCE COMPARISON:');
    console.log(\\`   Database: \${result1.performance.searchTime}ms\\`);
    console.log(\\`   Cache:    \${result2.performance.searchTime}ms\\`);
    colorLog(Colors.GREEN, \\`   Speedup:  \${speedup}x faster! 🔥\\`);
    
    if (speedup > 100) {
        colorLog(Colors.GREEN, '   🏆 EXCELLENT: 100x+ speedup achieved!');
    } else if (speedup > 50) {
        colorLog(Colors.GREEN, '   🥇 OUTSTANDING: 50x+ speedup achieved!');
    } else if (speedup > 10) {
        colorLog(Colors.GREEN, '   🥈 GREAT: 10x+ speedup achieved!');
    }
}

async function healthDashboard(search) {
    colorLog(Colors.PURPLE, '\\n🔧 SYSTEM HEALTH DASHBOARD');
    console.log('============================');
    
    const stats = await search.getSearchStats();
    const cacheHealth = await search.getCacheHealth();
    
    console.log('\\n🏥 Service Status:');
    console.log(\\`   Database: \${stats.databaseHealth.isConnected ? '🟢 Connected' : '🔴 Disconnected'}\\`);
    console.log(\\`   Cache:    \${stats.cacheHealth?.isConnected ? '🟢 Connected' : '🔴 Disconnected'}\\`);
    
    if (stats.cacheHealth?.isConnected) {
        console.log('\\n📊 Cache Statistics:');
        console.log(\\`   Latency:      \${stats.cacheHealth.latency}ms\\`);
        console.log(\\`   Key count:    \${stats.cacheHealth.keyCount}\\`);
        console.log(\\`   Memory usage: \${stats.cacheHealth.memoryUsage || 'Unknown'}\\`);
    }
    
    console.log('\\n⚙️  System Configuration:');
    console.log(\\`   Recommended strategy: \${stats.recommendedStrategy.primary}\\`);
    console.log(\\`   Circuit breaker:      \${stats.circuitBreaker.isOpen ? '🔴 OPEN (protecting system)' : '🟢 CLOSED (normal operation)'}\\`);
    console.log(\\`   Failure count:        \${stats.circuitBreaker.failureCount}\\`);
    
    if (stats.circuitBreaker.isOpen) {
        console.log('\\n⚠️  Circuit breaker is OPEN - system is in protection mode');
        console.log('   This means cache has failed multiple times and is temporarily disabled');
        console.log('   Searches will use database fallback until recovery');
    }
}

async function interactivePlayground(search) {
    colorLog(Colors.PURPLE, '\\n🎮 INTERACTIVE SEARCH PLAYGROUND');
    console.log('=================================');
    
    console.log('\\n💡 Enter your own search queries! Type \"exit\" to quit.');
    console.log('\\n🔍 Try these examples:');
    console.log('   • heart disease');
    console.log('   • emergency surgery');
    console.log('   • diabetes treatment');
    console.log('   • cancer patient care');
    console.log('   • blood pressure medication');
    console.log('');
    
    async function askForQuery() {
        return new Promise((resolve) => {
            rl.question('Enter search query: ', (answer) => {
                resolve(answer.trim());
            });
        });
    }
    
    while (true) {
        const query = await askForQuery();
        
        if (query.toLowerCase() === 'exit' || query === '') {
            break;
        }
        
        try {
            const start = Date.now();
            const results = await search.search(query, { 
                limit: 5,
                sortBy: 'relevance'
            });
            const totalTime = Date.now() - start;
            
            colorLog(Colors.CYAN, \\`\\n🔍 Results for: \"\${query}\"\\`);
            console.log('─'.repeat(50));
            console.log(\\`⏱️  Search time: \${results.performance.searchTime}ms (Total: \${totalTime}ms)\\`);
            console.log(\\`🎯 Strategy: \${results.strategy.primary} (\${results.strategy.reason})\\`);
            console.log(\\`⚡ Cache hit: \${results.performance.cacheHit ? '✅ Yes' : '❌ No'}\\`);
            console.log(\\`📊 Found: \${results.results.length} results\\`);
            
            if (results.results.length > 0) {
                console.log('\\n📄 Top Results:');
                results.results.forEach((result, index) => {
                    console.log(\\`\\n\${index + 1}. \${result.patient_name || result.title || 'Unknown'}\\`);
                    console.log(\\`   Condition: \${result.condition || result.description || 'N/A'}\\`);
                    console.log(\\`   Doctor: \${result.doctor || 'N/A'}\\`);
                    console.log(\\`   Score: \${result.score?.toFixed(2) || 'N/A'}\\`);
                });
            } else {
                console.log('\\n📭 No results found. Try a different query or check if data is seeded.');
            }
            
        } catch (error) {
            colorLog(Colors.RED, \\`\\n❌ Search failed: \${error.message}\\`);
        }
        
        console.log('');
    }
}

async function advancedFeaturesDemo(search) {
    colorLog(Colors.PURPLE, '\\n📊 ADVANCED FEATURES SHOWCASE');
    console.log('==============================');
    
    const query = 'heart disease';
    
    console.log('\\n🎯 1. Search with Filters:');
    const filteredResults = await search.search(query, {
        limit: 3,
        filters: {
            condition: ['Heart Disease', 'Cardiovascular']
        },
        sortBy: 'relevance'
    });
    
    console.log(\\`   Results: \${filteredResults.results.length} (filtered)\\`);
    console.log(\\`   Time: \${filteredResults.performance.searchTime}ms\\`);
    
    console.log('\\n🔄 2. Search with Pagination:');
    const page1 = await search.search(query, { limit: 2, offset: 0 });
    const page2 = await search.search(query, { limit: 2, offset: 2 });
    
    console.log(\\`   Page 1: \${page1.results.length} results\\`);
    console.log(\\`   Page 2: \${page2.results.length} results\\`);
    
    console.log('\\n⚡ 3. Cache Management:');
    try {
        // Force cache a specific query
        const cacheResult = await search.search(query, { 
            cacheEnabled: true,
            cacheTTL: 60000 // 1 minute
        });
        console.log(\\`   Cached result: \${cacheResult.results.length} results\\`);
        console.log(\\`   Cache strategy: \${cacheResult.strategy.primary}\\`);
        
        // Test cache hit
        const cachedResult = await search.search(query);
        console.log(\\`   Cache hit test: \${cachedResult.performance.cacheHit ? '✅ Hit' : '❌ Miss'}\\`);
        
    } catch (error) {
        console.log('   Cache not available - using database fallback');
    }
    
    console.log('\\n📊 4. Performance Metrics:');
    const statsAfter = await search.getSearchStats();
    console.log('   System Recommendations:');
    console.log(\\`   • Primary strategy: \${statsAfter.recommendedStrategy.primary}\\`);
    console.log(\\`   • Reason: \${statsAfter.recommendedStrategy.reason}\\`);
    
    if (statsAfter.cacheHealth?.isConnected) {
        console.log(\\`   • Cache latency: \${statsAfter.cacheHealth.latency}ms\\`);
        console.log(\\`   • Cached keys: \${statsAfter.cacheHealth.keyCount}\\`);
    }
}

async function runDemo() {
    try {
        const search = SmartSearchFactory.fromConfig();
        
        // Test connection
        const stats = await search.getSearchStats();
        if (!stats.databaseHealth.isConnected) {
            colorLog(Colors.RED, '❌ Database not connected. Please run setup first.');
            process.exit(1);
        }
        
        colorLog(Colors.GREEN, '✅ Connected to Smart Search!');
        
        switch (choice) {
            case '1':
                await healthcareDemo(search);
                break;
            case '2':
                await performanceDemo(search);
                break;
            case '3':
                await healthDashboard(search);
                break;
            case '4':
                await interactivePlayground(search);
                break;
            case '5':
                await advancedFeaturesDemo(search);
                break;
            case '6':
                await healthcareDemo(search);
                await performanceDemo(search);
                await healthDashboard(search);
                await advancedFeaturesDemo(search);
                colorLog(Colors.GREEN, '\\n🎉 Full demo complete! Try interactive mode next.');
                break;
        }
        
        if (choice !== '4') {
            console.log('\\n🚀 What\\'s Next?');
            console.log('   • Run interactive demo: ./scripts/blog-setup/junior/demo-search.sh (choose option 4)');
            console.log('   • Test performance: ./scripts/blog-setup/junior/test-performance.sh');
            console.log('   • Read the documentation: https://github.com/samas-it-services/smart-search');
            console.log('   • Check out advanced patterns for senior developers');
        }
        
        colorLog(Colors.GREEN, '\\n✨ Demo completed successfully!');
        
    } catch (error) {
        colorLog(Colors.RED, \\`\\n❌ Demo failed: \${error.message}\\`);
        console.log('\\n🔧 Troubleshooting:');
        console.log('1. Ensure services are running: docker ps');
        console.log('2. Run setup: ./scripts/blog-setup/junior/setup-dev.sh');
        console.log('3. Check configuration: npx @samas/smart-search validate');
    } finally {
        rl.close();
    }
}

runDemo();
"

echo ""
log_success "Interactive demo completed!"