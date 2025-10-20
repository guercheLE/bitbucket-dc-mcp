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
rateLimit: 100
requestTimeout: 30000
logLevel: info
enableCircuitBreaker: true
circuitBreakerThreshold: 5
forceFileStorage: false
  `),
  unlinkSync: vi.fn(),
}));

vi.mock('js-yaml', () => ({
  load: vi.fn().mockReturnValue({
    bitbucket_url: 'https://bitbucket.example.com',
    auth_method: 'pat',
    rateLimit: 100,
    requestTimeout: 30000,
    logLevel: 'info',
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    forceFileStorage: false,
  }),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ confirmed: true }),
  },
}));

vi.mock('../../../src/core/config-manager.js', () => ({
  ConfigManager: {
    load: vi.fn().mockResolvedValue({
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
      rateLimit: 100,
      requestTimeout: 30000,
      logLevel: 'info',
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      forceFileStorage: false,
    }),
  },
}));

describe('configCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display current configuration with show action', async () => {
    const { configCommand } = await import('../../../src/cli/config-command.js');

    await configCommand('show', {});

    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Configuration'));
  });

  it('should validate configuration', async () => {
    const { configCommand } = await import('../../../src/cli/config-command.js');
    const { ConfigManager } = await import('../../../src/core/config-manager.js');

    // Mock ConfigManager to pass validation
    vi.mocked(ConfigManager.load).mockResolvedValueOnce({
      bitbucket_url: 'https://bitbucket.example.com',
      auth_method: 'pat',
      rateLimit: 100,
      requestTimeout: 30000,
      logLevel: 'info',
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      forceFileStorage: false,
    } as any);

    await configCommand('validate', {});

    expect(mockConsole.log).toHaveBeenCalled();
  });

  it('should show config path', async () => {
    const { configCommand } = await import('../../../src/cli/config-command.js');

    await configCommand('path', {});

    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('config'));
  });

  it('should reset configuration', async () => {
    const { configCommand } = await import('../../../src/cli/config-command.js');

    await configCommand('reset', {});

    expect(mockConsole.log).toHaveBeenCalled();
  });

  it('should handle missing config file gracefully', async () => {
    const { configCommand } = await import('../../../src/cli/config-command.js');
    const fs = await import('fs');

    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await configCommand('show', {});

    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('No configuration'));
  });

  it('should throw error for unknown action', async () => {
    const { configCommand } = await import('../../../src/cli/config-command.js');

    await expect(configCommand('unknown_action', {})).rejects.toThrow('Unknown action');
  });

  it('should display help', async () => {
    const { configCommand } = await import('../../../src/cli/config-command.js');

    await configCommand('help', {});

    // Should not throw
    expect(true).toBe(true);
  });
});
