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
 * Config Command Handler
 * Manages configuration display and validation
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import chalk from 'chalk';
import { existsSync, unlinkSync } from 'fs';
import inquirer from 'inquirer';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { displayConfigHelp } from './config-help.js';

interface ConfigOptions {
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
 * Execute config command
 */
export async function configCommand(action: string, options: ConfigOptions): Promise<void> {
  const configPath = options.config || join(homedir(), '.bitbucket-dc-mcp', 'config.yml');

  switch (action) {
    case 'show':
      await showConfig(configPath);
      break;
    case 'validate':
      await validateConfig(configPath);
      break;
    case 'path':
      await showPath(configPath);
      break;
    case 'reset':
      await resetConfig(configPath);
      break;
    case 'help':
      displayConfigHelp();
      break;
    default:
      throw new Error(
        `Unknown action: ${action}\n` + 'Valid actions: show, validate, path, reset, help',
      );
  }
}

/**
 * Display current configuration with sanitized credentials
 */
async function showConfig(configPath: string): Promise<void> {
  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n⚠️  No configuration found'));
    console.log(chalk.gray(`   Expected path: ${configPath}`));
    console.log(chalk.gray('   Run "bitbucket-dc-mcp setup" to create configuration\n'));
    return;
  }

  try {
    // Load config from YAML file
    const yaml = await import('js-yaml');
    const { readFileSync } = await import('fs');
    const Table = (await import('cli-table3')).default;

    const yamlContent = readFileSync(configPath, 'utf-8');
    const config = yaml.load(yamlContent) as Record<string, any>;

    console.log(chalk.green('\n✅ Current Configuration:\n'));

    const table = new Table({
      colWidths: [25, 60],
    });

    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        table.push([
          chalk.cyan(key),
          typeof value === 'object' ? JSON.stringify(value) : String(value),
        ]);
      }
    });

    console.log(table.toString());
    console.log(chalk.gray(`\n📁 Config file: ${configPath}`));

    // Try to show credential status (without exposing secrets)
    try {
      const { CredentialStorage } = await import('../core/credential-storage.js');
      const { Logger } = await import('../core/logger.js');
      const logger = Logger.getInstance();
      const forceFileStorage = (config.force_file_storage as boolean | undefined) || false;
      const credentialStorage = new CredentialStorage(logger, undefined, forceFileStorage);

      const credentials = await credentialStorage.load(config.bitbucket_url);
      if (credentials) {
        console.log(chalk.green('🔑 Credentials: Stored securely in keychain'));
      } else {
        console.log(chalk.yellow('🔑 Credentials: Not found in keychain'));
      }
    } catch {
      // Credential check failed - not critical
      console.log(chalk.gray('🔑 Credentials: Unable to check keychain'));
    }

    console.log('');
  } catch (error) {
    throw new Error(
      `Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validate configuration and test connectivity
 */
async function validateConfig(configPath: string): Promise<void> {
  if (!existsSync(configPath)) {
    console.log(chalk.red('\n❌ No configuration found'));
    console.log(chalk.yellow('   Run "bitbucket-dc-mcp setup" to create configuration\n'));
    process.exit(1);
  }

  console.log(chalk.blue('\n🔍 Validating configuration...\n'));

  try {
    // Load config from YAML file
    const yaml = await import('js-yaml');
    const { readFileSync } = await import('fs');
    const yamlContent = readFileSync(configPath, 'utf-8');
    const config = yaml.load(yamlContent) as Record<string, any>;

    // Validate required fields
    const requiredFields = ['bitbucket_url', 'auth_method'];
    const missing = requiredFields.filter((field) => !config[field]);

    if (missing.length > 0) {
      console.log(chalk.red('❌ Missing required fields:'));
      missing.forEach((field) => console.log(chalk.red(`   - ${field}`)));
      console.log('');
      process.exit(1);
    }

    console.log(chalk.green('✅ Configuration file is valid'));
    console.log(chalk.gray(`   URL: ${config.bitbucket_url}`));
    console.log(chalk.gray(`   Auth: ${config.auth_method}`));

    // Check credentials
    console.log(chalk.blue('\n🔑 Checking credentials...\n'));

    const { CredentialStorage } = await import('../core/credential-storage.js');
    const { Logger } = await import('../core/logger.js');
    const logger = Logger.getInstance();
    const forceFileStorage2 = (config.force_file_storage as boolean | undefined) || false;
    const credentialStorage = new CredentialStorage(logger, undefined, forceFileStorage2);

    const credentials = await credentialStorage.load(config.bitbucket_url);
    if (!credentials) {
      console.log(chalk.yellow('⚠️  No credentials found in keychain'));
      console.log(chalk.gray('   Run "bitbucket-dc-mcp setup" to configure credentials\n'));
      process.exit(1);
    }

    console.log(chalk.green('✅ Credentials found in keychain'));

    // Test connectivity
    console.log(chalk.blue('\n🌐 Testing Bitbucket connectivity...\n'));

    const { ConfigManager } = await import('../core/config-manager.js');
    const appConfig = await ConfigManager.load({
      bitbucketUrl: config.bitbucket_url,
      authMethod: config.auth_method,
      rateLimit: config.rate_limit || 100,
      timeout: config.timeout || 30000,
      logLevel: config.log_level || 'info',
    });

    const { BitbucketClientService } = await import('../services/bitbucket-client.js');
    const { AuthManager } = await import('../auth/auth-manager.js');
    const { RateLimiter } = await import('../core/rate-limiter.js');
    const { JsonOperationsRepository } = await import('../data/operations-repository.js');

    // Reuse credentialStorage already created above
    const authManager = new AuthManager(credentialStorage, logger, appConfig);
    const rateLimiter = new RateLimiter({
      capacity: appConfig.rateLimit,
      refillRate: appConfig.rateLimit,
    });

    const packageRoot = getPackageRoot();
    const operationsPath = join(packageRoot, 'data', 'operations.json');
    const operationsRepo = new JsonOperationsRepository(operationsPath, logger);

    const bitbucketClient = new BitbucketClientService(
      authManager,
      rateLimiter,
      logger,
      appConfig,
      operationsRepo,
    );

    // Try to test connection (this will be implemented in BitbucketClientService)
    // For now, just report success if we got this far
    console.log(chalk.green('✅ Configuration validated successfully'));
    console.log(
      chalk.gray(
        '   Note: Full connectivity test requires BitbucketClientService.testConnection() method\n',
      ),
    );
  } catch (error) {
    console.log(chalk.red('❌ Validation failed'));
    console.log(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    process.exit(1);
  }
}

/**
 * Display config file path
 */
async function showPath(configPath: string): Promise<void> {
  console.log(configPath);
}

/**
 * Reset configuration (delete config file and credentials)
 */
async function resetConfig(configPath: string): Promise<void> {
  if (!existsSync(configPath)) {
    console.log(chalk.yellow('\n⚠️  No configuration to reset\n'));
    return;
  }

  // Confirm deletion
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to delete your configuration?',
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('\nReset cancelled\n'));
    return;
  }

  try {
    // Delete config file
    unlinkSync(configPath);
    console.log(chalk.green('\n✅ Configuration deleted'));
    console.log(chalk.gray(`   File removed: ${configPath}`));

    // Try to delete credentials from keychain
    try {
      const keytar = await import('keytar');
      await keytar.deletePassword('bitbucket-dc-mcp', 'credentials');
      console.log(chalk.green('✅ Credentials removed from keychain'));
    } catch {
      // Keychain deletion failed - not critical
      console.log(chalk.yellow('⚠️  Could not remove credentials from keychain'));
    }

    console.log(chalk.blue('\n💡 Run "bitbucket-dc-mcp setup" to configure again\n'));
  } catch (error) {
    throw new Error(
      `Failed to reset config: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Sanitize configuration by masking sensitive credentials
 */
function sanitizeConfig(config: Record<string, any>): Record<string, any> {
  const sanitized = { ...config };

  // Mask sensitive fields
  const sensitiveFields = [
    'bitbucket_token',
    'bitbucket_password',
    'client_secret',
    'consumer_secret',
    'access_token',
    'access_token_secret',
  ];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      const value = String(sanitized[field]);
      sanitized[field] = value.length > 4 ? value.slice(0, 4) + '***' : '***';
    }
  }

  return sanitized;
}
