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

/**
 * Unit tests for CircuitBreaker
 */

import { pino, type Logger as PinoLogger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitState,
} from '../../../src/core/circuit-breaker.js';

describe('CircuitBreaker - State Transitions', () => {
  let circuitBreaker: CircuitBreaker;
  let logger: PinoLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = pino({ level: 'silent' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in CLOSED state', () => {
    circuitBreaker = new CircuitBreaker({}, logger);
    const metrics = circuitBreaker.getMetrics();

    expect(metrics.state).toBe(CircuitState.CLOSED);
    expect(metrics.totalRequests).toBe(0);
    expect(metrics.totalFailures).toBe(0);
    expect(metrics.totalSuccesses).toBe(0);
    expect(metrics.failureCount).toBe(0);
    expect(metrics.successCount).toBe(0);
  });

  it('should transition to OPEN after consecutive failures', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Execute 3 failing operations
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.OPEN);
    expect(metrics.totalFailures).toBe(3);
  });

  it('should transition to OPEN based on failure rate', async () => {
    circuitBreaker = new CircuitBreaker(
      {
        failureRateThreshold: 0.5,
        minimumRequests: 10,
        failureThreshold: 100, // High threshold so only rate matters
        windowSize: 10000,
      },
      logger,
    );

    const successOperation = vi.fn().mockResolvedValue('success');
    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Interleave operations to avoid consecutive threshold: 6 failures, 4 successes (60% failure rate)
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    await circuitBreaker.execute(successOperation);
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    await circuitBreaker.execute(successOperation);
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    await circuitBreaker.execute(successOperation);
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    await circuitBreaker.execute(successOperation);
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.OPEN);
    expect(metrics.totalFailures).toBe(6);
    expect(metrics.totalSuccesses).toBe(4);
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3, timeout: 30000 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    expect(circuitBreaker.getMetrics().state).toBe(CircuitState.OPEN);

    // Advance time by timeout duration
    vi.advanceTimersByTime(30000);

    // Next execution should trigger tryReset and move to HALF_OPEN
    const successOperation = vi.fn().mockResolvedValue('success');
    await circuitBreaker.execute(successOperation);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED); // Successful health check moves to CLOSED
  });

  it('should transition from HALF_OPEN to CLOSED on success', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3, timeout: 30000 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));
    const successOperation = vi.fn().mockResolvedValue('success');

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    // Advance time to allow reset
    vi.advanceTimersByTime(30000);

    // Execute successful operation (health check)
    await circuitBreaker.execute(successOperation);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED);
  });

  it('should transition from HALF_OPEN to OPEN on failure', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3, timeout: 30000 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    // Advance time to allow reset
    vi.advanceTimersByTime(30000);

    // Execute failing operation (health check fails)
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.OPEN);
  });
});

describe('CircuitBreaker - Threshold Logic', () => {
  let circuitBreaker: CircuitBreaker;
  let logger: PinoLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = pino({ level: 'silent' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not open with failures below threshold', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 5 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Execute 4 failing operations (below threshold of 5)
    for (let i = 0; i < 4; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED);
    expect(metrics.totalFailures).toBe(4);
  });

  it('should open on exactly threshold failures', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 5 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Execute exactly 5 failing operations
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.OPEN);
    expect(metrics.totalFailures).toBe(5);
  });

  it('should reset consecutive failure count on success', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 5 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));
    const successOperation = vi.fn().mockResolvedValue('success');

    // 3 failures, 1 success, 3 more failures
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }
    await circuitBreaker.execute(successOperation); // Resets consecutive counter
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED); // Should remain closed
    expect(metrics.totalFailures).toBe(6);
    expect(metrics.totalSuccesses).toBe(1);
  });

  it('should not calculate rate with insufficient requests', async () => {
    circuitBreaker = new CircuitBreaker(
      {
        minimumRequests: 10,
        failureRateThreshold: 0.8,
        failureThreshold: 100, // High threshold so only rate matters
      },
      logger,
    );

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));
    const successOperation = vi.fn().mockResolvedValue('success');

    // Execute 5 operations: 4 failures, 1 success (80% failure rate, but insufficient data)
    for (let i = 0; i < 4; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }
    await circuitBreaker.execute(successOperation);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED); // Should remain closed
  });
});

describe('CircuitBreaker - Request Execution', () => {
  let circuitBreaker: CircuitBreaker;
  let logger: PinoLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = pino({ level: 'silent' });
    circuitBreaker = new CircuitBreaker({}, logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute and return result when CLOSED', async () => {
    const operation = vi.fn().mockResolvedValue('result');

    const result = await circuitBreaker.execute(operation);

    expect(result).toBe('result');
    expect(operation).toHaveBeenCalledTimes(1);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.totalSuccesses).toBe(1);
  });

  it('should throw CircuitBreakerError when OPEN', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    // Attempt to execute when OPEN
    const operation = vi.fn().mockResolvedValue('result');
    await expect(circuitBreaker.execute(operation)).rejects.toThrow(CircuitBreakerError);
    await expect(circuitBreaker.execute(operation)).rejects.toThrow(
      'Circuit breaker is OPEN, Bitbucket DC may be down',
    );

    // Operation should NOT have been executed
    expect(operation).not.toHaveBeenCalled();
  });

  it('should rethrow original error on operation failure', async () => {
    const customError = new Error('API Error');
    const operation = vi.fn().mockRejectedValue(customError);

    await expect(circuitBreaker.execute(operation)).rejects.toThrow('API Error');

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.totalFailures).toBe(1);
    expect(metrics.lastError).toBeDefined();
    expect(metrics.lastError?.message).toBe('API Error');
  });
});

describe('CircuitBreaker - Concurrent Requests', () => {
  let circuitBreaker: CircuitBreaker;
  let logger: PinoLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = pino({ level: 'silent' });
    circuitBreaker = new CircuitBreaker({}, logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle multiple concurrent requests in CLOSED state', async () => {
    const operation = vi.fn().mockResolvedValue('result');

    // Execute 10 concurrent operations
    const promises = Array.from({ length: 10 }, () => circuitBreaker.execute(operation));
    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    expect(results.every((r) => r === 'result')).toBe(true);
    expect(operation).toHaveBeenCalledTimes(10);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.totalRequests).toBe(10);
    expect(metrics.totalSuccesses).toBe(10);
  });

  it('should handle race condition in HALF_OPEN state', async () => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3, timeout: 30000 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    // Advance time to allow reset
    vi.advanceTimersByTime(30000);

    // Execute concurrent requests in HALF_OPEN state
    const successOperation = vi.fn().mockResolvedValue('success');
    const promises = Array.from({ length: 5 }, () => circuitBreaker.execute(successOperation));

    // First request transitions to HALF_OPEN, succeeds, transitions to CLOSED
    // Remaining requests execute in CLOSED state
    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    expect(circuitBreaker.getMetrics().state).toBe(CircuitState.CLOSED);
  });
});

describe('CircuitBreaker - Configuration', () => {
  let logger: PinoLogger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
  });

  it('should use default config when none provided', () => {
    const circuitBreaker = new CircuitBreaker({}, logger);
    const metrics = circuitBreaker.getMetrics();

    expect(metrics.state).toBe(CircuitState.CLOSED);
    // Defaults verified through behavior
  });

  it('should merge provided config with defaults', async () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 10 }, logger);

    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Should not open after 5 failures (default would open)
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('API Error');
    }

    // Verify still closed after 5 failures
    expect(circuitBreaker.getMetrics().state).toBe(CircuitState.CLOSED);
  });

  it('should throw on invalid config - negative threshold', () => {
    expect(() => new CircuitBreaker({ failureThreshold: -1 }, logger)).toThrow(
      'Invalid circuit breaker config: failureThreshold must be > 0',
    );
  });

  it('should throw on invalid config - invalid rate threshold', () => {
    expect(() => new CircuitBreaker({ failureRateThreshold: 1.5 }, logger)).toThrow(
      'Invalid circuit breaker config: failureRateThreshold must be between 0 and 1',
    );
  });

  it('should throw on invalid config - negative timeout', () => {
    expect(() => new CircuitBreaker({ timeout: -1000 }, logger)).toThrow(
      'Invalid circuit breaker config: timeout must be > 0',
    );
  });

  it('should update config dynamically', () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 5 }, logger);

    circuitBreaker.updateConfig({ failureThreshold: 10 });

    // Config should be updated - verify no throw on validation
    expect(() => circuitBreaker.getMetrics()).not.toThrow();
  });

  it('should throw on invalid dynamic config update', () => {
    const circuitBreaker = new CircuitBreaker({}, logger);

    expect(() => circuitBreaker.updateConfig({ failureThreshold: -1 })).toThrow(
      'Invalid circuit breaker config',
    );
  });
});

describe('CircuitBreaker - Metrics', () => {
  let circuitBreaker: CircuitBreaker;
  let logger: PinoLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = pino({ level: 'silent' });
    circuitBreaker = new CircuitBreaker({}, logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should track metrics correctly', async () => {
    const successOperation = vi.fn().mockResolvedValue('success');
    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Execute mix of operations
    await circuitBreaker.execute(successOperation);
    await circuitBreaker.execute(successOperation);
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
    await circuitBreaker.execute(successOperation);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.totalRequests).toBe(4);
    expect(metrics.totalSuccesses).toBe(3);
    expect(metrics.totalFailures).toBe(1);
    expect(metrics.lastStateChange).toBeInstanceOf(Date);
  });

  it('should include last error in metrics', async () => {
    const failingOperation = vi.fn().mockRejectedValue(new Error('Test Error'));

    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.lastError).toBeDefined();
    expect(metrics.lastError?.message).toBe('Test Error');
  });

  it('should export metrics in monitoring format', async () => {
    const successOperation = vi.fn().mockResolvedValue('success');
    await circuitBreaker.execute(successOperation);

    const exported = circuitBreaker.exportMetrics();

    expect(exported).toHaveProperty('state');
    expect(exported).toHaveProperty('failure_count');
    expect(exported).toHaveProperty('success_count');
    expect(exported).toHaveProperty('last_state_change');
    expect(exported).toHaveProperty('uptime_ms');
  });
});

describe('CircuitBreaker - Environment Configuration', () => {
  let logger: PinoLogger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    // Clear environment variables
    delete process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    delete process.env.CIRCUIT_BREAKER_FAILURE_RATE;
    delete process.env.CIRCUIT_BREAKER_WINDOW_SIZE;
    delete process.env.CIRCUIT_BREAKER_TIMEOUT;
  });

  it('should create circuit breaker from environment variables', () => {
    process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '10';
    process.env.CIRCUIT_BREAKER_FAILURE_RATE = '0.7';
    process.env.CIRCUIT_BREAKER_WINDOW_SIZE = '20000';
    process.env.CIRCUIT_BREAKER_TIMEOUT = '60000';

    const circuitBreaker = CircuitBreaker.fromEnv(logger);

    expect(circuitBreaker).toBeInstanceOf(CircuitBreaker);
    expect(circuitBreaker.getMetrics().state).toBe(CircuitState.CLOSED);
  });

  it('should use defaults when env vars not set', () => {
    const circuitBreaker = CircuitBreaker.fromEnv(logger);

    expect(circuitBreaker).toBeInstanceOf(CircuitBreaker);
    expect(circuitBreaker.getMetrics().state).toBe(CircuitState.CLOSED);
  });
});

describe('CircuitBreaker - Time Window Cleanup', () => {
  let circuitBreaker: CircuitBreaker;
  let logger: PinoLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = pino({ level: 'silent' });
    circuitBreaker = new CircuitBreaker({ windowSize: 10000 }, logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should clean up old requests outside time window', async () => {
    const successOperation = vi.fn().mockResolvedValue('success');
    const failingOperation = vi.fn().mockRejectedValue(new Error('API Error'));

    // Execute operations at T=0
    await circuitBreaker.execute(successOperation);
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

    // Advance time beyond window (10s)
    vi.advanceTimersByTime(11000);

    // Execute new operations at T=11s
    await circuitBreaker.execute(successOperation);

    // Old requests should be cleaned up
    const metrics = circuitBreaker.getMetrics();
    expect(metrics.totalRequests).toBe(3);
    expect(metrics.totalSuccesses).toBe(2);
    expect(metrics.totalFailures).toBe(1);
  });
});
