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
 * Setup Command Handler
 * Wraps the setup wizard from Story 4.1 for CLI usage
 */

/* eslint-disable no-console */

import { runSetupWizard } from './setup-wizard.js';

interface SetupOptions {
  force?: boolean;
  nonInteractive?: boolean;
  config?: string;
}

/**
 * Execute setup command
 */
export async function setupCommand(options: SetupOptions): Promise<void> {
  console.log('🚀 Bitbucket MCP Setup Wizard\n');

  if (options.force) {
    console.log('⚠️  Force mode: existing configuration will be overwritten\n');
  }

  if (options.nonInteractive) {
    console.log('Running in non-interactive mode (using environment variables)...\n');
  }

  try {
    // Run the setup wizard
    const configPath = await runSetupWizard();

    console.log('\n✅ Setup complete!');
    console.log(`📁 Config saved to: ${configPath}`);
    console.log('\nNext steps:');
    console.log('  1. Run "bitbucket-dc-mcp search \'create issue\'" to test search');
    console.log('  2. Run "bitbucket-dc-mcp config show" to view your configuration');
    console.log('  3. Add to Claude Desktop config to use as MCP server\n');
  } catch (error) {
    throw new Error(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
