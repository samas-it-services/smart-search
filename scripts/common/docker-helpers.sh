#!/bin/bash

# @samas/smart-search - Common Docker Helper Functions
# Shared utilities for Docker operations across all providers

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}🔍 Smart Search - $1${NC} ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_status "Docker is running ✓"
}

# Function to wait for container to be healthy
wait_for_container_health() {
    local container_name=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    print_step "Waiting for $container_name to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null)
        
        case $health_status in
            "healthy")
                print_status "$container_name is healthy! ✓"
                return 0
                ;;
            "unhealthy")
                print_error "$container_name is unhealthy"
                return 1
                ;;
            "starting"|"")
                # Container is starting up or doesn't have health checks
                if [ $((attempt % 5)) -eq 0 ]; then
                    print_step "Still waiting for $container_name... (attempt $attempt/$max_attempts)"
                fi
                ;;
        esac
        
        sleep 2
        ((attempt++))
    done
    
    print_error "$container_name failed to become healthy within $((max_attempts * 2)) seconds"
    return 1
}

# Function to wait for specific service to be ready
wait_for_service() {
    local service_name=$1
    local container_name=$2
    local port=$3
    local max_attempts=${4:-60}
    local attempt=1
    
    print_step "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        case $service_name in
            postgres|postgresql)
                if docker exec "$container_name" pg_isready -U user -d smartsearch >/dev/null 2>&1; then
                    print_status "$service_name is ready! ✓"
                    return 0
                fi
                ;;
            mysql)
                if docker exec "$container_name" mysqladmin ping -h localhost -u user -ppassword >/dev/null 2>&1; then
                    print_status "$service_name is ready! ✓"
                    return 0
                fi
                ;;
            mongodb|mongo)
                if docker exec "$container_name" mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
                    print_status "$service_name is ready! ✓"
                    return 0
                fi
                ;;
            redis)
                if docker exec "$container_name" redis-cli ping >/dev/null 2>&1; then
                    print_status "$service_name is ready! ✓"
                    return 0
                fi
                ;;
            dragonfly)
                if docker exec "$container_name" redis-cli ping >/dev/null 2>&1; then
                    print_status "$service_name is ready! ✓"
                    return 0
                fi
                ;;
            memcached)
                if docker exec "$container_name" echo "stats" | nc localhost 11211 >/dev/null 2>&1; then
                    print_status "$service_name is ready! ✓"
                    return 0
                fi
                ;;
            *)
                # Fallback: try HTTP health check
                if curl -s -f "http://localhost:$port" >/dev/null 2>&1; then
                    print_status "$service_name is ready! ✓"
                    return 0
                fi
                ;;
        esac
        
        if [ $((attempt % 10)) -eq 0 ]; then
            print_step "Still waiting for $service_name... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to stop Docker services for a provider
stop_provider_services() {
    local provider=$1
    local docker_dir=$2
    local compose_file=$3
    
    print_step "Stopping $provider services..."
    
    if [ -f "$docker_dir/$compose_file" ]; then
        cd "$docker_dir"
        docker-compose -f "$compose_file" down --remove-orphans
        print_success "$provider services stopped successfully!"
    else
        print_warning "Docker compose file not found: $docker_dir/$compose_file"
    fi
}

# Function to get container logs
show_container_logs() {
    local container_name=$1
    local lines=${2:-50}
    
    print_step "Showing last $lines lines of logs for $container_name..."
    docker logs --tail "$lines" "$container_name" 2>&1
}

# Function to cleanup dangling containers and volumes
cleanup_provider() {
    local provider=$1
    
    print_step "Cleaning up $provider resources..."
    
    # Remove containers with provider name
    docker ps -a --filter "name=smart-search-" --format "{{.Names}}" | grep -i "$provider" | xargs -r docker rm -f
    
    # Remove volumes with provider name
    docker volume ls --filter "name=$provider" --format "{{.Name}}" | xargs -r docker volume rm
    
    print_success "$provider cleanup completed"
}

# Function to check service health via HTTP
check_http_health() {
    local url=$1
    local service_name=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    print_step "Checking $service_name health at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_status "$service_name is responding! ✓"
            return 0
        fi
        
        if [ $((attempt % 5)) -eq 0 ]; then
            print_step "Still checking $service_name health... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name health check failed after $((max_attempts * 2)) seconds"
    return 1
}

# Function to display service status information
show_service_status() {
    local provider=$1
    local showcase_port=$2
    local db_port=$3
    local cache_port=$4
    local dataset_size=$5
    
    echo ""
    print_header "$provider Showcase Status"
    
    print_success "🎉 $provider Healthcare Showcase is running!"
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🌐 Access URLs:${NC}                              ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Showcase App: ${GREEN}http://localhost:$showcase_port${NC}      ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Health Check: ${GREEN}http://localhost:$showcase_port/api/health${NC} ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}🗄️  Database Connections:${NC}                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Database: ${GREEN}localhost:$db_port${NC}                ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}   • Cache: ${GREEN}localhost:$cache_port${NC}                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Database: ${GREEN}smartsearch${NC}                   ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Username: ${GREEN}user${NC}                         ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC}     Password: ${GREEN}password${NC}                     ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${YELLOW}📊 Dataset: $dataset_size healthcare records${NC}"
    echo ""
}