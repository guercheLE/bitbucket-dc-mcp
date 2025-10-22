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
import type { BitbucketClientService } from '../services/bitbucket-client.js';
import type { HttpRequestContext, IHttpAuthManager, IHttpRequestHandler } from './types.js';

/**
 * HTTP Request Handler
 *
 * @remarks
 * Handles HTTP requests containing MCP protocol data.
 * Single Responsibility: Only responsible for processing HTTP requests.
 * Dependency Inversion: Depends on abstractions (IHttpAuthManager, BitbucketClientService).
 *
 * @example
 * ```typescript
 * const handler = new HttpRequestHandler(
 *   httpAuthManager,
 *   bitbucketClient,
 *   logger
 * );
 *
 * const response = await handler.handle(context);
 * // Returns response data to send to client
 * ```
 */
export class HttpRequestHandler implements IHttpRequestHandler {
  constructor(
    private readonly httpAuthManager: IHttpAuthManager,
    private readonly bitbucketClient: BitbucketClientService,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Handle an HTTP request containing MCP protocol data
   *
   * @param context - Complete request context
   * @returns Response data to send back to client
   * @throws {Error} If request handling fails
   */
  async handle(context: HttpRequestContext): Promise<unknown> {
    const { requestId, body } = context;

    this.logger.info(
      {
        event: 'http.handle_request',
        requestId,
        method: context.request.method,
        url: context.request.url,
      },
      'Handling HTTP MCP request',
    );

    try {
      // Step 1: Authenticate the request
      const credentials = await this.httpAuthManager.authenticate(context);

      this.logger.debug(
        {
          event: 'http.authenticated',
          requestId,
          authMethod: credentials.auth_method,
        },
        'Request authenticated successfully',
      );

      // Step 2: Validate request body
      if (!this.isValidMcpRequest(body)) {
        this.logger.warn(
          {
            event: 'http.invalid_request',
            requestId,
          },
          'Invalid MCP request format',
        );
        throw new Error('Invalid MCP request format');
      }

      const mcpRequest = body as {
        method: string;
        params?: Record<string, unknown>;
      };

      // Step 3: Process MCP request
      this.logger.debug(
        {
          event: 'http.process_mcp_request',
          requestId,
          mcpMethod: mcpRequest.method,
        },
        'Processing MCP request',
      );

      const result = await this.processMcpRequest(mcpRequest, credentials);

      this.logger.info(
        {
          event: 'http.request_success',
          requestId,
          mcpMethod: mcpRequest.method,
        },
        'HTTP request processed successfully',
      );

      return {
        jsonrpc: '2.0',
        id: (mcpRequest as { id?: string | number }).id ?? null,
        result,
      };
    } catch (error) {
      this.logger.error(
        {
          event: 'http.request_error',
          requestId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Error handling HTTP request',
      );

      return {
        jsonrpc: '2.0',
        id: (body as { id?: string | number })?.id ?? null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  /**
   * Validate if body is a valid MCP request
   */
  private isValidMcpRequest(body: unknown): boolean {
    if (!body || typeof body !== 'object') {
      return false;
    }

    const request = body as Record<string, unknown>;
    return typeof request.method === 'string';
  }

  /**
   * Process MCP request
   *
   * @remarks
   * This is a simplified implementation. In production, you would:
   * 1. Route to appropriate tool handler based on method
   * 2. Validate parameters against schema
   * 3. Execute the operation
   * 4. Transform result to MCP format
   */
  private async processMcpRequest(
    request: { method: string; params?: Record<string, unknown> },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _credentials: unknown,
  ): Promise<unknown> {
    // TODO: Implement actual MCP request routing and processing
    // For now, return a placeholder response

    this.logger.debug(
      {
        event: 'http.mcp_request_processed',
        method: request.method,
      },
      'MCP request processed (placeholder)',
    );

    return {
      status: 'success',
      message: `MCP method ${request.method} processed`,
      credentials_used: true,
    };
  }
}
