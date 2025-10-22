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
import type { ComponentRegistry } from '../core/component-registry.js';
import { getTraceId } from '../core/correlation-context.js';
import { DegradedModeError } from '../core/errors.js';
import { Logger } from '../core/logger.js';
import type { SemanticSearchService } from '../services/semantic-search.js';

const SEARCH_TIMEOUT_MS = 5000;
const DEFAULT_LIMIT = 5;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;

/**
 * Input schema for the search_ids MCP tool.
 */
export const SearchIdsInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z.number().int().min(MIN_LIMIT).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
});

export type SearchIdsInput = z.infer<typeof SearchIdsInputSchema>;

/**
 * Single operation result returned by search_ids tool.
 */
export interface SearchIdsOperationResult {
  readonly operation_id: string;
  readonly summary: string;
  readonly similarity_score: number;
}

/**
 * Output schema for the search_ids MCP tool.
 */
export interface SearchIdsOutput {
  readonly operations: SearchIdsOperationResult[];
}

/**
 * Custom error class for tool execution failures.
 */
export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ToolExecutionError';
    Error.captureStackTrace?.(this, ToolExecutionError);
  }
}

/**
 * MCP tool implementation for searching Bitbucket operations using natural language queries.
 *
 * This tool enables LLMs to discover relevant Bitbucket API operations by providing a semantic
 * search interface over the operation embeddings database.
 *
 * @example
 * ```typescript
 * const tool = new SearchIdsTool(semanticSearchService, logger);
 * const result = await tool.execute({ query: "create issue", limit: 5 });
 * // Returns top 5 operations matching "create issue"
 * ```
 */
export class SearchIdsTool {
  private readonly logger: PinoLogger;
  private readonly registry?: ComponentRegistry;

  /**
   * Creates a new SearchIdsTool instance.
   *
   * @param searchService - Semantic search service for querying operation embeddings
   * @param logger - Optional logger instance (defaults to singleton Logger)
   * @param registry - Optional component registry for health checks
   */
  constructor(
    private readonly searchService: SemanticSearchService,
    logger?: PinoLogger,
    registry?: ComponentRegistry,
  ) {
    this.logger = logger ?? Logger.getInstance();
    this.registry = registry;
  }

  /**
   * Returns the Zod input schema for MCP tool registration.
   *
   * @returns Zod schema object defining query (string, required) and limit (number 1-20, optional)
   */
  public getInputSchema(): typeof SearchIdsInputSchema {
    return SearchIdsInputSchema;
  }

  /**
   * Executes a semantic search for Bitbucket operations matching the natural language query.
   *
   * @param input - Search parameters containing query string and optional limit
   * @returns Promise resolving to array of matching operations with similarity scores
   * @throws {ToolExecutionError} When validation fails, search times out, or service errors occur
   *
   * @example
   * ```typescript
   * const result = await tool.execute({
   *   query: "how to update issue assignee",
   *   limit: 3
   * });
   * console.log(result.operations[0].operation_id); // e.g., "update_issue"
   * ```
   */
  public async execute(input: unknown): Promise<SearchIdsOutput> {
    const startTime = Date.now();
    const traceId = getTraceId();

    // Check component health before proceeding
    if (this.registry) {
      if (!this.registry.isComponentHealthy('EmbeddingsRepository')) {
        this.logger.warn(
          {
            event: 'search_ids.degraded_mode',
            component: 'EmbeddingsRepository',
            traceId: traceId,
          },
          'search_ids called in degraded mode',
        );
        throw new DegradedModeError(
          'EmbeddingsRepository',
          'Semantic search unavailable, please use operation ID directly with get_id',
          ['get_id', 'call_id'],
        );
      }

      // Note: We use @xenova/transformers for local embeddings, no external API needed
    }

    // Task 3: Input validation
    let validatedInput: SearchIdsInput;
    try {
      validatedInput = SearchIdsInputSchema.parse(input);
    } catch (error) {
      this.logger.error(
        {
          event: 'search_ids.validation_error',
          traceId: traceId,
          input,
          error: String(error),
        },
        'Input validation failed',
      );
      throw new ToolExecutionError(
        `Invalid input: ${error instanceof Error ? error.message : String(error)}`,
        { input },
      );
    }

    const { query, limit } = validatedInput;

    // Task 9: Log tool invocation with correlation context
    this.logger.info(
      {
        event: 'search_ids.start',
        traceId: traceId,
        tool_name: 'search_ids',
        query,
        limit,
      },
      'Starting semantic search for operations',
    );

    try {
      // Task 4: Implement timeout and error handling
      const searchPromise = this.searchService.search(query, limit);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Search timed out after ${SEARCH_TIMEOUT_MS}ms`)),
          SEARCH_TIMEOUT_MS,
        ),
      );

      const searchResults = await Promise.race([searchPromise, timeoutPromise]);

      // Task 2: Map results to MCP tool output format
      const operations: SearchIdsOperationResult[] = searchResults.map((result) => ({
        operation_id: result.operationId,
        summary: result.summary,
        similarity_score: this.normalizeSimilarityScore(result.similarityScore),
      }));

      const latencyMs = Date.now() - startTime;

      // Task 9: Log tool result with metrics
      this.logger.info(
        {
          event: 'search_ids.success',
          traceId: traceId,
          tool_name: 'search_ids',
          query,
          results_count: operations.length,
          latency_ms: latencyMs,
          cache_hit: false, // Semantic search doesn't use cache
        },
        'Semantic search completed successfully',
      );

      return { operations };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Task 9: Log error with full context
      this.logger.error(
        {
          event: 'search_ids.error',
          traceId: traceId,
          tool_name: 'search_ids',
          query,
          limit,
          error_message: errorMessage,
          stack: errorStack,
          latency_ms: latencyMs,
        },
        'Semantic search failed',
      );

      // Task 4: Return MCP error response
      throw new ToolExecutionError(`Failed to search operations: ${errorMessage}`, {
        query,
        limit,
      });
    }
  }

  /**
   * Ensures similarity scores are normalized to 0-1 range.
   *
   * @param score - Raw similarity score from search service
   * @returns Normalized score clamped between 0 and 1
   */
  private normalizeSimilarityScore(score: number): number {
    if (!Number.isFinite(score)) {
      return 0;
    }
    return Math.max(0, Math.min(1, score));
  }
}
