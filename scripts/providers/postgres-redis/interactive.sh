#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Launcher
# Non-interactive automation-ready script with comprehensive CLI support
# This script is now non-interactive by default - use environment variables or CLI args

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMMON_DIR="$SCRIPT_DIR/../../common"

# Source common utilities
source "$COMMON_DIR/docker-helpers.sh"
source "$COMMON_DIR/port-management.sh"
source "$COMMON_DIR/dataset-helpers.sh"

PROVIDER="postgres-redis"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Main function (now non-interactive)
main() {
    # Parse command line arguments
    parse_dataset_args "$@"
    
    # Handle help request
    if [ "$HELP" = true ]; then
        show_dataset_help "$(basename "$0")" "PostgreSQL + Redis Provider Launcher"
        exit 0
    fi
    
    # Set defaults if not specified
    export DATA_SIZE=${DATA_SIZE:-tiny}
    export INDUSTRY=${INDUSTRY:-healthcare}
    
    # Validate dataset size
    if ! validate_dataset_size "$DATA_SIZE"; then
        exit 1
    fi
    
    print_header "PostgreSQL + Redis $DATA_SIZE Launcher"
    
    # Check Docker
    check_docker
    
    # Configure ports
    configure_provider_ports "$PROVIDER"
    show_port_info "$PROVIDER"
    
    # Get dataset size (non-interactive)
    get_dataset_size "$DATA_SIZE"
    show_dataset_info
    
    # Check if dataset is available
    ensure_dataset_available "$PROVIDER" "$DATA_SIZE" "$INDUSTRY"
    
    # Show launch information
    echo ""
    print_step "🚀 Launching PostgreSQL + Redis $INDUSTRY Showcase"
    echo "   • Dataset: $DATA_SIZE"
    echo "   • Industry: $INDUSTRY"
    echo "   • Showcase URL: http://localhost:$SHOWCASE_PORT"
    echo "   • PostgreSQL: localhost:$POSTGRES_PORT"
    echo "   • Redis: localhost:$REDIS_PORT"
    
    # Handle dry run mode
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would launch $target_script"
        exit 0
    fi
    
    # Find and execute the appropriate script
    local target_script="$SCRIPT_DIR/start-$DATA_SIZE.sh"
    if [[ ! -f "$target_script" ]]; then
        print_error "Script not found: $target_script"
        print_status "Available scripts in $SCRIPT_DIR:"
        ls -la "$SCRIPT_DIR"/start-*.sh 2>/dev/null || print_error "No start scripts found"
        exit 1
    fi
    
    # Launch the appropriate script
    print_status "Executing: $target_script"
    exec "$target_script"
}

# Run main function
main "$@"