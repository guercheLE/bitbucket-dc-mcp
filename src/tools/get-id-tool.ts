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
import { z } from 'zod';
import type { QueryCache } from '../core/cache-manager.js';
import type { ComponentRegistry } from '../core/component-registry.js';
import { getCorrelationId } from '../core/correlation-context.js';
import { Logger } from '../core/logger.js';

/**
 * Input schema for the get_id MCP tool.
 */
export const GetIdInputSchema = z.object({
  operation_id: z.string().min(1, 'operation_id cannot be empty'),
});

export type GetIdInput = z.infer<typeof GetIdInputSchema>;

/**
 * Parameter definition for API operations.
 */
export interface Parameter {
  readonly name: string;
  readonly in: 'path' | 'query' | 'header' | 'cookie';
  readonly required: boolean;
  readonly schema: Record<string, unknown>;
  readonly description?: string;
}

/**
 * Request body definition for API operations.
 */
export interface RequestBody {
  readonly required: boolean;
  readonly content: Record<string, MediaType>;
  readonly description?: string;
}

/**
 * Media type definition for request/response bodies.
 */
export interface MediaType {
  readonly schema: Record<string, unknown>;
  readonly examples?: Record<string, Example>;
}

/**
 * Example definition for requests/responses.
 */
export interface Example {
  readonly value: unknown;
  readonly summary?: string;
  readonly description?: string;
}

/**
 * Response definition for API operations.
 */
export interface Response {
  readonly description: string;
  readonly content?: Record<string, MediaType>;
}

/**
 * Examples generated for an operation.
 */
export interface Examples {
  readonly curl: string;
  readonly request?: unknown;
  readonly response?: unknown;
}

/**
 * Output schema for the get_id MCP tool.
 */
export interface GetIdOutput {
  readonly operation_id: string;
  readonly path: string;
  readonly method: string;
  readonly summary: string;
  readonly description: string;
  readonly parameters: Parameter[];
  readonly requestBody?: RequestBody;
  readonly responses: Record<string, Response>;
  readonly examples: Examples;
  readonly documentation_url?: string;
  readonly deprecated?: boolean;
}

/**
 * Operation data model from repository.
 */
export interface Operation {
  readonly operationId: string;
  readonly path: string;
  readonly method: string;
  readonly summary: string;
  readonly description: string;
  readonly tags: string[];
  readonly parameters: Parameter[];
  readonly requestBody: RequestBody | null;
  readonly responses: Record<string, Response>;
  readonly deprecated?: boolean;
}

/**
 * Repository interface for accessing operation data.
 */
export interface OperationsRepository {
  getOperation(operationId: string): Operation | null;
}

/**
 * Custom error class for operation not found scenarios.
 */
export class OperationNotFoundError extends Error {
  constructor(operationId: string) {
    super(`Operation '${operationId}' not found`);
    this.name = 'OperationNotFoundError';
    Error.captureStackTrace?.(this, OperationNotFoundError);
  }
}

/**
 * Hardcoded fallback schemas for most common operations.
 * Used when EmbeddingsRepository is unavailable.
 */
const FALLBACK_OPERATIONS = new Map<string, Operation>([
  [
    'get_projects',
    {
      operationId: 'get_projects',
      path: '/rest/api/latest/projects',
      method: 'get',
      summary: 'Get projects',
      description: 'Retrieves a page of projects.',
      tags: ['Projects'],
      parameters: [],
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
                    project: { type: 'object', properties: { key: { type: 'string' } } },
                    summary: { type: 'string' },
                    description: { type: 'string' },
                    issuetype: { type: 'object', properties: { name: { type: 'string' } } },
                  },
                  required: ['project', 'summary', 'issuetype'],
                },
              },
              required: ['fields'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Issue created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  key: { type: 'string' },
                  self: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  ],
  [
    'get_repositories',
    {
      operationId: 'get_repositories',
      path: '/rest/api/latest/projects/{projectKey}/repos',
      method: 'get',
      summary: 'Get repositories',
      description: 'Retrieves a page of repositories from the specified project.',
      tags: ['Repositories'],
      parameters: [
        {
          name: 'jql',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'The JQL that defines the search',
        },
        {
          name: 'maxResults',
          in: 'query',
          required: false,
          schema: { type: 'integer', default: 50 },
          description: 'Maximum number of results to return',
        },
      ],
      requestBody: null,
      responses: {
        '200': {
          description: 'Search results returned successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  issues: { type: 'array' },
                  total: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  ],
]);

/**
 * MCP tool implementation for retrieving complete operation details by ID.
 *
 * This tool enables LLMs to discover detailed schema information, documentation,
 * and usage examples for specific Bitbucket API operations. Results are cached for
 * performance since operation schemas rarely change.
 *
 * @example
 * ```typescript
 * const tool = new GetIdTool(repository, cache, logger);
 * const result = await tool.execute({ operation_id: "create_issue" });
 * // Returns complete schema, parameters, examples, and documentation URL
 * ```
 */
export class GetIdTool {
  private readonly logger: PinoLogger;
  private readonly registry?: ComponentRegistry;

  /**
   * Creates a new GetIdTool instance.
   *
   * @param repository - Repository for accessing operation data
   * @param cache - LRU cache for operation details (500 entries max)
   * @param logger - Optional logger instance (defaults to singleton Logger)
   * @param registry - Optional component registry for health checks
   */
  constructor(
    private readonly repository: OperationsRepository,
    private readonly cache: QueryCache<GetIdOutput>,
    logger?: PinoLogger,
    registry?: ComponentRegistry,
  ) {
    this.logger = logger ?? Logger.getInstance();
    this.registry = registry;
  }

  /**
   * Returns the Zod input schema for MCP tool registration.
   *
   * @returns Zod schema object defining operation_id (string, required)
   */
  public getInputSchema(): typeof GetIdInputSchema {
    return GetIdInputSchema;
  }

  /**
   * Retrieves complete operation details including schema, examples, and documentation.
   *
   * @param input - Input containing operation_id to retrieve
   * @returns Promise resolving to complete operation details
   * @throws {OperationNotFoundError} When operation_id does not exist
   *
   * @example
   * ```typescript
   * const result = await tool.execute({ operation_id: "get_projects" });
   * console.log(result.path); // "/rest/api/latest/projects"
   * console.log(result.examples.curl); // Generated curl command
   * ```
   */
  public async execute(input: unknown): Promise<GetIdOutput> {
    const startTime = Date.now();
    const correlationId = getCorrelationId();

    // Input validation
    let validatedInput: GetIdInput;
    try {
      validatedInput = GetIdInputSchema.parse(input);
    } catch (error) {
      this.logger.error(
        {
          event: 'get_id.validation_error',
          correlation_id: correlationId,
          input,
          error: String(error),
        },
        'Input validation failed',
      );
      throw new Error(`Invalid input: ${error instanceof Error ? error.message : String(error)}`);
    }

    const { operation_id } = validatedInput;

    // Task 9: Log tool invocation with correlation context
    this.logger.info(
      {
        event: 'get_id.start',
        correlation_id: correlationId,
        tool_name: 'get_id',
        operation_id,
      },
      'Retrieving operation details',
    );

    // Check cache first
    const cached = this.cache.get(operation_id);
    if (cached) {
      const latencyMs = Date.now() - startTime;
      // Task 9: Log cache hit with metrics
      this.logger.info(
        {
          event: 'get_id.success',
          correlation_id: correlationId,
          tool_name: 'get_id',
          operation_id,
          cache_hit: true,
          latency_ms: latencyMs,
        },
        'Operation details retrieved from cache',
      );
      return cached;
    }

    this.logger.debug(
      {
        event: 'get_id.cache_miss',
        correlation_id: correlationId,
        operation_id,
      },
      'Cache miss, querying repository',
    );

    // Query repository
    try {
      let operation: Operation | null = null;

      // Attempt to get from repository if healthy
      if (!this.registry || this.registry.isComponentHealthy('EmbeddingsRepository')) {
        operation = this.repository.getOperation(operation_id);
      }

      // Fallback to hardcoded schemas if repository unavailable or operation not found
      if (!operation) {
        const fallbackOp = FALLBACK_OPERATIONS.get(operation_id);
        if (fallbackOp) {
          this.logger.warn(
            {
              event: 'get_id.fallback_used',
              correlation_id: correlationId,
              operation_id,
            },
            'Using fallback schema, embeddings DB unavailable',
          );
          operation = fallbackOp;
        }
      }

      if (!operation) {
        const latencyMs = Date.now() - startTime;
        this.logger.warn(
          {
            event: 'get_id.not_found',
            correlation_id: correlationId,
            tool_name: 'get_id',
            operation_id,
            latency_ms: latencyMs,
          },
          'Operation not found',
        );

        const dbUnavailable =
          this.registry && !this.registry.isComponentHealthy('EmbeddingsRepository');
        const errorMessage = dbUnavailable
          ? `Operation '${operation_id}' not found. Embeddings DB unavailable and no fallback schema exists.`
          : `Operation '${operation_id}' not found`;

        throw new OperationNotFoundError(errorMessage);
      }

      // Transform to output format
      const output = this.transformToOutput(operation);

      // Cache the result
      this.cache.set(operation_id, output);

      const latencyMs = Date.now() - startTime;
      // Task 9: Log tool result with metrics
      this.logger.info(
        {
          event: 'get_id.success',
          correlation_id: correlationId,
          tool_name: 'get_id',
          operation_id,
          cache_hit: false,
          latency_ms: latencyMs,
          deprecated: output.deprecated,
        },
        'Operation details retrieved successfully',
      );

      return output;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof OperationNotFoundError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Task 9: Log error with full context
      this.logger.error(
        {
          event: 'get_id.error',
          correlation_id: correlationId,
          tool_name: 'get_id',
          operation_id,
          error_message: errorMessage,
          stack: errorStack,
          latency_ms: latencyMs,
        },
        'Failed to retrieve operation details',
      );

      throw new Error(`Failed to retrieve operation details: ${errorMessage}`);
    }
  }

  /**
   * Transforms repository Operation model to GetIdOutput format.
   *
   * @param operation - Operation from repository
   * @returns Complete GetIdOutput with examples and documentation
   */
  private transformToOutput(operation: Operation): GetIdOutput {
    return {
      operation_id: operation.operationId,
      path: operation.path,
      method: operation.method.toUpperCase(),
      summary: operation.summary,
      description: operation.description,
      parameters: operation.parameters,
      requestBody: operation.requestBody ?? undefined,
      responses: operation.responses,
      examples: this.generateExamples(operation),
      documentation_url: this.getDocumentationUrl(operation),
      deprecated: operation.deprecated,
    };
  }

  /**
   * Generates practical usage examples for an operation.
   *
   * @param operation - Operation to generate examples for
   * @returns Examples object with curl command and request/response samples
   */
  private generateExamples(operation: Operation): Examples {
    const curlCommand = this.generateCurlCommand(operation);
    const requestExample = this.extractRequestExample(operation);
    const responseExample = this.extractResponseExample(operation);

    return {
      curl: curlCommand,
      request: requestExample,
      response: responseExample,
    };
  }

  /**
   * Generates a curl command example for the operation.
   *
   * @param operation - Operation to generate curl command for
   * @returns Formatted curl command string
   */
  private generateCurlCommand(operation: Operation): string {
    const method = operation.method.toUpperCase();
    let path = operation.path;

    // Replace path parameters with placeholder values
    const pathParams = operation.parameters.filter((p) => p.in === 'path');
    for (const param of pathParams) {
      path = path.replace(`{${param.name}}`, `<${param.name}>`);
    }

    let curl = `curl -X ${method} 'https://your-domain.atlassian.net${path}'`;
    curl += ` \\\n  -H 'Authorization: Basic <credentials>'`;
    curl += ` \\\n  -H 'Content-Type: application/json'`;

    // Add query parameters if present
    const queryParams = operation.parameters.filter((p) => p.in === 'query');
    if (queryParams.length > 0) {
      const queryString = queryParams
        .slice(0, 2) // Show max 2 query params in example
        .map((p) => `${p.name}=<${p.name}>`)
        .join('&');
      curl = curl.replace(path, `${path}?${queryString}`);
    }

    // Add request body if present
    if (operation.requestBody && method !== 'GET') {
      curl += ` \\\n  -d '${JSON.stringify(this.extractRequestExample(operation) || {}, null, 2)}'`;
    }

    return curl;
  }

  /**
   * Extracts request example from operation requestBody.
   *
   * @param operation - Operation to extract request example from
   * @returns Request example object or undefined
   */
  private extractRequestExample(operation: Operation): unknown {
    if (!operation.requestBody) {
      return undefined;
    }

    const content = operation.requestBody.content['application/json'];
    if (!content?.examples) {
      return undefined;
    }

    // Get first example
    const exampleKey = Object.keys(content.examples)[0];
    if (!exampleKey) {
      return undefined;
    }

    return content.examples[exampleKey].value;
  }

  /**
   * Extracts response example from operation responses.
   *
   * @param operation - Operation to extract response example from
   * @returns Response example object or undefined
   */
  private extractResponseExample(operation: Operation): unknown {
    // Try to get successful response (200, 201, 204)
    const successResponse =
      operation.responses['200'] || operation.responses['201'] || operation.responses['204'];

    if (!successResponse?.content) {
      return undefined;
    }

    const content = successResponse.content['application/json'];
    if (!content?.examples) {
      return undefined;
    }

    // Get first example
    const exampleKey = Object.keys(content.examples)[0];
    if (!exampleKey) {
      return undefined;
    }

    return content.examples[exampleKey].value;
  }

  /**
   * Constructs documentation URL for Bitbucket official docs.
   *
   * @param operation - Operation to get documentation URL for
   * @returns Documentation URL string or undefined
   */
  private getDocumentationUrl(operation: Operation): string | undefined {
    // Bitbucket Data Center REST API documentation follows a pattern
    // For now, return the general API reference
    // Could be enhanced with specific operation mapping
    if (operation.path.startsWith('/rest/api/')) {
      return 'https://developer.atlassian.com/server/bitbucket/rest/v1000/intro/';
    }

    return 'https://developer.atlassian.com/server/bitbucket/rest/v1000/intro/';
  }
}
