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
 * Version Command Handler
 * Displays version information and checks for updates
 */

/* eslint-disable no-console */

import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

interface VersionOptions {
  checkUpdates?: boolean;
}

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/bitbucket-dc-mcp/latest';

/**
 * Execute version command
 */
export async function versionCommand(options: VersionOptions): Promise<void> {
  // Get current version from package.json
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packagePath = join(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const currentVersion = packageJson.version;

  if (options.checkUpdates) {
    await checkForUpdates(currentVersion);
  } else {
    console.log(chalk.cyan(`bitbucket-dc-mcp v${currentVersion}`));
  }
}

/**
 * Check for available updates from npm registry
 */
async function checkForUpdates(currentVersion: string): Promise<void> {
  console.log(chalk.blue(`Current version: v${currentVersion}`));
  console.log(chalk.gray('Checking for updates...\n'));

  try {
    const response = await fetch(NPM_REGISTRY_URL);

    if (!response.ok) {
      console.log(chalk.yellow('⚠️  Unable to check for updates (npm registry unavailable)'));
      return;
    }

    const data = (await response.json()) as { version: string };
    const latestVersion = data.version;
    if (latestVersion === currentVersion) {
      console.log(chalk.green('✅ You are using the latest version'));
    } else if (isNewerVersion(latestVersion, currentVersion)) {
      console.log(chalk.yellow(`📦 Update available: v${latestVersion}`));
      console.log(chalk.cyan('\nTo upgrade, run:'));
      console.log(chalk.bold('  npm update -g bitbucket-dc-mcp\n'));
    } else {
      console.log(chalk.green('✅ You are using a development version'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Unable to check for updates'));
    console.log(chalk.gray(`   ${error instanceof Error ? error.message : 'Network error'}`));
  }
}

/**
 * Compare version strings (simple semver comparison)
 */
function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.replace(/^v/, '').split('.').map(Number);
  const currentParts = current.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const latestPart = latestParts[i] || 0;
    const currentPart = currentParts[i] || 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}
