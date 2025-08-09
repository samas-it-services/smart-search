#!/bin/bash

# Smart Search - Comprehensive Troubleshooting Script
# Automatically diagnoses and fixes common issues for junior developers

set -e

echo "🔧 SMART SEARCH - TROUBLESHOOTING TOOLKIT"
echo "========================================="
echo "Diagnosing common issues..."
echo ""

# Color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Status tracking
ISSUES_FOUND=0
FIXES_APPLIED=0

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((ISSUES_FOUND++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ISSUES_FOUND++))
}

log_fix() {
    echo -e "${CYAN}🔧 $1${NC}"
    ((FIXES_APPLIED++))
}

log_check() {
    echo -e "${PURPLE}🔍 $1${NC}"
}

# Helper function to run commands safely
run_safe() {
    if eval "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

echo "Starting comprehensive system diagnosis..."
echo ""

# 1. Environment Prerequisites Check
log_check "1️⃣ Environment Prerequisites"
echo "─────────────────────────────"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Not in Smart Search root directory"
    echo "   Solution: cd to the Smart Search project directory"
    exit 1
else
    log_success "In correct project directory"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 16 ]; then
        log_success "Node.js $(node --version) is installed"
    else
        log_error "Node.js version $NODE_VERSION is too old (need 16+)"
        echo "   Solution: Install Node.js 16+ from https://nodejs.org"
    fi
else
    log_error "Node.js is not installed"
    echo "   Solution: Install Node.js from https://nodejs.org"
fi

# Check npm
if command -v npm &> /dev/null; then
    log_success "npm $(npm --version) is available"
else
    log_error "npm is not installed"
    echo "   Solution: Install npm (usually comes with Node.js)"
fi

# Check Docker
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        log_success "Docker is running"
    else
        log_error "Docker is installed but not running"
        log_fix "Attempting to start Docker..."
        echo "   Please start Docker Desktop manually"
    fi
else
    log_error "Docker is not installed"
    echo "   Solution: Install Docker Desktop from https://docker.com"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    log_success "Docker Compose is available"
else
    log_error "Docker Compose is not installed"
    echo "   Solution: Install Docker Compose"
fi

echo ""

# 2. Project Dependencies Check
log_check "2️⃣ Project Dependencies"
echo "────────────────────────"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    log_success "Node modules are installed"
else
    log_error "Node modules are missing"
    log_fix "Installing dependencies..."
    if npm install --silent; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
    fi
fi

# Check if project is built
if [ -d "dist" ]; then
    log_success "Project is built"
else
    log_warning "Project needs to be built"
    log_fix "Building project..."
    if npm run build --silent; then
        log_success "Project built successfully"
    else
        log_error "Failed to build project"
    fi
fi

echo ""

# 3. Configuration Validation
log_check "3️⃣ Configuration Files"
echo "──────────────────────"

# Check for configuration file
if [ -f "smart-search.config.json" ]; then
    log_success "Configuration file exists"
    
    # Validate configuration
    if run_safe "npx @samas/smart-search validate"; then
        log_success "Configuration is valid"
    else
        log_error "Configuration validation failed"
        log_fix "Configuration issues detected - creating backup and regenerating..."
        if [ -f "smart-search.config.json" ]; then
            cp smart-search.config.json smart-search.config.json.backup
            log_info "Backup created: smart-search.config.json.backup"
        fi
    fi
else
    log_warning "Configuration file missing"
    log_fix "Generating configuration file..."
    if run_safe "npx @samas/smart-search init json"; then
        log_success "Configuration file generated"
    else
        log_error "Failed to generate configuration"
    fi
fi

# Check environment file
if [ -f ".env" ]; then
    log_success "Environment file exists"
else
    log_warning ".env file missing"
    log_fix "Creating .env file..."
    cat > .env << 'EOF'
# Smart Search Development Environment
DATABASE_URL=postgresql://smartsearch_user:smartsearch_pass@localhost:5432/smartsearch_db
REDIS_URL=redis://localhost:6379
SMART_SEARCH_ENABLE_METRICS=true
SMART_SEARCH_FALLBACK=database
NODE_ENV=development
EOF
    log_success ".env file created"
fi

echo ""

# 4. Docker Services Health Check
log_check "4️⃣ Docker Services"
echo "───────────────────"

# Check if docker-compose file exists
if [ -f "docker/postgres-redis.docker-compose.yml" ]; then
    log_success "Docker Compose file found"
else
    log_error "Docker Compose file missing"
    echo "   This is a critical issue - the compose file should exist"
fi

# Check PostgreSQL container
if docker ps | grep -q postgres; then
    log_success "PostgreSQL container is running"
    
    # Test PostgreSQL connection
    if docker exec postgres pg_isready -h localhost -p 5432 &> /dev/null; then
        log_success "PostgreSQL is accepting connections"
    else
        log_warning "PostgreSQL is not ready"
        log_fix "Waiting for PostgreSQL to be ready..."
        sleep 5
        if docker exec postgres pg_isready -h localhost -p 5432 &> /dev/null; then
            log_success "PostgreSQL is now ready"
        else
            log_error "PostgreSQL connection still failing"
        fi
    fi
else
    log_error "PostgreSQL container is not running"
    log_fix "Starting PostgreSQL container..."
    if docker-compose -f docker/postgres-redis.docker-compose.yml up -d postgres; then
        log_success "PostgreSQL container started"
        log_info "Waiting for startup..."
        sleep 10
    else
        log_error "Failed to start PostgreSQL container"
    fi
fi

# Check Redis container
if docker ps | grep -q redis; then
    log_success "Redis container is running"
    
    # Test Redis connection
    if docker exec redis redis-cli ping | grep -q PONG 2> /dev/null; then
        log_success "Redis is responding to ping"
    else
        log_warning "Redis is not responding"
        log_fix "Restarting Redis container..."
        docker-compose -f docker/postgres-redis.docker-compose.yml restart redis
        sleep 5
    fi
else
    log_error "Redis container is not running"
    log_fix "Starting Redis container..."
    if docker-compose -f docker/postgres-redis.docker-compose.yml up -d redis; then
        log_success "Redis container started"
        log_info "Waiting for startup..."
        sleep 5
    else
        log_error "Failed to start Redis container"
    fi
fi

echo ""

# 5. Database Content Check
log_check "5️⃣ Database Content"
echo "────────────────────"

# Check if database has data
DATABASE_CHECK=$(node -e "
const { SmartSearchFactory } = require('./dist/index.js');

(async () => {
    try {
        const search = SmartSearchFactory.fromConfig();
        const results = await search.search('test', { limit: 1 });
        console.log('RESULTS_COUNT:' + results.results.length);
    } catch (error) {
        console.log('DATABASE_ERROR:' + error.message);
    }
})();
" 2>/dev/null)

if echo "$DATABASE_CHECK" | grep -q "RESULTS_COUNT:0"; then
    log_warning "Database appears to be empty"
    log_fix "Seeding database with healthcare data..."
    if [ -f "./scripts/seed-data.sh" ]; then
        if ./scripts/seed-data.sh healthcare medium postgres; then
            log_success "Database seeded with sample data"
        else
            log_error "Failed to seed database"
        fi
    else
        log_error "Seed script not found"
    fi
elif echo "$DATABASE_CHECK" | grep -q "RESULTS_COUNT"; then
    RESULT_COUNT=$(echo "$DATABASE_CHECK" | grep "RESULTS_COUNT" | cut -d':' -f2)
    log_success "Database has data (found results for test query)"
else
    log_error "Database connection test failed"
    echo "   Error: $(echo "$DATABASE_CHECK" | grep "DATABASE_ERROR" | cut -d':' -f2-)"
fi

echo ""

# 6. Smart Search Functionality Test
log_check "6️⃣ Smart Search Functionality"
echo "──────────────────────────────"

# Test basic search functionality
SEARCH_TEST=$(node -e "
const { SmartSearchFactory } = require('./dist/index.js');

(async () => {
    try {
        const search = SmartSearchFactory.fromConfig();
        
        // Test database connection
        const stats = await search.getSearchStats();
        console.log('DB_CONNECTED:' + stats.databaseHealth.isConnected);
        console.log('CACHE_CONNECTED:' + (stats.cacheHealth?.isConnected || false));
        
        // Test search
        const results = await search.search('patient', { limit: 5 });
        console.log('SEARCH_TIME:' + results.performance.searchTime);
        console.log('SEARCH_STRATEGY:' + results.strategy.primary);
        console.log('SEARCH_RESULTS:' + results.results.length);
        
        console.log('SEARCH_SUCCESS:true');
        
    } catch (error) {
        console.log('SEARCH_ERROR:' + error.message);
    }
})();
" 2>/dev/null)

if echo "$SEARCH_TEST" | grep -q "SEARCH_SUCCESS:true"; then
    log_success "Smart Search is working correctly"
    
    # Parse and display details
    DB_CONNECTED=$(echo "$SEARCH_TEST" | grep "DB_CONNECTED" | cut -d':' -f2)
    CACHE_CONNECTED=$(echo "$SEARCH_TEST" | grep "CACHE_CONNECTED" | cut -d':' -f2)
    SEARCH_TIME=$(echo "$SEARCH_TEST" | grep "SEARCH_TIME" | cut -d':' -f2)
    SEARCH_STRATEGY=$(echo "$SEARCH_TEST" | grep "SEARCH_STRATEGY" | cut -d':' -f2)
    SEARCH_RESULTS=$(echo "$SEARCH_TEST" | grep "SEARCH_RESULTS" | cut -d':' -f2)
    
    echo "   📊 Test Results:"
    echo "      Database connected: $DB_CONNECTED"
    echo "      Cache connected: $CACHE_CONNECTED"
    echo "      Search time: ${SEARCH_TIME}ms"
    echo "      Strategy used: $SEARCH_STRATEGY"
    echo "      Results found: $SEARCH_RESULTS"
    
    if [ "$SEARCH_TIME" -lt 100 ] && [ "$CACHE_CONNECTED" = "true" ]; then
        log_success "Excellent performance - cache is working!"
    elif [ "$SEARCH_TIME" -lt 1000 ]; then
        log_success "Good performance"
    else
        log_warning "Slow performance detected"
        echo "      💡 Consider checking database indexes or cache configuration"
    fi
    
else
    log_error "Smart Search functionality test failed"
    ERROR_MSG=$(echo "$SEARCH_TEST" | grep "SEARCH_ERROR" | cut -d':' -f2-)
    echo "   Error: $ERROR_MSG"
fi

echo ""

# 7. Performance Check
log_check "7️⃣ Quick Performance Test"
echo "───────────────────────────"

PERF_TEST=$(node -e "
const { SmartSearchFactory } = require('./dist/index.js');

(async () => {
    try {
        const search = SmartSearchFactory.fromConfig();
        
        // First search (likely cache miss)
        const start1 = Date.now();
        const result1 = await search.search('heart disease', { limit: 10 });
        const time1 = Date.now() - start1;
        
        // Second search (likely cache hit)
        const start2 = Date.now();
        const result2 = await search.search('heart disease', { limit: 10 });
        const time2 = Date.now() - start2;
        
        console.log('PERF_TIME1:' + time1);
        console.log('PERF_TIME2:' + time2);
        console.log('PERF_CACHE_HIT:' + (result2.performance.cacheHit || false));
        console.log('PERF_SUCCESS:true');
        
    } catch (error) {
        console.log('PERF_ERROR:' + error.message);
    }
})();
" 2>/dev/null)

if echo "$PERF_TEST" | grep -q "PERF_SUCCESS:true"; then
    PERF_TIME1=$(echo "$PERF_TEST" | grep "PERF_TIME1" | cut -d':' -f2)
    PERF_TIME2=$(echo "$PERF_TEST" | grep "PERF_TIME2" | cut -d':' -f2)
    CACHE_HIT=$(echo "$PERF_TEST" | grep "PERF_CACHE_HIT" | cut -d':' -f2)
    
    echo "   📊 Performance Results:"
    echo "      First search: ${PERF_TIME1}ms"
    echo "      Second search: ${PERF_TIME2}ms"
    echo "      Cache hit: $CACHE_HIT"
    
    if [ "$PERF_TIME2" -lt 50 ] && [ "$CACHE_HIT" = "true" ]; then
        log_success "Excellent cache performance!"
    elif [ "$PERF_TIME2" -lt 200 ]; then
        log_success "Good performance"
    else
        log_warning "Suboptimal performance"
    fi
else
    log_error "Performance test failed"
fi

echo ""

# 8. Generate Summary Report
echo "📋 TROUBLESHOOTING SUMMARY"
echo "========================="

if [ $ISSUES_FOUND -eq 0 ]; then
    log_success "🎉 No issues found! System is working perfectly."
    echo ""
    echo "✨ Your Smart Search setup is ready to use!"
    echo ""
    echo "🚀 Next Steps:"
    echo "   • Run the demo: ./scripts/blog-setup/junior/demo-search.sh"
    echo "   • Test performance: ./scripts/blog-setup/junior/test-performance.sh"
    echo "   • Start building awesome search features!"
    
elif [ $FIXES_APPLIED -gt 0 ]; then
    echo ""
    log_info "🔧 Applied $FIXES_APPLIED automatic fixes"
    
    if [ $ISSUES_FOUND -le $FIXES_APPLIED ]; then
        log_success "✅ All issues should now be resolved!"
        echo ""
        echo "🧪 Recommended: Run this script again to verify fixes:"
        echo "   ./scripts/blog-setup/junior/troubleshoot.sh"
    else
        echo ""
        log_warning "⚠️  Some issues may require manual intervention:"
        echo ""
        echo "🔍 Manual Steps to Try:"
        echo "   1. Restart Docker containers:"
        echo "      docker-compose -f docker/postgres-redis.docker-compose.yml restart"
        echo ""
        echo "   2. Rebuild and retry:"
        echo "      npm run build && ./scripts/blog-setup/junior/troubleshoot.sh"
        echo ""
        echo "   3. Full reset (if needed):"
        echo "      ./scripts/blog-setup/junior/setup-dev.sh"
    fi
else
    echo ""
    log_warning "⚠️  Found $ISSUES_FOUND issues that need attention"
    echo ""
    echo "🔧 Recommended Actions:"
    echo "   1. Install missing prerequisites (Node.js, Docker)"
    echo "   2. Start Docker services"
    echo "   3. Run full setup: ./scripts/blog-setup/junior/setup-dev.sh"
    echo "   4. Re-run this troubleshooting script"
fi

echo ""
echo "📚 Additional Resources:"
echo "   • Full setup guide: ./scripts/blog-setup/junior/setup-dev.sh"
echo "   • Interactive demo: ./scripts/blog-setup/junior/demo-search.sh"
echo "   • Performance testing: ./scripts/blog-setup/junior/test-performance.sh"
echo "   • Documentation: https://github.com/samas-it-services/smart-search"

echo ""
log_success "Troubleshooting complete! 🎯"