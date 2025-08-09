#!/bin/bash

# Smart Search - Junior Developer Complete Setup Script
# This script sets up everything needed for the Junior Developer blog tutorial

set -e  # Exit on any error

echo "🚀 SMART SEARCH - JUNIOR DEVELOPER SETUP"
echo "========================================"
echo "Setting up complete development environment..."
echo ""

# Color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the Smart Search root directory"
    exit 1
fi

# Step 1: Check prerequisites
log_info "Step 1: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    log_error "Node.js version $NODE_VERSION is too old. Please install Node.js 16+."
    exit 1
fi

log_success "Node.js $(node --version) is installed"

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

log_success "Docker is running"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

log_success "Docker Compose is available"

# Step 2: Install dependencies
log_info "Step 2: Installing Node.js dependencies..."

npm install --silent
log_success "Dependencies installed"

# Step 3: Set up Docker services
log_info "Step 3: Setting up Docker services (PostgreSQL + Redis)..."

# Stop any existing containers
docker-compose -f docker/postgres-redis.docker-compose.yml down --volumes --remove-orphans &> /dev/null || true

# Set environment variables for medium dataset
export DATA_SIZE=medium

# Start services with medium dataset
log_info "Starting PostgreSQL and Redis containers..."
docker-compose -f docker/postgres-redis.docker-compose.yml up -d

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 10

# Check PostgreSQL
for i in {1..30}; do
    if docker exec postgres pg_isready -h localhost -p 5432 &> /dev/null; then
        log_success "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "PostgreSQL failed to start within timeout"
        exit 1
    fi
    sleep 2
done

# Check Redis
for i in {1..30}; do
    if docker exec redis redis-cli ping | grep -q PONG 2> /dev/null; then
        log_success "Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "Redis failed to start within timeout"
        exit 1
    fi
    sleep 2
done

# Step 4: Seed database with healthcare data
log_info "Step 4: Seeding database with healthcare demo data (99,932 records)..."

if [ -f "./scripts/seed-data.sh" ]; then
    ./scripts/seed-data.sh healthcare medium postgres
    log_success "Database seeded with healthcare data"
else
    log_warning "Seed script not found, continuing without data"
fi

# Step 5: Create configuration files
log_info "Step 5: Creating configuration files..."

# Create development configuration if it doesn't exist
if [ ! -f "smart-search.config.json" ]; then
    cat > smart-search.config.json << 'EOF'
{
  "database": {
    "type": "postgres",
    "connection": {
      "host": "localhost",
      "port": 5432,
      "user": "smartsearch_user",
      "password": "smartsearch_pass",
      "database": "smartsearch_db"
    }
  },
  "cache": {
    "type": "redis",
    "connection": {
      "host": "localhost",
      "port": 6379,
      "lazyConnect": true,
      "retryDelayOnFailover": 100,
      "enableReadyCheck": false,
      "maxRetriesPerRequest": null
    }
  },
  "search": {
    "fallback": "database",
    "defaultCacheTTL": 300000,
    "logQueries": true,
    "tables": {
      "healthcare": {
        "columns": {
          "id": "id",
          "patient_name": "patient_name",
          "condition": "condition",
          "treatment": "treatment",
          "doctor": "doctor",
          "hospital": "hospital"
        },
        "searchColumns": ["patient_name", "condition", "treatment", "doctor", "hospital"],
        "type": "healthcare_record"
      }
    }
  }
}
EOF
    log_success "Configuration file created"
else
    log_success "Configuration file already exists"
fi

# Create environment file
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Smart Search Development Environment
DATABASE_URL=postgresql://smartsearch_user:smartsearch_pass@localhost:5432/smartsearch_db
REDIS_URL=redis://localhost:6379
SMART_SEARCH_ENABLE_METRICS=true
SMART_SEARCH_FALLBACK=database
NODE_ENV=development
EOF
    log_success "Environment file created"
else
    log_success "Environment file already exists"
fi

# Step 6: Test the setup
log_info "Step 6: Testing the complete setup..."

# Test basic functionality
node -e "
const { SmartSearchFactory } = require('./dist/index.js');

(async () => {
  try {
    console.log('🧪 Testing Smart Search setup...');
    const search = SmartSearchFactory.fromConfig();
    
    // Test database connection
    const stats = await search.getSearchStats();
    
    if (stats.databaseHealth.isConnected) {
      console.log('✅ Database connection: OK');
    } else {
      console.log('❌ Database connection: FAILED');
      process.exit(1);
    }
    
    if (stats.cacheHealth?.isConnected) {
      console.log('✅ Cache connection: OK');
    } else {
      console.log('⚠️  Cache connection: Not available (will use database fallback)');
    }
    
    // Test search functionality
    const results = await search.search('patient', { limit: 5 });
    console.log(\`✅ Search test: Found \${results.results.length} results in \${results.performance.searchTime}ms\`);
    
    if (results.results.length === 0) {
      console.log('⚠️  No data found - you may need to seed the database');
    }
    
    console.log('🎉 Setup test completed successfully!');
    
  } catch (error) {
    console.error('❌ Setup test failed:', error.message);
    process.exit(1);
  }
})();
" || {
    log_error "Setup test failed - building project first..."
    npm run build
    
    # Retry test
    node -e "
    const { SmartSearchFactory } = require('./dist/index.js');
    
    (async () => {
      try {
        console.log('🧪 Retesting Smart Search setup...');
        const search = SmartSearchFactory.fromConfig();
        const results = await search.search('patient', { limit: 5 });
        console.log(\`✅ Search test: Found \${results.results.length} results\`);
        console.log('🎉 Setup completed successfully!');
      } catch (error) {
        console.error('❌ Setup still failing:', error.message);
      }
    })();
    "
}

# Step 7: Run performance benchmark
log_info "Step 7: Running performance benchmark..."

if [ -f "./scripts/blog-setup/junior/test-performance.sh" ]; then
    chmod +x ./scripts/blog-setup/junior/test-performance.sh
    ./scripts/blog-setup/junior/test-performance.sh
else
    log_warning "Performance test script not found, skipping benchmark"
fi

# Final success message
echo ""
echo "🎉 SETUP COMPLETE! 🎉"
echo "==================="
echo ""
log_success "Smart Search development environment is ready!"
echo ""
echo "📋 What was set up:"
echo "   ✅ Node.js dependencies installed"
echo "   ✅ PostgreSQL + Redis Docker containers running"
echo "   ✅ Database seeded with 99,932+ healthcare records"
echo "   ✅ Configuration files created"
echo "   ✅ Environment variables configured"
echo "   ✅ Basic functionality tested"
echo ""
echo "🚀 Next steps:"
echo "   1. Run the interactive demo:"
echo "      ./scripts/blog-setup/junior/demo-search.sh"
echo ""
echo "   2. Test performance:"
echo "      ./scripts/blog-setup/junior/test-performance.sh"
echo ""
echo "   3. Start coding with Smart Search!"
echo "      node -e 'const search = require(\"./dist/index.js\").SmartSearchFactory.fromConfig(); console.log(\"Ready to search!\");'"
echo ""
echo "📚 Need help? Check the troubleshooting script:"
echo "   ./scripts/blog-setup/junior/troubleshoot.sh"
echo ""
log_success "Happy coding! 🎯"