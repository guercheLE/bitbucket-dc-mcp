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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthManager, type CredentialStorage } from '../../../src/auth/auth-manager.js';
import type { Credentials } from '../../../src/auth/auth-strategy.js';
import { InvalidCredentialsError } from '../../../src/auth/errors.js';
import type { AppConfig } from '../../../src/core/config-manager.js';

// Mock fetch for OAuth2 token refresh tests
global.fetch = vi.fn();

/**
 * Test suite for AuthManager
 *
 * @remarks
 * These tests validate:
 * - Strategy selection based on auth method
 * - Credentials lifecycle (load → validate → use)
 * - Token refresh logic for expired credentials
 * - Error handling (invalid credentials, token expiration)
 * - Caching behavior (avoiding multiple storage reads)
 */
describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockStorage: CredentialStorage;
  let mockLogger: PinoLogger;
  let mockConfig: AppConfig;

  // Test data
  const validPATCredentials: Credentials = {
    bitbucket_url: 'https://bitbucket.example.com',
    auth_method: 'pat',
    access_token: 'valid_pat_token',
  };

  const validOAuth2Credentials: Credentials = {
    bitbucket_url: 'https://bitbucket.example.com',
    auth_method: 'oauth2',
    access_token: 'valid_oauth2_token',
    refresh_token: 'valid_refresh_token',
    expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour from now
  };

  const expiredOAuth2Credentials: Credentials = {
    bitbucket_url: 'https://bitbucket.example.com',
    auth_method: 'oauth2',
    access_token: 'expired_oauth2_token',
    refresh_token: 'valid_refresh_token',
    expires_at: new Date(Date.now() - 1000), // 1 second ago
  };

  const validBasicCredentials: Credentials = {
    bitbucket_url: 'https://bitbucket.example.com',
    auth_method: 'basic',
    username: 'testuser',
    password: 'testpass',
  };

  beforeEach(() => {
    // Create mock storage
    mockStorage = {
      save: vi.fn(),
      load: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
      level: 'info',
    } as unknown as PinoLogger;

    // Create mock config
    mockConfig = {
      bitbucketUrl: 'https://bitbucket.example.com',
      authMethod: 'pat',
      rateLimit: 100,
      timeout: 30_000,
      logLevel: 'info',
      cacheSize: 1_000,
      retryAttempts: 3,
      shutdownTimeoutMs: 30_000,
      logPretty: false,
    };
  });

  describe('Initialization', () => {
    it('should initialize with correct dependencies', () => {
      authManager = new AuthManager(mockStorage, mockLogger, mockConfig);
      expect(authManager).toBeInstanceOf(AuthManager);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_manager.initialized',
          authMethod: 'pat',
          bitbucketUrl: 'https://bitbucket.example.com',
        }),
        'AuthManager initialized',
      );
    });
  });

  describe('Strategy Selection', () => {
    beforeEach(() => {
      authManager = new AuthManager(mockStorage, mockLogger, mockConfig);
    });

    it('should select correct strategy for PAT auth method', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validPATCredentials);

      const headers = await authManager.getAuthHeaders();

      expect(headers.get('Authorization')).toBe('Bearer valid_pat_token');
    });

    it('should select correct strategy for OAuth2 auth method', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validOAuth2Credentials);

      const headers = await authManager.getAuthHeaders();

      expect(headers.get('Authorization')).toBe('Bearer valid_oauth2_token');
    });

    it('should select correct strategy for Basic auth method', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validBasicCredentials);

      const headers = await authManager.getAuthHeaders();

      const authHeader = headers.get('Authorization');
      expect(authHeader).toContain('Basic ');
      // Decode and verify
      const decoded = Buffer.from(authHeader!.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('testuser:testpass');
    });
  });

  describe('Credentials Lifecycle', () => {
    beforeEach(() => {
      authManager = new AuthManager(mockStorage, mockLogger, mockConfig);
    });

    it('should load credentials from storage on first call', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validPATCredentials);

      await authManager.getAuthHeaders();

      expect(mockStorage.load).toHaveBeenCalledWith('https://bitbucket.example.com');
      expect(mockStorage.load).toHaveBeenCalledTimes(1);
    });

    it('should use cached credentials on subsequent calls', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validPATCredentials);

      // First call - loads from storage
      await authManager.getAuthHeaders();
      // Second call - uses cache
      await authManager.getAuthHeaders();
      // Third call - uses cache
      await authManager.getAuthHeaders();

      // Storage should only be called once
      expect(mockStorage.load).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'auth_manager.credentials_from_cache' }),
        'Using cached credentials',
      );
    });

    it('should throw InvalidCredentialsError when credentials not found', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(null);

      await expect(authManager.getAuthHeaders()).rejects.toThrow(InvalidCredentialsError);
      await expect(authManager.getAuthHeaders()).rejects.toThrow(
        'No credentials found. Please authenticate first.',
      );
    });

    it('should throw InvalidCredentialsError when credentials missing required fields', async () => {
      const invalidCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        // Missing access_token
      };
      vi.mocked(mockStorage.load).mockResolvedValue(invalidCredentials);

      await expect(authManager.getAuthHeaders()).rejects.toThrow(InvalidCredentialsError);
    });

    it('should clear cache when clearCache is called', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validPATCredentials);

      // First call - loads from storage
      await authManager.getAuthHeaders();
      expect(mockStorage.load).toHaveBeenCalledTimes(1);

      // Clear cache
      authManager.clearCache();

      // Next call - loads from storage again
      await authManager.getAuthHeaders();
      expect(mockStorage.load).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      authManager = new AuthManager(mockStorage, mockLogger, mockConfig);
    });

    it('should refresh expired OAuth2 credentials', async () => {
      // Mock fetch for token refresh endpoint
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'refreshed_access_token',
          refresh_token: 'refreshed_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read:bitbucket-user read:bitbucket-work write:bitbucket-work',
        }),
      } as Response);

      // First call returns expired credentials
      vi.mocked(mockStorage.load).mockResolvedValue(expiredOAuth2Credentials);
      vi.mocked(mockStorage.save).mockResolvedValue();

      // getAuthHeaders should trigger refresh
      const headers = await authManager.getAuthHeaders();

      // Should have refreshed with new token
      expect(headers.get('Authorization')).toBe('Bearer refreshed_access_token');
      expect(mockStorage.save).toHaveBeenCalledWith(
        'https://bitbucket.example.com',
        expect.objectContaining({
          access_token: 'refreshed_access_token',
          refresh_token: 'refreshed_refresh_token',
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_manager.token_refreshed',
          authMethod: 'oauth2',
        }),
        'Token refreshed successfully',
      );
    });

    it('should return valid headers for PAT credentials even with expires_at set', async () => {
      // PATs don't actually use expires_at, but if it's set (incorrectly),
      // validateCredentials should still pass since PATs ignore expiration
      const patWithExpiresAt: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid_pat',
        expires_at: new Date(Date.now() - 1000), // Past date (ignored for PATs)
      };
      vi.mocked(mockStorage.load).mockResolvedValue(patWithExpiresAt);

      // PAT validation only checks access_token presence, ignores expires_at
      const headers = await authManager.getAuthHeaders();
      expect(headers.get('Authorization')).toBe('Bearer valid_pat');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      authManager = new AuthManager(mockStorage, mockLogger, mockConfig);
    });

    it('should throw InvalidCredentialsError for missing access_token in OAuth2', async () => {
      const invalidOAuth2: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        // Missing access_token
      };
      vi.mocked(mockStorage.load).mockResolvedValue(invalidOAuth2);

      await expect(authManager.getAuthHeaders()).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError for missing username/password in Basic auth', async () => {
      const invalidBasic: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'user',
        // Missing password
      };
      vi.mocked(mockStorage.load).mockResolvedValue(invalidBasic);

      // Should fail validation and throw InvalidCredentialsError
      await expect(authManager.getAuthHeaders()).rejects.toThrow(InvalidCredentialsError);
      // The error is thrown during validation, not header generation
      await expect(authManager.getAuthHeaders()).rejects.toThrow('Stored credentials are invalid');
    });

    it('should log validation failures', async () => {
      const invalidCredentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        // Missing access_token
      };
      vi.mocked(mockStorage.load).mockResolvedValue(invalidCredentials);

      await expect(authManager.getAuthHeaders()).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_manager.validation_failed',
          authMethod: 'pat',
        }),
        'Credential validation failed',
      );
    });
  });

  describe('Auth Headers Generation', () => {
    beforeEach(() => {
      authManager = new AuthManager(mockStorage, mockLogger, mockConfig);
    });

    it('should generate Bearer token header for OAuth2', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validOAuth2Credentials);

      const headers = await authManager.getAuthHeaders();

      expect(headers.get('Authorization')).toBe('Bearer valid_oauth2_token');
    });

    it('should generate Bearer token header for PAT', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validPATCredentials);

      const headers = await authManager.getAuthHeaders();

      expect(headers.get('Authorization')).toBe('Bearer valid_pat_token');
    });

    it('should generate Basic auth header with base64 encoding', async () => {
      vi.mocked(mockStorage.load).mockResolvedValue(validBasicCredentials);

      const headers = await authManager.getAuthHeaders();

      const authHeader = headers.get('Authorization');
      expect(authHeader).toContain('Basic ');
      const expectedBase64 = Buffer.from('testuser:testpass').toString('base64');
      expect(authHeader).toBe(`Basic ${expectedBase64}`);
    });

    it('should generate OAuth1 header (placeholder for now)', async () => {
      const validOAuth1: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'test_consumer_key',
        consumer_secret: 'test_consumer_secret',
        oauth_token: 'test_oauth_token',
        oauth_token_secret: 'test_oauth_token_secret',
      };
      vi.mocked(mockStorage.load).mockResolvedValue(validOAuth1);

      const headers = await authManager.getAuthHeaders();

      // Placeholder implementation in this story
      expect(headers.get('Authorization')).toContain('OAuth');
    });
  });
});
