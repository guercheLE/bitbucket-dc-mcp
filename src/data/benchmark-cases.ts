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

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export type BenchmarkCategory =
  | 'CRUD'
  | 'User Management'
  | 'Workflows'
  | 'Custom Fields'
  | 'Boards & Sprints'
  | 'Advanced';

export interface BenchmarkCase {
  readonly category: BenchmarkCategory;
  readonly query: string;
  readonly expectedIds: readonly string[];
}

const rawCases = require('../../data/benchmark-cases.json') as BenchmarkCase[];

export const BENCHMARK_CASES: readonly BenchmarkCase[] = Object.freeze(
  rawCases.map((item) =>
    Object.freeze({
      category: item.category,
      query: item.query,
      expectedIds: Object.freeze([...item.expectedIds]),
    }),
  ),
);

export interface BenchmarkThresholds {
  readonly precision: number;
  readonly recall: number;
  readonly mrr: number;
  readonly relevanceScore: number;
}

export const BENCHMARK_THRESHOLDS: BenchmarkThresholds = Object.freeze({
  precision: 0.85,
  recall: 0,
  mrr: 0.8,
  relevanceScore: 0.85,
});
