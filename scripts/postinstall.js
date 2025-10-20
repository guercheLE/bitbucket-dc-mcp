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
 * Post-install welcome message
 * Displays setup instructions after successful installation
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✓ bitbucket-dc-mcp installed successfully!                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Next steps:

  1. Run setup wizard to configure your Bitbucket connection:
     $ bitbucket-dc-mcp setup

  2. Test semantic search:
     $ bitbucket-dc-mcp search "create issue"

  3. View your configuration:
     $ bitbucket-dc-mcp config show

  4. Get help:
     $ bitbucket-dc-mcp --help

Documentation:
  https://github.com/guercheLE/bitbucket-dc-mcp#readme

Questions or issues?
  https://github.com/guercheLE/bitbucket-dc-mcp/issues

`);
