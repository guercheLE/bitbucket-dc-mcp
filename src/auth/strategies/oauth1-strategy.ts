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

import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import OAuth from 'oauth-1.0a';
import open from 'open';
import type { Logger as PinoLogger } from 'pino';
import { Logger } from '../../core/logger.js';
import type { AuthConfig, AuthStrategy, Credentials } from '../auth-strategy.js';
import { AuthenticationError, InvalidCredentialsError } from '../errors.js';

/**
 * OAuth 1.0a configuration interface
 */
interface OAuth1Config {
  /** Consumer key from Bitbucket application link */
  consumer_key: string;

  /** Consumer secret from Bitbucket application link */
  consumer_secret: string;

  /** Callback URL for OAuth redirect (default: http://localhost:8080/callback) */
  callback_url?: string;

  /** Local callback server port (default: 8080) */
  callback_port?: number;

  /** Authentication timeout in minutes (default: 5) */
  timeout_minutes?: number;
}

/**
 * Extended AuthConfig with OAuth 1.0a-specific configuration
 */
interface OAuth1AuthConfig extends AuthConfig {
  oauth1?: OAuth1Config;
}

/**
 * OAuth 1.0a request token response
 */
interface RequestTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: string;
}

/**
 * OAuth 1.0a access token response
 */
interface AccessTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
}

// Constants
const DEFAULT_CALLBACK_PORT = 8080;
const DEFAULT_CALLBACK_URL = `http://localhost:${DEFAULT_CALLBACK_PORT}/callback`;

/**
 * Implements OAuth 1.0a three-legged authentication for Bitbucket Data Center.
 *
 * @see {@link https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/|Bitbucket OAuth 1.0a Documentation}
 */
export class OAuth1Strategy implements AuthStrategy {
  private logger: PinoLogger;
  private oauth: OAuth;
  private tokenSecrets: Map<string, string> = new Map();
  private callbackApp?: Express;
  private callbackServer?: Server;

  /**
   * Creates OAuth1Strategy instance
   *
   * @param logger - Pino logger instance for structured logging
   */
  constructor(logger?: PinoLogger) {
    this.logger = logger ?? Logger.getInstance();

    // Log deprecation warning
    this.logger.warn({
      msg: 'OAuth 1.0a is deprecated, consider upgrading to OAuth2 or PAT for better security and user experience',
      auth_method: 'oauth1',
    });

    // Initialize oauth instance (will be configured per request in authenticate)
    this.oauth = new OAuth({
      consumer: {
        key: '',
        secret: '',
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string): string {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });
  }

  /**
   * Perform OAuth 1.0a three-legged authentication flow
   *
   * @param config - Configuration containing consumer_key, consumer_secret, callback_url
   * @returns Promise resolving to valid OAuth 1.0a credentials
   * @throws {InvalidCredentialsError} If consumer credentials are missing
   * @throws {AuthenticationError} If authentication flow fails
   *
   * @remarks
   * **Flow steps:**
   * 1. Obtain request token from Bitbucket
   * 2. Generate authorization URL and open browser
   * 3. Wait for user authorization callback
   * 4. Exchange oauth_verifier for access token
   * 5. Validate token and return credentials
   */
  async authenticate(config: AuthConfig): Promise<Credentials> {
    const oauth1Config = (config as OAuth1AuthConfig).oauth1;

    if (!oauth1Config?.consumer_key || !oauth1Config?.consumer_secret) {
      throw new InvalidCredentialsError(
        'Consumer key and consumer secret are required for OAuth 1.0a authentication',
      );
    }

    this.logger.info({
      msg: 'OAuth 1.0a authentication flow started',
      bitbucket_url: config.bitbucket_url,
      consumer_key: oauth1Config.consumer_key,
    });

    try {
      const callbackUrl = oauth1Config.callback_url ?? DEFAULT_CALLBACK_URL;
      const callbackPort = oauth1Config.callback_port ?? DEFAULT_CALLBACK_PORT;
      const timeoutMinutes = oauth1Config.timeout_minutes ?? 5;

      // Step 1: Get request token
      const { oauth_token } = await this.getRequestToken(
        config.bitbucket_url,
        oauth1Config.consumer_key,
        oauth1Config.consumer_secret,
        callbackUrl,
      );

      // Step 2: Generate authorization URL
      const authUrl = this.generateAuthorizationURL(config.bitbucket_url, oauth_token);

      // Start callback server and wait for authorization
      const callbackPromise = this.startCallbackServerAndWaitForAuth(oauth_token, callbackPort);

      // Open browser with authorization URL
      this.logger.info({
        msg: 'Opening browser for OAuth 1.0a user authorization',
        auth_method: 'oauth1',
      });

      await open(authUrl);

      // Set up timeout
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(
          () => {
            reject(
              new AuthenticationError(
                `OAuth 1.0a authentication timed out after ${timeoutMinutes} minutes`,
              ),
            );
          },
          timeoutMinutes * 60 * 1000,
        );
      });

      // Wait for callback or timeout
      const oauth_verifier = await Promise.race([callbackPromise, timeoutPromise]);

      // Stop callback server
      await this.stopCallbackServer();

      // Retrieve token secret from storage
      const stored_token_secret = this.tokenSecrets.get(oauth_token);
      if (!stored_token_secret) {
        throw new AuthenticationError('Token secret not found for request token');
      }

      // Step 3: Exchange verifier for access token
      const { oauth_token: access_token, oauth_token_secret: access_token_secret } =
        await this.exchangeVerifierForAccessToken(
          config.bitbucket_url,
          oauth_token,
          stored_token_secret,
          oauth_verifier,
        );

      // Clean up token secret storage
      this.tokenSecrets.delete(oauth_token);

      // Step 4: Create credentials
      const credentials: Credentials = {
        bitbucket_url: config.bitbucket_url,
        auth_method: 'oauth1',
        consumer_key: oauth1Config.consumer_key,
        consumer_secret: oauth1Config.consumer_secret,
        oauth_token: access_token,
        oauth_token_secret: access_token_secret,
        expires_at: undefined, // OAuth 1.0a tokens do not expire automatically
      };

      // Step 5: Validate token (TODO: will be implemented in Task 5)
      // For now, just return credentials
      this.logger.info({
        msg: 'OAuth 1.0a authentication completed successfully',
        auth_method: 'oauth1',
        bitbucket_url: config.bitbucket_url,
      });

      return credentials;
    } catch (error) {
      // Ensure callback server is stopped on error
      await this.stopCallbackServer();

      if (error instanceof AuthenticationError || error instanceof InvalidCredentialsError) {
        throw error;
      }

      this.logger.error({
        msg: 'OAuth 1.0a authentication failed',
        bitbucket_url: config.bitbucket_url,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AuthenticationError(
        `OAuth 1.0a authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Step 1: Obtain request token from Bitbucket
   *
   * @param bitbucketUrl - Bitbucket instance URL
   * @param consumerKey - OAuth consumer key
   * @param consumerSecret - OAuth consumer secret
   * @param callbackUrl - Callback URL for OAuth redirect
   * @returns Request token and token secret
   * @throws {AuthenticationError} If request token cannot be obtained
   *
   * @remarks
   * **Request Token Endpoint:** `POST /plugins/servlet/oauth/request-token`
   *
   * **OAuth 1.0a Signature Parameters:**
   * - oauth_consumer_key
   * - oauth_signature_method (HMAC-SHA1)
   * - oauth_timestamp
   * - oauth_nonce
   * - oauth_version (1.0)
   * - oauth_signature (HMAC-SHA1 signature)
   * - oauth_callback
   *
   * **Response Format:** `oauth_token=...&oauth_token_secret=...&oauth_callback_confirmed=true`
   */
  private async getRequestToken(
    bitbucketUrl: string,
    consumerKey: string,
    consumerSecret: string,
    callbackUrl: string,
  ): Promise<RequestTokenResponse> {
    const requestTokenUrl = `${bitbucketUrl}/plugins/servlet/oauth/request-token`;

    // Initialize OAuth with consumer credentials
    this.oauth = new OAuth({
      consumer: {
        key: consumerKey,
        secret: consumerSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string): string {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    // Generate OAuth parameters
    const requestData = {
      url: requestTokenUrl,
      method: 'POST',
      data: { oauth_callback: callbackUrl },
    };

    const oauthHeaders = this.oauth.toHeader(
      this.oauth.authorize(requestData, { key: '', secret: '' }),
    );

    this.logger.debug({
      msg: 'Requesting OAuth 1.0a request token',
      url: requestTokenUrl,
      consumer_key: consumerKey,
    });

    try {
      const response = await fetch(requestTokenUrl, {
        method: 'POST',
        headers: {
          ...oauthHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `oauth_callback=${encodeURIComponent(callbackUrl)}`,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error({
          msg: 'OAuth 1.0a request token failed',
          status: response.status,
          error: errorText,
        });

        throw new AuthenticationError(
          `Failed to obtain request token: ${response.status} - ${errorText}`,
        );
      }

      const responseText = await response.text();
      const params = new URLSearchParams(responseText);

      const oauth_token = params.get('oauth_token');
      const oauth_token_secret = params.get('oauth_token_secret');
      const oauth_callback_confirmed = params.get('oauth_callback_confirmed');

      if (!oauth_token || !oauth_token_secret) {
        this.logger.error({
          msg: 'Malformed OAuth 1.0a request token response',
          response: responseText,
        });

        throw new AuthenticationError('Malformed request token response from Bitbucket');
      }

      if (oauth_callback_confirmed !== 'true') {
        this.logger.warn({
          msg: 'OAuth callback not confirmed by Bitbucket',
          oauth_callback_confirmed,
        });
      }

      // Store token secret for later use in access token exchange
      this.tokenSecrets.set(oauth_token, oauth_token_secret);

      this.logger.info({
        msg: 'OAuth 1.0a request token obtained',
        oauth_token,
        oauth_callback_confirmed,
      });

      this.logger.warn({
        msg: 'OAuth 1.0a is deprecated, consider upgrading to OAuth2 or PAT for better security',
        bitbucket_url: bitbucketUrl,
      });

      return {
        oauth_token,
        oauth_token_secret,
        oauth_callback_confirmed: oauth_callback_confirmed ?? 'false',
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      this.logger.error({
        msg: 'Error obtaining OAuth 1.0a request token',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AuthenticationError(
        `Failed to obtain request token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Step 2: Generate authorization URL for user approval
   *
   * @param bitbucketUrl - Bitbucket instance URL
   * @param requestToken - OAuth request token obtained from Step 1
   * @returns Authorization URL to redirect user
   *
   * @remarks
   * **Authorization Endpoint:** `GET /plugins/servlet/oauth/authorize?oauth_token={requestToken}`
   *
   * User will be redirected to Bitbucket login page to authorize the OAuth request.
   * After authorization, Bitbucket redirects back to callback URL with:
   * - oauth_token (same as request token)
   * - oauth_verifier (authorization code)
   */
  private generateAuthorizationURL(bitbucketUrl: string, requestToken: string): string {
    const authUrl = `${bitbucketUrl}/plugins/servlet/oauth/authorize?oauth_token=${requestToken}`;

    this.logger.info({
      msg: 'Generated OAuth 1.0a authorization URL',
      oauth_token: requestToken,
    });

    return authUrl;
  }

  /**
   * Step 3: Start local callback server and wait for user authorization
   *
   * @param requestToken - OAuth request token to validate callback
   * @param port - Port for callback server (default: 8080)
   * @returns Promise resolving to oauth_verifier from callback
   * @throws {AuthenticationError} If callback fails or times out
   *
   * @remarks
   * Starts Express server on localhost to receive OAuth callback.
   * Waits for user to authorize in browser and Bitbucket to redirect with verifier.
   * Returns oauth_verifier needed for access token exchange.
   */
  private async startCallbackServerAndWaitForAuth(
    requestToken: string,
    port: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.callbackApp = express();

      // Health check endpoint
      this.callbackApp.get('/', (_req: ExpressRequest, res: ExpressResponse) => {
        res.send('OAuth 1.0a callback server is running. Waiting for authorization...');
      });

      // OAuth callback endpoint
      this.callbackApp.get('/callback', (req: ExpressRequest, res: ExpressResponse) => {
        const { oauth_token, oauth_verifier } = req.query;

        // Validate required params
        if (!oauth_token || typeof oauth_token !== 'string') {
          this.logger.error({
            msg: 'Callback received without oauth_token',
            auth_method: 'oauth1',
          });

          res.status(400).send(`
            <html>
              <head><title>OAuth Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">❌ Authentication Failed</h1>
                <p>OAuth token is missing. Please try again.</p>
              </body>
            </html>
          `);

          reject(new AuthenticationError('OAuth token missing from callback'));
          return;
        }

        if (!oauth_verifier || typeof oauth_verifier !== 'string') {
          this.logger.error({
            msg: 'Callback received without oauth_verifier',
            auth_method: 'oauth1',
            oauth_token,
          });

          res.status(400).send(`
            <html>
              <head><title>OAuth Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">❌ Authentication Failed</h1>
                <p>OAuth verifier is missing. Please try again.</p>
              </body>
            </html>
          `);

          reject(new AuthenticationError('OAuth verifier missing from callback'));
          return;
        }

        // Validate oauth_token matches request token
        if (oauth_token !== requestToken) {
          this.logger.error({
            msg: 'Callback received with mismatched oauth_token',
            auth_method: 'oauth1',
            expected: requestToken,
            received: oauth_token,
          });

          res.status(400).send(`
            <html>
              <head><title>OAuth Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">❌ Authentication Failed</h1>
                <p>OAuth token mismatch. Please try again.</p>
              </body>
            </html>
          `);

          reject(new AuthenticationError('OAuth token mismatch in callback'));
          return;
        }

        this.logger.info({
          msg: 'Callback received with oauth_verifier',
          auth_method: 'oauth1',
          oauth_token,
        });

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

        // Resolve with oauth_verifier
        resolve(oauth_verifier);
      });

      // Start server
      this.callbackServer = this.callbackApp.listen(port, () => {
        this.logger.info({
          msg: `OAuth 1.0a callback server started on port ${port}`,
          auth_method: 'oauth1',
          port,
        });
      });

      // Handle server errors
      this.callbackServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          this.logger.error({
            msg: `Port ${port} is already in use`,
            auth_method: 'oauth1',
            port,
          });

          reject(
            new AuthenticationError(
              `Port ${port} is already in use. Please close other applications or configure a different callback port.`,
            ),
          );
        } else {
          this.logger.error({
            msg: 'Callback server error',
            auth_method: 'oauth1',
            error: error.message,
          });

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
            this.logger.info({
              msg: 'OAuth 1.0a callback server stopped',
              auth_method: 'oauth1',
            });

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
   * Step 4: Exchange oauth_verifier for access token
   *
   * @param bitbucketUrl - Bitbucket instance URL
   * @param oauth_token - OAuth request token from Step 1
   * @param oauth_token_secret - OAuth token secret from Step 1
   * @param oauth_verifier - Verification code from user authorization
   * @returns Access token and token secret
   * @throws {AuthenticationError} If token exchange fails
   *
   * @remarks
   * **Access Token Endpoint:** `POST /plugins/servlet/oauth/access-token`
   *
   * **OAuth 1.0a Signature Parameters:**
   * - oauth_consumer_key
   * - oauth_token (request token)
   * - oauth_signature (generated with token secret + verifier)
   * - oauth_verifier
   * - oauth_signature_method (HMAC-SHA1)
   * - oauth_timestamp
   * - oauth_nonce
   * - oauth_version (1.0)
   *
   * **Response Format:** `oauth_token=...&oauth_token_secret=...`
   */
  private async exchangeVerifierForAccessToken(
    bitbucketUrl: string,
    oauth_token: string,
    oauth_token_secret: string,
    oauth_verifier: string,
  ): Promise<AccessTokenResponse> {
    const accessTokenUrl = `${bitbucketUrl}/plugins/servlet/oauth/access-token`;

    // Generate OAuth parameters with token and verifier
    const requestData = {
      url: accessTokenUrl,
      method: 'POST',
      data: { oauth_verifier },
    };

    const tokenCredentials = {
      key: oauth_token,
      secret: oauth_token_secret,
    };

    const oauthHeaders = this.oauth.toHeader(this.oauth.authorize(requestData, tokenCredentials));

    this.logger.debug({
      msg: 'Exchanging oauth_verifier for access token',
      auth_method: 'oauth1',
      url: accessTokenUrl,
    });

    try {
      const response = await fetch(accessTokenUrl, {
        method: 'POST',
        headers: {
          ...oauthHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `oauth_verifier=${encodeURIComponent(oauth_verifier)}`,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error({
          msg: 'OAuth 1.0a access token exchange failed',
          status: response.status,
          error: errorText,
        });

        throw new AuthenticationError(
          `Failed to exchange verifier for access token: ${response.status} - ${errorText}`,
        );
      }

      const responseText = await response.text();
      const params = new URLSearchParams(responseText);

      const access_token = params.get('oauth_token');
      const access_token_secret = params.get('oauth_token_secret');

      if (!access_token || !access_token_secret) {
        this.logger.error({
          msg: 'Malformed OAuth 1.0a access token response',
          response: responseText,
        });

        throw new AuthenticationError('Malformed access token response from Bitbucket');
      }

      this.logger.info({
        msg: 'OAuth 1.0a access token obtained',
        auth_method: 'oauth1',
      });

      return {
        oauth_token: access_token,
        oauth_token_secret: access_token_secret,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      this.logger.error({
        msg: 'Error exchanging verifier for access token',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AuthenticationError(
        `Failed to exchange verifier for access token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * OAuth 1.0a tokens do not support refresh - re-authentication required
   *
   * @param credentials - Current OAuth 1.0a credentials
   * @throws {AuthenticationError} Always throws as refresh is not supported
   *
   * @remarks
   * OAuth 1.0a access tokens do not expire automatically and cannot be refreshed.
   * If a token is invalid or revoked, full re-authentication is required.
   */
  async refreshToken(credentials: Credentials): Promise<Credentials> {
    this.logger.error({
      msg: 'OAuth 1.0a tokens do not support refresh, re-authentication required',
      bitbucket_url: credentials.bitbucket_url,
      auth_method: credentials.auth_method,
    });

    throw new AuthenticationError(
      'OAuth 1.0a tokens do not support refresh, re-authentication required',
    );
  }

  /**
   * Generate OAuth 1.0a authorization headers for API requests
   *
   * @param credentials - OAuth 1.0a credentials
   * @param requestMethod - HTTP method (GET, POST, PUT, DELETE)
   * @param requestUrl - Full request URL
   * @param requestBody - Request body params (for POST/PUT)
   * @returns Authorization headers with OAuth signature
   *
   * @remarks
   * **Critical:** OAuth 1.0a requires a NEW signature for EVERY request.
   * The signature is generated using:
   * - Consumer key and secret
   * - Access token and token secret
   * - HTTP method, URL, and body params
   * - Timestamp and nonce (unique per request)
   *
   * This is fundamentally different from OAuth2 Bearer tokens which
   * are static strings that can be reused.
   */
  getAuthHeaders(
    credentials: Credentials,
    requestMethod: string,
    requestUrl: string,
    requestBody?: Record<string, unknown>,
  ): Record<string, string> {
    if (!credentials.consumer_key || !credentials.consumer_secret) {
      throw new InvalidCredentialsError('Consumer key and secret required for OAuth 1.0a');
    }

    if (!credentials.oauth_token || !credentials.oauth_token_secret) {
      throw new InvalidCredentialsError('OAuth token and token secret required');
    }

    // Reinitialize oauth with consumer credentials if needed
    this.oauth = new OAuth({
      consumer: {
        key: credentials.consumer_key,
        secret: credentials.consumer_secret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string): string {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    // Prepare request data for signature
    const requestData = {
      url: requestUrl,
      method: requestMethod.toUpperCase(),
      data: requestBody ?? {},
    };

    const tokenCredentials = {
      key: credentials.oauth_token,
      secret: credentials.oauth_token_secret,
    };

    // Generate OAuth signature
    const oauthHeaders = this.oauth.toHeader(this.oauth.authorize(requestData, tokenCredentials));

    this.logger.debug({
      msg: 'Generated OAuth 1.0a authorization headers',
      auth_method: 'oauth1',
      method: requestMethod,
      url: requestUrl,
    });

    return {
      ...oauthHeaders,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate OAuth 1.0a credentials and check token validity with Bitbucket
   *
   * @param credentials - Credentials to validate
   * @returns Promise resolving to true if credentials are valid
   *
   * @remarks
   * **Validation steps:**
   * 1. Structure check: all required OAuth 1.0a fields present
   * 2. API validation: GET /rest/api/latest/profile/recent/repos with OAuth headers
   * 3. If 200 OK, token is valid
   * 4. If 401 Unauthorized, token is invalid or revoked
   *
   * This method DOES make API calls to validate token at runtime.
   */
  async validateCredentialsWithBitbucket(credentials: Credentials): Promise<boolean> {
    // First check structure
    if (!this.validateCredentials(credentials)) {
      return false;
    }

    // Validate token with Bitbucket API
    const validateUrl = `${credentials.bitbucket_url}/rest/api/latest/profile/recent/repos?limit=1`;

    try {
      const headers = this.getAuthHeaders(credentials, 'GET', validateUrl);

      const response = await fetch(validateUrl, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const userData = (await response.json()) as { displayName?: string; name?: string };
        this.logger.info({
          msg: 'OAuth 1.0a token validated successfully',
          auth_method: 'oauth1',
          bitbucket_url: credentials.bitbucket_url,
          user: userData.displayName || userData.name,
        });

        return true;
      }

      if (response.status === 401) {
        this.logger.warn({
          msg: 'OAuth 1.0a token validation failed - 401 Unauthorized',
          auth_method: 'oauth1',
          bitbucket_url: credentials.bitbucket_url,
        });

        return false;
      }

      this.logger.error({
        msg: 'OAuth 1.0a token validation failed with unexpected status',
        auth_method: 'oauth1',
        status: response.status,
        statusText: response.statusText,
      });

      return false;
    } catch (error) {
      this.logger.error({
        msg: 'Error validating OAuth 1.0a token',
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Validate OAuth 1.0a credentials structure (synchronous check)
   *
   * @param credentials - Credentials to validate
   * @returns true if all required OAuth 1.0a fields are present
   *
   * @remarks
   * **Validation checks:**
   * - auth_method is 'oauth1'
   * - consumer_key is present
   * - consumer_secret is present
   * - oauth_token is present (access token)
   * - oauth_token_secret is present
   *
   * This is a synchronous structure check only.
   * Use validateCredentialsWithBitbucket() for runtime token validity checks.
   */
  validateCredentials(credentials: Credentials): boolean {
    // TODO: Implement full validation in Task 5
    return (
      credentials.auth_method === 'oauth1' &&
      !!credentials.consumer_key &&
      !!credentials.consumer_secret &&
      !!credentials.oauth_token &&
      !!credentials.oauth_token_secret
    );
  }
}
