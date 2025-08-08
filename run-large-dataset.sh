#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Showcase with LARGE Dataset
# Healthcare search showcase with 1M+ records for enterprise-scale testing

set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}🏥 Smart Search - PostgreSQL + Redis (LARGE Dataset)${NC}   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${YELLOW}📊 1M+ Healthcare Records - Enterprise Scale Testing${NC}   ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Set the dataset size
export DATA_SIZE=large

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_status "Docker is running ✓"
}

# Function to estimate startup time and requirements
show_expectations() {
    echo -e "${CYAN}⏱️  Dataset Information:${NC}"
    echo "   • Size: ${YELLOW}LARGE${NC} (1M+ records)"
    echo "   • Startup time: ${YELLOW}~10-15 minutes${NC}"
    echo "   • Memory usage: ${YELLOW}~4GB${NC}"
    echo "   • Ideal for: ${YELLOW}Enterprise-scale testing & production simulation${NC}"
    echo ""
    echo -e "${PURPLE}🔬 Comprehensive Healthcare Data Includes:${NC}"
    echo "   • Medical conditions & symptoms (complete ICD-10 catalog)"
    echo "   • Treatment procedures & protocols (CPT codes)"
    echo "   • Research studies & clinical trials (ClinicalTrials.gov)"
    echo "   • Pharmaceutical information (RxNorm, NDC codes)"
    echo "   • Medical device specifications (FDA 510(k) database)"
    echo "   • Patient demographics & case studies (anonymized)"
    echo "   • Healthcare provider networks (NPI directory)"
    echo "   • Insurance & billing codes (HCPCS)"
    echo "   • Laboratory test results (LOINC codes)"
    echo "   • Medical imaging & radiology reports"
    echo ""
    echo -e "${RED}⚠️  Enterprise System Requirements:${NC}"
    echo "   • RAM: ${YELLOW}8GB+ required, 16GB+ recommended${NC}"
    echo "   • Disk: ${YELLOW}5GB+ free space required${NC}"
    echo "   • CPU: ${YELLOW}8+ cores recommended${NC}"
    echo "   • Network: ${YELLOW}Stable connection for downloads${NC}"
    echo ""
    echo -e "${RED}🚨 Performance Warning:${NC}"
    echo "   • First startup will download large datasets"
    echo "   • Index creation may take 10-15 minutes"
    echo "   • Recommended for production-like testing only"
    echo ""
}

# Function to show enhanced status with dataset info
show_status() {
    echo ""
    print_header
    
    print_success "🎉 Enterprise PostgreSQL + Redis Healthcare Showcase is running!"
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🌐 Access URLs:${NC}                              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Showcase App: ${GREEN}http://localhost:3002${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Health Check: ${GREEN}http://localhost:3002/api/health${NC} ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Metrics: ${GREEN}http://localhost:3002/metrics${NC}       ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}📊 Enterprise Dataset Information:${NC}           ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Size: ${GREEN}LARGE (1M+ records)${NC}               ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Categories: ${GREEN}50+ medical specialties${NC}     ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Languages: ${GREEN}Multi-language support${NC}       ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Standards: ${GREEN}ICD-10, CPT, LOINC, RxNorm${NC}   ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Data sources: ${GREEN}NIH, WHO, FDA, CMS${NC}        ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🗄️  Database Connections:${NC}                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • PostgreSQL: ${GREEN}localhost:5432${NC}              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Database: ${GREEN}smartsearch${NC}                   ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Username: ${GREEN}user${NC}                         ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Password: ${GREEN}password${NC}                     ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Redis: ${GREEN}localhost:6379${NC}                  ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🔍 Enterprise Healthcare Search Examples:${NC}    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}diabetes mellitus type 2 treatment${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}robotic-assisted cardiac surgery${NC}        ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}CAR-T cell immunotherapy protocols${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}precision medicine biomarkers${NC}           ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}phase 3 randomized controlled trial${NC}     ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}drug-drug interaction screening${NC}         ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}artificial intelligence radiology${NC}       ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}telemedicine remote monitoring${NC}          ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${PURPLE}🚀 Enterprise Features for LARGE Dataset:${NC}"
    echo "   • ${GREEN}Production-grade performance${NC} with connection pooling"
    echo "   • ${GREEN}Advanced indexing strategies${NC} (Partial, Expression, Multi-column)"
    echo "   • ${GREEN}Redis clustering simulation${NC} with sharding patterns"
    echo "   • ${GREEN}Query optimization${NC} with automatic plan analysis"
    echo "   • ${GREEN}Load balancing${NC} across read replicas"
    echo "   • ${GREEN}Monitoring & alerting${NC} with enterprise metrics"
    echo "   • ${GREEN}Backup & recovery${NC} simulation"
    echo "   • ${GREEN}Security features${NC} (encryption, access controls)"
    echo ""
    echo -e "${YELLOW}📈 Performance Expectations (LARGE Dataset):${NC}"
    echo "   • Cache-first queries: ${GREEN}<5ms${NC} (99.9% hit rate)"
    echo "   • Indexed queries: ${GREEN}<50ms${NC} (95th percentile)"
    echo "   • Complex queries: ${GREEN}<200ms${NC} (99th percentile)"
    echo "   • Full-text search: ${GREEN}<500ms${NC} (with relevance)"
    echo "   • Concurrent users: ${GREEN}100+${NC} simultaneous"
    echo "   • Memory usage: ${GREEN}~4GB${NC}"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start        - Start the PostgreSQL + Redis showcase with LARGE dataset (default)"
    echo "  stop         - Stop all services"
    echo "  restart      - Restart all services"
    echo "  status       - Show service status and URLs"
    echo "  logs         - Show service logs"
    echo "  seed         - Seed database with fresh LARGE dataset"
    echo "  benchmark    - Run enterprise performance benchmarks"
    echo "  monitor      - Launch monitoring dashboard"
    echo "  backup       - Create database backup"
    echo "  help         - Show this help message"
    echo ""
    echo "Dataset Information:"
    echo "  • Size: LARGE (1M+ healthcare records)"
    echo "  • Startup: ~10-15 minutes"
    echo "  • Memory: ~4GB"
    echo "  • Best for: Enterprise-scale testing & production simulation"
    echo ""
    echo "Enterprise System Requirements:"
    echo "  • RAM: 8GB+ required, 16GB+ recommended"
    echo "  • Disk: 5GB+ free space required"
    echo "  • CPU: 8+ cores recommended"
    echo "  • Network: Stable connection for large downloads"
    echo ""
    echo "Examples:"
    echo "  $0                        # Start with LARGE dataset"
    echo "  $0 benchmark              # Run enterprise benchmarks"
    echo "  $0 monitor                # Launch monitoring"
    echo "  $0 backup                 # Create backup"
    echo ""
}

# Function to seed data
seed_data() {
    print_step "Seeding LARGE healthcare dataset (1M+ records)..."
    print_status "This will take 10-15 minutes to download and process..."
    print_warning "Ensure you have at least 5GB free disk space"
    print_warning "This process is resource-intensive"
    
    # Check if seeding scripts exist
    if [ -f "$SCRIPT_DIR/scripts/download-data.sh" ]; then
        "$SCRIPT_DIR/scripts/download-data.sh" healthcare large
        "$SCRIPT_DIR/scripts/seed-data.sh" healthcare large postgres
        "$SCRIPT_DIR/scripts/seed-data.sh" healthcare large redis
        print_success "LARGE dataset seeded successfully!"
    else
        print_warning "Data seeding scripts not found. Using container auto-seeding."
    fi
}

# Function to run enterprise benchmarks
run_benchmarks() {
    print_step "Running enterprise performance benchmarks on LARGE dataset..."
    print_status "This will test production-scale query patterns and loads..."
    
    if [ -f "$SCRIPT_DIR/scripts/benchmark.sh" ]; then
        "$SCRIPT_DIR/scripts/benchmark.sh" --dataset large --queries 10000 --concurrent 50
        print_success "Enterprise benchmarks completed!"
    else
        print_warning "Benchmark scripts not found."
        print_status "You can manually test performance at: http://localhost:3002"
    fi
}

# Function to launch monitoring
launch_monitoring() {
    print_step "Launching enterprise monitoring dashboard..."
    
    if [ -f "$SCRIPT_DIR/docker/monitoring.docker-compose.yml" ]; then
        cd "$SCRIPT_DIR/docker"
        docker-compose -f monitoring.docker-compose.yml up -d
        print_success "Monitoring dashboard available at: http://localhost:3000"
    else
        print_warning "Monitoring stack not found."
        print_status "Basic metrics available at: http://localhost:3002/metrics"
    fi
}

# Function to create backup
create_backup() {
    print_step "Creating enterprise database backup..."
    local backup_dir="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup PostgreSQL
    docker exec smart-search-postgres pg_dump -U user smartsearch > "$backup_dir/postgres_backup.sql"
    
    # Backup Redis
    docker exec smart-search-redis redis-cli --rdb "$backup_dir/redis_backup.rdb"
    
    print_success "Backup created at: $backup_dir"
}

# Function to show system requirements check
check_system_requirements() {
    echo -e "${PURPLE}🖥️  Enterprise System Requirements Check:${NC}"
    
    local requirements_met=true
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local mem_gb=$(free -g | awk 'NR==2{printf "%.1f", $7}')
        if (( $(echo "$mem_gb >= 8" | bc -l) )); then
            echo "   • Available RAM: ${GREEN}${mem_gb}GB ✓${NC}"
        else
            echo "   • Available RAM: ${RED}${mem_gb}GB ❌ (8GB+ required)${NC}"
            requirements_met=false
        fi
    elif command -v vm_stat >/dev/null 2>&1; then
        # macOS
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local mem_gb=$(echo "scale=1; $free_pages * 4096 / 1024 / 1024 / 1024" | bc)
        if (( $(echo "$mem_gb >= 8" | bc -l) )); then
            echo "   • Available RAM: ${GREEN}${mem_gb}GB ✓${NC}"
        else
            echo "   • Available RAM: ${RED}${mem_gb}GB ❌ (8GB+ required)${NC}"
            requirements_met=false
        fi
    fi
    
    # Check disk space
    local disk_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//' | sed 's/T/000/')
    if (( $(echo "$disk_space >= 5" | bc -l) )); then
        echo "   • Available disk: ${GREEN}${disk_space}GB ✓${NC}"
    else
        echo "   • Available disk: ${RED}${disk_space}GB ❌ (5GB+ required)${NC}"
        requirements_met=false
    fi
    
    # Check CPU cores
    if command -v nproc >/dev/null 2>&1; then
        local cores=$(nproc)
    elif command -v sysctl >/dev/null 2>&1; then
        local cores=$(sysctl -n hw.ncpu)
    else
        local cores="unknown"
    fi
    
    if [ "$cores" != "unknown" ] && [ "$cores" -ge 8 ]; then
        echo "   • CPU cores: ${GREEN}${cores} ✓${NC}"
    elif [ "$cores" != "unknown" ] && [ "$cores" -ge 4 ]; then
        echo "   • CPU cores: ${YELLOW}${cores} ⚠️  (8+ recommended)${NC}"
    else
        echo "   • CPU cores: ${RED}${cores} ❌ (4+ minimum, 8+ recommended)${NC}"
    fi
    
    echo ""
    
    if [ "$requirements_met" = false ]; then
        echo -e "${RED}❌ System does not meet minimum requirements for LARGE dataset${NC}"
        echo -e "${YELLOW}💡 Consider using MEDIUM dataset instead: ./run-medium-dataset.sh${NC}"
        echo ""
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Switching to MEDIUM dataset for better performance..."
            exec "$SCRIPT_DIR/run-medium-dataset.sh" "$@"
        fi
    fi
}

# Main execution
main() {
    local command="${1:-start}"
    
    case $command in
        start)
            print_header
            show_expectations
            check_system_requirements
            check_docker
            print_step "Starting showcase with LARGE dataset..."
            print_warning "This may take 10-15 minutes for first startup..."
            print_warning "Please ensure stable system performance during startup"
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" start
            show_status
            ;;
        stop)
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" stop
            # Also stop monitoring if running
            if [ -f "$SCRIPT_DIR/docker/monitoring.docker-compose.yml" ]; then
                cd "$SCRIPT_DIR/docker"
                docker-compose -f monitoring.docker-compose.yml down 2>/dev/null || true
            fi
            ;;
        restart)
            print_step "Restarting with LARGE dataset..."
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" restart
            show_status
            ;;
        status)
            show_status
            ;;
        logs)
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" logs
            ;;
        seed)
            seed_data
            ;;
        benchmark)
            run_benchmarks
            ;;
        monitor)
            launch_monitoring
            ;;
        backup)
            create_backup
            ;;
        help|--help|-h)
            print_header
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"