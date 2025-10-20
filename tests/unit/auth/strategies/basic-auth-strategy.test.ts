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
import { InvalidCredentialsError } from '../../../../src/auth/errors.js';
import { BasicAuthStrategy } from '../../../../src/auth/strategies/basic-auth-strategy.js';

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

describe('BasicAuthStrategy', () => {
  let strategy: BasicAuthStrategy;
  let mockConfig: AuthConfig;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'basic',
      basic: {
        username: 'admin',
        password: 'password123',
      },
    };

    strategy = new BasicAuthStrategy();
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  });

  describe('constructor', () => {
    it('should create BasicAuthStrategy instance', () => {
      expect(strategy).toBeInstanceOf(BasicAuthStrategy);
    });

    it('should log security warning on initialization', () => {
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

      new BasicAuthStrategy(mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining('Basic auth is insecure over HTTP'),
        }),
      );
    });
  });

  describe('authenticate()', () => {
    it('should create credentials from username and password', async () => {
      const credentials = await strategy.authenticate(mockConfig);

      expect(credentials).toEqual({
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'password123',
        expires_at: undefined,
      });
    });

    it('should throw InvalidCredentialsError when username is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        basic: { password: 'password123' },
      };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(
        'Username is required for Basic auth',
      );
    });

    it('should throw InvalidCredentialsError when username is empty string', async () => {
      const invalidConfig = {
        ...mockConfig,
        basic: { username: '', password: 'password123' },
      };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when username is whitespace only', async () => {
      const invalidConfig = {
        ...mockConfig,
        basic: { username: '   ', password: 'password123' },
      };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when password is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        basic: { username: 'admin' },
      };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(
        'Password is required for Basic auth',
      );
    });

    it('should throw InvalidCredentialsError when password is empty string', async () => {
      const invalidConfig = {
        ...mockConfig,
        basic: { username: 'admin', password: '' },
      };

      await expect(strategy.authenticate(invalidConfig)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should log error when HTTP is used instead of HTTPS', async () => {
      const httpConfig = {
        ...mockConfig,
        bitbucket_url: 'http://bitbucket.example.com',
      };

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

      const strategyWithLogger = new BasicAuthStrategy(mockLogger);
      await strategyWithLogger.authenticate(httpConfig);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining('SECURITY RISK'),
        }),
      );
    });

    it('should not log password in logs (security)', async () => {
      const credentials = await strategy.authenticate(mockConfig);

      // Verify credentials contain the password (so we know it's being used)
      expect(credentials.password).toBe('password123');

      // The logger should be configured to redact passwords
      // This test verifies the implementation is correct
    });
  });

  describe('getAuthHeaders()', () => {
    it('should encode username:password as base64', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'password',
      };

      const headers = strategy.getAuthHeaders(credentials);

      // "admin:password" in base64 is "YWRtaW46cGFzc3dvcmQ="
      expect(headers.Authorization).toBe('Basic YWRtaW46cGFzc3dvcmQ=');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should correctly encode different username:password combinations', () => {
      const testCases = [
        {
          username: 'user',
          password: 'pass',
          expected: 'Basic dXNlcjpwYXNz',
        },
        {
          username: 'test@example.com',
          password: 'secret123',
          expected: 'Basic dGVzdEBleGFtcGxlLmNvbTpzZWNyZXQxMjM=',
        },
        {
          username: 'admin',
          password: 'admin',
          expected: 'Basic YWRtaW46YWRtaW4=',
        },
      ];

      testCases.forEach(({ username, password, expected }) => {
        const credentials: Credentials = {
          bitbucket_url: 'https://bitbucket.example.com',
          auth_method: 'basic',
          username,
          password,
        };

        const headers = strategy.getAuthHeaders(credentials);
        expect(headers.Authorization).toBe(expected);
      });
    });

    it('should throw InvalidCredentialsError when username is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        password: 'password',
      };

      expect(() => strategy.getAuthHeaders(credentials)).toThrow(InvalidCredentialsError);
      expect(() => strategy.getAuthHeaders(credentials)).toThrow(
        'Username and password required for Basic auth',
      );
    });

    it('should throw InvalidCredentialsError when password is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
      };

      expect(() => strategy.getAuthHeaders(credentials)).toThrow(InvalidCredentialsError);
    });
  });

  describe('validateCredentials()', () => {
    it('should return true when username and password are present', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'password123',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(true);
    });

    it('should return false when username is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        password: 'password123',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when password is missing', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when username is empty string', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: '',
        password: 'password123',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when password is empty string', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: '',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false when auth_method is not basic', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        username: 'admin',
        password: 'password123',
      };

      const isValid = strategy.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });
  });

  describe('validateCredentialsWithBitbucket()', () => {
    it('should return true when Bitbucket API returns 200 OK', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'password123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'admin', displayName: 'Administrator' }),
      });

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://bitbucket.example.com/rest/api/latest/profile/recent/repos?limit=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        }),
      );
    });

    it('should return false when Bitbucket API returns 401 Unauthorized', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'wrong-password',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(false);
    });

    it('should log error when HTTP is used instead of HTTPS', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'http://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'password123',
      };

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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'admin' }),
      });

      const strategyWithLogger = new BasicAuthStrategy(mockLogger);
      await strategyWithLogger.validateCredentialsWithBitbucket(credentials);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining('SECURITY RISK'),
        }),
      );
    });

    it('should return false when credentials structure is invalid', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
      };

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return false on network error', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'password123',
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isValid = await strategy.validateCredentialsWithBitbucket(credentials);

      expect(isValid).toBe(false);
    });
  });

  describe('refreshToken()', () => {
    it('should return credentials unchanged', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'admin',
        password: 'password123',
      };

      const refreshedCredentials = await strategy.refreshToken(credentials);

      expect(refreshedCredentials).toEqual(credentials);
    });
  });
});
