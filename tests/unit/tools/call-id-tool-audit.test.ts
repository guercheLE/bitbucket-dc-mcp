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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../../src/core/config-manager.ts';
import { CallIdTool } from '../../../src/tools/call-id-tool.ts';
import { LogCapture } from '../../helpers/log-capture.ts';

// Mock the validator module
vi.mock('../../../src/validation/validator.ts', () => ({
  validateOperationInput: vi.fn(async (_operationId: string, params: unknown) => ({
    success: true,
    data: params,
  })),
}));

describe('CallIdTool - Audit Logging', () => {
  let tool: CallIdTool;
  let logCapture: LogCapture;
  let mockAuthManager: any;
  let mockBitbucketClient: any;
  let mockOperationsRepository: any;

  const mockConfig: AppConfig = {
    bitbucketUrl: 'https://bitbucket.example.com',
    authMethod: 'pat',
    rateLimit: 100,
    timeout: 30_000,
    logLevel: 'info',
    cacheSize: 1_000,
    retryAttempts: 3,
    shutdownTimeoutMs: 30_000,
    logPretty: false,
  };

  beforeEach(() => {
    logCapture = new LogCapture();

    // Mock auth manager
    mockAuthManager = {
      getCredentials: vi.fn().mockResolvedValue({
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'test-token',
        username: 'test-user@example.com',
      }),
      getAuthHeaders: vi.fn().mockResolvedValue({
        Authorization: 'Bearer test-token',
      }),
    };

    // Mock Bitbucket client
    mockBitbucketClient = {
      executeOperation: vi.fn().mockResolvedValue({
        status: 200,
        data: { id: '123', key: 'TEST-1' },
      }),
      request: vi.fn().mockResolvedValue({
        status: 200,
        data: { id: '123', key: 'TEST-1' },
      }),
    };

    // Mock operations repository
    mockOperationsRepository = {
      getOperation: vi.fn().mockReturnValue({
        operationId: 'create_issue',
        summary: 'Create issue',
        method: 'POST',
        path: '/rest/api/2/issue',
        tags: ['Issues'],
      }),
    };

    tool = new CallIdTool(
      mockBitbucketClient,
      mockAuthManager,
      mockOperationsRepository,
      logCapture.createLogger(),
      mockConfig,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mutation Audit Logging', () => {
    it('should log comprehensive audit trail for POST mutations', async () => {
      const result = await tool.execute({
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
            issuetype: { name: 'Bug' },
          },
        },
      });

      const logs = logCapture.getLogs();
      console.log('All logs:', JSON.stringify(logs, null, 2));

      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog).toMatchObject({
        event: 'call_id.mutation_audit',
        audit_type: 'mutation',
        operation_id: 'create_issue',
        bitbucket_url: 'https://bitbucket.example.com',
        method: 'POST',
        path: '/rest/api/2/issue',
        token_type: 'pat',
        user_id: 'test-user@example.com',
      });
      expect(auditLog.traceId).toBeDefined();
      expect(auditLog.parameters).toBeDefined();
      expect(auditLog.timestamp).toBeDefined();
    });

    it('should log comprehensive audit trail for PUT mutations', async () => {
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'edit_issue',
        method: 'PUT',
        path: '/rest/api/2/issue/{issueIdOrKey}',
      });

      mockBitbucketClient.executeOperation.mockResolvedValue({
        status: 204,
        data: null,
      });

      await tool.execute({
        operation_id: 'edit_issue',
        parameters: {
          issueIdOrKey: 'TEST-1',
          update: {
            summary: [{ set: 'Updated summary' }],
          },
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog).toMatchObject({
        event: 'call_id.mutation_audit',
        audit_type: 'mutation',
        operation_id: 'edit_issue',
        method: 'PUT',
        path: '/rest/api/2/issue/{issueIdOrKey}',
      });
    });

    it('should log comprehensive audit trail for DELETE mutations', async () => {
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'delete_issue',
        method: 'DELETE',
        path: '/rest/api/2/issue/{issueIdOrKey}',
      });

      mockBitbucketClient.executeOperation.mockResolvedValue({
        status: 204,
        data: null,
      });

      await tool.execute({
        operation_id: 'delete_issue',
        parameters: {
          issueIdOrKey: 'TEST-1',
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog).toMatchObject({
        event: 'call_id.mutation_audit',
        audit_type: 'mutation',
        operation_id: 'delete_issue',
        method: 'DELETE',
        path: '/rest/api/2/issue/{issueIdOrKey}',
      });
    });

    it('should NOT log audit trail for GET operations', async () => {
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'get_issue',
        method: 'GET',
        path: '/rest/api/2/issue/{issueIdOrKey}',
      });

      await tool.execute({
        operation_id: 'get_issue',
        parameters: {
          issueIdOrKey: 'TEST-1',
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeUndefined();
    });

    it('should sanitize sensitive data in audit logs', async () => {
      await tool.execute({
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
            password: 'password123',
            apiKey: 'secret-key',
          },
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog.parameters).toBeDefined();

      // Verify sensitive fields are redacted with '***'
      const paramsStr = JSON.stringify(auditLog.parameters);
      expect(paramsStr).toContain('***');
      expect(paramsStr).not.toContain('password123');
      expect(paramsStr).not.toContain('secret-key');
    });

    it('should include correlation ID in audit logs', async () => {
      await tool.execute({
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
          },
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog.traceId).toBeDefined();
      expect(typeof auditLog.traceId).toBe('string');
      expect(auditLog.traceId.length).toBeGreaterThan(0);
    });

    it('should include Bitbucket URL in audit logs', async () => {
      await tool.execute({
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
          },
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog.bitbucket_url).toBe('https://bitbucket.example.com');
    });

    it('should include operation path in audit logs', async () => {
      await tool.execute({
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
          },
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog.path).toBe('/rest/api/2/issue');
    });

    it('should handle unknown operation gracefully (no audit for unknown ops)', async () => {
      mockOperationsRepository.getOperation.mockReturnValue(null);

      await tool.execute({
        operation_id: 'unknown_operation',
        parameters: {},
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      // Unknown operations cannot be identified as mutations, so no audit log
      expect(auditLog).toBeUndefined();
    });

    it('should include authentication context in audit logs', async () => {
      mockAuthManager.getCredentials.mockResolvedValue({
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'oauth-token',
        username: 'oauth-user',
      });

      await tool.execute({
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
          },
        },
      });

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog.token_type).toBe('oauth2');
      expect(auditLog.user_id).toBe('oauth-user');
    });

    it('should log audit trail even on operation failure', async () => {
      mockBitbucketClient.executeOperation = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        operation_id: 'create_issue',
        parameters: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
          },
        },
      });

      // Should return error response, not throw
      expect(result.isError).toBe(true);

      const logs = logCapture.getLogs();
      const auditLog = logs.find((log: any) => log.msg?.includes('Mutation audit trail'));

      expect(auditLog).toBeDefined();
      expect(auditLog.operation_id).toBe('create_issue');
    });
  });

  describe('Mutation Detection via Execution', () => {
    it('should log audit trail for POST operations', async () => {
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'create_issue',
        method: 'POST',
        path: '/rest/api/2/issue',
      });

      await tool.execute({
        operation_id: 'create_issue',
        parameters: { fields: { project: { key: 'TEST' }, summary: 'Test' } },
      });

      const auditLog = logCapture.findLog((log: any) => log.msg?.includes('Mutation audit trail'));
      expect(auditLog).toBeDefined();
    });

    it('should log audit trail for PATCH operations', async () => {
      mockOperationsRepository.getOperation.mockReturnValue({
        operationId: 'patch_issue',
        method: 'PATCH',
        path: '/rest/api/2/issue/{issueIdOrKey}',
      });

      await tool.execute({
        operation_id: 'patch_issue',
        parameters: { issueIdOrKey: 'TEST-1', update: {} },
      });

      const auditLog = logCapture.findLog((log: any) => log.msg?.includes('Mutation audit trail'));
      expect(auditLog).toBeDefined();
    });
  });
});
