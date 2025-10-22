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

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pino, { type LoggerOptions, type Logger as PinoLogger } from 'pino';
import { createLogTransport, getLogTransportConfig } from './log-transport.js';
import { getTraceId, getSpanIdFromContext } from './correlation-context.js';

// Get package version for logging
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const SERVICE_NAME = 'bitbucket-dc-mcp';
const SERVICE_VERSION = packageJson.version;

const REDACT_FIELDS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'credentials',
  'apiKey',
  'api_key',
  'secret',
  '*.password',
  '*.token',
  '*.access_token',
  '*.refresh_token',
  '*.authorization',
  '*.credentials',
  '*.apiKey',
  '*.api_key',
  '*.secret',
  'auth.*.token',
  'auth.*.password',
];

export interface LoggerConfiguration {
  level?: string;
  pretty?: boolean;
}

/**
 * Centralised logger factory that exposes a shared pino instance.
 */
export class Logger {
  private static instance: PinoLogger | undefined;
  private static configuration: LoggerConfiguration = {};

  private constructor() {
    // Prevent instantiation.
  }

  public static configure(configuration: LoggerConfiguration): void {
    Logger.configuration = { ...Logger.configuration, ...configuration };

    if (Logger.instance && configuration.level) {
      Logger.instance.level = configuration.level;
    }
  }

  public static getInstance(): PinoLogger {
    if (!Logger.instance) {
      const options: LoggerOptions = {
        level: Logger.configuration.level ?? process.env.LOG_LEVEL ?? 'info',
        base: {
          service: SERVICE_NAME,
          version: SERVICE_VERSION,
        },
        redact: {
          paths: REDACT_FIELDS,
          censor: '***',
        },
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: () => `,"time":${Date.now()}`,
        serializers: {
          err: pino.stdSerializers.err,
          error: pino.stdSerializers.err,
        },
        // Mixin to automatically add traceId and spanId to all logs
        mixin(): Record<string, string> {
          const traceId = getTraceId();
          const spanId = getSpanIdFromContext();

          const context: Record<string, string> = {};

          // Only add if not the default 'no-trace-id'
          if (traceId && traceId !== 'no-trace-id') {
            context.traceId = traceId;
          }

          if (spanId) {
            context.spanId = spanId;
          }

          return context;
        },
      };

      const prettyEnabled = Logger.configuration.pretty ?? process.env.LOG_PRETTY === 'true';

      if (prettyEnabled) {
        try {
          const prettyTransport = pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
            },
          });

          Logger.instance = pino(options, prettyTransport);
        } catch {
          // pino-pretty not available, use standard transport
          const transportConfig = getLogTransportConfig();
          const transportOptions = createLogTransport(transportConfig);
          if (transportOptions) {
            Logger.instance = pino(options, pino.transport(transportOptions));
          } else {
            Logger.instance = pino(options);
          }
        }
      } else {
        // Use configured transport (file, stdout, or both)
        const transportConfig = getLogTransportConfig();
        const transportOptions = createLogTransport(transportConfig);
        if (transportOptions) {
          Logger.instance = pino(options, pino.transport(transportOptions));
        } else {
          Logger.instance = pino(options);
        }
      }
    }

    return Logger.instance;
  }

  public static createChild(context: Record<string, unknown>): PinoLogger {
    return Logger.getInstance().child(context);
  }
}
