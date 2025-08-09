#!/bin/bash

# Smart Search Universal Setup Script
# Auto-detects development environment and configures optimally
# Supports global platforms with regional optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script info
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="Smart Search Universal Setup"

# URLs and paths
NPM_PACKAGE="@samas/smart-search"
GITHUB_REPO="samas-it-services/smart-search"

# Platform detection variables
PLATFORM=""
REGION=""
LANGUAGE_LOCALE=""
CDN_MIRROR=""

echo -e "${PURPLE}🚀 $SCRIPT_NAME v$SCRIPT_VERSION${NC}"
echo -e "${CYAN}   Universal search engine setup for modern applications${NC}"
echo ""

# Platform Detection Function
detect_platform() {
    echo -e "${BLUE}🔍 Detecting development environment...${NC}"
    
    # AI-Powered Platforms
    if [ ! -z "$LOVABLE_ENV" ]; then
        PLATFORM="lovable"
        echo -e "${GREEN}   ✅ Lovable.dev AI-enhanced React development${NC}"
    elif [ ! -z "$CURSOR_SESSION_ID" ]; then
        PLATFORM="cursor"
        echo -e "${GREEN}   ✅ Cursor AI code editor${NC}"
    elif [ ! -z "$GITHUB_COPILOT" ]; then
        PLATFORM="copilot"
        echo -e "${GREEN}   ✅ GitHub Copilot integration${NC}"
    elif [ ! -z "$REPLIT_DB_URL" ]; then
        PLATFORM="replit"
        echo -e "${GREEN}   ✅ Replit cloud collaboration${NC}"
    
    # Chinese Development Platforms
    elif [ ! -z "$GITEE_ENV" ]; then
        PLATFORM="gitee"
        REGION="china"
        LANGUAGE_LOCALE="zh-CN"
        CDN_MIRROR="gitee"
        echo -e "${GREEN}   ✅ Gitee 码云集成 (Chinese Git platform)${NC}"
    elif [ ! -z "$CODING_NET_ENV" ]; then
        PLATFORM="coding"
        REGION="china"
        LANGUAGE_LOCALE="zh-CN"
        CDN_MIRROR="tencent"
        echo -e "${GREEN}   ✅ Coding.net 腾讯云开发${NC}"
    elif [ ! -z "$ALIBABA_CLOUD_ENV" ]; then
        PLATFORM="alibaba"
        REGION="china"
        LANGUAGE_LOCALE="zh-CN"
        CDN_MIRROR="alibaba"
        echo -e "${GREEN}   ✅ Alibaba Cloud Workbench 阿里云${NC}"
    elif [ ! -z "$BAIDU_AI_STUDIO" ]; then
        PLATFORM="baidu"
        REGION="china"
        LANGUAGE_LOCALE="zh-CN"
        CDN_MIRROR="baidu"
        echo -e "${GREEN}   ✅ Baidu AI Studio 百度AI工作室${NC}"
    
    # International Cloud Platforms
    elif [ ! -z "$CODESPACES" ]; then
        PLATFORM="codespaces"
        echo -e "${GREEN}   ✅ GitHub Codespaces${NC}"
    elif [ ! -z "$GITLAB_CI" ]; then
        PLATFORM="gitlab"
        echo -e "${GREEN}   ✅ GitLab Web IDE${NC}"
    elif [ ! -z "$STACKBLITZ" ]; then
        PLATFORM="stackblitz"
        echo -e "${GREEN}   ✅ StackBlitz instant development${NC}"
    elif [ ! -z "$WINDSURF_IDE" ]; then
        PLATFORM="windsurf"
        echo -e "${GREEN}   ✅ Windsurf intelligent IDE${NC}"
    
    # Local Development
    else
        PLATFORM="local"
        echo -e "${YELLOW}   ⚡ Local development environment${NC}"
    fi
    
    # Auto-detect region if not set
    if [ -z "$REGION" ]; then
        detect_region
    fi
    
    echo ""
}

# Region Detection Function
detect_region() {
    echo -e "${BLUE}🌍 Detecting geographic region...${NC}"
    
    # Try to detect region via various methods
    if command -v curl >/dev/null 2>&1; then
        DETECTED_COUNTRY=$(curl -s https://ipapi.co/country_code/ 2>/dev/null || echo "")
        
        case $DETECTED_COUNTRY in
            CN|HK|MO|TW)
                REGION="china"
                LANGUAGE_LOCALE="zh-CN"
                CDN_MIRROR="china"
                echo -e "${GREEN}   ✅ 中国地区 (China region)${NC}"
                ;;
            JP)
                REGION="japan"
                LANGUAGE_LOCALE="ja-JP"
                CDN_MIRROR="japan"
                echo -e "${GREEN}   ✅ 日本地域 (Japan region)${NC}"
                ;;
            KR)
                REGION="korea"
                LANGUAGE_LOCALE="ko-KR"
                CDN_MIRROR="korea"
                echo -e "${GREEN}   ✅ 한국 지역 (Korea region)${NC}"
                ;;
            US|CA)
                REGION="americas"
                LANGUAGE_LOCALE="en-US"
                CDN_MIRROR="global"
                echo -e "${GREEN}   ✅ Americas region${NC}"
                ;;
            *)
                REGION="global"
                LANGUAGE_LOCALE="en-US"
                CDN_MIRROR="global"
                echo -e "${GREEN}   ✅ Global region${NC}"
                ;;
        esac
    else
        REGION="global"
        LANGUAGE_LOCALE="en-US"
        CDN_MIRROR="global"
        echo -e "${YELLOW}   ⚡ Global region (detection unavailable)${NC}"
    fi
    
    echo ""
}

# NPM Registry Configuration
configure_npm_registry() {
    echo -e "${BLUE}📦 Configuring NPM registry...${NC}"
    
    case $CDN_MIRROR in
        china|gitee|tencent|alibaba|baidu)
            echo -e "${GREEN}   ✅ Using Taobao NPM registry (China optimization)${NC}"
            npm config set registry https://registry.npmmirror.com/
            ;;
        japan)
            echo -e "${GREEN}   ✅ Using global NPM registry (Japan optimization)${NC}"
            npm config set registry https://registry.npmjs.org/
            ;;
        korea)
            echo -e "${GREEN}   ✅ Using global NPM registry (Korea optimization)${NC}"
            npm config set registry https://registry.npmjs.org/
            ;;
        *)
            echo -e "${GREEN}   ✅ Using global NPM registry${NC}"
            npm config set registry https://registry.npmjs.org/
            ;;
    esac
    
    echo ""
}

# Check Prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔧 Checking prerequisites...${NC}"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}   ✅ Node.js $NODE_VERSION${NC}"
    else
        echo -e "${RED}   ❌ Node.js not found. Please install Node.js 16+ first.${NC}"
        exit 1
    fi
    
    # Check NPM
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}   ✅ NPM $NPM_VERSION${NC}"
    else
        echo -e "${RED}   ❌ NPM not found. Please install NPM first.${NC}"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | sed 's/,//')
        echo -e "${GREEN}   ✅ Docker $DOCKER_VERSION${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Docker not found (optional for showcases)${NC}"
    fi
    
    echo ""
}

# Install Smart Search
install_smart_search() {
    echo -e "${BLUE}📥 Installing Smart Search...${NC}"
    
    if npm install $NPM_PACKAGE; then
        echo -e "${GREEN}   ✅ Smart Search installed successfully${NC}"
    else
        echo -e "${RED}   ❌ Failed to install Smart Search${NC}"
        exit 1
    fi
    
    echo ""
}

# Generate Configuration
generate_configuration() {
    echo -e "${BLUE}⚙️  Generating platform-optimized configuration...${NC}"
    
    # Create config directory
    mkdir -p config
    
    # Generate base configuration
    cat > config/smart-search.config.json << EOF
{
  "platform": "$PLATFORM",
  "region": "$REGION", 
  "language": "$LANGUAGE_LOCALE",
  "cdn": "$CDN_MIRROR",
  "database": {
    "type": "postgresql",
    "connection": {
      "host": "localhost",
      "port": 5432,
      "database": "smart_search_dev",
      "user": "postgres",
      "password": "password"
    }
  },
  "cache": {
    "type": "redis",
    "connection": {
      "host": "localhost",
      "port": 6379,
      "password": null
    }
  },
  "security": {
    "enableFieldMasking": true,
    "auditLogging": true,
    "compliance": {
      "hipaa": false,
      "gdpr": true,
      "pipl": $([ "$REGION" = "china" ] && echo "true" || echo "false")
    }
  },
  "performance": {
    "enableMetrics": true,
    "circuitBreaker": {
      "enabled": true,
      "failureThreshold": 5,
      "recoveryTimeout": 60000
    }
  }
}
EOF

    echo -e "${GREEN}   ✅ Configuration generated: config/smart-search.config.json${NC}"
    
    # Generate platform-specific configuration
    case $PLATFORM in
        lovable)
            generate_lovable_config
            ;;
        replit)
            generate_replit_config
            ;;
        codespaces)
            generate_codespaces_config
            ;;
        gitee|coding|alibaba|baidu)
            generate_chinese_platform_config
            ;;
    esac
    
    echo ""
}

# Platform-specific configurations
generate_lovable_config() {
    cat > config/lovable.config.js << 'EOF'
// Lovable.dev Smart Search Configuration
import SmartSearch from '@samas/smart-search';

export const smartSearchConfig = {
  // AI-enhanced search with NLP
  aiFeatures: {
    naturalLanguageQueries: true,
    smartSuggestions: true,
    semanticSearch: true
  },
  
  // React component optimization
  reactIntegration: {
    hooks: true,
    suspense: true,
    errorBoundaries: true
  }
};

export default smartSearchConfig;
EOF
    echo -e "${GREEN}   ✅ Lovable.dev configuration: config/lovable.config.js${NC}"
}

generate_replit_config() {
    cat > .replit << 'EOF'
modules = ["nodejs-20"]

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "npm start"]

[env]
SMART_SEARCH_ENV = "replit"
SMART_SEARCH_REGION = "global"
EOF
    echo -e "${GREEN}   ✅ Replit configuration: .replit${NC}"
}

generate_codespaces_config() {
    cat > .devcontainer/devcontainer.json << 'EOF'
{
  "name": "Smart Search Development",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:1-18-bullseye",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json"
      ]
    }
  },
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "npm install",
  "remoteUser": "node"
}
EOF
    echo -e "${GREEN}   ✅ Codespaces configuration: .devcontainer/devcontainer.json${NC}"
}

generate_chinese_platform_config() {
    cat > config/chinese-platform.config.json << EOF
{
  "locale": "zh-CN",
  "cdn": {
    "npm": "https://registry.npmmirror.com/",
    "assets": "https://cdn.bootcdn.net/",
    "fonts": "https://fonts.font.im/"
  },
  "compliance": {
    "pipl": true,
    "cybersecurity": true,
    "dataLocalization": true
  },
  "features": {
    "chineseSearch": true,
    "pinyinSupport": true,
    "traditionalSimplified": true
  }
}
EOF
    echo -e "${GREEN}   ✅ Chinese platform configuration: config/chinese-platform.config.json${NC}"
}

# Generate Scripts
generate_scripts() {
    echo -e "${BLUE}📜 Generating helper scripts...${NC}"
    
    # Create scripts directory
    mkdir -p scripts
    
    # Quick start script
    cat > scripts/quick-start.sh << 'EOF'
#!/bin/bash
# Quick Start Script for Smart Search

echo "🚀 Starting Smart Search development environment..."

# Start Docker services (if available)
if command -v docker-compose >/dev/null 2>&1; then
    echo "📦 Starting database and cache services..."
    docker-compose up -d postgres redis
    sleep 5
fi

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Generate configuration if not exists
if [ ! -f "config/smart-search.config.json" ]; then
    echo "⚙️  Generating configuration..."
    npx @samas/smart-search init
fi

# Start development server
echo "🎯 Starting development server..."
npm run dev
EOF

    chmod +x scripts/quick-start.sh
    echo -e "${GREEN}   ✅ Quick start script: scripts/quick-start.sh${NC}"
    
    # Platform optimization script  
    cat > scripts/optimize-platform.sh << 'EOF'
#!/bin/bash
# Platform Optimization Script

echo "⚡ Optimizing for current platform..."

# Read platform from config
PLATFORM=$(cat config/smart-search.config.json | grep -o '"platform": "[^"]*' | cut -d'"' -f4)

case $PLATFORM in
    "lovable")
        echo "💜 Optimizing for Lovable.dev..."
        npm install @lovable/react-hooks
        ;;
    "replit")
        echo "🚀 Optimizing for Replit..."
        npm install --save-dev @replit/database
        ;;
    "codespaces") 
        echo "🌌 Optimizing for Codespaces..."
        code --install-extension ms-vscode.vscode-typescript-next
        ;;
    *)
        echo "🌍 Standard optimization applied"
        ;;
esac

echo "✅ Platform optimization complete!"
EOF

    chmod +x scripts/optimize-platform.sh  
    echo -e "${GREEN}   ✅ Platform optimization script: scripts/optimize-platform.sh${NC}"
    
    echo ""
}

# Generate Docker Compose
generate_docker_compose() {
    echo -e "${BLUE}🐳 Generating Docker Compose configuration...${NC}"
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: smart_search_dev
      POSTGRES_USER: postgres  
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      
  smart-search-demo:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
EOF

    echo -e "${GREEN}   ✅ Docker Compose configuration: docker-compose.yml${NC}"
    echo ""
}

# Final Instructions
show_next_steps() {
    echo -e "${PURPLE}🎉 Setup Complete! Next Steps:${NC}"
    echo ""
    echo -e "${CYAN}1. Quick Start (Recommended):${NC}"
    echo -e "   ${GREEN}./scripts/quick-start.sh${NC}"
    echo ""
    echo -e "${CYAN}2. Manual Setup:${NC}"
    echo -e "   ${GREEN}npm run dev                    ${NC}# Start development server"
    echo -e "   ${GREEN}./scripts/optimize-platform.sh${NC}# Apply platform optimizations"
    echo ""
    echo -e "${CYAN}3. Run Examples:${NC}"
    echo -e "   ${GREEN}npm run examples:basic${NC}      # Basic usage example"
    echo -e "   ${GREEN}npm run examples:advanced${NC}   # Advanced configuration"
    echo -e "   ${GREEN}npm run examples:multi-db${NC}   # Multiple databases example"
    echo ""
    echo -e "${CYAN}4. Documentation:${NC}"
    echo -e "   ${GREEN}📖 README.md                  ${NC}# Getting started guide"
    echo -e "   ${GREEN}📘 blog/                      ${NC}# Community guides"
    echo -e "   ${GREEN}🔧 config/                    ${NC}# Configuration examples"
    echo -e "   ${GREEN}📚 examples/                  ${NC}# Working code examples"
    echo ""
    
    # Platform-specific next steps
    case $PLATFORM in
        lovable)
            echo -e "${CYAN}💜 Lovable.dev Specific:${NC}"
            echo -e "   ${GREEN}Open Lovable.dev → Import this project → Start building!${NC}"
            ;;
        replit)
            echo -e "${CYAN}🚀 Replit Specific:${NC}"
            echo -e "   ${GREEN}Click 'Run' button → Your search app is live!${NC}"
            ;;
        codespaces)
            echo -e "${CYAN}🌌 Codespaces Specific:${NC}"
            echo -e "   ${GREEN}Ports 3000, 5432, 6379 are forwarded automatically${NC}"
            ;;
        gitee|coding|alibaba|baidu)
            echo -e "${CYAN}🇨🇳 Chinese Platform Specific:${NC}"
            echo -e "   ${GREEN}配置已优化为中国网络环境 (Optimized for Chinese network)${NC}"
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}📞 Community Support:${NC}"
    echo -e "   ${GREEN}🐙 GitHub Issues: https://github.com/$GITHUB_REPO/issues${NC}"
    echo -e "   ${GREEN}💬 GitHub Discussions: https://github.com/$GITHUB_REPO/discussions${NC}"
    echo -e "   ${GREEN}📚 Documentation: https://github.com/$GITHUB_REPO#readme${NC}"
    echo ""
    echo -e "${PURPLE}Happy searching! 🔍✨${NC}"
}

# Main Execution
main() {
    detect_platform
    check_prerequisites
    configure_npm_registry
    install_smart_search
    generate_configuration
    generate_scripts
    generate_docker_compose
    show_next_steps
}

# Run main function
main "$@"