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

        // Check if OAuth2 flow has not been completed
        if (config.auth_method === 'oauth2' && credentials.access_token === 'pending_oauth2_flow') {
          console.log(chalk.yellow('\n⚠️  OAuth 2.0 authentication not completed'));
          console.log(
            chalk.gray(
              '   The OAuth 2.0 flow was not completed during setup. The access token is pending.',
            ),
          );
          console.log(chalk.yellow('\n💡 Next steps:'));
          console.log(
            chalk.gray(
              '   1. Run "bitbucket-dc-mcp setup --force" and complete the OAuth flow when prompted',
            ),
          );
          console.log(
            chalk.gray(
              '   2. Or start the MCP server and it will initiate OAuth on first API request',
            ),
          );
          console.log(chalk.gray('   3. See docs/authentication.md#oauth-20-setup for details\n'));
          process.exit(1);
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
        console.log(chalk.gray('   Use the MCP server to verify OAuth 1.0a authentication\n'));

        // Display helpful information about OAuth 1.0a credentials
        console.log(chalk.cyan('📋 OAuth 1.0a Configuration Summary:\n'));
        console.log(chalk.white('Configured credentials:'));
        console.log(chalk.gray(`   • Consumer Key: ${credentials.consumer_key || 'Not set'}`));
        console.log(
          chalk.gray(
            `   • Consumer Secret: ${credentials.consumer_secret ? '******' : 'Not set (RSA-SHA1)'}`,
          ),
        );
        console.log(
          chalk.gray(`   • Private Key Path: ${credentials.private_key_path || 'Not set'}`),
        );
        console.log(
          chalk.gray(
            `   • Access Token: ${credentials.access_token === 'pending_oauth1_flow' ? 'Pending first use' : credentials.access_token ? 'Set' : 'Not set'}`,
          ),
        );

        if (!credentials.consumer_key || !credentials.private_key_path) {
          console.log(
            chalk.yellow('\n⚠️  Credenciais OAuth 1.0a parecem inválidas ou incompletas\n'),
          );

          console.log(chalk.white.bold('Como obter credenciais corretas:\n'));

          console.log(chalk.cyan('1. Gerar chaves RSA:'));
          console.log(
            chalk.gray('   openssl genrsa -out ~/.bitbucket-dc-mcp/bitbucket_privatekey.pem 2048'),
          );
          console.log(
            chalk.gray(
              '   openssl rsa -in ~/.bitbucket-dc-mcp/bitbucket_privatekey.pem -pubout -out ~/.bitbucket-dc-mcp/bitbucket_publickey.pem\n',
            ),
          );

          console.log(chalk.cyan('2. Configurar no Bitbucket Data Center:'));
          console.log(chalk.gray('   • Administração → Add-ons → Application Links'));
          console.log(chalk.gray('   • Create link → URL: http://localhost:8080'));
          console.log(chalk.gray('   • Application Name: Bitbucket MCP Server'));
          console.log(chalk.gray('   • ✅ Marque "Create incoming link"'));
          console.log(
            chalk.gray('   • Consumer Key: escolha um ID único (ex: bitbucket-mcp-server)'),
          );
          console.log(chalk.gray('   • Public Key: cole conteúdo de bitbucket_publickey.pem'));
          console.log(chalk.gray('   • Consumer Secret: deixe vazio para RSA-SHA1'));
          console.log(chalk.gray('   • Save\n'));

          console.log(chalk.cyan('3. Reconfigurar MCP Server:'));
          console.log(chalk.gray('   bitbucket-dc-mcp setup --force\n'));

          console.log(chalk.cyan('📖 Guia detalhado passo a passo:'));
          console.log(chalk.blue.underline('   docs/oauth1-datacenter-setup.md'));
          console.log(
            chalk.gray(
              '   https://github.com/your-repo/blob/main/docs/oauth1-datacenter-setup.md\n',
            ),
          );

          console.log(
            chalk.yellow(
              '💡 Dica: Consumer Key e Consumer Secret NÃO são a mesma coisa que Access Token!',
            ),
          );
          console.log(
            chalk.gray(
              '   • Consumer Key: identificador que VOCÊ escolhe ao criar Application Link',
            ),
          );
          console.log(chalk.gray('   • Consumer Secret: opcional para RSA-SHA1 (deixe vazio)'));
          console.log(
            chalk.gray('   • Access Token: obtido automaticamente após autorizar no navegador\n'),
          );

          console.log(chalk.yellow('🔄 Alternativas mais simples:'));
          console.log(
            chalk.gray('   • Bitbucket 7.0+: Use Personal Access Token (PAT) - setup em 3 minutos'),
          );
          console.log(chalk.gray('   • Bitbucket 7.0+: Use OAuth 2.0 - mais moderno e seguro'));
          console.log(chalk.gray('   Veja: docs/authentication.md\n'));
        } else {
          console.log(chalk.green('\n✅ OAuth 1.0a configuration looks valid'));
          console.log(chalk.cyan('\n💡 Para testar autenticação OAuth 1.0a:'));
          console.log(chalk.gray('   1. Start the MCP server: npm start'));
          console.log(chalk.gray('   2. The server will initiate OAuth flow on first API request'));
          console.log(chalk.gray('   3. You will be redirected to Bitbucket to authorize'));
          console.log(
            chalk.gray('   4. After authorization, access token will be obtained automatically\n'),
          );
        }

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
