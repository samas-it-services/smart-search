// Screenshot generator utility for blog posts
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

class ScreenshotGenerator {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:3001';
    this.outputDir = options.outputDir || 'screenshots/blog';
    this.browser = null;
    this.page = null;
    this.viewport = options.viewport || { width: 1200, height: 800 };
  }

  async init() {
    console.log('🚀 Starting screenshot generator...');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Launch browser
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--disable-web-security', '--allow-running-insecure-content']
    });
    
    const context = await this.browser.newContext({
      viewport: this.viewport,
      deviceScaleFactor: 2, // High DPI for crisp screenshots
    });
    
    this.page = await context.newPage();
    
    // Navigate to the showcase
    await this.page.goto(this.baseURL);
    await this.page.waitForLoadState('networkidle');
    
    console.log('✅ Browser initialized and page loaded');
  }

  async generateBlogScreenshots() {
    console.log('📸 Generating blog post screenshots...');

    // 1. Homepage overview
    await this.captureHomepage();

    // 2. Search functionality
    await this.captureSearchResults();

    // 3. Performance metrics
    await this.capturePerformanceMetrics();

    // 4. Advanced filtering
    await this.captureFiltering();

    // 5. Mobile responsive view
    await this.captureMobileView();

    // 6. API response examples
    await this.captureAPIResponses();

    // 7. Error states
    await this.captureErrorStates();

    console.log('✅ All blog screenshots generated');
  }

  async captureHomepage() {
    console.log('📷 Capturing homepage overview...');
    
    // Take full page screenshot
    await this.page.screenshot({
      path: path.join(this.outputDir, '01-homepage-overview.png'),
      fullPage: true
    });

    // Take focused screenshot of header section
    await this.page.screenshot({
      path: path.join(this.outputDir, '01-homepage-header.png'),
      clip: { x: 0, y: 0, width: 1200, height: 400 }
    });
  }

  async captureSearchResults() {
    console.log('📷 Capturing search functionality...');

    // Clear any existing search and perform new search
    await this.page.locator('#searchInput').fill('postgresql optimization');
    await this.page.locator('#searchBtn').click();
    
    // Wait for results
    await this.page.waitForSelector('.result-item', { timeout: 10000 });
    
    // Take screenshot of search results
    await this.page.screenshot({
      path: path.join(this.outputDir, '02-search-results-postgresql.png'),
      fullPage: true
    });

    // Capture different search queries
    const searches = [
      { query: 'redis caching', filename: '03-search-results-redis.png' },
      { query: 'typescript patterns', filename: '04-search-results-typescript.png' },
      { query: 'database performance', filename: '05-search-results-performance.png' }
    ];

    for (const search of searches) {
      await this.page.locator('#searchInput').fill(search.query);
      await this.page.locator('#searchBtn').click();
      await this.page.waitForSelector('.result-item', { timeout: 10000 });
      await this.page.screenshot({
        path: path.join(this.outputDir, search.filename),
        fullPage: true
      });
    }

    // Capture just the results section
    await this.page.screenshot({
      path: path.join(this.outputDir, '06-results-section-detail.png'),
      clip: { x: 0, y: 600, width: 1200, height: 800 }
    });
  }

  async capturePerformanceMetrics() {
    console.log('📷 Capturing performance metrics...');

    // Ensure we have fresh search data
    await this.page.locator('#searchInput').fill('performance metrics');
    await this.page.locator('#searchBtn').click();
    await this.page.waitForSelector('.result-item', { timeout: 10000 });

    // Wait for stats to load
    await this.page.waitForSelector('#statsSection .stat-card', { timeout: 5000 });

    // Capture stats section
    await this.page.screenshot({
      path: path.join(this.outputDir, '07-performance-stats.png'),
      clip: { x: 0, y: 200, width: 1200, height: 300 }
    });

    // Capture performance info in results header
    await this.page.screenshot({
      path: path.join(this.outputDir, '08-performance-info-detail.png'),
      clip: { x: 0, y: 500, width: 1200, height: 200 }
    });
  }

  async captureFiltering() {
    console.log('📷 Capturing filtering functionality...');

    // Perform search first
    await this.page.locator('#searchInput').fill('database');
    await this.page.locator('#searchBtn').click();
    await this.page.waitForSelector('.result-item', { timeout: 10000 });

    // Apply category filter
    await this.page.selectOption('#categoryFilter', 'Database');
    await this.page.waitForFunction(
      () => !document.getElementById('resultsContainer')?.innerHTML.includes('Searching...'),
      { timeout: 10000 }
    );

    // Capture filtered results
    await this.page.screenshot({
      path: path.join(this.outputDir, '09-filtered-results.png'),
      fullPage: true
    });

    // Capture filter controls
    await this.page.screenshot({
      path: path.join(this.outputDir, '10-filter-controls.png'),
      clip: { x: 0, y: 250, width: 1200, height: 150 }
    });
  }

  async captureMobileView() {
    console.log('📷 Capturing mobile responsive view...');

    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Reload page for mobile layout
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');

    // Take mobile homepage screenshot
    await this.page.screenshot({
      path: path.join(this.outputDir, '11-mobile-homepage.png'),
      fullPage: true
    });

    // Perform mobile search
    await this.page.locator('#searchInput').fill('mobile search');
    await this.page.locator('#searchBtn').click();
    await this.page.waitForSelector('.result-item', { timeout: 10000 });

    // Take mobile search results screenshot
    await this.page.screenshot({
      path: path.join(this.outputDir, '12-mobile-search-results.png'),
      fullPage: true
    });

    // Reset to desktop viewport
    await this.page.setViewportSize({ width: 1200, height: 800 });
  }

  async captureAPIResponses() {
    console.log('📷 Capturing API response examples...');

    // Open browser developer tools would be ideal, but let's create a simple API demo page
    const apiDemoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Smart Search API Demo</title>
        <style>
            body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
            .endpoint { margin: 20px 0; padding: 15px; background: #2d2d30; border-radius: 5px; }
            .method { color: #4fc3f7; font-weight: bold; }
            .url { color: #81c784; }
            .response { background: #0d1117; padding: 15px; border-radius: 5px; margin-top: 10px; }
            pre { margin: 0; white-space: pre-wrap; }
            h1 { color: #ffffff; }
            h2 { color: #f8bbd9; }
        </style>
    </head>
    <body>
        <h1>🚀 Smart Search API Examples</h1>
        
        <div class="endpoint">
            <h2><span class="method">GET</span> <span class="url">/api/search?q=postgresql&limit=5</span></h2>
            <div class="response">
                <pre id="search-response">Loading...</pre>
            </div>
        </div>
        
        <div class="endpoint">
            <h2><span class="method">GET</span> <span class="url">/api/stats</span></h2>
            <div class="response">
                <pre id="stats-response">Loading...</pre>
            </div>
        </div>
        
        <div class="endpoint">
            <h2><span class="method">GET</span> <span class="url">/api/health</span></h2>
            <div class="response">
                <pre id="health-response">Loading...</pre>
            </div>
        </div>

        <script>
            async function loadAPIExamples() {
                try {
                    // Load search API example
                    const searchResponse = await fetch('/api/search?q=postgresql&limit=2');
                    const searchData = await searchResponse.json();
                    document.getElementById('search-response').textContent = JSON.stringify(searchData, null, 2);
                    
                    // Load stats API example
                    const statsResponse = await fetch('/api/stats');
                    const statsData = await statsResponse.json();
                    document.getElementById('stats-response').textContent = JSON.stringify(statsData, null, 2);
                    
                    // Load health API example
                    const healthResponse = await fetch('/api/health');
                    const healthData = await healthResponse.json();
                    document.getElementById('health-response').textContent = JSON.stringify(healthData, null, 2);
                } catch (error) {
                    console.error('Error loading API examples:', error);
                }
            }
            loadAPIExamples();
        </script>
    </body>
    </html>
    `;

    // Navigate to data URL with our demo page
    await this.page.goto(`data:text/html,${encodeURIComponent(apiDemoHTML)}`);
    await this.page.waitForTimeout(2000); // Wait for API calls to complete

    // Take screenshot of API examples
    await this.page.screenshot({
      path: path.join(this.outputDir, '13-api-examples.png'),
      fullPage: true
    });

    // Go back to main page
    await this.page.goto(this.baseURL);
    await this.page.waitForLoadState('networkidle');
  }

  async captureErrorStates() {
    console.log('📷 Capturing error states...');

    // Capture no results state
    await this.page.locator('#searchInput').fill('nonexistentquery12345xyz');
    await this.page.locator('#searchBtn').click();
    await this.page.waitForFunction(
      () => !document.getElementById('resultsContainer')?.innerHTML.includes('Searching...'),
      { timeout: 10000 }
    );

    await this.page.screenshot({
      path: path.join(this.outputDir, '14-no-results-state.png'),
      fullPage: true
    });

    // Capture initial/empty state
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    
    await this.page.screenshot({
      path: path.join(this.outputDir, '15-initial-empty-state.png'),
      fullPage: true
    });
  }

  async generateComparisonScreenshots() {
    console.log('📸 Generating comparison screenshots...');

    const queries = ['redis performance', 'postgresql search', 'typescript patterns'];
    
    for (let i = 0; i < queries.length; i++) {
      await this.page.locator('#searchInput').fill(queries[i]);
      await this.page.locator('#searchBtn').click();
      await this.page.waitForSelector('.result-item', { timeout: 10000 });
      
      await this.page.screenshot({
        path: path.join(this.outputDir, `comparison-${i + 1}-${queries[i].replace(/\s+/g, '-')}.png`),
        clip: { x: 0, y: 500, width: 1200, height: 600 }
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Export for use in tests or standalone script
module.exports = ScreenshotGenerator;

// If run directly
if (require.main === module) {
  async function main() {
    const generator = new ScreenshotGenerator();
    
    try {
      await generator.init();
      await generator.generateBlogScreenshots();
      await generator.generateComparisonScreenshots();
      
      console.log('🎉 All screenshots generated successfully!');
      console.log('📁 Check the screenshots/blog/ directory for generated images');
      
    } catch (error) {
      console.error('❌ Error generating screenshots:', error);
      process.exit(1);
    } finally {
      await generator.close();
    }
  }

  main();
}