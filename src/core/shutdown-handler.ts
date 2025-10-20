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
 * Async function that performs cleanup during shutdown.
 * Receives the signal that triggered shutdown (SIGTERM, SIGINT, etc.).
 */
export type ShutdownHook = (signal: string) => Promise<void>;

/**
 * Configuration for shutdown behavior.
 */
export interface ShutdownConfig {
  /** Maximum time in milliseconds to wait for all hooks to complete */
  timeout: number;
}

/**
 * Default shutdown configuration values.
 */
const DEFAULT_CONFIG: ShutdownConfig = {
  timeout: 5000, // 5 seconds
};

/**
 * Manages graceful shutdown of the application.
 *
 * Executes registered shutdown hooks in sequence when process termination
 * signals are received. Ensures cleanup completes within a timeout period.
 *
 * @example
 * ```typescript
 * const handler = new ShutdownHandler(logger, { timeout: 5000 });
 *
 * handler.registerHook(async (signal) => {
 *   await database.close();
 *   logger.info('Database closed');
 * });
 *
 * process.on('SIGTERM', () => handler.shutdown('SIGTERM'));
 * ```
 */
export class ShutdownHandler {
  private readonly logger: PinoLogger;
  private readonly config: ShutdownConfig;
  private readonly hooks: ShutdownHook[] = [];
  private isShuttingDown = false;

  /**
   * Creates a new shutdown handler.
   *
   * @param logger - Pino logger instance for structured logging
   * @param config - Shutdown configuration (timeout)
   */
  constructor(logger: PinoLogger, config: Partial<ShutdownConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Registers a shutdown hook to be executed during shutdown.
   * Hooks are executed in the order they are registered.
   *
   * @param hook - Async function to execute during shutdown
   */
  registerHook(hook: ShutdownHook): void {
    this.hooks.push(hook);
    this.logger.debug({ totalHooks: this.hooks.length }, 'Shutdown hook registered');
  }

  /**
   * Executes all registered shutdown hooks with timeout protection.
   * Prevents multiple simultaneous shutdown attempts.
   *
   * @param signal - Signal that triggered shutdown (SIGTERM, SIGINT, etc.)
   */
  async shutdown(signal: string): Promise<void> {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      this.logger.warn({ signal }, 'Shutdown already in progress, ignoring');
      return;
    }

    this.isShuttingDown = true;

    const startTime = Date.now();

    this.logger.info(
      {
        signal,
        hooks: this.hooks.length,
        timeout: this.config.timeout,
      },
      'Graceful shutdown initiated',
    );

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Shutdown timeout after ${this.config.timeout}ms`));
        }, this.config.timeout);
      });

      // Execute all hooks in sequence
      const shutdownPromise = this.executeHooks(signal);

      // Race between shutdown completion and timeout
      await Promise.race([shutdownPromise, timeoutPromise]);

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          duration_ms: duration,
          hooks_executed: this.hooks.length,
        },
        'Graceful shutdown completed successfully',
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        {
          duration_ms: duration,
          timeout: this.config.timeout,
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        },
        'Shutdown failed or timed out',
      );
    } finally {
      // Force exit after logging
      process.exit(0);
    }
  }

  /**
   * Executes all registered hooks in sequence.
   * Catches and logs errors from individual hooks without stopping execution.
   *
   * @param signal - Signal that triggered shutdown
   */
  private async executeHooks(signal: string): Promise<void> {
    for (let i = 0; i < this.hooks.length; i++) {
      const hook = this.hooks[i];

      try {
        this.logger.debug({ hookIndex: i }, 'Executing shutdown hook');
        await hook(signal);
        this.logger.debug({ hookIndex: i }, 'Shutdown hook completed');
      } catch (error) {
        this.logger.error(
          {
            hookIndex: i,
            error: error instanceof Error ? { name: error.name, message: error.message } : error,
          },
          'Shutdown hook failed',
        );
        // Continue executing remaining hooks even if one fails
      }
    }
  }

  /**
   * Gets the number of registered shutdown hooks.
   *
   * @returns Count of registered hooks
   */
  getHookCount(): number {
    return this.hooks.length;
  }

  /**
   * Checks if shutdown is currently in progress.
   *
   * @returns True if shutdown is in progress, false otherwise
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}
