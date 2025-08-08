"""
Core type definitions for smart-search Python SDK
Compatible with TypeScript implementation
"""

from typing import (
    Any,
    Dict,
    List,
    Optional,
    Union,
    Literal,
    Protocol,
    runtime_checkable,
)
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid


# Enums for better type safety
class SearchResultType(str, Enum):
    """Types of search results."""
    BOOK = "book"
    USER = "user"
    BOOK_CLUB = "book_club"
    AUTHOR = "author"
    QA = "qa"
    CUSTOM = "custom"
    FINANCIAL_DATA = "financial_data"
    HEALTHCARE_DATA = "healthcare_data"
    RETAIL_DATA = "retail_data"
    EDUCATION_DATA = "education_data"
    REAL_ESTATE_DATA = "real_estate_data"


class MatchType(str, Enum):
    """Types of search matches."""
    TITLE = "title"
    AUTHOR = "author"
    DESCRIPTION = "description"
    USERNAME = "username"
    NAME = "name"
    TAG = "tag"
    CATEGORY = "category"
    LANGUAGE = "language"
    ISBN = "isbn"
    UPLOADER = "uploader"
    QUESTION = "question"
    ANSWER = "answer"
    CUSTOM = "custom"


class SearchStrategy(str, Enum):
    """Search execution strategies."""
    CACHE = "cache"
    DATABASE = "database"
    HYBRID = "hybrid"


class SortBy(str, Enum):
    """Search result sorting options."""
    RELEVANCE = "relevance"
    DATE = "date"
    VIEWS = "views"
    NAME = "name"
    CUSTOM = "custom"


class SortOrder(str, Enum):
    """Search result sort order."""
    ASC = "asc"
    DESC = "desc"


# Data classes for structured data
@dataclass
class SearchResult:
    """Represents a single search result."""
    id: str
    type: SearchResultType
    title: str
    relevance_score: int
    match_type: MatchType
    
    # Optional fields
    subtitle: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = "en"
    visibility: Optional[str] = "public"
    thumbnail: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    member_count: Optional[int] = None
    book_count: Optional[int] = None
    view_count: Optional[int] = None
    created_at: Optional[datetime] = None
    tags: Optional[List[str]] = None
    isbn: Optional[str] = None
    uploader_name: Optional[str] = None
    uploader_email: Optional[str] = None
    url: Optional[str] = None
    score: Optional[float] = None
    book_title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = field(default_factory=dict)

    def __post_init__(self):
        """Validate and normalize data after initialization."""
        if not isinstance(self.type, SearchResultType):
            self.type = SearchResultType(self.type)
        if not isinstance(self.match_type, MatchType):
            self.match_type = MatchType(self.match_type)
        
        # Ensure relevance_score is within valid range
        self.relevance_score = max(0, min(100, self.relevance_score))

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {}
        for key, value in self.__dict__.items():
            if value is not None:
                if isinstance(value, datetime):
                    result[key] = value.isoformat()
                elif isinstance(value, Enum):
                    result[key] = value.value
                else:
                    result[key] = value
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SearchResult":
        """Create SearchResult from dictionary."""
        # Handle datetime fields
        if "created_at" in data and isinstance(data["created_at"], str):
            try:
                data["created_at"] = datetime.fromisoformat(data["created_at"])
            except ValueError:
                data["created_at"] = None
        
        # Handle enum fields
        if "type" in data and isinstance(data["type"], str):
            data["type"] = SearchResultType(data["type"])
        if "match_type" in data and isinstance(data["match_type"], str):
            data["match_type"] = MatchType(data["match_type"])
            
        return cls(**data)


@dataclass
class DateRange:
    """Date range filter."""
    start: Optional[datetime] = None
    end: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Optional[str]]:
        return {
            "start": self.start.isoformat() if self.start else None,
            "end": self.end.isoformat() if self.end else None,
        }


@dataclass
class SearchFilters:
    """Search filtering options."""
    type: Optional[List[SearchResultType]] = None
    category: Optional[List[str]] = None
    language: Optional[List[str]] = None
    visibility: Optional[List[str]] = None
    date_range: Optional[DateRange] = None
    custom: Optional[Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = {}
        if self.type:
            result["type"] = [t.value if isinstance(t, SearchResultType) else t for t in self.type]
        if self.category:
            result["category"] = self.category
        if self.language:
            result["language"] = self.language
        if self.visibility:
            result["visibility"] = self.visibility
        if self.date_range:
            result["date_range"] = self.date_range.to_dict()
        if self.custom:
            result["custom"] = self.custom
        return result


@dataclass 
class SearchOptions:
    """Search configuration options."""
    limit: int = 20
    offset: int = 0
    filters: Optional[SearchFilters] = None
    sort_by: SortBy = SortBy.RELEVANCE
    sort_order: SortOrder = SortOrder.DESC
    cache_enabled: bool = True
    cache_ttl: Optional[int] = None  # TTL in seconds
    fallback_enabled: bool = True
    timeout: Optional[float] = None  # Timeout in seconds

    def __post_init__(self):
        """Validate options after initialization."""
        if not isinstance(self.sort_by, SortBy):
            self.sort_by = SortBy(self.sort_by)
        if not isinstance(self.sort_order, SortOrder):
            self.sort_order = SortOrder(self.sort_order)
        if self.filters is None:
            self.filters = SearchFilters()


@dataclass
class SearchStrategyInfo:
    """Information about search strategy used."""
    primary: SearchStrategy
    fallback: SearchStrategy
    reason: str

    def __post_init__(self):
        if not isinstance(self.primary, SearchStrategy):
            self.primary = SearchStrategy(self.primary)
        if not isinstance(self.fallback, SearchStrategy):
            self.fallback = SearchStrategy(self.fallback)


@dataclass
class SearchPerformance:
    """Search performance metrics."""
    search_time: float  # Time in milliseconds
    result_count: int
    strategy: SearchStrategy
    cache_hit: bool
    errors: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not isinstance(self.strategy, SearchStrategy):
            self.strategy = SearchStrategy(self.strategy)


@dataclass
class HealthStatus:
    """Health status information."""
    is_connected: bool
    is_search_available: bool
    latency: float  # -1 indicates unavailable
    memory_usage: str
    key_count: int
    last_sync: Optional[datetime]
    errors: List[str] = field(default_factory=list)
    status: Optional[Literal["healthy", "unhealthy", "degraded"]] = None
    response_time: Optional[float] = None
    message: Optional[str] = None
    timestamp: Optional[datetime] = None
    details: Optional[Dict[str, Any]] = field(default_factory=dict)


@dataclass
class SecurityContext:
    """Security context for data governance."""
    user_id: str
    user_role: str
    institution_id: Optional[str] = None
    clearance_level: Optional[Literal["public", "internal", "confidential", "restricted"]] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """Generate session_id if not provided."""
        if not self.session_id:
            self.session_id = str(uuid.uuid4())


@dataclass
class CircuitBreakerState:
    """Circuit breaker state information."""
    is_open: bool
    failure_count: int
    last_failure: float  # Timestamp
    next_retry_time: float  # Timestamp


@dataclass
class AuditLogEntry:
    """Audit log entry for compliance."""
    id: str
    timestamp: datetime
    user_id: str
    user_role: str
    action: Literal["search", "access", "export", "modify"]
    resource: str
    query: Optional[str] = None
    result_count: Optional[int] = None
    search_time: Optional[float] = None
    success: bool = True
    error_message: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    institution_id: Optional[str] = None
    sensitive_data_accessed: bool = False
    compliance_flags: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.id:
            self.id = f"audit_{int(self.timestamp.timestamp())}_{str(uuid.uuid4())[:8]}"


# Protocol definitions for providers
@runtime_checkable
class DatabaseProvider(Protocol):
    """Protocol for database providers."""
    name: str

    async def connect(self) -> None:
        """Establish database connection."""
        ...

    async def disconnect(self) -> None:
        """Close database connection."""
        ...

    async def is_connected(self) -> bool:
        """Check if database is connected."""
        ...

    async def search(self, query: str, options: SearchOptions) -> List[SearchResult]:
        """Perform database search."""
        ...

    async def check_health(self) -> HealthStatus:
        """Check database health."""
        ...


@runtime_checkable
class CacheProvider(Protocol):
    """Protocol for cache providers."""
    name: str

    async def connect(self) -> None:
        """Establish cache connection."""
        ...

    async def disconnect(self) -> None:
        """Close cache connection."""
        ...

    async def is_connected(self) -> bool:
        """Check if cache is connected."""
        ...

    async def search(self, query: str, options: SearchOptions) -> List[SearchResult]:
        """Perform cache search."""
        ...

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set cache value."""
        ...

    async def get(self, key: str) -> Optional[Any]:
        """Get cache value."""
        ...

    async def delete(self, key: str) -> None:
        """Delete cache value."""
        ...

    async def clear(self, pattern: Optional[str] = None) -> None:
        """Clear cache entries."""
        ...

    async def check_health(self) -> HealthStatus:
        """Check cache health."""
        ...


# Configuration types
@dataclass
class SmartSearchConfig:
    """Main configuration for SmartSearch."""
    database: DatabaseProvider
    cache: Optional[CacheProvider] = None
    fallback: SearchStrategy = SearchStrategy.DATABASE
    circuit_breaker: Optional[Dict[str, Any]] = None
    cache_config: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None
    data_governance: Optional[Dict[str, Any]] = None
    hybrid_search: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        """Set default configurations."""
        if self.circuit_breaker is None:
            self.circuit_breaker = {
                "failure_threshold": 5,
                "recovery_timeout": 60000,  # 1 minute in ms
                "health_cache_ttl": 30000,  # 30 seconds in ms
            }
        
        if self.cache_config is None:
            self.cache_config = {
                "enabled": True,
                "default_ttl": 300,  # 5 minutes in seconds
                "max_size": 10000,
            }
            
        if self.performance is None:
            self.performance = {
                "enable_metrics": True,
                "log_queries": False,
                "slow_query_threshold": 1000,  # 1 second in ms
            }


# Response wrapper types
@dataclass
class SearchResponse:
    """Complete search response."""
    results: List[SearchResult]
    performance: SearchPerformance
    strategy: SearchStrategyInfo
    metadata: Optional[Dict[str, Any]] = field(default_factory=dict)


@dataclass
class SecureSearchResponse(SearchResponse):
    """Secure search response with audit information."""
    audit_id: str
    compliance_status: Optional[str] = None


# Exception types for better error handling
class SmartSearchError(Exception):
    """Base exception for smart-search."""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR", context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.context = context or {}
        self.timestamp = datetime.now()


class SearchTimeoutError(SmartSearchError):
    """Search operation timed out."""
    def __init__(self, message: str, timeout_ms: float, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "SEARCH_TIMEOUT_ERROR", context)
        self.timeout_ms = timeout_ms


class DatabaseConnectionError(SmartSearchError):
    """Database connection failed."""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "DATABASE_CONNECTION_ERROR", context)


class CacheConnectionError(SmartSearchError):
    """Cache connection failed."""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "CACHE_CONNECTION_ERROR", context)


class SecurityAccessDeniedError(SmartSearchError):
    """Security access denied."""
    def __init__(
        self, 
        message: str, 
        user_id: str, 
        required_role: str, 
        actual_role: str,
        context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "SECURITY_ACCESS_DENIED", context)
        self.user_id = user_id
        self.required_role = required_role
        self.actual_role = actual_role


class CircuitBreakerError(SmartSearchError):
    """Circuit breaker is open."""
    def __init__(
        self, 
        message: str, 
        failure_count: int, 
        next_retry_time: datetime,
        context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "CIRCUIT_BREAKER_OPEN", context)
        self.failure_count = failure_count
        self.next_retry_time = next_retry_time


# Type aliases for convenience
SearchFiltersDict = Dict[str, Any]
ConfigDict = Dict[str, Any]
MetricsDict = Dict[str, Union[int, float, str]]

# Export all types
__all__ = [
    # Enums
    "SearchResultType",
    "MatchType", 
    "SearchStrategy",
    "SortBy",
    "SortOrder",
    
    # Data classes
    "SearchResult",
    "DateRange",
    "SearchFilters",
    "SearchOptions",
    "SearchStrategyInfo",
    "SearchPerformance",
    "HealthStatus",
    "SecurityContext",
    "CircuitBreakerState",
    "AuditLogEntry",
    "SmartSearchConfig",
    "SearchResponse",
    "SecureSearchResponse",
    
    # Protocols
    "DatabaseProvider",
    "CacheProvider",
    
    # Exceptions
    "SmartSearchError",
    "SearchTimeoutError",
    "DatabaseConnectionError", 
    "CacheConnectionError",
    "SecurityAccessDeniedError",
    "CircuitBreakerError",
    
    # Type aliases
    "SearchFiltersDict",
    "ConfigDict",
    "MetricsDict",
]