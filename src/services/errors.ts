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
 * Custom error classes for Bitbucket API Client Service
 *
 * Provides typed error hierarchy for different HTTP error scenarios.
 * Enables proper error handling and control flow in client code.
 *
 * @module services/errors
 */

/**
 * Base error class for all Bitbucket API client errors
 *
 * @remarks
 * All custom errors extend this base class to enable
 * instanceof checks and consistent error structure.
 */
export class BitbucketClientError extends Error {
  /**
   * HTTP status code that triggered this error
   */
  public readonly statusCode: number;

  /**
   * Operation ID that was being executed
   */
  public readonly operationId: string;

  /**
   * Raw response body from Bitbucket API (if available)
   */
  public readonly response?: unknown;

  /**
   * Creates a new BitbucketClientError
   *
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code
   * @param operationId - Bitbucket operation ID being executed
   * @param response - Optional raw response body for debugging
   */
  constructor(message: string, statusCode: number, operationId: string, response?: unknown) {
    super(message);
    this.name = 'BitbucketClientError';
    this.statusCode = statusCode;
    this.operationId = operationId;
    this.response = response;

    // Maintains proper stack trace in V8 engines
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when request validation fails (400 Bad Request)
 *
 * @remarks
 * Indicates malformed request, missing required fields,
 * or invalid parameter values. Should NOT be retried.
 *
 * @example
 * ```typescript
 * throw new ValidationError(
 *   'Missing required field: summary',
 *   400,
 *   'createRepository',
 *   { errors: { summary: 'Field is required' } }
 * );
 * ```
 *
 * @throws ValidationError - When request fails validation
 */
export class ValidationError extends BitbucketClientError {
  constructor(message: string, operationId: string, response?: unknown) {
    super(message, 400, operationId, response);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when authentication fails (401 Unauthorized, 403 Forbidden)
 *
 * @remarks
 * Indicates invalid credentials, expired tokens, or insufficient permissions.
 * Should NOT be retried without updating credentials.
 *
 * @example
 * ```typescript
 * throw new AuthError(
 *   'Authentication token expired',
 *   401,
 *   'getRepository',
 *   { message: 'Token has expired' }
 * );
 * ```
 *
 * @throws AuthError - When authentication or authorization fails
 */
export class AuthError extends BitbucketClientError {
  constructor(message: string, statusCode: 401 | 403, operationId: string, response?: unknown) {
    super(message, statusCode, operationId, response);
    this.name = 'AuthError';
  }
}

/**
 * Thrown when resource is not found (404 Not Found)
 *
 * @remarks
 * Indicates the requested Bitbucket resource (issue, project, etc.) does not exist
 * or user doesn't have permission to view it. Should NOT be retried.
 *
 * @example
 * ```typescript
 * throw new NotFoundError(
 *   'Issue PROJ-999 not found',
 *   'getRepository',
 *   { errorMessages: ['Issue does not exist'] }
 * );
 * ```
 *
 * @throws NotFoundError - When requested resource doesn't exist
 */
export class NotFoundError extends BitbucketClientError {
  constructor(message: string, operationId: string, response?: unknown) {
    super(message, 404, operationId, response);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when rate limit is exceeded (429 Too Many Requests)
 *
 * @remarks
 * Indicates too many requests in a given time period.
 * Should be retried with exponential backoff.
 *
 * @example
 * ```typescript
 * throw new RateLimitError(
 *   'Rate limit exceeded, retry after 60s',
 *   'search_issues',
 *   { retryAfter: 60 }
 * );
 * ```
 *
 * @throws RateLimitError - When rate limit exceeded (should retry)
 */
export class RateLimitError extends BitbucketClientError {
  /**
   * Number of seconds to wait before retrying (from Retry-After header)
   */
  public readonly retryAfter?: number;

  constructor(message: string, operationId: string, response?: unknown, retryAfter?: number) {
    super(message, 429, operationId, response);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when server error occurs (500-599)
 *
 * @remarks
 * Indicates temporary Bitbucket server issues. Should be retried
 * with exponential backoff as these are typically transient.
 *
 * @example
 * ```typescript
 * throw new ServerError(
 *   'Internal server error',
 *   503,
 *   'updateRepository',
 *   { error: 'Service temporarily unavailable' }
 * );
 * ```
 *
 * @throws ServerError - When server error occurs (should retry)
 */
export class ServerError extends BitbucketClientError {
  constructor(message: string, statusCode: number, operationId: string, response?: unknown) {
    super(message, statusCode, operationId, response);
    this.name = 'ServerError';
  }
}

/**
 * Thrown when request times out
 *
 * @remarks
 * Indicates request exceeded configured timeout threshold.
 * Should be retried as this is a transient network issue.
 *
 * @example
 * ```typescript
 * throw new TimeoutError(
 *   'Request timed out after 30000ms',
 *   'search_issues'
 * );
 * ```
 *
 * @throws TimeoutError - When request exceeds timeout (should retry)
 */
export class TimeoutError extends BitbucketClientError {
  constructor(message: string, operationId: string) {
    super(message, 0, operationId);
    this.name = 'TimeoutError';
  }
}
