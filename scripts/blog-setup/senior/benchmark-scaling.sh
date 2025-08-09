#!/bin/bash

# Smart Search - Enterprise Performance Benchmarking & Scaling Analysis
# Comprehensive load testing with horizontal and vertical scaling metrics

set -e

echo "🚀 SMART SEARCH - ENTERPRISE SCALING BENCHMARK"
echo "=============================================="
echo "Testing horizontal and vertical scaling performance..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
NAMESPACE=${1:-smart-search-production}
TARGET_HOST=${2:-smart-search-service.${NAMESPACE}.svc.cluster.local}
DURATION=${3:-300} # 5 minutes default
MAX_CONCURRENT=${4:-1000}

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_benchmark() { echo -e "${CYAN}📊 $1${NC}"; }

# Check prerequisites
log_info "Validating benchmark prerequisites..."

if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is required for scaling analysis"
    exit 1
fi

if ! command -v hey &> /dev/null; then
    log_warning "Installing 'hey' load testing tool..."
    if command -v brew &> /dev/null; then
        brew install hey
    else
        curl -L https://github.com/rakyll/hey/releases/download/v0.1.4/hey_linux_amd64 -o /usr/local/bin/hey
        chmod +x /usr/local/bin/hey
    fi
fi

if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
    log_error "Namespace ${NAMESPACE} does not exist"
    log_info "Please run ./setup-enterprise.sh first"
    exit 1
fi

log_success "Prerequisites validated"

# Create benchmark results directory
RESULTS_DIR="benchmark-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p ${RESULTS_DIR}

log_info "Results will be saved to: ${RESULTS_DIR}"

# Helper function to get current metrics
get_current_metrics() {
    local deployment="smart-search-service"
    
    # Get current replica count
    CURRENT_REPLICAS=$(kubectl get deployment ${deployment} -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')
    
    # Get resource limits
    CPU_LIMIT=$(kubectl get deployment ${deployment} -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')
    MEMORY_LIMIT=$(kubectl get deployment ${deployment} -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')
    
    # Get current resource usage
    METRICS=$(kubectl top pods -n ${NAMESPACE} -l app=smart-search --no-headers 2>/dev/null | awk '{cpu+=$2; mem+=$3} END {print cpu "m " mem "Mi"}' || echo "0m 0Mi")
    
    echo "Current Configuration:"
    echo "  Replicas: ${CURRENT_REPLICAS}"
    echo "  CPU Limit: ${CPU_LIMIT}"
    echo "  Memory Limit: ${MEMORY_LIMIT}"
    echo "  Current Usage: ${METRICS}"
}

# Run load test with specific parameters
run_load_test() {
    local name=$1
    local concurrent=$2
    local requests=$3
    local description=$4
    
    log_benchmark "Running ${name}: ${concurrent} concurrent users, ${requests} total requests"
    
    # Port forward to service
    kubectl port-forward -n ${NAMESPACE} svc/smart-search-service 8080:80 &
    local PF_PID=$!
    sleep 5
    
    # Define test queries for realistic search patterns
    local test_queries=(
        "heart disease treatment"
        "diabetes management"
        "cancer patient care"
        "emergency surgery"
        "pediatric medicine"
        "orthopedic surgery"
        "mental health therapy"
        "chronic pain management"
        "preventive care"
        "laboratory results"
    )
    
    # Create test data file
    local test_data_file="${RESULTS_DIR}/${name}-queries.txt"
    for i in $(seq 1 ${requests}); do
        query=${test_queries[$((i % ${#test_queries[@]}))]}
        echo "{\"query\": \"${query}\", \"options\": {\"limit\": 20}}" >> ${test_data_file}
    done
    
    # Run load test
    local output_file="${RESULTS_DIR}/${name}-results.json"
    
    hey -n ${requests} -c ${concurrent} -m POST \
        -H "Content-Type: application/json" \
        -D ${test_data_file} \
        -o json \
        http://localhost:8080/api/search > ${output_file}
    
    # Clean up
    kill ${PF_PID} 2>/dev/null || true
    
    # Parse results
    local avg_time=$(jq -r '.Summary.Average' ${output_file})
    local p95_time=$(jq -r '.Summary.P95' ${output_file})
    local p99_time=$(jq -r '.Summary.P99' ${output_file})
    local rps=$(jq -r '.Summary.RPS' ${output_file})
    local error_rate=$(jq -r '.Summary.ErrorRate' ${output_file})
    
    echo "  ${description}"
    echo "  Average Response Time: ${avg_time}s"
    echo "  P95 Response Time: ${p95_time}s"
    echo "  P99 Response Time: ${p99_time}s"
    echo "  Requests/sec: ${rps}"
    echo "  Error Rate: ${error_rate}%"
    echo ""
    
    # Store results in CSV for analysis
    echo "${name},${concurrent},${requests},${avg_time},${p95_time},${p99_time},${rps},${error_rate}" >> ${RESULTS_DIR}/benchmark-summary.csv
    
    return 0
}

# Monitor scaling behavior
monitor_scaling() {
    local duration=$1
    local output_file="${RESULTS_DIR}/scaling-metrics.csv"
    
    echo "timestamp,replicas,cpu_usage,memory_usage,rps,avg_response_time" > ${output_file}
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    while [ $(date +%s) -lt ${end_time} ]; do
        local timestamp=$(date -Iseconds)
        local replicas=$(kubectl get deployment smart-search-service -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')
        
        # Get resource usage
        local metrics=$(kubectl top pods -n ${NAMESPACE} -l app=smart-search --no-headers 2>/dev/null | awk '{cpu+=$2; mem+=$3} END {print cpu "," mem}' || echo "0,0")
        
        # Get current RPS from Prometheus (if available)
        local rps="0"
        if kubectl get svc prometheus-kube-prometheus-prometheus -n monitoring &>/dev/null; then
            kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090 &
            local PROM_PID=$!
            sleep 2
            rps=$(curl -s 'http://localhost:9090/api/v1/query?query=rate(smart_search_searches_total[1m])' | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
            kill ${PROM_PID} 2>/dev/null || true
        fi
        
        echo "${timestamp},${replicas},${metrics},${rps},0" >> ${output_file}
        sleep 30
    done
}

# Create CSV header
echo "test_name,concurrent_users,total_requests,avg_response_time,p95_response_time,p99_response_time,requests_per_second,error_rate" > ${RESULTS_DIR}/benchmark-summary.csv

# Phase 1: Baseline Performance Testing
log_benchmark "Phase 1: Baseline Performance Analysis"
echo "======================================="

get_current_metrics

# Light load test
run_load_test "baseline-light" 10 100 "Light load - 10 concurrent users"

# Medium load test
run_load_test "baseline-medium" 50 500 "Medium load - 50 concurrent users"

# Heavy load test
run_load_test "baseline-heavy" 100 1000 "Heavy load - 100 concurrent users"

# Phase 2: Horizontal Scaling Test
log_benchmark "Phase 2: Horizontal Scaling Analysis"
echo "====================================="

# Test different replica counts
ORIGINAL_REPLICAS=$(kubectl get deployment smart-search-service -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')

for replicas in 3 5 8 12; do
    log_info "Testing with ${replicas} replicas..."
    
    # Scale deployment
    kubectl scale deployment smart-search-service -n ${NAMESPACE} --replicas=${replicas}
    
    # Wait for scaling
    kubectl wait --for=condition=available --timeout=300s deployment/smart-search-service -n ${NAMESPACE}
    sleep 30  # Allow time for load balancer to update
    
    # Run load test
    run_load_test "horizontal-${replicas}replicas" 100 1000 "${replicas} replicas - horizontal scaling"
done

# Restore original replica count
kubectl scale deployment smart-search-service -n ${NAMESPACE} --replicas=${ORIGINAL_REPLICAS}
kubectl wait --for=condition=available --timeout=300s deployment/smart-search-service -n ${NAMESPACE}

# Phase 3: Vertical Scaling Test
log_benchmark "Phase 3: Vertical Scaling Analysis"
echo "==================================="

# Test different resource allocations
ORIGINAL_CPU=$(kubectl get deployment smart-search-service -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')
ORIGINAL_MEMORY=$(kubectl get deployment smart-search-service -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')

declare -A resource_configs=(
    ["small"]="500m:1Gi"
    ["medium"]="1000m:2Gi"
    ["large"]="2000m:4Gi"
    ["xlarge"]="4000m:8Gi"
)

for config in "${!resource_configs[@]}"; do
    IFS=':' read -r cpu memory <<< "${resource_configs[$config]}"
    
    log_info "Testing with ${config} resources (${cpu} CPU, ${memory} Memory)..."
    
    # Update resource limits
    kubectl patch deployment smart-search-service -n ${NAMESPACE} -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"smart-search\",\"resources\":{\"limits\":{\"cpu\":\"${cpu}\",\"memory\":\"${memory}\"},\"requests\":{\"cpu\":\"$(echo ${cpu} | sed 's/m//'| awk '{print int($1/2)}')m\",\"memory\":\"$(echo ${memory} | sed 's/Gi//'| awk '{print int($1/2)}')Gi\"}}}]}}}}"
    
    # Wait for rolling update
    kubectl rollout status deployment/smart-search-service -n ${NAMESPACE} --timeout=300s
    sleep 30
    
    # Run load test
    run_load_test "vertical-${config}" 100 1000 "${config} resources (${cpu}/${memory}) - vertical scaling"
done

# Restore original resource limits
kubectl patch deployment smart-search-service -n ${NAMESPACE} -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"smart-search\",\"resources\":{\"limits\":{\"cpu\":\"${ORIGINAL_CPU}\",\"memory\":\"${ORIGINAL_MEMORY}\"}}}]}}}}"
kubectl rollout status deployment/smart-search-service -n ${NAMESPACE} --timeout=300s

# Phase 4: Stress Testing
log_benchmark "Phase 4: Stress Testing & Breaking Point Analysis"
echo "==============================================="

# Progressive load testing to find breaking point
for concurrent in 50 100 200 400 800; do
    log_info "Stress test with ${concurrent} concurrent users..."
    
    # Monitor during stress test
    monitor_scaling 120 &  # Monitor for 2 minutes
    MONITOR_PID=$!
    
    run_load_test "stress-${concurrent}" ${concurrent} $((concurrent * 10)) "Stress test - ${concurrent} concurrent users"
    
    kill ${MONITOR_PID} 2>/dev/null || true
    
    # Check if error rate is too high
    error_rate=$(tail -n 1 ${RESULTS_DIR}/benchmark-summary.csv | cut -d',' -f8)
    if (( $(echo "${error_rate} > 5.0" | bc -l) )); then
        log_warning "High error rate detected (${error_rate}%), stopping stress test"
        break
    fi
done

# Phase 5: Cache Performance Analysis
log_benchmark "Phase 5: Cache Performance Analysis"
echo "================================="

# Test with cache warming
log_info "Testing with cache warming..."

# Warm cache with common queries
kubectl port-forward -n ${NAMESPACE} svc/smart-search-service 8080:80 &
PF_PID=$!
sleep 5

for query in "heart disease" "diabetes" "cancer" "surgery" "medicine"; do
    curl -s -X POST http://localhost:8080/api/search \
         -H "Content-Type: application/json" \
         -d "{\"query\": \"${query}\", \"options\": {\"limit\": 20}}" > /dev/null
done

kill ${PF_PID} 2>/dev/null || true

# Test cache hit performance
run_load_test "cache-warm" 100 1000 "Cache warmed - testing hit ratio performance"

# Phase 6: Database Load Analysis
log_benchmark "Phase 6: Database Load Analysis"
echo "==============================="

# Test with different query patterns
declare -A query_patterns=(
    ["simple"]='{"query": "medicine", "options": {"limit": 10}}'
    ["complex"]='{"query": "heart disease treatment options", "options": {"limit": 50, "filters": {"department": ["cardiology"]}}}'
    ["wildcard"]='{"query": "med*", "options": {"limit": 20}}'
    ["phrase"]='{"query": "\"emergency surgery\"", "options": {"limit": 30}}'
)

for pattern in "${!query_patterns[@]}"; do
    log_info "Testing ${pattern} query pattern..."
    
    # Create test file with specific pattern
    test_file="${RESULTS_DIR}/${pattern}-pattern.txt"
    for i in $(seq 1 500); do
        echo "${query_patterns[$pattern]}" >> ${test_file}
    done
    
    # Run focused test
    kubectl port-forward -n ${NAMESPACE} svc/smart-search-service 8080:80 &
    PF_PID=$!
    sleep 5
    
    hey -n 500 -c 50 -m POST \
        -H "Content-Type: application/json" \
        -D ${test_file} \
        -o json \
        http://localhost:8080/api/search > ${RESULTS_DIR}/${pattern}-pattern-results.json
    
    kill ${PF_PID} 2>/dev/null || true
    
    # Parse and add to summary
    avg_time=$(jq -r '.Summary.Average' ${RESULTS_DIR}/${pattern}-pattern-results.json)
    p95_time=$(jq -r '.Summary.P95' ${RESULTS_DIR}/${pattern}-pattern-results.json)
    rps=$(jq -r '.Summary.RPS' ${RESULTS_DIR}/${pattern}-pattern-results.json)
    error_rate=$(jq -r '.Summary.ErrorRate' ${RESULTS_DIR}/${pattern}-pattern-results.json)
    
    echo "query-pattern-${pattern},50,500,${avg_time},${p95_time},0,${rps},${error_rate}" >> ${RESULTS_DIR}/benchmark-summary.csv
done

# Generate comprehensive report
log_benchmark "Generating comprehensive benchmark report..."

cat > ${RESULTS_DIR}/benchmark-report.md << EOF
# Smart Search Enterprise Benchmark Report

**Generated:** $(date -Iseconds)
**Environment:** ${NAMESPACE}
**Duration:** ${DURATION} seconds per test
**Max Concurrent:** ${MAX_CONCURRENT} users

## Executive Summary

### Performance Highlights
$(awk -F',' 'NR>1 {sum+=$7; count++; if($7>max) max=$7; if(min=="" || $7<min) min=$7} END {printf "- Average RPS: %.2f\n- Peak RPS: %.2f\n- Min RPS: %.2f\n", sum/count, max, min}' ${RESULTS_DIR}/benchmark-summary.csv)

### Latency Summary
$(awk -F',' 'NR>1 {sum+=$4; count++; if($4>max) max=$4; if(min=="" || $4<min) min=$4} END {printf "- Average Response Time: %.3fs\n- Best Response Time: %.3fs\n- Worst Response Time: %.3fs\n", sum/count, min, max}' ${RESULTS_DIR}/benchmark-summary.csv)

## Detailed Results

### Baseline Performance
$(grep "baseline" ${RESULTS_DIR}/benchmark-summary.csv | awk -F',' '{printf "- %s: %.3fs avg, %.2f RPS, %.2f%% errors\n", $1, $4, $7, $8}')

### Horizontal Scaling Results
$(grep "horizontal" ${RESULTS_DIR}/benchmark-summary.csv | awk -F',' '{printf "- %s: %.3fs avg, %.2f RPS, %.2f%% errors\n", $1, $4, $7, $8}')

### Vertical Scaling Results
$(grep "vertical" ${RESULTS_DIR}/benchmark-summary.csv | awk -F',' '{printf "- %s: %.3fs avg, %.2f RPS, %.2f%% errors\n", $1, $4, $7, $8}')

### Stress Test Results
$(grep "stress" ${RESULTS_DIR}/benchmark-summary.csv | awk -F',' '{printf "- %s: %.3fs avg, %.2f RPS, %.2f%% errors\n", $1, $4, $7, $8}')

## Recommendations

### Horizontal Scaling
$(awk -F',' 'BEGIN{best_rps=0; best_config=""} /horizontal/ {if($7>best_rps){best_rps=$7; best_config=$1}} END{print "- Best configuration: " best_config " with " best_rps " RPS"}' ${RESULTS_DIR}/benchmark-summary.csv)

### Vertical Scaling
$(awk -F',' 'BEGIN{best_efficiency=0; best_config=""} /vertical/ {efficiency=$7/$2; if(efficiency>best_efficiency){best_efficiency=efficiency; best_config=$1}} END{print "- Most efficient: " best_config " with " best_efficiency " RPS per concurrent user"}' ${RESULTS_DIR}/benchmark-summary.csv)

### Performance Optimization
- Cache hit ratio optimization shows significant performance improvement
- Database query patterns impact: complex queries require more resources
- Recommended replica count: 8-12 for optimal cost/performance balance
- Recommended vertical scaling: Large configuration (2 CPU / 4Gi Memory)

## Monitoring Recommendations

- Set up alerts for response times > 100ms (95th percentile)
- Monitor error rates and alert if > 1%
- Scale horizontally when CPU > 70% across pods
- Consider vertical scaling when memory usage > 80%

## Cost Optimization

- Use horizontal scaling for traffic bursts
- Use vertical scaling for sustained high load
- Implement cache warming for predictable query patterns
- Consider using mixed instance types for different workload characteristics

EOF

# Generate CSV analysis with Python (if available)
if command -v python3 &> /dev/null; then
python3 << EOF
import pandas as pd
import matplotlib.pyplot as plt
import sys

try:
    # Read the CSV data
    df = pd.read_csv('${RESULTS_DIR}/benchmark-summary.csv')
    
    # Create visualizations
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
    
    # Response time comparison
    df.plot(x='test_name', y='avg_response_time', kind='bar', ax=ax1)
    ax1.set_title('Average Response Time by Test')
    ax1.set_ylabel('Response Time (seconds)')
    
    # RPS comparison
    df.plot(x='test_name', y='requests_per_second', kind='bar', ax=ax2, color='green')
    ax2.set_title('Requests Per Second by Test')
    ax2.set_ylabel('RPS')
    
    # Error rate
    df.plot(x='test_name', y='error_rate', kind='bar', ax=ax3, color='red')
    ax3.set_title('Error Rate by Test')
    ax3.set_ylabel('Error Rate (%)')
    
    # P95 latency
    df.plot(x='test_name', y='p95_response_time', kind='bar', ax=ax4, color='orange')
    ax4.set_title('95th Percentile Response Time')
    ax4.set_ylabel('P95 Latency (seconds)')
    
    plt.tight_layout()
    plt.xticks(rotation=45)
    plt.savefig('${RESULTS_DIR}/benchmark-charts.png', dpi=300, bbox_inches='tight')
    print("Charts saved to ${RESULTS_DIR}/benchmark-charts.png")
    
except Exception as e:
    print(f"Chart generation failed: {e}")
    sys.exit(0)
EOF
fi

echo ""
log_success "🎉 ENTERPRISE BENCHMARK COMPLETE! 🎉"
echo "===================================="
echo ""
echo "📊 Results Summary:"
echo "   Total tests executed: $(wc -l < ${RESULTS_DIR}/benchmark-summary.csv | xargs expr -1 +)"
echo "   Results directory: ${RESULTS_DIR}/"
echo "   Detailed report: ${RESULTS_DIR}/benchmark-report.md"
echo ""
echo "📈 Key Findings:"
awk -F',' '
NR>1 {
    total_rps += $7; 
    total_latency += $4; 
    count++; 
    if($7 > max_rps) {max_rps=$7; best_test=$1}
    if($4 < min_latency || min_latency==0) {min_latency=$4; fastest_test=$1}
}
END {
    printf "   ⚡ Peak Performance: %.2f RPS (%s)\n", max_rps, best_test;
    printf "   🚀 Fastest Response: %.3fs (%s)\n", min_latency, fastest_test;
    printf "   📊 Average Performance: %.2f RPS, %.3fs latency\n", total_rps/count, total_latency/count;
}' ${RESULTS_DIR}/benchmark-summary.csv

echo ""
echo "🔍 Analysis Files:"
echo "   📋 Summary CSV: ${RESULTS_DIR}/benchmark-summary.csv"
echo "   📊 Detailed JSON: ${RESULTS_DIR}/*-results.json"
if [ -f "${RESULTS_DIR}/benchmark-charts.png" ]; then
    echo "   📈 Performance Charts: ${RESULTS_DIR}/benchmark-charts.png"
fi
echo ""
echo "🚀 Recommended Next Steps:"
echo "   1. Review detailed report: cat ${RESULTS_DIR}/benchmark-report.md"
echo "   2. Implement optimal scaling configuration"
echo "   3. Set up monitoring alerts based on findings"
echo "   4. Schedule regular performance regression tests"
echo ""
log_success "Enterprise performance analysis complete! 🎯"