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

import { pipeline } from '@xenova/transformers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ProgressTracker,
  generateDescriptionText,
  generateEmbeddings,
  getUseCaseHint,
  loadEnvConfig,
} from '../../../scripts/generate-embeddings';

/* eslint-disable no-console */
vi.mock('@xenova/transformers', () => {
  return {
    pipeline: vi.fn(),
  };
});

const makeTensor = (
  rows: number,
  columns: number,
  fillValue: number,
): { data: Float32Array; dims: number[] } => {
  const data = new Float32Array(rows * columns).fill(fillValue);
  const dims = rows === 1 ? [columns] : [rows, columns];

  return { data, dims };
};

describe('generateDescriptionText', () => {
  it('concatenates core fields and includes use case hints', () => {
    const description = generateDescriptionText({
      operationId: 'create_issue',
      path: '/rest/api/3/issue',
      method: 'post',
      summary: 'Create issue',
      description: 'Creates a new issue in Bitbucket projects',
      tags: ['Issues'],
    });

    expect(description).toContain('Create issue');
    expect(description).toContain('Creates a new issue in Bitbucket projects');
    expect(description).toContain('creates/adds a new resource');
    expect(description).not.toContain('\n');
    // operationId is intentionally excluded from embeddings to focus on semantic meaning
    expect(description).not.toContain('[create_issue]');
  });

  it('trims and bounds description length', () => {
    const result = generateDescriptionText({
      operationId: 'fetch_project',
      path: '/rest/api/3/project',
      method: 'get',
      summary: 'Get project',
      description: 'x'.repeat(9000),
      tags: [],
    });

    expect(result.length).toBeLessThanOrEqual(8000);
  });
});

describe('getUseCaseHint', () => {
  it('returns retrieval hint for GET operations', () => {
    expect(getUseCaseHint('get', [])).toContain('retrieves/fetches data');
  });

  it('returns creation hint for POST operations', () => {
    expect(getUseCaseHint('POST', [])).toContain('creates/adds a new resource');
  });
});

describe('loadEnvConfig', () => {
  it('provides defaults when env vars are absent', () => {
    const config = loadEnvConfig({});
    expect(config.model).toBe('Xenova/all-mpnet-base-v2');
    expect(config.batchSize).toBe(32);
  });

  it('uses provided env vars when valid', () => {
    const config = loadEnvConfig({ EMBEDDING_MODEL: 'custom/model', BATCH_SIZE: '16' });
    expect(config.model).toBe('custom/model');
    expect(config.batchSize).toBe(16);
  });
});

describe('ProgressTracker', () => {
  const originalLog = console.log;

  beforeEach(() => {
    console.log = vi.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    vi.restoreAllMocks();
  });

  it('logs progress updates with percentages and ETA', () => {
    const tracker = new ProgressTracker();
    tracker.start(4);
    tracker.update(2);
    tracker.finish();

    expect(vi.mocked(console.log)).toHaveBeenCalled();
    const messages = vi.mocked(console.log).mock.calls.map(([message]) => message as string);
    expect(messages.some((message) => message.includes('50%'))).toBe(true);
    expect(messages.at(-1)).toContain('100%');
  });
});

describe('generateEmbeddings', () => {
  const BATCH_SIZE = 2;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates embeddings for batches successfully', async () => {
    const extractor = vi.fn().mockResolvedValue(makeTensor(BATCH_SIZE, 768, 0.5));
    vi.mocked(pipeline).mockResolvedValue(extractor);

    const tracker = new ProgressTracker();
    tracker.start(BATCH_SIZE);

    const successes = await generateEmbeddings(
      ['first text', 'second text'],
      'Xenova/all-mpnet-base-v2',
      BATCH_SIZE,
      tracker,
      vi.fn(),
      vi.fn(),
    );

    expect(successes).toHaveLength(2);
    expect(successes[0].vector).toBeInstanceOf(Float32Array);
    expect(extractor).toHaveBeenCalledTimes(1);
  });

  it('falls back to per-item processing when a batch fails', async () => {
    const extractor = vi
      .fn()
      .mockRejectedValueOnce(new Error('batch failure'))
      .mockResolvedValue(makeTensor(1, 768, 0.7));
    vi.mocked(pipeline).mockResolvedValue(extractor);

    const tracker = new ProgressTracker();
    tracker.start(2);

    const onBatchFailure = vi.fn();
    const onItemFailure = vi.fn();

    const successes = await generateEmbeddings(
      ['alpha', 'beta'],
      'Xenova/all-mpnet-base-v2',
      BATCH_SIZE,
      tracker,
      onBatchFailure,
      onItemFailure,
    );

    expect(onBatchFailure).toHaveBeenCalled();
    expect(onItemFailure).not.toHaveBeenCalled();
    expect(successes).toHaveLength(2);
    // First call rejected, second call executed twice for individual items
    expect(extractor).toHaveBeenCalledTimes(3);
  });
});
