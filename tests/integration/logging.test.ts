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
 * Integration tests for Structured Logging & Observability
 *
 * Tests end-to-end logging behavior:
 * - Correlation ID generation and propagation
 * - Sensitive data sanitization
 * - Audit trail for mutation operations
 * - Log structure and JSON parseability
 * - Full request lifecycle logging
 *
 * These tests require a mock Bitbucket server.
 * Run with: RUN_INTEGRATION_TESTS=true npm test
 */

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthManager, StubCredentialStorage } from '../../src/auth/auth-manager.js';
import { ConfigManager } from '../../src/core/config-manager.js';
import {
  createCorrelationContext,
  runWithCorrelationContext,
} from '../../src/core/correlation-context.js';
import { RateLimiter } from '../../src/core/rate-limiter.js';
import { BitbucketClientService } from '../../src/services/bitbucket-client.js';
import { CallIdTool } from '../../src/tools/call-id-tool.js';
import { type OperationsRepository } from '../../src/tools/get-id-tool.js';
import { LogCapture } from '../helpers/log-capture.js';
import { describeIfIntegration } from '../helpers/skip-integration.js';

// Mock the validator to bypass schema validation in integration tests
vi.mock('../../src/validation/validator.js', () => ({
  validateOperationInput: vi.fn(async (_operationId, params) => ({
    success: true,
    data: params,
  })),
}));

describeIfIntegration('Logging Integration Tests', () => {
  let mockServer: Server;
  let serverUrl: string;
  let logCapture: LogCapture;
  let bitbucketClient: BitbucketClientService;
  let callTool: CallIdTool;

  // Mock operations repository with mutation operations
  const mockOperationsRepository: OperationsRepository = {
    getOperation: (operationId: string) => {
      const operations: Record<string, any> = {
        createRepository: {
          operationId: 'createRepository',
          method: 'POST',
          path: '/rest/api/latest/projects/{projectKey}/repos',
          summary: 'Create repository',
          description: 'Creates a new repository',
          tags: ['Repository'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        getRepository: {
          operationId: 'getRepository',
          method: 'GET',
          path: '/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}',
          summary: 'Get repository',
          description: 'Gets a repository',
          tags: ['Repository'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        updateRepository: {
          operationId: 'updateRepository',
          method: 'PUT',
          path: '/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}',
          summary: 'Update repository',
          description: 'Updates a repository',
          tags: ['Repository'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        deleteRepository: {
          operationId: 'deleteRepository',
          method: 'DELETE',
          path: '/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}',
          summary: 'Delete repository',
          description: 'Deletes a repository',
          tags: ['Repository'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
      };
      return operations[operationId] || null;
    },
  };

  beforeEach(async () => {
    // Create log capture
    logCapture = new LogCapture();

    // Create mock Bitbucket server
    mockServer = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        // Check auth header
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errorMessages: ['Unauthorized'] }));
          return;
        }

        // Handle different endpoints
        if (req.url?.includes('/rest/api/3/issue') && req.method === 'POST') {
          // Create issue
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: '10001',
              key: 'TEST-1',
              self: `${serverUrl}/rest/api/3/issue/10001`,
            }),
          );
        } else if (req.url?.includes('/rest/api/3/issue') && req.method === 'PUT') {
          // Update issue
          res.writeHead(204);
          res.end();
        } else if (req.url?.includes('/rest/api/3/issue') && req.method === 'DELETE') {
          // Delete issue
          res.writeHead(204);
          res.end();
        } else if (req.url?.includes('/rest/api/3/issue') && req.method === 'GET') {
          // Get issue
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test issue',
                status: { name: 'Open' },
              },
            }),
          );
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errorMessages: ['Not found'] }));
        }
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, () => {
        const address = mockServer.address() as AddressInfo;
        serverUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });

    // Create service instances with mock server URL
    const config = await ConfigManager.load({
      bitbucketUrl: serverUrl,
      timeout: 5000, // 5s timeout for tests
    });

    // Create credential storage and populate with test credentials
    const credentialStorage = new StubCredentialStorage();
    await credentialStorage.save(serverUrl, {
      bitbucket_url: serverUrl,
      auth_method: 'pat',
      access_token: 'test_token',
    });

    const authManager = new AuthManager(
      credentialStorage,
      logCapture.createLogger({ useStringLevels: true }),
      config,
    );
    const rateLimiter = new RateLimiter({ capacity: 100, refillRate: 100 });

    bitbucketClient = new BitbucketClientService(
      authManager,
      rateLimiter,
      logCapture.createLogger({ useStringLevels: true }),
      config,
      mockOperationsRepository,
    );

    callTool = new CallIdTool(
      bitbucketClient,
      authManager,
      mockOperationsRepository,
      logCapture.createLogger({ useStringLevels: true }),
      config,
    );
  });

  afterEach(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => {
        mockServer.close(() => resolve());
      });
    }
    logCapture.clear();
    delete process.env.BITBUCKET_URL;
    delete process.env.BITBUCKET_PAT;
  });

  describe('Correlation ID Propagation', () => {
    it('should generate correlation ID and propagate through all log entries', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'getRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'getRepository',
          parameters: {
            issueIdOrKey: 'TEST-1',
          },
        });
      });

      const logs = logCapture.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      // All logs should have the same correlation ID
      const correlationIds = logs.map((log) => log.correlation_id).filter((id) => id !== undefined);
      const uniqueIds = new Set(correlationIds);

      expect(uniqueIds.size).toBe(1);
      expect(uniqueIds.has(context.correlationId)).toBe(true);
    });

    it('should include correlation ID in request, response, and error logs', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'createRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'createRepository',
          parameters: {
            fields: {
              project: { key: 'TEST' },
              summary: 'Test issue',
              issuetype: { name: 'Bug' },
            },
          },
        });
      });

      const logs = logCapture.getLogs();

      // Find request log
      const requestLog = logs.find(
        (log) => log.event === 'call_id.execution_start' || log.tool_name === 'call_id',
      );
      expect(requestLog?.correlation_id).toBe(context.correlationId);

      // Find response log
      const responseLog = logs.find((log) => log.event === 'call_id.execution_success');
      expect(responseLog?.correlation_id).toBe(context.correlationId);
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should mask sensitive fields (password, token, credentials) in logs', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'createRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'createRepository',
          parameters: {
            fields: {
              project: { key: 'TEST' },
              summary: 'Test issue with sensitive data',
              password: 'super-secret-password',
              auth_token: 'Bearer secret-token-123',
              credentials: {
                username: 'user',
                password: 'another-secret',
              },
            },
          },
        });
      });

      const logs = logCapture.getLogs();
      const logString = JSON.stringify(logs);

      // Sensitive data should not appear in logs
      expect(logString).not.toContain('super-secret-password');
      expect(logString).not.toContain('secret-token-123');
      expect(logString).not.toContain('another-secret');

      // Should be masked with ***
      expect(logString).toContain('***');

      // Non-sensitive data should be present
      expect(logString).toContain('TEST');
      expect(logString).toContain('Test issue with sensitive data');
    });

    it('should mask nested sensitive fields in complex objects', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'createRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'createRepository',
          parameters: {
            fields: {
              project: { key: 'TEST' },
              summary: 'Test nested sensitive data',
              customfield_10000: {
                authentication: {
                  token: 'nested-secret-token',
                  refresh_token: 'nested-refresh-token',
                },
              },
            },
          },
        });
      });

      const logs = logCapture.getLogs();
      const logString = JSON.stringify(logs);

      // Nested sensitive data should not appear
      expect(logString).not.toContain('nested-secret-token');
      expect(logString).not.toContain('nested-refresh-token');
    });
  });

  describe('Audit Trail for Mutations', () => {
    it('should generate audit log for POST (create) operations', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'createRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'createRepository',
          parameters: {
            fields: {
              project: { key: 'TEST' },
              summary: 'Audit test issue',
              issuetype: { name: 'Bug' },
            },
          },
        });
      });

      const auditLog = logCapture.findLog(
        (log) => log.audit_type === 'mutation' && log.method === 'POST',
      );

      expect(auditLog).toBeDefined();
      expect(auditLog?.operation_id).toBe('createRepository');
      expect(auditLog?.method).toBe('POST');
      expect(auditLog?.path).toBe('/rest/api/3/issue');
      expect(auditLog?.correlation_id).toBe(context.correlationId);
      expect(auditLog?.bitbucket_url).toBe(serverUrl);
      expect(auditLog?.parameters).toBeDefined();
      expect(auditLog?.parameters.fields).toBeDefined();
    });

    it('should generate audit log for PUT (update) operations', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'updateRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'updateRepository',
          parameters: {
            issueIdOrKey: 'TEST-1',
            fields: {
              summary: 'Updated summary',
            },
          },
        });
      });

      const auditLog = logCapture.findLog(
        (log) => log.audit_type === 'mutation' && log.method === 'PUT',
      );

      expect(auditLog).toBeDefined();
      expect(auditLog?.operation_id).toBe('updateRepository');
      expect(auditLog?.method).toBe('PUT');
      expect(auditLog?.correlation_id).toBe(context.correlationId);
    });

    it('should generate audit log for DELETE operations', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'deleteRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'deleteRepository',
          parameters: {
            issueIdOrKey: 'TEST-1',
          },
        });
      });

      const auditLog = logCapture.findLog(
        (log) => log.audit_type === 'mutation' && log.method === 'DELETE',
      );

      expect(auditLog).toBeDefined();
      expect(auditLog?.operation_id).toBe('deleteRepository');
      expect(auditLog?.method).toBe('DELETE');
      expect(auditLog?.correlation_id).toBe(context.correlationId);
    });

    it('should NOT generate audit log for GET (read) operations', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'getRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'getRepository',
          parameters: {
            issueIdOrKey: 'TEST-1',
          },
        });
      });

      const auditLogs = logCapture.findLogs((log) => log.audit_type === 'mutation');

      expect(auditLogs).toHaveLength(0);
    });
  });

  describe('Log Structure and JSON Parseability', () => {
    it('should generate valid JSON logs that can be parsed', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'getRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'getRepository',
          parameters: {
            issueIdOrKey: 'TEST-1',
          },
        });
      });

      const logs = logCapture.getLogs();

      // All logs should be valid objects (already parsed by LogCapture)
      logs.forEach((log) => {
        expect(log).toBeTypeOf('object');
        expect(log).not.toBeNull();
      });

      // Should be re-serializable to JSON
      expect(() => JSON.stringify(logs)).not.toThrow();
    });

    it('should include required base fields in all logs', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'getRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'getRepository',
          parameters: {
            issueIdOrKey: 'TEST-1',
          },
        });
      });

      const logs = logCapture.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      logs.forEach((log) => {
        // Base fields from AC2
        expect(log.time).toBeDefined();
        expect(typeof log.time).toBe('number');
        expect(log.level).toBeDefined();
        expect(['debug', 'info', 'warn', 'error']).toContain(log.level);

        // Service identification
        expect(log.service).toBe('bitbucket-dc-mcp');
        expect(log.version).toBeDefined();

        // Correlation context
        if (log.correlation_id) {
          expect(log.correlation_id).toBe(context.correlationId);
        }
      });
    });

    it('should include request-specific fields in request logs', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'createRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'createRepository',
          parameters: {
            fields: {
              project: { key: 'TEST' },
              summary: 'Request log test',
            },
          },
        });
      });

      const requestLog = logCapture.findLog((log) => log.event === 'call_id.execution_start');

      expect(requestLog).toBeDefined();
      expect(requestLog?.tool_name).toBe('call_id');
      expect(requestLog?.operation_id).toBe('createRepository');
      expect(requestLog?.correlation_id).toBe(context.correlationId);
    });

    it('should include latency_ms in response logs', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'getRepository',
      );

      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'getRepository',
          parameters: {
            issueIdOrKey: 'TEST-1',
          },
        });
      });

      const responseLog = logCapture.findLog((log) => log.event === 'call_id.execution_success');

      expect(responseLog).toBeDefined();
      expect(responseLog?.latency_ms).toBeDefined();
      expect(typeof responseLog?.latency_ms).toBe('number');
      expect(responseLog?.latency_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Logging with Context', () => {
    it('should log errors with correlation context and stack trace', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'getRepository',
      );

      // Test with non-existent operation to trigger error
      await runWithCorrelationContext(context, async () => {
        const result = await callTool.execute({
          operation_id: 'nonexistent_operation',
          parameters: {
            issueIdOrKey: 'TEST-1',
          },
        });

        // Should return error response
        expect(result.isError).toBe(true);
      });

      const errorLog = logCapture.findLog(
        (log) => log.level === 'error' && log.event === 'call_id.error',
      );

      expect(errorLog).toBeDefined();
      expect(errorLog?.correlation_id).toBe(context.correlationId);
    });
  });

  describe('Full Request Lifecycle Logging', () => {
    it('should log complete request lifecycle: start -> API call -> success', async () => {
      const context = createCorrelationContext(
        'bitbucket-dc-mcp',
        '1.0.0',
        'call_id',
        'createRepository',
      );
      await runWithCorrelationContext(context, async () => {
        await callTool.execute({
          operation_id: 'createRepository',
          parameters: {
            fields: {
              project: { key: 'TEST' },
              summary: 'Lifecycle test',
            },
          },
        });
      });

      const logs = logCapture.getLogs();

      // Should have request start log
      const startLog = logs.find((log) => log.event === 'call_id.execution_start');
      expect(startLog).toBeDefined();

      // Should have API request logs
      const apiLogs = logs.filter(
        (log) =>
          log.event === 'bitbucket_client.api_request' ||
          log.event === 'bitbucket_client.api_response',
      );
      expect(apiLogs.length).toBeGreaterThan(0);

      // Should have success log
      const successLog = logs.find((log) => log.event === 'call_id.execution_success');
      expect(successLog).toBeDefined();

      // All logs should have same correlation ID
      const correlationIds = new Set(
        logs.map((log) => log.correlation_id).filter((id) => id !== undefined),
      );
      expect(correlationIds.size).toBe(1);
    });
  });
});
