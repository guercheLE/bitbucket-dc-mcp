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

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import type { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';
import { format, resolveConfig } from 'prettier';

const SCHEMAS_INPUT_PATH = 'data/schemas.json';
const OUTPUT_FILE_PATH = 'src/validation/generated-schemas.ts';
const MAX_REF_DEPTH = 16;

type SchemaLike = SchemaObject | ReferenceObject;
type ExtendedSchemaObject = SchemaObject & {
    const?: unknown;
    contains?: SchemaLike;
    prefixItems?: SchemaLike[];
};

interface SchemaFile {
    _metadata?: Record<string, unknown>;
    schemas: Record<string, SchemaLike>;
}

interface GeneratedSchema {
    name: string;
    constName: string;
    typeName: string;
    expression: string;
}

interface ConversionOptions {
    currentSchema: string;
    refStack: string[];
    generatedSchemas: Set<string>;
    depth: number;
}

class SchemaNotFoundError extends Error {
    constructor(ref: string) {
        super(`Schema reference not found: ${ref}`);
        this.name = 'SchemaNotFoundError';
    }
}

class CircularReferenceError extends Error {
    constructor(chain: string[]) {
        super(`Circular reference detected: ${chain.join(' → ')}`);
        this.name = 'CircularReferenceError';
    }
}

class UnsupportedSchemaTypeError extends Error {
    constructor(type: unknown, schemaName: string) {
        super(`Unsupported schema type '${String(type)}' in schema '${schemaName}'`);
        this.name = 'UnsupportedSchemaTypeError';
    }
}

const isReferenceObject = (schema: SchemaLike): schema is ReferenceObject => {
    return typeof (schema as ReferenceObject).$ref === 'string';
};

export const generateHeaderComment = (): string => {
    const timestamp = new Date().toISOString();
    return ['// AUTO-GENERATED - DO NOT EDIT', `// Generated at ${timestamp}`].join('\n');
};

export const loadSchemas = async (path: string): Promise<Record<string, SchemaLike>> => {
    try {
        const filePath = resolvePath(path);
        const raw = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<SchemaFile>;
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Schemas file content is not an object.');
        }
        if (!parsed.schemas || typeof parsed.schemas !== 'object') {
            throw new Error('Schemas file must include a "schemas" property.');
        }
        return parsed.schemas;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Failed to parse schemas file '${path}': ${error.message}`);
        }
        throw error;
    }
};

const sanitizeIdentifier = (rawName: string): string => {
    const cleaned = rawName
        .replace(/[^A-Za-z0-9]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('');
    const identifier = cleaned || 'Schema';
    return /^[A-Za-z_]/.test(identifier) ? identifier : `Schema${identifier}`;
};

const parseRef = (ref: string): string => {
    const match = ref.match(/^#\/components\/schemas\/(.+)$/);
    if (!match) {
        throw new Error(`Unsupported $ref format: ${ref}`);
    }
    return match[1];
};

export const resolveRef = (
    ref: string,
    schemas: Record<string, SchemaLike>,
    stack: string[] = [],
    depth = 0,
): SchemaObject => {
    if (depth > MAX_REF_DEPTH) {
        throw new Error(`Maximum $ref depth exceeded while resolving ${ref}`);
    }
    const name = parseRef(ref);
    if (stack.includes(name)) {
        throw new CircularReferenceError([...stack, name]);
    }
    const target = schemas[name];
    if (!target) {
        throw new SchemaNotFoundError(ref);
    }
    if (isReferenceObject(target)) {
        return resolveRef(target.$ref, schemas, [...stack, name], depth + 1);
    }
    return target;
};

const literalFromValue = (value: unknown): string => {
    if (value === null) {
        return 'z.literal(null)';
    }
    if (typeof value === 'string') {
        return `z.literal(${JSON.stringify(value)})`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return `z.literal(${JSON.stringify(value)})`;
    }
    return 'z.any()';
};

const createEnumExpression = (values: unknown[]): string => {
    if (values.length === 0) {
        return 'z.never()';
    }
    const areStrings = values.every((value) => typeof value === 'string');
    if (areStrings) {
        const literalValues = values.map((value) => JSON.stringify(value)).join(', ');
        return `z.enum([${literalValues}])`;
    }
    const literals = values.map((value) => literalFromValue(value)).join(', ');
    return `z.union([${literals}])`;
};

const applyNullableAndDefault = (code: string, schema: ExtendedSchemaObject): string => {
    let result = code;
    if (schema.nullable) {
        result += '.nullable()';
    }
    if (schema.default !== undefined) {
        result += `.default(${JSON.stringify(schema.default)})`;
    }
    return result;
};

const uniqueItemsRefinement =
    '.refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, { message: "Array items must be unique" })';

const convertNumberConstraints = (schema: ExtendedSchemaObject, base: string): string => {
    let code = base;
    if (typeof schema.minimum === 'number') {
        if (schema.exclusiveMinimum === true) {
            code += `.gt(${schema.minimum})`;
        } else {
            code += `.min(${schema.minimum})`;
        }
    }
    if (typeof schema.exclusiveMinimum === 'number') {
        code += `.gt(${schema.exclusiveMinimum})`;
    }
    if (typeof schema.maximum === 'number') {
        if (schema.exclusiveMaximum === true) {
            code += `.lt(${schema.maximum})`;
        } else {
            code += `.max(${schema.maximum})`;
        }
    }
    if (typeof schema.exclusiveMaximum === 'number') {
        code += `.lt(${schema.exclusiveMaximum})`;
    }
    if (typeof schema.multipleOf === 'number') {
        code += `.multipleOf(${schema.multipleOf})`;
    }
    return code;
};

const convertStringConstraints = (schema: ExtendedSchemaObject, base: string): string => {
    let code = base;
    if (typeof schema.minLength === 'number') {
        code += `.min(${schema.minLength})`;
    }
    if (typeof schema.maxLength === 'number') {
        code += `.max(${schema.maxLength})`;
    }
    if (schema.pattern) {
        code += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
    }
    return code;
};

const zodStringForFormat = (schema: ExtendedSchemaObject): string => {
    let code = 'z.string()';
    switch (schema.format) {
        case 'email':
            code += '.email()';
            break;
        case 'uri':
        case 'url':
            code += '.url()';
            break;
        case 'date-time':
            code += '.datetime()';
            break;
        default:
            break;
    }
    return code;
};

const createConversionOptions = (
    currentSchema: string,
    generatedSchemas: Set<string>,
    refStack: string[] = [],
    depth = 0,
): ConversionOptions => ({ currentSchema, generatedSchemas, refStack, depth });

class SchemaGenerator {
    private readonly schemas: Record<string, SchemaLike>;
    private readonly sanitizedNames: Map<string, string> = new Map();
    private order: string[] = [];
    private readonly warnings: Set<string> = new Set();
    private readonly dependencyGraph: Map<string, Set<string>> = new Map();
    private readonly selfReferencingSchemas: Set<string> = new Set();

    constructor(schemas: Record<string, SchemaLike>) {
        this.schemas = schemas;
        this.computeSanitizedNames();
        this.computeGenerationOrder();
    }

    generate(): { code: string; count: number; warnings: string[] } {
        const generatedSchemas = new Set<string>();
        const sections: string[] = [];
        for (const schemaName of this.order) {
            const constName = this.getConstName(schemaName);
            const typeName = this.getTypeName(schemaName);
            const expression = this.convertSchema(schemaName, createConversionOptions(schemaName, generatedSchemas, [schemaName]));
            if (this.selfReferencingSchemas.has(schemaName)) {
                const definitionName = `${constName}Definition`;
                sections.push(`export const ${constName} = z.lazy(() => ${definitionName});`);
                sections.push(`const ${definitionName}: z.ZodTypeAny = ${expression};`);
            } else {
                sections.push(`export const ${constName} = ${expression};`);
            }
            sections.push(`export type ${typeName} = z.infer<typeof ${constName}>;`);
            generatedSchemas.add(schemaName);
        }
        const header = generateHeaderComment();
        const body = sections.join('\n\n');
        const code = `${header}\n\nimport { z } from 'zod';\n\n${body}\n`;
        return { code, count: this.order.length, warnings: Array.from(this.warnings.values()) };
    }

    private computeSanitizedNames(): void {
        const used = new Map<string, number>();
        Object.keys(this.schemas).forEach((name) => {
            const base = sanitizeIdentifier(name);
            const count = used.get(base) ?? 0;
            const candidate = count === 0 ? base : `${base}${count + 1}`;
            used.set(base, count + 1);
            this.sanitizedNames.set(name, candidate);
        });
    }

    private computeGenerationOrder(): void {
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const order: string[] = [];
        const visit = (name: string) => {
            if (visited.has(name)) {
                return;
            }
            if (visiting.has(name)) {
                // Cycle detected; record warning and continue.
                this.warnings.add(`Circular reference detected while ordering schemas: ${name}`);
                return;
            }
            visiting.add(name);
            for (const dependency of this.collectDependencies(name)) {
                visit(dependency);
            }
            visiting.delete(name);
            visited.add(name);
            order.push(name);
        };
        Object.keys(this.schemas).forEach((name) => visit(name));
        this.order = order;
    }

    private collectDependencies(name: string): Set<string> {
        if (this.dependencyGraph.has(name)) {
            return this.dependencyGraph.get(name) ?? new Set<string>();
        }
        const schema = this.schemas[name];
        if (!schema) {
            return new Set();
        }
        const acc = new Set<string>();
        const traverse = (node: SchemaLike, depth = 0) => {
            if (depth > MAX_REF_DEPTH) {
                return;
            }
            if (isReferenceObject(node)) {
                try {
                    const refName = parseRef(node.$ref);
                    acc.add(refName);
                    return;
                } catch (error) {
                    this.warnings.add((error as Error).message);
                    return;
                }
            }
            const schemaNode = node as ExtendedSchemaObject;
            if (schemaNode.allOf) {
                schemaNode.allOf.forEach((child: SchemaLike) => traverse(child, depth + 1));
            }
            if (schemaNode.oneOf) {
                schemaNode.oneOf.forEach((child: SchemaLike) => traverse(child, depth + 1));
            }
            if (schemaNode.anyOf) {
                schemaNode.anyOf.forEach((child: SchemaLike) => traverse(child, depth + 1));
            }
            if (schemaNode.not) {
                traverse(schemaNode.not as SchemaLike, depth + 1);
            }
            if (schemaNode.items) {
                traverse(schemaNode.items as SchemaLike, depth + 1);
            }
            if (Array.isArray(schemaNode.prefixItems)) {
                (schemaNode.prefixItems as SchemaLike[]).forEach((child: SchemaLike) => traverse(child, depth + 1));
            }
            if (schemaNode.properties) {
                Object.values(schemaNode.properties).forEach((child) => traverse(child as SchemaLike, depth + 1));
            }
            if (schemaNode.additionalProperties && typeof schemaNode.additionalProperties === 'object') {
                traverse(schemaNode.additionalProperties as SchemaLike, depth + 1);
            }
            if (schemaNode.contains) {
                traverse(schemaNode.contains as SchemaLike, depth + 1);
            }
        };
        traverse(schema);
        if (acc.has(name)) {
            this.selfReferencingSchemas.add(name);
        }
        this.dependencyGraph.set(name, acc);
        return acc;
    }

    private convertSchema(name: string, options: ConversionOptions): string {
        const schema = this.schemas[name];
        if (!schema) {
            throw new SchemaNotFoundError(name);
        }
        return this.convertSchemaLike(schema, options);
    }

    public convertSchemaLike(schema: SchemaLike, options: ConversionOptions): string {
        if (options.depth > MAX_REF_DEPTH) {
            throw new Error(`Maximum schema depth exceeded while converting '${options.currentSchema}'.`);
        }
        if (isReferenceObject(schema)) {
            return this.convertReference(schema.$ref, options);
        }
        const schemaObject = schema as ExtendedSchemaObject;
        if (schemaObject.const !== undefined) {
            return applyNullableAndDefault(literalFromValue(schemaObject.const), schemaObject);
        }
        if (schemaObject.enum?.length) {
            return applyNullableAndDefault(createEnumExpression(schemaObject.enum), schemaObject);
        }
        if (schemaObject.allOf?.length) {
            const combined = this.convertAllOf(schemaObject.allOf, options);
            return applyNullableAndDefault(combined, schemaObject);
        }
        if (schemaObject.oneOf?.length) {
            const unionExpression = this.convertUnion(schemaObject.oneOf, options);
            return applyNullableAndDefault(unionExpression, schemaObject);
        }
        if (schemaObject.anyOf?.length) {
            const unionExpression = this.convertUnion(schemaObject.anyOf, options);
            return applyNullableAndDefault(unionExpression, schemaObject);
        }
        if (Array.isArray(schemaObject.type)) {
            const variants = schemaObject.type.map((typeValue: string) =>
                this.convertSchemaLike({ ...schemaObject, type: typeValue } as SchemaObject, {
                    ...options,
                    depth: options.depth + 1,
                }),
            );
            return applyNullableAndDefault(`z.union([${variants.join(', ')}])`, schemaObject);
        }
        switch (schemaObject.type) {
            case 'string':
                return applyNullableAndDefault(
                    convertStringConstraints(schemaObject, zodStringForFormat(schemaObject)),
                    schemaObject,
                );
            case 'integer': {
                const base = convertNumberConstraints(schemaObject, 'z.number().int()');
                return applyNullableAndDefault(base, schemaObject);
            }
            case 'number': {
                const base = convertNumberConstraints(schemaObject, 'z.number()');
                return applyNullableAndDefault(base, schemaObject);
            }
            case 'boolean':
                return applyNullableAndDefault('z.boolean()', schemaObject);
            case 'array':
                return this.convertArray(schemaObject, options);
            case 'object':
            default:
                return this.convertObject(schemaObject, options);
        }
    }

    private convertReference(ref: string, options: ConversionOptions): string {
        const referenced = parseRef(ref);
        try {
            resolveRef(ref, this.schemas, options.refStack);
        } catch (error) {
            if (error instanceof CircularReferenceError) {
                this.warnings.add(error.message);
            } else {
                throw error;
            }
        }
        if (options.refStack.includes(referenced)) {
            return `z.lazy(() => ${this.getConstName(referenced)})`;
        }
        if (!options.generatedSchemas.has(referenced)) {
            return `z.lazy(() => ${this.getConstName(referenced)})`;
        }
        return this.getConstName(referenced);
    }

    private convertAllOf(children: SchemaLike[], options: ConversionOptions): string {
        const parts = children.map((child) => this.convertSchemaLike(child, { ...options, depth: options.depth + 1 }));
        if (!parts.length) {
            return 'z.any()';
        }
        return parts.slice(1).reduce((acc, current) => `z.intersection(${acc}, ${current})`, parts[0]);
    }

    private convertUnion(children: SchemaLike[], options: ConversionOptions): string {
        const parts = children.map((child) => this.convertSchemaLike(child, { ...options, depth: options.depth + 1 }));
        if (parts.length === 0) {
            return 'z.never()';
        }
        if (parts.length === 1) {
            return parts[0];
        }
        return `z.union([${parts.join(', ')}])`;
    }

    private convertArray(schema: ExtendedSchemaObject, options: ConversionOptions): string {
        const itemDefinition = Array.isArray(schema.items) ? schema.items[0] : schema.items;
        const itemSchema = itemDefinition
            ? this.convertSchemaLike(itemDefinition as SchemaLike, {
                ...options,
                depth: options.depth + 1,
                refStack: options.refStack,
            })
            : 'z.any()';
        let code = `z.array(${itemSchema})`;
        if (typeof schema.minItems === 'number') {
            code += `.min(${schema.minItems})`;
        }
        if (typeof schema.maxItems === 'number') {
            code += `.max(${schema.maxItems})`;
        }
        if (schema.uniqueItems) {
            code += uniqueItemsRefinement;
        }
        return applyNullableAndDefault(code, schema);
    }

    private convertObject(schema: ExtendedSchemaObject, options: ConversionOptions): string {
        const properties = schema.properties ?? {};
        const required = new Set(schema.required ?? []);
        const lines: string[] = [];
        for (const [propertyName, propertySchema] of Object.entries(properties)) {
            const propertyContext: ConversionOptions = {
                ...options,
                depth: options.depth + 1,
                refStack: options.refStack,
            };
            let propertyCode = this.convertSchemaLike(propertySchema as SchemaLike, propertyContext);
            if (!required.has(propertyName)) {
                propertyCode = `${propertyCode}.optional()`;
            }
            lines.push(`\t${JSON.stringify(propertyName)}: ${propertyCode}`);
        }
        let code = `z.object({${lines.length ? '\n' + lines.join(',\n') + '\n' : ''}})`;
        if (schema.additionalProperties !== undefined) {
            if (schema.additionalProperties === false) {
                code += '.strict()';
            } else if (schema.additionalProperties === true) {
                code += '.passthrough()';
            } else if (typeof schema.additionalProperties === 'object') {
                const catchall = this.convertSchemaLike(schema.additionalProperties as SchemaLike, {
                    ...options,
                    depth: options.depth + 1,
                });
                code += `.catchall(${catchall})`;
            }
        }
        if (typeof schema.minProperties === 'number') {
            code += `.superRefine((value, ctx) => { if (Object.keys(value).length < ${schema.minProperties}) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: \`Expected at least ${schema.minProperties} properties\` }); } })`;
        }
        if (typeof schema.maxProperties === 'number') {
            code += `.superRefine((value, ctx) => { if (Object.keys(value).length > ${schema.maxProperties}) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: \`Expected at most ${schema.maxProperties} properties\` }); } })`;
        }
        return applyNullableAndDefault(code, schema);
    }

    private getConstName(schemaName: string): string {
        const base = this.sanitizedNames.get(schemaName) ?? sanitizeIdentifier(schemaName);
        return `${base}Schema`;
    }

    private getTypeName(schemaName: string): string {
        return this.sanitizedNames.get(schemaName) ?? sanitizeIdentifier(schemaName);
    }
}

const formatWithPrettier = async (code: string): Promise<string> => {
    const prettierConfig = await resolveConfig(process.cwd());
    return format(code, { ...(prettierConfig ?? {}), parser: 'typescript' });
};

const saveGeneratedFile = async (content: string, outputPath: string): Promise<void> => {
    const absolutePath = resolvePath(outputPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf-8');
};

const printHelp = (): void => {
    const usage = `Usage: tsx scripts/generate-schemas.ts [options]\n\nOptions:\n  --help    Show this message`; // Keep help concise.
    process.stdout.write(`${usage}\n`);
};

const runGeneration = async (): Promise<void> => {
    process.stdout.write(`Loading schemas from ${SCHEMAS_INPUT_PATH}...\n`);
    const schemas = await loadSchemas(SCHEMAS_INPUT_PATH);
    process.stdout.write(`Found ${Object.keys(schemas).length} schemas.\n`);
    process.stdout.write('Generating Zod schemas...\n');
    const generator = new SchemaGenerator(schemas);
    const { code, count, warnings } = generator.generate();
    process.stdout.write(`Formatting ${count} schemas with Prettier...\n`);
    const formatted = await formatWithPrettier(code);
    await saveGeneratedFile(formatted, OUTPUT_FILE_PATH);
    process.stdout.write(`✓ Generated ${count} schemas → ${OUTPUT_FILE_PATH}\n`);
    if (warnings.length > 0) {
        process.stdout.write('Warnings:\n');
        warnings.forEach((warning) => process.stdout.write(`  • ${warning}\n`));
    }
};

export const convertSchemaToZod = (
    schema: SchemaLike,
    options: { currentSchema: string; generatedSchemas?: Set<string>; refStack?: string[]; depth?: number },
    schemas: Record<string, SchemaLike>,
): string => {
    const generator = new SchemaGenerator(schemas);
    const conversionOptions = createConversionOptions(
        options.currentSchema,
        options.generatedSchemas ?? new Set<string>(),
        options.refStack ?? [options.currentSchema],
        options.depth ?? 0,
    );
    return generator.convertSchemaLike(schema, conversionOptions);
};

const main = async (): Promise<void> => {
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
        printHelp();
        return;
    }
    try {
        await runGeneration();
    } catch (error) {
        process.stderr.write(`Error: ${(error as Error).message}\n`);
        process.exitCode = 1;
    }
};

const executedAsScript = (): boolean => {
    const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
    return entryUrl === import.meta.url;
};

if (executedAsScript()) {
    main();
}

export { formatWithPrettier, OUTPUT_FILE_PATH, saveGeneratedFile, SchemaGenerator, SCHEMAS_INPUT_PATH };

