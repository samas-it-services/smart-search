/**
 * @samas/smart-search - Supabase + Redis Healthcare Showcase
 * Real implementation using actual Supabase and Redis connections with healthcare data
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;

let SmartSearchFactory;
let SmartSearch;

// Try to load the SmartSearch library
try {
  // First try to load from built dist (Docker: /app/dist/, Local: ../../dist/)
  const smartSearchModule = require(process.env.NODE_ENV === 'production' ? '../dist/index.js' : '../../dist/index.js');
  SmartSearchFactory = smartSearchModule.SmartSearchFactory;
  SmartSearch = smartSearchModule.SmartSearch;
  console.log('✅ Loaded SmartSearch from built dist');
} catch (e) {
  try {
    // Fallback to npm package
    const smartSearchModule = require('@samas/smart-search');
    SmartSearchFactory = smartSearchModule.SmartSearchFactory;
    SmartSearch = smartSearchModule.SmartSearch;
    console.log('✅ Loaded SmartSearch from npm package');
  } catch (e2) {
    console.error('❌ Failed to load SmartSearch library:', e2.message);
    console.error('Make sure to build the library first: npm run build');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3003;

// Configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATA_SIZE = process.env.DATA_SIZE || 'tiny';

// Parse Supabase configuration
const supabaseConfig = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY
};

// Parse Redis URL
const redisUrl = new URL(REDIS_URL);
const redisConfig = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined
};

console.log('🔧 Configuration:');
console.log('   Supabase:', supabaseConfig.url);
console.log('   Redis:', `${redisConfig.host}:${redisConfig.port}`);
console.log('   Dataset Size:', DATA_SIZE);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SmartSearch instance
let smartSearch;

// Helper functions for dataset information
function getDatasetDisplayName(size) {
    const displayNames = {
        'tiny': 'Tiny Dataset (1K records)',
        'small': 'Small Dataset (10K records)', 
        'medium': 'Medium Dataset (100K records)',
        'large': 'Large Dataset (1M+ records)'
    };
    return displayNames[size] || displayNames['tiny'];
}

function getDatasetCounts(size) {
    const counts = {
        'tiny': { min: 500, max: 1500, display: '1K' },
        'small': { min: 8000, max: 12000, display: '10K' },
        'medium': { min: 80000, max: 120000, display: '100K' }, 
        'large': { min: 800000, max: 1200000, display: '1M+' }
    };
    return counts[size] || { min: 500, max: 1500, display: '1K' };
}

// SmartSearch configuration for healthcare data with Supabase
function createHealthcareConfig() {
    return {
        database: {
            type: 'supabase',
            connection: {
                url: supabaseConfig.url,
                key: supabaseConfig.key
            },
            options: {
                auth: {
                    autoRefreshToken: true,
                    persistSession: false
                }
            }
        },
        cache: {
            type: 'redis',
            connection: {
                host: redisConfig.host,
                port: redisConfig.port,
                password: redisConfig.password
            },
            options: {
                connectTimeout: 10000,
                lazyConnect: true,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3
            }
        },
        search: {
            tables: {
                healthcare_data: {
                    columns: {
                        id: 'id',
                        title: 'title',
                        description: 'description',
                        category: 'type',
                        createdAt: 'date_created'
                    },
                    searchColumns: ['title', 'description', 'condition_name', 'treatment', 'specialty'],
                    type: 'healthcare'
                }
            }
        },
        circuitBreaker: {
            failureThreshold: 3,
            recoveryTimeout: 30000,
            healthCacheMs: 5000
        },
        cacheConfig: {
            enabled: true,
            defaultTTL: 300000
        },
        performance: {
            enableMetrics: true,
            logQueries: false,
            slowQueryThreshold: 1000
        }
    };
}

async function waitForSupabaseConnection(maxAttempts = 10) {
    console.log('🔄 Waiting for Supabase connection...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const testConfig = createHealthcareConfig();
            const testSearch = SmartSearchFactory.fromConfig(testConfig);
            
            // Try to connect
            console.log(`🔗 Attempting Supabase connection ${attempt}/${maxAttempts} to ${testConfig.database.connection.url}`);
            await testSearch.connect();
            await testSearch.disconnect();
            
            console.log('✅ Supabase connection verified');
            return true;
        } catch (error) {
            console.error(`❌ Connection attempt ${attempt} failed:`, error.message);
            if (attempt % 3 === 0) {
                console.log(`🔄 Supabase connection attempt ${attempt}/${maxAttempts}`);
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    throw new Error(`Failed to connect to Supabase after ${maxAttempts} attempts`);
}

async function initializeSmartSearch() {
    try {
        console.log('🚀 Initializing SmartSearch with Supabase + Redis...');
        
        // Wait for Supabase to be ready
        await waitForSupabaseConnection();
        
        // Create configuration
        const config = createHealthcareConfig();
        console.log('📋 Database config type:', config.database.type);
        console.log('📋 Supabase URL:', config.database.connection.url);
        
        // Initialize SmartSearch using factory
        smartSearch = SmartSearchFactory.fromConfig(config);
        await smartSearch.connect();
        
        // Verify we can perform basic operations
        const stats = await smartSearch.getSearchStats();
        console.log('📊 SmartSearch initialized successfully:');
        console.log('   - Database connected:', stats.databaseHealth?.isConnected ? '✅' : '❌');
        console.log('   - Cache connected:', stats.cacheHealth?.isConnected ? '✅' : '❌');
        console.log('   - Search available:', stats.databaseHealth?.isSearchAvailable ? '✅' : '❌');
        
        // Test a simple query to verify data exists
        try {
            const testResult = await smartSearch.search('health', { limit: 1 });
            console.log(`📋 Data verification: ${testResult.results.length} results found`);
        } catch (error) {
            console.warn('⚠️ Data verification failed - database may be empty:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize SmartSearch:', error.message);
        throw error;
    }
}

// API Routes
app.get('/api/search', async (req, res) => {
    try {
        if (!smartSearch) {
            return res.status(503).json({
                success: false,
                error: 'SmartSearch is not initialized yet'
            });
        }

        const { q: query, limit = 20, category, strategy } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter "q" is required'
            });
        }

        const options = {
            limit: parseInt(limit),
            strategy: strategy || 'cache-first',
            filters: {}
        };

        if (category) {
            options.filters.category = Array.isArray(category) ? category : [category];
        }

        const result = await smartSearch.search(query, options);
        
        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed',
            details: error.message
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        if (!smartSearch) {
            return res.status(503).json({
                success: false,
                error: 'SmartSearch is not initialized yet'
            });
        }

        const stats = await smartSearch.getSearchStats();
        
        res.json({
            success: true,
            data: {
                ...stats,
                dataset: {
                    size: DATA_SIZE,
                    name: getDatasetDisplayName(DATA_SIZE),
                    counts: getDatasetCounts(DATA_SIZE)
                }
            }
        });

    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats',
            details: error.message
        });
    }
});

app.get('/api/health', async (req, res) => {
    const health = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Supabase + Redis Healthcare Showcase',
        dataset: {
            size: DATA_SIZE,
            name: getDatasetDisplayName(DATA_SIZE)
        }
    };

    // Check if SmartSearch is initialized
    if (!smartSearch) {
        health.status = 'initializing';
        health.message = 'SmartSearch is starting up';
        return res.status(503).json(health);
    }

    try {
        // Get detailed health information
        const stats = await smartSearch.getSearchStats();
        health.connections = {
            supabase: {
                connected: stats.databaseHealth?.isConnected || false,
                latency: stats.databaseHealth?.latency || 0,
                searchAvailable: stats.databaseHealth?.isSearchAvailable || false
            },
            redis: {
                connected: stats.cacheHealth?.isConnected || false,
                latency: stats.cacheHealth?.latency || 0,
                memoryUsage: stats.cacheHealth?.memoryUsage || 'N/A',
                keyCount: stats.cacheHealth?.keyCount || 0
            }
        };

        res.json(health);

    } catch (error) {
        health.status = 'unhealthy';
        health.error = error.message;
        res.status(500).json(health);
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
async function startServer() {
    try {
        console.log('🏥 Starting Supabase + Redis Healthcare Showcase...');
        
        await initializeSmartSearch();
        
        app.listen(PORT, () => {
            console.log(`✅ SmartSearch initialized successfully`);
            console.log(`🌐 Supabase + Redis showcase running at:`);
            console.log(`   http://localhost:${PORT}`);
            console.log(`   API: http://localhost:${PORT}/api/search?q=diabetes`);
            console.log(`   Stats: http://localhost:${PORT}/api/stats`);
            console.log('');
            console.log('📋 Available API endpoints:');
            console.log('   GET  /                          - Web interface');
            console.log('   GET  /api/search?q=<query>      - Search articles');
            console.log('   GET  /api/stats                 - System statistics');
            console.log('   GET  /api/health                - Health check');
            console.log('');
            console.log('🔍 Example searches:');
            console.log(`   http://localhost:${PORT}/api/search?q=diabetes`);
            console.log(`   http://localhost:${PORT}/api/search?q=heart&category=cardiology`);
            console.log(`   http://localhost:${PORT}/api/search?q=cancer&limit=5`);
        });

    } catch (error) {
        console.error('💥 Failed to start healthcare showcase:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Ensure Supabase is running and accessible');
        console.error('   2. Ensure Redis is running and accessible');
        console.error('   3. Verify database has been seeded with healthcare data');
        console.error('   4. Check that SmartSearch library is built (npm run build)');
        console.error('   5. Verify Supabase URL and anon key are correct');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    if (smartSearch) {
        await smartSearch.disconnect();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    if (smartSearch) {
        await smartSearch.disconnect();
    }
    process.exit(0);
});

startServer();