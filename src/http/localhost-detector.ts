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

import type { ILocalhostDetector } from './types.js';

/**
 * Localhost Detection Implementation
 *
 * @remarks
 * Determines if a server host binding is localhost-only or network-accessible.
 * Single Responsibility: Only responsible for localhost detection logic.
 *
 * @example
 * ```typescript
 * const detector = new LocalhostDetector();
 * detector.isLocalhostOnly('127.0.0.1'); // true
 * detector.isLocalhostOnly('localhost'); // true
 * detector.isLocalhostOnly('0.0.0.0'); // false
 * detector.isLocalhostOnly('192.168.1.100'); // false
 * ```
 */
export class LocalhostDetector implements ILocalhostDetector {
  private readonly localhostPatterns = [
    '127.0.0.1',
    'localhost',
    '::1', // IPv6 localhost
    '::ffff:127.0.0.1', // IPv4-mapped IPv6 localhost
  ];

  /**
   * Check if the given host binding is localhost-only
   *
   * @param host - Host address to check (e.g., '127.0.0.1', 'localhost', '0.0.0.0')
   * @returns true if localhost-only, false if network-accessible
   *
   * @remarks
   * Localhost-only hosts include:
   * - 127.0.0.1 (IPv4 loopback)
   * - localhost (resolved to loopback)
   * - ::1 (IPv6 loopback)
   * - ::ffff:127.0.0.1 (IPv4-mapped IPv6 loopback)
   *
   * Network-accessible hosts include:
   * - 0.0.0.0 (all interfaces)
   * - Specific IP addresses (e.g., 192.168.1.100)
   */
  isLocalhostOnly(host: string): boolean {
    const normalized = host.toLowerCase().trim();
    return this.localhostPatterns.some((pattern) => normalized === pattern.toLowerCase());
  }
}

