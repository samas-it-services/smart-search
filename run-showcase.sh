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

show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "COMMANDS:"
    echo "  start    Start a showcase configuration"
    echo "  stop     Stop a specific showcase"
    echo "  stop-all Stop all running showcases"
    echo "  list     List all running showcases"
    echo "  logs     Show logs for a specific showcase"
    echo ""
    echo "OPTIONS:"
    echo "  --provider    Provider combination (postgres-redis, mysql-dragonfly, mongodb-memcached)"
    echo "  --dataset     Dataset type (healthcare, finance, retail, education, real_estate)"
    echo "  --size        Dataset size (tiny, small, medium, large)"
    echo "  --config      Use existing environment file (optional)"
    echo "  --port        Custom port range start (optional, defaults to auto-assign)"
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
            echo "DATABASE_URL=postgresql://user:password@database:5432/smartsearch"
            ;;
        "mysql-dragonfly")
            echo "DATABASE_URL=mysql://user:password@database:3306/smartsearch"
            ;;
        "mongodb-memcached")
            echo "DATABASE_URL=mongodb://root:password@database:27017/smartsearch"
            ;;
    esac
}

get_cache_url() {
    local provider="$1"
    
    case "$provider" in
        "postgres-redis"|"mysql-dragonfly")
            echo "CACHE_URL=redis://cache:6379"
            ;;
        "mongodb-memcached")
            echo "CACHE_URL=memcached://cache:11211"
            ;;
    esac
}

start_showcase() {
    local provider="$1"
    local dataset="$2"
    local size="$3"
    local config_file="$4"
    local custom_port="$5"
    
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
    
    # Use existing config or create new one
    local env_file
    if [[ -n "$config_file" ]]; then
        env_file="docker/envs/${config_file}.env"
        if [[ ! -f "$env_file" ]]; then
            echo "❌ Config file not found: $env_file"
            exit 1
        fi
    else
        local port_start=${custom_port:-$(get_port_range "$provider" "$dataset" "$size")}
        env_file=$(create_env_file "$provider" "$dataset" "$size" "$port_start")
    fi
    
    local combo=$(get_combo_name "$provider" "$dataset" "$size")
    
    echo "🚀 Starting showcase: $combo"
    echo "📄 Using config: $env_file"
    echo "🔗 Provider files: docker/base.docker-compose.yml + docker/${provider}.yml"
    
    # Start the services
    docker-compose \
        -f docker/base.docker-compose.yml \
        -f docker/${provider}.yml \
        --env-file "$env_file" \
        up -d
    
    # Get the showcase port from env file
    local showcase_port=$(grep SHOWCASE_PORT "$env_file" | cut -d= -f2)
    
    echo ""
    echo "✅ Showcase started successfully!"
    echo "🌐 Access URLs:"
    echo "   • Showcase App: http://localhost:${showcase_port}"
    echo "   • Health Check: http://localhost:${showcase_port}/api/health"
    echo "   • Search API: http://localhost:${showcase_port}/api/search?q=test"
    echo "   • Stats API: http://localhost:${showcase_port}/api/stats"
    echo ""
    echo "📊 Configuration:"
    echo "   • Provider: $provider"
    echo "   • Dataset: $dataset ($size)"
    echo "   • Port Range: ${showcase_port}-$((showcase_port + 99))"
    echo ""
    echo "📝 Management Commands:"
    echo "   • Stop: $0 stop --provider $provider --dataset $dataset --size $size"
    echo "   • Logs: $0 logs --provider $provider --dataset $dataset --size $size"
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

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|stop-all|list|logs)
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
        
        start_showcase "$PROVIDER" "$DATASET" "$SIZE" "$CONFIG" "$CUSTOM_PORT"
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