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
import { Logger } from '../../core/logger.js';
import type { AuthConfig, AuthStrategy, Credentials } from '../auth-strategy.js';
import { InvalidCredentialsError } from '../errors.js';

/**
 * Basic Authentication configuration interface
 */
interface BasicAuthConfig {
  /** Username for Basic authentication */
  username: string;

  /** Password for Basic authentication */
  password: string;
}

/**
 * Extended AuthConfig with Basic Auth-specific configuration
 */
interface BasicAuthAuthConfig extends AuthConfig {
  basic?: BasicAuthConfig;
}

/**
 * Basic HTTP Authentication Strategy
 *
 * @remarks
 * **⚠️ SECURITY WARNING:** Basic Authentication is inherently insecure over HTTP.
 * Credentials are base64-encoded (NOT encrypted) and sent with EVERY request.
 *
 * **Critical Security Requirements:**
 * - **HTTPS is MANDATORY** - Never use Basic Auth over HTTP in production
 * - Credentials are exposed in every API request
 * - No token expiration or refresh mechanism
 * - Password cannot be revoked without changing it
 *
 * **Recommended alternatives for production:**
 * - OAuth 2.0 with PKCE (Bitbucket DC 8.0+)
 * - Personal Access Tokens (Bitbucket DC 8.14+)
 * - OAuth 1.0a (legacy Bitbucket DC < 8.0)
 *
 * **When to use Basic Auth:**
 * - Local development and testing ONLY
 * - Temporary testing with HTTPS-enabled Bitbucket instances
 * - NOT recommended for production environments
 *
 * **How Basic Auth works:**
 * 1. Username and password are concatenated with colon: `username:password`
 * 2. Result is base64-encoded: `base64(username:password)`
 * 3. Sent in Authorization header: `Authorization: Basic {base64EncodedCredentials}`
 * 4. Credentials sent with EVERY request (no token caching)
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication|HTTP Authentication}
 * @see {@link https://tools.ietf.org/html/rfc7617|RFC 7617 - Basic HTTP Authentication}
 *
 * @example
 * ```typescript
 * const strategy = new BasicAuthStrategy(logger);
 * const credentials = await strategy.authenticate({
 *   bitbucket_url: 'https://bitbucket.example.com',
 *   auth_method: 'basic',
 *   basic: {
 *     username: 'admin',
 *     password: 'secure-password'
 *   }
 * });
 * ```
 */
export class BasicAuthStrategy implements AuthStrategy {
  private logger: PinoLogger;

  /**
   * Creates BasicAuthStrategy instance
   *
   * @param logger - Pino logger instance for structured logging
   */
  constructor(logger?: PinoLogger) {
    this.logger = logger ?? Logger.getInstance();

    // Log security warning
    this.logger.warn({
      msg: 'Basic auth is insecure over HTTP, ensure HTTPS is used. Consider OAuth2 or PAT for production use',
      auth_method: 'basic',
    });
  }

  /**
   * Perform Basic Authentication initialization
   *
   * @param config - Configuration containing username and password
   * @returns Promise resolving to Basic Auth credentials
   * @throws {InvalidCredentialsError} If username or password are missing
   *
   * @remarks
   * Basic Auth "authentication" is really just credential validation.
   * No server roundtrip occurs - credentials are validated locally.
   * Actual authentication happens on every API request with the credentials.
   *
   * **Security checks:**
   * - Validates username and password are non-empty
   * - Checks if Bitbucket URL uses HTTPS
   * - Logs ERROR if HTTP is used (security risk)
   */
  async authenticate(config: AuthConfig): Promise<Credentials> {
    const basicConfig = (config as BasicAuthAuthConfig).basic;

    // Validate username and password presence
    if (!basicConfig?.username || basicConfig.username.trim() === '') {
      throw new InvalidCredentialsError('Username is required for Basic auth');
    }

    if (!basicConfig?.password || basicConfig.password.trim() === '') {
      throw new InvalidCredentialsError('Password is required for Basic auth');
    }

    const isHttps = config.bitbucket_url.startsWith('https://');

    // Log security warning if not using HTTPS
    if (!isHttps) {
      this.logger.error({
        msg: 'SECURITY RISK: Basic auth over HTTP exposes credentials. Use HTTPS immediately!',
        auth_method: 'basic',
        bitbucket_url: config.bitbucket_url,
        is_https: false,
      });
    }

    this.logger.info({
      msg: `Basic auth initialized for user: ${basicConfig.username}`,
      auth_method: 'basic',
      bitbucket_url: config.bitbucket_url,
      is_https: isHttps,
    });

    // Create credentials object
    const credentials: Credentials = {
      bitbucket_url: config.bitbucket_url,
      auth_method: 'basic',
      username: basicConfig.username,
      password: basicConfig.password, // Will be base64-encoded in getAuthHeaders()
      expires_at: undefined, // Basic auth credentials do not expire
    };

    return credentials;
  }

  /**
   * Basic Auth does not support token refresh
   *
   * @param credentials - Current Basic Auth credentials
   * @returns Promise resolving to unchanged credentials
   *
   * @remarks
   * Basic Auth has no token concept - credentials are sent with every request.
   * This method returns credentials unchanged as there's nothing to refresh.
   */
  async refreshToken(credentials: Credentials): Promise<Credentials> {
    this.logger.debug({
      msg: 'Basic auth does not support token refresh',
      auth_method: 'basic',
      bitbucket_url: credentials.bitbucket_url,
    });

    // Return credentials unchanged - Basic Auth has no refresh mechanism
    return credentials;
  }

  /**
   * Generate Basic Auth authorization headers
   *
   * @param credentials - Basic Auth credentials
   * @returns Authorization headers with base64-encoded credentials
   *
   * @remarks
   * **Header format:** `Authorization: Basic {base64(username:password)}`
   *
   * **Encoding process:**
   * 1. Concatenate username and password with colon: `username:password`
   * 2. Encode result as base64
   * 3. Prefix with "Basic " scheme
   *
   * **Example:**
   * - Input: username="admin", password="password"
   * - Concatenated: "admin:password"
   * - Base64: "YWRtaW46cGFzc3dvcmQ="
   * - Header: "Authorization: Basic YWRtaW46cGFzc3dvcmQ="
   */
  getAuthHeaders(credentials: Credentials): Record<string, string> {
    if (!credentials.username || !credentials.password) {
      throw new InvalidCredentialsError('Username and password required for Basic auth');
    }

    // Encode credentials as base64
    const credentialsString = `${credentials.username}:${credentials.password}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');

    return {
      Authorization: `Basic ${base64Credentials}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate Basic Auth credentials structure (synchronous check)
   *
   * @param credentials - Credentials to validate
   * @returns true if username and password are present
   *
   * @remarks
   * **Validation checks:**
   * - auth_method is 'basic'
   * - username is present and non-empty
   * - password is present and non-empty
   *
   * This is a synchronous structure check only.
   * Use validateCredentialsWithBitbucket() for runtime credential validation.
   */
  validateCredentials(credentials: Credentials): boolean {
    return (
      credentials.auth_method === 'basic' &&
      !!credentials.username &&
      credentials.username.trim() !== '' &&
      !!credentials.password &&
      credentials.password.trim() !== ''
    );
  }

  /**
   * Validate Basic Auth credentials with Bitbucket API
   *
   * @param credentials - Credentials to validate
   * @returns Promise resolving to true if credentials are valid
   *
   * @remarks
   * **Validation steps:**
   * 1. Structure check: username and password present
   * 2. API validation: GET /rest/api/latest/profile/recent/repos with Basic Auth header
   * 3. If 200 OK, credentials are valid
   * 4. If 401 Unauthorized, credentials are invalid
   *
   * **Security warning:**
   * - Logs ERROR if Bitbucket URL does not use HTTPS
   * - Credentials are exposed in plaintext over HTTP
   *
   * This method DOES make API calls to validate credentials at runtime.
   */
  async validateCredentialsWithBitbucket(credentials: Credentials): Promise<boolean> {
    // First check structure
    if (!this.validateCredentials(credentials)) {
      return false;
    }

    // Check HTTPS usage
    const isHttps = credentials.bitbucket_url.startsWith('https://');
    if (!isHttps) {
      this.logger.error({
        msg: 'SECURITY RISK: Basic auth over HTTP exposes credentials. Use HTTPS immediately!',
        auth_method: 'basic',
        bitbucket_url: credentials.bitbucket_url,
      });
    }

    // Validate credentials with Bitbucket API
    const validateUrl = `${credentials.bitbucket_url}/rest/api/latest/profile/recent/repos?limit=1`;

    try {
      const headers = this.getAuthHeaders(credentials);

      const response = await fetch(validateUrl, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const userData = (await response.json()) as { displayName?: string; name?: string };
        this.logger.info({
          msg: `Basic auth validated successfully for user: ${credentials.username}`,
          auth_method: 'basic',
          bitbucket_url: credentials.bitbucket_url,
          user: userData.displayName || userData.name,
        });

        return true;
      }

      if (response.status === 401) {
        this.logger.warn({
          msg: 'Basic auth validation failed - 401 Unauthorized',
          auth_method: 'basic',
          bitbucket_url: credentials.bitbucket_url,
          username: credentials.username,
        });

        return false;
      }

      this.logger.error({
        msg: 'Basic auth validation failed with unexpected status',
        auth_method: 'basic',
        status: response.status,
        statusText: response.statusText,
      });

      return false;
    } catch (error) {
      this.logger.error({
        msg: 'Error validating Basic auth credentials',
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }
}
