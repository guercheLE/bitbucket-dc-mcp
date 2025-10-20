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
 * E2E MCP Integration Tests
 *
 * These tests require a configured MCP server environment.
 * Run with: RUN_E2E_TESTS=true npm test
 * Or with real Bitbucket: E2E_USE_REAL_BITBUCKET=true npm test
 */

import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MCPTestClient } from '../helpers/mcp-test-client.js';
import { MockBitbucketServer } from '../helpers/mock-bitbucket-server.js';
import { describeIfE2E } from '../helpers/skip-integration.js';

describeIfE2E('E2E MCP Integration Tests', () => {
  let client: MCPTestClient;
  let mockBitbucket: MockBitbucketServer;
  const MOCK_BITBUCKET_PORT = 8080;
  const TEST_DB_PATH = path.join(process.cwd(), 'data', 'embeddings-test.db');

  beforeAll(async () => {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Create minimal test database with embeddings
    // We'll use a symlink or copy of the main embeddings.db if it exists
    const mainDbPath = path.join(process.cwd(), 'data', 'embeddings.db');
    if (existsSync(mainDbPath)) {
      // Use the existing embeddings database for e2e tests
      process.env.EMBEDDINGS_DB_PATH = mainDbPath;
    } else {
      // Skip search_ids test if no embeddings database
      // The test will need to handle DegradedModeError
      console.warn(
        'WARNING: embeddings.db not found. Run `npm run populate-db` to enable search_ids tests.',
      );
    }

    // Start mock Bitbucket server
    mockBitbucket = new MockBitbucketServer(MOCK_BITBUCKET_PORT);
    await mockBitbucket.start();

    // Start MCP client with mock Bitbucket URL in environment
    // Use longer timeout for CI environments (15s instead of 5s)
    client = new MCPTestClient(15000, {
      ...process.env,
      BITBUCKET_URL: `http://localhost:${MOCK_BITBUCKET_PORT}`,
      BITBUCKET_AUTH_METHOD: 'pat',
      BITBUCKET_TOKEN: 'test-token-for-e2e',
    });
    await client.start();
    await client.initialize();
  });

  afterAll(async () => {
    // Stop MCP client
    await client.stop();

    // Stop mock Bitbucket server
    await mockBitbucket.stop();

    // Clean up test database if we created one
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  afterEach(() => {
    // Reset mock responses between tests
    mockBitbucket.reset();
  });

  describe('Protocol Handshake and Tool Listing', () => {
    it('should complete MCP protocol handshake', async () => {
      const initResponse = (await client.initialize()) as {
        protocolVersion?: string;
        serverInfo?: { name?: string; version?: string };
        capabilities?: { tools?: unknown };
      };

      expect(initResponse.protocolVersion).toBe('2024-11-05');
      expect(initResponse.serverInfo).toBeDefined();
      expect(initResponse.serverInfo?.name).toBe('bitbucket-dc-mcp');
      expect(initResponse.serverInfo?.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(initResponse.capabilities?.tools).toBeDefined();
    });

    it('should list all available tools', async () => {
      const toolsResponse = (await client.listTools()) as {
        tools?: Array<{ name: string; description: string; inputSchema: unknown }>;
      };

      expect(toolsResponse.tools).toBeDefined();
      expect(toolsResponse.tools).toHaveLength(3);

      const toolNames = toolsResponse.tools?.map((t) => t.name) ?? [];
      expect(toolNames).toEqual(['search_ids', 'get_id', 'call_id']);

      // Validate each tool has required properties
      for (const tool of toolsResponse.tools ?? []) {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
      }
    });

    it('should return consistent error format for invalid tool', async () => {
      try {
        await client.callTool('invalid_tool_name', {});
        // Should not reach here
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });
  });

  describe('Workflow 1: Search → Get → Call', () => {
    it.skipIf(!existsSync(path.join(process.cwd(), 'data', 'embeddings.db')))(
      'should complete full workflow: search → get → call',
      async () => {
        // This test requires embeddings database to be populated
        // Skip if missing - run `npm run populate-db` to populate

        // Step 1: Search for "create new repository" operation
        const searchResult = (await client.callTool('search_ids', {
          query: 'create new repository',
          limit: 5,
        })) as {
          content?: Array<{ type: string; text: string }>;
        };

        expect(searchResult.content).toBeDefined();
        expect(searchResult.content).toHaveLength(1);
        expect(searchResult.content?.[0].type).toBe('text');

        const searchData = JSON.parse(searchResult.content?.[0].text ?? '{}') as {
          operations?: Array<{ operation_id: string; similarity_score: number }>;
          error?: string;
        };

        expect(searchData.operations).toBeInstanceOf(Array);
        expect(searchData.operations?.length).toBeGreaterThan(0);

        const topResult = searchData.operations?.[0];
        expect(topResult?.operation_id).toBeDefined();
        expect(topResult?.similarity_score).toBeGreaterThan(0.4); // Reasonable threshold

        // Step 2: Get detailed schema for the operation
        const operationId = topResult!.operation_id;
        const schemaResult = (await client.callTool('get_id', {
          operation_id: operationId,
        })) as {
          content?: Array<{ type: string; text: string }>;
        };

        expect(schemaResult.content).toBeDefined();

        const schemaData = JSON.parse(schemaResult.content?.[0].text ?? '{}') as {
          path?: string;
          method?: string;
          requestBody?: unknown;
          parameters?: unknown;
        };

        expect(schemaData.path).toBeDefined();
        expect(schemaData.method).toBeDefined();

        // Step 3: Execute the operation with mock Bitbucket API
        // Use createRepository specifically for this test (uses /rest/api/latest/projects/{projectKey}/repos path)
        mockBitbucket.mockResponse('POST', '/rest/api/latest/projects/TEST/repos', {
          status: 201,
          body: {
            slug: 'test-repo',
            id: 1,
            name: 'Test Repository',
            scmId: 'git',
            state: 'AVAILABLE',
            forkable: true,
            project: {
              key: 'TEST',
            },
          },
        });

        const callResult = (await client.callTool('call_id', {
          operation_id: 'createRepository',
          parameters: {
            projectKey: 'TEST',
            name: 'Test Repository',
            scmId: 'git',
          },
        })) as {
          content?: Array<{ type: string; text: string }>;
        };

        expect(callResult.content).toBeDefined();

        const callData = JSON.parse(callResult.content?.[0].text ?? '{}') as {
          id?: number;
          slug?: string;
          name?: string;
        };

        expect(callData.id).toBe(1);
        expect(callData.slug).toBe('test-repo');
        expect(callData.name).toBe('Test Repository');
      },
    );
  });

  describe('Workflow 2: Invalid Input Handling', () => {
    it('should return validation error for missing required parameters', async () => {
      const result = (await client.callTool('call_id', {
        operation_id: 'createRepository',
        parameters: {
          // Missing required fields: projectKey, name
        },
      })) as {
        content?: Array<{ type: string; text: string }>;
        isError?: boolean;
      };

      expect(result.content).toBeDefined();

      const resultData = JSON.parse(result.content?.[0].text ?? '{}') as {
        error?: string | { message: string; details?: string };
      };

      expect(resultData.error).toBeDefined();
      // Error might be string or object
      const errorMessage =
        typeof resultData.error === 'string'
          ? resultData.error
          : (resultData.error as any)?.message;
      expect(errorMessage).toBeDefined();
    });

    it('should return validation error for invalid parameter type', async () => {
      const result = (await client.callTool('call_id', {
        operation_id: 'createRepository',
        parameters: {
          projectKey: 123, // Should be string
          name: 'Test',
          scmId: 'git',
        },
      })) as {
        content?: Array<{ type: string; text: string }>;
      };

      expect(result.content).toBeDefined();

      const resultData = JSON.parse(result.content?.[0].text ?? '{}') as {
        error?: string | { message: string };
      };

      expect(resultData.error).toBeDefined();
    });

    it('should return error for non-existent operation_id', async () => {
      const result = (await client.callTool('get_id', {
        operation_id: 'non_existent_operation_12345',
      })) as {
        content?: Array<{ type: string; text: string }>;
      };

      expect(result.content).toBeDefined();

      const resultData = JSON.parse(result.content?.[0].text ?? '{}') as {
        error?: string | { message: string };
      };

      expect(resultData.error).toBeDefined();
      const errorMessage =
        typeof resultData.error === 'string'
          ? resultData.error
          : (resultData.error as any)?.message;
      expect(errorMessage).toBeDefined();
      expect(errorMessage.toLowerCase()).toContain('not found');
    });
  });

  describe('Workflow 3: Bitbucket API Error Handling', () => {
    it('should handle 401 authentication error', async () => {
      mockBitbucket.mockResponse('POST', '/api/2/issue', {
        status: 401,
        body: {
          errors: [
            {
              context: null,
              message: 'Authentication failed',
              exceptionName: null,
            },
          ],
        },
      });

      const result = (await client.callTool('call_id', {
        operation_id: 'createRepository',
        parameters: {
          projectKey: 'TEST',
          name: 'Test Repository',
          scmId: 'git',
        },
      })) as {
        content?: Array<{ type: string; text: string }>;
      };

      expect(result.content).toBeDefined();

      const resultData = JSON.parse(result.content?.[0].text ?? '{}') as {
        error?: string | { message: string; code?: number };
      };

      expect(resultData.error).toBeDefined();
      const errorMessage =
        typeof resultData.error === 'string'
          ? resultData.error
          : (resultData.error as any)?.message;
      expect(errorMessage.toLowerCase()).toContain('auth');
    });

    it('should handle 429 rate limit error', async () => {
      mockBitbucket.mockResponse('POST', '/rest/api/latest/projects/TEST/repos', {
        status: 429,
        headers: { 'Retry-After': '30' },
        body: {
          errors: [
            {
              context: null,
              message: 'Rate limit exceeded',
              exceptionName: null,
            },
          ],
        },
      });

      const result = (await client.callTool('call_id', {
        operation_id: 'createRepository',
        parameters: {
          projectKey: 'TEST',
          name: 'Test Repository',
          scmId: 'git',
        },
      })) as {
        content?: Array<{ type: string; text: string }>;
      };

      expect(result.content).toBeDefined();

      const resultData = JSON.parse(result.content?.[0].text ?? '{}') as {
        error?: string | { message: string };
      };

      expect(resultData.error).toBeDefined();
      const errorMessage =
        typeof resultData.error === 'string'
          ? resultData.error
          : (resultData.error as any)?.message;
      expect(errorMessage.toLowerCase()).toContain('rate');
    });

    it('should retry on 500 server error and eventually succeed', async () => {
      let callCount = 0;

      mockBitbucket.mockResponse('POST', '/api/2/issue', () => {
        callCount++;
        if (callCount < 3) {
          // First 2 calls fail with 500
          return {
            status: 500,
            body: { errors: [{ context: null, message: 'Internal server error', exceptionName: null }] },
          };
        }
        // Third call succeeds
        return {
          status: 201,
          body: {
            slug: 'test-repo',
            id: 1,
            name: 'Test Repository',
            scmId: 'git',
            state: 'AVAILABLE',
            forkable: true,
            project: {
              key: 'TEST',
            },
          },
        };
      });

      const result = (await client.callTool('call_id', {
        operation_id: 'createRepository',
        parameters: {
          projectKey: 'TEST',
          name: 'Test Repository',
          scmId: 'git',
        },
      })) as {
        content?: Array<{ type: string; text: string }>;
      };

      expect(result.content).toBeDefined();

      const resultData = JSON.parse(result.content?.[0].text ?? '{}') as {
        slug?: string;
        error?: unknown;
      };

      // Should succeed after retries
      expect(callCount).toBeGreaterThanOrEqual(3);
      expect(resultData.slug).toBe('test-repo');
      expect(resultData.error).toBeUndefined();
    }, 15000); // Longer timeout for retry logic

    it('should fail after max retries on persistent 500 errors', async () => {
      let callCount = 0;

      mockBitbucket.mockResponse('POST', '/rest/api/latest/projects/TEST/repos', () => {
        callCount++;
        return {
          status: 500,
          body: { errors: [{ context: null, message: 'Internal server error', exceptionName: null }] },
        };
      });

      const result = (await client.callTool('call_id', {
        operation_id: 'createRepository',
        parameters: {
          projectKey: 'TEST',
          name: 'Test Repository',
          scmId: 'git',
        },
      })) as {
        content?: Array<{ type: string; text: string }>;
      };

      expect(result.content).toBeDefined();

      const resultData = JSON.parse(result.content?.[0].text ?? '{}') as {
        error?: unknown;
      };

      // Should have tried multiple times (initial + retries)
      expect(callCount).toBeGreaterThan(1);
      expect(resultData.error).toBeDefined();
    }, 15000); // Longer timeout for retry logic
  });
});
