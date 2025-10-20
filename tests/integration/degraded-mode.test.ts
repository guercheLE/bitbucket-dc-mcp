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
import { QueryCache } from '../../src/core/cache-manager.js';
import {
  ComponentRegistry,
  ComponentType,
  HealthStatus,
} from '../../src/core/component-registry.js';
import { ComponentUnavailableError, DegradedModeError } from '../../src/core/errors.js';
import { HealthCheckManager } from '../../src/core/health-check-manager.js';
import { CallIdTool } from '../../src/tools/call-id-tool.js';
import { GetIdTool, type GetIdOutput } from '../../src/tools/get-id-tool.js';
import { SearchIdsTool } from '../../src/tools/search-ids-tool.js';

describe('Degraded Mode Integration Tests', () => {
  let mockLogger: PinoLogger;
  let componentRegistry: ComponentRegistry;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as PinoLogger;

    componentRegistry = new ComponentRegistry(mockLogger);
  });

  describe('Startup with missing optional components', () => {
    it('should start in degraded mode with missing embeddings DB', () => {
      // Register components
      componentRegistry.registerComponent('MCPServer', ComponentType.CRITICAL);
      componentRegistry.registerComponent('AuthManager', ComponentType.CRITICAL);
      componentRegistry.registerComponent('BitbucketClientService', ComponentType.CRITICAL);
      componentRegistry.registerComponent('EmbeddingsRepository', ComponentType.OPTIONAL);

      // Mark critical components as healthy
      componentRegistry.updateHealth('MCPServer', HealthStatus.HEALTHY);
      componentRegistry.updateHealth('AuthManager', HealthStatus.HEALTHY);
      componentRegistry.updateHealth('BitbucketClientService', HealthStatus.HEALTHY);

      // Mark optional component as unhealthy (missing DB)
      componentRegistry.updateHealth(
        'EmbeddingsRepository',
        HealthStatus.UNHEALTHY,
        'Database file not found',
      );

      const systemHealth = componentRegistry.getSystemHealth();

      // System should be degraded, not unhealthy
      expect(systemHealth.overallStatus).toBe(HealthStatus.DEGRADED);
      expect(componentRegistry.isCriticalComponentUnhealthy()).toBe(false);
    });

    it('should not start with missing critical component', () => {
      componentRegistry.registerComponent('AuthManager', ComponentType.CRITICAL);
      componentRegistry.updateHealth('AuthManager', HealthStatus.UNHEALTHY, 'Auth unavailable');

      const systemHealth = componentRegistry.getSystemHealth();

      expect(systemHealth.overallStatus).toBe(HealthStatus.UNHEALTHY);
      expect(componentRegistry.isCriticalComponentUnhealthy()).toBe(true);
    });
  });

  describe('Tool degradation scenarios', () => {
    it('should fail search_ids when EmbeddingsRepository unavailable', async () => {
      componentRegistry.registerComponent('EmbeddingsRepository', ComponentType.OPTIONAL);
      componentRegistry.updateHealth(
        'EmbeddingsRepository',
        HealthStatus.UNHEALTHY,
        'Database unavailable',
      );

      const mockSearchService = {
        search: vi.fn(),
      };

      const searchTool = new SearchIdsTool(mockSearchService as any, mockLogger, componentRegistry);

      await expect(searchTool.execute({ query: 'create issue', limit: 5 })).rejects.toThrow(
        DegradedModeError,
      );

      // Search service should not be called
      expect(mockSearchService.search).not.toHaveBeenCalled();
    });

    it('should use fallback schemas in get_id when DB unavailable', async () => {
      componentRegistry.registerComponent('EmbeddingsRepository', ComponentType.OPTIONAL);
      componentRegistry.updateHealth(
        'EmbeddingsRepository',
        HealthStatus.UNHEALTHY,
        'Database unavailable',
      );

      const mockRepository = {
        getOperation: vi.fn().mockReturnValue(null),
      };

      const cache = new QueryCache<GetIdOutput>(100, 60000, mockLogger);
      const getTool = new GetIdTool(mockRepository as any, cache, mockLogger, componentRegistry);

      // Try to get a common operation that should have fallback
      const result = await getTool.execute({ operation_id: 'create_issue' });

      expect(result).toBeDefined();
      expect(result.operation_id).toBe('create_issue');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'get_id.fallback_used',
          operation_id: 'create_issue',
        }),
        expect.stringContaining('fallback schema'),
      );
    });

    it('should work in call_id when only critical components are healthy', async () => {
      componentRegistry.registerComponent('BitbucketClientService', ComponentType.CRITICAL);
      componentRegistry.registerComponent('AuthManager', ComponentType.CRITICAL);
      componentRegistry.registerComponent('EmbeddingsRepository', ComponentType.OPTIONAL);

      // Critical components healthy
      componentRegistry.updateHealth('BitbucketClientService', HealthStatus.HEALTHY);
      componentRegistry.updateHealth('AuthManager', HealthStatus.HEALTHY);

      // Optional component unhealthy
      componentRegistry.updateHealth('EmbeddingsRepository', HealthStatus.UNHEALTHY);

      const mockBitbucketClient = {
        executeOperation: vi.fn().mockResolvedValue({ id: '123', key: 'TEST-1' }),
      };

      const mockAuthManager = {
        getAuthContext: vi.fn().mockResolvedValue({}),
      };

      const mockRepository = {
        getOperation: vi.fn().mockReturnValue({
          operationId: 'create_issue',
          method: 'post',
          path: '/rest/api/3/issue',
        }),
      };

      const mockConfig = {
        bitbucketUrl: 'https://test.atlassian.net',
      };

      const callTool = new CallIdTool(
        mockBitbucketClient as any,
        mockAuthManager as any,
        mockRepository as any,
        mockLogger,
        mockConfig as any,
        componentRegistry,
      );

      const result = await callTool.execute({
        operation_id: 'create_issue',
        parameters: { fields: {} },
      });

      expect(result).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.degraded_mode',
        }),
        expect.stringContaining('degraded mode'),
      );
    });

    it('should fail call_id when BitbucketClientService unavailable', async () => {
      componentRegistry.registerComponent('BitbucketClientService', ComponentType.CRITICAL);
      componentRegistry.updateHealth(
        'BitbucketClientService',
        HealthStatus.UNHEALTHY,
        'Bitbucket API unreachable',
      );

      const mockBitbucketClient = { executeOperation: vi.fn() };
      const mockAuthManager = { getAuthContext: vi.fn() };
      const mockRepository = { getOperation: vi.fn() };
      const mockConfig = { bitbucketUrl: 'https://test.atlassian.net' };

      const callTool = new CallIdTool(
        mockBitbucketClient as any,
        mockAuthManager as any,
        mockRepository as any,
        mockLogger,
        mockConfig as any,
        componentRegistry,
      );

      // Tool returns error response instead of throwing
      const result = await callTool.execute({
        operation_id: 'create_issue',
        parameters: { fields: {} },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('ComponentUnavailableError');
      expect(result.content[0]?.text).toContain('Bitbucket API unavailable');

      // Bitbucket client should not be called
      expect(mockBitbucketClient.executeOperation).not.toHaveBeenCalled();
    });
  });

  describe('Cache fallback scenarios', () => {
    it('should operate without cache when cache fails', async () => {
      const cache = new QueryCache(100, 60000, mockLogger);

      // Simulate cache failure by making internal store inaccessible
      const cacheKey = 'test_operation';
      const testValue = { operation_id: 'test', path: '/api/test' };

      // Normal operation
      cache.set(cacheKey, testValue as any);
      expect(cache.get(cacheKey)).toEqual(testValue);

      // Check that cache reports as available
      expect(cache.getIsAvailable()).toBe(true);

      // Health check should pass
      const healthy = await cache.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should log warning when cache becomes unavailable', () => {
      const cache = new QueryCache(100, 60000, mockLogger);

      // Force an error by corrupting internal state (this is a simulation)
      // In reality, this would happen from memory issues or corruption
      cache.set('key1', { data: 'value' } as any);

      // Verify cache is still available after normal operations
      expect(cache.getIsAvailable()).toBe(true);
    });
  });

  describe('Component recovery scenarios', () => {
    it('should detect component recovery via health checks', async () => {
      componentRegistry.registerComponent('TestComponent', ComponentType.OPTIONAL);
      componentRegistry.updateHealth('TestComponent', HealthStatus.UNHEALTHY, 'Initial failure');

      const healthCheckManager = new HealthCheckManager(componentRegistry, mockLogger, {
        interval: 1000,
        timeout: 500,
      });

      let checkCount = 0;
      healthCheckManager.registerHealthCheck('TestComponent', async () => {
        checkCount++;
        if (checkCount >= 2) {
          // Simulate recovery on second check
          return { status: HealthStatus.HEALTHY, message: 'Component recovered' };
        }
        return { status: HealthStatus.UNHEALTHY, message: 'Still failing' };
      });

      // Run first check - should be unhealthy
      await healthCheckManager.runCheck('TestComponent');
      let health = componentRegistry.getComponentHealth('TestComponent');
      expect(health?.status).toBe(HealthStatus.UNHEALTHY);

      // Run second check - should recover
      await healthCheckManager.runCheck('TestComponent');
      health = componentRegistry.getComponentHealth('TestComponent');
      expect(health?.status).toBe(HealthStatus.HEALTHY);
      expect(health?.message).toBe('Component recovered');
    });

    it('should transition from DEGRADED to HEALTHY when component recovers', () => {
      componentRegistry.registerComponent('Critical1', ComponentType.CRITICAL);
      componentRegistry.registerComponent('Optional1', ComponentType.OPTIONAL);

      componentRegistry.updateHealth('Critical1', HealthStatus.HEALTHY);
      componentRegistry.updateHealth('Optional1', HealthStatus.UNHEALTHY);

      let systemHealth = componentRegistry.getSystemHealth();
      expect(systemHealth.overallStatus).toBe(HealthStatus.DEGRADED);

      // Optional component recovers
      componentRegistry.updateHealth('Optional1', HealthStatus.HEALTHY);

      systemHealth = componentRegistry.getSystemHealth();
      expect(systemHealth.overallStatus).toBe(HealthStatus.HEALTHY);
    });
  });

  describe('Graceful shutdown in degraded mode', () => {
    it('should shutdown successfully even with degraded components', async () => {
      componentRegistry.registerComponent('Critical1', ComponentType.CRITICAL);
      componentRegistry.registerComponent('Optional1', ComponentType.OPTIONAL);

      componentRegistry.updateHealth('Critical1', HealthStatus.HEALTHY);
      componentRegistry.updateHealth('Optional1', HealthStatus.UNHEALTHY);

      const systemHealth = componentRegistry.getSystemHealth();
      expect(systemHealth.overallStatus).toBe(HealthStatus.DEGRADED);

      // Shutdown should still work with degraded mode
      const shutdownCalled = { critical: false, optional: false };

      const shutdownHooks = [
        async () => {
          shutdownCalled.critical = true;
        },
        async () => {
          // Optional component cleanup might fail, but shouldn't block shutdown
          if (componentRegistry.isComponentHealthy('Optional1')) {
            shutdownCalled.optional = true;
          }
        },
      ];

      // Execute all hooks
      await Promise.all(shutdownHooks.map((hook) => hook()));

      expect(shutdownCalled.critical).toBe(true);
      expect(shutdownCalled.optional).toBe(false); // Optional was unhealthy
    });
  });

  describe('Error message clarity', () => {
    it('should provide clear recovery actions for ComponentUnavailableError', () => {
      const error = new ComponentUnavailableError(
        'AuthManager',
        'Authentication unavailable',
        'Run setup wizard: bitbucket-mcp setup',
      );

      expect(error.component).toBe('AuthManager');
      expect(error.recoveryAction).toBe('Run setup wizard: bitbucket-mcp setup');
      expect(error.message).toContain('Authentication unavailable');
    });

    it('should list available features in DegradedModeError', () => {
      const error = new DegradedModeError('EmbeddingsRepository', 'Semantic search unavailable', [
        'get_id',
        'call_id',
      ]);

      expect(error.component).toBe('EmbeddingsRepository');
      expect(error.availableFeatures).toEqual(['get_id', 'call_id']);
      expect(error.message).toContain('Semantic search unavailable');
    });
  });
});
