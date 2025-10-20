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

import type { Logger as PinoLogger } from 'pino';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { QueryCache } from '../../../src/core/cache-manager.js';
import type { Operation, OperationsRepository } from '../../../src/tools/get-id-tool.js';
import {
  GetIdInputSchema,
  GetIdTool,
  OperationNotFoundError,
} from '../../../src/tools/get-id-tool.js';

type LoggerStub = PinoLogger & {
  info: Mock;
  error: Mock;
  debug: Mock;
  warn: Mock;
};

function createLoggerStub(): LoggerStub {
  return {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    level: 'info',
  } as unknown as LoggerStub;
}

describe('GetIdTool', () => {
  let tool: GetIdTool;
  let mockRepository: {
    getOperation: Mock;
  };
  let mockCache: {
    get: Mock;
    set: Mock;
  };
  let logger: LoggerStub;

  const sampleOperation: Operation = {
    operationId: 'create_issue',
    path: '/rest/api/3/issue',
    method: 'post',
    summary: 'Create issue',
    description: 'Creates a new issue in Bitbucket',
    tags: ['issues'],
    parameters: [
      {
        name: 'updateHistory',
        in: 'query',
        required: false,
        schema: { type: 'boolean' },
        description: 'Whether to update history',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
          examples: {
            example1: {
              value: { fields: { summary: 'Test issue' } },
            },
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Issue created',
        content: {
          'application/json': {
            schema: { type: 'object' },
            examples: {
              response1: {
                value: { id: '10000', key: 'TEST-1' },
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    mockRepository = {
      getOperation: vi.fn(),
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
    };

    logger = createLoggerStub();

    tool = new GetIdTool(
      mockRepository as unknown as OperationsRepository,
      mockCache as unknown as QueryCache<never>,
      logger,
    );
  });

  describe('execute', () => {
    it('should return operation details from cache if available', async () => {
      const cachedOutput = {
        operation_id: 'create_issue',
        path: '/rest/api/3/issue',
        method: 'POST',
        summary: 'Create issue',
        description: 'Creates a new issue in Bitbucket',
        parameters: [],
        responses: {},
        examples: {
          curl: 'curl command',
        },
      };

      mockCache.get.mockReturnValue(cachedOutput);

      const result = await tool.execute({ operation_id: 'create_issue' });

      expect(result).toEqual(cachedOutput);
      expect(mockCache.get).toHaveBeenCalledWith('create_issue');
      expect(mockRepository.getOperation).not.toHaveBeenCalled();
      // Task 9: Cache hits now logged at INFO level with full metrics
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'get_id.success',
          cache_hit: true,
        }),
        expect.any(String),
      );
    });

    it('should query repository on cache miss and cache result', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(sampleOperation);

      const result = await tool.execute({ operation_id: 'create_issue' });

      expect(result.operation_id).toBe('create_issue');
      expect(result.method).toBe('POST');
      expect(result.path).toBe('/rest/api/3/issue');
      expect(mockRepository.getOperation).toHaveBeenCalledWith('create_issue');
      expect(mockCache.set).toHaveBeenCalledWith('create_issue', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'get_id.success' }),
        expect.any(String),
      );
    });

    it('should throw OperationNotFoundError if operation does not exist', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(null);

      await expect(tool.execute({ operation_id: 'nonexistent' })).rejects.toThrow(
        OperationNotFoundError,
      );
      await expect(tool.execute({ operation_id: 'nonexistent' })).rejects.toThrow(
        "Operation 'nonexistent' not found",
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'get_id.not_found' }),
        expect.any(String),
      );
    });

    it('should throw error for empty operation_id', async () => {
      await expect(tool.execute({ operation_id: '' })).rejects.toThrow(
        'operation_id cannot be empty',
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'get_id.validation_error' }),
        expect.any(String),
      );
    });

    it('should throw error for missing operation_id', async () => {
      await expect(tool.execute({})).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'get_id.validation_error' }),
        expect.any(String),
      );
    });

    it('should include deprecated flag when operation is deprecated', async () => {
      const deprecatedOp: Operation = {
        ...sampleOperation,
        deprecated: true,
      };

      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(deprecatedOp);

      const result = await tool.execute({ operation_id: 'create_issue' });

      expect(result.deprecated).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ deprecated: true }),
        expect.any(String),
      );
    });

    it('should generate curl command with method and path', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(sampleOperation);

      const result = await tool.execute({ operation_id: 'create_issue' });

      expect(result.examples.curl).toContain('curl -X POST');
      expect(result.examples.curl).toContain('/rest/api/3/issue');
      expect(result.examples.curl).toContain('Authorization: Basic');
    });

    it('should extract request example from requestBody', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(sampleOperation);

      const result = await tool.execute({ operation_id: 'create_issue' });

      expect(result.examples.request).toEqual({ fields: { summary: 'Test issue' } });
    });

    it('should extract response example from responses', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(sampleOperation);

      const result = await tool.execute({ operation_id: 'create_issue' });

      expect(result.examples.response).toEqual({ id: '10000', key: 'TEST-1' });
    });

    it('should return undefined examples when not available', async () => {
      const opWithoutExamples: Operation = {
        ...sampleOperation,
        requestBody: null,
        responses: {
          '200': {
            description: 'Success',
          },
        },
      };

      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(opWithoutExamples);

      const result = await tool.execute({ operation_id: 'test_op' });

      expect(result.examples.request).toBeUndefined();
      expect(result.examples.response).toBeUndefined();
    });

    it('should include documentation URL for REST API operations', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(sampleOperation);

      const result = await tool.execute({ operation_id: 'create_issue' });

      expect(result.documentation_url).toBe(
        'https://developer.atlassian.com/server/bitbucket/rest/v1000/intro/',
      );
    });

    it('should include documentation URL for Agile API operations', async () => {
      const agileOp: Operation = {
        ...sampleOperation,
        path: '/agile/1.0/board',
      };

      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(agileOp);

      const result = await tool.execute({ operation_id: 'get_board' });

      expect(result.documentation_url).toBe(
        'https://developer.atlassian.com/server/bitbucket/rest/v1000/intro/',
      );
    });

    it('should replace path parameters in curl command', async () => {
      const opWithPathParams: Operation = {
        ...sampleOperation,
        path: '/rest/api/3/issue/{issueIdOrKey}',
        parameters: [
          {
            name: 'issueIdOrKey',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
      };

      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(opWithPathParams);

      const result = await tool.execute({ operation_id: 'get_issue' });

      expect(result.examples.curl).toContain('/rest/api/3/issue/<issueIdOrKey>');
    });

    it('should include query parameters in curl command', async () => {
      const opWithQueryParams: Operation = {
        ...sampleOperation,
        parameters: [
          {
            name: 'maxResults',
            in: 'query',
            required: false,
            schema: { type: 'integer' },
          },
          {
            name: 'startAt',
            in: 'query',
            required: false,
            schema: { type: 'integer' },
          },
        ],
      };

      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(opWithQueryParams);

      const result = await tool.execute({ operation_id: 'search_issues' });

      expect(result.examples.curl).toContain('?');
      expect(result.examples.curl).toMatch(/maxResults=<maxResults>/);
    });

    it('should log latency for cache hits and misses', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(sampleOperation);

      await tool.execute({ operation_id: 'create_issue' });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'get_id.success',
          latency_ms: expect.any(Number),
        }),
        expect.any(String),
      );
    });

    it('should handle repository errors gracefully', async () => {
      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(tool.execute({ operation_id: 'test' })).rejects.toThrow(
        'Failed to retrieve operation details',
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'get_id.error',
          error_message: 'Database connection failed',
        }),
        expect.any(String),
      );
    });

    it('should normalize method to uppercase', async () => {
      const opWithLowercaseMethod: Operation = {
        ...sampleOperation,
        method: 'get',
      };

      mockCache.get.mockReturnValue(null);
      mockRepository.getOperation.mockReturnValue(opWithLowercaseMethod);

      const result = await tool.execute({ operation_id: 'test_op' });

      expect(result.method).toBe('GET');
    });
  });

  describe('getInputSchema', () => {
    it('should return Zod schema', () => {
      const schema = tool.getInputSchema();
      expect(schema).toBeDefined();
      expect(schema).toBe(GetIdInputSchema);
    });

    it('should validate correct input', () => {
      const result = GetIdInputSchema.parse({ operation_id: 'test_op' });
      expect(result).toEqual({ operation_id: 'test_op' });
    });

    it('should reject empty operation_id', () => {
      expect(() => GetIdInputSchema.parse({ operation_id: '' })).toThrow();
    });

    it('should reject missing operation_id', () => {
      expect(() => GetIdInputSchema.parse({})).toThrow();
    });
  });

  describe('OperationNotFoundError', () => {
    it('should have correct name and message', () => {
      const error = new OperationNotFoundError('test_op');
      expect(error.name).toBe('OperationNotFoundError');
      expect(error.message).toBe("Operation 'test_op' not found");
    });

    it('should be instanceof Error', () => {
      const error = new OperationNotFoundError('test_op');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
