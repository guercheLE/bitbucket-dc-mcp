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
 * Authentication-specific error classes
 *
 * @remarks
 * These errors extend the base Error class and follow the pattern
 * established in src/core/errors.ts. All authentication errors
 * should be caught and handled gracefully with appropriate logging.
 */

/**
 * Base class for all authentication-related errors
 *
 * @remarks
 * Use this for general authentication failures that don't fit
 * into more specific error types.
 */
export class AuthenticationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AuthenticationError';
    Error.captureStackTrace?.(this, AuthenticationError);
  }
}

/**
 * Error thrown when credentials are invalid or missing required fields
 *
 * @remarks
 * This error indicates that credentials do not meet the requirements
 * for the selected authentication method (e.g., missing access_token
 * for OAuth2, missing username/password for Basic Auth).
 *
 * @example
 * ```typescript
 * if (!credentials.access_token && authMethod === 'oauth2') {
 *   throw new InvalidCredentialsError('OAuth2 requires access_token');
 * }
 * ```
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidCredentialsError';
    Error.captureStackTrace?.(this, InvalidCredentialsError);
  }
}

/**
 * Error thrown when a token has expired and refresh attempt fails
 *
 * @remarks
 * This error indicates that the token has reached its expiration time
 * and either:
 * 1. The auth method doesn't support refresh (PAT, Basic, OAuth1)
 * 2. Token refresh failed (OAuth2 refresh_token invalid/expired)
 *
 * The user should re-authenticate to obtain new credentials.
 *
 * @example
 * ```typescript
 * if (credentials.expires_at && credentials.expires_at < new Date()) {
 *   if (!strategy.refreshToken) {
 *     throw new TokenExpiredError('Token expired and refresh not supported');
 *   }
 *   // Try refresh...
 * }
 * ```
 */
export class TokenExpiredError extends AuthenticationError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TokenExpiredError';
    Error.captureStackTrace?.(this, TokenExpiredError);
  }
}

/**
 * Error thrown when configuration is invalid or missing required values
 *
 * @remarks
 * This error indicates issues with configuration such as:
 * - Invalid Bitbucket URL format
 * - Missing required configuration fields
 * - Incorrect endpoint paths
 *
 * @example
 * ```typescript
 * if (!isValidUrl(config.bitbucket_url)) {
 *   throw new ConfigurationError('Invalid Bitbucket URL format');
 * }
 * ```
 */
export class ConfigurationError extends AuthenticationError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigurationError';
    Error.captureStackTrace?.(this, ConfigurationError);
  }
}
