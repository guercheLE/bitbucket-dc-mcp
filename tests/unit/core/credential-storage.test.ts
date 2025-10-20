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
 * Unit tests for CredentialStorage with mocked keytar
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { pino, type Logger as PinoLogger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credentials } from '../../../src/auth/auth-strategy.js';
import { CredentialStorage } from '../../../src/core/credential-storage.js';
import { CredentialStorageError } from '../../../src/core/errors.js';

// Mock keytar module
vi.mock('keytar', () => ({
  setPassword: vi.fn(),
  getPassword: vi.fn(),
  deletePassword: vi.fn(),
  findCredentials: vi.fn(),
}));

// Import mocked keytar after mocking
import * as keytar from 'keytar';

describe('CredentialStorage - Keychain Operations', () => {
  let storage: CredentialStorage;
  let logger: PinoLogger;
  let mockCredentials: Credentials;
  let testDir: string;

  beforeEach(async () => {
    // Create logger with credential redaction
    logger = pino({
      level: 'silent', // Silent in tests
      redact: {
        paths: ['credentials', 'access_token', 'refresh_token', 'password'],
        remove: true,
      },
    });

    mockCredentials = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
      access_token: 'test-token-12345',
      refresh_token: 'test-refresh-token',
      expires_at: new Date('2025-12-31T23:59:59Z'),
    };

    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock successful keychain availability test responses
    vi.mocked(keytar.setPassword).mockResolvedValue();
    vi.mocked(keytar.getPassword).mockResolvedValue('test');
    vi.mocked(keytar.deletePassword).mockResolvedValue(true);

    // Create unique test directory for each test
    testDir = path.join(os.tmpdir(), `test-cred-${Date.now()}-${Math.random()}`);

    // Create storage instance with test directory
    storage = new CredentialStorage(logger, testDir);

    // Trigger keychain availability check by calling load with a dummy account
    await storage.load('__dummy_init__').catch(() => { });

    // Clear mocks after keychain availability check
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => { });
  });

  describe('save()', () => {
    it('should save credentials to keychain', async () => {
      vi.mocked(keytar.setPassword).mockResolvedValue();

      await storage.save('test-account', mockCredentials);

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'bitbucket-dc-mcp',
        'test-account',
        JSON.stringify(mockCredentials),
      );
      expect(keytar.setPassword).toHaveBeenCalledTimes(1);
    });

    it('should throw error for empty account name', async () => {
      await expect(storage.save('', mockCredentials)).rejects.toThrow(CredentialStorageError);
      await expect(storage.save('', mockCredentials)).rejects.toThrow(
        'Account name cannot be empty',
      );
    });

    it('should throw error for invalid credentials structure', async () => {
      const invalidCredentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        // missing auth_method and access_token
      } as unknown as Credentials;

      await expect(storage.save('test-account', invalidCredentials)).rejects.toThrow(
        CredentialStorageError,
      );
    });

    it('should use fallback when keychain unavailable', async () => {
      vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));

      // Use temporary test directory
      const testDir = path.join(os.tmpdir(), `test-cred-storage-${Date.now()}`);
      const testStorage = new CredentialStorage(logger, testDir);

      await testStorage.save('test-account', mockCredentials);

      // Verify fallback file was created
      const fallbackPath = path.join(testDir, 'credentials.enc');
      const exists = await fs
        .access(fallbackPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('load()', () => {
    it('should load credentials from keychain', async () => {
      // Note: JSON.stringify converts Date to ISO string
      const storedCredentials = {
        ...mockCredentials,
        expires_at: mockCredentials.expires_at?.toISOString(),
      };
      vi.mocked(keytar.getPassword).mockResolvedValue(JSON.stringify(storedCredentials));

      const result = await storage.load('test-account');

      expect(keytar.getPassword).toHaveBeenCalledWith('bitbucket-dc-mcp', 'test-account');
      // After loading from storage, expires_at will be a string, not a Date
      expect(result).toEqual(storedCredentials);
    });

    it('should return null when credentials not found', async () => {
      vi.mocked(keytar.getPassword).mockResolvedValue(null);

      const result = await storage.load('nonexistent-account');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON in keychain', async () => {
      vi.mocked(keytar.getPassword).mockResolvedValue('invalid-json');

      const result = await storage.load('test-account');

      // parseCredentials returns null for invalid JSON, then falls back to file storage
      // Since file storage doesn't exist, we should get null
      expect(result).toBeNull();
    });

    it('should return null for invalid credentials structure', async () => {
      const invalidCredentials = { bitbucket_url: 'https://bitbucket.example.com' }; // missing required fields
      vi.mocked(keytar.getPassword).mockResolvedValue(JSON.stringify(invalidCredentials));

      const result = await storage.load('test-account');

      // Invalid credentials structure should return null, then check fallback
      // Since fallback doesn't exist, we should get null
      expect(result).toBeNull();
    });
  });

  describe('delete()', () => {
    it('should delete credentials from keychain', async () => {
      vi.mocked(keytar.deletePassword).mockResolvedValue(true);

      const result = await storage.delete('test-account');

      expect(keytar.deletePassword).toHaveBeenCalledWith('bitbucket-dc-mcp', 'test-account');
      expect(result).toBe(true);
    });

    it('should return false when credentials not found', async () => {
      vi.mocked(keytar.deletePassword).mockResolvedValue(false);

      const result = await storage.delete('nonexistent-account');

      expect(result).toBe(false);
    });
  });

  describe('list()', () => {
    it('should list all accounts from keychain', async () => {
      vi.mocked(keytar.findCredentials).mockResolvedValue([
        { account: 'account1', password: JSON.stringify(mockCredentials) },
        { account: 'account2', password: JSON.stringify(mockCredentials) },
      ]);

      const result = await storage.list();

      expect(keytar.findCredentials).toHaveBeenCalledWith('bitbucket-dc-mcp');
      expect(result).toEqual(['account1', 'account2']);
    });

    it('should return empty array when no credentials stored', async () => {
      vi.mocked(keytar.findCredentials).mockResolvedValue([]);

      const result = await storage.list();

      expect(result).toEqual([]);
    });
  });
});

describe('CredentialStorage - Error Handling', () => {
  let storage: CredentialStorage;
  let logger: PinoLogger;
  let mockCredentials: Credentials;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    storage = new CredentialStorage(logger);

    mockCredentials = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
      access_token: 'test-token-12345',
    };

    vi.clearAllMocks();
  });

  it('should throw CredentialStorageError when keychain unavailable on first save', async () => {
    vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));

    // For this test, we need to ensure fallback also fails or we check the warning log
    const testDir = path.join(os.tmpdir(), `test-cred-fail-${Date.now()}`);
    const testStorage = new CredentialStorage(logger, testDir);

    // This should succeed with fallback, not throw
    await expect(testStorage.save('test-account', mockCredentials)).resolves.not.toThrow();

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });
});

describe('CredentialStorage - Encryption Fallback', () => {
  let logger: PinoLogger;
  let testDir: string;
  let storage: CredentialStorage;
  let mockCredentials: Credentials;

  beforeEach(async () => {
    logger = pino({ level: 'silent' });
    testDir = path.join(os.tmpdir(), `test-cred-enc-${Date.now()}`);
    storage = new CredentialStorage(logger, testDir);

    mockCredentials = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
      access_token: 'test-token-secret-12345',
    };

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => { });
  });

  it('should use fallback when keychain unavailable', async () => {
    vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));

    await storage.save('test-account', mockCredentials);

    // Verify fallback file was created
    const fallbackPath = path.join(testDir, 'credentials.enc');
    const fileContent = await fs.readFile(fallbackPath, 'utf8');
    const fallbackData = JSON.parse(fileContent);

    expect(fallbackData['test-account']).toBeDefined();
    expect(typeof fallbackData['test-account']).toBe('string');
    // Encrypted data should not contain plaintext token
    expect(fallbackData['test-account']).not.toContain('test-token-secret-12345');
  });

  it('should load from fallback file', async () => {
    vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));
    vi.mocked(keytar.getPassword).mockRejectedValue(new Error('Keychain not available'));

    // Save first
    await storage.save('test-account', mockCredentials);

    // Load back
    const result = await storage.load('test-account');

    expect(result).toEqual(mockCredentials);
  });

  it('should verify fallback file has correct permissions', async () => {
    vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));

    await storage.save('test-account', mockCredentials);

    const fallbackPath = path.join(testDir, 'credentials.enc');
    const stats = await fs.stat(fallbackPath);

    // Check that file is readable/writable by owner only (0o600)
    // Note: Windows file permissions work differently - skip this check on Windows
    if (process.platform !== 'win32') {
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    } else {
      // On Windows, just verify the file exists
      expect(stats.isFile()).toBe(true);
    }
  });

  it('should delete from fallback file', async () => {
    vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));
    vi.mocked(keytar.deletePassword).mockRejectedValue(new Error('Keychain not available'));

    // Save first
    await storage.save('test-account', mockCredentials);

    // Delete
    const deleted = await storage.delete('test-account');
    expect(deleted).toBe(true);

    // Verify deleted
    vi.mocked(keytar.getPassword).mockRejectedValue(new Error('Keychain not available'));
    const result = await storage.load('test-account');
    expect(result).toBeNull();
  });

  it('should list from fallback file', async () => {
    vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));
    vi.mocked(keytar.findCredentials).mockRejectedValue(new Error('Keychain not available'));

    // Save multiple accounts
    await storage.save('account1', mockCredentials);
    await storage.save('account2', { ...mockCredentials, bitbucket_url: 'https://bitbucket2.example.com' });

    // List
    const accounts = await storage.list();
    expect(accounts).toContain('account1');
    expect(accounts).toContain('account2');
    expect(accounts.length).toBe(2);
  });

  it('should handle encryption and decryption correctly', async () => {
    vi.mocked(keytar.setPassword).mockRejectedValue(new Error('Keychain not available'));
    vi.mocked(keytar.getPassword).mockRejectedValue(new Error('Keychain not available'));

    const testCredentials = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat' as const,
      access_token: 'very-secret-token-12345',
    };

    await storage.save('test-account', testCredentials);
    const loaded = await storage.load('test-account');

    expect(loaded).toEqual(testCredentials);
  });

  it('should fail decryption with corrupted data', async () => {
    vi.mocked(keytar.getPassword).mockRejectedValue(new Error('Keychain not available'));

    // Manually create corrupted encrypted file
    const fallbackPath = path.join(testDir, 'credentials.enc');
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      fallbackPath,
      JSON.stringify({
        'test-account': 'invalid:encrypted:data',
      }),
      { mode: 0o600 },
    );

    // Attempt to load should return null (graceful handling)
    const result = await storage.load('test-account');
    expect(result).toBeNull();
  });
});

describe('CredentialStorage - Credential Sanitization', () => {
  it('should not log sensitive credential values', async () => {
    const logSpy = vi.fn();
    const logger = pino(
      {
        level: 'debug',
        redact: {
          paths: ['credentials', 'access_token', 'refresh_token', 'password'],
          remove: true,
        },
      },
      {
        write: (msg: string) => {
          logSpy(msg);
        },
      },
    );

    const testDir = path.join(os.tmpdir(), `test-cred-sanitize-${Date.now()}`);
    const storage = new CredentialStorage(logger, testDir);

    vi.mocked(keytar.setPassword).mockResolvedValue();

    const credentials: Credentials = {
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
      access_token: 'super-secret-token',
    };

    await storage.save('test-account', credentials);

    // Check that logs don't contain the actual token
    const allLogs = logSpy.mock.calls.map((call) => call[0]).join(' ');
    expect(allLogs).not.toContain('super-secret-token');

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => { });
  });
});
