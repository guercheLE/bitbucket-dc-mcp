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

import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../../src/core/logger.js';
import { JsonOperationsRepository } from '../../../src/data/operations-repository.js';

describe('JsonOperationsRepository', () => {
  const mockOperationsPath = path.join(__dirname, 'mock-operations.json');
  let logger: ReturnType<typeof Logger.getInstance>;

  beforeEach(() => {
    vi.clearAllMocks();
    Logger.configure({ level: 'silent', pretty: false });
    logger = Logger.getInstance();
  });

  it('should load and index operations on first access', () => {
    const mockData = JSON.stringify({
      _metadata: {
        generated_at: '2025-01-01T00:00:00Z',
        total_operations: 2,
      },
      operations: [
        {
          operationId: 'get_project',
          method: 'GET',
          path: '/rest/api/1.0/projects/{projectKey}',
          summary: 'Get project',
          description: 'Returns the project details',
          tags: ['Projects'],
          parameters: [],
          responses: {},
        },
        {
          operationId: 'create_repository',
          method: 'POST',
          path: '/rest/api/1.0/projects/{projectKey}/repos',
          summary: 'Create repository',
          description: 'Creates a new repository',
          tags: ['Repositories'],
          parameters: [],
          responses: {},
        },
      ],
    });

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockData);

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    const operation = repository.getOperation('get_project');

    expect(operation).not.toBeNull();
    expect(operation?.operationId).toBe('get_project');
    expect(operation?.method).toBe('GET');
    expect(fs.readFileSync).toHaveBeenCalledWith(mockOperationsPath, 'utf-8');
  });

  it('should return null for non-existent operation', () => {
    const mockData = JSON.stringify({
      _metadata: { generated_at: '2025-01-01T00:00:00Z', total_operations: 0 },
      operations: [],
    });

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockData);

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    const operation = repository.getOperation('nonexistent_operation');

    expect(operation).toBeNull();
  });

  it('should cache operations map after first load', () => {
    const mockData = JSON.stringify({
      _metadata: { generated_at: '2025-01-01T00:00:00Z', total_operations: 1 },
      operations: [
        {
          operationId: 'get_project',
          method: 'GET',
          path: '/rest/api/1.0/projects/{projectKey}',
          summary: 'Get project',
          description: 'Returns the project details',
          tags: ['Projects'],
          parameters: [],
          responses: {},
        },
      ],
    });

    const readFileSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue(mockData);

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    repository.getOperation('get_project');
    repository.getOperation('get_project');

    // File should only be read once
    expect(readFileSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle operations with all optional fields', () => {
    const mockData = JSON.stringify({
      _metadata: { generated_at: '2025-01-01T00:00:00Z', total_operations: 1 },
      operations: [
        {
          operationId: 'simple_operation',
          method: 'GET',
          path: '/rest/api/1.0/simple',
          summary: 'Simple operation',
          description: 'A simple operation',
          tags: ['Simple'],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {
            '200': { description: 'Success' },
          },
        },
      ],
    });

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockData);

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    const operation = repository.getOperation('simple_operation');

    expect(operation).not.toBeNull();
    expect(operation?.parameters).toBeDefined();
    expect(operation?.requestBody).toBeDefined();
    expect(operation?.responses).toBeDefined();
  });

  it('should get operation count', () => {
    const mockData = JSON.stringify({
      _metadata: { generated_at: '2025-01-01T00:00:00Z', total_operations: 3 },
      operations: [
        {
          operationId: 'op1',
          method: 'GET',
          path: '/path1',
          summary: 'Op 1',
          description: 'Operation 1',
          tags: [],
          parameters: [],
          responses: {},
        },
        {
          operationId: 'op2',
          method: 'POST',
          path: '/path2',
          summary: 'Op 2',
          description: 'Operation 2',
          tags: [],
          parameters: [],
          responses: {},
        },
        {
          operationId: 'op3',
          method: 'PUT',
          path: '/path3',
          summary: 'Op 3',
          description: 'Operation 3',
          tags: [],
          parameters: [],
          responses: {},
        },
      ],
    });

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockData);

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    const count = repository.getOperationCount();

    expect(count).toBe(3);
  });

  it('should handle deprecated operations', () => {
    const mockData = JSON.stringify({
      _metadata: { generated_at: '2025-01-01T00:00:00Z', total_operations: 1 },
      operations: [
        {
          operationId: 'deprecated_op',
          method: 'GET',
          path: '/deprecated',
          summary: 'Deprecated operation',
          description: 'This operation is deprecated',
          tags: [],
          parameters: [],
          responses: {},
          deprecated: true,
        },
      ],
    });

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockData);

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    const operation = repository.getOperation('deprecated_op');

    expect(operation).not.toBeNull();
    expect(operation?.deprecated).toBe(true);
  });

  it('should throw error when operations file cannot be read', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('File not found');
    });

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    expect(() => repository.getOperation('any_operation')).toThrow(
      'Failed to load operations: File not found',
    );
  });

  it('should throw error when operations file contains invalid JSON', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid json }');

    const repository = new JsonOperationsRepository(mockOperationsPath, logger);

    expect(() => repository.getOperation('any_operation')).toThrow('Failed to load operations');
  });
});
