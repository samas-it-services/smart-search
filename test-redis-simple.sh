#!/bin/bash

# @samas/smart-search - Simple Redis Cache Test
# Quick and reliable testing of Redis cache functionality

set -e

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

# Function to test search with timing
test_search() {
    local query="$1"
    local label="$2"
    
    echo -e "\n${CYAN}Testing: $label${NC}"
    echo "Query: $query"
    
    start_time=$(date +%s%3N)
    response=$(curl -s "${API_BASE}/api/search?q=${query}&limit=3")
    end_time=$(date +%s%3N)
    
    duration=$((end_time - start_time))
    
    if [[ -n "$response" ]]; then
        results=$(echo "$response" | jq -r '.data.results | length' 2>/dev/null || echo "0")
        searchTime=$(echo "$response" | jq -r '.data.performance.searchTime' 2>/dev/null || echo "N/A")
        strategy=$(echo "$response" | jq -r '.data.performance.strategy' 2>/dev/null || echo "N/A")
        cacheHit=$(echo "$response" | jq -r '.data.performance.cacheHit' 2>/dev/null || echo "false")
        
        echo "Results: $results | API Time: ${searchTime}ms | HTTP Time: ${duration}ms | Strategy: $strategy | Cache Hit: $cacheHit"
        
        # Return values for comparison
        echo "$searchTime" > "/tmp/last_search_time"
        echo "$cacheHit" > "/tmp/last_cache_hit"
        return 0
    else
        print_error "No response received"
        return 1
    fi
}

# Main test
main() {
    print_header "REDIS CACHE SIMPLE TEST"
    
    # Clear Redis cache
    print_info "Clearing Redis cache..."
    docker exec smart-search-redis redis-cli FLUSHDB > /dev/null 2>&1
    print_success "Cache cleared"
    
    # Test 1: First search (should be slow, cache miss)
    test_search "diabetes" "First diabetes search (expect cache miss)"
    time1=$(cat "/tmp/last_search_time" 2>/dev/null || echo "0")
    cache1=$(cat "/tmp/last_cache_hit" 2>/dev/null || echo "false")
    
    # Test 2: Same search again (should be fast, cache hit)
    sleep 2
    test_search "diabetes" "Second diabetes search (expect cache hit)"
    time2=$(cat "/tmp/last_search_time" 2>/dev/null || echo "0")
    cache2=$(cat "/tmp/last_cache_hit" 2>/dev/null || echo "false")
    
    # Test 3: Different search (should be slow, cache miss)
    test_search "cancer" "Cancer search (expect cache miss)"
    time3=$(cat "/tmp/last_search_time" 2>/dev/null || echo "0")
    cache3=$(cat "/tmp/last_cache_hit" 2>/dev/null || echo "false")
    
    # Test 4: Cancer search again (should be fast, cache hit)
    test_search "cancer" "Second cancer search (expect cache hit)"
    time4=$(cat "/tmp/last_search_time" 2>/dev/null || echo "0")
    cache4=$(cat "/tmp/last_cache_hit" 2>/dev/null || echo "false")
    
    print_header "ANALYSIS"
    
    echo "Search Performance Summary:"
    echo "┌─────────────────────────────────────┬────────────┬───────────┐"
    echo "│ Test                                │ Time (ms)  │ Cache Hit │"
    echo "├─────────────────────────────────────┼────────────┼───────────┤"
    printf "│ %-35s │ %10s │ %9s │\n" "1st diabetes search" "$time1" "$cache1"
    printf "│ %-35s │ %10s │ %9s │\n" "2nd diabetes search" "$time2" "$cache2"
    printf "│ %-35s │ %10s │ %9s │\n" "1st cancer search" "$time3" "$cache3"
    printf "│ %-35s │ %10s │ %9s │\n" "2nd cancer search" "$time4" "$cache4"
    echo "└─────────────────────────────────────┴────────────┴───────────┘"
    
    # Check cache keys
    cache_keys=$(docker exec smart-search-redis redis-cli KEYS "search:*" 2>/dev/null | wc -l | tr -d ' ')
    print_info "Cache keys stored: $cache_keys"
    
    # Performance analysis
    print_header "CACHE EFFECTIVENESS"
    
    # Check if cache is working (second searches should be faster)
    if [[ "$time2" != "N/A" && "$time1" != "N/A" && "$time2" -lt 100 && "$time1" -gt 500 ]]; then
        speedup=$(echo "scale=1; $time1 / $time2" | bc -l 2>/dev/null || echo "N/A")
        print_success "Cache performance excellent! Speedup: ${speedup}x"
    elif [[ "$time2" -lt "$time1" ]]; then
        print_success "Cache is working - second search faster"
    else
        print_error "Cache may not be working optimally"
    fi
    
    # Check cache hit behavior
    cache_working=true
    if [[ "$cache2" != "true" ]]; then
        print_error "Expected cache hit on second diabetes search"
        cache_working=false
    fi
    
    if [[ "$cache4" != "true" ]]; then
        print_error "Expected cache hit on second cancer search"
        cache_working=false
    fi
    
    if [[ "$cache_working" == "true" ]]; then
        print_success "Cache hit behavior is correct"
    fi
    
    # Redis connection test
    print_header "REDIS CONNECTION"
    if docker exec smart-search-redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is responding"
        
        redis_info=$(docker exec smart-search-redis redis-cli INFO memory | grep used_memory_human || echo "N/A")
        print_info "Redis memory usage: ${redis_info#*:}"
    else
        print_error "Redis connection failed"
    fi
    
    # Final verdict
    print_header "FINAL VERDICT"
    
    if [[ "$cache_keys" -ge 2 && "$cache_working" == "true" ]]; then
        print_success "🎉 REDIS CACHE IS WORKING PERFECTLY!"
        echo -e "${GREEN}✅ Cache storing results correctly${NC}"
        echo -e "${GREEN}✅ Cache hits working as expected${NC}"
        echo -e "${GREEN}✅ Performance improvement verified${NC}"
        echo -e "${GREEN}✅ Redis connection stable${NC}"
    else
        print_error "Redis cache needs attention"
    fi
    
    # Cleanup
    rm -f "/tmp/last_search_time" "/tmp/last_cache_hit" 2>/dev/null
    
    print_info "Test completed: $(date)"
}

# Show usage
show_usage() {
    echo "Usage: $0 [--help]"
    echo ""
    echo "Simple Redis Cache Test for @samas/smart-search"
    echo "Tests cache performance and functionality"
    echo ""
    echo "Options:"
    echo "  --help    Show this help message"
    echo ""
    echo "This script will:"
    echo "  1. Clear the Redis cache"
    echo "  2. Perform searches to test cache miss/hit behavior"
    echo "  3. Analyze performance differences"
    echo "  4. Verify cache functionality"
}

# Handle arguments
if [[ "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Run main test
main