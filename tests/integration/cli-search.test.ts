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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CliRuntimeConfig } from '../../src/cli/search-test.js';
import { runCli } from '../../src/cli/search-test.js';
import type { SearchResult } from '../../src/services/semantic-search.js';

type DatasetOverrides = Record<string, readonly SearchResult[]>;

type CreateService = NonNullable<CliRuntimeConfig['createService']>;

type IoCapture = {
  stdout: PassThrough;
  stderr: PassThrough;
  readStdout: () => string;
  readStderr: () => string;
  close: () => void;
};

describe('search-test CLI (integration)', () => {
  const logger = pino({ level: 'silent' });
  const tempDirectories: string[] = [];

  afterEach(() => {
    while (tempDirectories.length > 0) {
      const dir = tempDirectories.pop();
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('executes a query with default parameters and renders results', async () => {
    const io = createIoCapture();
    const { createService, isDisposed } = createMockService();

    const exitCode = await runCli(['node', 'search-test.ts', 'create issue'], {
      stdout: io.stdout,
      stderr: io.stderr,
      logger,
      createService,
    });

    io.close();

    expect(exitCode).toBe(0);
    expect(io.readStderr()).toBe('');
    expect(io.readStdout()).toContain('Query: create issue');
    expect(io.readStdout()).toContain(
      'Found 5 result(s) matching "create issue" (limit 5, threshold 0.00)',
    );
    expect(isDisposed()).toBe(true);
  });

  it('respects the --limit flag when rendering results', async () => {
    const io = createIoCapture();
    const { createService } = createMockService();

    const exitCode = await runCli(['node', 'search-test.ts', 'create issue', '--limit', '3'], {
      stdout: io.stdout,
      stderr: io.stderr,
      logger,
      createService,
    });

    io.close();

    expect(exitCode).toBe(0);
    expect(io.readStdout()).toContain(
      'Found 3 result(s) matching "create issue" (limit 3, threshold 0.00)',
    );
    expect(io.readStdout()).not.toContain('limit 5');
  });

  it('filters out results below the similarity threshold', async () => {
    const io = createIoCapture();
    const { createService } = createMockService();

    const exitCode = await runCli(
      ['node', 'search-test.ts', 'create issue', '--threshold', '0.93'],
      {
        stdout: io.stdout,
        stderr: io.stderr,
        logger,
        createService,
      },
    );

    io.close();

    expect(exitCode).toBe(0);
    expect(io.readStdout()).toContain(
      'Found 1 result(s) matching "create issue" (limit 5, threshold 0.93)',
    );
  });

  it('prints benchmark summary when --benchmark flag is supplied', async () => {
    const io = createIoCapture();
    const { createService } = createMockService();

    const exitCode = await runCli(['node', 'search-test.ts', 'create issue', '--benchmark'], {
      stdout: io.stdout,
      stderr: io.stderr,
      logger,
      createService,
    });

    io.close();

    expect(exitCode).toBe(0);
    expect(io.readStdout()).toContain('Precision@5: 100.0% (required 85.0%)');
  });

  it('processes batch queries from a file without crashing', async () => {
    const batchQueries = [
      'create issue',
      'update assignee',
      'delete project',
      'add user to group',
      'start sprint',
      'create custom field',
      'transition workflow',
      'get board',
      'archive project',
      'invalid query with special chars',
      '',
    ];

    const { filePath, dir } = createBatchFile(batchQueries);
    tempDirectories.push(dir);

    const io = createIoCapture();
    const { createService } = createMockService();

    const exitCode = await runCli(['node', 'search-test.ts', '--batch', filePath, '--limit', '4'], {
      stdout: io.stdout,
      stderr: io.stderr,
      logger,
      createService,
    });

    io.close();

    expect(exitCode).toBe(0);

    const printedQueries = (io.readStdout().match(/Query:/g) ?? []).length;
    // Blank lines in batch files are ignored, so only non-empty queries are counted.
    expect(printedQueries).toBe(batchQueries.filter((item) => item.trim().length > 0).length);
  });

  it('returns an error when no query is provided', async () => {
    const io = createIoCapture();
    const createService = vi.fn<CreateService>();

    const exitCode = await runCli(['node', 'search-test.ts'], {
      stdout: io.stdout,
      stderr: io.stderr,
      logger,
      createService,
    });

    io.close();

    expect(exitCode).toBe(1);
    expect(createService).not.toHaveBeenCalled();
    expect(io.readStderr()).toContain(
      'Invalid argument: no query provided. Provide a query or use --batch.',
    );
  });

  it('emits a database error when the embeddings database is missing', async () => {
    const io = createIoCapture();
    const missingDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-search-missing-db-'));
    tempDirectories.push(missingDbDir);
    const missingDbPath = path.join(missingDbDir, 'embeddings.db');

    const exitCode = await runCli(
      ['node', 'search-test.ts', 'create issue', '--database', missingDbPath],
      {
        stdout: io.stdout,
        stderr: io.stderr,
        logger,
      },
    );

    io.close();

    expect(exitCode).toBe(2);
    expect(io.readStderr()).toContain('Database not found. Run "npm run populate-db" first.');
  });
});

function createIoCapture(): IoCapture {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  stdout.setEncoding('utf8');
  stderr.setEncoding('utf8');

  let stdoutBuffer = '';
  let stderrBuffer = '';

  stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
  });

  stderr.on('data', (chunk) => {
    stderrBuffer += chunk;
  });

  return {
    stdout,
    stderr,
    readStdout: () => stdoutBuffer,
    readStderr: () => stderrBuffer,
    close: () => {
      stdout.end();
      stderr.end();
    },
  } satisfies IoCapture;
}

function createBatchFile(queries: readonly string[]): { filePath: string; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-search-batch-'));
  const filePath = path.join(dir, 'queries.txt');
  fs.writeFileSync(filePath, queries.join('\n'), 'utf8');
  return { filePath, dir };
}

function createMockService(overrides?: DatasetOverrides): {
  createService: CreateService;
  queries: string[];
  isDisposed: () => boolean;
} {
  const dataset = new Map(BASE_DATASET);

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      dataset.set(key.trim().toLowerCase(), value);
    }
  }

  const queries: string[] = [];
  let disposed = false;

  const createService: CreateService = async () =>
    ({
      service: {
        async search(query: string, limit: number): Promise<SearchResult[]> {
          queries.push(query);
          const key = query.trim().toLowerCase();
          const results = dataset.get(key) ?? createFallbackResults(query);
          return results.slice(0, limit).map(cloneResult);
        },
      },
      dispose(): void {
        disposed = true;
      },
    }) satisfies Awaited<ReturnType<CreateService>>;

  return {
    createService,
    queries,
    isDisposed: (): boolean => disposed,
  };
}

function createFallbackResults(query: string): readonly SearchResult[] {
  const baseId = query.trim().length > 0 ? query.trim().replace(/\s+/g, '_') : 'default';
  const scores = [0.82, 0.78, 0.73, 0.69, 0.64];
  return scores.map((score, index) =>
    createSearchResult(`${baseId}_fallback_${index + 1}`, `Fallback summary ${index + 1}`, score),
  );
}

function createSearchResult(
  operationId: string,
  summary: string,
  similarityScore: number,
): SearchResult {
  return {
    operationId,
    summary,
    description: `${summary} description`,
    similarityScore,
  } satisfies SearchResult;
}

function cloneResult(result: SearchResult): SearchResult {
  return {
    operationId: result.operationId,
    summary: result.summary,
    description: result.description,
    similarityScore: result.similarityScore,
  } satisfies SearchResult;
}

const BASE_DATASET = createBaseDataset();

function createBaseDataset(): Map<string, readonly SearchResult[]> {
  return new Map<string, readonly SearchResult[]>([
    [
      'create issue',
      [
        createSearchResult(
          'create_reciprocal_remote_issue_link',
          'Summary for create issue 1',
          0.95,
        ),
        createSearchResult('create_issue_link_type', 'Summary for create issue 2', 0.9),
        createSearchResult('create_issue_type', 'Summary for create issue 3', 0.85),
        createSearchResult('create_issue_type_scheme', 'Summary for create issue 4', 0.8),
        createSearchResult('archive_issue', 'Summary for create issue 5', 0.75),
      ],
    ],
    [
      'update assignee',
      [
        createSearchResult('update_issue_assignee', 'Summary for update assignee 1', 0.91),
        createSearchResult('assign_issue', 'Summary for update assignee 2', 0.84),
        createSearchResult('get_issue', 'Summary for update assignee 3', 0.79),
        createSearchResult('list_assignees', 'Summary for update assignee 4', 0.74),
      ],
    ],
    [
      'delete project',
      [
        createSearchResult('delete_project', 'Summary for delete project 1', 0.9),
        createSearchResult('archive_project', 'Summary for delete project 2', 0.82),
        createSearchResult('remove_project_category', 'Summary for delete project 3', 0.76),
      ],
    ],
    [
      'add user to group',
      [
        createSearchResult('add_user_to_group', 'Summary for add user to group 1', 0.92),
        createSearchResult('add_actor_users', 'Summary for add user to group 2', 0.86),
        createSearchResult('add_vote', 'Summary for add user to group 3', 0.71),
      ],
    ],
    [
      'start sprint',
      [
        createSearchResult('start_sprint', 'Summary for start sprint 1', 0.9),
        createSearchResult('get_sprints', 'Summary for start sprint 2', 0.83),
        createSearchResult('update_sprint', 'Summary for start sprint 3', 0.77),
      ],
    ],
    [
      'create custom field',
      [
        createSearchResult('create_custom_field', 'Summary for create custom field 1', 0.9),
        createSearchResult('update_custom_field', 'Summary for create custom field 2', 0.85),
        createSearchResult('get_custom_fields', 'Summary for create custom field 3', 0.78),
      ],
    ],
    [
      'transition workflow',
      [
        createSearchResult('transition_issue', 'Summary for transition workflow 1', 0.88),
        createSearchResult('get_workflow', 'Summary for transition workflow 2', 0.8),
        createSearchResult('update_workflow', 'Summary for transition workflow 3', 0.74),
      ],
    ],
    [
      'get board',
      [
        createSearchResult('get_board', 'Summary for get board 1', 0.87),
        createSearchResult('get_boards', 'Summary for get board 2', 0.81),
        createSearchResult('create_board', 'Summary for get board 3', 0.73),
      ],
    ],
    [
      'archive project',
      [
        createSearchResult('archive_project', 'Summary for archive project 1', 0.9),
        createSearchResult('archive_project_details', 'Summary for archive project 2', 0.82),
        createSearchResult('unarchive_project', 'Summary for archive project 3', 0.76),
      ],
    ],
    [
      'invalid query with special chars',
      [
        createSearchResult('handle_special_chars', 'Summary for special chars 1', 0.83),
        createSearchResult('sanitize_input', 'Summary for special chars 2', 0.78),
        createSearchResult('log_suspicious_input', 'Summary for special chars 3', 0.7),
      ],
    ],
  ]);
}
