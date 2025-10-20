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
 * Interactive Setup Wizard for Bitbucket MCP Server
 *
 * This wizard guides users through initial configuration in <5 minutes:
 * - Bitbucket URL validation and connectivity test
 * - Authentication method selection
 * - Credential collection and validation
 * - Optional settings configuration
 * - Config file and secure credential storage
 *
 * Usage: npm run setup (or bitbucket-dc-mcp setup after global install)
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import chalk from 'chalk';
import * as fs from 'fs/promises';
import inquirer from 'inquirer';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import type { Logger as PinoLogger } from 'pino';
import type { AuthMethod } from '../core/config-manager.js';
import { CredentialStorage } from '../core/credential-storage.js';
import { Logger } from '../core/logger.js';

/**
 * Wizard state that accumulates user input across steps
 */
interface WizardState {
  bitbucketUrl: string;
  apiVersion: 'latest' | '1.0';
  authMethod: AuthMethod;
  credentials: {
    // OAuth2
    clientId?: string;
    clientSecret?: string;
    callbackPort?: number;
    // PAT
    token?: string;
    // Basic Auth
    username?: string;
    password?: string;
    // OAuth1
    consumerKey?: string;
    consumerSecret?: string;
    privateKeyPath?: string;
  };
  settings: {
    rateLimit: number;
    timeout: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    cacheSize: number;
    retryAttempts: number;
  };
}

/**
 * Config file structure for ~/.bitbucket-dc-mcp/config.yml
 */
interface ConfigFile {
  bitbucket_url: string;
  auth_method: AuthMethod;
  api_version: 'latest' | '1.0';
  rate_limit: number;
  timeout: number;
  log_level: string;
  cache_size: number;
  retry_attempts: number;
  force_file_storage?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.bitbucket-dc-mcp');
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'config.yml');
const TEMP_CONFIG_PATH = path.join(CONFIG_DIR, '.setup-temp.json');

/**
 * Main entry point for setup wizard
 */
export async function runSetupWizard(): Promise<string> {
  Logger.configure({ level: 'info', pretty: true });
  const logger = Logger.getInstance();

  try {
    // Display welcome screen
    displayWelcome();

    // Check for partial setup to resume
    const resumeState = await checkForPartialSetup(logger);
    let state: Partial<WizardState>;

    if (resumeState) {
      const { resume } = await inquirer.prompt<{ resume: boolean }>([
        {
          type: 'confirm',
          name: 'resume',
          message: 'Found incomplete setup. Would you like to resume?',
          default: true,
        },
      ]);

      if (resume) {
        state = resumeState;
        console.log(chalk.green('✓ Resuming previous setup\n'));
      } else {
        await cleanupPartialSetup();
        state = {};
      }
    } else {
      state = {};
    }

    // Run wizard steps
    if (!state.bitbucketUrl) {
      const { url, apiVersion } = await promptBitbucketUrl(logger);
      state.bitbucketUrl = url;
      state.apiVersion = apiVersion;
      await savePartialSetup(state);
    }

    if (!state.authMethod) {
      state.authMethod = await promptAuthMethod();
      await savePartialSetup(state);
    }

    if (!state.credentials) {
      state.credentials = await collectCredentials(state.authMethod!);
      await savePartialSetup(state);
    }

    // Test authentication
    await testAuthentication(state as WizardState, logger);

    // Optional settings
    state.settings = await promptOptionalSettings();

    // Save configuration
    await saveConfiguration(state as WizardState, logger);

    // Display completion screen
    await displayCompletion(state as WizardState);

    // Cleanup temp files
    await cleanupPartialSetup();

    logger.info('Setup wizard completed successfully');

    // Return the config file path
    return CONFIG_FILE_PATH;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_WIZARD_INTERRUPTED') {
      console.log(chalk.yellow('\n\n⚠️  Setup interrupted. Run again to resume.'));
      process.exit(0);
    }

    logger.error({ error }, 'Setup wizard failed');
    console.error(chalk.red(`\n✗ Setup failed: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * Display welcome screen with project info and estimated time
 */
function displayWelcome(): void {
  console.clear();
  console.log(chalk.cyan.bold('\n╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║                                                           ║'));
  console.log(chalk.cyan.bold('║      Bitbucket Data Center MCP Server Setup Wizard        ║'));
  console.log(chalk.cyan.bold('║                                                           ║'));
  console.log(chalk.cyan.bold('╚═══════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.white('Welcome! This wizard will help you configure the Bitbucket MCP Server.\n'));

  console.log(chalk.white.bold('What this tool does:'));
  console.log(
    chalk.white('  • Enables AI assistants (Claude, GPT) to interact with your Bitbucket instance'),
  );
  console.log(chalk.white('  • Provides semantic search across Bitbucket operations'));
  console.log(chalk.white('  • Executes Bitbucket API operations via natural language\n'));

  console.log(chalk.white.bold('What will be configured:'));
  console.log(chalk.white('  • Bitbucket Data Center URL and connectivity'));
  console.log(chalk.white('  • Authentication method and credentials'));
  console.log(chalk.white('  • Optional performance and logging settings\n'));

  console.log(chalk.white.bold('Estimated time:'), chalk.green('< 5 minutes\n'));

  console.log(chalk.gray('─'.repeat(60) + '\n'));
}

/**
 * Prompt for Bitbucket URL with validation and connectivity test
 * @returns Object containing normalized URL and detected API version
 */
async function promptBitbucketUrl(logger: PinoLogger): Promise<{ url: string; apiVersion: 'latest' | '1.0' }> {
  const { bitbucketUrl } = await inquirer.prompt<{ bitbucketUrl: string }>([
    {
      type: 'input',
      name: 'bitbucketUrl',
      message: 'Enter your Bitbucket Data Center URL:',
      default: 'https://bitbucket.example.com',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'URL cannot be empty';
        }

        // Validate URL format
        try {
          const url = new URL(input);
          if (!['http:', 'https:'].includes(url.protocol)) {
            return 'URL must start with http:// or https://';
          }
        } catch {
          return 'Invalid URL format. Example: https://bitbucket.example.com';
        }

        return true;
      },
    },
  ]);

  // Normalize URL - remove trailing slashes and /rest/api paths if present
  let normalizedUrl = bitbucketUrl.trim().replace(/\/+$/, '');
  normalizedUrl = normalizedUrl.replace(/\/rest\/api\/[0-9]+$/, '');

  // Test connectivity and detect API version
  console.log(chalk.gray('\nTesting connection...'));
  try {
    // For Bitbucket Data Center, use /rest/api/latest/application-properties
    const response = await fetch(`${normalizedUrl}/rest/api/latest/application-properties`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const detectedApiVersion = 'latest' as const;

    if (response.ok) {
      const serverInfo = (await response.json()) as { version?: string; displayName?: string };
      console.log(
        chalk.green(
          `✓ Connection successful to ${serverInfo.displayName || 'Bitbucket'} ${serverInfo.version || 'Data Center'}\n`,
        ),
      );
      logger.info(
        {
          bitbucketUrl: normalizedUrl,
          version: serverInfo.version,
          apiVersion: detectedApiVersion,
        },
        'Bitbucket connectivity test passed',
      );
      return { url: normalizedUrl, apiVersion: detectedApiVersion };
    } else {
      console.log(
        chalk.yellow(
          `⚠️  Server responded with status ${response.status}. Defaulting to API latest...\n`,
        ),
      );
      return { url: normalizedUrl, apiVersion: 'latest' };
    }
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.log(chalk.yellow(`⚠️  Could not reach server: ${errorMsg}`));
    console.log(
      chalk.gray('   This might be due to network issues or authentication requirements.\n'),
    );

    const { continueAnyway } = await inquirer.prompt<{ continueAnyway: boolean }>([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Continue with this URL anyway?',
        default: true,
      },
    ]);

    if (!continueAnyway) {
      throw new Error('Setup cancelled by user');
    }

    return { url: normalizedUrl, apiVersion: 'latest' };
  }
}

/**
 * Prompt for authentication method selection
 */
async function promptAuthMethod(): Promise<AuthMethod> {
  console.log(chalk.white.bold('Select authentication method:\n'));

  const { authMethod } = await inquirer.prompt<{ authMethod: AuthMethod }>([
    {
      type: 'list',
      name: 'authMethod',
      message: 'Which authentication method would you like to use?',
      choices: [
        {
          name: 'Personal Access Token (Recommended) - Simple and secure',
          value: 'pat',
          short: 'PAT',
        },
        {
          name: 'OAuth 2.0 (Recommended) - Enterprise SSO support',
          value: 'oauth2',
          short: 'OAuth 2.0',
        },
        {
          name: 'Basic Auth (Development Only) - Username/Password',
          value: 'basic',
          short: 'Basic Auth',
        },
        {
          name: 'OAuth 1.0a (Legacy) - Deprecated, use OAuth 2.0 instead',
          value: 'oauth1',
          short: 'OAuth 1.0a',
        },
      ],
    },
  ]);

  console.log('');
  return authMethod;
}

/**
 * Collect credentials based on selected auth method
 */
async function collectCredentials(authMethod: AuthMethod): Promise<WizardState['credentials']> {
  switch (authMethod) {
    case 'pat':
      return await collectPATCredentials();
    case 'oauth2':
      return await collectOAuth2Credentials();
    case 'basic':
      return await collectBasicAuthCredentials();
    case 'oauth1':
      return await collectOAuth1Credentials();
    default:
      throw new Error(`Unsupported auth method: ${authMethod}`);
  }
}

/**
 * Collect Personal Access Token credentials
 */
async function collectPATCredentials(): Promise<WizardState['credentials']> {
  console.log(chalk.cyan('ℹ️  Personal Access Token Setup'));
  console.log(
    chalk.gray('   Generate PAT in Bitbucket: Profile → Personal Access Tokens → Create token\n'),
  );

  const { token } = await inquirer.prompt<{ token: string }>([
    {
      type: 'password',
      name: 'token',
      message: 'Enter your Personal Access Token:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Token cannot be empty';
        }
        return true;
      },
    },
  ]);

  console.log('');
  return { token };
}

/**
 * Collect OAuth2 credentials
 */
async function collectOAuth2Credentials(): Promise<WizardState['credentials']> {
  console.log(chalk.cyan('ℹ️  OAuth 2.0 Setup'));
  console.log(chalk.gray('   You will be redirected to Bitbucket to authorize the application\n'));

  const answers = await inquirer.prompt<{
    clientId: string;
    clientSecret: string;
    callbackPort: number;
  }>([
    {
      type: 'input',
      name: 'clientId',
      message: 'Enter OAuth 2.0 Client ID:',
      validate: (input: string) => (input.trim().length > 0 ? true : 'Client ID cannot be empty'),
    },
    {
      type: 'password',
      name: 'clientSecret',
      message: 'Enter OAuth 2.0 Client Secret:',
      mask: '*',
      validate: (input: string) =>
        input.trim().length > 0 ? true : 'Client Secret cannot be empty',
    },
    {
      type: 'input',
      name: 'callbackPort',
      message: 'OAuth callback port:',
      default: '8080',
      validate: (input: string) => {
        const port = Number.parseInt(input, 10);
        if (!Number.isFinite(port) || port < 1024 || port > 65535) {
          return 'Port must be between 1024 and 65535';
        }
        return true;
      },
      filter: (input: string) => Number.parseInt(input, 10),
    },
  ] as any);

  console.log('');
  return answers;
}

/**
 * Collect Basic Auth credentials
 */
async function collectBasicAuthCredentials(): Promise<WizardState['credentials']> {
  console.log(chalk.yellow('⚠️  Basic Auth Security Warning'));
  console.log(
    chalk.gray(
      '   Basic Auth transmits credentials with every request. Use HTTPS in production!\n',
    ),
  );

  const answers = await inquirer.prompt<{ username: string; password: string }>([
    {
      type: 'input',
      name: 'username',
      message: 'Enter Bitbucket username:',
      validate: (input: string) => (input.trim().length > 0 ? true : 'Username cannot be empty'),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter Bitbucket password:',
      mask: '*',
      validate: (input: string) => (input.trim().length > 0 ? true : 'Password cannot be empty'),
    },
  ]);

  console.log('');
  return answers;
}

/**
 * Collect OAuth1 credentials
 */
async function collectOAuth1Credentials(): Promise<WizardState['credentials']> {
  console.log(chalk.yellow('⚠️  OAuth 1.0a is Deprecated'));
  console.log(chalk.gray('   Consider upgrading to OAuth 2.0 for better security and support\n'));

  const answers = await inquirer.prompt<{
    consumerKey: string;
    consumerSecret: string;
    privateKeyPath: string;
  }>([
    {
      type: 'input',
      name: 'consumerKey',
      message: 'Enter OAuth 1.0a Consumer Key:',
      validate: (input: string) =>
        input.trim().length > 0 ? true : 'Consumer Key cannot be empty',
    },
    {
      type: 'password',
      name: 'consumerSecret',
      message: 'Enter OAuth 1.0a Consumer Secret:',
      mask: '*',
      validate: (input: string) =>
        input.trim().length > 0 ? true : 'Consumer Secret cannot be empty',
    },
    {
      type: 'input',
      name: 'privateKeyPath',
      message: 'Enter path to private key file (optional):',
      default: '',
    },
  ]);

  console.log('');
  return answers;
}

/**
 * Test authentication by attempting to connect to Bitbucket
 */
async function testAuthentication(state: WizardState, logger: PinoLogger): Promise<void> {
  console.log(chalk.gray('Testing authentication...'));

  try {
    // Construct credentials for auth manager
    const credentials: any = {
      bitbucket_url: state.bitbucketUrl,
      auth_method: state.authMethod,
    };

    switch (state.authMethod) {
      case 'pat':
        credentials.access_token = state.credentials.token;
        break;
      case 'basic':
        credentials.username = state.credentials.username;
        credentials.password = state.credentials.password;
        break;
      case 'oauth2':
        // For OAuth2, we would initiate the flow here
        // For now, we'll skip actual testing and just validate inputs
        console.log(
          chalk.yellow(
            '⚠️  OAuth 2.0 requires browser authentication. Skipping connection test.\n',
          ),
        );
        return;
      case 'oauth1':
        // For OAuth1, similar to OAuth2
        console.log(
          chalk.yellow('⚠️  OAuth 1.0a requires additional setup. Skipping connection test.\n'),
        );
        return;
    }

    // Test connection using /rest/api/myself endpoint with detected API version
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (state.authMethod === 'pat') {
      headers.Authorization = `Bearer ${state.credentials.token}`;
    } else if (state.authMethod === 'basic') {
      const basicAuth = Buffer.from(
        `${state.credentials.username}:${state.credentials.password}`,
      ).toString('base64');
      headers.Authorization = `Basic ${basicAuth}`;
    }

    // Use the profile endpoint for Bitbucket Data Center
    const response = await fetch(`${state.bitbucketUrl}/rest/api/latest/profile/recent/repos?limit=1`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      // For Bitbucket Data Center, we can't get user info from this endpoint,
      // but a successful response means authentication worked
      console.log(
        chalk.green(
          `✓ Authentication successful\n`,
        ),
      );
      logger.info({}, 'Authentication test successful');
    } else {
      const errorText = await response.text();
      console.log(chalk.red(`✗ Authentication failed: ${response.status} ${response.statusText}`));
      console.log(chalk.gray(`   ${errorText}\n`));

      const troubleshooting = getTroubleshootingHint(response.status);
      if (troubleshooting) {
        console.log(chalk.yellow(`💡 ${troubleshooting}\n`));
      }

      const { retry } = await inquirer.prompt<{ retry: boolean }>([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to re-enter credentials?',
          default: true,
        },
      ]);

      if (retry) {
        state.credentials = await collectCredentials(state.authMethod);
        return await testAuthentication(state, logger);
      } else {
        throw new Error('Authentication failed');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Authentication test failed');
    throw error;
  }
}

/**
 * Get troubleshooting hint based on HTTP status code
 */
function getTroubleshootingHint(status: number): string | null {
  switch (status) {
    case 401:
      return 'Invalid credentials. Check your token/username/password.';
    case 403:
      return 'Insufficient permissions. Ensure your account has API access.';
    case 404:
      return 'Endpoint not found. Verify your Bitbucket URL is correct.';
    default:
      return null;
  }
}

/**
 * Prompt for optional settings with smart defaults
 */
async function promptOptionalSettings(): Promise<WizardState['settings']> {
  const { configureOptional } = await inquirer.prompt<{ configureOptional: boolean }>([
    {
      type: 'confirm',
      name: 'configureOptional',
      message: 'Configure optional settings? (most users can skip)',
      default: false,
    },
  ]);

  if (!configureOptional) {
    console.log(chalk.gray('Using default settings\n'));
    return {
      rateLimit: 100,
      timeout: 30000,
      logLevel: 'info',
      cacheSize: 1000,
      retryAttempts: 3,
    };
  }

  console.log('');
  const answers = await inquirer.prompt<WizardState['settings']>([
    {
      type: 'input',
      name: 'rateLimit',
      message: 'API rate limit (requests per minute):',
      default: '100',
      validate: (input: string) => {
        const num = Number.parseInt(input, 10);
        return num > 0 ? true : 'Must be a positive number';
      },
      filter: (input: string) => Number.parseInt(input, 10),
    },
    {
      type: 'input',
      name: 'timeout',
      message: 'Request timeout (milliseconds):',
      default: '30000',
      validate: (input: string) => {
        const num = Number.parseInt(input, 10);
        return num > 0 ? true : 'Must be a positive number';
      },
      filter: (input: string) => Number.parseInt(input, 10),
    },
    {
      type: 'list',
      name: 'logLevel',
      message: 'Log level:',
      choices: ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },
    {
      type: 'input',
      name: 'cacheSize',
      message: 'Cache size (number of entries):',
      default: '1000',
      validate: (input: string) => {
        const num = Number.parseInt(input, 10);
        return num >= 0 ? true : 'Must be a non-negative number';
      },
      filter: (input: string) => Number.parseInt(input, 10),
    },
    {
      type: 'input',
      name: 'retryAttempts',
      message: 'Retry attempts on failure:',
      default: '3',
      validate: (input: string) => {
        const num = Number.parseInt(input, 10);
        return num >= 0 ? true : 'Must be a non-negative number';
      },
      filter: (input: string) => Number.parseInt(input, 10),
    },
  ] as any);

  console.log('');
  return answers;
}

/**
 * Save configuration to file and credentials to keychain
 */
async function saveConfiguration(state: WizardState, logger: PinoLogger): Promise<void> {
  console.log(chalk.gray('Saving configuration...'));

  try {
    // Create config directory if it doesn't exist
    await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });

    // Create config file
    const config: ConfigFile = {
      bitbucket_url: state.bitbucketUrl,
      auth_method: state.authMethod,
      api_version: state.apiVersion,
      rate_limit: state.settings.rateLimit,
      timeout: state.settings.timeout,
      log_level: state.settings.logLevel,
      cache_size: state.settings.cacheSize,
      retry_attempts: state.settings.retryAttempts,
    };

    const yamlContent = yaml.dump(config, { indent: 2, lineWidth: 120 });
    await fs.writeFile(CONFIG_FILE_PATH, yamlContent, { mode: 0o600 });

    console.log(chalk.green(`✓ Config saved to ${CONFIG_FILE_PATH}`));
    logger.info({ configPath: CONFIG_FILE_PATH }, 'Configuration file created');

    // Save credentials to keychain
    const forceFileStorage = config.force_file_storage || false;
    const credentialStorage = new CredentialStorage(logger, undefined, forceFileStorage);
    const credentials: any = {
      bitbucket_url: state.bitbucketUrl,
      auth_method: state.authMethod,
    };

    switch (state.authMethod) {
      case 'pat':
        credentials.access_token = state.credentials.token;
        break;
      case 'basic':
        credentials.username = state.credentials.username;
        credentials.password = state.credentials.password;
        credentials.access_token = Buffer.from(
          `${state.credentials.username}:${state.credentials.password}`,
        ).toString('base64');
        break;
      case 'oauth2':
        credentials.client_id = state.credentials.clientId;
        credentials.client_secret = state.credentials.clientSecret;
        credentials.callback_port = state.credentials.callbackPort;
        // Note: Actual OAuth2 tokens will be obtained during first use
        credentials.access_token = 'pending_oauth2_flow';
        break;
      case 'oauth1':
        credentials.consumer_key = state.credentials.consumerKey;
        credentials.consumer_secret = state.credentials.consumerSecret;
        credentials.private_key_path = state.credentials.privateKeyPath;
        // Note: Actual OAuth1 tokens will be obtained during first use
        credentials.access_token = 'pending_oauth1_flow';
        break;
    }

    await credentialStorage.save(state.bitbucketUrl, credentials);
    console.log(chalk.green('✓ Credentials saved securely to OS keychain\n'));
    logger.info('Credentials saved to keychain');
  } catch (error) {
    logger.error({ error }, 'Failed to save configuration');
    throw new Error(`Failed to save configuration: ${(error as Error).message}`);
  }
}

/**
 * Display completion screen with next steps
 */
async function displayCompletion(state: WizardState): Promise<void> {
  console.log(chalk.green.bold('✓ Setup complete!\n'));

  console.log(chalk.white.bold('Configuration Summary:'));
  console.log(chalk.white(`  Bitbucket URL:       ${state.bitbucketUrl}`));
  console.log(chalk.white(`  Auth Method:    ${state.authMethod.toUpperCase()}`));
  console.log(chalk.white(`  API Version:    ${state.apiVersion}`));
  console.log(chalk.white(`  Config File:    ${CONFIG_FILE_PATH}`));
  console.log(chalk.white(`  Log Level:      ${state.settings.logLevel}\n`));

  console.log(chalk.white.bold('Next Steps:'));
  console.log(chalk.white('  1. Start the MCP server:  npm start'));
  console.log(chalk.white('  2. Configure Claude Desktop to connect to this server'));
  console.log(
    chalk.white(
      '  3. Try asking Claude: "Search for repositories in a project" or "Create a new repository"\n',
    ),
  );

  const { testNow } = await inquirer.prompt<{ testNow: boolean }>([
    {
      type: 'confirm',
      name: 'testNow',
      message: 'Would you like to test the connection now?',
      default: false,
    },
  ]);

  if (testNow) {
    console.log('');
    // Import and run the test connection command
    const { testConnectionCommand } = await import('./test-connection-command.js');
    await testConnectionCommand({ config: CONFIG_FILE_PATH });
  } else {
    console.log(
      chalk.gray('\nYou can test the search functionality using: npm run search "your query"\n'),
    );
  }
}

/**
 * Check for partial setup to resume
 */
async function checkForPartialSetup(logger: PinoLogger): Promise<Partial<WizardState> | null> {
  try {
    const tempData = await fs.readFile(TEMP_CONFIG_PATH, 'utf-8');
    const state = JSON.parse(tempData) as Partial<WizardState>;
    logger.info('Found partial setup state');
    return state;
  } catch {
    return null;
  }
}

/**
 * Save partial setup state for resume capability
 */
async function savePartialSetup(state: Partial<WizardState>): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
    await fs.writeFile(TEMP_CONFIG_PATH, JSON.stringify(state, null, 2), { mode: 0o600 });
  } catch {
    // Ignore errors during partial save
  }
}

/**
 * Cleanup partial setup state
 */
async function cleanupPartialSetup(): Promise<void> {
  try {
    await fs.unlink(TEMP_CONFIG_PATH);
  } catch {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Setup SIGINT handler for graceful interruption
 */
function setupInterruptHandler(): void {
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nSetup interrupted.'));

    const { exitNow } = await inquirer.prompt<{ exitNow: boolean }>([
      {
        type: 'confirm',
        name: 'exitNow',
        message: 'Are you sure you want to exit?',
        default: false,
      },
    ]);

    if (exitNow) {
      console.log(chalk.gray('Setup saved. Run again to resume.\n'));
      const error = new Error('Setup interrupted by user') as NodeJS.ErrnoException;
      error.code = 'ERR_WIZARD_INTERRUPTED';
      throw error;
    }
  });
}

// Run wizard if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupInterruptHandler();
  runSetupWizard().catch((error) => {
    console.error(chalk.red(`\nSetup failed: ${error.message}`));
    process.exit(1);
  });
}
