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
 * Integration tests for Cookbook examples
 *
 * These tests validate that all cookbook examples produce expected outputs.
 * Uses MockBitbucketServer to simulate Bitbucket API responses for test isolation.
 *
 * Test Coverage:
 * - Issues category (8 examples)
 * - Users and Projects category (5 examples)
 * - Workflows and Sprints category (5 examples)
 * - Custom Fields category (5 examples)
 *
 * Total: 23 examples
 */

import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthManager, StubCredentialStorage } from '../../src/auth/auth-manager.js';
import { ConfigManager } from '../../src/core/config-manager.js';
import { RateLimiter } from '../../src/core/rate-limiter.js';
import { BitbucketClientService } from '../../src/services/bitbucket-client.js';
import { CallIdTool } from '../../src/tools/call-id-tool.js';
import type { OperationsRepository } from '../../src/tools/get-id-tool.js';
import { MockBitbucketServer } from '../helpers/mock-bitbucket-server.js';

// Mock the validator to bypass schema validation
vi.mock('../../src/validation/validator.js', () => ({
  validateOperationInput: vi.fn(async (_operationId, params) => ({
    success: true,
    data: params,
  })),
}));

describe('Cookbook Examples', () => {
  let mockBitbucket: MockBitbucketServer;
  let callIdTool: CallIdTool;
  let logger: pino.Logger;

  // Mock operations repository (minimal for testing)
  const mockOperationsRepository: OperationsRepository = {
    getOperation: (operationId: string) => {
      const operations: Record<string, any> = {
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
        update_issue: {
          operationId: 'update_issue',
          method: 'PUT',
          path: '/rest/api/3/issue/{issueIdOrKey}',
          summary: 'Edit issue',
          description: 'Edits an issue',
          tags: ['Issues'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        add_comment: {
          operationId: 'add_comment',
          method: 'POST',
          path: '/rest/api/3/issue/{issueIdOrKey}/comment',
          summary: 'Add comment',
          description: 'Adds a comment to an issue',
          tags: ['Issue comments'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        get_transitions: {
          operationId: 'get_transitions',
          method: 'GET',
          path: '/rest/api/3/issue/{issueIdOrKey}/transitions',
          summary: 'Get transitions',
          description: 'Returns transitions available for the issue',
          tags: ['Issues'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        do_transition: {
          operationId: 'do_transition',
          method: 'POST',
          path: '/rest/api/3/issue/{issueIdOrKey}/transitions',
          summary: 'Transition issue',
          description: 'Performs a transition on an issue',
          tags: ['Issues'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        search_for_issues_using_jql: {
          operationId: 'search_for_issues_using_jql',
          method: 'POST',
          path: '/rest/api/3/search',
          summary: 'Search for issues using JQL',
          description: 'Searches for issues using JQL',
          tags: ['Issue search'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        get_current_user: {
          operationId: 'get_current_user',
          method: 'GET',
          path: '/rest/api/3/myself',
          summary: 'Get current user',
          description: 'Returns details of the current user',
          tags: ['Myself'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        find_users_for_picker: {
          operationId: 'find_users_for_picker',
          method: 'GET',
          path: '/rest/api/3/user/picker',
          summary: 'Find users for picker',
          description: 'Returns a list of users that match the search string',
          tags: ['User search'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        get_all_projects: {
          operationId: 'get_all_projects',
          method: 'GET',
          path: '/rest/api/3/project',
          summary: 'Get all projects',
          description: 'Returns all projects visible to the user',
          tags: ['Projects'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        get_project: {
          operationId: 'get_project',
          method: 'GET',
          path: '/rest/api/3/project/{projectIdOrKey}',
          summary: 'Get project',
          description: 'Returns a project',
          tags: ['Projects'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        create_component: {
          operationId: 'create_component',
          method: 'POST',
          path: '/rest/api/3/component',
          summary: 'Create component',
          description: 'Creates a component',
          tags: ['Project components'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        get_sprint: {
          operationId: 'get_sprint',
          method: 'GET',
          path: '/rest/agile/1.0/sprint/{sprintId}',
          summary: 'Get sprint',
          description: 'Returns the sprint for a given sprint ID',
          tags: ['Sprint'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        move_issues_to_sprint: {
          operationId: 'move_issues_to_sprint',
          method: 'POST',
          path: '/rest/agile/1.0/sprint/{sprintId}/issue',
          summary: 'Move issues to sprint',
          description: 'Moves issues to a sprint',
          tags: ['Sprint'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        create_sprint: {
          operationId: 'create_sprint',
          method: 'POST',
          path: '/rest/agile/1.0/sprint',
          summary: 'Create sprint',
          description: 'Creates a sprint',
          tags: ['Sprint'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
        get_fields: {
          operationId: 'get_fields',
          method: 'GET',
          path: '/rest/api/3/field',
          summary: 'Get fields',
          description: 'Returns system and custom fields',
          tags: ['Issue fields'],
          parameters: [],
          requestBody: null,
          responses: {},
        },
      };
      return operations[operationId] || null;
    },
  };

  beforeAll(async () => {
    // Initialize logger
    logger = pino({ level: 'silent' });

    // Start mock Bitbucket server
    mockBitbucket = new MockBitbucketServer(8082);
    await mockBitbucket.start();

    // Configure for local mock server
    const config = await ConfigManager.load({
      bitbucketUrl: 'http://localhost:8082',
      authMethod: 'pat',
    });

    // Initialize auth manager with stub storage
    const stubStorage = new StubCredentialStorage();
    await stubStorage.save('http://localhost:8082', {
      bitbucket_url: 'http://localhost:8082',
      auth_method: 'pat',
      access_token: 'test-token',
    });
    const authManager = new AuthManager(stubStorage, logger, config);

    // Initialize rate limiter
    const rateLimiter = new RateLimiter({ capacity: 100, refillRate: 100 });

    // Initialize Bitbucket client
    const bitbucketClient = new BitbucketClientService(
      authManager,
      rateLimiter,
      logger,
      config,
      mockOperationsRepository,
    );

    // Initialize call_id tool
    callIdTool = new CallIdTool(
      bitbucketClient,
      authManager,
      mockOperationsRepository,
      logger,
      config,
    );
  });

  afterAll(async () => {
    await mockBitbucket.stop();
  });

  describe('Issues Category', () => {
    describe('Example 1: Create Issue with Required Fields', () => {
      it('should create issue with minimal required fields', async () => {
        // Mock Bitbucket response
        mockBitbucket.mockResponse('POST', '/rest/api/3/issue', {
          status: 201,
          body: {
            id: '10001',
            key: 'PROJ-123',
            self: 'http://localhost:8080/rest/api/3/issue/10001',
          },
        });

        // Execute call_id tool
        const result = await callIdTool.execute({
          operation_id: 'create_issue',
          parameters: {
            fields: {
              project: {
                key: 'PROJ',
              },
              summary: 'Payment processing fails for credit cards',
              issuetype: {
                name: 'Bug',
              },
            },
          },
        });

        // Validate response structure
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          id: '10001',
          key: 'PROJ-123',
        });
      });
    });

    describe('Example 2: Create Issue with Custom Fields', () => {
      it('should create issue with priority, labels, and custom field', async () => {
        mockBitbucket.mockResponse('POST', '/rest/api/3/issue', {
          status: 201,
          body: {
            id: '10002',
            key: 'PROJ-124',
            self: 'http://localhost:8080/rest/api/3/issue/10002',
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'create_issue',
          parameters: {
            fields: {
              project: { key: 'PROJ' },
              summary: 'Add dark mode support to dashboard',
              description: 'Users have requested a dark mode theme option in settings.',
              issuetype: { name: 'Story' },
              priority: { name: 'High' },
              labels: ['ui', 'accessibility', 'enhancement'],
              customfield_10050: 'Q2 2025',
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(201);
        expect(response.data.key).toBe('PROJ-124');
      });
    });

    describe('Example 3: Update Issue Summary and Description', () => {
      it('should update issue fields', async () => {
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'update_issue',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            fields: {
              summary: 'Payment processing fails for Visa credit cards',
              description:
                'Issue occurs specifically with Visa cards. MasterCard and Amex work fine.',
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
        expect(response.data).toBeNull();
      });
    });

    describe('Example 4: Update Issue Assignee', () => {
      it('should update issue assignee', async () => {
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'update_issue',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            fields: {
              assignee: {
                accountId: '5b10a2844c20165700ede21g',
              },
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });

    describe('Example 5: Add Comment to Issue', () => {
      it('should add comment to issue', async () => {
        mockBitbucket.mockResponse('POST', '/rest/api/3/issue/PROJ-123/comment', {
          status: 201,
          body: {
            id: '10050',
            author: {
              accountId: '5b10a2844c20165700ede21g',
              displayName: 'John Doe',
            },
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: "I've reproduced this issue in staging environment.",
                    },
                  ],
                },
              ],
            },
            created: '2025-10-18T14:30:00.000+0000',
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'add_comment',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: "I've reproduced this issue in staging environment.",
                    },
                  ],
                },
              ],
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(201);
        expect(response.data.id).toBe('10050');
      });
    });

    describe('Example 6: Transition Issue Workflow', () => {
      it('should get available transitions', async () => {
        mockBitbucket.mockResponse('GET', '/rest/api/3/issue/PROJ-123/transitions', {
          status: 200,
          body: {
            transitions: [
              {
                id: '11',
                name: 'In Progress',
                to: {
                  id: '3',
                  name: 'In Progress',
                },
              },
              {
                id: '21',
                name: 'Done',
                to: {
                  id: '10001',
                  name: 'Done',
                },
              },
            ],
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'get_transitions',
          parameters: {
            issueIdOrKey: 'PROJ-123',
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.data.transitions).toHaveLength(2);
      });

      it('should execute transition', async () => {
        mockBitbucket.mockResponse('POST', '/rest/api/3/issue/PROJ-123/transitions', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'do_transition',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            transition: {
              id: '11',
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });

    describe('Example 7: Search Issues by JQL', () => {
      it('should search issues using JQL', async () => {
        mockBitbucket.mockResponse('POST', '/rest/api/3/search', {
          status: 200,
          body: {
            startAt: 0,
            maxResults: 10,
            total: 5,
            issues: [
              {
                id: '10001',
                key: 'PROJ-123',
                fields: {
                  summary: 'Payment processing fails',
                  status: {
                    name: 'Open',
                  },
                  assignee: {
                    accountId: '5b10a2844c20165700ede21g',
                    displayName: 'John Doe',
                  },
                  priority: {
                    name: 'High',
                  },
                },
              },
            ],
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'search_for_issues_using_jql',
          parameters: {
            jql: 'project = PROJ AND status = Open AND assignee = currentUser()',
            maxResults: 10,
            fields: ['summary', 'status', 'assignee', 'priority'],
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.data.issues).toHaveLength(1);
        expect(response.data.issues[0].key).toBe('PROJ-123');
      });
    });

    describe('Example 8: Bulk Update Issues', () => {
      it('should update multiple issues', async () => {
        // Mock responses for each issue
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-124', {
          status: 204,
          body: null,
        });

        const issueKeys = ['PROJ-123', 'PROJ-124'];
        const updates = {
          fields: {
            priority: { name: 'High' },
          },
        };

        const results = [];
        for (const issueKey of issueKeys) {
          const result = await callIdTool.execute({
            operation_id: 'update_issue',
            parameters: {
              issueIdOrKey: issueKey,
              ...updates,
            },
          });
          results.push(JSON.parse(result.content[0].text));
        }

        expect(results).toHaveLength(2);
        expect(results.every((r) => r.success)).toBe(true);
      });
    });
  });

  describe('Users and Projects Category', () => {
    describe('Example 1: Get Current User Info', () => {
      it('should retrieve current user information', async () => {
        mockBitbucket.mockResponse('GET', '/rest/api/3/myself', {
          status: 200,
          body: {
            accountId: '5b10a2844c20165700ede21g',
            emailAddress: 'john.doe@example.com',
            displayName: 'John Doe',
            avatarUrls: {
              '48x48': 'https://avatar-url.example.com',
            },
            timezone: 'America/New_York',
            locale: 'en_US',
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'get_current_user',
          parameters: {},
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.data.accountId).toBe('5b10a2844c20165700ede21g');
        expect(response.data.displayName).toBe('John Doe');
      });
    });

    describe('Example 2: Search Users by Name', () => {
      it('should search users by name', async () => {
        mockBitbucket.mockResponse('GET', '/rest/api/3/user/picker?query=john', {
          status: 200,
          body: {
            users: [
              {
                accountId: '5b10a2844c20165700ede21g',
                displayName: 'John Doe',
                emailAddress: 'john.doe@example.com',
                avatarUrls: {
                  '48x48': 'https://avatar-url.example.com',
                },
              },
              {
                accountId: '5c20b3955d30276800fef32h',
                displayName: 'Johnny Smith',
                emailAddress: 'johnny.smith@example.com',
              },
            ],
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'find_users_for_picker',
          parameters: {
            query: 'john',
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.data.users).toHaveLength(2);
      });
    });

    describe('Example 3: List All Projects', () => {
      it('should list all accessible projects', async () => {
        mockBitbucket.mockResponse('GET', '/rest/api/3/project', {
          status: 200,
          body: [
            {
              id: '10000',
              key: 'PROJ',
              name: 'Project Example',
              projectTypeKey: 'software',
              style: 'classic',
              avatarUrls: {
                '48x48': 'https://avatar-url.example.com',
              },
            },
            {
              id: '10001',
              key: 'DEMO',
              name: 'Demo Project',
              projectTypeKey: 'business',
            },
          ],
        });

        const result = await callIdTool.execute({
          operation_id: 'get_all_projects',
          parameters: {},
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data).toHaveLength(2);
      });
    });

    describe('Example 4: Get Project Details', () => {
      it('should retrieve project details', async () => {
        mockBitbucket.mockResponse('GET', '/rest/api/3/project/PROJ', {
          status: 200,
          body: {
            id: '10000',
            key: 'PROJ',
            name: 'Project Example',
            description: 'Example project for testing',
            lead: {
              accountId: '5b10a2844c20165700ede21g',
              displayName: 'John Doe',
            },
            issueTypes: [
              { id: '10001', name: 'Bug' },
              { id: '10002', name: 'Task' },
              { id: '10003', name: 'Story' },
            ],
            versions: [
              { id: '10100', name: 'v1.0' },
              { id: '10101', name: 'v1.1' },
            ],
            components: [
              { id: '10200', name: 'Backend' },
              { id: '10201', name: 'Frontend' },
            ],
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'get_project',
          parameters: {
            projectIdOrKey: 'PROJ',
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.data.key).toBe('PROJ');
        expect(response.data.issueTypes).toHaveLength(3);
      });
    });

    describe('Example 5: Create Project Component', () => {
      it('should create a project component', async () => {
        mockBitbucket.mockResponse('POST', '/rest/api/3/component', {
          status: 201,
          body: {
            id: '10300',
            name: 'API',
            description: 'REST API backend services',
            project: 'PROJ',
            lead: {
              accountId: '5b10a2844c20165700ede21g',
              displayName: 'John Doe',
            },
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'create_component',
          parameters: {
            name: 'API',
            description: 'REST API backend services',
            project: 'PROJ',
            leadAccountId: '5b10a2844c20165700ede21g',
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(201);
        expect(response.data.name).toBe('API');
      });
    });
  });

  describe('Workflows and Sprints Category', () => {
    describe('Example 2: Transition Issue with Resolution', () => {
      it('should transition issue with resolution', async () => {
        mockBitbucket.mockResponse('POST', '/rest/api/3/issue/PROJ-123/transitions', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'do_transition',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            transition: {
              id: '31',
            },
            fields: {
              resolution: {
                name: 'Done',
              },
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });

    describe('Example 3: Get Sprint Report', () => {
      it('should retrieve sprint information', async () => {
        mockBitbucket.mockResponse('GET', '/rest/agile/1.0/sprint/1', {
          status: 200,
          body: {
            id: 1,
            name: 'Sprint 1',
            state: 'active',
            startDate: '2025-10-01T00:00:00.000Z',
            endDate: '2025-10-15T00:00:00.000Z',
            completeDate: null,
            originBoardId: 1,
            goal: 'Complete payment integration',
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'get_sprint',
          parameters: {
            sprintId: '1',
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.data.name).toBe('Sprint 1');
        expect(response.data.state).toBe('active');
      });
    });

    describe('Example 4: Move Issue to Sprint', () => {
      it('should move issues to sprint', async () => {
        mockBitbucket.mockResponse('POST', '/rest/agile/1.0/sprint/1/issue', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'move_issues_to_sprint',
          parameters: {
            sprintId: '1',
            issues: ['PROJ-123', 'PROJ-124'],
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });

    describe('Example 5: Create Sprint', () => {
      it('should create a new sprint', async () => {
        mockBitbucket.mockResponse('POST', '/rest/agile/1.0/sprint', {
          status: 201,
          body: {
            id: 2,
            name: 'Sprint 2',
            state: 'future',
            startDate: '2025-10-16T00:00:00.000Z',
            endDate: '2025-10-30T00:00:00.000Z',
            originBoardId: 1,
            goal: 'Complete user authentication feature',
          },
        });

        const result = await callIdTool.execute({
          operation_id: 'create_sprint',
          parameters: {
            name: 'Sprint 2',
            startDate: '2025-10-16T00:00:00.000Z',
            endDate: '2025-10-30T00:00:00.000Z',
            originBoardId: 1,
            goal: 'Complete user authentication feature',
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(201);
        expect(response.data.name).toBe('Sprint 2');
      });
    });
  });

  describe('Custom Fields Category', () => {
    describe('Example 1: List Custom Fields', () => {
      it('should list all custom fields', async () => {
        mockBitbucket.mockResponse('GET', '/rest/api/3/field', {
          status: 200,
          body: [
            {
              id: 'customfield_10050',
              name: 'Target Release',
              custom: true,
              schema: {
                type: 'string',
                custom: 'com.atlassian.bitbucket.plugin.system.customfieldtypes:textfield',
              },
            },
            {
              id: 'customfield_10051',
              name: 'Story Points',
              custom: true,
              schema: {
                type: 'number',
                custom: 'com.atlassian.bitbucket.plugin.system.customfieldtypes:float',
              },
            },
            {
              id: 'customfield_10052',
              name: 'Department',
              custom: true,
              schema: {
                type: 'option',
                custom: 'com.atlassian.bitbucket.plugin.system.customfieldtypes:select',
              },
            },
          ],
        });

        const result = await callIdTool.execute({
          operation_id: 'get_fields',
          parameters: {},
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data).toHaveLength(3);
      });
    });

    describe('Example 2: Set Text Custom Field', () => {
      it('should set text custom field value', async () => {
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'update_issue',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            fields: {
              customfield_10050: 'Q2 2025',
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });

    describe('Example 3: Set Select List Custom Field', () => {
      it('should set select list custom field value', async () => {
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'update_issue',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            fields: {
              customfield_10052: {
                value: 'Engineering',
              },
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });

    describe('Example 4: Set Multi-Select Custom Field', () => {
      it('should set multi-select custom field values', async () => {
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'update_issue',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            fields: {
              customfield_10053: [
                { value: 'Backend' },
                { value: 'Frontend' },
                { value: 'Database' },
              ],
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });

    describe('Example 5: Set Date/DateTime Custom Field', () => {
      it('should set date custom field value', async () => {
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'update_issue',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            fields: {
              customfield_10054: '2025-12-31',
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });

      it('should set datetime custom field value', async () => {
        mockBitbucket.mockResponse('PUT', '/rest/api/3/issue/PROJ-123', {
          status: 204,
          body: null,
        });

        const result = await callIdTool.execute({
          operation_id: 'update_issue',
          parameters: {
            issueIdOrKey: 'PROJ-123',
            fields: {
              customfield_10055: '2025-12-31T23:59:59.000+0000',
            },
          },
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.status).toBe(204);
      });
    });
  });
});
