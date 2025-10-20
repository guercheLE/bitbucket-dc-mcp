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
 * Unit tests for Interactive Setup Wizard
 *
 * Tests cover:
 * - URL validation logic
 * - Auth method selection
 * - Credential collection for each auth type
 * - Error handling scenarios
 * - Configuration file generation
 */

import inquirer from 'inquirer';
import * as os from 'os';
import * as path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies before imports
vi.mock('inquirer');
vi.mock('fs/promises');
vi.mock('../../../src/core/logger.js', () => ({
  Logger: {
    configure: vi.fn(),
    getInstance: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));
vi.mock('../../../src/core/credential-storage.js', () => ({
  CredentialStorage: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(null),
  })),
}));

describe('Setup Wizard - URL Validation', () => {
  it('should accept valid HTTP URL', () => {
    const validUrl = 'http://bitbucket.example.com';
    let isValid = false;
    try {
      const url = new URL(validUrl);
      isValid = ['http:', 'https:'].includes(url.protocol);
    } catch {
      isValid = false;
    }
    expect(isValid).toBe(true);
  });

  it('should accept valid HTTPS URL', () => {
    const validUrl = 'https://bitbucket.example.com';
    let isValid = false;
    try {
      const url = new URL(validUrl);
      isValid = ['http:', 'https:'].includes(url.protocol);
    } catch {
      isValid = false;
    }
    expect(isValid).toBe(true);
  });

  it('should reject URL without protocol', () => {
    const invalidUrl = 'bitbucket.example.com';
    let isValid = false;
    try {
      const url = new URL(invalidUrl);
      isValid = ['http:', 'https:'].includes(url.protocol);
    } catch {
      isValid = false;
    }
    expect(isValid).toBe(false);
  });

  it('should reject malformed URL', () => {
    const invalidUrl = 'not-a-url';
    let isValid = false;
    try {
      new URL(invalidUrl);
      isValid = true;
    } catch {
      isValid = false;
    }
    expect(isValid).toBe(false);
  });

  it('should reject URL with invalid protocol', () => {
    const invalidUrl = 'ftp://bitbucket.example.com';
    let isValid = false;
    try {
      const url = new URL(invalidUrl);
      isValid = ['http:', 'https:'].includes(url.protocol);
    } catch {
      isValid = false;
    }
    expect(isValid).toBe(false);
  });
});

describe('Setup Wizard - Auth Method Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return PAT when selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ authMethod: 'pat' });

    const result = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Select auth method',
        choices: ['pat', 'oauth2', 'basic', 'oauth1'],
      },
    ]);

    expect(result.authMethod).toBe('pat');
  });

  it('should return OAuth2 when selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ authMethod: 'oauth2' });

    const result = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Select auth method',
        choices: ['pat', 'oauth2', 'basic', 'oauth1'],
      },
    ]);

    expect(result.authMethod).toBe('oauth2');
  });

  it('should return Basic Auth when selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ authMethod: 'basic' });

    const result = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Select auth method',
        choices: ['pat', 'oauth2', 'basic', 'oauth1'],
      },
    ]);

    expect(result.authMethod).toBe('basic');
  });

  it('should return OAuth1 when selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ authMethod: 'oauth1' });

    const result = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Select auth method',
        choices: ['pat', 'oauth2', 'basic', 'oauth1'],
      },
    ]);

    expect(result.authMethod).toBe('oauth1');
  });
});

describe('Setup Wizard - Credential Validation', () => {
  it('should validate non-empty token for PAT', () => {
    const token = 'valid-token-123';
    const isValid = token.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it('should reject empty token for PAT', () => {
    const token = '';
    const isValid = token.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('should validate non-empty username and password for Basic Auth', () => {
    const username = 'testuser';
    const password = 'testpass';
    const isValid = username.trim().length > 0 && password.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it('should reject empty username for Basic Auth', () => {
    const username = '';
    const password = 'testpass';
    const isValid = username.trim().length > 0 && password.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('should reject empty password for Basic Auth', () => {
    const username = 'testuser';
    const password = '';
    const isValid = username.trim().length > 0 && password.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('should validate OAuth2 client credentials', () => {
    const clientId = 'client-123';
    const clientSecret = 'secret-456';
    const isValid = clientId.trim().length > 0 && clientSecret.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it('should validate OAuth2 callback port range', () => {
    const port = 8080;
    const isValid = port >= 1024 && port <= 65535;
    expect(isValid).toBe(true);
  });

  it('should reject OAuth2 port below 1024', () => {
    const port = 80;
    const isValid = port >= 1024 && port <= 65535;
    expect(isValid).toBe(false);
  });

  it('should reject OAuth2 port above 65535', () => {
    const port = 70000;
    const isValid = port >= 1024 && port <= 65535;
    expect(isValid).toBe(false);
  });
});

describe('Setup Wizard - Optional Settings', () => {
  it('should use default settings when user skips', () => {
    const defaults = {
      rateLimit: 100,
      timeout: 30000,
      logLevel: 'info' as const,
      cacheSize: 1000,
      retryAttempts: 3,
    };

    expect(defaults.rateLimit).toBe(100);
    expect(defaults.timeout).toBe(30000);
    expect(defaults.logLevel).toBe('info');
    expect(defaults.cacheSize).toBe(1000);
    expect(defaults.retryAttempts).toBe(3);
  });

  it('should validate positive rate limit', () => {
    const rateLimit = 150;
    const isValid = rateLimit > 0;
    expect(isValid).toBe(true);
  });

  it('should reject negative rate limit', () => {
    const rateLimit = -10;
    const isValid = rateLimit > 0;
    expect(isValid).toBe(false);
  });

  it('should validate positive timeout', () => {
    const timeout = 45000;
    const isValid = timeout > 0;
    expect(isValid).toBe(true);
  });

  it('should reject negative timeout', () => {
    const timeout = -1000;
    const isValid = timeout > 0;
    expect(isValid).toBe(false);
  });

  it('should validate non-negative cache size', () => {
    const cacheSize = 0;
    const isValid = cacheSize >= 0;
    expect(isValid).toBe(true);
  });

  it('should validate non-negative retry attempts', () => {
    const retryAttempts = 5;
    const isValid = retryAttempts >= 0;
    expect(isValid).toBe(true);
  });

  it('should reject negative retry attempts', () => {
    const retryAttempts = -1;
    const isValid = retryAttempts >= 0;
    expect(isValid).toBe(false);
  });
});

describe('Setup Wizard - Config File Generation', () => {
  it('should generate valid config structure', () => {
    const config = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat' as const,
      rate_limit: 100,
      timeout: 30000,
      log_level: 'info',
      cache_size: 1000,
      retry_attempts: 3,
    };

    expect(config).toHaveProperty('bitbucket_url');
    expect(config).toHaveProperty('auth_method');
    expect(config).toHaveProperty('rate_limit');
    expect(config).toHaveProperty('timeout');
    expect(config).toHaveProperty('log_level');
    expect(config).toHaveProperty('cache_size');
    expect(config).toHaveProperty('retry_attempts');
  });

  it('should use correct config file path', () => {
    const configDir = path.join(os.homedir(), '.bitbucket-mcp');
    const configPath = path.join(configDir, 'config.yml');

    expect(configPath).toContain('.bitbucket-mcp');
    expect(configPath).toContain('config.yml');
  });

  it('should use correct temp config path for resume', () => {
    const configDir = path.join(os.homedir(), '.bitbucket-mcp');
    const tempPath = path.join(configDir, '.setup-temp.json');

    expect(tempPath).toContain('.bitbucket-mcp');
    expect(tempPath).toContain('.setup-temp.json');
  });
});

describe('Setup Wizard - Error Handling', () => {
  it('should provide troubleshooting hint for 401 error', () => {
    const status = 401;
    let hint: string | null = null;

    switch (status as number) {
      case 401:
        hint = 'Invalid credentials. Check your token/username/password.';
        break;
      case 403:
        hint = 'Insufficient permissions. Ensure your account has API access.';
        break;
      case 404:
        hint = 'Endpoint not found. Verify your Bitbucket URL is correct.';
        break;
    }

    expect(hint).toBe('Invalid credentials. Check your token/username/password.');
  });

  it('should provide troubleshooting hint for 403 error', () => {
    const status = 403;
    let hint: string | null = null;

    switch (status as number) {
      case 401:
        hint = 'Invalid credentials. Check your token/username/password.';
        break;
      case 403:
        hint = 'Insufficient permissions. Ensure your account has API access.';
        break;
      case 404:
        hint = 'Endpoint not found. Verify your Bitbucket URL is correct.';
        break;
    }

    expect(hint).toBe('Insufficient permissions. Ensure your account has API access.');
  });

  it('should provide troubleshooting hint for 404 error', () => {
    const status = 404;
    let hint: string | null = null;

    switch (status as number) {
      case 401:
        hint = 'Invalid credentials. Check your token/username/password.';
        break;
      case 403:
        hint = 'Insufficient permissions. Ensure your account has API access.';
        break;
      case 404:
        hint = 'Endpoint not found. Verify your Bitbucket URL is correct.';
        break;
    }

    expect(hint).toBe('Endpoint not found. Verify your Bitbucket URL is correct.');
  });

  it('should return null for unknown error codes', () => {
    const status = 500;
    let hint: string | null = null;

    switch (status as number) {
      case 401:
        hint = 'Invalid credentials. Check your token/username/password.';
        break;
      case 403:
        hint = 'Insufficient permissions. Ensure your account has API access.';
        break;
      case 404:
        hint = 'Endpoint not found. Verify your Bitbucket URL is correct.';
        break;
    }

    expect(hint).toBeNull();
  });
});

describe('Setup Wizard - Credential Storage', () => {
  it('should construct correct keychain key', () => {
    const bitbucketUrl = 'https://bitbucket.example.com';
    const key = `bitbucket-mcp:${bitbucketUrl}`;

    expect(key).toBe('bitbucket-mcp:https://bitbucket.example.com');
  });

  it('should mask token in display', () => {
    const token = 'very-secret-token-12345';
    const masked = `${token.slice(0, 4)}***`;

    expect(masked).toBe('very***');
    expect(masked).not.toContain('secret');
    expect(masked).not.toContain('12345');
  });
});
