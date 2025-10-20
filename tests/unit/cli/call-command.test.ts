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

// Mock all dynamic imports
vi.mock('../../../src/core/config-manager.js', () => ({
    ConfigManager: {
        load: vi.fn().mockResolvedValue({
            bitbucket_url: 'https://bitbucket.example.com',
            auth_method: 'pat',
            rateLimit: 100,
            forceFileStorage: false,
        }),
    },
}));

vi.mock('../../../src/services/bitbucket-client.js', () => ({
    BitbucketClientService: vi.fn().mockImplementation(() => ({
        executeOperation: vi.fn().mockResolvedValue({ success: true, data: { id: '123' } }),
    })),
}));

vi.mock('../../../src/auth/auth-manager.js', () => ({
    AuthManager: vi.fn().mockImplementation(() => ({
        getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer token' }),
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
            warn: vi.fn(),
        }),
    },
}));

vi.mock('../../../src/core/rate-limiter.js', () => ({
    RateLimiter: vi.fn().mockImplementation(() => ({
        tryAcquire: vi.fn().mockReturnValue(true),
    })),
}));

vi.mock('../../../src/data/operations-repository.js', () => ({
    JsonOperationsRepository: vi.fn().mockImplementation(() => ({
        getOperation: vi.fn().mockReturnValue({
            operationId: 'get_project',
            method: 'GET',
            path: '/rest/api/1.0/projects/{projectKey}',
            summary: 'Get project',
            parameters: [
                {
                    name: 'projectKey',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                },
            ],
        }),
    })),
}));

vi.mock('../../../src/tools/call-id-tool.js', () => ({
    CallIdTool: vi.fn().mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue({
            success: true,
            data: { id: '123', key: 'PROJ' },
        }),
    })),
}));

// Mock console to suppress output during tests
const mockConsole = {
    log: vi.fn(),
    error: vi.fn(),
};
vi.stubGlobal('console', mockConsole);

describe('callCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should execute operation with parameters', async () => {
        const { callCommand } = await import('../../../src/cli/call-command.js');

        await callCommand('get_project', {
            param: ['projectKey=TEST'],
            json: false,
            dryRun: false,
        });

        expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle dry run mode', async () => {
        const { callCommand } = await import('../../../src/cli/call-command.js');

        await callCommand('get_project', {
            param: ['projectKey=TEST'],
            json: false,
            dryRun: true,
        });

        expect(mockConsole.log).toHaveBeenCalledWith(
            expect.stringContaining('Dry run mode'),
        );
    });

    it('should output JSON when json flag is set', async () => {
        const { callCommand } = await import('../../../src/cli/call-command.js');

        await callCommand('get_project', {
            param: ['projectKey=TEST'],
            json: true,
            dryRun: false,
        });

        expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle missing operation gracefully', async () => {
        const { callCommand } = await import('../../../src/cli/call-command.js');

        // Mock the repository to return null
        const { JsonOperationsRepository } = await import(
            '../../../src/data/operations-repository.js'
        );
        vi.mocked(JsonOperationsRepository).mockImplementationOnce(() => ({
            getOperation: vi.fn().mockReturnValue(null),
        }));

        await expect(
            callCommand('nonexistent_operation', {
                param: [],
                json: false,
                dryRun: false,
            }),
        ).rejects.toThrow();
    });

    it('should parse multiple parameters correctly', async () => {
        const { callCommand } = await import('../../../src/cli/call-command.js');

        await callCommand('create_issue', {
            param: ['projectKey=TEST', 'summary=New Issue', 'priority=HIGH'],
            json: false,
            dryRun: true,
        });

        expect(mockConsole.log).toHaveBeenCalled();
    });
});
