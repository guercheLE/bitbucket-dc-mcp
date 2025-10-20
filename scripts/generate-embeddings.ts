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

import { pipeline } from '@xenova/transformers';
import { access, promises as fs, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import pino from 'pino';
import { z } from 'zod';

type HttpMethod =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE'
    | 'HEAD'
    | 'OPTIONS';

interface OperationData {
    operationId: string;
    path: string;
    method: string;
    summary: string;
    description: string;
    tags: string[];
}

interface EmbeddingResult {
    operation_id: string;
    vector: number[];
    model: string;
    description_text: string;
    created_at: string;
}

interface EmbeddingsFile {
    model: string;
    generated_at: string;
    embedding_dimensions: number;
    total_operations: number;
    embeddings: EmbeddingResult[];
}

interface EnvConfig {
    model: string;
    batchSize: number;
}

interface EmbeddingFailure {
    index: number;
    operationId: string;
    reason: string;
}

const envSchema = z.object({
    EMBEDDING_MODEL: z.string().trim().default('Xenova/all-mpnet-base-v2'),
    BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(32),
});

const operationsSchema = z.object({
    operations: z
        .array(
            z.object({
                operationId: z.string(),
                path: z.string(),
                method: z.string(),
                summary: z.string(),
                description: z.string(),
                tags: z.array(z.string()).default([]),
            }),
        )
        .nonempty('operations.json must contain at least one operation'),
});

const DESCRIPTION_MAX_LENGTH = 8000;
const DEFAULT_OUTPUT_PATH = path.resolve('data', 'embeddings.json');
const OPERATIONS_PATH = path.resolve('data', 'operations.json');
const EMBEDDING_DIMENSIONS = 768;

const logger = pino({ name: 'generate-embeddings' });

function toUpperMethod(method: string): HttpMethod {
    const normalized = method.toUpperCase();
    if (
        normalized === 'GET' ||
        normalized === 'POST' ||
        normalized === 'PUT' ||
        normalized === 'PATCH' ||
        normalized === 'DELETE' ||
        normalized === 'HEAD' ||
        normalized === 'OPTIONS'
    ) {
        return normalized;
    }

    return 'GET';
}

export function getUseCaseHint(method: string, tags: string[]): string {
    const upperMethod = toUpperMethod(method);

    switch (upperMethod) {
        case 'POST':
            return 'This operation creates/adds a new resource; useful when automating Bitbucket data creation.';
        case 'PUT':
        case 'PATCH':
            return 'This operation updates/modifies existing data; ideal for synchronization workflows.';
        case 'DELETE':
            return 'This operation removes/deletes data; ensure the caller has proper permissions before invoking.';
        case 'HEAD':
        case 'OPTIONS':
            return 'This operation inspects resource metadata without modifying data; often used for connectivity checks.';
        case 'GET':
        default:
            if (tags.includes('search')) {
                return 'This operation retrieves/fetches data and supports search queries across Bitbucket content.';
            }

            return 'This operation retrieves/fetches data; ideal for read-only automation and reporting scenarios.';
    }
}

export function generateDescriptionText(operation: OperationData): string {
    // Calculate embeddings ONLY from summary and description
    // Do NOT include operationId, path, method, or tags in the embedding
    // This ensures semantic search matches based on WHAT the operation does,
    // not on technical identifiers
    const parts = [operation.summary, operation.description];
    const hint = getUseCaseHint(operation.method, operation.tags);
    parts.push(hint);

    const description = parts
        .map((section) => section?.trim() ?? '')
        .filter((section) => section.length > 0)
        .join(' - ')
        .replace(/\s+/g, ' ') // collapse consecutive whitespace
        .slice(0, DESCRIPTION_MAX_LENGTH);

    return description;
}

export async function loadOperations(filePath: string = OPERATIONS_PATH): Promise<OperationData[]> {
    await assertFileExists(filePath);

    const raw = await fs.readFile(filePath, 'utf-8');
    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        logger.error({ err: error, filePath }, 'Failed to parse operations file');
        throw new Error(`Invalid JSON in operations file: ${filePath}`);
    }

    const result = operationsSchema.safeParse(parsed);

    if (!result.success) {
        logger.error({ issues: result.error.issues }, 'Operations schema validation failed');
        throw new Error('operations.json does not match the expected schema');
    }

    return result.data.operations;
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
    const config = envSchema.safeParse(env);

    if (!config.success) {
        logger.error({ issues: config.error.issues }, 'Environment validation failed');
        throw new Error('Invalid environment configuration for embeddings generation');
    }

    return {
        model: config.data.EMBEDDING_MODEL,
        batchSize: config.data.BATCH_SIZE,
    };
}

type FeatureExtractionTensor = {
    data: Float32Array;
    dims: number[];
};

function splitTensorRows(tensor: FeatureExtractionTensor, expectedRows: number): Float32Array[] {
    let rows: number;
    let columns: number;

    if (tensor.dims.length === 1) {
        rows = 1;
        [columns] = tensor.dims;
    } else {
        [rows, columns] = tensor.dims;
    }

    if (rows !== expectedRows) {
        throw new Error(`Unexpected tensor rows: expected ${expectedRows}, received ${rows}`);
    }

    if (columns !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Unexpected tensor dimensions: expected ${EMBEDDING_DIMENSIONS}, received ${columns}`);
    }

    const slices: Float32Array[] = [];

    for (let index = 0; index < rows; index += 1) {
        const start = index * columns;
        const end = start + columns;
        const view = tensor.data.subarray(start, end);
        slices.push(Float32Array.from(view));
    }

    return slices;
}

export class ProgressTracker {
    private total = 0;

    private processed = 0;

    private startTime?: bigint;

    start(total: number): void {
        this.total = total;
        this.processed = 0;
        this.startTime = process.hrtime.bigint();
        this.printProgress();
    }

    update(processedDelta: number): void {
        this.processed += processedDelta;
        this.printProgress();
    }

    finish(): void {
        if (this.total === 0) {
            return;
        }

        this.processed = this.total;
        this.printProgress(true);
    }

    private printProgress(isFinal = false): void {
        if (this.total === 0) {
            return;
        }

        const ratio = Math.min(this.processed / this.total, 1);
        const barLength = 20;
        const filledLength = Math.round(barLength * ratio);
        const bar = `${'█'.repeat(filledLength)}${'░'.repeat(barLength - filledLength)}`;
        const percentage = (ratio * 100).toFixed(0);
        const elapsedSeconds = this.startTime
            ? Number(process.hrtime.bigint() - this.startTime) / 1_000_000_000
            : 0;
        const etaSeconds = ratio > 0 && !isFinal ? (elapsedSeconds / ratio) * (1 - ratio) : 0;
        const formattedEta = isFinal ? '0s' : formatDuration(etaSeconds);
        const formattedElapsed = formatDuration(elapsedSeconds);

        // Console progress output is user-facing and explicitly allowed for scripts (see coding standards exception)
        // eslint-disable-next-line no-console
        console.log(
            `[${bar}] ${percentage}% (${this.processed}/${this.total} operations) ETA: ${formattedEta} Elapsed: ${formattedElapsed}`,
        );
    }
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '0s';
    }

    const rounded = Math.round(seconds);
    const minutes = Math.floor(rounded / 60);
    const remainingSeconds = rounded % 60;

    if (minutes === 0) {
        return `${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}

async function assertFileExists(filePath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        access(filePath, fsConstants.F_OK, (error: unknown) => {
            if (error != null) {
                reject(new Error(`Required file not found: ${filePath}`));
                return;
            }

            resolve();
        });
    });
}

async function ensureDirectoryExists(filePath: string): Promise<void> {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return typeof error === 'string' ? error : JSON.stringify(error);
}

async function runFeatureExtraction(
    extractor: (input: string[] | string, options?: Record<string, unknown>) => Promise<FeatureExtractionTensor>,
    texts: string[],
): Promise<Float32Array[]> {
    const tensor = await extractor(texts, { pooling: 'mean', normalize: true });
    return splitTensorRows(tensor, texts.length);
}

type EmbeddingSuccess = {
    index: number;
    vector: Float32Array;
};

export async function generateEmbeddings(
    texts: string[],
    modelName: string,
    batchSize: number,
    tracker: ProgressTracker,
    onBatchFailure: (error: unknown, batchStartIndex: number, batchSize: number) => void,
    onItemFailure: (error: unknown, index: number) => void,
): Promise<EmbeddingSuccess[]> {
    const extractor = await pipeline('feature-extraction', modelName);
    const successes: EmbeddingSuccess[] = [];

    for (let start = 0; start < texts.length; start += batchSize) {
        const batch = texts.slice(start, start + batchSize);

        try {
            const batchEmbeddings = await runFeatureExtraction(extractor, batch);
            batchEmbeddings.forEach((vector, offset) => {
                successes.push({ index: start + offset, vector });
            });
            tracker.update(batch.length);
        } catch (batchError) {
            onBatchFailure(batchError, start, batch.length);

            for (let offset = 0; offset < batch.length; offset += 1) {
                const index = start + offset;
                const text = batch[offset];

                try {
                    const singleEmbedding = await runFeatureExtraction(extractor, [text]);
                    successes.push({ index, vector: singleEmbedding[0] });
                    tracker.update(1);
                } catch (itemError) {
                    onItemFailure(itemError, index);
                }
            }
        }
    }

    return successes;
}

export async function saveEmbeddings(
    results: EmbeddingResult[],
    outputPath: string = DEFAULT_OUTPUT_PATH,
    model: string,
): Promise<void> {
    const content: EmbeddingsFile = {
        model,
        generated_at: new Date().toISOString(),
        embedding_dimensions: EMBEDDING_DIMENSIONS,
        total_operations: results.length,
        embeddings: results,
    };

    await ensureDirectoryExists(outputPath);
    await fs.writeFile(outputPath, `${JSON.stringify(content, null, 2)}\n`, 'utf-8');
}

async function main(): Promise<number> {
    try {
        const envConfig = loadEnvConfig();
        const operations = await loadOperations();

        logger.info({ total: operations.length }, 'Loaded operations');

        const descriptions = operations.map((operation) => generateDescriptionText(operation));
        const tracker = new ProgressTracker();
        tracker.start(descriptions.length);

        const batchFailures: EmbeddingFailure[] = [];
        const itemFailures: EmbeddingFailure[] = [];
        const successes = await generateEmbeddings(
            descriptions,
            envConfig.model,
            envConfig.batchSize,
            tracker,
            (error, batchStartIndex, batchSizeValue) => {
                logger.warn(
                    { err: error, batchStartIndex, batchSize: batchSizeValue },
                    'Batch processing failed; attempting per-item fallback',
                );
                batchFailures.push({
                    index: batchStartIndex,
                    operationId: operations[batchStartIndex]?.operationId ?? 'unknown',
                    reason: toErrorMessage(error),
                });
            },
            (error, failedIndex) => {
                const operation = operations[failedIndex];
                itemFailures.push({
                    index: failedIndex,
                    operationId: operation?.operationId ?? 'unknown',
                    reason: toErrorMessage(error),
                });
                logger.error({ err: error, failedIndex, operationId: operation?.operationId }, 'Failed to generate embedding');
            },
        );

        tracker.finish();

        successes.sort((a, b) => a.index - b.index);

        const successfulResults: EmbeddingResult[] = successes.map(({ index, vector }) => {
            const operation = operations[index];

            return {
                operation_id: operation.operationId,
                vector: Array.from(vector),
                model: envConfig.model,
                description_text: descriptions[index],
                created_at: new Date().toISOString(),
            };
        });

        await saveEmbeddings(successfulResults, DEFAULT_OUTPUT_PATH, envConfig.model);

        const totalFailures = itemFailures.length;
        const hasFailures = totalFailures > 0;

        logger.info(
            {
                totalOperations: operations.length,
                processed: successfulResults.length,
                totalFailures,
                batchFailures,
                itemFailures,
            },
            'Embedding generation completed',
        );

        if (hasFailures) {
            return 2;
        }

        return 0;
    } catch (error) {
        logger.fatal({ err: error }, 'Embedding generation failed');
        return 1;
    }
}

async function run(): Promise<void> {
    const exitCode = await main();
    process.exit(exitCode);
}

const executedFromCli = (): boolean => {
    if (!process.argv[1]) {
        return false;
    }

    try {
        const executedUrl = pathToFileURL(path.resolve(process.argv[1])).href;
        return executedUrl === import.meta.url;
    } catch (error) {
        logger.warn({ err: error }, 'Failed to determine CLI execution context');
        return false;
    }
};

if (executedFromCli()) {
    run().catch((error) => {
        logger.fatal({ err: error }, 'Unhandled error during embeddings generation');
        process.exit(1);
    });
}

export { main };
