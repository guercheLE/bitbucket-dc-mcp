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

/**
 * Pre-install validation script
 * Validates Node.js version and platform before installation
 */

const MIN_NODE_VERSION = 22;

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

if (majorVersion < MIN_NODE_VERSION) {
    console.error(`Error: Node.js ${MIN_NODE_VERSION}+ required. You have ${nodeVersion}.`);
    console.error('Please upgrade Node.js: https://nodejs.org/');
    process.exit(1);
}

// Check platform
const platform = process.platform;
const supportedPlatforms = ['linux', 'darwin', 'win32'];

if (!supportedPlatforms.includes(platform)) {
    console.error(`Error: Platform '${platform}' is not supported.`);
    console.error('This package requires Linux, macOS, or Windows.');
    process.exit(1);
}

// All checks passed
console.log(`✓ Node.js ${nodeVersion} on ${platform} - installation requirements met`);
