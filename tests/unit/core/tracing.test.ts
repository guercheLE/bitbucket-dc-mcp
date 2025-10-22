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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tracing } from '../../../src/core/tracing.js';
import pino from 'pino';

describe('Tracing', () => {
  let logger: pino.Logger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should create tracing instance with minimal config', () => {
      const tracing = new Tracing(
        {
          enabled: true,
        },
        logger,
      );

      expect(tracing).toBeDefined();
    });

    it('should create tracing instance with full config', () => {
      const tracing = new Tracing(
        {
          enabled: true,
          serviceName: 'test-service',
          serviceVersion: '1.0.0',
          jaegerEndpoint: 'http://localhost:14268/api/traces',
          consoleExporter: true,
        },
        logger,
      );

      expect(tracing).toBeDefined();
    });

    it('should not initialize when disabled', async () => {
      const tracing = new Tracing(
        {
          enabled: false,
        },
        logger,
      );

      await tracing.start();
      expect(tracing).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should start successfully', async () => {
      const tracing = new Tracing(
        {
          enabled: true,
          jaegerEndpoint: 'disabled',
        },
        logger,
      );

      await expect(tracing.start()).resolves.not.toThrow();
    });

    it('should stop successfully', async () => {
      const tracing = new Tracing(
        {
          enabled: true,
          jaegerEndpoint: 'disabled',
        },
        logger,
      );

      await tracing.start();
      await expect(tracing.stop()).resolves.not.toThrow();
    });

    it('should handle start when disabled', async () => {
      const tracing = new Tracing(
        {
          enabled: false,
        },
        logger,
      );

      await expect(tracing.start()).resolves.not.toThrow();
    });

    it('should handle stop when disabled', async () => {
      const tracing = new Tracing(
        {
          enabled: false,
        },
        logger,
      );

      await expect(tracing.stop()).resolves.not.toThrow();
    });
  });

  describe('Span Creation', () => {
    it('should create span when enabled', async () => {
      const tracing = new Tracing(
        {
          enabled: true,
          jaegerEndpoint: 'disabled',
        },
        logger,
      );

      await tracing.start();

      const result = await tracing.withSpan('test-operation', async () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
      await tracing.stop();
    });

    it('should handle span errors gracefully', async () => {
      const tracing = new Tracing(
        {
          enabled: true,
          jaegerEndpoint: 'disabled',
        },
        logger,
      );

      await tracing.start();

      await expect(
        tracing.withSpan('test-operation', async () => {
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');

      await tracing.stop();
    });

    it('should work without tracing when disabled', async () => {
      const tracing = new Tracing(
        {
          enabled: false,
        },
        logger,
      );

      const result = await tracing.withSpan('test-operation', async () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const errorLogger = pino({
        level: 'error',
        transport: {
          target: 'pino/file',
          options: { destination: '/dev/null' },
        },
      });

      const tracing = new Tracing(
        {
          enabled: true,
          jaegerEndpoint: 'invalid-url',
        },
        errorLogger,
      );

      await expect(tracing.start()).resolves.not.toThrow();
    });
  });
});
