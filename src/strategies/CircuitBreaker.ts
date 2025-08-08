/**
 * @samas/smart-search - Circuit Breaker Implementation
 * Intelligent failure handling and recovery for search operations
 */

import { CircuitBreakerError, ErrorHandler } from '../errors/SearchErrors';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  healthCheckTimeout: number; // Timeout for health checks (ms)
  successThreshold: number; // Consecutive successes needed to close circuit
  monitoringWindow: number; // Time window for failure rate calculation (ms)
  degradationStrategy: 'fail-fast' | 'graceful' | 'fallback';
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextRetryTime?: Date;
  totalRequests: number;
  failureRate: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextRetryTime?: Date;
  private totalRequests = 0;
  private recentFailures: Date[] = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      healthCheckTimeout: 5000, // 5 seconds
      successThreshold: 3,
      monitoringWindow: 300000, // 5 minutes
      degradationStrategy: 'graceful',
      ...config
    };
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    this.totalRequests++;
    this.cleanupOldFailures();

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this.shouldAttemptRecovery()) {
        this.state = 'HALF_OPEN';
        console.log(`Circuit breaker entering HALF_OPEN state for ${operationName}`);
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${operationName}. Next retry at ${this.nextRetryTime?.toISOString()}`,
          this.failureCount,
          this.nextRetryTime || new Date(),
          { operationName, state: this.state }
        );
      }
    }

    try {
      // Execute the operation with timeout
      const result = await this.executeWithTimeout(operation, this.config.healthCheckTimeout);
      
      // Record success
      this.recordSuccess();
      return result;

    } catch (error) {
      // Record failure
      this.recordFailure();
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const stats: CircuitBreakerStats = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      failureRate: this.calculateFailureRate()
    };
    
    if (this.lastFailureTime) stats.lastFailureTime = this.lastFailureTime;
    if (this.lastSuccessTime) stats.lastSuccessTime = this.lastSuccessTime;
    if (this.nextRetryTime) stats.nextRetryTime = this.nextRetryTime;
    
    return stats;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    delete (this as any).lastFailureTime;
    delete (this as any).lastSuccessTime;
    delete (this as any).nextRetryTime;
    this.recentFailures = [];
    console.log('Circuit breaker manually reset to CLOSED state');
  }

  /**
   * Force circuit breaker to open (for testing or manual intervention)
   */
  forceOpen(reason: string): void {
    this.state = 'OPEN';
    this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);
    console.log(`Circuit breaker forced to OPEN state: ${reason}`);
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    return this.state === 'CLOSED' || 
           (this.state === 'HALF_OPEN' && this.successCount > 0);
  }

  /**
   * Get failure rate over the monitoring window
   */
  getFailureRate(): number {
    return this.calculateFailureRate();
  }

  // Private methods
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private recordSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.recentFailures = [];
        console.log('Circuit breaker recovered to CLOSED state');
      }
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.recentFailures.push(new Date());

    if (this.state === 'HALF_OPEN') {
      // Go back to OPEN state if failure occurs during recovery
      this.state = 'OPEN';
      this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);
      console.log('Circuit breaker returned to OPEN state after failure during recovery');
    } else if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      // Open the circuit
      this.state = 'OPEN';
      this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout);
      console.log(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  private shouldAttemptRecovery(): boolean {
    return this.nextRetryTime !== undefined && Date.now() >= this.nextRetryTime.getTime();
  }

  private calculateFailureRate(): number {
    if (this.totalRequests === 0) return 0;
    
    const recentFailureCount = this.recentFailures.length;
    const windowStart = Date.now() - this.config.monitoringWindow;
    const recentRequests = Math.max(1, this.totalRequests); // Avoid division by zero
    
    return recentFailureCount / recentRequests;
  }

  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.recentFailures = this.recentFailures.filter(
      failureTime => failureTime.getTime() > cutoff
    );
  }
}

/**
 * Circuit Breaker Manager for handling multiple circuits
 */
export class CircuitBreakerManager {
  private circuits = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      healthCheckTimeout: 5000,
      successThreshold: 3,
      monitoringWindow: 300000,
      degradationStrategy: 'graceful',
      ...defaultConfig
    };
  }

  /**
   * Get or create circuit breaker for a service
   */
  getCircuit(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuits.has(serviceName)) {
      const circuitConfig = { ...this.defaultConfig, ...config };
      this.circuits.set(serviceName, new CircuitBreaker(circuitConfig));
    }
    return this.circuits.get(serviceName)!;
  }

  /**
   * Execute operation with circuit breaker for specific service
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuit = this.getCircuit(serviceName, config);
    return circuit.execute(operation, serviceName);
  }

  /**
   * Get statistics for all circuits
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [serviceName, circuit] of this.circuits.entries()) {
      stats[serviceName] = circuit.getStats();
    }

    return stats;
  }

  /**
   * Get health status for all circuits
   */
  getHealthStatus(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    
    for (const [serviceName, circuit] of this.circuits.entries()) {
      health[serviceName] = circuit.isHealthy();
    }

    return health;
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
    console.log('All circuit breakers reset');
  }

  /**
   * Remove circuit for a service
   */
  removeCircuit(serviceName: string): boolean {
    return this.circuits.delete(serviceName);
  }

  /**
   * Get list of services with open circuits
   */
  getOpenCircuits(): string[] {
    const openCircuits: string[] = [];
    
    for (const [serviceName, circuit] of this.circuits.entries()) {
      if (circuit.getStats().state === 'OPEN') {
        openCircuits.push(serviceName);
      }
    }

    return openCircuits;
  }

  /**
   * Monitor circuit breaker health and log warnings
   */
  startHealthMonitoring(intervalMs: number = 30000): NodeJS.Timer {
    return setInterval(() => {
      const stats = this.getAllStats();
      
      for (const [serviceName, circuitStats] of Object.entries(stats)) {
        if (circuitStats.state === 'OPEN') {
          console.warn(`⚠️ Circuit breaker for ${serviceName} is OPEN`, {
            failureCount: circuitStats.failureCount,
            nextRetryTime: circuitStats.nextRetryTime?.toISOString(),
            failureRate: circuitStats.failureRate
          });
        } else if (circuitStats.failureRate > 0.1) { // 10% failure rate warning
          console.warn(`⚠️ High failure rate for ${serviceName}: ${(circuitStats.failureRate * 100).toFixed(1)}%`);
        }
      }
    }, intervalMs);
  }
}

export default CircuitBreaker;