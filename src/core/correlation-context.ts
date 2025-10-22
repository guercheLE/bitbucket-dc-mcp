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
import { trace } from '@opentelemetry/api';

/**
 * Correlation context for request tracing
 *
 * @remarks
 * Now integrated with OpenTelemetry tracing.
 * The correlationId is the OpenTelemetry trace ID when available,
 * falling back to a UUID when tracing is disabled.
 */
export interface CorrelationContext {
  /**
   * Correlation ID (OpenTelemetry trace ID or UUID)
   * @deprecated Use traceId instead
   */
  correlationId: string;

  /**
   * Trace ID (same as correlationId for backward compatibility)
   */
  traceId: string;

  /**
   * Span ID from OpenTelemetry (when available)
   */
  spanId?: string;

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
 * Generate a unique correlation ID
 *
 * @remarks
 * Uses OpenTelemetry trace ID if available, otherwise generates a UUID.
 * This ensures correlation between traces and logs.
 */
export function generateCorrelationId(): string {
  // Try to get trace ID from OpenTelemetry
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().traceId;
  }

  // Fallback to UUID if no active span
  return randomUUID();
}

/**
 * Get current span ID from OpenTelemetry
 */
function getSpanId(): string | undefined {
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().spanId;
  }
  return undefined;
}

/**
 * Create a correlation context with optional tool and operation info
 *
 * @remarks
 * Automatically captures OpenTelemetry trace ID and span ID when available.
 */
export function createCorrelationContext(
  service: string,
  version: string,
  toolName?: string,
  operationId?: string,
): CorrelationContext {
  const traceId = generateCorrelationId();
  const spanId = getSpanId();

  return {
    // Backward compatibility
    correlationId: traceId,
    // New field names
    traceId,
    spanId,
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
 *
 * @deprecated Use getTraceId() instead
 */
export function getCorrelationId(): string {
  return getTraceId();
}

/**
 * Get the current trace ID
 *
 * @remarks
 * Returns the OpenTelemetry trace ID when available,
 * or the correlation ID from context, or a default value.
 */
export function getTraceId(): string {
  // Try to get from OpenTelemetry first
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().traceId;
  }

  // Fallback to context
  const context = getCorrelationContext();
  return context?.traceId ?? context?.correlationId ?? 'no-trace-id';
}

/**
 * Get the current span ID
 */
export function getSpanIdFromContext(): string | undefined {
  // Try to get from OpenTelemetry first
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().spanId;
  }

  // Fallback to context
  const context = getCorrelationContext();
  return context?.spanId;
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
