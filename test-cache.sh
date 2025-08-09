#!/bin/bash

# @samas/smart-search - Quick Redis Cache Test
# The simplest possible test to verify Redis cache is working

echo "🔍 Testing Redis Cache..."

# Test 1: Clear cache and search
echo "1. Clearing cache..."
docker exec smart-search-redis redis-cli FLUSHDB > /dev/null

echo "2. First search (cold):"
curl -s "http://localhost:3002/api/search?q=diabetes&limit=3" | jq '.data.performance | {searchTime, cacheHit}'

echo "3. Second search (should be cached):"
curl -s "http://localhost:3002/api/search?q=diabetes&limit=3" | jq '.data.performance | {searchTime, cacheHit}'

echo "4. Cache keys stored:"
docker exec smart-search-redis redis-cli KEYS "search:*" | wc -l

echo "✅ Test complete!"