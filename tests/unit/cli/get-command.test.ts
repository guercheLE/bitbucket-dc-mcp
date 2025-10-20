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

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(
    JSON.stringify({
      _metadata: {
        generated_at: '2025-01-01T00:00:00Z',
        total_operations: 518,
      },
      operations: [
        {
          operationId: 'get_project',
          method: 'GET',
          path: '/rest/api/1.0/projects/{projectKey}',
          summary: 'Get project',
          description: 'Returns the project details',
          tags: ['Projects'],
          parameters: [
            {
              name: 'projectKey',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'The project key',
            },
          ],
          responses: {
            '200': {
              description: 'Success',
            },
          },
        },
      ],
    }),
  ),
}));

describe('getCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display operation details in table format', async () => {
    const { getCommand } = await import('../../../src/cli/get-command.js');

    await getCommand('get_project', {
      json: false,
      verbose: false,
    });

    expect(mockConsole.log).toHaveBeenCalled();
  });

  it('should output JSON when json flag is set', async () => {
    const { getCommand } = await import('../../../src/cli/get-command.js');

    await getCommand('get_project', {
      json: true,
      verbose: false,
    });

    expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"operationId"'));
  });

  it('should show verbose details when verbose flag is set', async () => {
    const { getCommand } = await import('../../../src/cli/get-command.js');

    await getCommand('get_project', {
      json: false,
      verbose: true,
    });

    expect(mockConsole.log).toHaveBeenCalled();
  });

  it('should handle operation not found', async () => {
    const { getCommand } = await import('../../../src/cli/get-command.js');
    const fs = await import('fs');

    // Mock empty operations
    vi.mocked(fs.readFileSync).mockReturnValueOnce(
      JSON.stringify({
        _metadata: { generated_at: '2025-01-01T00:00:00Z', total_operations: 0 },
        operations: [],
      }),
    );

    await expect(getCommand('nonexistent_operation', { json: false })).rejects.toThrow();
  });

  it('should handle missing operations.json file', async () => {
    const { getCommand } = await import('../../../src/cli/get-command.js');
    const fs = await import('fs');

    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await expect(getCommand('get_project', { json: false })).rejects.toThrow();
  });
});
