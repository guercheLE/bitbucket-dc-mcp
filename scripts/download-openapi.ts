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

import fetch from 'node-fetch';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import type {
    OpenAPIObject,
    OperationObject,
    ParameterObject,
    PathItemObject,
    ReferenceObject,
    RequestBodyObject,
    ResponseObject,
    SchemaObject,
} from 'openapi3-ts/oas30';

const OPENAPI_SPEC_URL =
    'https://dac-static.atlassian.com/server/bitbucket/10.0.swagger.v3.json?_v=1.637.23';
const OPENAPI_LOCAL_PATH = path.resolve('data/openapi-spec.json');
const OUTPUT_DIR = path.resolve('data');

const RESOURCE_PREFIXES = new Set([
    'access',
    'admin',
    'application',
    'audit',
    'branch',
    'branches',
    'build',
    'builds',
    'capabilities',
    'comment',
    'comments',
    'commit',
    'commits',
    'dashboard',
    'default',
    'deployment',
    'deployments',
    'diff',
    'export',
    'exports',
    'group',
    'groups',
    'hook',
    'hooks',
    'import',
    'imports',
    'jira',
    'label',
    'labels',
    'log',
    'logs',
    'markup',
    'mesh',
    'migration',
    'mirror',
    'mirroring',
    'permission',
    'permissions',
    'profile',
    'project',
    'projects',
    'pull',
    'ref',
    'refs',
    'repo',
    'repos',
    'repository',
    'repositories',
    'restriction',
    'restrictions',
    'review',
    'reviewer',
    'reviewers',
    'search',
    'secret',
    'setting',
    'settings',
    'ssh',
    'sync',
    'tag',
    'tags',
    'task',
    'tasks',
    'test',
    'token',
    'tokens',
    'upstream',
    'user',
    'users',
    'webhook',
    'webhooks',
    'workflow',
]);

type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

const HTTP_METHODS: HttpMethod[] = [
    'get',
    'put',
    'post',
    'delete',
    'patch',
    'options',
    'head',
    'trace',
];

export interface Operation {
    operationId: string;
    path: string;
    method: string;
    summary: string;
    description?: string;
    tags: string[];
    parameters: ParameterObject[];
    requestBody?: RequestBodyObject;
    responses: Record<string, ResponseObject>;
}

export interface GenerationMetadata {
    generatedAt: string;
    openapiVersion: string;
    bitbucketVersion: string;
    totalOperations: number;
    totalSchemas: number;
}

class ScriptError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = this.constructor.name;
    }
}

type FetchResponseLike = {
    status: number;
    statusText: string;
};

export class NetworkError extends ScriptError {
    constructor(url: string, responseOrCause: FetchResponseLike | Error) {
        if (isFetchResponse(responseOrCause)) {
            super(`Failed to download OpenAPI spec from ${url}: ${responseOrCause.status} ${responseOrCause.statusText}`);
            return;
        }

        const error = responseOrCause as Error;
        super(`Failed to download OpenAPI spec from ${url}: ${error.message}`, error);
    }
}

function isFetchResponse(value: unknown): value is FetchResponseLike {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.status === 'number' && typeof candidate.statusText === 'string';
}

export class ValidationError extends ScriptError {
    constructor(message: string, public readonly details?: unknown) {
        super(
            `OpenAPI validation failed: ${message}`,
            details instanceof Error ? details : undefined,
        );
    }
}

export class ParsingError extends ScriptError {
    constructor(field: string, cause: Error) {
        super(`Failed to parse field '${field}': ${cause.message}`, cause);
    }
}

export async function downloadSpec(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new NetworkError(url, response);
        }

        return await response.text();
    } catch (error) {
        if (error instanceof NetworkError) {
            throw error;
        }
        throw new NetworkError(url, error as Error);
    }
}

export async function loadLocalSpec(localPath: string): Promise<string> {
    try {
        return await readFile(localPath, 'utf8');
    } catch (error) {
        throw new ParsingError(
            `local file at ${localPath}`,
            error instanceof Error ? error : new Error('Unknown error'),
        );
    }
}

export function parseSpec(rawSpec: string): OpenAPIDocument {
    try {
        const parsed = JSON.parse(rawSpec) as OpenAPIDocument;
        return parsed;
    } catch (error) {
        throw new ParsingError('JSON', error as Error);
    }
}

type OpenAPIDocument = OpenAPIObject;

export async function validateOpenAPISpec(spec: unknown): Promise<boolean> {
    const document = spec as Partial<OpenAPIDocument>;
    if (!document || typeof document !== 'object') {
        throw new ValidationError('Spec is not an object');
    }

    const { openapi, info, paths, components } = document;

    const openapiVersionPattern = /^3\.(0|1)\./;

    if (typeof openapi !== 'string' || !openapiVersionPattern.test(openapi)) {
        throw new ValidationError('OpenAPI version must be 3.0.x or 3.1.x', { openapi });
    }

    if (!info || typeof info !== 'object') {
        throw new ValidationError('Missing info object');
    }

    if (!paths || typeof paths !== 'object' || Object.keys(paths).length === 0) {
        throw new ValidationError('Missing or empty paths object');
    }

    if (!components || typeof components !== 'object' || !components.schemas) {
        throw new ValidationError('Missing components.schemas object');
    }

    return true;
}

function mergeParameters(
    pathParams: (ParameterObject | ReferenceObject)[] = [],
    operationParams: (ParameterObject | ReferenceObject)[] = [],
): ParameterObject[] {
    const seen = new Set<string>();
    const merged: ParameterObject[] = [];

    const addParam = (param: ParameterObject) => {
        const key = `${param.name}:${param.in}`;
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(param);
        }
    };

    [...pathParams, ...operationParams]
        .filter((param): param is ParameterObject =>
            param !== undefined && !isReferenceObject(param),
        )
        .forEach(addParam);

    return merged;
}

function stripCamelPrefix(value: string): string {
    for (const prefix of RESOURCE_PREFIXES) {
        if (!value.startsWith(prefix)) {
            continue;
        }

        const nextChar = value.charAt(prefix.length);
        if (nextChar === '-' || nextChar === '_') {
            return value.slice(prefix.length + 1);
        }

        if (nextChar && /[A-Z]/.test(nextChar)) {
            return value.slice(prefix.length);
        }
    }

    return value;
}

export function normalizeOperationId(operationId: string): string {
    let working = operationId.trim();

    working = stripCamelPrefix(working);

    const snake = working
        .replace(/-/g, '_')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/\s+/g, '_')
        .replace(/__+/g, '_')
        .toLowerCase();

    return snake.replace(/^_+/, '');
}

const sanitizeSuffix = (value: string): string => {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
};

const collectPathSuffixes = (pathKey: string): string[] => {
    const segments = pathKey
        .split('/')
        .map((segment) => segment.replace(/[{}]/g, ''))
        .map(sanitizeSuffix)
        .filter(Boolean);
    if (segments.length === 0) {
        return [];
    }
    const suffixes = new Set<string>();
    const last = segments[segments.length - 1];
    suffixes.add(last);
    if (segments.length > 1) {
        suffixes.add(segments.slice(-2).join('_'));
    }
    return Array.from(suffixes);
};

const ensureUniqueOperationId = (
    baseId: string,
    operation: OperationObject,
    usedIds: Set<string>,
    collisionCounts: Map<string, number>,
    pathKey: string,
    method: string,
): string => {
    if (!usedIds.has(baseId)) {
        usedIds.add(baseId);
        collisionCounts.set(baseId, 1);
        return baseId;
    }

    const tryCandidate = (candidate: string | undefined): string | undefined => {
        if (!candidate) {
            return undefined;
        }
        if (usedIds.has(candidate)) {
            return undefined;
        }
        usedIds.add(candidate);
        collisionCounts.set(baseId, (collisionCounts.get(baseId) ?? 1) + 1);
        return candidate;
    };

    for (const tag of operation.tags ?? []) {
        const suffix = sanitizeSuffix(tag);
        const candidate = tryCandidate(suffix ? `${baseId}_${suffix}` : undefined);
        if (candidate) {
            return candidate;
        }
    }

    for (const suffix of collectPathSuffixes(pathKey)) {
        const candidate = tryCandidate(suffix ? `${baseId}_${suffix}` : undefined);
        if (candidate) {
            return candidate;
        }
    }

    const methodCandidate = tryCandidate(`${baseId}_${method}`);
    if (methodCandidate) {
        return methodCandidate;
    }

    let index = collisionCounts.get(baseId) ?? 1;
    let fallback: string;
    do {
        index += 1;
        fallback = `${baseId}_${index}`;
    } while (usedIds.has(fallback));
    usedIds.add(fallback);
    collisionCounts.set(baseId, index);
    return fallback;
};

function isReferenceObject(value: unknown): value is ReferenceObject {
    return Boolean(value) && typeof value === 'object' && '$ref' in (value as Record<string, unknown>);
}

export function extractOperations(spec: OpenAPIDocument): Operation[] {
    const operations: Operation[] = [];
    const usedIds = new Set<string>();
    const collisionCounts = new Map<string, number>();

    const pathEntries = Object.entries(spec.paths ?? {}) as Array<[
        string,
        PathItemObject | undefined,
    ]>;

    for (const [pathKey, pathItem] of pathEntries) {
        if (!pathItem) {
            continue;
        }

        const pathParameters = Array.isArray(pathItem.parameters)
            ? pathItem.parameters.filter((param): param is ParameterObject => !isReferenceObject(param))
            : [];

        for (const method of HTTP_METHODS) {
            const operationObject = pathItem[method];
            if (!operationObject) {
                continue;
            }

            const operation = operationObject as OperationObject;

            if (operation.deprecated) {
                continue;
            }

            if (!operation.operationId) {
                continue;
            }

            const normalisedId = normalizeOperationId(operation.operationId);
            const uniqueId = ensureUniqueOperationId(
                normalisedId,
                operation,
                usedIds,
                collisionCounts,
                pathKey,
                method,
            );

            const operationParameters = Array.isArray(operation.parameters)
                ? operation.parameters.filter((param): param is ParameterObject => !isReferenceObject(param))
                : [];

            const parameters = mergeParameters(pathParameters, operationParameters);

            const responses: Record<string, ResponseObject> = {};
            const responseEntries = Object.entries(operation.responses ?? {}) as Array<[
                string,
                ResponseObject | ReferenceObject | undefined,
            ]>;

            for (const [status, response] of responseEntries) {
                if (!response) {
                    continue;
                }
                if (isReferenceObject(response)) {
                    // Resolve reference for responses
                    try {
                        const resolved = resolveReference(response.$ref, spec, 0, new Set<string>());
                        if (resolved) {
                            // Convert resolved schema to ResponseObject
                            responses[status] = {
                                description: `Resolved from ${response.$ref}`,
                                content: {
                                    'application/json': {
                                        schema: resolved
                                    }
                                }
                            };
                        }
                    } catch (error) {
                        console.warn(`Failed to resolve response reference ${response.$ref}:`, error);
                    }
                } else {
                    // Resolve refs within the response content schemas
                    const responseObj = response as ResponseObject;
                    if (responseObj.content) {
                        for (const [contentType, mediaType] of Object.entries(responseObj.content)) {
                            if (mediaType.schema) {
                                try {
                                    responseObj.content[contentType].schema = resolveSchema(
                                        mediaType.schema,
                                        spec,
                                        0,
                                        new Set<string>()
                                    );
                                } catch (error) {
                                    // Ignore errors, keep original schema
                                }
                            }
                        }
                    }
                    responses[status] = responseObj;
                }
            }

            let requestBody: RequestBodyObject | undefined;
            if (operation.requestBody) {
                if (isReferenceObject(operation.requestBody)) {
                    // Resolve reference for request body
                    try {
                        const resolved = resolveReference(operation.requestBody.$ref, spec, 0, new Set<string>());
                        if (resolved) {
                            // Convert resolved schema to RequestBodyObject
                            requestBody = {
                                description: `Resolved from ${operation.requestBody.$ref}`,
                                content: {
                                    'application/json': {
                                        schema: resolved
                                    }
                                }
                            };
                        }
                    } catch (error) {
                        console.warn(`Failed to resolve request body reference ${operation.requestBody.$ref}:`, error);
                    }
                } else {
                    // Resolve refs within the request body content schemas
                    const requestBodyObj = operation.requestBody as RequestBodyObject;
                    if (requestBodyObj.content) {
                        for (const [contentType, mediaType] of Object.entries(requestBodyObj.content)) {
                            if (mediaType.schema) {
                                try {
                                    requestBodyObj.content[contentType].schema = resolveSchema(
                                        mediaType.schema,
                                        spec,
                                        0,
                                        new Set<string>()
                                    );
                                } catch (error) {
                                    // Ignore errors, keep original schema
                                }
                            }
                        }
                    }
                    requestBody = requestBodyObj;
                }
            }

            // Normalize path: prepend /rest/ if not already present
            // OpenAPI specs have paths like /api/2/issue or /agile/1.0/board
            // But Bitbucket needs /rest/api/2/issue or /rest/agile/1.0/board
            const normalizedPath = pathKey.startsWith('/rest/') ? pathKey : `/rest${pathKey}`;

            operations.push({
                operationId: uniqueId,
                path: normalizedPath,
                method,
                summary: operation.summary ?? '',
                description: operation.description ?? operation.summary ?? undefined,
                tags: operation.tags ?? [],
                parameters,
                requestBody,
                responses,
            });
        }
    }

    return operations;
}

function resolveReference(
    ref: string,
    spec: OpenAPIDocument,
    depth: number,
    seen: Set<string>,
): SchemaObject | undefined {
    const match = ref.match(/^#\/components\/schemas\/(.+)$/);
    if (!match) {
        return undefined;
    }

    const schemaName = match[1];
    
    // Prevent circular references
    if (seen.has(schemaName)) {
        return spec.components?.schemas?.[schemaName] as SchemaObject;
    }

    const target = spec.components?.schemas?.[schemaName];
    if (!target) {
        return undefined;
    }

    seen.add(schemaName);
    return resolveSchema(target, spec, depth + 1, seen);
}

function hasCircularRef(schemaOrRef: unknown, seen: Set<string>): boolean {
    if (!schemaOrRef || typeof schemaOrRef !== 'object') {
        return false;
    }
    
    if ('$ref' in schemaOrRef) {
        const ref = (schemaOrRef as ReferenceObject).$ref;
        const match = ref.match(/^#\/components\/schemas\/(.+)$/);
        if (match && seen.has(match[1])) {
            return true;
        }
    }
    
    return false;
}

function resolveSchema(
    schemaOrRef: SchemaObject | ReferenceObject,
    spec: OpenAPIDocument,
    depth: number,
    seen: Set<string>,
): SchemaObject {
    if ('$ref' in schemaOrRef) {
        const resolved = resolveReference(schemaOrRef.$ref, spec, depth, seen);
        if (!resolved) {
            throw new ParsingError(
                schemaOrRef.$ref,
                new Error('Unable to resolve schema reference'),
            );
        }
        return resolved;
    }

    const schema: SchemaObject = { ...schemaOrRef };

    if (schema.properties) {
        const resolvedProperties: Record<string, SchemaObject> = {};
        for (const [key, propertySchema] of Object.entries(schema.properties)) {
            // Skip properties with circular references
            if (hasCircularRef(propertySchema, seen)) {
                continue;
            }
            try {
                resolvedProperties[key] = resolveSchema(
                    propertySchema as SchemaObject | ReferenceObject,
                    spec,
                    depth + 1,
                    seen,
                );
            } catch (error) {
                // Skip properties that fail to resolve (likely circular)
                continue;
            }
        }
        schema.properties = resolvedProperties;
    }

    if (schema.items) {
        // Skip items with circular references
        if (!hasCircularRef(schema.items, seen)) {
            try {
                schema.items = resolveSchema(schema.items as SchemaObject | ReferenceObject, spec, depth + 1, seen);
            } catch (error) {
                // Remove items if they can't be resolved (likely circular)
                delete schema.items;
            }
        } else {
            delete schema.items;
        }
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        if (!hasCircularRef(schema.additionalProperties, seen)) {
            try {
                schema.additionalProperties = resolveSchema(
                    schema.additionalProperties as SchemaObject | ReferenceObject,
                    spec,
                    depth + 1,
                    seen,
                );
            } catch (error) {
                delete schema.additionalProperties;
            }
        } else {
            delete schema.additionalProperties;
        }
    }

    if (schema.allOf) {
        const resolvedAllOf = [];
        for (const item of schema.allOf) {
            if (!hasCircularRef(item, seen)) {
                try {
                    resolvedAllOf.push(resolveSchema(item as SchemaObject | ReferenceObject, spec, depth + 1, seen));
                } catch (error) {
                    // Skip items that fail
                }
            }
        }
        schema.allOf = resolvedAllOf.length > 0 ? resolvedAllOf : undefined;
    }

    if (schema.anyOf) {
        const resolvedAnyOf = [];
        for (const item of schema.anyOf) {
            if (!hasCircularRef(item, seen)) {
                try {
                    resolvedAnyOf.push(resolveSchema(item as SchemaObject | ReferenceObject, spec, depth + 1, seen));
                } catch (error) {
                    // Skip items that fail
                }
            }
        }
        schema.anyOf = resolvedAnyOf.length > 0 ? resolvedAnyOf : undefined;
    }

    if (schema.oneOf) {
        const resolvedOneOf = [];
        for (const item of schema.oneOf) {
            if (!hasCircularRef(item, seen)) {
                try {
                    resolvedOneOf.push(resolveSchema(item as SchemaObject | ReferenceObject, spec, depth + 1, seen));
                } catch (error) {
                    // Skip items that fail
                }
            }
        }
        schema.oneOf = resolvedOneOf.length > 0 ? resolvedOneOf : undefined;
    }

    if (schema.not) {
        if (!hasCircularRef(schema.not, seen)) {
            try {
                schema.not = resolveSchema(schema.not as SchemaObject | ReferenceObject, spec, depth + 1, seen);
            } catch (error) {
                delete schema.not;
            }
        } else {
            delete schema.not;
        }
    }

    return schema;
}

export function extractSchemas(spec: OpenAPIDocument): Record<string, SchemaObject> {
    const schemas: Record<string, SchemaObject> = {};
    const sourceSchemas = spec.components?.schemas ?? {};

    for (const [schemaName, schema] of Object.entries(sourceSchemas)) {
        const resolved = resolveSchema(schema, spec, 0, new Set<string>());
        schemas[schemaName] = resolved;
    }

    return schemas;
}

export async function saveOperations(
    operations: Operation[],
    metadata: GenerationMetadata,
    outputPath: string,
): Promise<void> {
    await mkdir(path.dirname(outputPath), { recursive: true });

    const payload = {
        _metadata: {
            generated_at: metadata.generatedAt,
            openapi_version: metadata.openapiVersion,
            bitbucket_version: metadata.bitbucketVersion,
            total_operations: metadata.totalOperations,
            total_schemas: metadata.totalSchemas,
        },
        operations,
    };

    await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
}

export async function saveSchemas(
    schemas: Record<string, SchemaObject>,
    metadata: GenerationMetadata,
    outputPath: string,
): Promise<void> {
    await mkdir(path.dirname(outputPath), { recursive: true });

    const payload = {
        _metadata: {
            generated_at: metadata.generatedAt,
            openapi_version: metadata.openapiVersion,
            bitbucket_version: metadata.bitbucketVersion,
            total_operations: metadata.totalOperations,
            total_schemas: metadata.totalSchemas,
        },
        schemas,
    };

    await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
}

function logProgress(message: string): void {
    console.log(`[download-openapi] ${message}`);
}

function parseArguments(argv: string[]): { url?: string; local?: string; help?: boolean } {
    const args: { url?: string; local?: string; help?: boolean } = {};

    for (let index = 0; index < argv.length; index += 1) {
        const current = argv[index];
        if (current === '--help') {
            args.help = true;
            break;
        }

        if (current === '--url') {
            const value = argv[index + 1];
            if (!value || value.startsWith('--')) {
                throw new ValidationError('Missing value for --url option');
            }
            args.url = value;
            index += 1;
            continue;
        }

        if (current === '--local') {
            const value = argv[index + 1];
            if (!value || value.startsWith('--')) {
                throw new ValidationError('Missing value for --local option');
            }
            args.local = value;
            index += 1;
        }
    }

    return args;
}

function printHelp(): void {
    console.log(`Usage: npm run download-openapi [options]

Download and parse Bitbucket Data Center OpenAPI specification

Options:
  --url <url>      Download OpenAPI spec from URL (default: ${OPENAPI_SPEC_URL})
  --local <path>   Use local OpenAPI spec file (default: ${OPENAPI_LOCAL_PATH})
  --help           Show this help message

Examples:
  npm run download-openapi
  npm run download-openapi -- --url https://example.com/openapi.json
  npm run download-openapi -- --local ./downloaded-spec.json

Output:
  data/operations.json - Parsed operations metadata
  data/schemas.json    - Extracted OpenAPI schemas
`);
}

async function main(): Promise<void> {
    const args = parseArguments(process.argv.slice(2));

    if (args.help) {
        printHelp();
        return;
    }

    if (args.url && args.local) {
        throw new ValidationError('Cannot use --url and --local simultaneously');
    }

    const sourceDescription = args.url ? `URL ${args.url}` : args.local ? `local path ${args.local}` : `default URL ${OPENAPI_SPEC_URL}`;
    logProgress(`Starting download using ${sourceDescription}`);

    const rawSpec = args.local
        ? await loadLocalSpec(args.local ?? OPENAPI_LOCAL_PATH)
        : await downloadSpec(args.url ?? OPENAPI_SPEC_URL);

    logProgress('Spec retrieved, validating...');

    const document = parseSpec(rawSpec);
    await validateOpenAPISpec(document);

    logProgress(`OpenAPI version ${document.openapi} validated successfully`);

    logProgress('Extracting operations...');
    const operations = extractOperations(document);
    logProgress(`Extracted ${operations.length} operations`);

    logProgress('Extracting schemas...');
    const schemas = extractSchemas(document);
    logProgress(`Extracted ${Object.keys(schemas).length} schemas`);

    const metadata: GenerationMetadata = {
        generatedAt: new Date().toISOString(),
        openapiVersion: document.openapi,
        bitbucketVersion: document.info?.version ?? 'unknown',
        totalOperations: operations.length,
        totalSchemas: Object.keys(schemas).length,
    };

    const operationsPath = path.join(OUTPUT_DIR, 'operations.json');
    const schemasPath = path.join(OUTPUT_DIR, 'schemas.json');

    logProgress(`Saving operations to ${operationsPath}`);
    await saveOperations(operations, metadata, operationsPath);

    logProgress(`Saving schemas to ${schemasPath}`);
    await saveSchemas(schemas, metadata, schemasPath);

    logProgress('OpenAPI processing completed successfully');
}

const entrypointPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entrypointPath) {
    main().catch((error) => {
        if (error instanceof NetworkError) {
            console.error('Network error:', error.message);
        } else if (error instanceof ValidationError) {
            console.error('Validation error:', error.message);
            if (error.details) {
                console.error('Details:', error.details);
            }
        } else if (error instanceof ParsingError) {
            console.error('Parsing error:', error.message);
            if (error.cause) {
                console.error('Cause:', error.cause);
            }
        } else {
            console.error('Unexpected error:', error);
        }

        process.exitCode = 1;
    });
}

export {
    main, OPENAPI_LOCAL_PATH, OPENAPI_SPEC_URL, OUTPUT_DIR,
    parseArguments,
    printHelp
};

