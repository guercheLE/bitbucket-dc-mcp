/**
 * Copyright (c) 2025 Bitbucket Data Center MCP Server Contributors
 *
 * Example: HTTP Server with OpenTelemetry Traces
 *
 * This example demonstrates the complete observability stack:
 * - Structured logs with traceId and spanId
 * - Prometheus metrics
 * - Jaeger distributed tracing
 *
 * Usage:
 *   1. Start Jaeger: docker-compose -f docker-compose-jaeger.yml up -d
 *   2. Run this server: npx tsx examples/http-server-with-traces.ts
 *   3. Make requests: curl -X POST http://localhost:3000 ...
 *   4. View traces: http://localhost:16686 (Jaeger UI)
 *   5. View metrics: http://localhost:9090/metrics
 */

import { startHttpServer } from '../src/http/index.js';

async function main() {
  console.log('🚀 Starting HTTP MCP Server with FULL OBSERVABILITY...\n');
  console.log('📊 Logs + Metrics + Traces\n');

  const server = await startHttpServer({
    host: '0.0.0.0',
    port: 3000,
    cors: true,

    // Metrics configuration
    metrics: {
      enabled: true,
      port: 9090,
      host: '0.0.0.0',
    },

    // Tracing configuration
    tracing: {
      enabled: true,
      serviceName: 'bitbucket-dc-mcp',
      serviceVersion: '1.0.0',
      jaegerEndpoint: 'http://localhost:14268/api/traces',
      consoleExporter: false, // Set to true for debugging
    },
  });

  console.log('✅ Server started successfully!\n');
  console.log('📡 Main server:    http://0.0.0.0:3000');
  console.log('📊 Metrics:        http://0.0.0.0:9090/metrics');
  console.log('🔍 Jaeger UI:      http://localhost:16686\n');
  console.log('💡 All logs now include traceId and spanId!\n');
  console.log('📝 Log fields:');
  console.log('   - traceId: OpenTelemetry trace ID (correlates with Jaeger)');
  console.log('   - spanId: Current span ID');
  console.log('   - service: bitbucket-dc-mcp');
  console.log('   - version: 1.0.0\n');
  console.log('🧪 Try these commands:');
  console.log('   # Make a request');
  console.log('   curl -X POST http://localhost:3000 \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"method":"test"}\'');
  console.log('');
  console.log('   # Check metrics');
  console.log('   curl http://localhost:9090/metrics | grep -E "(traceId|spanId)"');
  console.log('');
  console.log('   # View traces in Jaeger UI');
  console.log('   open http://localhost:16686');
  console.log('\n⚠️  Press Ctrl+C to stop the server');

  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

