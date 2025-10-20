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

import express, { type Express, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import open from 'open';
import type { Logger as PinoLogger } from 'pino';
import { Logger } from '../../core/logger.js';
import type { AuthConfig, AuthStrategy, Credentials } from '../auth-strategy.js';
import { AuthenticationError, TokenExpiredError } from '../errors.js';

/**
 * OAuth 2.0 configuration interface
 */
interface OAuth2Config {
  /** OAuth2 client ID from Bitbucket application */
  client_id: string;

  /** OAuth2 client secret from Bitbucket application */
  client_secret: string;

  /** Callback URL for OAuth redirect (default: http://localhost:8080/callback) */
  redirect_uri?: string;

  /** Local callback server port (default: 8080) */
  callback_port?: number;

  /** OAuth2 scope (default: read:bitbucket-user read:bitbucket-work write:bitbucket-work) */
  scope?: string;

  /** Authentication timeout in minutes (default: 5) */
  timeout_minutes?: number;
}

/**
 * Extended AuthConfig with OAuth2-specific configuration
 */
interface OAuth2AuthConfig extends AuthConfig {
  oauth2?: OAuth2Config;
}

/**
 * PKCE (Proof Key for Code Exchange) parameters for OAuth 2.0 flow
 *
 * @remarks
 * PKCE mitigates authorization code interception attacks by binding
 * the authorization code to the client that requested it.
 */
interface PKCEParams {
  /** Random 128-character string used as the secret */
  code_verifier: string;

  /** SHA256 hash of code_verifier, base64url encoded */
  code_challenge: string;

  /** Random string for CSRF protection */
  state: string;
}

/**
 * OAuth 2.0 token response from Bitbucket token endpoint
 */
interface TokenResponse {
  /** Bearer token for API authentication */
  access_token: string;

  /** Token for refreshing access_token when expired */
  refresh_token: string;

  /** Token lifetime in seconds */
  expires_in: number;

  /** Token type (always 'Bearer' for OAuth2) */
  token_type: 'Bearer';

  /** Space-separated list of granted scopes */
  scope: string;
}

/**
 * OAuth 2.0 Authentication Strategy with PKCE support
 *
 * @remarks
 * Implements OAuth 2.0 Authorization Code flow with PKCE (RFC 7636)
 * for secure authentication with Bitbucket Data Center.
 *
 * **OAuth 2.0 PKCE Flow:**
 * 1. Generate PKCE parameters (code_verifier, code_challenge, state)
 * 2. Generate authorization URL with code_challenge
 * 3. Start local HTTP callback server
 * 4. Open browser with authorization URL
 * 5. User logs in and approves OAuth app in Bitbucket
 * 6. Bitbucket redirects to callback with authorization code
 * 7. Exchange code for access_token using code_verifier
 * 8. Validate token with Bitbucket API
 * 9. Store credentials (access_token, refresh_token, expires_at)
 *
 * **Security Features:**
 * - PKCE prevents authorization code interception attacks
 * - State parameter provides CSRF protection
 * - Token refresh extends session without re-authentication
 * - Sensitive data (tokens, verifier) never logged
 *
 * @example
 * ```typescript
 * const strategy = new OAuth2Strategy(config, logger);
 * const credentials = await strategy.authenticate(authConfig);
 *
 * // Later, when token expires
 * const refreshed = await strategy.refreshToken(credentials);
 * ```
 */
export class OAuth2Strategy implements AuthStrategy {
  private readonly logger: PinoLogger;

  // In-memory storage for PKCE params during OAuth flow
  // Keyed by state string for CSRF validation
  private readonly pkceStore = new Map<string, PKCEParams>();

  // Callback server instance
  private callbackServer?: Server;
  private callbackApp?: Express;

  // OAuth2-specific configuration constants
  private static readonly DEFAULT_CALLBACK_PORT = 8080;
  private static readonly DEFAULT_SCOPE = 'read:bitbucket-user read:bitbucket-work write:bitbucket-work';
  private static readonly DEFAULT_TIMEOUT_MINUTES = 5;
  private static readonly CODE_VERIFIER_LENGTH = 128;
  private static readonly STATE_LENGTH = 32;

  /**
   * Creates OAuth2Strategy instance
   *
   * @param config - Application configuration
   * @param logger - Logger instance for structured logging
   */
  constructor(
    private readonly config: OAuth2AuthConfig,
    logger?: PinoLogger,
  ) {
    this.logger = logger ?? Logger.getInstance();
  }

  /**
   * Perform OAuth 2.0 authentication flow
   *
   * @param config - Authentication configuration
   * @returns Promise resolving to valid credentials
   * @throws {AuthenticationError} If authentication fails
   *
   * @remarks
   * This method orchestrates the complete OAuth2 PKCE flow:
   * 1. Generate PKCE parameters
   * 2. Generate authorization URL
   * 3. Start callback server
   * 4. Open browser for user authentication
   * 5. Wait for callback with authorization code
   * 6. Exchange code for access token
   * 7. Validate token with Bitbucket
   * 8. Stop callback server
   * 9. Return credentials
   */
  async authenticate(config: OAuth2AuthConfig): Promise<Credentials> {
    this.logger.info(
      {
        auth_method: 'oauth2',
        bitbucket_url: config.bitbucket_url,
      },
      'OAuth2 authentication initiated',
    );

    const timeoutMinutes = config.oauth2?.timeout_minutes ?? OAuth2Strategy.DEFAULT_TIMEOUT_MINUTES;
    const callbackPort = config.oauth2?.callback_port ?? OAuth2Strategy.DEFAULT_CALLBACK_PORT;

    try {
      // Step 1: Generate PKCE params
      const pkceParams = this.generatePKCEParams();

      // Step 2: Generate authorization URL
      const authUrl = this.generateAuthorizationURL(pkceParams);

      // Step 3 & 5: Start callback server and wait for callback
      const callbackPromise = this.startCallbackServer(callbackPort);

      // Step 4: Open browser with authorization URL
      this.logger.info(
        {
          auth_method: 'oauth2',
          auth_url: authUrl,
        },
        'Opening browser for authentication',
      );

      await open(authUrl);

      // Wait for callback with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => {
            reject(
              new AuthenticationError(
                `OAuth2 authentication timed out after ${timeoutMinutes} minutes`,
              ),
            );
          },
          timeoutMinutes * 60 * 1000,
        );
      });

      const { code, state } = await Promise.race([callbackPromise, timeoutPromise]);

      // Retrieve PKCE params using state
      const storedPkce = this.pkceStore.get(state);
      if (!storedPkce) {
        throw new AuthenticationError('PKCE parameters not found for state');
      }

      // Clean up PKCE store
      this.pkceStore.delete(state);

      // Step 6: Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(code, storedPkce.code_verifier);

      // Calculate expiration
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Step 9: Create credentials
      const credentials: Credentials = {
        bitbucket_url: config.bitbucket_url,
        auth_method: 'oauth2',
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: expiresAt,
      };

      // Step 7: Validate token with Bitbucket
      const isValid = await this.validateTokenWithBitbucket(credentials);
      if (!isValid) {
        throw new AuthenticationError('Token validation with Bitbucket failed');
      }

      // Step 8: Stop callback server
      await this.stopCallbackServer();

      this.logger.info(
        {
          auth_method: 'oauth2',
          expires_at: expiresAt,
        },
        'OAuth2 authentication completed successfully',
      );

      return credentials;
    } catch (error) {
      // Ensure callback server is stopped on error
      await this.stopCallbackServer();

      if (error instanceof AuthenticationError) {
        throw error;
      }

      this.logger.error(
        {
          auth_method: 'oauth2',
          error: error instanceof Error ? error.message : String(error),
        },
        'OAuth2 authentication failed',
      );

      throw new AuthenticationError(
        `OAuth2 authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate OAuth2 credentials
   *
   * @param credentials - Credentials to validate
   * @returns true if credentials are valid, false otherwise
   *
   * @remarks
   * Performs synchronous validation checking:
   * - access_token is present
   * - expires_at is in the future (if present)
   *
   * Does NOT make API calls - use validateTokenWithBitbucket() for that.
   */
  validateCredentials(credentials: Credentials): boolean {
    // Check if access_token exists and is not empty
    if (!credentials.access_token || credentials.access_token.trim() === '') {
      this.logger.debug(
        {
          auth_method: 'oauth2',
          reason: 'missing_access_token',
        },
        'Credential validation failed',
      );

      return false;
    }

    // Check if token is expired (if expires_at is present)
    if (credentials.expires_at) {
      const now = new Date();
      if (credentials.expires_at <= now) {
        this.logger.debug(
          {
            auth_method: 'oauth2',
            expires_at: credentials.expires_at,
            reason: 'token_expired',
          },
          'Credential validation failed',
        );

        return false;
      }
    }

    this.logger.debug(
      {
        auth_method: 'oauth2',
        expires_at: credentials.expires_at,
      },
      'Credentials validated successfully',
    );

    return true;
  }

  /**
   * Validate OAuth2 token with Bitbucket API
   *
   * @param credentials - Credentials to validate
   * @returns Promise resolving to true if token is valid, false otherwise
   *
   * @remarks
   * Makes actual API call to Bitbucket to verify token is valid.
   * Calls GET /rest/api/latest/profile/recent/repos to test authentication.
   *
   * Use this for remote validation when you need to be certain
   * the token is accepted by Bitbucket (not just locally valid).
   */
  private async validateTokenWithBitbucket(credentials: Credentials): Promise<boolean> {
    const bitbucketUrl = credentials.bitbucket_url;
    const endpoint = `${bitbucketUrl}/rest/api/latest/profile/recent/repos?limit=1`;

    try {
      this.logger.debug(
        {
          auth_method: 'oauth2',
          endpoint,
        },
        'Validating token with Bitbucket API',
      );

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const user = (await response.json()) as { name?: string; displayName?: string };

        this.logger.info(
          {
            auth_method: 'oauth2',
            username: user.name || user.displayName,
          },
          'Token validated successfully with Bitbucket',
        );

        return true;
      }

      if (response.status === 401) {
        this.logger.warn(
          {
            auth_method: 'oauth2',
            status: 401,
          },
          'Token validation failed - 401 Unauthorized',
        );

        return false;
      }

      this.logger.warn(
        {
          auth_method: 'oauth2',
          status: response.status,
        },
        'Token validation returned unexpected status',
      );

      return false;
    } catch (error) {
      this.logger.error(
        {
          auth_method: 'oauth2',
          error: error instanceof Error ? error.message : String(error),
        },
        'Token validation request failed',
      );

      return false;
    }
  }

  /**
   * Generate PKCE parameters for OAuth 2.0 flow
   *
   * @returns PKCE parameters with code_verifier, code_challenge, and state
   *
   * @remarks
   * PKCE (Proof Key for Code Exchange) prevents authorization code interception:
   * - code_verifier: 128-char cryptographically random string
   * - code_challenge: SHA256(code_verifier), base64url encoded
   * - state: 32-char random string for CSRF protection
   *
   * The code_challenge is sent in the authorization URL, while the
   * code_verifier is kept secret and sent during token exchange.
   *
   * PKCE params are stored in-memory keyed by state for callback validation.
   */
  private generatePKCEParams(): PKCEParams {
    // Generate cryptographically secure random code_verifier (128 chars)
    const code_verifier = this.generateRandomString(OAuth2Strategy.CODE_VERIFIER_LENGTH);

    // Generate code_challenge: SHA256(code_verifier) in base64url format
    const code_challenge = this.base64UrlEncode(
      crypto.createHash('sha256').update(code_verifier).digest(),
    );

    // Generate state for CSRF protection
    const state = this.generateRandomString(OAuth2Strategy.STATE_LENGTH);

    const pkceParams: PKCEParams = {
      code_verifier,
      code_challenge,
      state,
    };

    // Store PKCE params for callback validation
    this.pkceStore.set(state, pkceParams);

    this.logger.debug(
      {
        auth_method: 'oauth2',
        state,
        code_challenge,
        code_challenge_method: 'S256',
      },
      'Generated PKCE parameters',
    );

    return pkceParams;
  }

  /**
   * Generate authorization URL for OAuth 2.0 flow
   *
   * @param pkce - PKCE parameters from generatePKCEParams()
   * @returns Authorization URL to redirect user
   *
   * @remarks
   * Constructs Bitbucket OAuth authorization URL with:
   * - response_type=code (authorization code flow)
   * - client_id, redirect_uri, scope (from config)
   * - state (CSRF protection)
   * - code_challenge, code_challenge_method=S256 (PKCE)
   */
  private generateAuthorizationURL(pkce: PKCEParams): string {
    const bitbucketUrl = this.config.bitbucket_url;
    const clientId = this.config.oauth2?.client_id ?? '';
    const redirectUri =
      this.config.oauth2?.redirect_uri ??
      `http://localhost:${OAuth2Strategy.DEFAULT_CALLBACK_PORT}/callback`;
    const scope = this.config.oauth2?.scope ?? OAuth2Strategy.DEFAULT_SCOPE;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: pkce.state,
      code_challenge: pkce.code_challenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${bitbucketUrl}/plugins/servlet/oauth/authorize?${params.toString()}`;

    this.logger.info(
      {
        auth_method: 'oauth2',
        bitbucket_url: bitbucketUrl,
        state: pkce.state,
        code_challenge: pkce.code_challenge,
      },
      'Generated OAuth2 authorization URL',
    );

    return authUrl;
  }

  /**
   * Generate cryptographically secure random string
   *
   * @param length - Length of random string
   * @returns Random string using URL-safe characters
   */
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomBytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      result += charset[randomBytes[i] % charset.length];
    }

    return result;
  }

  /**
   * Base64URL encode a buffer
   *
   * @param buffer - Buffer to encode
   * @returns Base64URL encoded string
   *
   * @remarks
   * Base64URL encoding replaces + with -, / with _, and removes padding =
   * This is required for OAuth 2.0 PKCE specification.
   */
  private base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Start local HTTP callback server for OAuth redirect
   *
   * @param port - Port number for callback server (default: 8080)
   * @returns Promise resolving when server is listening
   *
   * @remarks
   * Starts Express server on localhost to receive OAuth callback.
   * Server handles GET /callback with authorization code.
   * Returns Promise that resolves with authorization code when callback received.
   */
  private async startCallbackServer(port: number): Promise<{ code: string; state: string }> {
    return new Promise((resolve, reject) => {
      this.callbackApp = express();

      // Health check endpoint
      this.callbackApp.get('/', (_req: Request, res: Response) => {
        res.send('OAuth2 callback server is running. Waiting for authorization...');
      });

      // OAuth callback endpoint
      this.callbackApp.get('/callback', (req: Request, res: Response) => {
        const { code, state } = req.query;

        // Validate required params
        if (!code || typeof code !== 'string') {
          this.logger.error(
            {
              auth_method: 'oauth2',
              error: 'missing_code',
            },
            'Callback received without authorization code',
          );

          res.status(400).send(`
            <html>
              <head><title>OAuth Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">❌ Authentication Failed</h1>
                <p>Authorization code is missing. Please try again.</p>
              </body>
            </html>
          `);

          reject(new AuthenticationError('Authorization code missing from callback'));
          return;
        }

        if (!state || typeof state !== 'string') {
          this.logger.error(
            {
              auth_method: 'oauth2',
              error: 'missing_state',
            },
            'Callback received without state parameter',
          );

          res.status(400).send(`
            <html>
              <head><title>OAuth Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">❌ Authentication Failed</h1>
                <p>State parameter is missing (CSRF protection). Please try again.</p>
              </body>
            </html>
          `);

          reject(new AuthenticationError('State parameter missing from callback'));
          return;
        }

        // Validate state (CSRF protection)
        const pkceParams = this.pkceStore.get(state);
        if (!pkceParams) {
          this.logger.error(
            {
              auth_method: 'oauth2',
              state,
              error: 'invalid_state',
            },
            'Callback received with invalid state (CSRF attack?)',
          );

          res.status(400).send(`
            <html>
              <head><title>OAuth Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">❌ Authentication Failed</h1>
                <p>Invalid state parameter (possible CSRF attack). Please try again.</p>
              </body>
            </html>
          `);

          reject(new AuthenticationError('Invalid state parameter - possible CSRF attack'));
          return;
        }

        this.logger.info(
          {
            auth_method: 'oauth2',
            state,
          },
          'Callback received with valid state',
        );

        // Success response
        res.send(`
          <html>
            <head><title>OAuth Success</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #4caf50;">✓ Authentication Successful!</h1>
              <p>You can close this window and return to the application.</p>
            </body>
          </html>
        `);

        // Resolve with authorization code and state
        resolve({ code, state });
      });

      // Start server
      this.callbackServer = this.callbackApp.listen(port, () => {
        this.logger.info(
          {
            auth_method: 'oauth2',
            port,
          },
          `Callback server started on port ${port}`,
        );
      });

      // Handle server errors
      this.callbackServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          this.logger.error(
            {
              auth_method: 'oauth2',
              port,
              error: 'port_in_use',
            },
            `Port ${port} is already in use`,
          );

          reject(
            new AuthenticationError(
              `Port ${port} is already in use. Please close other applications or configure a different callback port.`,
            ),
          );
        } else {
          this.logger.error(
            {
              auth_method: 'oauth2',
              port,
              error: error.message,
            },
            'Callback server error',
          );

          reject(new AuthenticationError(`Failed to start callback server: ${error.message}`));
        }
      });
    });
  }

  /**
   * Stop callback server gracefully
   *
   * @remarks
   * Closes HTTP server and cleans up resources.
   * Should be called after successful callback or timeout.
   */
  private async stopCallbackServer(): Promise<void> {
    if (this.callbackServer) {
      return new Promise((resolve) => {
        const server = this.callbackServer;
        if (server) {
          server.close(() => {
            this.logger.info(
              {
                auth_method: 'oauth2',
              },
              'Callback server stopped',
            );

            this.callbackServer = undefined;
            this.callbackApp = undefined;
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
  }

  /**
   * Exchange authorization code for access token
   *
   * @param code - Authorization code from callback
   * @param codeVerifier - PKCE code verifier (secret)
   * @returns Promise resolving to token response
   * @throws {AuthenticationError} If token exchange fails
   *
   * @remarks
   * Makes POST request to Bitbucket token endpoint with:
   * - grant_type=authorization_code
   * - code, redirect_uri, client_id, client_secret
   * - code_verifier (PKCE)
   *
   * Bitbucket validates code_verifier matches code_challenge from authorization.
   */
  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    const bitbucketUrl = this.config.bitbucket_url;
    const clientId = this.config.oauth2?.client_id ?? '';
    const clientSecret = this.config.oauth2?.client_secret ?? '';
    const redirectUri =
      this.config.oauth2?.redirect_uri ??
      `http://localhost:${OAuth2Strategy.DEFAULT_CALLBACK_PORT}/callback`;

    const tokenEndpoint = `${bitbucketUrl}/plugins/servlet/oauth/token`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier,
    });

    try {
      this.logger.debug(
        {
          auth_method: 'oauth2',
          endpoint: tokenEndpoint,
        },
        'Exchanging authorization code for token',
      );

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          {
            auth_method: 'oauth2',
            status: response.status,
            error: errorText,
          },
          'Token exchange failed',
        );

        throw new AuthenticationError(
          `Token exchange failed: ${response.status} ${response.statusText}`,
        );
      }

      const tokenResponse = (await response.json()) as TokenResponse;

      this.logger.info(
        {
          auth_method: 'oauth2',
          expires_in: tokenResponse.expires_in,
          scope: tokenResponse.scope,
        },
        'Access token obtained successfully',
      );

      return tokenResponse;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      this.logger.error(
        {
          auth_method: 'oauth2',
          error: error instanceof Error ? error.message : String(error),
        },
        'Token exchange request failed',
      );

      throw new AuthenticationError(
        `Failed to exchange authorization code: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Refresh expired OAuth2 access token
   *
   * @param credentials - Current credentials containing refresh_token
   * @returns Promise resolving to refreshed credentials
   * @throws {TokenExpiredError} If refresh token is invalid or expired
   *
   * @remarks
   * Makes POST request to Bitbucket token endpoint with:
   * - grant_type=refresh_token
   * - refresh_token, client_id, client_secret
   *
   * Returns new credentials with updated access_token and expires_at.
   */
  async refreshToken(credentials: Credentials): Promise<Credentials> {
    this.logger.info(
      {
        auth_method: 'oauth2',
        bitbucket_url: credentials.bitbucket_url,
      },
      'OAuth2 token refresh initiated',
    );

    if (!credentials.refresh_token) {
      throw new TokenExpiredError('Refresh token is missing');
    }

    const bitbucketUrl = credentials.bitbucket_url;
    const clientId = this.config.oauth2?.client_id ?? '';
    const clientSecret = this.config.oauth2?.client_secret ?? '';
    const tokenEndpoint = `${bitbucketUrl}/plugins/servlet/oauth/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    });

    try {
      this.logger.debug(
        {
          auth_method: 'oauth2',
          endpoint: tokenEndpoint,
        },
        'Refreshing access token',
      );

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check for specific error types
        if (response.status === 400 || response.status === 401) {
          this.logger.error(
            {
              auth_method: 'oauth2',
              status: response.status,
              error: errorText,
            },
            'Refresh token expired, re-authentication required',
          );

          throw new TokenExpiredError(
            'Refresh token expired or invalid, re-authentication required',
          );
        }

        this.logger.error(
          {
            auth_method: 'oauth2',
            status: response.status,
            error: errorText,
          },
          'Token refresh failed',
        );

        throw new AuthenticationError(
          `Token refresh failed: ${response.status} ${response.statusText}`,
        );
      }

      const tokenResponse = (await response.json()) as TokenResponse;

      // Calculate new expiration
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      this.logger.info(
        {
          auth_method: 'oauth2',
          expires_at: expiresAt,
          scope: tokenResponse.scope,
        },
        'Access token refreshed successfully',
      );

      return {
        ...credentials,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: expiresAt,
      };
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof AuthenticationError) {
        throw error;
      }

      this.logger.error(
        {
          auth_method: 'oauth2',
          error: error instanceof Error ? error.message : String(error),
        },
        'Token refresh request failed',
      );

      throw new AuthenticationError(
        `Failed to refresh token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
