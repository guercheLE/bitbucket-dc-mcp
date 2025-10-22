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
 * Example: HTTP Server with OpenTelemetry Metrics
 *
 * This example demonstrates how to start the HTTP MCP server with
 * OpenTelemetry metrics enabled. Metrics are exposed in Prometheus format
 * on a separate endpoint.
 *
 * Usage:
 *   npx tsx examples/http-server-with-metrics.ts
 *
 * Then access:
 *   - Main server: http://localhost:3000
 *   - Metrics: http://localhost:9090/metrics
 */

import { startHttpServer } from '../src/http/index.js';

async function main() {
  console.log('🚀 Starting HTTP MCP Server with OpenTelemetry Metrics...\n');

  const server = await startHttpServer({
    // Main server configuration
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    maxBodySize: 1024 * 1024, // 1MB
    timeout: 30000, // 30s

    // Metrics configuration
    metrics: {
      enabled: true,
      port: 9090,
      host: '0.0.0.0',
      endpoint: '/metrics',
    },
  });

  console.log('✅ Server started successfully!\n');
  console.log('📡 Main server:  http://0.0.0.0:3000');
  console.log('📊 Metrics:      http://0.0.0.0:9090/metrics\n');
  console.log('📝 Available metrics:');
  console.log('   - http_requests_total');
  console.log('   - http_request_duration_seconds');
  console.log('   - http_request_size_bytes');
  console.log('   - http_response_size_bytes');
  console.log('   - http_active_requests');
  console.log('   - mcp_operations_total');
  console.log('   - mcp_operation_duration_seconds');
  console.log('   - auth_attempts_total');
  console.log('   - auth_failures_total\n');
  console.log('💡 Try these commands:');
  console.log('   curl http://localhost:9090/metrics');
  console.log('   curl -X POST http://localhost:3000 -H "Content-Type: application/json" -d \'{"method":"test"}\'');
  console.log('\n⚠️  Press Ctrl+C to stop the server');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});

