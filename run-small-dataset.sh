#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Showcase with SMALL Dataset
# Healthcare search showcase with 10K records for moderate testing

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
    echo -e "${BLUE}║${NC} ${CYAN}🏥 Smart Search - PostgreSQL + Redis (SMALL Dataset)${NC}   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${YELLOW}📊 10K Healthcare Records - Moderate Testing${NC}           ${BLUE}║${NC}"
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
export DATA_SIZE=small

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
    echo "   • Size: ${YELLOW}SMALL${NC} (10K records)"
    echo "   • Startup time: ${YELLOW}~2-3 minutes${NC}"
    echo "   • Memory usage: ${YELLOW}~200MB${NC}"
    echo "   • Ideal for: ${YELLOW}Development & moderate testing${NC}"
    echo ""
    echo -e "${PURPLE}🔬 Healthcare Data Includes:${NC}"
    echo "   • Medical conditions & symptoms"
    echo "   • Treatment procedures & protocols"
    echo "   • Research studies & clinical trials"
    echo "   • Pharmaceutical information"
    echo "   • Medical device specifications"
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
    echo -e "${CYAN}│${NC}   • Size: ${GREEN}SMALL (10K records)${NC}               ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Categories: ${GREEN}5 medical specialties${NC}       ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Languages: ${GREEN}English + Medical terms${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🗄️  Database Connections:${NC}                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • PostgreSQL: ${GREEN}localhost:5432${NC}              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Database: ${GREEN}smartsearch${NC}                   ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Username: ${GREEN}user${NC}                         ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Password: ${GREEN}password${NC}                     ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Redis: ${GREEN}localhost:6379${NC}                  ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🔍 Recommended Healthcare Searches:${NC}          ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}diabetes management${NC}                     ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}cardiac surgery procedures${NC}              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}immunotherapy protocols${NC}                ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}mental health treatment${NC}                ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}clinical research studies${NC}              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • ${GREEN}pharmaceutical interactions${NC}            ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${PURPLE}🚀 Enhanced Features for SMALL Dataset:${NC}"
    echo "   • ${GREEN}Multi-strategy search comparison${NC} (Cache vs Database vs Hybrid)"
    echo "   • ${GREEN}Real-time performance metrics${NC} with detailed timing"
    echo "   • ${GREEN}PostgreSQL full-text search${NC} with relevance ranking"
    echo "   • ${GREEN}Redis intelligent caching${NC} with automatic invalidation"
    echo "   • ${GREEN}Circuit breaker patterns${NC} for resilient search"
    echo "   • ${GREEN}Search result highlighting${NC} and categorization"
    echo ""
    echo -e "${YELLOW}📈 Performance Expectations (SMALL Dataset):${NC}"
    echo "   • Cache-first queries: ${GREEN}<10ms${NC}"
    echo "   • Database queries: ${GREEN}<50ms${NC}"
    echo "   • Complex searches: ${GREEN}<100ms${NC}"
    echo "   • Memory usage: ${GREEN}~200MB${NC}"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start    - Start the PostgreSQL + Redis showcase with SMALL dataset (default)"
    echo "  stop     - Stop all services"
    echo "  restart  - Restart all services"
    echo "  status   - Show service status and URLs"
    echo "  logs     - Show service logs"
    echo "  seed     - Seed database with fresh SMALL dataset"
    echo "  help     - Show this help message"
    echo ""
    echo "Dataset Information:"
    echo "  • Size: SMALL (10K healthcare records)"
    echo "  • Startup: ~2-3 minutes"
    echo "  • Memory: ~200MB"
    echo "  • Best for: Development & moderate testing"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start with SMALL dataset"
    echo "  $0 start              # Same as above"
    echo "  $0 stop               # Stop services"
    echo "  $0 logs               # Show logs"
    echo ""
}

# Function to seed data
seed_data() {
    print_step "Seeding SMALL healthcare dataset (10K records)..."
    print_status "This will take 2-3 minutes to download and process..."
    
    # Check if seeding scripts exist
    if [ -f "$SCRIPT_DIR/scripts/download-data.sh" ]; then
        "$SCRIPT_DIR/scripts/download-data.sh" healthcare small
        "$SCRIPT_DIR/scripts/seed-data.sh" healthcare small postgres
        "$SCRIPT_DIR/scripts/seed-data.sh" healthcare small redis
        print_success "SMALL dataset seeded successfully!"
    else
        print_warning "Data seeding scripts not found. Using container auto-seeding."
    fi
}

# Main execution
main() {
    local command="${1:-start}"
    
    case $command in
        start)
            print_header
            show_expectations
            check_docker
            print_step "Starting showcase with SMALL dataset..."
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" start
            show_status
            ;;
        stop)
            "$SCRIPT_DIR/run-postgres-redis-showcase.sh" stop
            ;;
        restart)
            print_step "Restarting with SMALL dataset..."
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