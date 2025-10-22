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
import type { AppConfig, AuthMethod } from '../core/config-manager.js';
import { CredentialStorage } from '../core/credential-storage.js';
import type { AuthConfig, AuthStrategy, Credentials } from './auth-strategy.js';
import { InvalidCredentialsError, TokenExpiredError } from './errors.js';
import { BasicAuthStrategy } from './strategies/basic-auth-strategy.js';
import { OAuth1Strategy } from './strategies/oauth1-strategy.js';
import { OAuth2Strategy } from './strategies/oauth2-strategy.js';
import { PATStrategy } from './strategies/pat-strategy.js';

/**
 * Stub Credential Storage for testing only
 *
 * @remarks
 * This is an in-memory implementation that does NOT persist credentials.
 * Use CredentialStorage from '../core/credential-storage.js' for production.
 *
 * **Auto-generation:** If credentials don't exist for a given key, this storage
 * automatically generates stub credentials based on the provided bitbucket_url.
 * This allows E2E tests and development to work without explicit credential setup.
 */
export class StubCredentialStorage {
  private storage = new Map<string, Credentials>();

  async save(key: string, credentials: Credentials): Promise<void> {
    this.storage.set(key, credentials);
  }

  async load(key: string): Promise<Credentials | null> {
    // If credentials don't exist, auto-generate stub credentials
    if (!this.storage.has(key)) {
      const stubCredentials: Credentials = {
        bitbucket_url: key,
        auth_method: 'pat',
        access_token: 'stub_auto_generated_token',
      };
      this.storage.set(key, stubCredentials);
      return stubCredentials;
    }
    return this.storage.get(key) ?? null;
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async list(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

/**
 * Authentication Manager using Strategy Pattern
 *
 * @remarks
 * The AuthManager is responsible for:
 * 1. Selecting the appropriate authentication strategy based on config
 * 2. Managing credentials lifecycle (load → validate → refresh → persist)
 * 3. Providing authentication headers for HTTP requests
 * 4. Caching credentials in memory to reduce keychain access
 * 5. Logging authentication events with sanitized data
 *
 * **Strategy Pattern:**
 * Different authentication methods (OAuth2, PAT, OAuth1, Basic) are implemented
 * as separate strategy classes implementing AuthStrategy interface. AuthManager
 * selects and delegates to the appropriate strategy.
 *
 * **Credentials Lifecycle:**
 * ```
 * getCredentials() called
 *   ↓
 * Check in-memory cache → return if valid
 *   ↓
 * Load from storage → validate → refresh if expired → cache → return
 *   ↓
 * If invalid or missing → throw InvalidCredentialsError
 * ```
 *
 * @example
 * ```typescript
 * const authManager = new AuthManager(
 *   credentialStorage,
 *   Logger.getInstance(),
 *   await ConfigManager.load()
 * );
 *
 * // Get auth headers for request
 * const headers = await authManager.getAuthHeaders();
 * // { Authorization: 'Bearer <token>' }
 * ```
 */
export class AuthManager {
  private credentialsCache: Credentials | null = null;
  private readonly strategies: Map<AuthMethod, AuthStrategy> = new Map();
  private readonly storageKey: string;

  /**
   * Create a new AuthManager instance
   *
   * @param storage - Credential storage implementation (CredentialStorage for OS keychain, StubCredentialStorage for tests)
   * @param logger - Structured logger instance
   * @param config - Application configuration
   *
   * @example
   * ```typescript
   * // Production: OS keychain with encrypted fallback
   * const authManager = new AuthManager(
   *   new CredentialStorage(Logger.getInstance()),
   *   Logger.getInstance(),
   *   await ConfigManager.load()
   * );
   *
   * // Testing: In-memory stub
   * const authManager = new AuthManager(
   *   new StubCredentialStorage(),
   *   Logger.getInstance(),
   *   await ConfigManager.load()
   * );
   * ```
   */
  constructor(
    private readonly storage: CredentialStorage | StubCredentialStorage,
    private readonly logger: PinoLogger,
    private readonly config: AppConfig,
  ) {
    // Use credential profile if specified, otherwise use bitbucket_url as key
    this.storageKey = config.credentialProfile || config.bitbucketUrl;

    // Register available strategies
    // Strategies added per stories: 3.2 (OAuth2), 3.3 (PAT), 3.4 (OAuth1, Basic)
    this.strategies.set('pat', new PATStrategy());
    // Convert AppConfig to OAuth2AuthConfig format for OAuth2Strategy
    const oauth2Config = this.convertToAuthConfig(config);
    this.strategies.set('oauth2', new OAuth2Strategy(oauth2Config, logger));
    this.strategies.set('oauth1', new OAuth1Strategy(logger));
    this.strategies.set('basic', new BasicAuthStrategy(logger));

    this.logger.info(
      {
        event: 'auth_manager.initialized',
        authMethod: config.authMethod,
        bitbucketUrl: config.bitbucketUrl,
        storageKey: this.storageKey,
        usingCustomProfile: !!config.credentialProfile,
      },
      'AuthManager initialized',
    );
  }

  /**
   * Get authentication headers for Bitbucket API requests
   *
   * @returns Headers object containing Authorization header
   * @throws {InvalidCredentialsError} If credentials are invalid or missing
   * @throws {TokenExpiredError} If token expired and refresh failed
   *
   * @example
   * ```typescript
   * const headers = await authManager.getAuthHeaders();
   * // OAuth2/PAT: { Authorization: 'Bearer abc123...' }
   * // Basic: { Authorization: 'Basic dXNlcjpwYXNz' }
   * ```
   */
  async getAuthHeaders(): Promise<Headers> {
    this.logger.debug(
      { event: 'auth_manager.get_auth_headers_attempt' },
      'Attempting to get authentication headers',
    );

    try {
      const credentials = await this.getCredentials();
      const headers = new Headers();

      switch (credentials.auth_method) {
        case 'oauth2':
        case 'pat': {
          if (!credentials.access_token) {
            this.logger.error(
              {
                event: 'auth_manager.auth_failed',
                auth_method: credentials.auth_method,
                reason: 'missing_access_token',
              },
              `${credentials.auth_method} authentication failed: missing access token`,
            );
            throw new InvalidCredentialsError(`${credentials.auth_method} requires access_token`);
          }
          headers.set('Authorization', `Bearer ${credentials.access_token}`);
          break;
        }

        case 'basic': {
          if (!credentials.username || !credentials.password) {
            this.logger.error(
              {
                event: 'auth_manager.auth_failed',
                auth_method: 'basic',
                reason: 'missing_username_or_password',
              },
              'Basic authentication failed: missing username or password',
            );
            throw new InvalidCredentialsError('Basic auth requires username and password');
          }
          const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
            'base64',
          );
          headers.set('Authorization', `Basic ${basicAuth}`);
          break;
        }

        case 'oauth1': {
          if (
            !credentials.consumer_key ||
            !credentials.consumer_secret ||
            !credentials.oauth_token ||
            !credentials.oauth_token_secret
          ) {
            this.logger.error(
              {
                event: 'auth_manager.auth_failed',
                auth_method: 'oauth1',
                reason: 'missing_oauth1_credentials',
              },
              'OAuth1 authentication failed: missing required OAuth 1.0a fields',
            );
            throw new InvalidCredentialsError('OAuth1 requires all OAuth 1.0a fields');
          }

          // Generate OAuth 1.0a signature for this request
          const strategy = this.selectStrategy('oauth1') as OAuth1Strategy;
          const oauth1Headers = strategy.getAuthHeaders(
            credentials,
            'GET',
            `${credentials.bitbucket_url}/rest/api/latest/profile/recent/repos?limit=1`,
          );

          // Copy headers from oauth1Headers to Headers object
          Object.entries(oauth1Headers).forEach(([key, value]) => {
            headers.set(key, value);
          });
          break;
        }

        default:
          this.logger.error(
            {
              event: 'auth_manager.auth_failed',
              auth_method: String(credentials.auth_method),
              reason: 'unsupported_auth_method',
            },
            `Authentication failed: unsupported auth method`,
          );
          throw new InvalidCredentialsError(`Unsupported auth method: ${credentials.auth_method}`);
      }

      this.logger.info(
        {
          event: 'auth_manager.auth_success',
          auth_method: credentials.auth_method,
        },
        'Authentication headers generated successfully',
      );

      return headers;
    } catch (error) {
      if (error instanceof InvalidCredentialsError || error instanceof TokenExpiredError) {
        // Already logged above
        throw error;
      }

      this.logger.error(
        {
          event: 'auth_manager.auth_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        'Unexpected error getting authentication headers',
      );
      throw error;
    }
  }

  /**
   * Get current credentials, handling cache, validation, and refresh
   *
   * @returns Valid credentials
   * @throws {InvalidCredentialsError} If credentials missing or invalid
   * @throws {TokenExpiredError} If token expired and refresh failed
   *
   * @private
   */
  async getCredentials(): Promise<Credentials> {
    this.logger.debug(
      { event: 'auth_manager.get_credentials_attempt' },
      'Attempting to retrieve credentials',
    );

    // Check cache first
    if (this.credentialsCache) {
      if (this.validateCredentials(this.credentialsCache)) {
        this.logger.debug(
          {
            event: 'auth_manager.credentials_from_cache',
            auth_method: this.credentialsCache.auth_method,
          },
          'Using cached credentials',
        );
        return this.credentialsCache;
      }

      // Cache invalid, clear it
      this.logger.debug({ event: 'auth_manager.cache_invalidated' }, 'Cache invalidated');
      this.credentialsCache = null;
    }

    // Load from storage
    const stored = await this.storage.load(this.storageKey);
    if (!stored) {
      // Try to load from environment variables as fallback
      const envCredentials = this.loadFromEnvironment();
      if (envCredentials) {
        this.logger.info(
          {
            event: 'auth_manager.credentials_from_env',
            auth_method: envCredentials.auth_method,
          },
          'Using credentials from environment variables',
        );
        // Cache env credentials but don't persist to storage
        this.credentialsCache = envCredentials;
        return envCredentials;
      }

      this.logger.error(
        { event: 'auth_manager.credentials_not_found', storage_key: this.storageKey },
        'No credentials found in storage or environment variables',
      );
      throw new InvalidCredentialsError(
        'No credentials found. Please authenticate first or set environment variables (e.g., BITBUCKET_TOKEN for PAT, BITBUCKET_USERNAME and BITBUCKET_PASSWORD for basic auth).',
      );
    }

    this.logger.debug(
      { event: 'auth_manager.credentials_loaded', auth_method: stored.auth_method },
      'Credentials loaded from storage',
    );

    // Validate and potentially refresh
    if (!this.validateCredentials(stored)) {
      // Try to refresh if expired
      if (this.isExpired(stored)) {
        try {
          const refreshed = await this.refreshCredentials(stored);
          this.credentialsCache = refreshed;
          await this.storage.save(this.storageKey, refreshed);

          this.logger.info(
            {
              event: 'auth_manager.token_refreshed',
              authMethod: refreshed.auth_method,
              expiresAt: refreshed.expires_at?.toISOString(),
            },
            'Token refreshed successfully',
          );

          return refreshed;
        } catch (error) {
          this.logger.error(
            {
              event: 'auth_manager.refresh_failed',
              authMethod: stored.auth_method,
              error: error instanceof Error ? error.message : String(error),
            },
            'Token refresh failed',
          );
          throw new TokenExpiredError('Token expired and refresh failed. Please re-authenticate.');
        }
      }

      throw new InvalidCredentialsError('Stored credentials are invalid');
    }

    // Cache and return
    this.credentialsCache = stored;
    return stored;
  }

  /**
   * Load credentials from environment variables as fallback
   *
   * Supports the following environment variables based on auth method:
   * - PAT: BITBUCKET_TOKEN or BITBUCKET_PAT
   * - Basic Auth: BITBUCKET_USERNAME and BITBUCKET_PASSWORD
   * - OAuth2: BITBUCKET_ACCESS_TOKEN (required), BITBUCKET_REFRESH_TOKEN (optional)
   * - OAuth1: BITBUCKET_CONSUMER_KEY, BITBUCKET_CONSUMER_SECRET, BITBUCKET_OAUTH_TOKEN, BITBUCKET_OAUTH_TOKEN_SECRET
   *
   * @returns Credentials object if environment variables are set, null otherwise
   *
   * @private
   */
  private loadFromEnvironment(): Credentials | null {
    const authMethod = this.config.authMethod;
    const bitbucketUrl = this.config.bitbucketUrl;

    switch (authMethod) {
      case 'pat': {
        const token = process.env.BITBUCKET_TOKEN || process.env.BITBUCKET_PAT;
        if (token) {
          this.logger.debug(
            { event: 'auth_manager.env_credentials_detected', auth_method: 'pat' },
            'PAT credentials detected in environment',
          );
          return {
            bitbucket_url: bitbucketUrl,
            auth_method: 'pat',
            access_token: token,
          };
        }
        break;
      }

      case 'basic': {
        const username = process.env.BITBUCKET_USERNAME;
        const password = process.env.BITBUCKET_PASSWORD;
        if (username && password) {
          this.logger.debug(
            { event: 'auth_manager.env_credentials_detected', auth_method: 'basic' },
            'Basic auth credentials detected in environment',
          );
          return {
            bitbucket_url: bitbucketUrl,
            auth_method: 'basic',
            username,
            password,
          };
        }
        break;
      }

      case 'oauth2': {
        const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;
        if (accessToken) {
          this.logger.debug(
            { event: 'auth_manager.env_credentials_detected', auth_method: 'oauth2' },
            'OAuth2 credentials detected in environment',
          );
          const credentials: Credentials = {
            bitbucket_url: bitbucketUrl,
            auth_method: 'oauth2',
            access_token: accessToken,
          };

          // Optional refresh token
          if (process.env.BITBUCKET_REFRESH_TOKEN) {
            credentials.refresh_token = process.env.BITBUCKET_REFRESH_TOKEN;
          }

          // Optional client credentials for token refresh
          if (process.env.BITBUCKET_CLIENT_ID) {
            credentials.client_id = process.env.BITBUCKET_CLIENT_ID;
          }
          if (process.env.BITBUCKET_CLIENT_SECRET) {
            credentials.client_secret = process.env.BITBUCKET_CLIENT_SECRET;
          }

          return credentials;
        }
        break;
      }

      case 'oauth1': {
        const consumerKey = process.env.BITBUCKET_CONSUMER_KEY;
        const consumerSecret = process.env.BITBUCKET_CONSUMER_SECRET;
        const oauthToken = process.env.BITBUCKET_OAUTH_TOKEN;
        const oauthTokenSecret = process.env.BITBUCKET_OAUTH_TOKEN_SECRET;

        if (consumerKey && consumerSecret && oauthToken && oauthTokenSecret) {
          this.logger.debug(
            { event: 'auth_manager.env_credentials_detected', auth_method: 'oauth1' },
            'OAuth1 credentials detected in environment',
          );
          return {
            bitbucket_url: bitbucketUrl,
            auth_method: 'oauth1',
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            oauth_token: oauthToken,
            oauth_token_secret: oauthTokenSecret,
          };
        }
        break;
      }
    }

    return null;
  }

  /**
   * Validate credentials using strategy validation logic
   *
   * @param credentials - Credentials to validate
   * @returns true if valid, false otherwise
   *
   * @private
   */
  private validateCredentials(credentials: Credentials): boolean {
    const strategy = this.selectStrategy(credentials.auth_method);
    const isValid = strategy.validateCredentials(credentials);

    if (!isValid) {
      this.logger.debug(
        {
          event: 'auth_manager.validation_failed',
          authMethod: credentials.auth_method,
          hasAccessToken: !!credentials.access_token,
          hasRefreshToken: !!credentials.refresh_token,
          expiresAt: credentials.expires_at?.toISOString(),
        },
        'Credential validation failed',
      );
    }

    return isValid;
  }

  /**
   * Check if credentials are expired
   *
   * @param credentials - Credentials to check
   * @returns true if expired, false otherwise
   *
   * @private
   */
  private isExpired(credentials: Credentials): boolean {
    return !!credentials.expires_at && credentials.expires_at < new Date();
  }

  /**
   * Refresh expired credentials using strategy refresh logic
   *
   * @param credentials - Current credentials with refresh_token
   * @returns Refreshed credentials
   * @throws {TokenExpiredError} If refresh not supported or fails
   *
   * @private
   */
  private async refreshCredentials(credentials: Credentials): Promise<Credentials> {
    const strategy = this.selectStrategy(credentials.auth_method);

    if (!strategy.refreshToken) {
      throw new TokenExpiredError(`${credentials.auth_method} does not support token refresh`);
    }

    return await strategy.refreshToken(credentials);
  }

  /**
   * Select authentication strategy based on auth method
   *
   * @param authMethod - Authentication method
   * @returns Corresponding auth strategy
   * @throws {InvalidCredentialsError} If strategy not found
   *
   * @private
   */
  private selectStrategy(authMethod: AuthMethod): AuthStrategy {
    const strategy = this.strategies.get(authMethod);

    if (!strategy) {
      throw new InvalidCredentialsError(`No strategy found for auth method: ${authMethod}`);
    }

    this.logger.debug(
      {
        event: 'auth_manager.strategy_selected',
        authMethod,
      },
      'Authentication strategy selected',
    );

    return strategy;
  }

  /**
   * Clear credentials cache (useful for testing or forced re-authentication)
   *
   * @remarks
   * This only clears the in-memory cache, not the stored credentials.
   */
  clearCache(): void {
    this.credentialsCache = null;
    this.logger.debug({ event: 'auth_manager.cache_cleared' }, 'Credentials cache cleared');
  }

  /**
   * Save new credentials to storage and update cache
   *
   * @param credentials - Credentials to save
   *
   * @remarks
   * This is typically called after successful authentication or token refresh.
   * Uses secure OS keychain storage via CredentialStorage with AES-256-GCM encrypted fallback.
   */
  async saveCredentials(credentials: Credentials): Promise<void> {
    await this.storage.save(this.storageKey, credentials);
    this.credentialsCache = credentials;

    this.logger.info(
      {
        event: 'auth_manager.credentials_saved',
        authMethod: credentials.auth_method,
        storageKey: this.storageKey,
      },
      'Credentials saved to secure storage',
    );
  }

  /**
   * Convert AppConfig to AuthConfig format for strategy use
   *
   * @param config - Application configuration
   * @returns AuthConfig with snake_case properties
   *
   * @private
   * @remarks
   * Converts camelCase AppConfig to snake_case AuthConfig expected by strategies.
   * Also extracts OAuth2-specific configuration if present.
   */
  private convertToAuthConfig(config: AppConfig): AuthConfig {
    return {
      bitbucket_url: config.bitbucketUrl,
      auth_method: config.authMethod,
      // OAuth2-specific config would come from environment or config file
      // For now, strategies will read from environment if needed
    };
  }

  /**
   * Delete stored credentials and clear cache (logout)
   *
   * @returns true if credentials were deleted, false if not found
   *
   * @remarks
   * This removes credentials from secure storage and clears the in-memory cache.
   * Removes credentials from OS keychain or encrypted fallback file.
   */
  async logout(): Promise<boolean> {
    const deleted = await this.storage.delete(this.storageKey);
    this.credentialsCache = null;

    this.logger.info(
      {
        event: 'auth_manager.logout',
        storageKey: this.storageKey,
        credentialsDeleted: deleted,
      },
      'User logged out, credentials removed',
    );

    return deleted;
  }

  /**
   * List all stored credential keys
   *
   * @returns Array of storage keys
   *
   * @remarks
   * Useful for managing multiple Bitbucket instances or profiles.
   */
  async listStoredCredentials(): Promise<string[]> {
    return await this.storage.list();
  }
}
