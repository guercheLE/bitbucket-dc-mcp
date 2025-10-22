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

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import type { Logger as PinoLogger } from 'pino';
import { trace, type Tracer, type Span, SpanStatusCode, context } from '@opentelemetry/api';

/**
 * Tracing configuration
 */
export interface TracingConfig {
  /**
   * Whether to enable tracing
   */
  readonly enabled: boolean;

  /**
   * Service name for traces
   */
  readonly serviceName?: string;

  /**
   * Service version
   */
  readonly serviceVersion?: string;

  /**
   * Jaeger endpoint (default: http://localhost:14268/api/traces)
   */
  readonly jaegerEndpoint?: string;

  /**
   * Export to console (useful for development)
   */
  readonly consoleExporter?: boolean;

  /**
   * Sample rate (0.0 to 1.0, default: 1.0 = 100%)
   */
  readonly sampleRate?: number;
}

/**
 * OpenTelemetry Tracing Manager
 *
 * @remarks
 * Manages distributed tracing with OpenTelemetry.
 * Single Responsibility: Only responsible for tracing setup and lifecycle.
 *
 * Features:
 * - Automatic HTTP instrumentation
 * - Jaeger export
 * - Console export (development)
 * - Custom span creation
 * - Trace context propagation
 *
 * @example
 * ```typescript
 * const tracing = new Tracing(
 *   { enabled: true, serviceName: 'bitbucket-mcp' },
 *   logger
 * );
 *
 * await tracing.start();
 * // Tracing enabled, sending to Jaeger
 *
 * // Create custom span
 * const span = tracing.startSpan('my-operation');
 * try {
 *   // Do work
 * } finally {
 *   span.end();
 * }
 *
 * await tracing.stop();
 * ```
 */
export class Tracing {
  private provider: NodeTracerProvider | undefined;
  private tracer: Tracer | undefined;

  constructor(
    private readonly config: TracingConfig,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Start tracing
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info({ event: 'tracing.disabled' }, 'Tracing disabled');
      return;
    }

    try {
      // Create span processors
      const spanProcessors = [];

      // Add Jaeger exporter
      if (this.config.jaegerEndpoint !== 'disabled') {
        const jaegerExporter = new JaegerExporter({
          endpoint: this.config.jaegerEndpoint ?? 'http://localhost:14268/api/traces',
        });

        spanProcessors.push(new BatchSpanProcessor(jaegerExporter));

        this.logger.info(
          {
            event: 'tracing.jaeger_enabled',
            endpoint: this.config.jaegerEndpoint ?? 'http://localhost:14268/api/traces',
          },
          'Jaeger exporter enabled',
        );
      }

      // Add console exporter for development
      if (this.config.consoleExporter) {
        const consoleExporter = new ConsoleSpanExporter();
        spanProcessors.push(new BatchSpanProcessor(consoleExporter));

        this.logger.info(
          { event: 'tracing.console_enabled' },
          'Console exporter enabled (development)',
        );
      }

      // Create resource with service information
      const resource = resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: this.config.serviceName ?? 'bitbucket-dc-mcp',
        [SEMRESATTRS_SERVICE_VERSION]: this.config.serviceVersion ?? '1.0.0',
      });

      // Create tracer provider with span processors and resource
      this.provider = new NodeTracerProvider({
        resource,
        spanProcessors,
      });

      // Register the provider
      this.provider.register();

      // Get tracer instance
      this.tracer = trace.getTracer(
        this.config.serviceName ?? 'bitbucket-dc-mcp',
        this.config.serviceVersion ?? '1.0.0',
      );

      // Register HTTP instrumentation
      registerInstrumentations({
        instrumentations: [
          new HttpInstrumentation({
            ignoreIncomingRequestHook: (request) => {
              // Don't trace metrics endpoint
              return request.url?.includes('/metrics') ?? false;
            },
          }),
        ],
      });

      this.logger.info(
        {
          event: 'tracing.started',
          serviceName: this.config.serviceName ?? 'bitbucket-dc-mcp',
          jaegerEnabled: this.config.jaegerEndpoint !== 'disabled',
          consoleEnabled: this.config.consoleExporter ?? false,
        },
        'Distributed tracing started',
      );
    } catch (error) {
      this.logger.error(
        {
          event: 'tracing.start_error',
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to start tracing',
      );
      throw error;
    }
  }

  /**
   * Stop tracing
   */
  async stop(): Promise<void> {
    if (!this.config.enabled || !this.provider) {
      return;
    }

    try {
      await this.provider.shutdown();
      this.provider = undefined;
      this.tracer = undefined;

      this.logger.info({ event: 'tracing.stopped' }, 'Distributed tracing stopped');
    } catch (error) {
      this.logger.error(
        {
          event: 'tracing.stop_error',
          error: error instanceof Error ? error.message : String(error),
        },
        'Error stopping tracing',
      );
      throw error;
    }
  }

  /**
   * Create a new span
   *
   * @param name - Span name
   * @param attributes - Optional span attributes
   * @returns Span instance
   */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
    if (!this.tracer) {
      // Return noop span if tracing is disabled
      return trace.getTracer('noop').startSpan(name);
    }

    return this.tracer.startSpan(name, {
      attributes,
    });
  }

  /**
   * Start a span and execute function within its context
   *
   * @param name - Span name
   * @param fn - Function to execute
   * @param attributes - Optional span attributes
   * @returns Function result
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);

    try {
      // Execute function within span context
      return await context.with(trace.setSpan(context.active(), span), async () => {
        return await fn(span);
      });
    } catch (error) {
      // Record exception in span
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get current trace ID
   *
   * @returns Trace ID or undefined if no active span
   */
  getTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    if (span) {
      return span.spanContext().traceId;
    }
    return undefined;
  }

  /**
   * Get current span ID
   *
   * @returns Span ID or undefined if no active span
   */
  getSpanId(): string | undefined {
    const span = trace.getActiveSpan();
    if (span) {
      return span.spanContext().spanId;
    }
    return undefined;
  }

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.provider !== undefined;
  }
}

