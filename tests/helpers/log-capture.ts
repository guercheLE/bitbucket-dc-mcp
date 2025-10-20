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

import { Writable } from 'node:stream';
import pino from 'pino';

/**
 * Test utility to capture log output for testing
 */
export class LogCapture {
  private logs: any[] = [];
  private stream: Writable;

  constructor() {
    this.stream = new Writable({
      write: (chunk, _encoding, callback) => {
        try {
          this.logs.push(JSON.parse(chunk.toString()));
        } catch (error) {
          // Ignore parse errors for pretty-printed logs
        }
        callback();
      },
    });
  }

  /**
   * Create a logger for testing
   * @param options - Pino logger options
   * @param options.useStringLevels - If true, formats level as string labels (for integration tests).
   *                                   If false (default), keeps numeric levels (for unit tests).
   */
  createLogger(options: pino.LoggerOptions & { useStringLevels?: boolean } = {}) {
    const { useStringLevels = false, ...pinoOptions } = options;

    // Add base fields for service identification
    const mergedOptions: pino.LoggerOptions = {
      level: 'debug', // Capture all log levels including DEBUG
      ...pinoOptions,
      base: {
        service: 'bitbucket-dc-mcp',
        version: '1.0.0-test',
        ...pinoOptions.base,
      },
    };

    // For integration tests, use string level labels like production
    // For unit tests, keep numeric levels for easier assertions
    if (useStringLevels) {
      mergedOptions.formatters = {
        level: (label) => ({ level: label }),
        ...pinoOptions.formatters,
      };
    }

    return pino(mergedOptions, this.stream);
  }

  getLogs(): any[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }

  findLog(predicate: (log: any) => boolean): any {
    return this.logs.find(predicate);
  }

  findLogs(predicate: (log: any) => boolean): any[] {
    return this.logs.filter(predicate);
  }

  getLastLog(): any {
    return this.logs[this.logs.length - 1];
  }
}
