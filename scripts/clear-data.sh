#!/bin/bash

# @samas/smart-search - Clear Database Data Script
# Clears existing data from databases for fresh seeding

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to clear PostgreSQL data
clear_postgres() {
    local container_name="${1:-smart-search-postgres}"
    
    print_step "Clearing PostgreSQL data in container: $container_name"
    
    if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
        docker exec "$container_name" psql -U user -d smartsearch -c "
            DROP TABLE IF EXISTS healthcare_data CASCADE;
            DROP TABLE IF EXISTS finance_data CASCADE;
            DROP TABLE IF EXISTS retail_data CASCADE;
        "
        print_status "PostgreSQL data cleared successfully"
    else
        print_warning "PostgreSQL container '$container_name' not found or not running"
    fi
}

# Function to clear Redis data
clear_redis() {
    local container_name="${1:-smart-search-redis}"
    
    print_step "Clearing Redis data in container: $container_name"
    
    if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
        docker exec "$container_name" redis-cli FLUSHALL
        print_status "Redis data cleared successfully"
    else
        print_warning "Redis container '$container_name' not found or not running"
    fi
}

# Function to clear MySQL data
clear_mysql() {
    local container_name="${1:-smart-search-mysql}"
    
    print_step "Clearing MySQL data in container: $container_name"
    
    if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
        docker exec "$container_name" mysql -u user -ppassword smartsearch -e "
            DROP TABLE IF EXISTS finance_data;
        "
        print_status "MySQL data cleared successfully"
    else
        print_warning "MySQL container '$container_name' not found or not running"
    fi
}

# Function to clear MongoDB data
clear_mongodb() {
    local container_name="${1:-smart-search-mongodb}"
    
    print_step "Clearing MongoDB data in container: $container_name"
    
    if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "$container_name"; then
        docker exec "$container_name" mongo smartsearch --eval "db.dropDatabase()"
        print_status "MongoDB data cleared successfully"
    else
        print_warning "MongoDB container '$container_name' not found or not running"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [database] [container-suffix]"
    echo ""
    echo "Databases: postgres, redis, mysql, mongodb, all"
    echo "Container Suffix: (optional) e.g., '-alt' for alternative port containers"
    echo ""
    echo "Examples:"
    echo "  $0                    # Clear all databases"
    echo "  $0 postgres           # Clear only PostgreSQL"
    echo "  $0 postgres -alt      # Clear PostgreSQL with -alt suffix"
    echo "  $0 all                # Clear all databases"
    echo ""
}

# Main execution
main() {
    local database="${1:-all}"
    local suffix="${2:-}"
    
    print_header "Smart Search Database Data Cleaner"
    
    if [ "$database" = "help" ] || [ "$database" = "--help" ] || [ "$database" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    print_warning "This will permanently delete all data from the selected databases!"
    read -p "Are you sure you want to continue? [y/N]: " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Operation cancelled"
        exit 0
    fi
    
    case $database in
        postgres)
            clear_postgres "smart-search-postgres$suffix"
            ;;
        redis)
            clear_redis "smart-search-redis$suffix"
            ;;
        mysql)
            clear_mysql "smart-search-mysql$suffix"
            ;;
        mongodb)
            clear_mongodb "smart-search-mongodb$suffix"
            ;;
        all)
            clear_postgres "smart-search-postgres$suffix"
            clear_redis "smart-search-redis$suffix"
            clear_mysql "smart-search-mysql$suffix"
            clear_mongodb "smart-search-mongodb$suffix"
            ;;
        *)
            print_error "Unknown database: $database"
            show_usage
            exit 1
            ;;
    esac
    
    print_header "Data Clearing Complete"
    print_status "You can now run seeding scripts for fresh data"
}

# Run main function
main "$@"