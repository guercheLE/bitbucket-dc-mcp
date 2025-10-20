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

import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseError } from '../../src/core/errors.js';
import {
  SemanticSearchService,
  type EmbeddingsRepository,
  type SearchResult,
} from '../../src/services/semantic-search.js';

class SqliteEmbeddingsRepository implements EmbeddingsRepository {
  constructor(
    private readonly db: Database.Database,
    private readonly useVecExtension: boolean,
  ) { }

  public async search(queryEmbedding: Float32Array, limit: number): Promise<SearchResult[]> {
    try {
      if (this.useVecExtension) {
        const rows = this.db
          .prepare(
            `
              SELECT
                e.operation_id AS operationId,
                o.summary,
                o.description,
                1 - vec_distance_cosine(e.vector, vec_f32(?)) AS similarityScore
              FROM embeddings e
              INNER JOIN operations o ON o.operation_id = e.operation_id
              ORDER BY similarityScore DESC
              LIMIT ?
            `,
          )
          .all(Buffer.from(queryEmbedding.buffer), limit) as Array<{
            operationId: string;
            summary: string;
            description: string;
            similarityScore: number;
          }>;

        return rows.map((row) => ({ ...row }));
      }

      const rows = this.db
        .prepare(
          `
            SELECT
              e.operation_id AS operationId,
              o.summary,
              o.description,
              e.vector AS vector
            FROM embeddings e
            INNER JOIN operations o ON o.operation_id = e.operation_id
          `,
        )
        .all() as Array<{
          operationId: string;
          summary: string;
          description: string;
          vector: string;
        }>;

      const results = rows.map((row) => {
        const storedVector = Float32Array.from(JSON.parse(row.vector) as number[]);
        const similarityScore = cosineSimilarity(queryEmbedding, storedVector);
        return {
          operationId: row.operationId,
          summary: row.summary,
          description: row.description,
          similarityScore,
        } satisfies SearchResult;
      });

      results.sort((a, b) => b.similarityScore - a.similarityScore);
      return results.slice(0, limit);
    } catch (error) {
      throw new DatabaseError('Failed to execute embedding search', { cause: error });
    }
  }
}

function cosineSimilarity(vectorA: Float32Array, vectorB: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    const a = vectorA[index];
    const b = vectorB[index] ?? 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / Math.sqrt(normA * normB);
}

function createVector(seed: number): Float32Array {
  const vector = new Float32Array(768);
  for (let index = 0; index < vector.length; index += 1) {
    vector[index] = Math.sin(seed + index / 10);
  }

  const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }

  for (let index = 0; index < vector.length; index += 1) {
    vector[index] /= magnitude;
  }

  return vector;
}

interface TestGenerator {
  generate(query: string): Promise<Float32Array>;
}

function createTestGenerator(vector: Float32Array): TestGenerator {
  return {
    async generate(): Promise<Float32Array> {
      return vector;
    },
  };
}

describe('SemanticSearchService (integration)', () => {
  let tmpDir: string;
  let db: Database.Database;
  let repository: EmbeddingsRepository;
  let vecExtensionAvailable = false;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-tests-'));
    const dbFile = path.join(tmpDir, 'embeddings.db');

    db = new Database(dbFile);

    try {
      db.loadExtension('vec0');
      vecExtensionAvailable = true;
    } catch {
      vecExtensionAvailable = false;
    }

    if (vecExtensionAvailable) {
      db.exec(`
        CREATE TABLE operations (
          operation_id TEXT PRIMARY KEY,
          summary TEXT NOT NULL,
          description TEXT NOT NULL
        );

        CREATE VIRTUAL TABLE embeddings USING vec0(
          operation_id TEXT PRIMARY KEY,
          vector FLOAT[768]
        );
      `);
    } else {
      db.exec(`
        CREATE TABLE operations (
          operation_id TEXT PRIMARY KEY,
          summary TEXT NOT NULL,
          description TEXT NOT NULL
        );

        CREATE TABLE embeddings (
          operation_id TEXT PRIMARY KEY,
          vector TEXT NOT NULL
        );
      `);
    }

    const insertOperation = db.prepare(
      'INSERT INTO operations (operation_id, summary, description) VALUES (?, ?, ?)',
    );

    const insertEmbedding = vecExtensionAvailable
      ? db.prepare('INSERT INTO embeddings (operation_id, vector) VALUES (?, vec_f32(?))')
      : db.prepare('INSERT INTO embeddings (operation_id, vector) VALUES (?, ?)');

    const operations: Array<{ id: string; summary: string; description: string; seed: number }> = [
      {
        id: 'update_issue_assignee',
        summary: 'Update the issue assignee',
        description: 'Updates the assignee for a Bitbucket issue using a user identifier.',
        seed: 42,
      },
      {
        id: 'create_issue',
        summary: 'Create a new issue',
        description: 'Creates a new issue with summary and description fields.',
        seed: 12,
      },
      {
        id: 'search_issues',
        summary: 'Search issues with JQL',
        description: 'Executes a JQL query to search for Bitbucket issues.',
        seed: 84,
      },
    ];

    for (const operation of operations) {
      insertOperation.run(operation.id, operation.summary, operation.description);
      const vector = createVector(operation.seed);

      if (vecExtensionAvailable) {
        insertEmbedding.run(operation.id, Buffer.from(vector.buffer));
      } else {
        insertEmbedding.run(operation.id, JSON.stringify(Array.from(vector)));
      }
    }

    repository = new SqliteEmbeddingsRepository(db, vecExtensionAvailable);
  });

  afterAll(() => {
    db?.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns the most relevant operation for a natural language query', async () => {
    const queryVector = createVector(42);
    const service = new SemanticSearchService(repository, {
      embeddingGeneratorFactory: async (): Promise<TestGenerator> =>
        createTestGenerator(queryVector),
    });

    const [firstResult] = await service.search('update issue assignee', 5);

    expect(firstResult.operationId).toBe('update_issue_assignee');
    expect(firstResult.similarityScore).toBeGreaterThan(0.75);
  });

  it('raises DatabaseError when the repository cannot execute a search', async () => {
    const failingRepository: EmbeddingsRepository = {
      search: async () => {
        throw new Error('database connection lost');
      },
    };

    const service = new SemanticSearchService(failingRepository, {
      embeddingGeneratorFactory: async (): Promise<TestGenerator> =>
        createTestGenerator(createVector(1)),
    });

    await expect(service.search('anything')).rejects.toThrow(DatabaseError);
  });

  const enableRealModel = process.env.ENABLE_TRANSFORMERS_E2E === 'true';

  it.skipIf(!enableRealModel)(
    'performs an end-to-end search using the Transformers.js pipeline',
    async () => {
      const service = new SemanticSearchService(repository);
      const [result] = await service.search('update issue assignee');

      expect(result.operationId).toBe('update_issue_assignee');
    },
  );
});
