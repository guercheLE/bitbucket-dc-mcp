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
 * Component criticality classification.
 * CRITICAL components must be healthy for the system to operate.
 * OPTIONAL components can fail without preventing core functionality.
 */
export enum ComponentType {
  CRITICAL = 'CRITICAL',
  OPTIONAL = 'OPTIONAL',
}

/**
 * Component health status.
 * HEALTHY: Component is fully operational.
 * DEGRADED: Component has issues but can partially function.
 * UNHEALTHY: Component has failed and cannot operate.
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

/**
 * Health information for a single component.
 */
export interface ComponentHealth {
  /** Component identifier */
  name: string;
  /** Component criticality classification */
  type: ComponentType;
  /** Current health status */
  status: HealthStatus;
  /** Optional human-readable status message */
  message?: string;
  /** Timestamp of last health check */
  lastCheck: Date;
  /** Error details if component is unhealthy */
  error?: Error;
}

/**
 * Aggregated health status for the entire system.
 */
export interface SystemHealth {
  /** Overall system health based on component states */
  overallStatus: HealthStatus;
  /** Health status of all registered components */
  components: ComponentHealth[];
  /** Timestamp of health aggregation */
  timestamp: Date;
}

/**
 * Registry for tracking component health across the system.
 *
 * Maintains health status for all registered components and provides
 * aggregated system health based on component criticality. Critical
 * components must be healthy for the system to operate.
 *
 * @example
 * ```typescript
 * const registry = new ComponentRegistry(logger);
 * registry.registerComponent('BitbucketClientService', ComponentType.CRITICAL);
 * registry.updateHealth('BitbucketClientService', HealthStatus.HEALTHY);
 *
 * const systemHealth = registry.getSystemHealth();
 * console.log(systemHealth.overallStatus); // HEALTHY
 * ```
 */
export class ComponentRegistry {
  private readonly logger: PinoLogger;
  private readonly components: Map<string, ComponentHealth>;

  /**
   * Creates a new component registry.
   *
   * @param logger - Pino logger instance for structured logging
   */
  constructor(logger: PinoLogger) {
    this.logger = logger;
    this.components = new Map();
  }

  /**
   * Registers a new component for health tracking.
   *
   * @param name - Unique component identifier
   * @param type - Component criticality (CRITICAL or OPTIONAL)
   */
  registerComponent(name: string, type: ComponentType): void {
    if (this.components.has(name)) {
      this.logger.warn({ component: name }, 'Component already registered, skipping');
      return;
    }

    const componentHealth: ComponentHealth = {
      name,
      type,
      status: HealthStatus.UNHEALTHY, // Start as unhealthy until explicitly marked healthy
      lastCheck: new Date(),
    };

    this.components.set(name, componentHealth);

    this.logger.debug({ component: name, type }, 'Component registered for health tracking');
  }

  /**
   * Updates the health status of a registered component.
   *
   * @param name - Component identifier
   * @param status - New health status
   * @param message - Optional status message
   * @param error - Optional error details
   */
  updateHealth(name: string, status: HealthStatus, message?: string, error?: Error): void {
    const component = this.components.get(name);

    if (!component) {
      this.logger.warn(
        { component: name },
        'Attempted to update health for unregistered component',
      );
      return;
    }

    const oldStatus = component.status;
    component.status = status;
    component.message = message;
    component.lastCheck = new Date();
    component.error = error;

    // Log health status changes
    if (oldStatus !== status) {
      this.logger.info(
        {
          component: name,
          type: component.type,
          from: oldStatus,
          to: status,
          message,
          error: error ? { name: error.name, message: error.message } : undefined,
        },
        'Component health changed',
      );
    }
  }

  /**
   * Retrieves health information for a specific component.
   *
   * @param name - Component identifier
   * @returns Component health or undefined if not registered
   */
  getComponentHealth(name: string): ComponentHealth | undefined {
    return this.components.get(name);
  }

  /**
   * Checks if a specific component is healthy.
   *
   * @param name - Component identifier
   * @returns True if component exists and is HEALTHY, false otherwise
   */
  isComponentHealthy(name: string): boolean {
    const component = this.components.get(name);
    return component?.status === HealthStatus.HEALTHY;
  }

  /**
   * Checks if any critical component is unhealthy.
   *
   * @returns True if any CRITICAL component is UNHEALTHY, false otherwise
   */
  isCriticalComponentUnhealthy(): boolean {
    for (const component of this.components.values()) {
      if (
        component.type === ComponentType.CRITICAL &&
        component.status === HealthStatus.UNHEALTHY
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Aggregates health status across all components.
   *
   * Overall status calculation:
   * - UNHEALTHY: Any CRITICAL component is UNHEALTHY
   * - DEGRADED: Any component (critical or optional) is DEGRADED or UNHEALTHY
   * - HEALTHY: All components are HEALTHY
   *
   * @returns Aggregated system health
   */
  getSystemHealth(): SystemHealth {
    const components = Array.from(this.components.values());
    let overallStatus = HealthStatus.HEALTHY;

    // Check for critical component failures first
    const hasCriticalFailure = components.some(
      (c) => c.type === ComponentType.CRITICAL && c.status === HealthStatus.UNHEALTHY,
    );

    if (hasCriticalFailure) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else {
      // Check for any degraded or unhealthy components
      const hasDegradation = components.some(
        (c) => c.status === HealthStatus.DEGRADED || c.status === HealthStatus.UNHEALTHY,
      );

      if (hasDegradation) {
        overallStatus = HealthStatus.DEGRADED;
      }
    }

    return {
      overallStatus,
      components,
      timestamp: new Date(),
    };
  }

  /**
   * Gets all registered component names.
   *
   * @returns Array of component names
   */
  getComponentNames(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Clears all registered components.
   * Useful for testing and cleanup.
   */
  clear(): void {
    this.components.clear();
    this.logger.debug('Component registry cleared');
  }
}
