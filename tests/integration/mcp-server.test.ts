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

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ReadBuffer, serializeMessage } from '@modelcontextprotocol/sdk/shared/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  JSONRPCMessage,
  LoggingMessageNotification,
  Notification,
} from '@modelcontextprotocol/sdk/types.js';
import { PassThrough } from 'node:stream';
import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '../../src/core/mcp-server.js';

class PassThroughTransport implements Transport {
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;
  public sessionId?: string;

  private readonly readBuffer = new ReadBuffer();
  private started = false;

  public constructor(
    private readonly input: PassThrough,
    private readonly output: PassThrough,
  ) { }

  private readonly handleData = (chunk: Buffer): void => {
    this.readBuffer.append(chunk);
    this.processBuffer();
  };

  private readonly handleError = (error: Error): void => {
    this.onerror?.(error);
  };

  public async start(): Promise<void> {
    if (this.started) {
      throw new Error('Transport already started');
    }

    this.started = true;
    this.input.on('data', this.handleData);
    this.input.on('error', this.handleError);
  }

  public async close(): Promise<void> {
    this.input.off('data', this.handleData);
    this.input.off('error', this.handleError);
    this.readBuffer.clear();
    this.onclose?.();
  }

  public async send(message: JSONRPCMessage): Promise<void> {
    await new Promise<void>((resolve) => {
      const payload = serializeMessage(message);
      if (this.output.write(payload)) {
        resolve();
      } else {
        this.output.once('drain', resolve);
      }
    });
  }

  private processBuffer(): void {
    let message: JSONRPCMessage | null;
    // eslint-disable-next-line no-cond-assign -- intentionally read until buffer drained
    while ((message = this.readBuffer.readMessage()) !== null) {
      try {
        this.onmessage?.(message);
      } catch (error) {
        this.onerror?.(error as Error);
        break;
      }
    }
  }
}

describe('McpServer integration', () => {
  it('completes handshake and forwards logging notifications', async () => {
    const clientToServer = new PassThrough();
    const serverToClient = new PassThrough();

    const exit = vi.fn();
    const logger = pino({ level: 'silent' });

    const server = new McpServer(
      {
        version: '0.0.0-test',
        capabilities: { logging: {} },
      },
      {
        logger,
        exit,
        stdin: clientToServer,
        stdout: serverToClient,
      },
    );

    const clientTransport = new PassThroughTransport(serverToClient, clientToServer);
    const client = new Client({ name: 'integration-client', version: '0.0.1' });

    const notifications: Notification[] = [];
    client.fallbackNotificationHandler = async (notification): Promise<void> => {
      notifications.push(notification);
    };

    const startPromise = server.start();
    await client.connect(clientTransport);
    await startPromise;

    expect(server.isReady).toBe(true);
    expect(client.getServerVersion()).toEqual({
      name: 'bitbucket-dc-mcp-server',
      version: '0.0.0-test',
    });

    await server.sendLog({
      level: 'info',
      data: { message: 'integration log' },
    } as LoggingMessageNotification['params']);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.method).toBe('notifications/message');
    expect(exit).not.toHaveBeenCalled();

    await client.close();
    await server.shutdown('test-complete');
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('logs protocol errors when receiving invalid messages without crashing', async () => {
    const clientToServer = new PassThrough();
    const serverToClient = new PassThrough();

    const exit = vi.fn();
    const errorSpy = vi.fn();
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: errorSpy,
      level: 'info',
    } as unknown as pino.Logger;

    const server = new McpServer(
      {
        version: '0.0.0-test',
      },
      {
        logger,
        exit,
        stdin: clientToServer,
        stdout: serverToClient,
      },
    );

    const clientTransport = new PassThroughTransport(serverToClient, clientToServer);
    const client = new Client({ name: 'integration-client', version: '0.0.1' });

    const startPromise = server.start();
    await client.connect(clientTransport);
    await startPromise;

    expect(server.isReady).toBe(true);

    const invalidFrame = Buffer.from('Content-Length: 5\r\n\r\nabcde', 'utf8');
    clientToServer.write(invalidFrame);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'mcp.server.protocol_error' }),
      expect.any(String),
    );
    expect(exit).not.toHaveBeenCalled();

    await client.close();
    await server.shutdown('invalid-message-test');
    expect(exit).toHaveBeenCalledWith(0);
  });
});
