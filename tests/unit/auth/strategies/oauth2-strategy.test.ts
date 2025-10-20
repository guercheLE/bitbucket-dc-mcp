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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthConfig, Credentials } from '../../../../src/auth/auth-strategy.js';
import { AuthenticationError, TokenExpiredError } from '../../../../src/auth/errors.js';
import { OAuth2Strategy } from '../../../../src/auth/strategies/oauth2-strategy.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('OAuth2Strategy', () => {
  let strategy: OAuth2Strategy;
  let mockConfig: AuthConfig;
  let mockLogger: PinoLogger;

  beforeEach(() => {
    mockConfig = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'oauth2',
      oauth2: {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        redirect_uri: 'http://localhost:8080/callback',
        callback_port: 8080,
        scope: 'read:bitbucket-user read:bitbucket-work write:bitbucket-work',
        timeout_minutes: 5,
      },
    } as AuthConfig;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
      level: 'info',
    } as any;

    strategy = new OAuth2Strategy(mockConfig, mockLogger);

    // Reset fetch mock
    vi.mocked(fetch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePKCEParams', () => {
    it('should generate valid PKCE parameters', () => {
      // Access private method via type assertion for testing
      const params = (strategy as any).generatePKCEParams();

      expect(params.code_verifier).toBeDefined();
      expect(params.code_verifier).toHaveLength(128);
      expect(params.code_verifier).toMatch(/^[A-Za-z0-9._~-]+$/);

      expect(params.code_challenge).toBeDefined();
      expect(params.code_challenge).toMatch(/^[A-Za-z0-9_-]+$/); // base64url

      expect(params.state).toBeDefined();
      expect(params.state).toHaveLength(32);
      expect(params.state).toMatch(/^[A-Za-z0-9._~-]+$/);
    });

    it('should generate unique PKCE parameters on each call', () => {
      const params1 = (strategy as any).generatePKCEParams();
      const params2 = (strategy as any).generatePKCEParams();

      expect(params1.code_verifier).not.toBe(params2.code_verifier);
      expect(params1.code_challenge).not.toBe(params2.code_challenge);
      expect(params1.state).not.toBe(params2.state);
    });

    it('should store PKCE params in pkceStore keyed by state', () => {
      const params = (strategy as any).generatePKCEParams();
      const pkceStore = (strategy as any).pkceStore as Map<string, any>;

      expect(pkceStore.has(params.state)).toBe(true);
      expect(pkceStore.get(params.state)).toEqual(params);
    });
  });

  describe('generateAuthorizationURL', () => {
    it('should construct correct OAuth2 authorization URL', () => {
      const pkceParams = {
        code_verifier: 'test-verifier-128-chars-long-'.repeat(4).substring(0, 128),
        code_challenge: 'test-challenge',
        state: 'test-state',
      };

      const authUrl = (strategy as any).generateAuthorizationURL(pkceParams);

      expect(authUrl).toContain('https://bitbucket.example.com/plugins/servlet/oauth/authorize');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback');
      expect(authUrl).toContain(
        'scope=read%3Abitbucket-user+read%3Abitbucket-work+write%3Abitbucket-work',
      );
      expect(authUrl).toContain('state=test-state');
      expect(authUrl).toContain('code_challenge=test-challenge');
      expect(authUrl).toContain('code_challenge_method=S256');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should call Bitbucket token endpoint with correct body', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer' as const,
        scope: 'read:bitbucket-user',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const tokenResponse = await (strategy as any).exchangeCodeForToken(
        'test-auth-code',
        'test-code-verifier',
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://bitbucket.example.com/plugins/servlet/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          }),
        }),
      );

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = callArgs[1]?.body as string;

      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=test-auth-code');
      expect(body).toContain('client_id=test-client-id');
      expect(body).toContain('client_secret=test-client-secret');
      expect(body).toContain('code_verifier=test-code-verifier');

      expect(tokenResponse).toEqual(mockTokenResponse);
    });

    it('should throw AuthenticationError on failed token exchange', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'invalid_grant',
      } as Response);

      await expect(
        (strategy as any).exchangeCodeForToken('invalid-code', 'verifier'),
      ).rejects.toThrow(AuthenticationError);

      await expect(
        (strategy as any).exchangeCodeForToken('invalid-code', 'verifier'),
      ).rejects.toThrow('Token exchange failed: 400 Bad Request');
    });
  });

  describe('refreshToken', () => {
    it('should renew access_token when refresh_token is valid', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'old-access-token',
        refresh_token: 'valid-refresh-token',
        expires_at: new Date(Date.now() - 1000), // expired
      };

      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer' as const,
        scope: 'read:bitbucket-user',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const refreshed = await strategy.refreshToken(credentials);

      expect(fetch).toHaveBeenCalledWith(
        'https://bitbucket.example.com/plugins/servlet/oauth/token',
        expect.objectContaining({
          method: 'POST',
        }),
      );

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = callArgs[1]?.body as string;

      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('refresh_token=valid-refresh-token');

      expect(refreshed.access_token).toBe('new-access-token');
      expect(refreshed.refresh_token).toBe('new-refresh-token');
      expect(refreshed.expires_at).toBeInstanceOf(Date);
      expect(refreshed.expires_at!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw TokenExpiredError when refresh_token is invalid', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'old-token',
        refresh_token: 'invalid-refresh-token',
        expires_at: new Date(Date.now() - 1000),
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      } as Response);

      await expect(strategy.refreshToken(credentials)).rejects.toThrow(TokenExpiredError);
      await expect(strategy.refreshToken(credentials)).rejects.toThrow(
        'Refresh token expired or invalid',
      );
    });

    it('should throw TokenExpiredError when refresh_token is missing', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'token',
      };

      await expect(strategy.refreshToken(credentials)).rejects.toThrow(TokenExpiredError);
      await expect(strategy.refreshToken(credentials)).rejects.toThrow('Refresh token is missing');
    });
  });

  describe('validateCredentials', () => {
    it('should return true when token is not expired', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'valid-token',
        expires_at: new Date(Date.now() + 3600 * 1000), // expires in 1 hour
      };

      expect(strategy.validateCredentials(credentials)).toBe(true);
    });

    it('should return false when expires_at is in the past', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'expired-token',
        expires_at: new Date(Date.now() - 1000), // expired 1 second ago
      };

      expect(strategy.validateCredentials(credentials)).toBe(false);
    });

    it('should return false when access_token is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
      };

      expect(strategy.validateCredentials(credentials)).toBe(false);
    });

    it('should return false when access_token is empty string', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: '',
      };

      expect(strategy.validateCredentials(credentials)).toBe(false);
    });

    it('should return true when expires_at is not present', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'valid-token',
        // No expires_at
      };

      expect(strategy.validateCredentials(credentials)).toBe(true);
    });
  });

  describe('validateTokenWithBitbucket', () => {
    it('should validate token with Bitbucket API', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'valid-token',
      };

      const mockUserResponse = {
        name: 'testuser',
        displayName: 'Test User',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserResponse,
      } as Response);

      const isValid = await (strategy as any).validateTokenWithBitbucket(credentials);

      expect(fetch).toHaveBeenCalledWith(
        'https://bitbucket.example.com/rest/api/latest/profile/recent/repos?limit=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
            Accept: 'application/json',
          }),
        }),
      );

      expect(isValid).toBe(true);
    });

    it('should return false on 401 Unauthorized', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'invalid-token',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const isValid = await (strategy as any).validateTokenWithBitbucket(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false on network error', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'token',
      };

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const isValid = await (strategy as any).validateTokenWithBitbucket(credentials);

      expect(isValid).toBe(false);
    });
  });
});
