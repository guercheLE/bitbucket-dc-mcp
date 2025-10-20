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

import crypto from 'node:crypto';

import { pipeline } from '@xenova/transformers';
import type { Logger as PinoLogger } from 'pino';

import { QueryCache } from '../core/cache-manager.js';
import { DatabaseError, ModelLoadError, ValidationError } from '../core/errors.js';
import { Logger } from '../core/logger.js';

const MODEL_NAME = 'Xenova/all-mpnet-base-v2';
const DEFAULT_LIMIT = 5;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 1_000;
const DEFAULT_CACHE_SIZE = 1_000;
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1_000; // 1 hour.
const DEFAULT_CACHE_BYPASS_PREFIX = '_';

export interface SearchOptions {
  readonly limit?: number;
}

export interface SearchResult {
  readonly operationId: string;
  readonly summary: string;
  readonly description: string;
  readonly similarityScore: number;
}

export interface EmbeddingsRepository {
  search(queryEmbedding: Float32Array, limit: number): Promise<SearchResult[]>;
}

interface EmbeddingGenerator {
  generate(query: string): Promise<Float32Array>;
  dispose?(): Promise<void> | void;
}

export interface SemanticSearchServiceOptions {
  readonly cache?: QueryCache<SearchResult[]>;
  readonly embeddingGeneratorFactory?: () => Promise<EmbeddingGenerator>;
  readonly cacheBypassPrefix?: string;
  readonly logger?: PinoLogger;
}

type FeatureExtractionPipeline = (
  inputs: string,
  options?: Record<string, unknown>,
) => Promise<{ data: Float32Array }>;

async function createTransformersEmbeddingGenerator(): Promise<EmbeddingGenerator> {
  try {
    const featureExtractor = (await pipeline(
      'feature-extraction',
      MODEL_NAME,
    )) as FeatureExtractionPipeline & { dispose?: () => Promise<void> };

    return {
      async generate(query: string): Promise<Float32Array> {
        const output = await featureExtractor(query, {
          pooling: 'mean',
          normalize: true,
        });

        if (!output?.data || !(output.data instanceof Float32Array)) {
          throw new Error('Unexpected embedding pipeline output');
        }

        return output.data;
      },
      dispose: featureExtractor.dispose,
    };
  } catch (error) {
    throw new ModelLoadError('Failed to initialise Transformers embedding pipeline', {
      cause: error,
    });
  }
}

export class SemanticSearchService {
  private readonly logger: PinoLogger;

  private readonly cache: QueryCache<SearchResult[]>;

  private readonly cacheBypassPrefix: string;

  private readonly embeddingGeneratorFactory: () => Promise<EmbeddingGenerator>;

  private embeddingGeneratorPromise?: Promise<EmbeddingGenerator>;

  constructor(
    private readonly embeddingsRepository: EmbeddingsRepository,
    options: SemanticSearchServiceOptions = {},
  ) {
    this.logger = options.logger ?? Logger.getInstance();
    this.cache =
      options.cache ?? new QueryCache<SearchResult[]>(DEFAULT_CACHE_SIZE, DEFAULT_CACHE_TTL_MS);
    this.cacheBypassPrefix = options.cacheBypassPrefix ?? DEFAULT_CACHE_BYPASS_PREFIX;
    this.embeddingGeneratorFactory =
      options.embeddingGeneratorFactory ?? createTransformersEmbeddingGenerator;
  }

  public async search(query: string, limit: number = DEFAULT_LIMIT): Promise<SearchResult[]> {
    const normalizedQuery = this.normalizeQuery(query);
    const effectiveLimit = this.normaliseLimit(limit);

    const shouldBypassCache = normalizedQuery.startsWith(this.cacheBypassPrefix);
    const cacheKey = shouldBypassCache ? undefined : this.hashQuery(normalizedQuery);

    if (cacheKey) {
      const cachedResults = this.cache.get(cacheKey);
      if (cachedResults) {
        this.logger.debug({ query: normalizedQuery }, 'cache hit for semantic search');
        return cachedResults.map((result) => ({ ...result }));
      }
    }

    let queryEmbedding: Float32Array;
    try {
      queryEmbedding = await this.generateQueryEmbedding(normalizedQuery);
    } catch (error) {
      if (error instanceof ModelLoadError || error instanceof ValidationError) {
        throw error;
      }

      this.logger.error(
        { err: error, query: normalizedQuery },
        'failed to generate query embedding',
      );
      throw new ModelLoadError('Unable to generate embedding for the provided query', {
        cause: error,
      });
    }

    try {
      const searchResults = await this.embeddingsRepository.search(queryEmbedding, effectiveLimit);

      if (cacheKey) {
        this.cache.set(cacheKey, searchResults);
      }

      return searchResults.map((result) => ({ ...result }));
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      this.logger.error({ err: error, query: normalizedQuery }, 'semantic search failed');
      throw new DatabaseError('Semantic search failed due to a database error', {
        cause: error,
      });
    }
  }

  private async generateQueryEmbedding(query: string): Promise<Float32Array> {
    if (!query) {
      throw new ValidationError('Query cannot be empty');
    }

    const embeddingGenerator = await this.getEmbeddingGenerator();
    return embeddingGenerator.generate(query);
  }

  private async getEmbeddingGenerator(): Promise<EmbeddingGenerator> {
    if (!this.embeddingGeneratorPromise) {
      this.embeddingGeneratorPromise = this.embeddingGeneratorFactory().catch((error) => {
        this.embeddingGeneratorPromise = undefined;
        throw error;
      });
    }

    return this.embeddingGeneratorPromise;
  }

  private normaliseLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      return DEFAULT_LIMIT;
    }

    const rounded = Math.trunc(limit);
    if (rounded < MIN_LIMIT) {
      return MIN_LIMIT;
    }

    if (rounded > MAX_LIMIT) {
      return MAX_LIMIT;
    }

    return rounded;
  }

  private normalizeQuery(query: string): string {
    if (typeof query !== 'string') {
      throw new ValidationError('Query must be a string');
    }

    const trimmed = query.trim();
    if (!trimmed) {
      throw new ValidationError('Query cannot be empty');
    }

    if (trimmed.length > MAX_QUERY_LENGTH) {
      throw new ValidationError(`Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`);
    }

    return trimmed;
  }

  private hashQuery(query: string): string {
    return crypto.createHash('sha256').update(query).digest('hex');
  }
}
