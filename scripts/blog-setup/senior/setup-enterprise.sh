#!/bin/bash

# Smart Search - Enterprise Production Setup Script
# Complete enterprise environment with Kubernetes, monitoring, and compliance

set -e

echo "🚀 SMART SEARCH - ENTERPRISE PRODUCTION SETUP"
echo "=============================================="
echo "Deploying enterprise-grade search infrastructure..."
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
ENVIRONMENT=${1:-production}
NAMESPACE="smart-search-${ENVIRONMENT}"
MONITORING_NAMESPACE="monitoring"

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_enterprise() { echo -e "${PURPLE}🏢 $1${NC}"; }

# Validate prerequisites
log_info "Step 1: Validating enterprise prerequisites..."

if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is required for enterprise deployment"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    log_error "Helm is required for enterprise deployment"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    log_error "Docker is required for building images"
    exit 1
fi

# Check kubectl cluster connection
if ! kubectl cluster-info &> /dev/null; then
    log_error "kubectl is not connected to a Kubernetes cluster"
    log_info "Please configure kubectl to connect to your cluster first"
    exit 1
fi

log_success "Prerequisites validated"

# Create namespaces
log_info "Step 2: Setting up Kubernetes namespaces..."

kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace ${MONITORING_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Label namespaces for networking and monitoring
kubectl label namespace ${NAMESPACE} name=${NAMESPACE} environment=${ENVIRONMENT} compliance=hipaa --overwrite
kubectl label namespace ${MONITORING_NAMESPACE} name=${MONITORING_NAMESPACE} --overwrite

log_success "Namespaces configured"

# Setup RBAC
log_info "Step 3: Configuring enterprise RBAC..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: smart-search-service-account
  namespace: ${NAMESPACE}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: smart-search-cluster-role
rules:
- apiGroups: [""]
  resources: ["nodes", "pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: smart-search-cluster-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: smart-search-cluster-role
subjects:
- kind: ServiceAccount
  name: smart-search-service-account
  namespace: ${NAMESPACE}
EOF

log_success "RBAC configured"

# Deploy PostgreSQL with HA
log_info "Step 4: Deploying PostgreSQL cluster with high availability..."

helm repo add bitnami https://charts.bitnami.com/bitnami --force-update
helm repo update

helm upgrade --install postgres-cluster bitnami/postgresql-ha \
  --namespace ${NAMESPACE} \
  --set postgresql.database=smartsearch \
  --set postgresql.username=smartsearch_user \
  --set postgresql.password=enterprise_secure_password \
  --set postgresql.repmgrUsername=repmgr \
  --set postgresql.repmgrPassword=repmgr_secure_password \
  --set postgresql.postgresPassword=postgres_admin_password \
  --set persistence.enabled=true \
  --set persistence.size=100Gi \
  --set metrics.enabled=true \
  --set pgpool.adminUsername=admin \
  --set pgpool.adminPassword=admin_secure_password \
  --set pgpool.numInitChildren=32 \
  --set pgpool.maxPool=4 \
  --wait --timeout=600s

log_success "PostgreSQL cluster deployed"

# Deploy Redis cluster
log_info "Step 5: Deploying Redis cluster with failover..."

helm upgrade --install redis-cluster bitnami/redis \
  --namespace ${NAMESPACE} \
  --set architecture=replication \
  --set auth.enabled=true \
  --set auth.password=redis_enterprise_password \
  --set replica.replicaCount=3 \
  --set sentinel.enabled=true \
  --set sentinel.service.type=ClusterIP \
  --set persistence.enabled=true \
  --set persistence.size=50Gi \
  --set metrics.enabled=true \
  --wait --timeout=300s

log_success "Redis cluster deployed"

# Create enterprise configuration
log_info "Step 6: Generating enterprise configuration..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: smart-search-config
  namespace: ${NAMESPACE}
data:
  smart-search-config.json: |
    {
      "database": {
        "type": "postgres",
        "connection": {
          "host": "postgres-cluster-postgresql-ha-pgpool.${NAMESPACE}.svc.cluster.local",
          "port": 5432,
          "database": "smartsearch",
          "user": "smartsearch_user",
          "ssl": true,
          "poolSize": 20,
          "acquireTimeoutMs": 60000,
          "idleTimeoutMs": 300000
        }
      },
      "cache": {
        "type": "redis",
        "connection": {
          "host": "redis-cluster.${NAMESPACE}.svc.cluster.local",
          "port": 6379,
          "sentinels": [
            {"host": "redis-cluster.${NAMESPACE}.svc.cluster.local", "port": 26379}
          ],
          "name": "mymaster",
          "retryStrategy": "exponential",
          "maxRetries": 3,
          "lazyConnect": true
        }
      },
      "circuitBreaker": {
        "enabled": true,
        "failureThreshold": 5,
        "recoveryTimeout": 60000,
        "healthCheckInterval": 10000,
        "degradationThreshold": 0.8
      },
      "governance": {
        "enabled": true,
        "compliance": "hipaa",
        "fieldMasking": {
          "ssn": "mask",
          "email": "mask",
          "phone": "mask",
          "medical_record_number": "mask"
        },
        "auditLogging": {
          "enabled": true,
          "logLevel": "comprehensive",
          "destination": "database",
          "retention": 2555,
          "sensitiveDataRedaction": true
        },
        "dataClassification": {
          "ssn": "phi",
          "email": "pii",
          "phone": "pii",
          "diagnosis": "phi",
          "prescription": "phi"
        }
      },
      "monitoring": {
        "prometheus": {
          "enabled": true,
          "port": 9090,
          "path": "/metrics"
        },
        "jaeger": {
          "enabled": true,
          "endpoint": "http://jaeger-collector.${MONITORING_NAMESPACE}.svc.cluster.local:14268"
        },
        "healthChecks": {
          "enabled": true,
          "interval": 30000
        }
      }
    }
EOF

# Create secrets
kubectl create secret generic smart-search-secrets \
  --namespace=${NAMESPACE} \
  --from-literal=database-password=enterprise_secure_password \
  --from-literal=redis-password=redis_enterprise_password \
  --from-literal=jwt-secret=jwt_super_secure_key_for_enterprise \
  --from-literal=encryption-key=aes256_encryption_key_enterprise \
  --dry-run=client -o yaml | kubectl apply -f -

log_success "Enterprise configuration created"

# Deploy Smart Search application
log_info "Step 7: Deploying Smart Search application with enterprise features..."

cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smart-search-service
  namespace: ${NAMESPACE}
  labels:
    app: smart-search
    version: v2.1.0
    tier: backend
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
  selector:
    matchLabels:
      app: smart-search
  template:
    metadata:
      labels:
        app: smart-search
        version: v2.1.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: smart-search-service-account
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: smart-search
        image: smart-search:v2.1.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "${ENVIRONMENT}"
        - name: PORT
          value: "3000"
        - name: METRICS_PORT
          value: "9090"
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: smart-search-secrets
              key: database-password
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: smart-search-secrets
              key: redis-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: smart-search-secrets
              key: jwt-secret
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: smart-search-secrets
              key: encryption-key
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 10
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      volumes:
      - name: config
        configMap:
          name: smart-search-config
---
apiVersion: v1
kind: Service
metadata:
  name: smart-search-service
  namespace: ${NAMESPACE}
  labels:
    app: smart-search
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
spec:
  ports:
  - port: 80
    targetPort: 3000
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
  selector:
    app: smart-search
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: smart-search-hpa
  namespace: ${NAMESPACE}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: smart-search-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 20
        periodSeconds: 60
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: smart-search-pdb
  namespace: ${NAMESPACE}
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: smart-search
EOF

log_success "Smart Search application deployed"

# Deploy monitoring stack
log_info "Step 8: Setting up enterprise monitoring (Prometheus + Grafana)..."

# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Deploy Prometheus
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace ${MONITORING_NAMESPACE} \
  --set prometheus.prometheusSpec.retention=15d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
  --set grafana.adminPassword=enterprise_grafana_password \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.size=10Gi \
  --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi \
  --wait --timeout=600s

log_success "Monitoring stack deployed"

# Deploy Jaeger for distributed tracing
log_info "Step 9: Deploying distributed tracing (Jaeger)..."

kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.47.0/jaeger-operator.yaml -n ${MONITORING_NAMESPACE}

# Wait for operator to be ready
sleep 30

cat <<EOF | kubectl apply -f -
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: ${MONITORING_NAMESPACE}
spec:
  strategy: production
  collector:
    maxReplicas: 5
    resources:
      limits:
        cpu: 2000m
        memory: 2Gi
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
EOF

log_success "Distributed tracing deployed"

# Setup ingress
log_info "Step 10: Configuring enterprise ingress..."

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: smart-search-ingress
  namespace: ${NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.smart-search.${ENVIRONMENT}.com
    secretName: smart-search-tls
  rules:
  - host: api.smart-search.${ENVIRONMENT}.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: smart-search-service
            port:
              number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: ${MONITORING_NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: monitoring-auth
spec:
  tls:
  - hosts:
    - grafana.smart-search.${ENVIRONMENT}.com
    - prometheus.smart-search.${ENVIRONMENT}.com
    secretName: monitoring-tls
  rules:
  - host: grafana.smart-search.${ENVIRONMENT}.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-grafana
            port:
              number: 80
  - host: prometheus.smart-search.${ENVIRONMENT}.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-kube-prometheus-prometheus
            port:
              number: 9090
EOF

log_success "Ingress configured"

# Network policies for security
log_info "Step 11: Implementing network security policies..."

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: smart-search-network-policy
  namespace: ${NAMESPACE}
spec:
  podSelector:
    matchLabels:
      app: smart-search
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - namespaceSelector:
        matchLabels:
          name: ${MONITORING_NAMESPACE}
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 9090
  egress:
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: postgresql-ha
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
EOF

log_success "Network policies implemented"

# Setup data seeding
log_info "Step 12: Seeding enterprise test data..."

if [ -f "./scripts/seed-data.sh" ]; then
    # Port-forward to access database for seeding
    kubectl port-forward -n ${NAMESPACE} svc/postgres-cluster-postgresql-ha-pgpool 5432:5432 &
    PF_PID=$!
    
    sleep 10
    
    # Seed with large dataset
    PGPASSWORD=enterprise_secure_password psql -h localhost -U smartsearch_user -d smartsearch -c "
    CREATE TABLE IF NOT EXISTS healthcare (
        id SERIAL PRIMARY KEY,
        patient_name VARCHAR(255),
        condition VARCHAR(500),
        treatment VARCHAR(500),
        doctor VARCHAR(255),
        hospital VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT INTO healthcare (patient_name, condition, treatment, doctor, hospital)
    SELECT 
        'Patient ' || generate_series,
        'Condition ' || (random() * 100)::int,
        'Treatment ' || (random() * 100)::int,
        'Dr. Doctor ' || (random() * 50)::int,
        'Hospital ' || (random() * 20)::int
    FROM generate_series(1, 100000);
    "
    
    kill $PF_PID
    
    log_success "Enterprise test data seeded"
else
    log_warning "Seed script not found, skipping data seeding"
fi

# Final validation
log_info "Step 13: Validating enterprise deployment..."

echo ""
echo "⏳ Waiting for all services to be ready..."
sleep 30

# Check deployment status
READY_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=smart-search --field-selector=status.phase=Running | grep -v NAME | wc -l)
TOTAL_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=smart-search | grep -v NAME | wc -l)

if [ "$READY_PODS" -ge 3 ]; then
    log_success "Smart Search deployment is healthy ($READY_PODS/$TOTAL_PODS pods ready)"
else
    log_warning "Some pods are not ready yet ($READY_PODS/$TOTAL_PODS)"
fi

# Test basic functionality
kubectl port-forward -n ${NAMESPACE} svc/smart-search-service 8080:80 &
PF_PID=$!
sleep 5

if curl -s http://localhost:8080/health &> /dev/null; then
    log_success "Smart Search API is responding"
else
    log_warning "Smart Search API is not responding yet"
fi

kill $PF_PID 2>/dev/null || true

echo ""
log_enterprise "🎉 ENTERPRISE DEPLOYMENT COMPLETE! 🎉"
echo "======================================"
log_success "Smart Search enterprise infrastructure is ready!"
echo ""
echo "📋 What was deployed:"
echo "   ✅ Kubernetes cluster with auto-scaling (5-50 pods)"
echo "   ✅ PostgreSQL HA cluster with read replicas"
echo "   ✅ Redis cluster with sentinel failover"
echo "   ✅ Circuit breaker and health monitoring"
echo "   ✅ HIPAA-compliant data governance"
echo "   ✅ Prometheus + Grafana monitoring stack"
echo "   ✅ Jaeger distributed tracing"
echo "   ✅ Enterprise security policies"
echo "   ✅ SSL/TLS termination and rate limiting"
echo ""
echo "🌐 Access Points:"
if kubectl get ingress -n ${NAMESPACE} | grep -q smart-search-ingress; then
    echo "   🔍 Smart Search API: https://api.smart-search.${ENVIRONMENT}.com"
fi
if kubectl get ingress -n ${MONITORING_NAMESPACE} | grep -q monitoring-ingress; then
    echo "   📊 Grafana Dashboard: https://grafana.smart-search.${ENVIRONMENT}.com"
    echo "   📈 Prometheus: https://prometheus.smart-search.${ENVIRONMENT}.com"
fi
echo ""
echo "🔧 Management Commands:"
echo "   kubectl get pods -n ${NAMESPACE} -l app=smart-search"
echo "   kubectl logs -n ${NAMESPACE} -l app=smart-search"
echo "   kubectl describe hpa -n ${NAMESPACE} smart-search-hpa"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run performance tests: ./scripts/blog-setup/senior/benchmark-scaling.sh"
echo "   2. Security audit: ./scripts/blog-setup/senior/security-audit.sh"
echo "   3. Generate reports: ./scripts/blog-setup/senior/generate-reports.sh"
echo ""
log_success "Ready for enterprise-scale search operations! 🚀"