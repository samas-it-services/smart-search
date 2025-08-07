/**
 * @samas/smart-search - Factory for creating SmartSearch instances from configuration
 */

import { SmartSearch } from './SmartSearch';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { RedisProvider } from './providers/RedisProvider';
import { ConfigLoader, SmartSearchConfigFile } from './config/ConfigLoader';
import { DatabaseProvider, CacheProvider, SmartSearchConfig } from './types';

export class SmartSearchFactory {
  private static configLoader = ConfigLoader.getInstance();

  /**
   * Create SmartSearch instance from configuration file
   */
  static fromConfig(configPath?: string): SmartSearch {
    const config = SmartSearchFactory.configLoader.loadConfig(configPath);
    return SmartSearchFactory.createFromConfigObject(config);
  }

  /**
   * Create SmartSearch instance from environment variables
   */
  static fromEnvironment(): SmartSearch {
    const config = SmartSearchFactory.configLoader.loadFromEnvironment();
    return SmartSearchFactory.createFromConfigObject(config);
  }

  /**
   * Create SmartSearch instance from configuration object
   */
  static fromConfigObject(config: SmartSearchConfigFile): SmartSearch {
    return SmartSearchFactory.createFromConfigObject(config);
  }

  private static createFromConfigObject(config: SmartSearchConfigFile): SmartSearch {
    // Create database provider
    const database = SmartSearchFactory.createDatabaseProvider(config);
    
    // Create cache provider (optional)
    const cache = config.cache ? SmartSearchFactory.createCacheProvider(config) : undefined;

    // Create SmartSearch instance
    const smartSearchConfig: SmartSearchConfig = {
      database,
      fallback: config.search.fallback
    };
    
    if (cache) {
      smartSearchConfig.cache = cache;
    }
    
    if (config.circuitBreaker) {
      smartSearchConfig.circuitBreaker = config.circuitBreaker;
    }
    
    if (config.cacheConfig) {
      smartSearchConfig.cacheConfig = config.cacheConfig;
    }
    
    if (config.performance) {
      smartSearchConfig.performance = config.performance;
    }
    
    return new SmartSearch(smartSearchConfig);
  }

  private static createDatabaseProvider(config: SmartSearchConfigFile): DatabaseProvider {
    const { type, connection, options } = config.database;

    switch (type) {
      case 'supabase':
        if (!connection.url || !connection.key) {
          throw new Error('Supabase configuration requires url and key');
        }
        return new SupabaseProvider(
          {
            url: connection.url,
            key: connection.key,
            options: options || {}
          },
          {
            tables: Object.fromEntries(
              Object.entries(config.search.tables).map(([key, table]) => [
                key,
                {
                  columns: {
                    ...table.columns,
                    id: table.columns.id || 'id',
                    title: table.columns.title || 'title'
                  },
                  searchColumns: table.searchColumns,
                  type: table.type
                }
              ])
            )
          }
        );

      case 'mysql':
        // When MySQLProvider is implemented:
        /*
        if (!connection.host || !connection.user || !connection.password || !connection.database) {
          throw new Error('MySQL configuration requires host, user, password, and database');
        }
        return new MySQLProvider({
          host: connection.host,
          port: connection.port || 3306,
          user: connection.user,
          password: connection.password,
          database: connection.database,
          ...options
        });
        */
        throw new Error('MySQLProvider not yet implemented. Use SupabaseProvider or implement MySQLProvider.');

      case 'postgresql':
        // When PostgreSQLProvider is implemented:
        /*
        if (!connection.host || !connection.user || !connection.password || !connection.database) {
          throw new Error('PostgreSQL configuration requires host, user, password, and database');
        }
        return new PostgreSQLProvider({
          host: connection.host,
          port: connection.port || 5432,
          user: connection.user,
          password: connection.password,
          database: connection.database,
          ...options
        });
        */
        throw new Error('PostgreSQLProvider not yet implemented. Use SupabaseProvider or implement PostgreSQLProvider.');

      case 'mongodb':
        // When MongoDBProvider is implemented:
        /*
        if (!connection.uri) {
          throw new Error('MongoDB configuration requires uri');
        }
        return new MongoDBProvider({
          uri: connection.uri,
          options
        });
        */
        throw new Error('MongoDBProvider not yet implemented. Use SupabaseProvider or implement MongoDBProvider.');

      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  private static createCacheProvider(config: SmartSearchConfigFile): CacheProvider {
    if (!config.cache) {
      throw new Error('Cache configuration is required');
    }

    const { type, connection, options } = config.cache;

    switch (type) {
      case 'redis':
        const redisConfig: any = {};
        if (connection.url) redisConfig.url = connection.url;
        if (connection.host) redisConfig.host = connection.host;
        if (connection.port) redisConfig.port = connection.port;
        if (connection.password) redisConfig.password = connection.password;
        if (connection.username) redisConfig.username = connection.username;
        if (connection.apiKey) redisConfig.apiKey = connection.apiKey;
        if (connection.db !== undefined) redisConfig.db = connection.db;
        if (connection.tls !== undefined) redisConfig.tls = connection.tls;
        return new RedisProvider({ ...redisConfig, ...options });

      case 'dragonfly':
        // DragonflyDB is Redis-compatible
        const dragonflyConfig: any = {};
        if (connection.url) dragonflyConfig.url = connection.url;
        if (connection.host) dragonflyConfig.host = connection.host;
        dragonflyConfig.port = connection.port || 6380;
        if (connection.password) dragonflyConfig.password = connection.password;
        if (connection.username) dragonflyConfig.username = connection.username;
        if (connection.apiKey) dragonflyConfig.apiKey = connection.apiKey;
        if (connection.db !== undefined) dragonflyConfig.db = connection.db;
        if (connection.tls !== undefined) dragonflyConfig.tls = connection.tls;
        return new RedisProvider({ ...dragonflyConfig, ...options });

      case 'memcached':
        // When MemcachedProvider is implemented:
        /*
        return new MemcachedProvider({
          servers: connection.servers || ['localhost:11211'],
          options
        });
        */
        throw new Error('MemcachedProvider not yet implemented. Use RedisProvider or implement MemcachedProvider.');

      default:
        throw new Error(`Unsupported cache type: ${type}`);
    }
  }

  /**
   * Generate configuration template files
   */
  static generateConfigTemplate(format: 'json' | 'yaml' = 'json', outputPath?: string): string {
    const template = ConfigLoader.createTemplate(format);
    
    if (outputPath) {
      const fs = require('fs');
      fs.writeFileSync(outputPath, template, 'utf8');
      console.log(`✅ Configuration template created: ${outputPath}`);
    }
    
    return template;
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: SmartSearchConfigFile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate database configuration
    if (!config.database) {
      errors.push('Database configuration is required');
    } else {
      if (!config.database.type) {
        errors.push('Database type is required');
      }
      
      if (!config.database.connection) {
        errors.push('Database connection configuration is required');
      } else {
        switch (config.database.type) {
          case 'supabase':
            if (!config.database.connection.url) errors.push('Supabase URL is required');
            if (!config.database.connection.key) errors.push('Supabase key is required');
            break;
          case 'mysql':
          case 'postgresql':
            if (!config.database.connection.host) errors.push(`${config.database.type} host is required`);
            if (!config.database.connection.user && !config.database.connection.username) {
              errors.push(`${config.database.type} user/username is required`);
            }
            if (!config.database.connection.password) errors.push(`${config.database.type} password is required`);
            if (!config.database.connection.database) errors.push(`${config.database.type} database name is required`);
            break;
          case 'mongodb':
            if (!config.database.connection.uri) errors.push('MongoDB URI is required');
            break;
        }
      }
    }

    // Validate search configuration
    if (!config.search) {
      errors.push('Search configuration is required');
    } else {
      if (!config.search.fallback) {
        errors.push('Search fallback strategy is required');
      } else if (!['database', 'cache'].includes(config.search.fallback)) {
        errors.push('Search fallback must be either "database" or "cache"');
      }

      if (!config.search.tables || Object.keys(config.search.tables).length === 0) {
        errors.push('At least one table configuration is required');
      } else {
        for (const [tableName, tableConfig] of Object.entries(config.search.tables)) {
          if (!tableConfig.columns || Object.keys(tableConfig.columns).length === 0) {
            errors.push(`Table "${tableName}" must have column mappings`);
          }
          if (!tableConfig.searchColumns || tableConfig.searchColumns.length === 0) {
            errors.push(`Table "${tableName}" must have searchColumns defined`);
          }
          if (!tableConfig.type) {
            errors.push(`Table "${tableName}" must have a type defined`);
          }
        }
      }
    }

    // Validate cache configuration if present
    if (config.cache && config.cache.type) {
      if (!config.cache.connection) {
        errors.push('Cache connection configuration is required when cache type is specified');
      } else {
        switch (config.cache.type) {
          case 'redis':
          case 'dragonfly':
            if (!config.cache.connection.url && !config.cache.connection.host) {
              errors.push(`${config.cache.type} requires either url or host`);
            }
            break;
          case 'memcached':
            if (!config.cache.connection.servers || config.cache.connection.servers.length === 0) {
              errors.push('Memcached requires servers configuration');
            }
            break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}