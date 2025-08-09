#!/bin/bash

# Smart Search - Alibaba Cloud Workbench Integration
# 智能搜索阿里云工作台企业级集成

set -e

echo "☁️ SMART SEARCH - 阿里云企业集成"
echo "=================================="
echo "正在配置阿里云企业级开发环境..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}📋 $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_alibaba() { echo -e "${CYAN}☁️  $1${NC}"; }

# Step 1: Validate Alibaba Cloud environment
log_info "步骤 1: 验证阿里云环境配置..."

if [ -z "$ALIBABA_CLOUD_ACCESS_KEY_ID" ]; then
    log_warning "ALIBABA_CLOUD_ACCESS_KEY_ID 未设置 - 将使用本地开发配置"
fi

if [ -z "$ALIBABA_CLOUD_ACCESS_KEY_SECRET" ]; then
    log_warning "ALIBABA_CLOUD_ACCESS_KEY_SECRET 未设置 - 部分功能将受限"
fi

log_success "阿里云环境验证完成"

# Step 2: Create Alibaba Cloud enterprise configuration
log_info "步骤 2: 创建阿里云企业配置..."

cat > alibaba-cloud.config.json << 'EOF'
{
  "provider": "alibaba-cloud",
  "region": "${ALIBABA_CLOUD_REGION:-cn-hangzhou}",
  "environment": "${ENVIRONMENT:-development}",
  "enterprise": {
    "multiTenant": true,
    "compliance": "china-enterprise",
    "monitoring": "arms",
    "logging": "sls"
  },
  "database": {
    "type": "polardb",
    "cluster": {
      "endpoint": "${POLARDB_ENDPOINT}",
      "port": 3306,
      "database": "smartsearch_enterprise",
      "username": "${POLARDB_USERNAME}",
      "password": "${POLARDB_PASSWORD}",
      "ssl": true,
      "readWriteSplitting": true
    },
    "connectionPool": {
      "min": 10,
      "max": 100,
      "acquireTimeoutMillis": 10000,
      "idleTimeoutMillis": 300000
    },
    "backup": {
      "enabled": true,
      "retention": "30d",
      "crossRegion": true
    }
  },
  "cache": {
    "type": "redis-cluster",
    "cluster": {
      "endpoint": "${REDIS_CLUSTER_ENDPOINT}",
      "port": 6379,
      "password": "${REDIS_PASSWORD}",
      "ssl": true,
      "keyPrefix": "smartsearch:enterprise:",
      "maxMemoryPolicy": "allkeys-lru"
    },
    "highAvailability": {
      "masterSlave": true,
      "sentinelEnabled": true,
      "crossAz": true
    }
  },
  "search": {
    "engine": "opensearch",
    "endpoint": "${OPENSEARCH_ENDPOINT}",
    "indexing": {
      "realTime": true,
      "batchSize": 1000,
      "maxIndexSize": "100GB"
    },
    "analysis": {
      "chinese": {
        "analyzer": "ik_smart",
        "tokenizer": "ik_max_word"
      }
    }
  },
  "storage": {
    "type": "oss",
    "bucket": "${OSS_BUCKET}",
    "endpoint": "${OSS_ENDPOINT}",
    "cdn": {
      "enabled": true,
      "domain": "${CDN_DOMAIN}"
    }
  },
  "monitoring": {
    "arms": {
      "enabled": true,
      "applicationName": "smart-search-enterprise"
    },
    "metrics": [
      "search_latency",
      "cache_hit_ratio", 
      "database_connections",
      "error_rate",
      "business_metrics"
    ],
    "alerts": {
      "dingtalk": "${DINGTALK_WEBHOOK}",
      "email": "${ALERT_EMAIL}",
      "sms": "${ALERT_PHONE}"
    }
  },
  "security": {
    "ram": {
      "enabled": true,
      "policies": ["AliyunOSSFullAccess", "AliyunRDSFullAccess"]
    },
    "kms": {
      "enabled": true,
      "keyId": "${KMS_KEY_ID}"
    },
    "waf": {
      "enabled": true,
      "protection": "enterprise"
    }
  },
  "compliance": {
    "dataResidency": "china",
    "encryption": {
      "atRest": true,
      "inTransit": true,
      "keyRotation": "quarterly"
    },
    "audit": {
      "actiontrail": true,
      "logRetention": "1year"
    }
  }
}
EOF

log_success "阿里云企业配置文件创建完成"

# Step 3: Create Alibaba Cloud enterprise demo
log_info "步骤 3: 创建阿里云企业演示..."

mkdir -p demo/alibaba-cloud
cat > demo/alibaba-cloud/enterprise-demo.js << 'EOF'
const { SmartSearch } = require('@samas/smart-search');
const { AlibabaCloudProvider } = require('@samas/smart-search/alibaba-cloud');

class AlibabaCloudEnterpriseDemo {
  constructor() {
    this.smartSearch = new SmartSearch({
      // PolarDB 配置
      database: {
        type: 'polardb',
        connection: {
          host: process.env.POLARDB_ENDPOINT,
          port: 3306,
          database: 'smartsearch_enterprise',
          username: process.env.POLARDB_USERNAME,
          password: process.env.POLARDB_PASSWORD,
          ssl: true,
          connectionLimit: 100
        }
      },
      
      // Redis 集群配置
      cache: {
        type: 'redis-cluster',
        connection: {
          host: process.env.REDIS_CLUSTER_ENDPOINT,
          port: 6379,
          password: process.env.REDIS_PASSWORD,
          keyPrefix: 'enterprise:',
          lazyConnect: true
        }
      },
      
      // OpenSearch 配置
      search: {
        type: 'opensearch',
        endpoint: process.env.OPENSEARCH_ENDPOINT,
        accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET
      },
      
      // OSS 存储配置
      storage: {
        type: 'oss',
        bucket: process.env.OSS_BUCKET,
        region: process.env.ALIBABA_CLOUD_REGION,
        accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET
      },
      
      // ARMS 监控配置
      monitoring: {
        type: 'arms',
        applicationName: 'smart-search-enterprise',
        region: process.env.ALIBABA_CLOUD_REGION
      }
    });
    
    // 初始化阿里云服务
    this.initializeAlibabaCloudServices();
  }
  
  async initializeAlibabaCloudServices() {
    try {
      console.log('☁️ 初始化阿里云企业服务...');
      
      // 初始化 PolarDB 连接池
      await this.smartSearch.database.connect();
      console.log('✅ PolarDB 数据库连接成功');
      
      // 初始化 Redis 集群
      await this.smartSearch.cache.connect();
      console.log('✅ Redis 集群连接成功');
      
      // 初始化 OpenSearch
      await this.smartSearch.search.ping();
      console.log('✅ OpenSearch 服务连接成功');
      
      // 初始化监控
      await this.initializeARMSMonitoring();
      console.log('✅ ARMS 监控初始化完成');
      
    } catch (error) {
      console.error('❌ 阿里云服务初始化失败:', error.message);
      throw error;
    }
  }
  
  async initializeARMSMonitoring() {
    // 初始化 ARMS 监控指标
    const metrics = [
      'search_requests_total',
      'search_latency_histogram',
      'cache_hit_ratio',
      'database_connections_active',
      'business_conversion_rate'
    ];
    
    for (const metric of metrics) {
      await this.smartSearch.monitoring.createMetric(metric);
    }
    
    // 设置告警规则
    await this.setupEnterpriseAlerts();
  }
  
  async setupEnterpriseAlerts() {
    const alertRules = [
      {
        name: '搜索延迟告警',
        metric: 'search_latency_histogram',
        threshold: 500, // 500ms
        comparison: 'greaterThan',
        notification: {
          dingtalk: process.env.DINGTALK_WEBHOOK,
          email: process.env.ALERT_EMAIL
        }
      },
      {
        name: '缓存命中率告警', 
        metric: 'cache_hit_ratio',
        threshold: 0.8, // 80%
        comparison: 'lessThan',
        notification: {
          dingtalk: process.env.DINGTALK_WEBHOOK
        }
      },
      {
        name: '数据库连接数告警',
        metric: 'database_connections_active',
        threshold: 80, // 80个连接
        comparison: 'greaterThan',
        notification: {
          sms: process.env.ALERT_PHONE,
          email: process.env.ALERT_EMAIL
        }
      }
    ];
    
    for (const rule of alertRules) {
      await this.smartSearch.monitoring.createAlert(rule);
    }
  }
  
  // 企业级搜索示例
  async enterpriseSearch(query, userContext = {}) {
    const startTime = Date.now();
    
    try {
      // 记录搜索请求
      await this.smartSearch.monitoring.incrementCounter('search_requests_total', {
        user_id: userContext.userId,
        tenant_id: userContext.tenantId,
        search_type: 'enterprise'
      });
      
      // 执行多租户安全搜索
      const results = await this.smartSearch.search(query, {
        tenantId: userContext.tenantId,
        userId: userContext.userId,
        securityLevel: 'enterprise',
        dataGovernance: {
          maskSensitiveData: true,
          auditLog: true,
          complianceLevel: 'china-enterprise'
        },
        performance: {
          timeout: 5000,
          cacheFirst: true,
          parallelExecution: true
        }
      });
      
      const duration = Date.now() - startTime;
      
      // 记录性能指标
      await this.smartSearch.monitoring.recordHistogram('search_latency_histogram', duration, {
        cache_hit: results.metadata.source === 'cache',
        result_count: results.data.length
      });
      
      // 记录缓存命中率
      const cacheHit = results.metadata.source === 'cache' ? 1 : 0;
      await this.smartSearch.monitoring.recordGauge('cache_hit_ratio', cacheHit);
      
      return {
        ...results,
        enterpriseMetadata: {
          searchId: `search_${Date.now()}_${userContext.userId}`,
          tenantId: userContext.tenantId,
          complianceLevel: 'china-enterprise',
          dataClassification: 'business-confidential',
          auditTrail: true
        }
      };
      
    } catch (error) {
      // 记录错误指标
      await this.smartSearch.monitoring.incrementCounter('search_errors_total', {
        error_type: error.name,
        tenant_id: userContext.tenantId
      });
      
      console.error('企业搜索失败:', error);
      throw error;
    }
  }
  
  // 业务智能分析
  async getBusinessInsights(tenantId, timeRange = '24h') {
    const insights = await this.smartSearch.analytics.getInsights({
      tenantId,
      timeRange,
      metrics: [
        'search_volume',
        'popular_queries',
        'user_engagement',
        'conversion_rate',
        'performance_trends'
      ]
    });
    
    return {
      ...insights,
      recommendations: await this.generateOptimizationRecommendations(insights)
    };
  }
  
  async generateOptimizationRecommendations(insights) {
    const recommendations = [];
    
    if (insights.cacheHitRatio < 0.8) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: '优化缓存命中率',
        description: '当前缓存命中率偏低，建议增加缓存TTL时间或扩容Redis集群',
        impact: '可提升搜索性能30-50%'
      });
    }
    
    if (insights.averageLatency > 200) {
      recommendations.push({
        type: 'performance',
        priority: 'medium', 
        title: '优化搜索延迟',
        description: '建议优化数据库索引或升级PolarDB实例配置',
        impact: '可降低搜索延迟40-60%'
      });
    }
    
    return recommendations;
  }
}

// 导出企业演示类
module.exports = AlibabaCloudEnterpriseDemo;

// 如果直接运行此文件，启动演示
if (require.main === module) {
  const demo = new AlibabaCloudEnterpriseDemo();
  
  // 企业搜索演示
  const runDemo = async () => {
    try {
      console.log('🚀 启动阿里云企业演示...\n');
      
      // 模拟企业用户上下文
      const userContext = {
        userId: 'user_12345',
        tenantId: 'enterprise_tenant_001',
        role: 'business_analyst',
        department: 'marketing'
      };
      
      // 执行企业搜索
      console.log('🔍 执行企业级安全搜索...');
      const searchResults = await demo.enterpriseSearch('客户行为分析报告', userContext);
      
      console.log('搜索结果:', {
        resultCount: searchResults.data.length,
        latency: searchResults.metadata.queryTime + 'ms',
        source: searchResults.metadata.source,
        complianceLevel: searchResults.enterpriseMetadata.complianceLevel
      });
      
      // 获取业务洞察
      console.log('\n📊 生成业务洞察报告...');
      const insights = await demo.getBusinessInsights(userContext.tenantId);
      
      console.log('业务洞察:', {
        searchVolume: insights.searchVolume,
        topQueries: insights.popularQueries.slice(0, 5),
        recommendations: insights.recommendations.length
      });
      
      console.log('\n✅ 阿里云企业演示完成');
      
    } catch (error) {
      console.error('❌ 演示运行失败:', error.message);
      process.exit(1);
    }
  };
  
  runDemo();
}
EOF

log_success "阿里云企业演示创建完成"

# Step 4: Create Terraform configuration for infrastructure
log_info "步骤 4: 创建 Terraform 基础设施配置..."

mkdir -p terraform/alibaba-cloud
cat > terraform/alibaba-cloud/main.tf << 'EOF'
# 阿里云智能搜索基础设施
terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.206.0"
    }
  }
}

# 配置阿里云提供商
provider "alicloud" {
  access_key = var.alibaba_cloud_access_key
  secret_key = var.alibaba_cloud_secret_key
  region     = var.region
}

# 变量定义
variable "alibaba_cloud_access_key" {
  description = "阿里云访问密钥ID"
  type        = string
  sensitive   = true
}

variable "alibaba_cloud_secret_key" {
  description = "阿里云访问密钥Secret"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "阿里云地域"
  type        = string
  default     = "cn-hangzhou"
}

variable "environment" {
  description = "环境名称"
  type        = string
  default     = "production"
}

# VPC 网络
resource "alicloud_vpc" "smart_search_vpc" {
  vpc_name   = "smart-search-${var.environment}"
  cidr_block = "10.0.0.0/8"
  
  tags = {
    Name        = "SmartSearch VPC"
    Environment = var.environment
    Service     = "smart-search"
  }
}

# 子网配置
resource "alicloud_vswitch" "private_subnet" {
  count      = 2
  vpc_id     = alicloud_vpc.smart_search_vpc.id
  cidr_block = "10.0.${count.index + 1}.0/24"
  zone_id    = data.alicloud_zones.default.zones[count.index].id
  
  tags = {
    Name = "SmartSearch Private Subnet ${count.index + 1}"
    Type = "private"
  }
}

# 获取可用区信息
data "alicloud_zones" "default" {
  available_resource_creation = ["VSwitch"]
}

# PolarDB 数据库集群
resource "alicloud_polardb_cluster" "smart_search_db" {
  db_type       = "MySQL"
  db_version    = "8.0"
  db_node_class = "polar.mysql.x4.large"
  pay_type      = "PostPaid"
  
  vpc_id    = alicloud_vpc.smart_search_vpc.id
  zone_id   = data.alicloud_zones.default.zones[0].id
  
  cluster_backup_retention_policy_on_cluster_deletion = "RETAIN"
  backup_retention_period = "30"
  
  parameters = [
    {
      name  = "character_set_server"
      value = "utf8mb4"
    },
    {
      name  = "innodb_buffer_pool_size"
      value = "75%"
    }
  ]
  
  tags = {
    Name        = "SmartSearch PolarDB"
    Environment = var.environment
    Service     = "database"
  }
}

# PolarDB 数据库账号
resource "alicloud_polardb_account" "smart_search_account" {
  db_cluster_id    = alicloud_polardb_cluster.smart_search_db.id
  account_name     = "smartsearch"
  account_password = var.database_password
  account_type     = "Normal"
}

# Redis 集群实例
resource "alicloud_redis_instance" "smart_search_cache" {
  instance_name  = "smart-search-redis-${var.environment}"
  instance_class = "redis.master.2xlarge.default"
  availability_zone = data.alicloud_zones.default.zones[0].id
  
  vpc_id               = alicloud_vpc.smart_search_vpc.id
  vswitch_id          = alicloud_vswitch.private_subnet[0].id
  private_ip          = "10.0.1.100"
  
  engine_version = "5.0"
  config = {
    "maxmemory-policy" = "allkeys-lru"
    "notify-keyspace-events" = "Ex"
  }
  
  tags = {
    Name        = "SmartSearch Redis"
    Environment = var.environment
    Service     = "cache"
  }
}

# OpenSearch 实例
resource "alicloud_opensearch_app_group" "smart_search_opensearch" {
  app_group_name = "smart-search-${var.environment}"
  payment_type   = "Subscription"
  type          = "standard"
  
  quota = {
    doc_size     = 10737418240  # 10GB
    compute_resource = 20
  }
  
  tags = {
    Name        = "SmartSearch OpenSearch"
    Environment = var.environment
    Service     = "search"
  }
}

# OSS 存储桶
resource "alicloud_oss_bucket" "smart_search_storage" {
  bucket = "smart-search-${var.environment}-${random_string.bucket_suffix.result}"
  
  cors_rule {
    allowed_origins = ["*"]
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
    allowed_headers = ["*"]
  }
  
  server_side_encryption_rule {
    sse_algorithm = "AES256"
  }
  
  tags = {
    Name        = "SmartSearch Storage"
    Environment = var.environment
    Service     = "storage"
  }
}

# 随机字符串用于存储桶命名
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# 负载均衡器
resource "alicloud_slb_load_balancer" "smart_search_lb" {
  load_balancer_name = "smart-search-${var.environment}"
  internet_charge_type = "PayByTraffic"
  address_type         = "internet"
  
  tags = {
    Name        = "SmartSearch LoadBalancer"
    Environment = var.environment
    Service     = "load-balancer"
  }
}

# 输出重要信息
output "polardb_connection_string" {
  description = "PolarDB 连接字符串"
  value       = alicloud_polardb_cluster.smart_search_db.connection_string
  sensitive   = true
}

output "redis_connection_domain" {
  description = "Redis 连接域名"
  value       = alicloud_redis_instance.smart_search_cache.connection_domain
}

output "opensearch_endpoint" {
  description = "OpenSearch 服务端点"
  value       = alicloud_opensearch_app_group.smart_search_opensearch.id
}

output "oss_bucket_name" {
  description = "OSS 存储桶名称"
  value       = alicloud_oss_bucket.smart_search_storage.bucket
}

output "load_balancer_address" {
  description = "负载均衡器地址"
  value       = alicloud_slb_load_balancer.smart_search_lb.address
}
EOF

# Create variables file
cat > terraform/alibaba-cloud/variables.tf << 'EOF'
variable "database_password" {
  description = "数据库密码"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "项目名称"
  type        = string
  default     = "smart-search"
}

variable "tags" {
  description = "通用标签"
  type        = map(string)
  default = {
    Project     = "SmartSearch"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}
EOF

log_success "Terraform 基础设施配置创建完成"

# Step 5: Create Docker Compose for local development
log_info "步骤 5: 创建本地开发 Docker Compose..."

cat > docker/alibaba-cloud-local.docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PolarDB 兼容的 MySQL 8.0
  mysql:
    image: mysql:8.0
    container_name: smart-search-mysql-polardb
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: smartsearch_enterprise
      MYSQL_USER: smartsearch
      MYSQL_PASSWORD: password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init/mysql:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password
             --character-set-server=utf8mb4
             --collation-server=utf8mb4_unicode_ci
             --innodb-buffer-pool-size=1G
    networks:
      - smart-search-network
    
  # Redis 集群模拟
  redis:
    image: redis:7-alpine
    container_name: smart-search-redis-cluster
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./config/redis.conf:/etc/redis/redis.conf
    command: redis-server /etc/redis/redis.conf
    networks:
      - smart-search-network
    
  # Elasticsearch (OpenSearch 替代)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.6.0
    container_name: smart-search-opensearch
    environment:
      - node.name=elasticsearch
      - cluster.name=smart-search-cluster
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - smart-search-network
    
  # MinIO (OSS 替代)
  minio:
    image: minio/minio
    container_name: smart-search-oss
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: smartsearch
      MINIO_ROOT_PASSWORD: smartsearch123
    command: server /data --console-address ":9001"
    networks:
      - smart-search-network
    
  # Prometheus (ARMS 监控替代)
  prometheus:
    image: prom/prometheus
    container_name: smart-search-monitoring
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - smart-search-network
    
  # Grafana 监控仪表板
  grafana:
    image: grafana/grafana
    container_name: smart-search-dashboard
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - smart-search-network
    depends_on:
      - prometheus

volumes:
  mysql_data:
  redis_data:
  elasticsearch_data:
  minio_data:
  prometheus_data:
  grafana_data:

networks:
  smart-search-network:
    driver: bridge
EOF

log_success "Docker Compose 配置创建完成"

# Step 6: Create monitoring configuration
log_info "步骤 6: 创建监控配置..."

mkdir -p monitoring
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'smart-search-api'
    static_configs:
      - targets: ['localhost:3000']
    
  - job_name: 'mysql-exporter'
    static_configs:
      - targets: ['localhost:9104']
    
  - job_name: 'redis-exporter'  
    static_configs:
      - targets: ['localhost:9121']
    
  - job_name: 'elasticsearch-exporter'
    static_configs:
      - targets: ['localhost:9114']

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
EOF

# Create alert rules
cat > monitoring/alert_rules.yml << 'EOF'
groups:
  - name: smart-search-alerts
    rules:
      - alert: HighSearchLatency
        expr: search_latency_histogram > 500
        for: 2m
        labels:
          severity: warning
          service: smart-search
        annotations:
          summary: "搜索延迟过高"
          description: "搜索延迟超过500ms已持续2分钟"
      
      - alert: LowCacheHitRatio
        expr: cache_hit_ratio < 0.8
        for: 5m
        labels:
          severity: warning
          service: smart-search
        annotations:
          summary: "缓存命中率过低"
          description: "缓存命中率低于80%已持续5分钟"
      
      - alert: HighDatabaseConnections
        expr: mysql_global_status_threads_connected > 80
        for: 3m
        labels:
          severity: critical
          service: database
        annotations:
          summary: "数据库连接数过高"
          description: "MySQL连接数超过80个已持续3分钟"
EOF

log_success "监控配置创建完成"

# Step 7: Create package.json scripts
log_info "步骤 7: 配置阿里云开发脚本..."

if [ -f "package.json" ]; then
    cp package.json package.json.alibaba.backup
    
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    pkg.scripts = pkg.scripts || {};
    
    // Add Alibaba Cloud specific scripts
    Object.assign(pkg.scripts, {
      'alibaba:setup': './scripts/platform-setup/chinese/alibaba-cloud-setup.sh',
      'alibaba:demo': 'node demo/alibaba-cloud/enterprise-demo.js',
      'alibaba:dev': 'docker-compose -f docker/alibaba-cloud-local.docker-compose.yml up -d && npm run dev',
      'alibaba:test': 'npm run test -- --config=alibaba-cloud.config.json',
      'alibaba:deploy': 'terraform -chdir=terraform/alibaba-cloud apply',
      'alibaba:destroy': 'terraform -chdir=terraform/alibaba-cloud destroy',
      'alibaba:monitor': 'open http://localhost:3001', // Grafana dashboard
      'alibaba:logs': 'docker-compose -f docker/alibaba-cloud-local.docker-compose.yml logs -f'
    });
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    log_success "package.json 阿里云脚本配置完成"
fi

# Step 8: Create environment configuration
log_info "步骤 8: 创建环境配置文件..."

cat > .env.alibaba-cloud << 'EOF'
# 阿里云智能搜索企业环境配置
ALIBABA_CLOUD_ENVIRONMENT=true
ALIBABA_CLOUD_REGION=cn-hangzhou
ENVIRONMENT=development

# 阿里云凭证 (生产环境请使用密钥管理服务)
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id_here
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret_here

# PolarDB 数据库配置
POLARDB_ENDPOINT=pc-***.mysql.polardb.rds.aliyuncs.com
POLARDB_USERNAME=smartsearch
POLARDB_PASSWORD=your_secure_password_here
POLARDB_DATABASE=smartsearch_enterprise

# Redis 集群配置
REDIS_CLUSTER_ENDPOINT=r-***.redis.rds.aliyuncs.com
REDIS_PASSWORD=your_redis_password_here
REDIS_KEY_PREFIX=enterprise:

# OpenSearch 配置
OPENSEARCH_ENDPOINT=opensearch-***.cn-hangzhou.aliyuncs.com
OPENSEARCH_ACCESS_KEY_ID=${ALIBABA_CLOUD_ACCESS_KEY_ID}
OPENSEARCH_ACCESS_KEY_SECRET=${ALIBABA_CLOUD_ACCESS_KEY_SECRET}

# OSS 存储配置
OSS_BUCKET=smart-search-enterprise-storage
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
CDN_DOMAIN=cdn.your-domain.com

# ARMS 监控配置
ARMS_APPLICATION_NAME=smart-search-enterprise
ARMS_REGION=${ALIBABA_CLOUD_REGION}

# 告警配置
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=your_token
ALERT_EMAIL=admin@your-domain.com
ALERT_PHONE=+86138****8888

# 安全配置
KMS_KEY_ID=your_kms_key_id
WAF_ENABLED=true
RAM_ROLE_ARN=acs:ram::your_account:role/SmartSearchRole

# 性能配置
MAX_DATABASE_CONNECTIONS=100
CACHE_TTL=3600
SEARCH_TIMEOUT=5000
MONITORING_INTERVAL=60

# 合规配置
DATA_RESIDENCY=china
AUDIT_LOG_RETENTION=1year
ENCRYPTION_AT_REST=true
PIPL_COMPLIANCE=true
EOF

echo ""
log_alibaba "🎉 阿里云企业集成配置完成！ 🎉"
echo "==================================="
log_success "智能搜索阿里云企业环境已准备就绪"
echo ""
echo "🚀 快速开始命令:"
echo "   npm run alibaba:demo         # 启动企业演示"
echo "   npm run alibaba:dev          # 启动开发环境"
echo "   npm run alibaba:deploy       # 部署到阿里云"
echo "   npm run alibaba:monitor      # 打开监控面板"
echo ""
echo "📁 生成的文件:"
echo "   ☁️  alibaba-cloud.config.json      # 阿里云企业配置"
echo "   🏗️  terraform/alibaba-cloud/       # 基础设施代码"
echo "   🐳 docker/alibaba-cloud-local.docker-compose.yml # 本地开发环境"
echo "   📊 monitoring/                     # 监控配置"
echo "   🚀 demo/alibaba-cloud/             # 企业演示"
echo ""
echo "🌟 企业级特性:"
echo "   ✅ PolarDB 分布式数据库"
echo "   ✅ Redis 集群高可用缓存"
echo "   ✅ OpenSearch 企业搜索"
echo "   ✅ OSS 海量存储"
echo "   ✅ ARMS 全链路监控"
echo "   ✅ 多租户安全架构"
echo "   ✅ 中国合规认证"
echo ""
echo "💡 下一步操作:"
echo "   1. 配置 .env.alibaba-cloud 中的阿里云凭证"
echo "   2. 运行 'npm run alibaba:dev' 启动本地开发"
echo "   3. 访问 http://localhost:3001 查看监控面板"
echo "   4. 运行 'npm run alibaba:deploy' 部署到生产环境"
echo ""
echo "📚 企业文档:"
echo "   🔗 https://smart-search.dev/docs/alibaba-cloud"
echo "   📞 企业支持: support-china@smart-search.dev"
echo ""
log_success "开始体验阿里云企业级智能搜索！ ☁️🚀"