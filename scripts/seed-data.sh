#!/bin/bash

# @samas/smart-search - Data Seeding Script
# Seeds Docker containers with real data for different load sizes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
DOCKER_DIR="$PROJECT_ROOT/docker"

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

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=60
    local attempt=1
    
    print_step "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        # Use different health check methods based on service
        case $service_name in
            postgres)
                if docker exec smart-search-$service_name pg_isready -U user -d smartsearch >/dev/null 2>&1; then
                    print_status "$service_name is ready!"
                    return 0
                fi
                ;;
            mysql)
                if docker exec smart-search-$service_name mysqladmin ping -h localhost -u user -ppassword >/dev/null 2>&1; then
                    print_status "$service_name is ready!"
                    return 0
                fi
                ;;
            mongodb)
                if docker exec smart-search-$service_name mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
                    print_status "$service_name is ready!"
                    return 0
                fi
                ;;
            redis)
                if docker exec smart-search-$service_name redis-cli ping >/dev/null 2>&1; then
                    print_status "$service_name is ready!"
                    return 0
                fi
                ;;
            *)
                # Fallback: try to connect to port using curl or basic tools
                if curl -s -f "http://localhost:$port" >/dev/null 2>&1; then
                    print_status "$service_name is ready!"
                    return 0
                fi
                ;;
        esac
        
        if [ $((attempt % 10)) -eq 0 ]; then
            echo " (attempt $attempt/$max_attempts)"
        else
            echo -n "."
        fi
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to seed PostgreSQL
seed_postgres() {
    local industry=$1
    local size=$2
    local data_file="$DATA_DIR/$industry/$size"
    
    print_step "Seeding PostgreSQL with $industry data ($size)..."
    
    # Determine container name based on whether alt ports are used
    local container_name="smart-search-postgres"
    if [ "$USE_ALT_PORTS" = "true" ] || [ -n "$CONTAINER_SUFFIX" ]; then
        container_name="smart-search-postgres${CONTAINER_SUFFIX:-}"
    fi
    
    print_status "Using PostgreSQL container: $container_name"
    
    # Wait for PostgreSQL to be ready using the correct container name
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for PostgreSQL to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$container_name" pg_isready -U user -d smartsearch >/dev/null 2>&1; then
            print_status "PostgreSQL is ready! ✓"
            break
        fi
        
        if [ $((attempt % 5)) -eq 0 ]; then
            print_status "Still waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "PostgreSQL failed to become ready within $((max_attempts * 2)) seconds"
        return 1
    fi
    
    # Create tables and seed data based on industry
    case $industry in
        healthcare)
            docker exec "$container_name" psql -U user -d smartsearch -c "
            CREATE TABLE IF NOT EXISTS healthcare_data (
                id VARCHAR(255) PRIMARY KEY,
                title TEXT,
                description TEXT,
                condition_name TEXT,
                treatment TEXT,
                specialty TEXT,
                date_created DATE,
                type VARCHAR(100),
                search_vector tsvector
            );
            
            CREATE INDEX IF NOT EXISTS idx_healthcare_fts ON healthcare_data USING gin(search_vector);
            "
            
            # Check if data already exists and handle accordingly FIRST
            local existing_count=$(docker exec "$container_name" psql -U user -d smartsearch -t -c "SELECT COUNT(*) FROM healthcare_data;" | tr -d ' ')
            
            if [ "$existing_count" -gt 0 ]; then
                print_warning "Found $existing_count existing records."
                if [ "${SKIP_IF_EXISTS:-false}" = "true" ]; then
                    print_status "SKIP_IF_EXISTS=true, using existing data..."
                    return 0
                else
                    print_status "Clearing table for fresh data..."
                    docker exec "$container_name" psql -U user -d smartsearch -c "TRUNCATE TABLE healthcare_data;"
                fi
            fi
            
            # Import JSON data using psql directly (no Python dependencies)
            if [ -f "$data_file"/*.json ]; then
                for json_file in "$data_file"/*.json; do
                    filename=$(basename "$json_file" .json)
                    print_status "Processing $filename..."
                    
                    # Convert JSON to CSV with deduplication for fast bulk loading
                    print_status "Converting JSON to CSV with deduplication for fast bulk insert..."
                    
                    # Create temporary files
                    local temp_csv="/tmp/healthcare_data_$$.csv"
                    local temp_deduped="/tmp/healthcare_deduped_$$.csv"
                    
                    # First, convert JSON to CSV
                    cat "$json_file" | jq -r '.[] | [
                        (.id // ""),
                        (.title // .generic_name // .name // ""),
                        (.description // .event_description // ""),
                        (.condition_name // .condition // ""),
                        (.treatment // ""),
                        (.specialty // ""),
                        (.date_created // .date // .date_of_event // "2024-01-01"),
                        (.type // "unknown")
                    ] | @csv' > "$temp_csv"
                    
                    # Remove duplicates based on first column (ID) using awk
                    print_status "Removing duplicates by ID..."
                    awk -F, '!seen[$1]++' "$temp_csv" > "$temp_deduped"
                    
                    # Report deduplication results
                    original_count=$(wc -l < "$temp_csv")
                    deduped_count=$(wc -l < "$temp_deduped")
                    removed_count=$((original_count - deduped_count))
                    if [ $removed_count -gt 0 ]; then
                        print_status "Removed $removed_count duplicate records (kept $deduped_count unique records)"
                    fi
                    
                    # Copy deduplicated CSV to container and use PostgreSQL COPY for fast bulk insert
                    docker cp "$temp_deduped" "$container_name:/tmp/data.csv"
                    
                    # Use COPY command for fast bulk insert
                    docker exec "$container_name" psql -U user -d smartsearch -c "
                        COPY healthcare_data (id, title, description, condition_name, treatment, specialty, date_created, type) 
                        FROM '/tmp/data.csv' WITH CSV;
                        
                        -- Update search vectors after bulk insert
                        UPDATE healthcare_data 
                        SET search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
                        WHERE search_vector IS NULL;
                    "
                    
                    # Cleanup
                    rm -f "$temp_csv" "$temp_deduped"
                    docker exec "$container_name" rm -f /tmp/data.csv
                    
                    print_status "Processed $filename successfully"
                done
            else
                print_warning "No JSON files found in $data_file, creating sample data..."
                # Create sample healthcare data if no files exist
                docker exec "$container_name" psql -U user -d smartsearch -c "
                INSERT INTO healthcare_data (id, title, description, condition_name, treatment, specialty, date_created, type, search_vector) VALUES
                ('1', 'Diabetes Management', 'Comprehensive care for Type 1 and Type 2 diabetes patients', 'Diabetes', 'Insulin therapy and lifestyle management', 'Endocrinology', '2024-01-01', 'healthcare', to_tsvector('english', 'Diabetes Management Comprehensive care for Type 1 and Type 2 diabetes patients')),
                ('2', 'Cardiac Surgery', 'Advanced surgical procedures for heart conditions', 'Heart Disease', 'Surgical intervention', 'Cardiology', '2024-01-02', 'healthcare', to_tsvector('english', 'Cardiac Surgery Advanced surgical procedures for heart conditions')),
                ('3', 'Cancer Immunotherapy', 'Cutting-edge treatment using immune system', 'Cancer', 'Immunotherapy', 'Oncology', '2024-01-03', 'healthcare', to_tsvector('english', 'Cancer Immunotherapy Cutting-edge treatment using immune system')),
                ('4', 'Mental Health Support', 'Comprehensive mental health services and therapy', 'Depression, Anxiety', 'Therapy and medication', 'Psychiatry', '2024-01-04', 'healthcare', to_tsvector('english', 'Mental Health Support Comprehensive mental health services and therapy')),
                ('5', 'Pediatric Care', 'Specialized healthcare for children and infants', 'Various pediatric conditions', 'Age-appropriate treatments', 'Pediatrics', '2024-01-05', 'healthcare', to_tsvector('english', 'Pediatric Care Specialized healthcare for children and infants'))
                ON CONFLICT (id) DO NOTHING;
                "
            fi
            ;;
            
        finance)
            docker exec smart-search-postgres psql -U user -d smartsearch -c "
            CREATE TABLE IF NOT EXISTS finance_data (
                id VARCHAR(255) PRIMARY KEY,
                symbol VARCHAR(10),
                company_name TEXT,
                price DECIMAL(10,2),
                volume BIGINT,
                market_cap BIGINT,
                sector VARCHAR(100),
                date_created DATE,
                type VARCHAR(100),
                search_vector tsvector
            );
            
            CREATE INDEX IF NOT EXISTS idx_finance_fts ON finance_data USING gin(search_vector);
            "
            
            if [ -f "$data_file"/*.json ]; then
                for json_file in "$data_file"/*.json; do
                    python3 -c "
import json
import psycopg2

with open('$json_file', 'r') as f:
    data = json.load(f)

conn = psycopg2.connect(host='localhost', database='smartsearch', user='user', password='password')
cur = conn.cursor()

for record in data:
    try:
        cur.execute('''
            INSERT INTO finance_data (id, symbol, company_name, price, volume, market_cap, sector, date_created, type, search_vector)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, to_tsvector('english', %s || ' ' || %s))
            ON CONFLICT (id) DO NOTHING
        ''', (
            record.get('id', ''),
            record.get('symbol', ''),
            record.get('name', ''),
            record.get('close', record.get('price', 0)),
            record.get('volume', 0),
            record.get('market_cap', 0),
            record.get('sector', ''),
            record.get('date', '2024-01-01'),
            record.get('type', 'unknown'),
            record.get('symbol', ''),
            record.get('name', '')
        ))
    except:
        continue

conn.commit()
cur.close()
conn.close()
"
                done
            fi
            ;;
            
        retail)
            docker exec smart-search-postgres psql -U user -d smartsearch -c "
            CREATE TABLE IF NOT EXISTS retail_data (
                id VARCHAR(255) PRIMARY KEY,
                name TEXT,
                category VARCHAR(100),
                brand VARCHAR(100),
                price DECIMAL(10,2),
                description TEXT,
                rating DECIMAL(3,1),
                in_stock BOOLEAN,
                type VARCHAR(100),
                search_vector tsvector
            );
            
            CREATE INDEX IF NOT EXISTS idx_retail_fts ON retail_data USING gin(search_vector);
            "
            
            if [ -f "$data_file"/*.json ]; then
                for json_file in "$data_file"/*.json; do
                    python3 -c "
import json
import psycopg2

with open('$json_file', 'r') as f:
    data = json.load(f)

conn = psycopg2.connect(host='localhost', database='smartsearch', user='user', password='password')
cur = conn.cursor()

for record in data:
    try:
        cur.execute('''
            INSERT INTO retail_data (id, name, category, brand, price, description, rating, in_stock, type, search_vector)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, to_tsvector('english', %s || ' ' || %s))
            ON CONFLICT (id) DO NOTHING
        ''', (
            record.get('id', ''),
            record.get('name', ''),
            record.get('category', ''),
            record.get('brand', ''),
            record.get('price', 0),
            record.get('description', ''),
            record.get('rating', 0),
            record.get('in_stock', True),
            record.get('type', 'unknown'),
            record.get('name', ''),
            record.get('description', '')
        ))
    except:
        continue

conn.commit()
cur.close()
conn.close()
"
                done
            fi
            ;;
    esac
    
    # Get record count
    count=$(docker exec "$container_name" psql -U user -d smartsearch -t -c "SELECT COUNT(*) FROM ${industry}_data;" | tr -d ' ')
    print_status "PostgreSQL seeded with $count records"
}

# Function to seed MySQL
seed_mysql() {
    local industry=$1
    local size=$2
    local data_file="$DATA_DIR/$industry/$size"
    
    print_step "Seeding MySQL with $industry data ($size)..."
    
    wait_for_service mysql 3306
    
    case $industry in
        finance)
            docker exec smart-search-mysql mysql -u user -ppassword smartsearch -e "
            CREATE TABLE IF NOT EXISTS finance_data (
                id VARCHAR(255) PRIMARY KEY,
                symbol VARCHAR(10),
                company_name TEXT,
                price DECIMAL(10,2),
                volume BIGINT,
                market_cap BIGINT,
                sector VARCHAR(100),
                date_created DATE,
                type VARCHAR(100),
                FULLTEXT(symbol, company_name)
            ) ENGINE=InnoDB;
            "
            
            if [ -f "$data_file"/*.json ]; then
                for json_file in "$data_file"/*.json; do
                    python3 -c "
import json
import mysql.connector

with open('$json_file', 'r') as f:
    data = json.load(f)

conn = mysql.connector.connect(
    host='localhost',
    database='smartsearch',
    user='user',
    password='password'
)
cur = conn.cursor()

for record in data:
    try:
        cur.execute('''
            INSERT IGNORE INTO finance_data (id, symbol, company_name, price, volume, market_cap, sector, date_created, type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            record.get('id', ''),
            record.get('symbol', ''),
            record.get('name', ''),
            record.get('close', record.get('price', 0)),
            record.get('volume', 0),
            record.get('market_cap', 0),
            record.get('sector', ''),
            record.get('date', '2024-01-01'),
            record.get('type', 'unknown')
        ))
    except:
        continue

conn.commit()
cur.close()
conn.close()
"
                done
            fi
            ;;
    esac
    
    count=$(docker exec smart-search-mysql mysql -u user -ppassword smartsearch -se "SELECT COUNT(*) FROM ${industry}_data;" 2>/dev/null || echo "0")
    print_status "MySQL seeded with $count records"
}

# Function to seed MongoDB
seed_mongodb() {
    local industry=$1
    local size=$2
    local data_file="$DATA_DIR/$industry/$size"
    
    print_step "Seeding MongoDB with $industry data ($size)..."
    
    wait_for_service mongodb 27017
    
    if [ -f "$data_file"/*.json ]; then
        for json_file in "$data_file"/*.json; do
            filename=$(basename "$json_file" .json)
            collection_name="${industry}_${filename}"
            
            # Import JSON data into MongoDB
            docker cp "$json_file" smart-search-mongodb:/tmp/data.json
            docker exec smart-search-mongodb mongoimport --host localhost --db smartsearch --collection "$collection_name" --file /tmp/data.json --jsonArray --upsert --mode merge
            docker exec smart-search-mongodb rm /tmp/data.json
        done
    fi
    
    # Create text indexes
    docker exec smart-search-mongodb mongo smartsearch --eval "
        db.getCollectionNames().forEach(function(name) {
            if (name.startsWith('${industry}_')) {
                db[name].createIndex({ 
                    'name': 'text',
                    'title': 'text', 
                    'description': 'text',
                    'generic_name': 'text',
                    'brand_name': 'text'
                });
            }
        });
    "
    
    count=$(docker exec smart-search-mongodb mongo smartsearch --quiet --eval "db.getCollectionNames().filter(name => name.startsWith('${industry}_')).map(name => db[name].count()).reduce((a,b) => a+b, 0)")
    print_status "MongoDB seeded with $count records"
}

# Function to seed Redis cache
seed_redis() {
    local industry=$1
    local size=$2
    
    print_step "Pre-warming Redis cache with popular queries..."
    
    wait_for_service redis 6379
    
    # Pre-populate cache with common search results
    case $industry in
        healthcare)
            queries=("diabetes" "cancer" "heart disease" "mental health" "surgery")
            ;;
        finance)  
            queries=("stock market" "investment" "trading" "portfolio" "cryptocurrency")
            ;;
        retail)
            queries=("electronics" "clothing" "home garden" "sports" "books")
            ;;
        education)
            queries=("computer science" "mathematics" "literature" "science" "history")
            ;;
        real-estate)
            queries=("house" "apartment" "condo" "commercial" "investment")
            ;;
    esac
    
    for query in "${queries[@]}"; do
        # Store sample cache entries
        docker exec smart-search-redis redis-cli SET "search:${query}" "{\"results\": [], \"timestamp\": $(date +%s), \"ttl\": 300}"
    done
    
    count=$(docker exec smart-search-redis redis-cli DBSIZE)
    print_status "Redis cache pre-warmed with $count entries"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [industry] [size] [database]"
    echo ""
    echo "Industries: healthcare, finance, retail, education, real-estate, all"
    echo "Sizes: tiny, small, medium, large, all"
    echo "Databases: postgres, mysql, mongodb, redis, all"
    echo ""
    echo "Environment Variables:"
    echo "  SKIP_IF_EXISTS=true   - Skip seeding if data already exists"
    echo ""
    echo "Examples:"
    echo "  $0 healthcare tiny postgres"
    echo "  $0 finance all mysql"
    echo "  $0 all medium all"
    echo "  SKIP_IF_EXISTS=true $0 healthcare medium postgres"
}

# Main execution
main() {
    print_header "Smart Search Data Seeding"
    
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 0
    fi
    
    local industry=${1:-all}
    local size=${2:-medium}
    local database=${3:-all}
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if data exists
    if [ ! -d "$DATA_DIR/$industry" ] && [ "$industry" != "all" ]; then
        print_warning "Data not found for $industry. Downloading first..."
        "$SCRIPT_DIR/download-data.sh" "$industry" "$size"
    fi
    
    print_status "Seeding $industry data ($size) into $database"
    
    # Seed specific or all databases
    case $database in
        postgres)
            seed_postgres "$industry" "$size"
            ;;
        mysql)
            seed_mysql "$industry" "$size"
            ;;
        mongodb)
            seed_mongodb "$industry" "$size"
            ;;
        redis)
            seed_redis "$industry" "$size"
            ;;
        all)
            seed_postgres "$industry" "$size"
            seed_mysql "$industry" "$size"
            seed_mongodb "$industry" "$size"
            seed_redis "$industry" "$size"
            ;;
        *)
            print_error "Unknown database: $database"
            show_usage
            exit 1
            ;;
    esac
    
    print_header "Seeding Complete!"
    print_status "Data is ready for showcase applications"
}

# Only run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi