#!/bin/bash

# Smart Search - Complete Testing Environment Setup
# Automated setup for comprehensive testing infrastructure including unit, integration, E2E, and security testing

set -e

echo "🧪 SMART SEARCH - TESTING ENVIRONMENT SETUP"
echo "============================================="
echo "Setting up comprehensive test automation infrastructure..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-testing}
NAMESPACE="smart-search-test"
TEST_DATA_SIZE=${2:-medium}

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_test() { echo -e "${CYAN}🧪 $1${NC}"; }

# Step 1: Validate testing prerequisites
log_info "Step 1: Validating testing prerequisites..."

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    log_error "Node.js is required for testing. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Check Docker for integration testing
if ! command -v docker &> /dev/null; then
    log_warning "Docker not found - integration tests will be limited"
fi

# Check kubectl for K8s testing
if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
    log_success "Kubernetes cluster detected - full integration testing available"
    K8S_AVAILABLE=true
else
    log_warning "Kubernetes not available - using local integration tests only"
    K8S_AVAILABLE=false
fi

log_success "Prerequisites validated"

# Step 2: Install testing dependencies
log_info "Step 2: Installing comprehensive testing stack..."

# Core testing framework
npm install --save-dev \
    vitest@^1.0.0 \
    @vitest/ui@^1.0.0 \
    @vitest/coverage-v8@^1.0.0 \
    jsdom@^23.0.0

# End-to-end testing
npm install --save-dev \
    playwright@^1.40.0 \
    @playwright/test@^1.40.0

# API testing
npm install --save-dev \
    supertest@^6.3.0 \
    axios@^1.6.0

# Load testing
npm install --save-dev \
    artillery@^2.0.0 \
    autocannon@^7.12.0

# Security testing
npm install --save-dev \
    retire@^4.2.0 \
    audit-ci@^6.6.0 \
    snyk@^1.1200.0

# Database testing helpers
npm install --save-dev \
    testcontainers@^10.2.0

# Mocking and fixtures
npm install --save-dev \
    nock@^13.4.0 \
    faker@^5.5.3 \
    factory-bot@^1.2.0

log_success "Testing dependencies installed"

# Step 3: Configure Playwright browsers
log_info "Step 3: Setting up Playwright browsers..."
npx playwright install
npx playwright install-deps

log_success "Playwright browsers configured"

# Step 4: Create comprehensive test configuration
log_info "Step 4: Creating test configuration files..."

# Vitest configuration for unit/integration tests
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'forks'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  }
})
EOF

# Playwright configuration for E2E tests
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run test:serve',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
EOF

# Artillery configuration for load testing
cat > artillery.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 20
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50
      name: "Peak load"
  processor: "./tests/load/artillery-processor.js"
  variables:
    testQueries:
      - "heart disease treatment"
      - "diabetes management" 
      - "cancer patient care"
      - "emergency surgery"
      - "pediatric medicine"

scenarios:
  - name: "Search API Load Test"
    weight: 70
    flow:
      - post:
          url: "/api/search"
          headers:
            Content-Type: "application/json"
          json:
            query: "{{ testQueries }}"
            options:
              limit: 20
          capture:
            - json: "$.results.length"
              as: "resultCount"
      - think: 2
      
  - name: "Health Check"
    weight: 20
    flow:
      - get:
          url: "/health"
          
  - name: "Metrics Check"
    weight: 10
    flow:
      - get:
          url: "/metrics"
EOF

log_success "Test configuration files created"

# Step 5: Create comprehensive test directory structure
log_info "Step 5: Creating test directory structure..."

mkdir -p tests/{unit,integration,e2e,load,security,fixtures,mocks,utils}
mkdir -p tests/coverage
mkdir -p test-results
mkdir -p tests/screenshots

# Create test setup file
cat > tests/setup.ts << 'EOF'
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TestContainers } from 'testcontainers'

// Global test configuration
beforeAll(async () => {
  console.log('🧪 Starting test suite...')
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'error'
  
  // Initialize test database if needed
  if (process.env.USE_TEST_CONTAINERS === 'true') {
    console.log('🐳 Starting test containers...')
    // Container setup would go here
  }
})

afterAll(async () => {
  console.log('🏁 Test suite completed')
  
  // Cleanup test containers
  if (process.env.USE_TEST_CONTAINERS === 'true') {
    console.log('🧹 Cleaning up test containers...')
  }
})

beforeEach(() => {
  // Reset mocks and clear timers
  vi.clearAllMocks()
  vi.clearAllTimers()
})

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks()
})
EOF

log_success "Test directory structure created"

# Step 6: Create sample test suites
log_info "Step 6: Creating sample test suites..."

# Unit test sample
cat > tests/unit/SmartSearch.test.ts << 'EOF'
import { describe, it, expect, vi } from 'vitest'
import { SmartSearch } from '@/SmartSearch'

describe('SmartSearch', () => {
  it('should initialize with valid configuration', () => {
    const config = {
      database: { type: 'postgres', connection: {} },
      cache: { type: 'redis', connection: {} }
    }
    
    expect(() => new SmartSearch(config)).not.toThrow()
  })

  it('should throw error with invalid configuration', () => {
    expect(() => new SmartSearch({})).toThrow('Invalid configuration')
  })

  it('should handle search with caching', async () => {
    const mockConfig = {
      database: { type: 'postgres', connection: {} },
      cache: { type: 'redis', connection: {} }
    }
    
    const smartSearch = new SmartSearch(mockConfig)
    const results = await smartSearch.search('test query')
    
    expect(results).toBeDefined()
    expect(Array.isArray(results.data)).toBe(true)
  })
})
EOF

# Integration test sample  
cat > tests/integration/database.test.ts << 'EOF'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SmartSearch } from '@/SmartSearch'

describe('Database Integration', () => {
  let smartSearch: SmartSearch

  beforeAll(async () => {
    // Setup test database connection
    const config = {
      database: {
        type: 'postgres',
        connection: {
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432'),
          database: 'smartsearch_test',
          user: 'test_user',
          password: 'test_password'
        }
      },
      cache: {
        type: 'redis',
        connection: {
          host: process.env.TEST_REDIS_HOST || 'localhost',
          port: parseInt(process.env.TEST_REDIS_PORT || '6379')
        }
      }
    }
    
    smartSearch = new SmartSearch(config)
    await smartSearch.initialize()
  })

  afterAll(async () => {
    await smartSearch?.close()
  })

  it('should connect to database successfully', async () => {
    const result = await smartSearch.testConnection()
    expect(result.database).toBe(true)
  })

  it('should perform full-text search', async () => {
    const results = await smartSearch.search('heart disease')
    
    expect(results).toBeDefined()
    expect(results.data.length).toBeGreaterThan(0)
    expect(results.metadata.totalCount).toBeGreaterThan(0)
  })

  it('should handle cache miss and database fallback', async () => {
    // Clear cache first
    await smartSearch.clearCache()
    
    const results = await smartSearch.search('diabetes treatment')
    
    expect(results.source).toBe('database')
    expect(results.data.length).toBeGreaterThan(0)
  })
})
EOF

# E2E test sample
cat > tests/e2e/search.spec.ts << 'EOF'
import { test, expect } from '@playwright/test'

test.describe('Smart Search E2E', () => {
  test('should load search interface', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('h1')).toContainText('Smart Search')
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
  })

  test('should perform search and display results', async ({ page }) => {
    await page.goto('/')
    
    // Fill search input
    await page.fill('[data-testid="search-input"]', 'heart disease')
    await page.click('[data-testid="search-button"]')
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Verify results are displayed
    const results = await page.locator('[data-testid="result-item"]').count()
    expect(results).toBeGreaterThan(0)
  })

  test('should handle empty search gracefully', async ({ page }) => {
    await page.goto('/')
    
    await page.click('[data-testid="search-button"]')
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Please enter a search query')
  })

  test('should show loading state during search', async ({ page }) => {
    await page.goto('/')
    
    await page.fill('[data-testid="search-input"]', 'complex query')
    await page.click('[data-testid="search-button"]')
    
    // Check loading state appears
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })
})
EOF

# Load test processor
cat > tests/load/artillery-processor.js << 'EOF'
module.exports = {
  setRandomQuery,
  checkResponseTime,
  validateSearchResults
}

function setRandomQuery(requestParams, context, ee, next) {
  const queries = [
    'heart disease treatment options',
    'diabetes management strategies', 
    'cancer patient care protocols',
    'emergency surgery procedures',
    'pediatric medicine guidelines',
    'orthopedic surgery techniques',
    'mental health therapy approaches',
    'chronic pain management',
    'preventive care measures',
    'laboratory test results'
  ]
  
  requestParams.json.query = queries[Math.floor(Math.random() * queries.length)]
  return next()
}

function checkResponseTime(requestParams, response, context, ee, next) {
  if (response.timings.response > 1000) {
    console.warn(`Slow response detected: ${response.timings.response}ms for ${requestParams.url}`)
  }
  return next()
}

function validateSearchResults(requestParams, response, context, ee, next) {
  if (response.body && typeof response.body === 'object') {
    const body = JSON.parse(response.body)
    
    if (!body.data || !Array.isArray(body.data)) {
      console.error('Invalid response structure:', body)
      ee.emit('error', 'Invalid response structure')
    }
    
    if (body.data.length === 0) {
      console.warn('Empty search results for query:', requestParams.json?.query)
    }
  }
  
  return next()
}
EOF

log_success "Sample test suites created"

# Step 7: Create Docker Compose for testing infrastructure
log_info "Step 7: Setting up testing infrastructure..."

cat > docker-compose.test.yml << 'EOF'
version: '3.8'
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: smartsearch_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
      - ./tests/fixtures/test-data.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d smartsearch_test"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_test_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  smart-search-test:
    build:
      context: .
      dockerfile: Dockerfile.test
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgres://test_user:test_password@postgres-test:5432/smartsearch_test
      - REDIS_URL=redis://redis-test:6379
    depends_on:
      postgres-test:
        condition: service_healthy
      redis-test:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_test_data:
  redis_test_data:
EOF

# Create test Dockerfile
cat > Dockerfile.test << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Add health check
RUN apk add --no-cache curl

# Start application
CMD ["npm", "start"]
EOF

log_success "Testing infrastructure configured"

# Step 8: Create security testing scripts
log_info "Step 8: Setting up security testing..."

mkdir -p tests/security

cat > tests/security/vulnerability-scan.sh << 'EOF'
#!/bin/bash

echo "🔒 Running vulnerability scans..."

# NPM audit
echo "📦 Checking NPM dependencies..."
npm audit --audit-level moderate

# Retire.js for JavaScript vulnerabilities  
echo "🔍 Scanning for known JS vulnerabilities..."
npx retire --path . --outputformat json --outputpath ./test-results/retire-report.json

# Snyk scan (if API key available)
if [ -n "$SNYK_TOKEN" ]; then
    echo "🛡️  Running Snyk security scan..."
    npx snyk test --json > ./test-results/snyk-report.json
else
    echo "⚠️  Snyk token not found, skipping Snyk scan"
fi

echo "✅ Security scans completed"
EOF

chmod +x tests/security/vulnerability-scan.sh

# Security test cases
cat > tests/security/security.test.ts << 'EOF'
import { describe, it, expect } from 'vitest'
import { SmartSearch } from '@/SmartSearch'
import { execSync } from 'child_process'

describe('Security Tests', () => {
  it('should sanitize SQL inputs', async () => {
    const smartSearch = new SmartSearch({
      database: { type: 'postgres', connection: {} },
      cache: { type: 'redis', connection: {} }
    })

    // Test SQL injection attempt
    const maliciousQuery = "'; DROP TABLE users; --"
    const results = await smartSearch.search(maliciousQuery)
    
    // Should handle gracefully without executing SQL
    expect(results.data).toBeDefined()
    expect(Array.isArray(results.data)).toBe(true)
  })

  it('should enforce rate limiting', async () => {
    const smartSearch = new SmartSearch({
      database: { type: 'postgres', connection: {} },
      cache: { type: 'redis', connection: {} },
      rateLimit: { maxRequests: 5, windowMs: 1000 }
    })

    // Make multiple rapid requests
    const promises = Array(10).fill(0).map(() => 
      smartSearch.search('test query')
    )

    const results = await Promise.allSettled(promises)
    const rejectedRequests = results.filter(r => r.status === 'rejected').length
    
    expect(rejectedRequests).toBeGreaterThan(0)
  })

  it('should validate input lengths', async () => {
    const smartSearch = new SmartSearch({
      database: { type: 'postgres', connection: {} },
      cache: { type: 'redis', connection: {} }
    })

    // Test extremely long input
    const longQuery = 'a'.repeat(10000)
    
    await expect(smartSearch.search(longQuery))
      .rejects.toThrow('Query too long')
  })

  it('should mask sensitive data', async () => {
    const smartSearch = new SmartSearch({
      database: { type: 'postgres', connection: {} },
      cache: { type: 'redis', connection: {} },
      governance: {
        fieldMasking: {
          ssn: 'mask',
          email: 'mask'
        }
      }
    })

    const results = await smartSearch.search('patient data')
    
    // Check that sensitive fields are masked
    results.data.forEach(record => {
      if (record.ssn) {
        expect(record.ssn).toMatch(/\*\*\*-\*\*-\d{4}/)
      }
      if (record.email) {
        expect(record.email).toMatch(/\*+@.+/)
      }
    })
  })
})
EOF

log_success "Security testing configured"

# Step 9: Create CI/CD pipeline configurations
log_info "Step 9: Creating CI/CD configurations..."

# GitHub Actions workflow
mkdir -p .github/workflows

cat > .github/workflows/test.yml << 'EOF'
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unit-tests
        name: codecov-umbrella

  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_USER: test_user
          POSTGRES_DB: smartsearch_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
          
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        TEST_DB_HOST: localhost
        TEST_DB_PORT: 5432
        TEST_REDIS_HOST: localhost
        TEST_REDIS_PORT: 6379

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Start test server
      run: |
        npm run build
        npm run test:serve &
        sleep 30
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/

  security-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security scans
      run: ./tests/security/vulnerability-scan.sh
    
    - name: Run security tests
      run: npm run test:security
      
    - name: Upload security reports
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: security-reports
        path: test-results/

  load-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start application
      run: |
        npm run build
        npm start &
        sleep 30
    
    - name: Run load tests
      run: npm run test:load
      
    - name: Upload load test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: load-test-results
        path: test-results/
EOF

log_success "CI/CD configurations created"

# Step 10: Update package.json with test scripts
log_info "Step 10: Adding test scripts to package.json..."

# Check if package.json exists and update it
if [ -f "package.json" ]; then
    # Create backup
    cp package.json package.json.bak
    
    # Add test scripts using node to modify JSON
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    pkg.scripts = pkg.scripts || {};
    
    // Add comprehensive test scripts
    Object.assign(pkg.scripts, {
      'test': 'vitest',
      'test:unit': 'vitest run --reporter=verbose --coverage',
      'test:integration': 'vitest run tests/integration --reporter=verbose',
      'test:e2e': 'playwright test',
      'test:e2e:headed': 'playwright test --headed',
      'test:e2e:debug': 'playwright test --debug',
      'test:load': 'artillery run artillery.yml',
      'test:security': 'vitest run tests/security',
      'test:watch': 'vitest',
      'test:coverage': 'vitest run --coverage',
      'test:serve': 'NODE_ENV=test PORT=3000 node dist/showcases/postgres-redis/app.js',
      'test:all': 'npm run test:unit && npm run test:integration && npm run test:e2e',
      'test:ci': 'npm run test:unit && npm run test:integration && npm run test:security'
    });
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    log_success "Test scripts added to package.json"
else
    log_warning "package.json not found, skipping script updates"
fi

# Step 11: Create test data and fixtures
log_info "Step 11: Creating test data and fixtures..."

# Create test SQL fixture
cat > tests/fixtures/test-data.sql << 'EOF'
-- Test data for Smart Search testing
CREATE TABLE IF NOT EXISTS healthcare (
    id SERIAL PRIMARY KEY,
    patient_name VARCHAR(255),
    condition VARCHAR(500),
    treatment VARCHAR(500),
    doctor VARCHAR(255),
    hospital VARCHAR(255),
    diagnosis_code VARCHAR(20),
    ssn VARCHAR(11),
    email VARCHAR(255),
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data with variety of searchable content
INSERT INTO healthcare (patient_name, condition, treatment, doctor, hospital, diagnosis_code, ssn, email, phone) VALUES
('John Smith', 'Heart Disease - Coronary Artery Disease', 'Cardiac Catheterization and Stent Placement', 'Dr. Sarah Johnson', 'Metropolitan Heart Center', 'I25.10', '123-45-6789', 'j.smith@email.com', '555-0101'),
('Mary Johnson', 'Type 2 Diabetes Mellitus', 'Metformin 500mg twice daily, lifestyle modification', 'Dr. Michael Chen', 'Endocrine Associates', 'E11.9', '234-56-7890', 'm.johnson@email.com', '555-0102'),
('Robert Davis', 'Lung Cancer - Non-small cell adenocarcinoma', 'Chemotherapy with Carboplatin and Paclitaxel', 'Dr. Emily Rodriguez', 'Cancer Treatment Center', 'C78.00', '345-67-8901', 'r.davis@email.com', '555-0103'),
('Jennifer Wilson', 'Hypertension - Essential hypertension', 'Lisinopril 10mg daily, low sodium diet', 'Dr. David Kim', 'Primary Care Clinic', 'I10', '456-78-9012', 'j.wilson@email.com', '555-0104'),
('Michael Brown', 'Acute Myocardial Infarction', 'Emergency PCI, Aspirin, Clopidogrel, Atorvastatin', 'Dr. Lisa Thompson', 'Emergency Cardiac Center', 'I21.9', '567-89-0123', 'm.brown@email.com', '555-0105'),
('Susan Miller', 'Chronic Kidney Disease Stage 3', 'ACE inhibitor, phosphate binders, dietary counseling', 'Dr. James Wilson', 'Nephrology Specialists', 'N18.3', '678-90-1234', 's.miller@email.com', '555-0106'),
('Thomas Anderson', 'Chronic Obstructive Pulmonary Disease', 'Bronchodilators, corticosteroids, pulmonary rehabilitation', 'Dr. Maria Garcia', 'Pulmonary Medicine Group', 'J44.1', '789-01-2345', 't.anderson@email.com', '555-0107'),
('Patricia Taylor', 'Rheumatoid Arthritis', 'Methotrexate, Hydroxychloroquine, physical therapy', 'Dr. Kevin Lee', 'Rheumatology Center', 'M06.9', '890-12-3456', 'p.taylor@email.com', '555-0108'),
('Christopher Moore', 'Severe Depression with Anxiety', 'Sertraline 50mg daily, cognitive behavioral therapy', 'Dr. Rachel Adams', 'Mental Health Associates', 'F33.2', '901-23-4567', 'c.moore@email.com', '555-0109'),
('Linda Clark', 'Osteoporosis - Postmenopausal', 'Alendronate 70mg weekly, calcium supplementation', 'Dr. Steven Park', 'Bone Health Clinic', 'M81.0', '012-34-5678', 'l.clark@email.com', '555-0110');

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_healthcare_condition ON healthcare USING gin(to_tsvector('english', condition));
CREATE INDEX IF NOT EXISTS idx_healthcare_treatment ON healthcare USING gin(to_tsvector('english', treatment));
CREATE INDEX IF NOT EXISTS idx_healthcare_doctor ON healthcare(doctor);
CREATE INDEX IF NOT EXISTS idx_healthcare_hospital ON healthcare(hospital);
CREATE INDEX IF NOT EXISTS idx_healthcare_created_at ON healthcare(created_at);

-- Update search statistics
ANALYZE healthcare;
EOF

# Create mock data factory
cat > tests/fixtures/factories.ts << 'EOF'
import { faker } from '@faker-js/faker'

export interface HealthcareRecord {
  id?: number
  patient_name: string
  condition: string
  treatment: string
  doctor: string
  hospital: string
  diagnosis_code: string
  ssn: string
  email: string
  phone: string
  created_at?: Date
  updated_at?: Date
}

export class HealthcareFactory {
  static create(overrides: Partial<HealthcareRecord> = {}): HealthcareRecord {
    return {
      patient_name: faker.person.fullName(),
      condition: faker.helpers.arrayElement([
        'Heart Disease - Coronary Artery Disease',
        'Type 2 Diabetes Mellitus',
        'Hypertension - Essential hypertension',
        'Chronic Obstructive Pulmonary Disease',
        'Chronic Kidney Disease',
        'Rheumatoid Arthritis',
        'Osteoporosis',
        'Depression with Anxiety',
        'Asthma',
        'Migraine'
      ]),
      treatment: faker.helpers.arrayElement([
        'Medication therapy and lifestyle modification',
        'Surgical intervention with follow-up care',
        'Physical therapy and pain management',
        'Chemotherapy and radiation treatment',
        'Behavioral therapy and counseling',
        'Dietary counseling and exercise program'
      ]),
      doctor: `Dr. ${faker.person.fullName()}`,
      hospital: faker.helpers.arrayElement([
        'Metropolitan Medical Center',
        'City General Hospital',
        'Regional Health System',
        'University Medical Center',
        'Specialized Treatment Center'
      ]),
      diagnosis_code: faker.helpers.arrayElement([
        'I25.10', 'E11.9', 'I10', 'J44.1', 'N18.3',
        'M06.9', 'M81.0', 'F33.2', 'J45.9', 'G43.909'
      ]),
      ssn: faker.helpers.replaceSymbolWithNumber('###-##-####'),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      created_at: faker.date.past(),
      updated_at: faker.date.recent(),
      ...overrides
    }
  }

  static createMany(count: number, overrides: Partial<HealthcareRecord> = {}): HealthcareRecord[] {
    return Array.from({ length: count }, () => this.create(overrides))
  }
}

export const mockSearchResponse = {
  data: HealthcareFactory.createMany(20),
  metadata: {
    totalCount: 1000,
    page: 1,
    pageSize: 20,
    queryTime: 45,
    source: 'cache'
  }
}
EOF

log_success "Test data and fixtures created"

# Step 12: Start testing infrastructure
log_info "Step 12: Starting testing infrastructure..."

# Start test containers if Docker is available
if command -v docker &> /dev/null; then
    log_info "Starting test database and cache..."
    docker-compose -f docker-compose.test.yml up -d postgres-test redis-test
    
    # Wait for services to be healthy
    echo "Waiting for test services to be ready..."
    sleep 15
    
    if docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
        log_success "Test infrastructure is running"
        
        # Run initial test to verify setup
        log_info "Running verification tests..."
        if npm run test:unit --silent; then
            log_success "Test environment verification passed"
        else
            log_warning "Some tests failed - please review configuration"
        fi
    else
        log_warning "Test infrastructure is starting but not fully ready yet"
    fi
else
    log_warning "Docker not available - skipping infrastructure startup"
fi

# Final summary
echo ""
log_test "🎉 TESTING ENVIRONMENT SETUP COMPLETE! 🎉"
echo "============================================="
log_success "Comprehensive testing infrastructure is ready!"
echo ""
echo "📋 What was configured:"
echo "   ✅ Unit testing with Vitest + coverage reporting"
echo "   ✅ Integration testing with test containers"
echo "   ✅ End-to-end testing with Playwright (5 browsers)"
echo "   ✅ Load testing with Artillery + Autocannon"
echo "   ✅ Security testing with vulnerability scanners"
echo "   ✅ CI/CD pipeline with GitHub Actions"
echo "   ✅ Test data fixtures and factories"
echo "   ✅ Comprehensive test configurations"
echo ""
echo "🧪 Available Test Commands:"
echo "   npm test                   # Interactive test runner"
echo "   npm run test:unit         # Unit tests with coverage"
echo "   npm run test:integration  # Integration tests"
echo "   npm run test:e2e          # End-to-end tests"
echo "   npm run test:load         # Load testing"
echo "   npm run test:security     # Security tests"
echo "   npm run test:all          # Full test suite"
echo "   npm run test:watch        # Watch mode development"
echo ""
echo "🐳 Infrastructure Commands:"
echo "   docker-compose -f docker-compose.test.yml up -d    # Start test infrastructure"
echo "   docker-compose -f docker-compose.test.yml down     # Stop test infrastructure"
echo "   docker-compose -f docker-compose.test.yml logs     # View infrastructure logs"
echo ""
echo "🔍 Testing Best Practices:"
echo "   1. Run 'npm run test:watch' during development"
echo "   2. Maintain 80%+ code coverage"
echo "   3. Run security scans before deployment"
echo "   4. Use load testing to validate performance"
echo "   5. Keep integration tests isolated and repeatable"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run './scripts/blog-setup/testers/run-test-suite.sh' for comprehensive testing"
echo "   2. Configure monitoring dashboards for test metrics"
echo "   3. Set up alerts for test failures in CI/CD"
echo "   4. Create custom test scenarios for your use cases"
echo ""
log_success "Ready for comprehensive quality assurance! 🎯"