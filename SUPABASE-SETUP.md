# 🚀 Supabase Integration Guide for SmartSearch

SmartSearch now provides **full production-ready Supabase support** with real-time capabilities, Row Level Security, and advanced search features.

## ✅ What's Implemented

### Core Supabase Features
- ✅ **Real Supabase client** with `@supabase/supabase-js` integration
- ✅ **Production-ready authentication** support
- ✅ **Row Level Security (RLS)** policies for multi-tenant applications
- ✅ **Full-text search** with PostgreSQL tsvector and ranking
- ✅ **Real-time subscriptions** for live search results
- ✅ **Comprehensive error handling** with Supabase-specific error codes

### SmartSearch Integration
- ✅ **Cache + Database fallback** with Redis integration
- ✅ **Circuit breaker pattern** for reliability
- ✅ **Performance monitoring** and health checking
- ✅ **Intelligent caching** with TTL and invalidation

## 🏗️ Quick Setup for Your Production App

### 1. Install Dependencies

```bash
npm install @samas/smart-search @supabase/supabase-js
```

### 2. Basic Configuration

```javascript
import { SmartSearchFactory } from '@samas/smart-search';

const config = {
  database: {
    type: 'supabase',
    connection: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY
    },
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    }
  },
  cache: {
    type: 'redis',
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    }
  },
  search: {
    tables: {
      your_table: {
        columns: {
          id: 'id',
          title: 'title',
          description: 'description',
          category: 'category'
        },
        searchColumns: ['title', 'description', 'tags'],
        type: 'your_content_type'
      }
    }
  }
};

const smartSearch = SmartSearchFactory.fromConfig(config);
await smartSearch.connect();
```

### 3. Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-key-here  # For admin operations

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## 📊 Database Schema Setup

SmartSearch works with any Supabase table structure. Here's the recommended approach:

### Option 1: Use Your Existing Tables

SmartSearch adapts to your existing schema:

```sql
-- Your existing table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users(id),
  category TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Add these for optimal search
  search_vector tsvector,
  is_published BOOLEAN DEFAULT false
);

-- Add search index
CREATE INDEX idx_articles_search ON articles USING gin(search_vector);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_articles_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_articles_search_vector
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW 
    EXECUTE FUNCTION update_articles_search_vector();
```

### Option 2: Use Healthcare Demo Schema

For testing, use our comprehensive healthcare schema (see `docker/init/supabase/01-schema.sql`).

## 🔒 Row Level Security (RLS) Setup

SmartSearch respects Supabase RLS policies:

```sql
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Public read access to published content
CREATE POLICY "Public content is viewable" 
ON your_table FOR SELECT 
USING (is_published = true);

-- Users can manage their own content
CREATE POLICY "Users manage own content" 
ON your_table FOR ALL 
USING (auth.uid() = user_id);
```

## 🚀 Usage Examples

### Basic Search

```javascript
const results = await smartSearch.search('diabetes treatment', {
  limit: 20,
  strategy: 'cache-first',
  filters: {
    category: ['endocrinology', 'internal-medicine'],
    dateRange: {
      start: '2023-01-01',
      end: '2024-12-31'
    }
  }
});
```

### Real-time Search with Subscriptions

```javascript
// Setup real-time subscription for search results
const subscription = supabase
  .channel('search-updates')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'your_table' 
    }, 
    (payload) => {
      // Invalidate cache for updated content
      smartSearch.invalidateCache(`search:${lastQuery}`);
    }
  )
  .subscribe();
```

### Performance Monitoring

```javascript
const stats = await smartSearch.getSearchStats();
console.log('Database latency:', stats.databaseHealth.latency);
console.log('Cache hit rate:', stats.cacheHealth.hitRate);
console.log('Circuit breaker state:', stats.circuitBreaker.state);
```

## 🐳 Local Development with Docker

We provide a complete local Supabase setup:

```bash
# Start Supabase + Redis locally
docker-compose -f docker/supabase-redis.docker-compose.yml up -d

# Access the showcase
open http://localhost:3003
```

This includes:
- **Supabase Database** (PostgreSQL) on port 54322
- **Supabase API** on port 54321  
- **Redis Cache** on port 6380
- **Healthcare Showcase** on port 3003

## 🔧 Advanced Configuration

### Custom Authentication

```javascript
const config = {
  database: {
    type: 'supabase',
    connection: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY
    },
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-Custom-Header': 'your-value'
        }
      }
    }
  },
  // ... rest of config
};
```

### Circuit Breaker Configuration

```javascript
const config = {
  // ... database and cache config
  circuitBreaker: {
    failureThreshold: 5,      // Open after 5 failures
    recoveryTimeout: 60000,   // Try recovery after 1 minute
    healthCacheMs: 10000      // Cache health status for 10 seconds
  }
};
```

### Performance Tuning

```javascript
const config = {
  // ... other config
  performance: {
    enableMetrics: true,
    logQueries: process.env.NODE_ENV === 'development',
    slowQueryThreshold: 500   // Log queries slower than 500ms
  },
  cacheConfig: {
    enabled: true,
    defaultTTL: 300000,       // 5 minutes
    maxKeys: 10000
  }
};
```

## 🎯 Production Deployment Checklist

### 1. Supabase Project Setup
- [ ] Create Supabase project
- [ ] Configure authentication providers
- [ ] Set up RLS policies
- [ ] Create search indexes
- [ ] Configure Edge Functions (if needed)

### 2. Environment Configuration
- [ ] Set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] Configure Redis connection
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting

### 3. Performance Optimization
- [ ] Enable connection pooling
- [ ] Configure appropriate cache TTLs
- [ ] Set up database read replicas
- [ ] Monitor query performance

### 4. Security
- [ ] Enable RLS on all tables
- [ ] Validate JWT tokens
- [ ] Configure CORS policies
- [ ] Set up API rate limiting

## 📈 Monitoring & Observability

SmartSearch provides comprehensive metrics:

```javascript
const metrics = await smartSearch.getSearchStats();

// Log to your monitoring system
logger.info('SmartSearch metrics', {
  database: {
    latency: metrics.databaseHealth.latency,
    isConnected: metrics.databaseHealth.isConnected,
    errorRate: metrics.performance.errorRate
  },
  cache: {
    hitRate: metrics.cacheHealth.hitRate,
    memoryUsage: metrics.cacheHealth.memoryUsage,
    keyCount: metrics.cacheHealth.keyCount
  },
  circuit_breaker: {
    state: metrics.circuitBreaker.state,
    failureCount: metrics.circuitBreaker.failureCount
  }
});
```

## 🆘 Troubleshooting

### Common Issues

1. **"Supabase configuration requires url and key"**
   - Check your environment variables
   - Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

2. **Search returns no results**
   - Verify RLS policies allow access to your data
   - Check if `is_published = true` (if using that pattern)
   - Ensure search indexes are created

3. **Cache connection fails**
   - Verify Redis is running and accessible
   - Check Redis connection string format
   - Ensure firewall allows Redis port

4. **Performance issues**
   - Enable query logging to identify slow queries
   - Check if proper indexes exist
   - Monitor cache hit rates

### Debug Mode

Enable detailed logging:

```javascript
const config = {
  // ... your config
  performance: {
    logQueries: true,
    enableMetrics: true
  }
};
```

## 💡 Best Practices

1. **Use RLS policies** for security
2. **Create proper search indexes** for performance  
3. **Monitor cache hit rates** and adjust TTLs
4. **Use connection pooling** in production
5. **Set up health checks** and monitoring
6. **Handle authentication state** properly
7. **Use Edge Functions** for complex search logic

## 🔗 Related Resources

- [Supabase Documentation](https://supabase.com/docs)
- [SmartSearch API Reference](./docs/api-reference.md)
- [Healthcare Showcase Demo](http://localhost:3003) (after running Docker setup)
- [Performance Monitoring Guide](./docs/monitoring.md)

---

**Your Supabase integration is now production-ready!** 🎉

For additional support or questions, check the [troubleshooting section](#-troubleshooting) or open an issue on GitHub.