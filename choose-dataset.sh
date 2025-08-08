#!/bin/bash

# @samas/smart-search - Interactive Dataset Size Selector
# Helps users choose the right dataset size for their needs

set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}🏥 Smart Search - PostgreSQL + Redis Dataset Selector${NC}   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${YELLOW}Choose the right dataset size for your testing needs${NC}     ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

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

# Function to show dataset comparison
show_dataset_comparison() {
    echo -e "${CYAN}📊 Dataset Size Comparison:${NC}"
    echo ""
    echo -e "${YELLOW}┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐${NC}"
    echo -e "${YELLOW}│${NC}    SIZE     ${YELLOW}│${NC}   RECORDS   ${YELLOW}│${NC} STARTUP TIME${YELLOW}│${NC} MEMORY USAGE${YELLOW}│${NC} IDEAL FOR   ${YELLOW}│${NC}"
    echo -e "${YELLOW}├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤${NC}"
    echo -e "${YELLOW}│${NC} ${GREEN}TINY${NC}        ${YELLOW}│${NC}     1K      ${YELLOW}│${NC}   ~30 sec    ${YELLOW}│${NC}    ~50MB    ${YELLOW}│${NC} Quick demo  ${YELLOW}│${NC}"
    echo -e "${YELLOW}│${NC} ${GREEN}SMALL${NC}       ${YELLOW}│${NC}    10K      ${YELLOW}│${NC}   ~2-3 min   ${YELLOW}│${NC}   ~200MB    ${YELLOW}│${NC} Development ${YELLOW}│${NC}"
    echo -e "${YELLOW}│${NC} ${GREEN}MEDIUM${NC}      ${YELLOW}│${NC}   100K      ${YELLOW}│${NC}   ~5-8 min   ${YELLOW}│${NC}    ~1GB     ${YELLOW}│${NC} Testing     ${YELLOW}│${NC}"
    echo -e "${YELLOW}│${NC} ${GREEN}LARGE${NC}       ${YELLOW}│${NC}    1M+      ${YELLOW}│${NC}  ~10-15 min  ${YELLOW}│${NC}    ~4GB     ${YELLOW}│${NC} Enterprise  ${YELLOW}│${NC}"
    echo -e "${YELLOW}└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘${NC}"
    echo ""
}

# Function to check system capabilities
check_system_capabilities() {
    echo -e "${PURPLE}🖥️  System Analysis:${NC}"
    
    # Check available memory
    local mem_gb=0
    if command -v free >/dev/null 2>&1; then
        mem_gb=$(free -g | awk 'NR==2{printf "%.0f", $7}')
    elif command -v vm_stat >/dev/null 2>&1; then
        # macOS
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        mem_gb=$(echo "scale=0; $free_pages * 4096 / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "4")
    else
        mem_gb=4  # Default assumption
    fi
    
    # Check disk space
    local disk_gb=0
    if command -v df >/dev/null 2>&1; then
        disk_gb=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G.*//' | sed 's/T.*/000/' | head -c 3)
        disk_gb=${disk_gb:-10}  # Default if parsing fails
    else
        disk_gb=10  # Default assumption
    fi
    
    # Check CPU cores
    local cores=4  # Default assumption
    if command -v nproc >/dev/null 2>&1; then
        cores=$(nproc)
    elif command -v sysctl >/dev/null 2>&1; then
        cores=$(sysctl -n hw.ncpu 2>/dev/null || echo "4")
    fi
    
    echo "   • Available RAM: ${GREEN}${mem_gb}GB${NC}"
    echo "   • Available disk: ${GREEN}${disk_gb}GB${NC}"
    echo "   • CPU cores: ${GREEN}${cores}${NC}"
    echo ""
    
    # Recommend based on system capabilities
    echo -e "${CYAN}🎯 Recommended Datasets for Your System:${NC}"
    
    if [ "$mem_gb" -ge 8 ] && [ "$disk_gb" -ge 5 ] && [ "$cores" -ge 8 ]; then
        echo -e "   • ${GREEN}✅ ALL SIZES${NC} - Your system can handle any dataset"
        echo -e "   • ${PURPLE}Recommended: LARGE${NC} for enterprise testing"
    elif [ "$mem_gb" -ge 4 ] && [ "$disk_gb" -ge 2 ] && [ "$cores" -ge 4 ]; then
        echo -e "   • ${GREEN}✅ TINY, SMALL, MEDIUM${NC} - Good performance expected"
        echo -e "   • ${PURPLE}Recommended: MEDIUM${NC} for comprehensive testing"
        echo -e "   • ${YELLOW}⚠️  LARGE${NC} - Possible but may be slow"
    elif [ "$mem_gb" -ge 2 ] && [ "$disk_gb" -ge 1 ]; then
        echo -e "   • ${GREEN}✅ TINY, SMALL${NC} - Optimal for your system"
        echo -e "   • ${PURPLE}Recommended: SMALL${NC} for development"
        echo -e "   • ${YELLOW}⚠️  MEDIUM, LARGE${NC} - May cause performance issues"
    else
        echo -e "   • ${GREEN}✅ TINY${NC} - Best fit for your system"
        echo -e "   • ${PURPLE}Recommended: TINY${NC} for quick demos"
        echo -e "   • ${RED}❌ SMALL, MEDIUM, LARGE${NC} - Not recommended"
    fi
    echo ""
    
    # Export for other scripts to use
    export DETECTED_RAM_GB="$mem_gb"
    export DETECTED_DISK_GB="$disk_gb"
    export DETECTED_CORES="$cores"
}

# Function to show interactive menu
show_interactive_menu() {
    echo -e "${CYAN}🎛️  Choose Your Dataset:${NC}"
    echo ""
    echo "1) ${GREEN}TINY${NC}   - Quick demo (1K records, ~30s startup)"
    echo "2) ${GREEN}SMALL${NC}  - Development (10K records, ~2-3min startup)"
    echo "3) ${GREEN}MEDIUM${NC} - Testing (100K records, ~5-8min startup)"
    echo "4) ${GREEN}LARGE${NC}  - Enterprise (1M+ records, ~10-15min startup)"
    echo "5) ${YELLOW}Show detailed comparison${NC}"
    echo "6) ${YELLOW}Check system requirements${NC}"
    echo "7) ${PURPLE}Exit${NC}"
    echo ""
}

# Function to show dataset details
show_dataset_details() {
    local size=$1
    
    case $size in
        tiny)
            echo -e "${GREEN}TINY Dataset Details:${NC}"
            echo "• ${YELLOW}Records:${NC} 1,000 healthcare documents"
            echo "• ${YELLOW}Startup:${NC} ~30 seconds"
            echo "• ${YELLOW}Memory:${NC} ~50MB"
            echo "• ${YELLOW}Features:${NC} Basic search, caching demonstration"
            echo "• ${YELLOW}Best for:${NC} Quick demos, initial exploration"
            echo "• ${YELLOW}Search examples:${NC} diabetes, surgery, therapy"
            ;;
        small)
            echo -e "${GREEN}SMALL Dataset Details:${NC}"
            echo "• ${YELLOW}Records:${NC} 10,000 healthcare documents"
            echo "• ${YELLOW}Startup:${NC} ~2-3 minutes"
            echo "• ${YELLOW}Memory:${NC} ~200MB"
            echo "• ${YELLOW}Features:${NC} Multi-strategy search, performance metrics"
            echo "• ${YELLOW}Best for:${NC} Development, moderate testing"
            echo "• ${YELLOW}Search examples:${NC} diabetes management, cardiac procedures"
            ;;
        medium)
            echo -e "${GREEN}MEDIUM Dataset Details:${NC}"
            echo "• ${YELLOW}Records:${NC} 100,000 healthcare documents"
            echo "• ${YELLOW}Startup:${NC} ~5-8 minutes"
            echo "• ${YELLOW}Memory:${NC} ~1GB"
            echo "• ${YELLOW}Features:${NC} Advanced indexing, comprehensive benchmarks"
            echo "• ${YELLOW}Best for:${NC} Comprehensive testing, performance analysis"
            echo "• ${YELLOW}Search examples:${NC} CAR-T immunotherapy, clinical trials"
            ;;
        large)
            echo -e "${GREEN}LARGE Dataset Details:${NC}"
            echo "• ${YELLOW}Records:${NC} 1,000,000+ healthcare documents"
            echo "• ${YELLOW}Startup:${NC} ~10-15 minutes"
            echo "• ${YELLOW}Memory:${NC} ~4GB"
            echo "• ${YELLOW}Features:${NC} Enterprise features, production simulation"
            echo "• ${YELLOW}Best for:${NC} Enterprise testing, production-like loads"
            echo "• ${YELLOW}Search examples:${NC} Complex medical terminology, research data"
            ;;
    esac
    echo ""
}

# Function to launch selected dataset
launch_dataset() {
    local size=$1
    local script_path=""
    
    case $size in
        tiny)
            script_path="./run-postgres-redis-showcase.sh"
            ;;
        small)
            script_path="./run-small-dataset.sh"
            ;;
        medium)
            script_path="./run-medium-dataset.sh"
            ;;
        large)
            script_path="./run-large-dataset.sh"
            ;;
        *)
            print_error "Invalid dataset size: $size"
            return 1
            ;;
    esac
    
    print_step "Launching ${size^^} dataset showcase..."
    echo ""
    
    if [ -f "$script_path" ]; then
        exec "$script_path"
    else
        print_error "Script not found: $script_path"
        return 1
    fi
}

# Function to show requirements for a specific dataset
show_requirements() {
    local size=$1
    
    echo -e "${PURPLE}System Requirements for ${size^^} Dataset:${NC}"
    
    case $size in
        tiny)
            echo "• ${YELLOW}RAM:${NC} 1GB+ available"
            echo "• ${YELLOW}Disk:${NC} 100MB+ free space"
            echo "• ${YELLOW}CPU:${NC} Any modern processor"
            echo "• ${YELLOW}Time:${NC} 30 seconds startup"
            ;;
        small)
            echo "• ${YELLOW}RAM:${NC} 2GB+ available"
            echo "• ${YELLOW}Disk:${NC} 500MB+ free space"
            echo "• ${YELLOW}CPU:${NC} 2+ cores recommended"
            echo "• ${YELLOW}Time:${NC} 2-3 minutes startup"
            ;;
        medium)
            echo "• ${YELLOW}RAM:${NC} 4GB+ available"
            echo "• ${YELLOW}Disk:${NC} 2GB+ free space"
            echo "• ${YELLOW}CPU:${NC} 4+ cores recommended"
            echo "• ${YELLOW}Time:${NC} 5-8 minutes startup"
            ;;
        large)
            echo "• ${YELLOW}RAM:${NC} 8GB+ available (16GB+ recommended)"
            echo "• ${YELLOW}Disk:${NC} 5GB+ free space"
            echo "• ${YELLOW}CPU:${NC} 8+ cores recommended"
            echo "• ${YELLOW}Time:${NC} 10-15 minutes startup"
            ;;
    esac
    echo ""
}

# Main interactive loop
main() {
    print_header
    
    # Handle direct command line arguments
    if [ $# -gt 0 ]; then
        case $1 in
            tiny|small|medium|large)
                show_dataset_details "$1"
                show_requirements "$1"
                read -p "Launch $1 dataset? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    launch_dataset "$1"
                fi
                exit 0
                ;;
            *)
                echo "Usage: $0 [tiny|small|medium|large]"
                exit 1
                ;;
        esac
    fi
    
    show_dataset_comparison
    check_system_capabilities
    
    while true; do
        show_interactive_menu
        read -p "Choose an option (1-7): " choice
        echo ""
        
        case $choice in
            1)
                show_dataset_details "tiny"
                show_requirements "tiny"
                read -p "Launch TINY dataset? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    launch_dataset "tiny"
                fi
                ;;
            2)
                show_dataset_details "small"
                show_requirements "small"
                read -p "Launch SMALL dataset? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    launch_dataset "small"
                fi
                ;;
            3)
                show_dataset_details "medium"
                show_requirements "medium"
                read -p "Launch MEDIUM dataset? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    launch_dataset "medium"
                fi
                ;;
            4)
                show_dataset_details "large"
                show_requirements "large"
                read -p "Launch LARGE dataset? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    launch_dataset "large"
                fi
                ;;
            5)
                show_dataset_comparison
                ;;
            6)
                check_system_capabilities
                ;;
            7)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please select 1-7."
                ;;
        esac
        echo ""
        read -p "Press Enter to continue..."
        echo ""
    done
}

# Run main function
main "$@"