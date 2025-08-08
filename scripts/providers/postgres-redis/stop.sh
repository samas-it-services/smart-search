#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Universal Stop Script
# Stop PostgreSQL + Redis showcase regardless of dataset size

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMMON_DIR="$SCRIPT_DIR/../../common"

# Source common utilities
source "$COMMON_DIR/docker-helpers.sh"
source "$COMMON_DIR/port-management.sh"

PROVIDER="postgres-redis"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Main function
main() {
    local command="${1:-stop}"
    
    case $command in
        stop|--stop)
            print_header "Stopping PostgreSQL + Redis Showcase"
            stop_all_postgres_redis_services
            ;;
        cleanup|--cleanup)
            print_header "Cleaning up PostgreSQL + Redis Resources"
            stop_all_postgres_redis_services
            cleanup_provider "$PROVIDER"
            ;;
        force|--force)
            print_header "Force Stopping PostgreSQL + Redis Services"
            force_stop_services
            ;;
        status|--status)
            show_status
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            stop_all_postgres_redis_services
            ;;
    esac
}

# Function to stop all PostgreSQL + Redis services
stop_all_postgres_redis_services() {
    print_step "Stopping all PostgreSQL + Redis services..."
    
    # Try both standard and alternative port configurations
    local compose_files=(
        "postgres-redis.docker-compose.yml"
        "postgres-redis-alt-ports.docker-compose.yml"
    )
    
    local stopped_any=false
    
    for compose_file in "${compose_files[@]}"; do
        if [ -f "$DOCKER_DIR/$compose_file" ]; then
            print_step "Checking $compose_file..."
            
            cd "$DOCKER_DIR"
            
            # Check if any containers from this compose file are running
            local running_containers=$(docker-compose -f "$compose_file" ps -q 2>/dev/null | wc -l)
            
            if [ "$running_containers" -gt 0 ]; then
                print_status "Stopping services from $compose_file..."
                docker-compose -f "$compose_file" down --remove-orphans
                stopped_any=true
            fi
        fi
    done
    
    # Also stop any containers that might be running with smart-search-postgres or smart-search-redis names
    local postgres_containers=$(docker ps -q --filter "name=smart-search-postgres")
    local redis_containers=$(docker ps -q --filter "name=smart-search-redis")
    local showcase_containers=$(docker ps -q --filter "name=smart-search-postgres-redis-showcase")
    
    if [ -n "$postgres_containers" ]; then
        print_step "Stopping PostgreSQL containers..."
        echo "$postgres_containers" | xargs docker stop
        stopped_any=true
    fi
    
    if [ -n "$redis_containers" ]; then
        print_step "Stopping Redis containers..."
        echo "$redis_containers" | xargs docker stop
        stopped_any=true
    fi
    
    if [ -n "$showcase_containers" ]; then
        print_step "Stopping showcase containers..."
        echo "$showcase_containers" | xargs docker stop
        stopped_any=true
    fi
    
    if [ "$stopped_any" = true ]; then
        print_success "PostgreSQL + Redis services stopped successfully!"
    else
        print_status "No PostgreSQL + Redis services were running"
    fi
}

# Function to force stop all related containers
force_stop_services() {
    print_step "Force stopping all PostgreSQL + Redis containers..."
    
    # Force stop and remove all smart-search related containers
    docker ps -a --filter "name=smart-search-postgres" --format "{{.Names}}" | xargs -r docker rm -f
    docker ps -a --filter "name=smart-search-redis" --format "{{.Names}}" | xargs -r docker rm -f
    docker ps -a --filter "name=postgres-redis-showcase" --format "{{.Names}}" | xargs -r docker rm -f
    
    print_success "All PostgreSQL + Redis containers force stopped and removed"
}

# Function to show current status
show_status() {
    print_step "PostgreSQL + Redis Service Status:"
    
    # Check for running containers
    local postgres_running=$(docker ps --filter "name=smart-search-postgres" --format "{{.Names}}" | wc -l)
    local redis_running=$(docker ps --filter "name=smart-search-redis" --format "{{.Names}}" | wc -l)
    local showcase_running=$(docker ps --filter "name=postgres-redis-showcase" --format "{{.Names}}" | wc -l)
    
    echo ""
    echo "   PostgreSQL containers: $postgres_running running"
    echo "   Redis containers: $redis_running running"
    echo "   Showcase containers: $showcase_running running"
    echo ""
    
    if [ "$postgres_running" -gt 0 ] || [ "$redis_running" -gt 0 ] || [ "$showcase_running" -gt 0 ]; then
        print_status "Services are currently running"
        
        # Show specific container details
        if [ "$postgres_running" -gt 0 ]; then
            echo "PostgreSQL containers:"
            docker ps --filter "name=smart-search-postgres" --format "   {{.Names}} ({{.Status}})"
        fi
        
        if [ "$redis_running" -gt 0 ]; then
            echo "Redis containers:"
            docker ps --filter "name=smart-search-redis" --format "   {{.Names}} ({{.Status}})"
        fi
        
        if [ "$showcase_running" -gt 0 ]; then
            echo "Showcase containers:"
            docker ps --filter "name=postgres-redis-showcase" --format "   {{.Names}} ({{.Status}})"
        fi
    else
        print_status "No PostgreSQL + Redis services are currently running"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  stop     - Stop all PostgreSQL + Redis services (default)"
    echo "  cleanup  - Stop services and remove containers/volumes"
    echo "  force    - Force stop and remove all related containers"
    echo "  status   - Show current service status"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Stop all services"
    echo "  $0 stop               # Same as above"
    echo "  $0 cleanup            # Stop and cleanup all resources"
    echo "  $0 status             # Check what's running"
    echo ""
}

# Run main function
main "$@"