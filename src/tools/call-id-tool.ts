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
 * Call ID Tool - Execute Bitbucket Data Center API operations
 *
 * Implements the `call_id` MCP tool that validates operation parameters,
 * executes Bitbucket API calls, and returns normalized responses with comprehensive
 * error handling, timeout protection, and audit logging.
 *
 * @module tools/call-id-tool
 *
 * @example
 * ```typescript
 * const tool = new CallIdTool(bitbucketClient, authManager, logger, config);
 *
 * const result = await tool.execute({
 *   operation_id: 'create_issue',
 *   parameters: {
 *     fields: {
 *       project: { key: 'PROJ' },
 *       summary: 'New issue',
 *       issuetype: { name: 'Task' }
 *     }
 *   }
 * });
 * ```
 */

import type { Logger as PinoLogger } from 'pino';
import { z } from 'zod';
import type { AuthManager } from '../auth/auth-manager.js';
import type { ComponentRegistry } from '../core/component-registry.js';
import type { AppConfig } from '../core/config-manager.js';
import { getTraceId } from '../core/correlation-context.js';
import { ComponentUnavailableError } from '../core/errors.js';
import { sanitizeParams } from '../core/sanitizer.js';
import type { BitbucketClientService } from '../services/bitbucket-client.js';
import {
  AuthError,
  BitbucketClientError,
  ValidationError as BitbucketValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
} from '../services/errors.js';
import { validateOperationInput } from '../validation/validator.js';
import type { OperationsRepository } from './get-id-tool.js';

/**
 * Default timeout for operation execution in milliseconds
 */
const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Input schema for the call_id MCP tool
 */
export const CallIdInputSchema = z.object({
  operation_id: z
    .string()
    .min(1, 'operation_id cannot be empty')
    .describe('Bitbucket operation ID (e.g., "create_issue", "get_issue")'),
  parameters: z
    .union([
      z.record(z.unknown()), // Accept object directly
      z.string().transform((str, ctx) => {
        // Accept JSON string and parse it
        try {
          const parsed = JSON.parse(str);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Parameters must be a JSON object',
            });
            return z.NEVER;
          }
          return parsed as Record<string, unknown>;
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid JSON string: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          return z.NEVER;
        }
      }),
    ])
    .describe('Operation parameters (path, query, body fields) as object or JSON string'),
});

export type CallIdInput = z.infer<typeof CallIdInputSchema>;

/**
 * Output structure for the call_id MCP tool
 */
export interface CallIdOutput {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Authentication context for audit logging
 */
export interface AuthContext {
  user?: {
    accountId?: string;
    email?: string;
    displayName?: string;
  };
  tokenType: string; // 'oauth2' | 'pat' | 'basic'
  lastValidated: Date;
}

/**
 * Call ID Tool implementation
 *
 * Executes Bitbucket operations with:
 * - Input validation using Zod schemas
 * - Timeout protection (configurable, default 60s)
 * - Structured logging with metrics
 * - Audit trail for mutations (POST, PUT, DELETE)
 * - Normalized error responses
 *
 * @remarks
 * This tool is the core execution layer that bridges validated MCP requests
 * to actual Bitbucket API calls. All operation executions flow through this tool.
 */
export class CallIdTool {
  /**
   * Creates a new CallIdTool instance
   *
   * @param bitbucketClient - Bitbucket API client service
   * @param authManager - Authentication manager for user context
   * @param operationsRepository - Repository for operation metadata
   * @param logger - Structured logger instance
   * @param config - Application configuration
   * @param registry - Optional component registry for health checks
   */
  constructor(
    private readonly bitbucketClient: BitbucketClientService,
    private readonly authManager: AuthManager,
    private readonly operationsRepository: OperationsRepository,
    private readonly logger: PinoLogger,
    private readonly config: AppConfig,
    private readonly registry?: ComponentRegistry,
  ) {}

  /**
   * Execute a Bitbucket operation with validated parameters
   *
   * Flow:
   * 1. Validate input parameters against operation schema
   * 2. Check if operation is a mutation for audit logging
   * 3. Execute operation with timeout protection
   * 4. Return normalized success or error response
   *
   * @param input - Call ID input with operation_id and parameters
   * @returns Normalized response or error
   *
   * @example
   * ```typescript
   * const result = await tool.execute({
   *   operation_id: 'get_issue',
   *   parameters: { issueIdOrKey: 'PROJ-123' }
   * });
   * ```
   */
  async execute(input: unknown): Promise<CallIdOutput> {
    const startTime = Date.now();
    const traceId = getTraceId();

    try {
      // Check critical components health before execution
      if (this.registry) {
        if (!this.registry.isComponentHealthy('BitbucketClientService')) {
          this.logger.error(
            {
              event: 'call_id.component_unavailable',
              traceId: traceId,
              component: 'BitbucketClientService',
            },
            'Bitbucket API unavailable',
          );
          throw new ComponentUnavailableError(
            'BitbucketClientService',
            'Bitbucket API unavailable',
            'Check Bitbucket URL and network connectivity',
          );
        }

        if (!this.registry.isComponentHealthy('AuthManager')) {
          this.logger.error(
            {
              event: 'call_id.component_unavailable',
              traceId: traceId,
              component: 'AuthManager',
            },
            'Authentication unavailable',
          );
          throw new ComponentUnavailableError(
            'AuthManager',
            'Authentication unavailable',
            'Run setup wizard: bitbucket-dc-mcp setup',
          );
        }

        // Log if operating in degraded mode (optional components down)
        const systemHealth = this.registry.getSystemHealth();
        if (systemHealth.overallStatus === 'DEGRADED') {
          const degradedComponents = systemHealth.components
            .filter((c) => c.status !== 'HEALTHY')
            .map((c) => c.name);
          this.logger.info(
            {
              event: 'call_id.degraded_mode',
              traceId: traceId,
              operation_id: 'pending',
              degraded_components: degradedComponents,
            },
            'call_id executed in degraded mode',
          );
        }
      }

      // Parse and validate tool input schema
      const parsed = CallIdInputSchema.parse(input);
      const { operation_id, parameters } = parsed;

      // Task 9: Log tool invocation with correlation context
      this.logger.info(
        {
          event: 'call_id.execution_start',
          traceId: traceId,
          tool_name: 'call_id',
          operation_id,
          timestamp: new Date().toISOString(),
        },
        'Executing Bitbucket operation',
      );

      // DEBUG: Log parameters BEFORE validation
      this.logger.debug(
        {
          event: 'call_id.parameters_received',
          traceId: traceId,
          operation_id,
          parameterKeys:
            typeof parameters === 'object' && parameters !== null
              ? Object.keys(parameters as Record<string, unknown>)
              : [],
          parametersType: typeof parameters,
          parametersIsNull: parameters === null,
          parametersIsUndefined: parameters === undefined,
        },
        'Parameters received before validation',
      );

      // Validate operation parameters using Zod schemas
      const validationResult = await validateOperationInput(operation_id, parameters);

      // DEBUG: Log validation result
      this.logger.debug(
        {
          event: 'call_id.validation_result',
          traceId: traceId,
          operation_id,
          validationSuccess: validationResult.success,
          validatedDataKeys: validationResult.success
            ? Object.keys(validationResult.data as Record<string, unknown>)
            : [],
        },
        'Validation completed',
      );

      if (!validationResult.success) {
        const latency = Date.now() - startTime;
        this.logger.warn(
          {
            event: 'call_id.validation_failed',
            traceId: traceId,
            tool_name: 'call_id',
            operation_id,
            latency_ms: latency,
            errors: validationResult.errors,
          },
          'Operation validation failed',
        );

        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'ValidationError',
                  message: 'Invalid operation parameters',
                  errors: validationResult.errors,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Check if operation is a mutation for audit logging
      const operation = this.operationsRepository.getOperation(operation_id);
      const isMutation = operation && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(operation.method);

      if (isMutation) {
        await this.logAuditTrail(operation_id, operation.method, validationResult.data);
      }

      // DEBUG: Log parameters BEFORE sending to BitbucketClient
      this.logger.debug(
        {
          event: 'call_id.sending_to_client',
          traceId: traceId,
          operation_id,
          dataKeys: Object.keys(validationResult.data as Record<string, unknown>),
          dataCount: Object.keys(validationResult.data as Record<string, unknown>).length,
        },
        'Sending validated data to Bitbucket client',
      );

      // Execute operation with timeout protection
      const timeoutMs = this.config.timeout ?? DEFAULT_TIMEOUT_MS;
      const result = await this.executeWithTimeout(
        () => this.bitbucketClient.executeOperation(operation_id, validationResult.data),
        timeoutMs,
        operation_id,
      );

      // Task 9: Log successful execution with metrics
      const latency = Date.now() - startTime;
      this.logger.info(
        {
          event: 'call_id.execution_success',
          traceId: traceId,
          tool_name: 'call_id',
          operation_id,
          method: operation?.method,
          path: operation?.path,
          status: 'success',
          latency_ms: latency,
        },
        'Operation completed successfully',
      );

      // Return success response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return this.handleError(error, latency);
    }
  }

  /**
   * Execute operation with timeout protection
   *
   * @param operation - Async operation to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param operationId - Operation ID for error messages
   * @returns Operation result
   * @throws {TimeoutError} If operation exceeds timeout
   *
   * @private
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationId: string,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Operation timeout after ${timeoutMs}ms`, operationId));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Log audit trail for mutation operations
   *
   * Records all POST, PUT, DELETE, PATCH operations with:
   * - Correlation ID for request tracking
   * - Operation ID and HTTP method
   * - Sanitized parameters (credentials removed)
   * - User identity from auth context
   * - ISO 8601 timestamp
   * - Bitbucket URL and API path
   *
   * @param operationId - Bitbucket operation ID
   * @param method - HTTP method
   * @param parameters - Operation parameters (will be sanitized)
   *
   * @private
   */
  private async logAuditTrail(
    operationId: string,
    method: string,
    parameters: unknown,
  ): Promise<void> {
    try {
      // Get current auth context for user identification
      const authContext = await this.getCurrentAuthContext();
      const traceId = getTraceId();

      // Get operation details for audit trail
      const operation = this.operationsRepository.getOperation(operationId);
      const bitbucketUrl = this.config.bitbucketUrl;
      const path = operation?.path ?? 'unknown';

      this.logger.info(
        {
          event: 'call_id.mutation_audit',
          audit_type: 'mutation',
          traceId: traceId,
          operation_id: operationId,
          bitbucket_url: bitbucketUrl,
          method,
          path,
          parameters: sanitizeParams(parameters),
          user_id:
            authContext.user?.accountId ||
            authContext.user?.email ||
            authContext.user?.displayName ||
            'unknown',
          token_type: authContext.tokenType,
          timestamp: new Date().toISOString(),
        },
        'Mutation audit trail',
      );
    } catch (error) {
      // Don't fail operation if audit logging fails
      this.logger.error(
        {
          event: 'call_id.audit_failed',
          operation_id: operationId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to log audit trail',
      );
    }
  }

  /**
   * Get current authentication context for audit logging
   *
   * Returns cached user information from most recent authentication.
   * Delegates to AuthManager if available, otherwise returns default context.
   *
   * @returns Authentication context with user info
   *
   * @private
   */
  private async getCurrentAuthContext(): Promise<AuthContext> {
    try {
      // Try to get credentials from AuthManager to build auth context
      if (this.authManager && typeof this.authManager.getCredentials === 'function') {
        const credentials = await this.authManager.getCredentials();
        return {
          user: {
            email: credentials.username || 'unknown',
            displayName: credentials.username || 'unknown',
          },
          tokenType: credentials.auth_method,
          lastValidated: credentials.expires_at ? new Date(credentials.expires_at) : new Date(),
        };
      }
    } catch (error) {
      // Fall through to default if authManager fails
      this.logger.debug(
        {
          event: 'call_id.auth_context_fallback',
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to get auth context, using default',
      );
    }

    // Default context when AuthManager is not available or fails
    return {
      user: {
        email: 'unknown',
      },
      tokenType: 'unknown',
      lastValidated: new Date(),
    };
  }

  /**
   * Handle and normalize errors
   *
   * Converts various error types to normalized MCP error responses:
   * - ValidationError (400) → Invalid parameters
   * - AuthError (401/403) → Authentication failed
   * - NotFoundError (404) → Resource not found
   * - RateLimitError (429) → Rate limit exceeded
   * - TimeoutError → Operation timeout
   * - ServerError (5xx) → Bitbucket server error
   * - Unknown errors → Generic operation failed
   *
   * @param error - Error to handle
   * @param latency - Operation latency in milliseconds
   * @returns Normalized error response
   *
   * @private
   */
  private handleError(error: unknown, latency: number): CallIdOutput {
    const traceId = getTraceId();
    let errorResponse: {
      error: string;
      message: string;
      statusCode?: number;
      details?: unknown;
    };

    if (error instanceof BitbucketValidationError) {
      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: 'ValidationError',
          status_code: error.statusCode,
          operation_id: error.operationId,
          latency_ms: latency,
          error: error.message,
        },
        'Operation failed: validation error',
      );

      errorResponse = {
        error: 'ValidationError',
        message: `Invalid parameters: ${error.message}`,
        statusCode: 400,
        details: error.response,
      };
    } else if (error instanceof AuthError) {
      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: 'AuthError',
          status_code: error.statusCode,
          operation_id: error.operationId,
          latency_ms: latency,
          error: error.message,
        },
        'Operation failed: authentication error',
      );

      errorResponse = {
        error: 'AuthError',
        message: `Authentication failed: ${error.message}`,
        statusCode: error.statusCode,
      };
    } else if (error instanceof NotFoundError) {
      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: 'NotFoundError',
          status_code: error.statusCode,
          operation_id: error.operationId,
          latency_ms: latency,
          error: error.message,
        },
        'Operation failed: resource not found',
      );

      errorResponse = {
        error: 'NotFoundError',
        message: `Resource not found: ${error.message}`,
        statusCode: 404,
      };
    } else if (error instanceof RateLimitError) {
      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: 'RateLimitError',
          status_code: error.statusCode,
          operation_id: error.operationId,
          latency_ms: latency,
          error: error.message,
          retry_after: (error as RateLimitError & { retryAfter?: number }).retryAfter,
        },
        'Operation failed: rate limit exceeded',
      );

      const retryAfter = (error as RateLimitError & { retryAfter?: number }).retryAfter;
      errorResponse = {
        error: 'RateLimitError',
        message: retryAfter
          ? `Rate limit exceeded. Retry after ${retryAfter}s`
          : 'Rate limit exceeded',
        statusCode: 429,
      };
    } else if (error instanceof TimeoutError) {
      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: 'TimeoutError',
          operation_id: error.operationId,
          latency_ms: latency,
          error: error.message,
        },
        'Operation failed: timeout',
      );

      errorResponse = {
        error: 'TimeoutError',
        message: error.message,
      };
    } else if (error instanceof ServerError) {
      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: 'ServerError',
          status_code: error.statusCode,
          operation_id: error.operationId,
          latency_ms: latency,
          error: error.message,
        },
        'Operation failed: server error',
      );

      errorResponse = {
        error: 'ServerError',
        message: `Bitbucket server error: ${error.statusCode} ${error.message}`,
        statusCode: error.statusCode,
      };
    } else if (error instanceof BitbucketClientError) {
      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: 'BitbucketClientError',
          status_code: error.statusCode,
          operation_id: error.operationId,
          latency_ms: latency,
          error: error.message,
        },
        'Operation failed: client error',
      );

      errorResponse = {
        error: 'BitbucketClientError',
        message: error.message,
        statusCode: error.statusCode,
      };
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

      this.logger.error(
        {
          event: 'call_id.error',
          traceId: traceId,
          tool_name: 'call_id',
          error_type: errorType,
          latency_ms: latency,
          error: errorMessage,
        },
        'Operation failed: unexpected error',
      );

      errorResponse = {
        error: errorType,
        message: `Operation failed: ${errorMessage}`,
      };
    }

    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
    };
  }
}
