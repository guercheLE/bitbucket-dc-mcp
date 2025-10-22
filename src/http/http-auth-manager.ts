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
import type { AuthManager } from '../auth/auth-manager.js';
import type { Credentials } from '../auth/auth-strategy.js';
import type { AppConfig } from '../core/config-manager.js';
import { AuthMode, type HttpRequestContext, type IHttpAuthManager } from './types.js';

/**
 * HTTP Authentication Manager
 *
 * @remarks
 * Manages authentication for HTTP server mode.
 * Dependency Inversion: Depends on AuthManager abstraction.
 * Single Responsibility: Only responsible for HTTP auth logic.
 *
 * Behavior:
 * - LOCALHOST mode: Uses credentials from request OR falls back to stored credentials
 * - NETWORK mode: Uses ONLY credentials from request (Basic/PAT), server URL from config
 *
 * @example
 * ```typescript
 * const httpAuthManager = new HttpAuthManager(
 *   authManager,
 *   config,
 *   logger
 * );
 *
 * const credentials = await httpAuthManager.authenticate(context);
 * // Returns validated credentials ready for use
 * ```
 */
export class HttpAuthManager implements IHttpAuthManager {
  constructor(
    private readonly authManager: AuthManager,
    private readonly config: AppConfig,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Authenticate an HTTP request based on mode
   *
   * @param context - HTTP request context
   * @returns Validated credentials
   * @throws {Error} If authentication fails
   */
  async authenticate(context: HttpRequestContext): Promise<Credentials> {
    const { auth, clientInfo } = context;

    const logContext: Record<string, unknown> = {
      event: 'http.authenticate',
      mode: auth.mode,
      hasCredentials: !!auth.credentials,
      requestId: context.requestId,
    };

    // Add client info in NETWORK mode for security/audit logging
    if (auth.mode === AuthMode.NETWORK && clientInfo) {
      logContext.clientIp = clientInfo.ip;
      if (clientInfo.hostname) {
        logContext.clientHostname = clientInfo.hostname;
      }
    }

    this.logger.debug(logContext, 'Authenticating HTTP request');

    if (auth.mode === AuthMode.LOCALHOST) {
      return await this.authenticateLocalhost(context);
    } else {
      return await this.authenticateNetwork(context);
    }
  }

  /**
   * Authenticate in LOCALHOST mode
   *
   * @remarks
   * In LOCALHOST mode, we have two options:
   * 1. Use credentials from request headers (if provided)
   * 2. Fall back to stored credentials (from AuthManager)
   *
   * Bitbucket URL can come from:
   * 1. X-Bitbucket-Url header
   * 2. Server config (default)
   */
  private async authenticateLocalhost(context: HttpRequestContext): Promise<Credentials> {
    const { auth } = context;

    // If credentials provided in request, use them
    if (auth.credentials) {
      const bitbucketUrl = auth.bitbucketUrl || this.config.bitbucketUrl;

      const credentials: Credentials = {
        ...auth.credentials,
        bitbucket_url: bitbucketUrl,
      };

      this.logger.info(
        {
          event: 'http.auth_from_request',
          authMethod: credentials.auth_method,
          requestId: context.requestId,
        },
        'Using credentials from request (LOCALHOST mode)',
      );

      return credentials;
    }

    // Fall back to stored credentials
    this.logger.info(
      {
        event: 'http.auth_from_storage',
        requestId: context.requestId,
      },
      'Using stored credentials (LOCALHOST mode)',
    );

    return await this.authManager.getCredentials();
  }

  /**
   * Authenticate in NETWORK mode
   *
   * @remarks
   * In NETWORK mode:
   * - Credentials MUST be provided in Authorization header
   * - Only Basic Auth or PAT allowed
   * - Bitbucket URL comes from server config (NOT from headers)
   *
   * @throws {Error} If credentials are missing (should not happen after extraction)
   */
  private async authenticateNetwork(context: HttpRequestContext): Promise<Credentials> {
    const { auth, clientInfo } = context;

    const logContext: Record<string, unknown> = {
      requestId: context.requestId,
    };

    if (clientInfo) {
      logContext.clientIp = clientInfo.ip;
      if (clientInfo.hostname) {
        logContext.clientHostname = clientInfo.hostname;
      }
    }

    if (!auth.credentials) {
      // This should not happen after AuthExtractor validation
      this.logger.error(
        {
          ...logContext,
          event: 'http.auth_missing_network',
        },
        'Missing credentials in NETWORK mode (should not happen)',
      );
      throw new Error('Authentication required in NETWORK mode');
    }

    // Validate auth method
    if (auth.credentials.auth_method !== 'basic' && auth.credentials.auth_method !== 'pat') {
      this.logger.error(
        {
          ...logContext,
          event: 'http.auth_invalid_method',
          authMethod: auth.credentials.auth_method,
        },
        'Invalid auth method for NETWORK mode',
      );
      throw new Error('Only Basic Auth and PAT are allowed in NETWORK mode');
    }

    // Use bitbucket_url from server config (NEVER from headers)
    const credentials: Credentials = {
      ...auth.credentials,
      bitbucket_url: this.config.bitbucketUrl,
    };

    this.logger.info(
      {
        ...logContext,
        event: 'http.auth_network_mode',
        authMethod: credentials.auth_method,
        username: credentials.username, // Log username for audit (not password!)
      },
      'Using credentials from request (NETWORK mode)',
    );

    return credentials;
  }
}

