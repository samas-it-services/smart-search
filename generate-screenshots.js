/**
 * Smart Search Screenshot Generator
 * Generates high-quality screenshots for blog posts and documentation
 * 
 * Usage:
 * node generate-screenshots.js postgres-redis
 * node generate-screenshots.js mysql-dragonfly 
 * node generate-screenshots.js mongodb-memcached
 * node generate-screenshots.js sqlite-inmemory
 * node generate-screenshots.js all
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Showcase configurations
const SHOWCASES = {
  'postgres-redis': {
    port: 3002,
    name: 'PostgreSQL + Redis - Healthcare',
    searches: ['diabetes', 'cardiac surgery', 'immunotherapy', 'mental health'],
    directory: 'postgres-redis'
  },
  'mysql-dragonfly': {
    port: 3003,
    name: 'MySQL + DragonflyDB - Finance', 
    searches: ['portfolio', 'risk management', 'cryptocurrency', 'derivatives'],
    directory: 'mysql-dragonfly'
  },
  'mongodb-memcached': {
    port: 3004,
    name: 'MongoDB + Memcached - Retail',
    searches: ['customer analytics', 'inventory management', 'omnichannel', 'personalization'],
    directory: 'mongodb-memcached'
  },
  'sqlite-inmemory': {
    port: 3005,
    name: 'SQLite + InMemory - Education',
    searches: ['learning management systems', 'student engagement', 'assessment strategies', 'educational technology'],
    directory: 'sqlite-inmemory'
  }
};

async function generateScreenshotsForShowcase(showcaseKey, config) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  
  // Create showcase-specific directory
  const screenshotDir = `screenshots/blog/${showcaseKey}`;
  fs.mkdirSync(screenshotDir, { recursive: true });
  
  try {
    console.log(`\n🚀 Generating screenshots for ${config.name}...`);
    
    // Navigate to the showcase
    const url = `http://localhost:${config.port}`;
    console.log(`📡 Connecting to ${url}...`);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to load completely
    await page.waitForSelector('#searchInput', { state: 'visible' });
    
    let screenshotIndex = 1;
    
    // Homepage screenshot
    console.log('📸 Taking homepage screenshot...');
    await page.screenshot({ 
      path: `${screenshotDir}/${screenshotIndex.toString().padStart(2, '0')}-homepage-overview.png`,
      fullPage: true
    });
    screenshotIndex++;
    
    // Search screenshots for each search term
    for (const searchTerm of config.searches) {
      console.log(`📸 Taking "${searchTerm}" search screenshot...`);
      await page.fill('#searchInput', searchTerm);
      await page.click('#searchBtn');
      
      // Wait for search results to actually load
      try {
        await page.waitForSelector('.result-item', { timeout: 10000 });
        console.log(`✅ Search results loaded for "${searchTerm}"`);
      } catch (error) {
        console.log(`⚠️ No results found for "${searchTerm}", taking screenshot anyway`);
        // Wait a bit for the "no results" state to render
        await page.waitForTimeout(2000);
      }
      
      await page.screenshot({ 
        path: `${screenshotDir}/${screenshotIndex.toString().padStart(2, '0')}-search-${searchTerm.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
        fullPage: true
      });
      screenshotIndex++;
    }
    
    // Performance metrics screenshot
    console.log('📸 Taking performance metrics screenshot...');
    await page.fill('#searchInput', 'performance');
    await page.click('#searchBtn');
    
    // Wait for search results and stats to load
    try {
      await page.waitForSelector('.result-item', { timeout: 10000 });
      console.log('✅ Performance search results loaded');
    } catch (error) {
      console.log('⚠️ No results for performance search, continuing...');
      await page.waitForTimeout(2000);
    }
    
    // Wait for stats section to load with actual data
    try {
      await page.waitForFunction(() => {
        const statsSection = document.querySelector('#statsSection');
        return statsSection && statsSection.innerHTML.includes('ms') && statsSection.innerHTML.includes('stat-value');
      }, { timeout: 15000 });
      console.log('✅ Stats section loaded with data');
    } catch (error) {
      console.log('⚠️ Stats section not fully loaded, taking screenshot anyway');
    }
    
    // Focus on the stats section
    const statsSection = page.locator('#statsSection');
    if (await statsSection.isVisible()) {
      await statsSection.screenshot({ 
        path: `${screenshotDir}/${screenshotIndex.toString().padStart(2, '0')}-performance-stats.png`
      });
      screenshotIndex++;
      console.log('✅ Stats section screenshot captured');
    } else {
      console.log('⚠️ Stats section not visible, skipping stats screenshot');
    }
    
    // Mobile view screenshots
    console.log('📸 Taking mobile responsive screenshots...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#searchInput', { state: 'visible' });
    
    // Mobile homepage
    await page.screenshot({ 
      path: `${screenshotDir}/${screenshotIndex.toString().padStart(2, '0')}-mobile-homepage.png`,
      fullPage: true
    });
    screenshotIndex++;
    
    // Mobile search
    await page.fill('#searchInput', 'mobile search');
    await page.click('#searchBtn');
    
    // Wait for mobile search results to load
    try {
      await page.waitForSelector('.result-item', { timeout: 10000 });
      console.log('✅ Mobile search results loaded');
    } catch (error) {
      console.log('⚠️ No mobile search results, taking screenshot anyway');
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: `${screenshotDir}/${screenshotIndex.toString().padStart(2, '0')}-mobile-search-results.png`,
      fullPage: true
    });
    
    console.log(`✅ Screenshots generated for ${config.name}!`);
    console.log(`📁 Check ${screenshotDir}/ directory`);
    
  } catch (error) {
    console.error(`❌ Error generating screenshots for ${config.name}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function generateAllScreenshots() {
  console.log('🎬 Generating screenshots for ALL showcases...');
  
  for (const [showcaseKey, config] of Object.entries(SHOWCASES)) {
    try {
      await generateScreenshotsForShowcase(showcaseKey, config);
    } catch (error) {
      console.error(`❌ Failed to generate screenshots for ${showcaseKey}:`, error.message);
      console.log('💡 Make sure the showcase is running on the correct port');
    }
  }
  
  console.log('\n🎉 All screenshot generation attempts completed!');
}

// Main execution
async function main() {
  const showcase = process.argv[2];
  
  if (!showcase) {
    console.log('📋 Available showcases:');
    Object.keys(SHOWCASES).forEach(key => {
      console.log(`   • ${key} (port ${SHOWCASES[key].port})`);
    });
    console.log('   • all (generate for all showcases)');
    console.log('\nUsage: node generate-screenshots.js <showcase-name>');
    process.exit(1);
  }
  
  if (showcase === 'all') {
    await generateAllScreenshots();
  } else if (SHOWCASES[showcase]) {
    await generateScreenshotsForShowcase(showcase, SHOWCASES[showcase]);
  } else {
    console.error(`❌ Unknown showcase: ${showcase}`);
    console.log('Available showcases:', Object.keys(SHOWCASES).join(', '));
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use as module
module.exports = { generateScreenshotsForShowcase, generateAllScreenshots, SHOWCASES };