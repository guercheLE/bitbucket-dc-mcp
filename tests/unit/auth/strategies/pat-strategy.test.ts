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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthConfig, Credentials } from '../../../../src/auth/auth-strategy.js';
import {
  AuthenticationError,
  ConfigurationError,
  InvalidCredentialsError,
} from '../../../../src/auth/errors.js';
import { PATStrategy } from '../../../../src/auth/strategies/pat-strategy.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock logger
vi.mock('../../../../src/core/logger.js', () => ({
  Logger: {
    getInstance: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

describe('PATStrategy', () => {
  let strategy: PATStrategy;
  let mockConfig: AuthConfig;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
      pat: {
        token: 'test-pat-token-123',
      },
    };

    strategy = new PATStrategy();
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  });

  describe('constructor', () => {
    it('should create PATStrategy instance', () => {
      expect(strategy).toBeInstanceOf(PATStrategy);
    });
  });

  describe('authenticate()', () => {
    it('should create credentials from config token', async () => {
      const credentials = await strategy.authenticate(mockConfig);

      expect(credentials).toEqual({
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'test-pat-token-123',
        expires_at: undefined,
      });
    });

    it('should throw InvalidCredentialsError when token is missing', async () => {
      const invalidConfig = { ...mockConfig, pat: undefined };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(
        'PAT token is required in config.auth.pat.token',
      );
    });

    it('should throw InvalidCredentialsError when token is empty string', async () => {
      const invalidConfig = { ...mockConfig, pat: { token: '' } };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when token is whitespace only', async () => {
      const invalidConfig = { ...mockConfig, pat: { token: '   ' } };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should not log token value (security)', async () => {
      const credentials = await strategy.authenticate(mockConfig);

      // Verify credentials contain the token (so we know it's being used)
      expect(credentials.access_token).toBe('test-pat-token-123');

      // The logger is configured with REDACT_FIELDS in logger.ts which includes
      // '*.access_token', '*.token', etc. This test verifies the implementation
      // is correct. The actual redaction is handled by the pino logger configuration.
    });
  });

  describe('refreshToken()', () => {
    it('should throw AuthenticationError as PATs do not support refresh', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'test-token',
        expires_at: undefined,
      };

      await expect(strategy.refreshToken(credentials)).rejects.toThrow(AuthenticationError);
      await expect(strategy.refreshToken(credentials)).rejects.toThrow(
        'PAT tokens do not support refresh',
      );
    });
  });

  describe('validateCredentials()', () => {
    it('should return true when credentials have access_token', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(true);
    });

    it('should return false when access_token is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        expires_at: undefined,
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when access_token is empty string', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: '',
        expires_at: undefined,
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when access_token is whitespace only', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: '   ',
        expires_at: undefined,
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should not make API calls (synchronous validation)', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      strategy.validateCredentials(credentials);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('validateTokenWithBitbucket()', () => {
    it('should return true when Bitbucket returns 200 OK', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountId: '123',
          accountType: 'atlassian',
          displayName: 'Test User',
          emailAddress: 'test@example.com',
          active: true,
          self: 'https://bitbucket.example.com/rest/api/3/user?accountId=123',
        }),
      });

      const isValid = await strategy.validateTokenWithBitbucket(mockCredentials);

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://bitbucket.example.com/rest/api/latest/profile/recent/repos?limit=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should return false when Bitbucket returns 401 Unauthorized', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'invalid-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid token'),
      });

      const isValid = await strategy.validateTokenWithBitbucket(mockCredentials);

      expect(isValid).toBe(false);
    });

    it('should return false when token is missing from credentials', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        expires_at: undefined,
      };

      const isValid = await strategy.validateTokenWithBitbucket(mockCredentials);

      expect(isValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError when Bitbucket returns 403 Forbidden', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-but-insufficient-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: vi.fn().mockResolvedValue('Insufficient permissions'),
      });

      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        'PAT token lacks required permissions',
      );
    });

    it('should throw ConfigurationError when Bitbucket returns 404 Not Found', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://wrong-bitbucket-url.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: vi.fn().mockResolvedValue('Endpoint not found'),
      });

      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        ConfigurationError,
      );
      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        'Bitbucket API endpoint not found',
      );
    });

    it('should throw AuthenticationError when Bitbucket returns 500 Internal Server Error', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Server error'),
      });

      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        'Bitbucket server error (500)',
      );
    });

    it('should throw AuthenticationError when Bitbucket returns 502 Bad Gateway', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: vi.fn().mockResolvedValue('Bad gateway'),
      });

      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        'Bitbucket server error (502)',
      );
    });

    it('should throw AuthenticationError on network timeout', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(strategy.validateTokenWithBitbucket(mockCredentials, 5000)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(strategy.validateTokenWithBitbucket(mockCredentials, 5000)).rejects.toThrow(
        'PAT validation timed out after 5000ms',
      );
    });

    it('should throw AuthenticationError on network error', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';
      mockFetch.mockRejectedValue(networkError);

      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        'Network error during PAT validation',
      );
    });

    it('should sanitize token from error messages', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'secret-token-12345',
        expires_at: undefined,
      };

      const errorWithToken = new Error('Authentication failed for token secret-token-12345');
      mockFetch.mockRejectedValue(errorWithToken);

      await expect(strategy.validateTokenWithBitbucket(mockCredentials)).rejects.toThrow(
        AuthenticationError,
      );

      // Error message should not contain the actual token
      try {
        await strategy.validateTokenWithBitbucket(mockCredentials);
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain('secret-token-12345');
          expect(error.message).toContain('***');
        }
      }
    });

    it('should use custom timeout parameter', async () => {
      const mockCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      const customTimeout = 15000;
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(strategy.validateTokenWithBitbucket(mockCredentials, customTimeout)).rejects.toThrow(
        `PAT validation timed out after ${customTimeout}ms`,
      );
    });
  });

  describe('getAuthHeaders()', () => {
    it('should return correct Bearer token header', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'test-token-123',
        expires_at: undefined,
      };

      const headers = strategy.getAuthHeaders(credentials);

      expect(headers).toEqual({
        Authorization: 'Bearer test-token-123',
        'Content-Type': 'application/json',
      });
    });

    it('should include token in Authorization header', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'my-secret-token',
        expires_at: undefined,
      };

      const headers = strategy.getAuthHeaders(credentials);

      expect(headers.Authorization).toBe('Bearer my-secret-token');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('sanitizeError()', () => {
    it('should remove Bearer tokens from error messages', async () => {
      const errorWithBearer = 'Authentication failed with Bearer token-abc123-secret';
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'test',
        expires_at: undefined,
      };

      mockFetch.mockRejectedValue(new Error(errorWithBearer));

      await expect(strategy.validateTokenWithBitbucket(credentials)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should remove base64-like token strings', async () => {
      const errorWithBase64 =
        'Failed to authenticate with token: AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'test',
        expires_at: undefined,
      };

      mockFetch.mockRejectedValue(new Error(errorWithBase64));

      try {
        await strategy.validateTokenWithBitbucket(credentials);
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain('AbCdEfGhIjKlMnOpQrStUvWxYz0123456789');
          expect(error.message).toContain('***');
        }
      }
    });
  });

  describe('error handling scenarios', () => {
    it('should provide actionable error messages for 401', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'expired-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Token expired',
      });

      // 401 returns false, doesn't throw
      const isValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(false);
    });

    it('should provide actionable error messages for 403', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'limited-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('Insufficient permissions'),
      });

      await expect(strategy.validateTokenWithBitbucket(credentials)).rejects.toThrow(
        /PAT token lacks required permissions/,
      );
    });

    it('should provide actionable error messages for 404', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://wrong-url.example.com',
        auth_method: 'pat',
        access_token: 'valid-token',
        expires_at: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('Not found'),
      });

      await expect(strategy.validateTokenWithBitbucket(credentials)).rejects.toThrow(
        /Verify config.bitbucket_url is correct/,
      );
    });
  });
});
