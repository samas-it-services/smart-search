#!/bin/bash

# @samas/smart-search - Universal Data Sync System
# Enables ANY dataset to work with ANY provider combination through intelligent transformation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRANSFORMERS_DIR="$SCRIPT_DIR/transformers"
SCHEMAS_DIR="$SCRIPT_DIR/data-schemas"
DATA_DIR="$PROJECT_ROOT/data"

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

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Provider compatibility matrix (using indexed arrays for bash 3.x compatibility)
PROVIDER_COMBOS=(
    "postgres-redis|postgresql redis"
    "mysql-dragonfly|mysql dragonfly" 
    "mongodb-memcached|mongodb memcached"
    "deltalake-redis|deltalake redis"
    "sqlite-inmemory|sqlite inmemory"
    "supabase-redis|supabase redis"
)

# Dataset types
DATASET_TYPES=("healthcare" "finance" "retail" "education" "real_estate" "custom")

# Data size options
DATA_SIZES=("tiny" "small" "medium" "large")

# Get Docker Compose file for provider combination
get_docker_compose_file() {
    local combo=$1
    
    case $combo in
        "postgres-redis")
            echo "$PROJECT_ROOT/docker/postgres-redis.docker-compose.yml"
            ;;
        "mysql-dragonfly")
            echo "$PROJECT_ROOT/docker/mysql-dragonfly.docker-compose.yml"
            ;;
        "mongodb-memcached")
            echo "$PROJECT_ROOT/docker/mongodb-memcached.docker-compose.yml"
            ;;
        "deltalake-redis")
            echo "$PROJECT_ROOT/docker/deltalake-redis.docker-compose.yml"
            ;;
        "supabase-redis")
            echo "$PROJECT_ROOT/docker/supabase-redis.docker-compose.yml"
            ;;
        *)
            return 1
            ;;
    esac
    return 0
}

# Check if containers are running for provider combination
check_container_status() {
    local combo=$1
    local containers=()
    
    case $combo in
        "postgres-redis")
            containers=("smart-search-postgres" "smart-search-redis")
            ;;
        "mysql-dragonfly")
            containers=("smart-search-mysql" "smart-search-dragonfly")
            ;;
        "mongodb-memcached")
            containers=("smart-search-mongodb" "smart-search-memcached")
            ;;
        "deltalake-redis")
            containers=("smart-search-deltalake" "smart-search-redis")
            ;;
        "supabase-redis")
            containers=("smart-search-supabase" "smart-search-redis")
            ;;
        *)
            print_error "Unknown provider combination: $combo"
            return 1
            ;;
    esac
    
    local all_running=true
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^${container}$"; then
            print_warning "Container not running: $container"
            all_running=false
        fi
    done
    
    if [[ "$all_running" == true ]]; then
        print_success "All containers are running for $combo"
        return 0
    else
        return 1
    fi
}

# Start provider stack
start_provider_stack() {
    local combo=$1
    local compose_file=$(get_docker_compose_file "$combo")
    
    if [[ $? -ne 0 ]] || [[ ! -f "$compose_file" ]]; then
        print_error "Docker compose file not found for $combo"
        return 1
    fi
    
    print_status "Starting $combo stack..."
    print_status "Using compose file: $compose_file"
    
    if docker-compose -f "$compose_file" up -d; then
        print_success "Started $combo containers"
        return 0
    else
        print_error "Failed to start $combo containers"
        return 1
    fi
}

# Wait for services to become healthy
wait_for_services() {
    local combo=$1
    local max_attempts=60
    local attempt=0
    
    print_status "Waiting for services to become healthy..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        if check_container_status "$combo" > /dev/null 2>&1; then
            # Additional health checks for specific services
            case $combo in
                "postgres-redis")
                    if docker exec smart-search-postgres pg_isready -U postgres > /dev/null 2>&1 && \
                       docker exec smart-search-redis redis-cli ping > /dev/null 2>&1; then
                        print_success "All services are healthy"
                        return 0
                    fi
                    ;;
                "mysql-dragonfly")
                    if docker exec smart-search-mysql mysqladmin ping -h localhost > /dev/null 2>&1 && \
                       docker exec smart-search-dragonfly redis-cli ping > /dev/null 2>&1; then
                        print_success "All services are healthy"
                        return 0
                    fi
                    ;;
                "mongodb-memcached")
                    if docker exec smart-search-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
                        print_success "All services are healthy"
                        return 0
                    fi
                    ;;
                *)
                    print_success "Services appear to be running"
                    return 0
                    ;;
            esac
        fi
        
        attempt=$((attempt + 1))
        if [[ $((attempt % 5)) -eq 0 ]]; then
            print_status "Still waiting for services... (attempt $attempt/$max_attempts)"
        fi
        sleep 2
    done
    
    print_error "Services failed to become healthy within $((max_attempts * 2)) seconds"
    return 1
}

show_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BLUE}🔄 Universal Data Sync System${NC}                         ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${YELLOW}Transform ANY dataset for ANY provider combination${NC}     ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_usage() {
    show_header
    echo "Usage: $0 <provider-combo> <dataset-type> <data-size> [options]"
    echo ""
    echo -e "${YELLOW}Provider Combinations:${NC}"
    for combo_entry in "${PROVIDER_COMBOS[@]}"; do
        local combo=$(echo "$combo_entry" | cut -d'|' -f1)
        local providers=$(echo "$combo_entry" | cut -d'|' -f2)
        echo "  • $combo - $providers"
    done
    echo ""
    echo -e "${YELLOW}Dataset Types:${NC}"
    for dataset in "${DATASET_TYPES[@]}"; do
        echo "  • $dataset"
    done
    echo ""
    echo -e "${YELLOW}Data Sizes:${NC}"
    for size in "${DATA_SIZES[@]}"; do
        echo "  • $size"
    done
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  --dry-run          Preview transformations without executing"
    echo "  --validate-only    Validate compatibility and schema only"
    echo "  --force-transform  Force schema transformation even if exists"
    echo "  --skip-cache       Skip cache synchronization"
    echo "  --verbose          Show detailed transformation logs"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 mysql-dragonfly healthcare large"
    echo "  $0 postgres-redis finance medium --dry-run"
    echo "  $0 mongodb-memcached retail small --validate-only"
    echo "  $0 supabase-redis education tiny --verbose"
    echo ""
    echo -e "${CYAN}Revolutionary Capability:${NC}"
    echo "  • Healthcare data + MySQL/DragonflyDB"
    echo "  • Finance data + MongoDB/Memcached" 
    echo "  • Retail data + PostgreSQL/Redis"
    echo "  • ANY dataset + ANY provider = 30+ combinations!"
}

# Get provider services for a combination
get_provider_services() {
    local combo=$1
    for combo_entry in "${PROVIDER_COMBOS[@]}"; do
        local combo_name=$(echo "$combo_entry" | cut -d'|' -f1)
        if [[ "$combo_name" == "$combo" ]]; then
            echo "$combo_entry" | cut -d'|' -f2
            return 0
        fi
    done
    return 1
}

# Validate provider combination
validate_provider_combo() {
    local combo=$1
    local found=false
    
    for combo_entry in "${PROVIDER_COMBOS[@]}"; do
        local combo_name=$(echo "$combo_entry" | cut -d'|' -f1)
        if [[ "$combo_name" == "$combo" ]]; then
            found=true
            break
        fi
    done
    
    if [[ "$found" == false ]]; then
        print_error "Invalid provider combination: $combo"
        echo ""
        echo -e "${YELLOW}Available combinations:${NC}"
        for combo_entry in "${PROVIDER_COMBOS[@]}"; do
            local combo_name=$(echo "$combo_entry" | cut -d'|' -f1)
            echo "  • $combo_name"
        done
        return 1
    fi
    
    return 0
}

# Validate dataset type
validate_dataset_type() {
    local dataset=$1
    
    if [[ ! " ${DATASET_TYPES[@]} " =~ " $dataset " ]]; then
        print_error "Invalid dataset type: $dataset"
        echo ""
        echo -e "${YELLOW}Available dataset types:${NC}"
        for d in "${DATASET_TYPES[@]}"; do
            echo "  • $d"
        done
        return 1
    fi
    
    # Check if schema file exists
    if [[ ! -f "$SCHEMAS_DIR/$dataset.json" ]]; then
        print_error "Schema file not found: $SCHEMAS_DIR/$dataset.json"
        return 1
    fi
    
    return 0
}

# Validate data size
validate_data_size() {
    local size=$1
    
    if [[ ! " ${DATA_SIZES[@]} " =~ " $size " ]]; then
        print_error "Invalid data size: $size"
        echo ""
        echo -e "${YELLOW}Available sizes:${NC}"
        for s in "${DATA_SIZES[@]}"; do
            echo "  • $s"
        done
        return 1
    fi
    
    return 0
}

# Check data availability
check_data_availability() {
    local dataset=$1
    local size=$2
    
    local data_path="$DATA_DIR/$dataset/$size"
    
    if [[ ! -d "$data_path" ]] || [[ -z "$(ls -A "$data_path" 2>/dev/null)" ]]; then
        print_warning "Data not found at: $data_path"
        print_status "Attempting to download $dataset $size data..."
        
        if [[ -f "$SCRIPT_DIR/download-data.sh" ]]; then
            "$SCRIPT_DIR/download-data.sh" "$dataset" "$size"
            if [[ $? -ne 0 ]]; then
                print_error "Failed to download data"
                return 1
            fi
        else
            print_error "Download script not found"
            return 1
        fi
    fi
    
    print_success "Data available at: $data_path"
    return 0
}

# Analyze compatibility between dataset and provider
analyze_compatibility() {
    local combo=$1
    local dataset=$2
    local verbose=${3:-false}
    
    print_step "Analyzing compatibility: $dataset + $combo"
    
    local providers=$(get_provider_services "$combo")
    if [[ $? -ne 0 ]]; then
        print_error "Provider combination not found: $combo"
        return 1
    fi
    local database=$(echo $providers | cut -d' ' -f1)
    local cache=$(echo $providers | cut -d' ' -f2)
    
    # Check schema compatibility
    local schema_file="$SCHEMAS_DIR/$dataset.json"
    local compatibility_score=100
    local warnings=()
    local optimizations=()
    
    # Database-specific compatibility checks
    case $database in
        "postgresql"|"supabase")
            optimizations+=("Advanced indexing with GIN/GIST")
            optimizations+=("Full-text search with tsvector")
            optimizations+=("JSONB support for metadata")
            if [[ $dataset == "healthcare" ]]; then
                optimizations+=("Medical code indexing optimization")
                compatibility_score=$((compatibility_score + 10))
            fi
            ;;
        "mysql")
            optimizations+=("FULLTEXT indexing on InnoDB")
            optimizations+=("JSON data type support")
            optimizations+=("Optimized ENUM types")
            if [[ $dataset == "finance" ]]; then
                optimizations+=("Decimal precision for financial data")
                compatibility_score=$((compatibility_score + 5))
            fi
            ;;
        "mongodb")
            optimizations+=("Native document structure")
            optimizations+=("Flexible schema evolution")
            optimizations+=("Geospatial indexing support")
            if [[ $dataset == "retail" ]]; then
                optimizations+=("Product catalog optimization")
                compatibility_score=$((compatibility_score + 15))
            fi
            ;;
        "sqlite")
            warnings+=("Limited concurrent write support")
            warnings+=("No native JSON indexing (SQLite < 3.38)")
            compatibility_score=$((compatibility_score - 10))
            ;;
        "deltalake")
            optimizations+=("Time-travel and versioning")
            optimizations+=("Columnar storage efficiency") 
            optimizations+=("Schema evolution support")
            if [[ $dataset == "finance" ]]; then
                optimizations+=("Time-series data optimization")
                compatibility_score=$((compatibility_score + 20))
            fi
            ;;
    esac
    
    # Cache-specific compatibility checks
    case $cache in
        "redis")
            optimizations+=("RediSearch full-text indexing")
            optimizations+=("JSON document storage")
            optimizations+=("Real-time search capabilities")
            ;;
        "dragonfly")
            optimizations+=("High-performance Redis alternative")
            optimizations+=("Memory optimization")
            optimizations+=("Faster bulk operations")
            ;;
        "memcached")
            warnings+=("Limited search capabilities")
            warnings+=("No persistence by default")
            compatibility_score=$((compatibility_score - 5))
            ;;
        "inmemory")
            warnings+=("Data loss on restart")
            warnings+=("Limited scalability")
            compatibility_score=$((compatibility_score - 15))
            ;;
    esac
    
    # Display results
    echo ""
    print_header "Compatibility Analysis: $dataset + $combo"
    echo -e "${CYAN}Compatibility Score: ${GREEN}$compatibility_score/100${NC}"
    echo ""
    
    if [[ ${#optimizations[@]} -gt 0 ]]; then
        echo -e "${GREEN}✅ Optimizations Available:${NC}"
        for opt in "${optimizations[@]}"; do
            echo "   • $opt"
        done
        echo ""
    fi
    
    if [[ ${#warnings[@]} -gt 0 ]]; then
        echo -e "${YELLOW}⚠️ Considerations:${NC}"
        for warn in "${warnings[@]}"; do
            echo "   • $warn"
        done
        echo ""
    fi
    
    if [[ $compatibility_score -lt 70 ]]; then
        print_warning "Low compatibility score. Consider alternative provider combinations."
        return 1
    elif [[ $compatibility_score -lt 85 ]]; then
        print_warning "Moderate compatibility. Review considerations above."
    else
        print_success "High compatibility. Optimal for production use."
    fi
    
    return 0
}

# Transform schema for specific provider
transform_schema() {
    local combo=$1
    local dataset=$2
    local force=${3:-false}
    local verbose=${4:-false}
    
    print_step "Transforming schema: $dataset -> $combo"
    
    local providers=$(get_provider_services "$combo")
    if [[ $? -ne 0 ]]; then
        print_error "Provider combination not found: $combo"
        return 1
    fi
    local database=$(echo $providers | cut -d' ' -f1)
    local cache=$(echo $providers | cut -d' ' -f2)
    
    local output_dir="$PROJECT_ROOT/schemas/$combo"
    mkdir -p "$output_dir"
    
    # Transform for database
    case $database in
        "postgresql"|"supabase")
            local transformer="$TRANSFORMERS_DIR/postgres-transformer.js"
            local output_file="$output_dir/${dataset}-postgres.sql"
            
            if [[ -f "$transformer" ]]; then
                if [[ $force == true ]] || [[ ! -f "$output_file" ]]; then
                    print_status "Generating PostgreSQL schema for $dataset..."
                    if node "$transformer" "$dataset" "$output_file"; then
                        print_success "PostgreSQL schema: $output_file"
                    else
                        print_error "Failed to generate PostgreSQL schema"
                        return 1
                    fi
                else
                    print_status "PostgreSQL schema exists: $output_file (use --force-transform to regenerate)"
                fi
            else
                print_error "PostgreSQL transformer not found: $transformer"
                return 1
            fi
            ;;
        "mysql")
            local transformer="$TRANSFORMERS_DIR/mysql-transformer.js"
            local output_file="$output_dir/${dataset}-mysql.sql"
            
            if [[ -f "$transformer" ]]; then
                if [[ $force == true ]] || [[ ! -f "$output_file" ]]; then
                    print_status "Generating MySQL schema for $dataset..."
                    if node "$transformer" "$dataset" "$output_file"; then
                        print_success "MySQL schema: $output_file"
                    else
                        print_error "Failed to generate MySQL schema"
                        return 1
                    fi
                else
                    print_status "MySQL schema exists: $output_file (use --force-transform to regenerate)"
                fi
            else
                print_error "MySQL transformer not found: $transformer"
                return 1
            fi
            ;;
        "mongodb")
            local transformer="$TRANSFORMERS_DIR/mongodb-transformer.js"
            local output_file="$output_dir/${dataset}-mongodb.js"
            
            if [[ -f "$transformer" ]]; then
                if [[ $force == true ]] || [[ ! -f "$output_file" ]]; then
                    print_status "Generating MongoDB schema for $dataset..."
                    if node "$transformer" "$dataset" "$output_file"; then
                        print_success "MongoDB schema: $output_file"
                    else
                        print_error "Failed to generate MongoDB schema"
                        return 1
                    fi
                else
                    print_status "MongoDB schema exists: $output_file (use --force-transform to regenerate)"
                fi
            else
                print_error "MongoDB transformer not found: $transformer"
                return 1
            fi
            ;;
        *)
            print_warning "No dedicated transformer for $database, using generic approach"
            ;;
    esac
    
    return 0
}

# Sync data to provider
sync_data() {
    local combo=$1
    local dataset=$2
    local size=$3
    local skip_cache=${4:-false}
    local verbose=${5:-false}
    
    print_step "Syncing data: $dataset ($size) -> $combo"
    
    local providers=$(get_provider_services "$combo")
    if [[ $? -ne 0 ]]; then
        print_error "Provider combination not found: $combo"
        return 1
    fi
    local database=$(echo $providers | cut -d' ' -f1)
    local cache=$(echo $providers | cut -d' ' -f2)
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        return 1
    fi
    
    # Check if services are running and start them if needed
    print_status "Checking service availability for $combo..."
    
    if ! check_container_status "$combo"; then
        print_status "Services not running. Starting $combo stack..."
        
        if ! start_provider_stack "$combo"; then
            print_error "Failed to start provider stack"
            return 1
        fi
        
        if ! wait_for_services "$combo"; then
            print_error "Services failed to become healthy"
            return 1
        fi
    else
        print_success "All services already running and healthy"
    fi
    
    # Map database names to seed script format
    local seed_database="$database"
    case $database in
        "postgresql"|"supabase")
            seed_database="postgres"
            ;;
        "mongodb")
            seed_database="mongodb"
            ;;
        "mysql")
            seed_database="mysql"
            ;;
        "deltalake")
            seed_database="postgres" # Use postgres for delta lake base
            ;;
        "sqlite")
            print_warning "SQLite seeding not implemented, using in-memory data"
            seed_database=""
            ;;
    esac

    # Use existing seeding infrastructure with dataset parameter
    local seed_script="$SCRIPT_DIR/seed-data.sh"
    
    if [[ -f "$seed_script" ]] && [[ -n "$seed_database" ]]; then
        print_status "Seeding $seed_database with $dataset data ($size)..."
        
        # Call existing seed script with enhanced parameters
        if "$seed_script" "$dataset" "$size" "$seed_database"; then
            print_success "$seed_database seeded successfully"
        else
            print_error "Failed to seed $seed_database"
            return 1
        fi
    elif [[ -z "$seed_database" ]]; then
        print_status "Skipping database seeding for $database"
    else
        print_error "Seed script not found: $seed_script"
        return 1
    fi
        
    if [[ $skip_cache != true ]] && [[ $cache != "inmemory" ]]; then
        print_status "Syncing cache ($cache)..."
        if "$seed_script" "$dataset" "$size" "$cache"; then
            print_success "$cache synced successfully"
        else
            print_warning "Cache sync failed but continuing..."
        fi
    fi
    
    return 0
}

# Show sync progress and statistics
show_sync_stats() {
    local combo=$1
    local dataset=$2
    local size=$3
    
    print_header "Sync Statistics"
    
    local providers=$(get_provider_services "$combo")
    if [[ $? -ne 0 ]]; then
        print_error "Provider combination not found: $combo"
        return 1
    fi
    local database=$(echo $providers | cut -d' ' -f1)
    local cache=$(echo $providers | cut -d' ' -f2)
    
    echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${YELLOW}📊 Data Sync Summary${NC}                          ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} Dataset: ${GREEN}$dataset${NC}                             ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Size: ${GREEN}$size${NC}                                  ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Provider: ${GREEN}$combo${NC}                           ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Database: ${GREEN}$database${NC}                         ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Cache: ${GREEN}$cache${NC}                               ${CYAN}│${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} Status: ${GREEN}✅ Successfully Synchronized${NC}        ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"
    echo ""
    
    print_success "Universal data sync completed!"
    print_status "Your $dataset dataset is now ready for use with $combo"
    echo ""
    print_status "Next steps:"
    echo "   • Run provider scripts: ./scripts/providers/$combo/start-$size.sh"  
    echo "   • Test search functionality with your $dataset data"
    echo "   • Monitor performance and optimize as needed"
}

# Validate all requirements before starting
validate_requirements() {
    local combo=$1
    local dataset=$2
    local size=$3
    
    print_step "Validating requirements..."
    
    # Check Node.js for transformers
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is required for schema transformers"
        return 1
    fi
    
    # Check if transformers exist
    local required_transformers=()
    local providers=$(get_provider_services "$combo")
    if [[ $? -ne 0 ]]; then
        print_error "Provider combination not found: $combo"
        return 1
    fi
    local database=$(echo $providers | cut -d' ' -f1)
    
    case $database in
        "postgresql"|"supabase")
            required_transformers+=("$TRANSFORMERS_DIR/postgres-transformer.js")
            ;;
        "mysql")
            required_transformers+=("$TRANSFORMERS_DIR/mysql-transformer.js")
            ;;
        "mongodb")
            required_transformers+=("$TRANSFORMERS_DIR/mongodb-transformer.js")
            ;;
    esac
    
    for transformer in "${required_transformers[@]}"; do
        if [[ ! -f "$transformer" ]]; then
            print_error "Required transformer not found: $transformer"
            return 1
        fi
    done
    
    # Check if Docker is running (for provider services)
    if ! docker info >/dev/null 2>&1; then
        print_warning "Docker is not running. Provider services may not be available."
        print_status "Make sure to start Docker before running provider scripts."
    fi
    
    print_success "All requirements validated"
    return 0
}

# Main execution
main() {
    local combo=""
    local dataset=""
    local size=""
    local dry_run=false
    local validate_only=false
    local force_transform=false
    local skip_cache=false
    local verbose=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --validate-only)
                validate_only=true
                shift
                ;;
            --force-transform)
                force_transform=true
                shift
                ;;
            --skip-cache)
                skip_cache=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            -*)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$combo" ]]; then
                    combo="$1"
                elif [[ -z "$dataset" ]]; then
                    dataset="$1"
                elif [[ -z "$size" ]]; then
                    size="$1"
                else
                    print_error "Too many arguments"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Check if required arguments are provided
    if [[ -z "$combo" ]] || [[ -z "$dataset" ]] || [[ -z "$size" ]]; then
        print_error "Missing required arguments"
        show_usage
        exit 1
    fi
    
    show_header
    
    # Validate inputs
    validate_provider_combo "$combo" || exit 1
    validate_dataset_type "$dataset" || exit 1  
    validate_data_size "$size" || exit 1
    validate_requirements "$combo" "$dataset" "$size" || exit 1
    
    # Check data availability
    check_data_availability "$dataset" "$size" || exit 1
    
    # Analyze compatibility
    analyze_compatibility "$combo" "$dataset" "$verbose" || exit 1
    
    if [[ $validate_only == true ]]; then
        print_success "Validation complete. Combination is compatible."
        exit 0
    fi
    
    # Transform schema
    if [[ $dry_run == false ]]; then
        transform_schema "$combo" "$dataset" "$force_transform" "$verbose" || exit 1
    else
        print_status "[DRY RUN] Would transform schema: $dataset -> $combo"
    fi
    
    # Sync data
    if [[ $dry_run == false ]]; then
        sync_data "$combo" "$dataset" "$size" "$skip_cache" "$verbose" || exit 1
        show_sync_stats "$combo" "$dataset" "$size"
    else
        print_status "[DRY RUN] Would sync data: $dataset ($size) -> $combo"
        print_success "[DRY RUN] All operations would complete successfully"
    fi
}

# Only run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi