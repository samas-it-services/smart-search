#!/bin/bash

# @samas/smart-search - Docker Development Environment Management
# Script to manage Docker development environment for multi-database testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to start all services
start_all() {
    print_header "Starting Smart Search Development Environment"
    check_docker
    cd "$DOCKER_DIR"
    
    print_status "Starting all services..."
    docker-compose up -d
    
    print_status "Waiting for services to be ready..."
    sleep 30
    
    print_status "Checking service health..."
    docker-compose ps
    
    print_header "Development Environment Ready!"
    print_status "Services available at:"
    echo "  🐘 PostgreSQL:     localhost:5432 (user/password)"
    echo "  🐬 MySQL:          localhost:3306 (user/password)"
    echo "  🍃 MongoDB:        localhost:27017 (root/rootpassword)"
    echo "  🔴 Redis:          localhost:6379"
    echo "  🐉 DragonflyDB:    localhost:6380"
    echo "  💾 Memcached:      localhost:11211"
    echo ""
    echo "  🌐 Adminer:        http://localhost:8080"
    echo "  📊 Redis Commander: http://localhost:8081"
    echo "  🍀 Mongo Express:  http://localhost:8082 (admin/admin)"
    echo "  📈 Grafana:        http://localhost:3000 (admin/admin)"
    echo "  🔍 Prometheus:     http://localhost:9090"
}

# Function to stop all services
stop_all() {
    print_header "Stopping Smart Search Development Environment"
    check_docker
    cd "$DOCKER_DIR"
    
    print_status "Stopping all services..."
    docker-compose down
    print_status "All services stopped."
}

# Function to restart all services
restart_all() {
    print_header "Restarting Smart Search Development Environment"
    stop_all
    sleep 5
    start_all
}

# Function to show service status
status() {
    print_header "Smart Search Service Status"
    check_docker
    cd "$DOCKER_DIR"
    
    docker-compose ps
}

# Function to view logs
logs() {
    local service=$1
    check_docker
    cd "$DOCKER_DIR"
    
    if [ -z "$service" ]; then
        print_status "Showing logs for all services (last 100 lines)..."
        docker-compose logs --tail=100 -f
    else
        print_status "Showing logs for $service..."
        docker-compose logs --tail=100 -f "$service"
    fi
}

# Function to run database tests
test_databases() {
    print_header "Testing Database Connections"
    check_docker
    
    # Test MySQL
    print_status "Testing MySQL connection..."
    if docker exec smart-search-mysql mysql -u user -ppassword -e "SELECT 1;" >/dev/null 2>&1; then
        echo "  ✅ MySQL: Connected"
    else
        echo "  ❌ MySQL: Connection failed"
    fi
    
    # Test PostgreSQL
    print_status "Testing PostgreSQL connection..."
    if docker exec smart-search-postgres psql -U user -d smartsearch -c "SELECT 1;" >/dev/null 2>&1; then
        echo "  ✅ PostgreSQL: Connected"
    else
        echo "  ❌ PostgreSQL: Connection failed"
    fi
    
    # Test MongoDB
    print_status "Testing MongoDB connection..."
    if docker exec smart-search-mongodb mongosh --quiet --eval "db.runCommand('ping')" >/dev/null 2>&1; then
        echo "  ✅ MongoDB: Connected"
    else
        echo "  ❌ MongoDB: Connection failed"
    fi
    
    # Test Redis
    print_status "Testing Redis connection..."
    if docker exec smart-search-redis redis-cli ping >/dev/null 2>&1; then
        echo "  ✅ Redis: Connected"
    else
        echo "  ❌ Redis: Connection failed"
    fi
    
    # Test DragonflyDB
    print_status "Testing DragonflyDB connection..."
    if docker exec smart-search-dragonfly redis-cli ping >/dev/null 2>&1; then
        echo "  ✅ DragonflyDB: Connected"
    else
        echo "  ❌ DragonflyDB: Connection failed"
    fi
    
    # Test Memcached
    print_status "Testing Memcached connection..."
    if echo "version" | docker exec -i smart-search-memcached nc localhost 11211 >/dev/null 2>&1; then
        echo "  ✅ Memcached: Connected"
    else
        echo "  ❌ Memcached: Connection failed"
    fi
}

# Function to reset all data
reset_data() {
    print_header "Resetting All Data"
    print_warning "This will DELETE ALL DATA in the development databases!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Reset cancelled."
        return
    fi
    
    check_docker
    cd "$DOCKER_DIR"
    
    print_status "Stopping services..."
    docker-compose down -v
    
    print_status "Removing volumes..."
    docker volume prune -f
    
    print_status "Starting services with fresh data..."
    docker-compose up -d
    
    print_status "Waiting for services to initialize..."
    sleep 60
    
    print_status "Data reset complete!"
}

# Function to create database showcase
create_showcase() {
    local db_type=$1
    local cache_type=$2
    
    if [ -z "$db_type" ] || [ -z "$cache_type" ]; then
        print_error "Usage: $0 showcase <database> <cache>"
        print_status "Available databases: mysql, postgres, mongodb"
        print_status "Available caches: redis, dragonfly, memcached"
        return 1
    fi
    
    print_header "Creating Showcase: $db_type + $cache_type"
    
    # Create showcase configuration
    local showcase_dir="$PROJECT_ROOT/showcases/${db_type}-${cache_type}"
    mkdir -p "$showcase_dir"
    
    # Generate configuration file
    cat > "$showcase_dir/smart-search.config.json" << EOF
{
  "database": {
    "type": "$db_type",
    "connection": {
$(case $db_type in
    "mysql")
        cat << 'MYSQL_CONFIG'
      "host": "localhost",
      "port": 3306,
      "user": "user",
      "password": "password",
      "database": "smartsearch"
MYSQL_CONFIG
        ;;
    "postgres")
        cat << 'POSTGRES_CONFIG'
      "host": "localhost",
      "port": 5432,
      "user": "user",
      "password": "password",
      "database": "smartsearch"
POSTGRES_CONFIG
        ;;
    "mongodb")
        cat << 'MONGODB_CONFIG'
      "uri": "mongodb://root:rootpassword@localhost:27017/smartsearch?authSource=admin"
MONGODB_CONFIG
        ;;
esac)
    }
  },
  "cache": {
    "type": "$cache_type",
    "connection": {
$(case $cache_type in
    "redis")
        cat << 'REDIS_CONFIG'
      "host": "localhost",
      "port": 6379
REDIS_CONFIG
        ;;
    "dragonfly")
        cat << 'DRAGONFLY_CONFIG'
      "host": "localhost",
      "port": 6380
DRAGONFLY_CONFIG
        ;;
    "memcached")
        cat << 'MEMCACHED_CONFIG'
      "servers": ["localhost:11211"]
MEMCACHED_CONFIG
        ;;
esac)
    }
  },
  "search": {
    "fallback": "database",
    "tables": {
$(case $db_type in
    "mysql")
        cat << 'MYSQL_TABLES'
      "books": {
        "columns": {
          "id": "id",
          "title": "title",
          "author": "author",
          "description": "description",
          "category": "category"
        },
        "searchColumns": ["title", "author", "description"],
        "type": "book"
      }
MYSQL_TABLES
        ;;
    "postgres")
        cat << 'POSTGRES_TABLES'
      "articles": {
        "columns": {
          "id": "id",
          "title": "title",
          "author": "author",
          "description": "content",
          "category": "category"
        },
        "searchColumns": ["title", "author", "content"],
        "type": "article"
      }
POSTGRES_TABLES
        ;;
    "mongodb")
        cat << 'MONGODB_TABLES'
      "documents": {
        "collection": "documents",
        "columns": {
          "id": "_id",
          "title": "title",
          "author": "author",
          "description": "content",
          "category": "category"
        },
        "searchColumns": ["title", "author", "content"],
        "type": "document"
      }
MONGODB_TABLES
        ;;
esac)
    }
  }
}
EOF

    print_status "Showcase configuration created at: $showcase_dir/smart-search.config.json"
    print_status "Use this configuration to test $db_type + $cache_type combination"
}

# Main script logic
case "${1:-}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "status")
        status
        ;;
    "logs")
        logs "$2"
        ;;
    "test")
        test_databases
        ;;
    "reset")
        reset_data
        ;;
    "showcase")
        create_showcase "$2" "$3"
        ;;
    "help"|"--help"|"-h")
        echo "Smart Search Docker Development Environment Manager"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  start              Start all services"
        echo "  stop               Stop all services"
        echo "  restart            Restart all services"
        echo "  status             Show service status"
        echo "  logs [service]     Show logs (all services or specific service)"
        echo "  test               Test database connections"
        echo "  reset              Reset all data (WARNING: destructive)"
        echo "  showcase <db> <cache>  Create showcase configuration"
        echo "  help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs mysql"
        echo "  $0 showcase postgres redis"
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        print_status "Use '$0 help' for usage information."
        exit 1
        ;;
esac