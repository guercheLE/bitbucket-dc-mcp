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

/**
 * Unit tests for search command
 *
 * These tests require embeddings.db to be generated.
 * Run `npm run populate-db` to generate the database.
 */

import { exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { beforeAll, describe, expect, it } from 'vitest';

const execAsync = promisify(exec);
const EMBEDDINGS_DB_PATH = join(process.cwd(), 'data', 'embeddings.db');

describe('Search Command', () => {
  beforeAll(() => {
    // Skip all tests if embeddings.db doesn't exist
    if (!existsSync(EMBEDDINGS_DB_PATH)) {
      console.warn(
        '\n⚠️  Skipping search command tests: embeddings.db not found.\n' +
          '   Run `npm run populate-db` to generate the embeddings database.\n',
      );
    }
  });

  it.skipIf(!existsSync(EMBEDDINGS_DB_PATH))(
    'should search for operations',
    async () => {
      const { stdout } = await execAsync('node dist/cli.js search "create issue"', {
        timeout: 30000, // 30 second timeout for CLI execution (model loading can be slow in CI)
      });

      expect(stdout).toContain('Found');
      expect(stdout).toContain('results for');
      expect(stdout).toContain('create issue');
    },
    35000,
  ); // 35 second test timeout to account for model loading

  it.skipIf(!existsSync(EMBEDDINGS_DB_PATH))(
    'should handle --limit option',
    async () => {
      const { stdout } = await execAsync('node dist/cli.js search "update" --limit 3', {
        timeout: 30000, // Model loading can be slow in CI
      });

      // Should show table with results
      expect(stdout).toMatch(/Found \d+ results/);
    },
    35000,
  );

  it.skipIf(!existsSync(EMBEDDINGS_DB_PATH))(
    'should handle --json option',
    async () => {
      const { stdout } = await execAsync('node dist/cli.js search "get issue" --json', {
        timeout: 30000,
      });

      // Should output valid JSON
      const results = JSON.parse(stdout);
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('operationId');
        expect(results[0]).toHaveProperty('summary');
        expect(results[0]).toHaveProperty('similarityScore');
      }
    },
    35000,
  );

  it.skipIf(!existsSync(EMBEDDINGS_DB_PATH))(
    'should handle --verbose option',
    async () => {
      const { stdout } = await execAsync('node dist/cli.js search "delete" --verbose', {
        timeout: 30000,
      });

      // Verbose mode should show similarity scores
      expect(stdout).toContain('Score');
    },
    35000,
  );

  it.skipIf(!existsSync(EMBEDDINGS_DB_PATH))(
    'should return results even for uncommon queries',
    async () => {
      const { stdout } = await execAsync('node dist/cli.js search "xyzabc123nonexistent"', {
        timeout: 30000,
      });

      // Semantic search returns best matches even for nonsense queries
      expect(stdout).toMatch(/Found \d+ results/i);
    },
    35000,
  );
});
