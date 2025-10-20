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

import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'node:module';
import type { Logger as PinoLogger } from 'pino';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AuthManager } from '../auth/auth-manager.js';
import { QueryCache } from '../core/cache-manager.js';
import type { ComponentRegistry } from '../core/component-registry.js';
import type { AppConfig } from '../core/config-manager.js';
import {
  createCorrelationContext,
  getElapsedTime,
  runWithCorrelationContext,
} from '../core/correlation-context.js';
import type { McpServer } from '../core/mcp-server.js';
import type { BitbucketClientService } from '../services/bitbucket-client.js';
import type { SemanticSearchService } from '../services/semantic-search.js';
import { CallIdInputSchema, CallIdTool } from './call-id-tool.js';
import type { GetIdOutput, OperationsRepository } from './get-id-tool.js';
import { GetIdInputSchema, GetIdTool } from './get-id-tool.js';
import { SearchIdsInputSchema, SearchIdsTool } from './search-ids-tool.js';

const require = createRequire(import.meta.url);
const packageInfo = require('../../package.json') as { version?: string };

const GET_ID_CACHE_MAX_ENTRIES = 500;
const GET_ID_CACHE_TTL_MS = Number.POSITIVE_INFINITY; // Operations rarely change

/**
 * Registers all MCP tools with the server.
 *
 * @param mcpServer - The MCP server instance
 * @param searchService - Semantic search service for search_ids tool (null if unavailable)
 * @param operationsRepository - Repository for accessing operation metadata
 * @param bitbucketClient - Bitbucket API client service for call_id tool
 * @param authManager - Authentication manager for call_id tool
 * @param config - Application configuration
 * @param logger - Logger instance
 * @param componentRegistry - Optional component registry for health checks
 */
export async function registerTools(
  mcpServer: McpServer,
  searchService: SemanticSearchService | null,
  operationsRepository: OperationsRepository,
  bitbucketClient: BitbucketClientService,
  authManager: AuthManager,
  config: AppConfig,
  logger: PinoLogger,
  componentRegistry?: ComponentRegistry,
): Promise<void> {
  const server = mcpServer.getServer();
  const searchIdsTool = searchService
    ? new SearchIdsTool(searchService, logger, componentRegistry)
    : null;

  // Initialize cache for get_id tool
  const getIdCache = new QueryCache<GetIdOutput>(
    GET_ID_CACHE_MAX_ENTRIES,
    GET_ID_CACHE_TTL_MS,
    logger,
  );
  const getIdTool = new GetIdTool(operationsRepository, getIdCache, logger, componentRegistry);

  // Initialize call_id tool
  const callIdTool = new CallIdTool(
    bitbucketClient,
    authManager,
    operationsRepository,
    logger,
    config,
    componentRegistry,
  );

  // Register tools/list handler
  logger.debug(
    { event: 'tools.registering_list_handler' },
    'Setting up tools/list request handler',
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug({ event: 'tools.list_requested' }, 'Client requested tools list');

    // Convert Zod schemas to JSON Schema format compatible with MCP protocol
    const searchIdsSchema = zodToJsonSchema(SearchIdsInputSchema, 'SearchIdsInput');
    const getIdSchema = zodToJsonSchema(GetIdInputSchema, 'GetIdInput');
    const callIdSchema = zodToJsonSchema(CallIdInputSchema, 'CallIdInput');

    // Ensure MCP compatibility: remove $schema and resolve $ref definitions
    const toMcpSchema = (schema: Record<string, unknown>): Record<string, unknown> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { $schema, $ref, definitions, ...rest } = schema;

      // If there's a $ref, resolve it from definitions
      if ($ref && typeof $ref === 'string' && definitions) {
        const refName = $ref.split('/').pop();
        if (refName && typeof definitions === 'object' && definitions !== null) {
          const defsObj = definitions as Record<string, unknown>;
          const resolvedSchema = defsObj[refName];
          if (resolvedSchema && typeof resolvedSchema === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { $schema: _, ...schemaWithoutDollarSchema } = resolvedSchema as Record<
              string,
              unknown
            >;
            return schemaWithoutDollarSchema;
          }
        }
      }

      // Otherwise, just remove $schema
      return rest;
    };

    const toolsList = {
      tools: [
        {
          name: 'search_ids',
          description:
            'Search for Bitbucket Data Center operations using natural language. ' +
            'Returns relevant operation IDs with similarity scores to help discover which API operations to use.',
          inputSchema: toMcpSchema(searchIdsSchema),
        },
        {
          name: 'get_id',
          description:
            'Get complete schema, documentation, and examples for a specific Bitbucket operation ID. ' +
            'Returns operation path, method, parameters, request/response schemas, curl examples, and documentation links.',
          inputSchema: toMcpSchema(getIdSchema),
        },
        {
          name: 'call_id',
          description:
            'Execute a Bitbucket Data Center API operation with validated parameters. ' +
            'Performs the actual API call to Bitbucket and returns the result or normalized error. ' +
            'Supports all Bitbucket operations including create, read, update, and delete actions.',
          inputSchema: toMcpSchema(callIdSchema),
        },
      ],
    };
    logger.debug(
      { event: 'tools.list_response', tool_count: toolsList.tools.length },
      'Returning tools list to client',
    );
    return toolsList;
  });

  // Register tools/call handler
  logger.debug(
    { event: 'tools.registering_call_handler' },
    'Setting up tools/call request handler',
  );
  server.setRequestHandler(
    CallToolRequestSchema,
    async (
      request,
    ): Promise<{
      content: Array<{ type: 'text'; text: string }>;
      isError?: boolean;
    }> => {
      const { name, arguments: args } = request.params;

      // Create correlation context for this request
      const serviceVersion = packageInfo.version ?? '1.0.0';
      const correlationContext = createCorrelationContext('bitbucket-dc-mcp', serviceVersion, name);
      const requestLogger = logger.child({
        correlation_id: correlationContext.correlationId,
        tool_name: name,
      });

      return runWithCorrelationContext(correlationContext, async () => {
        requestLogger.info(
          { event: 'tool.invocation', args_keys: args ? Object.keys(args) : [] },
          'Tool invoked',
        );

        if (name === 'search_ids') {
          if (!searchIdsTool) {
            requestLogger.warn({ event: 'tool.unavailable' }, 'Semantic search unavailable');
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      error:
                        'Semantic search unavailable. Embeddings database not initialized. Please use get_id with known operation IDs.',
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }

          try {
            const result = await searchIdsTool.execute(args);
            const latencyMs = getElapsedTime();
            requestLogger.info(
              {
                event: 'tool.success',
                results_count: result.operations?.length ?? 0,
                latency_ms: latencyMs,
              },
              'Tool executed successfully',
            );
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            const latencyMs = getElapsedTime();
            const errorMessage = error instanceof Error ? error.message : String(error);
            requestLogger.error(
              {
                event: 'tool.error',
                error_type: error instanceof Error ? error.name : 'Unknown',
                error_message: errorMessage,
                latency_ms: latencyMs,
              },
              'Tool execution failed',
            );
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
        }

        if (name === 'get_id') {
          const startTime = Date.now();
          try {
            const result = await getIdTool.execute(args);
            const latencyMs = Date.now() - startTime;
            const operationId =
              args && typeof args === 'object' && 'operation_id' in args
                ? String(args.operation_id)
                : 'unknown';
            requestLogger.info(
              { event: 'tool.success', operation_id: operationId, latency_ms: latencyMs },
              'Tool executed successfully',
            );
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            const latencyMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            requestLogger.error(
              {
                event: 'tool.error',
                error_type: error instanceof Error ? error.name : 'Unknown',
                error_message: errorMessage,
                latency_ms: latencyMs,
              },
              'Tool execution failed',
            );
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
        }

        if (name === 'call_id') {
          // call_id tool handles its own error handling and logging internally
          try {
            const result = await callIdTool.execute(args);
            const latencyMs = getElapsedTime();
            requestLogger.info(
              { event: 'tool.success', latency_ms: latencyMs },
              'Tool executed successfully',
            );
            return result;
          } catch (error) {
            const latencyMs = getElapsedTime();
            // Unexpected errors that weren't caught by the tool
            const errorMessage = error instanceof Error ? error.message : String(error);
            requestLogger.error(
              {
                event: 'tool.unexpected_error',
                error_type: error instanceof Error ? error.name : 'Unknown',
                error_message: errorMessage,
                latency_ms: latencyMs,
              },
              'Tool unexpected error',
            );
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      error: 'UnexpectedError',
                      message: `Unexpected error: ${errorMessage}`,
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }
        }

        throw new Error(`Unknown tool: ${name}`);
      });
    },
  );

  logger.info(
    { event: 'tools.registered', tools: ['search_ids', 'get_id', 'call_id'] },
    'MCP tools registered',
  );
}
