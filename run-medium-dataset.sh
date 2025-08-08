#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Showcase with MEDIUM Dataset
# Healthcare search showcase with 100K records for comprehensive testing

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
    echo -e "${BLUE}║${NC} ${CYAN}🏥 Smart Search - PostgreSQL + Redis (MEDIUM Dataset)${NC}  ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${YELLOW}📊 100K Healthcare Records - Comprehensive Testing${NC}     ${BLUE}║${NC}"
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
export DATA_SIZE=medium

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

# Function to estimate startup time
show_expectations() {
    echo -e "${CYAN}⏱️  Dataset Information:${NC}"
    echo "   • Size: ${YELLOW}MEDIUM${NC} (100K records)"
    echo "   • Startup time: ${YELLOW}~5-8 minutes${NC}"
    echo "   • Memory usage: ${YELLOW}~1GB${NC}"
    echo "   • Ideal for: ${YELLOW}Comprehensive testing & performance analysis${NC}"
    echo ""
    echo -e "${PURPLE}🔬 Healthcare Data Includes:${NC}"
    echo "   • Medical conditions & symptoms (extensive catalog)"
    echo "   • Treatment procedures & protocols (detailed)"
    echo "   • Research studies & clinical trials (published data)"
    echo "   • Pharmaceutical information (drug interactions)"
    echo "   • Medical device specifications (FDA approved)"
    echo "   • Patient demographics & case studies"
    echo "   • Healthcare provider networks"
    echo ""
    echo -e "${RED}⚠️  System Requirements:${NC}"
    echo "   • RAM: ${YELLOW}4GB+ recommended${NC}"
    echo "   • Disk: ${YELLOW}2GB+ free space${NC}"
    echo "   • CPU: ${YELLOW}Multi-core recommended${NC}"
    echo ""
}

# Function to show enhanced status with dataset info
show_status() {
    echo ""
    print_header
    
    print_success "🎉 PostgreSQL + Redis Healthcare Showcase is running!"
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🌐 Access URLs:${NC}                              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Showcase App: ${GREEN}http://localhost:3002${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Health Check: ${GREEN}http://localhost:3002/api/health${NC} ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}📊 Dataset Information:${NC}                      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Size: ${GREEN}MEDIUM (100K records)${NC}             ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Categories: ${GREEN}15 medical specialties${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Languages: ${GREEN}English + Medical terms${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Data sources: ${GREEN}NIH, WHO, FDA${NC}             ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🗄️  Database Connections:${NC}                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • PostgreSQL: ${GREEN}localhost:5432${NC}              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Database: ${GREEN}smartsearch${NC}                   ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Username: ${GREEN}user${NC}                         ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Password: ${GREEN}password${NC}                     ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Redis: ${GREEN}localhost:6379${NC}                  ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🔍 Advanced Healthcare Searches:${NC}             ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}diabetes mellitus type 2${NC}                ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}minimally invasive cardiac surgery${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}CAR-T cell immunotherapy${NC}                ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}cognitive behavioral therapy${NC}            ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}randomized controlled trial${NC}             ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}drug interaction screening${NC}              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}biomarker discovery${NC}                     ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${PURPLE}🚀 Enterprise Features for MEDIUM Dataset:${NC}"
    echo "   • ${GREEN}Advanced search strategies${NC} with machine learning hints"
    echo "   • ${GREEN}Performance benchmarking${NC} across all query patterns"
    echo "   • ${GREEN}PostgreSQL advanced indexing${NC} (GIN, GiST, BRIN)"
    echo "   • ${GREEN}Redis intelligent caching${NC} with LRU eviction policies"
    echo "   • ${GREEN}Circuit breaker patterns${NC} with adaptive thresholds"
    echo "   • ${GREEN}Query optimization${NC} with execution plan analysis"
    echo "   • ${GREEN}Real-time monitoring${NC} with Grafana-style metrics"
    echo ""
    echo -e "${YELLOW}📈 Performance Expectations (MEDIUM Dataset):${NC}"
    echo "   • Cache-first queries: ${GREEN}<5ms${NC} (hot cache)"
    echo "   • Database queries: ${GREEN}<25ms${NC} (with indexes)"
    echo "   • Complex searches: ${GREEN}<100ms${NC} (multi-column)"
    echo "   • Full-text search: ${GREEN}<150ms${NC} (with ranking)"
    echo "   • Memory usage: ${GREEN}~1GB${NC}"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start      - Start the PostgreSQL + Redis showcase with MEDIUM dataset (default)"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  status     - Show service status and URLs"
    echo "  logs       - Show service logs"
    echo "  seed       - Seed database with fresh MEDIUM dataset"
    echo "  benchmark  - Run performance benchmarks"
    echo "  help       - Show this help message"
    echo ""
    echo "Dataset Information:"
    echo "  • Size: MEDIUM (100K healthcare records)"
    echo "  • Startup: ~5-8 minutes"
    echo "  • Memory: ~1GB"
    echo "  • Best for: Comprehensive testing & performance analysis"
    echo ""
    echo "System Requirements:"
    echo "  • RAM: 4GB+ recommended"
    echo "  • Disk: 2GB+ free space"
    echo "  • CPU: Multi-core recommended"
    echo ""
    echo "Examples:"
    echo "  $0                      # Start with MEDIUM dataset"
    echo "  $0 start                # Same as above"
    echo "  $0 benchmark            # Run performance tests"
    echo "  $0 stop                 # Stop services"
    echo ""
}

# Function to seed data
seed_data() {
    print_step "Seeding MEDIUM healthcare dataset (100K records)..."
    print_status "This will take 5-8 minutes to download and process..."
    print_warning "Ensure you have at least 2GB free disk space"
    
    # Check if seeding scripts exist
    if [ -f "$SCRIPT_DIR/scripts/download-data.sh" ]; then
        "$SCRIPT_DIR/scripts/download-data.sh" healthcare medium
        "$SCRIPT_DIR/scripts/seed-data.sh" healthcare medium postgres
        "$SCRIPT_DIR/scripts/seed-data.sh" healthcare medium redis
        print_success "MEDIUM dataset seeded successfully!"
    else
        print_warning "Data seeding scripts not found. Using container auto-seeding."
    fi
}

# Function to run benchmarks
run_benchmarks() {
    print_step "Running performance benchmarks on MEDIUM dataset..."
    print_status "This will test various query patterns and search strategies..."
    
    if [ -f "$SCRIPT_DIR/scripts/benchmark.sh" ]; then
        "$SCRIPT_DIR/scripts/benchmark.sh" --dataset medium --queries 1000
        print_success "Benchmarks completed!"
    else
        print_warning "Benchmark scripts not found."
        print_status "You can manually test performance at: http://localhost:3002"
    fi
}

# Function to show system requirements check
check_system_requirements() {
    echo -e "${PURPLE}🖥️  System Requirements Check:${NC}"
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local mem_gb=$(free -g | awk 'NR==2{printf "%.1f", $7}')
        if (( $(echo "$mem_gb >= 4" | bc -l) )); then
            echo "   • Available RAM: ${GREEN}${mem_gb}GB ✓${NC}"
        else
            echo "   • Available RAM: ${RED}${mem_gb}GB (4GB+ recommended)${NC}"
        fi
    elif command -v vm_stat >/dev/null 2>&1; then
        # macOS
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local mem_gb=$(echo "scale=1; $free_pages * 4096 / 1024 / 1024 / 1024" | bc)
        if (( $(echo "$mem_gb >= 4" | bc -l) )); then
            echo "   • Available RAM: ${GREEN}${mem_gb}GB ✓${NC}"
        else
            echo "   • Available RAM: ${RED}${mem_gb}GB (4GB+ recommended)${NC}"
        fi
    fi
    
    # Check disk space
    local disk_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//' | sed 's/T/000/')
    if (( $(echo "$disk_space >= 2" | bc -l) )); then
        echo "   • Available disk: ${GREEN}${disk_space}GB ✓${NC}"
    else
        echo "   • Available disk: ${RED}${disk_space}GB (2GB+ recommended)${NC}"
    fi
    
    # Check CPU cores
    if command -v nproc >/dev/null 2>&1; then
        local cores=$(nproc)
    elif command -v sysctl >/dev/null 2>&1; then
        local cores=$(sysctl -n hw.ncpu)
    else
        local cores="unknown"
    fi
    
    if [ "$cores" != "unknown" ] && [ "$cores" -ge 4 ]; then
        echo "   • CPU cores: ${GREEN}${cores} ✓${NC}"
    else
        echo "   • CPU cores: ${YELLOW}${cores} (4+ recommended for optimal performance)${NC}"
    fi
    
    echo ""
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
            print_step "Starting showcase with MEDIUM dataset..."
            print_warning "This may take 5-8 minutes for first startup..."
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" start
            show_status
            ;;
        stop)
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" stop
            ;;
        restart)
            print_step "Restarting with MEDIUM dataset..."
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