#!/bin/bash

# @samas/smart-search - Dataset Management Functions
# Handles dataset size validation, prompting, and information display

# Source docker helpers for consistent logging
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HELPERS_DIR/docker-helpers.sh"

# Function to parse command line arguments for dataset scripts
parse_dataset_args() {
    # Initialize with environment variables or defaults
    export DATA_SIZE=${DATA_SIZE:-}
    export PROVIDER=${PROVIDER:-}
    export INDUSTRY=${INDUSTRY:-healthcare}
    export PORT_OFFSET=${PORT_OFFSET:-}
    export VERBOSE=${VERBOSE:-false}
    export DRY_RUN=${DRY_RUN:-false}
    export FORCE=${FORCE:-false}
    export HELP=${HELP:-false}
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --size|-s)
                export DATA_SIZE="$2"
                shift 2
                ;;
            --provider|-p)
                export PROVIDER="$2"
                shift 2
                ;;
            --industry|-i)
                export INDUSTRY="$2"
                shift 2
                ;;
            --port-offset)
                export PORT_OFFSET="$2"
                shift 2
                ;;
            --verbose|-v)
                export VERBOSE=true
                shift
                ;;
            --dry-run)
                export DRY_RUN=true
                shift
                ;;
            --force|-f)
                export FORCE=true
                shift
                ;;
            --help|-h)
                export HELP=true
                shift
                ;;
            --*)
                print_warning "Unknown option: $1"
                shift
                ;;
            *)
                # Handle positional arguments
                if [ -z "$PROVIDER" ] && [[ "$1" =~ ^(postgres-redis|mysql-dragonfly|mongodb-memcached|supabase-redis|deltalake-redis|sqlite-inmemory)$ ]]; then
                    export PROVIDER="$1"
                elif [ -z "$INDUSTRY" ] && [[ "$1" =~ ^(healthcare|finance|retail|education|real_estate)$ ]]; then
                    export INDUSTRY="$1"  
                elif [ -z "$DATA_SIZE" ] && [[ "$1" =~ ^(tiny|small|medium|large)$ ]]; then
                    export DATA_SIZE="$1"
                else
                    print_warning "Unknown positional argument: $1"
                fi
                shift
                ;;
        esac
    done
}

# Function to show standardized help for dataset scripts
show_dataset_help() {
    local script_name=${1:-"script"}
    local script_description=${2:-"Dataset management script"}
    
    echo ""
    echo "$script_description"
    echo ""
    echo "Usage:"
    echo "  $script_name [OPTIONS] [POSITIONAL_ARGS]"
    echo ""
    echo "Options:"
    echo "  --size, -s SIZE        Dataset size (tiny, small, medium, large)"
    echo "  --provider, -p PROV    Provider combination (postgres-redis, mysql-dragonfly, etc.)"
    echo "  --industry, -i IND     Industry dataset (healthcare, finance, retail, education, real_estate)"
    echo "  --port-offset OFFSET   Port offset for service ports"
    echo "  --verbose, -v          Enable verbose output"
    echo "  --dry-run             Show what would be done without executing"
    echo "  --force, -f           Force operation without confirmations"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATA_SIZE             Dataset size (overridden by --size)"
    echo "  PROVIDER              Provider combination (overridden by --provider)"  
    echo "  INDUSTRY              Industry dataset (overridden by --industry)"
    echo "  PORT_OFFSET           Port offset (overridden by --port-offset)"
    echo "  VERBOSE               Enable verbose mode (true/false)"
    echo "  DRY_RUN               Enable dry run mode (true/false)"
    echo "  FORCE                 Force mode (true/false)"
    echo ""
    echo "Examples:"
    echo "  # Using environment variables"
    echo "  DATA_SIZE=large PROVIDER=postgres-redis $script_name"
    echo ""
    echo "  # Using command line flags" 
    echo "  $script_name --size medium --provider mysql-dragonfly --industry finance"
    echo ""
    echo "  # Using positional arguments"
    echo "  $script_name postgres-redis healthcare large"
    echo ""
    echo "Available dataset sizes: tiny (1K), small (10K), medium (100K), large (1M+)"
    echo "Available providers: postgres-redis, mysql-dragonfly, mongodb-memcached, supabase-redis"
    echo "Available industries: healthcare, finance, retail, education, real_estate"
    echo ""
}

# Function to validate dataset size
validate_dataset_size() {
    local size=$1
    local valid_sizes=("tiny" "small" "medium" "large")
    
    for valid_size in "${valid_sizes[@]}"; do
        if [ "$size" = "$valid_size" ]; then
            return 0
        fi
    done
    
    print_error "Invalid dataset size: $size"
    print_status "Valid sizes: ${valid_sizes[*]}"
    return 1
}

# Function to get dataset information
get_dataset_info() {
    local size=$1
    
    case $size in
        tiny)
            echo "display_name='Tiny Dataset (1K records)'"
            echo "record_count=1000"
            echo "description='Fastest startup, ideal for quick testing'"
            echo "startup_time='~30 seconds'"
            echo "use_case='Quick demos and development'"
            ;;
        small)
            echo "display_name='Small Dataset (10K records)'"
            echo "record_count=10000"
            echo "description='Quick demo with realistic data volume'"
            echo "startup_time='~2 minutes'"
            echo "use_case='Feature demonstrations and basic testing'"
            ;;
        medium)
            echo "display_name='Medium Dataset (100K records)'"
            echo "record_count=100000"
            echo "description='Realistic testing with substantial data'"
            echo "startup_time='~5 minutes'"
            echo "use_case='Performance testing and realistic scenarios'"
            ;;
        large)
            echo "display_name='Large Dataset (1M+ records)'"
            echo "record_count=1000000"
            echo "description='Performance testing with production-like scale'"
            echo "startup_time='~10 minutes'"
            echo "use_case='Stress testing and scalability validation'"
            ;;
        *)
            print_error "Unknown dataset size: $size"
            return 1
            ;;
    esac
}

# Function to get dataset size from various sources (non-interactive)
get_dataset_size() {
    local size_arg=${1:-}
    local current_size=${DATA_SIZE:-}
    
    # Priority: 1. Function argument, 2. Environment variable, 3. Default
    if [ -n "$size_arg" ]; then
        current_size="$size_arg"
    elif [ -z "$current_size" ]; then
        current_size="tiny"  # Default to tiny for automation
    fi
    
    # Validate the size
    if ! validate_dataset_size "$current_size"; then
        print_error "Invalid dataset size: $current_size"
        print_status "Valid sizes: tiny, small, medium, large"
        return 1
    fi
    
    export DATA_SIZE="$current_size"
    print_status "Using dataset size: $current_size"
    return 0
}

# Legacy interactive function - deprecated but kept for backward compatibility
prompt_dataset_size() {
    print_warning "prompt_dataset_size() is deprecated. Use get_dataset_size() instead."
    print_status "Set DATA_SIZE environment variable or pass size as argument to avoid prompts."
    
    # Check if already set via environment
    if [ -n "${DATA_SIZE:-}" ]; then
        print_status "Using pre-selected dataset size: $DATA_SIZE"
        return 0
    fi
    
    # Show available sizes and exit with error - force users to specify
    echo ""
    print_step "📊 Available dataset sizes:"
    echo -e "   • ${GREEN}tiny${NC}   - 1K records   (~30s startup) - Quick testing"
    echo -e "   • ${YELLOW}small${NC}  - 10K records  (~2m startup)  - Basic demos"  
    echo -e "   • ${BLUE}medium${NC} - 100K records (~5m startup)  - Realistic testing"
    echo -e "   • ${RED}large${NC}  - 1M+ records  (~10m startup) - Performance testing"
    echo ""
    print_error "No dataset size specified. This script requires non-interactive operation."
    print_status "Set environment variable: export DATA_SIZE=medium"
    print_status "Or pass as argument: script_name.sh --size medium"
    return 1
}

# Function to show dataset information
show_dataset_info() {
    local size=${DATA_SIZE:-tiny}
    
    eval "$(get_dataset_info "$size")"
    
    echo ""
    print_step "📊 Dataset Information:"
    echo "   • Size: $display_name"
    echo "   • Records: $record_count"
    echo "   • Description: $description"
    echo "   • Startup Time: $startup_time"
    echo "   • Use Case: $use_case"
    echo ""
}

# Function to check if dataset files exist
check_dataset_availability() {
    local provider=$1
    local size=$2
    local industry=${3:-healthcare}
    
    local project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local data_dir="$project_root/data/$industry/$size"
    
    if [ -d "$data_dir" ] && [ "$(ls -A "$data_dir" 2>/dev/null)" ]; then
        print_status "Dataset files found for $industry $size"
        return 0
    else
        print_warning "Dataset files not found for $industry $size"
        print_status "Expected location: $data_dir"
        return 1
    fi
}

# Function to download dataset if missing
ensure_dataset_available() {
    local provider=$1
    local size=$2
    local industry=${3:-healthcare}
    
    if ! check_dataset_availability "$provider" "$size" "$industry"; then
        print_step "Downloading $industry $size dataset..."
        
        local project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
        local download_script="$project_root/scripts/download-data.sh"
        
        if [ -f "$download_script" ]; then
            "$download_script" "$industry" "$size"
            
            # Verify download succeeded
            if check_dataset_availability "$provider" "$size" "$industry"; then
                print_success "Dataset downloaded successfully"
            else
                print_error "Dataset download failed"
                return 1
            fi
        else
            print_error "Download script not found: $download_script"
            return 1
        fi
    fi
    
    return 0
}

# Function to get expected record count for validation
get_expected_record_count() {
    local size=$1
    
    case $size in
        tiny)
            echo "min=500 max=1500"
            ;;
        small)
            echo "min=8000 max=12000"
            ;;
        medium)
            echo "min=80000 max=120000"
            ;;
        large)
            echo "min=800000 max=1200000"
            ;;
        *)
            echo "min=500 max=1500"
            ;;
    esac
}

# Function to validate seeded record count
validate_seeded_count() {
    local actual_count=$1
    local expected_size=$2
    
    eval "$(get_expected_record_count "$expected_size")"
    
    if [ "$actual_count" -ge "$min" ] && [ "$actual_count" -le "$max" ]; then
        print_success "Record count ($actual_count) is within expected range ($min-$max)"
        return 0
    else
        print_warning "Record count ($actual_count) is outside expected range ($min-$max)"
        return 1
    fi
}

# Function to show dataset size comparison
show_dataset_comparison() {
    echo ""
    print_step "📊 Dataset Size Comparison:"
    echo ""
    echo "┌─────────┬────────────┬──────────────┬─────────────────────┐"
    echo "│  Size   │  Records   │ Startup Time │      Use Case       │"
    echo "├─────────┼────────────┼──────────────┼─────────────────────┤"
    echo "│  Tiny   │    1K      │    ~30s      │ Quick testing       │"
    echo "│  Small  │   10K      │    ~2m       │ Basic demos         │"
    echo "│ Medium  │  100K      │    ~5m       │ Realistic testing   │"
    echo "│  Large  │  1M+       │   ~10m       │ Performance testing │"
    echo "└─────────┴────────────┴──────────────┴─────────────────────┘"
    echo ""
}