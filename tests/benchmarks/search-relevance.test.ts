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

import assert from 'node:assert/strict';
import fs, { promises as fsp } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  SemanticSearchService,
  type EmbeddingsRepository,
  type SearchResult,
} from '../../src/services/semantic-search.js';

import {
  BENCHMARK_CASES,
  BENCHMARK_THRESHOLDS,
  type BenchmarkCase,
  type BenchmarkCategory,
  type BenchmarkThresholds,
} from '../../src/data/benchmark-cases.js';

interface BenchmarkMetrics {
  readonly precision: number;
  readonly recall: number;
  readonly mrr: number;
  readonly relevanceScore: number;
}

interface BenchmarkResult {
  readonly benchmarkCase: BenchmarkCase;
  readonly actualIds: readonly string[];
  readonly metrics: BenchmarkMetrics;
}

interface OperationRecord {
  readonly operationId: string;
  readonly summary: string;
  readonly description: string;
}

interface OperationEmbedding extends OperationRecord {
  readonly vector: Float32Array;
}

const VECTOR_LENGTH = 512;
const OPERATIONS_PATH = path.resolve('data', 'operations.json');
const RESULTS_DIR = path.resolve('tests', 'benchmarks', 'results');
const BENCHMARK_DATA_PATH = path.resolve('data', 'benchmark-cases.json');

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!matches) {
    return [];
  }

  return matches;
}

function hashToken(token: string): number {
  let hash = 0;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }

  return hash % VECTOR_LENGTH;
}

function encodeText(text: string): Float32Array {
  const vector = new Float32Array(VECTOR_LENGTH);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const slot = hashToken(token);
    vector[slot] += 1;
  }

  let magnitude = 0;
  for (let index = 0; index < vector.length; index += 1) {
    const value = vector[index];
    magnitude += value * value;
  }

  if (magnitude === 0) {
    return vector;
  }

  const scale = 1 / Math.sqrt(magnitude);
  for (let index = 0; index < vector.length; index += 1) {
    vector[index] *= scale;
  }

  return vector;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const av = a[index];
    const bv = b[index];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / Math.sqrt(normA * normB);
}

class BenchmarkEmbeddingsRepository implements EmbeddingsRepository {
  constructor(private readonly operations: readonly OperationEmbedding[]) {}

  public async search(queryEmbedding: Float32Array, limit: number): Promise<SearchResult[]> {
    const scored = this.operations
      .map((operation) => ({
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        similarityScore: cosineSimilarity(queryEmbedding, operation.vector),
      }))
      .sort((left, right) => right.similarityScore - left.similarityScore)
      .slice(0, limit)
      .map((result) => ({ ...result }) satisfies SearchResult);

    return scored;
  }
}

class BenchmarkEmbeddingGenerator {
  public async generate(query: string): Promise<Float32Array> {
    return encodeText(query);
  }
}

async function loadOperations(): Promise<OperationRecord[]> {
  const raw = await fsp.readFile(OPERATIONS_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as { operations?: OperationRecord[] };
  assert.ok(Array.isArray(parsed.operations), 'operations.json must contain an operations array');

  return parsed.operations.map((operation) => ({
    operationId: operation.operationId,
    summary: operation.summary ?? '',
    description: operation.description ?? '',
  }));
}

async function loadOperationEmbeddings(): Promise<OperationEmbedding[]> {
  const operations = await loadOperations();

  return operations.map((operation) => {
    const text = `${operation.summary} ${operation.description} ${operation.operationId.replace(/[_-]/g, ' ')}`;
    return {
      ...operation,
      vector: encodeText(text),
    } satisfies OperationEmbedding;
  });
}

/**
 * Calculates the Precision@K metric representing the ratio of relevant results in
 * the top K positions returned by the semantic search.
 */
function calculatePrecisionAtK(
  results: readonly string[],
  expected: readonly string[],
  k: number,
): number {
  const top = results.slice(0, k);
  if (top.length === 0) {
    return 0;
  }

  const relevant = top.filter((result) => expected.includes(result)).length;
  return relevant / k;
}

/**
 * Calculates the Recall@K metric, indicating how many of the expected relevant
 * operations are surfaced within the top K positions.
 */
function calculateRecallAtK(
  results: readonly string[],
  expected: readonly string[],
  k: number,
): number {
  if (expected.length === 0) {
    return 0;
  }

  const top = results.slice(0, k);
  const relevant = top.filter((result) => expected.includes(result)).length;
  return relevant / expected.length;
}

/**
 * Calculates the Mean Reciprocal Rank (MRR), capturing the position of the first
 * relevant result in the ranking. Returns 0 when no relevant result is present.
 */
function calculateMRR(results: readonly string[], expected: readonly string[]): number {
  for (let index = 0; index < results.length; index += 1) {
    if (expected.includes(results[index] ?? '')) {
      return 1 / (index + 1);
    }
  }

  return 0;
}

/**
 * Combines Precision, Recall, and MRR into the weighted relevance score used as
 * the overall quality gate for the benchmark suite.
 */
function calculateRelevanceScore(metrics: BenchmarkMetrics): number {
  return 0.4 * metrics.precision + 0.3 * metrics.recall + 0.3 * metrics.mrr;
}

async function maybeUpdateBenchmarkExpectations(service: SemanticSearchService): Promise<boolean> {
  if (process.env.UPDATE_BENCHMARK_EXPECTATIONS !== 'true') {
    return false;
  }

  const updatedCases: BenchmarkCase[] = [];

  for (const benchmarkCase of BENCHMARK_CASES) {
    const results = await service.search(benchmarkCase.query, 5);
    updatedCases.push({
      ...benchmarkCase,
      expectedIds: results.map((result) => result.operationId),
    });
  }

  await writeUpdatedDataset(updatedCases);

  await fsp.mkdir(RESULTS_DIR, { recursive: true });
  const reportPath = path.join(RESULTS_DIR, `${formatTimestamp(new Date())}-update-mode.md`);
  const report = [
    '# Benchmark Expectations Updated',
    '',
    `Updated at: ${new Date().toISOString()}`,
    '',
    'The benchmark expectations were regenerated. Review and commit the updated dataset if appropriate.',
  ].join('\n');
  await fsp.writeFile(reportPath, `${report}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.warn('⚠️ Updated benchmark expectations! Review and rerun without update mode.');
  return true;
}

async function writeUpdatedDataset(cases: readonly BenchmarkCase[]): Promise<void> {
  const payload = JSON.stringify(cases, null, 2);
  await fsp.writeFile(BENCHMARK_DATA_PATH, `${payload}\n`, 'utf-8');
}

function formatTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

interface SummaryMetrics {
  readonly precision: number;
  readonly recall: number;
  readonly mrr: number;
  readonly relevanceScore: number;
}

interface CategorySummary extends SummaryMetrics {
  readonly category: BenchmarkCategory;
  readonly count: number;
}

/**
 * Builds a Markdown report with a summary section, failed query breakdown, per
 * category metrics table, and actionable recommendations for relevance tuning.
 */
function generateBenchmarkReport(
  results: readonly BenchmarkResult[],
  summary: SummaryMetrics,
  categories: readonly CategorySummary[],
  thresholds: BenchmarkThresholds,
): string {
  const failed = results.filter(
    (result) => result.metrics.precision < 0.8 || result.metrics.mrr < 0.5,
  );

  const summaryLines = [
    '# Search Relevance Benchmark',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    metricLine('Precision@5', summary.precision, thresholds.precision),
    metricLine('Recall@5', summary.recall, thresholds.recall),
    metricLine('MRR', summary.mrr, thresholds.mrr),
    metricLine('Relevance Score', summary.relevanceScore, thresholds.relevanceScore),
    `Total benchmark cases: ${results.length}`,
    '',
    '## Failed Queries',
    '',
  ];

  if (failed.length === 0) {
    summaryLines.push('All queries met the quality thresholds.');
  } else {
    summaryLines.push('| Query | Category | Precision@5 | MRR | Expected Top | Actual Top |');
    summaryLines.push('| --- | --- | --- | --- | --- | --- |');
    for (const item of failed) {
      summaryLines.push(
        `| ${item.benchmarkCase.query} | ${item.benchmarkCase.category} | ${item.metrics.precision.toFixed(
          2,
        )} | ${item.metrics.mrr.toFixed(2)} | ${formatIdList(item.benchmarkCase.expectedIds)} | ${formatIdList(item.actualIds)} |`,
      );
    }
  }

  summaryLines.push(
    '',
    '## Category Breakdown',
    '',
    '| Category | Precision@5 | Recall@5 | MRR | Cases |',
  );
  summaryLines.push('| --- | --- | --- | --- | --- |');
  for (const category of categories) {
    summaryLines.push(
      `| ${category.category} | ${category.precision.toFixed(2)} | ${category.recall.toFixed(2)} | ${category.mrr.toFixed(2)} | ${category.count} |`,
    );
  }

  summaryLines.push('', '## Recommendations', '');
  for (const recommendation of buildRecommendations(summary, failed)) {
    summaryLines.push(`- ${recommendation}`);
  }

  return `${summaryLines.join('\n')}\n`;
}

function metricLine(label: string, value: number, threshold: number): string {
  const indicator = value >= threshold ? '✅' : value >= threshold - 0.05 ? '⚠️' : '❌';
  return `- ${indicator} **${label}:** ${(value * 100).toFixed(1)}% (threshold ${(threshold * 100).toFixed(1)}%)`;
}

function formatIdList(ids: readonly string[]): string {
  return ids.map((id) => `\`${id}\``).join('<br>');
}

function buildRecommendations(
  summary: SummaryMetrics,
  failed: readonly BenchmarkResult[],
): readonly string[] {
  if (failed.length === 0) {
    return [
      'All tracked scenarios meet the current thresholds. Continue monitoring benchmark trends for regression detection.',
    ];
  }

  const recommendations = new Set<string>();

  if (summary.precision < 0.9) {
    recommendations.add(
      'Review the highest-ranked operations for the failed queries to confirm semantic relevance.',
    );
  }

  if (summary.mrr < 0.85) {
    recommendations.add(
      'Investigate ranking features that influence the first relevant result (consider boosting intent-specific tokens).',
    );
  }

  if (failed.some((result) => /\b(cre|isue|typo)/iu.test(result.benchmarkCase.query))) {
    recommendations.add(
      'Enhance typo and synonym handling to better support natural-language variations.',
    );
  }

  if (failed.some((result) => result.benchmarkCase.category === 'Advanced')) {
    recommendations.add(
      'Augment the embeddings dataset with additional advanced usage examples to strengthen semantic recall.',
    );
  }

  if (recommendations.size === 0) {
    recommendations.add(
      'Review failed queries individually and adjust expected mappings or re-train embeddings as needed.',
    );
  }

  return Array.from(recommendations);
}

if (!fs.existsSync(OPERATIONS_PATH)) {
  describe.skip('Search relevance benchmark', () => {
    it('skipped because operations dataset is unavailable', () => {
      expect.fail('operations.json is required for benchmark execution');
    });
  });
} else {
  describe('Search relevance benchmark', () => {
    let service: SemanticSearchService;
    let operations: OperationEmbedding[];
    let updateModeTriggered = false;

    beforeAll(async () => {
      operations = await loadOperationEmbeddings();
      const repository = new BenchmarkEmbeddingsRepository(operations);

      service = new SemanticSearchService(repository, {
        embeddingGeneratorFactory: async (): Promise<BenchmarkEmbeddingGenerator> =>
          new BenchmarkEmbeddingGenerator(),
      });

      updateModeTriggered = await maybeUpdateBenchmarkExpectations(service);
    }, 60_000);

    if (process.env.UPDATE_BENCHMARK_EXPECTATIONS === 'true') {
      it('skips validations while updating expectations', () => {
        expect(updateModeTriggered).toBe(true);
      });
      return;
    }

    it('meets quality thresholds for semantic relevance', async () => {
      const results: BenchmarkResult[] = [];

      const categoryTotals = new Map<
        BenchmarkCategory,
        {
          precision: number;
          recall: number;
          mrr: number;
          relevance: number;
          count: number;
        }
      >();

      for (const benchmarkCase of BENCHMARK_CASES) {
        const searchResults = await service.search(benchmarkCase.query, 5);
        const actualIds = searchResults.map((result) => result.operationId);

        const precision = calculatePrecisionAtK(actualIds, benchmarkCase.expectedIds, 5);
        const recall = calculateRecallAtK(actualIds, benchmarkCase.expectedIds, 5);
        const mrr = calculateMRR(actualIds, benchmarkCase.expectedIds);
        const metrics: BenchmarkMetrics = {
          precision,
          recall,
          mrr,
          relevanceScore: calculateRelevanceScore({
            precision,
            recall,
            mrr,
            relevanceScore: 0,
          }),
        };

        results.push({ benchmarkCase, actualIds, metrics });

        const totals = categoryTotals.get(benchmarkCase.category) ?? {
          precision: 0,
          recall: 0,
          mrr: 0,
          relevance: 0,
          count: 0,
        };
        totals.precision += metrics.precision;
        totals.recall += metrics.recall;
        totals.mrr += metrics.mrr;
        totals.relevance += metrics.relevanceScore;
        totals.count += 1;
        categoryTotals.set(benchmarkCase.category, totals);
      }

      const summary: SummaryMetrics = {
        precision: results.reduce((acc, item) => acc + item.metrics.precision, 0) / results.length,
        recall: results.reduce((acc, item) => acc + item.metrics.recall, 0) / results.length,
        mrr: results.reduce((acc, item) => acc + item.metrics.mrr, 0) / results.length,
        relevanceScore:
          results.reduce((acc, item) => acc + item.metrics.relevanceScore, 0) / results.length,
      };

      expect(summary.precision).toBeGreaterThanOrEqual(BENCHMARK_THRESHOLDS.precision);
      expect(summary.mrr).toBeGreaterThanOrEqual(BENCHMARK_THRESHOLDS.mrr);
      expect(summary.relevanceScore).toBeGreaterThanOrEqual(BENCHMARK_THRESHOLDS.relevanceScore);

      const categorySummaries: CategorySummary[] = Array.from(categoryTotals.entries()).map(
        ([category, totals]) => ({
          category,
          precision: totals.precision / totals.count,
          recall: totals.recall / totals.count,
          mrr: totals.mrr / totals.count,
          relevanceScore: totals.relevance / totals.count,
          count: totals.count,
        }),
      );

      const report = generateBenchmarkReport(
        results,
        summary,
        categorySummaries,
        BENCHMARK_THRESHOLDS,
      );
      await fsp.mkdir(RESULTS_DIR, { recursive: true });
      const reportPath = path.join(
        RESULTS_DIR,
        `benchmark-report-${formatTimestamp(new Date())}.md`,
      );
      await fsp.writeFile(reportPath, report, 'utf-8');

      // eslint-disable-next-line no-console
      console.info(`Benchmark report: ${path.relative(process.cwd(), reportPath)}`);
    }, 60_000);
  });
}
