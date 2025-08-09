/**
 * @samas/smart-search - Custom Error Classes
 * Production-ready error handling for smart search operations
 */

export abstract class SearchError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.context = context || {};
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
}

// Connection and Infrastructure Errors
export class DatabaseConnectionError extends SearchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_CONNECTION_ERROR', context);
  }
}

export class CacheConnectionError extends SearchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CACHE_CONNECTION_ERROR', context);
  }
}

export class SearchTimeoutError extends SearchError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, context?: Record<string, unknown>) {
    super(message, 'SEARCH_TIMEOUT_ERROR', { ...context, timeoutMs });
    this.timeoutMs = timeoutMs;
  }
}

// Circuit Breaker Errors
export class CircuitBreakerError extends SearchError {
  public readonly failureCount: number;
  public readonly nextRetryTime: Date;

  constructor(
    message: string, 
    failureCount: number, 
    nextRetryTime: Date, 
    context?: Record<string, unknown>
  ) {
    super(message, 'CIRCUIT_BREAKER_OPEN', { 
      ...context, 
      failureCount, 
      nextRetryTime: nextRetryTime.toISOString() 
    });
    this.failureCount = failureCount;
    this.nextRetryTime = nextRetryTime;
  }
}

// Security and Access Control Errors
export class SecurityAccessDeniedError extends SearchError {
  public readonly userId: string;
  public readonly requiredRole: string;
  public readonly actualRole: string;

  constructor(
    message: string, 
    userId: string, 
    requiredRole: string, 
    actualRole: string, 
    context?: Record<string, unknown>
  ) {
    super(message, 'SECURITY_ACCESS_DENIED', { 
      ...context, 
      userId, 
      requiredRole, 
      actualRole 
    });
    this.userId = userId;
    this.requiredRole = requiredRole;
    this.actualRole = actualRole;
  }
}

export class DataGovernanceViolationError extends SearchError {
  public readonly violationType: string;
  public readonly fieldPath: string;

  constructor(
    message: string, 
    violationType: string, 
    fieldPath: string, 
    context?: Record<string, unknown>
  ) {
    super(message, 'DATA_GOVERNANCE_VIOLATION', { 
      ...context, 
      violationType, 
      fieldPath 
    });
    this.violationType = violationType;
    this.fieldPath = fieldPath;
  }
}

// Query and Validation Errors
export class InvalidQueryError extends SearchError {
  public readonly query: string;
  public readonly reason: string;

  constructor(message: string, query: string, reason: string, context?: Record<string, unknown>) {
    super(message, 'INVALID_QUERY_ERROR', { ...context, query, reason });
    this.query = query;
    this.reason = reason;
  }
}

export class ConfigurationError extends SearchError {
  public readonly configKey: string;
  public readonly expectedType: string;

  constructor(
    message: string, 
    configKey: string, 
    expectedType: string, 
    context?: Record<string, unknown>
  ) {
    super(message, 'CONFIGURATION_ERROR', { ...context, configKey, expectedType });
    this.configKey = configKey;
    this.expectedType = expectedType;
  }
}

// Provider-specific Errors
export class ProviderError extends SearchError {
  public readonly providerName: string;
  public readonly providerType: 'database' | 'cache';

  constructor(
    message: string, 
    providerName: string, 
    providerType: 'database' | 'cache', 
    context?: Record<string, unknown>
  ) {
    super(message, 'PROVIDER_ERROR', { ...context, providerName, providerType });
    this.providerName = providerName;
    this.providerType = providerType;
  }
}

export class IndexNotFoundError extends SearchError {
  public readonly indexName: string;
  public readonly providerName: string;

  constructor(
    message: string, 
    indexName: string, 
    providerName: string, 
    context?: Record<string, unknown>
  ) {
    super(message, 'INDEX_NOT_FOUND_ERROR', { ...context, indexName, providerName });
    this.indexName = indexName;
    this.providerName = providerName;
  }
}

// Performance and Resource Errors
export class ResourceExhaustedError extends SearchError {
  public readonly resourceType: 'memory' | 'cpu' | 'connections' | 'storage';
  public readonly currentUsage: number;
  public readonly limit: number;

  constructor(
    message: string, 
    resourceType: 'memory' | 'cpu' | 'connections' | 'storage',
    currentUsage: number,
    limit: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'RESOURCE_EXHAUSTED_ERROR', { 
      ...context, 
      resourceType, 
      currentUsage, 
      limit 
    });
    this.resourceType = resourceType;
    this.currentUsage = currentUsage;
    this.limit = limit;
  }
}

export class RateLimitExceededError extends SearchError {
  public readonly userId: string;
  public readonly rateLimit: number;
  public readonly windowMs: number;
  public readonly resetTime: Date;

  constructor(
    message: string, 
    userId: string, 
    rateLimit: number,
    windowMs: number,
    resetTime: Date,
    context?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED_ERROR', { 
      ...context, 
      userId, 
      rateLimit, 
      windowMs,
      resetTime: resetTime.toISOString()
    });
    this.userId = userId;
    this.rateLimit = rateLimit;
    this.windowMs = windowMs;
    this.resetTime = resetTime;
  }
}

// Compliance and Regulatory Errors
export class ComplianceViolationError extends SearchError {
  public readonly complianceType: 'HIPAA' | 'PCI_DSS' | 'GDPR' | 'SOX' | 'CUSTOM';
  public readonly violationDetails: string[];

  constructor(
    message: string, 
    complianceType: 'HIPAA' | 'PCI_DSS' | 'GDPR' | 'SOX' | 'CUSTOM',
    violationDetails: string[],
    context?: Record<string, unknown>
  ) {
    super(message, 'COMPLIANCE_VIOLATION_ERROR', { 
      ...context, 
      complianceType, 
      violationDetails 
    });
    this.complianceType = complianceType;
    this.violationDetails = violationDetails;
  }
}

// Error Handler Utility Class
export class ErrorHandler {
  private static errorCounts: Map<string, number> = new Map();
  private static lastErrorTimes: Map<string, Date> = new Map();

  /**
   * Handle search errors with intelligent retry and fallback logic
   */
  static async handleSearchError(
    error: Error,
    context: {
      query: string;
      options: any;
      provider: string;
      retryCount?: number;
      maxRetries?: number;
    }
  ): Promise<never> {
    const { query, provider, retryCount = 0, maxRetries = 3 } = context;
    
    // Track error frequency for circuit breaker logic
    this.trackErrorFrequency(error, provider);

    // Log error with appropriate level based on severity
    this.logError(error, context);

    // Determine if error is retryable
    if (this.isRetryableError(error) && retryCount < maxRetries) {
      const delay = this.calculateRetryDelay(retryCount);
      console.warn(`Retrying search after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      
      await this.delay(delay);
      const retryError = new Error(`Retryable error occurred: ${error.message}`);
      (retryError as any).code = 'RETRY_NEEDED';
      (retryError as any).context = { originalError: error, retryCount: retryCount + 1 };
      throw retryError;
    }

    // Convert generic errors to specific SearchError types
    if (!(error instanceof SearchError)) {
      if (error.message.includes('timeout')) {
        throw new SearchTimeoutError(
          `Search operation timed out: ${error.message}`,
          30000,
          { originalError: error, query, provider }
        );
      }

      if (error.message.includes('connection')) {
        throw new DatabaseConnectionError(
          `Database connection failed: ${error.message}`,
          { originalError: error, provider }
        );
      }

      // Generic fallback
      throw new ProviderError(
        `Provider operation failed: ${error.message}`,
        provider,
        'database',
        { originalError: error, query }
      );
    }

    // Re-throw SearchError as-is
    throw error;
  }

  /**
   * Check if an error should trigger circuit breaker opening
   */
  static shouldOpenCircuitBreaker(provider: string, threshold: number = 5): boolean {
    const errorCount = this.errorCounts.get(provider) || 0;
    return errorCount >= threshold;
  }

  /**
   * Reset error tracking for a provider (when circuit breaker recovers)
   */
  static resetErrorTracking(provider: string): void {
    this.errorCounts.delete(provider);
    this.lastErrorTimes.delete(provider);
  }

  /**
   * Get error statistics for monitoring and alerting
   */
  static getErrorStatistics(): Record<string, { count: number; lastError?: Date }> {
    const stats: Record<string, { count: number; lastError?: Date }> = {};
    
    for (const [provider, count] of this.errorCounts.entries()) {
      const lastError = this.lastErrorTimes.get(provider);
      stats[provider] = {
        count,
        ...(lastError && { lastError })
      };
    }

    return stats;
  }

  // Private helper methods
  private static trackErrorFrequency(error: Error, provider: string): void {
    const currentCount = this.errorCounts.get(provider) || 0;
    this.errorCounts.set(provider, currentCount + 1);
    this.lastErrorTimes.set(provider, new Date());

    // Reset error count if last error was more than 1 hour ago
    const lastErrorTime = this.lastErrorTimes.get(provider);
    if (lastErrorTime && Date.now() - lastErrorTime.getTime() > 3600000) {
      this.errorCounts.set(provider, 1);
    }
  }

  private static logError(error: Error, context: any): void {
    const severity = this.getErrorSeverity(error);
    const logMethod = severity === 'critical' ? 'error' : 
                     severity === 'high' ? 'error' : 
                     severity === 'medium' ? 'warn' : 'log';

    console[logMethod](`[${severity.toUpperCase()}] Search Error:`, {
      error: error.message,
      type: error.constructor.name,
      code: (error as SearchError).code,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  }

  private static getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof SecurityAccessDeniedError || 
        error instanceof ComplianceViolationError) {
      return 'critical';
    }

    if (error instanceof CircuitBreakerError || 
        error instanceof ResourceExhaustedError) {
      return 'high';
    }

    if (error instanceof SearchTimeoutError || 
        error instanceof RateLimitExceededError) {
      return 'medium';
    }

    return 'low';
  }

  private static isRetryableError(error: Error): boolean {
    // Network-related errors are usually retryable
    if (error instanceof DatabaseConnectionError || 
        error instanceof CacheConnectionError) {
      return true;
    }

    // Timeout errors may be retryable with longer timeout
    if (error instanceof SearchTimeoutError) {
      return true;
    }

    // Resource exhaustion might be temporary
    if (error instanceof ResourceExhaustedError) {
      return true;
    }

    // Security and validation errors are NOT retryable
    if (error instanceof SecurityAccessDeniedError ||
        error instanceof InvalidQueryError ||
        error instanceof ComplianceViolationError) {
      return false;
    }

    return false;
  }

  private static calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export convenience functions for error creation
export const createDatabaseError = (message: string, context?: Record<string, unknown>) =>
  new DatabaseConnectionError(message, context);

export const createTimeoutError = (message: string, timeoutMs: number, context?: Record<string, unknown>) =>
  new SearchTimeoutError(message, timeoutMs, context);

export const createSecurityError = (
  message: string, 
  userId: string, 
  requiredRole: string, 
  actualRole: string,
  context?: Record<string, unknown>
) => new SecurityAccessDeniedError(message, userId, requiredRole, actualRole, context);

export const createCircuitBreakerError = (
  message: string,
  failureCount: number,
  nextRetryTime: Date,
  context?: Record<string, unknown>
) => new CircuitBreakerError(message, failureCount, nextRetryTime, context);