// Global setup for Playwright tests
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting Smart Search E2E Test Setup...');

  // Ensure output directories exist
  const dirs = [
    'test-results',
    'screenshots',
    'screenshots/blog',
    'screenshots/showcase',
    'playwright-report'
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  // Check if Docker services are running
  try {
    console.log('🔍 Checking Docker services...');
    execSync('docker ps | grep smart-search', { stdio: 'pipe' });
    console.log('✅ Docker services are running');
  } catch (error) {
    console.log('⚠️ Docker services not running, starting them...');
    try {
      execSync('./scripts/docker-dev.sh start', { stdio: 'inherit', cwd: process.cwd() });
      console.log('✅ Docker services started successfully');
      
      // Wait for services to be ready
      console.log('⏳ Waiting for services to initialize (30s)...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (dockerError) {
      console.error('❌ Failed to start Docker services:', dockerError.message);
      process.exit(1);
    }
  }

  // Test database connections
  try {
    console.log('🔍 Testing database connections...');
    execSync('./scripts/docker-dev.sh test', { stdio: 'pipe', cwd: process.cwd() });
    console.log('✅ All database connections successful');
  } catch (error) {
    console.warn('⚠️ Some database connections failed, but continuing with tests');
  }

  // Build the Smart Search library if needed
  try {
    if (!fs.existsSync('dist') || !fs.existsSync('dist/index.js')) {
      console.log('📦 Building Smart Search library...');
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Smart Search library built successfully');
    } else {
      console.log('✅ Smart Search library already built');
    }
  } catch (error) {
    console.error('❌ Failed to build Smart Search library:', error.message);
    process.exit(1);
  }

  console.log('✅ Global setup completed successfully');
  console.log('');
}

module.exports = globalSetup;