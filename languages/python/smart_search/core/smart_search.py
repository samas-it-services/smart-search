"""
Core SmartSearch class for Python SDK
Enterprise-grade search with data governance, hybrid strategies, and circuit breaker
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from contextlib import asynccontextmanager
from dataclasses import replace

from .types import (
    SearchResult,
    SearchOptions, 
    SearchResponse,
    SecureSearchResponse,
    SearchStrategy,
    SearchPerformance,
    SearchStrategyInfo,
    HealthStatus,
    SecurityContext,
    SmartSearchConfig,
    DatabaseProvider,
    CacheProvider,
    CircuitBreakerState,
    SmartSearchError,
    SearchTimeoutError,
    DatabaseConnectionError,
    CacheConnectionError,
    SecurityAccessDeniedError,
)

# Optional imports for enterprise features
try:
    from ..security.data_governance import DataGovernanceService
    _HAS_DATA_GOVERNANCE = True
except ImportError:
    _HAS_DATA_GOVERNANCE = False
    DataGovernanceService = None

try:
    from prometheus_client import Counter, Histogram, Gauge
    _HAS_METRICS = True
    
    # Define metrics
    search_requests_total = Counter(
        'smart_search_requests_total', 
        'Total search requests',
        ['strategy', 'status']
    )
    search_duration_seconds = Histogram(
        'smart_search_duration_seconds',
        'Search request duration'
    )
    active_connections = Gauge(
        'smart_search_active_connections',
        'Active database connections',
        ['provider']
    )
except ImportError:
    _HAS_METRICS = False


logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Simple circuit breaker implementation."""
    
    def __init__(
        self, 
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        success_threshold: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        
    def is_open(self) -> bool:
        """Check if circuit breaker is open."""
        if self.state == "OPEN":
            # Check if recovery timeout has passed
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker entering HALF_OPEN state")
                return False
            return True
        return False
        
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.is_open():
            raise SmartSearchError(
                "Circuit breaker is OPEN",
                "CIRCUIT_BREAKER_OPEN",
                {"failure_count": self.failure_count, "state": self.state}
            )
            
        try:
            result = await func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise
            
    def record_success(self):
        """Record successful operation."""
        if self.state == "HALF_OPEN":
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = "CLOSED"
                self.failure_count = 0
                self.success_count = 0
                logger.info("Circuit breaker reset to CLOSED state")
        elif self.state == "CLOSED":
            # Reset failure count on successful operation
            self.failure_count = max(0, self.failure_count - 1)
            
    def record_failure(self):
        """Record failed operation."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(
                f"Circuit breaker opened after {self.failure_count} failures"
            )


class SmartSearch:
    """
    Enterprise-grade universal search with intelligent fallback.
    
    Features:
    - Multi-database support with intelligent provider selection
    - Automatic cache/database fallback with circuit breaker
    - Enterprise data governance and security
    - Hybrid search strategies
    - Performance monitoring and metrics
    - HIPAA/PCI-DSS/GDPR compliance support
    """
    
    def __init__(self, config: SmartSearchConfig):
        self.database = config.database
        self.cache = config.cache
        self.fallback_strategy = config.fallback
        
        # Configuration
        self.circuit_breaker_config = config.circuit_breaker or {}
        self.cache_config = config.cache_config or {}
        self.performance_config = config.performance or {}
        
        # Enterprise features
        self.data_governance = None
        if _HAS_DATA_GOVERNANCE and config.data_governance:
            self.data_governance = DataGovernanceService(config.data_governance)
            
        self.hybrid_search_enabled = config.hybrid_search and config.hybrid_search.get("enabled", False)
        self.hybrid_search_config = config.hybrid_search or {}
        
        # Circuit breakers for different providers
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        if self.cache:
            self.circuit_breakers["cache"] = CircuitBreaker(
                failure_threshold=self.circuit_breaker_config.get("failure_threshold", 5),
                recovery_timeout=self.circuit_breaker_config.get("recovery_timeout", 60.0),
            )
        if self.database:
            self.circuit_breakers["database"] = CircuitBreaker(
                failure_threshold=self.circuit_breaker_config.get("failure_threshold", 5),
                recovery_timeout=self.circuit_breaker_config.get("recovery_timeout", 60.0),
            )
            
        # Performance tracking
        self.enable_metrics = self.performance_config.get("enable_metrics", True)
        self.log_queries = self.performance_config.get("log_queries", False)
        self.slow_query_threshold = self.performance_config.get("slow_query_threshold", 1000)
        
        # Cache for health status
        self._health_cache: Dict[str, tuple[HealthStatus, float]] = {}
        self._health_cache_ttl = self.circuit_breaker_config.get("health_cache_ttl", 30.0)
        
    async def search(
        self, 
        query: str, 
        options: Optional[SearchOptions] = None
    ) -> SearchResponse:
        """
        Perform intelligent search with automatic fallback.
        
        Args:
            query: Search query string
            options: Search options and filters
            
        Returns:
            SearchResponse with results, performance data, and strategy info
        """
        if options is None:
            options = SearchOptions()
            
        start_time = time.time()
        
        try:
            # Determine optimal search strategy
            strategy_info = await self._determine_search_strategy()
            
            if self.log_queries:
                logger.info(f"Using {strategy_info.primary.value} search strategy: {strategy_info.reason}")
                
            results = []
            performance = None
            
            # Try primary strategy
            try:
                if strategy_info.primary == SearchStrategy.CACHE and self.cache:
                    results = await self._search_with_cache(query, options)
                elif strategy_info.primary == SearchStrategy.HYBRID:
                    return await self.hybrid_search(query, options)
                else:
                    results = await self._search_with_database(query, options)
                    
                # Cache results if using database and cache is available
                if (strategy_info.primary == SearchStrategy.DATABASE and 
                    self.cache and 
                    options.cache_enabled and 
                    results):
                    await self._cache_results(query, options, results)
                    
                performance = SearchPerformance(
                    search_time=(time.time() - start_time) * 1000,  # Convert to ms
                    result_count=len(results),
                    strategy=strategy_info.primary,
                    cache_hit=strategy_info.primary == SearchStrategy.CACHE,
                )
                
            except Exception as primary_error:
                logger.warning(
                    f"{strategy_info.primary.value} search failed, trying fallback: {primary_error}"
                )
                
                # Try fallback strategy
                try:
                    if strategy_info.fallback == SearchStrategy.CACHE and self.cache:
                        results = await self._search_with_cache(query, options)
                    else:
                        results = await self._search_with_database(query, options)
                        
                    performance = SearchPerformance(
                        search_time=(time.time() - start_time) * 1000,
                        result_count=len(results),
                        strategy=strategy_info.fallback,
                        cache_hit=strategy_info.fallback == SearchStrategy.CACHE,
                        errors=[str(primary_error)]
                    )
                    
                except Exception as fallback_error:
                    # Both strategies failed
                    performance = SearchPerformance(
                        search_time=(time.time() - start_time) * 1000,
                        result_count=0,
                        strategy=SearchStrategy.DATABASE,
                        cache_hit=False,
                        errors=[str(primary_error), str(fallback_error)]
                    )
                    
            # Record metrics
            if self.enable_metrics and _HAS_METRICS:
                search_requests_total.labels(
                    strategy=performance.strategy.value,
                    status='success' if results else 'error'
                ).inc()
                search_duration_seconds.observe(performance.search_time / 1000)
                
            # Log performance
            if self.enable_metrics:
                self._log_search_performance(query, performance, strategy_info)
                
            return SearchResponse(
                results=results,
                performance=performance,
                strategy=strategy_info,
                metadata={
                    "query": query if not self._contains_sensitive_data(query) else "[REDACTED]",
                    "options": options.to_dict() if hasattr(options, 'to_dict') else str(options),
                    "timestamp": time.time()
                }
            )
            
        except Exception as error:
            logger.error(f"Complete search failure: {error}")
            
            if self.enable_metrics and _HAS_METRICS:
                search_requests_total.labels(
                    strategy='unknown',
                    status='error'
                ).inc()
                
            raise SmartSearchError(
                f"Search failed: {str(error)}",
                "SEARCH_COMPLETE_FAILURE",
                {"query": query, "error": str(error)}
            )
    
    async def secure_search(
        self,
        query: str,
        user_context: SecurityContext,
        options: Optional[SearchOptions] = None
    ) -> SecureSearchResponse:
        """
        Perform enterprise search with data governance and security.
        
        Args:
            query: Search query string
            user_context: Security context with user information
            options: Search options and filters
            
        Returns:
            SecureSearchResponse with masked results and audit information
        """
        if not self.data_governance:
            raise SmartSearchError(
                "Data governance not configured",
                "DATA_GOVERNANCE_NOT_AVAILABLE"
            )
            
        if options is None:
            options = SearchOptions()
            
        start_time = time.time()
        audit_id = ""
        
        try:
            # Apply row-level security to search options
            secured_options = await self.data_governance.apply_row_level_security(
                options, "default", user_context
            )
            
            # Perform the search
            search_response = await self.search(query, secured_options)
            
            # Apply field-level masking
            masked_results = await self.data_governance.mask_sensitive_fields(
                search_response.results,
                user_context.user_role,
                user_context
            )
            
            # Audit the search operation
            audit_id = await self.data_governance.audit_search_access(
                query,
                user_context,
                masked_results,
                search_response.performance.search_time,
                success=True
            )
            
            return SecureSearchResponse(
                results=masked_results,
                performance=search_response.performance,
                strategy=search_response.strategy,
                audit_id=audit_id,
                compliance_status="COMPLIANT",
                metadata={
                    **search_response.metadata,
                    "user_id": user_context.user_id,
                    "user_role": user_context.user_role,
                    "security_applied": True
                }
            )
            
        except Exception as error:
            # Audit the failed search
            if self.data_governance:
                audit_id = await self.data_governance.audit_search_access(
                    query,
                    user_context,
                    [],
                    (time.time() - start_time) * 1000,
                    success=False,
                    error_message=str(error)
                )
            
            raise SecurityAccessDeniedError(
                f"Secure search failed: {str(error)}",
                user_context.user_id,
                "authorized_user",
                user_context.user_role,
                {"audit_id": audit_id}
            )
    
    async def hybrid_search(
        self,
        query: str,
        options: Optional[SearchOptions] = None
    ) -> SearchResponse:
        """
        Perform hybrid search combining cache and database results.
        
        Args:
            query: Search query string
            options: Search options and filters
            
        Returns:
            SearchResponse with merged results from both sources
        """
        if not self.hybrid_search_enabled or not self.cache:
            return await self.search(query, options)
            
        if options is None:
            options = SearchOptions()
            
        start_time = time.time()
        
        try:
            # Execute both searches in parallel
            cache_task = self._search_with_cache(query, options)
            db_task = self._search_with_database(query, options)
            
            cache_results, db_results = await asyncio.gather(
                cache_task, db_task, return_exceptions=True
            )
            
            # Process results
            cache_success = not isinstance(cache_results, Exception)
            db_success = not isinstance(db_results, Exception)
            
            if cache_success and db_success:
                # Both succeeded - merge results
                merged_results = self._merge_search_results(
                    cache_results, db_results
                )
                strategy_info = SearchStrategyInfo(
                    primary=SearchStrategy.HYBRID,
                    fallback=SearchStrategy.DATABASE,
                    reason=f"Hybrid search: merged {len(cache_results)} cache + {len(db_results)} database results"
                )
            elif cache_success:
                merged_results = cache_results
                strategy_info = SearchStrategyInfo(
                    primary=SearchStrategy.CACHE,
                    fallback=SearchStrategy.DATABASE,
                    reason="Database failed, using cache results only"
                )
            elif db_success:
                merged_results = db_results
                strategy_info = SearchStrategyInfo(
                    primary=SearchStrategy.DATABASE,
                    fallback=SearchStrategy.CACHE,
                    reason="Cache failed, using database results only"
                )
            else:
                raise SmartSearchError(
                    "Both cache and database searches failed",
                    "HYBRID_SEARCH_COMPLETE_FAILURE"
                )
                
            performance = SearchPerformance(
                search_time=(time.time() - start_time) * 1000,
                result_count=len(merged_results),
                strategy=SearchStrategy.HYBRID,
                cache_hit=cache_success,
                errors=[
                    f"Cache error: {cache_results}" if not cache_success else None,
                    f"Database error: {db_results}" if not db_success else None
                ]
            )
            
            return SearchResponse(
                results=merged_results,
                performance=performance,
                strategy=strategy_info,
                metadata={
                    "hybrid_search": True,
                    "cache_results": len(cache_results) if cache_success else 0,
                    "db_results": len(db_results) if db_success else 0
                }
            )
            
        except Exception as error:
            raise SmartSearchError(
                f"Hybrid search failed: {str(error)}",
                "HYBRID_SEARCH_ERROR"
            )
    
    async def get_cache_health(self) -> Optional[HealthStatus]:
        """Get cached health status for cache provider."""
        if not self.cache:
            return None
            
        cache_key = "cache"
        now = time.time()
        
        # Return cached health if recent
        if cache_key in self._health_cache:
            health_status, timestamp = self._health_cache[cache_key]
            if now - timestamp < self._health_cache_ttl:
                return health_status
                
        try:
            health_status = await self.cache.check_health()
            self._health_cache[cache_key] = (health_status, now)
            return health_status
        except Exception as error:
            logger.error(f"Cache health check failed: {error}")
            # Return cached status or default unhealthy status
            if cache_key in self._health_cache:
                return self._health_cache[cache_key][0]
            return HealthStatus(
                is_connected=False,
                is_search_available=False,
                latency=-1,
                memory_usage="0",
                key_count=0,
                last_sync=None,
                errors=[str(error)]
            )
    
    async def get_search_stats(self) -> Dict[str, Any]:
        """Get comprehensive search service statistics."""
        cache_health = await self.get_cache_health()
        database_health = await self.database.check_health()
        
        return {
            "cache_health": cache_health,
            "database_health": database_health,
            "circuit_breakers": {
                name: {
                    "state": cb.state,
                    "failure_count": cb.failure_count,
                    "success_count": cb.success_count
                }
                for name, cb in self.circuit_breakers.items()
            },
            "recommended_strategy": await self._determine_search_strategy(),
            "configuration": {
                "hybrid_search_enabled": self.hybrid_search_enabled,
                "data_governance_enabled": self.data_governance is not None,
                "metrics_enabled": self.enable_metrics and _HAS_METRICS,
                "cache_enabled": self.cache is not None
            }
        }
    
    async def clear_cache(self, pattern: Optional[str] = None) -> None:
        """Clear cache data with optional pattern matching."""
        if not self.cache:
            return
            
        try:
            await self.cache.clear(pattern)
            if self.log_queries:
                logger.info("Cache cleared successfully")
        except Exception as error:
            logger.error(f"Failed to clear cache: {error}")
    
    # Private helper methods
    async def _determine_search_strategy(self) -> SearchStrategyInfo:
        """Determine the optimal search strategy based on health and circuit breaker states."""
        if not self.cache:
            return SearchStrategyInfo(
                primary=SearchStrategy.DATABASE,
                fallback=SearchStrategy.DATABASE,
                reason="No cache provider configured"
            )
            
        # Check circuit breakers
        if "cache" in self.circuit_breakers and self.circuit_breakers["cache"].is_open():
            return SearchStrategyInfo(
                primary=SearchStrategy.DATABASE,
                fallback=SearchStrategy.DATABASE,
                reason="Cache circuit breaker is open"
            )
            
        # Check cache health
        cache_health = await self.get_cache_health()
        
        if (cache_health and 
            cache_health.is_connected and 
            cache_health.is_search_available and 
            cache_health.latency < 1000):
            
            return SearchStrategyInfo(
                primary=SearchStrategy.CACHE,
                fallback=SearchStrategy.DATABASE,
                reason=f"Cache healthy ({cache_health.latency}ms latency)"
            )
            
        if cache_health and cache_health.is_connected and not cache_health.is_search_available:
            return SearchStrategyInfo(
                primary=SearchStrategy.DATABASE,
                fallback=SearchStrategy.CACHE,
                reason="Cache connected but search unavailable"
            )
            
        # Cache unavailable
        return SearchStrategyInfo(
            primary=SearchStrategy.DATABASE,
            fallback=SearchStrategy.DATABASE,
            reason="Cache unavailable or unhealthy"
        )
    
    async def _search_with_cache(self, query: str, options: SearchOptions) -> List[SearchResult]:
        """Search using cache provider with circuit breaker protection."""
        if not self.cache:
            raise CacheConnectionError("Cache provider not configured")
            
        circuit_breaker = self.circuit_breakers.get("cache")
        if circuit_breaker:
            return await circuit_breaker.call(self.cache.search, query, options)
        else:
            return await self.cache.search(query, options)
    
    async def _search_with_database(self, query: str, options: SearchOptions) -> List[SearchResult]:
        """Search using database provider with circuit breaker protection."""
        circuit_breaker = self.circuit_breakers.get("database")
        if circuit_breaker:
            return await circuit_breaker.call(self.database.search, query, options)
        else:
            return await self.database.search(query, options)
    
    async def _cache_results(self, query: str, options: SearchOptions, results: List[SearchResult]) -> None:
        """Cache search results for future use."""
        if not self.cache or not results:
            return
            
        try:
            cache_key = self._generate_cache_key(query, options)
            ttl = options.cache_ttl or self.cache_config.get("default_ttl", 300)
            
            # Convert results to dict for JSON serialization
            cached_data = [result.to_dict() for result in results]
            await self.cache.set(cache_key, cached_data, ttl)
            
        except Exception as error:
            logger.warning(f"Failed to cache search results: {error}")
    
    def _generate_cache_key(self, query: str, options: SearchOptions) -> str:
        """Generate cache key from query and options."""
        import hashlib
        
        # Create a deterministic key from query and options
        key_data = {
            "query": query,
            "limit": options.limit,
            "offset": options.offset,
            "sort_by": options.sort_by.value,
            "sort_order": options.sort_order.value,
            "filters": options.filters.to_dict() if options.filters else {}
        }
        
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        return f"search:{key_hash}"
    
    def _merge_search_results(
        self, 
        cache_results: List[SearchResult], 
        db_results: List[SearchResult]
    ) -> List[SearchResult]:
        """Merge results from cache and database sources."""
        algorithm = self.hybrid_search_config.get("merging_algorithm", "weighted")
        cache_weight = self.hybrid_search_config.get("cache_weight", 0.7)
        db_weight = self.hybrid_search_config.get("database_weight", 0.3)
        
        if algorithm == "union":
            return self._union_merge(cache_results, db_results)
        elif algorithm == "intersection":
            return self._intersection_merge(cache_results, db_results)
        elif algorithm == "weighted":
            return self._weighted_merge(cache_results, db_results, cache_weight, db_weight)
        else:
            return self._union_merge(cache_results, db_results)
    
    def _union_merge(self, cache_results: List[SearchResult], db_results: List[SearchResult]) -> List[SearchResult]:
        """Union merge - combine all results, prioritizing cache results."""
        seen_ids = set()
        merged = []
        
        # Add cache results first
        for result in cache_results:
            if result.id not in seen_ids:
                seen_ids.add(result.id)
                merged.append(result)
                
        # Add database results not already included
        for result in db_results:
            if result.id not in seen_ids:
                seen_ids.add(result.id)
                merged.append(result)
                
        return sorted(merged, key=lambda x: x.relevance_score, reverse=True)
    
    def _intersection_merge(self, cache_results: List[SearchResult], db_results: List[SearchResult]) -> List[SearchResult]:
        """Intersection merge - only results present in both sources."""
        db_results_map = {r.id: r for r in db_results}
        intersection = []
        
        for cache_result in cache_results:
            db_result = db_results_map.get(cache_result.id)
            if db_result:
                # Use the result with higher relevance score
                best_result = cache_result if cache_result.relevance_score >= db_result.relevance_score else db_result
                intersection.append(best_result)
                
        return sorted(intersection, key=lambda x: x.relevance_score, reverse=True)
    
    def _weighted_merge(
        self, 
        cache_results: List[SearchResult], 
        db_results: List[SearchResult],
        cache_weight: float,
        db_weight: float
    ) -> List[SearchResult]:
        """Weighted merge - combine results with weighted relevance scores."""
        result_map = {}
        
        # Process cache results
        for result in cache_results:
            weighted_score = int(result.relevance_score * cache_weight)
            new_result = replace(result, relevance_score=weighted_score)
            if hasattr(new_result, 'metadata'):
                new_result.metadata = {
                    **(new_result.metadata or {}),
                    "source": "cache",
                    "original_score": result.relevance_score,
                    "weighted_score": weighted_score
                }
            result_map[result.id] = new_result
            
        # Process database results
        for result in db_results:
            weighted_score = int(result.relevance_score * db_weight)
            
            if result.id in result_map:
                # Combine scores
                existing = result_map[result.id]
                combined_score = existing.relevance_score + weighted_score
                combined_result = replace(existing, relevance_score=combined_score)
                if hasattr(combined_result, 'metadata'):
                    combined_result.metadata = {
                        **(combined_result.metadata or {}),
                        "source": "hybrid",
                        "cache_score": existing.relevance_score,
                        "database_score": weighted_score,
                        "combined_score": combined_score
                    }
                result_map[result.id] = combined_result
            else:
                new_result = replace(result, relevance_score=weighted_score)
                if hasattr(new_result, 'metadata'):
                    new_result.metadata = {
                        **(new_result.metadata or {}),
                        "source": "database",
                        "original_score": result.relevance_score,
                        "weighted_score": weighted_score
                    }
                result_map[result.id] = new_result
                
        return sorted(result_map.values(), key=lambda x: x.relevance_score, reverse=True)
    
    def _log_search_performance(
        self, 
        query: str, 
        performance: SearchPerformance, 
        strategy: SearchStrategyInfo
    ) -> None:
        """Log search performance metrics."""
        log_level = logging.WARNING if performance.errors else logging.INFO
        
        if self.log_queries or performance.search_time > self.slow_query_threshold:
            logger.log(
                log_level,
                f"Search '{query[:50]}...': {performance.result_count} results in {performance.search_time:.1f}ms "
                f"via {performance.strategy.value} ({strategy.reason})"
            )
            
        if performance.search_time > self.slow_query_threshold:
            logger.warning(f"Slow query detected: {performance.search_time:.1f}ms for '{query[:50]}...'")
    
    def _contains_sensitive_data(self, query: str) -> bool:
        """Check if query contains potentially sensitive information."""
        sensitive_patterns = [
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN pattern
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email pattern
            r'\b\d{3}-\d{3}-\d{4}\b',  # Phone pattern
        ]
        
        import re
        for pattern in sensitive_patterns:
            if re.search(pattern, query):
                return True
        return False
    
    async def __aenter__(self):
        """Async context manager entry."""
        if hasattr(self.database, 'connect'):
            await self.database.connect()
        if self.cache and hasattr(self.cache, 'connect'):
            await self.cache.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if hasattr(self.database, 'disconnect'):
            await self.database.disconnect()
        if self.cache and hasattr(self.cache, 'disconnect'):
            await self.cache.disconnect()


# Convenience function for quick setup
async def create_search_from_providers(
    database: DatabaseProvider,
    cache: Optional[CacheProvider] = None,
    **config_kwargs
) -> SmartSearch:
    """Create SmartSearch instance from provider instances."""
    config = SmartSearchConfig(
        database=database,
        cache=cache,
        **config_kwargs
    )
    
    search = SmartSearch(config)
    
    # Initialize connections
    async with search:
        return search