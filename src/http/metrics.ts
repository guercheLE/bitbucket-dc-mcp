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

import type { Logger as PinoLogger } from 'pino';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import type { Counter, Histogram, Meter } from '@opentelemetry/api';

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /**
   * Whether to enable metrics collection
   */
  readonly enabled: boolean;

  /**
   * Port for metrics endpoint (defaults to main port + 1)
   */
  readonly port?: number;

  /**
   * Host for metrics endpoint (defaults to main server host)
   */
  readonly host?: string;

  /**
   * Endpoint path for metrics (defaults to '/metrics')
   */
  readonly endpoint?: string;
}

/**
 * HTTP Metrics Manager
 *
 * @remarks
 * Manages OpenTelemetry metrics collection and Prometheus export.
 * Single Responsibility: Only responsible for metrics collection and exposure.
 *
 * Collected Metrics:
 * - http_requests_total: Total number of HTTP requests (by method, status, path)
 * - http_request_duration_seconds: HTTP request duration histogram
 * - http_request_size_bytes: HTTP request body size histogram
 * - http_response_size_bytes: HTTP response body size histogram
 * - http_active_requests: Current number of active requests
 * - mcp_operations_total: Total number of MCP operations (by method, status)
 * - mcp_operation_duration_seconds: MCP operation duration histogram
 *
 * @example
 * ```typescript
 * const metrics = new HttpMetrics(
 *   { enabled: true, port: 9090, host: '0.0.0.0' },
 *   logger
 * );
 *
 * await metrics.start();
 * // Prometheus metrics available at http://0.0.0.0:9090/metrics
 *
 * metrics.recordRequest('POST', '/mcp', 200, 123.45, 1024, 2048);
 *
 * await metrics.stop();
 * ```
 */
export class HttpMetrics {
  private exporter: PrometheusExporter | undefined;
  private meterProvider: MeterProvider | undefined;
  private meter: Meter | undefined;

  // HTTP metrics
  private httpRequestsTotal: Counter | undefined;
  private httpRequestDuration: Histogram | undefined;
  private httpRequestSize: Histogram | undefined;
  private httpResponseSize: Histogram | undefined;
  private httpActiveRequests: Counter | undefined;

  // MCP metrics
  private mcpOperationsTotal: Counter | undefined;
  private mcpOperationDuration: Histogram | undefined;

  // Auth metrics
  private authAttemptsTotal: Counter | undefined;
  private authFailuresTotal: Counter | undefined;

  constructor(
    private readonly config: MetricsConfig,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Start metrics collection and Prometheus exporter
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info({ event: 'metrics.disabled' }, 'Metrics collection disabled');
      return;
    }

    try {
      // Create Prometheus exporter
      this.exporter = new PrometheusExporter(
        {
          port: this.config.port,
          host: this.config.host,
          endpoint: this.config.endpoint ?? '/metrics',
        },
        () => {
          const metricsUrl = `http://${this.config.host ?? 'localhost'}:${this.config.port}${this.config.endpoint ?? '/metrics'}`;
          this.logger.info(
            {
              event: 'metrics.started',
              url: metricsUrl,
              port: this.config.port,
              host: this.config.host,
            },
            `Prometheus metrics endpoint started at ${metricsUrl}`,
          );
        },
      );

      // Create meter provider
      this.meterProvider = new MeterProvider({
        readers: [this.exporter],
      });

      // Get meter
      this.meter = this.meterProvider.getMeter('bitbucket-dc-mcp-http', '1.0.0');

      // Initialize HTTP metrics
      this.httpRequestsTotal = this.meter.createCounter('http_requests_total', {
        description: 'Total number of HTTP requests',
        unit: '1',
      });

      this.httpRequestDuration = this.meter.createHistogram('http_request_duration_seconds', {
        description: 'HTTP request duration in seconds',
        unit: 's',
      });

      this.httpRequestSize = this.meter.createHistogram('http_request_size_bytes', {
        description: 'HTTP request body size in bytes',
        unit: 'bytes',
      });

      this.httpResponseSize = this.meter.createHistogram('http_response_size_bytes', {
        description: 'HTTP response body size in bytes',
        unit: 'bytes',
      });

      this.httpActiveRequests = this.meter.createCounter('http_active_requests', {
        description: 'Current number of active HTTP requests',
        unit: '1',
      });

      // Initialize MCP metrics
      this.mcpOperationsTotal = this.meter.createCounter('mcp_operations_total', {
        description: 'Total number of MCP operations',
        unit: '1',
      });

      this.mcpOperationDuration = this.meter.createHistogram('mcp_operation_duration_seconds', {
        description: 'MCP operation duration in seconds',
        unit: 's',
      });

      // Initialize Auth metrics
      this.authAttemptsTotal = this.meter.createCounter('auth_attempts_total', {
        description: 'Total number of authentication attempts',
        unit: '1',
      });

      this.authFailuresTotal = this.meter.createCounter('auth_failures_total', {
        description: 'Total number of authentication failures',
        unit: '1',
      });

      this.logger.info({ event: 'metrics.initialized' }, 'Metrics collection initialized');
    } catch (error) {
      this.logger.error(
        {
          event: 'metrics.start_error',
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to start metrics collection',
      );
      throw error;
    }
  }

  /**
   * Stop metrics collection and Prometheus exporter
   */
  async stop(): Promise<void> {
    if (!this.config.enabled || !this.meterProvider) {
      return;
    }

    try {
      await this.meterProvider.shutdown();
      this.exporter = undefined;
      this.meterProvider = undefined;
      this.meter = undefined;

      this.logger.info({ event: 'metrics.stopped' }, 'Metrics collection stopped');
    } catch (error) {
      this.logger.error(
        {
          event: 'metrics.stop_error',
          error: error instanceof Error ? error.message : String(error),
        },
        'Error stopping metrics collection',
      );
      throw error;
    }
  }

  /**
   * Record an HTTP request
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param status - Response status code
   * @param duration - Request duration in milliseconds
   * @param requestSize - Request body size in bytes
   * @param responseSize - Response body size in bytes
   */
  recordRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
    requestSize: number,
    responseSize: number,
  ): void {
    if (!this.config.enabled || !this.meter) {
      return;
    }

    const attributes = {
      method,
      path,
      status: status.toString(),
    };

    this.httpRequestsTotal?.add(1, attributes);
    this.httpRequestDuration?.record(duration / 1000, attributes); // Convert to seconds
    this.httpRequestSize?.record(requestSize, attributes);
    this.httpResponseSize?.record(responseSize, attributes);
  }

  /**
   * Record an MCP operation
   *
   * @param method - MCP method name
   * @param status - Operation status (success/error)
   * @param duration - Operation duration in milliseconds
   */
  recordMcpOperation(method: string, status: 'success' | 'error', duration: number): void {
    if (!this.config.enabled || !this.meter) {
      return;
    }

    const attributes = {
      method,
      status,
    };

    this.mcpOperationsTotal?.add(1, attributes);
    this.mcpOperationDuration?.record(duration / 1000, attributes); // Convert to seconds
  }

  /**
   * Record authentication attempt
   *
   * @param method - Auth method (basic, pat, localhost)
   * @param success - Whether authentication was successful
   */
  recordAuthAttempt(method: string, success: boolean): void {
    if (!this.config.enabled || !this.meter) {
      return;
    }

    const attributes = { method };

    this.authAttemptsTotal?.add(1, attributes);
    if (!success) {
      this.authFailuresTotal?.add(1, attributes);
    }
  }

  /**
   * Increment active requests counter
   */
  incrementActiveRequests(): void {
    if (!this.config.enabled || !this.meter) {
      return;
    }

    this.httpActiveRequests?.add(1);
  }

  /**
   * Decrement active requests counter
   */
  decrementActiveRequests(): void {
    if (!this.config.enabled || !this.meter) {
      return;
    }

    this.httpActiveRequests?.add(-1);
  }
}
