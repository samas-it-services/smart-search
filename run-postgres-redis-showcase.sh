#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Showcase Launcher (Legacy Wrapper)
# This script now serves as a wrapper around the new organized provider scripts
# For full functionality, use the scripts in scripts/providers/postgres-redis/

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
    echo -e "${BLUE}║${NC} ${CYAN}🏥 Smart Search - PostgreSQL + Redis Healthcare Showcase${NC} ${BLUE}║${NC}"
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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/docker"
COMPOSE_FILE="$DOCKER_DIR/postgres-redis.docker-compose.yml"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_status "Docker is running ✓"
}

# Function to check if ports are available and determine which compose file to use
check_ports() {
    local standard_ports=("3002" "5432" "6379")
    local conflicts=()
    
    for port in "${standard_ports[@]}"; do
        if lsof -i :$port >/dev/null 2>&1; then
            conflicts+=("$port")
        fi
    done
    
    if [ ${#conflicts[@]} -gt 0 ]; then
        print_warning "Standard ports are in use: ${conflicts[*]}"
        print_status "Switching to alternative ports to avoid conflicts..."
        export USE_ALT_PORTS=true
        export COMPOSE_FILE_NAME="postgres-redis-alt-ports.docker-compose.yml"
        export SHOWCASE_PORT=13002
        export POSTGRES_PORT=15432
        export REDIS_PORT=16379
        export CONTAINER_SUFFIX="-alt"
    else
        export USE_ALT_PORTS=false
        export COMPOSE_FILE_NAME="postgres-redis.docker-compose.yml"
        export SHOWCASE_PORT=3002
        export POSTGRES_PORT=5432
        export REDIS_PORT=6379
        export CONTAINER_SUFFIX=""
    fi
}

# Function to prompt for dataset size
prompt_dataset_size() {
    if [ -z "$DATA_SIZE" ]; then
        echo ""
        print_step "📊 Choose dataset size:"
        echo "   1) tiny   - 1K records (fastest startup)"
        echo "   2) small  - 10K records (quick demo)"
        echo "   3) medium - 100K records (realistic testing)"
        echo "   4) large  - 1M+ records (performance testing)"
        echo ""
        
        while true; do
            read -p "Enter choice (1-4) [default: 1]: " choice
            case ${choice:-1} in
                1) export DATA_SIZE="tiny"; break ;;
                2) export DATA_SIZE="small"; break ;;
                3) export DATA_SIZE="medium"; break ;;
                4) export DATA_SIZE="large"; break ;;
                *) print_warning "Invalid choice. Please enter 1-4." ;;
            esac
        done
        
        print_success "Selected dataset: $DATA_SIZE"
    fi
}

# Function to start services
start_services() {
    print_step "Starting PostgreSQL + Redis services..."
    
    local compose_file="$DOCKER_DIR/$COMPOSE_FILE_NAME"
    
    if [ ! -f "$compose_file" ]; then
        print_error "Docker compose file not found: $compose_file"
        exit 1
    fi
    
    cd "$DOCKER_DIR"
    
    # Prompt for dataset size if not specified
    prompt_dataset_size
    print_status "Using dataset size: $DATA_SIZE"
    
    if [ "$USE_ALT_PORTS" = true ]; then
        print_status "Using alternative ports - PostgreSQL: $POSTGRES_PORT, Redis: $REDIS_PORT, Showcase: $SHOWCASE_PORT"
    fi
    
    # Start services
    docker-compose -f "$COMPOSE_FILE_NAME" up -d
    
    print_step "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec smart-search-postgres$CONTAINER_SUFFIX pg_isready -U user -d smartsearch >/dev/null 2>&1; then
            print_status "PostgreSQL is ready! ✓"
            break
        fi
        
        if [ $((attempt % 5)) -eq 0 ]; then
            print_step "Still waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "PostgreSQL failed to start within $((max_attempts * 2)) seconds"
        return 1
    fi
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec smart-search-redis$CONTAINER_SUFFIX redis-cli ping >/dev/null 2>&1; then
            print_status "Redis is ready! ✓"
            break
        fi
        
        if [ $((attempt % 5)) -eq 0 ]; then
            print_step "Still waiting for Redis... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Redis failed to start within $((max_attempts * 2)) seconds"
        return 1
    fi
    
    # Seed healthcare data into PostgreSQL
    print_step "Seeding healthcare data into PostgreSQL..."
    if [ -f "$SCRIPT_DIR/scripts/seed-data.sh" ]; then
        print_status "Running data seeding for $DATA_SIZE dataset..."
        "$SCRIPT_DIR/scripts/seed-data.sh" healthcare "$DATA_SIZE" postgres
        print_success "Healthcare data seeded successfully! ✓"
    else
        print_warning "Seed script not found, creating basic healthcare data..."
        # Fallback: create basic table structure
        docker exec smart-search-postgres$CONTAINER_SUFFIX psql -U user -d smartsearch -c "
            CREATE TABLE IF NOT EXISTS healthcare_data (
                id VARCHAR(255) PRIMARY KEY,
                title TEXT,
                description TEXT,
                condition_name TEXT,
                treatment TEXT,
                specialty TEXT,
                date_created DATE DEFAULT CURRENT_DATE,
                type VARCHAR(100) DEFAULT 'healthcare',
                search_vector tsvector
            );
            
            CREATE INDEX IF NOT EXISTS idx_healthcare_fts ON healthcare_data USING gin(search_vector);
            
            -- Insert sample healthcare data
            INSERT INTO healthcare_data (id, title, description, condition_name, treatment, specialty, search_vector) VALUES
            ('1', 'Diabetes Management', 'Comprehensive care for Type 1 and Type 2 diabetes patients', 'Diabetes', 'Insulin therapy and lifestyle management', 'Endocrinology', to_tsvector('english', 'Diabetes Management Comprehensive care for Type 1 and Type 2 diabetes patients')),
            ('2', 'Cardiac Surgery', 'Advanced surgical procedures for heart conditions', 'Heart Disease', 'Surgical intervention', 'Cardiology', to_tsvector('english', 'Cardiac Surgery Advanced surgical procedures for heart conditions')),
            ('3', 'Cancer Immunotherapy', 'Cutting-edge treatment using immune system', 'Cancer', 'Immunotherapy', 'Oncology', to_tsvector('english', 'Cancer Immunotherapy Cutting-edge treatment using immune system')),
            ('4', 'Mental Health Support', 'Comprehensive mental health services and therapy', 'Depression, Anxiety', 'Therapy and medication', 'Psychiatry', to_tsvector('english', 'Mental Health Support Comprehensive mental health services and therapy')),
            ('5', 'Pediatric Care', 'Specialized healthcare for children and infants', 'Various pediatric conditions', 'Age-appropriate treatments', 'Pediatrics', to_tsvector('english', 'Pediatric Care Specialized healthcare for children and infants'))
            ON CONFLICT (id) DO NOTHING;
        "
        print_status "Basic healthcare data created ✓"
    fi
    
    # Wait for showcase application
    print_status "Waiting for showcase application..."
    attempt=1
    max_attempts=60  # 5 minutes for the app to build and start
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:$SHOWCASE_PORT" >/dev/null 2>&1; then
            print_success "Showcase application is ready! ✓"
            break
        fi
        
        if [ $((attempt % 10)) -eq 0 ]; then
            print_step "Still waiting for showcase application... (attempt $attempt/$max_attempts)"
            print_status "The application is building, this may take a few minutes on first run..."
        fi
        
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Showcase application failed to start within $(($max_attempts * 5)) seconds"
        print_warning "Checking container logs..."
        docker-compose -f "$COMPOSE_FILE_NAME" logs --tail=20 postgres-redis-showcase
        return 1
    fi
}

# Function to show status
show_status() {
    echo ""
    print_header
    
    print_success "🎉 PostgreSQL + Redis Healthcare Showcase is running!"
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🌐 Access URLs:${NC}                              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Showcase App: ${GREEN}http://localhost:$SHOWCASE_PORT${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Health Check: ${GREEN}http://localhost:$SHOWCASE_PORT/api/health${NC} ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🗄️  Database Connections:${NC}                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • PostgreSQL: ${GREEN}localhost:$POSTGRES_PORT${NC}              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Database: ${GREEN}smartsearch${NC}                   ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Username: ${GREEN}user${NC}                         ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Password: ${GREEN}password${NC}                     ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Redis: ${GREEN}localhost:$REDIS_PORT${NC}                  ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🔍 Try these healthcare searches:${NC}            ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • diabetes                                 ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • cardiac surgery                          ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • immunotherapy                            ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • mental health                            ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • medical research                         ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${PURPLE}🚀 Features to explore:${NC}"
    echo "   • Multi-strategy search (Cache-first, Database-only, Circuit-breaker, Hybrid)"
    echo "   • Real-time performance metrics"
    echo "   • PostgreSQL full-text search with tsvector/tsquery"
    echo "   • Redis caching with intelligent fallback"
    echo "   • Healthcare dataset with medical terms and research"
    echo ""
    echo -e "${YELLOW}📊 Dataset: $DATA_SIZE healthcare records${NC}"
    echo ""
}

# Function to show logs
show_logs() {
    echo ""
    print_step "Showing recent logs (press Ctrl+C to stop)..."
    cd "$DOCKER_DIR"
    docker-compose -f "$COMPOSE_FILE_NAME" logs -f
}

# Function to stop services
stop_services() {
    print_step "Stopping PostgreSQL + Redis services..."
    cd "$DOCKER_DIR"
    docker-compose -f "$COMPOSE_FILE_NAME" down
    print_success "Services stopped successfully!"
}

# Function to restart services
restart_services() {
    print_step "Restarting PostgreSQL + Redis services..."
    stop_services
    sleep 2
    start_services
    show_status
}

# Function to show new usage (organized scripts)
show_usage_new() {
    print_header "PostgreSQL + Redis Healthcare Showcase"
    
    echo "This script now uses the new organized provider scripts for enhanced functionality."
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start    - Launch interactive dataset size selector (default)"
    echo "  stop     - Stop all PostgreSQL + Redis services"
    echo "  status   - Show current service status"  
    echo "  logs     - Show service logs"
    echo "  help     - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATA_SIZE - Pre-select dataset size (tiny, small, medium, large)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Interactive launcher"
    echo "  $0 start                    # Same as above"
    echo "  DATA_SIZE=medium $0 start   # Start directly with medium dataset"
    echo "  $0 stop                     # Stop all services"
    echo "  $0 status                   # Check what's running"
    echo ""
    echo "Advanced Usage (Direct Provider Scripts):"
    echo "  ./scripts/providers/postgres-redis/interactive.sh     # Interactive launcher"
    echo "  ./scripts/providers/postgres-redis/start-tiny.sh      # Start tiny dataset"
    echo "  ./scripts/providers/postgres-redis/start-small.sh     # Start small dataset"
    echo "  ./scripts/providers/postgres-redis/start-medium.sh    # Start medium dataset"
    echo "  ./scripts/providers/postgres-redis/start-large.sh     # Start large dataset"
    echo "  ./scripts/providers/postgres-redis/stop.sh            # Universal stop script"
    echo ""
    echo "Dataset Sizes:"
    echo "  tiny   - 1K records   (~30s startup)  - Quick testing"
    echo "  small  - 10K records  (~2m startup)   - Basic demos"
    echo "  medium - 100K records (~5m startup)   - Realistic testing"
    echo "  large  - 1M+ records  (~10m startup)  - Performance testing"
    echo ""
}

# Function to show legacy usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start    - Start the PostgreSQL + Redis showcase (default)"
    echo "  stop     - Stop all services"
    echo "  restart  - Restart all services"
    echo "  status   - Show service status and URLs"
    echo "  logs     - Show service logs"
    echo "  help     - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATA_SIZE - Dataset size (tiny, small, medium, large) [default: tiny]"
    echo ""
    echo "Examples:"
    echo "  $0                          # Start with tiny dataset"
    echo "  $0 start                    # Same as above"
    echo "  DATA_SIZE=medium $0 start   # Start with medium dataset"
    echo "  $0 stop                     # Stop services"
    echo "  $0 logs                     # Show logs"
    echo ""
}

# Main execution
main() {
    local command="${1:-start}"
    
    # Get script directory
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local provider_scripts_dir="$script_dir/scripts/providers/postgres-redis"
    
    # Check if new organized scripts exist
    if [ -d "$provider_scripts_dir" ]; then
        print_step "Using new organized scripts in $provider_scripts_dir/"
        
        case $command in
            start)
                # If DATA_SIZE is specified, use the appropriate script
                if [ -n "$DATA_SIZE" ]; then
                    case $DATA_SIZE in
                        tiny)
                            exec "$provider_scripts_dir/start-tiny.sh" start
                            ;;
                        small)
                            exec "$provider_scripts_dir/start-small.sh" start
                            ;;
                        medium)
                            exec "$provider_scripts_dir/start-medium.sh" start
                            ;;
                        large)
                            exec "$provider_scripts_dir/start-large.sh" start
                            ;;
                        *)
                            print_warning "Unknown dataset size: $DATA_SIZE"
                            print_status "Using interactive launcher..."
                            exec "$provider_scripts_dir/interactive.sh"
                            ;;
                    esac
                else
                    # No dataset size specified, use interactive launcher
                    exec "$provider_scripts_dir/interactive.sh"
                fi
                ;;
            stop)
                exec "$provider_scripts_dir/stop.sh"
                ;;
            status)
                exec "$provider_scripts_dir/stop.sh" status
                ;;
            logs)
                # Default to tiny if no size specified
                local size=${DATA_SIZE:-tiny}
                exec "$provider_scripts_dir/start-$size.sh" logs
                ;;
            help|--help|-h)
                show_usage_new
                ;;
            *)
                print_error "Unknown command: $command"
                show_usage_new
                exit 1
                ;;
        esac
    else
        # Fallback to legacy behavior if new scripts don't exist
        print_warning "New organized scripts not found, using legacy mode"
        
        case $command in
            start)
                print_header
                check_docker
                check_ports
                start_services
                show_status
                ;;
            stop)
                stop_services
                ;;
            restart)
                restart_services
                ;;
            status)
                show_status
                ;;
            logs)
                show_logs
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
    fi
}

# Run main function
main "$@"