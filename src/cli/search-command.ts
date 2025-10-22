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
 * Search Command Handler
 * Executes standalone semantic search (not via MCP)
 */

/* eslint-disable no-console */

import DatabaseConstructor from 'better-sqlite3';
import chalk from 'chalk';
import Table from 'cli-table3';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { load as loadVecExtension } from 'sqlite-vec';
import { fileURLToPath } from 'url';
import { Logger } from '../core/logger.js';
import { sanitizeParams } from '../core/sanitizer.js';

interface SearchOptions {
  limit?: string;
  json?: boolean;
  verbose?: boolean;
  config?: string;
}

interface SearchResult {
  operationId: string;
  summary: string;
  description: string;
  similarityScore: number;
}

/**
 * Get the package root directory
 */
function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // From dist/cli/ go up to package root
  return join(__dirname, '..', '..');
}

/**
 * Execute search command
 */
export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  const logger = Logger.getInstance();
  const startTime = Date.now();
  const limit = parseInt(options.limit || '5', 10);

  // Log command start
  logger.info(
    {
      event: 'cli.search.start',
      query: sanitizeParams(query),
      limit,
      verbose: options.verbose,
      json: options.json,
    },
    'Starting CLI search command',
  );

  // Check if embeddings database exists - use package root, not cwd
  const packageRoot = getPackageRoot();
  const embeddingsPath = join(packageRoot, 'data', 'embeddings.db');
  if (!existsSync(embeddingsPath)) {
    throw new Error(
      `Embeddings database not found at ${embeddingsPath}\n` +
        'Please ensure the package is properly installed with embeddings.db included.',
    );
  }

  let db: DatabaseConstructor.Database | undefined;

  try {
    // Initialize database with sqlite-vec
    db = new DatabaseConstructor(embeddingsPath, { readonly: true });
    await loadVecExtension(db);

    // Create embeddings repository
    const embeddingsRepository = {
      async search(queryEmbedding: Float32Array, searchLimit: number): Promise<SearchResult[]> {
        if (!db) throw new Error('Database not initialized');

        const stmt = db.prepare(`
          SELECT
            e.operation_id AS operationId,
            o.summary,
            o.description,
            1 - vec_distance_cosine(e.vector, vec_f32(?)) AS similarityScore
          FROM embeddings e
          INNER JOIN operations o ON o.operation_id = e.operation_id
          ORDER BY similarityScore DESC
          LIMIT ?
        `);

        return stmt.all(Buffer.from(queryEmbedding.buffer), searchLimit) as SearchResult[];
      },
    };

    // Initialize semantic search service
    const { SemanticSearchService } = await import('../services/semantic-search.js');
    const searchService = new SemanticSearchService(embeddingsRepository);

    // Execute search
    const results = await searchService.search(query, limit);

    // Log successful completion
    const latency = Date.now() - startTime;
    logger.info(
      {
        event: 'cli.search.success',
        query: sanitizeParams(query),
        results_count: results.length,
        latency_ms: latency,
      },
      'CLI search completed successfully',
    );

    // Output results
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      displayResults(results, query, options.verbose || false);
    }
  } catch (error) {
    // Log error
    const latency = Date.now() - startTime;
    logger.error(
      {
        event: 'cli.search.error',
        query: sanitizeParams(query),
        error: error instanceof Error ? error.message : String(error),
        latency_ms: latency,
      },
      'CLI search failed',
    );

    throw new Error(
      `Search execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  } finally {
    // Close database connection
    if (db) {
      db.close();
    }
  }
}

/**
 * Display search results in formatted table
 */
function displayResults(results: SearchResult[], query: string, verbose: boolean): void {
  if (results.length === 0) {
    console.log(chalk.yellow(`\n⚠️  No results found for "${query}"\n`));
    return;
  }

  console.log(chalk.green(`\n✅ Found ${results.length} results for "${query}":\n`));

  const table = new Table({
    head: verbose ? ['#', 'Operation ID', 'Summary', 'Score'] : ['#', 'Operation ID', 'Summary'],
    colWidths: verbose ? [5, 30, 60, 10] : [5, 30, 70],
    wordWrap: true,
  });

  results.forEach((result, index) => {
    const row = [(index + 1).toString(), chalk.cyan(result.operationId), result.summary];

    if (verbose) {
      row.push(result.similarityScore.toFixed(3));
    }

    table.push(row);
  });

  console.log(table.toString());
  console.log('');
}
