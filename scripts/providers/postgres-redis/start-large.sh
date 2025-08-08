#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Large Dataset Launcher
# Launch healthcare showcase with large dataset (1M+ records)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMMON_DIR="$SCRIPT_DIR/../../common"

# Source common utilities
source "$COMMON_DIR/docker-helpers.sh"
source "$COMMON_DIR/port-management.sh"
source "$COMMON_DIR/dataset-helpers.sh"

PROVIDER="postgres-redis"
DOCKER_DIR="$PROJECT_ROOT/docker"
export DATA_SIZE="large"

# Main function
main() {
    local command="${1:-start}"
    
    case $command in
        start)
            print_header "PostgreSQL + Redis Large Dataset (1M+ records)"
            
            # Check Docker
            check_docker
            
            # Configure ports
            configure_provider_ports "$PROVIDER"
            show_port_info "$PROVIDER"
            
            # Show dataset info with warning
            show_dataset_info
            print_warning "Large dataset startup may take ~10 minutes"
            print_warning "Ensure you have sufficient system resources (4GB+ RAM recommended)"
            
            # Check force mode for automation
            if [ "$FORCE" != true ]; then
                print_status "Large dataset requires significant resources (4GB+ RAM, ~10 minute startup)"
                print_status "Use --force flag or set FORCE=true environment variable to proceed automatically"
                print_error "Large dataset launch requires explicit confirmation. Exiting."
                print_status "To proceed: $0 --force or FORCE=true $0"
                exit 1
            else
                print_status "Force mode enabled - proceeding with large dataset launch"
            fi
            
            # Ensure dataset is available
            ensure_dataset_available "$PROVIDER" "$DATA_SIZE" "healthcare"
            
            # Start services
            start_services
            
            # Show final status
            show_service_status "$PROVIDER" "$SHOWCASE_PORT" "$POSTGRES_PORT" "$REDIS_PORT" "$DATA_SIZE"
            ;;
        stop)
            stop_services
            ;;
        status)
            configure_provider_ports "$PROVIDER"
            show_service_status "$PROVIDER" "$SHOWCASE_PORT" "$POSTGRES_PORT" "$REDIS_PORT" "$DATA_SIZE"
            ;;
        logs)
            show_logs
            ;;
        *)
            echo "Usage: $0 [start|stop|status|logs]"
            exit 1
            ;;
    esac
}

# Function to start services
start_services() {
    print_step "Starting PostgreSQL + Redis services (large dataset)..."
    
    cd "$DOCKER_DIR"
    
    # Start Docker services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services
    wait_for_service postgres "smart-search-postgres$CONTAINER_SUFFIX"
    wait_for_service redis "smart-search-redis$CONTAINER_SUFFIX"
    
    # Seed data
    print_step "Seeding healthcare data (large dataset - this may take ~10 minutes)..."
    print_status "Processing 1M+ healthcare records..."
    print_status "This is perfect for performance testing and scalability validation"
    export USE_ALT_PORTS CONTAINER_SUFFIX
    "$PROJECT_ROOT/scripts/seed-data.sh" healthcare large postgres
    
    # Wait for showcase app
    print_step "Starting showcase application..."
    check_http_health "http://localhost:$SHOWCASE_PORT/api/health" "Showcase Application" 120
    
    print_success "PostgreSQL + Redis large dataset showcase started successfully!"
    print_success "Ready for production-scale performance testing with 1M+ records!"
    echo ""
    echo "💡 Performance Testing Tips:"
    echo "   • Try concurrent searches to test scalability"
    echo "   • Monitor cache hit rates in the stats page"
    echo "   • Test different search strategies (cache-first, database-only, hybrid)"
    echo "   • Use complex queries to stress-test full-text search"
}

# Function to stop services
stop_services() {
    print_step "Stopping large dataset services..."
    stop_provider_services "$PROVIDER" "$DOCKER_DIR" "$COMPOSE_FILE"
    print_success "Large dataset resources freed up"
}

# Function to show logs
show_logs() {
    configure_provider_ports "$PROVIDER"
    print_step "Showing PostgreSQL + Redis logs (large dataset)..."
    cd "$DOCKER_DIR"
    docker-compose -f "$COMPOSE_FILE" logs -f
}

# Run main function
main "$@"