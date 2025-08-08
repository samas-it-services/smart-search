#!/bin/bash

# @samas/smart-search - Port Management Functions
# Handles port conflict detection and resolution across providers

# Source docker helpers for consistent logging
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-helpers.sh"

# Function to check if a port is in use
is_port_in_use() {
    local port=$1
    lsof -i :$port >/dev/null 2>&1
}

# Function to find next available port starting from a base port
find_available_port() {
    local base_port=$1
    local max_attempts=${2:-100}
    
    for i in $(seq 0 $max_attempts); do
        local test_port=$((base_port + i))
        if ! is_port_in_use $test_port; then
            echo $test_port
            return 0
        fi
    done
    
    print_error "Could not find available port starting from $base_port"
    return 1
}

# Function to check standard ports for a provider
check_provider_ports() {
    local provider=$1
    local standard_ports=()
    local conflicts=()
    
    case $provider in
        postgres-redis|postgresql-redis)
            standard_ports=("3002" "5432" "6379")
            ;;
        mysql-dragonfly)
            standard_ports=("3003" "3306" "6380")
            ;;
        mongodb-memcached)
            standard_ports=("3004" "27017" "11211")
            ;;
        deltalake-redis)
            standard_ports=("3005" "5432" "6379")
            ;;
        sqlite-inmemory)
            standard_ports=("3006")
            ;;
        *)
            print_error "Unknown provider: $provider"
            return 1
            ;;
    esac
    
    for port in "${standard_ports[@]}"; do
        if is_port_in_use $port; then
            conflicts+=("$port")
        fi
    done
    
    if [ ${#conflicts[@]} -gt 0 ]; then
        print_warning "Standard ports are in use for $provider: ${conflicts[*]}"
        return 1
    else
        print_status "All standard ports are available for $provider"
        return 0
    fi
}

# Function to get alternative port configuration for a provider
get_alternative_ports() {
    local provider=$1
    
    case $provider in
        postgres-redis|postgresql-redis)
            echo "SHOWCASE_PORT=$(find_available_port 13000)"
            echo "POSTGRES_PORT=$(find_available_port 15432)"
            echo "REDIS_PORT=$(find_available_port 16379)"
            echo "CONTAINER_SUFFIX=-alt"
            echo "COMPOSE_FILE=postgres-redis-alt-ports.docker-compose.yml"
            ;;
        mysql-dragonfly)
            echo "SHOWCASE_PORT=$(find_available_port 13003)"
            echo "MYSQL_PORT=$(find_available_port 13306)"
            echo "DRAGONFLY_PORT=$(find_available_port 16380)"
            echo "CONTAINER_SUFFIX=-alt"
            echo "COMPOSE_FILE=mysql-dragonfly-alt-ports.docker-compose.yml"
            ;;
        mongodb-memcached)
            echo "SHOWCASE_PORT=$(find_available_port 13004)"
            echo "MONGODB_PORT=$(find_available_port 27018)"
            echo "MEMCACHED_PORT=$(find_available_port 11212)"
            echo "CONTAINER_SUFFIX=-alt"
            echo "COMPOSE_FILE=mongodb-memcached-alt-ports.docker-compose.yml"
            ;;
        deltalake-redis)
            echo "SHOWCASE_PORT=$(find_available_port 13005)"
            echo "SPARK_PORT=$(find_available_port 8081)"
            echo "REDIS_PORT=$(find_available_port 16381)"
            echo "CONTAINER_SUFFIX=-alt"
            echo "COMPOSE_FILE=deltalake-redis-alt-ports.docker-compose.yml"
            ;;
        sqlite-inmemory)
            echo "SHOWCASE_PORT=$(find_available_port 13006)"
            echo "CONTAINER_SUFFIX=-alt"
            echo "COMPOSE_FILE=sqlite-inmemory-alt-ports.docker-compose.yml"
            ;;
        *)
            print_error "Unknown provider: $provider"
            return 1
            ;;
    esac
}

# Function to get standard port configuration for a provider
get_standard_ports() {
    local provider=$1
    
    case $provider in
        postgres-redis|postgresql-redis)
            echo "SHOWCASE_PORT=3002"
            echo "POSTGRES_PORT=5432"
            echo "REDIS_PORT=6379"
            echo "CONTAINER_SUFFIX="
            echo "COMPOSE_FILE=postgres-redis.docker-compose.yml"
            ;;
        mysql-dragonfly)
            echo "SHOWCASE_PORT=3003"
            echo "MYSQL_PORT=3306"
            echo "DRAGONFLY_PORT=6380"
            echo "CONTAINER_SUFFIX="
            echo "COMPOSE_FILE=mysql-dragonfly.docker-compose.yml"
            ;;
        mongodb-memcached)
            echo "SHOWCASE_PORT=3004"
            echo "MONGODB_PORT=27017"
            echo "MEMCACHED_PORT=11211"
            echo "CONTAINER_SUFFIX="
            echo "COMPOSE_FILE=mongodb-memcached.docker-compose.yml"
            ;;
        deltalake-redis)
            echo "SHOWCASE_PORT=3005"
            echo "SPARK_PORT=8080"
            echo "REDIS_PORT=6379"
            echo "CONTAINER_SUFFIX="
            echo "COMPOSE_FILE=deltalake-redis.docker-compose.yml"
            ;;
        sqlite-inmemory)
            echo "SHOWCASE_PORT=3006"
            echo "CONTAINER_SUFFIX="
            echo "COMPOSE_FILE=sqlite-inmemory.docker-compose.yml"
            ;;
        *)
            print_error "Unknown provider: $provider"
            return 1
            ;;
    esac
}

# Function to configure ports for a provider
configure_provider_ports() {
    local provider=$1
    
    if check_provider_ports "$provider"; then
        # Standard ports are available
        print_status "Using standard ports for $provider"
        eval "$(get_standard_ports "$provider")"
        export USE_ALT_PORTS=false
    else
        # Need alternative ports
        print_status "Using alternative ports for $provider to avoid conflicts"
        eval "$(get_alternative_ports "$provider")"
        export USE_ALT_PORTS=true
    fi
    
    # Export all port variables
    case $provider in
        postgres-redis|postgresql-redis)
            export SHOWCASE_PORT POSTGRES_PORT REDIS_PORT CONTAINER_SUFFIX COMPOSE_FILE
            ;;
        mysql-dragonfly)
            export SHOWCASE_PORT MYSQL_PORT DRAGONFLY_PORT CONTAINER_SUFFIX COMPOSE_FILE
            ;;
        mongodb-memcached)
            export SHOWCASE_PORT MONGODB_PORT MEMCACHED_PORT CONTAINER_SUFFIX COMPOSE_FILE
            ;;
        deltalake-redis)
            export SHOWCASE_PORT SPARK_PORT REDIS_PORT CONTAINER_SUFFIX COMPOSE_FILE
            ;;
        sqlite-inmemory)
            export SHOWCASE_PORT CONTAINER_SUFFIX COMPOSE_FILE
            ;;
    esac
}

# Function to show port information for a provider
show_port_info() {
    local provider=$1
    
    print_step "Port Configuration for $provider:"
    
    case $provider in
        postgres-redis|postgresql-redis)
            echo "   • Showcase: $SHOWCASE_PORT"
            echo "   • PostgreSQL: $POSTGRES_PORT"
            echo "   • Redis: $REDIS_PORT"
            ;;
        mysql-dragonfly)
            echo "   • Showcase: $SHOWCASE_PORT"
            echo "   • MySQL: $MYSQL_PORT"
            echo "   • DragonflyDB: $DRAGONFLY_PORT"
            ;;
        mongodb-memcached)
            echo "   • Showcase: $SHOWCASE_PORT"
            echo "   • MongoDB: $MONGODB_PORT"
            echo "   • Memcached: $MEMCACHED_PORT"
            ;;
        deltalake-redis)
            echo "   • Showcase: $SHOWCASE_PORT"
            echo "   • Spark: $SPARK_PORT"
            echo "   • Redis: $REDIS_PORT"
            ;;
        sqlite-inmemory)
            echo "   • Showcase: $SHOWCASE_PORT"
            ;;
    esac
    
    if [ "$USE_ALT_PORTS" = "true" ]; then
        print_warning "Using alternative ports due to conflicts"
    else
        print_status "Using standard ports"
    fi
}

# Function to list all processes using specific ports
show_port_usage() {
    local provider=$1
    
    case $provider in
        postgres-redis|postgresql-redis)
            local ports=("3002" "5432" "6379")
            ;;
        mysql-dragonfly)
            local ports=("3003" "3306" "6380")
            ;;
        mongodb-memcached)
            local ports=("3004" "27017" "11211")
            ;;
        deltalake-redis)
            local ports=("3005" "8080" "6379")
            ;;
        sqlite-inmemory)
            local ports=("3006")
            ;;
        *)
            print_error "Unknown provider: $provider"
            return 1
            ;;
    esac
    
    print_step "Port usage for $provider:"
    
    for port in "${ports[@]}"; do
        echo -n "   Port $port: "
        if is_port_in_use $port; then
            echo -e "${RED}IN USE${NC}"
            lsof -i :$port | grep LISTEN | while read line; do
                echo "     $line"
            done
        else
            echo -e "${GREEN}AVAILABLE${NC}"
        fi
    done
}