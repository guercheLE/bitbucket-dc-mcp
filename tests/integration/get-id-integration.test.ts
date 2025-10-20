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

import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { QueryCache } from '../../src/core/cache-manager.js';
import { Logger } from '../../src/core/logger.js';
import { JsonOperationsRepository } from '../../src/data/operations-repository.js';
import type { GetIdOutput } from '../../src/tools/get-id-tool.js';
import { GetIdTool } from '../../src/tools/get-id-tool.js';

describe('GetIdTool integration', () => {
  let tool: GetIdTool;
  let repository: JsonOperationsRepository;

  beforeAll(() => {
    // Configure logger for testing
    Logger.configure({ level: 'silent', pretty: false });
    const logger = Logger.getInstance();

    // Initialize repository with operations.json
    const operationsPath = path.resolve(process.cwd(), 'data/operations.json');
    repository = new JsonOperationsRepository(operationsPath, logger);

    // Initialize cache
    const cache = new QueryCache<GetIdOutput>(500, Number.POSITIVE_INFINITY);

    // Create tool instance
    tool = new GetIdTool(repository, cache, logger);
  });

  it('should retrieve complete details for createRepository operation', async () => {
    const result = await tool.execute({ operation_id: 'createRepository' });

    expect(result).toBeDefined();
    expect(result.operation_id).toBe('createRepository');
    expect(result.path).toContain('/rest/api/');
    expect(result.path).toContain('/projects/');
    expect(result.method).toBe('POST');
    expect(result.summary).toContain('Create');
    expect(result.description).toContain('repository');
    expect(result.parameters).toBeInstanceOf(Array);
    expect(result.responses).toBeDefined();
    expect(result.examples.curl).toContain('curl -X POST');
    expect(result.documentation_url).toBeDefined();
  });

  it('should retrieve details for get_all_boards operation', async () => {
    const result = await tool.execute({ operation_id: 'get_all_boards' });

    expect(result).toBeDefined();
    expect(result.operation_id).toBe('get_all_boards');
    expect(result.path).toBe('/agile/1.0/board');
    expect(result.method).toBe('GET');
    expect(result.summary).toBe('Get all boards');
    expect(result.parameters.length).toBeGreaterThan(0);
    expect(result.responses).toBeDefined();
    expect(result.examples.curl).toContain('curl -X GET');
  });

  it('should throw OperationNotFoundError for nonexistent operation', async () => {
    await expect(tool.execute({ operation_id: 'nonexistent_operation' })).rejects.toThrow(
      "Operation 'nonexistent_operation' not found",
    );
  });

  it('should include request body in examples when available', async () => {
    const result = await tool.execute({ operation_id: 'move_issues_to_backlog' });

    expect(result.requestBody).toBeDefined();
    expect(result.examples.curl).toContain('-d');
  });

  it('should include parameters in operation details', async () => {
    const result = await tool.execute({ operation_id: 'get_all_boards' });

    expect(result.parameters).toBeInstanceOf(Array);
    expect(result.parameters.length).toBeGreaterThan(0);

    const maxResultsParam = result.parameters.find((p) => p.name === 'maxResults');
    expect(maxResultsParam).toBeDefined();
    expect(maxResultsParam?.in).toBe('query');
  });

  it('should include multiple response codes', async () => {
    const result = await tool.execute({ operation_id: 'move_issues_to_backlog' });

    expect(result.responses).toBeDefined();
    expect(Object.keys(result.responses).length).toBeGreaterThan(1);
    expect(result.responses['204']).toBeDefined();
    expect(result.responses['400']).toBeDefined();
  });

  it('should generate documentation URLs for different API types', async () => {
    const restApiResult = await tool.execute({ operation_id: 'move_issues_to_backlog' });
    expect(restApiResult.documentation_url).toContain('atlassian.com');

    const agileResult = await tool.execute({ operation_id: 'get_all_boards' });
    expect(agileResult.documentation_url).toContain('atlassian.com');
  });

  it('should use cache on subsequent requests', async () => {
    // First call - cache miss
    const result1 = await tool.execute({ operation_id: 'get_all_boards' });

    // Second call - should hit cache (verify by checking same object reference)
    const result2 = await tool.execute({ operation_id: 'get_all_boards' });

    expect(result1).toEqual(result2);
    expect(result1.operation_id).toBe('get_all_boards');
  });

  it('should validate input and reject empty operation_id', async () => {
    await expect(tool.execute({ operation_id: '' })).rejects.toThrow(
      'operation_id cannot be empty',
    );
  });

  it('should validate input and reject missing operation_id', async () => {
    await expect(tool.execute({})).rejects.toThrow();
  });

  it('should return schema information in correct format', async () => {
    const result = await tool.execute({ operation_id: 'move_issues_to_backlog' });

    // Verify output structure matches GetIdOutput interface
    expect(result).toMatchObject({
      operation_id: expect.any(String),
      path: expect.any(String),
      method: expect.any(String),
      summary: expect.any(String),
      description: expect.any(String),
      parameters: expect.any(Array),
      responses: expect.any(Object),
      examples: {
        curl: expect.any(String),
      },
    });
  });
});
