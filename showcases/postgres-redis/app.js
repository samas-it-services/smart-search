/**
 * @samas/smart-search - PostgreSQL + Redis Showcase
 * Demonstrates universal search capabilities with PostgreSQL database and Redis cache
 */

// Try to load from built dist first, fallback to npm package
let SmartSearchFactory;
try {
  SmartSearchFactory = require('../../dist/index.js').SmartSearchFactory;
} catch (e) {
  try {
    SmartSearchFactory = require('@samas/smart-search').SmartSearchFactory;
  } catch (e2) {
    // Fallback for Docker builds - create a mock implementation
    SmartSearchFactory = {
      fromEnvironment: () => ({
        search: async (query) => {
          // Generate realistic healthcare search results based on query
          const getHealthcareResults = (searchQuery) => {
            const results = [];
            const queryLower = searchQuery.toLowerCase();
            
            // Healthcare research results
            if (queryLower.includes('medical research') || queryLower.includes('research')) {
              results.push(
                {
                  id: 'research-1',
                  title: 'Advanced Medical Research Initiative - COVID-19 Treatment Studies',
                  description: 'Comprehensive research on novel COVID-19 treatments involving 15,000 patients across 50 medical centers. Current Phase III trials showing promising results.',
                  url: '/research/covid-treatment-initiative',
                  type: 'research',
                  score: 0.96,
                  matchType: 'title',
                  relevanceScore: 0.96,
                  metadata: { source: 'postgresql', cached: false, specialty: 'Infectious Disease', participants: '15,000' }
                },
                {
                  id: 'research-2', 
                  title: 'Cancer Research Breakthrough - Immunotherapy Protocols',
                  description: 'Latest medical research on personalized immunotherapy for lung cancer patients. Multi-center clinical trial results from 23 oncology research institutes.',
                  url: '/research/cancer-immunotherapy',
                  type: 'research',
                  score: 0.94,
                  matchType: 'description', 
                  relevanceScore: 0.94,
                  metadata: { source: 'redis', cached: true, specialty: 'Oncology', centers: '23' }
                }
              );
            }
            
            // Diabetes-related results
            if (queryLower.includes('diabetes')) {
              results.push(
                {
                  id: 'diabetes-1',
                  title: 'Type 2 Diabetes Management Guidelines - Evidence-Based Protocols',
                  description: 'Latest evidence-based protocols for Type 2 diabetes management including medication algorithms, lifestyle interventions, and monitoring procedures.',
                  url: '/guidelines/diabetes-management',
                  type: 'guidelines',
                  score: 0.98,
                  matchType: 'title',
                  relevanceScore: 0.98,
                  metadata: { source: 'postgresql', cached: false, condition: 'Type 2 Diabetes', specialty: 'Endocrinology' }
                },
                {
                  id: 'diabetes-2',
                  title: 'Diabetic Retinopathy Screening Programs - National Healthcare Initiative', 
                  description: 'Comprehensive screening protocols for diabetic retinopathy prevention and early detection in primary care settings.',
                  url: '/screening/diabetic-retinopathy',
                  type: 'screening',
                  score: 0.92,
                  matchType: 'description',
                  relevanceScore: 0.92,
                  metadata: { source: 'redis', cached: true, condition: 'Diabetic Retinopathy', specialty: 'Ophthalmology' }
                }
              );
            }
            
            // Cardiac surgery results
            if (queryLower.includes('cardiac') || queryLower.includes('surgery')) {
              results.push(
                {
                  id: 'cardiac-1',
                  title: 'Minimally Invasive Cardiac Surgery Techniques - Advanced Procedures',
                  description: 'State-of-the-art minimally invasive cardiac surgery procedures including robotic-assisted techniques and patient outcomes analysis.',
                  url: '/procedures/cardiac-surgery',
                  type: 'procedures',
                  score: 0.97,
                  matchType: 'title',
                  relevanceScore: 0.97,
                  metadata: { source: 'postgresql', cached: false, specialty: 'Cardiothoracic Surgery', procedure_type: 'Minimally Invasive' }
                }
              );
            }
            
            // Mental health results
            if (queryLower.includes('mental') || queryLower.includes('psychology')) {
              results.push(
                {
                  id: 'mental-1',
                  title: 'Mental Health Treatment Protocols - Integrated Care Approach',
                  description: 'Comprehensive mental health treatment protocols integrating pharmacotherapy, psychotherapy, and community support services.',
                  url: '/protocols/mental-health',
                  type: 'protocols',
                  score: 0.95,
                  matchType: 'title',
                  relevanceScore: 0.95,
                  metadata: { source: 'redis', cached: true, specialty: 'Psychiatry', approach: 'Integrated Care' }
                }
              );
            }
            
            // Immunotherapy results
            if (queryLower.includes('immunotherapy') || queryLower.includes('immune')) {
              results.push(
                {
                  id: 'immuno-1',
                  title: 'CAR-T Cell Immunotherapy Protocols - Advanced Cancer Treatment',
                  description: 'Chimeric Antigen Receptor T-cell therapy protocols for treating various blood cancers with personalized immunotherapy approaches.',
                  url: '/treatments/car-t-therapy',
                  type: 'treatments',
                  score: 0.96,
                  matchType: 'title',
                  relevanceScore: 0.96,
                  metadata: { source: 'postgresql', cached: false, specialty: 'Hematology-Oncology', treatment_type: 'CAR-T Cell Therapy' }
                }
              );
            }
            
            // Default general results if no specific matches
            if (results.length === 0) {
              results.push(
                {
                  id: 'general-1',
                  title: `Healthcare Guidelines for "${searchQuery}"`,
                  description: `Comprehensive medical guidelines and protocols related to ${searchQuery} from leading healthcare institutions.`,
                  url: `/general/${searchQuery.replace(/\s+/g, '-')}`,
                  type: 'guidelines',
                  score: 0.85,
                  matchType: 'title',
                  relevanceScore: 0.85,
                  metadata: { source: 'postgresql', cached: false, specialty: 'General Medicine' }
                }
              );
            }
            
            return results.slice(0, 3); // Return top 3 results
          };
          
          return {
            results: getHealthcareResults(query),
            performance: {
              searchTime: Math.floor(Math.random() * 50) + 10,
              resultCount: 2,
              strategy: 'database',
              cacheHit: false,
              totalTime: Math.floor(Math.random() * 100) + 20
            },
            strategy: {
              primary: 'database',
              fallback: 'cache',
              reason: 'Mock implementation for Docker showcase'
            }
          };
        },
        getSearchStats: async () => ({
          cacheHealth: {
            isConnected: true,
            isSearchAvailable: true,
            latency: 15,
            keyCount: 1250,
            memoryUsage: '45MB',
            hitRate: 0.87
          },
          databaseHealth: {
            isConnected: true, 
            isSearchAvailable: true,
            latency: 35,
            connectionCount: 8,
            queryCount: 2847
          },
          circuitBreaker: {
            isOpen: false,
            failureCount: 0,
            state: 'CLOSED'
          },
          recommendedStrategy: 'cache'
        })
      })
    };
  }
}
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/smartsearch';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATA_SIZE = process.env.DATA_SIZE || 'medium';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SmartSearch (in a real implementation, this would connect to actual services)
let smartSearch;

// Helper functions for dataset information
function getDatasetDisplayName(size) {
    const displayNames = {
        'tiny': 'Tiny Dataset',
        'small': 'Small Dataset', 
        'medium': 'Medium Dataset',
        'large': 'Large Dataset'
    };
    return displayNames[size] || 'Medium Dataset';
}

function getEstimatedRecordCount(size) {
    const recordCounts = {
        'tiny': '1,000',
        'small': '10,000',
        'medium': '100,000', 
        'large': '1,000,000+'
    };
    return recordCounts[size] || '100,000';
}

async function initializeSearch() {
    try {
        console.log('🚀 Initializing Smart Search with PostgreSQL + Redis...');
        
        // Note: Since we're using mock providers, this won't actually connect
        // In a real implementation, this would use actual database and cache connections
        console.log('📊 Using mock providers for demonstration');
        
        // Mock initialization with multiple search strategies
        smartSearch = {
            search: async (query, options) => {
                console.log(`🔍 Search query: "${query}"`);
                const strategy = options?.strategy || 'cache-first';
                
                // Simulate search results based on query
                const mockResults = generateMockResults(query, options);
                
                // Strategy-specific performance and behavior
                let performance, strategyInfo;
                
                switch (strategy) {
                    case 'cache-first':
                        performance = {
                            searchTime: Math.random() * 20 + 10, // 10-30ms (fast cache)
                            resultCount: mockResults.length,
                            strategy: 'cache',
                            cacheHit: true,
                            totalTime: Math.random() * 25 + 15,
                            source: 'redis'
                        };
                        strategyInfo = {
                            primary: 'cache',
                            fallback: 'database',
                            reason: 'Cache is healthy and available - using Redis for optimal speed',
                            circuitBreakerState: 'CLOSED'
                        };
                        break;
                        
                    case 'database-only':
                        performance = {
                            searchTime: Math.random() * 40 + 40, // 40-80ms (slower database)
                            resultCount: mockResults.length,
                            strategy: 'database',
                            cacheHit: false,
                            totalTime: Math.random() * 50 + 50,
                            source: 'postgresql'
                        };
                        strategyInfo = {
                            primary: 'database',
                            fallback: 'none',
                            reason: 'Direct database query - bypassing cache for real-time data',
                            circuitBreakerState: 'N/A'
                        };
                        break;
                        
                    case 'circuit-breaker':
                        // Simulate circuit breaker scenario (cache failed, using database)
                        performance = {
                            searchTime: Math.random() * 80 + 100, // 100-180ms (slower due to failover)
                            resultCount: mockResults.length,
                            strategy: 'database',
                            cacheHit: false,
                            totalTime: Math.random() * 90 + 120,
                            source: 'postgresql',
                            failoverReason: 'Cache unavailable - circuit breaker activated'
                        };
                        strategyInfo = {
                            primary: 'cache',
                            fallback: 'database',
                            reason: 'Circuit breaker OPEN - Cache failed, using database fallback',
                            circuitBreakerState: 'OPEN',
                            failureCount: Math.floor(Math.random() * 5) + 3,
                            nextRetry: new Date(Date.now() + 30000).toISOString()
                        };
                        break;
                        
                    case 'hybrid':
                        // Simulate intelligent routing based on query complexity
                        const isComplexQuery = query.length > 20 || query.includes('AND') || query.includes('OR');
                        if (isComplexQuery) {
                            performance = {
                                searchTime: Math.random() * 30 + 50, // 50-80ms (database for complex)
                                resultCount: mockResults.length,
                                strategy: 'database',
                                cacheHit: false,
                                totalTime: Math.random() * 40 + 60,
                                source: 'postgresql',
                                routingReason: 'Complex query routed to database'
                            };
                            strategyInfo = {
                                primary: 'hybrid',
                                fallback: 'database',
                                reason: 'Complex query detected - routed to database for accuracy',
                                circuitBreakerState: 'CLOSED'
                            };
                        } else {
                            performance = {
                                searchTime: Math.random() * 15 + 8, // 8-23ms (cache for simple)
                                resultCount: mockResults.length,
                                strategy: 'cache',
                                cacheHit: true,
                                totalTime: Math.random() * 20 + 12,
                                source: 'redis',
                                routingReason: 'Simple query routed to cache'
                            };
                            strategyInfo = {
                                primary: 'hybrid',
                                fallback: 'database',
                                reason: 'Simple query detected - routed to cache for speed',
                                circuitBreakerState: 'CLOSED'
                            };
                        }
                        break;
                        
                    default:
                        // Default to cache-first
                        performance = {
                            searchTime: Math.random() * 20 + 10,
                            resultCount: mockResults.length,
                            strategy: 'cache',
                            cacheHit: true,
                            totalTime: Math.random() * 25 + 15,
                            source: 'redis'
                        };
                        strategyInfo = {
                            primary: 'cache',
                            fallback: 'database',
                            reason: 'Default cache-first strategy',
                            circuitBreakerState: 'CLOSED'
                        };
                }
                
                // Add strategy-specific metadata to results
                const enhancedResults = mockResults.map(result => ({
                    ...result,
                    metadata: {
                        ...result.metadata,
                        source: performance.source,
                        cached: performance.cacheHit,
                        strategy: strategy,
                        responseTime: performance.searchTime
                    }
                }));
                
                return {
                    results: enhancedResults,
                    performance,
                    strategy: strategyInfo
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

// Generate comprehensive healthcare search results based on query
function generateMockResults(query, options = {}) {
    const { limit = 20, offset = 0, filters = {} } = options;
    const queryLower = query.toLowerCase();
    const results = [];
    
    // Healthcare research results
    if (queryLower.includes('medical research') || queryLower.includes('research')) {
        results.push(
            {
                id: 'research-1',
                type: 'research',
                title: 'Advanced Medical Research Initiative - COVID-19 Treatment Studies',
                author: 'Dr. Sarah Chen',
                description: 'Comprehensive research on novel COVID-19 treatments involving 15,000 patients across 50 medical centers. Current Phase III trials showing promising results.',
                category: 'Infectious Disease',
                language: 'en',
                createdAt: '2024-01-15T10:00:00Z',
                relevanceScore: 96,
                matchType: 'title',
                metadata: { source: 'postgresql', cached: false, specialty: 'Infectious Disease', participants: '15,000' }
            },
            {
                id: 'research-2', 
                type: 'research',
                title: 'Cancer Research Breakthrough - Immunotherapy Protocols',
                author: 'Dr. Lisa Kumar',
                description: 'Latest medical research on personalized immunotherapy for lung cancer patients. Multi-center clinical trial results from 23 oncology research institutes.',
                category: 'Oncology',
                language: 'en',
                createdAt: '2024-01-10T14:30:00Z',
                relevanceScore: 94,
                matchType: 'description',
                metadata: { source: 'redis', cached: true, specialty: 'Oncology', centers: '23' }
            }
        );
    }
    
    // Diabetes-related results
    if (queryLower.includes('diabetes')) {
        results.push(
            {
                id: 'diabetes-1',
                type: 'guidelines',
                title: 'Type 2 Diabetes Management Guidelines - Evidence-Based Protocols',
                author: 'Dr. Michael Rodriguez',
                description: 'Latest evidence-based protocols for Type 2 diabetes management including medication algorithms, lifestyle interventions, and monitoring procedures.',
                category: 'Endocrinology',
                language: 'en',
                createdAt: '2024-01-08T09:15:00Z',
                relevanceScore: 98,
                matchType: 'title',
                metadata: { source: 'postgresql', cached: false, condition: 'Type 2 Diabetes', specialty: 'Endocrinology' }
            },
            {
                id: 'diabetes-2',
                type: 'screening',
                title: 'Diabetic Retinopathy Screening Programs - National Healthcare Initiative', 
                author: 'Dr. Emily Watson',
                description: 'Comprehensive screening protocols for diabetic retinopathy prevention and early detection in primary care settings.',
                category: 'Ophthalmology',
                language: 'en',
                createdAt: '2024-01-05T16:45:00Z',
                relevanceScore: 92,
                matchType: 'description',
                metadata: { source: 'redis', cached: true, condition: 'Diabetic Retinopathy', specialty: 'Ophthalmology' }
            }
        );
    }
    
    // Cardiac surgery results
    if (queryLower.includes('cardiac') || queryLower.includes('surgery')) {
        results.push(
            {
                id: 'cardiac-1',
                type: 'procedures',
                title: 'Minimally Invasive Cardiac Surgery Techniques - Advanced Procedures',
                author: 'Dr. James Park',
                description: 'State-of-the-art minimally invasive cardiac surgery procedures including robotic-assisted techniques and patient outcomes analysis.',
                category: 'Cardiothoracic Surgery',
                language: 'en',
                createdAt: '2024-01-03T11:20:00Z',
                relevanceScore: 97,
                matchType: 'title',
                metadata: { source: 'postgresql', cached: false, specialty: 'Cardiothoracic Surgery', procedure_type: 'Minimally Invasive' }
            }
        );
    }
    
    // Mental health results
    if (queryLower.includes('mental') || queryLower.includes('psychology')) {
        results.push(
            {
                id: 'mental-1',
                type: 'protocols',
                title: 'Mental Health Treatment Protocols - Integrated Care Approach',
                author: 'Dr. Amanda Foster',
                description: 'Comprehensive mental health treatment protocols integrating pharmacotherapy, psychotherapy, and community support services.',
                category: 'Psychiatry',
                language: 'en',
                createdAt: '2024-01-01T13:15:00Z',
                relevanceScore: 95,
                matchType: 'title',
                metadata: { source: 'redis', cached: true, specialty: 'Psychiatry', approach: 'Integrated Care' }
            }
        );
    }
    
    // Immunotherapy results
    if (queryLower.includes('immunotherapy') || queryLower.includes('immune')) {
        results.push(
            {
                id: 'immuno-1',
                type: 'treatments',
                title: 'CAR-T Cell Immunotherapy Protocols - Advanced Cancer Treatment',
                author: 'Dr. Robert Thompson',
                description: 'Chimeric Antigen Receptor T-cell therapy protocols for treating various blood cancers with personalized immunotherapy approaches.',
                category: 'Hematology-Oncology',
                language: 'en',
                createdAt: '2023-12-28T11:45:00Z',
                relevanceScore: 96,
                matchType: 'title',
                metadata: { source: 'postgresql', cached: false, specialty: 'Hematology-Oncology', treatment_type: 'CAR-T Cell Therapy' }
            }
        );
    }
    
    // Additional comprehensive healthcare results for common searches
    const additionalResults = [
        {
            id: 'general-1',
            type: 'study',
            title: 'MRI Imaging Analysis for Early Alzheimer Detection',
            author: 'Dr. Emily Watson',
            description: 'Machine learning approaches to analyze MRI scans for early detection of Alzheimer disease biomarkers and cognitive decline.',
            category: 'Neurology',
            language: 'en',
            createdAt: '2024-01-08T09:15:00Z',
            relevanceScore: 92
        },
        {
            id: 'general-2',
            type: 'guidelines',
            title: 'Infection Control Protocols in Healthcare Settings',
            author: 'Dr. David Miller',
            description: 'Comprehensive infection prevention and control measures for healthcare facilities, including antibiotic stewardship programs.',
            category: 'Infectious Disease',
            language: 'en',
            createdAt: '2024-01-02T08:30:00Z',
            relevanceScore: 87
        },
        {
            id: 'general-3',
            type: 'research',
            title: 'Telemedicine Implementation in Rural Healthcare',
            author: 'Dr. Jennifer Liu',
            description: 'Analysis of telemedicine program effectiveness in rural healthcare delivery, patient satisfaction, and clinical outcomes.',
            category: 'Digital Health',
            language: 'en',
            createdAt: '2023-12-25T16:20:00Z',
            relevanceScore: 86
        }
    ];
    
    // Add general results if no specific matches or if query matches broadly
    additionalResults.forEach(article => {
        if (article.title.toLowerCase().includes(queryLower) ||
            article.description.toLowerCase().includes(queryLower) ||
            article.author.toLowerCase().includes(queryLower) ||
            article.category.toLowerCase().includes(queryLower)) {
            results.push({
                ...article,
                matchType: article.title.toLowerCase().includes(queryLower) ? 'title' :
                          article.author.toLowerCase().includes(queryLower) ? 'author' :
                          article.description.toLowerCase().includes(queryLower) ? 'description' : 'category'
            });
        }
    });
    
    // Default general results if no specific matches
    if (results.length === 0) {
        results.push({
            id: 'default-1',
            type: 'guidelines',
            title: `Healthcare Guidelines for "${query}"`,
            author: 'Dr. General Practitioner',
            description: `Comprehensive medical guidelines and protocols related to ${query} from leading healthcare institutions.`,
            category: 'General Medicine',
            language: 'en',
            createdAt: '2024-01-01T12:00:00Z',
            relevanceScore: 85,
            matchType: 'title'
        });
    }
    
    // Apply category filter if provided
    let filteredResults = results;
    if (filters.category && filters.category.length > 0) {
        filteredResults = results.filter(article => 
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
    
    return paginatedResults.slice(0, 3); // Return top 3 results
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/search', async (req, res) => {
    try {
        const { q: query, limit, offset, category, language, strategy } = req.query;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query parameter "q" is required'
            });
        }
        
        const options = {
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0,
            strategy: strategy || 'cache-first', // Default strategy
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
        
        // Add dataset size information
        const datasetInfo = {
            size: DATA_SIZE,
            name: getDatasetDisplayName(DATA_SIZE),
            estimatedRecords: getEstimatedRecordCount(DATA_SIZE)
        };
        
        res.json({
            success: true,
            data: {
                ...stats,
                dataset: datasetInfo
            }
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            dataset: {
                size: DATA_SIZE,
                name: getDatasetDisplayName(DATA_SIZE),
                estimatedRecords: getEstimatedRecordCount(DATA_SIZE)
            }
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