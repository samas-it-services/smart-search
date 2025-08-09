#!/bin/bash

# Smart Search - Windsurf IDE Integration Setup
# Configure Smart Search for enhanced development experience in Windsurf

set -e

echo "🌊 SMART SEARCH - WINDSURF IDE INTEGRATION"
echo "========================================="
echo "Setting up intelligent development environment..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_windsurf() { echo -e "${CYAN}🌊 $1${NC}"; }

# Step 1: Create Windsurf workspace configuration
log_info "Step 1: Creating Windsurf workspace configuration..."

mkdir -p .windsurf

cat > .windsurf/settings.json << 'EOF'
{
  "smartSearch.enabled": true,
  "smartSearch.autoComplete": true,
  "smartSearch.inlineHints": true,
  "smartSearch.debugging": true,
  "smartSearch.codeGeneration": true,
  
  "editor.inlineSuggest.enabled": true,
  "editor.suggest.snippetsPreventQuickSuggestions": false,
  "editor.tabCompletion": "on",
  "editor.quickSuggestions": {
    "strings": true,
    "comments": true,
    "other": true
  },
  
  "typescript.suggest.autoImports": true,
  "typescript.preferences.quoteStyle": "single",
  "typescript.inlayHints.parameterNames.enabled": "all",
  "typescript.inlayHints.variableTypes.enabled": true,
  "typescript.inlayHints.functionLikeReturnTypes.enabled": true,
  
  "files.associations": {
    "*.smart-search": "json",
    "*.search-config": "json",
    "smart-search.config.*": "json"
  },
  
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  
  "workbench.colorCustomizations": {
    "activityBar.background": "#1e293b",
    "activityBar.foreground": "#60a5fa",
    "statusBar.background": "#3b82f6",
    "statusBar.foreground": "#ffffff"
  },
  
  "smartSearch.intellisense": {
    "providers": ["postgres", "mysql", "mongodb", "redis", "dragonfly", "memcached"],
    "autoDetectConfig": true,
    "validateQueries": true,
    "suggestOptimizations": true
  },
  
  "smartSearch.debugging": {
    "logLevel": "info",
    "enablePerformanceMetrics": true,
    "showCacheHitRatio": true,
    "displayQueryPlan": true
  }
}
EOF

log_success "Windsurf workspace settings created"

# Step 2: Create Smart Search code snippets
log_info "Step 2: Creating Smart Search code snippets..."

mkdir -p .windsurf/snippets

cat > .windsurf/snippets/smart-search.json << 'EOF'
{
  "Smart Search Basic Setup": {
    "prefix": "ss-basic",
    "body": [
      "import { SmartSearch } from '@samas/smart-search';",
      "",
      "const smartSearch = new SmartSearch({",
      "  database: {",
      "    type: '${1|postgres,mysql,mongodb,sqlite|}',",
      "    connection: {",
      "      host: '${2:localhost}',",
      "      port: ${3:5432},",
      "      database: '${4:smartsearch}',",
      "      user: '${5:user}',",
      "      password: '${6:password}'",
      "    }",
      "  },",
      "  cache: {",
      "    type: '${7|redis,dragonfly,memcached|}',",
      "    connection: {",
      "      host: '${8:localhost}',",
      "      port: ${9:6379}",
      "    }",
      "  }",
      "});",
      "",
      "const results = await smartSearch.search('${10:query}');",
      "console.log(results);"
    ],
    "description": "Basic Smart Search setup with database and cache"
  },
  
  "Smart Search Healthcare Config": {
    "prefix": "ss-healthcare",
    "body": [
      "import { SmartSearch } from '@samas/smart-search';",
      "",
      "const healthcareSearch = new SmartSearch({",
      "  database: {",
      "    type: 'postgres',",
      "    connection: {",
      "      host: process.env.DB_HOST || 'localhost',",
      "      port: 5432,",
      "      database: 'healthcare_db',",
      "      user: process.env.DB_USER,",
      "      password: process.env.DB_PASSWORD,",
      "      ssl: true",
      "    }",
      "  },",
      "  cache: {",
      "    type: 'redis',",
      "    connection: {",
      "      host: process.env.REDIS_HOST || 'localhost',",
      "      port: 6379,",
      "      lazyConnect: true",
      "    }",
      "  },",
      "  governance: {",
      "    enabled: true,",
      "    compliance: 'hipaa',",
      "    fieldMasking: {",
      "      ssn: 'mask',",
      "      email: 'mask',",
      "      phone: 'mask'",
      "    },",
      "    auditLogging: {",
      "      enabled: true,",
      "      destination: 'database'",
      "    }",
      "  },",
      "  circuitBreaker: {",
      "    enabled: true,",
      "    failureThreshold: 5,",
      "    recoveryTimeout: 30000",
      "  }",
      "});",
      "",
      "// Search with user context for audit logging",
      "const results = await healthcareSearch.search('${1:patient query}', {",
      "  limit: ${2:20},",
      "  userContext: {",
      "    userId: '${3:user-id}',",
      "    role: '${4:doctor}',",
      "    department: '${5:cardiology}'",
      "  }",
      "});"
    ],
    "description": "HIPAA-compliant healthcare search configuration"
  },
  
  "Smart Search E-commerce Config": {
    "prefix": "ss-ecommerce",
    "body": [
      "import { SmartSearch } from '@samas/smart-search';",
      "",
      "const productSearch = new SmartSearch({",
      "  database: {",
      "    type: 'mysql',",
      "    connection: {",
      "      host: process.env.DB_HOST || 'localhost',",
      "      port: 3306,",
      "      database: 'ecommerce_db',",
      "      user: process.env.DB_USER,",
      "      password: process.env.DB_PASSWORD",
      "    }",
      "  },",
      "  cache: {",
      "    type: 'dragonfly',",
      "    connection: {",
      "      host: process.env.CACHE_HOST || 'localhost',",
      "      port: 6379,",
      "      strategy: 'write-through'",
      "    }",
      "  },",
      "  performance: {",
      "    enableCompression: true,",
      "    enablePagination: true,",
      "    defaultPageSize: 20,",
      "    maxPageSize: 100",
      "  }",
      "});",
      "",
      "// Product search with faceted filtering",
      "const products = await productSearch.search('${1:product query}', {",
      "  limit: ${2:20},",
      "  filters: {",
      "    category: ['${3:electronics}'],",
      "    priceRange: { min: ${4:0}, max: ${5:1000} },",
      "    inStock: ${6:true}",
      "  },",
      "  sort: '${7|relevance,price,popularity,rating|}',",
      "  enableFacets: true",
      "});"
    ],
    "description": "E-commerce product search with faceted filtering"
  },
  
  "Smart Search Performance Monitoring": {
    "prefix": "ss-monitor",
    "body": [
      "// Performance monitoring setup",
      "const performanceMonitor = {",
      "  trackSearch: async (query: string, results: any) => {",
      "    const metrics = {",
      "      query,",
      "      resultCount: results.data?.length || 0,",
      "      latency: results.metadata?.queryTime || 0,",
      "      source: results.metadata?.source || 'unknown',",
      "      timestamp: Date.now()",
      "    };",
      "    ",
      "    // Log to console in development",
      "    if (process.env.NODE_ENV === 'development') {",
      "      console.log('🔍 Search Metrics:', metrics);",
      "    }",
      "    ",
      "    // Send to monitoring service in production",
      "    if (process.env.NODE_ENV === 'production') {",
      "      await fetch('/api/metrics/search', {",
      "        method: 'POST',",
      "        headers: { 'Content-Type': 'application/json' },",
      "        body: JSON.stringify(metrics)",
      "      });",
      "    }",
      "  }",
      "};",
      "",
      "// Usage with Smart Search",
      "const results = await smartSearch.search('${1:query}');",
      "await performanceMonitor.trackSearch('${1:query}', results);"
    ],
    "description": "Performance monitoring for Smart Search queries"
  },
  
  "Smart Search Error Handling": {
    "prefix": "ss-error",
    "body": [
      "import { SmartSearchError, CircuitBreakerError } from '@samas/smart-search';",
      "",
      "try {",
      "  const results = await smartSearch.search('${1:query}', {",
      "    timeout: ${2:5000},",
      "    retries: ${3:3}",
      "  });",
      "  ",
      "  return results;",
      "  ",
      "} catch (error) {",
      "  if (error instanceof CircuitBreakerError) {",
      "    console.error('🚨 Circuit breaker activated:', error.message);",
      "    ",
      "    // Fallback to cached results or degraded mode",
      "    return {",
      "      data: [],",
      "      metadata: {",
      "        error: 'Service temporarily unavailable',",
      "        fallbackMode: true",
      "      }",
      "    };",
      "    ",
      "  } else if (error instanceof SmartSearchError) {",
      "    console.error('🔍 Search error:', error.code, error.message);",
      "    ",
      "    // Handle specific error codes",
      "    switch (error.code) {",
      "      case 'INVALID_QUERY':",
      "        throw new Error('Please provide a valid search query');",
      "      case 'DATABASE_UNAVAILABLE':",
      "        throw new Error('Search service is temporarily unavailable');",
      "      default:",
      "        throw new Error('An error occurred during search');",
      "    }",
      "    ",
      "  } else {",
      "    console.error('💥 Unexpected error:', error);",
      "    throw new Error('An unexpected error occurred');",
      "  }",
      "}"
    ],
    "description": "Comprehensive error handling for Smart Search"
  },
  
  "Smart Search React Component": {
    "prefix": "ss-react",
    "body": [
      "import React, { useState, useCallback, useEffect } from 'react';",
      "import { SmartSearch } from '@samas/smart-search';",
      "",
      "interface SearchComponentProps {",
      "  placeholder?: string;",
      "  onResults?: (results: any[]) => void;",
      "  enablePagination?: boolean;",
      "}",
      "",
      "export const SearchComponent: React.FC<SearchComponentProps> = ({",
      "  placeholder = 'Search...',",
      "  onResults,",
      "  enablePagination = true",
      "}) => {",
      "  const [query, setQuery] = useState('');",
      "  const [results, setResults] = useState<any[]>([]);",
      "  const [loading, setLoading] = useState(false);",
      "  const [page, setPage] = useState(1);",
      "  const [totalPages, setTotalPages] = useState(0);",
      "  ",
      "  const smartSearch = new SmartSearch(${1:/* config */});",
      "  ",
      "  const handleSearch = useCallback(async (searchQuery: string, pageNum = 1) => {",
      "    if (!searchQuery.trim()) {",
      "      setResults([]);",
      "      return;",
      "    }",
      "    ",
      "    setLoading(true);",
      "    try {",
      "      const searchResults = await smartSearch.search(searchQuery, {",
      "        limit: 20,",
      "        offset: (pageNum - 1) * 20,",
      "        enableHighlight: true",
      "      });",
      "      ",
      "      setResults(searchResults.data);",
      "      setTotalPages(Math.ceil(searchResults.metadata.totalCount / 20));",
      "      onResults?.(searchResults.data);",
      "      ",
      "    } catch (error) {",
      "      console.error('Search error:', error);",
      "      setResults([]);",
      "    } finally {",
      "      setLoading(false);",
      "    }",
      "  }, [onResults]);",
      "  ",
      "  useEffect(() => {",
      "    const timeoutId = setTimeout(() => {",
      "      if (query) {",
      "        handleSearch(query, page);",
      "      }",
      "    }, 300);",
      "    ",
      "    return () => clearTimeout(timeoutId);",
      "  }, [query, page, handleSearch]);",
      "  ",
      "  return (",
      "    <div className=\"search-component\">",
      "      <input",
      "        type=\"text\"",
      "        value={query}",
      "        onChange={(e) => setQuery(e.target.value)}",
      "        placeholder={placeholder}",
      "        className=\"search-input\"",
      "      />",
      "      ",
      "      {loading && <div className=\"loading\">Searching...</div>}",
      "      ",
      "      <div className=\"results\">",
      "        {results.map((result, index) => (",
      "          <div key={result.id || index} className=\"result-item\">",
      "            <h3>{result.title}</h3>",
      "            <p>{result.content}</p>",
      "          </div>",
      "        ))}",
      "      </div>",
      "      ",
      "      {enablePagination && totalPages > 1 && (",
      "        <div className=\"pagination\">",
      "          {Array.from({ length: totalPages }, (_, i) => (",
      "            <button",
      "              key={i + 1}",
      "              onClick={() => setPage(i + 1)}",
      "              className={page === i + 1 ? 'active' : ''}",
      "            >",
      "              {i + 1}",
      "            </button>",
      "          ))}",
      "        </div>",
      "      )}",
      "    </div>",
      "  );",
      "};"
    ],
    "description": "React component with Smart Search integration"
  }
}
EOF

log_success "Code snippets created"

# Step 3: Create Windsurf-specific extensions configuration
log_info "Step 3: Configuring Windsurf extensions..."

cat > .windsurf/extensions.json << 'EOF'
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.hexeditor",
    "ms-vscode-remote.remote-containers",
    "ms-vscode-remote.remote-ssh"
  ],
  "unwantedRecommendations": []
}
EOF

# Step 4: Create intelligent debugging configuration
log_info "Step 4: Setting up debugging configuration..."

mkdir -p .windsurf/launch

cat > .windsurf/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Smart Search - Debug Node.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "smart-search:*"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "sourceMaps": true,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Smart Search - Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run", "--reporter=verbose"],
      "env": {
        "NODE_ENV": "test"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Smart Search - Debug E2E Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": ["test", "--headed"],
      "env": {
        "NODE_ENV": "test"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Smart Search - Debug Performance",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/benchmark-runner.js",
      "args": ["--stack", "postgres-redis", "--queries", "100"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "smart-search:performance"
      },
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Smart Search - Full Stack Debug",
      "configurations": [
        "Smart Search - Debug Node.js"
      ],
      "preLaunchTask": "Start Infrastructure",
      "stopAll": true
    }
  ]
}
EOF

# Step 5: Create intelligent tasks
log_info "Step 5: Creating development tasks..."

cat > .windsurf/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Infrastructure",
      "type": "shell",
      "command": "docker-compose",
      "args": ["-f", "docker/postgres-redis.docker-compose.yml", "up", "-d"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": []
    },
    {
      "label": "Stop Infrastructure", 
      "type": "shell",
      "command": "docker-compose",
      "args": ["-f", "docker/postgres-redis.docker-compose.yml", "down"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Seed Test Data",
      "type": "shell",
      "command": "./scripts/seed-data.sh",
      "args": ["healthcare", "medium", "postgres"],
      "group": "build",
      "dependsOn": "Start Infrastructure",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Run Unit Tests",
      "type": "shell",
      "command": "npm",
      "args": ["run", "test:unit"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Run E2E Tests",
      "type": "shell",
      "command": "npm",
      "args": ["run", "test:e2e"],
      "group": "test",
      "dependsOn": "Seed Test Data",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Performance Benchmark",
      "type": "shell",
      "command": "./scripts/benchmark-runner.js",
      "args": ["--stack", "postgres-redis", "--queries", "1000"],
      "group": "test",
      "dependsOn": "Seed Test Data",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Generate Screenshots",
      "type": "shell",
      "command": "./scripts/generate-screenshots-docker.sh",
      "args": ["postgres-redis", "--realistic-data", "medium"],
      "group": "build",
      "dependsOn": "Seed Test Data",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Build and Test",
      "dependsOrder": "sequence",
      "dependsOn": [
        "Start Infrastructure",
        "Seed Test Data",
        "Run Unit Tests"
      ],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
EOF

log_success "Development tasks created"

# Step 6: Create Windsurf-specific keybindings
log_info "Step 6: Setting up smart keybindings..."

cat > .windsurf/keybindings.json << 'EOF'
[
  {
    "key": "ctrl+shift+s",
    "command": "workbench.action.tasks.runTask",
    "args": "Start Infrastructure",
    "when": "!terminalFocus"
  },
  {
    "key": "ctrl+shift+t",
    "command": "workbench.action.tasks.runTask", 
    "args": "Run Unit Tests",
    "when": "!terminalFocus"
  },
  {
    "key": "ctrl+shift+e",
    "command": "workbench.action.tasks.runTask",
    "args": "Run E2E Tests",
    "when": "!terminalFocus"
  },
  {
    "key": "ctrl+shift+b",
    "command": "workbench.action.tasks.runTask",
    "args": "Performance Benchmark",
    "when": "!terminalFocus"
  },
  {
    "key": "ctrl+shift+d",
    "command": "workbench.action.tasks.runTask",
    "args": "Seed Test Data", 
    "when": "!terminalFocus"
  },
  {
    "key": "ctrl+shift+p",
    "command": "workbench.action.tasks.runTask",
    "args": "Generate Screenshots",
    "when": "!terminalFocus"
  },
  {
    "key": "f5",
    "command": "workbench.action.debug.start",
    "when": "!inDebugMode"
  },
  {
    "key": "shift+f5",
    "command": "workbench.action.debug.stop",
    "when": "inDebugMode"
  }
]
EOF

log_success "Smart keybindings configured"

# Step 7: Create development dashboard
log_info "Step 7: Creating development dashboard..."

cat > .windsurf/dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Smart Search - Windsurf Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .card h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
        }
        .card p {
            margin: 0 0 16px 0;
            opacity: 0.8;
            line-height: 1.5;
        }
        .shortcuts {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .shortcuts li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .shortcuts li:last-child {
            border-bottom: none;
        }
        .shortcut-key {
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
        }
        .status-indicator.warning {
            background: #f59e0b;
        }
        .status-indicator.error {
            background: #ef4444;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌊 Smart Search - Windsurf Dashboard</h1>
        <p>Intelligent development environment for Smart Search</p>
    </div>
    
    <div class="cards">
        <div class="card">
            <h3>🚀 Quick Start</h3>
            <p>Essential commands to get started with Smart Search development</p>
            <ul class="shortcuts">
                <li><span>Start Infrastructure</span><span class="shortcut-key">Ctrl+Shift+S</span></li>
                <li><span>Run Tests</span><span class="shortcut-key">Ctrl+Shift+T</span></li>
                <li><span>Seed Data</span><span class="shortcut-key">Ctrl+Shift+D</span></li>
                <li><span>Debug</span><span class="shortcut-key">F5</span></li>
            </ul>
        </div>
        
        <div class="card">
            <h3>🧪 Testing & Quality</h3>
            <p>Comprehensive testing and quality assurance tools</p>
            <ul class="shortcuts">
                <li><span>E2E Tests</span><span class="shortcut-key">Ctrl+Shift+E</span></li>
                <li><span>Performance</span><span class="shortcut-key">Ctrl+Shift+B</span></li>
                <li><span>Screenshots</span><span class="shortcut-key">Ctrl+Shift+P</span></li>
                <li><span>Coverage</span><span class="shortcut-key">npm run test:coverage</span></li>
            </ul>
        </div>
        
        <div class="card">
            <h3>📊 System Status</h3>
            <p>Monitor your development environment health</p>
            <ul class="shortcuts">
                <li><span>Database</span><div class="status"><div class="status-indicator"></div>Connected</div></li>
                <li><span>Cache</span><div class="status"><div class="status-indicator"></div>Active</div></li>
                <li><span>Tests</span><div class="status"><div class="status-indicator"></div>Passing</div></li>
                <li><span>Build</span><div class="status"><div class="status-indicator"></div>Ready</div></li>
            </ul>
        </div>
        
        <div class="card">
            <h3>🎯 Code Snippets</h3>
            <p>Intelligent code completion and snippets</p>
            <ul class="shortcuts">
                <li><span>Basic Setup</span><span class="shortcut-key">ss-basic</span></li>
                <li><span>Healthcare Config</span><span class="shortcut-key">ss-healthcare</span></li>
                <li><span>E-commerce Config</span><span class="shortcut-key">ss-ecommerce</span></li>
                <li><span>React Component</span><span class="shortcut-key">ss-react</span></li>
            </ul>
        </div>
        
        <div class="card">
            <h3>📚 Resources</h3>
            <p>Documentation and learning materials</p>
            <ul class="shortcuts">
                <li><span>Junior Guide</span><span>blog/smart-search-junior-developers.md</span></li>
                <li><span>Senior Guide</span><span>blog/smart-search-senior-developers.md</span></li>
                <li><span>API Docs</span><span>docs/api-reference.md</span></li>
                <li><span>Examples</span><span>examples/</span></li>
            </ul>
        </div>
        
        <div class="card">
            <h3>🔧 Configuration</h3>
            <p>Smart Search configuration management</p>
            <ul class="shortcuts">
                <li><span>Generate Config</span><span>npx @samas/smart-search init</span></li>
                <li><span>Validate Config</span><span>npx @samas/smart-search validate</span></li>
                <li><span>Test Connections</span><span>npx @samas/smart-search test-config</span></li>
                <li><span>Interactive Setup</span><span>./scripts/interactive-setup.sh</span></li>
            </ul>
        </div>
    </div>
    
    <script>
        // Add interactivity
        document.addEventListener('DOMContentLoaded', () => {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-5px)';
                    card.style.transition = 'transform 0.2s ease';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0)';
                });
            });
        });
    </script>
</body>
</html>
EOF

log_success "Development dashboard created"

# Step 8: Create Windsurf terminal scripts
log_info "Step 8: Creating terminal integration scripts..."

mkdir -p .windsurf/scripts

cat > .windsurf/scripts/dev-setup.sh << 'EOF'
#!/bin/bash

# Windsurf development setup script

echo "🌊 Setting up Windsurf development environment..."

# Start infrastructure
echo "📦 Starting Docker infrastructure..."
docker-compose -f docker/postgres-redis.docker-compose.yml up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 15

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Seed data
echo "🌱 Seeding test data..."
./scripts/seed-data.sh healthcare medium postgres

# Run initial tests
echo "🧪 Running initial tests..."
npm run test:unit

echo "✅ Development environment ready!"
echo "🚀 Use Ctrl+Shift+S to start infrastructure"
echo "🧪 Use Ctrl+Shift+T to run tests"
echo "🔧 Use F5 to start debugging"
EOF

chmod +x .windsurf/scripts/dev-setup.sh

cat > .windsurf/scripts/quick-test.sh << 'EOF'
#!/bin/bash

# Quick test script for Windsurf

echo "🏃‍♂️ Running quick Smart Search test..."

# Check if infrastructure is running
if ! docker-compose -f docker/postgres-redis.docker-compose.yml ps | grep -q "Up"; then
    echo "📦 Starting infrastructure..."
    docker-compose -f docker/postgres-redis.docker-compose.yml up -d
    sleep 15
fi

# Run a quick search test
node -e "
const { SmartSearch } = require('./dist/index.js');

const testSearch = async () => {
    const smartSearch = new SmartSearch({
        database: {
            type: 'postgres',
            connection: {
                host: 'localhost',
                port: 5432,
                database: 'smartsearch',
                user: 'smartsearch_user',
                password: 'smartsearch_password'
            }
        },
        cache: {
            type: 'redis',
            connection: {
                host: 'localhost',
                port: 6379
            }
        }
    });
    
    try {
        const results = await smartSearch.search('heart disease');
        console.log('✅ Search test passed:', results.data.length, 'results');
    } catch (error) {
        console.error('❌ Search test failed:', error.message);
    }
};

testSearch();
"
EOF

chmod +x .windsurf/scripts/quick-test.sh

log_success "Terminal scripts created"

# Step 9: Final configuration
log_info "Step 9: Final Windsurf configuration..."

# Create README for Windsurf integration
cat > WINDSURF-README.md << 'EOF'
# Smart Search - Windsurf IDE Integration

This Smart Search project is optimized for development with Windsurf IDE.

## Quick Start

1. **Open in Windsurf**: Open this directory in Windsurf IDE
2. **Auto Setup**: Configuration will be loaded automatically
3. **Start Development**: Use `Ctrl+Shift+S` to start infrastructure

## Smart Features

### 🎯 Code Snippets
- `ss-basic` - Basic Smart Search setup
- `ss-healthcare` - HIPAA-compliant configuration
- `ss-ecommerce` - E-commerce product search
- `ss-react` - React component with Smart Search

### ⌨️ Keyboard Shortcuts
- `Ctrl+Shift+S` - Start Infrastructure
- `Ctrl+Shift+T` - Run Tests
- `Ctrl+Shift+E` - E2E Tests
- `Ctrl+Shift+B` - Performance Benchmark
- `Ctrl+Shift+D` - Seed Test Data
- `F5` - Start Debugging

### 🧪 Debugging
Pre-configured debug configurations for:
- Node.js application debugging
- Unit test debugging
- E2E test debugging
- Performance profiling

### 📊 Dashboard
Open `.windsurf/dashboard.html` for a visual overview of your development environment.

## File Structure
```
.windsurf/
├── settings.json       # IDE settings
├── snippets/           # Code snippets
├── launch.json         # Debug configurations
├── tasks.json          # Development tasks
├── keybindings.json    # Keyboard shortcuts
└── dashboard.html      # Development dashboard
```

## Commands
All Smart Search commands are available with intelligent autocomplete and error handling.
EOF

echo ""
log_windsurf "🎉 WINDSURF SETUP COMPLETE! 🎉"
echo "==============================="
log_success "Smart Search is now optimized for Windsurf IDE!"
echo ""
echo "🌊 Windsurf Features Enabled:"
echo "   ✅ Intelligent code snippets and autocomplete"
echo "   ✅ Smart debugging configurations"
echo "   ✅ Automated development tasks"
echo "   ✅ Performance monitoring integration"
echo "   ✅ Custom keyboard shortcuts"
echo "   ✅ Visual development dashboard"
echo ""
echo "🚀 Quick Start:"
echo "   1. Open this project in Windsurf IDE"
echo "   2. Press Ctrl+Shift+S to start infrastructure"
echo "   3. Press Ctrl+Shift+D to seed test data"
echo "   4. Press F5 to start debugging"
echo ""
echo "🎯 Code Snippets Available:"
echo "   📝 ss-basic      # Basic Smart Search setup"
echo "   🏥 ss-healthcare # HIPAA-compliant configuration"
echo "   🛒 ss-ecommerce  # E-commerce product search"
echo "   ⚛️  ss-react     # React component integration"
echo ""
echo "📊 Resources:"
echo "   📖 WINDSURF-README.md         # Complete guide"
echo "   🎛️  .windsurf/dashboard.html   # Visual dashboard"
echo "   ⚙️  .windsurf/settings.json    # IDE configuration"
echo ""
log_success "Ready for intelligent Smart Search development! 🌊🚀"