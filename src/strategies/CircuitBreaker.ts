/**
 * @samas/smart-search - Circuit Breaker Pattern Implementation
 * Circuit breaker for preventing cascade failures with automatic recovery
 */

import { CircuitBreakerState } from '../types';

export interface CircuitBreakerConfig {
  failureThreshold?: number;   // Number of failures before opening circuit (default: 5)
  recoveryTimeout?: number;    // Time to wait before half-open state (default: 60000ms)
  healthCacheTTL?: number;     // Health check cache TTL (default: 30000ms)
}

export class CircuitBreakerManager {
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailure: 0,
    nextRetryTime: 0
  };

  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly healthCacheTTL: number;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.recoveryTimeout = config.recoveryTimeout ?? 60000; // 1 minute
    this.healthCacheTTL = config.healthCacheTTL ?? 30000;   // 30 seconds
  }

  /**
   * Check if the circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }

    // Check if recovery timeout has passed
    if (Date.now() >= this.circuitBreaker.nextRetryTime) {
      console.log('🔄 Circuit breaker recovery timeout reached, allowing retry...');
      this.circuitBreaker.isOpen = false;
      return false;
    }

    return true;
  }

  /**
   * Record a failure and potentially open the circuit breaker
   */
  recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailure = Date.now();

    if (this.circuitBreaker.failureCount >= this.failureThreshold) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = Date.now() + this.recoveryTimeout;

      console.warn(
        `⚡ Circuit breaker opened after ${this.circuitBreaker.failureCount} failures. ` +
        `Will retry in ${this.recoveryTimeout / 1000}s`
      );
    }
  }

  /**
   * Reset the circuit breaker after a successful operation
   */
  reset(): void {
    if (this.circuitBreaker.failureCount > 0) {
      console.log('✅ Circuit breaker reset - service recovered');
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.lastFailure = 0;
      this.circuitBreaker.nextRetryTime = 0;
    }
  }

  /**
   * Get the current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Manually open the circuit breaker (for testing or emergency situations)
   */
  open(): void {
    this.circuitBreaker.isOpen = true;
    this.circuitBreaker.nextRetryTime = Date.now() + this.recoveryTimeout;
    console.warn('⚡ Circuit breaker manually opened');
  }

  /**
   * Manually close the circuit breaker (for testing or emergency situations)
   */
  close(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailure = 0;
    this.circuitBreaker.nextRetryTime = 0;
    console.log('✅ Circuit breaker manually closed');
  }
}