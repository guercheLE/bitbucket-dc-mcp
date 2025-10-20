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
import { AuthenticationError, InvalidCredentialsError } from '../../../../src/auth/errors.js';
import { OAuth1Strategy } from '../../../../src/auth/strategies/oauth1-strategy.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock open npm package
vi.mock('open', () => ({
  default: vi.fn(() => Promise.resolve()),
}));

// Mock express
vi.mock('express', () => {
  const mockApp = {
    get: vi.fn(),
    listen: vi.fn((port, callback) => {
      callback?.();
      return {
        close: vi.fn((cb) => cb?.()),
        on: vi.fn(),
      };
    }),
  };

  return {
    default: vi.fn(() => mockApp),
  };
});

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

describe('OAuth1Strategy', () => {
  let strategy: OAuth1Strategy;
  let mockConfig: AuthConfig;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'oauth1',
      oauth1: {
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        callback_url: 'http://localhost:8080/callback',
      },
    };

    strategy = new OAuth1Strategy();
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  });

  describe('constructor', () => {
    it('should create OAuth1Strategy instance', () => {
      expect(strategy).toBeInstanceOf(OAuth1Strategy);
    });

    it('should log deprecation warning on initialization', () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        level: 'info',
        fatal: vi.fn(),
        trace: vi.fn(),
        silent: vi.fn(),
      } as any;

      new OAuth1Strategy(mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining('OAuth 1.0a is deprecated'),
        }),
      );
    });
  });

  describe('getAuthHeaders()', () => {
    it('should generate OAuth 1.0a headers with signature', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      const headers = strategy.getAuthHeaders(
        credentials,
        'GET',
        'https://bitbucket.example.com/rest/api/3/myself',
      );

      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toContain('OAuth');
      expect(headers.Authorization).toContain('oauth_consumer_key');
      expect(headers.Authorization).toContain('oauth_token');
      expect(headers.Authorization).toContain('oauth_signature');
      expect(headers.Authorization).toContain('oauth_signature_method="HMAC-SHA1"');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should generate different signatures for different HTTP methods', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      const url = 'https://bitbucket.example.com/rest/api/3/issue';

      const getHeaders = strategy.getAuthHeaders(credentials, 'GET', url);
      const postHeaders = strategy.getAuthHeaders(credentials, 'POST', url);

      // Signatures should be different for different methods
      expect(getHeaders.Authorization).not.toBe(postHeaders.Authorization);
    });

    it('should generate different signatures for different URLs', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      const headers1 = strategy.getAuthHeaders(
        credentials,
        'GET',
        'https://bitbucket.example.com/rest/api/3/myself',
      );
      const headers2 = strategy.getAuthHeaders(
        credentials,
        'GET',
        'https://bitbucket.example.com/rest/api/3/project',
      );

      // Signatures should be different for different URLs
      expect(headers1.Authorization).not.toBe(headers2.Authorization);
    });

    it('should throw InvalidCredentialsError when consumer credentials are missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        oauth_token: 'test-token',
        oauth_token_secret: 'test-secret',
      };

      expect(() =>
        strategy.getAuthHeaders(
          credentials,
          'GET',
          'https://bitbucket.example.com/rest/api/3/myself',
        ),
      ).toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when oauth_token is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
      };

      expect(() =>
        strategy.getAuthHeaders(
          credentials,
          'GET',
          'https://bitbucket.example.com/rest/api/3/myself',
        ),
      ).toThrow(InvalidCredentialsError);
    });
  });

  describe('validateCredentials()', () => {
    it('should return true when all OAuth 1.0a fields are present', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(true);
    });

    it('should return false when consumer_key is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when oauth_token is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token_secret: 'test-token-secret',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when auth_method is not oauth1', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });
  });

  describe('validateCredentialsWithBitbucket()', () => {
    it('should return true when Bitbucket API returns 200 OK', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'testuser', displayName: 'Test User' }),
      });

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://bitbucket.example.com/rest/api/latest/profile/recent/repos?limit=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('OAuth'),
          }),
        }),
      );
    });

    it('should return false when Bitbucket API returns 401 Unauthorized', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'invalid-token',
        oauth_token_secret: 'invalid-secret',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when credentials structure is invalid', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
      };

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return false on network error', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(false);
    });
  });

  describe('refreshToken()', () => {
    it('should throw AuthenticationError as OAuth 1.0a tokens do not support refresh', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test-consumer-key',
        consumer_secret: 'test-consumer-secret',
        oauth_token: 'test-access-token',
        oauth_token_secret: 'test-token-secret',
      };

      await expect(strategy.refreshToken(credentials)).rejects.toThrow(AuthenticationError);
      await expect(strategy.refreshToken(credentials)).rejects.toThrow(
        'OAuth 1.0a tokens do not support refresh',
      );
    });
  });

  describe('authenticate() - error handling', () => {
    it('should throw InvalidCredentialsError when consumer_key is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        oauth1: {
          consumer_secret: 'test-secret',
        },
      };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(
        'Consumer key and consumer secret are required',
      );
    });

    it('should throw InvalidCredentialsError when consumer_secret is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        oauth1: {
          consumer_key: 'test-key',
        },
      };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw AuthenticationError when request token fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid consumer credentials',
      });

      await expect(strategy.authenticate(mockConfig)).rejects.toThrow(AuthenticationError);
      await expect(strategy.authenticate(mockConfig)).rejects.toThrow(
        'Failed to obtain request token',
      );
    });

    it('should throw AuthenticationError on malformed request token response', async () => {
      // Mock fetch to return malformed response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'invalid_response',
      });

      await expect(strategy.authenticate(mockConfig)).rejects.toThrow(AuthenticationError);
      await expect(strategy.authenticate(mockConfig)).rejects.toThrow(
        'Malformed request token response',
      );
    });
  });
});
