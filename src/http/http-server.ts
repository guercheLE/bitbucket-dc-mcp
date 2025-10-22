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

import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Logger as PinoLogger } from 'pino';
import {
  AuthMode,
  type HttpRequestContext,
  type HttpServerConfig,
  type IAuthExtractor,
  type IHttpRequestHandler,
  type ILocalhostDetector,
} from './types.js';
import { HttpMetrics } from './metrics.js';
import { Tracing } from '../core/tracing.js';

/**
 * HTTP MCP Server
 *
 * @remarks
 * Main HTTP server implementation for MCP protocol over HTTP.
 * Single Responsibility: Only responsible for HTTP server lifecycle and routing.
 * Dependency Inversion: Depends on abstractions (interfaces).
 * Open/Closed: Can be extended with new handlers without modification.
 *
 * Features:
 * - Automatic localhost detection (relaxed vs strict auth)
 * - CORS support (optional)
 * - Request timeout handling
 * - Graceful shutdown
 * - Structured logging
 *
 * @example
 * ```typescript
 * const httpServer = new HttpServer(
 *   { host: '127.0.0.1', port: 3000 },
 *   localhostDetector,
 *   authExtractor,
 *   requestHandler,
 *   logger
 * );
 *
 * await httpServer.start();
 * // Server listening on http://127.0.0.1:3000
 *
 * await httpServer.stop();
 * // Server stopped gracefully
 * ```
 */
export class HttpServer {
  private server: Server | undefined;
  private readonly authMode: AuthMode;
  private readonly maxBodySize: number;
  private readonly timeout: number;
  private readonly metrics: HttpMetrics | undefined;
  private readonly tracing: Tracing | undefined;

  constructor(
    private readonly config: HttpServerConfig,
    private readonly localhostDetector: ILocalhostDetector,
    private readonly authExtractor: IAuthExtractor,
    private readonly requestHandler: IHttpRequestHandler,
    private readonly logger: PinoLogger,
  ) {
    // Determine auth mode based on host binding
    this.authMode = this.localhostDetector.isLocalhostOnly(config.host)
      ? AuthMode.LOCALHOST
      : AuthMode.NETWORK;

    this.maxBodySize = config.maxBodySize ?? 1024 * 1024; // 1MB default
    this.timeout = config.timeout ?? 30000; // 30s default

    // Initialize metrics if enabled
    if (config.metrics?.enabled) {
      const metricsConfig = {
        enabled: true,
        port: config.metrics.port ?? config.port + 1,
        host: config.metrics.host ?? config.host,
        endpoint: config.metrics.endpoint,
      };
      this.metrics = new HttpMetrics(metricsConfig, logger);
    }

    // Initialize tracing if enabled
    if (config.tracing?.enabled) {
      const tracingConfig = {
        enabled: true,
        serviceName: config.tracing.serviceName ?? 'bitbucket-dc-mcp',
        serviceVersion: config.tracing.serviceVersion,
        jaegerEndpoint: config.tracing.jaegerEndpoint,
        consoleExporter: config.tracing.consoleExporter,
      };
      this.tracing = new Tracing(tracingConfig, logger);
    }

    this.logger.info(
      {
        event: 'http.server_created',
        host: config.host,
        port: config.port,
        authMode: this.authMode,
        cors: config.cors ?? false,
        metricsEnabled: config.metrics?.enabled ?? false,
        tracingEnabled: config.tracing?.enabled ?? false,
      },
      `HTTP server created in ${this.authMode.toUpperCase()} mode`,
    );
  }

  /**
   * Start the HTTP server
   *
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    if (this.server) {
      this.logger.warn({ event: 'http.already_started' }, 'HTTP server already started');
      return;
    }

    // Start tracing first if enabled
    if (this.tracing) {
      await this.tracing.start();
    }

    // Start metrics server if enabled
    if (this.metrics) {
      await this.metrics.start();
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        void this.handleRequest(req, res);
      });

      this.server.on('error', (error) => {
        this.logger.error({ event: 'http.server_error', error: error.message }, 'Server error');
        reject(error);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info(
          {
            event: 'http.server_started',
            host: this.config.host,
            port: this.config.port,
            authMode: this.authMode,
            url: `http://${this.config.host}:${this.config.port}`,
          },
          `HTTP MCP server listening on http://${this.config.host}:${this.config.port}`,
        );
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server gracefully
   *
   * @returns Promise that resolves when server has closed
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close(async (error) => {
        if (error) {
          this.logger.error(
            { event: 'http.server_stop_error', error: error.message },
            'Error stopping server',
          );
          reject(error);
        } else {
          // Stop metrics server if enabled
          if (this.metrics) {
            await this.metrics.stop();
          }

          // Stop tracing if enabled
          if (this.tracing) {
            await this.tracing.stop();
          }

          this.logger.info({ event: 'http.server_stopped' }, 'HTTP server stopped');
          this.server = undefined;
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestId = randomUUID();
    const clientInfo = this.getClientInfo(req);
    const startTime = Date.now();

    // Track active requests
    this.metrics?.incrementActiveRequests();

    // Log client info in NETWORK mode for security/audit purposes
    const logContext: Record<string, unknown> = {
      event: 'http.request_received',
      requestId,
      method: req.method,
      url: req.url,
    };

    if (this.authMode === AuthMode.NETWORK) {
      logContext.clientIp = clientInfo.ip;
      if (clientInfo.hostname) {
        logContext.clientHostname = clientInfo.hostname;
      }
      logContext.userAgent = req.headers['user-agent'];
    }

    this.logger.debug(logContext, 'Received HTTP request');

    // Set timeout
    req.setTimeout(this.timeout, () => {
      this.logger.warn({ event: 'http.request_timeout', requestId }, 'Request timeout');
      this.sendError(res, 408, 'Request timeout', requestId);
      this.metrics?.decrementActiveRequests();
    });

    let status = 200;
    let requestSize = 0;
    let responseSize = 0;

    try {
      // Handle CORS preflight
      if (this.config.cors && req.method === 'OPTIONS') {
        this.handleCors(res);
        res.writeHead(204);
        res.end();
        status = 204;
        return;
      }

      // Only accept POST requests
      if (req.method !== 'POST') {
        status = 405;
        this.sendError(res, status, 'Method not allowed', requestId);
        return;
      }

      // Extract authentication
      const auth = this.authExtractor.extract(req, this.authMode, clientInfo);

      // Read request body
      const body = await this.readBody(req);
      requestSize = JSON.stringify(body).length;

      // Create request context
      const context: HttpRequestContext = {
        request: req,
        auth,
        body,
        requestId,
        clientInfo: this.authMode === AuthMode.NETWORK ? clientInfo : undefined,
      };

      // Handle request
      const result = await this.requestHandler.handle(context);

      // Send response
      responseSize = JSON.stringify(result).length;
      this.sendSuccess(res, result, requestId);
    } catch (error) {
      status = 500;
      this.logger.error(
        {
          event: 'http.request_error',
          requestId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Error handling request',
      );

      const message = error instanceof Error ? error.message : 'Internal server error';
      this.sendError(res, status, message, requestId);
    } finally {
      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics?.recordRequest(
        req.method ?? 'UNKNOWN',
        req.url ?? '/',
        status,
        duration,
        requestSize,
        responseSize,
      );
      this.metrics?.decrementActiveRequests();
    }
  }

  /**
   * Read request body
   */
  private async readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;

      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > this.maxBodySize) {
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8');
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Send successful response
   */
  private sendSuccess(res: ServerResponse, data: unknown, requestId: string): void {
    if (this.config.cors) {
      this.handleCors(res);
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    });

    res.end(JSON.stringify(data));

    this.logger.debug(
      {
        event: 'http.response_sent',
        requestId,
        status: 200,
      },
      'Response sent successfully',
    );
  }

  /**
   * Send error response
   */
  private sendError(res: ServerResponse, status: number, message: string, requestId: string): void {
    if (this.config.cors) {
      this.handleCors(res);
    }

    res.writeHead(status, {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    });

    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message,
        },
      }),
    );
  }

  /**
   * Handle CORS headers
   */
  private handleCors(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bitbucket-Url');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  /**
   * Get client IP and hostname information
   *
   * @remarks
   * Extracts client IP from various headers and socket.
   * Priority order:
   * 1. X-Forwarded-For (proxy)
   * 2. X-Real-IP (nginx)
   * 3. Socket remote address
   *
   * In NETWORK mode, this information is logged for security/audit purposes.
   */
  private getClientInfo(req: IncomingMessage): { ip: string; hostname?: string } {
    // Try to get real IP from proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];

    let ip: string;

    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      ip = Array.isArray(realIp) ? realIp[0] : realIp;
    } else {
      ip = req.socket.remoteAddress || 'unknown';
    }

    // Clean up IPv6 localhost notation
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }

    // Note: Reverse DNS lookup (hostname resolution) is intentionally NOT performed
    // as it can be slow and blocking. If hostname is needed, it should be done
    // asynchronously in a background task.

    return { ip };
  }
}
