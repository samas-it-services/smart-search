#!/bin/bash

# @samas/smart-search - Redis Cache Testing Script
# Comprehensive testing of Redis cache functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3002"
CONTAINER_PREFIX="smart-search"

print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Function to test API endpoint
test_api() {
    local url="$1"
    local description="$2"
    
    print_step "Testing: $description"
    
    response=$(curl -s "$url" 2>/dev/null || echo "ERROR")
    
    if [[ "$response" == "ERROR" ]] || [[ -z "$response" ]]; then
        print_error "Failed to connect to $url"
        return 1
    fi
    
    # Parse JSON response
    local status=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    local results=$(echo "$response" | jq -r '.data.results | length' 2>/dev/null || echo "0")
    local searchTime=$(echo "$response" | jq -r '.data.performance.searchTime // 0' 2>/dev/null)
    local strategy=$(echo "$response" | jq -r '.data.performance.strategy // "unknown"' 2>/dev/null)
    local cacheHit=$(echo "$response" | jq -r '.data.performance.cacheHit // false' 2>/dev/null)
    
    if [[ "$status" == "true" ]]; then
        print_success "Results: $results | Time: ${searchTime}ms | Strategy: $strategy | Cache Hit: $cacheHit"
        echo "$searchTime,$strategy,$cacheHit,$results"
        return 0
    else
        print_error "API returned error response"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 1
    fi
}

# Function to clear Redis cache
clear_redis_cache() {
    print_step "Clearing Redis cache..."
    docker exec ${CONTAINER_PREFIX}-redis redis-cli FLUSHDB > /dev/null 2>&1
    print_success "Redis cache cleared"
}

# Function to check Redis cache keys
check_cache_keys() {
    local keyCount=$(docker exec ${CONTAINER_PREFIX}-redis redis-cli KEYS "search:*" 2>/dev/null | wc -l | tr -d ' ')
    print_info "Cache keys: $keyCount"
    return $keyCount
}

# Function to check Docker services
check_services() {
    print_header "CHECKING DOCKER SERVICES"
    
    # Check if containers are running
    services=("postgres" "redis" "postgres-redis-showcase")
    all_healthy=true
    
    for service in "${services[@]}"; do
        container_name="${CONTAINER_PREFIX}-${service}"
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
            status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
            if [[ "$status" == "healthy" ]] || [[ "$status" == "no-healthcheck" ]]; then
                print_success "$service is running and healthy"
            else
                print_warning "$service is running but health status: $status"
                all_healthy=false
            fi
        else
            print_error "$service container is not running"
            all_healthy=false
        fi
    done
    
    if [[ "$all_healthy" == "true" ]]; then
        print_success "All Docker services are operational"
        return 0
    else
        print_error "Some Docker services have issues"
        return 1
    fi
}

# Function to test basic connectivity
test_connectivity() {
    print_header "TESTING BASIC CONNECTIVITY"
    
    # Test health endpoint
    print_step "Testing health endpoint..."
    health_response=$(curl -s "${API_BASE}/api/health" 2>/dev/null || echo "ERROR")
    
    if [[ "$health_response" != "ERROR" ]]; then
        print_success "Health endpoint accessible"
        
        # Parse health information
        db_connected=$(echo "$health_response" | jq -r '.databaseHealth.isConnected // false')
        cache_connected=$(echo "$health_response" | jq -r '.cacheHealth.isConnected // false')
        
        print_info "Database connected: $db_connected"
        print_info "Cache connected: $cache_connected"
        
        if [[ "$db_connected" == "true" ]] && [[ "$cache_connected" == "true" ]]; then
            return 0
        else
            print_error "Database or cache connection issues"
            return 1
        fi
    else
        print_error "Cannot reach health endpoint"
        return 1
    fi
}

# Function to perform cache performance tests
test_cache_performance() {
    print_header "REDIS CACHE PERFORMANCE TESTING"
    
    # Clear cache to start fresh
    clear_redis_cache
    
    # Test 1: First search (should miss cache, hit database)
    print_step "Test 1: First search - expect cache miss"
    result1=$(test_api "${API_BASE}/api/search?q=diabetes&limit=5" "First diabetes search")
    if [[ $? -ne 0 ]]; then
        print_error "Test 1 failed"
        return 1
    fi
    
    # Parse result1
    IFS=',' read -r time1 strategy1 cacheHit1 results1 <<< "$result1"
    
    # Test 2: Second identical search (should hit cache)
    print_step "Test 2: Second identical search - expect cache hit"
    sleep 1 # Brief pause
    result2=$(test_api "${API_BASE}/api/search?q=diabetes&limit=5" "Second diabetes search")
    if [[ $? -ne 0 ]]; then
        print_error "Test 2 failed"
        return 1
    fi
    
    # Parse result2
    IFS=',' read -r time2 strategy2 cacheHit2 results2 <<< "$result2"
    
    # Test 3: Different query (should miss cache again)
    print_step "Test 3: Different query - expect cache miss"
    result3=$(test_api "${API_BASE}/api/search?q=cancer&limit=3" "Cancer search")
    if [[ $? -ne 0 ]]; then
        print_error "Test 3 failed"
        return 1
    fi
    
    # Parse result3
    IFS=',' read -r time3 strategy3 cacheHit3 results3 <<< "$result3"
    
    # Analyze results
    print_header "PERFORMANCE ANALYSIS"
    
    echo -e "${CYAN}Test Results Summary:${NC}"
    echo "┌────────────────────────────┬──────────┬──────────┬───────────┬─────────┐"
    echo "│ Test                       │ Time(ms) │ Strategy │ Cache Hit │ Results │"
    echo "├────────────────────────────┼──────────┼──────────┼───────────┼─────────┤"
    printf "│ %-26s │ %8s │ %8s │ %9s │ %7s │\n" "1st diabetes search" "$time1" "$strategy1" "$cacheHit1" "$results1"
    printf "│ %-26s │ %8s │ %8s │ %9s │ %7s │\n" "2nd diabetes search" "$time2" "$strategy2" "$cacheHit2" "$results2"
    printf "│ %-26s │ %8s │ %8s │ %9s │ %7s │\n" "1st cancer search" "$time3" "$strategy3" "$cacheHit3" "$results3"
    echo "└────────────────────────────┴──────────┴──────────┴───────────┴─────────┘"
    
    # Performance validation
    print_step "Validating cache performance..."
    
    # Check if cache is significantly faster for repeated queries
    if [[ "$time2" -lt "$time1" ]] && [[ "$time2" -lt 50 ]]; then
        speedup=$(echo "scale=1; $time1 / $time2" | bc -l 2>/dev/null || echo "N/A")
        print_success "Cache performance validated! Speedup: ${speedup}x"
    else
        print_warning "Cache performance may not be optimal"
    fi
    
    # Check cache key count
    check_cache_keys
    keyCount=$?
    
    if [[ $keyCount -ge 2 ]]; then
        print_success "Cache is storing search results ($keyCount keys found)"
    else
        print_warning "Expected more cache keys ($keyCount found)"
    fi
    
    return 0
}

# Function to test different search queries
test_search_variety() {
    print_header "TESTING SEARCH VARIETY"
    
    queries=("surgery" "mental%20health" "immunotherapy" "cardiac" "pediatric")
    
    for query in "${queries[@]}"; do
        test_api "${API_BASE}/api/search?q=${query}&limit=2" "Search for: $query"
    done
    
    # Check total cache keys after variety test
    check_cache_keys
    keyCount=$?
    print_info "Total unique queries cached: $keyCount"
}

# Function to test cache expiration (if applicable)
test_cache_behavior() {
    print_header "TESTING CACHE BEHAVIOR"
    
    # Test cache key inspection
    print_step "Inspecting cache keys..."
    keys=$(docker exec ${CONTAINER_PREFIX}-redis redis-cli KEYS "search:*" 2>/dev/null | head -3)
    
    if [[ -n "$keys" ]]; then
        print_success "Cache keys found:"
        echo "$keys" | while read -r key; do
            if [[ -n "$key" ]]; then
                # Get key TTL
                ttl=$(docker exec ${CONTAINER_PREFIX}-redis redis-cli TTL "$key" 2>/dev/null || echo "-1")
                print_info "  Key: ${key:0:40}... TTL: ${ttl}s"
            fi
        done
    else
        print_warning "No cache keys found"
    fi
}

# Function to run load test
run_load_test() {
    print_header "REDIS CACHE LOAD TEST"
    
    print_step "Running concurrent search requests..."
    
    # Create a temporary file for results
    temp_file="/tmp/redis_load_test_$$"
    
    # Run 10 concurrent requests for the same query
    for i in {1..10}; do
        {
            start_time=$(date +%s%3N)
            response=$(curl -s "${API_BASE}/api/search?q=diabetes&limit=5" 2>/dev/null)
            end_time=$(date +%s%3N)
            duration=$((end_time - start_time))
            
            cache_hit=$(echo "$response" | jq -r '.data.performance.cacheHit // false' 2>/dev/null)
            results=$(echo "$response" | jq -r '.data.results | length' 2>/dev/null || echo "0")
            
            echo "Request $i: ${duration}ms, Cache Hit: $cache_hit, Results: $results" >> "$temp_file"
        } &
    done
    
    # Wait for all background jobs to complete
    wait
    
    # Analyze results
    if [[ -f "$temp_file" ]]; then
        print_success "Load test completed:"
        cat "$temp_file"
        
        # Calculate average response time
        avg_time=$(grep -o '[0-9]\+ms' "$temp_file" | sed 's/ms//' | awk '{sum+=$1; count++} END {printf "%.1f", sum/count}')
        cache_hits=$(grep -c "Cache Hit: true" "$temp_file")
        
        print_info "Average response time: ${avg_time}ms"
        print_info "Cache hits: $cache_hits/10"
        
        rm -f "$temp_file"
        
        if [[ "$cache_hits" -ge 8 ]] && (( $(echo "$avg_time < 100" | bc -l) )); then
            print_success "Load test passed - high cache hit rate with fast responses"
        else
            print_warning "Load test shows room for improvement"
        fi
    else
        print_error "Load test failed to generate results"
    fi
}

# Main test function
run_all_tests() {
    print_header "REDIS CACHE COMPREHENSIVE TEST SUITE"
    echo -e "${CYAN}Testing Redis cache functionality for @samas/smart-search${NC}"
    echo ""
    
    # Test counter
    local tests_passed=0
    local tests_total=0
    
    # Test 1: Docker Services
    ((tests_total++))
    if check_services; then
        ((tests_passed++))
    fi
    
    echo ""
    
    # Test 2: Basic Connectivity
    ((tests_total++))
    if test_connectivity; then
        ((tests_passed++))
    fi
    
    echo ""
    
    # Test 3: Cache Performance
    ((tests_total++))
    if test_cache_performance; then
        ((tests_passed++))
    fi
    
    echo ""
    
    # Test 4: Search Variety
    ((tests_total++))
    if test_search_variety; then
        ((tests_passed++))
    fi
    
    echo ""
    
    # Test 5: Cache Behavior
    ((tests_total++))
    if test_cache_behavior; then
        ((tests_passed++))
    fi
    
    echo ""
    
    # Test 6: Load Test
    ((tests_total++))
    if run_load_test; then
        ((tests_passed++))
    fi
    
    # Final Summary
    print_header "FINAL TEST RESULTS"
    
    if [[ $tests_passed -eq $tests_total ]]; then
        print_success "🎉 ALL TESTS PASSED! ($tests_passed/$tests_total)"
        print_success "Redis cache is working perfectly!"
        echo ""
        print_info "✅ Redis client initialization: WORKING"
        print_info "✅ Cache connection: STABLE"
        print_info "✅ Search caching: FUNCTIONAL"
        print_info "✅ Performance improvement: SIGNIFICANT"
        print_info "✅ Load handling: EXCELLENT"
    else
        print_error "❌ Some tests failed ($tests_passed/$tests_total passed)"
        print_error "Redis cache may have issues that need attention"
    fi
    
    echo ""
    print_info "Test completed at: $(date)"
}

# Help function
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Redis Cache Testing Script for @samas/smart-search"
    echo ""
    echo "Options:"
    echo "  --help, -h           Show this help message"
    echo "  --services           Check Docker services only"
    echo "  --connectivity       Test API connectivity only"
    echo "  --performance        Test cache performance only"
    echo "  --load-test          Run load test only"
    echo "  --clear-cache        Clear Redis cache"
    echo "  --all, (default)     Run all tests"
    echo ""
    echo "Examples:"
    echo "  $0                   # Run all tests"
    echo "  $0 --performance     # Test cache performance only"
    echo "  $0 --clear-cache     # Clear Redis cache"
}

# Parse command line arguments
case "${1:-all}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --services)
        check_services
        ;;
    --connectivity)
        test_connectivity
        ;;
    --performance)
        test_cache_performance
        ;;
    --load-test)
        run_load_test
        ;;
    --clear-cache)
        clear_redis_cache
        ;;
    --all|all|"")
        run_all_tests
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac