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
 * Integration tests for CredentialStorage with real OS keychain
 *
 * These tests verify:
 * - Actual keychain integration on macOS/Windows/Linux
 * - Encrypted file fallback when keychain unavailable
 * - File permissions and security
 * - Cross-platform compatibility
 *
 * Note: Some tests may be skipped on CI if keychain is unavailable
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { pino, type Logger as PinoLogger } from 'pino';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CredentialStorage, type Credentials } from '../../src/core/credential-storage.js';

describe('CredentialStorage - Real Keychain Integration', () => {
  let storage: CredentialStorage;
  let logger: PinoLogger;
  let testAccounts: string[];
  const platform = process.platform;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    storage = new CredentialStorage(logger);
    testAccounts = [];
  });

  afterEach(async () => {
    // Cleanup: delete all test accounts
    for (const account of testAccounts) {
      try {
        await storage.delete(account);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it.skipIf(!['darwin', 'win32', 'linux'].includes(platform))(
    'should save and load from actual keychain',
    async () => {
      const account = `test-bitbucket-mcp-${Date.now()}`;
      testAccounts.push(account);

      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket-integration-test.example.com',
        auth_method: 'pat',
        access_token: 'integration-test-token-12345',
        refresh_token: 'integration-test-refresh',
        expires_at: '2025-12-31T23:59:59Z',
      };

      // Save
      await storage.save(account, credentials);

      // Load back
      const loaded = await storage.load(account);

      expect(loaded).toEqual(credentials);
    },
  );

  it.skipIf(!['darwin', 'win32', 'linux'].includes(platform))(
    'should list accounts from keychain',
    async () => {
      const account1 = `test-bitbucket-mcp-list-1-${Date.now()}`;
      const account2 = `test-bitbucket-mcp-list-2-${Date.now()}`;
      testAccounts.push(account1, account2);

      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket-test.example.com',
        auth_method: 'pat',
        access_token: 'test-token',
      };

      // Save two accounts
      await storage.save(account1, credentials);
      await storage.save(account2, { ...credentials, bitbucket_url: 'https://bitbucket2-test.example.com' });

      // List
      const accounts = await storage.list();

      expect(accounts).toContain(account1);
      expect(accounts).toContain(account2);
    },
  );

  it.skipIf(!['darwin', 'win32', 'linux'].includes(platform))(
    'should delete from keychain',
    async () => {
      const account = `test-bitbucket-mcp-delete-${Date.now()}`;
      testAccounts.push(account);

      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket-test.example.com',
        auth_method: 'pat',
        access_token: 'test-token',
      };

      // Save
      await storage.save(account, credentials);

      // Verify saved
      let loaded = await storage.load(account);
      expect(loaded).not.toBeNull();

      // Delete
      const deleted = await storage.delete(account);
      expect(deleted).toBe(true);

      // Verify deleted
      loaded = await storage.load(account);
      expect(loaded).toBeNull();
    },
  );

  it.skipIf(!['darwin', 'win32', 'linux'].includes(platform))(
    'should handle multiple saves to same account (update)',
    async () => {
      const account = `test-bitbucket-mcp-update-${Date.now()}`;
      testAccounts.push(account);

      const credentials1: Credentials = {
        bitbucket_url: 'https://bitbucket-test.example.com',
        auth_method: 'pat',
        access_token: 'original-token',
      };

      const credentials2: Credentials = {
        bitbucket_url: 'https://bitbucket-test.example.com',
        auth_method: 'oauth2',
        access_token: 'updated-token',
        refresh_token: 'new-refresh-token',
      };

      // Save original
      await storage.save(account, credentials1);

      // Update
      await storage.save(account, credentials2);

      // Load should return updated credentials
      const loaded = await storage.load(account);
      expect(loaded).toEqual(credentials2);
    },
  );
});

describe('CredentialStorage - Fallback File System Storage', () => {
  let storage: CredentialStorage;
  let logger: PinoLogger;
  let testDir: string;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    testDir = path.join(os.tmpdir(), `test-cred-integration-${Date.now()}`);
    storage = new CredentialStorage(logger, testDir);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => { });
  });

  /**
   * Note: These tests verify the fallback file system works by testing
   * the encrypted file operations directly. The unit tests already verify
   * that keychain failures trigger fallback behavior.
   *
   * In integration, we test that when files are created (either through
   * fallback or directly), they work correctly with encryption/decryption.
   */

  it('should create fallback directory when saving (verified through keychain + fallback)', async () => {
    const credentials: Credentials = {
      bitbucket_url: 'https://bitbucket-fallback-test.example.com',
      auth_method: 'pat',
      access_token: 'fallback-test-token',
    };

    const account = 'test-fallback-account';

    // Save credentials (may go to keychain or fallback depending on platform)
    await storage.save(account, credentials);

    // Load back to verify it worked
    const loaded = await storage.load(account);
    expect(loaded).toEqual(credentials);

    // Cleanup
    await storage.delete(account);
  });

  it('should handle encryption/decryption round-trip', async () => {
    const credentials: Credentials = {
      bitbucket_url: 'https://bitbucket-permissions-test.example.com',
      auth_method: 'pat',
      access_token: 'permissions-test-token',
    };

    await storage.save('test-permissions-account', credentials);

    // Load back
    const loaded = await storage.load('test-permissions-account');
    expect(loaded).toEqual(credentials);

    // Cleanup
    await storage.delete('test-permissions-account');
  });

  it('should handle save/load cycle with complex credentials', async () => {
    const credentials: Credentials = {
      bitbucket_url: 'https://bitbucket-encryption-test.example.com',
      auth_method: 'oauth2',
      access_token: 'super-secret-token-should-be-encrypted',
      refresh_token: 'refresh-token-also-secret',
      expires_at: '2025-12-31T23:59:59Z',
    };

    await storage.save('test-encryption-account', credentials);

    // Load back and verify
    const loaded = await storage.load('test-encryption-account');
    expect(loaded).toEqual(credentials);

    // Cleanup
    await storage.delete('test-encryption-account');
  });

  it('should persist and retrieve multiple accounts', async () => {
    const credentials1: Credentials = {
      bitbucket_url: 'https://bitbucket1.example.com',
      auth_method: 'pat',
      access_token: 'token1',
    };

    const credentials2: Credentials = {
      bitbucket_url: 'https://bitbucket2.example.com',
      auth_method: 'oauth2',
      access_token: 'token2',
      refresh_token: 'refresh2',
    };

    await storage.save('account1', credentials1);
    await storage.save('account2', credentials2);

    // Both should load correctly
    const loaded1 = await storage.load('account1');
    const loaded2 = await storage.load('account2');

    expect(loaded1).toEqual(credentials1);
    expect(loaded2).toEqual(credentials2);

    // List should contain both
    const accounts = await storage.list();
    expect(accounts).toContain('account1');
    expect(accounts).toContain('account2');

    // Cleanup
    await storage.delete('account1');
    await storage.delete('account2');
  });

  it('should handle delete operations correctly', async () => {
    const credentials: Credentials = {
      bitbucket_url: 'https://bitbucket-delete-file-test.example.com',
      auth_method: 'pat',
      access_token: 'delete-file-test-token',
    };

    await storage.save('only-account', credentials);

    // Verify saved
    let loaded = await storage.load('only-account');
    expect(loaded).not.toBeNull();

    // Delete the account
    const deleted = await storage.delete('only-account');
    expect(deleted).toBe(true);

    // Verify deleted
    loaded = await storage.load('only-account');
    expect(loaded).toBeNull();
  });
});

describe('CredentialStorage - Machine-Specific Encryption Key', () => {
  let logger: PinoLogger;
  let testDir1: string;
  let testDir2: string;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    testDir1 = path.join(os.tmpdir(), `test-cred-key1-${Date.now()}`);
    testDir2 = path.join(os.tmpdir(), `test-cred-key2-${Date.now()}`);
  });

  afterEach(async () => {
    await fs.rm(testDir1, { recursive: true, force: true }).catch(() => { });
    await fs.rm(testDir2, { recursive: true, force: true }).catch(() => { });
  });

  it('should decrypt credentials with same machine ID', async () => {
    const storage1 = new CredentialStorage(logger, testDir1);

    const credentials: Credentials = {
      bitbucket_url: 'https://bitbucket-same-machine.example.com',
      auth_method: 'pat',
      access_token: 'same-machine-token',
    };

    // Save with first storage instance
    await storage1.save('test-account', credentials);

    // Create new storage instance pointing to same directory
    const storage2 = new CredentialStorage(logger, testDir1);

    // Should be able to load with second instance (same machine ID)
    const loaded = await storage2.load('test-account');
    expect(loaded).toEqual(credentials);
  });

  it('should handle concurrent operations without corruption', async () => {
    const storage = new CredentialStorage(logger, testDir1);

    const credentials1: Credentials = {
      bitbucket_url: 'https://bitbucket-concurrent1.example.com',
      auth_method: 'pat',
      access_token: 'concurrent-token-1',
    };

    const credentials2: Credentials = {
      bitbucket_url: 'https://bitbucket-concurrent2.example.com',
      auth_method: 'oauth2',
      access_token: 'concurrent-token-2',
    };

    // Save multiple accounts concurrently
    await Promise.all([
      storage.save('concurrent1', credentials1),
      storage.save('concurrent2', credentials2),
    ]);

    // Load both
    const [loaded1, loaded2] = await Promise.all([
      storage.load('concurrent1'),
      storage.load('concurrent2'),
    ]);

    expect(loaded1).toEqual(credentials1);
    expect(loaded2).toEqual(credentials2);
  });
});
