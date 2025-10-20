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
 * Unit tests for CLI entry point routing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

describe('CLI Entry Point', () => {
  it('should display help when --help flag is used', async () => {
    const { stdout } = await execAsync('node dist/cli.js --help');

    expect(stdout).toContain('Bitbucket DataCenter MCP Server');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('setup');
    expect(stdout).toContain('search');
    expect(stdout).toContain('call');
    expect(stdout).toContain('config');
    expect(stdout).toContain('version');
  });

  it('should display version when --version flag is used', async () => {
    const { stdout } = await execAsync('node dist/cli.js --version');

    expect(stdout).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should show examples in help output', async () => {
    const { stdout } = await execAsync('node dist/cli.js --help');

    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('bitbucket-dc-mcp setup');
    expect(stdout).toContain('bitbucket-dc-mcp search');
    expect(stdout).toContain('bitbucket-dc-mcp call');
  });
});

describe('CLI Version Command', () => {
  it('should display current version', async () => {
    const { stdout } = await execAsync('node dist/cli.js version');

    expect(stdout).toContain('bitbucket-dc-mcp');
    expect(stdout).toMatch(/v\d+\.\d+\.\d+/);
  });
});

describe('CLI Config Path Command', () => {
  it('should display config file path', async () => {
    const { stdout } = await execAsync('node dist/cli.js config path');

    // Use platform-agnostic regex (matches both Unix / and Windows \)
    expect(stdout).toMatch(/\.bitbucket-dc-mcp[/\\]config\.yml/);
  });
});
