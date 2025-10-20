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
 * Docker health check script
 * Validates that the MCP server process is running and responsive
 */

/* eslint-disable no-console */
// Console output is intentional for health check - this runs as standalone script

import { execSync } from 'node:child_process';
import process from 'node:process';

const TIMEOUT_MS = 3_000;

async function healthCheck(): Promise<void> {
  try {
    // Check if the Node.js process running index.js is alive
    const processCheck = execSync('pgrep -f "node.*index.js"', {
      encoding: 'utf-8',
      timeout: TIMEOUT_MS,
    });

    if (!processCheck || processCheck.trim() === '') {
      throw new Error('MCP server process not found');
    }

    // Additional check: verify embeddings database is accessible
    const fs = await import('node:fs/promises');
    await fs.access('/app/data/embeddings.db');

    // Health check passed
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Health check failed: ${message}`);
    process.exit(1);
  }
}

// Set timeout for health check execution
const timeoutId = setTimeout(() => {
  console.error('Health check timeout');
  process.exit(1);
}, TIMEOUT_MS);

healthCheck()
  .then(() => {
    clearTimeout(timeoutId);
  })
  .catch(() => {
    clearTimeout(timeoutId);
    process.exit(1);
  });
