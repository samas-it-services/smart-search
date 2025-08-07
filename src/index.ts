/**
 * @samas/smart-search - Universal Search Library
 * Intelligent search with fallback for any database + cache combination
 * 
 * Licensed under Apache-2.0
 * 
 * Support the project:
 * - ⭐ Star on GitHub: https://github.com/samas-org/smart-search
 * - 💰 Sponsor: https://github.com/sponsors/bilgrami
 * - ☕ Buy me a coffee: https://ko-fi.com/bilgrami
 * - 🐦 Follow: https://x.com/sbilgrami
 */

// Core exports
export { SmartSearch } from './SmartSearch';
export { SmartSearchFactory } from './SmartSearchFactory';
export { ConfigLoader } from './config/ConfigLoader';

// Type exports
export type {
  SearchResult,
  SearchFilters,
  SearchOptions,
  SearchStrategy,
  SearchPerformance,
  CircuitBreakerState,
  HealthStatus,
  SmartSearchConfig,
  DatabaseProvider,
  CacheProvider
} from './types';

export type { SmartSearchConfigFile } from './config/ConfigLoader';

// Provider exports
export {
  SupabaseProvider,
  RedisProvider
} from './providers';

export type {
  SupabaseConfig,
  SupabaseSearchConfig,
  RedisConfig,
  RedisSearchIndexConfig
} from './providers';

// Default export for convenience
export default SmartSearch;