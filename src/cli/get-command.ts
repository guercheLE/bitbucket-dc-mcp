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
 * Get Command Handler
 * Retrieves complete operation details including schema, parameters, and examples
 */

/* eslint-disable no-console */

import chalk from 'chalk';
import Table from 'cli-table3';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

interface GetOptions {
  json?: boolean;
  verbose?: boolean;
  config?: string;
}

interface OperationParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: {
    type?: string;
    [key: string]: unknown;
  };
}

interface OperationRequestBody {
  required?: boolean;
  description?: string;
  content?: {
    [contentType: string]: {
      schema?: unknown;
    };
  };
}

interface OperationResponse {
  description?: string;
  [key: string]: unknown;
}

interface Operation {
  operationId: string;
  summary?: string;
  method: string;
  path: string;
  deprecated?: boolean;
  description?: string;
  tags?: string[];
  parameters?: OperationParameter[];
  requestBody?: OperationRequestBody;
  responses?: Record<string, OperationResponse>;
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
 * Load schemas from schemas.json
 */
function loadSchemas(): Record<string, unknown> {
  const packageRoot = getPackageRoot();
  const schemasPath = join(packageRoot, 'data', 'schemas.json');
  if (!existsSync(schemasPath)) {
    return {};
  }
  try {
    const data = JSON.parse(readFileSync(schemasPath, 'utf-8')) as {
      schemas?: Record<string, unknown>;
      [key: string]: unknown;
    };
    // The schemas.json has a "schemas" property containing the actual schemas
    return (data.schemas as Record<string, unknown>) || {};
  } catch {
    return {};
  }
}

/**
 * Resolve $ref references in a schema
 */
function resolveRef(ref: string, schemas: Record<string, unknown>): unknown {
  // Handle references like "#/components/schemas/ProjectInputBean"
  const refMatch = ref.match(/#\/components\/schemas\/(.+)/);
  if (refMatch && refMatch[1]) {
    return schemas[refMatch[1]];
  }
  return undefined;
}

/**
 * Resolve all $ref references in a schema object
 */
function resolveSchema(schema: unknown, schemas: Record<string, unknown>, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 5) {
    return schema;
  }

  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => resolveSchema(item, schemas, depth + 1));
  }

  const schemaObj = schema as Record<string, unknown>;

  // If this is a $ref, resolve it
  if (schemaObj.$ref && typeof schemaObj.$ref === 'string') {
    const resolved = resolveRef(schemaObj.$ref, schemas);
    if (resolved) {
      return resolveSchema(resolved, schemas, depth + 1);
    }
  }

  // Recursively resolve nested schemas
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schemaObj)) {
    result[key] = resolveSchema(value, schemas, depth + 1);
  }

  return result;
}

/**
 * Generate example from schema
 */
function generateExample(schema: unknown): unknown {
  if (typeof schema !== 'object' || schema === null) {
    return undefined;
  }

  const schemaObj = schema as Record<string, unknown>;

  // If there's an example, use it
  if (schemaObj.example !== undefined) {
    return schemaObj.example;
  }

  // Handle based on type
  const type = schemaObj.type as string | undefined;

  if (type === 'object') {
    const properties = schemaObj.properties as Record<string, unknown> | undefined;
    if (!properties) {
      return {};
    }

    const example: Record<string, unknown> = {};
    for (const [propName, propSchema] of Object.entries(properties)) {
      const propExample = generateExample(propSchema);
      if (propExample !== undefined) {
        example[propName] = propExample;
      }
    }
    return example;
  }

  if (type === 'array') {
    const items = schemaObj.items as Record<string, unknown> | undefined;
    if (items) {
      const itemExample = generateExample(items);
      return itemExample !== undefined ? [itemExample] : [];
    }
    return [];
  }

  if (type === 'string') {
    if (schemaObj.enum && Array.isArray(schemaObj.enum) && schemaObj.enum.length > 0) {
      return schemaObj.enum[0];
    }
    if (schemaObj.format === 'date-time') {
      return '2024-01-01T00:00:00.000Z';
    }
    if (schemaObj.format === 'uri' || schemaObj.format === 'url') {
      return 'https://example.com';
    }
    return 'string';
  }

  if (type === 'integer' || type === 'number') {
    return 0;
  }

  if (type === 'boolean') {
    return false;
  }

  return undefined;
}

/**
 * Execute get command to retrieve operation details
 */
export async function getCommand(operationId: string, options: GetOptions): Promise<void> {
  try {
    // Check if operations.json exists
    const packageRoot = getPackageRoot();
    const operationsPath = join(packageRoot, 'data', 'operations.json');
    if (!existsSync(operationsPath)) {
      throw new Error(
        `Operations file not found at ${operationsPath}\n` +
          'Please ensure the package is properly installed with operations.json included.',
      );
    }

    // Load operations data
    const operationsData = JSON.parse(readFileSync(operationsPath, 'utf-8')) as {
      operations?: Operation[];
      [key: string]: Operation | Operation[] | unknown;
    };
    const operations = operationsData.operations || operationsData;
    const operation = Array.isArray(operations)
      ? operations.find((op) => op.operationId === operationId)
      : (operations as Record<string, Operation>)[operationId];

    if (!operation) {
      throw new Error(`Operation "${operationId}" not found`);
    }

    // Load schemas for reference resolution
    const schemas = loadSchemas();

    // Output results
    if (options.json) {
      console.log(JSON.stringify(operation, null, 2));
    } else {
      displayOperationDetails(operation, options.verbose || false, schemas);
    }
  } catch (error) {
    throw new Error(
      `Failed to retrieve operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Display operation details in formatted output
 */
function displayOperationDetails(
  operation: Operation,
  verbose: boolean,
  schemas: Record<string, unknown>,
): void {
  console.log(chalk.green('\n✅ Operation Details:\n'));

  // Basic information
  console.log(chalk.bold('Operation ID:'), chalk.cyan(operation.operationId));
  console.log(chalk.bold('Summary:'), operation.summary);
  console.log(chalk.bold('Method:'), chalk.yellow(operation.method.toUpperCase()));
  console.log(chalk.bold('Path:'), chalk.blue(operation.path));

  if (operation.deprecated) {
    console.log(chalk.red('\n⚠️  WARNING: This operation is deprecated\n'));
  }

  if (operation.description && verbose) {
    console.log(chalk.bold('\nDescription:'));
    console.log(chalk.gray(operation.description));
  }

  // Tags
  if (operation.tags && operation.tags.length > 0) {
    console.log(chalk.bold('\nTags:'), operation.tags.join(', '));
  }

  // Parameters
  if (operation.parameters && operation.parameters.length > 0) {
    console.log(chalk.bold('\nParameters:\n'));

    const paramTable = new Table({
      head: ['Name', 'In', 'Required', 'Type', 'Description'],
      colWidths: [20, 10, 10, 15, 50],
      wordWrap: true,
    });

    for (const param of operation.parameters) {
      paramTable.push([
        chalk.cyan(param.name),
        param.in,
        param.required ? chalk.green('Yes') : chalk.gray('No'),
        param.schema?.type || 'object',
        param.description || chalk.gray('N/A'),
      ]);
    }

    console.log(paramTable.toString());
  }

  // Request Body
  if (operation.requestBody) {
    console.log(chalk.bold('\nRequest Body:'));
    console.log(chalk.gray(`  Required: ${operation.requestBody.required ? 'Yes' : 'No'}`));

    if (operation.requestBody.description) {
      console.log(chalk.gray(`  Description: ${operation.requestBody.description}`));
    }

    if (verbose && operation.requestBody.content) {
      console.log(chalk.bold('\n  Content Types:'));
      for (const contentType of Object.keys(operation.requestBody.content)) {
        console.log(chalk.gray(`    - ${contentType}`));
      }

      // Show schema example for JSON content
      const jsonContent = operation.requestBody.content['application/json'];
      if (jsonContent?.schema) {
        console.log(chalk.bold('\n  Schema (JSON):'));
        const resolvedSchema = resolveSchema(jsonContent.schema, schemas);
        console.log(
          chalk.gray('    ' + JSON.stringify(resolvedSchema, null, 2).replace(/\n/g, '\n    ')),
        );
      }
    }
  }

  // Responses
  if (operation.responses && Object.keys(operation.responses).length > 0) {
    console.log(chalk.bold('\nResponses:\n'));

    const responseTable = new Table({
      head: ['Status', 'Description'],
      colWidths: [10, 90],
      wordWrap: true,
    });

    for (const [status, response] of Object.entries(operation.responses)) {
      const statusColor = status.startsWith('2')
        ? chalk.green
        : status.startsWith('4')
          ? chalk.yellow
          : chalk.red;
      responseTable.push([
        statusColor(status),
        (response.description || chalk.gray('N/A')) as string,
      ]);
    }

    console.log(responseTable.toString());
  }

  // Example curl command
  console.log(chalk.bold('\nExample cURL Command:\n'));
  const curlCommand = generateCurlCommand(operation, schemas);
  console.log(chalk.gray(curlCommand));

  console.log('');
}

/**
 * Generate a sample cURL command for the operation
 */
function generateCurlCommand(operation: Operation, schemas: Record<string, unknown>): string {
  const method = operation.method.toUpperCase();
  let path = operation.path;

  // Replace path parameters with placeholders
  const pathParams = operation.parameters?.filter((p) => p.in === 'path') || [];
  for (const param of pathParams) {
    path = path.replace(`{${param.name}}`, `<${param.name}>`);
  }

  let curl = `curl -X ${method} 'https://your-bitbucket.com${path}'`;
  curl += ` \\\n  -H 'Authorization: Bearer <token>'`;
  curl += ` \\\n  -H 'Content-Type: application/json'`;

  // Add query parameters example
  const queryParams = operation.parameters?.filter((p) => p.in === 'query') || [];
  if (queryParams.length > 0) {
    const examples = queryParams
      .slice(0, 2)
      .map((p) => `${p.name}=<value>`)
      .join('&');
    curl = curl.replace(path, `${path}?${examples}`);
  }

  // Add request body example
  if (operation.requestBody && method !== 'GET') {
    const jsonContent = operation.requestBody.content?.['application/json'];
    let bodyExample = '{\n    "field": "value"\n  }';

    if (jsonContent?.schema) {
      const resolvedSchema = resolveSchema(jsonContent.schema, schemas);
      const example = generateExample(resolvedSchema);
      if (example && typeof example === 'object') {
        bodyExample = JSON.stringify(example, null, 2);
      }
    }

    curl += ` \\\n  -d '${bodyExample}'`;
  }

  return curl;
}
