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
 * Manual integration tests for CallIdTool with real Bitbucket Data Center instance
 *
 * ⚠️ REQUIRES REAL BITBUCKET DC INSTANCE WITH TEST PROJECT
 *
 * These tests are SKIPPED in CI and must be run manually.
 *
 * ## Setup Instructions
 *
 * 1. Set environment variables:
 *    ```bash
 *    export BITBUCKET_URL="https://your-bitbucket-dc.com"
 *    export BITBUCKET_TOKEN="your-personal-access-token"
 *    export BITBUCKET_TEST_PROJECT="TESTPROJ"  # Project key for test issues
 *    ```
 *
 * 2. Run manual tests:
 *    ```bash
 *    npm run test:manual
 *    # OR run specific file:
 *    npx vitest tests/integration/real-bitbucket-dc.manual.test.ts --no-file-parallelism
 *    ```
 *
 * ## Test Requirements
 *
 * - Bitbucket Data Center instance must be accessible
 * - Personal Access Token with permissions:
 *   - CREATE_ISSUES
 *   - EDIT_ISSUES
 *   - DELETE_ISSUES
 *   - BROWSE_PROJECTS
 * - Test project must exist with:
 *   - At least one issue type (Task, Bug, etc.)
 *   - At least one existing issue for GET tests
 *
 * ## Cleanup
 *
 * Tests automatically cleanup created issues after execution.
 * If tests fail, manually delete issues with summary "TEST: Manual integration test"
 */

import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthManager } from '../../src/auth/auth-manager.js';
import { ConfigManager } from '../../src/core/config-manager.js';
import { RateLimiter } from '../../src/core/rate-limiter.js';
import { BitbucketClientService } from '../../src/services/bitbucket-client.js';
import { CallIdTool } from '../../src/tools/call-id-tool.js';
import type { OperationsRepository } from '../../src/tools/get-id-tool.js';

// Skip these tests in CI - only run manually
describe.skip('Manual Real Bitbucket DC Tests', () => {
  let tool: CallIdTool;
  let logger: pino.Logger;
  let createdIssueKeys: string[] = [];

  const BITBUCKET_URL = process.env.BITBUCKET_URL;
  const BITBUCKET_TOKEN = process.env.BITBUCKET_TOKEN;
  const TEST_PROJECT = process.env.BITBUCKET_TEST_PROJECT || 'TEST';

  // Mock operations repository (minimal implementation)
  const mockOperationsRepository: OperationsRepository = {
    getOperation: (operationId: string) => {
      const operations: Record<
        string,
        {
          operationId: string;
          method: string;
          path: string;
          summary: string;
          description: string;
          tags: string[];
          parameters: never[];
          requestBody: null;
          responses: Record<string, never>;
        }
      > = {
        create_issue: {
          operationId: 'create_issue',
          method: 'POST',
          path: '/rest/api/3/issue',
          summary: 'Create issue',
          description: 'Creates a new issue',
          tags: ['Issues'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        get_issue: {
          operationId: 'get_issue',
          method: 'GET',
          path: '/rest/api/3/issue/{issueIdOrKey}',
          summary: 'Get issue',
          description: 'Gets an issue',
          tags: ['Issues'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        update_issue: {
          operationId: 'update_issue',
          method: 'PUT',
          path: '/rest/api/3/issue/{issueIdOrKey}',
          summary: 'Update issue',
          description: 'Updates an issue',
          tags: ['Issues'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        delete_issue: {
          operationId: 'delete_issue',
          method: 'DELETE',
          path: '/rest/api/3/issue/{issueIdOrKey}',
          summary: 'Delete issue',
          description: 'Deletes an issue',
          tags: ['Issues'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        search_issues: {
          operationId: 'search_issues',
          method: 'GET',
          path: '/rest/api/3/search',
          summary: 'Search issues',
          description: 'Searches for issues',
          tags: ['Search'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
      };
      return operations[operationId] || null;
    },
  } as OperationsRepository;

  beforeAll(async () => {
    if (!BITBUCKET_URL || !BITBUCKET_TOKEN) {
      throw new Error(
        'Missing environment variables: BITBUCKET_URL and BITBUCKET_TOKEN are required for manual tests',
      );
    }

    logger = pino({ level: 'info' }); // Show logs for manual tests

    const config = await ConfigManager.load({
      bitbucketUrl: BITBUCKET_URL,
      timeout: 30000, // 30s timeout for real API calls
    });

    const authManager = new AuthManager();
    const rateLimiter = new RateLimiter({ capacity: 100, refillRate: 100 });

    const bitbucketClient = new BitbucketClientService(
      authManager,
      rateLimiter,
      logger,
      config,
      mockOperationsRepository,
    );

    tool = new CallIdTool(bitbucketClient, authManager, mockOperationsRepository, logger, config);
  });

  afterAll(async () => {
    // Cleanup created issues
    logger.info(`Cleaning up ${createdIssueKeys.length} test issues...`);

    for (const issueKey of createdIssueKeys) {
      try {
        await tool.execute({
          operation_id: 'delete_issue',
          parameters: {
            issueIdOrKey: issueKey,
          },
        });
        logger.info(`Deleted test issue: ${issueKey}`);
      } catch (error) {
        logger.error(`Failed to delete test issue ${issueKey}: ${error}`);
      }
    }
  });

  it('should create a real issue', async () => {
    const input = {
      operation_id: 'create_issue',
      parameters: {
        fields: {
          project: { key: TEST_PROJECT },
          summary: 'TEST: Manual integration test - Create issue',
          description: 'This is a test issue created by manual integration tests',
          issuetype: { name: 'Task' },
        },
      },
    };

    const result = await tool.execute(input);

    expect(result.isError).toBeUndefined();
    const parsedContent = JSON.parse(result.content[0].text);

    expect(parsedContent.id).toBeDefined();
    expect(parsedContent.key).toBeDefined();
    expect(parsedContent.self).toContain('/rest/api/3/issue/');

    // Track for cleanup
    createdIssueKeys.push(parsedContent.key);

    logger.info(`Created issue: ${parsedContent.key}`);
  });

  it('should get a real issue', async () => {
    // First create an issue
    const createResult = await tool.execute({
      operation_id: 'create_issue',
      parameters: {
        fields: {
          project: { key: TEST_PROJECT },
          summary: 'TEST: Manual integration test - Get issue',
          issuetype: { name: 'Task' },
        },
      },
    });

    const createdIssue = JSON.parse(createResult.content[0].text);
    createdIssueKeys.push(createdIssue.key);

    // Now get the issue
    const input = {
      operation_id: 'get_issue',
      parameters: {
        issueIdOrKey: createdIssue.key,
      },
    };

    const result = await tool.execute(input);

    expect(result.isError).toBeUndefined();
    const parsedContent = JSON.parse(result.content[0].text);

    expect(parsedContent.id).toBe(createdIssue.id);
    expect(parsedContent.key).toBe(createdIssue.key);
    expect(parsedContent.fields).toBeDefined();
    expect(parsedContent.fields.summary).toContain('TEST: Manual integration test - Get issue');

    logger.info(`Retrieved issue: ${parsedContent.key}`);
  });

  it('should update a real issue', async () => {
    // First create an issue
    const createResult = await tool.execute({
      operation_id: 'create_issue',
      parameters: {
        fields: {
          project: { key: TEST_PROJECT },
          summary: 'TEST: Manual integration test - Update issue (original)',
          issuetype: { name: 'Task' },
        },
      },
    });

    const createdIssue = JSON.parse(createResult.content[0].text);
    createdIssueKeys.push(createdIssue.key);

    // Update the issue
    const updateInput = {
      operation_id: 'update_issue',
      parameters: {
        issueIdOrKey: createdIssue.key,
        fields: {
          summary: 'TEST: Manual integration test - Update issue (UPDATED)',
          description: 'This issue was updated by manual integration tests',
        },
      },
    };

    const updateResult = await tool.execute(updateInput);

    expect(updateResult.isError).toBeUndefined();

    // Verify update by getting the issue
    const getResult = await tool.execute({
      operation_id: 'get_issue',
      parameters: {
        issueIdOrKey: createdIssue.key,
      },
    });

    const updatedIssue = JSON.parse(getResult.content[0].text);
    expect(updatedIssue.fields.summary).toBe(
      'TEST: Manual integration test - Update issue (UPDATED)',
    );
    expect(updatedIssue.fields.description).toContain('updated by manual integration tests');

    logger.info(`Updated issue: ${createdIssue.key}`);
  });

  it('should search for issues using JQL', async () => {
    // First create a couple of test issues
    await tool.execute({
      operation_id: 'create_issue',
      parameters: {
        fields: {
          project: { key: TEST_PROJECT },
          summary: 'TEST: Manual integration test - Search 1',
          issuetype: { name: 'Task' },
        },
      },
    });

    await tool.execute({
      operation_id: 'create_issue',
      parameters: {
        fields: {
          project: { key: TEST_PROJECT },
          summary: 'TEST: Manual integration test - Search 2',
          issuetype: { name: 'Task' },
        },
      },
    });

    // Search for test issues
    const input = {
      operation_id: 'search_issues',
      parameters: {
        jql: `project = ${TEST_PROJECT} AND summary ~ "TEST: Manual integration test"`,
        maxResults: 10,
      },
    };

    const result = await tool.execute(input);

    expect(result.isError).toBeUndefined();
    const parsedContent = JSON.parse(result.content[0].text);

    expect(parsedContent.issues).toBeDefined();
    expect(parsedContent.issues.length).toBeGreaterThan(0);
    expect(parsedContent.total).toBeGreaterThan(0);

    // Track all found issues for cleanup
    for (const issue of parsedContent.issues) {
      if (!createdIssueKeys.includes(issue.key)) {
        createdIssueKeys.push(issue.key);
      }
    }

    logger.info(`Found ${parsedContent.total} test issues`);
  });

  it('should handle real 404 errors gracefully', async () => {
    const input = {
      operation_id: 'get_issue',
      parameters: {
        issueIdOrKey: 'NONEXISTENT-999999',
      },
    };

    const result = await tool.execute(input);

    expect(result.isError).toBe(true);
    const parsedContent = JSON.parse(result.content[0].text);
    expect(parsedContent.error).toBe('NotFoundError');
    expect(parsedContent.statusCode).toBe(404);

    logger.info('Successfully handled 404 error');
  });
});
