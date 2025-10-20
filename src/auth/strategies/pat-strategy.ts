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
import { AuthenticationError, ConfigurationError, InvalidCredentialsError } from '../errors.js';

/**
 * Personal Access Token (PAT) configuration interface
 */
interface PATConfig {
  /** Personal Access Token from Bitbucket Data Center */
  token: string;
}

/**
 * Extended AuthConfig with PAT-specific configuration
 */
interface PATAuthConfig extends AuthConfig {
  pat?: PATConfig;
  timeout?: number;
}

/**
 * Bitbucket user response from /rest/api/latest/profile/recent/repos endpoint
 */
interface BitbucketUser {
  /** Bitbucket user account ID */
  accountId: string;

  /** Account type (atlassian, app, customer) */
  accountType: 'atlassian' | 'app' | 'customer';

  /** User display name */
  displayName: string;

  /** User email address */
  emailAddress?: string;

  /** Whether the user account is active */
  active: boolean;

  /** Self reference URL */
  self: string;
}

/**
 * Personal Access Token (PAT) Authentication Strategy
 *
 * @remarks
 * Implements the simplest authentication method for Bitbucket Data Center using
 * Personal Access Tokens. This strategy is ideal for:
 * - Server-to-server authentication (non-interactive)
 * - CI/CD pipelines and automation
 * - Development and testing environments
 * - Users who prefer simplicity over OAuth complexity
 *
 * **Authentication Flow:**
 * 1. Extract PAT token from configuration
 * 2. Validate token is present and non-empty
 * 3. Create credentials object with token
 * 4. No browser interaction or callback server needed
 *
 * **Token Validation:**
 * PATs don't expire automatically but can be revoked manually in Bitbucket.
 * The `validateCredentials()` method calls Bitbucket's `/rest/api/latest/profile/recent/repos` endpoint
 * to verify the token is still valid.
 *
 * **Key Differences from OAuth2:**
 * - No refresh logic (PATs are long-lived until revoked)
 * - No browser interaction required
 * - No callback server needed
 * - Simpler configuration (just token value)
 *
 * @example
 * ```typescript
 * const config: PATAuthConfig = {
 *   bitbucket_url: 'https://bitbucket.example.com',
 *   auth_method: 'pat',
 *   pat: { token: 'my-pat-token' },
 *   timeout: 30000
 * };
 *
 * const strategy = new PATStrategy();
 * const credentials = await strategy.authenticate(config);
 * const headers = strategy.getAuthHeaders(credentials);
 * const isValid = await strategy.validateCredentials(credentials);
 * ```
 */
export class PATStrategy implements AuthStrategy {
  private readonly logger: PinoLogger;

  /** Default timeout for Bitbucket API requests (30 seconds) */
  private static readonly DEFAULT_TIMEOUT = 30000;

  /** Bitbucket API endpoint for validating PAT tokens */
  private static readonly VALIDATION_ENDPOINT = '/rest/api/latest/profile/recent/repos?limit=1';

  /**
   * Creates a new PATStrategy instance
   *
   * @remarks
   * The strategy uses a singleton logger instance for structured logging.
   * All sensitive data (tokens) are automatically redacted by the logger.
   */
  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Perform PAT authentication by extracting token from configuration
   *
   * @param config - Authentication configuration containing PAT token
   * @returns Promise resolving to credentials with PAT token
   * @throws {InvalidCredentialsError} If PAT token is missing or empty
   *
   * @remarks
   * This method:
   * 1. Extracts token from config.pat.token
   * 2. Validates token is present and non-empty
   * 3. Creates Credentials object
   * 4. Logs authentication initialization (token value is never logged)
   *
   * Note: This method does NOT validate the token with Bitbucket API.
   * Use validateCredentials() to verify the token is valid.
   */
  async authenticate(config: AuthConfig): Promise<Credentials> {
    const patConfig = config as PATAuthConfig;

    // Extract token from configuration
    const token = patConfig.pat?.token;

    // Validate token is present and non-empty
    if (!token || token.trim() === '') {
      this.logger.error(
        {
          auth_method: 'pat',
          bitbucket_url: config.bitbucket_url,
          error_type: 'InvalidCredentialsError',
        },
        'PAT authentication failed: token missing',
      );

      throw new InvalidCredentialsError('PAT token is required in config.auth.pat.token');
    }

    // Log authentication initialization (never log token value)
    this.logger.info(
      {
        auth_method: 'pat',
        bitbucket_url: config.bitbucket_url,
      },
      'PAT authentication initialized',
    );

    // Create and return credentials
    const credentials: Credentials = {
      bitbucket_url: config.bitbucket_url,
      auth_method: 'pat',
      access_token: token,
      expires_at: undefined, // PATs don't have automatic expiration
    };

    return credentials;
  }

  /**
   * Refresh token - NOT SUPPORTED for PAT authentication
   *
   * @param credentials - Current credentials (unused)
   * @throws {AuthenticationError} Always throws as PATs don't support refresh
   *
   * @remarks
   * Personal Access Tokens are long-lived and don't have refresh logic.
   * When a PAT is revoked or becomes invalid, the user must generate
   * a new token in Bitbucket Data Center and update the configuration.
   */
  async refreshToken(credentials: Credentials): Promise<Credentials> {
    this.logger.warn(
      {
        auth_method: 'pat',
        bitbucket_url: credentials.bitbucket_url,
      },
      'Attempted to refresh PAT token',
    );

    throw new AuthenticationError(
      'PAT tokens do not support refresh. Generate a new token in Bitbucket DC if the current token is invalid.',
    );
  }

  /**
   * Validate credentials synchronously (basic checks only)
   *
   * @param credentials - Credentials to validate
   * @returns true if credentials have required fields, false otherwise
   *
   * @remarks
   * This method performs synchronous validation checking:
   * - access_token is present and non-empty
   * - PATs don't have expiration, so no expires_at check
   *
   * Does NOT make API calls - use validateTokenWithBitbucket() for that.
   * This follows the AuthStrategy interface requirement for synchronous validation.
   */
  validateCredentials(credentials: Credentials): boolean {
    // Check if access_token exists and is not empty
    if (!credentials.access_token || credentials.access_token.trim() === '') {
      this.logger.debug(
        {
          auth_method: 'pat',
          bitbucket_url: credentials.bitbucket_url,
          reason: 'missing_access_token',
        },
        'Credential validation failed',
      );

      return false;
    }

    // PATs don't have automatic expiration
    this.logger.debug(
      {
        auth_method: 'pat',
        bitbucket_url: credentials.bitbucket_url,
      },
      'Credential validation passed',
    );

    return true;
  }

  /**
   * Validate credentials with Bitbucket API
   *
   * @param credentials - Credentials to validate
   * @param timeout - Request timeout in milliseconds (optional)
   * @returns Promise resolving to true if valid, false otherwise
   *
   * @remarks
   * This method:
   * 1. Checks access_token is present
   * 2. Calls Bitbucket /rest/api/latest/profile/recent/repos endpoint with Bearer token
   * 3. Returns true if response is 200 OK
   * 4. Returns false if response is 401 Unauthorized (invalid/revoked token)
   * 5. Throws error for server errors (5xx) or configuration issues
   *
   * This is the ONLY way to detect revoked PATs since they don't expire automatically.
   * This is a separate method from validateCredentials() which must remain synchronous
   * per the AuthStrategy interface.
   */
  async validateTokenWithBitbucket(
    credentials: Credentials,
    timeout: number = PATStrategy.DEFAULT_TIMEOUT,
  ): Promise<boolean> {
    // Check access_token is present
    if (!credentials.access_token) {
      this.logger.warn(
        {
          auth_method: 'pat',
          bitbucket_url: credentials.bitbucket_url,
        },
        'PAT validation failed: token missing from credentials',
      );
      return false;
    }

    const validationUrl = `${credentials.bitbucket_url}${PATStrategy.VALIDATION_ENDPOINT}`;

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Call Bitbucket API to validate token
      const response = await fetch(validationUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle successful validation (200 OK)
      if (response.ok) {
        const user = (await response.json()) as BitbucketUser;

        this.logger.info(
          {
            auth_method: 'pat',
            bitbucket_url: credentials.bitbucket_url,
            user_id: user.accountId,
            account_type: user.accountType,
          },
          'PAT validation successful',
        );

        return true;
      }

      // Handle validation errors based on status code
      if (response.status === 401) {
        // Token is invalid, expired, or revoked
        this.logger.warn(
          {
            auth_method: 'pat',
            bitbucket_url: credentials.bitbucket_url,
            status_code: response.status,
            error_type: 'invalid_token',
          },
          'PAT validation failed',
        );

        return false;
      }

      // Handle other HTTP errors
      const errorBody = await response.text().catch(() => 'Unable to read error response');
      this.handleValidationError(response.status, errorBody, credentials.bitbucket_url);

      // This line is unreachable but TypeScript requires it
      return false;
    } catch (error) {
      // Re-throw our own error types (from handleValidationError)
      if (
        error instanceof InvalidCredentialsError ||
        error instanceof AuthenticationError ||
        error instanceof ConfigurationError
      ) {
        throw error;
      }

      // Handle network errors and timeouts
      if (error instanceof Error) {
        // Check if it's an abort error (timeout)
        if (error.name === 'AbortError') {
          this.logger.error(
            {
              auth_method: 'pat',
              bitbucket_url: credentials.bitbucket_url,
              timeout_ms: timeout,
              error_type: 'timeout',
            },
            'PAT validation timeout',
          );

          throw new AuthenticationError(
            `PAT validation timed out after ${timeout}ms. Check network connection and Bitbucket URL.`,
          );
        }

        // Network or fetch errors
        const sanitizedMessage = this.sanitizeError(error.message);

        this.logger.error(
          {
            auth_method: 'pat',
            bitbucket_url: credentials.bitbucket_url,
            error_type: error.name,
            error_message: sanitizedMessage,
          },
          'PAT validation network error',
        );

        throw new AuthenticationError(`Network error during PAT validation: ${sanitizedMessage}`);
      }

      // Unknown error type
      throw new AuthenticationError('Unknown error during PAT validation');
    }
  }

  /**
   * Get authentication headers for Bitbucket API requests
   *
   * @param credentials - Credentials containing access token
   * @returns HTTP headers with Bearer token authorization
   *
   * @remarks
   * Returns headers in the format:
   * ```typescript
   * {
   *   'Authorization': 'Bearer <token>',
   *   'Content-Type': 'application/json'
   * }
   * ```
   */
  getAuthHeaders(credentials: Credentials): Record<string, string> {
    return {
      Authorization: `Bearer ${credentials.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Handle validation errors based on HTTP status code
   *
   * @param statusCode - HTTP status code from Bitbucket API
   * @param errorBody - Error response body
   * @param bitbucketUrl - Bitbucket instance URL for logging
   * @throws {InvalidCredentialsError} For 401 (though this should be handled before calling this)
   * @throws {AuthenticationError} For 403 (insufficient permissions)
   * @throws {ConfigurationError} For 404 (invalid Bitbucket URL)
   * @throws {AuthenticationError} For 5xx (Bitbucket server errors)
   *
   * @remarks
   * This method provides user-friendly error messages with actionable guidance.
   */
  private handleValidationError(statusCode: number, errorBody: string, bitbucketUrl: string): never {
    const sanitizedError = this.sanitizeError(errorBody);

    this.logger.error(
      {
        auth_method: 'pat',
        bitbucket_url: bitbucketUrl,
        status_code: statusCode,
        error_message: sanitizedError,
      },
      'PAT validation error',
    );

    switch (statusCode) {
      case 401:
        throw new InvalidCredentialsError(
          'PAT token is invalid, expired, or revoked. Please generate a new PAT in Bitbucket Data Center.',
        );

      case 403:
        throw new AuthenticationError(
          'PAT token lacks required permissions for Bitbucket API. Ensure the token has read:bitbucket-user scope.',
        );

      case 404:
        throw new ConfigurationError(
          `Bitbucket API endpoint not found. Verify config.bitbucket_url is correct: ${bitbucketUrl}`,
        );

      case 500:
      case 502:
      case 503:
      case 504:
        throw new AuthenticationError(
          `Bitbucket server error (${statusCode}). Cannot validate PAT token. Please try again later.`,
        );

      default:
        throw new AuthenticationError(
          `Unexpected HTTP status ${statusCode} during PAT validation: ${sanitizedError}`,
        );
    }
  }

  /**
   * Sanitize error messages by removing sensitive data
   *
   * @param errorMessage - Error message to sanitize
   * @returns Sanitized error message with tokens removed
   *
   * @remarks
   * This method removes token values from error messages to prevent
   * accidental logging of sensitive data. Tokens are replaced with "***".
   *
   * Patterns removed:
   * - Bearer tokens in Authorization headers
   * - Token-like strings (word boundaries, 15+ chars with letters/numbers/hyphens)
   */
  private sanitizeError(errorMessage: string): string {
    return (
      errorMessage
        // Remove Bearer tokens
        .replace(/Bearer\s+[\w-]+/gi, 'Bearer ***')
        // Remove token-like strings: letters, numbers, hyphens, 15+ chars
        .replace(/\b[A-Za-z0-9][\w-]{14,}\b/g, '***')
    );
  }
}
