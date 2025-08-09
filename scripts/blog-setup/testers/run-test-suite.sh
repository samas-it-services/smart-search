#!/bin/bash

# Smart Search - Comprehensive Test Suite Runner
# Automated execution of full testing pipeline with reporting

set -e

echo "🚀 SMART SEARCH - COMPREHENSIVE TEST SUITE"
echo "=========================================="
echo "Running complete testing pipeline..."
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
START_TIME=$(date +%s)
PARALLEL_JOBS=${1:-4}
ENVIRONMENT=${2:-test}
REPORT_FORMAT=${3:-html}

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_test() { echo -e "${CYAN}🧪 $1${NC}"; }
log_performance() { echo -e "${PURPLE}⚡ $1${NC}"; }

# Test results tracking
UNIT_TESTS_PASSED=false
INTEGRATION_TESTS_PASSED=false
E2E_TESTS_PASSED=false
SECURITY_TESTS_PASSED=false
LOAD_TESTS_PASSED=false

# Create test results directory
TEST_RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p ${TEST_RESULTS_DIR}/{unit,integration,e2e,security,load,reports}

log_info "Test results will be saved to: ${TEST_RESULTS_DIR}"

# Phase 1: Environment validation and setup
log_test "Phase 1: Environment Validation"
echo "================================="

log_info "Validating test environment prerequisites..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    log_success "Node.js version: $(node --version)"
else
    log_error "Node.js 18+ required. Current: $(node --version)"
    exit 1
fi

# Check npm dependencies
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    log_info "Installing dependencies..."
    npm ci
fi

# Verify test infrastructure
log_info "Checking test infrastructure..."
if docker-compose -f docker-compose.test.yml ps postgres-test | grep -q "Up"; then
    log_success "Test database is running"
else
    log_info "Starting test infrastructure..."
    docker-compose -f docker-compose.test.yml up -d postgres-test redis-test
    sleep 15
    
    # Wait for health checks
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
            log_success "Test infrastructure is ready"
            break
        fi
        sleep 5
        timeout=$((timeout - 5))
    done
    
    if [ $timeout -eq 0 ]; then
        log_warning "Test infrastructure not fully ready, continuing anyway..."
    fi
fi

# Phase 2: Unit Tests
log_test "Phase 2: Unit Tests with Coverage"
echo "================================="

log_info "Running comprehensive unit test suite..."
start_time=$(date +%s)

if npm run test:unit 2>&1 | tee ${TEST_RESULTS_DIR}/unit/unit-test-output.log; then
    UNIT_TESTS_PASSED=true
    log_success "Unit tests completed successfully"
    
    # Move coverage reports
    if [ -d "coverage" ]; then
        cp -r coverage/* ${TEST_RESULTS_DIR}/unit/
        
        # Extract coverage metrics
        if [ -f "coverage/coverage-summary.json" ]; then
            COVERAGE=$(node -e "
                const summary = require('./coverage/coverage-summary.json');
                const total = summary.total;
                console.log(\`Lines: \${total.lines.pct}% | Functions: \${total.functions.pct}% | Branches: \${total.branches.pct}% | Statements: \${total.statements.pct}%\`);
            ")
            log_performance "Code Coverage: ${COVERAGE}"
        fi
    fi
else
    UNIT_TESTS_PASSED=false
    log_error "Unit tests failed - see ${TEST_RESULTS_DIR}/unit/unit-test-output.log"
fi

end_time=$(date +%s)
unit_duration=$((end_time - start_time))
log_performance "Unit tests completed in ${unit_duration}s"

# Phase 3: Integration Tests
log_test "Phase 3: Integration Tests"
echo "=========================="

log_info "Running database and cache integration tests..."
start_time=$(date +%s)

# Set test environment variables
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5433
export TEST_REDIS_HOST=localhost  
export TEST_REDIS_PORT=6380

if npm run test:integration 2>&1 | tee ${TEST_RESULTS_DIR}/integration/integration-test-output.log; then
    INTEGRATION_TESTS_PASSED=true
    log_success "Integration tests completed successfully"
else
    INTEGRATION_TESTS_PASSED=false
    log_error "Integration tests failed - see ${TEST_RESULTS_DIR}/integration/integration-test-output.log"
fi

end_time=$(date +%s)
integration_duration=$((end_time - start_time))
log_performance "Integration tests completed in ${integration_duration}s"

# Phase 4: End-to-End Tests
log_test "Phase 4: End-to-End Testing (Multi-Browser)"
echo "==========================================="

log_info "Installing Playwright browsers if needed..."
npx playwright install --with-deps chromium firefox webkit > /dev/null 2>&1

log_info "Starting application server for E2E testing..."
# Start test server in background
npm run test:serve > ${TEST_RESULTS_DIR}/e2e/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 15

# Verify server is running
if curl -s http://localhost:3000/health > /dev/null; then
    log_success "Test server is running"
    
    start_time=$(date +%s)
    
    if npm run test:e2e 2>&1 | tee ${TEST_RESULTS_DIR}/e2e/e2e-test-output.log; then
        E2E_TESTS_PASSED=true
        log_success "E2E tests completed successfully"
        
        # Move Playwright reports
        if [ -d "playwright-report" ]; then
            cp -r playwright-report ${TEST_RESULTS_DIR}/e2e/
        fi
        if [ -d "test-results" ]; then
            cp -r test-results/* ${TEST_RESULTS_DIR}/e2e/ 2>/dev/null || true
        fi
    else
        E2E_TESTS_PASSED=false
        log_error "E2E tests failed - see ${TEST_RESULTS_DIR}/e2e/e2e-test-output.log"
    fi
    
    end_time=$(date +%s)
    e2e_duration=$((end_time - start_time))
    log_performance "E2E tests completed in ${e2e_duration}s"
else
    log_error "Test server failed to start"
    E2E_TESTS_PASSED=false
fi

# Clean up server
kill $SERVER_PID 2>/dev/null || true

# Phase 5: Security Testing
log_test "Phase 5: Security & Vulnerability Testing"
echo "========================================"

log_info "Running comprehensive security scans..."
start_time=$(date +%s)

# Run security scan script
if [ -f "tests/security/vulnerability-scan.sh" ]; then
    if ./tests/security/vulnerability-scan.sh 2>&1 | tee ${TEST_RESULTS_DIR}/security/vulnerability-scan.log; then
        log_success "Vulnerability scanning completed"
    else
        log_warning "Some vulnerability scans failed"
    fi
fi

# Run security tests
if npm run test:security 2>&1 | tee ${TEST_RESULTS_DIR}/security/security-test-output.log; then
    SECURITY_TESTS_PASSED=true
    log_success "Security tests completed successfully"
else
    SECURITY_TESTS_PASSED=false
    log_warning "Security tests failed - see ${TEST_RESULTS_DIR}/security/security-test-output.log"
fi

# Copy security reports if they exist
for report in retire-report.json snyk-report.json; do
    if [ -f "test-results/${report}" ]; then
        cp "test-results/${report}" ${TEST_RESULTS_DIR}/security/
    fi
done

end_time=$(date +%s)
security_duration=$((end_time - start_time))
log_performance "Security tests completed in ${security_duration}s"

# Phase 6: Load Testing (Optional - only if server is available)
log_test "Phase 6: Performance & Load Testing"  
echo "==================================="

log_info "Starting application for load testing..."
npm run test:serve > ${TEST_RESULTS_DIR}/load/load-server.log 2>&1 &
LOAD_SERVER_PID=$!
sleep 15

if curl -s http://localhost:3000/health > /dev/null; then
    log_success "Load test server is running"
    
    start_time=$(date +%s)
    
    log_info "Running Artillery load tests..."
    if npm run test:load 2>&1 | tee ${TEST_RESULTS_DIR}/load/load-test-output.log; then
        LOAD_TESTS_PASSED=true
        log_success "Load tests completed successfully"
        
        # Parse Artillery results for key metrics
        if grep -q "Request rate" ${TEST_RESULTS_DIR}/load/load-test-output.log; then
            RPS=$(grep "Request rate" ${TEST_RESULTS_DIR}/load/load-test-output.log | tail -1 | awk '{print $3}')
            LATENCY=$(grep "Response time" ${TEST_RESULTS_DIR}/load/load-test-output.log | tail -1 | awk '{print $4}')
            log_performance "Load Test Results: ${RPS} req/sec, ${LATENCY}ms avg latency"
        fi
    else
        LOAD_TESTS_PASSED=false
        log_warning "Load tests failed - see ${TEST_RESULTS_DIR}/load/load-test-output.log"
    fi
    
    end_time=$(date +%s)
    load_duration=$((end_time - start_time))
    log_performance "Load tests completed in ${load_duration}s"
else
    log_warning "Load test server failed to start - skipping load tests"
    LOAD_TESTS_PASSED=false
fi

# Clean up load test server
kill $LOAD_SERVER_PID 2>/dev/null || true

# Phase 7: Generate Comprehensive Report
log_test "Phase 7: Generating Test Reports"
echo "==============================="

log_info "Generating comprehensive test report..."

TOTAL_END_TIME=$(date +%s)
TOTAL_DURATION=$((TOTAL_END_TIME - START_TIME))

# Calculate success rate
TESTS_PASSED=0
TOTAL_TESTS=5

if [ "$UNIT_TESTS_PASSED" = true ]; then TESTS_PASSED=$((TESTS_PASSED + 1)); fi
if [ "$INTEGRATION_TESTS_PASSED" = true ]; then TESTS_PASSED=$((TESTS_PASSED + 1)); fi
if [ "$E2E_TESTS_PASSED" = true ]; then TESTS_PASSED=$((TESTS_PASSED + 1)); fi
if [ "$SECURITY_TESTS_PASSED" = true ]; then TESTS_PASSED=$((TESTS_PASSED + 1)); fi
if [ "$LOAD_TESTS_PASSED" = true ]; then TESTS_PASSED=$((TESTS_PASSED + 1)); fi

SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

# Determine overall grade
if [ $SUCCESS_RATE -ge 90 ]; then
    OVERALL_GRADE="A"
    GRADE_COLOR=${GREEN}
elif [ $SUCCESS_RATE -ge 80 ]; then
    OVERALL_GRADE="B"
    GRADE_COLOR=${YELLOW}
elif [ $SUCCESS_RATE -ge 70 ]; then
    OVERALL_GRADE="C"
    GRADE_COLOR=${YELLOW}
elif [ $SUCCESS_RATE -ge 60 ]; then
    OVERALL_GRADE="D"
    GRADE_COLOR=${RED}
else
    OVERALL_GRADE="F"
    GRADE_COLOR=${RED}
fi

# Generate detailed HTML report
cat > ${TEST_RESULTS_DIR}/reports/test-report.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Smart Search - Comprehensive Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .grade { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; }
        .grade.A { color: #22c55e; }
        .grade.B { color: #eab308; }
        .grade.C { color: #f97316; }
        .grade.D, .grade.F { color: #ef4444; }
        .section { background: white; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { color: #22c55e; }
        .warning { color: #f59e0b; }
        .error { color: #ef4444; }
        .metric { display: inline-block; background: #f3f4f6; padding: 10px 15px; margin: 5px; border-radius: 6px; }
        .chart { width: 100%; height: 300px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .status-passed { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; }
        .status-failed { background: #fef2f2; color: #dc2626; padding: 4px 8px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Smart Search - Comprehensive Test Report</h1>
        <p><strong>Generated:</strong> $(date -Iseconds)</p>
        <p><strong>Environment:</strong> ${ENVIRONMENT}</p>
        <p><strong>Total Duration:</strong> ${TOTAL_DURATION}s</p>
    </div>

    <div class="section">
        <h2>📊 Overall Test Results</h2>
        <div class="grade ${OVERALL_GRADE}">Grade: ${OVERALL_GRADE}</div>
        <div style="text-align: center; font-size: 24px; margin: 20px 0;">
            Success Rate: ${SUCCESS_RATE}% (${TESTS_PASSED}/${TOTAL_TESTS} test suites passed)
        </div>
    </div>

    <div class="section">
        <h2>🎯 Test Suite Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Suite</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Unit Tests</td>
                    <td>$([ "$UNIT_TESTS_PASSED" = true ] && echo '<span class="status-passed">✅ PASSED</span>' || echo '<span class="status-failed">❌ FAILED</span>')</td>
                    <td>${unit_duration:-0}s</td>
                    <td>$([ "$UNIT_TESTS_PASSED" = true ] && echo 'All unit tests with coverage analysis' || echo 'Check unit test logs for details')</td>
                </tr>
                <tr>
                    <td>Integration Tests</td>
                    <td>$([ "$INTEGRATION_TESTS_PASSED" = true ] && echo '<span class="status-passed">✅ PASSED</span>' || echo '<span class="status-failed">❌ FAILED</span>')</td>
                    <td>${integration_duration:-0}s</td>
                    <td>$([ "$INTEGRATION_TESTS_PASSED" = true ] && echo 'Database and cache integration verified' || echo 'Integration failures detected')</td>
                </tr>
                <tr>
                    <td>E2E Tests</td>
                    <td>$([ "$E2E_TESTS_PASSED" = true ] && echo '<span class="status-passed">✅ PASSED</span>' || echo '<span class="status-failed">❌ FAILED</span>')</td>
                    <td>${e2e_duration:-0}s</td>
                    <td>$([ "$E2E_TESTS_PASSED" = true ] && echo 'Multi-browser end-to-end functionality verified' || echo 'E2E test failures detected')</td>
                </tr>
                <tr>
                    <td>Security Tests</td>
                    <td>$([ "$SECURITY_TESTS_PASSED" = true ] && echo '<span class="status-passed">✅ PASSED</span>' || echo '<span class="status-failed">❌ FAILED</span>')</td>
                    <td>${security_duration:-0}s</td>
                    <td>$([ "$SECURITY_TESTS_PASSED" = true ] && echo 'Vulnerability scans and security tests passed' || echo 'Security issues detected')</td>
                </tr>
                <tr>
                    <td>Load Tests</td>
                    <td>$([ "$LOAD_TESTS_PASSED" = true ] && echo '<span class="status-passed">✅ PASSED</span>' || echo '<span class="status-failed">❌ FAILED</span>')</td>
                    <td>${load_duration:-0}s</td>
                    <td>$([ "$LOAD_TESTS_PASSED" = true ] && echo 'Performance benchmarks met' || echo 'Performance issues detected')</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>📈 Performance Metrics</h2>
        $(if [ -f "${TEST_RESULTS_DIR}/unit/coverage-summary.json" ]; then echo '<div class="metric"><strong>Code Coverage:</strong> Lines: $(node -e "console.log(require('./${TEST_RESULTS_DIR}/unit/coverage-summary.json').total.lines.pct)")%</div>'; fi)
        $(if [ -n "${RPS:-}" ]; then echo '<div class="metric"><strong>Load Test RPS:</strong> ${RPS}</div>'; fi)
        $(if [ -n "${LATENCY:-}" ]; then echo '<div class="metric"><strong>Avg Latency:</strong> ${LATENCY}ms</div>'; fi)
        <div class="metric"><strong>Total Test Duration:</strong> ${TOTAL_DURATION}s</div>
    </div>

    <div class="section">
        <h2>📂 Detailed Reports</h2>
        <ul>
            <li><a href="../unit/lcov-report/index.html">Unit Test Coverage Report</a></li>
            <li><a href="../e2e/playwright-report/index.html">E2E Test Results</a></li>
            <li><a href="../security/vulnerability-scan.log">Security Scan Results</a></li>
            <li><a href="../load/load-test-output.log">Load Test Details</a></li>
        </ul>
    </div>

    <div class="section">
        <h2>🔧 Recommendations</h2>
        <ul>
            $([ "$UNIT_TESTS_PASSED" = false ] && echo '<li class="error">❌ Fix failing unit tests before deployment</li>')
            $([ "$INTEGRATION_TESTS_PASSED" = false ] && echo '<li class="error">❌ Resolve integration test failures</li>')
            $([ "$E2E_TESTS_PASSED" = false ] && echo '<li class="error">❌ Address E2E test issues</li>')
            $([ "$SECURITY_TESTS_PASSED" = false ] && echo '<li class="warning">⚠️ Review security scan results and address vulnerabilities</li>')
            $([ "$LOAD_TESTS_PASSED" = false ] && echo '<li class="warning">⚠️ Optimize performance based on load test results</li>')
            $([ $SUCCESS_RATE -ge 90 ] && echo '<li class="success">✅ Excellent test coverage - ready for production deployment</li>')
            $([ $SUCCESS_RATE -ge 80 ] && [ $SUCCESS_RATE -lt 90 ] && echo '<li class="warning">⚠️ Good test coverage - address remaining issues before deployment</li>')
            $([ $SUCCESS_RATE -lt 80 ] && echo '<li class="error">❌ Test coverage needs improvement - do not deploy until issues are resolved</li>')
        </ul>
    </div>

    <footer style="text-align: center; margin-top: 40px; padding: 20px; color: #6b7280;">
        <p>Report generated by Smart Search Test Suite Runner v2.0</p>
        <p>For support, contact the QA team or check the testing documentation</p>
    </footer>
</body>
</html>
EOF

# Generate JSON report for CI/CD integration
cat > ${TEST_RESULTS_DIR}/reports/test-results.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "${ENVIRONMENT}",
  "duration": ${TOTAL_DURATION},
  "overall": {
    "grade": "${OVERALL_GRADE}",
    "successRate": ${SUCCESS_RATE},
    "testsPassed": ${TESTS_PASSED},
    "totalTests": ${TOTAL_TESTS}
  },
  "suites": {
    "unit": {
      "passed": ${UNIT_TESTS_PASSED},
      "duration": ${unit_duration:-0}
    },
    "integration": {
      "passed": ${INTEGRATION_TESTS_PASSED},
      "duration": ${integration_duration:-0}
    },
    "e2e": {
      "passed": ${E2E_TESTS_PASSED},
      "duration": ${e2e_duration:-0}
    },
    "security": {
      "passed": ${SECURITY_TESTS_PASSED},
      "duration": ${security_duration:-0}
    },
    "load": {
      "passed": ${LOAD_TESTS_PASSED},
      "duration": ${load_duration:-0}
    }
  }
}
EOF

# Generate summary CSV for analysis
cat > ${TEST_RESULTS_DIR}/reports/test-summary.csv << EOF
test_suite,status,duration_seconds,details
unit,$([ "$UNIT_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED"),${unit_duration:-0},Unit tests with coverage
integration,$([ "$INTEGRATION_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED"),${integration_duration:-0},Database and cache integration
e2e,$([ "$E2E_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED"),${e2e_duration:-0},Multi-browser end-to-end tests
security,$([ "$SECURITY_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED"),${security_duration:-0},Security and vulnerability tests
load,$([ "$LOAD_TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED"),${load_duration:-0},Performance and load tests
EOF

log_success "Comprehensive test reports generated"

# Phase 8: Final Summary and Recommendations
echo ""
echo -e "${GRADE_COLOR}🎯 TEST SUITE EXECUTION COMPLETE! 🎯${NC}"
echo "======================================="
echo ""
echo -e "📊 **OVERALL GRADE:** ${GRADE_COLOR}${OVERALL_GRADE} (${SUCCESS_RATE}% Success Rate)${NC}"
echo ""
echo "📋 Test Results Summary:"
echo "   🧪 Unit Tests: $([ "$UNIT_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}") (${unit_duration:-0}s)"
echo "   🔗 Integration Tests: $([ "$INTEGRATION_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}") (${integration_duration:-0}s)"
echo "   🌐 E2E Tests: $([ "$E2E_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}") (${e2e_duration:-0}s)"
echo "   🔒 Security Tests: $([ "$SECURITY_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}") (${security_duration:-0}s)"
echo "   ⚡ Load Tests: $([ "$LOAD_TESTS_PASSED" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}") (${load_duration:-0}s)"
echo ""
echo "⏱️  Total Execution Time: ${TOTAL_DURATION}s"

if [ -f "${TEST_RESULTS_DIR}/unit/coverage-summary.json" ]; then
    COVERAGE_DATA=$(node -e "
        const summary = require('./${TEST_RESULTS_DIR}/unit/coverage-summary.json');
        const total = summary.total;
        console.log(\`📊 Code Coverage: \${total.lines.pct}% lines, \${total.functions.pct}% functions, \${total.branches.pct}% branches\`);
    ")
    echo "   ${COVERAGE_DATA}"
fi

echo ""
echo "📂 Detailed Reports:"
echo "   📊 HTML Report: ${TEST_RESULTS_DIR}/reports/test-report.html"
echo "   📄 JSON Results: ${TEST_RESULTS_DIR}/reports/test-results.json"
echo "   📈 CSV Summary: ${TEST_RESULTS_DIR}/reports/test-summary.csv"
if [ -d "${TEST_RESULTS_DIR}/unit/lcov-report" ]; then
    echo "   📋 Coverage Report: ${TEST_RESULTS_DIR}/unit/lcov-report/index.html"
fi
if [ -d "${TEST_RESULTS_DIR}/e2e/playwright-report" ]; then
    echo "   🎭 E2E Report: ${TEST_RESULTS_DIR}/e2e/playwright-report/index.html"
fi

echo ""
echo "🎯 Quality Assessment:"
if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "   ${GREEN}✅ EXCELLENT: Ready for production deployment${NC}"
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "   ${YELLOW}⚠️  GOOD: Address remaining issues before deployment${NC}"
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "   ${YELLOW}⚠️  FAIR: Significant improvements needed${NC}"
else
    echo -e "   ${RED}❌ POOR: Major issues must be resolved before deployment${NC}"
fi

echo ""
echo "🚀 Recommended Next Steps:"
if [ "$UNIT_TESTS_PASSED" = false ]; then
    echo "   1. 🔧 Fix failing unit tests (critical)"
fi
if [ "$INTEGRATION_TESTS_PASSED" = false ]; then
    echo "   2. 🔧 Resolve integration test issues (critical)"
fi
if [ "$E2E_TESTS_PASSED" = false ]; then
    echo "   3. 🔧 Address E2E test failures (critical)"
fi
if [ "$SECURITY_TESTS_PASSED" = false ]; then
    echo "   4. 🔒 Review and fix security vulnerabilities (high priority)"
fi
if [ "$LOAD_TESTS_PASSED" = false ]; then
    echo "   5. ⚡ Optimize performance based on load test results"
fi

if [ $SUCCESS_RATE -ge 90 ]; then
    echo "   1. 📈 Set up continuous monitoring"
    echo "   2. 🚀 Deploy to staging environment"
    echo "   3. 📊 Configure production alerts"
fi

echo "   • 📊 Open HTML report: open ${TEST_RESULTS_DIR}/reports/test-report.html"
echo "   • 🔍 Review detailed logs in ${TEST_RESULTS_DIR}/ subdirectories"
echo "   • 🔄 Re-run specific test suites as needed"

echo ""
log_success "Comprehensive testing pipeline completed! 🎯"

# Clean up test infrastructure
log_info "Cleaning up test infrastructure..."
docker-compose -f docker-compose.test.yml down > /dev/null 2>&1 || true

# Exit with appropriate code
if [ $SUCCESS_RATE -ge 80 ]; then
    exit 0
else
    exit 1
fi