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

import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import type { Database } from 'better-sqlite3';
import DatabaseConstructor from 'better-sqlite3';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command, InvalidOptionArgumentError, Option } from 'commander';
import type { Logger as PinoLogger } from 'pino';
import { load as loadVecExtension } from 'sqlite-vec';

import { DatabaseError, ModelLoadError, ValidationError } from '../core/errors.js';
import { Logger } from '../core/logger.js';
import {
  BENCHMARK_CASES,
  BENCHMARK_THRESHOLDS,
  type BenchmarkCase,
} from '../data/benchmark-cases.js';
import {
  SemanticSearchService,
  type EmbeddingsRepository,
  type SearchResult,
} from '../services/semantic-search.js';

type SearchService = Pick<SemanticSearchService, 'search'>;

interface ServiceHandle {
  readonly service: SearchService;
  dispose(): Promise<void> | void;
}

export interface CliRuntimeConfig {
  readonly stdout?: NodeJS.WritableStream;
  readonly stderr?: NodeJS.WritableStream;
  readonly logger?: PinoLogger;
  readonly createService?: (input: {
    databasePath: string;
    logger: PinoLogger;
  }) => Promise<ServiceHandle>;
}

interface CliOptions {
  readonly limit: number;
  readonly verbose: boolean;
  readonly threshold: number;
  readonly benchmark: boolean;
  readonly batchPath?: string;
  readonly databasePath: string;
}

interface QueryResult {
  readonly query: string;
  readonly results: readonly SearchResult[];
  readonly filteredResults: readonly SearchResult[];
}

const DEFAULT_LIMIT = 5;
const DEFAULT_THRESHOLD = 0;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MIN_THRESHOLD = 0;
const MAX_THRESHOLD = 1;
const DEFAULT_DATABASE_PATH = path.resolve('data', 'embeddings.db');

const SCORE_HIGH = 0.85;
const SCORE_MEDIUM = 0.7;

const BENCHMARK_LOOKUP = new Map(
  BENCHMARK_CASES.map((item) => [item.query.toLowerCase(), item] as const),
);

enum ExitCode {
  Success = 0,
  InvalidArguments = 1,
  DatabaseError = 2,
  SearchError = 3,
}

class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CliError';
  }
}

class SqliteEmbeddingsRepository implements EmbeddingsRepository {
  constructor(
    private readonly db: Database,
    private readonly hasVecExtension: boolean,
  ) {}

  public async search(queryEmbedding: Float32Array, limit: number): Promise<SearchResult[]> {
    try {
      if (this.hasVecExtension) {
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
        vector: unknown;
      }>;

      const results = rows.map((row) => {
        const storedVector = toFloat32Array(row.vector);
        const similarityScore = cosineSimilarity(queryEmbedding, storedVector);
        return {
          operationId: row.operationId,
          summary: row.summary,
          description: row.description,
          similarityScore,
        } satisfies SearchResult;
      });

      results.sort((left, right) => right.similarityScore - left.similarityScore);
      return results.slice(0, limit);
    } catch (error) {
      throw new DatabaseError('Failed to execute embedding search', { cause: error });
    }
  }

  public close(): void {
    this.db.close();
  }
}

function toFloat32Array(value: unknown): Float32Array {
  if (value instanceof Buffer) {
    const buffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    return new Float32Array(buffer);
  }

  if (typeof value === 'string') {
    const parsed = JSON.parse(value) as number[];
    return Float32Array.from(parsed);
  }

  if (value instanceof ArrayBuffer) {
    return new Float32Array(value);
  }

  throw new Error(
    'Unsupported vector format. Ensure the embeddings table stores JSON or Buffer data.',
  );
}

function cosineSimilarity(vectorA: Float32Array, vectorB: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  const length = Math.min(vectorA.length, vectorB.length);

  for (let index = 0; index < length; index += 1) {
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

export async function runCli(
  rawArgs: readonly string[],
  config: CliRuntimeConfig = {},
): Promise<number> {
  const stdout = config.stdout ?? process.stdout;
  const stderr = config.stderr ?? process.stderr;
  const logger = config.logger ?? Logger.getInstance();

  const program = createCommand();

  let options: CliOptions;
  let parsedCommand: Command;
  try {
    parsedCommand = program.parse(rawArgs, { from: 'node' });
    const parsedOptions = parsedCommand.opts<{
      limit: number;
      verbose?: boolean;
      threshold: number;
      benchmark?: boolean;
      batch?: string;
      database: string;
    }>();

    options = {
      limit: parsedOptions.limit,
      verbose: Boolean(parsedOptions.verbose),
      threshold: parsedOptions.threshold,
      benchmark: Boolean(parsedOptions.benchmark),
      batchPath: parsedOptions.batch,
      databasePath: parsedOptions.database,
    } satisfies CliOptions;
  } catch (error) {
    if (error instanceof CliError) {
      stderr.write(`${error.message}\n`);
      return error.exitCode;
    }

    if (error instanceof InvalidOptionArgumentError) {
      stderr.write(`${error.message}\n`);
      return ExitCode.InvalidArguments;
    }

    if (error instanceof Error) {
      stderr.write(`${error.message}\n`);
      return ExitCode.InvalidArguments;
    }

    stderr.write('Failed to parse command-line arguments.\n');
    return ExitCode.InvalidArguments;
  }

  const queries: string[] = [];

  const argumentQuery = parsedCommand.args[0] as string | undefined;
  if (argumentQuery) {
    queries.push(argumentQuery);
  }

  if (options.batchPath) {
    try {
      const batchContent = await fs.readFile(path.resolve(options.batchPath), 'utf-8');
      const fileQueries = batchContent
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      queries.push(...fileQueries);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stderr.write(`Failed to read batch file: ${message}\n`);
      return ExitCode.InvalidArguments;
    }
  }

  if (queries.length === 0) {
    stderr.write('Invalid argument: no query provided. Provide a query or use --batch.\n');
    return ExitCode.InvalidArguments;
  }

  const createService = config.createService ?? createDefaultService;

  let handle: ServiceHandle | undefined;
  let exitCode: ExitCode = ExitCode.Success;

  try {
    handle = await createService({ databasePath: options.databasePath, logger });

    const queryResults: QueryResult[] = [];

    for (const query of queries) {
      try {
        const results = await handle.service.search(query, options.limit);
        const filteredResults = results.filter(
          (result) => result.similarityScore >= options.threshold,
        );
        queryResults.push({ query, results, filteredResults });
      } catch (error) {
        const { exitCode: code, message } = mapSearchError(error);
        logger.error({ err: error, query }, message);
        stderr.write(`${message}\n`);
        exitCode = code;
      }
    }

    for (let index = 0; index < queryResults.length; index += 1) {
      const entry = queryResults[index];
      if (index > 0) {
        stdout.write('\n');
      }

      renderQueryResults(entry, options, stdout);
    }
  } catch (error) {
    const cliError = wrapBootstrapError(error);
    logger.error({ err: error }, cliError.message);
    stderr.write(`${cliError.message}\n`);
    exitCode = cliError.exitCode;
  } finally {
    try {
      await handle?.dispose();
    } catch (error) {
      logger.warn({ err: error }, 'Failed to close search resources cleanly');
    }
  }

  return exitCode;
}

function createCommand(): Command {
  const program = new Command();

  program
    .name('search-test')
    .description('Interactive CLI for validating Bitbucket semantic search results')
    .argument('[query]', 'Search query to evaluate')
    .addOption(
      new Option('-l, --limit <number>', 'Number of results to retrieve')
        .default(DEFAULT_LIMIT)
        .argParser(parseIntegerOption)
        .choices(Array.from({ length: MAX_LIMIT }, (_, index) => String(index + 1)))
        .makeOptionMandatory(false),
    )
    .addOption(
      new Option('--threshold <number>', 'Similarity threshold filter (0-1)')
        .default(DEFAULT_THRESHOLD)
        .argParser(parseFloatOption)
        .makeOptionMandatory(false),
    )
    .option('-v, --verbose', 'Display full operation descriptions')
    .option('-b, --benchmark', 'Compare results against benchmark expectations')
    .option('--batch <file>', 'Execute multiple queries from a file (one per line)')
    .option('--database <path>', 'Path to the embeddings database', DEFAULT_DATABASE_PATH)
    .allowExcessArguments(false)
    .showHelpAfterError('(use --help for usage details)')
    .exitOverride((error) => {
      throw new CliError(error.message, ExitCode.InvalidArguments, { cause: error });
    });

  return program;
}

function parseIntegerOption(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new InvalidOptionArgumentError('Expected a numeric value.');
  }

  if (parsed < MIN_LIMIT || parsed > MAX_LIMIT) {
    throw new InvalidOptionArgumentError(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}.`);
  }

  return parsed;
}

function parseFloatOption(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new InvalidOptionArgumentError('Expected a numeric value.');
  }

  if (parsed < MIN_THRESHOLD || parsed > MAX_THRESHOLD) {
    throw new InvalidOptionArgumentError('Threshold must be between 0.0 and 1.0.');
  }

  return parsed;
}

async function createDefaultService({
  databasePath,
  logger,
}: {
  databasePath: string;
  logger: PinoLogger;
}): Promise<ServiceHandle> {
  const resolvedPath = path.resolve(databasePath);
  if (!existsSync(resolvedPath)) {
    throw new CliError(
      `Database not found. Run "npm run populate-db" first. (${resolvedPath})`,
      ExitCode.DatabaseError,
    );
  }

  let db: Database;
  try {
    db = new DatabaseConstructor(resolvedPath, { readonly: true });
  } catch (error) {
    throw new CliError('Failed to open embeddings database.', ExitCode.DatabaseError, {
      cause: error,
    });
  }

  let hasVecExtension = false;
  try {
    await loadVecExtension(db);
    hasVecExtension = true;
  } catch (error) {
    logger.warn({ err: error, databasePath: resolvedPath }, 'sqlite-vec extension unavailable');
    hasVecExtension = false;
  }

  if (!hasVecExtension) {
    try {
      db.prepare('SELECT COUNT(*) AS count FROM embeddings LIMIT 1').get();
    } catch (error) {
      db.close();
      throw new CliError(
        'sqlite-vec extension is required to query the embeddings database. Ensure the extension is installed and accessible.',
        ExitCode.DatabaseError,
        { cause: error },
      );
    }
  }

  const repository = new SqliteEmbeddingsRepository(db, hasVecExtension);
  const service = new SemanticSearchService(repository, { logger });

  return {
    service,
    dispose: (): void => {
      repository.close();
    },
  };
}

function renderQueryResults(
  entry: QueryResult,
  options: CliOptions,
  stdout: NodeJS.WritableStream,
): void {
  const { query, results, filteredResults } = entry;
  const header = chalk.cyan(`Query: ${query}`);
  stdout.write(`${header}\n`);

  if (filteredResults.length === 0) {
    stdout.write(`No results found for query: "${query}"\n`);
    return;
  }

  const table = buildTable(filteredResults, options.verbose);
  stdout.write(`${table.toString()}\n`);
  stdout.write(
    `Found ${filteredResults.length} result(s) matching "${query}" (limit ${options.limit}, threshold ${options.threshold.toFixed(2)})\n`,
  );

  if (options.benchmark) {
    renderBenchmarkSummary(query, results, stdout);
  }
}

function buildTable(results: readonly SearchResult[], verbose: boolean): Table.Table {
  const head = verbose
    ? ['Rank', 'Operation ID', 'Summary', 'Description', 'Score']
    : ['Rank', 'Operation ID', 'Summary', 'Score'];

  const table = new Table({
    head,
    wordWrap: true,
    style: { head: ['cyan'] },
    colWidths: verbose ? [6, 28, 42, 50, 16] : [6, 28, 60, 16],
  });

  results.forEach((result, index) => {
    const scoreCell = formatScore(result.similarityScore);
    const summary = truncate(result.summary, verbose ? 80 : 60);

    if (verbose) {
      table.push([index + 1, result.operationId, summary, result.description, scoreCell]);
    } else {
      table.push([index + 1, result.operationId, summary, scoreCell]);
    }
  });

  return table;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function formatScore(score: number): string {
  const formatted = score.toFixed(2);

  if (score >= SCORE_HIGH) {
    return chalk.green(`${formatted} ✅`);
  }

  if (score >= SCORE_MEDIUM) {
    return chalk.yellow(`${formatted} ⚠️`);
  }

  return chalk.red(`${formatted} ❌`);
}

function renderBenchmarkSummary(
  query: string,
  results: readonly SearchResult[],
  stdout: NodeJS.WritableStream,
): void {
  const benchmarkCase = BENCHMARK_LOOKUP.get(query.trim().toLowerCase());
  if (!benchmarkCase) {
    stdout.write('ℹ️  No benchmark expectations defined for this query.\n');
    return;
  }

  const precision = calculatePrecisionAtFive(results, benchmarkCase);
  const meetsThreshold = precision >= BENCHMARK_THRESHOLDS.precision;
  const percentage = (precision * 100).toFixed(1);
  const threshold = (BENCHMARK_THRESHOLDS.precision * 100).toFixed(1);

  const message = `Precision@5: ${percentage}% (required ${threshold}%)`;
  if (meetsThreshold) {
    stdout.write(`${chalk.green(`✅ ${message}`)}\n`);
  } else {
    stdout.write(`${chalk.red(`❌ ${message}`)}\n`);
    stdout.write(`Expected top IDs: ${benchmarkCase.expectedIds.slice(0, 5).join(', ')}\n`);
  }
}

function calculatePrecisionAtFive(
  results: readonly SearchResult[],
  benchmarkCase: BenchmarkCase,
): number {
  const expected = benchmarkCase.expectedIds.slice(0, 5);
  const actual = results.slice(0, 5).map((result) => result.operationId);

  if (expected.length === 0) {
    return 0;
  }

  const relevant = actual.filter((id) => expected.includes(id)).length;
  return relevant / expected.length;
}

function mapSearchError(error: unknown): { exitCode: ExitCode; message: string } {
  if (error instanceof ValidationError) {
    return {
      exitCode: ExitCode.InvalidArguments,
      message: `Invalid argument: ${error.message}. Use --help for usage.`,
    };
  }

  if (error instanceof DatabaseError) {
    return {
      exitCode: ExitCode.SearchError,
      message: `Search failed due to a database error: ${error.message}`,
    };
  }

  if (error instanceof ModelLoadError) {
    return {
      exitCode: ExitCode.SearchError,
      message: `Failed to initialise embedding model: ${error.message}`,
    };
  }

  if (error instanceof Error) {
    return {
      exitCode: ExitCode.SearchError,
      message: `Search failed: ${error.message}`,
    };
  }

  return {
    exitCode: ExitCode.SearchError,
    message: 'Search failed due to an unknown error.',
  };
}

function wrapBootstrapError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof InvalidOptionArgumentError) {
    return new CliError(error.message, ExitCode.InvalidArguments, { cause: error });
  }

  if (error instanceof Error) {
    return new CliError(error.message, ExitCode.DatabaseError, { cause: error });
  }

  return new CliError('Unexpected error initialising search CLI.', ExitCode.DatabaseError);
}

function shouldExecuteAsMain(): boolean {
  try {
    const executed = process.argv[1];
    if (!executed) {
      return false;
    }

    const resolved = path.resolve(executed);
    return resolved === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (shouldExecuteAsMain()) {
  void runCli(process.argv).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
