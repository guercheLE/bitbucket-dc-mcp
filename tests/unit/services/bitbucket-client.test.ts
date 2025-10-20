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
 * Unit tests for BitbucketClientService
 *
 * Tests all critical paths including:
 * - Success cases with JSON responses
 * - Retry logic with exponential backoff
 * - Error handling for permanent vs transient errors
 * - Rate limiting behavior
 * - Timeout handling
 * - Response normalization
 */

import type { Logger as PinoLogger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AuthManager } from '../../../src/auth/auth-manager.js';
import type { AppConfig } from '../../../src/core/config-manager.js';
import type { RateLimiter } from '../../../src/core/rate-limiter.js';
import { BitbucketClientService } from '../../../src/services/bitbucket-client.js';
import {
  AuthError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
} from '../../../src/services/errors.js';
import type { OperationsRepository } from '../../../src/tools/get-id-tool.js';

// Mock operation metadata
const mockOperation = {
  operationId: 'test_operation',
  path: '/rest/api/3/issue/{issueIdOrKey}',
  method: 'GET',
  summary: 'Test operation',
  description: 'Test operation description',
  tags: ['Issues'],
  parameters: [],
  requestBody: undefined,
  responses: {},
  deprecated: false,
};

describe('BitbucketClientService', () => {
  let service: BitbucketClientService;
  let mockAuthManager: AuthManager;
  let mockRateLimiter: RateLimiter;
  let mockLogger: PinoLogger;
  let mockConfig: AppConfig;
  let mockOperationsRepo: OperationsRepository;
  let fetchMock: Mock;

  beforeEach(() => {
    // Reset fetch mock
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock AuthManager
    mockAuthManager = {
      getAuthHeaders: vi
        .fn()
        .mockResolvedValue(new Headers({ Authorization: 'Bearer mock-token' })),
    } as unknown as AuthManager;

    // Mock RateLimiter (no-op for most tests)
    mockRateLimiter = {
      acquire: vi.fn().mockResolvedValue(undefined),
      getAvailableTokens: vi.fn().mockReturnValue(100),
    } as unknown as RateLimiter;

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as PinoLogger;

    // Mock Config
    mockConfig = {
      bitbucketUrl: 'https://bitbucket.example.com',
      authMethod: 'pat',
      rateLimit: 100,
      timeout: 30_000,
      logLevel: 'info',
      cacheSize: 1_000,
      retryAttempts: 3,
      shutdownTimeoutMs: 30_000,
      logPretty: false,
    };

    // Mock OperationsRepository
    mockOperationsRepo = {
      getOperation: vi.fn().mockReturnValue(mockOperation),
    } as unknown as OperationsRepository;

    // Create service instance
    service = new BitbucketClientService(
      mockAuthManager,
      mockRateLimiter,
      mockLogger,
      mockConfig,
      mockOperationsRepo,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should execute operation successfully with JSON response', async () => {
      const mockResponseData = { id: '10001', key: 'PROJ-123', summary: 'Test issue' };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockResponseData),
      });

      const result = await service.executeOperation('test_operation', {
        issueIdOrKey: 'PROJ-123',
      });

      expect(result).toEqual(mockResponseData);
      expect(mockOperationsRepo.getOperation).toHaveBeenCalledWith('test_operation');
      expect(mockRateLimiter.acquire).toHaveBeenCalled();
      expect(mockAuthManager.getAuthHeaders).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should substitute path parameters correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation', {
        issueIdOrKey: 'PROJ-456',
      });

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toBe('https://bitbucket.example.com/rest/api/3/issue/PROJ-456');
    });

    it('should add query parameters correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation', {
        issueIdOrKey: 'PROJ-123',
        expand: 'changelog',
        maxResults: '50',
      });

      const callArgs = fetchMock.mock.calls[0];
      const url = new URL(callArgs[0] as string);
      expect(url.searchParams.get('expand')).toBe('changelog');
      expect(url.searchParams.get('maxResults')).toBe('50');
    });

    it('should handle 204 No Content response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
      });

      const result = await service.executeOperation('test_operation', {});

      expect(result).toBeNull();
    });

    it('should handle non-JSON response', async () => {
      const mockTextResponse = 'Plain text response';

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue(mockTextResponse),
      });

      const result = await service.executeOperation('test_operation', {});

      expect(result).toEqual({ raw: mockTextResponse });
    });

    it('should handle empty response body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue(''),
      });

      const result = await service.executeOperation('test_operation', {});

      expect(result).toBeNull();
    });

    it('should send request body for POST operations', async () => {
      const postOperation = {
        ...mockOperation,
        method: 'POST',
        path: '/rest/api/3/issue',
      };

      (mockOperationsRepo.getOperation as Mock).mockReturnValue(postOperation);

      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ id: '10001' }),
      });

      await service.executeOperation('test_operation', {
        fields: {
          summary: 'New issue',
          project: { key: 'PROJ' },
        },
      });

      const callArgs = fetchMock.mock.calls[0];
      const requestInit = callArgs[1] as RequestInit;
      expect(requestInit.method).toBe('POST');
      expect(requestInit.body).toBeDefined();

      const body = JSON.parse(requestInit.body as string);
      expect(body).toEqual({
        summary: 'New issue',
        project: { key: 'PROJ' },
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 Server Error and succeed', async () => {
      let callCount = 0;

      fetchMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Headers({ 'content-type': 'application/json' }),
            json: vi.fn().mockResolvedValue({ errorMessages: ['Server error'] }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue({ success: true }),
        });
      });

      const result = await service.executeOperation('test_operation', {});

      expect(callCount).toBe(2); // First call failed, second succeeded
      expect(result).toEqual({ success: true });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bitbucket_client.retry',
          attempt: 1,
        }),
        'Retrying request after transient error',
      );
    });

    it('should retry on 429 Rate Limit Error', async () => {
      let callCount = 0;

      fetchMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: new Headers({
              'content-type': 'application/json',
              'retry-after': '60',
            }),
            json: vi.fn().mockResolvedValue({ errorMessages: ['Rate limit exceeded'] }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue({ success: true }),
        });
      });

      const result = await service.executeOperation('test_operation', {});

      expect(callCount).toBe(2);
      expect(result).toEqual({ success: true });
    });

    it('should retry on timeout error', async () => {
      let callCount = 0;

      fetchMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue({ success: true }),
        });
      });

      const result = await service.executeOperation('test_operation', {});

      expect(callCount).toBe(2);
      expect(result).toEqual({ success: true });
    });

    it('should exhaust retries after max attempts', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ errorMessages: ['Service unavailable'] }),
      });

      await expect(service.executeOperation('test_operation', {})).rejects.toThrow(ServerError);

      // Should be called: 1 initial + 3 retries = 4 total
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(mockLogger.warn).toHaveBeenCalledTimes(3); // 3 retry attempts
    });
  });

  describe('Permanent Errors - No Retry', () => {
    it('should NOT retry on 400 ValidationError', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ errorMessages: ['Field "summary" is required'] }),
      });

      await expect(service.executeOperation('test_operation', {})).rejects.toThrow(ValidationError);

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
      expect(mockLogger.warn).not.toHaveBeenCalled(); // No retry logs
    });

    it('should NOT retry on 401 AuthError', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ errorMessages: ['Authentication required'] }),
      });

      await expect(service.executeOperation('test_operation', {})).rejects.toThrow(AuthError);

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it('should NOT retry on 403 AuthError (Forbidden)', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ errorMessages: ['Insufficient permissions'] }),
      });

      await expect(service.executeOperation('test_operation', {})).rejects.toThrow(AuthError);

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it('should NOT retry on 404 NotFoundError', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ errorMessages: ['Issue does not exist'] }),
      });

      await expect(service.executeOperation('test_operation', {})).rejects.toThrow(NotFoundError);

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Error Response Handling', () => {
    it('should extract error messages from Bitbucket error response', async () => {
      const bitbucketErrorResponse = {
        errorMessages: ['Issue does not exist', 'Invalid field value'],
        errors: {
          summary: 'Field is required',
          assignee: 'User not found',
        },
      };

      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(bitbucketErrorResponse),
      });

      try {
        await service.executeOperation('test_operation', {});
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Issue does not exist');
        expect((error as ValidationError).response).toEqual(bitbucketErrorResponse);
      }
    });

    it('should handle non-JSON error responses', async () => {
      const htmlError = '<html><body>Internal Server Error</body></html>';

      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/html' }),
        json: vi.fn().mockRejectedValue(new Error('Not JSON')),
        text: vi.fn().mockResolvedValue(htmlError),
      });

      try {
        await service.executeOperation('test_operation', {});
        expect.fail('Should have thrown ServerError');
      } catch (error) {
        expect(error).toBeInstanceOf(ServerError);
        expect((error as ServerError).response).toBe(htmlError);
      }
    });

    it('should parse Retry-After header from rate limit response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'content-type': 'application/json',
          'retry-after': '120',
        }),
        json: vi.fn().mockResolvedValue({ errorMessages: ['Rate limit exceeded'] }),
      });

      try {
        await service.executeOperation('test_operation', {});
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(120);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should call rate limiter before each request', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation', {});

      expect(mockRateLimiter.acquire).toHaveBeenCalled();
    });

    it('should call rate limiter on retry attempts', async () => {
      let callCount = 0;

      fetchMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: vi.fn().mockResolvedValue({ errorMessages: ['Server error'] }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue({}),
        });
      });

      await service.executeOperation('test_operation', {});

      // Should be called twice: once for initial attempt, once for retry
      expect(mockRateLimiter.acquire).toHaveBeenCalledTimes(2);
    });
  });

  describe('Timeout Handling', () => {
    it('should throw TimeoutError when request exceeds timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      fetchMock.mockRejectedValue(abortError);

      // Override config to disable retries for cleaner test
      mockConfig.retryAttempts = 0;

      await expect(service.executeOperation('test_operation', {})).rejects.toThrow(TimeoutError);
    });

    it('should use configured timeout value', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation', {});

      const callArgs = fetchMock.mock.calls[0];
      const requestInit = callArgs[1] as RequestInit;
      expect(requestInit.signal).toBeDefined();
    });
  });

  describe('Logging', () => {
    it('should log request start with sanitized headers', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation', {});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bitbucket_client.request_start',
          operationId: 'test_operation',
          headers: expect.objectContaining({
            authorization: 'Bearer ***',
          }),
        }),
        'Bitbucket API request starting',
      );
    });

    it('should log successful completion with latency', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation', {});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bitbucket_client.request_completed',
          operationId: 'test_operation',
          latency: expect.any(Number),
        }),
        'Bitbucket API request completed',
      );
    });

    it('should log errors with context', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ errorMessages: ['Not found'] }),
      });

      await expect(service.executeOperation('test_operation', {})).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bitbucket_client.request_failed',
          operationId: 'test_operation',
          errorType: 'NotFoundError',
        }),
        'Bitbucket API request failed',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should throw error when operation not found', async () => {
      (mockOperationsRepo.getOperation as Mock).mockReturnValue(null);

      await expect(service.executeOperation('nonexistent_operation', {})).rejects.toThrow(
        "Operation 'nonexistent_operation' not found",
      );

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON in response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('Not valid JSON'),
      });

      const result = await service.executeOperation('test_operation', {});

      expect(result).toEqual({ raw: 'Not valid JSON' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bitbucket_client.json_parse_failed',
        }),
        'Failed to parse JSON response',
      );
    });

    it('should handle empty params object', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation');

      expect(fetchMock).toHaveBeenCalled();
    });

    it('should encode path parameters correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      });

      await service.executeOperation('test_operation', {
        issueIdOrKey: 'PROJ-123 with spaces',
      });

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toContain('PROJ-123%20with%20spaces');
    });
  });
});
