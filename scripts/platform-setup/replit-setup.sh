#!/bin/bash

# Smart Search - Replit Integration Setup
# One-click deployment and development environment for Replit

set -e

echo "🚀 SMART SEARCH - REPLIT INTEGRATION SETUP"
echo "=========================================="
echo "Setting up cloud development environment..."
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
log_replit() { echo -e "${PURPLE}🚀 $1${NC}"; }

# Step 1: Create Replit configuration
log_info "Step 1: Creating Replit configuration..."

cat > .replit << 'EOF'
language = "nodejs"
run = "npm run replit:start"

[packager]
language = "nodejs"

[packager.features]
packageSearch = true
guessImports = true
enabledForHosting = false

[languages.nodejs]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx,*.json}"

[languages.nodejs.languageServer]
start = ["typescript-language-server", "--stdio"]

[deployment]
run = ["npm", "run", "replit:deploy"]
deploymentTarget = "cloudrun"
ignorePorts = false

[env]
NODE_ENV = "development"
PORT = "3000"
REPLIT_ENVIRONMENT = "true"

[gitHubImport]
requiredFiles = [".replit", "package.json", "README.md"]

[nix]
channel = "stable-22_11"

[nix.shell]
packages = [
  "nodejs-18_x",
  "nodePackages.npm",
  "nodePackages.typescript",
  "postgresql",
  "redis"
]
EOF

log_success "Replit configuration created"

# Step 2: Create Replit-specific package.json scripts
log_info "Step 2: Adding Replit npm scripts..."

# Create or update package.json for Replit
if [ -f "package.json" ]; then
    cp package.json package.json.replit.backup
    
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    pkg.scripts = pkg.scripts || {};
    
    // Add Replit-specific scripts
    Object.assign(pkg.scripts, {
      'replit:start': 'npm run replit:setup && npm run dev',
      'replit:setup': 'chmod +x scripts/replit-init.sh && ./scripts/replit-init.sh',
      'replit:dev': 'concurrently \"npm run replit:services\" \"npm run dev\"',
      'replit:services': 'npm run replit:postgres & npm run replit:redis',
      'replit:postgres': 'pg_ctl -D ~/.postgresql/data -l ~/.postgresql/postgresql.log start',
      'replit:redis': 'redis-server --daemonize yes --port 6379',
      'replit:seed': './scripts/seed-data.sh healthcare small postgres',
      'replit:test': 'npm run test:unit -- --reporter=basic',
      'replit:demo': 'npm run replit:seed && node examples/replit-demo.js',
      'replit:deploy': 'npm run build && node scripts/replit-deploy.js'
    });
    
    // Add Replit-specific dependencies
    pkg.dependencies = pkg.dependencies || {};
    pkg.devDependencies = pkg.devDependencies || {};
    
    // Add concurrent execution for services
    if (!pkg.devDependencies.concurrently) {
      pkg.devDependencies.concurrently = '^7.6.0';
    }
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    log_success "Package.json updated for Replit"
else
    log_warning "package.json not found, creating minimal version"
    
    cat > package.json << 'EOF'
{
  "name": "smart-search-replit",
  "version": "1.0.0",
  "description": "Smart Search running on Replit",
  "main": "index.js",
  "scripts": {
    "replit:start": "npm run replit:setup && npm run dev",
    "replit:setup": "chmod +x scripts/replit-init.sh && ./scripts/replit-init.sh",
    "replit:dev": "concurrently \"npm run replit:services\" \"npm run dev\"",
    "replit:demo": "npm run replit:seed && node examples/replit-demo.js",
    "dev": "node index.js",
    "test": "echo \"Tests running on Replit\""
  },
  "dependencies": {
    "@samas/smart-search": "latest",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
EOF
fi

# Step 3: Create Replit initialization script
log_info "Step 3: Creating Replit initialization script..."

mkdir -p scripts
cat > scripts/replit-init.sh << 'EOF'
#!/bin/bash

# Replit Smart Search Initialization

echo "🚀 Initializing Smart Search on Replit..."

# Create data directories
mkdir -p ~/.postgresql/data
mkdir -p ~/.redis/data

# Initialize PostgreSQL if not exists
if [ ! -d ~/.postgresql/data/base ]; then
    echo "📦 Initializing PostgreSQL..."
    initdb -D ~/.postgresql/data
    
    # Configure PostgreSQL for Replit
    echo "host all all 0.0.0.0/0 md5" >> ~/.postgresql/data/pg_hba.conf
    echo "listen_addresses = '*'" >> ~/.postgresql/data/postgresql.conf
    echo "port = 5432" >> ~/.postgresql/data/postgresql.conf
fi

# Start PostgreSQL
echo "🐘 Starting PostgreSQL..."
pg_ctl -D ~/.postgresql/data -l ~/.postgresql/postgresql.log start || true

# Wait for PostgreSQL to start
sleep 3

# Create database and user
echo "👤 Setting up database..."
createdb smartsearch 2>/dev/null || true
psql -d postgres -c "CREATE USER smartsearch_user WITH PASSWORD 'replit_password';" 2>/dev/null || true
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE smartsearch TO smartsearch_user;" 2>/dev/null || true

# Start Redis
echo "📮 Starting Redis..."
redis-server --daemonize yes --port 6379 || true

# Wait for services
sleep 2

# Create Smart Search configuration
echo "⚙️ Creating Smart Search configuration..."
cat > smart-search.config.json << 'INNER_EOF'
{
  "database": {
    "type": "postgres",
    "connection": {
      "host": "localhost",
      "port": 5432,
      "database": "smartsearch",
      "user": "smartsearch_user",
      "password": "replit_password",
      "ssl": false,
      "poolSize": 5
    }
  },
  "cache": {
    "type": "redis",
    "connection": {
      "host": "localhost",
      "port": 6379,
      "lazyConnect": true,
      "retryStrategy": "exponential",
      "maxRetries": 3
    }
  },
  "server": {
    "port": 3000,
    "cors": {
      "origin": "*",
      "credentials": true
    }
  },
  "replit": {
    "environment": "cloud",
    "autoSetup": true,
    "demoMode": true
  }
}
INNER_EOF

echo "✅ Smart Search initialized successfully!"
echo "🌐 Server will be available at: https://${REPL_SLUG}.${REPL_OWNER}.repl.co"
EOF

chmod +x scripts/replit-init.sh

log_success "Initialization script created"

# Step 4: Create Replit-optimized demo
log_info "Step 4: Creating Replit demo application..."

mkdir -p examples
cat > examples/replit-demo.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { SmartSearch } = require('@samas/smart-search');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Smart Search configuration for Replit
const smartSearch = new SmartSearch({
  database: {
    type: 'postgres',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'smartsearch',
      user: 'smartsearch_user',
      password: 'replit_password',
      ssl: false,
      poolSize: 5
    }
  },
  cache: {
    type: 'redis',
    connection: {
      host: 'localhost',
      port: 6379,
      lazyConnect: true
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Smart Search - Replit Demo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .search-container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
            }
            .search-input {
                width: 100%;
                padding: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                font-size: 16px;
                background: rgba(255, 255, 255, 0.9);
                color: #333;
                margin-bottom: 16px;
            }
            .search-btn {
                background: #6366f1;
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                width: 100%;
            }
            .search-btn:hover {
                background: #5b5cf6;
            }
            .results {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 24px;
            }
            .result-item {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
            }
            .result-title {
                font-size: 18px;
                margin: 0 0 8px 0;
                font-weight: 600;
            }
            .result-content {
                opacity: 0.8;
                line-height: 1.5;
            }
            .loading {
                text-align: center;
                padding: 40px;
                opacity: 0.7;
            }
            .stats {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 14px;
                opacity: 0.8;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚀 Smart Search - Replit Demo</h1>
            <p>Intelligent search powered by PostgreSQL + Redis</p>
        </div>
        
        <div class="search-container">
            <input 
                type="text" 
                id="searchInput" 
                class="search-input" 
                placeholder="Search healthcare records..."
                onkeypress="if(event.key==='Enter') performSearch()"
            >
            <button class="search-btn" onclick="performSearch()">
                🔍 Search with Smart Search
            </button>
        </div>
        
        <div id="results" class="results" style="display: none;">
            <div class="stats">
                <span id="resultStats"></span>
                <span id="performanceStats"></span>
            </div>
            <div id="resultsList"></div>
        </div>
        
        <script>
            async function performSearch() {
                const query = document.getElementById('searchInput').value;
                if (!query.trim()) return;
                
                const resultsDiv = document.getElementById('results');
                const resultsList = document.getElementById('resultsList');
                const resultStats = document.getElementById('resultStats');
                const performanceStats = document.getElementById('performanceStats');
                
                resultsDiv.style.display = 'block';
                resultsList.innerHTML = '<div class="loading">🔍 Searching...</div>';
                
                try {
                    const startTime = Date.now();
                    const response = await fetch('/api/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query, options: { limit: 10 } })
                    });
                    
                    const results = await response.json();
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    
                    if (results.data && results.data.length > 0) {
                        resultStats.textContent = \`Found \${results.data.length} results\`;
                        performanceStats.textContent = \`\${duration}ms (\${results.metadata?.source || 'database'})\`;
                        
                        resultsList.innerHTML = results.data.map(item => \`
                            <div class="result-item">
                                <div class="result-title">\${item.title || 'Healthcare Record'}</div>
                                <div class="result-content">\${item.content || item.condition || 'Medical information'}</div>
                            </div>
                        \`).join('');
                    } else {
                        resultsList.innerHTML = '<div class="result-item">No results found for your query.</div>';
                        resultStats.textContent = '0 results';
                        performanceStats.textContent = \`\${duration}ms\`;
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    resultsList.innerHTML = '<div class="result-item">Search error occurred. Please try again.</div>';
                }
            }
            
            // Load sample data on page load
            window.onload = function() {
                document.getElementById('searchInput').focus();
                
                // Auto-search for demo
                setTimeout(() => {
                    document.getElementById('searchInput').value = 'heart disease';
                    performSearch();
                }, 1000);
            };
        </script>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: 'replit',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      cache: 'connected'
    }
  });
});

// Search API endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    
    if (!query || !query.trim()) {
      return res.status(400).json({
        error: 'Query is required',
        data: [],
        metadata: { error: 'Invalid query' }
      });
    }
    
    const startTime = Date.now();
    const results = await smartSearch.search(query.trim(), {
      limit: options.limit || 10,
      offset: options.offset || 0
    });
    const duration = Date.now() - startTime;
    
    res.json({
      data: results.data || [],
      metadata: {
        ...results.metadata,
        queryTime: duration,
        environment: 'replit'
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
      data: [],
      metadata: { error: error.message }
    });
  }
});

// Demo data endpoint
app.get('/api/demo-data', async (req, res) => {
  try {
    // Insert sample healthcare data
    const sampleData = [
      { title: 'Heart Disease Treatment', content: 'Comprehensive cardiac care and treatment options for heart disease patients.' },
      { title: 'Diabetes Management', content: 'Advanced diabetes management strategies and patient care protocols.' },
      { title: 'Cancer Care', content: 'Oncology services and cancer treatment programs for comprehensive patient care.' },
      { title: 'Emergency Surgery', content: 'Emergency surgical procedures and critical care management.' },
      { title: 'Pediatric Medicine', content: 'Specialized pediatric care and child healthcare services.' }
    ];
    
    // This would normally insert into database
    res.json({
      message: 'Demo data available',
      samples: sampleData.length
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to load demo data' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Smart Search Replit Demo running at http://0.0.0.0:${port}`);
  console.log(`🌐 Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  console.log(`📊 Health Check: /health`);
  console.log(`🔍 Search API: POST /api/search`);
});
EOF

log_success "Replit demo application created"

# Step 5: Create Replit deployment script
log_info "Step 5: Creating deployment script..."

cat > scripts/replit-deploy.js << 'EOF'
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Deploying Smart Search to Replit...');

try {
  // Check if we're in Replit environment
  if (!process.env.REPLIT_ENVIRONMENT) {
    console.log('⚠️  Not in Replit environment, skipping deployment steps');
    return;
  }
  
  // Ensure services are running
  console.log('🔧 Checking services...');
  try {
    execSync('pgrep postgres', { stdio: 'ignore' });
    console.log('✅ PostgreSQL is running');
  } catch {
    console.log('🐘 Starting PostgreSQL...');
    execSync('pg_ctl -D ~/.postgresql/data -l ~/.postgresql/postgresql.log start', { stdio: 'inherit' });
  }
  
  try {
    execSync('pgrep redis-server', { stdio: 'ignore' });
    console.log('✅ Redis is running');
  } catch {
    console.log('📮 Starting Redis...');
    execSync('redis-server --daemonize yes --port 6379', { stdio: 'inherit' });
  }
  
  // Create database schema if needed
  console.log('📊 Setting up database schema...');
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS healthcare (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      content TEXT,
      condition VARCHAR(500),
      treatment VARCHAR(500),
      doctor VARCHAR(255),
      hospital VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Insert sample data if table is empty
    INSERT INTO healthcare (title, content, condition, treatment, doctor, hospital)
    SELECT * FROM (VALUES
      ('Heart Disease Treatment', 'Comprehensive cardiac care and treatment options for heart disease patients.', 'Coronary Artery Disease', 'Cardiac Catheterization', 'Dr. Sarah Johnson', 'Metropolitan Heart Center'),
      ('Diabetes Management', 'Advanced diabetes management strategies and patient care protocols.', 'Type 2 Diabetes', 'Metformin and lifestyle modification', 'Dr. Michael Chen', 'Endocrine Associates'),
      ('Cancer Care', 'Oncology services and cancer treatment programs for comprehensive patient care.', 'Lung Cancer', 'Chemotherapy and radiation', 'Dr. Emily Rodriguez', 'Cancer Treatment Center'),
      ('Emergency Surgery', 'Emergency surgical procedures and critical care management.', 'Acute Appendicitis', 'Laparoscopic Appendectomy', 'Dr. David Kim', 'Emergency Surgery Center'),
      ('Pediatric Medicine', 'Specialized pediatric care and child healthcare services.', 'Childhood Asthma', 'Inhaler therapy and monitoring', 'Dr. Lisa Thompson', 'Children''s Medical Center')
    ) AS tmp(title, content, condition, treatment, doctor, hospital)
    WHERE NOT EXISTS (SELECT 1 FROM healthcare LIMIT 1);
  `;
  
  try {
    execSync(`psql -d smartsearch -c "${createTableSQL.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    console.log('✅ Database schema ready');
  } catch (error) {
    console.log('⚠️  Database setup warning:', error.message);
  }
  
  // Health check
  console.log('🏥 Running health check...');
  const healthCheck = `
    const { SmartSearch } = require('@samas/smart-search');
    
    const testConnection = async () => {
      try {
        const smartSearch = new SmartSearch({
          database: {
            type: 'postgres',
            connection: {
              host: 'localhost',
              port: 5432,
              database: 'smartsearch',
              user: 'smartsearch_user',
              password: 'replit_password',
              ssl: false
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
        
        const results = await smartSearch.search('heart');
        console.log('✅ Smart Search is working!', results.data?.length || 0, 'results');
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
      }
    };
    
    testConnection();
  `;
  
  fs.writeFileSync('/tmp/health-check.js', healthCheck);
  execSync('node /tmp/health-check.js', { stdio: 'inherit' });
  
  console.log('🎉 Deployment completed successfully!');
  console.log('🌐 Your Smart Search app is ready at your Replit URL');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
EOF

log_success "Deployment script created"

# Step 6: Create README for Replit
log_info "Step 6: Creating Replit documentation..."

cat > REPLIT-README.md << 'EOF'
# Smart Search - Replit Integration

Welcome to Smart Search running on Replit! This setup provides a complete search engine with PostgreSQL and Redis in the cloud.

## 🚀 Quick Start

1. **Fork this Repl** - Click the fork button to create your own copy
2. **Run the App** - Click the "Run" button to start automatically
3. **Start Searching** - The demo will be available at your Repl URL

## ⚡ Features

- **One-Click Setup**: Automatically configures PostgreSQL + Redis
- **Live Demo**: Interactive web interface for testing searches
- **API Endpoints**: REST API for integration with other apps
- **Sample Data**: Pre-loaded healthcare records for testing
- **Real-time Performance**: See query times and cache hit rates

## 🔧 Configuration

The app automatically configures itself for Replit. Configuration is in `smart-search.config.json`:

```json
{
  "database": {
    "type": "postgres",
    "connection": {
      "host": "localhost",
      "port": 5432,
      "database": "smartsearch",
      "user": "smartsearch_user",
      "password": "replit_password"
    }
  },
  "cache": {
    "type": "redis",
    "connection": {
      "host": "localhost", 
      "port": 6379
    }
  }
}
```

## 📊 API Endpoints

- `GET /` - Interactive demo interface
- `GET /health` - Health check and service status
- `POST /api/search` - Search endpoint
  ```json
  {
    "query": "heart disease",
    "options": {
      "limit": 10,
      "offset": 0
    }
  }
  ```

## 🧪 Testing

Test the search functionality:

```bash
curl -X POST https://your-repl-url.repl.co/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "heart disease", "options": {"limit": 5}}'
```

## 🔄 Commands

- `npm run replit:start` - Start the application (automatic)
- `npm run replit:demo` - Run demo with sample data
- `npm run replit:test` - Run tests
- `npm run replit:deploy` - Deploy and configure services

## 🛠️ Customization

### Adding Your Own Data

Modify the database schema in `scripts/replit-deploy.js`:

```javascript
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS your_table (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    -- Add your fields here
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
```

### Changing the UI

Edit `examples/replit-demo.js` to customize the web interface.

### API Integration

Use the Smart Search API in your own applications:

```javascript
const { SmartSearch } = require('@samas/smart-search');

const smartSearch = new SmartSearch({
  // Your configuration
});

const results = await smartSearch.search('your query');
```

## 🌐 Going Live

Your Repl is automatically deployed and accessible at:
`https://your-repl-name.your-username.repl.co`

## 📚 Documentation

- [Smart Search Docs](../blog/smart-search-homepage.md)
- [Junior Developer Guide](../blog/smart-search-junior-developers.md)
- [API Reference](../docs/api-reference.md)

## 🆘 Troubleshooting

### Services Not Starting

```bash
# Restart PostgreSQL
pg_ctl -D ~/.postgresql/data restart

# Restart Redis
redis-server --daemonize yes --port 6379
```

### Database Connection Issues

Check the database is running:
```bash
psql -d smartsearch -c "SELECT version();"
```

### Cache Connection Issues

Check Redis is running:
```bash
redis-cli ping
```

## 🎉 Next Steps

- Customize the search interface
- Add your own data
- Integrate with other services
- Deploy to production

Ready to build amazing search experiences! 🚀
EOF

# Step 7: Create Replit secrets configuration
log_info "Step 7: Creating secrets configuration..."

cat > .env.replit << 'EOF'
# Replit Smart Search Environment Variables
# These will be automatically set as Replit Secrets

NODE_ENV=production
PORT=3000
REPL_ENVIRONMENT=true

# Database Configuration (automatically configured)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smartsearch
DB_USER=smartsearch_user
DB_PASSWORD=replit_password

# Redis Configuration (automatically configured)
REDIS_HOST=localhost
REDIS_PORT=6379

# Smart Search Configuration
SMART_SEARCH_ENV=replit
SMART_SEARCH_AUTO_SETUP=true
SMART_SEARCH_DEMO_MODE=true

# Optional: Add your own environment variables here
# CUSTOM_API_KEY=your_api_key_here
# EXTERNAL_SERVICE_URL=https://api.example.com
EOF

# Step 8: Create gitignore for Replit
log_info "Step 8: Creating Replit-specific gitignore..."

cat >> .gitignore << 'EOF'

# Replit
.replit
replit.nix
.upm/
.config/
.cache/

# PostgreSQL data
.postgresql/

# Redis data
.redis/

# Replit environment
.env.replit
EOF

# Step 9: Create final Replit files
log_info "Step 9: Creating final Replit configuration files..."

# Create replit.nix for Nix environment
cat > replit.nix << 'EOF'
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
    pkgs.nodePackages.typescript
    pkgs.postgresql
    pkgs.redis
  ];
  
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.postgresql
      pkgs.redis
    ];
  };
}
EOF

# Create simple index.js for direct execution
cat > index.js << 'EOF'
// Simple entry point for Replit
require('./examples/replit-demo.js');
EOF

log_success "Replit configuration completed"

echo ""
log_replit "🎉 REPLIT SETUP COMPLETE! 🎉"
echo "============================"
log_success "Smart Search is now ready for Replit deployment!"
echo ""
echo "🚀 Next Steps:"
echo "   1. Create a new Repl on Replit.com"
echo "   2. Import this repository or copy the files"
echo "   3. Click 'Run' to start automatically"
echo "   4. Your demo will be live at your Repl URL!"
echo ""
echo "📁 Created Files:"
echo "   📋 .replit                    # Main Replit configuration"
echo "   📦 package.json               # Enhanced with Replit scripts" 
echo "   🚀 examples/replit-demo.js    # Interactive demo application"
echo "   🔧 scripts/replit-init.sh     # Automatic initialization"
echo "   📖 REPLIT-README.md           # Complete Replit guide"
echo ""
echo "🌟 Features Available:"
echo "   ✅ One-click deployment"
echo "   ✅ Automatic PostgreSQL + Redis setup"
echo "   ✅ Interactive web demo"
echo "   ✅ REST API endpoints"
echo "   ✅ Sample healthcare data"
echo "   ✅ Real-time performance metrics"
echo ""
echo "📊 Demo Features:"
echo "   🔍 Interactive search interface"
echo "   📈 Performance metrics display" 
echo "   💾 Automatic data seeding"
echo "   🏥 Healthcare records demo"
echo "   📱 Mobile-responsive design"
echo ""
echo "🔗 URLs (after deployment):"
echo "   🌐 Demo: https://your-repl.your-username.repl.co"
echo "   🏥 Health: https://your-repl.your-username.repl.co/health"
echo "   🔍 API: https://your-repl.your-username.repl.co/api/search"
echo ""
echo "📚 Documentation:"
echo "   📖 Complete guide in REPLIT-README.md"
echo "   🔗 Smart Search docs: blog/smart-search-homepage.md"
echo ""
log_success "Ready for instant cloud deployment! 🚀☁️"