#!/bin/bash

# @samas/smart-search - Showcase Testing Script
# Run Playwright tests for showcases and generate blog post screenshots

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed. Please install Node.js and try again."
        exit 1
    fi
    
    # Check if npm packages are installed
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        print_error "Dependencies not installed. Run 'npm install' first."
        exit 1
    fi
    
    # Check if Playwright is installed
    if [ ! -d "$PROJECT_ROOT/node_modules/@playwright" ]; then
        print_status "Installing Playwright..."
        cd "$PROJECT_ROOT"
        npm install --save-dev @playwright/test
        npx playwright install
    fi
    
    # Check if Smart Search is built
    if [ ! -d "$PROJECT_ROOT/dist" ]; then
        print_status "Building Smart Search library..."
        cd "$PROJECT_ROOT"
        npm run build
    fi
}

# Function to install Playwright
install_playwright() {
    print_header "Installing Playwright"
    cd "$PROJECT_ROOT"
    
    print_status "Installing Playwright test runner..."
    npm install --save-dev @playwright/test
    
    print_status "Installing browser binaries..."
    npx playwright install
    
    print_status "Installing system dependencies..."
    npx playwright install-deps
    
    print_status "✅ Playwright installation complete"
}

# Function to run all tests
run_tests() {
    local showcase=${1:-"all"}
    
    print_header "Running Showcase Tests: $showcase"
    check_prerequisites
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export CI=false
    export PWDEBUG=0
    
    if [ "$showcase" = "all" ]; then
        print_status "Running all showcase tests..."
        npx playwright test --config=playwright.config.js
    else
        print_status "Running tests for $showcase showcase..."
        npx playwright test --config=playwright.config.js --grep "$showcase"
    fi
}

# Function to run tests with UI
run_tests_ui() {
    local showcase=${1:-"all"}
    
    print_header "Running Showcase Tests with UI: $showcase"
    check_prerequisites
    
    cd "$PROJECT_ROOT"
    
    if [ "$showcase" = "all" ]; then
        print_status "Running all showcase tests with UI..."
        npx playwright test --config=playwright.config.js --ui
    else
        print_status "Running tests for $showcase showcase with UI..."
        npx playwright test --config=playwright.config.js --grep "$showcase" --ui
    fi
}

# Function to generate blog screenshots
generate_screenshots() {
    local showcase=${1:-"postgres-redis"}
    
    print_header "Generating Blog Post Screenshots: $showcase"
    check_prerequisites
    
    cd "$PROJECT_ROOT"
    
    print_status "Starting showcase application..."
    # Make sure Docker services are running
    ./scripts/docker-dev.sh start
    
    print_status "Generating screenshots for $showcase..."
    
    # Use our enhanced screenshot generator
    node generate-screenshots.js "$showcase"
    
    # List generated screenshots
    local screenshot_dir="screenshots/blog/$showcase"
    if [ -d "$screenshot_dir" ]; then
        print_status "Generated screenshots:"
        ls -la "$screenshot_dir"/ | grep ".png" | while read line; do
            filename=$(echo $line | awk '{print $9}')
            size=$(echo $line | awk '{print $5}')
            echo "  📸 $filename (${size} bytes)"
        done
        
        print_status "Screenshots location: $screenshot_dir/"
    else
        print_warning "No screenshots directory found at $screenshot_dir/"
        
        # Check if old screenshots exist in screenshots/blog/
        if [ -d "screenshots/blog" ] && [ "$(ls -A screenshots/blog/)" ]; then
            print_status "Found screenshots in screenshots/blog/:"
            ls -la screenshots/blog/ | grep ".png" | while read line; do
                filename=$(echo $line | awk '{print $9}')
                size=$(echo $line | awk '{print $5}')
                echo "  📸 $filename (${size} bytes)"
            done
        fi
    fi
}

# Function to run performance tests
run_performance() {
    local showcase=${1:-"postgres-redis"}
    
    print_header "Running Performance Tests: $showcase"
    check_prerequisites
    
    cd "$PROJECT_ROOT"
    
    # Set performance testing environment
    export BENCHMARK_MODE=true
    export CONCURRENT_USERS=5
    export TEST_DURATION=30
    
    print_status "Running performance tests..."
    npx playwright test --config=playwright.config.js --grep "performance" --workers=1
    
    print_status "Performance test complete. Check test results for metrics."
}

# Function to debug tests
debug_tests() {
    local showcase=${1:-"postgres-redis"}
    
    print_header "Debugging Tests: $showcase"
    check_prerequisites
    
    cd "$PROJECT_ROOT"
    
    print_status "Starting debug mode..."
    print_status "Browser will open for interactive debugging"
    
    export PWDEBUG=1
    npx playwright test --config=playwright.config.js --grep "$showcase" --debug
}

# Function to show test report
show_report() {
    print_header "Opening Test Report"
    cd "$PROJECT_ROOT"
    
    if [ -d "playwright-report" ]; then
        print_status "Opening HTML test report..."
        npx playwright show-report
    else
        print_error "No test report found. Run tests first with 'test' command."
    fi
}

# Function to clean test artifacts
clean() {
    print_header "Cleaning Test Artifacts"
    cd "$PROJECT_ROOT"
    
    print_status "Removing test results..."
    rm -rf test-results/
    rm -rf playwright-report/
    rm -rf screenshots/
    
    print_status "Test artifacts cleaned."
}

# Main script logic
case "${1:-}" in
    "install")
        install_playwright
        ;;
    "test")
        run_tests "$2"
        ;;
    "test-ui")
        run_tests_ui "$2"
        ;;
    "screenshots")
        generate_screenshots "$2"
        ;;
    "performance")
        run_performance "$2"
        ;;
    "debug")
        debug_tests "$2"
        ;;
    "report")
        show_report
        ;;
    "clean")
        clean
        ;;
    "help"|"--help"|"-h")
        echo "Smart Search Showcase Testing Tool"
        echo ""
        echo "Usage: $0 <command> [showcase]"
        echo ""
        echo "Commands:"
        echo "  install              Install Playwright and dependencies"
        echo "  test [showcase]      Run tests (default: all showcases)"
        echo "  test-ui [showcase]   Run tests with interactive UI"
        echo "  screenshots [showcase]  Generate blog post screenshots"
        echo "  performance [showcase]  Run performance benchmarks"
        echo "  debug [showcase]     Run tests in debug mode"
        echo "  report               Open HTML test report"
        echo "  clean                Clean test artifacts"
        echo "  help                 Show this help message"
        echo ""
        echo "Showcases:"
        echo "  postgres-redis       PostgreSQL + Redis showcase (default)"
        echo "  mysql-dragonfly      MySQL + DragonflyDB showcase (coming soon)"
        echo "  mongodb-memcached    MongoDB + Memcached showcase (coming soon)"
        echo "  all                  All available showcases"
        echo ""
        echo "Examples:"
        echo "  $0 install"
        echo "  $0 test postgres-redis"
        echo "  $0 screenshots postgres-redis"
        echo "  $0 test-ui"
        echo "  $0 performance postgres-redis"
        echo ""
        echo "Environment Variables:"
        echo "  HEADLESS=false       Run tests with visible browser"
        echo "  SLOW_MO=1000        Slow down actions for debugging"
        echo "  PWDEBUG=1           Enable Playwright debug mode"
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        print_status "Use '$0 help' for usage information."
        exit 1
        ;;
esac