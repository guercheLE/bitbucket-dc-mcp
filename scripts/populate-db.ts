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
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import type { Database } from 'better-sqlite3';
import DatabaseConstructor from 'better-sqlite3';
import { getLoadablePath, load as loadVecExtension } from 'sqlite-vec';

export const VECTOR_DIMENSIONS = 768;
const SCHEMA_VERSION = '1.0.0';
const OPENAPI_VERSION = '11.0.1';
const PROGRESS_INTERVAL = 100;

export interface OperationRow {
    operation_id: string;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
    summary: string;
    description?: string;
    tags?: string[];
    parameters?: unknown[];
    requestBody?: unknown | null;
    responses?: Record<string, unknown>;
    deprecated?: boolean;
}

export interface EmbeddingRow {
    operation_id: string;
    vector: number[];
}

export interface DatabaseStats {
    operationsCount: number;
    embeddingsCount: number;
    nullCount: number;
    orphanedCount: number;
}

const SCHEMA_SQL = `
CREATE TABLE operations (
    operation_id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    parameters TEXT,
    request_body TEXT,
    responses TEXT,
    deprecated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE embeddings USING vec0(
    operation_id TEXT PRIMARY KEY,
    vector FLOAT[${VECTOR_DIMENSIONS}]
);

CREATE TABLE schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operations_method ON operations(method);
CREATE INDEX idx_operations_deprecated ON operations(deprecated) WHERE deprecated = 0;
`.trim();

function ensureDirectoryFor(pathname: string): void {
    const directory = path.dirname(pathname);
    if (!directory || directory === '.') {
        return;
    }

    if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
    }
}

function resolveVecVersion(db: Database): string {
    const row = db.prepare('SELECT vec_version() AS version').get() as { version?: string } | undefined;
    return row?.version ?? 'unknown';
}

export function createDatabase(dbPath: string): Database {
    ensureDirectoryFor(dbPath);

    if (dbPath !== ':memory:' && existsSync(dbPath)) {
        console.warn('[populate-db] Deleting existing database:', dbPath);
        unlinkSync(dbPath);
    }

    const db = new DatabaseConstructor(dbPath);

    try {
        loadVecExtension(db);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        let attemptedPath = 'unknown';
        try {
            attemptedPath = getLoadablePath();
        } catch (resolveError) {
            attemptedPath = resolveError instanceof Error ? resolveError.message : String(resolveError);
        }
        throw new Error(`Failed to load sqlite-vec extension (attempted path: ${attemptedPath}): ${message}`);
    }

    if (dbPath !== ':memory:') {
        db.pragma('journal_mode = WAL');
    }
    db.exec(SCHEMA_SQL);

    const insertMetadata = db.prepare('INSERT INTO schema_metadata (key, value) VALUES (?, ?)');
    insertMetadata.run('version', SCHEMA_VERSION);
    insertMetadata.run('built_at', new Date().toISOString());
    insertMetadata.run('openapi_version', OPENAPI_VERSION);

    console.info('[populate-db] sqlite-vec version:', resolveVecVersion(db));

    return db;
}

export async function loadOperations(filePath: string): Promise<OperationRow[]> {
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as { operations: unknown[] } | unknown[];
    const rawOperations = Array.isArray(parsed) ? parsed : parsed.operations;

    // Map camelCase JSON to snake_case interface
    return rawOperations.map((op: any) => ({
        operation_id: op.operationId || op.operation_id,
        path: op.path,
        method: (op.method || 'GET').toUpperCase() as any,
        summary: op.summary,
        description: op.description,
        tags: op.tags,
        parameters: op.parameters,
        requestBody: op.requestBody || op.request_body,
        responses: op.responses,
        deprecated: op.deprecated || false,
    }));
}

export async function loadEmbeddings(filePath: string): Promise<EmbeddingRow[]> {
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as { embeddings: EmbeddingRow[] } | EmbeddingRow[];
    // Handle both formats: direct array or object with embeddings key
    return Array.isArray(parsed) ? parsed : parsed.embeddings;
}

function serializeJson(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    return JSON.stringify(value);
}

function logProgress(prefix: string, current: number, total: number): void {
    if (total === 0) {
        return;
    }

    if (current % PROGRESS_INTERVAL === 0 || current === total) {
        const percentage = Math.round((current / total) * 100);
        console.log(`[populate-db] ${prefix}: ${current}/${total} (${percentage}%)...`);
    }
}

export function insertOperations(db: Database, operations: OperationRow[]): number {
    if (operations.length === 0) {
        return 0;
    }

    const statement = db.prepare(
        `INSERT INTO operations (operation_id, path, method, summary, description, tags, parameters, request_body, responses, deprecated)
     VALUES (@operation_id, @path, @method, @summary, @description, @tags, @parameters, @request_body, @responses, @deprecated)`
            .replace(/\s+/g, ' '),
    );

    let inserted = 0;
    const total = operations.length;

    const insertTransaction = db.transaction((rows: OperationRow[]) => {
        for (const row of rows) {
            try {
                statement.run({
                    operation_id: row.operation_id,
                    path: row.path,
                    method: row.method,
                    summary: row.summary,
                    description: row.description ?? null,
                    tags: serializeJson(row.tags ?? []),
                    parameters: serializeJson(row.parameters ?? []),
                    request_body: serializeJson(row.requestBody ?? null),
                    responses: serializeJson(row.responses ?? {}),
                    deprecated: row.deprecated ? 1 : 0,
                });
                inserted += 1;
                logProgress('Inserting operations', inserted, total);
            } catch (error) {
                if (error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                    console.warn('[populate-db] Duplicate operation_id detected, skipping:', row.operation_id);
                    continue;
                }
                throw error;
            }
        }
    });

    insertTransaction(operations);

    return inserted;
}

export function insertEmbeddings(db: Database, embeddings: EmbeddingRow[]): number {
    if (embeddings.length === 0) {
        return 0;
    }

    const statement = db.prepare(
        'INSERT INTO embeddings (operation_id, vector) VALUES (?, vec_f32(?))',
    );

    let inserted = 0;
    const total = embeddings.length;

    const insertTransaction = db.transaction((rows: EmbeddingRow[]) => {
        for (const row of rows) {
            if (row.vector.length !== VECTOR_DIMENSIONS) {
                throw new Error(
                    `Embedding for operation "${row.operation_id}" has incorrect dimension (${row.vector.length}). Expected ${VECTOR_DIMENSIONS}.`,
                );
            }

            const buffer = Buffer.from(new Float32Array(row.vector).buffer);

            try {
                statement.run(row.operation_id, buffer);
                inserted += 1;
                logProgress('Inserting embeddings', inserted, total);
            } catch (error) {
                if (error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                    console.warn('[populate-db] Duplicate embedding detected, skipping:', row.operation_id);
                    continue;
                }
                if (error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                    console.error('[populate-db] Embedding skipped, missing operation_id:', row.operation_id);
                    continue;
                }
                throw error;
            }
        }
    });

    insertTransaction(embeddings);

    return inserted;
}

export function validateDatabase(
    db: Database,
    expected: { operations: number; embeddings: number },
): DatabaseStats {
    const operationsRow = db.prepare('SELECT COUNT(*) AS count FROM operations').get() as { count?: number } | undefined;
    const embeddingsRow = db.prepare('SELECT COUNT(*) AS count FROM embeddings').get() as { count?: number } | undefined;
    const nullRow = db
        .prepare('SELECT COUNT(*) AS count FROM operations WHERE operation_id IS NULL OR summary IS NULL')
        .get() as { count?: number } | undefined;
    const orphanedRow = db
        .prepare(
            `SELECT COUNT(*) AS count
       FROM operations o
       LEFT JOIN embeddings e ON o.operation_id = e.operation_id
       WHERE e.operation_id IS NULL`,
        )
        .get() as { count?: number } | undefined;

    const stats: DatabaseStats = {
        operationsCount: operationsRow?.count ?? 0,
        embeddingsCount: embeddingsRow?.count ?? 0,
        nullCount: nullRow?.count ?? 0,
        orphanedCount: orphanedRow?.count ?? 0,
    };

    if (stats.operationsCount !== expected.operations) {
        throw new Error(
            `[populate-db] Operation count mismatch. Expected ${expected.operations}, found ${stats.operationsCount}.`,
        );
    }

    if (stats.embeddingsCount !== expected.embeddings) {
        throw new Error(
            `[populate-db] Embedding count mismatch. Expected ${expected.embeddings}, found ${stats.embeddingsCount}.`,
        );
    }

    if (stats.nullCount > 0) {
        throw new Error(`[populate-db] Null values detected in operations table (${stats.nullCount}).`);
    }

    if (stats.orphanedCount > 0) {
        throw new Error(`[populate-db] Orphaned operations detected (${stats.orphanedCount}).`);
    }

    return stats;
}

function getFileSizeMb(filePath: string): number | null {
    if (filePath === ':memory:' || !existsSync(filePath)) {
        return null;
    }

    const { size } = statSync(filePath);
    return size / (1024 * 1024);
}

export function optimizeDatabase(db: Database, dbPath: string): { beforeSize: number | null; afterSize: number | null } {
    const beforeSize = getFileSizeMb(dbPath);

    db.exec('ANALYZE;');
    db.exec('VACUUM;');

    const afterSize = getFileSizeMb(dbPath);

    if (beforeSize !== null && afterSize !== null) {
        console.log(
            `[populate-db] Database optimized: ${beforeSize.toFixed(2)}MB → ${afterSize.toFixed(2)}MB`,
        );
    } else {
        console.log('[populate-db] Database optimized (size unavailable for in-memory database).');
    }

    return { beforeSize, afterSize };
}

function ensureFileExists(filePath: string, friendlyName: string): void {
    if (!existsSync(filePath)) {
        throw new Error(
            `${friendlyName} not found at ${filePath}. Run the prerequisite scripts (stories 1.2-1.4) before populating the database.`,
        );
    }
}

function formatDuration(seconds: number): string {
    return `${seconds.toFixed(2)}s`;
}

export async function runPopulateDatabase(dbPath: string): Promise<void> {
    const start = performance.now();

    const operationsPath = path.resolve('data/operations.json');
    const embeddingsPath = path.resolve('data/embeddings.json');
    const resolvedDbPath = path.resolve(dbPath);

    ensureFileExists(operationsPath, 'Operations dataset');
    ensureFileExists(embeddingsPath, 'Embeddings dataset');

    const [operations, embeddings] = await Promise.all([
        loadOperations(operationsPath),
        loadEmbeddings(embeddingsPath),
    ]);

    const db = createDatabase(resolvedDbPath);

    try {
        const operationsInserted = insertOperations(db, operations);
        const embeddingsInserted = insertEmbeddings(db, embeddings);
        const stats = validateDatabase(db, { operations: operationsInserted, embeddings: embeddingsInserted });

        optimizeDatabase(db, resolvedDbPath);

        const durationSeconds = (performance.now() - start) / 1000;

        console.log('[populate-db] Population completed successfully.');
        console.log(
            `[populate-db] Totals → operations: ${stats.operationsCount}, embeddings: ${stats.embeddingsCount}, elapsed: ${formatDuration(
                durationSeconds,
            )}`,
        );
    } finally {
        db.close();
    }
}

async function main(): Promise<void> {
    try {
        await runPopulateDatabase('data/embeddings.db');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[populate-db] Failed:', message);
        process.exitCode = 1;
    }
}

const isMainModule: boolean = (() => {
    try {
        const executedPath = process.argv[1];
        if (!executedPath) {
            return false;
        }

        return fileURLToPath(import.meta.url) === path.resolve(executedPath);
    } catch {
        return false;
    }
})();

if (isMainModule) {
    void main();
}
