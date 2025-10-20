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

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

describe('register-tools schema conversion', () => {
  describe('toMcpSchema function', () => {
    // Simulate the toMcpSchema function from register-tools.ts
    const toMcpSchema = (schema: Record<string, unknown>): Record<string, unknown> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { $schema, $ref, definitions, ...rest } = schema;

      // If there's a $ref, resolve it from definitions
      if ($ref && typeof $ref === 'string' && definitions) {
        const refName = $ref.split('/').pop();
        if (refName && typeof definitions === 'object' && definitions !== null) {
          const defsObj = definitions as Record<string, unknown>;
          const resolvedSchema = defsObj[refName];
          if (resolvedSchema && typeof resolvedSchema === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { $schema: _, ...schemaWithoutDollarSchema } = resolvedSchema as Record<
              string,
              unknown
            >;
            return schemaWithoutDollarSchema;
          }
        }
      }

      // Otherwise, just remove $schema
      return rest;
    };

    it('should resolve $ref and return proper MCP schema with properties', () => {
      const SearchIdsInputSchema = z.object({
        query: z.string().min(1, 'Query cannot be empty'),
        limit: z.number().int().min(1).max(20).optional().default(5),
      });

      const zodSchema = zodToJsonSchema(SearchIdsInputSchema, 'SearchIdsInput');
      const mcpSchema = toMcpSchema(zodSchema);

      // Verify the schema has the correct structure
      expect(mcpSchema).toHaveProperty('type', 'object');
      expect(mcpSchema).toHaveProperty('properties');
      expect(mcpSchema).toHaveProperty('required');

      // Verify properties
      const properties = mcpSchema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('query');
      expect(properties).toHaveProperty('limit');

      // Verify query is required
      const required = mcpSchema.required as string[];
      expect(required).toContain('query');
      expect(required).not.toContain('limit'); // limit is optional

      // Verify no $schema or $ref in final schema
      expect(mcpSchema).not.toHaveProperty('$schema');
      expect(mcpSchema).not.toHaveProperty('$ref');
      expect(mcpSchema).not.toHaveProperty('definitions');
    });

    it('should handle schema with optional parameters correctly', () => {
      const GetIdInputSchema = z.object({
        operation_id: z.string().min(1, 'operation_id is required'),
      });

      const zodSchema = zodToJsonSchema(GetIdInputSchema, 'GetIdInput');
      const mcpSchema = toMcpSchema(zodSchema);

      expect(mcpSchema).toHaveProperty('type', 'object');
      expect(mcpSchema).toHaveProperty('properties');
      expect(mcpSchema).toHaveProperty('required');

      const required = mcpSchema.required as string[];
      expect(required).toContain('operation_id');
    });

    it('should handle schema with all required parameters', () => {
      const CallIdInputSchema = z.object({
        operation_id: z.string().min(1),
        parameters: z.record(z.unknown()).optional(),
      });

      const zodSchema = zodToJsonSchema(CallIdInputSchema, 'CallIdInput');
      const mcpSchema = toMcpSchema(zodSchema);

      expect(mcpSchema).toHaveProperty('type', 'object');
      expect(mcpSchema).toHaveProperty('properties');

      const properties = mcpSchema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('operation_id');
      expect(properties).toHaveProperty('parameters');

      const required = mcpSchema.required as string[];
      expect(required).toContain('operation_id');
      expect(required).not.toContain('parameters'); // parameters is optional
    });

    it('should preserve validation constraints in properties', () => {
      const schema = z.object({
        count: z.number().int().min(1).max(100),
        email: z.string().email(),
      });

      const zodSchema = zodToJsonSchema(schema, 'TestSchema');
      const mcpSchema = toMcpSchema(zodSchema);

      const properties = mcpSchema.properties as Record<string, Record<string, unknown>>;

      // Check count constraints
      expect(properties.count).toHaveProperty('type', 'integer');
      expect(properties.count).toHaveProperty('minimum', 1);
      expect(properties.count).toHaveProperty('maximum', 100);

      // Check email format
      expect(properties.email).toHaveProperty('type', 'string');
      expect(properties.email).toHaveProperty('format', 'email');
    });
  });
});
