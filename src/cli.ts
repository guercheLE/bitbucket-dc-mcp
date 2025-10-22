#!/usr/bin/env node

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

/**
 * CLI Entry Point for bitbucket-mcp global command
 * Provides subcommands: setup, search, call, config, version, help
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('bitbucket-mcp')
  .description(
    'Bitbucket DataCenter MCP Server - Semantic search and operation execution for Bitbucket DC',
  )
  .version(packageJson.version);

// Global options
program.option('--debug', 'Enable debug logging');
program.option('--config <path>', 'Custom config file path');

// Setup command
program
  .command('setup')
  .description('Run interactive setup wizard')
  .option('--force', 'Overwrite existing config')
  .option('--non-interactive', 'Use environment variables and defaults')
  .action(async (options) => {
    try {
      const { setupCommand } = await import('./cli/setup-command.js');
      await setupCommand(options);
    } catch (error) {
      console.error('Setup failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Search command
program
  .command('search')
  .description('Search for Bitbucket operations using semantic search')
  .argument('<query>', 'Search query')
  .option('--limit <n>', 'Maximum number of results', '5')
  .option('--json', 'Output results as JSON')
  .option('--verbose', 'Show similarity scores')
  .action(async (query, options) => {
    try {
      const { searchCommand } = await import('./cli/search-command.js');
      await searchCommand(query, options);
    } catch (error) {
      console.error('Search failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Get command
program
  .command('get')
  .description('Get detailed information about a Bitbucket operation by ID')
  .argument('<operationId>', 'Operation ID to retrieve')
  .option('--json', 'Output results as JSON')
  .option('--verbose', 'Show detailed schema and examples')
  .action(async (operationId, options) => {
    try {
      const { getCommand } = await import('./cli/get-command.js');
      await getCommand(operationId, options);
    } catch (error) {
      console.error('Get failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Call command
program
  .command('call')
  .description('Execute a Bitbucket operation by ID')
  .argument('<operationId>', 'Operation ID to execute')
  .option('--param <key=value...>', 'Operation parameters (can be repeated)', [])
  .option('--json', 'Output raw JSON response')
  .option('--dry-run', 'Validate parameters only, do not execute')
  .action(async (operationId, options) => {
    try {
      const { callCommand } = await import('./cli/call-command.js');
      await callCommand(operationId, options);
    } catch (error) {
      console.error('Call failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Start command - launches the MCP server
program
  .command('start')
  .description('Start the MCP server (stdio mode)')
  .action(async () => {
    try {
      const { main } = await import('./index.js');
      await main();
    } catch (error) {
      console.error('Server failed to start:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// HTTP Server command - launches the MCP server in HTTP mode
program
  .command('http')
  .description('Start the MCP server in HTTP mode')
  .option('--host <host>', 'Host to bind to', '127.0.0.1')
  .option('--port <port>', 'Port to listen on', '3000')
  .option('--cors', 'Enable CORS', false)
  .action(async (options) => {
    try {
      const { startHttpServer } = await import('./http/index.js');
      await startHttpServer({
        host: options.host,
        port: Number.parseInt(options.port, 10),
        cors: options.cors,
      });
    } catch (error) {
      console.error('HTTP server failed to start:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Test Connection command
program
  .command('test-connection')
  .description('Test connectivity and authentication to Bitbucket Data Center')
  .action(async (options) => {
    try {
      const { testConnectionCommand } = await import('./cli/test-connection-command.js');
      await testConnectionCommand(options);
    } catch (error) {
      console.error('Test connection failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .argument('<action>', 'Action to perform: show, validate, path, reset')
  .action(async (action, options) => {
    try {
      const { configCommand } = await import('./cli/config-command.js');
      await configCommand(action, options);
    } catch (error) {
      console.error('Config command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Version command
program
  .command('version')
  .description('Show version information')
  .option('--check-updates', 'Check for available updates')
  .action(async (options) => {
    try {
      const { versionCommand } = await import('./cli/version-command.js');
      await versionCommand(options);
    } catch (error) {
      console.error('Version command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add examples to help
program.addHelpText(
  'after',
  `

Examples:
  $ bitbucket-dc-mcp setup                          Run interactive setup wizard
  $ bitbucket-dc-mcp start                          Start the MCP server (stdio mode)
  $ bitbucket-dc-mcp http                           Start HTTP server on localhost:3000
  $ bitbucket-dc-mcp http --host 0.0.0.0 --port 8080  Start HTTP server on all interfaces
  $ bitbucket-dc-mcp test-connection                Test Bitbucket connectivity and authentication
  $ bitbucket-dc-mcp search "create repository"          Search for operations
  $ bitbucket-dc-mcp get createRepository                Get detailed info about an operation
  $ bitbucket-dc-mcp call createRepository --param projectKey=TEST --param summary="New repository"
  $ bitbucket-dc-mcp config show                    Display current configuration
  $ bitbucket-dc-mcp config validate                Validate configuration file
  $ bitbucket-dc-mcp version --check-updates        Check for available updates

For more help, visit: https://github.com/guercheLE/bitbucket-dc-mcp#readme
`,
);

// Parse arguments
program.parse(process.argv);

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
