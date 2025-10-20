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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShutdownHandler, type ShutdownHook } from '../../../src/core/shutdown-handler.js';

describe('ShutdownHandler', () => {
  let handler: ShutdownHandler;
  let mockLogger: PinoLogger;
  let processExitSpy: unknown;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as PinoLogger;

    handler = new ShutdownHandler(mockLogger, { timeout: 1000 });

    // Mock process.exit to prevent actual exit during tests
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => { }) as () => never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerHook', () => {
    it('should register shutdown hook', () => {
      const hook: ShutdownHook = vi.fn(async () => { });

      handler.registerHook(hook);

      expect(mockLogger.debug).toHaveBeenCalledWith({ totalHooks: 1 }, 'Shutdown hook registered');
      expect(handler.getHookCount()).toBe(1);
    });

    it('should register multiple hooks', () => {
      const hook1: ShutdownHook = vi.fn(async () => { });
      const hook2: ShutdownHook = vi.fn(async () => { });
      const hook3: ShutdownHook = vi.fn(async () => { });

      handler.registerHook(hook1);
      handler.registerHook(hook2);
      handler.registerHook(hook3);

      expect(handler.getHookCount()).toBe(3);
    });
  });

  describe('shutdown', () => {
    it('should execute all shutdown hooks', async () => {
      const hook1 = vi.fn(async (signal: string) => {
        expect(signal).toBe('SIGTERM');
      });
      const hook2 = vi.fn(async (signal: string) => {
        expect(signal).toBe('SIGTERM');
      });
      const hook3 = vi.fn(async (signal: string) => {
        expect(signal).toBe('SIGTERM');
      });

      handler.registerHook(hook1);
      handler.registerHook(hook2);
      handler.registerHook(hook3);

      await handler.shutdown('SIGTERM');

      expect(hook1).toHaveBeenCalledTimes(1);
      expect(hook2).toHaveBeenCalledTimes(1);
      expect(hook3).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should log shutdown initiation', async () => {
      const hook = vi.fn(async () => { });
      handler.registerHook(hook);

      await handler.shutdown('SIGINT');

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          signal: 'SIGINT',
          hooks: 1,
          timeout: 1000,
        },
        'Graceful shutdown initiated',
      );
    });

    it('should log shutdown completion', async () => {
      const hook = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      handler.registerHook(hook);

      await handler.shutdown('SIGTERM');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_ms: expect.any(Number),
          hooks_executed: 1,
        }),
        'Graceful shutdown completed successfully',
      );
    });

    it('should timeout if hooks take too long', async () => {
      vi.useFakeTimers();

      const slowHook = vi.fn(
        async () =>
          new Promise(() => {
            // Never resolves
          }),
      );

      handler.registerHook(slowHook);

      const shutdownPromise = handler.shutdown('SIGTERM');

      // Advance timers past timeout
      await vi.advanceTimersByTimeAsync(1500);

      await shutdownPromise;

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_ms: expect.any(Number),
          timeout: 1000,
          error: expect.objectContaining({
            message: 'Shutdown timeout after 1000ms',
          }),
        }),
        'Shutdown failed or timed out',
      );

      expect(processExitSpy).toHaveBeenCalledWith(0);

      vi.useRealTimers();
    });

    it('should prevent multiple shutdowns', async () => {
      const hook = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      handler.registerHook(hook);

      const shutdown1 = handler.shutdown('SIGTERM');
      const shutdown2 = handler.shutdown('SIGINT');

      await Promise.all([shutdown1, shutdown2]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { signal: 'SIGINT' },
        'Shutdown already in progress, ignoring',
      );

      // Hook should only be called once
      expect(hook).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalledTimes(1);
    });

    it('should continue executing hooks even if one fails', async () => {
      const hook1 = vi.fn(async () => {
        throw new Error('Hook 1 failed');
      });
      const hook2 = vi.fn(async () => {
        // This should still execute
      });
      const hook3 = vi.fn(async () => {
        // This should still execute
      });

      handler.registerHook(hook1);
      handler.registerHook(hook2);
      handler.registerHook(hook3);

      await handler.shutdown('SIGTERM');

      expect(hook1).toHaveBeenCalledTimes(1);
      expect(hook2).toHaveBeenCalledTimes(1);
      expect(hook3).toHaveBeenCalledTimes(1);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          hookIndex: 0,
          error: expect.objectContaining({
            message: 'Hook 1 failed',
          }),
        }),
        'Shutdown hook failed',
      );
    });

    it('should handle shutdown with no hooks', async () => {
      await handler.shutdown('SIGTERM');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: 'SIGTERM',
          hooks: 0,
        }),
        'Graceful shutdown initiated',
      );

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should pass signal to all hooks', async () => {
      const signals: string[] = [];

      const hook1: ShutdownHook = vi.fn(async (signal) => {
        signals.push(signal);
      });
      const hook2: ShutdownHook = vi.fn(async (signal) => {
        signals.push(signal);
      });

      handler.registerHook(hook1);
      handler.registerHook(hook2);

      await handler.shutdown('SIGUSR2');

      expect(signals).toEqual(['SIGUSR2', 'SIGUSR2']);
    });

    it('should execute hooks in order', async () => {
      const executionOrder: number[] = [];

      const hook1 = vi.fn(async () => {
        executionOrder.push(1);
      });
      const hook2 = vi.fn(async () => {
        executionOrder.push(2);
      });
      const hook3 = vi.fn(async () => {
        executionOrder.push(3);
      });

      handler.registerHook(hook1);
      handler.registerHook(hook2);
      handler.registerHook(hook3);

      await handler.shutdown('SIGTERM');

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('getHookCount', () => {
    it('should return correct hook count', () => {
      expect(handler.getHookCount()).toBe(0);

      handler.registerHook(vi.fn(async () => { }));
      expect(handler.getHookCount()).toBe(1);

      handler.registerHook(vi.fn(async () => { }));
      handler.registerHook(vi.fn(async () => { }));
      expect(handler.getHookCount()).toBe(3);
    });
  });

  describe('isShutdownInProgress', () => {
    it('should return false initially', () => {
      expect(handler.isShutdownInProgress()).toBe(false);
    });

    it('should return true during shutdown', async () => {
      const hook = vi.fn(async () => {
        expect(handler.isShutdownInProgress()).toBe(true);
      });

      handler.registerHook(hook);

      await handler.shutdown('SIGTERM');
    });
  });
});
