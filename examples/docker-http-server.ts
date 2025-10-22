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
 * Example: HTTP Server with Docker
 *
 * This example demonstrates how to start the HTTP MCP server with
 * Docker for web applications and API integrations.
 *
 * Usage:
 *   npx tsx examples/docker-http-server.ts
 *
 * Then access:
 *   - Main server: http://localhost:3000
 *   - Metrics: http://localhost:9090/metrics
 */

import { startHttpServer } from '../src/http/index.js';

async function main() {
  console.log('🚀 Starting HTTP MCP Server with Docker...\n');

  const server = await startHttpServer({
    // Main server configuration
    host: '0.0.0.0', // Important: Use 0.0.0.0 for Docker
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
  console.log('🐳 Docker commands:');
  console.log('   # Build the image:');
  console.log('   docker build -t bitbucket-dc-mcp:latest .');
  console.log('');
  console.log('   # Run HTTP mode:');
  console.log('   docker run -d \\');
  console.log('     --name bitbucket-mcp-http \\');
  console.log('     -p 3000:3000 \\');
  console.log('     -p 9090:9090 \\');
  console.log('     -e BITBUCKET_URL=https://bitbucket.example.com \\');
  console.log('     -e BITBUCKET_TOKEN=your-token \\');
  console.log('     bitbucket-dc-mcp:latest \\');
  console.log('     node /app/dist/cli.js http --host 0.0.0.0 --port 3000 --cors');
  console.log('');
  console.log('   # Test the server:');
  console.log('   curl -X POST http://localhost:3000 \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}\'');
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
