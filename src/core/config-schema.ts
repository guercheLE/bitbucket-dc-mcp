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

import { z } from 'zod';

/**
 * Zod schema for application configuration with validation rules.
 * This schema defines required and optional fields with sensible defaults
 * and enforces validation constraints (URL format, numeric ranges, enums).
 */
export const ConfigSchema = z.object({
  // Required fields
  bitbucket_url: z.string().url('Invalid bitbucket_url: must be valid HTTP/HTTPS URL'),
  auth_method: z
    .enum(['oauth2', 'pat', 'oauth1', 'basic'])
    .refine((val) => ['oauth2', 'pat', 'oauth1', 'basic'].includes(val), {
      message: 'Invalid auth_method: must be one of [oauth2, pat, oauth1, basic]',
    }),

  // Optional fields with validation
  api_version: z
    .enum(['1.0', 'latest'])
    .default('latest')
    .describe('Bitbucket Data Center REST API version (1.0 for legacy, latest for modern instances)'),
  credential_profile: z.string().optional(),
  rate_limit: z
    .number()
    .int()
    .min(1, 'rate_limit must be at least 1')
    .max(1000, 'rate_limit must be at most 1000')
    .default(100),
  timeout: z
    .number()
    .int()
    .min(1000, 'timeout must be at least 1000ms')
    .max(120000, 'timeout must be at most 120000ms (2 minutes)')
    .default(30000),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  cache_size: z
    .number()
    .int()
    .min(10, 'cache_size must be at least 10')
    .max(10000, 'cache_size must be at most 10000')
    .default(1000),
  retry_attempts: z
    .number()
    .int()
    .min(0, 'retry_attempts must be at least 0')
    .max(10, 'retry_attempts must be at most 10')
    .default(3),
  circuit_breaker_threshold: z
    .number()
    .int()
    .min(1, 'circuit_breaker_threshold must be at least 1')
    .max(100, 'circuit_breaker_threshold must be at most 100')
    .default(5),
  circuit_breaker_timeout: z
    .number()
    .int()
    .min(1000, 'circuit_breaker_timeout must be at least 1000ms')
    .max(300000, 'circuit_breaker_timeout must be at most 300000ms (5 minutes)')
    .default(30000),
  shutdown_timeout_ms: z
    .number()
    .int()
    .min(1000, 'shutdown_timeout_ms must be at least 1000ms')
    .max(120000, 'shutdown_timeout_ms must be at most 120000ms')
    .default(30000),
  log_pretty: z.boolean().default(false),
  force_file_storage: z
    .boolean()
    .default(false)
    .describe(
      'Force use of encrypted file storage instead of OS keychain (useful for systems with keychain issues)',
    ),
});

/**
 * TypeScript type inferred from ConfigSchema.
 * Use this type for type-safe config objects throughout the application.
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration values.
 * These are used as the base layer in the config priority merge:
 * defaults < config file < env vars < CLI flags
 */
export const DEFAULT_CONFIG: Partial<Config> = {
  api_version: 'latest',
  rate_limit: 100,
  timeout: 30000,
  log_level: 'info',
  cache_size: 1000,
  retry_attempts: 3,
  circuit_breaker_threshold: 5,
  circuit_breaker_timeout: 30000,
  shutdown_timeout_ms: 30000,
  log_pretty: false,
  force_file_storage: false,
};

/**
 * Field metadata for documentation generation.
 * Maps config field names to human-readable descriptions and env var names.
 */
export const CONFIG_FIELD_METADATA: Record<string, { description: string; envVar?: string }> = {
  bitbucket_url: {
    description: 'Base URL of your Bitbucket Data Center instance',
    envVar: 'BITBUCKET_URL',
  },
  auth_method: {
    description: 'Authentication method to use',
    envVar: 'BITBUCKET_AUTH_METHOD',
  },
  api_version: {
    description: 'Bitbucket Data Center REST API version (1.0 for legacy, latest for modern instances)',
    envVar: 'BITBUCKET_API_VERSION',
  },
  credential_profile: {
    description: 'Optional profile name for credential storage',
    envVar: 'BITBUCKET_CREDENTIAL_PROFILE',
  },
  rate_limit: {
    description: 'Maximum API requests per minute',
    envVar: 'BITBUCKET_RATE_LIMIT',
  },
  timeout: {
    description: 'HTTP request timeout in milliseconds',
    envVar: 'BITBUCKET_TIMEOUT_MS',
  },
  log_level: {
    description: 'Logging level',
    envVar: 'LOG_LEVEL',
  },
  cache_size: {
    description: 'Maximum number of cached items',
    envVar: 'CACHE_SIZE',
  },
  retry_attempts: {
    description: 'Number of retry attempts for failed requests',
    envVar: 'RETRY_ATTEMPTS',
  },
  circuit_breaker_threshold: {
    description: 'Number of failures before circuit breaker opens',
    envVar: 'CIRCUIT_BREAKER_THRESHOLD',
  },
  circuit_breaker_timeout: {
    description: 'Circuit breaker timeout in milliseconds',
    envVar: 'CIRCUIT_BREAKER_TIMEOUT_MS',
  },
  shutdown_timeout_ms: {
    description: 'Graceful shutdown timeout in milliseconds',
    envVar: 'SHUTDOWN_TIMEOUT_MS',
  },
  log_pretty: {
    description: 'Enable pretty-printed logs (for development)',
    envVar: 'LOG_PRETTY',
  },
  force_file_storage: {
    description:
      'Force encrypted file storage instead of OS keychain (for systems with keychain issues)',
    envVar: 'BITBUCKET_FORCE_FILE_STORAGE',
  },
};
