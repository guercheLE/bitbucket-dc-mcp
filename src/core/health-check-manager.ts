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
import { ComponentRegistry, HealthStatus } from './component-registry.js';

/**
 * Health check function that verifies component availability.
 * Returns status and optional message describing component state.
 */
export type HealthCheckFunction = () => Promise<{
  status: HealthStatus;
  message?: string;
}>;

/**
 * Configuration for health check manager behavior.
 */
export interface HealthCheckConfig {
  /** Interval in milliseconds between health checks */
  interval: number;
  /** Maximum time in milliseconds to wait for a health check to complete */
  timeout: number;
}

/**
 * Default health check configuration values.
 */
const DEFAULT_CONFIG: HealthCheckConfig = {
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
};

/**
 * Manages periodic health checks for registered components.
 *
 * Executes health check functions at configurable intervals and updates
 * the component registry with results. Handles timeouts and errors gracefully.
 *
 * @example
 * ```typescript
 * const manager = new HealthCheckManager(registry, logger, {
 *   interval: 30000,
 *   timeout: 5000
 * });
 *
 * manager.registerHealthCheck('Database', async () => {
 *   await db.ping();
 *   return { status: HealthStatus.HEALTHY };
 * });
 *
 * manager.start();
 * ```
 */
export class HealthCheckManager {
  private readonly registry: ComponentRegistry;
  private readonly logger: PinoLogger;
  private readonly config: HealthCheckConfig;
  private readonly healthChecks: Map<string, HealthCheckFunction>;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Creates a new health check manager.
   *
   * @param registry - Component registry to update with health check results
   * @param logger - Pino logger instance for structured logging
   * @param config - Health check configuration (interval, timeout)
   */
  constructor(
    registry: ComponentRegistry,
    logger: PinoLogger,
    config: Partial<HealthCheckConfig> = {},
  ) {
    this.registry = registry;
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.healthChecks = new Map();
  }

  /**
   * Registers a health check function for a component.
   *
   * @param component - Component identifier (must be registered in ComponentRegistry)
   * @param checkFn - Async function that performs health verification
   */
  registerHealthCheck(component: string, checkFn: HealthCheckFunction): void {
    if (this.healthChecks.has(component)) {
      this.logger.warn(
        { component },
        'Health check already registered, replacing with new function',
      );
    }

    this.healthChecks.set(component, checkFn);

    this.logger.debug({ component }, 'Health check registered');
  }

  /**
   * Starts periodic health check execution.
   * Runs an initial check immediately, then continues at configured intervals.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Health check manager already running');
      return;
    }

    this.isRunning = true;

    this.logger.info(
      {
        interval: this.config.interval,
        timeout: this.config.timeout,
        components: Array.from(this.healthChecks.keys()),
      },
      'Health check manager started',
    );

    // Run initial health checks
    await this.runAllChecks();

    // Schedule periodic checks
    this.intervalHandle = setInterval(async () => {
      await this.runAllChecks();
    }, this.config.interval);
  }

  /**
   * Stops periodic health check execution.
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Health check manager not running');
      return;
    }

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.isRunning = false;

    this.logger.info('Health check manager stopped');
  }

  /**
   * Executes all registered health checks in parallel.
   * Errors from individual checks are caught and handled gracefully.
   */
  async runAllChecks(): Promise<void> {
    const components = Array.from(this.healthChecks.keys());

    if (components.length === 0) {
      this.logger.debug('No health checks registered, skipping');
      return;
    }

    this.logger.debug({ components }, 'Running all health checks');

    const checkPromises = components.map((component) =>
      this.runCheck(component).catch((error) => {
        this.logger.error(
          { component, error: { name: error.name, message: error.message } },
          'Health check execution failed',
        );
      }),
    );

    await Promise.all(checkPromises);
  }

  /**
   * Executes a health check for a specific component.
   * Handles timeouts and errors, updating the registry accordingly.
   *
   * @param component - Component identifier
   */
  async runCheck(component: string): Promise<void> {
    const checkFn = this.healthChecks.get(component);

    if (!checkFn) {
      this.logger.warn({ component }, 'No health check registered for component');
      return;
    }

    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Health check timeout after ${this.config.timeout}ms`));
        }, this.config.timeout);
      });

      // Race between health check and timeout
      const result = await Promise.race([checkFn(), timeoutPromise]);

      const duration = Date.now() - startTime;

      this.registry.updateHealth(component, result.status, result.message);

      this.logger.debug(
        {
          component,
          status: result.status,
          message: result.message,
          duration_ms: duration,
        },
        'Health check completed',
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      // Determine if this was a timeout or check failure
      const isTimeout = error instanceof Error && error.message.includes('timeout');
      const status = isTimeout ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY;
      const message = isTimeout
        ? `Health check timeout after ${this.config.timeout}ms`
        : 'Health check failed';

      this.registry.updateHealth(
        component,
        status,
        message,
        error instanceof Error ? error : new Error(String(error)),
      );

      this.logger.warn(
        {
          component,
          status,
          message,
          duration_ms: duration,
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        },
        'Health check failed',
      );
    }
  }

  /**
   * Gets the current running state of the manager.
   *
   * @returns True if health checks are running, false otherwise
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Gets the number of registered health checks.
   *
   * @returns Count of registered health checks
   */
  getHealthCheckCount(): number {
    return this.healthChecks.size;
  }
}
