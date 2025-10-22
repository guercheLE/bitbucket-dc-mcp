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

import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import DatabaseConstructor from 'better-sqlite3';
import { createRequire } from 'node:module';
import path, { dirname } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load as loadVecExtension } from 'sqlite-vec';
import { AuthManager } from './auth/auth-manager.js';
import { ComponentRegistry, ComponentType, HealthStatus } from './core/component-registry.js';
import { ConfigManager } from './core/config-manager.js';
import { CredentialStorage } from './core/credential-storage.js';
import { ComponentUnavailableError } from './core/errors.js';
import { HealthCheckManager } from './core/health-check-manager.js';
import { Logger } from './core/logger.js';
import { McpServer } from './core/mcp-server.js';
import { RateLimiter } from './core/rate-limiter.js';
import { ShutdownHandler } from './core/shutdown-handler.js';
import { JsonOperationsRepository } from './data/operations-repository.js';
import { BitbucketClientService } from './services/bitbucket-client.js';
import {
  SemanticSearchService,
  type EmbeddingsRepository,
  type SearchResult,
} from './services/semantic-search.js';
import { registerTools } from './tools/register-tools.js';

const LOGGING_CAPABILITIES: ServerCapabilities = {
  logging: {},
  tools: {},
};

const require = createRequire(import.meta.url);

/**
 * Get the package root directory
 */
function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // From dist/ go up to package root
  return path.join(__dirname, '..');
}
const packageInfo = require('../package.json') as { name?: string; version?: string };

/**
 * Application entry point responsible for loading configuration, bootstrapping the MCP server,
 * and wiring global process handlers for graceful lifecycle management.
 */
export async function main(): Promise<void> {
  let server: McpServer | undefined;
  let healthCheckManager: HealthCheckManager | undefined;
  let shutdownHandler: ShutdownHandler | undefined;
  let db: DatabaseConstructor.Database | undefined;

  try {
    const config = await ConfigManager.load();

    Logger.configure({ level: config.logLevel, pretty: config.logPretty });
    const logger = Logger.getInstance();

    // Initialize component registry for health tracking
    const componentRegistry = new ComponentRegistry(logger);

    // Initialize shutdown handler
    shutdownHandler = new ShutdownHandler(logger, {
      timeout: config.shutdownTimeoutMs || 5000,
    });

    // Register components
    componentRegistry.registerComponent('MCPServer', ComponentType.CRITICAL);
    componentRegistry.registerComponent('AuthManager', ComponentType.CRITICAL);
    componentRegistry.registerComponent('BitbucketClientService', ComponentType.CRITICAL);
    componentRegistry.registerComponent('EmbeddingsRepository', ComponentType.OPTIONAL);
    componentRegistry.registerComponent('CacheManager', ComponentType.OPTIONAL);

    server = new McpServer(
      {
        version: String(packageInfo.version ?? '0.0.0'),
        name: typeof packageInfo.name === 'string' ? packageInfo.name : undefined,
        shutdownTimeoutMs: config.shutdownTimeoutMs,
        capabilities: LOGGING_CAPABILITIES,
      },
      { logger },
    );

    let shuttingDown = false;
    const requestShutdown = (signal: NodeJS.Signals): void => {
      if (!server || shuttingDown) {
        return;
      }
      shuttingDown = true;
      logger.info({ event: 'app.shutdown_signal', signal }, 'Received shutdown signal');

      // Use shutdown handler for graceful shutdown
      if (shutdownHandler) {
        void shutdownHandler.shutdown(signal);
      } else {
        void server.shutdown(`signal:${signal}`);
      }
    };

    process.on('SIGINT', requestShutdown);
    process.on('SIGTERM', requestShutdown);
    process.on('SIGUSR2', requestShutdown); // nodemon restart

    process.on('uncaughtException', (error: Error) => {
      server?.handleError(error, { event: 'app.uncaught_exception' });
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      server?.handleError(error, { event: 'app.unhandled_rejection' });
    });

    // Initialize server before registering tools
    await server.initialize();
    componentRegistry.updateHealth('MCPServer', HealthStatus.HEALTHY, 'Initialized successfully');

    // Initialize database and embeddings repository
    const packageRoot = getPackageRoot();
    const databasePath = path.join(packageRoot, 'data', 'embeddings.db');
    let embeddingsRepository: EmbeddingsRepository | null = null;
    let hasVecExtension = false;

    try {
      db = new DatabaseConstructor(databasePath, { readonly: true });

      try {
        await loadVecExtension(db);
        hasVecExtension = true;
      } catch (error) {
        logger.warn({ err: error }, 'sqlite-vec extension unavailable, using fallback');
      }

      embeddingsRepository = {
        async search(queryEmbedding: Float32Array, limit: number): Promise<SearchResult[]> {
          if (hasVecExtension && db) {
            const stmt = db.prepare(`
            SELECT
              e.operation_id AS operationId,
              o.summary,
              o.description,
              1 - vec_distance_cosine(e.vector, vec_f32(?)) AS similarityScore
            FROM embeddings e
            INNER JOIN operations o ON o.operation_id = e.operation_id
            ORDER BY similarityScore DESC
            LIMIT ?
          `);
            const rows = stmt.all(Buffer.from(queryEmbedding.buffer), limit) as Array<{
              operationId: string;
              summary: string;
              description: string;
              similarityScore: number;
            }>;
            return rows;
          } else {
            // Fallback without vec extension (for testing)
            logger.warn('Using fallback search without vector extension');
            return [];
          }
        },
      };

      componentRegistry.updateHealth(
        'EmbeddingsRepository',
        HealthStatus.HEALTHY,
        'Database initialized successfully',
      );

      // Register shutdown hook for database
      shutdownHandler.registerHook(async () => {
        logger.info('Closing embeddings database');
        if (db) {
          db.close();
        }
      });
    } catch (error) {
      componentRegistry.updateHealth(
        'EmbeddingsRepository',
        HealthStatus.UNHEALTHY,
        'Database initialization failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      logger.warn(
        {
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
          impact: 'search_ids tool unavailable',
          workaround: 'Use get_id with known operation IDs',
        },
        'Optional component failed to initialize, entering degraded mode',
      );
    }

    // Initialize services and register MCP tools
    const operationsFilePath = path.join(packageRoot, 'data', 'operations.json');
    const operationsRepository = new JsonOperationsRepository(operationsFilePath, logger);

    // Initialize AuthManager (critical component)
    let authManager: AuthManager;
    try {
      const credentialStorage = new CredentialStorage(logger, undefined, config.forceFileStorage);
      authManager = new AuthManager(credentialStorage, logger, config);
      componentRegistry.updateHealth('AuthManager', HealthStatus.HEALTHY);
    } catch (error) {
      componentRegistry.updateHealth(
        'AuthManager',
        HealthStatus.UNHEALTHY,
        'Initialization failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      logger.error({ component: 'AuthManager', error }, 'Critical component failed to initialize');
      throw new ComponentUnavailableError(
        'AuthManager',
        'Authentication unavailable',
        'Run setup wizard: bitbucket-dc-mcp setup',
      );
    }

    // Initialize BitbucketClientService (critical component)
    let bitbucketClient: BitbucketClientService;
    try {
      const rateLimiter = new RateLimiter({
        capacity: config.rateLimit,
        refillRate: config.rateLimit,
      });
      bitbucketClient = new BitbucketClientService(
        authManager,
        rateLimiter,
        logger,
        config,
        operationsRepository,
      );
      componentRegistry.updateHealth('BitbucketClientService', HealthStatus.HEALTHY);
    } catch (error) {
      componentRegistry.updateHealth(
        'BitbucketClientService',
        HealthStatus.UNHEALTHY,
        'Initialization failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      logger.error(
        { component: 'BitbucketClientService', error },
        'Critical component failed to initialize',
      );
      throw new ComponentUnavailableError(
        'BitbucketClientService',
        'Bitbucket API unavailable',
        'Check Bitbucket URL and network connectivity',
      );
    }

    // Check if critical components are healthy before starting
    if (componentRegistry.isCriticalComponentUnhealthy()) {
      const systemHealth = componentRegistry.getSystemHealth();
      const unhealthyComponents = systemHealth.components
        .filter((c) => c.type === ComponentType.CRITICAL && c.status === HealthStatus.UNHEALTHY)
        .map((c) => c.name);

      throw new Error(
        `Cannot start server: Critical components unhealthy: ${unhealthyComponents.join(', ')}`,
      );
    }

    // Log degraded mode if optional components are unhealthy
    const systemHealth = componentRegistry.getSystemHealth();
    if (systemHealth.overallStatus === HealthStatus.DEGRADED) {
      const degradedComponents = systemHealth.components
        .filter((c) => c.status !== HealthStatus.HEALTHY)
        .map((c) => c.name);
      logger.warn({ degradedComponents }, 'Server starting in degraded mode');
    }

    // Create SemanticSearchService with null check for embeddings repository
    const searchService = embeddingsRepository
      ? new SemanticSearchService(embeddingsRepository, { logger })
      : null;

    // Register tools with component registry
    await registerTools(
      server,
      searchService,
      operationsRepository,
      bitbucketClient,
      authManager,
      config,
      logger,
      componentRegistry,
    );

    // Initialize health check manager
    healthCheckManager = new HealthCheckManager(componentRegistry, logger, {
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
    });

    // Register health checks for components
    if (db) {
      healthCheckManager.registerHealthCheck('EmbeddingsRepository', async () => {
        try {
          // Simple query to check database connectivity
          if (db) {
            db.prepare('SELECT 1').get();
            return { status: HealthStatus.HEALTHY };
          }
          return { status: HealthStatus.UNHEALTHY, message: 'Database not initialized' };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: error instanceof Error ? error.message : 'Database check failed',
          };
        }
      });
    }

    // Start health check manager
    await healthCheckManager.start();

    // Register shutdown hooks AFTER all initialization
    shutdownHandler.registerHook(async () => {
      logger.info('Stopping health check manager');
      if (healthCheckManager) {
        healthCheckManager.stop();
      }
    });

    shutdownHandler.registerHook(async () => {
      logger.info('Shutting down MCP server');
      if (server) {
        await server.shutdown('graceful_shutdown');
      }
    });

    // Start the server LAST after all handlers are registered
    await server.start();

    logger.info(
      {
        event: 'app.started',
        version: packageInfo.version,
        capabilities: LOGGING_CAPABILITIES,
        tools: embeddingsRepository
          ? ['search_ids', 'get_id', 'call_id']
          : ['get_id', 'call_id'],
        systemHealth: systemHealth.overallStatus,
      },
      'MCP server ready',
    );
  } catch (error) {
    const logger = Logger.getInstance();
    const normalized = error instanceof Error ? error : new Error(String(error));
    const context = {
      event: 'app.startup_error',
      error: { message: normalized.message, name: normalized.name, stack: normalized.stack },
    } as const;

    if (server) {
      server.handleError(normalized, context);
    } else {
      logger.error(context, normalized.message);
    }

    // Stop health check manager if started
    if (healthCheckManager) {
      healthCheckManager.stop();
    }

    // Close database if opened
    if (db) {
      try {
        db.close();
      } catch (dbError) {
        logger.error({ error: dbError }, 'Error closing database during cleanup');
      }
    }

    process.exit(1);
  }
}

const isPrimaryModule = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isPrimaryModule) {
  void main();
}
