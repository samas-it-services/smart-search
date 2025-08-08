#!/bin/bash

# @samas/smart-search - PostgreSQL + Redis Interactive Launcher
# Interactive script to choose dataset size and launch the showcase

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

# Main function
main() {
    print_header "PostgreSQL + Redis Interactive Launcher"
    
    # Check Docker
    check_docker
    
    # Configure ports
    configure_provider_ports "$PROVIDER"
    show_port_info "$PROVIDER"
    
    # Interactive dataset selection
    prompt_dataset_size
    show_dataset_info
    
    # Check if dataset is available
    ensure_dataset_available "$PROVIDER" "$DATA_SIZE" "healthcare"
    
    # Confirmation
    echo ""
    print_step "🚀 Ready to launch PostgreSQL + Redis Healthcare Showcase"
    echo "   • Dataset: $DATA_SIZE"
    echo "   • Showcase URL: http://localhost:$SHOWCASE_PORT"
    echo "   • PostgreSQL: localhost:$POSTGRES_PORT"
    echo "   • Redis: localhost:$REDIS_PORT"
    echo ""
    
    read -p "Continue with launch? [Y/n]: " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        # Launch the appropriate script
        case $DATA_SIZE in
            tiny)
                "$SCRIPT_DIR/start-tiny.sh"
                ;;
            small)
                "$SCRIPT_DIR/start-small.sh"
                ;;
            medium)
                "$SCRIPT_DIR/start-medium.sh"
                ;;
            large)
                "$SCRIPT_DIR/start-large.sh"
                ;;
        esac
    else
        print_status "Launch cancelled by user"
    fi
}

# Run main function
main "$@"