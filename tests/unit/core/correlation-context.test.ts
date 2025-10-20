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

import { describe, expect, it } from 'vitest';
import {
  createCorrelationContext,
  generateCorrelationId,
  getCorrelationContext,
  getCorrelationId,
  getElapsedTime,
  runSyncWithCorrelationContext,
  runWithCorrelationContext,
} from '../../../src/core/correlation-context.js';

describe('CorrelationContext', () => {
  describe('generateCorrelationId', () => {
    it('should generate a unique UUID', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate UUID in correct format', () => {
      const id = generateCorrelationId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('createCorrelationContext', () => {
    it('should create context with required fields', () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');

      expect(context.correlationId).toBeDefined();
      expect(context.service).toBe('bitbucket-dc-mcp');
      expect(context.version).toBe('1.0.0');
      expect(context.startTime).toBeGreaterThan(0);
    });

    it('should create context with tool name', () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'search_ids');

      expect(context.toolName).toBe('search_ids');
    });

    it('should create context with tool and operation', () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'create_issue',
      );

      expect(context.toolName).toBe('call_id');
      expect(context.operationId).toBe('create_issue');
    });

    it('should generate unique correlation IDs for each context', () => {
      const ctx1 = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');
      const ctx2 = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');

      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    });
  });

  describe('runWithCorrelationContext', () => {
    it('should propagate context through async calls', async () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'search_ids');

      await runWithCorrelationContext(context, async () => {
        const retrieved = getCorrelationContext();
        expect(retrieved).toBeDefined();
        expect(retrieved?.correlationId).toBe(context.correlationId);
        expect(retrieved?.toolName).toBe('search_ids');
      });
    });

    it('should propagate context through nested async calls', async () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'call_id', 'get_issue');

      await runWithCorrelationContext(context, async () => {
        const level1 = getCorrelationContext();
        expect(level1?.correlationId).toBe(context.correlationId);

        await Promise.resolve().then(() => {
          const level2 = getCorrelationContext();
          expect(level2?.correlationId).toBe(context.correlationId);
          expect(level2?.operationId).toBe('get_issue');
        });
      });
    });

    it('should isolate contexts between different runs', async () => {
      const context1 = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'tool1');
      const context2 = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'tool2');

      const promise1 = runWithCorrelationContext(context1, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getCorrelationContext()?.toolName;
      });

      const promise2 = runWithCorrelationContext(context2, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return getCorrelationContext()?.toolName;
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('tool1');
      expect(result2).toBe('tool2');
    });

    it('should return function result', async () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');

      const result = await runWithCorrelationContext(context, async () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });
  });

  describe('runSyncWithCorrelationContext', () => {
    it('should propagate context through sync calls', () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'sync_tool');

      runSyncWithCorrelationContext(context, () => {
        const retrieved = getCorrelationContext();
        expect(retrieved).toBeDefined();
        expect(retrieved?.correlationId).toBe(context.correlationId);
        expect(retrieved?.toolName).toBe('sync_tool');
      });
    });

    it('should return function result', () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');

      const result = runSyncWithCorrelationContext(context, () => {
        return 42;
      });

      expect(result).toBe(42);
    });
  });

  describe('getCorrelationContext', () => {
    it('should return undefined when no context is set', () => {
      const context = getCorrelationContext();
      expect(context).toBeUndefined();
    });

    it('should return current context when set', async () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'test_tool');

      await runWithCorrelationContext(context, async () => {
        const retrieved = getCorrelationContext();
        expect(retrieved).toEqual(context);
      });
    });
  });

  describe('getCorrelationId', () => {
    it('should return correlation ID when context is set', async () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');

      await runWithCorrelationContext(context, async () => {
        const id = getCorrelationId();
        expect(id).toBe(context.correlationId);
      });
    });

    it('should return default when no context is set', () => {
      const id = getCorrelationId();
      expect(id).toBe('no-correlation-id');
    });
  });

  describe('getElapsedTime', () => {
    it('should return 0 when no context is set', () => {
      const elapsed = getElapsedTime();
      expect(elapsed).toBe(0);
    });

    it('should return elapsed time since context creation', async () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');

      await runWithCorrelationContext(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const elapsed = getElapsedTime();
        // Allow 2ms tolerance for CI environments where timing can be less precise
        expect(elapsed).toBeGreaterThanOrEqual(48);
        expect(elapsed).toBeLessThan(100); // Should be less than 100ms
      });
    });

    it('should measure time accurately across async operations', async () => {
      const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0');

      await runWithCorrelationContext(context, async () => {
        const time1 = getElapsedTime();
        await new Promise((resolve) => setTimeout(resolve, 20));
        const time2 = getElapsedTime();

        expect(time2).toBeGreaterThan(time1);
        // Allow 2ms tolerance for CI environments where timing can be less precise
        expect(time2 - time1).toBeGreaterThanOrEqual(18);
      });
    });
  });
});
