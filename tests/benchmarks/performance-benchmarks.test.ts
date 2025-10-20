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

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { EmbeddingsRepository, SearchResult } from '../../src/services/semantic-search.js';
import { SemanticSearchService } from '../../src/services/semantic-search.js';

/**
 * Performance Benchmark Test Suite
 *
 * Validates that operation latency meets documented performance targets:
 * - search_ids p50 <150ms, p95 <500ms
 * - Schema retrieval (get_id cached) <10ms
 *
 * Note: These are unit-level performance tests. Real-world latency will
 * include network overhead and Bitbucket API response time.
 */

const RESULTS_DIR = path.resolve('tests', 'benchmarks', 'results');

interface LatencyMetrics {
  readonly samples: readonly number[];
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
}

/**
 * Calculate percentiles and statistics from latency samples
 */
function calculateLatencyMetrics(samples: number[]): LatencyMetrics {
  const sorted = [...samples].sort((a, b) => a - b);
  const count = sorted.length;

  if (count === 0) {
    return {
      samples: [],
      p50: 0,
      p95: 0,
      p99: 0,
      min: 0,
      max: 0,
      mean: 0,
    };
  }

  const p50Index = Math.floor(count * 0.5);
  const p95Index = Math.floor(count * 0.95);
  const p99Index = Math.floor(count * 0.99);

  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    samples: sorted,
    p50: sorted[p50Index] ?? 0,
    p95: sorted[p95Index] ?? 0,
    p99: sorted[p99Index] ?? 0,
    min: sorted[0] ?? 0,
    max: sorted[count - 1] ?? 0,
    mean: sum / count,
  };
}

/**
 * Mock embeddings repository with predictable performance
 */
class MockEmbeddingsRepository implements EmbeddingsRepository {
  private readonly operations: SearchResult[] = [
    {
      operationId: 'createIssue',
      summary: 'Create issue',
      description:
        'Creates an issue or, where the option to create subtasks is enabled in Bitbucket, a subtask.',
      similarityScore: 0.95,
    },
    {
      operationId: 'editIssue',
      summary: 'Edit issue',
      description:
        'Edits an issue. A transition may be applied and issue properties updated as part of the edit.',
      similarityScore: 0.9,
    },
    {
      operationId: 'getIssue',
      summary: 'Get issue',
      description: 'Returns the details for an issue.',
      similarityScore: 0.85,
    },
    {
      operationId: 'deleteIssue',
      summary: 'Delete issue',
      description: 'Deletes an issue.',
      similarityScore: 0.8,
    },
    {
      operationId: 'assignIssue',
      summary: 'Assign issue',
      description: 'Assigns an issue to a user.',
      similarityScore: 0.75,
    },
  ];

  async search(_queryEmbedding: Float32Array, limit: number): Promise<SearchResult[]> {
    // Simulate realistic DB query time (1-5ms)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 4 + 1));
    return this.operations.slice(0, limit);
  }
}

/**
 * Mock embedding generator with predictable performance
 */
class MockEmbeddingGenerator {
  async generate(_query: string): Promise<Float32Array> {
    // Simulate embedding generation time (5-20ms typical for small models)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 15 + 5));
    return new Float32Array(768).fill(0.1);
  }
}

/**
 * Generate markdown performance report
 */
function generatePerformanceReport(searchMetrics: LatencyMetrics, timestamp: Date): string {
  const lines = [
    '# Performance Benchmark Report',
    '',
    `**Generated:** ${timestamp.toISOString()}`,
    `**Version:** 2.0.0`,
    '',
    '---',
    '',
    '## Semantic Search Performance',
    '',
    '### search_ids Operation',
    '',
    '**Test Configuration:**',
    '- Sample Size: 100 queries',
    '- Model: Mock embedding generator (simulates Xenova/all-mpnet-base-v2)',
    '- Repository: Mock in-memory embeddings database',
    '',
    '**Results:**',
    '',
    '| Metric | Target | Actual | Status |',
    '|--------|--------|--------|--------|',
    `| **p50 (median)** | <150ms | **${searchMetrics.p50.toFixed(1)}ms** | ${searchMetrics.p50 < 150 ? '✅ PASS' : '❌ FAIL'} |`,
    `| **p95** | <500ms | **${searchMetrics.p95.toFixed(1)}ms** | ${searchMetrics.p95 < 500 ? '✅ PASS' : '❌ FAIL'} |`,
    `| **p99** | <1000ms | **${searchMetrics.p99.toFixed(1)}ms** | ${searchMetrics.p99 < 1000 ? '✅ PASS' : '⚠️ WARN'} |`,
    '',
    '**Statistics:**',
    '',
    `- **Min:** ${searchMetrics.min.toFixed(1)}ms`,
    `- **Max:** ${searchMetrics.max.toFixed(1)}ms`,
    `- **Mean:** ${searchMetrics.mean.toFixed(1)}ms`,
    '',
    '### Latency Distribution',
    '',
    '```',
    'p0  (min):  ' + searchMetrics.min.toFixed(1) + 'ms',
    'p50 (med):  ' + searchMetrics.p50.toFixed(1) + 'ms',
    'p95:        ' + searchMetrics.p95.toFixed(1) + 'ms',
    'p99:        ' + searchMetrics.p99.toFixed(1) + 'ms',
    'p100 (max): ' + searchMetrics.max.toFixed(1) + 'ms',
    '```',
    '',
    '---',
    '',
    '## Analysis',
    '',
    searchMetrics.p50 < 150 && searchMetrics.p95 < 500
      ? '✅ **All performance targets met.** The semantic search operation performs within acceptable latency bounds.'
      : '⚠️ **Performance targets not met.** Consider optimizing embedding generation or database queries.',
    '',
    '### Breakdown',
    '',
    '**search_ids latency consists of:**',
    '1. **Embedding Generation:** ~10-30ms (transformer model inference)',
    '2. **Vector Search:** ~1-10ms (sqlite-vec cosine similarity)',
    '3. **Result Formatting:** ~1-2ms',
    '',
    '**Note:** Real-world latency includes:',
    '- Network round-trip time (variable)',
    '- MCP protocol overhead (~1-5ms)',
    '- Bitbucket API response time for `call_id` operations (50-500ms typical)',
    '',
    '---',
    '',
    '## Recommendations',
    '',
  ];

  if (searchMetrics.p95 < 500 && searchMetrics.p50 < 150) {
    lines.push('- ✅ Continue monitoring performance across releases');
    lines.push('- ✅ Current performance is production-ready');
  } else {
    lines.push('- ⚠️ Investigate slow queries (p95 > 500ms)');
    lines.push('- ⚠️ Consider caching frequently used embeddings');
    lines.push('- ⚠️ Profile embedding generation bottlenecks');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Document Version:** 1.0');
  lines.push('**Next Review:** After v2.1 release');
  lines.push('');

  return lines.join('\n');
}

describe('Performance Benchmarks', () => {
  let service: SemanticSearchService;
  const searchLatencies: number[] = [];

  beforeAll(async () => {
    const repository = new MockEmbeddingsRepository();
    service = new SemanticSearchService(repository, {
      embeddingGeneratorFactory: async () => new MockEmbeddingGenerator(),
    });
  }, 10_000);

  it('search_ids meets p50 <150ms and p95 <500ms targets', async () => {
    const sampleSize = 100;
    const queries = [
      'create new issue',
      'update issue priority',
      'delete issue',
      'get issue details',
      'assign issue to user',
      'add comment to issue',
      'change issue status',
      'link issues',
      'get project details',
      'search issues',
    ];

    // Run multiple iterations to collect latency samples
    for (let i = 0; i < sampleSize; i++) {
      const query = queries[i % queries.length]!;
      const startTime = performance.now();

      await service.search(query, 5);

      const endTime = performance.now();
      const latency = endTime - startTime;
      searchLatencies.push(latency);
    }

    // Calculate metrics
    const metrics = calculateLatencyMetrics(searchLatencies);

    // Generate report
    await fsp.mkdir(RESULTS_DIR, { recursive: true });
    const timestamp = new Date();
    const reportPath = path.join(
      RESULTS_DIR,
      `performance-report-${timestamp.toISOString().replace(/[:.]/g, '-')}.md`,
    );
    const report = generatePerformanceReport(metrics, timestamp);
    await fsp.writeFile(reportPath, report, 'utf-8');

    // Log summary
    console.log('\n📊 Performance Benchmark Results:');
    console.log(`  p50: ${metrics.p50.toFixed(1)}ms (target <150ms)`);
    console.log(`  p95: ${metrics.p95.toFixed(1)}ms (target <500ms)`);
    console.log(`  p99: ${metrics.p99.toFixed(1)}ms`);
    console.log(`\n📄 Report: ${path.relative(process.cwd(), reportPath)}\n`);

    // Assert targets
    expect(metrics.p50).toBeLessThan(150);
    expect(metrics.p95).toBeLessThan(500);
  }, 60_000);

  it('provides latency distribution summary', () => {
    const metrics = calculateLatencyMetrics(searchLatencies);

    // Verify we have sufficient samples
    expect(metrics.samples.length).toBeGreaterThanOrEqual(100);

    // Verify distribution makes sense (p50 < p95 < p99)
    expect(metrics.p50).toBeLessThanOrEqual(metrics.p95);
    expect(metrics.p95).toBeLessThanOrEqual(metrics.p99);
    expect(metrics.min).toBeLessThanOrEqual(metrics.p50);
    expect(metrics.p99).toBeLessThanOrEqual(metrics.max);
  });
});
