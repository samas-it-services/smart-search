/**
 * @samas/smart-search - MongoDB + Memcached Showcase
 * Demonstrates universal search capabilities with MongoDB database and Memcached cache
 */

const { SmartSearchFactory } = require('../../dist/index.js');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SmartSearch (in a real implementation, this would connect to actual services)
let smartSearch;

async function initializeSearch() {
    try {
        console.log('🚀 Initializing Smart Search with MongoDB + Memcached...');
        
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
            type: 'strategy',
            title: 'Customer Analytics and Personalization in E-commerce',
            author: 'Sarah Johnson, CMO',
            description: 'Advanced customer segmentation techniques, behavioral analytics, and personalization strategies to increase conversion rates and customer lifetime value.',
            category: 'Customer Analytics',
            language: 'en',
            createdAt: '2024-01-15T10:00:00Z',
            relevanceScore: 95
        },
        {
            id: '2', 
            type: 'guide',
            title: 'Inventory Management Optimization for Retail Success',
            author: 'Michael Thompson, Operations Director',
            description: 'Comprehensive inventory forecasting models, demand planning strategies, and supply chain optimization techniques for retail businesses.',
            category: 'Inventory Management',
            language: 'en',
            createdAt: '2024-01-10T14:30:00Z',
            relevanceScore: 88
        },
        {
            id: '3',
            type: 'analysis', 
            title: 'Omnichannel Retail Strategy: Digital Transformation Success',
            author: 'Lisa Chen, Digital Strategist',
            description: 'Integration strategies for seamless online-offline customer experiences, unified inventory systems, and multichannel marketing approaches.',
            category: 'Digital Transformation',
            language: 'en',
            createdAt: '2024-01-08T09:15:00Z',
            relevanceScore: 92
        },
        {
            id: '4',
            type: 'research',
            title: 'Consumer Behavior Trends in Post-Pandemic Retail',
            author: 'Dr. Robert Kim, Market Researcher',
            description: 'Analysis of changing consumer shopping patterns, preference shifts, and emerging retail trends following the global pandemic.',
            category: 'Market Research',
            language: 'en',
            createdAt: '2024-01-05T16:45:00Z',
            relevanceScore: 85
        },
        {
            id: '5',
            type: 'guide',
            title: 'Product Recommendation Systems for E-commerce Platforms',
            author: 'Emma Davis, Data Scientist',
            description: 'Machine learning approaches to product recommendations, collaborative filtering algorithms, and personalized shopping experiences.',
            category: 'Personalization Technology',
            language: 'en',
            createdAt: '2024-01-03T11:20:00Z',
            relevanceScore: 80
        },
        {
            id: '6',
            type: 'strategy',
            title: 'Customer Service Excellence in Digital Retail Environment',
            author: 'James Wilson, Customer Success Manager',
            description: 'Best practices for customer support automation, chatbot implementation, and maintaining high service quality at scale.',
            category: 'Customer Service',
            language: 'en',
            createdAt: '2024-01-02T08:30:00Z',
            relevanceScore: 87
        },
        {
            id: '7',
            type: 'analysis',
            title: 'Supply Chain Resilience and Risk Management',
            author: 'Maria Rodriguez, Supply Chain Director',
            description: 'Strategies for building resilient supply chains, risk mitigation techniques, and supplier relationship management in volatile markets.',
            category: 'Supply Chain',
            language: 'en',
            createdAt: '2024-01-01T13:15:00Z',
            relevanceScore: 83
        },
        {
            id: '8',
            type: 'guide',
            title: 'Pricing Strategy Optimization for Competitive Advantage',
            author: 'David Park, Pricing Analyst',
            description: 'Dynamic pricing models, competitive analysis frameworks, and revenue optimization techniques for retail and e-commerce businesses.',
            category: 'Pricing Strategy',
            language: 'en',
            createdAt: '2023-12-28T11:45:00Z',
            relevanceScore: 89
        },
        {
            id: '9',
            type: 'research',
            title: 'Sustainable Retail Practices and Consumer Expectations',
            author: 'Dr. Jennifer Liu, Sustainability Expert',
            description: 'Environmental sustainability initiatives in retail, consumer demand for eco-friendly products, and corporate social responsibility impact.',
            category: 'Sustainability',
            language: 'en',
            createdAt: '2023-12-25T16:20:00Z',
            relevanceScore: 86
        },
        {
            id: '10',
            type: 'strategy',
            title: 'Mobile Commerce Optimization and User Experience Design',
            author: 'Alex Foster, UX Designer',
            description: 'Mobile-first design principles, conversion rate optimization for mobile platforms, and emerging mobile commerce technologies.',
            category: 'Mobile Commerce',
            language: 'en',
            createdAt: '2023-12-20T14:10:00Z',
            relevanceScore: 84
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