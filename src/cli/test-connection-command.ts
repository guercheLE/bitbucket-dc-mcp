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
 * Test Connection Command Handler
 * Tests Bitbucket connectivity and authentication without requiring full MCP server startup
 */

/* eslint-disable no-console */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface TestConnectionOptions {
  config?: string;
  debug?: boolean;
}

/**
 * Test connection to Bitbucket Data Center instance
 *
 * Validates:
 * 1. Configuration file exists and is valid
 * 2. Credentials are stored in keychain
 * 3. Network connectivity to Bitbucket URL
 * 4. Authentication with Bitbucket (calls /rest/api/latest/profile/recent/repos)
 * 5. Displays authenticated user information
 */
export async function testConnectionCommand(options: TestConnectionOptions): Promise<void> {
  const configPath = options.config || join(homedir(), '.bitbucket-dc-mcp', 'config.yml');

  console.log(chalk.blue('\n🔍 Testing Bitbucket Data Center connection...\n'));

  // Step 1: Check config file exists
  if (!existsSync(configPath)) {
    console.log(chalk.red('❌ Configuration file not found'));
    console.log(chalk.gray(`   Expected: ${configPath}`));
    console.log(chalk.yellow('   Run "bitbucket-dc-mcp setup" to create configuration\n'));
    process.exit(1);
  }
  console.log(chalk.green('✅ Configuration file found'));

  try {
    // Step 2: Load and validate configuration
    const yaml = await import('js-yaml');
    const { readFileSync } = await import('fs');
    const yamlContent = readFileSync(configPath, 'utf-8');
    const rawConfig = yaml.load(yamlContent) as Record<string, unknown>;

    // Validate required fields
    const requiredFields = ['bitbucket_url', 'auth_method'];
    const missing = requiredFields.filter((field) => !rawConfig[field]);

    if (missing.length > 0) {
      console.log(chalk.red('❌ Configuration is invalid'));
      console.log(chalk.red('   Missing required fields:'));
      missing.forEach((field) => console.log(chalk.red(`   - ${field}`)));
      console.log('');
      process.exit(1);
    }

    // Type-safe config access
    const config = {
      bitbucket_url: rawConfig.bitbucket_url as string,
      auth_method: rawConfig.auth_method as string,
      api_version: (rawConfig.api_version as '1.0' | 'latest' | undefined) || 'latest', // Default to latest for Data Center
      timeout: (rawConfig.timeout as number | undefined) || 30000,
      force_file_storage: (rawConfig.force_file_storage as boolean | undefined) || false,
    };

    console.log(chalk.green('✅ Configuration is valid'));
    console.log(chalk.gray(`   URL: ${config.bitbucket_url}`));
    console.log(chalk.gray(`   Auth Method: ${config.auth_method}`));
    console.log(chalk.gray(`   API Version: ${config.api_version}`));

    // Step 3: Check credentials in keychain
    const { CredentialStorage } = await import('../core/credential-storage.js');
    const { Logger } = await import('../core/logger.js');
    const logger = Logger.getInstance();
    const credentialStorage = new CredentialStorage(logger, undefined, config.force_file_storage);

    const credentials = await credentialStorage.load(config.bitbucket_url);
    if (!credentials) {
      console.log(chalk.red('\n❌ Credentials not found in keychain'));
      console.log(chalk.yellow('   Run "bitbucket-dc-mcp setup" to configure credentials\n'));
      process.exit(1);
    }
    console.log(chalk.green('✅ Credentials found in keychain'));

    // Step 4: Test network connectivity and authentication
    console.log(chalk.blue('\n🌐 Testing network connectivity and authentication...'));

    // Use Bitbucket Data Center profile endpoint for auth test
    const testUrl = `${config.bitbucket_url}/rest/api/latest/profile/recent/repos?limit=1`;

    // Build auth headers based on auth method
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    switch (config.auth_method) {
      case 'pat':
      case 'basic':
      case 'oauth2':
        if (!credentials.access_token) {
          throw new Error(`${config.auth_method.toUpperCase()} token not found in credentials`);
        }
        // All auth methods use access_token field (PAT token, Basic Auth base64, OAuth2 access token)
        headers['Authorization'] =
          config.auth_method === 'basic'
            ? `Basic ${credentials.access_token}`
            : `Bearer ${credentials.access_token}`;
        break;
      case 'oauth1':
        // OAuth 1.0a requires complex signing - not supported in this simple test
        console.log(
          chalk.yellow('⚠️  OAuth 1.0a authentication testing not supported in test-connection'),
        );
        console.log(
          chalk.gray(
            '   OAuth 1.0a requires request signing which is handled by the full MCP server',
          ),
        );
        console.log(chalk.yellow('   Use the MCP server to verify OAuth 1.0a authentication\n'));
        process.exit(0);
        break;
      default:
        throw new Error(`Unsupported auth method: ${config.auth_method}`);
    }

    // Make test request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout || 30000);

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();

        // If we get a 404 with 'latest', try with '1.0'
        if (response.status === 404 && testUrl.includes('/rest/api/latest/')) {
          console.log(chalk.yellow(`   API latest not found, trying 1.0...`));

          const alternateUrl = `${config.bitbucket_url}/rest/api/1.0/profile/recent/repos?limit=1`;
          const alternateResponse = await fetch(alternateUrl, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });

          if (alternateResponse.ok) {
            console.log(chalk.green('\n✅ Connection successful!'));
            console.log(chalk.green('✅ Authentication verified (using API 1.0)\n'));

            console.log(chalk.yellow('💡 Recommendation:'));
            console.log(chalk.gray(`   Update your config file to use api_version: "1.0"`));
            console.log(chalk.gray(`   Or run: bitbucket-dc-mcp setup\n`));

            process.exit(0);
          }
        }

        console.log(chalk.red('\n❌ Authentication failed'));
        console.log(chalk.red(`   Status: ${response.status} ${response.statusText}`));

        if (options.debug) {
          console.log(chalk.gray(`   Response: ${errorBody}`));
        }

        // Provide helpful error messages
        if (response.status === 401) {
          console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
          console.log(chalk.gray('   • Verify your credentials are correct'));
          console.log(chalk.gray("   • For PAT: Check token hasn't expired"));
          console.log(chalk.gray('   • For Basic Auth: Verify username and password'));
          console.log(chalk.gray('   • For OAuth2: Token may have expired (run setup again)'));
          console.log(chalk.gray('   • See docs/troubleshooting.md#authentication-fails\n'));
        } else if (response.status === 403) {
          console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
          console.log(chalk.gray('   • Your credentials are valid but lack permissions'));
          console.log(chalk.gray('   • Check Bitbucket user has necessary project access'));
          console.log(chalk.gray('   • See docs/troubleshooting.md#authorization-error\n'));
        } else if (response.status === 404) {
          console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
          console.log(chalk.gray('   • Verify Bitbucket URL is correct'));
          console.log(
            chalk.gray(
              "   • Ensure you're connecting to Bitbucket Data Center (not Bitbucket Cloud)",
            ),
          );
          console.log(chalk.gray(`   • Check that /rest/api/latest is available on your instance`));
          console.log(
            chalk.gray('   • Try running: bitbucket-dc-mcp setup (to auto-detect API version)\n'),
          );
        }

        process.exit(1);
      }

      // Step 5: Display success message
      // The /profile/recent/repos endpoint doesn't return user info, so we just confirm auth worked
      console.log(chalk.green('\n✅ Connection successful!'));
      console.log(chalk.green('✅ Authentication verified\n'));

      console.log(chalk.green('🎉 Your Bitbucket MCP server is configured correctly!\n'));
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        console.log(chalk.red('\n❌ Connection timeout'));
        console.log(chalk.yellow('   Request took longer than configured timeout'));
        console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
        console.log(chalk.gray('   • Check your network connection'));
        console.log(chalk.gray('   • Verify Bitbucket URL is accessible'));
        console.log(chalk.gray('   • Increase timeout in config.yml if needed'));
        console.log(chalk.gray('   • Check firewall/proxy settings'));
        console.log(chalk.gray('   • See docs/troubleshooting.md#connection-timeout\n'));
      } else {
        console.log(chalk.red('\n❌ Connection failed'));
        console.log(chalk.red(`   ${error instanceof Error ? error.message : String(error)}`));
        console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
        console.log(chalk.gray('   • Verify Bitbucket URL is correct and accessible'));
        console.log(chalk.gray('   • Check network connectivity'));
        console.log(chalk.gray('   • Verify firewall/proxy settings'));
        console.log(chalk.gray('   • See docs/troubleshooting.md#connection-problems\n'));
      }

      process.exit(1);
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed'));
    console.log(chalk.red(`   ${error instanceof Error ? error.message : String(error)}`));

    if (options.debug && error instanceof Error && error.stack) {
      console.log(chalk.gray(`\n   Stack trace:\n${error.stack}`));
    }

    console.log('');
    process.exit(1);
  }
}
