// tests/integration/supabase-redis-sync.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { SmartSearch } from '../../src/SmartSearch';
import { SupabaseProvider } from '../../src/providers/SupabaseProvider';
import { RedisProvider } from '../../src/providers/RedisProvider';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Database and cache connection details for the test environment
const TEST_DB_CONFIG = {
  connectionString: 'postgresql://user:password@localhost:5433/smartsearch_test',
};
const TEST_CACHE_CONFIG = {
  url: 'redis://localhost:6380',
};

// Docker-compose command for our test environment
const DOCKER_COMPOSE_FILE = 'docker/docker-compose.integration-test.yml';
const dockerComposeUp = `sudo docker compose -f ${DOCKER_COMPOSE_FILE} up -d --wait`;
const dockerComposeDown = `sudo docker compose -f ${DOCKER_COMPOSE_FILE} down -v`;

describe('Supabase to Redis Data Sync and Search', () => {
  let dbPool: Pool;
  let redisClient: Redis;

  // Start Docker containers before all tests
  beforeAll(async () => {
    console.log('Starting test containers...');
    execSync(dockerComposeUp, { stdio: 'inherit' });
    console.log('Test containers started.');

    dbPool = new Pool(TEST_DB_CONFIG);
    redisClient = new Redis(TEST_CACHE_CONFIG.url);

    // Verify connections
    await dbPool.query('SELECT 1');
    await redisClient.ping();
    console.log('Database and Redis connections successful.');
  }, 60000);

  // Stop and remove Docker containers after all tests
  afterAll(async () => {
    await dbPool.end();
    await redisClient.quit();
    console.log('Stopping test containers...');
    execSync(dockerComposeDown, { stdio: 'inherit' });
    console.log('Test containers stopped.');
  });

  it('should sync data from Supabase to Redis and perform a cache-based search', async () => {
    // 1. Setup: Seed the test database
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS healthcare_data (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT,
        description TEXT,
        search_vector tsvector
      );
      TRUNCATE TABLE healthcare_data;
      INSERT INTO healthcare_data (id, title, description) VALUES
        ('1', 'Diabetes Management', 'Comprehensive care for Type 1 and Type 2 diabetes.'),
        ('2', 'Cardiac Surgery', 'Advanced surgical procedures for heart conditions.'),
        ('3', 'Cancer Immunotherapy', 'Cutting-edge treatment using the immune system.');
    `);

    // 2. Initialize SmartSearch with Supabase and Redis providers
    const supabaseProvider = new SupabaseProvider({
      url: 'http://localhost:54321', // This should point to the Supabase container, not the Postgres one directly
      key: 'test-anon-key',
    });
    // For the test, we need to override the internal client to point to our test DB pool
    supabaseProvider.client.postgrest.pool = dbPool;

    const redisProvider = new RedisProvider(TEST_CACHE_CONFIG);

    const smartSearch = new SmartSearch({
      database: supabaseProvider,
      cache: redisProvider,
    });

    // 3. Act: Run the data hydration
    await smartSearch.hydrate({
        source: 'supabase',
        table: 'healthcare_data',
        indexName: 'healthcare-index',
        schema: {
          title: 'TEXT',
          description: 'TEXT',
        }
    });

    // 4. Assert: Verify data exists in Redis
    const keys = await redisClient.keys('healthcare-index:*');
    expect(keys.length).toBe(3);

    const dataInRedis = await redisClient.call('FT.SEARCH', 'healthcare-index', '@title:cardiac');
    expect(dataInRedis[0]).toBe(1);

    // 5. Act & Assert: Perform a search through the library, which should now hit the cache
    const searchResult = await smartSearch.search('diabetes');
    expect(searchResult.strategy.primary).toBe('cache');
    expect(searchResult.results.length).toBe(1);
    expect(searchResult.results[0].title).toBe('Diabetes Management');
  }, 30000);
});
