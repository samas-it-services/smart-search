// Global teardown for Playwright tests
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function globalTeardown(config) {
  console.log('🧹 Starting Smart Search E2E Test Teardown...');

  // Generate test report summary
  try {
    const resultsPath = 'test-results/results.json';
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      console.log('📊 Test Results Summary:');
      console.log(`   Total Tests: ${results.stats.total}`);
      console.log(`   Passed: ${results.stats.passed}`);
      console.log(`   Failed: ${results.stats.failed}`);
      console.log(`   Skipped: ${results.stats.skipped}`);
      
      if (results.stats.failed > 0) {
        console.log('⚠️ Some tests failed. Check the HTML report for details.');
      } else {
        console.log('✅ All tests passed!');
      }
    }
  } catch (error) {
    console.log('ℹ️ Could not read test results');
  }

  // Count screenshots generated
  try {
    const screenshotDir = 'screenshots';
    if (fs.existsSync(screenshotDir)) {
      const files = fs.readdirSync(screenshotDir, { recursive: true });
      const screenshots = files.filter(f => f.endsWith('.png')).length;
      console.log(`📸 Screenshots generated: ${screenshots}`);
    }
  } catch (error) {
    console.log('ℹ️ Could not count screenshots');
  }

  // Optional: Stop Docker services if requested
  if (process.env.STOP_DOCKER === 'true') {
    try {
      console.log('🛑 Stopping Docker services...');
      execSync('./scripts/docker-dev.sh stop', { stdio: 'inherit' });
      console.log('✅ Docker services stopped');
    } catch (error) {
      console.log('⚠️ Could not stop Docker services:', error.message);
    }
  }

  console.log('✅ Global teardown completed');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   • View HTML report: npx playwright show-report');
  console.log('   • Check screenshots: ls -la screenshots/');
  console.log('   • View trace files: npx playwright show-trace test-results/*/trace.zip');
  console.log('');
}

module.exports = globalTeardown;