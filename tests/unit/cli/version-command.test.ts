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
 * Unit tests for version command
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { versionCommand } from '../../../src/cli/version-command.js';

describe('versionCommand', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('without checkUpdates option', () => {
    it('should display current version from package.json', async () => {
      await versionCommand({});

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('bitbucket-dc-mcp v'));
    });
  });

  describe('with checkUpdates option', () => {
    it('should check npm registry and show when up to date', async () => {
      // Mock successful npm registry response with same version
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.1.0' }),
      } as Response);

      await versionCommand({ checkUpdates: true });

      expect(fetchSpy).toHaveBeenCalledWith('https://registry.npmjs.org/bitbucket-dc-mcp/latest');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Current version'));
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('You are using the latest version'),
      );
    });

    it('should show update available when newer version exists', async () => {
      // Mock npm registry with newer version
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '99.0.0' }),
      } as Response);

      await versionCommand({ checkUpdates: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Update available: v99.0.0'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('npm update -g bitbucket-dc-mcp'),
      );
    });

    it('should show development version when current is newer', async () => {
      // Mock npm registry with older version
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.0.1' }),
      } as Response);

      await versionCommand({ checkUpdates: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('You are using a development version'),
      );
    });

    it('should handle npm registry unavailable (non-ok response)', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
      } as Response);

      await versionCommand({ checkUpdates: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unable to check for updates (npm registry unavailable)'),
      );
    });

    it('should handle network errors gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network timeout'));

      await versionCommand({ checkUpdates: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unable to check for updates'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Network timeout'));
    });

    it('should handle non-Error exceptions', async () => {
      fetchSpy.mockRejectedValueOnce('String error');

      await versionCommand({ checkUpdates: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unable to check for updates'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });
  });
});
