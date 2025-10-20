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
import type { AuthManager } from '../../../src/auth/auth-manager.js';
import type { AppConfig } from '../../../src/core/config-manager.js';
import type { BitbucketClientService } from '../../../src/services/bitbucket-client.js';
import {
  AuthError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../../../src/services/errors.js';
import { CallIdTool } from '../../../src/tools/call-id-tool.js';
import type { OperationsRepository } from '../../../src/tools/get-id-tool.js';
import type { ValidationResult } from '../../../src/validation/validator.js';

// Mock the validator module
vi.mock('../../../src/validation/validator.js', () => ({
  validateOperationInput: vi.fn(),
}));

import { validateOperationInput } from '../../../src/validation/validator.js';

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

describe('CallIdTool', () => {
  let tool: CallIdTool;
  let mockBitbucketClient: {
    executeOperation: Mock;
  };
  let mockAuthManager: {
    getAuthHeaders: Mock;
  };
  let mockOperationsRepository: {
    getOperation: Mock;
  };
  let logger: LoggerStub;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockBitbucketClient = {
      executeOperation: vi.fn(),
    };

    mockAuthManager = {
      getAuthHeaders: vi.fn(),
    };

    mockOperationsRepository = {
      getOperation: vi.fn(),
    };

    logger = createLoggerStub();

    mockConfig = {
      timeout: 60000,
    } as AppConfig;

    tool = new CallIdTool(
      mockBitbucketClient as unknown as BitbucketClientService,
      mockAuthManager as unknown as AuthManager,
      mockOperationsRepository as unknown as OperationsRepository,
      logger,
      mockConfig,
    );

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('execute - successful operation execution', () => {
    it('should execute operation successfully and return result', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: {
          issueIdOrKey: 'PROJ-123',
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      const bitbucketResponse = {
        id: '10000',
        key: 'PROJ-123',
        fields: {
          summary: 'Test issue',
          status: { name: 'Open' },
        },
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockBitbucketClient.executeOperation.mockResolvedValue(bitbucketResponse);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_issue',
        method: 'GET',
        path: '/rest/api/3/issue/{issueIdOrKey}',
      });

      const result = await tool.execute(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(bitbucketResponse);

      expect(validateOperationInput).toHaveBeenCalledWith('get_issue', input.parameters);
      expect(mockBitbucketClient.executeOperation).toHaveBeenCalledWith('get_issue', input.parameters);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.execution_start',
          operation_id: 'get_issue',
        }),
        expect.any(String),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.execution_success',
          operation_id: 'get_issue',
          status: 'success',
          latency_ms: expect.any(Number),
        }),
        expect.any(String),
      );
    });

    it('should accept parameters as JSON string and parse them', async () => {
      const input = {
        operation_id: 'get_all_projects',
        parameters: '{"includeArchived": false, "expand": "description"}',
      };

      const expectedParams = {
        includeArchived: false,
        expand: 'description',
      };

      const validationResult: ValidationResult = {
        success: true,
        data: expectedParams,
      };

      const bitbucketResponse = [
        {
          id: '10000',
          key: 'PROJ',
          name: 'Project 1',
        },
      ];

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockBitbucketClient.executeOperation.mockResolvedValue(bitbucketResponse);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_all_projects',
        method: 'GET',
        path: '/rest/api/2/project',
      });

      const result = await tool.execute(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(bitbucketResponse);

      // Verify the string was parsed into an object
      expect(validateOperationInput).toHaveBeenCalledWith('get_all_projects', expectedParams);
      expect(mockBitbucketClient.executeOperation).toHaveBeenCalledWith(
        'get_all_projects',
        expectedParams,
      );
    });

    it('should accept empty object parameters', async () => {
      const input = {
        operation_id: 'get_all_projects',
        parameters: {},
      };

      const validationResult: ValidationResult = {
        success: true,
        data: {},
      };

      const bitbucketResponse = [
        {
          id: '10000',
          key: 'PROJ',
          name: 'Project 1',
        },
      ];

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockBitbucketClient.executeOperation.mockResolvedValue(bitbucketResponse);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_all_projects',
        method: 'GET',
        path: '/rest/api/2/project',
      });

      const result = await tool.execute(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual(bitbucketResponse);
    });

    it('should reject invalid JSON string parameters', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: 'not-valid-json',
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('ZodError');
      expect(parsedContent.message).toContain('Invalid JSON string');
    });

    it('should reject JSON array as parameters', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: '["not", "an", "object"]',
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('ZodError');
      expect(parsedContent.message).toContain('Parameters must be a JSON object');
    });

    it('should reject null as parameters', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: 'null',
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('ZodError');
      expect(parsedContent.message).toContain('Parameters must be a JSON object');
    });
  });

  describe('execute - validation errors', () => {
    it('should return validation error without calling BitbucketClientService', async () => {
      const input = {
        operation_id: 'create_issue',
        parameters: {
          fields: {
            // Missing required fields
          },
        },
      };

      const validationResult: ValidationResult = {
        success: false,
        errors: [
          {
            path: 'fields.summary',
            message: 'Required field missing',
            expected: 'string',
            received: 'undefined',
          },
          {
            path: 'fields.project',
            message: 'Required field missing',
            expected: 'object',
            received: 'undefined',
          },
        ],
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('ValidationError');
      expect(parsedContent.message).toBe('Invalid operation parameters');
      expect(parsedContent.errors).toEqual(validationResult.errors);

      expect(validateOperationInput).toHaveBeenCalledWith('create_issue', input.parameters);
      expect(mockBitbucketClient.executeOperation).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.validation_failed',
          operation_id: 'create_issue',
          errors: validationResult.errors,
        }),
        expect.any(String),
      );
    });
  });

  describe('execute - Bitbucket API errors', () => {
    it('should handle AuthError and return normalized error', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: {
          issueIdOrKey: 'PROJ-123',
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_issue',
        method: 'GET',
        path: '/rest/api/3/issue/{issueIdOrKey}',
      });

      const authError = new AuthError('Invalid credentials', 401, 'get_issue');
      mockBitbucketClient.executeOperation.mockRejectedValue(authError);

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('AuthError');
      expect(parsedContent.message).toContain('Authentication failed');
      expect(parsedContent.statusCode).toBe(401);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.error',
          error_type: 'AuthError',
          status_code: 401,
          operation_id: 'get_issue',
        }),
        expect.any(String),
      );
    });

    it('should handle NotFoundError and return normalized error', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: {
          issueIdOrKey: 'NONEXISTENT-999',
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_issue',
        method: 'GET',
        path: '/rest/api/3/issue/{issueIdOrKey}',
      });

      const notFoundError = new NotFoundError('Issue not found', 'get_issue');
      mockBitbucketClient.executeOperation.mockRejectedValue(notFoundError);

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('NotFoundError');
      expect(parsedContent.message).toContain('Resource not found');
      expect(parsedContent.statusCode).toBe(404);
    });

    it('should handle RateLimitError with retry info', async () => {
      const input = {
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'PROJ' },
            summary: 'Test',
            issuetype: { name: 'Task' },
          },
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'create_issue',
        method: 'POST',
        path: '/rest/api/3/issue',
      });

      const rateLimitError = new RateLimitError('Too many requests', 'create_issue', undefined, 30);
      mockBitbucketClient.executeOperation.mockRejectedValue(rateLimitError);

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('RateLimitError');
      expect(parsedContent.message).toContain('Rate limit exceeded. Retry after 30s');
      expect(parsedContent.statusCode).toBe(429);
    });

    it('should handle ServerError (5xx)', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: {
          issueIdOrKey: 'PROJ-123',
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_issue',
        method: 'GET',
        path: '/rest/api/3/issue/{issueIdOrKey}',
      });

      const serverError = new ServerError('Internal server error', 500, 'get_issue');
      mockBitbucketClient.executeOperation.mockRejectedValue(serverError);

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('ServerError');
      expect(parsedContent.message).toContain('Bitbucket server error: 500');
      expect(parsedContent.statusCode).toBe(500);
    });
  });

  describe('execute - timeout handling', () => {
    it('should timeout operations that exceed configured timeout', async () => {
      const input = {
        operation_id: 'bulk_update',
        parameters: {
          issues: ['PROJ-1', 'PROJ-2'],
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'bulk_update',
        method: 'POST',
        path: '/rest/api/3/issue/bulk',
      });

      // Override config with short timeout for testing
      mockConfig.timeout = 100; // 100ms

      // Simulate slow operation
      mockBitbucketClient.executeOperation.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ success: true }), 200); // Takes 200ms
          }),
      );

      const result = await tool.execute(input);

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('TimeoutError');
      expect(parsedContent.message).toContain('Operation timeout after 100ms');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.error',
          error_type: 'TimeoutError',
          operation_id: 'bulk_update',
        }),
        expect.any(String),
      );
    });
  });

  describe('execute - audit trail for mutations', () => {
    it('should log audit trail for POST operations', async () => {
      const input = {
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'PROJ' },
            summary: 'Test issue',
            issuetype: { name: 'Task' },
            password: 'secret123', // Should be sanitized
          },
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'create_issue',
        method: 'POST',
        path: '/rest/api/3/issue',
      });

      mockBitbucketClient.executeOperation.mockResolvedValue({
        id: '10000',
        key: 'PROJ-1',
      });

      await tool.execute(input);

      // Verify audit log was created
      // Find the audit log call (should be second call after execution_start)
      const auditCall = logger.info.mock.calls.find(
        (call) => call[0]?.event === 'call_id.mutation_audit',
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![0]).toMatchObject({
        event: 'call_id.mutation_audit',
        operation_id: 'create_issue',
        method: 'POST',
        parameters: {
          fields: {
            project: { key: 'PROJ' },
            summary: 'Test issue',
            password: '***', // Verify sanitization (using centralized sanitizer)
          },
        },
        timestamp: expect.any(String),
      });
    });

    it('should log audit trail for PUT operations', async () => {
      const input = {
        operation_id: 'update_issue',
        parameters: {
          issueIdOrKey: 'PROJ-123',
          fields: {
            summary: 'Updated summary',
          },
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'update_issue',
        method: 'PUT',
        path: '/rest/api/3/issue/{issueIdOrKey}',
      });

      mockBitbucketClient.executeOperation.mockResolvedValue(null); // 204 No Content

      await tool.execute(input);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.mutation_audit',
          operation_id: 'update_issue',
          method: 'PUT',
        }),
        expect.any(String),
      );
    });

    it('should log audit trail for DELETE operations', async () => {
      const input = {
        operation_id: 'delete_issue',
        parameters: {
          issueIdOrKey: 'PROJ-123',
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'delete_issue',
        method: 'DELETE',
        path: '/rest/api/3/issue/{issueIdOrKey}',
      });

      mockBitbucketClient.executeOperation.mockResolvedValue(null); // 204 No Content

      await tool.execute(input);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'call_id.mutation_audit',
          operation_id: 'delete_issue',
          method: 'DELETE',
        }),
        expect.any(String),
      );
    });

    it('should NOT log audit trail for GET operations', async () => {
      const input = {
        operation_id: 'get_issue',
        parameters: {
          issueIdOrKey: 'PROJ-123',
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_issue',
        method: 'GET',
        path: '/rest/api/3/issue/{issueIdOrKey}',
      });

      mockBitbucketClient.executeOperation.mockResolvedValue({
        id: '10000',
        key: 'PROJ-123',
      });

      await tool.execute(input);

      // Verify NO audit log for GET
      const auditCalls = logger.info.mock.calls.filter((call) =>
        call[0]?.event?.includes('mutation_audit'),
      );
      expect(auditCalls).toHaveLength(0);
    });
  });

  describe('sanitizeCredentials', () => {
    it('should sanitize sensitive fields in nested objects', async () => {
      const input = {
        operation_id: 'create_webhook',
        parameters: {
          name: 'Test Webhook',
          url: 'https://example.com',
          authentication: {
            type: 'bearer',
            token: 'secret-token-123',
            apiKey: 'secret-key-456',
          },
          config: {
            password: 'my-password',
            username: 'user',
          },
        },
      };

      const validationResult: ValidationResult = {
        success: true,
        data: input.parameters,
      };

      (validateOperationInput as Mock).mockResolvedValue(validationResult);
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'create_webhook',
        method: 'POST',
        path: '/rest/api/3/webhook',
      });

      mockBitbucketClient.executeOperation.mockResolvedValue({ id: '12345' });

      await tool.execute(input);

      // Check audit log sanitization (using centralized sanitizer with ***)
      const auditCall = logger.info.mock.calls.find(
        (call) => call[0]?.event === 'call_id.mutation_audit',
      );
      expect(auditCall).toBeDefined();

      const sanitizedParams = auditCall![0].parameters;
      expect(sanitizedParams.name).toBe('Test Webhook');
      expect(sanitizedParams.authentication.token).toBe('***');
      expect(sanitizedParams.authentication.apiKey).toBe('***');
      expect(sanitizedParams.config.password).toBe('***');
      expect(sanitizedParams.config.username).toBe('user'); // username is OK
    });
  });
});
