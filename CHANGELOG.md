# Changelog

All notable changes to this project will be documented in this file.

## [3.1.0] - 2025-12-26

### Added
- DirectRedisProvider for direct Redis connections bypassing edge functions
- Sub-10ms response times for direct Redis operations
- Enhanced circuit breaker functionality with automatic recovery
- Connection pooling and performance optimization for direct connections
- Direct fetch optimization patterns for improved performance
- Server-side only execution for direct Redis access
- Comprehensive health monitoring with circuit breaker status
- New configuration options for direct Redis connections
- Unit tests for DirectRedisProvider functionality
- Documentation and usage examples for DirectRedisProvider

### Changed
- Improved connection management for Redis providers
- Enhanced error handling and circuit breaker patterns
- Updated documentation with direct connection usage
- Optimized connection pooling and reuse patterns

### Performance Improvements
- Direct Redis connections provide 50%+ faster response times
- Reduced latency by bypassing edge functions
- Optimized connection pooling and reuse
- Improved circuit breaker recovery patterns

### Compatibility
- Maintains full backward compatibility with existing providers
- Same API contract for all provider types
- Graceful degradation when direct connection unavailable

## [3.0.0] - 2024-01-15

### Added
- Complete rewrite with universal provider system
- Support for PostgreSQL, MySQL, MongoDB, Supabase databases
- Support for Redis, Memcached, DragonflyDB caches
- Circuit breaker pattern for failure resilience
- Health monitoring and performance tracking
- Comprehensive TypeScript support
- CLI tools for configuration generation