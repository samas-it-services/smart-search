/**
 * @samas/smart-search - PostgreSQL + Redis Healthcare Showcase
 * Real implementation using actual database connections and seeded healthcare data
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
const PORT = process.env.PORT || 3002;

// Configuration from environment variables
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/smartsearch';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATA_SIZE = process.env.DATA_SIZE || 'tiny';
const SMART_SEARCH_CONFIG = process.env.SMART_SEARCH_CONFIG || '/app/config/providers/postgres-redis-healthcare.yaml';

// Parse database URL
const dbUrl = new URL(DATABASE_URL);
const dbConfig = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.substring(1),
  user: dbUrl.username,
  password: dbUrl.password
};

// Parse Redis URL
const redisUrl = new URL(REDIS_URL);
const redisConfig = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined
};

console.log('🔧 Configuration:');
console.log('   Database:', `${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
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
    return displayNames[size] || 'Unknown Dataset';
}

function getExpectedRecordCount(size) {
    const counts = {
        'tiny': { min: 500, max: 1500, display: '1K' },
        'small': { min: 8000, max: 12000, display: '10K' },
        'medium': { min: 80000, max: 120000, display: '100K' }, 
        'large': { min: 800000, max: 1200000, display: '1M+' }
    };
    return counts[size] || { min: 500, max: 1500, display: '1K' };
}

// SmartSearch configuration for healthcare data
function createHealthcareConfig() {
    return {
        database: {
            type: 'postgresql',
            connection: {
                host: dbConfig.host,
                port: dbConfig.port,
                database: dbConfig.database,
                user: dbConfig.user,
                password: dbConfig.password,
                ssl: false
            },
            pool: {
                max: 20,
                min: 2,
                idleTimeoutMillis: 30000
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
            fallback: 'database',
            tables: {
                healthcare_data: {
                    columns: {
                        id: 'id',
                        title: 'title',
                        subtitle: 'specialty',
                        description: 'description',
                        category: 'type',
                        language: 'language',
                        visibility: 'visibility', 
                        createdAt: 'date_created'
                    },
                    searchColumns: [
                        'title',
                        'description',
                        'condition_name',
                        'treatment',
                        'specialty'
                    ],
                    type: 'healthcare',
                    searchConfig: 'english',
                    weightConfig: {
                        'title': 'A',
                        'condition_name': 'A', 
                        'treatment': 'B',
                        'description': 'C',
                        'specialty': 'D'
                    },
                    autoCreateIndexes: true
                }
            }
        },
        circuitBreaker: {
            failureThreshold: 3,
            recoveryTimeout: 60000,
            healthCacheTTL: 30000
        },
        cache: {
            enabled: true,
            defaultTTL: 300000,
            maxSize: 10000
        },
        performance: {
            enableMetrics: true,
            logQueries: process.env.NODE_ENV === 'development',
            slowQueryThreshold: 1000
        }
    };
}

async function waitForDatabaseConnection(maxAttempts = 30) {
    console.log('🔄 Waiting for database connection...');
    console.log('🔍 DEBUG: SMART_SEARCH_CONFIG in waitForDatabaseConnection:', SMART_SEARCH_CONFIG);
    
    // Verify config file exists
    const fs = require('fs');
    const configExists = fs.existsSync(SMART_SEARCH_CONFIG);
    console.log(`🔍 DEBUG: Config file exists in waitForDatabaseConnection: ${configExists}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log('🔍 DEBUG: About to call SmartSearchFactory.fromConfig in waitForDatabaseConnection');
            let testSearch;
            try {
                testSearch = SmartSearchFactory.fromConfig(SMART_SEARCH_CONFIG);
                console.log('🔍 DEBUG: SmartSearch factory succeeded');
            } catch (factoryError) {
                console.error('🔍 DEBUG: SmartSearch factory failed:', factoryError.message);
                throw factoryError;
            }
            
            // Test the search functionality instead of connect/disconnect
            await testSearch.getSearchStats();
            
            console.log('✅ Database connection verified');
            return true;
        } catch (error) {
            console.error(`❌ Connection attempt ${attempt} failed:`, error.message);
            if (attempt % 5 === 0) {
                console.log(`🔄 Database connection attempt ${attempt}/${maxAttempts}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    throw new Error(`Failed to connect to database after ${maxAttempts} attempts`);
}

async function initializeSmartSearch() {
    try {
        console.log('🚀 Initializing SmartSearch with real PostgreSQL + Redis...');
        console.log('📋 Using config file:', SMART_SEARCH_CONFIG);
        
        // Verify config file exists before loading
        try {
            const fs = require('fs');
            const configExists = fs.existsSync(SMART_SEARCH_CONFIG);
            console.log(`🔍 Config file exists: ${configExists}`);
            if (configExists) {
                const configContent = fs.readFileSync(SMART_SEARCH_CONFIG, 'utf8');
                console.log(`🔍 Config file size: ${configContent.length} bytes`);
                console.log(`🔍 Config file preview: ${configContent.substring(0, 200)}...`);
            }
        } catch (error) {
            console.error('🔍 Error checking config file:', error.message);
        }
        
        // Wait for database to be ready (reduced attempts for faster testing)
        await waitForDatabaseConnection();
        
        // Initialize SmartSearch using factory with config file
        console.log('🔍 DEBUG: About to call SmartSearchFactory.fromConfig with:', SMART_SEARCH_CONFIG);
        smartSearch = SmartSearchFactory.fromConfig(SMART_SEARCH_CONFIG);
        
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
        
        return smartSearch;
        
    } catch (error) {
        console.error('❌ Failed to initialize SmartSearch:', error.message);
        throw error;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/search', async (req, res) => {
    try {
        const { q: query, limit, offset, page, category, language, strategy } = req.query;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Query parameter "q" is required and cannot be empty'
            });
        }

        if (!smartSearch) {
            return res.status(503).json({
                error: 'Search service is not initialized. Please wait for database connection.'
            });
        }
        
        // Parse parameters with pagination support
        const searchLimit = Math.min(parseInt(limit) || 20, 500); // Cap at 500 for performance
        const currentPage = Math.max(parseInt(page) || 1, 1);
        const searchOffset = offset ? parseInt(offset) : (currentPage - 1) * searchLimit;
        
        const options = {
            limit: searchLimit,
            offset: searchOffset,
            strategy: strategy || 'cache-first',
            filters: {}
        };
        
        // Add filters if provided
        if (category) {
            options.filters.category = Array.isArray(category) ? category : [category];
        }
        
        if (language) {
            options.filters.language = Array.isArray(language) ? language : [language];
        }
        
        console.log(`🔍 Search query: "${query}" (strategy: ${options.strategy}, limit: ${searchLimit}, page: ${currentPage})`);
        
        const startTime = Date.now();
        const searchResult = await smartSearch.search(query, options);
        const totalTime = Date.now() - startTime;
        
        console.log(`✅ Search completed in ${totalTime}ms, found ${searchResult.results.length} results`);
        
        // Add pagination metadata
        const totalResults = searchResult.metadata?.totalCount || searchResult.results.length;
        const totalPages = Math.ceil(totalResults / searchLimit);
        
        res.json({
            success: true,
            data: {
                ...searchResult,
                pagination: {
                    page: currentPage,
                    limit: searchLimit,
                    total: totalResults,
                    pages: totalPages,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1
                },
                metadata: {
                    ...searchResult.metadata,
                    totalQueryTime: totalTime,
                    dataset: {
                        size: DATA_SIZE,
                        name: getDatasetDisplayName(DATA_SIZE)
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Search error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        if (!smartSearch) {
            return res.status(503).json({
                success: false,
                error: 'Search service is not initialized'
            });
        }
        
        const stats = await smartSearch.getSearchStats();
        const expectedRecords = getExpectedRecordCount(DATA_SIZE);
        
        // Add dataset information
        const datasetInfo = {
            size: DATA_SIZE,
            name: getDatasetDisplayName(DATA_SIZE),
            expectedRecords: expectedRecords.display,
            expectedRange: `${expectedRecords.min.toLocaleString()} - ${expectedRecords.max.toLocaleString()}`
        };
        
        res.json({
            success: true,
            data: {
                ...stats,
                dataset: datasetInfo,
                connection: {
                    database: `${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
                    cache: `${redisConfig.host}:${redisConfig.port}`
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Stats error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            dataset: {
                size: DATA_SIZE,
                name: getDatasetDisplayName(DATA_SIZE),
                status: 'error'
            }
        });
    }
});

app.get('/api/health', async (req, res) => {
    const health = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'PostgreSQL + Redis Healthcare Showcase',
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
            database: {
                connected: stats.databaseHealth?.isConnected || false,
                searchAvailable: stats.databaseHealth?.isSearchAvailable || false,
                latency: stats.databaseHealth?.latency || -1
            },
            cache: {
                connected: stats.cacheHealth?.isConnected || false,
                searchAvailable: stats.cacheHealth?.isSearchAvailable || false,
                latency: stats.cacheHealth?.latency || -1
            }
        };

        // Determine overall health
        const dbHealthy = health.connections.database.connected && health.connections.database.searchAvailable;
        const cacheHealthy = health.connections.cache.connected;
        
        if (dbHealthy && cacheHealthy) {
            health.status = 'healthy';
        } else if (dbHealthy) {
            health.status = 'degraded';
            health.message = 'Database healthy, cache unavailable';
        } else {
            health.status = 'unhealthy';
            health.success = false;
            health.message = 'Database connection failed';
        }

        res.status(health.success ? 200 : 503).json(health);
        
    } catch (error) {
        health.success = false;
        health.status = 'error';
        health.error = error.message;
        res.status(500).json(health);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
async function startServer() {
    try {
        console.log('🏥 Starting PostgreSQL + Redis Healthcare Showcase...');
        console.log('🔍 DEBUG: SMART_SEARCH_CONFIG at startServer:', SMART_SEARCH_CONFIG);
        console.log('🔍 DEBUG: About to call initializeSmartSearch');
        
        // Initialize SmartSearch
        await initializeSmartSearch();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log('');
            console.log('🎉 Healthcare showcase is running!');
            console.log('');
            console.log('🌐 Access URLs:');
            console.log(`   • Showcase App: http://localhost:${PORT}`);
            console.log(`   • Health Check: http://localhost:${PORT}/api/health`);
            console.log(`   • Search API: http://localhost:${PORT}/api/search?q=diabetes`);
            console.log(`   • Stats API: http://localhost:${PORT}/api/stats`);
            console.log('');
            console.log('🔍 Try these healthcare searches:');
            console.log('   • http://localhost:' + PORT + '/api/search?q=diabetes');
            console.log('   • http://localhost:' + PORT + '/api/search?q=cardiac%20surgery');
            console.log('   • http://localhost:' + PORT + '/api/search?q=immunotherapy');
            console.log('   • http://localhost:' + PORT + '/api/search?q=mental%20health');
            console.log('');
            console.log('📊 Dataset Information:');
            console.log(`   • Size: ${getDatasetDisplayName(DATA_SIZE)}`);
            console.log(`   • Expected Records: ${getExpectedRecordCount(DATA_SIZE).display}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('💥 Failed to start healthcare showcase:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Ensure PostgreSQL is running and accessible');
        console.error('   2. Ensure Redis is running and accessible');
        console.error('   3. Verify database has been seeded with healthcare data');
        console.error('   4. Check that SmartSearch library is built (npm run build)');
        console.error('');
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
    
    try {
        if (smartSearch) {
            // SmartSearch doesn't have explicit disconnect, connections are managed internally
            console.log('✅ SmartSearch shutdown initiated');
        }
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
    }
    
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the showcase
startServer().catch(error => {
    console.error('💥 Fatal error starting server:', error);
    process.exit(1);
});