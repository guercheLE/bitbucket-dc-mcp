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

import * as yaml from 'js-yaml';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { ZodError } from 'zod';
import { ConfigSchema, DEFAULT_CONFIG, type Config } from './config-schema.js';
import { Logger } from './logger.js';

const logger = Logger.getInstance();

/**
 * AuthMethod type alias for backward compatibility.
 */
export type AuthMethod = 'oauth2' | 'pat' | 'oauth1' | 'basic';

/**
 * Legacy AppConfig interface for backward compatibility.
 * Maps snake_case Config fields to camelCase.
 */
export interface AppConfig {
  bitbucketUrl: string;
  authMethod: 'oauth2' | 'pat' | 'oauth1' | 'basic';
  apiVersion: '1.0' | 'latest';
  credentialProfile?: string;
  rateLimit: number;
  timeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  cacheSize: number;
  retryAttempts: number;
  shutdownTimeoutMs: number;
  logPretty: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  forceFileStorage: boolean;
}

/**
 * Config file search locations in priority order.
 * First found file will be used.
 */
const DEFAULT_CONFIG_PATHS = [
  './bitbucket-dc-mcp.config.yml',
  join(homedir(), '.bitbucket-dc-mcp', 'config.yml'),
  '/etc/bitbucket-dc-mcp/config.yml',
];

/**
 * ConfigManager class handles configuration loading from multiple sources
 * with priority order: defaults < config file < env vars < CLI overrides
 */
export class ConfigManager {
  /**
   * Load and validate configuration from all sources.
   * Priority order: defaults < config file < env vars < overrides
   *
   * @param overrides - Manual config overrides (highest priority)
   * @returns Validated AppConfig object
   * @throws Error if validation fails with user-friendly message
   */
  public static async load(overrides: Partial<AppConfig> = {}): Promise<AppConfig> {
    try {
      // Step 1: Start with defaults
      const baseConfig = { ...DEFAULT_CONFIG };

      // Step 2: Load config file (if exists)
      const fileConfig = ConfigManager.findAndLoadConfigFile();

      // Step 3: Load environment variables
      const envConfig = ConfigManager.loadEnvVars();

      // Step 4: Convert overrides to snake_case for schema validation
      const snakeCaseOverrides = ConfigManager.toSnakeCase(overrides);

      // Step 5: Merge with priority: defaults < file < env < overrides
      const merged = {
        ...baseConfig,
        ...fileConfig,
        ...envConfig,
        ...snakeCaseOverrides,
      };

      // Step 6: Validate with Zod schema
      const validated = ConfigSchema.parse(merged);

      // Step 7: Convert back to camelCase for AppConfig
      return ConfigManager.toCamelCase(validated);
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = ConfigManager.formatValidationError(error);
        throw new Error(`Config validation failed:\n${formatted}`);
      }
      throw error;
    }
  }

  /**
   * Find and load config file from standard locations.
   * Searches in order: ./bitbucket-dc-mcp.config.yml, ~/.bitbucket-dc-mcp/config.yml, /etc/bitbucket-dc-mcp/config.yml
   *
   * @returns Parsed config object or empty object if no file found
   */
  private static findAndLoadConfigFile(): Partial<Config> {
    for (const location of DEFAULT_CONFIG_PATHS) {
      try {
        if (existsSync(location)) {
          logger.info(`Loaded config from: ${location}`);
          const content = readFileSync(location, 'utf-8');
          const parsed = yaml.load(content) as Partial<Config>;
          return parsed || {};
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to load config from ${location}: ${message}`);
      }
    }

    logger.debug('No config file found, using defaults and env vars');
    return {};
  }

  /**
   * Load configuration from environment variables.
   * Maps BITBUCKET_URL → bitbucket_url, LOG_LEVEL → log_level, etc.
   *
   * @returns Partial config object with env var overrides
   */
  private static loadEnvVars(): Partial<Config> {
    const updated: Partial<Config> = {};

    if (process.env.BITBUCKET_URL) {
      logger.info(`Overriding bitbucket_url from env var BITBUCKET_URL`);
      updated.bitbucket_url = process.env.BITBUCKET_URL;
    }

    if (process.env.BITBUCKET_AUTH_METHOD) {
      const method = process.env.BITBUCKET_AUTH_METHOD.toLowerCase();
      if (['oauth2', 'pat', 'oauth1', 'basic'].includes(method)) {
        logger.info(`Overriding auth_method from env var BITBUCKET_AUTH_METHOD: ${method}`);
        updated.auth_method = method as Config['auth_method'];
      }
    }

    if (process.env.BITBUCKET_API_VERSION) {
      const version = process.env.BITBUCKET_API_VERSION;
      if (['1.0', 'latest'].includes(version)) {
        logger.info(`Overriding api_version from env var BITBUCKET_API_VERSION: ${version}`);
        updated.api_version = version as '1.0' | 'latest';
      }
    }

    if (process.env.BITBUCKET_RATE_LIMIT) {
      const value = Number.parseInt(process.env.BITBUCKET_RATE_LIMIT, 10);
      if (Number.isFinite(value) && value > 0) {
        updated.rate_limit = value;
      }
    }

    if (process.env.BITBUCKET_TIMEOUT_MS) {
      const value = Number.parseInt(process.env.BITBUCKET_TIMEOUT_MS, 10);
      if (Number.isFinite(value) && value > 0) {
        updated.timeout = value;
      }
    }

    if (process.env.LOG_LEVEL) {
      const level = process.env.LOG_LEVEL.toLowerCase();
      if (['debug', 'info', 'warn', 'error'].includes(level)) {
        logger.info(`Overriding log_level from env var LOG_LEVEL: ${level}`);
        updated.log_level = level as Config['log_level'];
      }
    }

    if (process.env.CACHE_SIZE) {
      const value = Number.parseInt(process.env.CACHE_SIZE, 10);
      if (Number.isFinite(value) && value >= 0) {
        updated.cache_size = value;
      }
    }

    if (process.env.RETRY_ATTEMPTS) {
      const value = Number.parseInt(process.env.RETRY_ATTEMPTS, 10);
      if (Number.isFinite(value) && value >= 0) {
        updated.retry_attempts = value;
      }
    }

    if (process.env.CIRCUIT_BREAKER_THRESHOLD) {
      const value = Number.parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD, 10);
      if (Number.isFinite(value) && value > 0) {
        updated.circuit_breaker_threshold = value;
      }
    }

    if (process.env.CIRCUIT_BREAKER_TIMEOUT_MS) {
      const value = Number.parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS, 10);
      if (Number.isFinite(value) && value > 0) {
        updated.circuit_breaker_timeout = value;
      }
    }

    if (process.env.SHUTDOWN_TIMEOUT_MS) {
      const value = Number.parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10);
      if (Number.isFinite(value) && value > 0) {
        updated.shutdown_timeout_ms = value;
      }
    }

    if (process.env.LOG_PRETTY) {
      const normalized = process.env.LOG_PRETTY.toLowerCase();
      updated.log_pretty = normalized === 'true' || normalized === '1';
    }

    if (process.env.BITBUCKET_CREDENTIAL_PROFILE) {
      updated.credential_profile = process.env.BITBUCKET_CREDENTIAL_PROFILE;
    }

    return updated;
  }

  /**
   * Format ZodError into user-friendly error message with examples.
   *
   * @param error - ZodError from schema validation
   * @returns Formatted error message string
   */
  private static formatValidationError(error: ZodError): string {
    const messages: string[] = [];

    for (const issue of error.issues) {
      const field = issue.path.join('.');
      const message = issue.message;

      // Generate example based on field
      let example = '';
      if (field === 'bitbucket_url') {
        example = "Example: bitbucket_url: 'https://bitbucket.example.com'";
      } else if (field === 'auth_method') {
        example = "Example: auth_method: 'oauth2'";
      } else if (field.includes('timeout') || field.includes('limit')) {
        example = `Example: ${field}: 30000`;
      }

      messages.push(`  • ${field}: ${message}${example ? ` - ${example}` : ''}`);
    }

    return messages.join('\n');
  }

  /**
   * Convert camelCase AppConfig to snake_case Config for schema validation.
   */
  private static toSnakeCase(camelConfig: Partial<AppConfig>): Partial<Config> {
    const snake: Partial<Config> = {};

    if (camelConfig.bitbucketUrl !== undefined) snake.bitbucket_url = camelConfig.bitbucketUrl;
    if (camelConfig.authMethod !== undefined) snake.auth_method = camelConfig.authMethod;
    if (camelConfig.apiVersion !== undefined) snake.api_version = camelConfig.apiVersion;
    if (camelConfig.credentialProfile !== undefined)
      snake.credential_profile = camelConfig.credentialProfile;
    if (camelConfig.rateLimit !== undefined) snake.rate_limit = camelConfig.rateLimit;
    if (camelConfig.timeout !== undefined) snake.timeout = camelConfig.timeout;
    if (camelConfig.logLevel !== undefined) snake.log_level = camelConfig.logLevel;
    if (camelConfig.cacheSize !== undefined) snake.cache_size = camelConfig.cacheSize;
    if (camelConfig.retryAttempts !== undefined) snake.retry_attempts = camelConfig.retryAttempts;
    if (camelConfig.circuitBreakerThreshold !== undefined)
      snake.circuit_breaker_threshold = camelConfig.circuitBreakerThreshold;
    if (camelConfig.circuitBreakerTimeout !== undefined)
      snake.circuit_breaker_timeout = camelConfig.circuitBreakerTimeout;
    if (camelConfig.shutdownTimeoutMs !== undefined)
      snake.shutdown_timeout_ms = camelConfig.shutdownTimeoutMs;
    if (camelConfig.logPretty !== undefined) snake.log_pretty = camelConfig.logPretty;
    if (camelConfig.forceFileStorage !== undefined)
      snake.force_file_storage = camelConfig.forceFileStorage;

    return snake;
  }

  /**
   * Convert snake_case Config to camelCase AppConfig for backward compatibility.
   */
  private static toCamelCase(snakeConfig: Config): AppConfig {
    return {
      bitbucketUrl: snakeConfig.bitbucket_url,
      authMethod: snakeConfig.auth_method,
      apiVersion: snakeConfig.api_version,
      credentialProfile: snakeConfig.credential_profile,
      rateLimit: snakeConfig.rate_limit,
      timeout: snakeConfig.timeout,
      logLevel: snakeConfig.log_level,
      cacheSize: snakeConfig.cache_size,
      retryAttempts: snakeConfig.retry_attempts,
      circuitBreakerThreshold: snakeConfig.circuit_breaker_threshold,
      circuitBreakerTimeout: snakeConfig.circuit_breaker_timeout,
      shutdownTimeoutMs: snakeConfig.shutdown_timeout_ms,
      logPretty: snakeConfig.log_pretty,
      forceFileStorage: snakeConfig.force_file_storage,
    };
  }
}
