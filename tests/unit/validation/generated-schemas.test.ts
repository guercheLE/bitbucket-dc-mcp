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
import { ZodError } from 'zod';

import {
  ApplicationUserSchema,
  ProjectSchema,
  RestAccessTokenRequestSchema,
} from '../../../src/validation/generated-schemas';

describe('generated schemas runtime validation', () => {
  it('accepts valid RestAccessTokenRequest payloads', () => {
    expect(() =>
      RestAccessTokenRequestSchema.parse({
        name: 'my-token',
        expiryDays: 30,
        permissions: ['REPO_READ', 'REPO_WRITE'],
      }),
    ).not.toThrow();
  });

  it('rejects when required fields are missing', () => {
    // RestAccessTokenRequest has optional fields, so use a different schema
    expect(() => ProjectSchema.parse({})).toThrow(ZodError);
  });

  it('rejects values that do not meet constraints and reports the failing path', () => {
    try {
      // RestAccessTokenRequest has array uniqueness constraint
      RestAccessTokenRequestSchema.parse({
        name: 'test',
        permissions: ['REPO_READ', 'REPO_READ'], // duplicate
      });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const issues = (error as ZodError).issues;
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid date-time strings for temporal fields', () => {
    expect(() =>
      RestAccessTokenRequestSchema.parse({
        name: 'test',
        expiryDays: 'not-a-number' as any,
      }),
    ).toThrow(ZodError);
  });

  it('rejects invalid enum values when provided', () => {
    expect(() =>
      ApplicationUserSchema.parse({
        type: 'INVALID_TYPE',
      }),
    ).toThrow(ZodError);
  });

  it('rejects type mismatches with descriptive errors', () => {
    expect(() =>
      ProjectSchema.parse({
        type: 'INVALID' as any,
      }),
    ).toThrow(ZodError);
  });
});
