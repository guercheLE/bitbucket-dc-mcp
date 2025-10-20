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

// Mock console to suppress output during tests
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};
vi.stubGlobal('console', mockConsole);

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal('process', { ...process, exit: mockExit });

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(`
bitbucket_url: https://bitbucket.example.com
auth_method: pat
  `),
}));

vi.mock('js-yaml', () => ({
  load: vi.fn().mockReturnValue({
    bitbucket_url: 'https://bitbucket.example.com',
    auth_method: 'pat',
  }),
}));

vi.mock('../../../src/core/config-manager.js', () => ({
  ConfigManager: {
    load: vi.fn().mockResolvedValue({
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
    }),
  },
}));

vi.mock('../../../src/auth/auth-manager.js', () => ({
  AuthManager: vi.fn().mockImplementation(() => ({
    testConnection: vi.fn().mockResolvedValue({
      success: true,
      user: { name: 'testuser', displayName: 'Test User' },
    }),
  })),
}));

vi.mock('../../../src/core/credential-storage.js', () => ({
  CredentialStorage: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../../src/core/logger.js', () => ({
  Logger: {
    getInstance: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe('testConnectionCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should test connection successfully', async () => {
    const { testConnectionCommand } = await import('../../../src/cli/test-connection-command.js');

    await testConnectionCommand({});

    expect(mockConsole.log).toHaveBeenCalled();
  });

  it('should handle missing config file', async () => {
    const { testConnectionCommand } = await import('../../../src/cli/test-connection-command.js');
    const fs = await import('fs');

    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await testConnectionCommand({});

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle invalid config', async () => {
    const { testConnectionCommand } = await import('../../../src/cli/test-connection-command.js');
    const yaml = await import('js-yaml');

    vi.mocked(yaml.load).mockReturnValueOnce({
      // Missing required fields
    });

    await testConnectionCommand({});

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
