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
 * Unit tests for QueryCache with performance logging
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryCache } from '../../../src/core/cache-manager.js';
import { Logger } from '../../../src/core/logger.js';
import { LogCapture } from '../../helpers/log-capture.js';

describe('QueryCache', () => {
  describe('Basic Operations', () => {
    let cache: QueryCache<string>;

    beforeEach(() => {
      cache = new QueryCache<string>(10, 1000);
    });

    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should respect TTL expiration', async () => {
      const shortTtlCache = new QueryCache<string>(10, 10); // 10ms TTL
      shortTtlCache.set('key1', 'value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(shortTtlCache.get('key1')).toBeUndefined();
    });

    it('should enforce max size (LRU eviction)', () => {
      const smallCache = new QueryCache<string>(3, 1000);

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4'); // Should evict key1

      expect(smallCache.get('key1')).toBeUndefined();
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');
      expect(smallCache.get('key4')).toBe('value4');
    });

    it('should update LRU order on access', () => {
      const smallCache = new QueryCache<string>(3, 1000);

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');

      // Access key1 to make it most recently used
      smallCache.get('key1');

      // Add key4, should evict key2 (least recently used)
      smallCache.set('key4', 'value4');

      expect(smallCache.get('key1')).toBe('value1');
      expect(smallCache.get('key2')).toBeUndefined();
      expect(smallCache.get('key3')).toBe('value3');
      expect(smallCache.get('key4')).toBe('value4');
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should delete specific entry', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.delete('key1');

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('Task 11: Performance Logging', () => {
    let cache: QueryCache<string>;
    let logCapture: LogCapture;

    beforeEach(() => {
      logCapture = new LogCapture();
      // Create logger with DEBUG level to capture debug logs
      cache = new QueryCache<string>(10, 1000, logCapture.createLogger({ level: 'debug' }));
    });

    it('should log cache hit at DEBUG level', () => {
      cache.set('key1', 'value1');
      logCapture.clear();

      cache.get('key1');

      const logs = logCapture.getLogs();
      const hitLog = logs.find((log) => log.event === 'cache.hit');

      expect(hitLog).toBeDefined();
      expect(hitLog?.level).toBe(20); // DEBUG level (pino uses numbers)
      expect(hitLog?.cache_key).toBe('key1');
    });

    it('should log cache miss at DEBUG level', () => {
      cache.get('nonexistent');

      const logs = logCapture.getLogs();
      const missLog = logs.find((log) => log.event === 'cache.miss');

      expect(missLog).toBeDefined();
      expect(missLog?.level).toBe(20); // DEBUG level
      expect(missLog?.cache_key).toBe('nonexistent');
    });

    it('should log cache miss for expired entries', async () => {
      const shortTtlCache = new QueryCache<string>(
        10,
        10,
        logCapture.createLogger({ level: 'debug' }),
      );
      shortTtlCache.set('key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 20));
      logCapture.clear();

      shortTtlCache.get('key1');

      const logs = logCapture.getLogs();
      const missLog = logs.find((log) => log.event === 'cache.miss');

      expect(missLog).toBeDefined();
      expect(missLog?.cache_key).toBe('key1');
      expect(missLog?.reason).toBe('expired');
    });

    it('should track cache metrics (hits, misses, size)', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1'); // Hit
      cache.get('key2'); // Hit
      cache.get('key3'); // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(2);
      expect(stats.hit_rate).toBeCloseTo(2 / 3, 2);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      cache.get('key3'); // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hit_rate).toBe(0.5);
    });

    it('should handle zero requests for hit rate', () => {
      const stats = cache.getStats();

      expect(stats.hit_rate).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should log cache stats at INFO level', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      logCapture.clear();
      cache.logStats();

      const logs = logCapture.getLogs();
      const statsLog = logs.find((log) => log.event === 'cache.stats');

      expect(statsLog).toBeDefined();
      expect(statsLog?.level).toBe(30); // INFO level
      expect(statsLog?.cache_size).toBe(1);
      expect(statsLog?.cache_hits).toBe(1);
      expect(statsLog?.cache_misses).toBe(1);
      expect(statsLog?.hit_rate).toBe('0.50');
    });

    it('should not throw when logging stats without logger', () => {
      const noLoggerCache = new QueryCache<string>(10, 1000);

      expect(() => noLoggerCache.logStats()).not.toThrow();
    });
  });

  describe('Availability and Health Check', () => {
    it('should be available initially', () => {
      const cache = new QueryCache<string>(10, 1000);
      expect(cache.getIsAvailable()).toBe(true);
    });

    it('should pass health check when operational', async () => {
      const cache = new QueryCache<string>(10, 1000);
      const result = await cache.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when health check fails due to unavailable cache', async () => {
      const cache = new QueryCache<string>(10, 1000);
      // Make cache unavailable
      (cache as unknown as { isAvailable: boolean }).isAvailable = false;

      const result = await cache.healthCheck();
      expect(result).toBe(false);
    });

    it('should handle health check errors and mark cache as unavailable', async () => {
      const logger = Logger.getInstance();
      const cache = new QueryCache<{ test: boolean }>(10, 1000, logger);

      // Mock the store to throw an error
      const originalStore = (cache as unknown as { store: Map<string, unknown> }).store;
      (cache as unknown as { store: Map<string, unknown> }).store = {
        ...originalStore,
        set() {
          throw new Error('Storage error');
        },
        get() {
          return undefined;
        },
        delete() { },
      } as unknown as Map<string, unknown>;

      const result = await cache.healthCheck();

      expect(result).toBe(false);
      expect(cache.getIsAvailable()).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error for invalid maxSize', () => {
      expect(() => new QueryCache<string>(0, 1000)).toThrow(
        'QueryCache maxSize must be greater than zero',
      );
    });

    it('should throw error for invalid ttlMs', () => {
      expect(() => new QueryCache<string>(10, 0)).toThrow(
        'QueryCache ttlMs must be greater than zero',
      );
    });
  });
});
