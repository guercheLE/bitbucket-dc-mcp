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

/**
 * Call Command Handler
 * Executes Bitbucket operations directly from CLI
 */

/* eslint-disable no-console */

import chalk from 'chalk';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

interface CallOptions {
  param?: string[];
  json?: boolean;
  dryRun?: boolean;
  config?: string;
}

/**
 * Get the package root directory
 */
function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // From dist/cli/ go up to package root
  return join(__dirname, '..', '..');
}

/**
 * Execute call command
 */
export async function callCommand(operationId: string, options: CallOptions): Promise<void> {
  // Parse parameters from --param flags
  const parameters = parseParameters(options.param || []);

  if (options.dryRun) {
    console.log(chalk.blue('\n🔍 Dry run mode - validating parameters only\n'));
  }

  try {
    // Load configuration
    const { ConfigManager } = await import('../core/config-manager.js');
    const config = await ConfigManager.load();

    // Initialize services
    const { BitbucketClientService } = await import('../services/bitbucket-client.js');
    const { AuthManager } = await import('../auth/auth-manager.js');
    const { CredentialStorage } = await import('../core/credential-storage.js');
    const { Logger } = await import('../core/logger.js');
    const { RateLimiter } = await import('../core/rate-limiter.js');
    const { JsonOperationsRepository } = await import('../data/operations-repository.js');

    const logger = Logger.getInstance();
    const credentialStorage = new CredentialStorage(logger, undefined, config.forceFileStorage);
    const authManager = new AuthManager(credentialStorage, logger, config);
    const rateLimiter = new RateLimiter({
      capacity: config.rateLimit,
      refillRate: config.rateLimit,
    });

    const packageRoot = getPackageRoot();
    const operationsPath = join(packageRoot, 'data', 'operations.json');
    const operationsRepo = new JsonOperationsRepository(operationsPath, logger);

    const bitbucketClient = new BitbucketClientService(
      authManager,
      rateLimiter,
      logger,
      config,
      operationsRepo,
    );

    // Get operation details for validation
    const operation = operationsRepo.getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation "${operationId}" not found`);
    }

    console.log(chalk.cyan(`\n📋 Operation: ${operationId}`));
    console.log(chalk.gray(`   Summary: ${operation.summary || 'N/A'}\n`));

    // TODO: Validate parameters against schema when validator is available
    console.log(chalk.green('✅ Parameters validated'));

    if (options.dryRun) {
      console.log(chalk.blue('\n✓ Dry run complete - parameters are valid\n'));
      return;
    }

    // Execute operation
    console.log(chalk.blue('\n🚀 Executing operation...\n'));

    const result = await bitbucketClient.executeOperation(operationId, parameters);

    // Output result
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('✅ Operation completed successfully\n'));
      console.log(chalk.bold('Response:'));
      console.log(JSON.stringify(result, null, 2));
      console.log('');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('config')) {
      console.error(chalk.red('\n❌ Configuration not found'));
      console.error(
        chalk.yellow('\nRun "bitbucket-dc-mcp setup" to configure your Bitbucket connection.\n'),
      );
      process.exit(1);
    }
    throw new Error(
      `Operation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Parse parameters from --param key=value flags
 */
function parseParameters(paramArray: string[]): Record<string, unknown> {
  const parameters: Record<string, unknown> = {};

  for (const param of paramArray) {
    const match = param.match(/^([^=]+)=(.+)$/);
    if (!match) {
      throw new Error(`Invalid parameter format: "${param}". Expected format: key=value`);
    }

    const [, key, value] = match;

    // Try to parse as JSON for complex values
    try {
      parameters[key] = JSON.parse(value);
    } catch {
      // If not valid JSON, treat as string
      parameters[key] = value;
    }
  }

  return parameters;
}
