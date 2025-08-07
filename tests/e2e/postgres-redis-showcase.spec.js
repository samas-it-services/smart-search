// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('PostgreSQL + Redis Showcase', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the showcase
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Ensure the search input is visible
    await expect(page.locator('#searchInput')).toBeVisible();
  });

  test('Homepage loads correctly', async ({ page }) => {
    // Check title and main elements
    await expect(page).toHaveTitle(/Smart Search Showcase/);
    await expect(page.locator('h1')).toContainText('Smart Search Showcase');
    await expect(page.locator('p')).toContainText('PostgreSQL + Redis');
    
    // Take screenshot for blog post
    await page.screenshot({ 
      path: 'screenshots/blog/homepage-overview.png',
      fullPage: true
    });
  });

  test('Search functionality works', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    const searchBtn = page.locator('#searchBtn');
    const resultsContainer = page.locator('#resultsContainer');

    // Perform a search
    await searchInput.fill('postgresql');
    await searchBtn.click();

    // Wait for results
    await page.waitForSelector('.result-item', { timeout: 10000 });
    
    // Verify search results appear
    const resultItems = page.locator('.result-item');
    const count = await resultItems.count();
    expect(count).toBeGreaterThan(0);
    
    // Check result structure
    const firstResult = resultItems.first();
    await expect(firstResult.locator('.result-title')).toBeVisible();
    await expect(firstResult.locator('.result-meta')).toBeVisible();
    await expect(firstResult.locator('.result-description')).toBeVisible();
    
    // Take screenshot of search results
    await page.screenshot({ 
      path: 'screenshots/blog/search-results-postgresql.png',
      fullPage: true
    });
  });

  test('Real-time search with different queries', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    const resultsCount = page.locator('#resultsCount');
    
    // Test different search queries
    const searchQueries = [
      { query: 'redis', expectedTerms: ['redis', 'cache'] },
      { query: 'typescript', expectedTerms: ['typescript', 'javascript'] },
      { query: 'docker', expectedTerms: ['docker', 'container'] },
      { query: 'performance', expectedTerms: ['performance', 'optimization'] }
    ];

    for (const { query, expectedTerms } of searchQueries) {
      await searchInput.fill(query);
      await page.locator('#searchBtn').click();
      
      // Wait for results to load
      await page.waitForFunction(
        () => !document.getElementById('resultsContainer')?.innerHTML.includes('Searching...'),
        { timeout: 10000 }
      );
      
      // Check that results contain expected terms
      const resultsText = await page.locator('#resultsContainer').textContent();
      const hasExpectedTerms = expectedTerms.some(term => 
        resultsText?.toLowerCase().includes(term.toLowerCase())
      );
      expect(hasExpectedTerms).toBeTruthy();
      
      // Verify results count is updated
      await expect(resultsCount).toContainText(`Found`);
      await expect(resultsCount).toContainText(`results for "${query}"`);
    }

    // Take screenshot showing the last search
    await page.screenshot({ 
      path: 'screenshots/blog/search-performance-query.png',
      fullPage: true
    });
  });

  test('Filtering functionality', async ({ page }) => {
    // Perform initial search
    await page.locator('#searchInput').fill('database');
    await page.locator('#searchBtn').click();
    await page.waitForSelector('.result-item');

    // Test category filter
    await page.selectOption('#categoryFilter', 'Database');
    await page.waitForFunction(
      () => !document.getElementById('resultsContainer')?.innerHTML.includes('Searching...'),
      { timeout: 10000 }
    );
    
    // Verify filtered results
    const categoryTags = page.locator('.category-tag');
    const tagCount = await categoryTags.count();
    if (tagCount > 0) {
      for (let i = 0; i < Math.min(tagCount, 3); i++) {
        await expect(categoryTags.nth(i)).toContainText('Database');
      }
    }

    // Test results per page filter
    await page.selectOption('#limitFilter', '10');
    await page.waitForFunction(
      () => !document.getElementById('resultsContainer')?.innerHTML.includes('Searching...'),
      { timeout: 10000 }
    );

    // Take screenshot showing filters in action
    await page.screenshot({ 
      path: 'screenshots/blog/search-filters-applied.png',
      fullPage: true
    });
  });

  test('Performance metrics display', async ({ page }) => {
    // Perform a search to generate metrics
    await page.locator('#searchInput').fill('redis performance');
    await page.locator('#searchBtn').click();
    await page.waitForSelector('.result-item');

    // Check performance info display
    const performanceInfo = page.locator('#performanceInfo');
    await expect(performanceInfo).toBeVisible();
    await expect(performanceInfo).toContainText('ms'); // Response time
    
    // Check stats section
    const statsSection = page.locator('#statsSection');
    await expect(statsSection).toBeVisible();
    
    // Verify stat cards are present
    const statCards = page.locator('.stat-card');
    const statCount = await statCards.count();
    expect(statCount).toBeGreaterThanOrEqual(3);
    
    // Check specific metrics
    await expect(statCards.first()).toContainText('Cache Health');
    
    // Take screenshot of performance metrics
    await page.screenshot({ 
      path: 'screenshots/blog/performance-metrics.png',
      fullPage: true
    });
  });

  test('Mobile responsiveness', async ({ page, browserName }) => {
    // Skip webkit on mobile due to potential issues
    test.skip(browserName === 'webkit', 'Skipping webkit mobile test');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Perform search on mobile
    await page.locator('#searchInput').fill('mobile search');
    await page.locator('#searchBtn').click();
    await page.waitForSelector('.result-item', { timeout: 10000 });
    
    // Verify mobile layout
    const searchSection = page.locator('.search-section');
    await expect(searchSection).toBeVisible();
    
    // Check that search form is properly stacked on mobile
    const searchForm = page.locator('.search-form');
    const boundingBox = await searchForm.boundingBox();
    expect(boundingBox?.width).toBeLessThan(400);
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'screenshots/blog/mobile-responsive-search.png',
      fullPage: true
    });
  });

  test('API endpoints work correctly', async ({ page, request }) => {
    // Test search API endpoint
    const searchResponse = await request.get('/api/search?q=postgresql&limit=5');
    expect(searchResponse.ok()).toBeTruthy();
    
    const searchData = await searchResponse.json();
    expect(searchData.success).toBe(true);
    expect(searchData.data).toHaveProperty('results');
    expect(searchData.data).toHaveProperty('performance');
    expect(searchData.data.results.length).toBeGreaterThan(0);
    expect(searchData.data.results.length).toBeLessThanOrEqual(5);

    // Test stats API endpoint
    const statsResponse = await request.get('/api/stats');
    expect(statsResponse.ok()).toBeTruthy();
    
    const statsData = await statsResponse.json();
    expect(statsData.success).toBe(true);
    expect(statsData.data).toHaveProperty('cacheHealth');
    expect(statsData.data).toHaveProperty('databaseHealth');
    expect(statsData.data.cacheHealth).toHaveProperty('latency');

    // Test health endpoint
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData.success).toBe(true);
    expect(healthData.status).toBe('healthy');
  });

  test('Error handling and empty states', async ({ page }) => {
    // Test empty search
    await page.locator('#searchInput').fill('');
    await page.locator('#searchBtn').click();
    
    // Should not perform search with empty query
    await expect(page.locator('#resultsContainer')).not.toContainText('Searching...');

    // Test search with no results
    await page.locator('#searchInput').fill('xyznonexistentquery12345');
    await page.locator('#searchBtn').click();
    await page.waitForFunction(
      () => !document.getElementById('resultsContainer')?.innerHTML.includes('Searching...'),
      { timeout: 10000 }
    );
    
    // Should show no results message
    await expect(page.locator('#resultsContainer')).toContainText('No results found');
    
    // Take screenshot of empty state
    await page.screenshot({ 
      path: 'screenshots/blog/no-results-empty-state.png',
      fullPage: true
    });
  });

  test('Search highlighting and metadata', async ({ page }) => {
    // Perform search with specific term
    await page.locator('#searchInput').fill('typescript programming');
    await page.locator('#searchBtn').click();
    await page.waitForSelector('.result-item');

    // Check if highlighting exists (if implemented)
    const resultTitles = page.locator('.result-title');
    const firstTitle = await resultTitles.first().innerHTML();
    
    // Verify result metadata
    const resultMeta = page.locator('.result-meta').first();
    await expect(resultMeta).toBeVisible();
    
    // Should contain author, category, date, and score
    const metaText = await resultMeta.textContent();
    expect(metaText).toContain('👤'); // Author icon
    expect(metaText).toContain('📁'); // Category icon
    expect(metaText).toContain('📅'); // Date icon
    expect(metaText).toContain('⭐'); // Score icon

    // Check result tags
    const resultTags = page.locator('.result-tags').first();
    await expect(resultTags).toBeVisible();
    const tagCount = await resultTags.locator('.tag').count();
    expect(tagCount).toBeGreaterThan(0);

    // Take screenshot of detailed result view
    await page.screenshot({ 
      path: 'screenshots/blog/search-result-details.png',
      fullPage: true
    });
  });

  test('Performance benchmark simulation', async ({ page }) => {
    const queries = [
      'postgresql optimization',
      'redis caching strategies', 
      'database performance',
      'full text search',
      'typescript patterns'
    ];

    const performanceMetrics = [];

    for (const query of queries) {
      const startTime = Date.now();
      
      await page.locator('#searchInput').fill(query);
      await page.locator('#searchBtn').click();
      await page.waitForSelector('.result-item');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      performanceMetrics.push({
        query,
        responseTime,
        timestamp: new Date().toISOString()
      });

      // Brief pause between searches
      await page.waitForTimeout(1000);
    }

    // Log performance results
    console.log('Performance Benchmark Results:');
    performanceMetrics.forEach(metric => {
      console.log(`Query: "${metric.query}" - ${metric.responseTime}ms`);
    });

    const avgResponseTime = performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / performanceMetrics.length;
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);

    // Take final screenshot showing last query
    await page.screenshot({ 
      path: 'screenshots/blog/performance-benchmark-complete.png',
      fullPage: true
    });
  });
});