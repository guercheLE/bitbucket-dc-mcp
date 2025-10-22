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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLogTransport,
  getLogTransportConfig,
  validateLogTransportConfig,
  type LogTransportConfig,
} from '../../../src/core/log-transport.js';

describe('LogTransport', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {
      LOG_OUTPUT: process.env.LOG_OUTPUT,
      LOG_FILE_PATH: process.env.LOG_FILE_PATH,
      LOG_ROTATION: process.env.LOG_ROTATION,
      LOG_MAX_SIZE: process.env.LOG_MAX_SIZE,
      LOG_MAX_FILES: process.env.LOG_MAX_FILES,
    };
  });

  afterEach(() => {
    // Restore original environment
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  });

  describe('getLogTransportConfig', () => {
    it('should return default configuration', () => {
      delete process.env.LOG_OUTPUT;
      delete process.env.LOG_FILE_PATH;

      const config = getLogTransportConfig();

      expect(config.output).toBe('stdout');
      expect(config.filePath).toBe('./logs/bitbucket-dc-mcp.log');
      expect(config.rotation).toBe('daily');
      expect(config.maxSize).toBe(50);
      expect(config.maxFiles).toBe(30);
      expect(config.errorLogPath).toBe('./logs/bitbucket-dc-mcp-errors.log');
      expect(config.errorMaxSize).toBe(100);
      expect(config.errorMaxFiles).toBe(90);
    });

    it('should read LOG_OUTPUT from environment', () => {
      process.env.LOG_OUTPUT = 'file';
      const config = getLogTransportConfig();
      expect(config.output).toBe('file');
    });

    it('should read LOG_FILE_PATH from environment', () => {
      process.env.LOG_FILE_PATH = '/var/log/custom.log';
      const config = getLogTransportConfig();
      expect(config.filePath).toBe('/var/log/custom.log');
    });

    it('should read LOG_ROTATION from environment', () => {
      process.env.LOG_ROTATION = 'hourly';
      const config = getLogTransportConfig();
      expect(config.rotation).toBe('hourly');
    });

    it('should read LOG_MAX_SIZE from environment', () => {
      process.env.LOG_MAX_SIZE = '50';
      const config = getLogTransportConfig();
      expect(config.maxSize).toBe(50);
    });

    it('should read LOG_MAX_FILES from environment', () => {
      process.env.LOG_MAX_FILES = '14';
      const config = getLogTransportConfig();
      expect(config.maxFiles).toBe(14);
    });
  });

  describe('createLogTransport', () => {
    it('should redirect stdout output to stderr for MCP compatibility', () => {
      const config: LogTransportConfig = {
        output: 'stdout',
      };

      const transport = createLogTransport(config);
      expect(transport).toBeDefined();
      expect(transport).toHaveProperty('target', 'pino/file');
      expect(transport).toHaveProperty('options');
      // Verify it's using stderr (fd 2), not stdout (fd 1)
      expect((transport as any).options.destination).toBe(2);
    });

    it('should create file transport for file output', () => {
      const config: LogTransportConfig = {
        output: 'file',
        filePath: './logs/test.log',
      };

      const transport = createLogTransport(config);
      expect(transport).toBeDefined();
      expect(transport).toHaveProperty('targets');
      expect((transport as any).targets).toHaveLength(2); // stderr + file (no error log without errorLogPath)
      // Verify first target uses stderr (fd 2)
      expect((transport as any).targets[0].options.destination).toBe(2);
    });

    it('should create multi-target transport for both output with stderr', () => {
      const config: LogTransportConfig = {
        output: 'both',
        filePath: './logs/test.log',
      };

      const transport = createLogTransport(config);
      expect(transport).toBeDefined();
      expect(transport).toHaveProperty('targets');
      expect((transport as any).targets).toHaveLength(2); // stderr + file (no error log without errorLogPath)
      // Verify first target uses stderr (fd 2), not stdout (fd 1)
      expect((transport as any).targets[0].options.destination).toBe(2);
    });

    it('should create separate error log transport when errorLogPath is provided', () => {
      const config: LogTransportConfig = {
        output: 'file',
        filePath: './logs/test.log',
        errorLogPath: './logs/errors.log',
      };

      const transport = createLogTransport(config);
      expect(transport).toBeDefined();
      expect(transport).toHaveProperty('targets');
      expect((transport as any).targets).toHaveLength(3); // stderr + file + error file
      // Verify third target is for errors
      expect((transport as any).targets[2].level).toBe('error');
    });

    it('should fallback to stderr when file output has no path', () => {
      const config: LogTransportConfig = {
        output: 'file',
      };

      const transport = createLogTransport(config);
      // When file output has no path, fallback to stderr
      expect(transport).toBeDefined();
      expect(transport).toHaveProperty('target', 'pino/file');
      expect((transport as any).options.destination).toBe(2);
    });
  });

  describe('validateLogTransportConfig', () => {
    it('should validate valid stdout configuration', () => {
      const config: LogTransportConfig = {
        output: 'stdout',
      };

      const errors = validateLogTransportConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should validate valid file configuration', () => {
      const config: LogTransportConfig = {
        output: 'file',
        filePath: './logs/test.log',
        maxSize: 100,
        maxFiles: 7,
      };

      const errors = validateLogTransportConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should validate valid both configuration', () => {
      const config: LogTransportConfig = {
        output: 'both',
        filePath: './logs/test.log',
      };

      const errors = validateLogTransportConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid output value', () => {
      const config: LogTransportConfig = {
        output: 'invalid' as any,
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid LOG_OUTPUT');
    });

    it('should require filePath for file output', () => {
      const config: LogTransportConfig = {
        output: 'file',
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('LOG_FILE_PATH is required');
    });

    it('should require filePath for both output', () => {
      const config: LogTransportConfig = {
        output: 'both',
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('LOG_FILE_PATH is required');
    });

    it('should reject invalid maxSize (too small)', () => {
      const config: LogTransportConfig = {
        output: 'file',
        filePath: './logs/test.log',
        maxSize: 0,
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid LOG_MAX_SIZE');
    });

    it('should reject invalid maxSize (too large)', () => {
      const config: LogTransportConfig = {
        output: 'file',
        filePath: './logs/test.log',
        maxSize: 2000,
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid LOG_MAX_SIZE');
    });

    it('should reject invalid maxFiles (too small)', () => {
      const config: LogTransportConfig = {
        output: 'file',
        filePath: './logs/test.log',
        maxFiles: 0,
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid LOG_MAX_FILES');
    });

    it('should reject invalid maxFiles (too large)', () => {
      const config: LogTransportConfig = {
        output: 'file',
        filePath: './logs/test.log',
        maxFiles: 200,
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid LOG_MAX_FILES');
    });

    it('should return multiple errors for multiple issues', () => {
      const config: LogTransportConfig = {
        output: 'invalid' as any,
        maxSize: -1,
        maxFiles: 0,
      };

      const errors = validateLogTransportConfig(config);
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
