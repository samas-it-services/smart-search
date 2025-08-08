"""
PostgreSQL Provider for Smart Search Python SDK
Enterprise-grade PostgreSQL search with advanced indexing and performance analysis
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from contextlib import asynccontextmanager

try:
    import asyncpg
    _HAS_ASYNCPG = True
except ImportError:
    _HAS_ASYNCPG = False
    asyncpg = None

from ..core.types import (
    SearchResult,
    SearchOptions, 
    SearchResultType,
    MatchType,
    HealthStatus,
    SortBy,
    SortOrder,
    DatabaseConnectionError,
    SmartSearchError,
)

logger = logging.getLogger(__name__)


class PostgreSQLProvider:
    """
    PostgreSQL database provider with advanced search capabilities.
    
    Features:
    - Full-text search with GIN indexes
    - Trigram similarity search
    - Semantic search preparation
    - Performance analysis and query optimization
    - Connection pooling with asyncpg
    - Advanced indexing strategies
    """
    
    name = "postgresql"
    
    def __init__(
        self,
        connection_string: str,
        pool_size: int = 20,
        max_pool_size: int = 30,
        search_config: Optional[Dict[str, Any]] = None
    ):
        if not _HAS_ASYNCPG:
            raise DatabaseConnectionError(
                "asyncpg is required for PostgreSQL provider. Install with: pip install asyncpg"
            )
            
        self.connection_string = connection_string
        self.pool_size = pool_size
        self.max_pool_size = max_pool_size
        self.search_config = search_config or {}
        
        self.pool: Optional[asyncpg.Pool] = None
        self.connected = False
        
        # Performance tracking
        self.query_stats = {
            "total_queries": 0,
            "total_time": 0,
            "slow_queries": 0,
            "error_count": 0
        }
        
        # Default search configuration
        self.default_search_config = {
            "use_full_text_search": True,
            "use_trigram_search": True,
            "similarity_threshold": 0.3,
            "max_results": 1000,
            "highlight_results": True,
            "enable_fuzzy_search": True,
            "search_rank_normalization": True
        }
        self.search_config = {**self.default_search_config, **self.search_config}
        
    async def connect(self) -> None:
        """Establish connection pool to PostgreSQL."""
        try:
            self.pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=self.pool_size,
                max_size=self.max_pool_size,
                command_timeout=60,
                server_settings={
                    'jit': 'off',  # Disable JIT for consistent performance
                    'application_name': 'smart_search_python'
                }
            )
            self.connected = True
            logger.info(f"Connected to PostgreSQL with pool size {self.pool_size}-{self.max_pool_size}")
            
            # Initialize advanced features
            await self._initialize_extensions()
            
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise DatabaseConnectionError(f"PostgreSQL connection failed: {str(e)}")
    
    async def disconnect(self) -> None:
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
            self.connected = False
            logger.info("Disconnected from PostgreSQL")
    
    async def is_connected(self) -> bool:
        """Check if database is connected."""
        if not self.pool:
            return False
            
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
                return True
        except Exception:
            return False
    
    async def search(self, query: str, options: SearchOptions) -> List[SearchResult]:
        """
        Perform advanced PostgreSQL search with multiple strategies.
        
        Combines:
        - Full-text search with ts_vector
        - Trigram similarity for fuzzy matching
        - ILIKE pattern matching for exact matches
        - Semantic ranking and highlighting
        """
        if not self.pool:
            raise DatabaseConnectionError("Not connected to PostgreSQL")
        
        start_time = time.time()
        
        try:
            async with self.pool.acquire() as conn:
                # Build dynamic query based on search configuration
                search_query, params = self._build_search_query(query, options)
                
                # Execute search with performance tracking
                logger.debug(f"Executing PostgreSQL search: {search_query}")
                rows = await conn.fetch(search_query, *params)
                
                # Convert to SearchResult objects
                results = self._convert_rows_to_results(rows, query)
                
                # Apply result filtering and sorting
                filtered_results = self._apply_post_processing(results, options)
                
                # Update performance statistics
                query_time = (time.time() - start_time) * 1000
                self._update_query_stats(query_time, len(filtered_results))
                
                logger.info(f"PostgreSQL search returned {len(filtered_results)} results in {query_time:.1f}ms")
                return filtered_results
                
        except Exception as e:
            self.query_stats["error_count"] += 1
            logger.error(f"PostgreSQL search failed: {e}")
            raise SmartSearchError(f"PostgreSQL search error: {str(e)}", "POSTGRESQL_SEARCH_ERROR")
    
    async def check_health(self) -> HealthStatus:
        """Check PostgreSQL health and performance metrics."""
        if not self.pool:
            return HealthStatus(
                is_connected=False,
                is_search_available=False,
                latency=-1,
                memory_usage="0",
                key_count=0,
                last_sync=None,
                errors=["Not connected to PostgreSQL"],
                status="unhealthy"
            )
        
        try:
            start_time = time.time()
            
            async with self.pool.acquire() as conn:
                # Test basic connectivity
                await conn.fetchval("SELECT 1")
                
                # Get database statistics
                stats = await conn.fetchrow("""
                    SELECT 
                        pg_database_size(current_database()) as db_size,
                        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
                        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
                """)
                
                # Calculate latency
                latency = (time.time() - start_time) * 1000
                
                # Check if search extensions are available
                extensions = await conn.fetch("""
                    SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm', 'btree_gin')
                """)
                extension_names = [row['extname'] for row in extensions]
                
                is_search_available = 'pg_trgm' in extension_names
                
                return HealthStatus(
                    is_connected=True,
                    is_search_available=is_search_available,
                    latency=latency,
                    memory_usage=f"{stats['db_size'] // (1024*1024)}MB",
                    key_count=stats['table_count'],
                    last_sync=None,
                    status="healthy" if latency < 100 else "degraded",
                    response_time=latency,
                    details={
                        "active_connections": stats['active_connections'],
                        "database_size_bytes": stats['db_size'],
                        "available_extensions": extension_names,
                        "query_stats": self.query_stats.copy()
                    }
                )
        
        except Exception as e:
            logger.error(f"PostgreSQL health check failed: {e}")
            return HealthStatus(
                is_connected=False,
                is_search_available=False,
                latency=-1,
                memory_usage="0",
                key_count=0,
                last_sync=None,
                errors=[str(e)],
                status="unhealthy"
            )
    
    async def create_optimized_indexes(self, table_name: str = "search_data") -> None:
        """Create optimized search indexes for better performance."""
        if not self.pool:
            raise DatabaseConnectionError("Not connected to PostgreSQL")
        
        try:
            async with self.pool.acquire() as conn:
                # Create GIN index for full-text search
                await conn.execute(f"""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table_name}_fts 
                    ON {table_name} USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')))
                """)
                
                # Create trigram indexes for fuzzy search
                await conn.execute(f"""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table_name}_title_trgm 
                    ON {table_name} USING GIN(title gin_trgm_ops)
                """)
                
                await conn.execute(f"""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table_name}_desc_trgm 
                    ON {table_name} USING GIN(description gin_trgm_ops)
                """)
                
                # Create composite indexes for common queries
                await conn.execute(f"""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table_name}_type_date 
                    ON {table_name} (type, created_at DESC)
                """)
                
                await conn.execute(f"""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table_name}_category_vis 
                    ON {table_name} (category, visibility) WHERE visibility = 'public'
                """)
                
                logger.info(f"Created optimized search indexes for {table_name}")
                
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
            raise SmartSearchError(f"Index creation failed: {str(e)}", "INDEX_CREATION_ERROR")
    
    async def analyze_search_performance(self, query: str, options: SearchOptions) -> Dict[str, Any]:
        """Analyze search query performance and provide optimization suggestions."""
        if not self.pool:
            raise DatabaseConnectionError("Not connected to PostgreSQL")
        
        try:
            async with self.pool.acquire() as conn:
                # Build the search query
                search_query, params = self._build_search_query(query, options)
                
                # Get query execution plan
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {search_query}"
                explain_result = await conn.fetchval(explain_query, *params)
                
                # Extract performance metrics
                plan = explain_result[0]["Plan"]
                execution_time = explain_result[0]["Execution Time"]
                planning_time = explain_result[0]["Planning Time"]
                
                # Generate optimization suggestions
                suggestions = self._generate_optimization_suggestions(plan, query, options)
                
                return {
                    "query_plan": explain_result,
                    "execution_time": execution_time,
                    "planning_time": planning_time,
                    "total_time": execution_time + planning_time,
                    "suggestions": suggestions,
                    "query": search_query,
                    "parameters": params
                }
                
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
            raise SmartSearchError(f"Performance analysis error: {str(e)}", "PERFORMANCE_ANALYSIS_ERROR")
    
    # Private helper methods
    
    async def _initialize_extensions(self) -> None:
        """Initialize required PostgreSQL extensions."""
        try:
            async with self.pool.acquire() as conn:
                # Enable trigram extension for fuzzy search
                await conn.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
                
                # Enable btree_gin for composite indexes
                await conn.execute("CREATE EXTENSION IF NOT EXISTS btree_gin")
                
                logger.info("PostgreSQL extensions initialized")
                
        except Exception as e:
            logger.warning(f"Failed to initialize some extensions: {e}")
    
    def _build_search_query(self, query: str, options: SearchOptions) -> tuple[str, List[Any]]:
        """Build dynamic search query based on configuration and options."""
        base_table = "search_data"  # This would be configurable
        
        # Sanitize and prepare query
        search_term = query.strip().replace("'", "''")
        
        # Start building the query components
        select_parts = [
            "id",
            "type", 
            "title",
            "description",
            "author",
            "category",
            "language",
            "visibility",
            "created_at",
            "metadata"
        ]
        
        # Add relevance scoring
        if self.search_config["use_full_text_search"]:
            select_parts.append(
                "ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '')), plainto_tsquery('english', $1)) as fts_rank"
            )
        
        if self.search_config["use_trigram_search"]:
            select_parts.append(
                f"GREATEST(similarity(title, $1), similarity(COALESCE(description, ''), $1)) as similarity_rank"
            )
        
        # Build WHERE clauses
        where_conditions = ["visibility = 'public'"]  # Default visibility filter
        params = [search_term]
        
        # Add search conditions
        search_conditions = []
        
        if self.search_config["use_full_text_search"]:
            search_conditions.append(
                "to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)"
            )
        
        if self.search_config["use_trigram_search"]:
            threshold = self.search_config["similarity_threshold"]
            search_conditions.append(
                f"(similarity(title, $1) > {threshold} OR similarity(COALESCE(description, ''), $1) > {threshold})"
            )
        
        # Add fuzzy search with ILIKE
        if self.search_config["enable_fuzzy_search"]:
            search_conditions.append("(title ILIKE $2 OR description ILIKE $2)")
            params.append(f"%{search_term}%")
        
        # Combine search conditions with OR
        if search_conditions:
            where_conditions.append(f"({' OR '.join(search_conditions)})")
        
        # Add filters from options
        if options.filters and options.filters.type:
            type_placeholders = ",".join(f"${len(params) + i + 1}" for i in range(len(options.filters.type)))
            where_conditions.append(f"type IN ({type_placeholders})")
            params.extend([t.value if hasattr(t, 'value') else str(t) for t in options.filters.type])
        
        if options.filters and options.filters.category:
            category_placeholders = ",".join(f"${len(params) + i + 1}" for i in range(len(options.filters.category)))
            where_conditions.append(f"category IN ({category_placeholders})")
            params.extend(options.filters.category)
        
        # Build ORDER BY clause
        order_parts = []
        if self.search_config["use_full_text_search"]:
            order_parts.append("fts_rank DESC")
        if self.search_config["use_trigram_search"]:
            order_parts.append("similarity_rank DESC")
        
        # Add user-specified sorting
        if options.sort_by == SortBy.DATE:
            order_parts.append(f"created_at {options.sort_order.value.upper()}")
        elif options.sort_by == SortBy.NAME:
            order_parts.append(f"title {options.sort_order.value.upper()}")
        
        # Default fallback sorting
        if not order_parts:
            order_parts.append("created_at DESC")
        
        # Construct final query
        query_sql = f"""
            SELECT {', '.join(select_parts)}
            FROM {base_table}
            WHERE {' AND '.join(where_conditions)}
            ORDER BY {', '.join(order_parts)}
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        
        params.extend([options.limit, options.offset])
        
        return query_sql, params
    
    def _convert_rows_to_results(self, rows: List[asyncpg.Record], query: str) -> List[SearchResult]:
        """Convert database rows to SearchResult objects."""
        results = []
        
        for row in rows:
            try:
                # Determine match type based on where the query was found
                match_type = self._determine_match_type(row, query)
                
                # Calculate relevance score
                relevance_score = self._calculate_relevance_score(row, query)
                
                # Parse metadata if it exists
                metadata = {}
                if hasattr(row, 'metadata') and row.metadata:
                    if isinstance(row.metadata, str):
                        metadata = json.loads(row.metadata)
                    elif isinstance(row.metadata, dict):
                        metadata = row.metadata
                
                # Create SearchResult
                result = SearchResult(
                    id=str(row.id),
                    type=SearchResultType(row.type) if row.type else SearchResultType.CUSTOM,
                    title=row.title or "",
                    relevance_score=relevance_score,
                    match_type=match_type,
                    description=row.description,
                    author=row.author,
                    category=row.category,
                    language=row.language or "en",
                    visibility=row.visibility or "public",
                    created_at=row.created_at,
                    metadata=metadata
                )
                
                results.append(result)
                
            except Exception as e:
                logger.warning(f"Failed to convert row to SearchResult: {e}")
                continue
        
        return results
    
    def _determine_match_type(self, row: asyncpg.Record, query: str) -> MatchType:
        """Determine where the search query matched."""
        query_lower = query.lower()
        
        if hasattr(row, 'title') and row.title and query_lower in row.title.lower():
            return MatchType.TITLE
        elif hasattr(row, 'author') and row.author and query_lower in row.author.lower():
            return MatchType.AUTHOR  
        elif hasattr(row, 'description') and row.description and query_lower in row.description.lower():
            return MatchType.DESCRIPTION
        elif hasattr(row, 'category') and row.category and query_lower in row.category.lower():
            return MatchType.CATEGORY
        else:
            return MatchType.CUSTOM
    
    def _calculate_relevance_score(self, row: asyncpg.Record, query: str) -> int:
        """Calculate relevance score based on available ranking data."""
        score = 50  # Base score
        
        # Use full-text search rank if available
        if hasattr(row, 'fts_rank') and row.fts_rank:
            score += int(row.fts_rank * 40)
        
        # Use trigram similarity rank if available
        if hasattr(row, 'similarity_rank') and row.similarity_rank:
            score += int(row.similarity_rank * 30)
        
        # Boost for exact matches in title
        if hasattr(row, 'title') and row.title and query.lower() in row.title.lower():
            score += 20
        
        # Ensure score is within valid range
        return max(0, min(100, score))
    
    def _apply_post_processing(self, results: List[SearchResult], options: SearchOptions) -> List[SearchResult]:
        """Apply final filtering and sorting to results."""
        filtered_results = results
        
        # Apply additional date range filtering if specified
        if options.filters and options.filters.date_range:
            date_range = options.filters.date_range
            if date_range.start or date_range.end:
                filtered_results = [
                    r for r in filtered_results
                    if self._is_within_date_range(r.created_at, date_range.start, date_range.end)
                ]
        
        # Ensure results are sorted according to user preference
        if options.sort_by == SortBy.RELEVANCE:
            filtered_results.sort(key=lambda x: x.relevance_score, reverse=(options.sort_order == SortOrder.DESC))
        elif options.sort_by == SortBy.DATE and all(r.created_at for r in filtered_results):
            filtered_results.sort(key=lambda x: x.created_at or x.created_at, reverse=(options.sort_order == SortOrder.DESC))
        elif options.sort_by == SortBy.NAME:
            filtered_results.sort(key=lambda x: x.title.lower(), reverse=(options.sort_order == SortOrder.DESC))
        
        return filtered_results
    
    def _is_within_date_range(self, date, start_date, end_date) -> bool:
        """Check if date is within the specified range."""
        if not date:
            return True
            
        if start_date and date < start_date:
            return False
        if end_date and date > end_date:
            return False
        return True
    
    def _update_query_stats(self, query_time: float, result_count: int) -> None:
        """Update internal performance statistics."""
        self.query_stats["total_queries"] += 1
        self.query_stats["total_time"] += query_time
        
        if query_time > 1000:  # Queries slower than 1 second
            self.query_stats["slow_queries"] += 1
    
    def _generate_optimization_suggestions(self, plan: Dict[str, Any], query: str, options: SearchOptions) -> List[str]:
        """Generate performance optimization suggestions based on query plan."""
        suggestions = []
        
        # Check for sequential scans
        if self._has_sequential_scan(plan):
            suggestions.append("Consider adding indexes for better performance - detected sequential scan")
        
        # Check for high cost operations
        if plan.get("Total Cost", 0) > 1000:
            suggestions.append("Query has high cost - consider optimizing filters or adding more selective indexes")
        
        # Check for high buffer usage
        if plan.get("Shared Hit Blocks", 0) + plan.get("Shared Read Blocks", 0) > 1000:
            suggestions.append("High buffer usage detected - consider increasing shared_buffers or optimizing query")
        
        # Suggest specific optimizations based on search configuration
        if self.search_config["use_full_text_search"] and not self._has_gin_index_usage(plan):
            suggestions.append("Full-text search is enabled but GIN index may not be used - verify index exists")
        
        if self.search_config["use_trigram_search"] and len(query) < 3:
            suggestions.append("Trigram search works best with queries of 3+ characters")
        
        return suggestions
    
    def _has_sequential_scan(self, plan: Dict[str, Any]) -> bool:
        """Check if query plan contains sequential scans."""
        if plan.get("Node Type") == "Seq Scan":
            return True
        
        if "Plans" in plan:
            return any(self._has_sequential_scan(subplan) for subplan in plan["Plans"])
        
        return False
    
    def _has_gin_index_usage(self, plan: Dict[str, Any]) -> bool:
        """Check if query plan uses GIN indexes."""
        if plan.get("Node Type") == "Bitmap Index Scan" and "gin" in plan.get("Index Name", "").lower():
            return True
        
        if "Plans" in plan:
            return any(self._has_gin_index_usage(subplan) for subplan in plan["Plans"])
        
        return False