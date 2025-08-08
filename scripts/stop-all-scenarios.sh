#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}🛑 Smart Search - All Scenarios Shutdown${NC}"
echo -e "${CYAN}=====================================${NC}"
echo ""

# Function to print step headers
print_step() {
    echo -e "${PURPLE}Step $1: $2${NC}"
    echo -e "${PURPLE}$(printf '%.0s-' {1..40})${NC}"
}

# Function to stop services gracefully
stop_services() {
    print_step "1" "Stopping all services gracefully"
    
    cd "$PROJECT_ROOT"
    
    if [ -f "docker/all-scenarios.docker-compose.yml" ]; then
        echo -e "${BLUE}🐳 Stopping Smart Search stack...${NC}"
        docker-compose -f docker/all-scenarios.docker-compose.yml stop
        echo -e "${GREEN}✅ All services stopped${NC}"
    else
        echo -e "${YELLOW}⚠️ Docker compose file not found${NC}"
    fi
}

# Function to remove containers
remove_containers() {
    print_step "2" "Removing containers"
    
    cd "$PROJECT_ROOT"
    
    if [ -f "docker/all-scenarios.docker-compose.yml" ]; then
        echo -e "${BLUE}🗑️ Removing containers...${NC}"
        docker-compose -f docker/all-scenarios.docker-compose.yml down
        echo -e "${GREEN}✅ All containers removed${NC}"
    fi
}

# Function to clean up volumes (optional)
cleanup_volumes() {
    print_step "3" "Volume cleanup (optional)"
    
    echo -e "${YELLOW}Would you like to remove data volumes? This will delete all data. (y/N)${NC}"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${BLUE}🗑️ Removing volumes...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose -f docker/all-scenarios.docker-compose.yml down -v
        echo -e "${GREEN}✅ All volumes removed${NC}"
    else
        echo -e "${BLUE}ℹ️ Volumes preserved${NC}"
    fi
}

# Function to clean up networks
cleanup_networks() {
    print_step "4" "Cleaning up Docker networks"
    
    echo -e "${BLUE}🔗 Removing unused networks...${NC}"
    docker network prune -f
    echo -e "${GREEN}✅ Networks cleaned${NC}"
}

# Function to show final status
show_final_status() {
    print_step "5" "Shutdown complete"
    
    echo ""
    echo -e "${GREEN}🎉 Smart Search All Scenarios Successfully Stopped!${NC}"
    echo ""
    echo -e "${CYAN}What was stopped:${NC}"
    echo -e "${BLUE}  🏥 Healthcare Platform (PostgreSQL + Redis)${NC}"
    echo -e "${BLUE}  💰 Financial Platform (MySQL + DragonflyDB)${NC}"
    echo -e "${BLUE}  🛒 E-commerce Platform (MongoDB + Memcached)${NC}"
    echo -e "${BLUE}  📊 Analytics Platform (Delta Lake + Redis)${NC}"
    echo -e "${BLUE}  📈 Monitoring Stack (Grafana + Prometheus)${NC}"
    echo -e "${BLUE}  🌐 Load Balancer (Nginx)${NC}"
    echo ""
    echo -e "${YELLOW}To start again:${NC}"
    echo -e "  ${CYAN}./scripts/start-all-scenarios.sh${NC}"
    echo ""
    echo -e "${YELLOW}To clean up completely (remove volumes):${NC}"
    echo -e "  ${CYAN}docker-compose -f docker/all-scenarios.docker-compose.yml down -v${NC}"
    echo ""
    echo -e "${GREEN}👋 Thanks for using Smart Search!${NC}"
}

# Handle different shutdown options
case "${1:-}" in
    "--force")
        echo -e "${YELLOW}🚨 Force shutdown requested${NC}"
        cd "$PROJECT_ROOT"
        docker-compose -f docker/all-scenarios.docker-compose.yml down --remove-orphans
        docker network prune -f
        echo -e "${GREEN}✅ Force shutdown complete${NC}"
        exit 0
        ;;
    "--with-volumes")
        echo -e "${YELLOW}🚨 Shutdown with volume removal requested${NC}"
        cd "$PROJECT_ROOT"
        docker-compose -f docker/all-scenarios.docker-compose.yml down -v --remove-orphans
        docker network prune -f
        echo -e "${GREEN}✅ Complete cleanup finished${NC}"
        exit 0
        ;;
    "--help")
        echo -e "${CYAN}Smart Search Shutdown Options:${NC}"
        echo -e "  ${GREEN}./scripts/stop-all-scenarios.sh${NC}           - Graceful shutdown (interactive)"
        echo -e "  ${GREEN}./scripts/stop-all-scenarios.sh --force${NC}    - Force immediate shutdown"
        echo -e "  ${GREEN}./scripts/stop-all-scenarios.sh --with-volumes${NC} - Shutdown and remove all data"
        echo -e "  ${GREEN}./scripts/stop-all-scenarios.sh --help${NC}     - Show this help"
        exit 0
        ;;
esac

# Main execution (interactive mode)
main() {
    stop_services
    remove_containers
    cleanup_volumes
    cleanup_networks
    show_final_status
}

# Handle script interruption
trap 'echo -e "\n${RED}❌ Shutdown interrupted. Some containers may still be running.${NC}"; exit 1' INT TERM

# Run main function
main "$@"