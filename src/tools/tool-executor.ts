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
import {
  createCorrelationContext,
  getElapsedTime,
  runWithCorrelationContext,
  type CorrelationContext,
} from '../core/correlation-context.js';
import { sanitizeParams } from '../core/sanitizer.js';

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Interface for tools that can be executed
 */
export interface ExecutableTool {
  execute(input: unknown): Promise<unknown>;
}

/**
 * Configuration for tool executor
 */
export interface ToolExecutorConfig {
  serviceName: string;
  serviceVersion: string;
  logger: PinoLogger;
}

/**
 * Handles the execution context and logging for MCP tools.
 * Follows Single Responsibility Principle by focusing only on execution orchestration.
 */
export class ToolExecutor {
  constructor(private readonly config: ToolExecutorConfig) {}

  /**
   * Creates a request logger with correlation context
   */
  private createRequestLogger(
    correlationContext: CorrelationContext,
    toolName: string,
  ): PinoLogger {
    return this.config.logger.child({
      correlationId: correlationContext.correlationId,
      tool_name: toolName,
    });
  }

  /**
   * Logs tool invocation with sanitized arguments
   */
  private logInvocation(logger: PinoLogger, args: unknown): void {
    logger.info(
      {
        event: 'tool.invocation',
        args: sanitizeParams(args),
      },
      'Tool invoked',
    );
  }

  /**
   * Logs successful tool execution
   */
  private logSuccess(logger: PinoLogger, additionalInfo?: Record<string, unknown>): void {
    const latencyMs = getElapsedTime();
    logger.info(
      {
        event: 'tool.success',
        latency_ms: latencyMs,
        ...additionalInfo,
      },
      'Tool executed successfully',
    );
  }

  /**
   * Logs tool execution error
   */
  private logError(
    logger: PinoLogger,
    error: unknown,
    additionalInfo?: Record<string, unknown>,
  ): void {
    const latencyMs = getElapsedTime();
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        event: 'tool.error',
        error_type: error instanceof Error ? error.name : 'Unknown',
        error_message: errorMessage,
        latency_ms: latencyMs,
        ...additionalInfo,
      },
      'Tool execution failed',
    );
  }

  /**
   * Formats error response
   */
  private formatErrorResponse(errorMessage: string): ToolExecutionResult {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }

  /**
   * Formats success response
   */
  private formatSuccessResponse(result: unknown): ToolExecutionResult {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Executes a tool within correlation context with proper logging
   * Follows Open/Closed Principle - can handle any ExecutableTool without modification
   */
  async executeWithContext(
    toolName: string,
    args: unknown,
    tool: ExecutableTool,
    additionalLogInfo?: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const correlationContext = createCorrelationContext(
      this.config.serviceName,
      this.config.serviceVersion,
      toolName,
    );
    const requestLogger = this.createRequestLogger(correlationContext, toolName);

    return runWithCorrelationContext(correlationContext, async () => {
      this.logInvocation(requestLogger, args);

      try {
        const result = await tool.execute(args);
        this.logSuccess(requestLogger, additionalLogInfo);
        return this.formatSuccessResponse(result);
      } catch (error) {
        this.logError(requestLogger, error, additionalLogInfo);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return this.formatErrorResponse(errorMessage);
      }
    });
  }

  /**
   * Executes a tool and returns the raw result directly (for tools that handle their own response formatting)
   */
  async executeWithCustomResponse(
    toolName: string,
    args: unknown,
    tool: ExecutableTool,
  ): Promise<ToolExecutionResult> {
    const correlationContext = createCorrelationContext(
      this.config.serviceName,
      this.config.serviceVersion,
      toolName,
    );
    const requestLogger = this.createRequestLogger(correlationContext, toolName);

    return runWithCorrelationContext(correlationContext, async () => {
      this.logInvocation(requestLogger, args);

      try {
        const result = (await tool.execute(args)) as ToolExecutionResult;
        this.logSuccess(requestLogger);
        return result;
      } catch (error) {
        this.logError(requestLogger, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return this.formatErrorResponse(`Unexpected error: ${errorMessage}`);
      }
    });
  }
}
