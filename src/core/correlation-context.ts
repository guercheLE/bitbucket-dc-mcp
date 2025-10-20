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

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * Correlation context for request tracing
 */
export interface CorrelationContext {
  correlationId: string;
  service: string;
  version: string;
  toolName?: string;
  operationId?: string;
  startTime: number;
}

/**
 * AsyncLocalStorage for correlation context propagation
 */
const correlationContextStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Generate a unique correlation ID using crypto.randomUUID()
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Create a correlation context with optional tool and operation info
 */
export function createCorrelationContext(
  service: string,
  version: string,
  toolName?: string,
  operationId?: string,
): CorrelationContext {
  return {
    correlationId: generateCorrelationId(),
    service,
    version,
    toolName,
    operationId,
    startTime: Date.now(),
  };
}

/**
 * Run a function with correlation context
 */
export async function runWithCorrelationContext<T>(
  context: CorrelationContext,
  fn: () => Promise<T>,
): Promise<T> {
  return correlationContextStorage.run(context, fn);
}

/**
 * Run a synchronous function with correlation context
 */
export function runSyncWithCorrelationContext<T>(context: CorrelationContext, fn: () => T): T {
  return correlationContextStorage.run(context, fn);
}

/**
 * Get the current correlation context (if any)
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationContextStorage.getStore();
}

/**
 * Get the current correlation ID or return a default
 */
export function getCorrelationId(): string {
  const context = getCorrelationContext();
  return context?.correlationId ?? 'no-correlation-id';
}

/**
 * Calculate elapsed time since context was created
 */
export function getElapsedTime(): number {
  const context = getCorrelationContext();
  if (!context) {
    return 0;
  }
  return Date.now() - context.startTime;
}
