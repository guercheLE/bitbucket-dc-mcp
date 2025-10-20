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

import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import http from 'node:http';

export interface MockResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

type MockResponseOrFunction = MockResponse | (() => MockResponse);

/**
 * Mock HTTP server that simulates Bitbucket Data Center API responses.
 * Used for E2E testing without requiring a real Bitbucket instance.
 */
export class MockBitbucketServer {
  private server: Server | undefined;
  private responses = new Map<string, MockResponseOrFunction>();
  private readonly port: number;

  constructor(port = 8080) {
    this.port = port;
  }

  /**
   * Configure a mock response for a specific HTTP method and path.
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param path - URL path (e.g., '/rest/api/3/issue')
   * @param response - Mock response object or function that returns response
   */
  public mockResponse(method: string, path: string, response: MockResponseOrFunction): void {
    const key = `${method.toUpperCase()}:${path}`;
    this.responses.set(key, response);
  }

  /**
   * Start the mock server and listen on configured port.
   *
   * @returns Promise that resolves when server is listening
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
        const key = `${req.method ?? 'GET'}:${req.url ?? '/'}`;
        const mockResponseOrFn = this.responses.get(key);

        if (mockResponseOrFn) {
          const mockResponse =
            typeof mockResponseOrFn === 'function' ? mockResponseOrFn() : mockResponseOrFn;

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...mockResponse.headers,
          };

          res.writeHead(mockResponse.status, headers);
          res.end(JSON.stringify(mockResponse.body));
        } else {
          // No mock configured - return 404
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errorMessages: ['Not found'], errors: {} }));
        }
      });

      this.server.listen(this.port, () => {
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop the mock server and close all connections.
   *
   * @returns Promise that resolves when server is closed
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.server = undefined;
          resolve();
        }
      });
    });
  }

  /**
   * Clear all configured mock responses.
   * Useful for resetting state between tests.
   */
  public reset(): void {
    this.responses.clear();
  }

  /**
   * Get the port the server is configured to run on.
   */
  public getPort(): number {
    return this.port;
  }
}
