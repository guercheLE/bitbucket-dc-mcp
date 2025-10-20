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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryCache } from '../../../src/core/cache-manager.js';
import { DatabaseError, ModelLoadError, ValidationError } from '../../../src/core/errors.js';
import {
  SemanticSearchService,
  type EmbeddingsRepository,
  type SearchResult,
} from '../../../src/services/semantic-search.js';

describe('SemanticSearchService', () => {
  const vector = new Float32Array([1, 0, 0]);

  let repository: EmbeddingsRepository;
  let searchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    searchSpy = vi.fn();
    repository = {
      search: searchSpy,
    };
  });

  type TestContext = {
    service: SemanticSearchService;
    generator: { generate: ReturnType<typeof vi.fn> };
    results: SearchResult[];
  };

  function createService(options: {
    results?: SearchResult[];
    cache?: QueryCache<SearchResult[]>;
  }): TestContext {
    const results = options.results ?? [
      {
        operationId: 'update_issue_assignee',
        summary: 'Update issue assignee',
        description: 'Updates the assignee for a given issue.',
        similarityScore: 0.92,
      },
      {
        operationId: 'create_issue',
        summary: 'Create issue',
        description: 'Creates a new issue in the project.',
        similarityScore: 0.83,
      },
    ];

    searchSpy.mockResolvedValue(results);

    const generator = {
      generate: vi.fn().mockResolvedValue(vector),
    };

    const service = new SemanticSearchService(repository, {
      cache: options.cache,
      embeddingGeneratorFactory: async (): Promise<typeof generator> => generator,
    });

    return { service, generator, results };
  }

  it('returns semantic search results ordered by similarity', async () => {
    const { service, generator, results } = createService({});

    const output = await service.search('Update issue assignee');

    expect(output).toEqual(results);
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(generator.generate).toHaveBeenCalledWith('Update issue assignee');
    expect(searchSpy).toHaveBeenCalledWith(expect.any(Float32Array), 5);
  });

  it('caches results for repeated queries', async () => {
    const cache = new QueryCache<SearchResult[]>(10, 60_000);
    const { service, generator } = createService({ cache });

    await service.search('Update issue assignee');
    await service.search('Update issue assignee');

    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when query is prefixed with underscore', async () => {
    const cache = new QueryCache<SearchResult[]>(10, 60_000);
    const { service, generator } = createService({ cache });

    await service.search('_debug query');
    await service.search('_debug query');

    expect(generator.generate).toHaveBeenCalledTimes(2);
  });

  it('throws ValidationError for empty query', async () => {
    const { service } = createService({});

    await expect(service.search('')).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when query exceeds maximum length', async () => {
    const { service } = createService({});
    const longQuery = 'a'.repeat(1_001);

    await expect(service.search(longQuery)).rejects.toThrow(ValidationError);
  });

  it('caps limit within the allowed range', async () => {
    const { service } = createService({});

    await service.search('limit-high', 150);
    expect(searchSpy.mock.calls.at(-1)?.[1]).toBe(100);

    searchSpy.mockClear();

    await service.search('limit-low', 0);
    expect(searchSpy.mock.calls.at(-1)?.[1]).toBe(1);
  });

  it('respects custom limit parameter', async () => {
    const { service } = createService({});

    await service.search('test', 10);
    expect(searchSpy).toHaveBeenCalledWith(expect.any(Float32Array), 10);
  });

  it('wraps embedding generator initialisation failures in ModelLoadError', async () => {
    const service = new SemanticSearchService(repository, {
      embeddingGeneratorFactory: async (): Promise<never> => {
        throw new Error('model download failed');
      },
    });

    await expect(service.search('hello world')).rejects.toThrow(ModelLoadError);
  });

  it('wraps repository failures in DatabaseError', async () => {
    const { service } = createService({});
    searchSpy.mockRejectedValue(new Error('db offline'));

    await expect(service.search('hello world')).rejects.toThrow(DatabaseError);
  });
});
