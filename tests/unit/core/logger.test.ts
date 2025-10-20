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
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Logger } from '../../../src/core/logger.js';
import { LogCapture } from '../../helpers/log-capture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

describe('Logger', () => {
  let originalLogLevel: string | undefined;

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL;
    // Reset Logger instance between tests
    (Logger as any).instance = undefined;
    (Logger as any).configuration = {};
  });

  afterEach(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  describe('Configuration', () => {
    it('should create logger with base fields', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        base: { service: 'bitbucket-dc-mcp', version: packageJson.version },
      });

      testLogger.info('test message');
      const log = logCapture.getLogs()[0];

      expect(log).toBeDefined();
      expect(log.service).toBe('bitbucket-dc-mcp');
      expect(log.version).toBe(packageJson.version);
      expect(log.msg).toBe('test message');
      expect(log.level).toBeDefined();
      expect(log.time).toBeDefined();
    });

    it('should use LOG_LEVEL env var', () => {
      process.env.LOG_LEVEL = 'debug';
      Logger.configure({});
      const logger = Logger.getInstance();

      expect(logger.level).toBe('debug');
    });

    it('should default to info level', () => {
      delete process.env.LOG_LEVEL;
      Logger.configure({});
      const logger = Logger.getInstance();

      expect(logger.level).toBe('info');
    });

    it('should allow level override via configure', () => {
      Logger.configure({ level: 'warn' });
      const logger = Logger.getInstance();

      expect(logger.level).toBe('warn');
    });

    it('should include service and version in base fields', () => {
      Logger.configure({ level: 'info' });
      const logger = Logger.getInstance();

      // Logger should have base bindings
      const bindings = (logger as any).bindings();
      expect(bindings.service).toBe('bitbucket-dc-mcp');
      expect(bindings.version).toBe(packageJson.version);
    });
  });

  describe('Redaction', () => {
    it('should redact password field', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        redact: {
          paths: ['password'],
          censor: '***',
        },
      });

      testLogger.info({ username: 'user', password: 'secret123' }, 'auth attempt');
      const log = logCapture.getLogs()[0];

      expect(log.password).toBe('***');
      expect(log.username).toBe('user');
    });

    it('should redact token field', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        redact: {
          paths: ['token'],
          censor: '***',
        },
      });

      testLogger.info({ token: 'abc-xyz-123' }, 'token generated');
      const log = logCapture.getLogs()[0];

      expect(log.token).toBe('***');
    });

    it('should redact access_token and refresh_token', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        redact: {
          paths: ['access_token', 'refresh_token'],
          censor: '***',
        },
      });

      testLogger.info(
        {
          access_token: 'access-secret',
          refresh_token: 'refresh-secret',
        },
        'oauth tokens',
      );
      const log = logCapture.getLogs()[0];

      expect(log.access_token).toBe('***');
      expect(log.refresh_token).toBe('***');
    });

    it('should redact nested sensitive fields', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        redact: {
          paths: ['auth.token', 'auth.password'],
          censor: '***',
        },
      });

      testLogger.info(
        {
          auth: {
            token: 'secret-token',
            password: 'secret-password',
          },
          user: 'john',
        },
        'nested auth',
      );
      const log = logCapture.getLogs()[0];

      expect(log.auth.token).toBe('***');
      expect(log.auth.password).toBe('***');
      expect(log.user).toBe('john');
    });

    it('should redact credentials, apiKey, and secret fields', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        redact: {
          paths: ['credentials', 'apiKey', 'secret'],
          censor: '***',
        },
      });

      testLogger.info(
        {
          credentials: 'user:pass',
          apiKey: 'api-key-123',
          secret: 'my-secret',
        },
        'sensitive data',
      );
      const log = logCapture.getLogs()[0];

      expect(log.credentials).toBe('***');
      expect(log.apiKey).toBe('***');
      expect(log.secret).toBe('***');
    });

    it('should use wildcard redaction paths', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        redact: {
          paths: ['*.password', '*.token'],
          censor: '***',
        },
      });

      testLogger.info(
        {
          user: { password: 'secret1' },
          auth: { token: 'secret2' },
        },
        'wildcard test',
      );
      const log = logCapture.getLogs()[0];

      expect(log.user.password).toBe('***');
      expect(log.auth.token).toBe('***');
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with context', () => {
      Logger.configure({ level: 'info' });
      const logCapture = new LogCapture();
      const logger = Logger.getInstance();

      // We can't capture from the actual logger easily in tests,
      // but we can test that createChild returns a child logger
      const childLogger = Logger.createChild({ correlation_id: 'test-123' });

      expect(childLogger).toBeDefined();
      expect((childLogger as any).bindings().correlation_id).toBe('test-123');
    });

    it('should merge multiple contexts in child logger', () => {
      Logger.configure({ level: 'info' });
      const childLogger = Logger.createChild({
        correlation_id: 'test-456',
        tool_name: 'search_ids',
      });

      const bindings = (childLogger as any).bindings();
      expect(bindings.correlation_id).toBe('test-456');
      expect(bindings.tool_name).toBe('search_ids');
    });
  });

  describe('Log Levels', () => {
    it('should log at debug level', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        level: 'debug',
        formatters: {
          level: (label) => ({ level: label }),
        },
      });

      testLogger.debug('debug message');
      const log = logCapture.getLogs()[0];

      expect(log.level).toBe('debug');
      expect(log.msg).toBe('debug message');
    });

    it('should log at info level', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        level: 'info',
        formatters: {
          level: (label) => ({ level: label }),
        },
      });

      testLogger.info('info message');
      const log = logCapture.getLogs()[0];

      expect(log.level).toBe('info');
    });

    it('should log at warn level', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        level: 'warn',
        formatters: {
          level: (label) => ({ level: label }),
        },
      });

      testLogger.warn('warn message');
      const log = logCapture.getLogs()[0];

      expect(log.level).toBe('warn');
    });

    it('should log at error level', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        level: 'error',
        formatters: {
          level: (label) => ({ level: label }),
        },
      });

      testLogger.error('error message');
      const log = logCapture.getLogs()[0];

      expect(log.level).toBe('error');
    });

    it('should not log debug when level is info', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        level: 'info',
        formatters: {
          level: (label) => ({ level: label }),
        },
      });

      testLogger.debug('debug message');
      testLogger.info('info message');

      const logs = logCapture.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('info');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize error objects', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        level: 'error',
        serializers: {
          err: (err: Error) => ({
            type: err.constructor.name,
            message: err.message,
            stack: err.stack,
          }),
        },
      });

      const error = new Error('Test error');
      testLogger.error({ err: error }, 'error occurred');
      const log = logCapture.getLogs()[0];

      expect(log.err).toBeDefined();
      expect(log.err.type).toBe('Error');
      expect(log.err.message).toBe('Test error');
      expect(log.err.stack).toBeDefined();
    });
  });

  describe('Structured Fields', () => {
    it('should log structured data', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({ level: 'info' });

      testLogger.info(
        {
          tool: 'search_ids',
          query: 'create issue',
          results_count: 5,
          latency_ms: 342,
          cache_hit: false,
        },
        'search completed',
      );
      const log = logCapture.getLogs()[0];

      expect(log.tool).toBe('search_ids');
      expect(log.query).toBe('create issue');
      expect(log.results_count).toBe(5);
      expect(log.latency_ms).toBe(342);
      expect(log.cache_hit).toBe(false);
    });
  });

  describe('Timestamp Format', () => {
    it('should use Unix timestamp in milliseconds', () => {
      const logCapture = new LogCapture();
      const testLogger = logCapture.createLogger({
        timestamp: () => `,"time":${Date.now()}`,
      });

      const beforeLog = Date.now();
      testLogger.info('timestamp test');
      const afterLog = Date.now();
      const log = logCapture.getLogs()[0];

      expect(log.time).toBeGreaterThanOrEqual(beforeLog);
      expect(log.time).toBeLessThanOrEqual(afterLog);
    });
  });
});
