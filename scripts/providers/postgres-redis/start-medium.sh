#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Medium Dataset Launcher
# Launch healthcare showcase with medium dataset (100K records)

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
export DATA_SIZE="medium"

# Main function
main() {
    local command="${1:-start}"
    
    case $command in
        start)
            print_header "PostgreSQL + Redis Medium Dataset (100K records)"
            
            # Check Docker
            check_docker
            
            # Configure ports
            configure_provider_ports "$PROVIDER"
            show_port_info "$PROVIDER"
            
            # Show dataset info with warning
            show_dataset_info
            print_warning "Medium dataset startup may take ~5 minutes"
            
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
    print_step "Starting PostgreSQL + Redis services (medium dataset)..."
    
    cd "$DOCKER_DIR"
    
    # Start Docker services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services
    wait_for_service postgres "smart-search-postgres$CONTAINER_SUFFIX"
    wait_for_service redis "smart-search-redis$CONTAINER_SUFFIX"
    
    # Seed data
    print_step "Seeding healthcare data (medium dataset - this may take ~5 minutes)..."
    print_status "Processing 100K healthcare records..."
    export USE_ALT_PORTS CONTAINER_SUFFIX
    "$PROJECT_ROOT/scripts/seed-data.sh" healthcare medium postgres
    
    # Wait for showcase app
    check_http_health "http://localhost:$SHOWCASE_PORT/api/health" "Showcase Application" 60
    
    print_success "PostgreSQL + Redis medium dataset showcase started successfully!"
    print_status "Ready for realistic performance testing with 100K records"
}

# Function to stop services
stop_services() {
    stop_provider_services "$PROVIDER" "$DOCKER_DIR" "$COMPOSE_FILE"
}

# Function to show logs
show_logs() {
    configure_provider_ports "$PROVIDER"
    print_step "Showing PostgreSQL + Redis logs (medium dataset)..."
    cd "$DOCKER_DIR"
    docker-compose -f "$COMPOSE_FILE" logs -f
}

# Run main function
main "$@"