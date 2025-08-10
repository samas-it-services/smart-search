/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
import { defineConfig, devices } from '@playwright/test';

/**
 * @samas/smart-search - Playwright E2E Test Configuration
 * Tests the package in real browser environments with various configurations
 */

declare const process: any;
const isMock = process?.env?.E2E_TARGET === 'mock';
const baseURL = isMock ? 'http://localhost:3000' : (process?.env?.BASE_URL || 'http://localhost:8100');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process?.env?.CI,
  retries: process?.env?.CI ? 2 : 0,
  workers: process?.env?.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  // In mock mode, only run the self-contained browser tests and auto-serve the static test page
  // Otherwise, target an external showcase running at baseURL
  testIgnore: isMock ? ['tests/e2e/postgres-redis-showcase.spec.ts'] : [],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: isMock
    ? {
        command: 'npm run test:serve',
        port: 3000,
        reuseExistingServer: !process?.env?.CI,
        timeout: 120000,
      }
    : undefined,
});