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
import {
  containsSensitiveData,
  sanitizeError,
  sanitizeLogContext,
  sanitizeParams,
} from '../../../src/core/sanitizer.js';

describe('Sanitizer', () => {
  describe('sanitizeParams', () => {
    it('should sanitize password field', () => {
      const params = {
        username: 'user',
        password: 'secret123',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.username).toBe('user');
      expect(sanitized.password).toBe('***');
    });

    it('should sanitize token field', () => {
      const params = {
        token: 'abc-xyz-123',
        data: 'public',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.token).toBe('***');
      expect(sanitized.data).toBe('public');
    });

    it('should sanitize multiple sensitive fields', () => {
      const params = {
        password: 'secret',
        token: 'token123',
        access_token: 'access',
        refresh_token: 'refresh',
        apiKey: 'key123',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.password).toBe('***');
      expect(sanitized.token).toBe('***');
      expect(sanitized.access_token).toBe('***');
      expect(sanitized.refresh_token).toBe('***');
      expect(sanitized.apiKey).toBe('***');
    });

    it('should sanitize nested sensitive fields', () => {
      const params = {
        user: 'john',
        auth: {
          token: 'secret-token',
          password: 'secret-password',
        },
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.user).toBe('john');
      expect(sanitized.auth.token).toBe('***');
      expect(sanitized.auth.password).toBe('***');
    });

    it('should sanitize deeply nested fields', () => {
      const params = {
        level1: {
          level2: {
            level3: {
              password: 'deep-secret',
              public: 'visible',
            },
          },
        },
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.level1.level2.level3.password).toBe('***');
      expect(sanitized.level1.level2.level3.public).toBe('visible');
    });

    it('should handle arrays with sensitive data', () => {
      const params = {
        users: [
          { name: 'user1', password: 'secret1' },
          { name: 'user2', password: 'secret2' },
        ],
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.users[0].name).toBe('user1');
      expect(sanitized.users[0].password).toBe('***');
      expect(sanitized.users[1].name).toBe('user2');
      expect(sanitized.users[1].password).toBe('***');
    });

    it('should not mutate the original object', () => {
      const original = {
        username: 'user',
        password: 'secret',
      };

      const sanitized = sanitizeParams(original);

      expect(original.password).toBe('secret'); // Original unchanged
      expect(sanitized.password).toBe('***'); // Sanitized copy
    });

    it('should handle null and undefined', () => {
      expect(sanitizeParams(null)).toBeNull();
      expect(sanitizeParams(undefined)).toBeUndefined();
    });

    it('should handle empty objects', () => {
      const sanitized = sanitizeParams({});
      expect(sanitized).toEqual({});
    });

    it('should sanitize fields with case-insensitive matching', () => {
      const params = {
        PASSWORD: 'secret1',
        Token: 'secret2',
        aPiKeY: 'secret3',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.PASSWORD).toBe('***');
      expect(sanitized.Token).toBe('***');
      expect(sanitized.aPiKeY).toBe('***');
    });

    it('should sanitize fields containing sensitive keywords', () => {
      const params = {
        userPassword: 'secret1',
        authToken: 'secret2',
        privateKey: 'secret3',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.userPassword).toBe('***');
      expect(sanitized.authToken).toBe('***');
      expect(sanitized.privateKey).toBe('***');
    });
  });

  describe('sanitizeLogContext', () => {
    it('should sanitize context with sensitive data', () => {
      const context = {
        operation: 'create_issue',
        credentials: 'user:pass',
        project: 'PROJ',
      };

      const sanitized = sanitizeLogContext(context);

      expect(sanitized.operation).toBe('create_issue');
      expect(sanitized.credentials).toBe('***');
      expect(sanitized.project).toBe('PROJ');
    });

    it('should handle nested context objects', () => {
      const context = {
        request: {
          url: '/api/issue',
          headers: {
            authorization: 'Bearer token123',
          },
        },
      };

      const sanitized = sanitizeLogContext(context);

      expect(sanitized.request.url).toBe('/api/issue');
      expect(sanitized.request.headers.authorization).toBe('***');
    });
  });

  describe('sanitizeError', () => {
    it('should preserve error name, message, and stack', () => {
      const error = new Error('Test error');
      const sanitized = sanitizeError(error);

      expect(sanitized.name).toBe('Error');
      expect(sanitized.message).toBe('Test error');
      expect(sanitized.stack).toBeDefined();
      expect(typeof sanitized.stack).toBe('string');
    });

    it('should sanitize additional error properties', () => {
      const error: any = new Error('Auth failed');
      error.credentials = 'user:pass';
      error.statusCode = 401;

      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('Auth failed');
      expect(sanitized.credentials).toBe('***');
      expect(sanitized.statusCode).toBe(401);
    });

    it('should sanitize nested objects in error', () => {
      const error: any = new Error('Request failed');
      error.context = {
        url: '/api',
        token: 'secret-token',
      };

      const sanitized = sanitizeError(error);

      expect(sanitized.context.url).toBe('/api');
      expect(sanitized.context.token).toBe('***');
    });
  });

  describe('containsSensitiveData', () => {
    it('should detect sensitive field names', () => {
      const obj = {
        username: 'user',
        password: 'secret',
      };

      expect(containsSensitiveData(obj)).toBe(true);
    });

    it('should detect token-like strings', () => {
      const tokenLike = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
      expect(containsSensitiveData(tokenLike)).toBe(true);
    });

    it('should not flag normal strings', () => {
      expect(containsSensitiveData('hello world')).toBe(false);
      expect(containsSensitiveData('user@example.com')).toBe(false);
    });

    it('should detect nested sensitive data', () => {
      const obj = {
        user: {
          profile: {
            credentials: 'secret',
          },
        },
      };

      expect(containsSensitiveData(obj)).toBe(true);
    });

    it('should return false for safe data', () => {
      const obj = {
        username: 'user',
        email: 'user@example.com',
        age: 25,
      };

      expect(containsSensitiveData(obj)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(containsSensitiveData(null)).toBe(false);
      expect(containsSensitiveData(undefined)).toBe(false);
    });

    it('should handle primitive types', () => {
      expect(containsSensitiveData(123)).toBe(false);
      expect(containsSensitiveData(true)).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should sanitize Bitbucket issue creation params', () => {
      const params = {
        fields: {
          project: { key: 'PROJ' },
          summary: 'Test issue',
          description: 'Test description',
          issuetype: { name: 'Bug' },
        },
        auth: {
          token: 'secret-bitbucket-token',
        },
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.fields.project.key).toBe('PROJ');
      expect(sanitized.fields.summary).toBe('Test issue');
      expect(sanitized.auth.token).toBe('***');
    });

    it('should sanitize OAuth configuration', () => {
      const config = {
        client_id: 'public-client-id',
        client_secret: 'very-secret-key',
        redirect_uri: 'http://localhost:3000/callback',
      };

      const sanitized = sanitizeParams(config);

      expect(sanitized.client_id).toBe('public-client-id');
      expect(sanitized.client_secret).toBe('***');
      expect(sanitized.redirect_uri).toBe('http://localhost:3000/callback');
    });

    it('should sanitize mixed array and object structures', () => {
      const data = {
        operations: [
          { type: 'read', apiKey: 'key1' },
          { type: 'write', apiKey: 'key2' },
        ],
        metadata: {
          user: 'john',
          session: {
            token: 'session-token',
          },
        },
      };

      const sanitized = sanitizeParams(data);

      expect(sanitized.operations[0].type).toBe('read');
      expect(sanitized.operations[0].apiKey).toBe('***');
      expect(sanitized.operations[1].apiKey).toBe('***');
      expect(sanitized.metadata.user).toBe('john');
      expect(sanitized.metadata.session.token).toBe('***');
    });
  });
});
