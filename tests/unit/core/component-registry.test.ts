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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ComponentRegistry,
  ComponentType,
  HealthStatus,
} from '../../../src/core/component-registry.js';

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;
  let mockLogger: PinoLogger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as PinoLogger;

    registry = new ComponentRegistry(mockLogger);
  });

  describe('registerComponent', () => {
    it('should register component and track health', () => {
      registry.registerComponent('TestComponent', ComponentType.CRITICAL);

      const health = registry.getComponentHealth('TestComponent');

      expect(health).toBeDefined();
      expect(health?.name).toBe('TestComponent');
      expect(health?.type).toBe(ComponentType.CRITICAL);
      expect(health?.status).toBe(HealthStatus.UNHEALTHY); // Starts as unhealthy
      expect(health?.lastCheck).toBeInstanceOf(Date);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { component: 'TestComponent', type: ComponentType.CRITICAL },
        'Component registered for health tracking',
      );
    });

    it('should skip registration if component already exists', () => {
      registry.registerComponent('TestComponent', ComponentType.CRITICAL);
      registry.registerComponent('TestComponent', ComponentType.OPTIONAL);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { component: 'TestComponent' },
        'Component already registered, skipping',
      );
    });

    it('should register multiple components', () => {
      registry.registerComponent('Component1', ComponentType.CRITICAL);
      registry.registerComponent('Component2', ComponentType.OPTIONAL);
      registry.registerComponent('Component3', ComponentType.CRITICAL);

      const names = registry.getComponentNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('Component1');
      expect(names).toContain('Component2');
      expect(names).toContain('Component3');
    });
  });

  describe('updateHealth', () => {
    beforeEach(() => {
      registry.registerComponent('TestComponent', ComponentType.CRITICAL);
    });

    it('should update component health status', () => {
      registry.updateHealth('TestComponent', HealthStatus.HEALTHY, 'All systems operational');

      const health = registry.getComponentHealth('TestComponent');

      expect(health?.status).toBe(HealthStatus.HEALTHY);
      expect(health?.message).toBe('All systems operational');
      expect(health?.error).toBeUndefined();
    });

    it('should log health status changes', () => {
      registry.updateHealth('TestComponent', HealthStatus.HEALTHY);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'TestComponent',
          type: ComponentType.CRITICAL,
          from: HealthStatus.UNHEALTHY,
          to: HealthStatus.HEALTHY,
        }),
        'Component health changed',
      );
    });

    it('should update lastCheck timestamp', () => {
      const before = new Date();
      registry.updateHealth('TestComponent', HealthStatus.HEALTHY);
      const health = registry.getComponentHealth('TestComponent');
      const after = new Date();

      expect(health?.lastCheck.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(health?.lastCheck.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store error details when component is unhealthy', () => {
      const error = new Error('Connection failed');
      registry.updateHealth('TestComponent', HealthStatus.UNHEALTHY, 'Connection failed', error);

      const health = registry.getComponentHealth('TestComponent');

      expect(health?.status).toBe(HealthStatus.UNHEALTHY);
      expect(health?.message).toBe('Connection failed');
      expect(health?.error).toBe(error);
    });

    it('should warn when updating unregistered component', () => {
      registry.updateHealth('UnknownComponent', HealthStatus.HEALTHY);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { component: 'UnknownComponent' },
        'Attempted to update health for unregistered component',
      );
    });

    it('should handle multiple health updates', () => {
      registry.updateHealth('TestComponent', HealthStatus.HEALTHY);
      registry.updateHealth('TestComponent', HealthStatus.DEGRADED, 'Performance issues');
      registry.updateHealth('TestComponent', HealthStatus.UNHEALTHY, 'Complete failure');

      const health = registry.getComponentHealth('TestComponent');
      expect(health?.status).toBe(HealthStatus.UNHEALTHY);
      expect(health?.message).toBe('Complete failure');
    });
  });

  describe('getComponentHealth', () => {
    it('should return undefined for unregistered component', () => {
      const health = registry.getComponentHealth('NonExistent');
      expect(health).toBeUndefined();
    });

    it('should return health information for registered component', () => {
      registry.registerComponent('TestComponent', ComponentType.OPTIONAL);
      registry.updateHealth('TestComponent', HealthStatus.HEALTHY);

      const health = registry.getComponentHealth('TestComponent');

      expect(health).toBeDefined();
      expect(health?.name).toBe('TestComponent');
      expect(health?.type).toBe(ComponentType.OPTIONAL);
      expect(health?.status).toBe(HealthStatus.HEALTHY);
    });
  });

  describe('isComponentHealthy', () => {
    beforeEach(() => {
      registry.registerComponent('TestComponent', ComponentType.CRITICAL);
    });

    it('should return true when component is healthy', () => {
      registry.updateHealth('TestComponent', HealthStatus.HEALTHY);
      expect(registry.isComponentHealthy('TestComponent')).toBe(true);
    });

    it('should return false when component is degraded', () => {
      registry.updateHealth('TestComponent', HealthStatus.DEGRADED);
      expect(registry.isComponentHealthy('TestComponent')).toBe(false);
    });

    it('should return false when component is unhealthy', () => {
      registry.updateHealth('TestComponent', HealthStatus.UNHEALTHY);
      expect(registry.isComponentHealthy('TestComponent')).toBe(false);
    });

    it('should return false for unregistered component', () => {
      expect(registry.isComponentHealthy('NonExistent')).toBe(false);
    });
  });

  describe('isCriticalComponentUnhealthy', () => {
    it('should return true when any critical component is unhealthy', () => {
      registry.registerComponent('CriticalComponent', ComponentType.CRITICAL);
      registry.updateHealth('CriticalComponent', HealthStatus.UNHEALTHY);

      expect(registry.isCriticalComponentUnhealthy()).toBe(true);
    });

    it('should return false when all critical components are healthy', () => {
      registry.registerComponent('Critical1', ComponentType.CRITICAL);
      registry.registerComponent('Critical2', ComponentType.CRITICAL);
      registry.updateHealth('Critical1', HealthStatus.HEALTHY);
      registry.updateHealth('Critical2', HealthStatus.HEALTHY);

      expect(registry.isCriticalComponentUnhealthy()).toBe(false);
    });

    it('should return false when critical component is degraded', () => {
      registry.registerComponent('CriticalComponent', ComponentType.CRITICAL);
      registry.updateHealth('CriticalComponent', HealthStatus.DEGRADED);

      expect(registry.isCriticalComponentUnhealthy()).toBe(false);
    });

    it('should ignore optional components', () => {
      registry.registerComponent('OptionalComponent', ComponentType.OPTIONAL);
      registry.updateHealth('OptionalComponent', HealthStatus.UNHEALTHY);

      expect(registry.isCriticalComponentUnhealthy()).toBe(false);
    });

    it('should return false when no components registered', () => {
      expect(registry.isCriticalComponentUnhealthy()).toBe(false);
    });
  });

  describe('getSystemHealth', () => {
    it('should calculate system health correctly with all healthy components', () => {
      registry.registerComponent('Critical1', ComponentType.CRITICAL);
      registry.registerComponent('Optional1', ComponentType.OPTIONAL);
      registry.updateHealth('Critical1', HealthStatus.HEALTHY);
      registry.updateHealth('Optional1', HealthStatus.HEALTHY);

      const systemHealth = registry.getSystemHealth();

      expect(systemHealth.overallStatus).toBe(HealthStatus.HEALTHY);
      expect(systemHealth.components).toHaveLength(2);
      expect(systemHealth.timestamp).toBeInstanceOf(Date);
    });

    it('should return UNHEALTHY when any critical component is unhealthy', () => {
      registry.registerComponent('Critical1', ComponentType.CRITICAL);
      registry.registerComponent('Critical2', ComponentType.CRITICAL);
      registry.registerComponent('Optional1', ComponentType.OPTIONAL);

      registry.updateHealth('Critical1', HealthStatus.HEALTHY);
      registry.updateHealth('Critical2', HealthStatus.UNHEALTHY);
      registry.updateHealth('Optional1', HealthStatus.HEALTHY);

      const systemHealth = registry.getSystemHealth();

      expect(systemHealth.overallStatus).toBe(HealthStatus.UNHEALTHY);
    });

    it('should return DEGRADED when optional component is unhealthy', () => {
      registry.registerComponent('Critical1', ComponentType.CRITICAL);
      registry.registerComponent('Optional1', ComponentType.OPTIONAL);

      registry.updateHealth('Critical1', HealthStatus.HEALTHY);
      registry.updateHealth('Optional1', HealthStatus.UNHEALTHY);

      const systemHealth = registry.getSystemHealth();

      expect(systemHealth.overallStatus).toBe(HealthStatus.DEGRADED);
    });

    it('should return DEGRADED when any component is degraded', () => {
      registry.registerComponent('Critical1', ComponentType.CRITICAL);
      registry.registerComponent('Critical2', ComponentType.CRITICAL);

      registry.updateHealth('Critical1', HealthStatus.HEALTHY);
      registry.updateHealth('Critical2', HealthStatus.DEGRADED);

      const systemHealth = registry.getSystemHealth();

      expect(systemHealth.overallStatus).toBe(HealthStatus.DEGRADED);
    });

    it('should include all registered components in response', () => {
      registry.registerComponent('Comp1', ComponentType.CRITICAL);
      registry.registerComponent('Comp2', ComponentType.OPTIONAL);
      registry.registerComponent('Comp3', ComponentType.CRITICAL);

      const systemHealth = registry.getSystemHealth();

      expect(systemHealth.components).toHaveLength(3);
      expect(systemHealth.components.map((c) => c.name)).toContain('Comp1');
      expect(systemHealth.components.map((c) => c.name)).toContain('Comp2');
      expect(systemHealth.components.map((c) => c.name)).toContain('Comp3');
    });
  });

  describe('clear', () => {
    it('should remove all registered components', () => {
      registry.registerComponent('Comp1', ComponentType.CRITICAL);
      registry.registerComponent('Comp2', ComponentType.OPTIONAL);

      registry.clear();

      expect(registry.getComponentNames()).toHaveLength(0);
      expect(registry.getComponentHealth('Comp1')).toBeUndefined();
      expect(registry.getComponentHealth('Comp2')).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Component registry cleared');
    });
  });
});
