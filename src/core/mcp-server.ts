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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type {
  Implementation,
  LoggingMessageNotification,
  ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import type { Readable, Writable } from 'node:stream';
import type { Logger as PinoLogger } from 'pino';
import { Logger } from './logger.js';

const DEFAULT_SERVER_NAME = 'bitbucket-dc-mcp-server';
const DEFAULT_SHUTDOWN_TIMEOUT = 30_000;

/**
 * Configuration parameters required to bootstrap the MCP server.
 */
export interface McpServerConfig {
  /**
   * Optional human-readable server name. Defaults to `bitbucket-dc-mcp-server`.
   */
  readonly name?: string;
  /**
   * Semantic version of the server implementation (e.g. package version).
   */
  readonly version: string;
  /**
   * Optional instructions presented to MCP clients after initialization.
   */
  readonly instructions?: string;
  /**
   * Capabilities to advertise during the MCP handshake.
   */
  readonly capabilities?: ServerCapabilities;
  /**
   * Maximum time (in milliseconds) to wait for graceful shutdown.
   */
  readonly shutdownTimeoutMs?: number;
}

/**
 * Runtime dependencies that can be overridden for testing.
 */
export interface McpServerDependencies {
  /**
   * Logger instance. Defaults to the shared application logger.
   */
  readonly logger?: PinoLogger;
  /**
   * Exit function invoked after shutdown completes or times out. Defaults to `process.exit`.
   */
  readonly exit?: (code: number) => void;
  /**
   * Optional stdin stream used by the stdio transport, primarily for testing.
   */
  readonly stdin?: Readable;
  /**
   * Optional stdout stream used by the stdio transport, primarily for testing.
   */
  readonly stdout?: Writable;
}

/**
 * Thin wrapper around the MCP SDK {@link Server} that wires stdio transport, lifecycle management,
 * and structured logging for the Bitbucket Data Center MCP server.
 *
 * @example
 * ```ts
 * const server = new McpServer({ version: '1.0.0' });
 * await server.initialize();
 * await server.start();
 * // ... later
 * await server.shutdown();
 * ```
 */
export class McpServer {
  private readonly logger: PinoLogger;
  private readonly exit: (code: number) => void;
  private readonly shutdownTimeoutMs: number;
  private readonly serverInfo: Implementation;
  private readonly capabilities?: ServerCapabilities;
  private readonly instructions?: string;
  private readonly stdin?: Readable;
  private readonly stdout?: Writable;

  private transport: StdioServerTransport | undefined;
  private server: Server | undefined;

  private initialized = false;
  private ready = false;
  private startPromise: Promise<void> | undefined;
  private shutdownPromise: Promise<void> | undefined;

  /**
   * Creates a new MCP server instance using the provided configuration and optional dependencies.
   *
   * @param config Configuration describing server metadata, capabilities, and shutdown behaviour.
   * @param dependencies Optional runtime dependencies for logging, transport, and process management.
   */
  constructor(config: McpServerConfig, dependencies: McpServerDependencies = {}) {
    this.logger = dependencies.logger ?? Logger.getInstance();
    this.exit =
      dependencies.exit ??
      ((code: number): void => {
        process.exit(code);
      });
    this.shutdownTimeoutMs = config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT;

    this.serverInfo = {
      name: config.name ?? DEFAULT_SERVER_NAME,
      version: config.version,
    } satisfies Implementation;

    this.capabilities = config.capabilities;
    this.instructions = config.instructions;
    this.stdin = dependencies.stdin;
    this.stdout = dependencies.stdout;
  }

  /**
   * Indicates whether the server has completed the MCP initialization handshake.
   */
  public get isReady(): boolean {
    return this.ready;
  }

  /**
   * Returns the underlying MCP SDK Server instance for tool registration.
   * Must be called after initialize() to ensure the server is ready.
   *
   * @returns The MCP SDK Server instance
   * @throws {Error} When called before initialize()
   */
  public getServer(): Server {
    if (!this.server) {
      throw new Error('Server not initialized. Call initialize() first.');
    }
    return this.server;
  }

  /**
   * Prepares the MCP SDK server and stdio transport. Idempotent.
   *
   * @returns A promise that resolves once the server and transport are ready for connection.
   * @throws {Error} When building the server or transport fails unexpectedly.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const traceId = McpServer.createCorrelationId();
    this.logger.debug(
      { event: 'mcp.server.initialize', traceId, serverInfo: this.serverInfo },
      'Preparing MCP server instance',
    );

    this.server = this.buildServer();
    this.transport = new StdioServerTransport(this.stdin, this.stdout);
    this.initialized = true;
  }

  /**
   * Starts the MCP server on stdio and waits for the initialization handshake.
   *
   * @returns A promise that resolves when the server has connected to the transport.
   * @throws Re-throws any transport or connection errors surfaced by the MCP SDK.
   */
  public async start(): Promise<void> {
    if (!this.initialized) await this.initialize();
    if (this.startPromise) return this.startPromise;

    const traceId = McpServer.createCorrelationId();
    this.logger.info({ event: 'mcp.server.start', traceId }, 'Starting MCP server');

    const server = this.ensureServer();
    const transport = this.ensureTransport();

    this.startPromise = server
      .connect(transport)
      .then((): void => {
        this.logger.info(
          {
            event: 'mcp.server.transport_connected',
            traceId,
            transport: 'stdio',
            instructions: this.instructions,
          },
          'Transport connected, awaiting client initialization',
        );
      })
      .catch((error: unknown) => {
        this.handleError(error, { event: 'mcp.server.connect_error', traceId });
        throw error;
      });

    return this.startPromise;
  }

  /**
   * Gracefully shuts down the MCP server, respecting the configured timeout.
   *
   * @param reason Optional shutdown reason included in log events.
   * @returns A promise that resolves once the shutdown process completes.
   */
  public async shutdown(reason?: string): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;

    const traceId = McpServer.createCorrelationId();
    this.logger.info({ event: 'mcp.server.shutdown', traceId, reason }, 'Shutting down MCP server');

    const server = this.server;
    const transport = this.transport;

    this.shutdownPromise = new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        const timeoutError = new Error('Graceful shutdown timed out');
        this.handleError(timeoutError, { event: 'mcp.server.shutdown_timeout', traceId });
        this.exit(1);
        resolve();
      }, this.shutdownTimeoutMs);

      const complete = (): void => {
        clearTimeout(timeoutId);
        this.ready = false;
        this.initialized = false;
        this.logger.info(
          { event: 'mcp.server.shutdown_complete', traceId },
          'MCP server shutdown complete',
        );
        this.exit(0);
        resolve();
      };

      (async (): Promise<void> => {
        try {
          if (server) {
            await server.close();
          }
          if (transport) {
            await transport.close();
          }
        } catch (error) {
          this.handleError(error, { event: 'mcp.server.shutdown_error', traceId });
        } finally {
          complete();
        }
      })().catch((error: unknown) => {
        this.handleError(error, { event: 'mcp.server.shutdown_unhandled', traceId });
        complete();
      });
    });

    return this.shutdownPromise;
  }

  /**
   * Sends a logging notification to connected clients when supported.
   *
   * @param params Notification payload forwarded to connected MCP clients.
   * @param sessionId Optional session identifier returned by the transport.
   * @returns A promise that resolves when the notification has been dispatched.
   */
  public async sendLog(
    params: LoggingMessageNotification['params'],
    sessionId?: string,
  ): Promise<void> {
    const server = this.server;
    if (!server) {
      this.logger.warn(
        {
          event: 'mcp.server.send_log_skipped',
          reason: 'not_initialized',
          traceId: McpServer.createCorrelationId(),
        },
        'Attempted to send log before server initialization',
      );
      return;
    }

    const traceId = McpServer.createCorrelationId();

    try {
      await server.sendLoggingMessage(params, sessionId);
    } catch (error) {
      this.handleError(error, { event: 'mcp.server.send_log_error', traceId });
    }
  }

  /**
   * Normalises unknown errors and emits structured logs.
   *
   * @param error Unknown error or reason captured by runtime handlers.
   * @param context Additional context injected into the structured log payload.
   * @returns Nothing. The method logs immediately using the configured logger.
   */
  public handleError(error: unknown, context: Record<string, unknown> = {}): void {
    const normalized = error instanceof Error ? error : new Error(String(error));
    const traceId = (context.traceId as string | undefined) ?? McpServer.createCorrelationId();
    this.logger.error(
      {
        event: 'mcp.server.error',
        traceId,
        ...context,
        error: { message: normalized.message, name: normalized.name, stack: normalized.stack },
      },
      normalized.message,
    );
  }

  /**
   * Creates a new MCP SDK {@link Server} instance with lifecycle hooks wired to structured logs.
   *
   * @returns Configured server instance ready for transport connection.
   */
  private buildServer(): Server {
    const server = new Server(this.serverInfo, {
      capabilities: this.capabilities,
      instructions: this.instructions,
    });

    server.oninitialized = (): void => {
      this.ready = true;
      const traceId = McpServer.createCorrelationId();
      this.logger.info(
        {
          event: 'mcp.server.initialized',
          server: this.serverInfo,
          capabilities: this.capabilities,
          traceId,
        },
        'Client completed MCP initialization handshake',
      );
    };

    server.onclose = (): void => {
      this.ready = false;
      this.logger.warn(
        { event: 'mcp.server.closed', traceId: McpServer.createCorrelationId() },
        'MCP server connection closed',
      );
    };

    server.onerror = (err: Error): void => {
      this.handleError(err, {
        event: 'mcp.server.protocol_error',
        traceId: McpServer.createCorrelationId(),
      });
    };

    return server;
  }

  /**
   * Returns the cached MCP {@link Server} instance, building one if necessary.
   *
   * @returns Existing or lazily created MCP server instance.
   */
  private ensureServer(): Server {
    if (!this.server) {
      this.server = this.buildServer();
    }
    return this.server;
  }

  /**
   * Returns the cached stdio transport, creating a new instance when missing.
   *
   * @returns Existing or lazily created stdio transport instance.
   */
  private ensureTransport(): StdioServerTransport {
    if (!this.transport) {
      this.transport = new StdioServerTransport(this.stdin, this.stdout);
    }
    return this.transport;
  }

  /**
   * Generates a unique correlation identifier for tracing log events across async flows.
   *
   * @returns A RFC4122 version 4 identifier.
   */
  private static createCorrelationId(): string {
    return randomUUID();
  }
}
