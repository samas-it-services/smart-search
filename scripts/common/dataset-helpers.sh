#!/bin/bash

# @samas/smart-search - Dataset Management Functions
# Handles dataset size validation, prompting, and information display

# Source docker helpers for consistent logging
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-helpers.sh"

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

# Function to prompt for dataset size interactively
prompt_dataset_size() {
    local current_size=${DATA_SIZE:-}
    
    if [ -n "$current_size" ]; then
        print_status "Using pre-selected dataset size: $current_size"
        return 0
    fi
    
    echo ""
    print_step "📊 Choose dataset size:"
    echo ""
    
    # Display options with details
    echo "   1) ${GREEN}tiny${NC}   - 1K records   (~30s startup) - Quick testing"
    echo "   2) ${YELLOW}small${NC}  - 10K records  (~2m startup)  - Basic demos"  
    echo "   3) ${BLUE}medium${NC} - 100K records (~5m startup)  - Realistic testing"
    echo "   4) ${RED}large${NC}  - 1M+ records  (~10m startup) - Performance testing"
    echo ""
    
    while true; do
        read -p "Enter choice (1-4) [default: 1]: " choice
        case ${choice:-1} in
            1) 
                export DATA_SIZE="tiny"
                print_success "Selected: Tiny dataset (1K records)"
                break 
                ;;
            2) 
                export DATA_SIZE="small"
                print_success "Selected: Small dataset (10K records)"
                break 
                ;;
            3) 
                export DATA_SIZE="medium"
                print_success "Selected: Medium dataset (100K records)"
                break 
                ;;
            4) 
                export DATA_SIZE="large"
                print_success "Selected: Large dataset (1M+ records)"
                break 
                ;;
            *) 
                print_warning "Invalid choice. Please enter 1-4."
                ;;
        esac
    done
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