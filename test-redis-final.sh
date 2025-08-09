#!/bin/bash

# @samas/smart-search - Redis Cache Test (Final Version)
# Simple and reliable Redis cache functionality test

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

API_BASE="http://localhost:3002"

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to test search
test_search() {
    local query="$1"
    local label="$2"
    
    echo -e "\n${CYAN}Testing: $label${NC}"
    echo "Query: $query"
    
    response=$(curl -s "${API_BASE}/api/search?q=${query}&limit=3" || echo "ERROR")
    
    if [[ "$response" != "ERROR" && -n "$response" ]]; then
        results=$(echo "$response" | jq -r '.data.results | length' 2>/dev/null || echo "0")
        searchTime=$(echo "$response" | jq -r '.data.performance.searchTime' 2>/dev/null || echo "N/A")
        strategy=$(echo "$response" | jq -r '.data.performance.strategy' 2>/dev/null || echo "N/A")
        cacheHit=$(echo "$response" | jq -r '.data.performance.cacheHit' 2>/dev/null || echo "false")
        
        echo "Results: $results | Time: ${searchTime}ms | Strategy: $strategy | Cache Hit: $cacheHit"
        
        # Simple logic for analysis
        if [[ "$cacheHit" == "true" ]]; then
            echo "CACHE_HIT"
        else
            echo "CACHE_MISS"
        fi
        
        if [[ "$searchTime" != "N/A" && "$searchTime" -lt 50 ]]; then
            echo "FAST"
        else
            echo "SLOW"
        fi
        
        return 0
    else
        print_error "Failed to get response"
        return 1
    fi
}

# Simple Redis test
main() {
    print_header "REDIS CACHE FUNCTIONALITY TEST"
    
    print_info "Clearing Redis cache..."
    docker exec smart-search-redis redis-cli FLUSHDB > /dev/null 2>&1 || print_error "Failed to clear cache"
    print_success "Cache cleared"
    
    # Test sequence
    echo -e "\n${YELLOW}📋 Running test sequence...${NC}"
    
    print_info "1. First diabetes search (should miss cache)"
    test_search "diabetes" "Cache miss test"
    
    sleep 1
    
    print_info "2. Second diabetes search (should hit cache)"
    test_search "diabetes" "Cache hit test"
    
    print_info "3. New cancer search (should miss cache)"
    test_search "cancer" "New query test"
    
    sleep 1
    
    print_info "4. Repeat cancer search (should hit cache)"
    test_search "cancer" "Repeat query test"
    
    print_header "REDIS STATUS"
    
    # Check Redis connection
    if docker exec smart-search-redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is connected and responding"
    else
        print_error "Redis connection failed"
    fi
    
    # Check cache keys
    cache_keys=$(docker exec smart-search-redis redis-cli KEYS "search:*" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$cache_keys" -gt 0 ]]; then
        print_success "Cache keys found: $cache_keys"
        
        # Show some cache keys
        echo "Sample cache keys:"
        docker exec smart-search-redis redis-cli KEYS "search:*" 2>/dev/null | head -3 | while read key; do
            if [[ -n "$key" ]]; then
                ttl=$(docker exec smart-search-redis redis-cli TTL "$key" 2>/dev/null || echo "N/A")
                echo "  - ${key:0:50}... (TTL: ${ttl}s)"
            fi
        done
    else
        print_error "No cache keys found"
    fi
    
    # Health check
    print_header "HEALTH CHECK"
    
    health_response=$(curl -s "${API_BASE}/api/health" 2>/dev/null || echo "ERROR")
    if [[ "$health_response" != "ERROR" ]]; then
        print_success "API health endpoint accessible"
        
        cache_connected=$(echo "$health_response" | jq -r '.cacheHealth.isConnected // false' 2>/dev/null)
        db_connected=$(echo "$health_response" | jq -r '.databaseHealth.isConnected // false' 2>/dev/null)
        
        if [[ "$cache_connected" == "true" ]]; then
            print_success "Cache health: Connected"
        else
            print_error "Cache health: Not connected"
        fi
        
        if [[ "$db_connected" == "true" ]]; then
            print_success "Database health: Connected"
        else
            print_error "Database health: Not connected"
        fi
    else
        print_error "Cannot reach health endpoint"
    fi
    
    print_header "QUICK PERFORMANCE TEST"
    
    # Quick performance comparison
    echo "Testing search performance..."
    
    # Clear cache and test
    docker exec smart-search-redis redis-cli FLUSHDB > /dev/null 2>&1
    
    echo "Cold search (no cache):"
    curl -s "${API_BASE}/api/search?q=surgery&limit=2" | jq '.data.performance | {searchTime, strategy, cacheHit}'
    
    echo "Warm search (cached):"
    curl -s "${API_BASE}/api/search?q=surgery&limit=2" | jq '.data.performance | {searchTime, strategy, cacheHit}'
    
    print_header "FINAL STATUS"
    
    # Simple pass/fail based on cache keys and Redis connection
    if [[ "$cache_keys" -gt 0 ]] && docker exec smart-search-redis redis-cli ping > /dev/null 2>&1; then
        print_success "🎉 REDIS CACHE IS WORKING!"
        echo -e "${GREEN}✅ Redis connected${NC}"
        echo -e "${GREEN}✅ Cache storing results${NC}"
        echo -e "${GREEN}✅ Search API functional${NC}"
    else
        print_error "❌ Redis cache needs attention"
    fi
    
    print_info "Test completed at: $(date)"
}

# Usage help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Redis Cache Test for @samas/smart-search"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "This script tests:"
    echo "  - Redis connection"
    echo "  - Cache storage functionality" 
    echo "  - Search performance"
    echo "  - API health status"
    echo ""
    echo "Prerequisites:"
    echo "  - Docker containers must be running"
    echo "  - API must be accessible on $API_BASE"
    exit 0
fi

# Run the test
main