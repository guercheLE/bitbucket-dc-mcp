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
 * RateLimiter - Token bucket rate limiter implementation
 *
 * Implements token bucket algorithm to limit requests per second.
 * This is a functional stub that can be enhanced later with more sophisticated
 * rate limiting strategies (sliding window, circuit breaker, etc.)
 */

/**
 * Token bucket rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of tokens in the bucket */
  capacity: number;
  /** Number of tokens refilled per second */
  refillRate: number;
}

/**
 * Token bucket rate limiter
 *
 * Limits request rate using token bucket algorithm.
 * Each request consumes one token. If no tokens available, waits until refill.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({ capacity: 100, refillRate: 100 });
 * await limiter.acquire(); // Wait for token
 * // Execute request
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  /**
   * Creates a new RateLimiter instance
   *
   * @param config - Rate limiter configuration
   */
  constructor(config: RateLimiterConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * Acquire a token from the bucket
   *
   * Waits if no tokens available until refill.
   *
   * @returns Promise that resolves when token is acquired
   */
  async acquire(): Promise<void> {
    await this.refill();

    while (this.tokens < 1) {
      // Calculate time to wait for next token
      const tokensNeeded = 1 - this.tokens;
      const waitTimeMs = (tokensNeeded / this.refillRate) * 1000;

      await this.sleep(Math.max(waitTimeMs, 10)); // Minimum 10ms wait
      await this.refill();
    }

    this.tokens -= 1;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private async refill(): Promise<void> {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current number of available tokens (for testing/monitoring)
   */
  getAvailableTokens(): number {
    return Math.floor(this.tokens);
  }
}
