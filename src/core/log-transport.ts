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
import { dirname, join, resolve } from 'node:path';
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
  // Error-level log policies (separate file for errors)
  errorLogPath?: string;
  errorMaxSize?: number; // In MB
  errorMaxFiles?: number;
}

/**
 * Generate log filename with date prefix and PID suffix
 * Format: YYYY-MM-DD-bitbucket-dc-mcp-PID.log or YYYY-MM-DD-bitbucket-dc-mcp-errors-PID.log
 */
function generateLogFilename(
  baseFilePath: string,
  isErrorLog = false,
): { dir: string; filename: string } {
  const now = new Date();
  const datePrefix = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const pid = process.pid;

  const dir = dirname(baseFilePath);
  const ext = baseFilePath.endsWith('.log') ? '.log' : '';
  const baseName = isErrorLog ? 'bitbucket-dc-mcp-errors' : 'bitbucket-dc-mcp';

  const filename = `${datePrefix}-${baseName}-${pid}${ext}`;

  return { dir, filename };
}

/**
 * Get log transport configuration from environment variables
 */
export function getLogTransportConfig(): LogTransportConfig {
  const output = (process.env.LOG_OUTPUT ?? 'stdout') as LogOutput;
  const filePath = process.env.LOG_FILE_PATH ?? './logs/bitbucket-dc-mcp.log';
  const rotation = (process.env.LOG_ROTATION ?? 'daily') as LogRotation;
  const maxSize = parseInt(process.env.LOG_MAX_SIZE ?? '50', 10);
  const maxFiles = parseInt(process.env.LOG_MAX_FILES ?? '30', 10);

  // Error log configuration (separate file with longer retention)
  const errorLogPath = process.env.LOG_ERROR_FILE_PATH ?? './logs/bitbucket-dc-mcp-errors.log';
  const errorMaxSize = parseInt(process.env.LOG_ERROR_MAX_SIZE ?? '100', 10);
  const errorMaxFiles = parseInt(process.env.LOG_ERROR_MAX_FILES ?? '90', 10);

  return {
    output,
    filePath,
    rotation,
    maxSize,
    maxFiles,
    errorLogPath,
    errorMaxSize,
    errorMaxFiles,
  };
}

/**
 * Create pino transport based on configuration
 *
 * IMPORTANT: When running as an MCP server in stdio mode, logs MUST go to stderr
 * because stdout is reserved for JSON-RPC protocol messages. Writing logs to stdout
 * will break the MCP protocol communication with clients like Cursor or Claude Desktop.
 *
 * FILE ROTATION POLICIES:
 * - ALL LOGS: Daily rotation, 50MB max, 30 files (~1 month)
 * - ERROR LOGS: Separate file, 100MB max, 90 files (~3 months)
 * - Filename format: YYYY-MM-DD-bitbucket-dc-mcp-PID.log
 * - Error filename: YYYY-MM-DD-bitbucket-dc-mcp-errors-PID.log
 *
 * MULTI-INSTANCE SUPPORT:
 * - Each process gets its own log files (PID in filename)
 * - Even when LOG_OUTPUT=file, stderr remains active for real-time monitoring
 * - Safe for multiple MCP server instances running simultaneously
 *
 * SEPARATE ERROR LOGS:
 * - Error and fatal level logs go to separate file with longer retention
 * - Helps with alerting, monitoring, and compliance requirements
 */
export function createLogTransport(
  config: LogTransportConfig,
): pino.TransportMultiOptions | pino.TransportSingleOptions | undefined {
  const {
    output,
    filePath,
    maxSize = 50,
    maxFiles = 30,
    errorLogPath,
    errorMaxSize = 100,
    errorMaxFiles = 90,
  } = config;

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
    const { dir, filename } = generateLogFilename(filePath);
    const fullPath = join(dir, filename);

    // Ensure log directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Build targets array
    const targets: pino.TransportTargetOptions[] = [
      {
        target: 'pino/file',
        level: 'trace',
        options: {
          destination: 2, // stderr (fd 2) - for real-time monitoring
        },
      },
      {
        target: 'pino-roll',
        level: 'trace',
        options: {
          file: resolve(fullPath),
          frequency: 'daily', // Rotate daily
          size: `${maxSize}m`, // Rotate at size limit (MB)
          limit: { count: maxFiles }, // Keep max N files
          mkdir: true,
        },
      },
    ];

    // Add separate error log transport if configured
    if (errorLogPath) {
      const { dir: errorDir, filename: errorFilename } = generateLogFilename(errorLogPath, true);
      const errorFullPath = join(errorDir, errorFilename);

      if (!existsSync(errorDir)) {
        mkdirSync(errorDir, { recursive: true });
      }

      targets.push({
        target: 'pino-roll',
        level: 'error', // Only error and fatal
        options: {
          file: resolve(errorFullPath),
          frequency: 'daily',
          size: `${errorMaxSize}m`,
          limit: { count: errorMaxFiles },
          mkdir: true,
        },
      });
    }

    // Multiple transports: stderr + file with rotation + error file
    // IMPORTANT: We always log to stderr even with LOG_OUTPUT=file
    // This allows real-time monitoring while keeping persistent logs
    return {
      targets,
    };
  }

  if (output === 'both' && filePath) {
    const { dir, filename } = generateLogFilename(filePath);
    const fullPath = join(dir, filename);

    // Ensure log directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Build targets array
    const targets: pino.TransportTargetOptions[] = [
      {
        target: 'pino/file',
        level: 'trace',
        options: {
          destination: 2, // stderr (fd 2) - required for MCP stdio mode
        },
      },
      {
        target: 'pino-roll',
        level: 'trace',
        options: {
          file: resolve(fullPath),
          frequency: 'daily', // Rotate daily
          size: `${maxSize}m`, // Rotate at size limit (MB)
          limit: { count: maxFiles }, // Keep max N files
          mkdir: true,
        },
      },
    ];

    // Add separate error log transport if configured
    if (errorLogPath) {
      const { dir: errorDir, filename: errorFilename } = generateLogFilename(errorLogPath, true);
      const errorFullPath = join(errorDir, errorFilename);

      if (!existsSync(errorDir)) {
        mkdirSync(errorDir, { recursive: true });
      }

      targets.push({
        target: 'pino-roll',
        level: 'error', // Only error and fatal
        options: {
          file: resolve(errorFullPath),
          frequency: 'daily',
          size: `${errorMaxSize}m`,
          limit: { count: errorMaxFiles },
          mkdir: true,
        },
      });
    }

    // Multiple transports: stderr + file with rotation + error file
    return {
      targets,
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
