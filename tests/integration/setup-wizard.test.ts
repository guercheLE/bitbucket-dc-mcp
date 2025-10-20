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
 * Integration tests for Interactive Setup Wizard
 *
 * These tests simulate full wizard flows with mocked user inputs
 * and verify that configuration files and credentials are saved correctly.
 *
 * Run with: RUN_INTEGRATION_TESTS=true npm test
 */

import * as fs from 'fs/promises';
import inquirer from 'inquirer';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import { beforeEach, expect, it, vi } from 'vitest';
import { describeIfIntegration } from '../helpers/skip-integration.js';

// Mock all external dependencies before importing modules
vi.mock('inquirer');
vi.mock('fs/promises');
vi.mock('js-yaml');
vi.mock('../../src/core/logger.js', () => ({
  Logger: {
    configure: vi.fn(),
    getInstance: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));
vi.mock('../../src/core/credential-storage.js');

// Import after mocks
const { runSetupWizard } = await import('../../src/cli/setup-wizard.js');
const { CredentialStorage } = await import('../../src/core/credential-storage.js');

// Mock global fetch
global.fetch = vi.fn();

describeIfIntegration('Setup Wizard - Full PAT Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock file system operations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    vi.mocked(fs.unlink).mockResolvedValue(undefined);

    // Mock YAML dump
    vi.mocked(yaml.dump).mockReturnValue('bitbucket_url: https://bitbucket.example.com\n');

    // Mock CredentialStorage
    const mockCredentialStorage = {
      save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(CredentialStorage).mockImplementation(() => mockCredentialStorage as any);

    // Mock fetch for connectivity and auth tests
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        version: '9.0.0',
        displayName: 'Test User',
        emailAddress: 'test@example.com',
      }),
      text: async () => 'OK',
    } as Response);
  });

  it('should complete full wizard with PAT auth', async () => {
    // Mock all user prompts
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket.example.com' }) // Bitbucket URL
      .mockResolvedValueOnce({ authMethod: 'pat' }) // Auth method
      .mockResolvedValueOnce({ token: 'test-token-123' }) // PAT token
      .mockResolvedValueOnce({ configureOptional: false }) // Skip optional settings
      .mockResolvedValueOnce({ testNow: false }); // Skip test

    await runSetupWizard();

    // Verify config directory created
    expect(fs.mkdir).toHaveBeenCalledWith(
      path.join(os.homedir(), '.bitbucket-mcp'),
      expect.objectContaining({ recursive: true }),
    );

    // Verify config file written
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join(os.homedir(), '.bitbucket-mcp', 'config.yml'),
      expect.any(String),
      expect.objectContaining({ mode: 0o600 }),
    );

    // Verify credentials saved
    const mockStorage = new CredentialStorage({} as any);
    expect(mockStorage.save).toHaveBeenCalledWith(
      'bitbucket-mcp:https://bitbucket.example.com',
      expect.objectContaining({
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'test-token-123',
      }),
    );
  });

  it('should complete wizard with optional settings', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket.example.com' })
      .mockResolvedValueOnce({ authMethod: 'pat' })
      .mockResolvedValueOnce({ token: 'test-token-123' })
      .mockResolvedValueOnce({ configureOptional: true }) // Configure optional
      .mockResolvedValueOnce({
        // Optional settings
        rateLimit: 150,
        timeout: 45000,
        logLevel: 'debug',
        cacheSize: 2000,
        retryAttempts: 5,
      })
      .mockResolvedValueOnce({ testNow: false });

    await runSetupWizard();

    // Verify YAML dump called with custom settings
    expect(yaml.dump).toHaveBeenCalledWith(
      expect.objectContaining({
        rate_limit: 150,
        timeout: 45000,
        log_level: 'debug',
        cache_size: 2000,
        retry_attempts: 5,
      }),
      expect.any(Object),
    );
  });
});

describeIfIntegration('Setup Wizard - Full Basic Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    vi.mocked(yaml.dump).mockReturnValue('bitbucket_url: https://bitbucket.example.com\n');

    const mockCredentialStorage = {
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(CredentialStorage).mockImplementation(() => mockCredentialStorage as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        displayName: 'Test User',
        emailAddress: 'test@example.com',
      }),
    } as Response);
  });

  it('should complete wizard with Basic Auth', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket.example.com' })
      .mockResolvedValueOnce({ authMethod: 'basic' })
      .mockResolvedValueOnce({ username: 'testuser', password: 'testpass' })
      .mockResolvedValueOnce({ configureOptional: false })
      .mockResolvedValueOnce({ testNow: false });

    await runSetupWizard();

    const mockStorage = new CredentialStorage({} as any);
    expect(mockStorage.save).toHaveBeenCalledWith(
      'bitbucket-mcp:https://bitbucket.example.com',
      expect.objectContaining({
        auth_method: 'basic',
        username: 'testuser',
        password: 'testpass',
      }),
    );
  });
});

describeIfIntegration('Setup Wizard - OAuth2 Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    vi.mocked(yaml.dump).mockReturnValue('bitbucket_url: https://bitbucket.example.com\n');

    const mockCredentialStorage = {
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(CredentialStorage).mockImplementation(() => mockCredentialStorage as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ version: '9.0.0' }),
    } as Response);
  });

  it('should complete wizard with OAuth2', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket.example.com' })
      .mockResolvedValueOnce({ authMethod: 'oauth2' })
      .mockResolvedValueOnce({
        clientId: 'client-123',
        clientSecret: 'secret-456',
        callbackPort: 8080,
      })
      .mockResolvedValueOnce({ configureOptional: false })
      .mockResolvedValueOnce({ testNow: false });

    await runSetupWizard();

    const mockStorage = new CredentialStorage({} as any);
    expect(mockStorage.save).toHaveBeenCalledWith(
      'bitbucket-mcp:https://bitbucket.example.com',
      expect.objectContaining({
        auth_method: 'oauth2',
        client_id: 'client-123',
        client_secret: 'secret-456',
        callback_port: 8080,
      }),
    );
  });
});

describeIfIntegration('Setup Wizard - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
  });

  it('should handle network errors during connectivity test', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket.example.com' })
      .mockResolvedValueOnce({ continueAnyway: true }) // Continue after network error
      .mockResolvedValueOnce({ authMethod: 'pat' })
      .mockResolvedValueOnce({ token: 'test-token' })
      .mockResolvedValueOnce({ configureOptional: false })
      .mockResolvedValueOnce({ testNow: false });

    await runSetupWizard();

    // Should complete despite network error
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('should handle invalid credentials and retry', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        // Connectivity test succeeds
        ok: true,
        json: async () => ({ version: '9.0.0' }),
      } as Response)
      .mockResolvedValueOnce({
        // First auth attempt fails
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid token',
      } as Response)
      .mockResolvedValueOnce({
        // Second auth attempt succeeds
        ok: true,
        json: async () => ({
          displayName: 'Test User',
          emailAddress: 'test@example.com',
        }),
      } as Response);

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket.example.com' })
      .mockResolvedValueOnce({ authMethod: 'pat' })
      .mockResolvedValueOnce({ token: 'invalid-token' }) // First attempt
      .mockResolvedValueOnce({ retry: true }) // Retry after failure
      .mockResolvedValueOnce({ token: 'valid-token' }) // Second attempt
      .mockResolvedValueOnce({ configureOptional: false })
      .mockResolvedValueOnce({ testNow: false });

    await runSetupWizard();

    // Should succeed after retry
    const mockStorage = new CredentialStorage({} as any);
    expect(mockStorage.save).toHaveBeenCalledWith(
      'bitbucket-mcp:https://bitbucket.example.com',
      expect.objectContaining({
        access_token: 'valid-token',
      }),
    );
  });

  it('should handle user cancellation during setup', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket.example.com' })
      .mockResolvedValueOnce({ continueAnyway: false }); // User cancels

    await expect(runSetupWizard()).rejects.toThrow('Setup cancelled by user');
  });
});

describeIfIntegration('Setup Wizard - Resume Capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    vi.mocked(yaml.dump).mockReturnValue('bitbucket_url: https://bitbucket.example.com\n');

    const mockCredentialStorage = {
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(CredentialStorage).mockImplementation(() => mockCredentialStorage as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        displayName: 'Test User',
        emailAddress: 'test@example.com',
      }),
    } as Response);
  });

  it('should resume partial setup', async () => {
    // Mock partial setup file exists
    const partialState = {
      bitbucketUrl: 'https://bitbucket.example.com',
      authMethod: 'pat',
    };

    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(partialState));

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ resume: true }) // Resume partial setup
      .mockResolvedValueOnce({ token: 'test-token' }) // Complete credentials
      .mockResolvedValueOnce({ configureOptional: false })
      .mockResolvedValueOnce({ testNow: false });

    await runSetupWizard();

    // Should not prompt for Bitbucket URL or auth method (already in partial state)
    // Should complete setup with remaining steps
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('config.yml'),
      expect.any(String),
      expect.any(Object),
    );
  });

  it('should start fresh when user declines resume', async () => {
    const partialState = {
      bitbucketUrl: 'https://bitbucket-old.example.com',
    };

    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(partialState));

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ resume: false }) // Don't resume
      .mockResolvedValueOnce({ bitbucketUrl: 'https://bitbucket-new.example.com' }) // New URL
      .mockResolvedValueOnce({ authMethod: 'pat' })
      .mockResolvedValueOnce({ token: 'test-token' })
      .mockResolvedValueOnce({ configureOptional: false })
      .mockResolvedValueOnce({ testNow: false });

    await runSetupWizard();

    // Should use new URL, not the one from partial state
    expect(yaml.dump).toHaveBeenCalledWith(
      expect.objectContaining({
        bitbucket_url: 'https://bitbucket-new.example.com',
      }),
      expect.any(Object),
    );
  });
});
