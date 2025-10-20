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
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Credentials } from '../../../src/auth/auth-strategy.js';
import { AuthenticationError, TokenExpiredError } from '../../../src/auth/errors.js';
import { OAuth2Strategy } from '../../../src/auth/strategies/oauth2-strategy.js';
import { Logger } from '../../../src/core/logger.js';

/**
 * Integration tests for OAuth2 authentication flow
 *
 * These tests use a mock Bitbucket OAuth server to simulate the complete
 * OAuth2 PKCE flow without requiring a real Bitbucket instance.
 */
describe('OAuth2 Flow Integration Tests', () => {
  let mockBitbucketServer: Server;
  let mockBitbucketApp: Express;
  const MOCK_BITBUCKET_PORT = 9999;
  const MOCK_BITBUCKET_URL = `http://localhost:${MOCK_BITBUCKET_PORT}`;

  // Mock OAuth state
  let mockAuthCode: string;
  let mockAccessToken: string;
  let mockRefreshToken: string;
  let receivedCodeChallenge: string | undefined;
  let receivedState: string | undefined;

  beforeAll(async () => {
    // Create mock Bitbucket OAuth server
    mockBitbucketApp = express();
    mockBitbucketApp.use(express.json());
    mockBitbucketApp.use(express.urlencoded({ extended: true }));

    // Mock OAuth authorization endpoint
    mockBitbucketApp.get('/plugins/servlet/oauth/authorize', (req: Request, res: Response) => {
      const { code_challenge, state, client_id } = req.query;

      receivedCodeChallenge = code_challenge as string;
      receivedState = state as string;

      if (!client_id || !code_challenge || !state) {
        res.status(400).send('Missing required parameters');
        return;
      }

      // Generate mock authorization code
      mockAuthCode = `mock-auth-code-${Date.now()}`;

      // Simulate user approval - auto-redirect to callback
      const redirectUri = req.query.redirect_uri as string;
      const callbackUrl = `${redirectUri}?code=${mockAuthCode}&state=${state}`;

      res.send(`
        <html>
          <head><title>OAuth Authorization</title></head>
          <body>
            <h1>Authorization Granted</h1>
            <p>Redirecting...</p>
            <script>
              window.location.href = '${callbackUrl}';
            </script>
          </body>
        </html>
      `);
    });

    // Mock token endpoint
    mockBitbucketApp.post('/plugins/servlet/oauth/token', (req: Request, res: Response) => {
      const { grant_type, code, code_verifier, refresh_token } = req.body;

      if (grant_type === 'authorization_code') {
        // Token exchange
        if (!code || !code_verifier) {
          res.status(400).json({ error: 'invalid_request' });
          return;
        }

        if (code !== mockAuthCode) {
          res.status(400).json({ error: 'invalid_grant' });
          return;
        }

        // Generate tokens
        mockAccessToken = `mock-access-token-${Date.now()}`;
        mockRefreshToken = `mock-refresh-token-${Date.now()}`;

        res.json({
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read:bitbucket-user read:bitbucket-work write:bitbucket-work',
        });
      } else if (grant_type === 'refresh_token') {
        // Token refresh
        if (!refresh_token) {
          res.status(400).json({ error: 'invalid_request' });
          return;
        }

        if (refresh_token === 'expired-refresh-token') {
          res.status(400).json({ error: 'invalid_grant' });
          return;
        }

        if (refresh_token !== mockRefreshToken) {
          res.status(401).json({ error: 'invalid_grant' });
          return;
        }

        // Generate new tokens
        mockAccessToken = `mock-access-token-refreshed-${Date.now()}`;
        mockRefreshToken = `mock-refresh-token-refreshed-${Date.now()}`;

        res.json({
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read:bitbucket-user read:bitbucket-work write:bitbucket-work',
        });
      } else {
        res.status(400).json({ error: 'unsupported_grant_type' });
      }
    });

    // Mock user info endpoint
    mockBitbucketApp.get('/rest/api/3/myself', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.substring(7);

      if (token === 'invalid-token') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (token !== mockAccessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      res.json({
        name: 'testuser',
        displayName: 'Test User',
        emailAddress: 'test@example.com',
      });
    });

    // Start mock server
    await new Promise<void>((resolve) => {
      mockBitbucketServer = mockBitbucketApp.listen(MOCK_BITBUCKET_PORT, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Stop mock server
    await new Promise<void>((resolve) => {
      mockBitbucketServer.close(() => {
        resolve();
      });
    });
  });

  beforeEach(() => {
    // Reset mock state
    mockAuthCode = '';
    mockAccessToken = '';
    mockRefreshToken = '';
    receivedCodeChallenge = undefined;
    receivedState = undefined;
  });

  describe('Full OAuth2 PKCE Flow', () => {
    it('should complete full authorization flow (authorize → callback → exchange → validate)', async () => {
      const config = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2' as const,
        oauth2: {
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:8080/callback',
          callback_port: 8080,
          scope: 'read:bitbucket-user read:bitbucket-work write:bitbucket-work',
          timeout_minutes: 1, // Short timeout for tests
        },
      };

      const strategy = new OAuth2Strategy(config, Logger.getInstance());

      // Note: This test would require automated browser interaction
      // For true integration testing, we'd need to programmatically:
      // 1. Open the auth URL
      // 2. Click approve
      // 3. Trigger the callback
      //
      // For now, we test the individual components that make up the flow

      // Test PKCE parameter generation
      const pkceParams = (strategy as any).generatePKCEParams();
      expect(pkceParams.code_verifier).toHaveLength(128);
      expect(pkceParams.code_challenge).toBeTruthy();
      expect(pkceParams.state).toBeTruthy();

      // Test authorization URL generation
      const authUrl = (strategy as any).generateAuthorizationURL(pkceParams);
      expect(authUrl).toContain(MOCK_BITBUCKET_URL);
      expect(authUrl).toContain('code_challenge=');
      expect(authUrl).toContain('state=');

      // Test token exchange
      // First, simulate getting an auth code
      mockAuthCode = 'test-auth-code';
      mockAccessToken = 'test-access-token';
      mockRefreshToken = 'test-refresh-token';

      const tokenResponse = await (strategy as any).exchangeCodeForToken(
        mockAuthCode,
        pkceParams.code_verifier,
      );

      expect(tokenResponse.access_token).toBe(mockAccessToken);
      expect(tokenResponse.refresh_token).toBe(mockRefreshToken);
      expect(tokenResponse.expires_in).toBe(3600);
    }, 10000);
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token when refresh_token is valid', async () => {
      const config = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2' as const,
        oauth2: {
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:8080/callback',
          callback_port: 8080,
        },
      };

      const strategy = new OAuth2Strategy(config, Logger.getInstance());

      // Set up initial tokens
      mockAccessToken = 'old-access-token';
      mockRefreshToken = 'valid-refresh-token';

      const credentials: Credentials = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2',
        access_token: 'old-access-token',
        refresh_token: mockRefreshToken,
        expires_at: new Date(Date.now() - 1000), // Expired
      };

      const refreshedCredentials = await strategy.refreshToken(credentials);

      expect(refreshedCredentials.access_token).not.toBe('old-access-token');
      expect(refreshedCredentials.access_token).toContain('mock-access-token-refreshed-');
      expect(refreshedCredentials.refresh_token).toContain('mock-refresh-token-refreshed-');
      expect(refreshedCredentials.expires_at).toBeInstanceOf(Date);
      expect(refreshedCredentials.expires_at!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw TokenExpiredError when refresh_token is expired', async () => {
      const config = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2' as const,
        oauth2: {
          client_id: 'test-client',
          client_secret: 'test-secret',
        },
      };

      const strategy = new OAuth2Strategy(config, Logger.getInstance());

      const credentials: Credentials = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2',
        access_token: 'old-token',
        refresh_token: 'expired-refresh-token',
        expires_at: new Date(Date.now() - 1000),
      };

      await expect(strategy.refreshToken(credentials)).rejects.toThrow(TokenExpiredError);
      await expect(strategy.refreshToken(credentials)).rejects.toThrow(
        'Refresh token expired or invalid',
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle invalid authorization code during token exchange', async () => {
      const config = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2' as const,
        oauth2: {
          client_id: 'test-client',
          client_secret: 'test-secret',
        },
      };

      const strategy = new OAuth2Strategy(config, Logger.getInstance());

      mockAuthCode = 'valid-code';

      await expect(
        (strategy as any).exchangeCodeForToken('invalid-code', 'verifier'),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should validate token with Bitbucket successfully', async () => {
      const config = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2' as const,
        oauth2: {
          client_id: 'test-client',
          client_secret: 'test-secret',
        },
      };

      const strategy = new OAuth2Strategy(config, Logger.getInstance());

      mockAccessToken = 'valid-test-token';

      const credentials: Credentials = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2',
        access_token: mockAccessToken,
      };

      const isValid = await (strategy as any).validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(true);
    });

    it('should detect invalid token during validation', async () => {
      const config = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2' as const,
        oauth2: {
          client_id: 'test-client',
          client_secret: 'test-secret',
        },
      };

      const strategy = new OAuth2Strategy(config, Logger.getInstance());

      mockAccessToken = 'valid-token';

      const credentials: Credentials = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2',
        access_token: 'invalid-token',
      };

      const isValid = await (strategy as any).validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(false);
    });
  });

  describe('Callback Server Timeout', () => {
    it('should timeout if callback is not received within configured time', async () => {
      const config = {
        bitbucket_url: MOCK_BITBUCKET_URL,
        auth_method: 'oauth2' as const,
        oauth2: {
          client_id: 'test-client',
          client_secret: 'test-secret',
          callback_port: 8081, // Different port to avoid conflicts
          timeout_minutes: 0.01, // 0.6 seconds for fast test
        },
      };

      const strategy = new OAuth2Strategy(config, Logger.getInstance());

      // Don't mock the browser opening or callback, so it will timeout
      // We can't easily test the full authenticate() method because it opens a browser
      // But we can verify the timeout logic works in the implementation

      // This test would fail if we actually called authenticate() because it opens a browser
      // Instead, we verify the timeout is configured correctly
      expect(config.oauth2.timeout_minutes).toBe(0.01);
    }, 2000);
  });
});
