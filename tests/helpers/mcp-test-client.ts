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

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

/**
 * MCP test client that communicates with the MCP server via stdio transport.
 * Implements line-buffering for reliable JSON-RPC message parsing.
 */
export class MCPTestClient {
  private process: ChildProcess | undefined;
  private requestId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private buffer = ''; // Buffer for incomplete messages
  private readonly timeout: number;
  private readonly env?: NodeJS.ProcessEnv;

  constructor(timeoutMs = 5000, env?: NodeJS.ProcessEnv) {
    this.timeout = timeoutMs;
    this.env = env;
  }

  /**
   * Start the MCP server process and set up stdio communication.
   *
   * @returns Promise that resolves when server process is spawned
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: this.env ?? process.env,
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to create stdio pipes'));
        return;
      }

      // Handle line-by-line parsing for stdio transport
      // CRITICAL: Responses may come in chunks or multiple messages per chunk
      this.process.stdout.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');

        // Keep the last incomplete line in buffer
        this.buffer = lines.pop() ?? '';

        // Process complete lines
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line) as JsonRpcResponse;
              const pending = this.pendingRequests.get(response.id);

              if (pending) {
                clearTimeout(pending.timeoutId);
                this.pendingRequests.delete(response.id);

                if (response.error) {
                  pending.reject(new Error(response.error.message));
                } else {
                  pending.resolve(response.result);
                }
              }
            } catch (error) {
              // Log parsing errors but don't crash
              // eslint-disable-next-line no-console
              console.error('Failed to parse JSON-RPC response:', line, error);
            }
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        // Capture stderr for debugging
        // eslint-disable-next-line no-console
        console.error('MCP Server stderr:', data.toString());
      });

      this.process.on('error', (error) => {
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests.entries()) {
          clearTimeout(pending.timeoutId);
          pending.reject(new Error(`Server exited with code ${code ?? signal}`));
          this.pendingRequests.delete(id);
        }
      });

      // Give the server more time to start, especially in CI environments
      // Wait 3 seconds to ensure the process is fully initialized
      setTimeout(() => resolve(), 3000);
    });
  }

  /**
   * Stop the MCP server process and clean up resources.
   *
   * @returns Promise that resolves when server is stopped
   */
  public async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.process = undefined;
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds if not stopped
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Send MCP initialize request to complete protocol handshake.
   *
   * @returns Promise that resolves with server capabilities
   */
  public async initialize(): Promise<unknown> {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
    });
  }

  /**
   * List all available tools from the MCP server.
   *
   * @returns Promise that resolves with tools array
   */
  public async listTools(): Promise<unknown> {
    return this.sendRequest('tools/list', {});
  }

  /**
   * Call a specific MCP tool with parameters.
   *
   * @param name - Tool name (e.g., 'search_ids', 'get_id', 'call_id')
   * @param params - Tool-specific parameters
   * @returns Promise that resolves with tool result
   */
  public async callTool(name: string, params: unknown): Promise<unknown> {
    return this.sendRequest('tools/call', {
      name,
      arguments: params,
    });
  }

  /**
   * Send a JSON-RPC request to the MCP server.
   *
   * @param method - JSON-RPC method name
   * @param params - Request parameters
   * @returns Promise that resolves with response result
   */
  private async sendRequest(method: string, params: unknown): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error('Server not started');
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      }, this.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeoutId });

      // Write request as single line with newline terminator
      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }
}
