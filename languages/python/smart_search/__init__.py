"""
@samas/smart-search Python SDK
Universal search with intelligent fallback for any database + cache combination

Features:
- Multi-database support (PostgreSQL, MySQL, MongoDB, Redis, SQLite)
- Intelligent caching with automatic fallback
- Enterprise data governance and security
- Circuit breaker pattern for resilience
- Hybrid search strategies
- Performance monitoring and metrics
- HIPAA/PCI-DSS/GDPR compliance support
"""

from .core.smart_search import SmartSearch
from .core.factory import SmartSearchFactory
from .core.types import (
    SearchResult,
    SearchOptions,
    SearchStrategy,
    SearchPerformance,
    HealthStatus,
    SecurityContext,
)

# Provider imports for convenience
from .providers.postgresql import PostgreSQLProvider
from .providers.redis import RedisProvider
from .providers.mongodb import MongoDBProvider

# Security and governance
from .security.data_governance import DataGovernanceService

__version__ = "1.0.0"
__author__ = "Syd A Bilgrami"
__email__ = "syd@samas.it"
__license__ = "Apache-2.0"

__all__ = [
    # Core classes
    "SmartSearch",
    "SmartSearchFactory",
    
    # Types
    "SearchResult", 
    "SearchOptions",
    "SearchStrategy",
    "SearchPerformance", 
    "HealthStatus",
    "SecurityContext",
    
    # Providers
    "PostgreSQLProvider",
    "RedisProvider", 
    "MongoDBProvider",
    
    # Security
    "DataGovernanceService",
    
    # Metadata
    "__version__",
    "__author__",
    "__email__",
    "__license__",
]

# Package-level configuration
import logging

# Set up logging configuration
logging.getLogger(__name__).addHandler(logging.NullHandler())

# Version compatibility check
import sys
if sys.version_info < (3, 8):
    raise RuntimeError(
        "smart-search requires Python 3.8 or higher. "
        f"Current version: {sys.version_info.major}.{sys.version_info.minor}"
    )

# Optional feature detection
_OPTIONAL_FEATURES = {
    "redis": False,
    "postgresql": False,
    "mongodb": False,
    "mysql": False,
    "monitoring": False,
    "web": False,
}

try:
    import redis
    _OPTIONAL_FEATURES["redis"] = True
except ImportError:
    pass

try:
    import asyncpg
    _OPTIONAL_FEATURES["postgresql"] = True
except ImportError:
    pass

try:
    import motor
    _OPTIONAL_FEATURES["mongodb"] = True
except ImportError:
    pass

try:
    import aiomysql
    _OPTIONAL_FEATURES["mysql"] = True
except ImportError:
    pass

try:
    import prometheus_client
    _OPTIONAL_FEATURES["monitoring"] = True
except ImportError:
    pass

try:
    import fastapi
    _OPTIONAL_FEATURES["web"] = True
except ImportError:
    pass

def get_available_features():
    """Get a dict of available optional features."""
    return _OPTIONAL_FEATURES.copy()

def check_feature_availability(feature: str) -> bool:
    """Check if an optional feature is available."""
    return _OPTIONAL_FEATURES.get(feature, False)

# Convenience functions for quick setup
def create_search_from_config(config_path: str = None) -> SmartSearch:
    """Create SmartSearch instance from configuration file."""
    return SmartSearchFactory.from_config(config_path)

def create_search_from_env() -> SmartSearch:
    """Create SmartSearch instance from environment variables."""
    return SmartSearchFactory.from_environment()

# Development and debugging helpers
def enable_debug_logging():
    """Enable debug logging for smart-search."""
    logging.getLogger(__name__).setLevel(logging.DEBUG)
    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logging.getLogger(__name__).addHandler(handler)

# Package metadata for runtime introspection
PACKAGE_INFO = {
    "name": "smart-search",
    "version": __version__,
    "author": __author__,
    "license": __license__,
    "python_requires": ">=3.8",
    "features": _OPTIONAL_FEATURES,
    "repository": "https://github.com/samas-it-services/smart-search",
    "documentation": "https://github.com/samas-it-services/smart-search#readme",
    "issues": "https://github.com/samas-it-services/smart-search/issues",
}

def get_package_info():
    """Get comprehensive package information."""
    return PACKAGE_INFO.copy()

# Export feature check function
__all__.extend([
    "get_available_features",
    "check_feature_availability", 
    "create_search_from_config",
    "create_search_from_env",
    "enable_debug_logging",
    "get_package_info",
])