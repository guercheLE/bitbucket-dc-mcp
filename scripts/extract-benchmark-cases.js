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

/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve('tests/benchmarks/search-relevance.test.ts');
const targetPath = resolve('data/benchmark-cases.json');

const file = readFileSync(sourcePath, 'utf8');
const start = file.indexOf('export const BENCHMARK_CASES');
const end = file.indexOf('// </benchmark-dataset>', start);

console.info('Marker positions', { start, end });

if (start === -1 || end === -1) {
    throw new Error('Benchmark dataset markers not found.');
}

const datasetSection = file.slice(start, end);

console.info('Dataset section preview:', datasetSection.slice(0, 200));
const literalStart = datasetSection.indexOf('[');
const literalEnd = datasetSection.lastIndexOf(']');

if (literalStart === -1 || literalEnd === -1 || literalEnd <= literalStart) {
    console.info('Literal start/end', literalStart, literalEnd);
    throw new Error('Benchmark dataset array literal not found.');
}

let arrayText = datasetSection.slice(literalStart, literalEnd + 1);

arrayText = arrayText.replace(/\sas const;?/g, '');

// eslint-disable-next-line no-new-func
const data = Function(`"use strict"; return (${arrayText});`)();

writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`);

console.info(`benchmark-cases.json generated with ${data.length} entries`);