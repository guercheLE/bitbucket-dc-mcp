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

import express, { type Express } from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthConfig } from '../../../src/auth/auth-strategy.js';
import {
  AuthenticationError,
  ConfigurationError,
  InvalidCredentialsError,
} from '../../../src/auth/errors.js';
import { PATStrategy } from '../../../src/auth/strategies/pat-strategy.js';

// Mock logger
vi.mock('../../../src/core/logger.js', () => ({
  Logger: {
    getInstance: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

describe('PATStrategy Integration Tests', () => {
  let mockBitbucketServer: Express;
  let server: Server;
  let strategy: PATStrategy;
  const TEST_PORT = 8181;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    // Start mock Bitbucket server
    mockBitbucketServer = express();
    mockBitbucketServer.use(express.json());

    // Mock /rest/api/3/myself endpoint
    mockBitbucketServer.get('/rest/api/3/myself', (req, res) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ message: 'Missing authorization header' });
        return;
      }

      if (authHeader === 'Bearer valid-pat-token') {
        res.json({
          accountId: '123456',
          accountType: 'atlassian',
          displayName: 'Test User',
          emailAddress: 'test@example.com',
          active: true,
          self: `${BASE_URL}/rest/api/3/user?accountId=123456`,
        });
      } else if (authHeader === 'Bearer expired-token') {
        res.status(401).json({ message: 'Token expired' });
      } else if (authHeader === 'Bearer revoked-token') {
        res.status(401).json({ message: 'Token revoked' });
      } else if (authHeader === 'Bearer insufficient-perms-token') {
        res.status(403).json({ message: 'Insufficient permissions' });
      } else {
        res.status(401).json({ message: 'Invalid token' });
      }
    });

    // Start server
    await new Promise<void>((resolve) => {
      server = mockBitbucketServer.listen(TEST_PORT, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Stop server
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    strategy = new PATStrategy();
  });

  describe('Full Authentication Flow', () => {
    it('should complete full PAT authentication and validation flow with valid token', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      // Step 1: Authenticate
      const credentials = await strategy.authenticate(config);

      expect(credentials).toEqual({
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        access_token: 'valid-pat-token',
        expires_at: undefined,
      });

      // Step 2: Validate credentials (synchronous)
      const isValidSync = strategy.validateCredentials(credentials);
      expect(isValidSync).toBe(true);

      // Step 3: Validate with Bitbucket API
      const isValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(true);

      // Step 4: Get headers for API requests
      const headers = strategy.getAuthHeaders(credentials);
      expect(headers).toEqual({
        Authorization: 'Bearer valid-pat-token',
        'Content-Type': 'application/json',
      });

      // Step 5: Verify headers work with mock server (make actual request)
      const response = await fetch(`${BASE_URL}/rest/api/3/myself`, { headers });
      expect(response.ok).toBe(true);

      const user = await response.json();
      expect(user.accountId).toBe('123456');
      expect(user.displayName).toBe('Test User');
    });

    it('should handle authentication with missing token', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: undefined,
      };

      await expect(strategy.authenticate(config)).rejects.toThrow(InvalidCredentialsError);
      await expect(strategy.authenticate(config)).rejects.toThrow('PAT token is required');
    });
  });

  describe('Token Validation Scenarios', () => {
    it('should handle invalid token gracefully', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'invalid-token-12345' },
      };

      const credentials = await strategy.authenticate(config);

      // Validate with Bitbucket API - should return false for invalid token
      const isValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(false);
    });

    it('should handle expired token scenario', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'expired-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Validate with Bitbucket API - should return false for expired token
      const isValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(false);
    });

    it('should handle revoked token scenario', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'revoked-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Validate with Bitbucket API - should return false for revoked token
      const isValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(false);
    });

    it('should handle insufficient permissions (403)', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'insufficient-perms-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Validate with Bitbucket API - should throw for 403
      await expect(strategy.validateTokenWithBitbucket(credentials)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(strategy.validateTokenWithBitbucket(credentials)).rejects.toThrow(
        /lacks required permissions/,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      const config: AuthConfig = {
        bitbucket_url: 'http://192.0.2.1:9999', // Non-routable IP (TEST-NET-1)
        auth_method: 'pat',
        pat: { token: 'valid-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Validate with very short timeout - should throw timeout error
      await expect(strategy.validateTokenWithBitbucket(credentials, 100)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(strategy.validateTokenWithBitbucket(credentials, 100)).rejects.toThrow(
        /timed out/,
      );
    }, 10000); // Increase test timeout to 10s

    it('should handle invalid Bitbucket URL (404)', async () => {
      const config: AuthConfig = {
        bitbucket_url: `${BASE_URL}/wrong-path`,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      const credentials = await strategy.authenticate(config);
      credentials.bitbucket_url = `${BASE_URL}/wrong-path`; // Override for this test

      // Validate with wrong endpoint - should throw ConfigurationError
      await expect(strategy.validateTokenWithBitbucket(credentials)).rejects.toThrow(
        ConfigurationError,
      );
    });
  });

  describe('Refresh Token Behavior', () => {
    it('should throw error when trying to refresh PAT token', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      const credentials = await strategy.authenticate(config);

      // PATs don't support refresh
      await expect(strategy.refreshToken(credentials)).rejects.toThrow(AuthenticationError);
      await expect(strategy.refreshToken(credentials)).rejects.toThrow(/do not support refresh/);
    });
  });

  describe('Security', () => {
    it('should send correct Authorization header format', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      const credentials = await strategy.authenticate(config);
      const headers = strategy.getAuthHeaders(credentials);

      // Verify Authorization header format
      expect(headers.Authorization).toMatch(/^Bearer .+$/);
      expect(headers.Authorization).toBe('Bearer valid-pat-token');
    });

    it('should validate tokens are used in requests', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Validate token works
      const isValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(true);

      // Make actual request to verify token is accepted
      const headers = strategy.getAuthHeaders(credentials);
      const response = await fetch(`${BASE_URL}/rest/api/3/myself`, { headers });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.accountId).toBe('123456');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent validation requests', async () => {
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Make 5 concurrent validation requests
      const validationPromises = Array.from({ length: 5 }, () =>
        strategy.validateTokenWithBitbucket(credentials),
      );

      const results = await Promise.all(validationPromises);

      // All should succeed
      expect(results.every((result: boolean) => result === true)).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should complete typical usage flow: authenticate -> validate -> make requests', async () => {
      // Step 1: Initial authentication
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Step 2: Periodic validation (e.g., every 5 minutes)
      const isValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValid).toBe(true);

      // Step 3: Make actual API requests with headers
      const headers = strategy.getAuthHeaders(credentials);

      const response1 = await fetch(`${BASE_URL}/rest/api/3/myself`, { headers });
      expect(response1.ok).toBe(true);

      const response2 = await fetch(`${BASE_URL}/rest/api/3/myself`, { headers });
      expect(response2.ok).toBe(true);

      // Step 4: Later validation check (token still valid)
      const stillValid = await strategy.validateTokenWithBitbucket(credentials);
      expect(stillValid).toBe(true);
    });

    it('should handle token revocation mid-session', async () => {
      // Step 1: Authenticate with valid token
      const config: AuthConfig = {
        bitbucket_url: BASE_URL,
        auth_method: 'pat',
        pat: { token: 'valid-pat-token' },
      };

      const credentials = await strategy.authenticate(config);

      // Step 2: Initial validation succeeds
      const isValidInitially = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValidInitially).toBe(true);

      // Step 3: Token is revoked (simulated by changing token)
      credentials.access_token = 'revoked-token';

      // Step 4: Validation now fails
      const isValidAfterRevocation = await strategy.validateTokenWithBitbucket(credentials);
      expect(isValidAfterRevocation).toBe(false);
    });
  });
});
