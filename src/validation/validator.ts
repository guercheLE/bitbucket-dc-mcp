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

import { readFile } from 'node:fs/promises';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Represents a validation error with detailed information about what went wrong.
 */
export interface ValidationError {
  /** The path to the field that failed validation (e.g., 'fields.priority') */
  path: string;
  /** Human-readable error message suitable for LLM consumption */
  message: string;
  /** The expected type or format */
  expected: string;
  /** The actual type or value received */
  received: string;
}

/**
 * Result of validation operation.
 *
 * @template T - The type of the validated data
 */
export interface ValidationResult<T = unknown> {
  /** Whether validation succeeded */
  success: boolean;
  /** Parsed and validated data (only present if success is true) */
  data?: T;
  /** Validation errors (only present if success is false) */
  errors?: ValidationError[];
}

interface OperationDefinition {
  operationId: string;
  parameters?: ParameterDefinition[];
  requestBody?: RequestBodyDefinition;
}

interface ParameterDefinition {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema?: SchemaDefinition;
}

interface RequestBodyDefinition {
  required?: boolean;
  content?: {
    'application/json'?: {
      schema?: SchemaDefinition;
    };
  };
}

interface SchemaDefinition {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaDefinition>;
  required?: string[];
  items?: SchemaDefinition;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  $ref?: string;
  anyOf?: SchemaDefinition[];
  oneOf?: SchemaDefinition[];
  allOf?: SchemaDefinition[];
}

interface OperationsFile {
  operations: OperationDefinition[];
}

/**
 * LRU cache for operation schemas to optimize repeated validations.
 * Automatically evicts least recently used schemas when max size is reached.
 */
class SchemaCache {
  private cache = new Map<string, z.ZodSchema>();
  private maxSize;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(operationId: string): z.ZodSchema | undefined {
    const schema = this.cache.get(operationId);
    if (schema) {
      // Move to end (most recently used)
      this.cache.delete(operationId);
      this.cache.set(operationId, schema);
    }
    return schema;
  }

  set(operationId: string, schema: z.ZodSchema): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(operationId, schema);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  // Metrics for observability
  get metrics(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instance
const schemaCache = new SchemaCache(500);

// Operations data cache
let operationsData: OperationDefinition[] | null = null;

/**
 * Gets the package root directory.
 * Works in both development and production (compiled) environments.
 */
function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // From dist/validation/ go up two levels to package root
  return path.join(__dirname, '..', '..');
}

/**
 * Loads operations data from operations.json file.
 * Data is cached after first load.
 */
async function loadOperations(): Promise<OperationDefinition[]> {
  if (operationsData) {
    return operationsData;
  }

  const packageRoot = getPackageRoot();
  const filePath = path.join(packageRoot, 'data', 'operations.json');
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as OperationsFile;
  operationsData = parsed.operations;
  return operationsData;
}

/**
 * Converts an OpenAPI schema definition to a Zod schema.
 */
function convertSchemaToZod(
  schema: SchemaDefinition | undefined,
  refSchemas: Map<string, SchemaDefinition> = new Map(),
): z.ZodTypeAny {
  if (!schema) {
    return z.unknown();
  }

  // Handle $ref
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (refName && refSchemas.has(refName)) {
      return convertSchemaToZod(refSchemas.get(refName), refSchemas);
    }
    return z.unknown();
  }

  // Handle anyOf, oneOf, allOf
  if (schema.anyOf || schema.oneOf) {
    const options = schema.anyOf || schema.oneOf || [];
    if (options.length === 0) return z.unknown();
    const zodSchemas = options.map((opt) => convertSchemaToZod(opt, refSchemas));
    return z.union(zodSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }

  if (schema.allOf) {
    // For allOf, merge all schemas (simplified - just use the first non-empty one)
    for (const subSchema of schema.allOf) {
      const converted = convertSchemaToZod(subSchema, refSchemas);
      if (converted !== z.unknown()) {
        return converted;
      }
    }
    return z.unknown();
  }

  const {
    type,
    format,
    properties,
    required = [],
    items,
    minimum,
    maximum,
    minLength,
    maxLength,
    pattern,
  } = schema;

  // String type
  if (type === 'string') {
    let zodSchema = z.string();

    if (format === 'email') {
      zodSchema = zodSchema.email();
    } else if (format === 'uri' || format === 'url') {
      zodSchema = zodSchema.url();
    } else if (format === 'date-time') {
      zodSchema = zodSchema.datetime();
    } else if (format === 'date') {
      zodSchema = zodSchema.regex(/^\d{4}-\d{2}-\d{2}$/);
    } else if (format === 'uuid') {
      zodSchema = zodSchema.uuid();
    }

    if (minLength !== undefined) {
      zodSchema = zodSchema.min(minLength);
    }
    if (maxLength !== undefined) {
      zodSchema = zodSchema.max(maxLength);
    }
    if (pattern) {
      try {
        zodSchema = zodSchema.regex(new RegExp(pattern));
      } catch {
        // Invalid regex pattern, skip
      }
    }

    if (schema.enum) {
      return z.enum(schema.enum as [string, ...string[]]);
    }

    return zodSchema;
  }

  // Number/Integer type
  if (type === 'number' || type === 'integer') {
    let zodSchema = type === 'integer' ? z.number().int() : z.number();

    if (minimum !== undefined) {
      zodSchema = zodSchema.min(minimum);
    }
    if (maximum !== undefined) {
      zodSchema = zodSchema.max(maximum);
    }

    return zodSchema;
  }

  // Boolean type
  if (type === 'boolean') {
    return z.boolean();
  }

  // Array type
  if (type === 'array') {
    const itemSchema = items ? convertSchemaToZod(items, refSchemas) : z.unknown();
    return z.array(itemSchema);
  }

  // Object type
  if (type === 'object' || properties) {
    if (!properties || Object.keys(properties).length === 0) {
      return z.object({}).catchall(z.unknown());
    }

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, propSchema] of Object.entries(properties)) {
      let propZodSchema = convertSchemaToZod(propSchema, refSchemas);

      // Make optional if not in required array
      if (!required.includes(key)) {
        propZodSchema = propZodSchema.optional();
      }

      shape[key] = propZodSchema;
    }

    return z.object(shape);
  }

  // Default fallback
  return z.unknown();
}

/**
 * Retrieves or creates a Zod schema for the specified operation.
 * Schemas are cached for performance.
 *
 * @param operationId - The Bitbucket operation ID
 * @returns Zod schema for the operation, or null if operation not found
 */
async function getSchema(operationId: string): Promise<z.ZodSchema | null> {
  // Check cache first
  const cached = schemaCache.get(operationId);
  if (cached) {
    return cached;
  }

  // Load operations data
  const operations = await loadOperations();
  const operation = operations.find((op) => op.operationId === operationId);

  if (!operation) {
    return null;
  }

  // Build schema from operation definition
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  // Add path parameters
  if (operation.parameters) {
    for (const param of operation.parameters) {
      if (param.in === 'path' || param.in === 'query') {
        let paramSchema = convertSchemaToZod(param.schema);
        if (!param.required) {
          paramSchema = paramSchema.optional();
        }
        schemaShape[param.name] = paramSchema;
      }
    }
  }

  // Add request body fields
  if (operation.requestBody?.content?.['application/json']?.schema) {
    const bodySchema = operation.requestBody.content['application/json'].schema;

    // If body has properties, merge them into the root
    // Note: Some schemas don't have type='object' but still have properties
    if (bodySchema.properties) {
      for (const [key, propSchema] of Object.entries(bodySchema.properties)) {
        let propZodSchema = convertSchemaToZod(propSchema);

        // Check if required
        const isRequired = bodySchema.required?.includes(key) || operation.requestBody.required;
        if (!isRequired) {
          propZodSchema = propZodSchema.optional();
        }

        schemaShape[key] = propZodSchema;
      }
    } else {
      // If body is not an object, wrap it
      const bodyZodSchema = convertSchemaToZod(bodySchema);
      schemaShape.body = operation.requestBody.required ? bodyZodSchema : bodyZodSchema.optional();
    }
  }

  // Create final schema
  const schema = Object.keys(schemaShape).length > 0 ? z.object(schemaShape) : z.object({});

  // Cache and return
  schemaCache.set(operationId, schema);
  return schema;
}

/**
 * Formats Zod validation errors into LLM-readable error messages.
 *
 * @param zodErrors - Array of Zod issues from validation failure
 * @returns Array of formatted validation errors
 *
 * @example
 * // Input: Zod error for missing required field
 * // Output: { path: 'fields.summary', message: "Parameter 'fields.summary' is required but missing", expected: 'string', received: 'undefined' }
 */
function formatZodErrors(zodErrors: z.ZodIssue[]): ValidationError[] {
  return zodErrors.map((issue) => {
    const path = issue.path.join('.');
    let message = '';
    let expected = '';
    let received = '';

    switch (issue.code) {
      case 'invalid_type':
        expected = issue.expected;
        received = issue.received;
        if (issue.received === 'undefined') {
          message = `Parameter '${path}' is required but missing`;
        } else {
          message = `Parameter '${path}' must be ${expected}, got ${received}`;
        }
        break;

      case 'too_small': {
        const tooSmallIssue = issue as z.ZodIssue & { type: string; minimum: number };
        if (tooSmallIssue.type === 'string') {
          expected = `at least ${tooSmallIssue.minimum} characters`;
          received = 'too short';
          message = `Parameter '${path}' must be ${expected}`;
        } else if (tooSmallIssue.type === 'array') {
          expected = `at least ${tooSmallIssue.minimum} items`;
          received = 'too few items';
          message = `Parameter '${path}' must contain ${expected}`;
        } else {
          expected = `at least ${tooSmallIssue.minimum}`;
          received = 'too small';
          message = `Parameter '${path}' must be ${expected}`;
        }
        break;
      }

      case 'too_big': {
        const tooBigIssue = issue as z.ZodIssue & { type: string; maximum: number };
        if (tooBigIssue.type === 'string') {
          expected = `at most ${tooBigIssue.maximum} characters`;
          received = 'too long';
          message = `Parameter '${path}' must be ${expected}`;
        } else if (tooBigIssue.type === 'array') {
          expected = `at most ${tooBigIssue.maximum} items`;
          received = 'too many items';
          message = `Parameter '${path}' must contain ${expected}`;
        } else {
          expected = `at most ${tooBigIssue.maximum}`;
          received = 'too big';
          message = `Parameter '${path}' must be ${expected}`;
        }
        break;
      }

      case 'invalid_string': {
        const stringIssue = issue as z.ZodIssue & { validation?: string };
        if ('validation' in stringIssue) {
          const validation = stringIssue.validation;
          if (validation === 'email') {
            expected = 'valid email format';
            message = `Parameter '${path}' must be a valid email address`;
          } else if (validation === 'url') {
            expected = 'valid URL format';
            message = `Parameter '${path}' must be a valid URL`;
          } else if (validation === 'uuid') {
            expected = 'valid UUID format';
            message = `Parameter '${path}' must be a valid UUID`;
          } else if (validation === 'datetime') {
            expected = 'valid ISO 8601 date-time format';
            message = `Parameter '${path}' must be in ISO 8601 date-time format (e.g., 2025-01-01T12:00:00Z)`;
          } else if (validation === 'regex') {
            expected = 'match required pattern';
            message = `Parameter '${path}' must match the required pattern`;
          } else {
            expected = `valid ${validation} format`;
            message = `Parameter '${path}' must be ${expected}`;
          }
        } else {
          expected = 'valid string format';
          message = `Parameter '${path}' has invalid format`;
        }
        received = 'invalid format';
        break;
      }

      case 'invalid_enum_value': {
        const enumIssue = issue as z.ZodIssue & { options?: unknown[]; received?: unknown };
        expected = `one of: ${enumIssue.options?.join(', ') || 'unknown'}`;
        received = String(enumIssue.received || 'unknown');
        message = `Parameter '${path}' must be ${expected}, got '${received}'`;
        break;
      }

      case 'invalid_union':
        expected = 'match one of the allowed types';
        received = 'invalid type';
        message = `Parameter '${path}' does not match any of the allowed types`;
        break;

      default:
        expected = 'valid value';
        received = 'invalid';
        message = issue.message || `Parameter '${path}' is invalid`;
    }

    return {
      path: path || 'root',
      message,
      expected,
      received,
    };
  });
}

/**
 * Validates operation input parameters against the corresponding operation schema.
 *
 * This function loads the operation definition from operations.json, constructs
 * a Zod schema from the operation's parameters and request body, and validates
 * the provided parameters against that schema.
 *
 * Schemas are cached after first use for optimal performance on repeated validations
 * of the same operation.
 *
 * @param operationId - The Bitbucket operation ID (e.g., 'createRepository', 'updateRepository')
 * @param params - The input parameters to validate
 * @returns Validation result with parsed data or detailed errors
 *
 * @example
 * ```typescript
 * const result = await validateOperationInput('createRepository', {
 *   projectKey: 'PRJ',
 *   name: 'My Repository',
 *   scmId: 'git'
 * }
 * });
 *
 * if (result.success) {
 *   console.log('Valid params:', result.data);
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export async function validateOperationInput(
  operationId: string,
  params: unknown,
): Promise<ValidationResult> {
  try {
    // Get schema for operation
    const schema = await getSchema(operationId);

    if (!schema) {
      return {
        success: false,
        errors: [
          {
            path: '',
            message: `Unknown operation ID: '${operationId}'`,
            expected: 'valid operation ID',
            received: operationId,
          },
        ],
      };
    }

    // Validate using Zod
    const result = schema.safeParse(params);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    // Format errors for LLM consumption
    const errors = formatZodErrors(result.error.issues);

    return {
      success: false,
      errors,
    };
  } catch (error) {
    // Handle unexpected errors
    return {
      success: false,
      errors: [
        {
          path: '',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          expected: 'valid input',
          received: 'error',
        },
      ],
    };
  }
}

/**
 * Type guard to check if a value is a ValidationError array.
 *
 * @param value - Value to check
 * @returns True if value is ValidationError[]
 */
export function isValidationError(value: unknown): value is ValidationError[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'path' in item &&
        'message' in item &&
        'expected' in item &&
        'received' in item,
    )
  );
}

/**
 * Clears the schema cache. Useful for testing or when operations data is updated.
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
  operationsData = null;
}

/**
 * Gets cache metrics for observability.
 */
export function getCacheMetrics(): { size: number; maxSize: number } {
  return schemaCache.metrics;
}
