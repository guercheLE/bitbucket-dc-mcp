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

import type { AuthConfig, AuthStrategy, Credentials } from '../auth-strategy.js';

/**
 * Stub Authentication Strategy for testing and development
 *
 * @remarks
 * This strategy returns mock credentials without performing real authentication.
 * It is useful for:
 * - Unit testing without real API calls
 * - Integration testing with mock data
 * - Development before real auth strategies are implemented
 *
 * **Do NOT use in production.** This strategy is only for testing purposes.
 *
 * @example
 * ```typescript
 * const stubStrategy = new StubStrategy();
 * const credentials = await stubStrategy.authenticate({
 *   bitbucket_url: 'https://bitbucket.example.com',
 *   auth_method: 'pat'
 * });
 * // Returns mock credentials with fake token
 * ```
 */
export class StubStrategy implements AuthStrategy {
  /**
   * Returns mock credentials without real authentication
   *
   * @param config - Authentication configuration
   * @returns Mock credentials
   */
  async authenticate(config: AuthConfig): Promise<Credentials> {
    // Return stub credentials based on auth method
    const baseCredentials: Credentials = {
      bitbucket_url: config.bitbucket_url,
      auth_method: config.auth_method,
    };

    switch (config.auth_method) {
      case 'oauth2':
        return {
          ...baseCredentials,
          access_token: 'stub_oauth2_access_token',
          refresh_token: 'stub_oauth2_refresh_token',
          expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        };

      case 'pat':
        return {
          ...baseCredentials,
          access_token: 'stub_pat_token',
        };

      case 'oauth1':
        return {
          ...baseCredentials,
          consumer_key: 'stub_consumer_key',
          consumer_secret: 'stub_consumer_secret',
          oauth_token: 'stub_oauth_token',
          oauth_token_secret: 'stub_oauth_token_secret',
        };

      case 'basic':
        return {
          ...baseCredentials,
          username: 'stub_user',
          password: 'stub_password',
        };

      default:
        return baseCredentials;
    }
  }

  /**
   * Returns mock refreshed credentials
   *
   * @param credentials - Current credentials
   * @returns Mock refreshed credentials
   *
   * @remarks
   * Note: PAT, Basic, and OAuth1 don't support refresh in real implementations.
   * For testing purposes, this stub only supports OAuth2 refresh.
   */
  async refreshToken(credentials: Credentials): Promise<Credentials> {
    // Only OAuth2 supports refresh in real implementations
    if (credentials.auth_method !== 'oauth2') {
      throw new Error(`${credentials.auth_method} does not support token refresh`);
    }

    return {
      ...credentials,
      access_token: 'stub_refreshed_access_token',
      refresh_token: 'stub_refreshed_refresh_token',
      expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    };
  }

  /**
   * Validates stub credentials (always returns true for non-empty tokens)
   *
   * @param credentials - Credentials to validate
   * @returns true if credentials have required fields
   */
  validateCredentials(credentials: Credentials): boolean {
    // Check expiration first
    if (credentials.expires_at && credentials.expires_at < new Date()) {
      return false;
    }

    // Validate required fields based on auth method
    switch (credentials.auth_method) {
      case 'oauth2':
      case 'pat':
        return !!credentials.access_token;

      case 'oauth1':
        return !!(
          credentials.consumer_key &&
          credentials.consumer_secret &&
          credentials.oauth_token &&
          credentials.oauth_token_secret
        );

      case 'basic':
        return !!(credentials.username && credentials.password);

      default:
        return false;
    }
  }
}
