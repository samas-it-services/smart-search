/**
 * @samas/smart-search - SQLite + InMemory Showcase
 * Demonstrates universal search capabilities with SQLite database and InMemory cache
 */

const { SmartSearchFactory } = require('../../dist/index.js');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SmartSearch (in a real implementation, this would connect to actual services)
let smartSearch;

async function initializeSearch() {
    try {
        console.log('🚀 Initializing Smart Search with SQLite + InMemory...');
        
        // Note: Since we're using mock providers, this won't actually connect
        // In a real implementation, this would use actual database and cache connections
        console.log('📊 Using mock providers for demonstration');
        
        // Mock initialization
        smartSearch = {
            search: async (query, options) => {
                console.log(`🔍 Search query: "${query}"`);
                
                // Simulate search results based on query
                const mockResults = generateMockResults(query, options);
                
                return {
                    results: mockResults,
                    performance: {
                        searchTime: Math.random() * 50 + 10, // 10-60ms
                        resultCount: mockResults.length,
                        strategy: Math.random() > 0.2 ? 'cache' : 'database',
                        cacheHit: Math.random() > 0.2
                    },
                    strategy: {
                        primary: 'cache',
                        fallback: 'database',
                        reason: 'Cache is healthy and available'
                    }
                };
            },
            
            getSearchStats: async () => {
                return {
                    cacheHealth: {
                        isConnected: true,
                        isSearchAvailable: true,
                        latency: Math.random() * 5 + 1,
                        memoryUsage: '128MB',
                        keyCount: Math.floor(Math.random() * 1000) + 500,
                        errors: []
                    },
                    databaseHealth: {
                        isConnected: true,
                        isSearchAvailable: true,
                        latency: Math.random() * 20 + 5,
                        memoryUsage: '256MB',
                        keyCount: Math.floor(Math.random() * 100) + 50,
                        errors: []
                    },
                    circuitBreaker: {
                        isOpen: false,
                        failureCount: 0,
                        lastFailure: null,
                        nextRetryTime: null
                    },
                    recommendedStrategy: 'cache'
                };
            }
        };
        
        console.log('✅ Smart Search initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize Smart Search:', error);
        process.exit(1);
    }
}

// Generate mock search results based on query
function generateMockResults(query, options = {}) {
    const { limit = 20, offset = 0, filters = {} } = options;
    
    const sampleArticles = [
        {
            id: '1',
            type: 'article',
            title: 'Getting Started with PostgreSQL Full-Text Search',
            author: 'John Database',
            description: 'Learn how to implement powerful full-text search capabilities using PostgreSQL tsvector and tsquery with practical examples.',
            category: 'Database',
            language: 'en',
            createdAt: '2024-01-15T10:00:00Z',
            relevanceScore: 95
        },
        {
            id: '2', 
            type: 'article',
            title: 'Redis Caching Strategies for High Performance',
            author: 'Cache Expert',
            description: 'Explore advanced Redis caching patterns and strategies to optimize application performance and reduce database load.',
            category: 'Performance',
            language: 'en',
            createdAt: '2024-01-10T14:30:00Z',
            relevanceScore: 88
        },
        {
            id: '3',
            type: 'article', 
            title: 'Building Scalable Search with Smart Search',
            author: 'Search Engineer',
            description: 'Complete guide to building scalable search solutions using the Smart Search library with multiple database backends.',
            category: 'Architecture',
            language: 'en',
            createdAt: '2024-01-08T09:15:00Z',
            relevanceScore: 92
        },
        {
            id: '4',
            type: 'article',
            title: 'TypeScript Best Practices for Large Applications',
            author: 'TypeScript Pro',
            description: 'Learn advanced TypeScript patterns and best practices for building maintainable large-scale applications.',
            category: 'Programming',
            language: 'en',
            createdAt: '2024-01-05T16:45:00Z',
            relevanceScore: 85
        },
        {
            id: '5',
            type: 'article',
            title: 'Docker Container Performance Optimization',
            author: 'DevOps Engineer',
            description: 'Optimize Docker container performance with advanced techniques for resource management and orchestration.',
            category: 'DevOps',
            language: 'en',
            createdAt: '2024-01-03T11:20:00Z',
            relevanceScore: 80
        }
    ];
    
    // Filter results based on query
    const queryLower = query.toLowerCase();
    let filteredResults = sampleArticles.filter(article => 
        article.title.toLowerCase().includes(queryLower) ||
        article.description.toLowerCase().includes(queryLower) ||
        article.author.toLowerCase().includes(queryLower) ||
        article.category.toLowerCase().includes(queryLower)
    );
    
    // Apply category filter if provided
    if (filters.category && filters.category.length > 0) {
        filteredResults = filteredResults.filter(article => 
            filters.category.includes(article.category)
        );
    }
    
    // Apply language filter if provided
    if (filters.language && filters.language.length > 0) {
        filteredResults = filteredResults.filter(article => 
            filters.language.includes(article.language)
        );
    }
    
    // Sort by relevance score
    filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Apply pagination
    const paginatedResults = filteredResults.slice(offset, offset + limit);
    
    // Add match type based on where the query was found
    return paginatedResults.map(article => ({
        ...article,
        matchType: article.title.toLowerCase().includes(queryLower) ? 'title' :
                  article.author.toLowerCase().includes(queryLower) ? 'author' :
                  article.description.toLowerCase().includes(queryLower) ? 'description' : 'category'
    }));
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/search', async (req, res) => {
    try {
        const { q: query, limit, offset, category, language } = req.query;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query parameter "q" is required'
            });
        }
        
        const options = {
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0,
            filters: {}
        };
        
        if (category) {
            options.filters.category = Array.isArray(category) ? category : [category];
        }
        
        if (language) {
            options.filters.language = Array.isArray(language) ? language : [language];
        }
        
        const searchResult = await smartSearch.search(query, options);
        
        res.json({
            success: true,
            data: searchResult
        });
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await smartSearch.getSearchStats();
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'PostgreSQL + Redis Showcase'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found'
    });
});

// Start server
async function startServer() {
    await initializeSearch();
    
    app.listen(PORT, () => {
        console.log(`🌐 PostgreSQL + Redis showcase running at:`);
        console.log(`   http://localhost:${PORT}`);
        console.log(`   API: http://localhost:${PORT}/api/search?q=postgresql`);
        console.log(`   Stats: http://localhost:${PORT}/api/stats`);
        console.log('');
        console.log('📋 Available API endpoints:');
        console.log('   GET  /                          - Web interface');
        console.log('   GET  /api/search?q=<query>      - Search articles');
        console.log('   GET  /api/stats                 - System statistics');
        console.log('   GET  /api/health                - Health check');
        console.log('');
        console.log('🔍 Example searches:');
        console.log('   http://localhost:' + PORT + '/api/search?q=postgresql');
        console.log('   http://localhost:' + PORT + '/api/search?q=redis&category=Performance');
        console.log('   http://localhost:' + PORT + '/api/search?q=typescript&limit=5');
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Start the showcase
startServer().catch(error => {
    console.error('❌ Failed to start showcase:', error);
    process.exit(1);
});