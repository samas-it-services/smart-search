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
            type: 'research',
            title: 'Learning Management Systems: Implementation and Student Success',
            author: 'Dr. Sarah Williams, Ed.D',
            description: 'Comprehensive study on LMS implementation strategies, user adoption patterns, and measurable impacts on student learning outcomes in higher education.',
            category: 'Learning Technology',
            language: 'en',
            createdAt: '2024-01-15T10:00:00Z',
            relevanceScore: 95
        },
        {
            id: '2', 
            type: 'guide',
            title: 'Student Engagement Strategies in the Digital Classroom',
            author: 'Prof. Michael Chen, Ph.D',
            description: 'Evidence-based approaches to increase student participation and engagement through interactive digital tools and pedagogical techniques.',
            category: 'Curriculum Development',
            language: 'en',
            createdAt: '2024-01-10T14:30:00Z',
            relevanceScore: 88
        },
        {
            id: '3',
            type: 'analysis', 
            title: 'Assessment Strategies for Competency-Based Learning',
            author: 'Dr. Lisa Rodriguez, M.Ed',
            description: 'Modern assessment methodologies for measuring student competencies, including formative assessment techniques and outcome-based evaluation.',
            category: 'Student Assessment',
            language: 'en',
            createdAt: '2024-01-08T09:15:00Z',
            relevanceScore: 92
        },
        {
            id: '4',
            type: 'report',
            title: 'Higher Education Trends: Data-Driven Decision Making',
            author: 'James Park, Ph.D',
            description: 'Analytics and institutional research methodologies for improving student retention, academic performance, and institutional effectiveness.',
            category: 'Higher Education',
            language: 'en',
            createdAt: '2024-01-05T16:45:00Z',
            relevanceScore: 85
        },
        {
            id: '5',
            type: 'guide',
            title: 'Differentiated Instruction for K-12 Mathematics',
            author: 'Dr. Emma Thompson, M.Ed',
            description: 'Practical strategies for adapting mathematics instruction to meet diverse learning needs, including scaffolding techniques and multimodal approaches.',
            category: 'K-12 Education',
            language: 'en',
            createdAt: '2024-01-03T11:20:00Z',
            relevanceScore: 80
        },
        {
            id: '6',
            type: 'research',
            title: 'Cognitive Load Theory in Educational Psychology',
            author: 'Dr. Robert Kim, Ph.D',
            description: 'Application of cognitive load theory principles to instructional design, working memory considerations, and effective learning strategies.',
            category: 'Educational Psychology',
            language: 'en',
            createdAt: '2024-01-02T08:30:00Z',
            relevanceScore: 87
        },
        {
            id: '7',
            type: 'guide',
            title: 'Building Effective Online Learning Communities',
            author: 'Maria Davis, Ed.D',
            description: 'Best practices for fostering collaboration and community in distance learning environments, including social presence and engagement strategies.',
            category: 'Distance Learning',
            language: 'en',
            createdAt: '2024-01-01T13:15:00Z',
            relevanceScore: 83
        },
        {
            id: '8',
            type: 'analysis',
            title: 'Inclusive Education: Supporting Students with Learning Differences',
            author: 'Dr. Jennifer Liu, Ph.D',
            description: 'Evidence-based strategies for creating inclusive classrooms that support students with diverse learning needs and disabilities.',
            category: 'Special Education',
            language: 'en',
            createdAt: '2023-12-28T11:45:00Z',
            relevanceScore: 89
        },
        {
            id: '9',
            type: 'report',
            title: 'Educational Research Methods in the Digital Age',
            author: 'Dr. David Anderson, Ph.D',
            description: 'Modern research methodologies for education, including learning analytics, qualitative research techniques, and mixed-methods approaches.',
            category: 'Educational Research',
            language: 'en',
            createdAt: '2023-12-25T16:20:00Z',
            relevanceScore: 86
        },
        {
            id: '10',
            type: 'strategy',
            title: 'Professional Development for 21st Century Educators',
            author: 'Amanda Foster, M.Ed',
            description: 'Continuous learning strategies for educators, including technology integration, collaborative learning, and reflective practice methodologies.',
            category: 'Professional Development',
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
        service: 'SQLite + InMemory Showcase'
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
        console.log(`🌐 SQLite + InMemory showcase running at:`);
        console.log(`   http://localhost:${PORT}`);
        console.log(`   API: http://localhost:${PORT}/api/search?q=learning`);
        console.log(`   Stats: http://localhost:${PORT}/api/stats`);
        console.log('');
        console.log('📋 Available API endpoints:');
        console.log('   GET  /                          - Web interface');
        console.log('   GET  /api/search?q=<query>      - Search educational resources');
        console.log('   GET  /api/stats                 - System statistics');
        console.log('   GET  /api/health                - Health check');
        console.log('');
        console.log('🔍 Example searches:');
        console.log('   http://localhost:' + PORT + '/api/search?q=learning');
        console.log('   http://localhost:' + PORT + '/api/search?q=assessment&category=Student Assessment');
        console.log('   http://localhost:' + PORT + '/api/search?q=technology&limit=5');
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