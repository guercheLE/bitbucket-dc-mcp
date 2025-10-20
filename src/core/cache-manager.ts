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

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

/**
 * Cache metrics for observability
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
}

/**
 * Simple LRU cache with TTL support tailored for semantic search queries.
 * Includes fallback logic to gracefully handle cache failures.
 */
export class QueryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly logger?: PinoLogger;
  private isAvailable = true;
  private metrics: CacheMetrics = { hits: 0, misses: 0, size: 0 };

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
    logger?: PinoLogger,
  ) {
    if (maxSize <= 0) {
      throw new Error('QueryCache maxSize must be greater than zero');
    }

    if (ttlMs <= 0) {
      throw new Error('QueryCache ttlMs must be greater than zero');
    }

    this.logger = logger;
  }

  public get(key: string): T | undefined {
    if (!this.isAvailable) {
      this.logger?.debug({ key }, 'Cache unavailable, returning null');
      return undefined;
    }

    try {
      const entry = this.store.get(key);
      if (!entry) {
        // Task 11: Log cache miss
        this.metrics.misses++;
        this.logger?.debug({ event: 'cache.miss', cache_key: key }, 'Cache miss');
        return undefined;
      }

      if (entry.expiresAt <= Date.now()) {
        this.store.delete(key);
        this.metrics.misses++;
        this.logger?.debug(
          { event: 'cache.miss', cache_key: key, reason: 'expired' },
          'Cache miss',
        );
        return undefined;
      }

      // Task 11: Log cache hit
      this.metrics.hits++;
      this.logger?.debug({ event: 'cache.hit', cache_key: key }, 'Cache hit');

      // Maintain LRU ordering by reinserting the entry.
      this.store.delete(key);
      this.store.set(key, entry);
      return entry.value;
    } catch (error) {
      this.logger?.warn(
        {
          operation: 'get',
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        },
        'Cache operation failed, disabling cache',
      );
      this.isAvailable = false;
      return undefined;
    }
  }

  public set(key: string, value: T): void {
    if (!this.isAvailable) {
      this.logger?.debug({ key }, 'Cache unavailable, skipping set');
      return;
    }

    try {
      if (this.store.has(key)) {
        this.store.delete(key);
      }

      this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });

      if (this.store.size > this.maxSize) {
        const lruKey = this.store.keys().next().value;
        if (lruKey) {
          this.store.delete(lruKey);
        }
      }
    } catch (error) {
      this.logger?.warn(
        {
          operation: 'set',
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        },
        'Cache operation failed, disabling cache',
      );
      this.isAvailable = false;
    }
  }

  public delete(key: string): void {
    if (!this.isAvailable) {
      this.logger?.debug({ key }, 'Cache unavailable, skipping delete');
      return;
    }

    try {
      this.store.delete(key);
    } catch (error) {
      this.logger?.warn(
        {
          operation: 'delete',
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        },
        'Cache operation failed, disabling cache',
      );
      this.isAvailable = false;
    }
  }

  public clear(): void {
    try {
      this.store.clear();
    } catch (error) {
      this.logger?.warn(
        {
          operation: 'clear',
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        },
        'Cache operation failed, disabling cache',
      );
      this.isAvailable = false;
    }
  }

  /**
   * Checks if cache is currently available.
   *
   * @returns True if cache is operational, false if disabled due to errors
   */
  public getIsAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Performs a health check by testing cache operations.
   *
   * @returns True if cache operations succeed, false otherwise
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const testKey = '__health_check__';
      const testValue = { test: true } as T;

      this.store.set(testKey, { value: testValue, expiresAt: Date.now() + 1000 });
      const retrieved = this.store.get(testKey);
      this.store.delete(testKey);

      return retrieved !== undefined;
    } catch (error) {
      this.logger?.warn(
        {
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        },
        'Cache health check failed',
      );
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Task 11: Get cache statistics for observability
   *
   * @returns Cache metrics including hit rate, size, hits, and misses
   */
  public getStats(): CacheMetrics & { hit_rate: number } {
    this.metrics.size = this.store.size;
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hit_rate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    return {
      ...this.metrics,
      hit_rate,
    };
  }

  /**
   * Task 11: Log cache statistics at INFO level
   * Should be called periodically for observability
   */
  public logStats(): void {
    if (!this.logger) {
      return;
    }

    const stats = this.getStats();
    this.logger.info(
      {
        event: 'cache.stats',
        cache_size: stats.size,
        cache_hits: stats.hits,
        cache_misses: stats.misses,
        hit_rate: stats.hit_rate.toFixed(2),
      },
      'Cache statistics',
    );
  }
}
