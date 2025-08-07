/**
 * @samas/smart-search - Configuration Loader
 * Loads configuration from YAML, JSON, or environment variables
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SmartSearchConfigFile {
  database: {
    type: 'supabase' | 'mysql' | 'postgresql' | 'mongodb';
    connection: {
      url?: string;
      host?: string;
      port?: number;
      user?: string;
      username?: string;
      password?: string;
      database?: string;
      key?: string; // For Supabase
      uri?: string; // For MongoDB
    };
    options?: Record<string, any>;
  };
  cache?: {
    type: 'redis' | 'memcached' | 'dragonfly';
    connection: {
      url?: string;
      host?: string;
      port?: number;
      password?: string;
      username?: string; // For Redis ACL authentication
      apiKey?: string; // For API key authentication (Redis Cloud, Upstash, etc.)
      db?: number;
      tls?: boolean | object; // For secure connections
      servers?: string[]; // For Memcached
    };
    options?: Record<string, any>;
  };
  search: {
    fallback: 'database' | 'cache';
    tables: Record<string, {
      columns: Record<string, string>;
      searchColumns: string[];
      type: string;
    }>;
  };
  circuitBreaker?: {
    failureThreshold?: number;
    recoveryTimeout?: number;
    healthCacheTTL?: number;
  };
  cache?: {
    enabled?: boolean;
    defaultTTL?: number;
    maxSize?: number;
  };
  performance?: {
    enableMetrics?: boolean;
    logQueries?: boolean;
    slowQueryThreshold?: number;
  };
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: SmartSearchConfigFile | null = null;
  private configPath: string | null = null;

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from file or environment
   */
  loadConfig(configPath?: string): SmartSearchConfigFile {
    // If config already loaded and no new path specified, return cached
    if (this.config && !configPath && this.configPath) {
      return this.config;
    }

    // Try to load from specified path or common locations
    const paths = configPath ? [configPath] : this.getDefaultConfigPaths();
    
    for (const path of paths) {
      if (existsSync(path)) {
        try {
          this.config = this.loadFromFile(path);
          this.configPath = path;
          console.log(`✅ Loaded configuration from: ${path}`);
          break;
        } catch (error) {
          console.warn(`⚠️ Failed to load config from ${path}:`, error);
          continue;
        }
      }
    }

    // If no file found, try environment variables
    if (!this.config) {
      console.log('📄 No config file found, loading from environment variables');
      this.config = this.loadFromEnvironment();
    }

    // Validate and merge with defaults
    this.config = this.validateAndMergeDefaults(this.config);
    
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): SmartSearchConfigFile | null {
    return this.config;
  }

  /**
   * Reload configuration
   */
  reloadConfig(): SmartSearchConfigFile {
    this.config = null;
    return this.loadConfig(this.configPath || undefined);
  }

  private getDefaultConfigPaths(): string[] {
    const cwd = process.cwd();
    return [
      join(cwd, 'smart-search.config.yaml'),
      join(cwd, 'smart-search.config.yml'),
      join(cwd, 'smart-search.config.json'),
      join(cwd, 'config', 'smart-search.yaml'),
      join(cwd, 'config', 'smart-search.yml'),
      join(cwd, 'config', 'smart-search.json'),
      join(cwd, '.smart-search.yaml'),
      join(cwd, '.smart-search.yml'),
      join(cwd, '.smart-search.json')
    ];
  }

  private loadFromFile(filePath: string): SmartSearchConfigFile {
    const content = readFileSync(filePath, 'utf8');
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json':
        return JSON.parse(content);
      
      case 'yaml':
      case 'yml':
        // For YAML support, you'd need to install js-yaml
        // For now, we'll throw an error with helpful message
        throw new Error(
          'YAML support requires js-yaml package. Install with: npm install js-yaml @types/js-yaml\n' +
          'Then uncomment the YAML parsing code in ConfigLoader.ts'
        );
        
        // Uncomment this when js-yaml is available:
        // const yaml = require('js-yaml');
        // return yaml.load(content);
      
      default:
        throw new Error(`Unsupported config file format: ${ext}`);
    }
  }

  loadFromEnvironment(): SmartSearchConfigFile {
    const config: SmartSearchConfigFile = {
      database: {
        type: (process.env.SMART_SEARCH_DB_TYPE as any) || 'supabase',
        connection: {}
      },
      search: {
        fallback: (process.env.SMART_SEARCH_FALLBACK as any) || 'database',
        tables: {}
      }
    };

    // Database configuration
    switch (config.database.type) {
      case 'supabase':
        config.database.connection = {
          url: process.env.SUPABASE_URL || process.env.SMART_SEARCH_DB_URL,
          key: process.env.SUPABASE_ANON_KEY || process.env.SMART_SEARCH_DB_KEY
        };
        break;
      
      case 'mysql':
      case 'postgresql':
        config.database.connection = {
          host: process.env.SMART_SEARCH_DB_HOST || 'localhost',
          port: parseInt(process.env.SMART_SEARCH_DB_PORT || '5432'),
          user: process.env.SMART_SEARCH_DB_USER || process.env.SMART_SEARCH_DB_USERNAME,
          password: process.env.SMART_SEARCH_DB_PASSWORD,
          database: process.env.SMART_SEARCH_DB_DATABASE || process.env.SMART_SEARCH_DB_NAME
        };
        break;
      
      case 'mongodb':
        config.database.connection = {
          uri: process.env.MONGODB_URI || process.env.SMART_SEARCH_DB_URI
        };
        break;
    }

    // Cache configuration
    if (process.env.SMART_SEARCH_CACHE_TYPE || process.env.REDIS_URL || process.env.REDIS_HOST) {
      config.cache = {
        type: (process.env.SMART_SEARCH_CACHE_TYPE as any) || 'redis',
        connection: {}
      };

      switch (config.cache.type) {
        case 'redis':
        case 'dragonfly':
          config.cache.connection = {
            url: process.env.REDIS_URL || process.env.SMART_SEARCH_CACHE_URL,
            host: process.env.REDIS_HOST || process.env.SMART_SEARCH_CACHE_HOST,
            port: parseInt(process.env.REDIS_PORT || process.env.SMART_SEARCH_CACHE_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || process.env.SMART_SEARCH_CACHE_PASSWORD,
            username: process.env.REDIS_USERNAME || process.env.SMART_SEARCH_CACHE_USERNAME,
            apiKey: process.env.REDIS_API_KEY || process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.SMART_SEARCH_CACHE_API_KEY,
            db: parseInt(process.env.REDIS_DB || process.env.SMART_SEARCH_CACHE_DB || '0'),
            tls: process.env.REDIS_TLS === 'true' || process.env.SMART_SEARCH_CACHE_TLS === 'true'
          };
          break;
        
        case 'memcached':
          const servers = process.env.MEMCACHED_SERVERS || process.env.SMART_SEARCH_CACHE_SERVERS;
          config.cache.connection = {
            servers: servers ? servers.split(',') : ['localhost:11211']
          };
          break;
      }
    }

    // Performance configuration
    if (process.env.SMART_SEARCH_ENABLE_METRICS !== undefined) {
      config.performance = {
        enableMetrics: process.env.SMART_SEARCH_ENABLE_METRICS === 'true',
        logQueries: process.env.SMART_SEARCH_LOG_QUERIES === 'true',
        slowQueryThreshold: parseInt(process.env.SMART_SEARCH_SLOW_QUERY_THRESHOLD || '1000')
      };
    }

    // Circuit breaker configuration
    if (process.env.SMART_SEARCH_CIRCUIT_BREAKER_THRESHOLD) {
      config.circuitBreaker = {
        failureThreshold: parseInt(process.env.SMART_SEARCH_CIRCUIT_BREAKER_THRESHOLD || '3'),
        recoveryTimeout: parseInt(process.env.SMART_SEARCH_CIRCUIT_BREAKER_RECOVERY || '60000'),
        healthCacheTTL: parseInt(process.env.SMART_SEARCH_HEALTH_CACHE_TTL || '30000')
      };
    }

    return config;
  }

  private validateAndMergeDefaults(config: SmartSearchConfigFile): SmartSearchConfigFile {
    // Validate required fields
    if (!config.database?.type || !config.database?.connection) {
      throw new Error('Database configuration is required');
    }

    if (!config.search?.fallback) {
      throw new Error('Search fallback strategy is required');
    }

    // Merge with defaults
    const defaults: Partial<SmartSearchConfigFile> = {
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 60000,
        healthCacheTTL: 30000
      },
      cache: {
        enabled: true,
        defaultTTL: 300000,
        maxSize: 10000
      },
      performance: {
        enableMetrics: true,
        logQueries: false,
        slowQueryThreshold: 1000
      }
    };

    return {
      ...defaults,
      ...config,
      circuitBreaker: { ...defaults.circuitBreaker, ...config.circuitBreaker },
      cache: { ...defaults.cache, ...config.cache },
      performance: { ...defaults.performance, ...config.performance }
    };
  }

  /**
   * Create a config template
   */
  static createTemplate(format: 'json' | 'yaml' = 'json'): string {
    const template = {
      database: {
        type: "supabase",
        connection: {
          url: "${SUPABASE_URL}",
          key: "${SUPABASE_ANON_KEY}"
        }
      },
      cache: {
        type: "redis",
        connection: {
          url: "${REDIS_URL}"
        }
      },
      search: {
        fallback: "database",
        tables: {
          books: {
            columns: {
              id: "id",
              title: "title",
              subtitle: "author",
              description: "description",
              category: "category",
              language: "language",
              visibility: "visibility",
              createdAt: "uploaded_at"
            },
            searchColumns: ["title", "author", "description"],
            type: "book"
          },
          users: {
            columns: {
              id: "id",
              title: "full_name",
              subtitle: "username",
              description: "bio",
              createdAt: "created_at"
            },
            searchColumns: ["full_name", "username", "bio"],
            type: "user"
          }
        }
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 60000,
        healthCacheTTL: 30000
      },
      cache: {
        enabled: true,
        defaultTTL: 300000,
        maxSize: 10000
      },
      performance: {
        enableMetrics: true,
        logQueries: false,
        slowQueryThreshold: 1000
      }
    };

    if (format === 'json') {
      return JSON.stringify(template, null, 2);
    } else {
      // YAML format (would need js-yaml for actual parsing)
      return `# @samas/smart-search Configuration
database:
  type: supabase
  connection:
    url: \${SUPABASE_URL}
    key: \${SUPABASE_ANON_KEY}

cache:
  type: redis
  connection:
    url: \${REDIS_URL}

search:
  fallback: database
  tables:
    books:
      columns:
        id: id
        title: title
        subtitle: author
        description: description
        category: category
        language: language
        visibility: visibility
        createdAt: uploaded_at
      searchColumns:
        - title
        - author
        - description
      type: book
    users:
      columns:
        id: id
        title: full_name
        subtitle: username
        description: bio
        createdAt: created_at
      searchColumns:
        - full_name
        - username
        - bio
      type: user

circuitBreaker:
  failureThreshold: 3
  recoveryTimeout: 60000
  healthCacheTTL: 30000

cache:
  enabled: true
  defaultTTL: 300000
  maxSize: 10000

performance:
  enableMetrics: true
  logQueries: false
  slowQueryThreshold: 1000`;
    }
  }
}