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

/**
 * HTTP Server Module
 *
 * @remarks
 * Provides HTTP server implementation for MCP protocol over HTTP.
 * Supports two modes:
 * - LOCALHOST: Relaxed authentication, headers optional
 * - NETWORK: Strict authentication, Basic/PAT only
 *
 * @example
 * ```typescript
 * import { startHttpServer } from './http/index.js';
 *
 * await startHttpServer({
 *   host: '127.0.0.1',
 *   port: 3000,
 *   cors: true
 * });
 * ```
 */

export { AuthExtractor } from './auth-extractor.js';
export { HttpAuthManager } from './http-auth-manager.js';
export { HttpRequestHandler } from './http-request-handler.js';
export { HttpServer } from './http-server.js';
export { LocalhostDetector } from './localhost-detector.js';
export { HttpMetrics, type MetricsConfig } from './metrics.js';
export * from './types.js';

import type { Logger as PinoLogger } from 'pino';
import { AuthManager } from '../auth/auth-manager.js';
import type { AppConfig } from '../core/config-manager.js';
import { ConfigManager } from '../core/config-manager.js';
import { CredentialStorage } from '../core/credential-storage.js';
import { Logger } from '../core/logger.js';
import { RateLimiter } from '../core/rate-limiter.js';
import { JsonOperationsRepository } from '../data/operations-repository.js';
import { BitbucketClientService } from '../services/bitbucket-client.js';
import { AuthExtractor } from './auth-extractor.js';
import { HttpAuthManager } from './http-auth-manager.js';
import { HttpRequestHandler } from './http-request-handler.js';
import { HttpServer } from './http-server.js';
import { LocalhostDetector } from './localhost-detector.js';
import type { HttpServerConfig } from './types.js';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Start HTTP MCP Server
 *
 * @param serverConfig - HTTP server configuration
 * @param config - Application configuration (optional, will load if not provided)
 * @returns Promise that resolves when server is started
 *
 * @example
 * ```typescript
 * await startHttpServer({
 *   host: '127.0.0.1',
 *   port: 3000,
 *   cors: true
 * });
 * ```
 */
export async function startHttpServer(
  serverConfig: HttpServerConfig,
  config?: AppConfig,
): Promise<HttpServer> {
  const appConfig = config ?? (await ConfigManager.load());

  Logger.configure({ level: appConfig.logLevel, pretty: appConfig.logPretty });
  const logger: PinoLogger = Logger.getInstance();

  logger.info(
    {
      event: 'http.server_starting',
      host: serverConfig.host,
      port: serverConfig.port,
    },
    'Starting HTTP MCP server',
  );

  // Initialize dependencies
  const credentialStorage = new CredentialStorage(logger, undefined, appConfig.forceFileStorage);
  const authManager = new AuthManager(credentialStorage, logger, appConfig);

  // Get package root for operations repository
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageRoot = path.join(__dirname, '../..');
  const operationsFilePath = path.join(packageRoot, 'data', 'operations.json');
  const operationsRepository = new JsonOperationsRepository(operationsFilePath, logger);

  const rateLimiter = new RateLimiter({
    capacity: appConfig.rateLimit,
    refillRate: appConfig.rateLimit,
  });

  const bitbucketClient = new BitbucketClientService(
    authManager,
    rateLimiter,
    logger,
    appConfig,
    operationsRepository,
  );

  // Create HTTP server components
  const localhostDetector = new LocalhostDetector();
  const authExtractor = new AuthExtractor(logger);
  const httpAuthManager = new HttpAuthManager(authManager, appConfig, logger);
  const requestHandler = new HttpRequestHandler(httpAuthManager, bitbucketClient, logger);

  // Create and start HTTP server
  const httpServer = new HttpServer(
    serverConfig,
    localhostDetector,
    authExtractor,
    requestHandler,
    logger,
  );

  await httpServer.start();

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ event: 'http.shutdown_signal', signal }, 'Received shutdown signal');
    await httpServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGUSR2', () => void shutdown('SIGUSR2'));

  return httpServer;
}

