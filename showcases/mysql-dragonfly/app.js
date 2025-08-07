/**
 * @samas/smart-search - MySQL + DragonflyDB Showcase
 * Demonstrates universal search capabilities with MySQL database and DragonflyDB cache
 */

const { SmartSearchFactory } = require('../../dist/index.js');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SmartSearch (in a real implementation, this would connect to actual services)
let smartSearch;

async function initializeSearch() {
    try {
        console.log('🚀 Initializing Smart Search with MySQL + DragonflyDB...');
        
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
            type: 'analysis',
            title: 'Portfolio Optimization Strategies for Institutional Investors',
            author: 'Sarah Mitchell, CFA',
            description: 'Comprehensive analysis of modern portfolio theory applications, risk-adjusted returns, and asset allocation strategies for institutional investment management.',
            category: 'Investment Management',
            language: 'en',
            createdAt: '2024-01-15T10:00:00Z',
            relevanceScore: 95
        },
        {
            id: '2', 
            type: 'report',
            title: 'Credit Risk Assessment in Commercial Banking',
            author: 'Michael Chen, FRM',
            description: 'Advanced methodologies for credit risk modeling, default probability estimation, and regulatory compliance in commercial lending operations.',
            category: 'Risk Management',
            language: 'en',
            createdAt: '2024-01-10T14:30:00Z',
            relevanceScore: 88
        },
        {
            id: '3',
            type: 'research', 
            title: 'Cryptocurrency Market Analysis and Regulatory Framework',
            author: 'Dr. Emily Rodriguez',
            description: 'In-depth examination of digital asset markets, blockchain technology adoption, and evolving regulatory landscape for cryptocurrency investments.',
            category: 'Digital Assets',
            language: 'en',
            createdAt: '2024-01-08T09:15:00Z',
            relevanceScore: 92
        },
        {
            id: '4',
            type: 'guide',
            title: 'ESG Investing: Environmental, Social, and Governance Criteria',
            author: 'James Park, CAIA',
            description: 'Complete guide to sustainable investing practices, ESG scoring methodologies, and impact measurement for responsible investment strategies.',
            category: 'Sustainable Finance',
            language: 'en',
            createdAt: '2024-01-05T16:45:00Z',
            relevanceScore: 85
        },
        {
            id: '5',
            type: 'analysis',
            title: 'Interest Rate Derivatives and Hedging Strategies',
            author: 'Lisa Thompson, CFA',
            description: 'Advanced derivatives strategies for interest rate risk management, including swaps, options, and futures in volatile market conditions.',
            category: 'Derivatives',
            language: 'en',
            createdAt: '2024-01-03T11:20:00Z',
            relevanceScore: 80
        },
        {
            id: '6',
            type: 'compliance',
            title: 'Anti-Money Laundering (AML) Compliance Framework',
            author: 'David Kim, CAMS',
            description: 'Comprehensive AML compliance procedures, suspicious activity monitoring, and regulatory reporting requirements for financial institutions.',
            category: 'Regulatory Compliance',
            language: 'en',
            createdAt: '2024-01-02T08:30:00Z',
            relevanceScore: 87
        },
        {
            id: '7',
            type: 'research',
            title: 'Quantitative Trading Algorithms and Market Microstructure',
            author: 'Dr. Robert Taylor',
            description: 'Statistical arbitrage strategies, high-frequency trading algorithms, and market microstructure analysis for algorithmic trading systems.',
            category: 'Quantitative Finance',
            language: 'en',
            createdAt: '2024-01-01T13:15:00Z',
            relevanceScore: 83
        },
        {
            id: '8',
            type: 'guide',
            title: 'Corporate Finance: M&A Valuation and Due Diligence',
            author: 'Jennifer Liu, CPA',
            description: 'Merger and acquisition valuation techniques, financial due diligence processes, and deal structuring considerations for corporate transactions.',
            category: 'Corporate Finance',
            language: 'en',
            createdAt: '2023-12-28T11:45:00Z',
            relevanceScore: 89
        },
        {
            id: '9',
            type: 'analysis',
            title: 'Central Bank Digital Currencies (CBDC) Impact Assessment',
            author: 'Dr. Mark Anderson',
            description: 'Analysis of central bank digital currency implementations, monetary policy implications, and financial system transformation effects.',
            category: 'Monetary Policy',
            language: 'en',
            createdAt: '2023-12-25T16:20:00Z',
            relevanceScore: 86
        },
        {
            id: '10',
            type: 'report',
            title: 'Real Estate Investment Trusts (REITs) Performance Analysis',
            author: 'Amanda Foster, CCIM',
            description: 'Comprehensive REIT sector analysis, property valuation methodologies, and real estate market trends for institutional investors.',
            category: 'Real Estate Finance',
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