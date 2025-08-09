#!/bin/bash

# Smart Search - Enterprise Security Audit & Compliance Assessment
# Comprehensive security scanning and HIPAA/GDPR compliance validation

set -e

echo "🔒 SMART SEARCH - ENTERPRISE SECURITY AUDIT"
echo "==========================================="
echo "Conducting comprehensive security assessment..."
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
COMPLIANCE_TYPE=${2:-hipaa}

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_security() { echo -e "${PURPLE}🔒 $1${NC}"; }
log_audit() { echo -e "${CYAN}🔍 $1${NC}"; }

# Security scores tracking
SECURITY_SCORE=0
MAX_SCORE=0
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0

# Create audit results directory
AUDIT_DIR="security-audit-$(date +%Y%m%d-%H%M%S)"
mkdir -p ${AUDIT_DIR}

log_info "Security audit results will be saved to: ${AUDIT_DIR}"

# Helper function to add score
add_score() {
    local points=$1
    local max_points=$2
    SECURITY_SCORE=$((SECURITY_SCORE + points))
    MAX_SCORE=$((MAX_SCORE + max_points))
}

# Helper function to record issue
record_issue() {
    local severity=$1
    local component=$2
    local description=$3
    local remediation=$4
    
    case $severity in
        "CRITICAL")
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            ;;
        "HIGH")
            HIGH_ISSUES=$((HIGH_ISSUES + 1))
            ;;
        "MEDIUM")
            MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
            ;;
        "LOW")
            LOW_ISSUES=$((LOW_ISSUES + 1))
            ;;
    esac
    
    echo "${severity},${component},${description},${remediation}" >> ${AUDIT_DIR}/security-issues.csv
}

# Initialize issues file
echo "severity,component,description,remediation" > ${AUDIT_DIR}/security-issues.csv

log_security "Starting comprehensive security audit..."

# Section 1: Kubernetes Security Assessment
log_audit "Section 1: Kubernetes Security Configuration"
echo "============================================="

# Check RBAC configuration
log_info "Auditing RBAC policies..."
if kubectl auth can-i create pods --as=system:serviceaccount:${NAMESPACE}:default -n ${NAMESPACE} 2>/dev/null; then
    log_warning "Default service account has excessive permissions"
    record_issue "HIGH" "RBAC" "Default service account can create pods" "Use dedicated service accounts with minimal permissions"
    add_score 0 10
else
    log_success "RBAC properly configured"
    add_score 10 10
fi

# Check network policies
log_info "Auditing network policies..."
NETWORK_POLICIES=$(kubectl get networkpolicies -n ${NAMESPACE} --no-headers | wc -l)
if [ ${NETWORK_POLICIES} -eq 0 ]; then
    log_warning "No network policies found"
    record_issue "HIGH" "Network Security" "No network policies configured" "Implement network policies to restrict pod-to-pod communication"
    add_score 0 15
else
    log_success "Network policies configured (${NETWORK_POLICIES} policies)"
    add_score 15 15
fi

# Check pod security standards
log_info "Auditing pod security configuration..."
SECURITY_CONTEXT_PODS=$(kubectl get pods -n ${NAMESPACE} -o json | jq '.items[] | select(.spec.securityContext.runAsNonRoot == true) | .metadata.name' | wc -l)
TOTAL_PODS=$(kubectl get pods -n ${NAMESPACE} --no-headers | wc -l)

if [ ${SECURITY_CONTEXT_PODS} -eq ${TOTAL_PODS} ] && [ ${TOTAL_PODS} -gt 0 ]; then
    log_success "All pods run as non-root users"
    add_score 15 15
elif [ ${SECURITY_CONTEXT_PODS} -gt 0 ]; then
    log_warning "Some pods run as root users"
    record_issue "MEDIUM" "Pod Security" "Some pods run as root" "Configure securityContext.runAsNonRoot: true for all pods"
    add_score 10 15
else
    log_error "No pods configured with security context"
    record_issue "HIGH" "Pod Security" "Pods running as root users" "Configure securityContext with runAsNonRoot: true and appropriate user ID"
    add_score 0 15
fi

# Check for privileged containers
log_info "Checking for privileged containers..."
PRIVILEGED_PODS=$(kubectl get pods -n ${NAMESPACE} -o json | jq '.items[] | select(.spec.containers[]?.securityContext.privileged == true) | .metadata.name' 2>/dev/null | wc -l)
if [ ${PRIVILEGED_PODS} -gt 0 ]; then
    log_error "Found ${PRIVILEGED_PODS} privileged containers"
    record_issue "CRITICAL" "Container Security" "Privileged containers detected" "Remove privileged: true from container security contexts"
    add_score 0 20
else
    log_success "No privileged containers found"
    add_score 20 20
fi

# Section 2: Secrets and Configuration Security
log_audit "Section 2: Secrets and Configuration Security"
echo "============================================="

# Check secret encryption at rest
log_info "Auditing secret encryption..."
if kubectl get secret -n ${NAMESPACE} smart-search-secrets -o yaml | grep -q "type: Opaque"; then
    log_success "Secrets properly configured"
    add_score 10 10
else
    log_warning "Smart Search secrets not found or misconfigured"
    record_issue "HIGH" "Secrets Management" "Missing or misconfigured secrets" "Ensure all sensitive data is stored in Kubernetes secrets"
    add_score 5 10
fi

# Check for hardcoded credentials
log_info "Scanning for hardcoded credentials..."
HARDCODED_SECRETS=0

# Check deployments for hardcoded values
if kubectl get deployment -n ${NAMESPACE} -o yaml | grep -i -E "(password|secret|key|token)" | grep -v "secretKeyRef" | grep -v "configMapKeyRef"; then
    log_warning "Potential hardcoded credentials found in deployments"
    record_issue "HIGH" "Credential Management" "Hardcoded credentials in deployment configs" "Use secretKeyRef for all sensitive environment variables"
    add_score 0 15
    HARDCODED_SECRETS=1
fi

# Check configmaps for sensitive data
if kubectl get configmap -n ${NAMESPACE} -o yaml | grep -i -E "(password|secret|key|token|credential)"; then
    log_warning "Sensitive data found in ConfigMaps"
    record_issue "HIGH" "Credential Management" "Sensitive data stored in ConfigMaps" "Move sensitive data to Secrets with appropriate access controls"
    add_score 0 15
    HARDCODED_SECRETS=1
fi

if [ ${HARDCODED_SECRETS} -eq 0 ]; then
    log_success "No hardcoded credentials detected"
    add_score 15 15
fi

# Section 3: Network Security Assessment
log_audit "Section 3: Network Security Assessment"
echo "======================================"

# Check service types
log_info "Auditing service exposure..."
NODEPORT_SERVICES=$(kubectl get svc -n ${NAMESPACE} --no-headers | grep NodePort | wc -l)
LOADBALANCER_SERVICES=$(kubectl get svc -n ${NAMESPACE} --no-headers | grep LoadBalancer | wc -l)

if [ ${NODEPORT_SERVICES} -gt 0 ] || [ ${LOADBALANCER_SERVICES} -gt 0 ]; then
    log_warning "Services directly exposed (${NODEPORT_SERVICES} NodePort, ${LOADBALANCER_SERVICES} LoadBalancer)"
    record_issue "MEDIUM" "Network Exposure" "Direct service exposure detected" "Use Ingress controllers instead of NodePort/LoadBalancer for better security control"
    add_score 5 10
else
    log_success "Services properly exposed through ingress"
    add_score 10 10
fi

# Check TLS configuration
log_info "Auditing TLS configuration..."
TLS_INGRESSES=$(kubectl get ingress -n ${NAMESPACE} -o json | jq '.items[] | select(.spec.tls) | .metadata.name' | wc -l)
TOTAL_INGRESSES=$(kubectl get ingress -n ${NAMESPACE} --no-headers | wc -l)

if [ ${TLS_INGRESSES} -eq ${TOTAL_INGRESSES} ] && [ ${TOTAL_INGRESSES} -gt 0 ]; then
    log_success "All ingresses configured with TLS"
    add_score 15 15
elif [ ${TLS_INGRESSES} -gt 0 ]; then
    log_warning "Some ingresses without TLS configuration"
    record_issue "MEDIUM" "TLS Configuration" "Unencrypted ingress endpoints" "Configure TLS certificates for all ingress endpoints"
    add_score 10 15
else
    log_warning "No TLS configuration found"
    record_issue "HIGH" "TLS Configuration" "No TLS encryption configured" "Implement TLS certificates for all external endpoints"
    add_score 0 15
fi

# Section 4: Application Security Assessment
log_audit "Section 4: Application Security Assessment"
echo "=========================================="

# Check for security headers (if application is accessible)
log_info "Testing security headers..."
if kubectl get svc smart-search-service -n ${NAMESPACE} &>/dev/null; then
    kubectl port-forward -n ${NAMESPACE} svc/smart-search-service 8080:80 &
    PF_PID=$!
    sleep 5
    
    HEADERS_RESPONSE=$(curl -s -I http://localhost:8080/health 2>/dev/null || echo "")
    
    # Check for security headers
    SECURITY_HEADERS=0
    
    if echo "${HEADERS_RESPONSE}" | grep -qi "x-frame-options"; then
        SECURITY_HEADERS=$((SECURITY_HEADERS + 1))
    fi
    
    if echo "${HEADERS_RESPONSE}" | grep -qi "x-content-type-options"; then
        SECURITY_HEADERS=$((SECURITY_HEADERS + 1))
    fi
    
    if echo "${HEADERS_RESPONSE}" | grep -qi "strict-transport-security"; then
        SECURITY_HEADERS=$((SECURITY_HEADERS + 1))
    fi
    
    if echo "${HEADERS_RESPONSE}" | grep -qi "content-security-policy"; then
        SECURITY_HEADERS=$((SECURITY_HEADERS + 1))
    fi
    
    kill ${PF_PID} 2>/dev/null || true
    
    if [ ${SECURITY_HEADERS} -ge 3 ]; then
        log_success "Security headers properly configured (${SECURITY_HEADERS}/4)"
        add_score 10 10
    elif [ ${SECURITY_HEADERS} -gt 0 ]; then
        log_warning "Some security headers missing (${SECURITY_HEADERS}/4)"
        record_issue "MEDIUM" "HTTP Security" "Missing security headers" "Implement X-Frame-Options, X-Content-Type-Options, HSTS, and CSP headers"
        add_score 5 10
    else
        log_warning "No security headers configured"
        record_issue "MEDIUM" "HTTP Security" "No security headers configured" "Implement comprehensive HTTP security headers"
        add_score 0 10
    fi
else
    log_warning "Cannot test application security headers - service not accessible"
    add_score 5 10
fi

# Section 5: Data Protection Assessment
log_audit "Section 5: Data Protection and Privacy"
echo "======================================"

# Check for data governance configuration
log_info "Auditing data governance configuration..."
DATA_GOVERNANCE_CONFIGURED=0

if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "governance"; then
    log_success "Data governance configuration found"
    DATA_GOVERNANCE_CONFIGURED=1
    add_score 15 15
else
    log_warning "No data governance configuration found"
    record_issue "HIGH" "Data Protection" "Data governance not configured" "Implement field masking, audit logging, and compliance features"
    add_score 0 15
fi

# Check audit logging
log_info "Auditing audit logging configuration..."
if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "auditLogging"; then
    AUDIT_ENABLED=$(kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -A 5 "auditLogging" | grep "enabled.*true" | wc -l)
    if [ ${AUDIT_ENABLED} -gt 0 ]; then
        log_success "Audit logging enabled"
        add_score 15 15
    else
        log_warning "Audit logging configured but not enabled"
        record_issue "HIGH" "Audit Logging" "Audit logging disabled" "Enable comprehensive audit logging for compliance"
        add_score 5 15
    fi
else
    log_warning "No audit logging configuration found"
    record_issue "HIGH" "Audit Logging" "No audit logging configured" "Implement comprehensive audit logging"
    add_score 0 15
fi

# Section 6: Compliance Assessment
log_audit "Section 6: Compliance Assessment (${COMPLIANCE_TYPE^^})"
echo "========================================================"

case ${COMPLIANCE_TYPE} in
    "hipaa")
        log_info "Conducting HIPAA compliance assessment..."
        
        # Check data classification
        if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "dataClassification"; then
            log_success "Data classification configured"
            add_score 10 10
        else
            log_warning "No data classification found"
            record_issue "CRITICAL" "HIPAA Compliance" "PHI data not classified" "Implement data classification for PHI identification"
            add_score 0 10
        fi
        
        # Check field masking
        if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "fieldMasking"; then
            log_success "Field masking configured"
            add_score 10 10
        else
            log_error "No field masking configured"
            record_issue "CRITICAL" "HIPAA Compliance" "PHI data not masked" "Implement field masking for SSN, medical records, etc."
            add_score 0 10
        fi
        
        # Check encryption
        if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "encryptionAtRest"; then
            log_success "Encryption at rest configured"
            add_score 10 10
        else
            log_warning "Encryption at rest not configured"
            record_issue "HIGH" "HIPAA Compliance" "PHI data not encrypted at rest" "Enable encryption at rest for all PHI storage"
            add_score 5 10
        fi
        ;;
        
    "gdpr")
        log_info "Conducting GDPR compliance assessment..."
        
        # Check right to be forgotten implementation
        log_warning "Manual verification required for GDPR 'right to be forgotten'"
        record_issue "MEDIUM" "GDPR Compliance" "Right to be forgotten implementation needs verification" "Verify data deletion procedures are implemented"
        add_score 5 10
        
        # Check consent management
        log_warning "Manual verification required for consent management"
        record_issue "MEDIUM" "GDPR Compliance" "Consent management needs verification" "Verify consent tracking and management systems"
        add_score 5 10
        ;;
        
    *)
        log_info "General compliance assessment..."
        add_score 20 20
        ;;
esac

# Section 7: Infrastructure Security
log_audit "Section 7: Infrastructure Security"
echo "=================================="

# Check resource limits
log_info "Auditing resource limits..."
PODS_WITH_LIMITS=$(kubectl get pods -n ${NAMESPACE} -o json | jq '.items[] | select(.spec.containers[].resources.limits) | .metadata.name' | wc -l)
TOTAL_PODS=$(kubectl get pods -n ${NAMESPACE} --no-headers | wc -l)

if [ ${PODS_WITH_LIMITS} -eq ${TOTAL_PODS} ] && [ ${TOTAL_PODS} -gt 0 ]; then
    log_success "All pods have resource limits configured"
    add_score 10 10
else
    log_warning "Some pods without resource limits (DoS risk)"
    record_issue "MEDIUM" "Resource Security" "Pods without resource limits" "Configure CPU and memory limits for all containers"
    add_score 5 10
fi

# Check pod disruption budgets
log_info "Auditing availability protections..."
PDB_COUNT=$(kubectl get pdb -n ${NAMESPACE} --no-headers | wc -l)
if [ ${PDB_COUNT} -gt 0 ]; then
    log_success "Pod Disruption Budgets configured"
    add_score 5 5
else
    log_warning "No Pod Disruption Budgets configured"
    record_issue "LOW" "Availability" "No PDB configured" "Configure Pod Disruption Budgets for high availability"
    add_score 0 5
fi

# Section 8: Container Security
log_audit "Section 8: Container Security"
echo "============================="

# Check for latest/mutable tags
log_info "Auditing container image tags..."
MUTABLE_TAGS=$(kubectl get deploy -n ${NAMESPACE} -o json | jq '.items[].spec.template.spec.containers[].image' | grep -E ":latest|:master|:main|:develop" | wc -l)
if [ ${MUTABLE_TAGS} -gt 0 ]; then
    log_warning "Mutable image tags detected (${MUTABLE_TAGS} images)"
    record_issue "MEDIUM" "Container Security" "Mutable image tags used" "Use specific version tags instead of latest/mutable tags"
    add_score 5 10
else
    log_success "All images use immutable tags"
    add_score 10 10
fi

# Check for image vulnerability scanning (if trivy is available)
log_info "Checking for image vulnerability scanning..."
if command -v trivy &> /dev/null; then
    # Get first image for scanning
    IMAGE=$(kubectl get deploy -n ${NAMESPACE} -o json | jq -r '.items[0].spec.template.spec.containers[0].image' 2>/dev/null || echo "")
    
    if [ -n "${IMAGE}" ]; then
        log_info "Scanning ${IMAGE} for vulnerabilities..."
        CRITICAL_VULNS=$(trivy image --severity CRITICAL --format json ${IMAGE} 2>/dev/null | jq '.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID' | wc -l || echo "0")
        
        if [ ${CRITICAL_VULNS} -eq 0 ]; then
            log_success "No critical vulnerabilities found"
            add_score 10 10
        else
            log_error "${CRITICAL_VULNS} critical vulnerabilities found"
            record_issue "CRITICAL" "Container Security" "${CRITICAL_VULNS} critical vulnerabilities in container images" "Update base images and dependencies to fix critical vulnerabilities"
            add_score 0 10
        fi
    else
        log_warning "Cannot retrieve container image for scanning"
        add_score 5 10
    fi
else
    log_warning "Trivy not available for vulnerability scanning"
    add_score 5 10
fi

# Generate comprehensive security report
log_security "Generating security audit report..."

FINAL_SCORE=$(echo "scale=2; ${SECURITY_SCORE} * 100 / ${MAX_SCORE}" | bc)
TOTAL_ISSUES=$((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES))

# Determine security grade
if (( $(echo "${FINAL_SCORE} >= 90" | bc -l) )); then
    SECURITY_GRADE="A"
    GRADE_COLOR=${GREEN}
elif (( $(echo "${FINAL_SCORE} >= 80" | bc -l) )); then
    SECURITY_GRADE="B"
    GRADE_COLOR=${YELLOW}
elif (( $(echo "${FINAL_SCORE} >= 70" | bc -l) )); then
    SECURITY_GRADE="C"
    GRADE_COLOR=${YELLOW}
elif (( $(echo "${FINAL_SCORE} >= 60" | bc -l) )); then
    SECURITY_GRADE="D"
    GRADE_COLOR=${RED}
else
    SECURITY_GRADE="F"
    GRADE_COLOR=${RED}
fi

cat > ${AUDIT_DIR}/security-report.md << EOF
# Smart Search Enterprise Security Audit Report

**Generated:** $(date -Iseconds)
**Namespace:** ${NAMESPACE}
**Compliance Standard:** ${COMPLIANCE_TYPE^^}
**Security Score:** ${FINAL_SCORE}% (Grade: ${SECURITY_GRADE})

## Executive Summary

### Security Score Breakdown
- **Overall Score:** ${FINAL_SCORE}/100 (Grade ${SECURITY_GRADE})
- **Total Issues Found:** ${TOTAL_ISSUES}
- **Critical Issues:** ${CRITICAL_ISSUES}
- **High Priority Issues:** ${HIGH_ISSUES}
- **Medium Priority Issues:** ${MEDIUM_ISSUES}
- **Low Priority Issues:** ${LOW_ISSUES}

### Risk Assessment
$(if [ ${CRITICAL_ISSUES} -gt 0 ]; then echo "🚨 **CRITICAL RISK**: ${CRITICAL_ISSUES} critical security issues require immediate attention"; fi)
$(if [ ${HIGH_ISSUES} -gt 5 ]; then echo "⚠️ **HIGH RISK**: ${HIGH_ISSUES} high-priority issues need urgent remediation"; fi)
$(if [ ${CRITICAL_ISSUES} -eq 0 ] && [ ${HIGH_ISSUES} -le 2 ]; then echo "✅ **ACCEPTABLE RISK**: Security posture is within acceptable parameters"; fi)

## Detailed Findings

### Critical Issues (Immediate Action Required)
$(awk -F',' '$1=="CRITICAL" {print "- **" $2 "**: " $3 " - *" $4 "*"}' ${AUDIT_DIR}/security-issues.csv)

### High Priority Issues (Urgent Attention)
$(awk -F',' '$1=="HIGH" {print "- **" $2 "**: " $3 " - *" $4 "*"}' ${AUDIT_DIR}/security-issues.csv)

### Medium Priority Issues (Address Soon)
$(awk -F',' '$1=="MEDIUM" {print "- **" $2 "**: " $3 " - *" $4 "*"}' ${AUDIT_DIR}/security-issues.csv)

### Low Priority Issues (Future Improvement)
$(awk -F',' '$1=="LOW" {print "- **" $2 "**: " $3 " - *" $4 "*"}' ${AUDIT_DIR}/security-issues.csv)

## Compliance Assessment (${COMPLIANCE_TYPE^^})

$(if [ "${COMPLIANCE_TYPE}" = "hipaa" ]; then
cat << 'EOC'
### HIPAA Compliance Status
- **Data Classification**: $(if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "dataClassification"; then echo "✅ Configured"; else echo "❌ Missing"; fi)
- **Field Masking**: $(if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "fieldMasking"; then echo "✅ Implemented"; else echo "❌ Not Implemented"; fi)
- **Audit Logging**: $(if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "auditLogging"; then echo "✅ Enabled"; else echo "❌ Disabled"; fi)
- **Encryption at Rest**: $(if kubectl get configmap smart-search-config -n ${NAMESPACE} -o yaml | grep -q "encryptionAtRest"; then echo "✅ Enabled"; else echo "❌ Disabled"; fi)
- **Access Controls**: $(if [ ${NETWORK_POLICIES} -gt 0 ]; then echo "✅ Network policies configured"; else echo "❌ No network policies"; fi)
EOC
fi)

## Security Scorecard by Category

| Category | Score | Status |
|----------|--------|--------|
| Kubernetes Security | $(echo "scale=0; $(kubectl get networkpolicies -n ${NAMESPACE} --no-headers | wc -l) * 10" | bc)/15 | $(if [ $(kubectl get networkpolicies -n ${NAMESPACE} --no-headers | wc -l) -gt 0 ]; then echo "✅"; else echo "❌"; fi) |
| Network Security | $(if [ ${TLS_INGRESSES} -gt 0 ]; then echo "15"; else echo "5"; fi)/15 | $(if [ ${TLS_INGRESSES} -gt 0 ]; then echo "✅"; else echo "❌"; fi) |
| Data Protection | $(if [ ${DATA_GOVERNANCE_CONFIGURED} -eq 1 ]; then echo "30"; else echo "5"; fi)/30 | $(if [ ${DATA_GOVERNANCE_CONFIGURED} -eq 1 ]; then echo "✅"; else echo "❌"; fi) |
| Container Security | $(if [ ${MUTABLE_TAGS} -eq 0 ]; then echo "20"; else echo "10"; fi)/20 | $(if [ ${MUTABLE_TAGS} -eq 0 ]; then echo "✅"; else echo "⚠️"; fi) |
| Infrastructure Security | $(if [ ${PODS_WITH_LIMITS} -eq ${TOTAL_PODS} ]; then echo "15"; else echo "5"; fi)/15 | $(if [ ${PODS_WITH_LIMITS} -eq ${TOTAL_PODS} ]; then echo "✅"; else echo "❌"; fi) |

## Remediation Roadmap

### Phase 1: Critical Issues (Immediate - 0-7 days)
$(awk -F',' '$1=="CRITICAL" {print "1. Fix " $2 ": " $4}' ${AUDIT_DIR}/security-issues.csv | nl -w2 -s'. ')

### Phase 2: High Priority Issues (Urgent - 1-4 weeks)
$(awk -F',' '$1=="HIGH" {print "1. Address " $2 ": " $4}' ${AUDIT_DIR}/security-issues.csv | nl -w2 -s'. ')

### Phase 3: Medium Priority Issues (1-3 months)
$(awk -F',' '$1=="MEDIUM" {print "1. Improve " $2 ": " $4}' ${AUDIT_DIR}/security-issues.csv | nl -w2 -s'. ')

### Phase 4: Low Priority Issues (3-6 months)
$(awk -F',' '$1=="LOW" {print "1. Enhance " $2 ": " $4}' ${AUDIT_DIR}/security-issues.csv | nl -w2 -s'. ')

## Security Best Practices Recommendations

### Immediate Actions
- Implement network policies to restrict pod-to-pod communication
- Configure TLS certificates for all external endpoints
- Enable comprehensive audit logging
- Set up vulnerability scanning in CI/CD pipeline

### Long-term Security Strategy
- Implement security scanning in development pipeline
- Regular security training for development team
- Establish incident response procedures
- Set up security monitoring and alerting

### Monitoring and Maintenance
- Schedule monthly security assessments
- Implement continuous vulnerability monitoring
- Regular review of access controls and permissions
- Maintain compliance documentation and evidence

## Conclusion

$(if [ ${CRITICAL_ISSUES} -eq 0 ] && [ ${HIGH_ISSUES} -le 2 ]; then
    echo "The Smart Search deployment demonstrates a strong security posture with minimal critical issues. Continue monitoring and addressing medium and low priority items to maintain security excellence."
else
    echo "The Smart Search deployment requires immediate attention to address ${CRITICAL_ISSUES} critical and ${HIGH_ISSUES} high-priority security issues before production use."
fi)

**Next Security Assessment Recommended:** $(date -d "+30 days" +%Y-%m-%d)

---
*This report was generated by Smart Search Enterprise Security Audit Tool*
*For questions or remediation assistance, contact the security team*
EOF

# Create CSV summary for easy analysis
cat > ${AUDIT_DIR}/security-summary.csv << EOF
category,max_score,achieved_score,percentage,grade
Kubernetes Security,35,$(echo "35 - ${CRITICAL_ISSUES} * 10 - ${HIGH_ISSUES} * 5" | bc),$(echo "scale=2; (35 - ${CRITICAL_ISSUES} * 10 - ${HIGH_ISSUES} * 5) * 100 / 35" | bc),$(if [ ${CRITICAL_ISSUES} -eq 0 ] && [ ${HIGH_ISSUES} -le 1 ]; then echo "A"; else echo "C"; fi)
Network Security,25,$(echo "${TLS_INGRESSES} * 15 + 10" | bc),$(echo "scale=2; (${TLS_INGRESSES} * 15 + 10) * 100 / 25" | bc),$(if [ ${TLS_INGRESSES} -gt 0 ]; then echo "A"; else echo "D"; fi)
Data Protection,30,$(if [ ${DATA_GOVERNANCE_CONFIGURED} -eq 1 ]; then echo "25"; else echo "5"; fi),$(if [ ${DATA_GOVERNANCE_CONFIGURED} -eq 1 ]; then echo "83.33"; else echo "16.67"; fi),$(if [ ${DATA_GOVERNANCE_CONFIGURED} -eq 1 ]; then echo "B"; else echo "F"; fi)
Container Security,20,$(if [ ${MUTABLE_TAGS} -eq 0 ]; then echo "18"; else echo "10"; fi),$(if [ ${MUTABLE_TAGS} -eq 0 ]; then echo "90.00"; else echo "50.00"; fi),$(if [ ${MUTABLE_TAGS} -eq 0 ]; then echo "A"; else echo "C"; fi)
Overall,${MAX_SCORE},${SECURITY_SCORE},${FINAL_SCORE},${SECURITY_GRADE}
EOF

echo ""
echo -e "${GRADE_COLOR}🔒 ENTERPRISE SECURITY AUDIT COMPLETE! 🔒${NC}"
echo "============================================"
echo ""
echo -e "🎯 **SECURITY SCORE:** ${GRADE_COLOR}${FINAL_SCORE}% (Grade ${SECURITY_GRADE})${NC}"
echo ""
echo "📊 Issue Summary:"
echo "   🚨 Critical Issues: ${CRITICAL_ISSUES}"
echo "   ⚠️  High Priority: ${HIGH_ISSUES}"
echo "   📋 Medium Priority: ${MEDIUM_ISSUES}"
echo "   📝 Low Priority: ${LOW_ISSUES}"
echo ""

if [ ${CRITICAL_ISSUES} -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL ALERT: ${CRITICAL_ISSUES} critical security issues require immediate attention!${NC}"
elif [ ${HIGH_ISSUES} -gt 3 ]; then
    echo -e "${YELLOW}⚠️  HIGH RISK: ${HIGH_ISSUES} high-priority issues need urgent remediation${NC}"
else
    echo -e "${GREEN}✅ ACCEPTABLE RISK: Security posture is within acceptable parameters${NC}"
fi

echo ""
echo "📋 Audit Artifacts:"
echo "   📊 Detailed Report: ${AUDIT_DIR}/security-report.md"
echo "   📈 Issues CSV: ${AUDIT_DIR}/security-issues.csv"
echo "   📊 Summary CSV: ${AUDIT_DIR}/security-summary.csv"
echo ""
echo "🚀 Next Steps:"
if [ ${CRITICAL_ISSUES} -gt 0 ]; then
    echo "   1. 🚨 Address CRITICAL issues immediately (see report for details)"
    echo "   2. 📋 Create incident response plan"
    echo "   3. 🔄 Re-run audit after fixes"
else
    echo "   1. 📋 Review and schedule remediation of high/medium priority issues"
    echo "   2. 🔄 Set up automated security scanning"
    echo "   3. 📅 Schedule monthly security assessments"
fi
echo "   4. 📚 Share security report with stakeholders"
echo "   5. 📈 Track security metrics and improvements"
echo ""
log_success "Enterprise security audit complete! 🔐"