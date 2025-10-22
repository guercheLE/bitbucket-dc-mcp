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
import type { Logger as PinoLogger } from 'pino';
import { AuthMode, type ClientInfo, type HttpAuthContext, type IAuthExtractor } from './types.js';

/**
 * HTTP Authentication Extractor
 *
 * @remarks
 * Extracts authentication information from HTTP request headers.
 * Single Responsibility: Only responsible for parsing HTTP auth headers.
 *
 * Behavior by mode:
 * - LOCALHOST: Headers are optional, can use X-Bitbucket-* headers for config
 * - NETWORK: Only Authorization header (Basic or Bearer), no config headers
 *
 * @example
 * ```typescript
 * const extractor = new AuthExtractor(logger);
 *
 * // LOCALHOST mode - optional auth
 * const localhostContext = extractor.extract(request, AuthMode.LOCALHOST);
 *
 * // NETWORK mode - required auth (Basic or PAT only)
 * const networkContext = extractor.extract(request, AuthMode.NETWORK);
 * ```
 */
export class AuthExtractor implements IAuthExtractor {
  constructor(private readonly logger: PinoLogger) {}

  /**
   * Extract authentication context from HTTP request
   *
   * @param request - Incoming HTTP request
   * @param mode - Authentication mode (LOCALHOST or NETWORK)
   * @param clientInfo - Client information (for logging in NETWORK mode)
   * @returns Authentication context with extracted credentials
   * @throws {Error} If authentication is invalid for the given mode
   */
  extract(request: IncomingMessage, mode: AuthMode, clientInfo?: ClientInfo): HttpAuthContext {
    const logContext: Record<string, unknown> = {
      event: 'http.auth_extract',
      mode,
      hasAuthHeader: !!request.headers.authorization,
    };

    // Add client info in NETWORK mode for security/audit logging
    if (mode === AuthMode.NETWORK && clientInfo) {
      logContext.clientIp = clientInfo.ip;
      if (clientInfo.hostname) {
        logContext.clientHostname = clientInfo.hostname;
      }
    }

    this.logger.debug(logContext, 'Extracting authentication from HTTP request');

    if (mode === AuthMode.LOCALHOST) {
      return this.extractLocalhostAuth(request);
    } else {
      return this.extractNetworkAuth(request, clientInfo);
    }
  }

  /**
   * Extract authentication for LOCALHOST mode
   *
   * @remarks
   * In LOCALHOST mode:
   * - All headers are optional
   * - Can use X-Bitbucket-Url for server URL
   * - Authorization header can be Basic or Bearer (PAT)
   * - If no auth provided, will use stored credentials
   */
  private extractLocalhostAuth(request: IncomingMessage): HttpAuthContext {
    const authHeader = request.headers.authorization;
    const bitbucketUrl = this.getHeader(request, 'x-bitbucket-url');

    let credentials: Credentials | undefined;
    let authMethod: 'basic' | 'pat' | undefined;

    if (authHeader) {
      const parsed = this.parseAuthorizationHeader(authHeader);
      if (parsed) {
        credentials = parsed.credentials;
        authMethod = parsed.authMethod;
      }
    }

    this.logger.debug(
      {
        event: 'http.auth_extract_localhost',
        hasCredentials: !!credentials,
        authMethod,
        hasBitbucketUrl: !!bitbucketUrl,
      },
      'Extracted LOCALHOST mode authentication',
    );

    return {
      mode: AuthMode.LOCALHOST,
      credentials,
      bitbucketUrl,
      authMethod,
    };
  }

  /**
   * Extract authentication for NETWORK mode
   *
   * @remarks
   * In NETWORK mode:
   * - Authorization header is REQUIRED
   * - Only Basic Auth or Bearer (PAT) allowed
   * - OAuth1/OAuth2 are NOT allowed
   * - No config headers (X-Bitbucket-*) are read
   *
   * @throws {Error} If authorization is missing or invalid
   */
  private extractNetworkAuth(request: IncomingMessage, clientInfo?: ClientInfo): HttpAuthContext {
    const authHeader = request.headers.authorization;

    const logContext: Record<string, unknown> = {
      event: 'http.auth_missing',
      mode: 'network',
    };

    if (clientInfo) {
      logContext.clientIp = clientInfo.ip;
      if (clientInfo.hostname) {
        logContext.clientHostname = clientInfo.hostname;
      }
    }

    if (!authHeader) {
      this.logger.warn(logContext, 'Authorization header missing in NETWORK mode');
      throw new Error(
        'Authentication required: Authorization header must be provided (Basic or Bearer)',
      );
    }

    const parsed = this.parseAuthorizationHeader(authHeader);
    if (!parsed) {
      logContext.event = 'http.auth_invalid';
      this.logger.warn(logContext, 'Invalid Authorization header in NETWORK mode');
      throw new Error(
        'Invalid authentication: Only Basic Auth or Bearer token (PAT) are supported',
      );
    }

    // In NETWORK mode, we don't read bitbucket_url from headers
    // It must come from server configuration
    const successLogContext: Record<string, unknown> = {
      event: 'http.auth_extract_network',
      authMethod: parsed.authMethod,
    };

    if (clientInfo) {
      successLogContext.clientIp = clientInfo.ip;
      if (clientInfo.hostname) {
        successLogContext.clientHostname = clientInfo.hostname;
      }
    }

    this.logger.debug(successLogContext, 'Extracted NETWORK mode authentication');

    return {
      mode: AuthMode.NETWORK,
      credentials: parsed.credentials,
      authMethod: parsed.authMethod,
    };
  }

  /**
   * Parse Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns Parsed credentials and auth method, or undefined if invalid
   */
  private parseAuthorizationHeader(
    authHeader: string,
  ): { credentials: Credentials; authMethod: 'basic' | 'pat' } | undefined {
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return undefined;
    }

    const [scheme, value] = parts;
    const normalizedScheme = scheme.toLowerCase();

    if (normalizedScheme === 'basic') {
      return this.parseBasicAuth(value);
    } else if (normalizedScheme === 'bearer') {
      return this.parseBearerAuth(value);
    }

    return undefined;
  }

  /**
   * Parse Basic Auth credentials
   *
   * @param value - Base64-encoded credentials
   * @returns Parsed credentials with basic auth
   */
  private parseBasicAuth(
    value: string,
  ): { credentials: Credentials; authMethod: 'basic' } | undefined {
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf-8');
      const [username, password] = decoded.split(':', 2);

      if (!username || !password) {
        return undefined;
      }

      return {
        credentials: {
          auth_method: 'basic',
          username,
          password,
          bitbucket_url: '', // Will be filled by HttpAuthManager
        },
        authMethod: 'basic',
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Parse Bearer token (PAT)
   *
   * @param value - Bearer token value
   * @returns Parsed credentials with PAT
   */
  private parseBearerAuth(value: string): { credentials: Credentials; authMethod: 'pat' } {
    return {
      credentials: {
        auth_method: 'pat',
        access_token: value,
        bitbucket_url: '', // Will be filled by HttpAuthManager
      },
      authMethod: 'pat',
    };
  }

  /**
   * Get header value (case-insensitive)
   *
   * @param request - HTTP request
   * @param name - Header name
   * @returns Header value or undefined
   */
  private getHeader(request: IncomingMessage, name: string): string | undefined {
    const value = request.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}

