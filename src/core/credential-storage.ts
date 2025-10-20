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
 * Secure Credential Storage with OS Keychain Integration
 *
 * This module provides secure credential storage using OS-native keychains:
 * - macOS: Keychain Access
 * - Windows: Credential Manager
 * - Linux: Secret Service API (GNOME Keyring, KDE Wallet)
 *
 * When keychain is unavailable (e.g., Linux without libsecret), it falls back
 * to encrypted file storage using AES-256-GCM encryption with machine-specific keys.
 */

import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as keytar from 'keytar';
import * as os from 'os';
import * as path from 'path';
import type { Logger as PinoLogger } from 'pino';
import type { Credentials } from '../auth/auth-strategy.js';
import { CredentialStorageError, CredentialStorageErrorCodes } from './errors.js';

/**
 * Type guard to validate Credentials structure
 */
function isValidCredentials(obj: unknown): obj is Credentials {
  if (!obj || typeof obj !== 'object') return false;
  const cred = obj as Partial<Credentials>;
  return (
    typeof cred.bitbucket_url === 'string' &&
    typeof cred.auth_method === 'string' &&
    ['oauth2', 'pat', 'oauth1', 'basic'].includes(cred.auth_method)
  );
}

/**
 * CredentialStorage provides secure storage for Bitbucket credentials using OS keychain
 * with encrypted file fallback when keychain is unavailable.
 */
export class CredentialStorage {
  private static readonly SERVICE_NAME = 'bitbucket-dc-mcp';
  private readonly logger: PinoLogger;
  private readonly fallbackFilePath: string;
  private machineIdCache?: string;
  private encryptionKeyCache?: Buffer;
  private useKeychain = true;
  private keychainCheckComplete = false;
  private readonly forceFileStorage: boolean;

  /**
   * Create a new CredentialStorage instance
   * @param logger - Pino logger instance (must have credential sanitization configured)
   * @param fallbackDir - Directory for fallback encrypted file (default: ~/.bitbucket-dc-mcp)
   * @param forceFileStorage - Force use of encrypted file storage instead of OS keychain (default: false)
   */
  constructor(logger: PinoLogger, fallbackDir?: string, forceFileStorage = false) {
    this.logger = logger;
    const baseDir = fallbackDir || path.join(os.homedir(), '.bitbucket-dc-mcp');
    this.fallbackFilePath = path.join(baseDir, 'credentials.enc');
    this.forceFileStorage = forceFileStorage;

    if (forceFileStorage) {
      this.useKeychain = false;
      this.keychainCheckComplete = true;
      this.logger.info(
        'Credential storage configured to use encrypted file storage (keychain disabled)',
      );
    }
  }

  /**
   * Test if keychain is available and working
   * @returns true if keychain is functional, false otherwise
   * @private
   */
  private async testKeychainAvailability(): Promise<boolean> {
    if (this.keychainCheckComplete) {
      return this.useKeychain;
    }

    if (this.forceFileStorage) {
      this.keychainCheckComplete = true;
      return false;
    }

    try {
      // Test keytar functions exist and work
      const testAccount = '__bitbucket_dc_mcp_test__';
      const testValue = 'test';

      // Test setPassword
      if (typeof keytar.setPassword !== 'function') {
        throw new Error('keytar.setPassword is not a function');
      }

      await keytar.setPassword(CredentialStorage.SERVICE_NAME, testAccount, testValue);

      // Test getPassword
      if (typeof keytar.getPassword !== 'function') {
        throw new Error('keytar.getPassword is not a function');
      }

      const retrieved = await keytar.getPassword(CredentialStorage.SERVICE_NAME, testAccount);

      // Test deletePassword
      if (typeof keytar.deletePassword !== 'function') {
        throw new Error('keytar.deletePassword is not a function');
      }

      await keytar.deletePassword(CredentialStorage.SERVICE_NAME, testAccount);

      // Verify the test worked
      if (retrieved !== testValue) {
        throw new Error('Keychain test failed: value mismatch');
      }

      this.useKeychain = true;
      this.keychainCheckComplete = true;
      this.logger.info(
        'Keychain availability test passed, using OS keychain for credential storage',
      );
      return true;
    } catch (error) {
      this.useKeychain = false;
      this.keychainCheckComplete = true;
      this.logger.warn(
        { error: (error as Error).message },
        'Keychain unavailable or not functional, using encrypted file storage',
      );
      return false;
    }
  }

  /**
   * Save credentials securely to OS keychain or encrypted file fallback
   * @param account - Account identifier (profile name or bitbucket_url)
   * @param credentials - Credentials to store
   */
  async save(account: string, credentials: Credentials): Promise<void> {
    if (!account || account.trim().length === 0) {
      throw new CredentialStorageError(
        CredentialStorageErrorCodes.INVALID_CREDENTIALS,
        'Account name cannot be empty',
      );
    }

    if (!isValidCredentials(credentials)) {
      throw new CredentialStorageError(
        CredentialStorageErrorCodes.INVALID_CREDENTIALS,
        'Invalid credentials structure',
      );
    }

    const jsonString = JSON.stringify(credentials);

    // Test keychain availability if not already checked
    if (!this.keychainCheckComplete) {
      await this.testKeychainAvailability();
    }

    if (this.useKeychain) {
      try {
        await keytar.setPassword(CredentialStorage.SERVICE_NAME, account, jsonString);
        this.logger.info(
          { account, service: CredentialStorage.SERVICE_NAME },
          'Credentials saved to keychain',
        );
        return;
      } catch (error) {
        // Keychain failed unexpectedly, switch to fallback permanently
        this.logger.warn(
          { account, error: (error as Error).message },
          'Keychain operation failed, switching to encrypted file fallback',
        );
        this.useKeychain = false;
        this.keychainCheckComplete = true;
      }
    }

    // Save to fallback file
    await this.saveFallback(account, jsonString);
  }

  /**
   * Load credentials from OS keychain or encrypted file fallback
   * @param account - Account identifier to load
   * @returns Credentials object or null if not found
   */
  async load(account: string): Promise<Credentials | null> {
    // Test keychain availability if not already checked
    if (!this.keychainCheckComplete) {
      await this.testKeychainAvailability();
    }

    if (this.useKeychain) {
      try {
        const jsonString = await keytar.getPassword(CredentialStorage.SERVICE_NAME, account);
        if (jsonString) {
          const credentials = this.parseCredentials(jsonString, account);
          if (credentials) {
            this.logger.debug({ account }, 'Credentials loaded from keychain');
          }
          return credentials;
        }
        // Not found in keychain, try fallback
      } catch (error) {
        // Keychain failed, switch to fallback permanently
        this.logger.warn(
          { error: (error as Error).message },
          'Keychain operation failed, switching to fallback mode',
        );
        this.useKeychain = false;
        this.keychainCheckComplete = true;
      }
    }

    // Load from fallback
    return await this.loadFallback(account);
  }

  /**
   * Delete credentials from OS keychain or encrypted file fallback
   * @param account - Account identifier to delete
   * @returns true if deleted, false if not found
   */
  async delete(account: string): Promise<boolean> {
    let deletedFromKeychain = false;

    try {
      deletedFromKeychain = await keytar.deletePassword(CredentialStorage.SERVICE_NAME, account);
      if (deletedFromKeychain) {
        this.logger.info({ account }, 'Credentials deleted from keychain');
      }
    } catch (error) {
      this.logger.debug(
        { error: (error as Error).message },
        'Failed to delete from keychain, trying fallback',
      );
    }

    // Also try to delete from fallback
    const deletedFromFallback = await this.deleteFallback(account);

    return deletedFromKeychain || deletedFromFallback;
  }

  /**
   * List all stored account identifiers
   * @returns Array of account names
   */
  async list(): Promise<string[]> {
    const accounts = new Set<string>();

    try {
      const credentials = await keytar.findCredentials(CredentialStorage.SERVICE_NAME);
      credentials.forEach((cred) => accounts.add(cred.account));
    } catch (error) {
      this.logger.debug({ error: (error as Error).message }, 'Failed to list from keychain');
    }

    // Also check fallback
    try {
      const fallbackAccounts = await this.listFallback();
      fallbackAccounts.forEach((acc) => accounts.add(acc));
    } catch (error) {
      this.logger.debug({ error: (error as Error).message }, 'Failed to list from fallback');
    }

    return Array.from(accounts);
  }

  /**
   * Parse and validate credentials JSON string
   */
  private parseCredentials(jsonString: string, account: string): Credentials | null {
    try {
      const parsed = JSON.parse(jsonString);
      if (isValidCredentials(parsed)) {
        return parsed;
      } else {
        this.logger.warn({ account }, 'Invalid credentials structure in storage');
        return null;
      }
    } catch (error) {
      this.logger.warn(
        { account, error: (error as Error).message },
        'Failed to parse credentials JSON',
      );
      return null;
    }
  }

  /**
   * Get machine-specific identifier for encryption key derivation
   * Cached after first computation
   */
  private async getMachineId(): Promise<string> {
    if (this.machineIdCache) {
      return this.machineIdCache;
    }

    const platform = process.platform;
    let machineId: string;

    try {
      if (platform === 'darwin') {
        // macOS: Hardware UUID
        const output = execSync("system_profiler SPHardwareDataType | grep 'Hardware UUID'", {
          encoding: 'utf8',
        });
        const match = output.match(/Hardware UUID:\s*(.+)/);
        machineId = match ? match[1].trim() : '';
      } else if (platform === 'win32') {
        // Windows: Machine GUID
        const output = execSync('wmic csproduct get UUID', { encoding: 'utf8' });
        const lines = output.split('\n').filter((line) => line.trim() && !line.includes('UUID'));
        machineId = lines[0]?.trim() || '';
      } else if (platform === 'linux') {
        // Linux: machine-id
        try {
          machineId = (await fs.readFile('/etc/machine-id', 'utf8')).trim();
        } catch {
          machineId = (await fs.readFile('/var/lib/dbus/machine-id', 'utf8')).trim();
        }
      } else {
        machineId = '';
      }
    } catch (error) {
      this.logger.debug(
        { error: (error as Error).message },
        'Failed to get machine-specific ID, using fallback',
      );
      machineId = '';
    }

    // Fallback: hash of hostname + username
    if (!machineId) {
      const hostname = os.hostname();
      const username = os.userInfo().username;
      machineId = crypto.createHash('sha256').update(`${hostname}-${username}`).digest('hex');
    }

    this.machineIdCache = machineId;
    return machineId;
  }

  /**
   * Derive AES-256 encryption key from machine ID
   */
  private async deriveEncryptionKey(machineId: string): Promise<Buffer> {
    if (this.encryptionKeyCache) {
      return this.encryptionKeyCache;
    }

    const key = crypto.pbkdf2Sync(machineId, 'bitbucket-dc-mcp-v1', 100000, 32, 'sha256');
    this.encryptionKeyCache = key;
    return key;
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   */
  private async encrypt(plaintext: string, key: Buffer): Promise<string> {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:ciphertext (all base64)
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
    } catch (error) {
      throw new CredentialStorageError(
        CredentialStorageErrorCodes.ENCRYPTION_FAILED,
        'Failed to encrypt credentials',
        { message: (error as Error).message },
      );
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   */
  private async decrypt(encrypted: string, key: Buffer): Promise<string> {
    try {
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const ciphertext = parts[2];

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      throw new CredentialStorageError(
        CredentialStorageErrorCodes.DECRYPTION_FAILED,
        'Failed to decrypt credentials',
        { message: (error as Error).message },
      );
    }
  }

  /**
   * Save credentials to encrypted fallback file
   */
  private async saveFallback(account: string, jsonString: string): Promise<void> {
    const machineId = await this.getMachineId();
    const key = await this.deriveEncryptionKey(machineId);
    const encrypted = await this.encrypt(jsonString, key);

    // Ensure directory exists
    const dir = path.dirname(this.fallbackFilePath);
    await fs.mkdir(dir, { recursive: true });

    // Load existing fallback data
    let fallbackData: Record<string, string> = {};
    try {
      const content = await fs.readFile(this.fallbackFilePath, 'utf8');
      fallbackData = JSON.parse(content);
    } catch {
      // File doesn't exist yet or is invalid, start fresh
    }

    // Add/update account
    fallbackData[account] = encrypted;

    // Write file with restricted permissions
    await fs.writeFile(this.fallbackFilePath, JSON.stringify(fallbackData, null, 2), {
      mode: 0o600, // Owner read/write only
    });

    this.logger.info({ account }, 'Credentials saved to encrypted fallback file');
  }

  /**
   * Load credentials from encrypted fallback file
   */
  private async loadFallback(account: string): Promise<Credentials | null> {
    try {
      const content = await fs.readFile(this.fallbackFilePath, 'utf8');
      const fallbackData: Record<string, string> = JSON.parse(content);

      const encrypted = fallbackData[account];
      if (!encrypted) {
        return null;
      }

      const machineId = await this.getMachineId();
      const key = await this.deriveEncryptionKey(machineId);
      const jsonString = await this.decrypt(encrypted, key);

      return this.parseCredentials(jsonString, account);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      this.logger.warn(
        { account, error: (error as Error).message },
        'Failed to load from fallback',
      );
      return null;
    }
  }

  /**
   * Delete credentials from encrypted fallback file
   */
  private async deleteFallback(account: string): Promise<boolean> {
    try {
      const content = await fs.readFile(this.fallbackFilePath, 'utf8');
      const fallbackData: Record<string, string> = JSON.parse(content);

      if (!(account in fallbackData)) {
        return false;
      }

      delete fallbackData[account];

      if (Object.keys(fallbackData).length === 0) {
        // Remove file if empty
        await fs.unlink(this.fallbackFilePath);
      } else {
        await fs.writeFile(this.fallbackFilePath, JSON.stringify(fallbackData, null, 2), {
          mode: 0o600,
        });
      }

      this.logger.info({ account }, 'Credentials deleted from fallback file');
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false; // File doesn't exist
      }
      this.logger.debug({ error: (error as Error).message }, 'Failed to delete from fallback');
      return false;
    }
  }

  /**
   * List accounts from encrypted fallback file
   */
  private async listFallback(): Promise<string[]> {
    try {
      const content = await fs.readFile(this.fallbackFilePath, 'utf8');
      const fallbackData: Record<string, string> = JSON.parse(content);
      return Object.keys(fallbackData);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []; // File doesn't exist
      }
      return [];
    }
  }
}
