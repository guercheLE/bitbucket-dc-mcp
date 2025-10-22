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
 * Bitbucket API Client Service
 *
 * Encapsulates HTTP calls to Bitbucket Data Center REST API with robust error handling,
 * rate limiting, retry logic, and comprehensive logging.
 *
 * @module services/bitbucket-client
 *
 * @example
 * ```typescript
 * const client = new BitbucketClientService(
 *   authManager,
 *   rateLimiter,
 *   logger,
 *   config,
 *   operationsRepo
 * );
 *
 * const repo = await client.executeOperation('getRepository', {
 *   projectKey: 'PRJ',
 *   repositorySlug: 'my-repo'
 * });
 * ```
 */

import type { Logger as PinoLogger } from 'pino';
import type { AuthManager } from '../auth/auth-manager.js';
import { CircuitBreaker } from '../core/circuit-breaker.js';
import type { AppConfig } from '../core/config-manager.js';
import { getTraceId } from '../core/correlation-context.js';
import type { RateLimiter } from '../core/rate-limiter.js';
import type { OperationsRepository } from '../tools/get-id-tool.js';
import {
  AuthError,
  BitbucketClientError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
} from './errors.js';

/**
 * Normalize Bitbucket path to prevent double-encoding
 *
 * Handles cases where path parameters may already be encoded:
 * - %252F (double-encoded) -> %2F (single-encoded)
 * - %2F (single-encoded) -> / (decoded)
 *
 * @param value - Path string to normalize
 * @returns Normalized path or undefined if input is undefined
 *
 * @private
 */
const normalizeBitbucketPath = (value?: string): string | undefined => {
  if (!value) {
    return value;
  }

  const [path, ...rest] = value.split('?');
  const normalizedPath = path.replace(/%252F/gi, '%2F').replace(/%2F/gi, '/');

  return rest.length > 0 ? `${normalizedPath}?${rest.join('?')}` : normalizedPath;
};

/**
 * Constants for retry and timeout configuration
 */
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
const RETRY_DELAYS_MS = [100, 500, 2000]; // Exponential backoff delays

/**
 * Bitbucket API Client Service
 *
 * Provides robust HTTP client for executing Bitbucket operations with:
 * - Rate limiting (token bucket algorithm)
 * - Retry logic with exponential backoff
 * - Comprehensive error handling and typed errors
 * - Structured logging with request/response metrics
 * - Request timeout handling
 *
 * @remarks
 * This service implements the following architectural patterns:
 * - Dependency Injection: All dependencies passed via constructor
 * - Retry Pattern: Exponential backoff for transient errors
 * - Circuit Breaker: Rate limiting to prevent overwhelming Bitbucket
 * - Structured Logging: All requests logged with correlation IDs
 */
export class BitbucketClientService {
  private readonly circuitBreaker: CircuitBreaker;

  /**
   * Creates a new BitbucketClientService instance
   *
   * @param authManager - Authentication manager for obtaining auth headers
   * @param rateLimiter - Rate limiter for controlling request rate
   * @param logger - Structured logger instance
   * @param config - Application configuration
   * @param operationsRepository - Repository for operation metadata
   * @param circuitBreaker - Optional circuit breaker for fault tolerance (creates default if not provided)
   *
   * @example
   * ```typescript
   * const service = new BitbucketClientService(
   *   new AuthManager(),
   *   new RateLimiter({ capacity: 100, refillRate: 100 }),
   *   Logger.getInstance(),
   *   await ConfigManager.load(),
   *   new JsonOperationsRepository('./data/operations.json')
   * );
   * ```
   */
  constructor(
    private readonly authManager: AuthManager,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: PinoLogger,
    private readonly config: AppConfig,
    private readonly operationsRepository: OperationsRepository,
    circuitBreaker?: CircuitBreaker,
  ) {
    // Create default circuit breaker if not provided
    if (!circuitBreaker) {
      this.logger.info('Creating default circuit breaker for BitbucketClientService');
      this.circuitBreaker = CircuitBreaker.fromEnv(logger);
    } else {
      this.circuitBreaker = circuitBreaker;
    }
  }

  /**
   * Execute a Bitbucket operation by ID with given parameters
   *
   * Constructs HTTP request from operation metadata, applies rate limiting,
   * handles retries for transient errors, and returns normalized response.
   *
   * @param operationId - Bitbucket operation ID (e.g., 'getRepository', 'createRepository')
   * @param params - Operation parameters (path params, query params, body)
   * @returns Parsed response body from Bitbucket API
   *
   * @throws {ValidationError} When request validation fails (400) - DO NOT retry
   * @throws {AuthError} When authentication fails (401/403) - DO NOT retry
   * @throws {NotFoundError} When resource not found (404) - DO NOT retry
   * @throws {RateLimitError} When rate limit exceeded (429) - WILL retry
   * @throws {ServerError} When server error occurs (5xx) - WILL retry
   * @throws {TimeoutError} When request times out - WILL retry
   *
   * @example
   * ```typescript
   * // Get repository with path parameter
   * const repo = await service.executeOperation('getRepository', {
   *   projectKey: 'PRJ',
   *   repositorySlug: 'my-repo'
   * });
   *
   * // Create repository with request body
   * const newRepo = await service.executeOperation('createRepository', {
   *   projectKey: 'PRJ',
   *   name: 'My Repository',
   *   scmId: 'git',
   *   forkable: true
   * }
   * });
   * ```
   */
  async executeOperation(operationId: string, params: unknown = {}): Promise<unknown> {
    const startTime = Date.now();

    // Get operation metadata
    const operation = this.operationsRepository.getOperation(operationId);
    if (!operation) {
      throw new BitbucketClientError(
        `Operation '${operationId}' not found in operations repository`,
        0,
        operationId,
      );
    }

    // Execute with retry logic wrapped in circuit breaker
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.executeWithRetry(async () => {
          // Apply rate limiting before request
          await this.rateLimiter.acquire();

          // Build and execute HTTP request
          const response = await this.executeHttpRequest(operation, params, operationId);

          // Normalize and return response
          return await this.normalizeResponse(response, operationId);
        }, operationId);
      });

      const latency = Date.now() - startTime;
      this.logger.info(
        {
          event: 'bitbucket_client.request_completed',
          operationId,
          method: operation.method,
          path: operation.path,
          latency,
        },
        'Bitbucket API request completed',
      );

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(
        {
          event: 'bitbucket_client.request_failed',
          operationId,
          method: operation.method,
          path: operation.path,
          latency,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.name : 'unknown',
        },
        'Bitbucket API request failed',
      );
      throw error;
    }
  }

  /**
   * Execute HTTP request for a Bitbucket operation
   *
   * @param operation - Operation metadata from repository
   * @param params - Operation parameters
   * @param operationId - Operation ID for logging
   * @returns Fetch Response object
   *
   * @private
   */
  private async executeHttpRequest(
    operation: { path: string; method: string; operationId: string },
    params: unknown,
    operationId: string,
  ): Promise<Response> {
    // Build URL with path parameters
    const url = this.buildUrl(operation.path, params);

    // Get authentication headers
    const authHeaders = await this.authManager.getAuthHeaders();

    // Build headers
    const headers = new Headers(authHeaders);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    // Extract request body
    const body = this.extractRequestBody(operation.method, params);

    // Task 11: Log DEBUG level API request details
    this.logger.debug(
      {
        event: 'bitbucket_client.api_request',
        method: operation.method,
        path: operation.path,
        bitbucket_url: this.config.bitbucketUrl,
      },
      'Bitbucket API request',
    );

    // Log request start with sanitized headers
    this.logger.info(
      {
        event: 'bitbucket_client.request_start',
        operationId,
        method: operation.method,
        url: this.sanitizeUrl(url),
        headers: this.sanitizeHeaders(headers),
      },
      'Bitbucket API request starting',
    );

    // Execute fetch with timeout
    const timeoutMs = this.config.timeout ?? DEFAULT_TIMEOUT_MS;
    const requestStartTime = Date.now();

    try {
      const response = await fetch(url, {
        method: operation.method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const latency_ms = Date.now() - requestStartTime;

      // Task 11: Log DEBUG level API response with latency
      this.logger.debug(
        {
          event: 'bitbucket_client.api_response',
          status_code: response.status,
          latency_ms,
        },
        'Bitbucket API response',
      );

      // Log response
      this.logger.info(
        {
          event: 'bitbucket_client.response_received',
          operationId,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          latency_ms,
        },
        'Bitbucket API response received',
      );

      // Handle error responses
      if (!response.ok) {
        await this.handleErrorResponse(response, operationId);
      }

      return response;
    } catch (error) {
      const traceId = getTraceId();

      // Handle timeout errors
      if (error instanceof Error && error.name === 'TimeoutError') {
        // Task 10: Log timeout with context
        this.logger.error(
          {
            event: 'bitbucket_client.timeout',
            traceId: traceId,
            error_type: 'TimeoutError',
            error_message: `Request timed out after ${timeoutMs}ms`,
            operation_id: operationId,
            timeout_ms: timeoutMs,
            context: {
              operation: operationId,
            },
          },
          'Bitbucket API request timed out',
        );
        throw new TimeoutError(`Request timed out after ${timeoutMs}ms`, operationId);
      }

      // Handle AbortError (also timeout related)
      if (error instanceof Error && error.name === 'AbortError') {
        // Task 10: Log abort with context
        this.logger.error(
          {
            event: 'bitbucket_client.abort',
            traceId: traceId,
            error_type: 'TimeoutError',
            error_message: `Request aborted (timeout after ${timeoutMs}ms)`,
            operation_id: operationId,
            timeout_ms: timeoutMs,
            context: {
              operation: operationId,
            },
          },
          'Bitbucket API request aborted',
        );
        throw new TimeoutError(`Request aborted (timeout after ${timeoutMs}ms)`, operationId);
      }

      // Task 10: Log unexpected errors with context
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        {
          event: 'bitbucket_client.unexpected_error',
          traceId: traceId,
          error_type: errorType,
          error_message: errorMessage,
          stack_trace: stack,
          operation_id: operationId,
          context: {
            operation: operationId,
          },
        },
        'Unexpected error during Bitbucket API request',
      );

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Build full URL with path parameters substituted
   *
   * Applies URL normalization to prevent double-encoding issues.
   *
   * @param path - API path template (e.g., '/rest/api/latest/projects/{projectKey}')
   * @param params - Parameters object containing path and query params
   * @returns Full URL string with normalized encoding
   *
   * @private
   */
  private buildUrl(path: string, params: unknown): string {
    const baseUrl = normalizeBitbucketPath(this.config.bitbucketUrl.replace(/\/$/, '')); // Remove trailing slash and normalize
    let fullPath = path;

    // Substitute path parameters
    if (params && typeof params === 'object') {
      const paramsObj = params as Record<string, unknown>;
      fullPath = path.replace(/\{([^}]+)\}/g, (match, paramName) => {
        const value = paramsObj[paramName];
        return value !== undefined ? encodeURIComponent(String(value)) : match;
      });

      // Add query parameters
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(paramsObj)) {
        // Skip path parameters and body fields
        if (!path.includes(`{${key}}`) && key !== 'fields' && key !== 'body') {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        }
      }

      const queryString = queryParams.toString();
      if (queryString) {
        fullPath += `?${queryString}`;
      }
    }

    // Normalize the full URL to handle any pre-encoded values in path
    const fullUrl = `${baseUrl}${fullPath}`;
    return normalizeBitbucketPath(fullUrl) ?? fullUrl;
  }

  /**
   * Extract request body for POST/PUT/PATCH requests
   *
   * @param method - HTTP method
   * @param params - Parameters object
   * @returns JSON string body or undefined
   *
   * @private
   */
  private extractRequestBody(method: string, params: unknown): string | undefined {
    if (!['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      return undefined;
    }

    if (!params || typeof params !== 'object') {
      return undefined;
    }

    const paramsObj = params as Record<string, unknown>;

    // For comment operations, handle text parameter specially
    if (paramsObj.text !== undefined) {
      return JSON.stringify({ text: paramsObj.text });
    }

    // Use 'fields' or 'body' property if present
    const bodyContent = paramsObj.fields ?? paramsObj.body ?? params;

    return JSON.stringify(bodyContent);
  }

  /**
   * Handle HTTP error responses and throw appropriate typed errors
   *
   * @param response - Fetch Response object
   * @param operationId - Operation ID for error context
   * @throws Typed error based on status code
   *
   * @private
   */
  private async handleErrorResponse(response: Response, operationId: string): Promise<never> {
    const traceId = getTraceId();
    let errorBody: unknown;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorBody = await response.json();
      } else {
        errorBody = await response.text();
      }
    } catch {
      errorBody = `Failed to parse error response (${response.statusText})`;
    }

    const statusCode = response.status;
    const errorMessage = this.extractErrorMessage(errorBody, response.statusText);

    // Task 10: Log error with full context before throwing
    this.logger.error(
      {
        event: 'bitbucket_client.error_response',
        traceId: traceId,
        error_type: this.getErrorTypeName(statusCode),
        error_message: errorMessage,
        status_code: statusCode,
        operation_id: operationId,
        url: response.url,
        context: {
          operation: operationId,
          status_text: response.statusText,
          has_error_body: !!errorBody,
        },
      },
      'Bitbucket API error response received',
    );

    // Map status codes to typed errors
    switch (statusCode) {
      case 400:
        throw new ValidationError(errorMessage, operationId, errorBody);

      case 401:
        throw new AuthError(errorMessage, 401, operationId, errorBody);

      case 403:
        throw new AuthError(errorMessage, 403, operationId, errorBody);

      case 404:
        throw new NotFoundError(errorMessage, operationId, errorBody);

      case 429: {
        const retryAfter = this.parseRetryAfter(response.headers.get('retry-after'));
        throw new RateLimitError(errorMessage, operationId, errorBody, retryAfter);
      }

      default:
        if (statusCode >= 500) {
          throw new ServerError(errorMessage, statusCode, operationId, errorBody);
        }

        // Fallback for unexpected status codes
        throw new BitbucketClientError(errorMessage, statusCode, operationId, errorBody);
    }
  }

  /**
   * Get error type name based on status code
   *
   * @param statusCode - HTTP status code
   * @returns Error type name
   *
   * @private
   */
  private getErrorTypeName(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'ValidationError';
      case 401:
      case 403:
        return 'AuthError';
      case 404:
        return 'NotFoundError';
      case 429:
        return 'RateLimitError';
      default:
        return statusCode >= 500 ? 'ServerError' : 'BitbucketClientError';
    }
  }

  /**
   * Extract error message from Bitbucket error response
   *
   * @param errorBody - Parsed error response body
   * @param fallback - Fallback message if extraction fails
   * @returns Error message string
   *
   * @private
   */
  private extractErrorMessage(errorBody: unknown, fallback: string): string {
    if (!errorBody || typeof errorBody !== 'object') {
      return fallback;
    }

    const body = errorBody as Record<string, unknown>;

    // Try errorMessages array (Bitbucket format)
    if (Array.isArray(body.errorMessages) && body.errorMessages.length > 0) {
      return body.errorMessages.join('; ');
    }

    // Try errors object (Bitbucket format)
    if (body.errors && typeof body.errors === 'object') {
      const errors = Object.values(body.errors);
      if (errors.length > 0) {
        return errors.join('; ');
      }
    }

    // Try message property
    if (typeof body.message === 'string') {
      return body.message;
    }

    return fallback;
  }

  /**
   * Parse Retry-After header value
   *
   * @param retryAfter - Retry-After header value (seconds or HTTP date)
   * @returns Number of seconds to wait, or undefined
   *
   * @private
   */
  private parseRetryAfter(retryAfter: string | null): number | undefined {
    if (!retryAfter) {
      return undefined;
    }

    // Try parsing as integer (seconds)
    const seconds = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) {
      return seconds;
    }

    // Try parsing as HTTP date
    const date = new Date(retryAfter);
    if (!Number.isNaN(date.getTime())) {
      const secondsUntil = Math.max(0, (date.getTime() - Date.now()) / 1000);
      return Math.ceil(secondsUntil);
    }

    return undefined;
  }

  /**
   * Normalize response body (parse JSON, handle empty responses)
   *
   * @param response - Fetch Response object
   * @param operationId - Operation ID for error context
   * @returns Parsed response data or null
   *
   * @private
   */
  private async normalizeResponse(response: Response, operationId: string): Promise<unknown> {
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');

    // Parse JSON responses
    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch (error) {
        this.logger.warn(
          {
            event: 'bitbucket_client.json_parse_failed',
            operationId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to parse JSON response',
        );

        // Return raw text wrapped in object
        const text = await response.text();
        return { raw: text };
      }
    }

    // Handle non-JSON responses
    const text = await response.text();

    // Empty response
    if (!text) {
      return null;
    }

    // Return text wrapped in object
    return { raw: text };
  }

  /**
   * Execute function with retry logic and exponential backoff
   *
   * Retries only for transient errors (timeout, rate limit, server errors).
   * Permanent errors (validation, auth, not found) are thrown immediately.
   *
   * @param fn - Async function to execute
   * @param operationId - Operation ID for logging
   * @returns Result from successful execution
   * @throws Last error if all retries exhausted
   *
   * @private
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, operationId: string): Promise<T> {
    let lastError: Error | undefined;
    const maxAttempts = (this.config.retryAttempts ?? MAX_RETRIES) + 1; // +1 for initial attempt

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry for permanent errors
        if (
          error instanceof ValidationError ||
          error instanceof AuthError ||
          error instanceof NotFoundError
        ) {
          throw error;
        }

        // Retry for transient errors
        const isTransientError =
          error instanceof RateLimitError ||
          error instanceof ServerError ||
          error instanceof TimeoutError;

        if (!isTransientError) {
          throw error;
        }

        // Check if we have retries left
        if (attempt < maxAttempts - 1) {
          const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

          this.logger.warn(
            {
              event: 'bitbucket_client.retry',
              operationId,
              attempt: attempt + 1,
              maxAttempts: maxAttempts - 1,
              delay,
              error: lastError.message,
              errorType: lastError.name,
            },
            'Retrying request after transient error',
          );

          await this.sleep(delay);
          continue;
        }

        // No more retries, throw last error
        throw lastError;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error('Unexpected retry loop exit');
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sanitize URL for logging (remove sensitive query params)
   *
   * @param url - Full URL
   * @returns Sanitized URL string
   *
   * @private
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove sensitive query parameters if any
      // For now, just return the URL (can enhance later)
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Sanitize headers for logging (redact auth tokens)
   *
   * @param headers - Headers object
   * @returns Sanitized headers object for logging
   *
   * @private
   */
  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};

    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'authorization') {
        // Redact authorization header
        const parts = value.split(' ');
        sanitized[key] = parts.length > 1 ? `${parts[0]} ***` : '***';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Get circuit breaker metrics for monitoring
   *
   * @returns Current circuit breaker metrics
   */
  getCircuitBreakerMetrics(): import('../core/circuit-breaker.js').CircuitBreakerMetrics {
    return this.circuitBreaker.getMetrics();
  }
}
