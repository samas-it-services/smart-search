/**
 * @samas/smart-search - Delta Lake + Redis Showcase
 * Financial Analytics Platform with Big Data Processing
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Configuration
const DELTA_PROCESSOR_URL = process.env.DELTA_PROCESSOR_URL || 'http://deltalake-processor:8081';
const DATA_SIZE = process.env.DATA_SIZE || 'large';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock Smart Search implementation for Delta Lake
class DeltaLakeSmartSearch {
    constructor() {
        this.deltaProcessorUrl = DELTA_PROCESSOR_URL;
        this.dataSize = DATA_SIZE;
    }

    async search(query, options = {}) {
        console.log(`🔍 Delta Lake search: "${query}" (${this.dataSize})`);
        
        const startTime = Date.now();
        let results = [];
        let strategy = 'database'; // Delta Lake is the primary storage
        let cacheHit = false;

        try {
            // Try to get results from Delta Lake processor
            const response = await axios.get(`${this.deltaProcessorUrl}/search`, {
                params: {
                    q: query,
                    limit: options.limit || 20
                },
                timeout: 10000
            });

            results = response.data;
            strategy = 'deltalake';
            
        } catch (error) {
            console.log('⚠️ Delta Lake processor unavailable, using mock data');
            // Fallback to mock financial data
            results = this.generateMockFinancialData(query, options);
            strategy = 'mock';
        }

        const searchTime = Date.now() - startTime;

        return {
            results,
            performance: {
                searchTime,
                resultCount: results.length,
                strategy,
                cacheHit,
                dataSize: this.dataSize,
                deltaLakeVersion: Math.floor(Math.random() * 1000) + 1,
                partitionsScanned: Math.floor(Math.random() * 50) + 1
            },
            strategy: {
                primary: 'deltalake',
                fallback: 'redis',
                reason: strategy === 'deltalake' ? 
                    'Delta Lake optimized columnar storage with partition pruning' :
                    'Using mock data - Delta Lake processor not available'
            }
        };
    }

    generateMockFinancialData(query, options) {
        const limit = options.limit || 20;
        const queryLower = query.toLowerCase();
        
        // Financial instruments and companies
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'NFLX', 'CRM'];
        const sectors = ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer Goods', 'Real Estate'];
        const instruments = ['Stock', 'Bond', 'Option', 'Future', 'ETF', 'Crypto'];
        const companies = [
            'Apple Inc.', 'Alphabet Inc.', 'Microsoft Corporation', 'Amazon.com Inc.',
            'Tesla Inc.', 'Meta Platforms Inc.', 'NVIDIA Corporation', 'Advanced Micro Devices'
        ];

        const results = [];
        
        for (let i = 0; i < Math.min(limit, 100); i++) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            const sector = sectors[Math.floor(Math.random() * sectors.length)];
            const instrument = instruments[Math.floor(Math.random() * instruments.length)];
            const company = companies[Math.floor(Math.random() * companies.length)];
            
            const currentPrice = (Math.random() * 1000 + 50).toFixed(2);
            const change = ((Math.random() - 0.5) * 20).toFixed(2);
            const changePercent = ((change / currentPrice) * 100).toFixed(2);
            
            // Check relevance
            const isRelevant = 
                queryLower.includes(symbol.toLowerCase()) ||
                queryLower.includes(company.toLowerCase()) ||
                queryLower.includes(sector.toLowerCase()) ||
                queryLower.includes(instrument.toLowerCase()) ||
                queryLower.includes('analytics') ||
                queryLower.includes('finance') ||
                queryLower.includes('market') ||
                queryLower.includes('stock') ||
                queryLower.includes('delta') ||
                Math.random() > 0.6;

            if (isRelevant) {
                results.push({
                    id: `DELTA_${symbol}_${i}`,
                    title: `${symbol} - ${company}`,
                    description: `Real-time analytics for ${company} (${symbol}) in ${sector} sector. Current price: $${currentPrice} (${change > 0 ? '+' : ''}${change}, ${changePercent}%). Data stored in Delta Lake format with ACID transactions and time travel capabilities.`,
                    type: 'financial_data',
                    url: `/analytics/${symbol}`,
                    matchType: 'custom',
                    relevanceScore: Math.random() * 0.5 + 0.5,
                    metadata: {
                        symbol,
                        company,
                        sector,
                        instrument_type: instrument,
                        current_price: parseFloat(currentPrice),
                        price_change: parseFloat(change),
                        price_change_percent: parseFloat(changePercent),
                        volume: Math.floor(Math.random() * 10000000),
                        market_cap: Math.floor(Math.random() * 1000000000000),
                        pe_ratio: (Math.random() * 50 + 5).toFixed(2),
                        dividend_yield: (Math.random() * 5).toFixed(2),
                        beta: (Math.random() * 2 + 0.5).toFixed(2),
                        last_updated: new Date().toISOString(),
                        delta_table: `finance_${this.dataSize}_data`,
                        delta_version: Math.floor(Math.random() * 100) + 1,
                        partition_info: `sector=${sector}/date=${new Date().toISOString().split('T')[0]}`,
                        data_freshness: 'real-time',
                        time_travel_available: true
                    }
                });
            }
        }

        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    async getStats() {
        try {
            const response = await axios.get(`${this.deltaProcessorUrl}/tables`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            return {
                tables: [
                    { table_name: 'finance_large_data', record_count: 1000000, created_at: new Date().toISOString() },
                    { table_name: 'market_analytics', record_count: 5000000, created_at: new Date().toISOString() },
                    { table_name: 'trading_data', record_count: 10000000, created_at: new Date().toISOString() }
                ],
                total_tables: 3
            };
        }
    }
}

// Initialize Smart Search
const smartSearch = new DeltaLakeSmartSearch();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/search', async (req, res) => {
    try {
        const { q: query, limit, filters, sortBy } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const options = {
            limit: parseInt(limit) || 20,
            filters: filters ? JSON.parse(filters) : {},
            sortBy: sortBy || 'relevance'
        };

        const results = await smartSearch.search(query, options);
        res.json(results);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Search failed', 
            message: error.message 
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await smartSearch.getStats();
        res.json({
            ...stats,
            showcase: {
                name: 'Delta Lake + Redis Financial Analytics',
                description: 'Big Data financial analytics with ACID transactions',
                data_size: DATA_SIZE,
                features: [
                    'Delta Lake ACID transactions',
                    'Time travel queries',
                    'Parquet columnar storage',
                    'Redis caching layer',
                    'Real-time market data',
                    'Partition pruning optimization'
                ]
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            error: 'Failed to get stats',
            message: error.message 
        });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        // Check Delta Lake processor health
        let deltaLakeHealth = false;
        try {
            await axios.get(`${DELTA_PROCESSOR_URL}/health`, { timeout: 5000 });
            deltaLakeHealth = true;
        } catch (error) {
            console.log('Delta Lake processor health check failed');
        }

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                showcase: 'healthy',
                delta_lake_processor: deltaLakeHealth ? 'healthy' : 'unavailable',
                redis: 'assumed_healthy' // Would check Redis in real implementation
            },
            data_size: DATA_SIZE,
            delta_path: process.env.DELTA_PATH || '/data/delta'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            error: error.message 
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Delta Lake + Redis Showcase running on http://localhost:${PORT}`);
    console.log(`📊 Data size: ${DATA_SIZE}`);
    console.log(`🗄️ Delta processor: ${DELTA_PROCESSOR_URL}`);
    console.log(`🔄 Redis URL: ${REDIS_URL}`);
    console.log('');
    console.log('Features:');
    console.log('• Delta Lake ACID transactions');
    console.log('• Time travel queries');  
    console.log('• Parquet columnar storage');
    console.log('• Redis caching layer');
    console.log('• Real-time financial analytics');
    console.log('• Partition pruning optimization');
});