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

import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  VECTOR_DIMENSIONS,
  createDatabase,
  insertEmbeddings,
  insertOperations,
  optimizeDatabase,
  validateDatabase,
} from '../../../scripts/populate-db';

const createVector = (value: number): number[] => {
  return Array.from({ length: VECTOR_DIMENSIONS }, (_, index) => (index === 0 ? value : 0));
};

describe('populate-db script', () => {
  let db: Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  const closeDatabase = (): void => {
    if (db?.open) {
      db.close();
    }
  };

  afterEach(() => {
    closeDatabase();
  });

  it('creates the database schema with metadata', () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'virtual table') ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((row) => row.name);

    expect(tableNames).toContain('operations');
    expect(tableNames).toContain('embeddings');
    expect(tableNames).toContain('schema_metadata');

    const versionRow = db
      .prepare("SELECT value FROM schema_metadata WHERE key = 'version'")
      .get() as
      | {
        value: string;
      }
      | undefined;

    expect(versionRow?.value).toBe('1.0.0');
  });

  it('inserts operations with JSON fields serialised correctly', () => {
    const inserted = insertOperations(db, [
      {
        operation_id: 'op-1',
        path: '/rest/api/1',
        method: 'GET',
        summary: 'Fetch resource',
        description: 'Retrieves a resource',
        tags: ['read', 'resource'],
        parameters: [{ name: 'id', in: 'query' }],
        requestBody: null,
        responses: { '200': { description: 'OK' } },
        deprecated: false,
      },
      {
        operation_id: 'op-2',
        path: '/rest/api/2',
        method: 'POST',
        summary: 'Create resource',
        tags: ['write'],
        parameters: [],
        requestBody: { content: 'json' },
        responses: { '201': { description: 'Created' } },
        deprecated: true,
      },
    ]);

    expect(inserted).toBe(2);

    const rows = db
      .prepare(
        'SELECT operation_id, tags, parameters, request_body, responses, deprecated FROM operations ORDER BY operation_id',
      )
      .all() as Array<{
        operation_id: string;
        tags: string;
        parameters: string;
        request_body: string;
        responses: string;
        deprecated: number;
      }>;

    expect(JSON.parse(rows[0].tags)).toEqual(['read', 'resource']);
    expect(JSON.parse(rows[0].parameters)).toEqual([{ name: 'id', in: 'query' }]);
    expect(rows[0].deprecated).toBe(0);
    expect(rows[1].deprecated).toBe(1);
  });

  it('inserts embeddings as Float32 binary buffers', () => {
    insertOperations(db, [
      {
        operation_id: 'op-1',
        path: '/rest/api/1',
        method: 'GET',
        summary: 'Fetch resource',
      },
    ]);

    const inserted = insertEmbeddings(db, [
      {
        operation_id: 'op-1',
        vector: createVector(1),
      },
    ]);

    expect(inserted).toBe(1);

    const row = db
      .prepare('SELECT length(vector) AS size FROM embeddings WHERE operation_id = ?')
      .get('op-1') as
      | {
        size: number;
      }
      | undefined;

    expect(row?.size).toBe(VECTOR_DIMENSIONS * 4);
  });

  it('performs cosine similarity search with vec_distance_cosine', () => {
    insertOperations(db, [
      { operation_id: 'seed', path: '/rest/api/seed', method: 'GET', summary: 'Seed' },
      { operation_id: 'close', path: '/rest/api/close', method: 'GET', summary: 'Close' },
      { operation_id: 'far', path: '/rest/api/far', method: 'GET', summary: 'Far' },
    ]);

    const seedVector = Array.from({ length: VECTOR_DIMENSIONS }, (_, index) =>
      index === 0 ? 1 : 0,
    );
    const closeVector = Array.from({ length: VECTOR_DIMENSIONS }, (_, index) => {
      if (index === 0) return 0.8;
      if (index === 1) return 0.2;
      return 0;
    });
    const farVector = Array.from({ length: VECTOR_DIMENSIONS }, (_, index) =>
      index === 0 ? -0.5 : 0,
    );

    insertEmbeddings(db, [
      { operation_id: 'seed', vector: seedVector },
      { operation_id: 'close', vector: closeVector },
      { operation_id: 'far', vector: farVector },
    ]);

    const queryVector = Buffer.from(new Float32Array(seedVector).buffer);
    const results = db
      .prepare(
        `SELECT operation_id, vec_distance_cosine(vector, vec_f32(?)) AS distance
         FROM embeddings
         ORDER BY distance ASC
         LIMIT 3`,
      )
      .all(queryVector) as Array<{ operation_id: string; distance: number }>;

    expect(results[0].operation_id).toBe('seed');
    expect(results[1].operation_id).toBe('close');
  });

  it('validates database integrity and detects orphaned operations', () => {
    insertOperations(db, [
      { operation_id: 'seed', path: '/rest/api/seed', method: 'GET', summary: 'Seed' },
      { operation_id: 'orphan', path: '/rest/api/orphan', method: 'GET', summary: 'Orphan' },
    ]);

    insertEmbeddings(db, [{ operation_id: 'seed', vector: createVector(1) }]);

    expect(() => validateDatabase(db, { operations: 2, embeddings: 1 })).toThrow(
      '[populate-db] Orphaned operations detected (1).',
    );
  });

  it('returns optimisation metrics for in-memory database', () => {
    insertOperations(db, [
      { operation_id: 'seed', path: '/rest/api/seed', method: 'GET', summary: 'Seed' },
    ]);

    insertEmbeddings(db, [{ operation_id: 'seed', vector: createVector(1) }]);

    const result = optimizeDatabase(db, ':memory:');

    expect(result.beforeSize).toBeNull();
    expect(result.afterSize).toBeNull();
  });
});
