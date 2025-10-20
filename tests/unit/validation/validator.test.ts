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

import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSchemaCache,
  getCacheMetrics,
  isValidationError,
  validateOperationInput,
} from '../../../src/validation/validator.js';

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const mockReadFile = vi.mocked(readFile);

describe('validator', () => {
  beforeEach(() => {
    clearSchemaCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearSchemaCache();
  });

  describe('validateOperationInput', () => {
    it('should validate correct input and return success', async () => {
      // Mock operations.json with simple operation
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'get_issue',
              parameters: [
                {
                  name: 'issueIdOrKey',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                },
              ],
            },
          ],
        }),
      );

      const result = await validateOperationInput('get_issue', {
        issueIdOrKey: 'PROJ-123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ issueIdOrKey: 'PROJ-123' });
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid input types', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'update_issue',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        fields: {
                          type: 'object',
                          properties: {
                            priority: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('update_issue', {
        fields: {
          priority: 'High', // Should be object
        },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].path).toContain('priority');
      expect(result.errors![0].message).toContain('object');
    });

    it('should return errors for missing required fields', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'create_issue',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['fields'],
                      properties: {
                        fields: {
                          type: 'object',
                          required: ['project', 'summary', 'issuetype'],
                          properties: {
                            project: {
                              type: 'object',
                              properties: {
                                key: { type: 'string' },
                              },
                            },
                            summary: { type: 'string' },
                            issuetype: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('create_issue', {
        fields: {
          project: { key: 'PROJ' },
          issuetype: { name: 'Bug' },
          // Missing summary
        },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.path.includes('summary'))).toBe(true);
      expect(result.errors!.some((e) => e.message.includes('required'))).toBe(true);
    });

    it('should validate nested objects recursively', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'assign_issue',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        fields: {
                          type: 'object',
                          properties: {
                            assignee: {
                              type: 'object',
                              required: ['accountId'],
                              properties: {
                                accountId: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('assign_issue', {
        fields: {
          assignee: {
            accountId: 12345, // Should be string
          },
        },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      const error = result.errors!.find((e) => e.path.includes('accountId'));
      expect(error).toBeDefined();
      expect(error!.path).toBe('fields.assignee.accountId');
      expect(error!.message).toContain('string');
    });

    it('should handle extra fields (Zod strips by default)', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'simple_operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('simple_operation', {
        name: 'Test',
        extraField: 'should be stripped',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'Test' });
      expect(result.data).not.toHaveProperty('extraField');
    });

    it('should cache schemas for performance', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'cached_operation',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                },
              ],
            },
          ],
        }),
      );

      // First call
      const result1 = await validateOperationInput('cached_operation', { id: '123' });
      expect(result1.success).toBe(true);
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await validateOperationInput('cached_operation', { id: '456' });
      expect(result2.success).toBe(true);
      expect(mockReadFile).toHaveBeenCalledTimes(1); // Still only 1 call

      // Verify cache metrics
      const metrics = getCacheMetrics();
      expect(metrics.size).toBe(1);
    });

    it('should handle unknown operation IDs', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'known_operation',
              parameters: [],
            },
          ],
        }),
      );

      const result = await validateOperationInput('unknown_operation', {});

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Unknown operation ID');
      expect(result.errors![0].message).toContain('unknown_operation');
    });

    it('should handle null values in optional fields', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'optional_fields',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        requiredField: { type: 'string' },
                        optionalField: { type: 'string' },
                      },
                      required: ['requiredField'],
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('optional_fields', {
        requiredField: 'value',
        optionalField: null,
      });

      // Zod will reject null for string type even if optional
      // Optional means it can be undefined, not null
      expect(result.success).toBe(false);
    });

    it('should handle empty objects', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'empty_schema',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {},
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('empty_schema', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle empty arrays', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'array_operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('array_operation', {
        items: [],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ items: [] });
    });

    it('should validate very nested structures', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'deep_nested',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        level1: {
                          type: 'object',
                          properties: {
                            level2: {
                              type: 'object',
                              properties: {
                                level3: {
                                  type: 'object',
                                  properties: {
                                    value: { type: 'string' },
                                  },
                                  required: ['value'],
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('deep_nested', {
        level1: {
          level2: {
            level3: {
              // Missing required 'value'
            },
          },
        },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      const error = result.errors!.find((e) => e.path.includes('level3.value'));
      expect(error).toBeDefined();
    });

    it('should validate string formats (email)', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'email_operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string', format: 'email' },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('email_operation', {
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('email');
    });

    it('should validate string formats (url)', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'url_operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', format: 'uri' },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('url_operation', {
        url: 'not-a-url',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('URL');
    });

    it('should validate number constraints (min/max)', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'number_operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        age: { type: 'integer', minimum: 0, maximum: 150 },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('number_operation', {
        age: -5,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('at least');
    });

    it('should validate string length constraints', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'string_length',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        summary: { type: 'string', minLength: 5, maxLength: 100 },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('string_length', {
        summary: 'abc',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('at least 5');
    });

    it('should validate enum values', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'enum_operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        priority: { type: 'string', enum: ['Low', 'Medium', 'High'] },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('enum_operation', {
        priority: 'Critical',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('one of');
      expect(result.errors![0].message).toContain('Low');
    });

    it('should validate array items', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'array_items',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        tags: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      );

      const result = await validateOperationInput('array_items', {
        tags: ['valid', 123, 'another'],
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.path.includes('tags'))).toBe(true);
    });
  });

  describe('isValidationError', () => {
    it('should return true for valid ValidationError array', () => {
      const errors = [
        {
          path: 'field',
          message: 'error',
          expected: 'string',
          received: 'number',
        },
      ];

      expect(isValidationError(errors)).toBe(true);
    });

    it('should return false for invalid structure', () => {
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
      expect(isValidationError('string')).toBe(false);
      expect(isValidationError({})).toBe(false);
      expect(isValidationError([{ incomplete: 'object' }])).toBe(false);
    });
  });

  describe('clearSchemaCache', () => {
    it('should clear the schema cache', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'test_op',
              parameters: [],
            },
          ],
        }),
      );

      // Load schema
      await validateOperationInput('test_op', {});
      expect(getCacheMetrics().size).toBe(1);

      // Clear cache
      clearSchemaCache();
      expect(getCacheMetrics().size).toBe(0);

      // Next call should reload
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'test_op',
              parameters: [],
            },
          ],
        }),
      );
      await validateOperationInput('test_op', {});
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheMetrics', () => {
    it('should return cache metrics', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          operations: [
            {
              operationId: 'op1',
              parameters: [],
            },
            {
              operationId: 'op2',
              parameters: [],
            },
          ],
        }),
      );

      await validateOperationInput('op1', {});
      await validateOperationInput('op2', {});

      const metrics = getCacheMetrics();
      expect(metrics.size).toBe(2);
      expect(metrics.maxSize).toBe(500);
    });
  });
});
