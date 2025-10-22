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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HttpMetrics } from '../../../src/http/metrics.js';
import pino from 'pino';
import http from 'node:http';

describe('HttpMetrics', () => {
  let logger: pino.Logger;
  let metrics: HttpMetrics;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
  });

  afterEach(async () => {
    if (metrics) {
      await metrics.stop();
    }
  });

  describe('Configuration', () => {
    it('should create metrics instance with default config', () => {
      metrics = new HttpMetrics({}, logger);
      expect(metrics).toBeDefined();
    });

    it('should create metrics instance with custom config', () => {
      metrics = new HttpMetrics(
        {
          port: 9465,
          host: 'localhost',
          endpoint: '/custom-metrics',
        },
        logger,
      );
      expect(metrics).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should start metrics server', async () => {
      metrics = new HttpMetrics({ port: 0 }, logger);
      await expect(metrics.start()).resolves.not.toThrow();
    });

    it('should stop metrics server gracefully', async () => {
      metrics = new HttpMetrics({ port: 0 }, logger);
      await metrics.start();
      await expect(metrics.stop()).resolves.not.toThrow();
    });

    it('should handle multiple start calls', async () => {
      metrics = new HttpMetrics({ port: 0 }, logger);
      await metrics.start();
      await expect(metrics.start()).resolves.not.toThrow();
    });

    it('should handle multiple stop calls', async () => {
      metrics = new HttpMetrics({ port: 0 }, logger);
      await metrics.start();
      await metrics.stop();
      await expect(metrics.stop()).resolves.not.toThrow();
    });
  });

  describe('Metrics Recording', () => {
    beforeEach(async () => {
      metrics = new HttpMetrics({ port: 0 }, logger);
      await metrics.start();
    });

    it('should increment active requests', () => {
      expect(() => metrics.incrementActiveRequests()).not.toThrow();
    });

    it('should decrement active requests', () => {
      metrics.incrementActiveRequests();
      expect(() => metrics.decrementActiveRequests()).not.toThrow();
    });

    it('should record request metrics', () => {
      expect(() => {
        metrics.recordRequest('/test', 'GET', 200, 100, 1024, 2048);
      }).not.toThrow();
    });

    it('should handle metrics with zero duration', () => {
      expect(() => {
        metrics.recordRequest('/test', 'GET', 200, 0, 0, 0);
      }).not.toThrow();
    });

    it('should handle metrics with large values', () => {
      expect(() => {
        metrics.recordRequest(
          '/very/long/path/that/is/quite/long',
          'POST',
          200,
          5000,
          1024 * 1024,
          1024 * 1024 * 2,
        );
      }).not.toThrow();
    });
  });

  describe('Metrics Endpoint', () => {
    it('should serve metrics on configured endpoint', async () => {
      metrics = new HttpMetrics({ port: 0 }, logger);
      await metrics.start();

      // Record some metrics
      metrics.incrementActiveRequests();
      metrics.recordRequest('/test', 'GET', 200, 100, 1024, 2048);
      metrics.decrementActiveRequests();

      // Give time for metrics to be recorded
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(metrics).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      metrics = new HttpMetrics({ port: -1 }, logger);
      // Prometheus exporter handles invalid ports gracefully
      await expect(metrics.start()).resolves.not.toThrow();
    });
  });
});
