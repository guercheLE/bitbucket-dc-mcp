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

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Interface for schema resolution operations.
 * Follows Interface Segregation Principle - focused on schema resolution only.
 */
export interface ISchemaResolver {
  /**
   * Resolves all $ref references in a schema object recursively.
   * @param schema - Schema object that may contain $ref references
   * @returns Resolved schema with all references expanded
   */
  resolveSchema(schema: unknown): unknown;

  /**
   * Resolves a single $ref reference to its definition.
   * @param ref - Reference string (e.g., "#/components/schemas/RestComment")
   * @returns Resolved schema definition or undefined if not found
   */
  resolveRef(ref: string): unknown;
}

/**
 * Schema resolver implementation that loads and resolves OpenAPI schema references.
 * 
 * This service is responsible for:
 * - Loading schema definitions from schemas.json
 * - Resolving $ref references to actual schema definitions
 * - Preventing infinite recursion in circular references
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Only handles schema resolution
 * - Open/Closed: Can be extended without modification
 * - Dependency Inversion: Depends on ISchemaResolver abstraction
 */
export class SchemaResolver implements ISchemaResolver {
  private readonly schemas: Record<string, unknown>;
  private readonly maxDepth: number;

  /**
   * Creates a new SchemaResolver instance.
   * 
   * @param maxDepth - Maximum recursion depth to prevent infinite loops (default: 5)
   */
  constructor(maxDepth = 5) {
    this.schemas = this.loadSchemas();
    this.maxDepth = maxDepth;
  }

  /**
   * Factory method to create a SchemaResolver instance.
   * Useful for dependency injection and testing.
   * 
   * @param maxDepth - Maximum recursion depth
   * @returns New SchemaResolver instance
   */
  public static create(maxDepth = 5): ISchemaResolver {
    return new SchemaResolver(maxDepth);
  }

  /**
   * Loads schema definitions from schemas.json file.
   * 
   * @returns Record of schema definitions indexed by schema name
   */
  private loadSchemas(): Record<string, unknown> {
    try {
      const packageRoot = this.getPackageRoot();
      const schemasPath = join(packageRoot, 'data', 'schemas.json');
      
      if (!existsSync(schemasPath)) {
        return {};
      }

      const data = JSON.parse(readFileSync(schemasPath, 'utf-8')) as {
        schemas?: Record<string, unknown>;
        [key: string]: unknown;
      };

      return (data.schemas as Record<string, unknown>) || {};
    } catch {
      return {};
    }
  }

  /**
   * Gets the package root directory.
   * Works in both ESM and CommonJS environments.
   * 
   * @returns Absolute path to package root
   */
  private getPackageRoot(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // From dist/data/ go up to package root
    return join(__dirname, '..', '..');
  }

  /**
   * Resolves a $ref reference to its schema definition.
   * 
   * @param ref - Reference string in format "#/components/schemas/SchemaName"
   * @returns Resolved schema definition or undefined if not found
   */
  public resolveRef(ref: string): unknown {
    // Handle references like "#/components/schemas/RestComment"
    const refMatch = ref.match(/#\/components\/schemas\/(.+)/);
    if (refMatch && refMatch[1]) {
      return this.schemas[refMatch[1]];
    }
    return undefined;
  }

  /**
   * Resolves all $ref references in a schema object recursively.
   * Handles nested objects, arrays, and prevents infinite recursion.
   * 
   * @param schema - Schema object that may contain $ref references
   * @param depth - Current recursion depth (used internally)
   * @returns Resolved schema with all references expanded
   */
  public resolveSchema(schema: unknown, depth = 0): unknown {
    // Prevent infinite recursion
    if (depth > this.maxDepth) {
      return schema;
    }

    // Handle primitives and null
    if (typeof schema !== 'object' || schema === null) {
      return schema;
    }

    // Handle arrays
    if (Array.isArray(schema)) {
      return schema.map((item) => this.resolveSchema(item, depth + 1));
    }

    const schemaObj = schema as Record<string, unknown>;

    // If this is a $ref, resolve it
    if (schemaObj.$ref && typeof schemaObj.$ref === 'string') {
      const resolved = this.resolveRef(schemaObj.$ref);
      if (resolved) {
        return this.resolveSchema(resolved, depth + 1);
      }
    }

    // Recursively resolve nested schemas
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schemaObj)) {
      result[key] = this.resolveSchema(value, depth + 1);
    }

    return result;
  }

  /**
   * Checks if schemas are loaded and available.
   * 
   * @returns True if schemas are loaded, false otherwise
   */
  public hasSchemasLoaded(): boolean {
    return Object.keys(this.schemas).length > 0;
  }

  /**
   * Gets the count of loaded schemas.
   * 
   * @returns Number of schemas available
   */
  public getSchemasCount(): number {
    return Object.keys(this.schemas).length;
  }
}

