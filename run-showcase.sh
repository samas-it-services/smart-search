#!/bin/bash

# Universal SmartSearch Showcase Launcher
# Supports multiple simultaneous showcases with different provider combinations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Available provider combinations
PROVIDERS=(
    "postgres-redis"
    "mysql-dragonfly" 
    "mongodb-memcached"
)

# Available datasets
DATASETS=(
    "healthcare"
    "finance"
    "retail"
    "education"
    "real_estate"
)

# Available sizes
SIZES=(
    "tiny"
    "small"
    "medium"
    "large"
)

# Port range definitions for conflict avoidance
PORT_RANGES=(
    "postgres-redis:5100:5199"
    "mysql-dragonfly:5200:5299" 
    "mongodb-memcached:5400:5499"
    "screenshots:8100:8199"
    "development:3000:3099"
)

# Utility functions for graceful container and port management

check_port_available() {
    local port="$1"
    if lsof -i :$port >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

find_available_port() {
    local provider="$1"
    local start_port="$2"
    
    # Get port range for provider
    for range in "${PORT_RANGES[@]}"; do
        IFS=':' read -ra PARTS <<< "$range"
        if [[ "${PARTS[0]}" == "$provider" ]]; then
            local min_port="${PARTS[1]}"
            local max_port="${PARTS[2]}"
            
            # If custom start_port provided and in range, try that first
            if [[ -n "$start_port" && "$start_port" -ge "$min_port" && "$start_port" -le "$max_port" ]]; then
                if check_port_available "$start_port"; then
                    echo "$start_port"
                    return 0
                fi
            fi
            
            # Find first available port in range
            for (( port=$min_port; port<=$max_port; port++ )); do
                if check_port_available "$port"; then
                    echo "$port"
                    return 0
                fi
            done
            
            echo "ERROR: No available ports in range $min_port-$max_port for $provider" >&2
            return 1
        fi
    done
    
    # Fallback to original logic if provider not found
    echo "${start_port:-5000}"
}

cleanup_smart_search_containers() {
    local provider="$1"
    local dataset="$2"
    local size="$3"
    local force="$4"
    
    echo "🧹 Cleaning up existing Smart Search containers..."
    
    # Stop and remove containers by name pattern
    local containers=$(docker ps -a --filter "name=smart-search-" --format "{{.Names}}" 2>/dev/null || true)
    
    if [[ -n "$containers" ]]; then
        echo "Found existing containers:"
        echo "$containers" | sed 's/^/  • /'
        echo ""
        
        if [[ "$force" == "true" ]]; then
            echo "🛑 Force mode: Stopping and removing all Smart Search containers..."
        else
            echo "🛑 Stopping and removing containers..."
        fi
        
        # Stop containers first
        echo "$containers" | xargs -I {} docker stop {} 2>/dev/null || true
        
        # Remove containers
        echo "$containers" | xargs -I {} docker rm {} 2>/dev/null || true
        
        # Clean up orphaned networks
        docker network prune -f >/dev/null 2>&1 || true
        
        echo "✅ Container cleanup completed"
    else
        echo "ℹ️  No existing Smart Search containers to clean up"
    fi
    
    echo ""
}

show_system_status() {
    echo "🔍 Smart Search System Status"
    echo "============================="
    
    local containers=$(docker ps --filter "name=smart-search-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true)
    
    if [[ -n "$containers" && "$containers" != "NAMES	STATUS	PORTS" ]]; then
        echo ""
        echo "📊 Running Services:"
        echo "$containers"
        
        echo ""
        echo "🔌 Port Usage:"
        lsof -i -P | grep LISTEN | grep -E "(5[0-9]{3}|3[0-9]{3}|8[0-9]{3})" | awk '{print "  • Port " $9 " - " $1}' | sort -u || true
    else
        echo ""
        echo "ℹ️  No Smart Search services currently running"
    fi
    
    echo ""
}

verify_prerequisites() {
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        echo "❌ docker-compose is not installed. Please install docker-compose and try again."
        exit 1
    fi
    
    # Check if required directories exist
    if [[ ! -d "docker" ]]; then
        echo "❌ Docker configuration directory not found. Please run from the Smart Search root directory."
        exit 1
    fi
}

show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "COMMANDS:"
    echo "  start    Start a showcase configuration"
    echo "  stop     Stop a specific showcase"
    echo "  stop-all Stop all running showcases"
    echo "  list     List all running showcases"
    echo "  logs     Show logs for a specific showcase"
    echo "  status   Show system status and port usage"
    echo "  cleanup  Clean up all Smart Search containers and networks"
    echo ""
    echo "OPTIONS:"
    echo "  --provider    Provider combination (postgres-redis, mysql-dragonfly, mongodb-memcached)"
    echo "  --dataset     Dataset type (healthcare, finance, retail, education, real_estate)"
    echo "  --size        Dataset size (tiny, small, medium, large)"
    echo "  --config      Use existing environment file (optional)"
    echo "  --port        Custom port range start (optional, auto-detects available ports)"
    echo "  --force       Force cleanup of existing containers before starting"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 start --provider postgres-redis --dataset healthcare --size medium"
    echo "  $0 start --config postgres-redis-finance-large"
    echo "  $0 stop --provider postgres-redis --dataset healthcare --size medium"
    echo "  $0 list"
    echo "  $0 logs --provider postgres-redis --dataset healthcare --size medium"
    echo ""
    echo "PORT RANGES:"
    echo "  postgres-redis: 5000-5099"
    echo "  mysql-dragonfly: 5200-5299"
    echo "  mongodb-memcached: 5400-5499"
}

# Auto-assign port based on provider and increment
get_port_range() {
    local provider="$1"
    local dataset="$2"
    local size="$3"
    
    case "$provider" in
        "postgres-redis")
            echo "5000"
            ;;
        "mysql-dragonfly")
            echo "5200"
            ;;
        "mongodb-memcached")
            echo "5400"
            ;;
        *)
            echo "5000"
            ;;
    esac
}

# Generate unique combo name
get_combo_name() {
    local provider="$1"
    local dataset="$2"
    local size="$3"
    echo "${provider}-${dataset}-${size}"
}

# Create dynamic environment file
create_env_file() {
    local provider="$1"
    local dataset="$2"
    local size="$3"
    local port_start="$4"
    
    local combo=$(get_combo_name "$provider" "$dataset" "$size")
    local env_file="docker/envs/${combo}.env"
    
    # Create directory if it doesn't exist
    mkdir -p "docker/envs"
    
    cat > "$env_file" << EOF
# Generated configuration: $combo
PROVIDER_COMBO=$combo
SHOWCASE_TYPE=$provider
DATASET=$dataset
DATA_SIZE=$size

# Port assignments (${port_start}-$((port_start + 99)) range)
SHOWCASE_PORT=$port_start
$(get_database_port_config "$provider" "$((port_start + 1))")
$(get_cache_port_config "$provider" "$((port_start + 2))")

# Database configuration
$(get_database_url "$provider")
$(get_cache_url "$provider")
EOF
    
    echo "$env_file"
}

get_database_port_config() {
    local provider="$1"
    local port="$2"
    
    case "$provider" in
        "postgres-redis")
            echo "POSTGRES_PORT=$port"
            ;;
        "mysql-dragonfly")
            echo "MYSQL_PORT=$port"
            ;;
        "mongodb-memcached")
            echo "MONGODB_PORT=$port"
            ;;
    esac
}

get_cache_port_config() {
    local provider="$1"
    local port="$2"
    
    case "$provider" in
        "postgres-redis")
            echo "REDIS_PORT=$port"
            ;;
        "mysql-dragonfly")
            echo "DRAGONFLY_PORT=$port"
            ;;
        "mongodb-memcached")
            echo "MEMCACHED_PORT=$port"
            ;;
    esac
}

get_database_url() {
    local provider="$1"
    
    case "$provider" in
        "postgres-redis")
            echo "DATABASE_URL=postgresql://user:password@postgres:5432/smartsearch"
            ;;
        "mysql-dragonfly")
            echo "DATABASE_URL=mysql://user:password@mysql:3306/smartsearch"
            ;;
        "mongodb-memcached")
            echo "DATABASE_URL=mongodb://root:password@mongodb:27017/smartsearch"
            ;;
    esac
}

get_cache_url() {
    local provider="$1"
    
    case "$provider" in
        "postgres-redis")
            echo "CACHE_URL=redis://redis:6379"
            ;;
        "mysql-dragonfly")
            echo "CACHE_URL=redis://dragonfly:6379"
            ;;
        "mongodb-memcached")
            echo "CACHE_URL=memcached://memcached:11211"
            ;;
    esac
}

start_showcase() {
    local provider="$1"
    local dataset="$2"
    local size="$3"
    local config_file="$4"
    local custom_port="$5"
    local force_cleanup="$6"
    
    # Verify prerequisites first
    verify_prerequisites
    
    echo "🚀 Starting Smart Search Showcase"
    echo "=================================="
    
    # Validate inputs
    if [[ ! " ${PROVIDERS[@]} " =~ " $provider " ]]; then
        echo "❌ Invalid provider: $provider"
        echo "Available providers: ${PROVIDERS[*]}"
        exit 1
    fi
    
    if [[ ! " ${DATASETS[@]} " =~ " $dataset " ]]; then
        echo "❌ Invalid dataset: $dataset" 
        echo "Available datasets: ${DATASETS[*]}"
        exit 1
    fi
    
    if [[ ! " ${SIZES[@]} " =~ " $size " ]]; then
        echo "❌ Invalid size: $size"
        echo "Available sizes: ${SIZES[*]}"
        exit 1
    fi
    
    local combo=$(get_combo_name "$provider" "$dataset" "$size")
    
    # Graceful cleanup before starting
    cleanup_smart_search_containers "$provider" "$dataset" "$size" "$force_cleanup"
    
    # Smart port detection and assignment
    local port_start
    if [[ -n "$custom_port" ]]; then
        port_start=$(find_available_port "$provider" "$custom_port")
        if [[ $? -ne 0 ]]; then
            echo "❌ Cannot find available port starting from $custom_port"
            echo "💡 Try: $0 start --provider $provider --dataset $dataset --size $size"
            exit 1
        fi
        echo "🔌 Using requested port: $port_start"
    else
        port_start=$(find_available_port "$provider")
        if [[ $? -ne 0 ]]; then
            echo "❌ Cannot find available port in range for $provider"
            echo "💡 Try: $0 cleanup && $0 start --provider $provider --dataset $dataset --size $size --force"
            exit 1
        fi
        echo "🔌 Auto-detected available port: $port_start"
    fi
    
    # Use existing config or create new one
    local env_file
    if [[ -n "$config_file" ]]; then
        env_file="docker/envs/${config_file}.env"
        if [[ ! -f "$env_file" ]]; then
            echo "❌ Config file not found: $env_file"
            exit 1
        fi
    else
        env_file=$(create_env_file "$provider" "$dataset" "$size" "$port_start")
    fi
    
    echo ""
    echo "📋 Configuration Summary:"
    echo "   • Showcase: $combo"
    echo "   • Config: $env_file"
    echo "   • Port: $port_start"
    echo "   • Provider: $provider"
    echo "   • Dataset: $dataset ($size)"
    echo ""
    
    # Start the services with proper cleanup
    echo "🏗️  Starting services..."
    docker-compose \
        -f docker/base.docker-compose.yml \
        -f docker/${provider}.yml \
        --env-file "$env_file" \
        up -d --remove-orphans
    
    # Get the showcase port from env file
    local showcase_port=$(grep SHOWCASE_PORT "$env_file" | cut -d= -f2)
    
    echo ""
    echo "✅ Showcase started successfully!"
    echo ""
    echo "🌐 Access URLs:"
    echo "   • Showcase App: http://localhost:${showcase_port}"
    echo "   • Health Check: http://localhost:${showcase_port}/api/health"
    echo "   • Search API: http://localhost:${showcase_port}/api/search?q=test"
    echo "   • Stats API: http://localhost:${showcase_port}/api/stats"
    echo ""
    echo "📊 Service Details:"
    echo "   • Provider: $provider"
    echo "   • Dataset: $dataset ($size)"  
    echo "   • Port Range: ${showcase_port}-$((showcase_port + 99))"
    echo "   • Docker Network: smart-search"
    echo ""
    echo "📝 Management Commands:"
    echo "   • Stop: $0 stop --provider $provider --dataset $dataset --size $size"
    echo "   • Logs: $0 logs --provider $provider --dataset $dataset --size $size"
    echo "   • Status: $0 status"
    echo ""
    echo "🔍 Testing the service..."
    sleep 3
    
    # Basic health check
    if curl -f "http://localhost:${showcase_port}/api/health" >/dev/null 2>&1; then
        echo "✅ Health check passed - service is running correctly"
    else
        echo "⚠️  Health check failed - service may still be starting"
        echo "💡 Run: $0 logs --provider $provider --dataset $dataset --size $size"
    fi
}

stop_showcase() {
    local provider="$1"
    local dataset="$2" 
    local size="$3"
    
    local combo=$(get_combo_name "$provider" "$dataset" "$size")
    local env_file="docker/envs/${combo}.env"
    
    if [[ ! -f "$env_file" ]]; then
        echo "❌ Configuration not found: $env_file"
        exit 1
    fi
    
    echo "🛑 Stopping showcase: $combo"
    
    docker-compose \
        -f docker/base.docker-compose.yml \
        -f docker/${provider}.yml \
        --env-file "$env_file" \
        down
        
    echo "✅ Showcase stopped: $combo"
}

stop_all() {
    echo "🛑 Stopping all showcases..."
    
    # Find all running SmartSearch containers
    local containers=$(docker ps --filter "name=smart-search-" --format "{{.Names}}" | head -20)
    
    if [[ -z "$containers" ]]; then
        echo "ℹ️ No running showcases found"
        return
    fi
    
    echo "Found running containers:"
    echo "$containers"
    echo ""
    
    # Stop each env file configuration
    for env_file in docker/envs/*.env; do
        if [[ -f "$env_file" ]]; then
            local combo=$(basename "$env_file" .env)
            echo "Stopping $combo..."
            
            # Extract provider from combo name
            local provider=$(echo "$combo" | cut -d- -f1-2)
            
            docker-compose \
                -f docker/base.docker-compose.yml \
                -f docker/${provider}.yml \
                --env-file "$env_file" \
                down 2>/dev/null || true
        fi
    done
    
    echo "✅ All showcases stopped"
}

list_showcases() {
    echo "🔍 Running SmartSearch Showcases:"
    echo ""
    
    # Get all SmartSearch containers
    local containers=$(docker ps --filter "name=smart-search-" --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}")
    
    if [[ -z "$(echo "$containers" | grep -v NAMES)" ]]; then
        echo "ℹ️ No showcases currently running"
        echo ""
        echo "💡 Start a showcase with:"
        echo "   $0 start --provider postgres-redis --dataset healthcare --size medium"
        return
    fi
    
    echo "$containers"
    echo ""
    
    # Show available configurations
    echo "📄 Available Configurations:"
    if [[ -d "docker/envs" ]]; then
        for env_file in docker/envs/*.env; do
            if [[ -f "$env_file" ]]; then
                local combo=$(basename "$env_file" .env)
                local port=$(grep SHOWCASE_PORT "$env_file" | cut -d= -f2 2>/dev/null || echo "N/A")
                echo "   • $combo (port: $port)"
            fi
        done
    fi
}

show_logs() {
    local provider="$1"
    local dataset="$2"
    local size="$3"
    
    local combo=$(get_combo_name "$provider" "$dataset" "$size")
    local env_file="docker/envs/${combo}.env"
    
    if [[ ! -f "$env_file" ]]; then
        echo "❌ Configuration not found: $env_file"
        exit 1
    fi
    
    echo "📄 Logs for showcase: $combo"
    echo "Press Ctrl+C to exit"
    echo ""
    
    docker-compose \
        -f docker/base.docker-compose.yml \
        -f docker/${provider}.yml \
        --env-file "$env_file" \
        logs -f showcase
}

# Parse command line arguments
COMMAND=""
PROVIDER=""
DATASET=""
SIZE=""
CONFIG=""
CUSTOM_PORT=""
FORCE_CLEANUP="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|stop-all|list|logs|status|cleanup)
            COMMAND="$1"
            shift
            ;;
        --provider)
            PROVIDER="$2"
            shift 2
            ;;
        --dataset)
            DATASET="$2"
            shift 2
            ;;
        --size)
            SIZE="$2"
            shift 2
            ;;
        --config)
            CONFIG="$2"
            shift 2
            ;;
        --port)
            CUSTOM_PORT="$2"
            shift 2
            ;;
        --force)
            FORCE_CLEANUP="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "❌ Unknown argument: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute command
case "$COMMAND" in
    "start")
        if [[ -n "$CONFIG" ]]; then
            # Extract provider/dataset/size from config filename
            IFS='-' read -ra PARTS <<< "$CONFIG"
            PROVIDER="${PARTS[0]}-${PARTS[1]}"
            DATASET="${PARTS[2]}"
            SIZE="${PARTS[3]}"
        fi
        
        if [[ -z "$PROVIDER" || -z "$DATASET" || -z "$SIZE" ]]; then
            echo "❌ Missing required parameters for start command"
            echo "Required: --provider, --dataset, --size (or --config)"
            show_usage
            exit 1
        fi
        
        start_showcase "$PROVIDER" "$DATASET" "$SIZE" "$CONFIG" "$CUSTOM_PORT" "$FORCE_CLEANUP"
        ;;
    "stop")
        if [[ -z "$PROVIDER" || -z "$DATASET" || -z "$SIZE" ]]; then
            echo "❌ Missing required parameters for stop command"
            echo "Required: --provider, --dataset, --size"
            show_usage
            exit 1
        fi
        
        stop_showcase "$PROVIDER" "$DATASET" "$SIZE"
        ;;
    "stop-all")
        stop_all
        ;;
    "list")
        list_showcases
        ;;
    "status")
        show_system_status
        ;;
    "cleanup")
        cleanup_smart_search_containers "" "" "" "true"
        echo "🧹 Full system cleanup completed!"
        echo "💡 All Smart Search containers and networks have been removed."
        ;;
    "logs")
        if [[ -z "$PROVIDER" || -z "$DATASET" || -z "$SIZE" ]]; then
            echo "❌ Missing required parameters for logs command"
            echo "Required: --provider, --dataset, --size"
            show_usage
            exit 1
        fi
        
        show_logs "$PROVIDER" "$DATASET" "$SIZE"
        ;;
    "")
        echo "❌ No command specified"
        show_usage
        exit 1
        ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac