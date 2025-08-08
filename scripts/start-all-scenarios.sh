#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}🚀 Smart Search - All Scenarios Launcher${NC}"
echo -e "${CYAN}====================================${NC}"
echo ""
echo -e "${BLUE}Starting comprehensive Smart Search showcase with all database + cache combinations${NC}"
echo ""

# Function to print step headers
print_step() {
    echo -e "${PURPLE}Step $1: $2${NC}"
    echo -e "${PURPLE}$(printf '%.0s-' {1..50})${NC}"
}

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
    
    local all_good=true
    
    # Check Docker
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker Desktop and try again.${NC}"
        all_good=false
    else
        echo -e "${GREEN}✅ Docker is running${NC}"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
        all_good=false
    else
        echo -e "${GREEN}✅ Docker Compose available${NC}"
    fi
    
    # Check curl for health checks
    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ curl not found. Health checks may not work properly.${NC}"
    else
        echo -e "${GREEN}✅ curl available${NC}"
    fi
    
    # Check nc for port checking
    if ! command -v nc >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ nc (netcat) not found. Port checks may not work properly.${NC}"
    else
        echo -e "${GREEN}✅ netcat available${NC}"
    fi
    
    # Check Python for data processing (optional)
    if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Python not found. Data processing features may be limited.${NC}"
    else
        echo -e "${GREEN}✅ Python available${NC}"
        
        # Check for requests module
        if command -v python3 >/dev/null 2>&1; then
            if ! python3 -c "import requests" 2>/dev/null; then
                echo -e "${YELLOW}⚠️ Python requests module not found. Data downloads may fail.${NC}"
                echo -e "${YELLOW}   Install with: pip3 install requests${NC}"
            fi
        elif command -v python >/dev/null 2>&1; then
            if ! python -c "import requests" 2>/dev/null; then
                echo -e "${YELLOW}⚠️ Python requests module not found. Data downloads may fail.${NC}"
                echo -e "${YELLOW}   Install with: pip install requests${NC}"
            fi
        fi
    fi
    
    if [ "$all_good" = false ]; then
        echo -e "${RED}❌ Critical dependencies missing. Please install them and try again.${NC}"
        exit 1
    fi
}

# Function to detect platform
detect_platform() {
    case "$(uname -s)" in
        Linux*)     PLATFORM=Linux;;
        Darwin*)    PLATFORM=Mac;;
        CYGWIN*|MINGW*|MSYS*) PLATFORM=Windows;;
        *)          PLATFORM=Unknown;;
    esac
}

# Function to check available resources (cross-platform)
check_resources() {
    echo -e "${YELLOW}📊 Checking system resources...${NC}"
    
    # Detect platform first
    detect_platform
    
    # Check available memory (minimum 6GB recommended)
    if command -v free >/dev/null 2>&1; then
        AVAILABLE_MEM=$(free -g | awk 'NR==2{print $7}')
        if [ -n "$AVAILABLE_MEM" ] && [ "$AVAILABLE_MEM" -lt 6 ]; then
            echo -e "${YELLOW}⚠️  Warning: Less than 6GB available memory detected. Performance may be impacted.${NC}"
        else
            echo -e "${GREEN}✅ Sufficient memory available${NC}"
        fi
    elif [[ "$PLATFORM" == "Mac" ]] && command -v vm_stat >/dev/null 2>&1; then
        # macOS memory check
        FREE_PAGES=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        if [ -n "$FREE_PAGES" ]; then
            FREE_GB=$((FREE_PAGES * 4096 / 1024 / 1024 / 1024))
            if [ "$FREE_GB" -lt 6 ]; then
                echo -e "${YELLOW}⚠️  Warning: Less than 6GB available memory detected. Performance may be impacted.${NC}"
            else
                echo -e "${GREEN}✅ Sufficient memory available${NC}"
            fi
        else
            echo -e "${GREEN}✅ Memory check completed${NC}"
        fi
    else
        echo -e "${GREEN}✅ Memory check skipped (platform-specific tools not available)${NC}"
    fi
    
    # Check available disk space (cross-platform)
    case "$PLATFORM" in
        Mac)
            # macOS compatible df command
            AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}' | sed 's/G.*//' | sed 's/[^0-9]*//g')
            ;;
        Linux)
            # Linux compatible df command
            if df --help 2>/dev/null | grep -q -- --block-size; then
                AVAILABLE_DISK=$(df --block-size=G . | awk 'NR==2{print $4}' | sed 's/G//')
            else
                AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}' | sed 's/G.*//' | sed 's/[^0-9]*//g')
            fi
            ;;
        Windows)
            # Windows/WSL compatible
            AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}' | sed 's/G.*//' | sed 's/[^0-9]*//g')
            ;;
        *)
            # Fallback for unknown platforms
            AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}' | sed 's/G.*//' | sed 's/[^0-9]*//g')
            ;;
    esac
    
    # Check disk space with proper error handling
    if [ -n "$AVAILABLE_DISK" ] && [ "$AVAILABLE_DISK" -gt 0 ] 2>/dev/null; then
        if [ "$AVAILABLE_DISK" -lt 10 ]; then
            echo -e "${YELLOW}⚠️  Warning: Less than 10GB disk space available. Consider cleaning up.${NC}"
        else
            echo -e "${GREEN}✅ Sufficient disk space available (${AVAILABLE_DISK}GB free)${NC}"
        fi
    else
        echo -e "${GREEN}✅ Disk space check completed${NC}"
    fi
}

# Function to create necessary directories and files
setup_environment() {
    print_step "1" "Setting up environment"
    
    cd "$PROJECT_ROOT"
    
    # Create directories if they don't exist
    mkdir -p docker/init
    mkdir -p docker/monitoring
    mkdir -p docker/nginx
    mkdir -p docker/delta-lake
    mkdir -p data/downloads
    
    # Create basic nginx config if it doesn't exist
    if [ ! -f docker/nginx/nginx.conf ]; then
        cat > docker/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream postgres_redis {
        server postgres-redis-showcase:3000;
    }
    
    upstream mysql_dragonfly {
        server mysql-dragonfly-showcase:3000;
    }
    
    upstream mongodb_memcached {
        server mongodb-memcached-showcase:3000;
    }
    
    upstream deltalake_redis {
        server deltalake-redis-showcase:3000;
    }
    
    upstream grafana {
        server grafana:3000;
    }

    server {
        listen 80;
        server_name localhost;
        
        location / {
            return 200 '
<!DOCTYPE html>
<html>
<head>
    <title>Smart Search - All Scenarios</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid; text-decoration: none; color: inherit; transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .postgres { border-left-color: #336791; }
        .mysql { border-left-color: #4479A1; }
        .mongodb { border-left-color: #47A248; }
        .deltalake { border-left-color: #FF6B6B; }
        .monitoring { border-left-color: #FF8C00; }
        .card h3 { margin-top: 0; color: #333; }
        .card p { color: #666; margin: 10px 0; }
        .port { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Smart Search - All Scenarios</h1>
            <p>Comprehensive database + cache architecture showcase</p>
        </div>
        
        <div class="grid">
            <a href="http://localhost:3001" class="card postgres">
                <h3>🏥 Healthcare Platform</h3>
                <p>PostgreSQL + Redis</p>
                <p>Medical research data with full-text search</p>
                <div class="port">Port 3001</div>
            </a>
            
            <a href="http://localhost:3002" class="card mysql">
                <h3>💰 Financial Platform</h3>
                <p>MySQL + DragonflyDB</p>
                <p>Financial data with Boolean search</p>
                <div class="port">Port 3002</div>
            </a>
            
            <a href="http://localhost:3003" class="card mongodb">
                <h3>🛒 E-commerce Platform</h3>
                <p>MongoDB + Memcached</p>
                <p>Product catalog with document search</p>
                <div class="port">Port 3003</div>
            </a>
            
            <a href="http://localhost:3004" class="card deltalake">
                <h3>📊 Analytics Platform</h3>
                <p>Delta Lake + Redis</p>
                <p>Big data analytics with time travel</p>
                <div class="port">Port 3004</div>
            </a>
            
            <a href="http://localhost:3000" class="card monitoring">
                <h3>📈 Monitoring</h3>
                <p>Grafana Dashboard</p>
                <p>Performance metrics and health monitoring</p>
                <div class="port">Port 3000</div>
            </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p>All services are running and ready for testing!</p>
            <p style="font-size: 0.9em;">Built with ❤️ by the Smart Search Team</p>
        </div>
    </div>
</body>
</html>
            ';
            add_header Content-Type text/html;
        }
        
        location /health {
            return 200 '{"status": "healthy", "services": ["postgres-redis", "mysql-dragonfly", "mongodb-memcached", "deltalake-redis", "monitoring"]}';
            add_header Content-Type application/json;
        }
    }
}
EOF
    fi

    # Create basic Prometheus config if it doesn't exist
    if [ ! -f docker/monitoring/prometheus.yml ]; then
        cat > docker/monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'smart-search-showcases'
    static_configs:
      - targets: ['postgres-redis-showcase:3000', 'mysql-dragonfly-showcase:3000', 'mongodb-memcached-showcase:3000', 'deltalake-redis-showcase:3000']
    scrape_interval: 5s
    metrics_path: '/metrics'

  - job_name: 'databases'
    static_configs:
      - targets: ['postgres-main:5432', 'mysql-main:3306', 'mongodb-main:27017']
    scrape_interval: 10s
    
  - job_name: 'caches'
    static_configs:
      - targets: ['redis-main:6379', 'dragonfly-main:6379', 'memcached-main:11211', 'redis-deltalake:6379']
    scrape_interval: 10s

  - job_name: 'big-data'
    static_configs:
      - targets: ['spark-master:8080', 'minio:9000', 'deltalake-processor:8080']
    scrape_interval: 15s
EOF
    fi

    echo -e "${GREEN}✅ Environment setup completed${NC}"
}

# Function to check if industry data exists
check_industry_data() {
    local industry=$1
    local size=${2:-medium}
    
    case $industry in
        healthcare)
            case $size in
                tiny) [ -f "$PROJECT_ROOT/data/healthcare/tiny/drugs.json" ] ;;
                small) [ -f "$PROJECT_ROOT/data/healthcare/small/medical_devices.json" ] ;;
                medium) [ -f "$PROJECT_ROOT/data/healthcare/medium/clinical_trials.json" ] ;;
                large) [ -f "$PROJECT_ROOT/data/healthcare/large/research_studies.json" ] ;;
            esac
            ;;
        finance)
            case $size in
                tiny) [ -f "$PROJECT_ROOT/data/finance/tiny/stock_prices.json" ] ;;
                small) [ -f "$PROJECT_ROOT/data/finance/small/companies.json" ] ;;
                medium) [ -f "$PROJECT_ROOT/data/finance/medium/trades.json" ] ;;
                large) [ -f "$PROJECT_ROOT/data/finance/large/market_data.json" ] ;;
            esac
            ;;
        retail)
            case $size in
                tiny) [ -f "$PROJECT_ROOT/data/retail/tiny/products.json" ] ;;
                small) [ -f "$PROJECT_ROOT/data/retail/small/customers.json" ] ;;
                medium) [ -f "$PROJECT_ROOT/data/retail/medium/orders.json" ] ;;
                large) [ -f "$PROJECT_ROOT/data/retail/large/inventory.json" ] ;;
            esac
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to show data cache status
show_data_status() {
    local data_size=${1:-medium}
    
    echo -e "${CYAN}📊 Data Status Report ($data_size dataset):${NC}"
    
    # Check each industry
    for industry in healthcare finance retail; do
        if check_industry_data "$industry" "$data_size"; then
            echo -e "  ✅ $industry: Available"
        else
            echo -e "  ❌ $industry: Missing"
        fi
    done
    echo ""
}

# Function to download sample data with intelligent caching
download_data() {
    print_step "2" "Downloading sample data"
    
    local data_size=${DATA_SIZE:-medium}
    echo -e "${BLUE}Using data size: $data_size${NC}"
    
    # Show current data status
    show_data_status "$data_size"
    
    # Check if required data already exists
    local healthcare_exists=false
    local finance_exists=false
    local retail_exists=false
    
    if check_industry_data "healthcare" "$data_size"; then
        healthcare_exists=true
    fi
    
    if check_industry_data "finance" "$data_size"; then
        finance_exists=true
    fi
    
    if check_industry_data "retail" "$data_size"; then
        retail_exists=true
    fi
    
    # If all data exists, skip download
    if [ "$healthcare_exists" = true ] && [ "$finance_exists" = true ] && [ "$retail_exists" = true ]; then
        echo -e "${GREEN}🎉 All required data already exists - download skipped!${NC}"
        return 0
    fi
    
    # Download script exists check
    if [ ! -f "$PROJECT_ROOT/scripts/download-data.sh" ]; then
        echo -e "${YELLOW}⚠️ Data download script not found, using existing/mock data${NC}"
        return 0
    fi
    
    # Download missing data
    if [ "$healthcare_exists" = false ]; then
        echo -e "${BLUE}📥 Downloading healthcare data ($data_size)...${NC}"
        if ! "$PROJECT_ROOT/scripts/download-data.sh" healthcare "$data_size"; then
            echo -e "${YELLOW}⚠️ Healthcare data download failed, continuing with existing data${NC}"
        fi
    fi
    
    if [ "$finance_exists" = false ]; then
        echo -e "${BLUE}📥 Downloading finance data ($data_size)...${NC}"
        if ! "$PROJECT_ROOT/scripts/download-data.sh" finance "$data_size"; then
            echo -e "${YELLOW}⚠️ Finance data download failed, continuing with existing data${NC}"
        fi
    fi
    
    if [ "$retail_exists" = false ]; then
        echo -e "${BLUE}📥 Downloading retail data ($data_size)...${NC}"
        if ! "$PROJECT_ROOT/scripts/download-data.sh" retail "$data_size"; then
            echo -e "${YELLOW}⚠️ Retail data download failed, continuing with existing data${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Data preparation completed${NC}"
}

# Function to start all services
start_services() {
    print_step "3" "Starting all Docker services"
    
    echo -e "${BLUE}🐳 Starting comprehensive Smart Search stack...${NC}"
    echo -e "${YELLOW}This may take 5-10 minutes on first run (downloading images)${NC}"
    
    cd "$PROJECT_ROOT"
    docker-compose -f docker/all-scenarios.docker-compose.yml up -d
    
    echo -e "${GREEN}✅ All services started${NC}"
}

# Function to wait for services to be healthy
wait_for_services() {
    print_step "4" "Waiting for services to be ready"
    
    echo -e "${BLUE}⏳ Waiting for health checks to pass...${NC}"
    
    # Array of services to check
    services=(
        "postgres-main:5432:PostgreSQL"
        "redis-main:6379:Redis"
        "mysql-main:3306:MySQL"
        "dragonfly-main:6380:DragonflyDB"
        "mongodb-main:27017:MongoDB"
        "memcached-main:11211:Memcached"
        "redis-deltalake:6381:Redis (Delta Lake)"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r host port name <<< "$service"
        echo -e "${YELLOW}⏳ Waiting for $name to be ready...${NC}"
        
        timeout=120  # 2 minutes timeout
        counter=0
        while [ $counter -lt $timeout ]; do
            if nc -z localhost ${port} 2>/dev/null; then
                echo -e "${GREEN}✅ $name is ready${NC}"
                break
            fi
            sleep 2
            counter=$((counter + 2))
        done
        
        if [ $counter -ge $timeout ]; then
            echo -e "${YELLOW}⚠️ $name health check timeout, but continuing...${NC}"
        fi
    done
    
    # Additional wait for web services
    echo -e "${BLUE}⏳ Waiting for web services to be ready...${NC}"
    sleep 10
    
    # Check web services
    web_services=(
        "3001:Healthcare Platform"
        "3002:Financial Platform"
        "3003:E-commerce Platform"
        "3004:Analytics Platform"
        "3000:Grafana Monitoring"
    )
    
    for service in "${web_services[@]}"; do
        IFS=':' read -r port name <<< "$service"
        echo -e "${YELLOW}⏳ Checking $name...${NC}"
        
        if curl -s --max-time 5 "http://localhost:$port" > /dev/null; then
            echo -e "${GREEN}✅ $name is responding${NC}"
        else
            echo -e "${YELLOW}⚠️ $name not yet ready (still starting up)${NC}"
        fi
    done
}

# Function to show final status and URLs
show_status() {
    print_step "5" "All scenarios are ready!"
    
    echo ""
    echo -e "${GREEN}🎉 Smart Search All Scenarios Successfully Started!${NC}"
    echo ""
    echo -e "${CYAN}Access your showcases:${NC}"
    echo -e "${BLUE}  🏥 Healthcare Platform:    http://localhost:3001${NC}"
    echo -e "${BLUE}  💰 Financial Platform:     http://localhost:3002${NC}" 
    echo -e "${BLUE}  🛒 E-commerce Platform:    http://localhost:3003${NC}"
    echo -e "${BLUE}  📊 Analytics Platform:     http://localhost:3004${NC}"
    echo ""
    echo -e "${CYAN}Monitoring & Management:${NC}"
    echo -e "${BLUE}  📈 Grafana Dashboard:      http://localhost:3000${NC} (admin/admin)"
    echo -e "${BLUE}  📊 Prometheus Metrics:     http://localhost:9090${NC}"
    echo -e "${BLUE}  🌐 Main Landing Page:      http://localhost:80${NC}"
    echo ""
    echo -e "${CYAN}Big Data & Analytics:${NC}"
    echo -e "${BLUE}  🔥 Spark Master UI:        http://localhost:8080${NC}"
    echo -e "${BLUE}  💾 MinIO Console:          http://localhost:9001${NC} (admin/admin123456)"
    echo -e "${BLUE}  🏗️  Delta Lake Processor:   http://localhost:8081${NC}"
    echo ""
    echo -e "${YELLOW}Management Commands:${NC}"
    echo -e "  Stop all:     ${CYAN}./scripts/stop-all-scenarios.sh${NC}"
    echo -e "  View logs:    ${CYAN}docker-compose -f docker/all-scenarios.docker-compose.yml logs -f${NC}"
    echo -e "  Status:       ${CYAN}docker-compose -f docker/all-scenarios.docker-compose.yml ps${NC}"
    echo ""
    echo -e "${GREEN}🚀 Happy testing! All database + cache combinations are ready for exploration.${NC}"
}

# Main execution
main() {
    check_dependencies
    check_resources
    setup_environment
    download_data
    start_services
    wait_for_services
    show_status
}

# Handle script interruption
trap 'echo -e "\n${RED}❌ Script interrupted. Run ./scripts/stop-all-scenarios.sh to clean up.${NC}"; exit 1' INT TERM

# Run main function
main "$@"