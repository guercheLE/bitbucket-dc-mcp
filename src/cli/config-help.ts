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

/* eslint-disable no-console */
import { CONFIG_FIELD_METADATA, DEFAULT_CONFIG } from '../core/config-schema.js';

/**
 * Display comprehensive configuration help including all options,
 * descriptions, defaults, and environment variable mappings.
 */
export function displayConfigHelp(): void {
  console.log('\n📋 Bitbucket MCP Configuration Guide\n');
  console.log('Configuration can be set via:');
  console.log(
    '  1. Config file (./bitbucket-dc-mcp.config.yml, ~/.bitbucket-dc-mcp/config.yml, /etc/bitbucket-dc-mcp/config.yml)',
  );
  console.log('  2. Environment variables');
  console.log('  3. CLI flags (when applicable)\n');
  console.log('Priority order: defaults < config file < env vars < CLI flags\n');

  console.log('━'.repeat(100));
  console.log(
    `${'Field'.padEnd(30)} ${'Type'.padEnd(12)} ${'Default'.padEnd(15)} ${'Env Var'.padEnd(25)} Description`,
  );
  console.log('━'.repeat(100));

  // Required fields
  displayConfigField('bitbucket_url', 'string (URL)', 'REQUIRED', 'BITBUCKET_URL');
  displayConfigField('auth_method', 'enum', 'REQUIRED', 'BITBUCKET_AUTH_METHOD');

  console.log('─'.repeat(100));

  // Optional fields with defaults
  const optionalFields = [
    'credential_profile',
    'rate_limit',
    'timeout',
    'log_level',
    'cache_size',
    'retry_attempts',
    'circuit_breaker_threshold',
    'circuit_breaker_timeout',
    'shutdown_timeout_ms',
    'log_pretty',
  ];

  for (const field of optionalFields) {
    const defaultValue = DEFAULT_CONFIG[field as keyof typeof DEFAULT_CONFIG];
    const type = typeof defaultValue === 'number' ? 'number' : typeof defaultValue;
    const envVar = CONFIG_FIELD_METADATA[field]?.envVar || '';
    displayConfigField(field, type, String(defaultValue), envVar);
  }

  console.log('━'.repeat(100));
  console.log('\n📝 Example config file (bitbucket-dc-mcp.config.yml):\n');
  console.log(`bitbucket_url: 'https://bitbucket.example.com'
auth_method: 'oauth2'
credential_profile: 'my-profile'
rate_limit: 100
timeout: 30000
log_level: 'info'
cache_size: 1000
retry_attempts: 3
circuit_breaker_threshold: 5
circuit_breaker_timeout: 30000
shutdown_timeout_ms: 30000
log_pretty: false
`);

  console.log('\n🔐 Environment Variable Examples:\n');
  console.log('export BITBUCKET_URL="https://bitbucket.example.com"');
  console.log('export BITBUCKET_AUTH_METHOD="oauth2"');
  console.log('export LOG_LEVEL="debug"');
  console.log('export BITBUCKET_RATE_LIMIT="200"\n');

  console.log('📚 For more details, see: https://github.com/guercheLE/bitbucket-dc-mcp\n');
}

/**
 * Display a single config field row in the help table.
 */
function displayConfigField(
  field: string,
  type: string,
  defaultValue: string,
  envVar: string,
): void {
  const description = CONFIG_FIELD_METADATA[field]?.description || '';
  const fieldDisplay = field.padEnd(30);
  const typeDisplay = type.padEnd(12);
  const defaultDisplay = defaultValue.padEnd(15);
  const envVarDisplay = envVar.padEnd(25);

  console.log(`${fieldDisplay} ${typeDisplay} ${defaultDisplay} ${envVarDisplay} ${description}`);

  // Add additional info for enums
  if (field === 'auth_method') {
    console.log('  '.padEnd(30) + 'Options: oauth2, pat, oauth1, basic');
  } else if (field === 'log_level') {
    console.log('  '.padEnd(30) + 'Options: debug, info, warn, error');
  }
}
