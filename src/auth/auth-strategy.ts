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

import type { AuthMethod } from '../core/config-manager.js';

/**
 * Credentials interface representing authentication data for Bitbucket API
 *
 * @remarks
 * Different authentication methods require different fields:
 * - OAuth2/PAT: access_token, optionally refresh_token
 * - Basic Auth: username, password
 * - OAuth 1.0a: consumer_key, consumer_secret, oauth_token, oauth_token_secret
 */
export interface Credentials {
  /** Bitbucket instance URL */
  bitbucket_url: string;

  /** Authentication method used */
  auth_method: AuthMethod;

  // OAuth2/PAT fields
  /** Access token for OAuth2 or PAT authentication */
  access_token?: string;

  /** Refresh token for OAuth2 (optional) */
  refresh_token?: string;

  /** Token expiration timestamp */
  expires_at?: Date;

  /** OAuth2 client ID (optional, for token refresh) */
  client_id?: string;

  /** OAuth2 client secret (optional, for token refresh) */
  client_secret?: string;

  // Basic Auth fields
  /** Username for Basic authentication */
  username?: string;

  /** Password for Basic authentication (encrypted in keychain) */
  password?: string;

  // OAuth 1.0a fields
  /** Consumer key for OAuth 1.0a */
  consumer_key?: string;

  /** Consumer secret for OAuth 1.0a */
  consumer_secret?: string;

  /** Private key path for OAuth 1.0a RSA-SHA1 */
  private_key_path?: string;

  /** OAuth token for OAuth 1.0a */
  oauth_token?: string;

  /** OAuth token secret for OAuth 1.0a */
  oauth_token_secret?: string;
}

/**
 * Configuration for authentication process
 *
 * @remarks
 * Contains all necessary data to initiate authentication flow
 */
export interface AuthConfig {
  /** Bitbucket instance URL */
  bitbucket_url: string;

  /** Authentication method to use */
  auth_method: AuthMethod;

  /** Additional configuration specific to auth method */
  [key: string]: unknown;
}

/**
 * Authentication Strategy interface using Strategy Pattern
 *
 * @remarks
 * The Strategy Pattern allows the authentication system to support multiple
 * authentication methods (OAuth2, PAT, OAuth1.0a, Basic Auth) with a unified
 * interface. Each authentication method implements this interface as a concrete
 * strategy class.
 *
 * **When to use each method:**
 * - `authenticate()`: Initial authentication or re-authentication when credentials
 *   are invalid or missing
 * - `refreshToken()`: Refresh expired OAuth2 tokens without full re-authentication
 * - `validateCredentials()`: Check if credentials are valid and not expired
 *
 * @example
 * ```typescript
 * class OAuth2Strategy implements AuthStrategy {
 *   async authenticate(config: AuthConfig): Promise<Credentials> {
 *     // Perform OAuth2 PKCE flow
 *     return credentials;
 *   }
 *
 *   async refreshToken(credentials: Credentials): Promise<Credentials> {
 *     // Use refresh_token to get new access_token
 *     return newCredentials;
 *   }
 *
 *   validateCredentials(credentials: Credentials): boolean {
 *     return !!credentials.access_token &&
 *            (!credentials.expires_at || credentials.expires_at > new Date());
 *   }
 * }
 * ```
 */
export interface AuthStrategy {
  /**
   * Perform authentication flow and obtain credentials
   *
   * @param config - Configuration containing auth method and necessary parameters
   * @returns Promise resolving to valid credentials
   * @throws {AuthenticationError} If authentication fails
   *
   * @remarks
   * This method should:
   * 1. Initiate the authentication flow for the specific method
   * 2. Obtain and validate credentials
   * 3. Return structured Credentials object
   */
  authenticate(config: AuthConfig): Promise<Credentials>;

  /**
   * Refresh expired credentials (optional - not all auth methods support refresh)
   *
   * @param credentials - Current credentials containing refresh_token
   * @returns Promise resolving to refreshed credentials
   * @throws {TokenExpiredError} If refresh fails
   *
   * @remarks
   * Only OAuth2 typically supports token refresh. Other methods should
   * not implement this method or throw NotImplementedError.
   */
  refreshToken?(credentials: Credentials): Promise<Credentials>;

  /**
   * Validate that credentials are still valid and not expired
   *
   * @param credentials - Credentials to validate
   * @returns true if credentials are valid, false otherwise
   *
   * @remarks
   * This method should check:
   * 1. Required fields are present for the auth method
   * 2. Token is not expired (if expires_at is present)
   * 3. No other validation errors
   *
   * This is a synchronous check and does NOT make API calls.
   */
  validateCredentials(credentials: Credentials): boolean;
}
