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

import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import pino from 'pino';

export type LogOutput = 'stdout' | 'file' | 'both';
export type LogRotation = 'daily' | 'hourly';

export interface LogTransportConfig {
  output: LogOutput;
  filePath?: string;
  rotation?: LogRotation;
  maxSize?: number; // In MB
  maxFiles?: number;
}

/**
 * Get log transport configuration from environment variables
 */
export function getLogTransportConfig(): LogTransportConfig {
  const output = (process.env.LOG_OUTPUT ?? 'stdout') as LogOutput;
  const filePath = process.env.LOG_FILE_PATH ?? './logs/bitbucket-dc-mcp.log';
  const rotation = (process.env.LOG_ROTATION ?? 'daily') as LogRotation;
  const maxSize = parseInt(process.env.LOG_MAX_SIZE ?? '100', 10);
  const maxFiles = parseInt(process.env.LOG_MAX_FILES ?? '7', 10);

  return {
    output,
    filePath,
    rotation,
    maxSize,
    maxFiles,
  };
}

/**
 * Create pino transport based on configuration
 *
 * IMPORTANT: When running as an MCP server in stdio mode, logs MUST go to stderr
 * because stdout is reserved for JSON-RPC protocol messages. Writing logs to stdout
 * will break the MCP protocol communication with clients like Cursor or Claude Desktop.
 */
export function createLogTransport(
  config: LogTransportConfig,
): pino.TransportMultiOptions | pino.TransportSingleOptions | undefined {
  const { output, filePath } = config;

  if (output === 'stdout') {
    // MCP servers use stdout for JSON-RPC, so logs must go to stderr
    return {
      target: 'pino/file',
      options: {
        destination: 2, // stderr (fd 2) - required for MCP stdio mode
      },
    };
  }

  if (output === 'file' && filePath) {
    // Ensure log directory exists
    const logDir = resolve(filePath, '..');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    // File transport with rotation
    return {
      target: 'pino/file',
      options: {
        destination: resolve(filePath),
        mkdir: true,
      },
    };
  }

  if (output === 'both' && filePath) {
    // Ensure log directory exists
    const logDir = resolve(filePath, '..');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    // Multiple transports: stderr + file (NOT stdout, to preserve MCP protocol)
    return {
      targets: [
        {
          target: 'pino/file',
          level: 'trace',
          options: {
            destination: 2, // stderr (fd 2) - required for MCP stdio mode
          },
        },
        {
          target: 'pino/file',
          level: 'trace',
          options: {
            destination: resolve(filePath),
            mkdir: true,
          },
        },
      ],
    };
  }

  // Default to stderr for MCP compatibility
  return {
    target: 'pino/file',
    options: {
      destination: 2, // stderr (fd 2)
    },
  };
}

/**
 * Validate log transport configuration
 */
export function validateLogTransportConfig(config: LogTransportConfig): string[] {
  const errors: string[] = [];

  if (!['stdout', 'file', 'both'].includes(config.output)) {
    errors.push(`Invalid LOG_OUTPUT: ${config.output}. Must be stdout, file, or both.`);
  }

  if ((config.output === 'file' || config.output === 'both') && !config.filePath) {
    errors.push('LOG_FILE_PATH is required when LOG_OUTPUT is file or both.');
  }

  if (config.maxSize !== undefined && (config.maxSize <= 0 || config.maxSize > 1000)) {
    errors.push(`Invalid LOG_MAX_SIZE: ${config.maxSize}. Must be between 1 and 1000 MB.`);
  }

  if (config.maxFiles !== undefined && (config.maxFiles <= 0 || config.maxFiles > 100)) {
    errors.push(`Invalid LOG_MAX_FILES: ${config.maxFiles}. Must be between 1 and 100.`);
  }

  return errors;
}
