/**
 * @samas/smart-search - Provider Exports
 */

// Database Providers
export { SupabaseProvider } from './SupabaseProvider';
export type { SupabaseConfig, SupabaseSearchConfig } from './SupabaseProvider';

export { MySQLProvider } from './MySQLProvider';
export type { MySQLConfig, MySQLSearchConfig } from './MySQLProvider';

export { PostgreSQLProvider } from './PostgreSQLProvider';
export type { PostgreSQLConfig, PostgreSQLSearchConfig } from './PostgreSQLProvider';

export { MongoDBProvider } from './MongoDBProvider';
export type { MongoDBConfig, MongoDBSearchConfig } from './MongoDBProvider';

export { SQLiteProvider } from './SQLiteProvider';
export type { SQLiteConfig, SQLiteSearchConfig } from './SQLiteProvider';

export { DeltaLakeProvider } from './DeltaLakeProvider';
export type { DeltaLakeConfig } from './DeltaLakeProvider';

// Cache Providers
export { RedisProvider } from './RedisProvider';
export type { RedisConfig, RedisSearchIndexConfig } from './RedisProvider';

export { DragonflyProvider } from './DragonflyProvider';
export type { DragonflyConfig } from './DragonflyProvider';

export { MemcachedProvider } from './MemcachedProvider';
export type { MemcachedConfig } from './MemcachedProvider';

export { InMemoryProvider } from './InMemoryProvider';
export type { InMemoryConfig } from './InMemoryProvider';