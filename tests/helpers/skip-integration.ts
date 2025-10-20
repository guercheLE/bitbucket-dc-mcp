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

import { describe, it } from 'vitest';

/**
 * Check if integration tests should run.
 * Integration tests require external services (Bitbucket DC, Docker, etc.)
 * Set RUN_INTEGRATION_TESTS=true to enable them.
 */
export function shouldRunIntegrationTests(): boolean {
  return process.env.RUN_INTEGRATION_TESTS === 'true';
}

/**
 * Check if E2E tests should run.
 * E2E tests require a configured Bitbucket DC instance.
 * Set RUN_E2E_TESTS=true to enable them.
 */
export function shouldRunE2ETests(): boolean {
  return process.env.RUN_E2E_TESTS === 'true' || process.env.E2E_USE_REAL_BITBUCKET === 'true';
}

/**
 * Conditionally run describe block based on environment variable.
 * Usage: describeIfIntegration('My Tests', () => { ... })
 */
export const describeIfIntegration = shouldRunIntegrationTests() ? describe : describe.skip;

/**
 * Conditionally run describe block for E2E tests.
 * Usage: describeIfE2E('My E2E Tests', () => { ... })
 */
export const describeIfE2E = shouldRunE2ETests() ? describe : describe.skip;

/**
 * Conditionally run test based on integration environment.
 * Usage: itIfIntegration('should work', () => { ... })
 */
export const itIfIntegration = shouldRunIntegrationTests() ? it : it.skip;

/**
 * Conditionally run test for E2E.
 * Usage: itIfE2E('should work', () => { ... })
 */
export const itIfE2E = shouldRunE2ETests() ? it : it.skip;
