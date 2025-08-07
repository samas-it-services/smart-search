/**
 * @samas/smart-search - Provider Exports
 */

export { SupabaseProvider } from './SupabaseProvider';
export type { SupabaseConfig, SupabaseSearchConfig } from './SupabaseProvider';

export { RedisProvider } from './RedisProvider';
export type { RedisConfig, RedisSearchIndexConfig } from './RedisProvider';

// Re-export MySQL provider when implemented
// export { MySQLProvider } from './MySQLProvider';
// export type { MySQLConfig, MySQLSearchConfig } from './MySQLProvider';

// Re-export MongoDB provider when implemented
// export { MongoDBProvider } from './MongoDBProvider';
// export type { MongoDBConfig, MongoDBSearchConfig } from './MongoDBProvider';

// Re-export Memcached provider when implemented
// export { MemcachedProvider } from './MemcachedProvider';
// export type { MemcachedConfig } from './MemcachedProvider';

// Re-export DragonflyDB provider when implemented
// export { DragonflyProvider } from './DragonflyProvider';
// export type { DragonflyConfig } from './DragonflyProvider';