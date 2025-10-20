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

/**
 * Unit tests for ConfigManager
 * Tests environment variable configuration and priority
 */

import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigManager } from '../../../src/core/config-manager.js';

describe('ConfigManager', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env.BITBUCKET_URL;
    delete process.env.BITBUCKET_AUTH_METHOD;
    delete process.env.BITBUCKET_RATE_LIMIT;
    delete process.env.BITBUCKET_TIMEOUT_MS;
    delete process.env.LOG_LEVEL;
    delete process.env.CACHE_SIZE;
    delete process.env.RETRY_ATTEMPTS;
    delete process.env.SHUTDOWN_TIMEOUT_MS;
    delete process.env.LOG_PRETTY;
    delete process.env.BITBUCKET_CREDENTIAL_PROFILE;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Environment Variable Support', () => {
    it('should load BITBUCKET_URL from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket-test.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field

      const config = await ConfigManager.load();

      expect(config.bitbucketUrl).toBe('https://bitbucket-test.example.com');
    });

    it('should load BITBUCKET_AUTH_METHOD from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'basic';

      const config = await ConfigManager.load();

      expect(config.authMethod).toBe('basic');
    });

    it('should load LOG_LEVEL from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.LOG_LEVEL = 'debug';

      const config = await ConfigManager.load();

      expect(config.logLevel).toBe('debug');
    });

    it('should load BITBUCKET_RATE_LIMIT from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.BITBUCKET_RATE_LIMIT = '150';

      const config = await ConfigManager.load();

      expect(config.rateLimit).toBe(150);
    });

    it('should load BITBUCKET_TIMEOUT_MS from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.BITBUCKET_TIMEOUT_MS = '60000';

      const config = await ConfigManager.load();

      expect(config.timeout).toBe(60_000);
    });

    it('should load CACHE_SIZE from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.CACHE_SIZE = '2000';

      const config = await ConfigManager.load();

      expect(config.cacheSize).toBe(2000);
    });

    it('should load RETRY_ATTEMPTS from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.RETRY_ATTEMPTS = '5';

      const config = await ConfigManager.load();

      expect(config.retryAttempts).toBe(5);
    });

    it('should load SHUTDOWN_TIMEOUT_MS from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.SHUTDOWN_TIMEOUT_MS = '60000';

      const config = await ConfigManager.load();

      expect(config.shutdownTimeoutMs).toBe(60_000);
    });

    it('should load LOG_PRETTY from environment (true)', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.LOG_PRETTY = 'true';

      const config = await ConfigManager.load();

      expect(config.logPretty).toBe(true);
    });

    it('should load LOG_PRETTY from environment (1)', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.LOG_PRETTY = '1';

      const config = await ConfigManager.load();

      expect(config.logPretty).toBe(true);
    });

    it('should load LOG_PRETTY from environment (false)', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.LOG_PRETTY = 'false';

      const config = await ConfigManager.load();

      expect(config.logPretty).toBe(false);
    });

    it('should load BITBUCKET_CREDENTIAL_PROFILE from environment', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.BITBUCKET_CREDENTIAL_PROFILE = 'production';

      const config = await ConfigManager.load();

      expect(config.credentialProfile).toBe('production');
    });
  });

  describe('Configuration Priority', () => {
    it('should prioritize environment variables over defaults', async () => {
      process.env.BITBUCKET_URL = 'https://env.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'oauth2'; // Required field
      process.env.LOG_LEVEL = 'debug';

      const config = await ConfigManager.load();

      expect(config.bitbucketUrl).toBe('https://env.example.com');
      expect(config.logLevel).toBe('debug');
    });

    it('should prioritize explicit overrides over environment variables', async () => {
      process.env.BITBUCKET_URL = 'https://env.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'oauth2'; // Required field
      process.env.LOG_LEVEL = 'debug';

      const config = await ConfigManager.load({
        bitbucketUrl: 'https://override.example.com',
        logLevel: 'error',
      });

      expect(config.bitbucketUrl).toBe('https://override.example.com');
      expect(config.logLevel).toBe('error');
    });

    it('should use defaults when no environment variables or overrides provided', async () => {
      // Provide required fields
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat';

      const config = await ConfigManager.load();

      // Check defaults for optional fields
      expect(config.rateLimit).toBe(100);
      expect(config.timeout).toBe(30000);
      expect(config.logLevel).toBe('info');
      expect(config.authMethod).toBe('pat');
      expect(config.rateLimit).toBe(100);
      expect(config.timeout).toBe(30_000);
      expect(config.logLevel).toBe('info');
      expect(config.logPretty).toBe(false);
    });
  });

  describe('Docker-Specific Environment Variables', () => {
    it('should configure for PAT authentication via env vars', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat';
      // Note: BITBUCKET_TOKEN would be handled separately in credential storage

      const config = await ConfigManager.load();

      expect(config.bitbucketUrl).toBe('https://bitbucket.example.com');
      expect(config.authMethod).toBe('pat');
    });

    it('should configure for Basic authentication via env vars', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'basic';
      // Note: BITBUCKET_USERNAME and BITBUCKET_PASSWORD handled in credential storage

      const config = await ConfigManager.load();

      expect(config.bitbucketUrl).toBe('https://bitbucket.example.com');
      expect(config.authMethod).toBe('basic');
    });

    it('should support all valid auth methods', async () => {
      const authMethods = ['oauth2', 'pat', 'oauth1', 'basic'] as const;

      for (const method of authMethods) {
        process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
        process.env.BITBUCKET_AUTH_METHOD = method;

        const config = await ConfigManager.load();

        expect(config.authMethod).toBe(method);
      }
    });

    it('should ignore invalid auth method and use default', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'invalid-method';

      // Should throw because auth_method is still invalid
      await expect(ConfigManager.load()).rejects.toThrow(/Config validation failed/);
    });

    it('should handle complete Docker environment configuration', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.docker.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat';
      process.env.LOG_LEVEL = 'info';
      process.env.BITBUCKET_RATE_LIMIT = '100';
      process.env.BITBUCKET_TIMEOUT_MS = '30000';
      process.env.LOG_PRETTY = 'false';

      const config = await ConfigManager.load();

      expect(config.bitbucketUrl).toBe('https://bitbucket.docker.com');
      expect(config.authMethod).toBe('pat');
      expect(config.logLevel).toBe('info');
      expect(config.rateLimit).toBe(100);
      expect(config.timeout).toBe(30_000);
      expect(config.logPretty).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should reject invalid URL', async () => {
      process.env.BITBUCKET_URL = 'not-a-valid-url';

      await expect(ConfigManager.load()).rejects.toThrow();
    });

    it('should reject negative rate limit', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.BITBUCKET_RATE_LIMIT = '-1';

      const config = await ConfigManager.load();

      // Should ignore invalid value and use default
      expect(config.rateLimit).toBe(100);
    });

    it('should reject invalid log level', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.LOG_LEVEL = 'invalid';

      const config = await ConfigManager.load();

      // Should ignore invalid value and use default
      expect(config.logLevel).toBe('info');
    });

    it('should handle non-numeric values gracefully', async () => {
      process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
      process.env.BITBUCKET_AUTH_METHOD = 'pat'; // Required field
      process.env.BITBUCKET_RATE_LIMIT = 'not-a-number';
      process.env.BITBUCKET_TIMEOUT_MS = 'abc';

      const config = await ConfigManager.load();

      // Should use defaults for invalid numeric values
      expect(config.rateLimit).toBe(100);
      expect(config.timeout).toBe(30_000);
    });
  });
});
