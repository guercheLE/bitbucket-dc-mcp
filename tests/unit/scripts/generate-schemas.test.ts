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

import type { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';
import { describe, expect, it } from 'vitest';

import { SchemaGenerator, convertSchemaToZod } from '../../../scripts/generate-schemas';

type SchemaLike = SchemaObject | ReferenceObject;

const mockSchemas: Record<string, SchemaLike> = {
  SimpleString: { type: 'string', minLength: 5, maxLength: 100 },
  EmailField: { type: 'string', format: 'email' },
  NumberRange: { type: 'number', minimum: 0, maximum: 100 },
  IntegerField: { type: 'integer', minimum: 0, maximum: 10 },
  PatternString: { type: 'string', pattern: '^[A-Z]+$' },
  StatusEnum: { type: 'string', enum: ['active', 'inactive', 'pending'] },
  IssueArray: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
  UserObject: {
    type: 'object',
    required: ['name'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 1 },
      age: { type: 'integer', minimum: 0, maximum: 150 },
      tags: { type: 'array', items: { type: 'string' }, uniqueItems: true },
    },
  },
  NestedRef: {
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/UserObject' },
      roles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            permissions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

const convert = (schemaName: keyof typeof mockSchemas, generated: string[] = []): string =>
  convertSchemaToZod(
    mockSchemas[schemaName],
    {
      currentSchema: schemaName as string,
      generatedSchemas: new Set<string>(generated),
      refStack: [schemaName as string],
      depth: 0,
    },
    mockSchemas,
  );

describe('convertSchemaToZod', () => {
  it('converts strings with min/max length constraints', () => {
    expect(convert('SimpleString')).toBe('z.string().min(5).max(100)');
  });

  it('converts email formatted strings', () => {
    expect(convert('EmailField')).toBe('z.string().email()');
  });

  it('converts number ranges with bounds', () => {
    expect(convert('NumberRange')).toBe('z.number().min(0).max(100)');
  });

  it('converts integers with range constraints', () => {
    expect(convert('IntegerField')).toBe('z.number().int().min(0).max(10)');
  });

  it('converts enumerations to z.enum()', () => {
    expect(convert('StatusEnum')).toBe('z.enum(["active", "inactive", "pending"])');
  });

  it('supports string regex patterns', () => {
    expect(convert('PatternString')).toBe('z.string().regex(new RegExp("^[A-Z]+$"))');
  });

  it('maps arrays and propagates item schemas', () => {
    expect(convert('IssueArray')).toBe('z.array(z.string()).min(1).max(10)');
  });

  it('creates object schemas with required and optional fields', () => {
    expect(convert('UserObject')).toMatchInlineSnapshot(`
"z.object({
	\"name\": z.string().min(1),
	\"age\": z.number().int().min(0).max(150).optional(),
	\"tags\": z.array(z.string()).refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, { message: \"Array items must be unique\" }).optional()
}).strict()"
`);
  });

  it('resolves $ref references to generated schema identifiers', () => {
    const schema = convert('NestedRef', ['UserObject']);
    expect(schema).toContain('"user": UserObjectSchema.optional()');
    expect(schema).toContain('"roles": z.array(z.object({');
    expect(schema).toContain('"name": z.string().optional()');
    expect(schema).toContain('"permissions": z.array(z.string()).optional()');
  });
});

describe('SchemaGenerator', () => {
  it('generates deterministic output for the provided schemas', () => {
    const generator = new SchemaGenerator(mockSchemas);
    const { code, count } = generator.generate();
    expect(count).toBe(Object.keys(mockSchemas).length);
    expect(code).toContain('AUTO-GENERATED - DO NOT EDIT');
    expect(code).toContain('export const UserObjectSchema');
    expect(code).toContain('export type UserObject = z.infer<typeof UserObjectSchema>');
  });
});
