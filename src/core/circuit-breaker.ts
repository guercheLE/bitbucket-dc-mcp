/**
 * Copyright (c) 2025 Bitbucket Data Center MCP Server Contributors
 *
 * This file is part of bitbucket-dc-mcp.
 *
 * bitbucket-dc-mcp is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * bitbucket-dc-mcp is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with bitbucket-dc-mcp. If not, see <https://www.gnu.org/licenses/>.
 */

import type { Logger as PinoLogger } from 'pino';

/**
 * Circuit breaker states following the Circuit Breaker pattern.
 *
 * State transitions:
 * CLOSED → OPEN (when failure threshold exceeded)
 * OPEN → HALF_OPEN (after timeout expires)
 * HALF_OPEN → CLOSED (on successful health check)
 * HALF_OPEN → OPEN (on failed health check)
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Configuration options for CircuitBreaker behavior.
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Failure rate (0-1) threshold to open circuit */
  failureRateThreshold: number;
  /** Time window in milliseconds for failure rate calculation */
  windowSize: number;
  /** Time in milliseconds to wait before attempting reset from OPEN to HALF_OPEN */
  timeout: number;
  /** Minimum number of requests in window before calculating failure rate */
  minimumRequests: number;
}

/**
 * Metrics tracked by the circuit breaker.
 */
export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastStateChange: Date;
  lastError?: Error;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Internal record for tracking individual request results.
 */
interface RequestRecord {
  timestamp: number;
  success: boolean;
}

/**
 * Default circuit breaker configuration values.
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureRateThreshold: 0.5,
  windowSize: 10000,
  timeout: 30000,
  minimumRequests: 10,
};

/**
 * Error thrown when circuit breaker is in OPEN state.
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
    Error.captureStackTrace?.(this, CircuitBreakerError);
  }
}

/**
 * Circuit breaker implementation to protect against cascading failures.
 *
 * Wraps operations and tracks success/failure rates. When failures exceed
 * configured thresholds, the circuit "opens" and fails fast without executing
 * the wrapped operation. After a timeout, it allows a test request (HALF_OPEN state)
 * to determine if the downstream service has recovered.
 *
 * @example
 * ```typescript
 * const circuitBreaker = new CircuitBreaker(
 *   { failureThreshold: 5, timeout: 30000 },
 *   logger
 * );
 *
 * const result = await circuitBreaker.execute(async () => {
 *   return await httpClient.get('/api/resource');
 * });
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private readonly config: CircuitBreakerConfig;
  private readonly logger: PinoLogger;
  private requestHistory: RequestRecord[] = [];
  private consecutiveFailures = 0;

  private metrics: CircuitBreakerMetrics = {
    state: CircuitState.CLOSED,
    failureCount: 0,
    successCount: 0,
    lastStateChange: new Date(),
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
  };

  /**
   * Creates a new circuit breaker instance.
   *
   * @param config - Partial configuration merged with defaults
   * @param logger - Pino logger instance for structured logging
   * @throws {Error} If configuration values are invalid
   */
  constructor(config: Partial<CircuitBreakerConfig>, logger: PinoLogger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
    this.validateConfig();
  }

  /**
   * Validates circuit breaker configuration.
   *
   * @throws {Error} If any configuration value is invalid
   */
  private validateConfig(): void {
    if (this.config.failureThreshold <= 0) {
      throw new Error('Invalid circuit breaker config: failureThreshold must be > 0');
    }
    if (this.config.failureRateThreshold < 0 || this.config.failureRateThreshold > 1) {
      throw new Error(
        'Invalid circuit breaker config: failureRateThreshold must be between 0 and 1',
      );
    }
    if (this.config.windowSize <= 0) {
      throw new Error('Invalid circuit breaker config: windowSize must be > 0');
    }
    if (this.config.timeout <= 0) {
      throw new Error('Invalid circuit breaker config: timeout must be > 0');
    }
    if (this.config.minimumRequests <= 0) {
      throw new Error('Invalid circuit breaker config: minimumRequests must be > 0');
    }
  }

  /**
   * Transitions circuit breaker to a new state.
   *
   * @param newState - The target state
   * @param reason - Human-readable reason for the transition
   */
  private setState(newState: CircuitState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.metrics.state = newState;
    this.metrics.lastStateChange = new Date();

    this.logger.warn(
      {
        from: oldState,
        to: newState,
        reason,
        metrics: {
          totalRequests: this.metrics.totalRequests,
          totalFailures: this.metrics.totalFailures,
          totalSuccesses: this.metrics.totalSuccesses,
          consecutiveFailures: this.consecutiveFailures,
        },
      },
      'Circuit breaker state changed',
    );
  }

  /**
   * Records a successful operation execution.
   */
  private recordSuccess(): void {
    this.metrics.successCount++;
    this.metrics.totalSuccesses++;
    this.consecutiveFailures = 0;

    this.requestHistory.push({
      timestamp: Date.now(),
      success: true,
    });

    // If in HALF_OPEN state, a success means downstream has recovered
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.info(
        {
          state: 'HALF_OPEN',
          transitionTo: 'CLOSED',
        },
        'Circuit breaker health check passed',
      );
      this.setState(CircuitState.CLOSED, 'health check succeeded in HALF_OPEN state');
    }
  }

  /**
   * Records a failed operation execution.
   *
   * @param error - The error that caused the failure
   */
  private recordFailure(error: Error): void {
    this.metrics.failureCount++;
    this.metrics.totalFailures++;
    this.metrics.lastError = error;
    this.consecutiveFailures++;

    this.requestHistory.push({
      timestamp: Date.now(),
      success: false,
    });

    this.logger.debug(
      {
        state: this.state,
        consecutiveFailures: this.consecutiveFailures,
        failureThreshold: this.config.failureThreshold,
        error: error.message,
      },
      'Request failed in circuit breaker',
    );

    // If in HALF_OPEN state, a failure means downstream still broken
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn(
        {
          state: 'HALF_OPEN',
          transitionTo: 'OPEN',
          error: error.message,
        },
        'Circuit breaker health check failed',
      );
      this.setState(CircuitState.OPEN, 'health check failed in HALF_OPEN state');
      return;
    }

    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED) {
      this.checkThresholds();
    }
  }

  /**
   * Checks if failure thresholds have been exceeded.
   * Opens circuit if either consecutive failures or failure rate threshold is exceeded.
   */
  private checkThresholds(): void {
    this.cleanupOldRequests();

    const consecutiveExceeded = this.checkConsecutiveFailures();
    const rateExceeded = this.checkFailureRate();

    if (consecutiveExceeded) {
      this.setState(
        CircuitState.OPEN,
        `consecutive failure threshold exceeded (${this.consecutiveFailures}/${this.config.failureThreshold})`,
      );
    } else if (rateExceeded) {
      const recentRequests = this.getRecentRequests();
      const failures = recentRequests.filter((r) => !r.success).length;
      const rate = failures / recentRequests.length;
      this.setState(
        CircuitState.OPEN,
        `failure rate threshold exceeded (${(rate * 100).toFixed(1)}% >= ${(this.config.failureRateThreshold * 100).toFixed(1)}%)`,
      );
    }
  }

  /**
   * Checks if consecutive failure threshold has been exceeded.
   *
   * @returns true if consecutive failures >= threshold
   */
  private checkConsecutiveFailures(): boolean {
    return this.consecutiveFailures >= this.config.failureThreshold;
  }

  /**
   * Checks if failure rate threshold has been exceeded in the time window.
   *
   * @returns true if failure rate >= threshold and minimum requests met
   */
  private checkFailureRate(): boolean {
    const recentRequests = this.getRecentRequests();

    // Need minimum requests to calculate meaningful rate
    if (recentRequests.length < this.config.minimumRequests) {
      return false;
    }

    const failures = recentRequests.filter((r) => !r.success).length;
    const failureRate = failures / recentRequests.length;

    return failureRate >= this.config.failureRateThreshold;
  }

  /**
   * Gets requests within the configured time window.
   *
   * @returns Array of recent request records
   */
  private getRecentRequests(): RequestRecord[] {
    const cutoffTime = Date.now() - this.config.windowSize;
    return this.requestHistory.filter((r) => r.timestamp >= cutoffTime);
  }

  /**
   * Removes request records older than the time window.
   * Prevents unbounded memory growth.
   */
  private cleanupOldRequests(): void {
    const cutoffTime = Date.now() - this.config.windowSize;
    this.requestHistory = this.requestHistory.filter((r) => r.timestamp >= cutoffTime);
  }

  /**
   * Attempts to transition from OPEN to HALF_OPEN if timeout has elapsed.
   */
  private tryReset(): void {
    if (this.state !== CircuitState.OPEN) {
      return;
    }

    const timeSinceOpen = Date.now() - this.metrics.lastStateChange.getTime();
    if (timeSinceOpen >= this.config.timeout) {
      this.logger.info(
        {
          state: 'HALF_OPEN',
          timeSinceOpen,
          timeout: this.config.timeout,
        },
        'Circuit breaker health check starting',
      );
      this.setState(CircuitState.HALF_OPEN, 'timeout expired, attempting health check');
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Executes an operation protected by the circuit breaker.
   *
   * When the circuit is CLOSED or HALF_OPEN, the operation executes normally.
   * When the circuit is OPEN, the operation fails fast with CircuitBreakerError.
   *
   * @param operation - Async function to execute
   * @returns Promise resolving to operation result
   * @throws {CircuitBreakerError} If circuit is OPEN
   * @throws Original error if operation fails (error is tracked but not swallowed)
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;

    this.logger.debug(
      {
        state: this.state,
        totalRequests: this.metrics.totalRequests,
        consecutiveFailures: this.consecutiveFailures,
      },
      'Circuit breaker executing request',
    );

    // Check if we should attempt reset from OPEN state
    this.tryReset();

    // Fail fast if circuit is still OPEN
    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - this.metrics.lastStateChange.getTime();
      this.logger.info(
        {
          state: 'OPEN',
          sinceOpened: `${Math.round(timeSinceOpen / 1000)}s`,
          timeout: `${this.config.timeout / 1000}s`,
        },
        'Request rejected by circuit breaker',
      );
      throw new CircuitBreakerError('Circuit breaker is OPEN, Bitbucket DC may be down', this.state);
    }

    // Execute the operation
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error; // Rethrow original error
    }
  }

  /**
   * Gets a copy of current circuit breaker metrics.
   *
   * @returns Current metrics snapshot
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      ...this.metrics,
      lastStateChange: new Date(this.metrics.lastStateChange),
    };
  }

  /**
   * Updates circuit breaker configuration.
   *
   * @param newConfig - Partial configuration to merge with existing
   * @throws {Error} If merged configuration is invalid
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    Object.assign(this.config, newConfig);
    this.validateConfig();
    this.logger.info(
      {
        config: this.config,
      },
      'Circuit breaker config updated',
    );
  }

  /**
   * Exports metrics in a format suitable for monitoring systems.
   *
   * @returns Sanitized metrics object
   */
  exportMetrics(): object {
    const uptime = Date.now() - this.metrics.lastStateChange.getTime();
    return {
      state: this.metrics.state,
      failure_count: this.metrics.totalFailures,
      success_count: this.metrics.totalSuccesses,
      last_state_change: this.metrics.lastStateChange.toISOString(),
      uptime_ms: uptime,
      consecutive_failures: this.consecutiveFailures,
    };
  }

  /**
   * Creates a CircuitBreaker instance from environment variables.
   *
   * @param logger - Pino logger instance
   * @returns New CircuitBreaker configured from environment
   */
  static fromEnv(logger: PinoLogger): CircuitBreaker {
    const config: Partial<CircuitBreakerConfig> = {};

    if (process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      config.failureThreshold = Number.parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD, 10);
    }
    if (process.env.CIRCUIT_BREAKER_FAILURE_RATE) {
      config.failureRateThreshold = Number.parseFloat(process.env.CIRCUIT_BREAKER_FAILURE_RATE);
    }
    if (process.env.CIRCUIT_BREAKER_WINDOW_SIZE) {
      config.windowSize = Number.parseInt(process.env.CIRCUIT_BREAKER_WINDOW_SIZE, 10);
    }
    if (process.env.CIRCUIT_BREAKER_TIMEOUT) {
      config.timeout = Number.parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT, 10);
    }

    return new CircuitBreaker(config, logger);
  }
}
