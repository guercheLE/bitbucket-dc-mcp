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

import type { IncomingMessage } from 'node:http';
import type { Credentials } from '../auth/auth-strategy.js';

/**
 * HTTP Server Configuration
 *
 * @remarks
 * Defines the configuration for the HTTP server mode.
 * Supports listening on localhost only (relaxed auth) or
 * on all interfaces (strict auth - Basic/PAT only).
 */
export interface HttpServerConfig {
  /**
   * Host to bind the server to.
   * - '127.0.0.1' or 'localhost' = localhost only (relaxed)
   * - '0.0.0.0' or specific IP = external access (strict)
   */
  readonly host: string;

  /**
   * Port to listen on
   */
  readonly port: number;

  /**
   * Whether to enable CORS for cross-origin requests
   */
  readonly cors?: boolean;

  /**
   * Maximum request body size in bytes
   */
  readonly maxBodySize?: number;

  /**
   * Request timeout in milliseconds
   */
  readonly timeout?: number;

  /**
   * Metrics configuration
   */
  readonly metrics?: {
    /**
     * Whether to enable metrics collection
     */
    readonly enabled: boolean;

    /**
     * Port for metrics endpoint (defaults to main port + 1)
     */
    readonly port?: number;

    /**
     * Host for metrics endpoint (defaults to main server host)
     */
    readonly host?: string;

    /**
     * Endpoint path for metrics (defaults to '/metrics')
     */
    readonly endpoint?: string;
  };

  /**
   * Tracing configuration
   */
  readonly tracing?: {
    /**
     * Whether to enable distributed tracing
     */
    readonly enabled: boolean;

    /**
     * Service name for traces (defaults to 'bitbucket-dc-mcp')
     */
    readonly serviceName?: string;

    /**
     * Service version
     */
    readonly serviceVersion?: string;

    /**
     * Jaeger endpoint (default: http://localhost:14268/api/traces)
     * Set to 'disabled' to disable Jaeger export
     */
    readonly jaegerEndpoint?: string;

    /**
     * Export to console (useful for development)
     */
    readonly consoleExporter?: boolean;
  };
}

/**
 * Authentication mode based on server binding
 */
export enum AuthMode {
  /**
   * Localhost mode: headers are optional, can come from config
   */
  LOCALHOST = 'localhost',

  /**
   * Network mode: only Basic Auth and PAT allowed, no config from headers
   */
  NETWORK = 'network',
}

/**
 * HTTP Authentication Context
 *
 * @remarks
 * Contains authentication information extracted from HTTP request.
 * In LOCALHOST mode, all fields are optional.
 * In NETWORK mode, credentials must be provided via Basic Auth or Bearer token.
 */
export interface HttpAuthContext {
  /**
   * Authentication mode determined by server binding
   */
  readonly mode: AuthMode;

  /**
   * Extracted credentials (if any)
   * - Basic Auth: username + password
   * - Bearer: access_token (PAT)
   */
  readonly credentials?: Credentials;

  /**
   * Bitbucket URL from header (only in LOCALHOST mode)
   */
  readonly bitbucketUrl?: string;

  /**
   * Auth method from header (only in LOCALHOST mode)
   */
  readonly authMethod?: 'basic' | 'pat';
}

/**
 * Client Information
 *
 * @remarks
 * Contains information about the HTTP client.
 * Used for security and audit logging in NETWORK mode.
 */
export interface ClientInfo {
  /**
   * Client IP address
   */
  readonly ip: string;

  /**
   * Client hostname (if available, reverse DNS)
   */
  readonly hostname?: string;
}

/**
 * HTTP Request Context
 *
 * @remarks
 * Complete context for processing an HTTP MCP request.
 */
export interface HttpRequestContext {
  /**
   * HTTP request object
   */
  readonly request: IncomingMessage;

  /**
   * Authentication context extracted from request
   */
  readonly auth: HttpAuthContext;

  /**
   * Request body (parsed JSON)
   */
  readonly body: unknown;

  /**
   * Request ID for tracing
   */
  readonly requestId: string;

  /**
   * Client information (only in NETWORK mode)
   */
  readonly clientInfo?: ClientInfo;
}

/**
 * Interface for detecting if server is localhost-only
 *
 * @remarks
 * Single Responsibility: Only responsible for determining
 * if the server binding is localhost-only or network-accessible.
 */
export interface ILocalhostDetector {
  /**
   * Check if the given host binding is localhost-only
   *
   * @param host - Host address to check
   * @returns true if localhost-only, false if network-accessible
   */
  isLocalhostOnly(host: string): boolean;
}

/**
 * Interface for extracting authentication from HTTP requests
 *
 * @remarks
 * Single Responsibility: Only responsible for extracting
 * authentication information from HTTP request headers and body.
 * Follows Interface Segregation Principle.
 */
export interface IAuthExtractor {
  /**
   * Extract authentication context from HTTP request
   *
   * @param request - Incoming HTTP request
   * @param mode - Authentication mode (LOCALHOST or NETWORK)
   * @param clientInfo - Client information (for logging in NETWORK mode)
   * @returns Authentication context with extracted credentials
   * @throws {Error} If authentication is invalid for the given mode
   */
  extract(request: IncomingMessage, mode: AuthMode, clientInfo?: ClientInfo): HttpAuthContext;
}

/**
 * Interface for handling HTTP authentication
 *
 * @remarks
 * Single Responsibility: Manages authentication for HTTP mode.
 * Dependency Inversion: Depends on abstraction (IAuthExtractor).
 */
export interface IHttpAuthManager {
  /**
   * Authenticate an HTTP request based on mode
   *
   * @param context - HTTP request context
   * @returns Validated credentials
   * @throws {Error} If authentication fails
   */
  authenticate(context: HttpRequestContext): Promise<Credentials>;
}

/**
 * Interface for handling HTTP requests to MCP
 *
 * @remarks
 * Single Responsibility: Only responsible for processing
 * HTTP requests and converting them to MCP protocol.
 */
export interface IHttpRequestHandler {
  /**
   * Handle an HTTP request containing MCP protocol data
   *
   * @param context - Complete request context
   * @returns Response data to send back to client
   */
  handle(context: HttpRequestContext): Promise<unknown>;
}

