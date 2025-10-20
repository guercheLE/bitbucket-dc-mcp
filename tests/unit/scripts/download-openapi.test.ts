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
import type { OpenAPIObject, OperationObject } from 'openapi3-ts/oas30';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NetworkError,
  ValidationError,
  downloadSpec,
  extractOperations,
  extractSchemas,
  normalizeOperationId,
  parseSpec,
  validateOpenAPISpec,
} from '../../../scripts/download-openapi';

vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

const mockedFetch = fetch as unknown as Mock;

const createMockSpec = (): OpenAPIObject => ({
  openapi: '3.0.1',
  info: { title: 'Bitbucket API', version: '11.0.1' },
  paths: {
    '/rest/api/3/issue': {
      post: {
        operationId: 'issues-createIssue',
        summary: 'Create issue',
        description: 'Creates an issue',
        tags: ['Issues'],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/IssueUpdateDetails' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
        },
      },
    },
    '/rest/api/3/issue/{issueId}': {
      parameters: [
        {
          name: 'issueId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      get: {
        operationId: 'getIssue',
        summary: 'Get issue',
        responses: {
          '200': { description: 'Success' },
        },
      },
      delete: {
        operationId: 'issues-deleteIssue',
        summary: 'Delete issue',
        deprecated: true,
        responses: {
          '204': { description: 'Deleted' },
        },
      },
    },
    '/rest/api/3/project': {
      get: {
        operationId: 'projectsGetAllProjects',
        summary: 'List projects',
        responses: {
          '200': { description: 'Success' },
        },
      },
    },
  },
  components: {
    schemas: {
      Issue: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          fields: { $ref: '#/components/schemas/IssueFields' },
        },
      },
      IssueFields: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          description: { type: 'string' },
        },
      },
      IssueUpdateDetails: {
        $ref: '#/components/schemas/Issue',
      },
    },
  },
});

describe('validateOpenAPISpec', () => {
  it('accepts a valid OpenAPI spec', async () => {
    const spec = createMockSpec();

    await expect(validateOpenAPISpec(spec)).resolves.toBe(true);
  });

  it('rejects when required sections are missing', async () => {
    await expect(validateOpenAPISpec({})).rejects.toBeInstanceOf(ValidationError);

    await expect(
      validateOpenAPISpec({
        openapi: '2.0.0',
        info: {},
        paths: {},
        components: {},
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('normalizeOperationId', () => {
  it('normalises camelCase and hyphenated operationIds', () => {
    // The function converts to snake_case but only strips known resource prefixes from RESOURCE_PREFIXES
    // 'issues' is not in the prefix list, so it remains
    expect(normalizeOperationId('issuesCreateIssue')).toBe('issues_create_issue');
    expect(normalizeOperationId('get-issue-watchers')).toBe('get_issue_watchers');
    // 'projects' IS in the prefix list, so it gets stripped
    expect(normalizeOperationId('projectsGetAllProjects')).toBe('get_all_projects');
  });
});

describe('extractOperations', () => {
  it('extracts non-deprecated operations with merged parameters', () => {
    const operations = extractOperations(createMockSpec());

    expect(operations).toHaveLength(3);

    const createIssue = operations.find((operation) => operation.operationId === 'issues_create_issue');
    expect(createIssue?.method).toBe('post');
    expect(createIssue?.path).toBe('/rest/api/3/issue');

    const getIssue = operations.find((operation) => operation.operationId === 'get_issue');
    expect(getIssue?.parameters).toEqual([
      expect.objectContaining({ name: 'issueId', in: 'path' }),
    ]);
  });

  it('disambiguates duplicate normalised operationIds using contextual suffixes', () => {
    const spec = createMockSpec();
    // Add a GET operation with the same normalized ID as the POST (issues-createIssue)
    // Both 'issues-createIssue' and 'issuesCreateIssue' normalize to 'issues_create_issue'
    (spec.paths['/rest/api/3/issue'] as { get?: OperationObject }).get = {
      operationId: 'issuesCreateIssue',
      tags: ['Board'],
      responses: { '200': { description: 'OK' } },
    };

    const operations = extractOperations(spec);
    const matching = operations
      .filter((operation) => operation.operationId.startsWith('issues_create_issue'))
      .map((operation) => operation.operationId)
      .sort();

    // Should have the base ID and a disambiguated version
    expect(matching).toHaveLength(2);
    expect(matching[0]).toBe('issues_create_issue');
    expect(matching[1]).toMatch(/^issues_create_issue_/);
    expect(new Set(matching).size).toBe(matching.length);
  });
});

describe('extractSchemas', () => {
  it('extracts schemas and resolves first-level $ref entries', () => {
    const schemas = extractSchemas(createMockSpec());

    expect(schemas.Issue).toMatchObject({
      required: ['id'],
      properties: {
        id: { type: 'string' },
        fields: {
          type: 'object',
          properties: expect.any(Object),
        },
      },
    });

    expect(schemas.IssueUpdateDetails).toMatchObject({
      required: ['id'],
      properties: expect.objectContaining({
        id: { type: 'string' },
      }),
    });
  });
});

describe('downloadSpec', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  afterEach(() => {
    mockedFetch.mockReset();
  });

  it('returns the fetched spec body when the request succeeds', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('{"openapi": "3.0.1"}'),
    });

    await expect(downloadSpec('https://example.com/openapi.json')).resolves.toContain('3.0.1');
  });

  it('throws a NetworkError when the request fails', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve(''),
    });

    await expect(downloadSpec('https://example.com/openapi.json')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('throws a NetworkError when the request rejects', async () => {
    mockedFetch.mockRejectedValue(new Error('boom'));

    await expect(downloadSpec('https://example.com/openapi.json')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});

describe('parseSpec', () => {
  it('parses valid JSON into an object', () => {
    const raw = JSON.stringify(createMockSpec());
    const parsed = parseSpec(raw);

    expect(parsed.openapi).toBe('3.0.1');
  });
});
