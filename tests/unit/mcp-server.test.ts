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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '../../src/core/mcp-server.js';

type LoggerStub = PinoLogger & {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

function createLoggerStub(): LoggerStub {
  const debug = vi.fn();
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();

  return {
    debug,
    info,
    warn,
    error,
    level: 'info',
  } as unknown as LoggerStub;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('McpServer handleError', () => {
  it('logs structured errors with correlation identifiers', () => {
    const logger = createLoggerStub();
    const server = new McpServer({ version: '0.0.0-test' }, { logger });

    server.handleError(new Error('boom'), { context: 'unit-test' });

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'mcp.server.error',
        correlationId: expect.any(String),
        context: 'unit-test',
        error: expect.objectContaining({ message: 'boom' }),
      }),
      'boom',
    );
  });

  it('normalises non-error inputs before logging', () => {
    const logger = createLoggerStub();
    const server = new McpServer({ version: '0.0.0-test' }, { logger });

    server.handleError('string-failure');

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'mcp.server.error',
        correlationId: expect.any(String),
        error: expect.objectContaining({ message: 'string-failure' }),
      }),
      'string-failure',
    );
  });
});

describe('McpServer shutdown', () => {
  it('forces exit when graceful shutdown times out', async () => {
    vi.useFakeTimers();

    const logger = createLoggerStub();
    const exit = vi.fn();
    const server = new McpServer(
      {
        version: '0.0.0-test',
        shutdownTimeoutMs: 10,
      },
      { logger, exit },
    );

    // Inject long-running server and transport closures
    const neverResolving = vi.fn(() => new Promise<void>(() => undefined));
    Reflect.set(server as unknown as Record<string, unknown>, 'server', {
      close: neverResolving,
    });
    Reflect.set(server as unknown as Record<string, unknown>, 'transport', {
      close: neverResolving,
    });

    const shutdownPromise = server.shutdown('timeout-test');

    await vi.advanceTimersByTimeAsync(10);
    await shutdownPromise;

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits cleanly when server and transport close successfully', async () => {
    const logger = createLoggerStub();
    const exit = vi.fn();
    const server = new McpServer({ version: '0.0.0-test' }, { logger, exit });

    const closeSpy = vi.fn().mockResolvedValue(undefined);
    Reflect.set(server as unknown as Record<string, unknown>, 'server', {
      close: closeSpy,
    });
    Reflect.set(server as unknown as Record<string, unknown>, 'transport', {
      close: closeSpy,
    });

    await server.shutdown('unit-test');

    expect(closeSpy).toHaveBeenCalledTimes(2);
    expect(exit).toHaveBeenCalledWith(0);
  });
});
