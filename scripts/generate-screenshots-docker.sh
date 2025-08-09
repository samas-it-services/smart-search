#!/bin/bash

# @samas/smart-search - Docker-Integrated Screenshot Generator
# Automatically starts Docker services, waits for health, and generates screenshots

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"
SCREENSHOTS_DIR="$PROJECT_ROOT/screenshots"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Screenshot-specific port assignments (isolated from showcases)
SCREENSHOT_PORTS=(
    "postgres-redis:8100"
    "mysql-dragonfly:8200"
    "mongodb-memcached:8300"
)

# Function to get screenshot port for provider
get_screenshot_port() {
    local provider=$1
    for port_config in "${SCREENSHOT_PORTS[@]}"; do
        if [[ "$port_config" == "$provider:"* ]]; then
            echo "${port_config#*:}"
            return 0
        fi
    done
    echo "8100"  # Default fallback
}

# Function to check if port is available
check_port_available() {
    local port="$1"
    if lsof -i :$port >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to find available screenshot port
find_available_screenshot_port() {
    local provider="$1"
    local base_port=$(get_screenshot_port "$provider")
    
    # Try base port first
    if check_port_available "$base_port"; then
        echo "$base_port"
        return 0
    fi
    
    # Try ports in range base_port to base_port+99
    for (( port=$base_port; port<=$(($base_port + 99)); port++ )); do
        if check_port_available "$port"; then
            echo "$port"
            return 0
        fi
    done
    
    print_error "No available ports in range $base_port-$(($base_port + 99)) for $provider"
    return 1
}

# Function to cleanup existing screenshot containers
cleanup_screenshot_containers() {
    print_step "Cleaning up any existing screenshot containers..."
    
    # Stop and remove any existing containers with screenshot naming pattern
    local containers=$(docker ps -a --filter "name=smart-search-.*screenshot" --format "{{.Names}}" 2>/dev/null || true)
    
    if [[ -n "$containers" ]]; then
        print_warning "Found existing screenshot containers:"
        echo "$containers" | sed 's/^/  • /'
        echo "$containers" | xargs -I {} docker stop {} 2>/dev/null || true
        echo "$containers" | xargs -I {} docker rm {} 2>/dev/null || true
        print_status "Cleaned up existing screenshot containers"
    else
        print_status "No existing screenshot containers to clean up"
    fi
    
    # Also clean up any showcase containers that might conflict
    local showcase_containers=$(docker ps -a --filter "name=smart-search-showcase-" --format "{{.Names}}" 2>/dev/null || true)
    if [[ -n "$showcase_containers" ]]; then
        print_warning "Found conflicting showcase containers, stopping them temporarily:"
        echo "$showcase_containers" | sed 's/^/  • /'
        echo "$showcase_containers" | xargs -I {} docker stop {} 2>/dev/null || true
        echo "$showcase_containers" | xargs -I {} docker rm {} 2>/dev/null || true
    fi
    
    # Clean up networks
    docker network prune -f >/dev/null 2>&1 || true
}

# Function to get search queries for showcase
get_search_queries() {
    local showcase=$1
    case $showcase in
        postgres-redis)
            echo "diabetes,cardiac surgery,immunotherapy,mental health,medical research"
            ;;
        mysql-dragonfly)
            echo "portfolio management,risk assessment,cryptocurrency,derivatives trading,market analysis"
            ;;
        mongodb-memcached)
            echo "customer analytics,inventory management,omnichannel,personalization,product catalog"
            ;;
        deltalake-redis)
            echo "AAPL,financial analytics,market volatility,sector analysis,time travel query"
            ;;
        *)
            echo "search,performance,analytics"
            ;;
    esac
}

# List of available showcases
SHOWCASE_LIST="postgres-redis mysql-dragonfly mongodb-memcached deltalake-redis"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to create screenshot environment file
create_screenshot_env_file() {
    local provider="$1"
    local dataset="${2:-healthcare}"
    local data_size="${3:-medium}"
    
    local port=$(find_available_screenshot_port "$provider")
    if [[ $? -ne 0 ]]; then
        print_error "Cannot find available port for screenshots"
        return 1
    fi
    
    local env_file="$PROJECT_ROOT/docker/envs/screenshot-${provider}-${dataset}-${data_size}.env"
    mkdir -p "$(dirname "$env_file")"
    
    cat > "$env_file" << EOF
# Screenshot generation environment: ${provider}-${dataset}-${data_size}
PROVIDER_COMBO=screenshot-${provider}-${dataset}-${data_size}
SHOWCASE_TYPE=${provider}
DATASET=${dataset}
DATA_SIZE=${data_size}

# Screenshot-specific port assignments
SHOWCASE_PORT=${port}
EOF

    # Add database port
    case "$provider" in
        "postgres-redis")
            echo "POSTGRES_PORT=$((port + 1))" >> "$env_file"
            echo "REDIS_PORT=$((port + 2))" >> "$env_file"
            echo "DATABASE_URL=postgresql://user:password@postgres:5432/smartsearch" >> "$env_file"
            echo "CACHE_URL=redis://redis:6379" >> "$env_file"
            ;;
        "mysql-dragonfly")
            echo "MYSQL_PORT=$((port + 1))" >> "$env_file"
            echo "DRAGONFLY_PORT=$((port + 2))" >> "$env_file" 
            echo "DATABASE_URL=mysql://user:password@mysql:3306/smartsearch" >> "$env_file"
            echo "CACHE_URL=redis://dragonfly:6379" >> "$env_file"
            ;;
        "mongodb-memcached")
            echo "MONGODB_PORT=$((port + 1))" >> "$env_file"
            echo "MEMCACHED_PORT=$((port + 2))" >> "$env_file"
            echo "DATABASE_URL=mongodb://root:password@mongodb:27017/smartsearch" >> "$env_file"
            echo "CACHE_URL=memcached://memcached:11211" >> "$env_file"
            ;;
    esac
    
    echo "$env_file"
}

# Function to start Docker services for a showcase  
start_showcase_services() {
    local provider=$1
    local dataset="${2:-healthcare}"
    local data_size="${DATA_SIZE:-medium}"
    
    # Validate provider
    case "$provider" in
        postgres-redis|mysql-dragonfly|mongodb-memcached)
            ;;
        *)
            print_error "Unknown provider: $provider"
            print_error "Available providers: postgres-redis, mysql-dragonfly, mongodb-memcached"
            return 1
            ;;
    esac
    
    # Cleanup first
    cleanup_screenshot_containers
    
    print_step "Creating screenshot environment for $provider with $data_size $dataset dataset..."
    
    # Create screenshot-specific environment file
    local env_file=$(create_screenshot_env_file "$provider" "$dataset" "$data_size")
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    print_status "Created environment file: $env_file"
    
    # Get port from env file  
    local port=$(grep SHOWCASE_PORT "$env_file" | cut -d= -f2)
    
    print_step "Starting $provider services for screenshots on port $port..."
    
    cd "$PROJECT_ROOT"
    
    # Start services using the new base + provider approach
    docker-compose \
        -f docker/base.docker-compose.yml \
        -f docker/${provider}.yml \
        --env-file "$env_file" \
        up -d --remove-orphans
    
    print_step "Waiting for $provider showcase to be healthy on port $port..."
    
    # Wait for showcase to be ready (up to 5 minutes)
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:$port/api/health" >/dev/null 2>&1; then
            print_status "$provider is healthy and ready for screenshots!"
            echo "$port"  # Return the port for use by screenshot generation
            return 0
        fi
        
        if [ $((attempt % 10)) -eq 0 ]; then
            print_step "Still waiting for $provider... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 5
        ((attempt++))
    done
    
    print_error "$provider failed to start within $(($max_attempts * 5)) seconds"
    print_warning "Checking container logs..."
    docker-compose \
        -f docker/base.docker-compose.yml \
        -f docker/${provider}.yml \
        --env-file "$env_file" \
        logs --tail=20
    return 1
}

# Function to stop Docker services for a showcase
stop_showcase_services() {
    local provider=$1
    local dataset="${2:-healthcare}" 
    local data_size="${DATA_SIZE:-medium}"
    
    # Validate provider
    case "$provider" in
        postgres-redis|mysql-dragonfly|mongodb-memcached)
            ;;
        *)
            print_error "Unknown provider: $provider"
            return 1
            ;;
    esac
    
    print_step "Stopping screenshot services for $provider..."
    
    # Find the screenshot environment file
    local env_file="$PROJECT_ROOT/docker/envs/screenshot-${provider}-${dataset}-${data_size}.env"
    
    if [ -f "$env_file" ]; then
        cd "$PROJECT_ROOT"
        docker-compose \
            -f docker/base.docker-compose.yml \
            -f docker/${provider}.yml \
            --env-file "$env_file" \
            down --remove-orphans
        
        # Remove the environment file
        rm -f "$env_file"
    else
        # Fallback: stop any screenshot-related containers
        local containers=$(docker ps -a --filter "name=smart-search-.*screenshot" --format "{{.Names}}" 2>/dev/null || true)
        if [[ -n "$containers" ]]; then
            echo "$containers" | xargs -I {} docker stop {} 2>/dev/null || true
            echo "$containers" | xargs -I {} docker rm {} 2>/dev/null || true
        fi
    fi
}

# Function to seed data before screenshots
seed_showcase_data() {
    local showcase=$1
    local data_size="${DATA_SIZE:-medium}"
    
    print_step "Seeding data for $showcase with $data_size dataset..."
    
    case $showcase in
        postgres-redis)
            "$SCRIPT_DIR/download-data.sh" healthcare "$data_size"
            "$SCRIPT_DIR/seed-data.sh" healthcare "$data_size" postgres
            "$SCRIPT_DIR/seed-data.sh" healthcare "$data_size" redis
            ;;
        mysql-dragonfly)
            "$SCRIPT_DIR/download-data.sh" finance "$data_size"
            "$SCRIPT_DIR/seed-data.sh" finance "$data_size" mysql
            # DragonflyDB uses Redis protocol, so seed as redis
            "$SCRIPT_DIR/seed-data.sh" finance "$data_size" redis
            ;;
        mongodb-memcached)
            "$SCRIPT_DIR/download-data.sh" retail "$data_size"
            "$SCRIPT_DIR/seed-data.sh" retail "$data_size" mongodb
            ;;
        deltalake-redis)
            # Delta Lake uses larger datasets by default
            local delta_size="${data_size}"
            if [ "$data_size" = "tiny" ]; then delta_size="small"; fi
            "$SCRIPT_DIR/download-data.sh" finance "$delta_size"
            # Delta Lake will be seeded by the processor service
            print_status "Delta Lake data ($delta_size) will be processed by the Delta processor service"
            ;;
    esac
}

# Function to generate screenshots for a showcase
generate_showcase_screenshots() {
    local provider=$1
    local dataset="${2:-healthcare}"
    local data_size="${DATA_SIZE:-medium}"
    
    # Validate provider
    case "$provider" in
        postgres-redis|mysql-dragonfly|mongodb-memcached)
            ;;
        *)
            print_error "Unknown provider: $provider"
            return 1
            ;;
    esac
    
    # Start services and get port
    local port=$(start_showcase_services "$provider" "$dataset" "$data_size")
    
    if [[ $? -ne 0 || -z "$port" ]]; then
        print_error "Failed to start services for $provider"
        return 1
    fi
    
    # Get provider display name
    local name
    case "$provider" in
        postgres-redis)
            name="PostgreSQL + Redis - Healthcare"
            ;;
        mysql-dragonfly)  
            name="MySQL + DragonflyDB - Finance"
            ;;
        mongodb-memcached)
            name="MongoDB + Memcached - Retail"
            ;;
    esac
    
    print_header "Generating Screenshots for $name"
    
    # Create screenshot directory
    # Get data size from environment variable, default to medium
    local data_size="${DATA_SIZE:-medium}"
    local screenshot_dir="$SCREENSHOTS_DIR/blog/$showcase/$data_size"
    mkdir -p "$screenshot_dir"
    
    # Start services
    if ! start_showcase_services "$showcase"; then
        print_error "Failed to start services for $showcase"
        return 1
    fi
    
    # Seed data
    seed_showcase_data "$showcase"
    
    # Wait additional time for data to be fully loaded
    print_step "Waiting for data to be fully loaded..."
    sleep 30
    
    # Generate screenshots using Node.js script
    print_step "Launching Playwright to capture screenshots..."
    
    # Create a temporary Node.js script for this showcase
    local temp_script="/tmp/screenshot_${showcase}.js"
    cat > "$temp_script" << EOF
const { chromium } = require('playwright');

async function generateScreenshots() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    
    try {
        console.log('📡 Connecting to http://localhost:$port...');
        
        // Navigate and wait for load
        await page.goto('http://localhost:$port', { waitUntil: 'networkidle' });
        await page.waitForSelector('body', { state: 'visible' });
        
        let screenshotIndex = 1;
        
        // Homepage screenshot
        console.log('📸 Taking homepage screenshot...');
        await page.screenshot({ 
            path: \`$screenshot_dir/\${screenshotIndex.toString().padStart(2, '0')}-homepage-overview.png\`,
            fullPage: true
        });
        screenshotIndex++;
        
        // Wait for search input to be available
        await page.waitForSelector('#searchInput', { state: 'visible', timeout: 10000 });
        
        // Multi-Strategy Search screenshots
        const queries = '$(get_search_queries "$showcase")'.split(',');
        const strategies = [
            { value: 'cache-first', name: 'Cache-First', icon: '⚡' },
            { value: 'database-only', name: 'Database-Only', icon: '🗄️' },
            { value: 'circuit-breaker', name: 'Circuit-Breaker', icon: '🔧' },
            { value: 'hybrid', name: 'Hybrid', icon: '🤖' }
        ];
        
        for (const strategy of strategies) {
            console.log(\`📸 Taking strategy screenshots for \${strategy.icon} \${strategy.name}...\`);
            
            // Create strategy-specific directory
            const strategyDir = \`$screenshot_dir/\${strategy.value}\`;
            const fs = require('fs');
            if (!fs.existsSync(strategyDir)) {
                fs.mkdirSync(strategyDir, { recursive: true });
            }
            
            for (const query of queries) {
                console.log(\`📸 Taking "\${query}" with \${strategy.name} strategy...\`);
                
                // Select strategy from dropdown
                await page.selectOption('#strategySelector', strategy.value);
                await page.fill('#searchInput', query);
                await page.click('#searchBtn');
                
                // Wait for results or no results
                try {
                    await page.waitForSelector('#resultsSection', { state: 'visible', timeout: 15000 });
                    await page.waitForTimeout(3000); // Let results and strategy indicators fully render
                } catch (error) {
                    console.log(\`⚠️ No results section for "\${query}", continuing...\`);
                }
                
                // Take strategy-specific screenshot
                await page.screenshot({ 
                    path: \`\${strategyDir}/search-\${query.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-\${strategy.value}.png\`,
                    fullPage: true
                });
                
                // Take performance info screenshot for this strategy
                const performanceInfo = page.locator('#performanceInfo');
                if (await performanceInfo.isVisible()) {
                    await performanceInfo.screenshot({ 
                        path: \`\${strategyDir}/performance-\${query.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-\${strategy.value}.png\`
                    });
                }
            }
            
            // Take a general strategy overview screenshot (with strategy dropdown visible)
            await page.screenshot({ 
                path: \`\${strategyDir}/strategy-overview-\${strategy.value}.png\`,
                fullPage: true
            });
        }
        
        // General performance stats screenshot (using default strategy)
        console.log('📸 Taking general performance stats screenshot...');
        await page.selectOption('#strategySelector', 'cache-first'); // Use default strategy
        await page.fill('#searchInput', 'performance metrics');
        await page.click('#searchBtn');
        
        try {
            await page.waitForSelector('#statsSection', { state: 'visible' });
            await page.waitForTimeout(3000); // Let stats load
            
            const statsSection = page.locator('#statsSection');
            await statsSection.screenshot({ 
                path: \`$screenshot_dir/general-performance-stats.png\`
            });
        } catch (error) {
            console.log('⚠️ Stats section not available');
        }
        
        // Mobile screenshots with strategy comparison
        console.log('📸 Taking mobile screenshots with strategy comparison...');
        await page.setViewportSize({ width: 375, height: 667 });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('#searchInput', { state: 'visible' });
        
        // Mobile homepage
        await page.screenshot({ 
            path: \`$screenshot_dir/mobile-homepage.png\`,
            fullPage: true
        });
        
        // Mobile strategy comparison
        for (const strategy of [strategies[0], strategies[1]]) { // Just cache-first and database-only for mobile
            await page.selectOption('#strategySelector', strategy.value);
            await page.fill('#searchInput', 'diabetes');
            await page.click('#searchBtn');
            
            try {
                await page.waitForSelector('#resultsSection', { state: 'visible', timeout: 10000 });
                await page.waitForTimeout(2000);
                
                await page.screenshot({ 
                    path: \`$screenshot_dir/mobile-\${strategy.value}-results.png\`,
                    fullPage: true
                });
            } catch (error) {
                console.log(\`⚠️ Mobile results not available for \${strategy.name}\`);
            }
        }
        
        console.log('📊 Multi-strategy screenshot generation completed!');
        console.log(\`📁 Screenshots saved in strategy-specific folders:\`);
        for (const strategy of strategies) {
            console.log(\`   - \${strategy.icon} \${strategy.name}: $screenshot_dir/\${strategy.value}/\`);
        }
        
        console.log('✅ Screenshots completed successfully!');
        
    } catch (error) {
        console.error('❌ Screenshot generation failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

generateScreenshots().catch(console.error);
EOF
    
    # Run the screenshot script
    if command -v node >/dev/null 2>&1; then
        cd "$PROJECT_ROOT"  # Run from project root where node_modules is available
        NODE_PATH="$PROJECT_ROOT/node_modules" node "$temp_script"
        rm "$temp_script"
        
        print_status "Screenshots saved to $screenshot_dir/"
        ls -la "$screenshot_dir/"
    else
        print_warning "Node.js or Playwright not available. Using Python alternative..."
        
        # Fallback to Python with selenium (if available)
        python3 -c "
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--window-size=1200,800')

try:
    driver = webdriver.Chrome(options=options)
    driver.get('http://localhost:$port')
    time.sleep(5)
    driver.save_screenshot('$screenshot_dir/01-homepage-selenium.png')
    print('✅ Basic screenshot captured with Selenium')
    driver.quit()
except Exception as e:
    print(f'⚠️ Selenium fallback failed: {e}')
" 2>/dev/null || print_warning "Python Selenium also not available"
    fi
    
    # Clean up services
    if [ "$KEEP_SERVICES_RUNNING" != "true" ]; then
        stop_showcase_services "$provider" "$dataset" "$data_size"
    fi
    
    return 0
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [provider] [options]"
    echo ""
    echo "Providers:"
    for provider in $SHOWCASE_LIST; do
        local port=$(get_screenshot_port "$provider")
        local name
        case "$provider" in
            postgres-redis)
                name="PostgreSQL + Redis - Healthcare"
                ;;
            mysql-dragonfly)  
                name="MySQL + DragonflyDB - Finance"
                ;;
            mongodb-memcached)
                name="MongoDB + Memcached - Retail"
                ;;
            *)
                name="Unknown Provider"
                ;;
        esac
        echo "  $provider - $name (port $port+)"
    done
    echo "  all - Generate screenshots for all providers"
    echo ""
    echo "Options:"
    echo "  --keep-services    Keep Docker services running after screenshots"
    echo "  --no-seed         Skip data seeding step"
    echo ""
    echo "Examples:"
    echo "  $0 postgres-redis"
    echo "  $0 deltalake-redis --keep-services"
    echo "  $0 all"
}

# Main execution
main() {
    print_header "Smart Search Docker Screenshot Generator"
    
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 0
    fi
    
    local showcase=$1
    shift
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --keep-services)
                export KEEP_SERVICES_RUNNING=true
                ;;
            --no-seed)
                export SKIP_SEEDING=true
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
    
    check_docker
    
    if [ "$showcase" = "all" ]; then
        print_status "Generating screenshots for all providers..."
        
        for provider in $SHOWCASE_LIST; do
            echo ""
            generate_showcase_screenshots "$provider"
        done
        
    elif [[ " $SHOWCASE_LIST " == *" $showcase "* ]]; then
        generate_showcase_screenshots "$showcase"
        
    else
        print_error "Unknown showcase: $showcase"
        echo ""
        show_usage
        exit 1
    fi
    
    print_header "Screenshot Generation Complete!"
    print_status "Screenshots are available in $SCREENSHOTS_DIR/blog/"
    
    if [ "$KEEP_SERVICES_RUNNING" = "true" ]; then
        print_status "Docker services are still running. Use docker-compose down to stop them."
    fi
}

# Only run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi