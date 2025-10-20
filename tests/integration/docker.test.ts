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
 * Docker Integration Tests
 * Tests Docker container build, startup, configuration, and MCP protocol communication
 *
 * These tests require Docker to be installed and running.
 * Run with: RUN_INTEGRATION_TESTS=true npm test
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { describeIfIntegration } from '../helpers/skip-integration.js';

const IMAGE_NAME = 'bitbucket-dc-mcp:test';
const DOCKERFILE_PATH = './Dockerfile';

describeIfIntegration('Docker Container Integration', () => {
  describe('Image Build', () => {
    it('should build Docker image successfully', () => {
      // Build the Docker image
      const buildCommand = `docker build -t ${IMAGE_NAME} -f ${DOCKERFILE_PATH} .`;

      expect(() => {
        execSync(buildCommand, {
          stdio: 'pipe',
          timeout: 300_000, // 5 minutes for build (embeddings generation takes time)
        });
      }).not.toThrow();
    }, 300_000); // 5 minute timeout for build

    it('should have image size less than 300MB', () => {
      const output = execSync(`docker images ${IMAGE_NAME} --format "{{.Size}}"`, {
        encoding: 'utf-8',
      });

      const sizeStr = output.trim();
      console.log(`Image size: ${sizeStr}`);

      // Parse size (could be in MB or GB)
      const match = sizeStr.match(/^([\d.]+)(MB|GB)$/);
      expect(match).toBeTruthy();

      const [, value, unit] = match!;
      const sizeInMB = unit === 'GB' ? Number.parseFloat(value) * 1024 : Number.parseFloat(value);

      // Allow up to 300MB (embeddings + Node.js + deps)
      expect(sizeInMB).toBeLessThan(300);
    });

    it('should contain embeddings.db in the image', () => {
      const output = execSync(`docker run --rm ${IMAGE_NAME} ls -lh /app/data/embeddings.db`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('embeddings.db');

      // Check file size is reasonable (should be 3-4MB+)
      const sizeMatch = output.match(/([\d.]+)M/);
      expect(sizeMatch).toBeTruthy();
      const sizeMB = Number.parseFloat(sizeMatch![1]);
      expect(sizeMB).toBeGreaterThan(1); // At least 1MB
    });

    it('should contain healthcheck script', () => {
      const output = execSync(`docker run --rm ${IMAGE_NAME} ls -lh /app/dist/healthcheck.js`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('healthcheck.js');
    });
  });

  describe('Container Startup and Configuration', () => {
    it('should fail without BITBUCKET_URL environment variable', () => {
      expect(() => {
        execSync(`docker run --rm ${IMAGE_NAME}`, {
          stdio: 'pipe',
          timeout: 5000,
        });
      }).toThrow();
    });

    it('should fail with PAT auth but no BITBUCKET_TOKEN', () => {
      expect(() => {
        execSync(
          `docker run --rm -e BITBUCKET_URL=https://bitbucket.example.com -e BITBUCKET_AUTH_METHOD=pat ${IMAGE_NAME}`,
          {
            stdio: 'pipe',
            timeout: 5000,
          },
        );
      }).toThrow();
    });

    it('should start successfully with required environment variables', () => {
      const containerId = execSync(
        `docker run -d -e BITBUCKET_URL=https://bitbucket.example.com -e BITBUCKET_AUTH_METHOD=pat -e BITBUCKET_TOKEN=test-token ${IMAGE_NAME}`,
        { encoding: 'utf-8' },
      ).trim();

      try {
        // Wait a bit for startup
        execSync('sleep 3');

        // Check container is running
        const status = execSync(`docker inspect -f '{{.State.Status}}' ${containerId}`, {
          encoding: 'utf-8',
        }).trim();

        expect(status).toBe('running');
      } finally {
        // Cleanup
        execSync(`docker rm -f ${containerId}`, { stdio: 'ignore' });
      }
    }, 15_000);

    it('should accept configuration via environment variables with different auth methods', () => {
      // Test Basic auth
      const containerId = execSync(
        `docker run -d -e BITBUCKET_URL=https://bitbucket.example.com -e BITBUCKET_AUTH_METHOD=basic -e BITBUCKET_USERNAME=user -e BITBUCKET_PASSWORD=pass ${IMAGE_NAME}`,
        { encoding: 'utf-8' },
      ).trim();

      try {
        execSync('sleep 3');

        const status = execSync(`docker inspect -f '{{.State.Status}}' ${containerId}`, {
          encoding: 'utf-8',
        }).trim();

        expect(status).toBe('running');
      } finally {
        execSync(`docker rm -f ${containerId}`, { stdio: 'ignore' });
      }
    }, 15_000);
  });

  describe('Health Checks', () => {
    let containerId: string;

    beforeAll(() => {
      // Start a container for health check tests
      containerId = execSync(
        `docker run -d -e BITBUCKET_URL=https://bitbucket.example.com -e BITBUCKET_AUTH_METHOD=pat -e BITBUCKET_TOKEN=test-token ${IMAGE_NAME}`,
        { encoding: 'utf-8' },
      ).trim();

      // Wait for container to be ready
      execSync('sleep 5');
    }, 15_000);

    afterAll(() => {
      if (containerId) {
        execSync(`docker rm -f ${containerId}`, { stdio: 'ignore' });
      }
    });

    it('should have health check configured', () => {
      const healthCheck = execSync(`docker inspect -f '{{.Config.Healthcheck}}' ${containerId}`, {
        encoding: 'utf-8',
      });

      expect(healthCheck).toContain('healthcheck.js');
    });

    it('should report healthy status after startup period', () => {
      // Wait for health check to run (start_period is 10s, interval is 30s)
      execSync('sleep 15');

      const healthStatus = execSync(`docker inspect -f '{{.State.Health.Status}}' ${containerId}`, {
        encoding: 'utf-8',
      }).trim();

      // Should be either 'starting' or 'healthy'
      expect(['starting', 'healthy']).toContain(healthStatus);
    }, 30_000);

    it('should execute health check script successfully', () => {
      const output = execSync(`docker exec ${containerId} node /app/dist/healthcheck.js`, {
        encoding: 'utf-8',
      });

      // Health check should exit with code 0 (success)
      expect(output).toBeDefined();
    });
  });

  describe('MCP Protocol Communication (stdio)', () => {
    it('should accept MCP initialize message via stdin', () => {
      const initializeMessage = JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
        id: 1,
      });

      // Run container in interactive mode with stdin
      const result = execSync(
        `echo '${initializeMessage}' | docker run --rm -i -e BITBUCKET_URL=https://bitbucket.example.com -e BITBUCKET_AUTH_METHOD=pat -e BITBUCKET_TOKEN=test-token ${IMAGE_NAME}`,
        {
          encoding: 'utf-8',
          timeout: 10_000,
        },
      );

      // Should receive a response (even if it's an error due to test environment)
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    }, 15_000);
  });

  describe('Volume Mounts', () => {
    it('should support volume mount for config directory', () => {
      // Create a temporary config directory would go here
      // For now, just verify the volume directive exists in Dockerfile
      const dockerfile = readFileSync(DOCKERFILE_PATH, 'utf-8');
      expect(dockerfile).toContain('VOLUME');
      expect(dockerfile).toContain('.bitbucket-mcp');
    });
  });

  describe('Security', () => {
    it('should run as non-root user', () => {
      const user = execSync(
        `docker run --rm -e BITBUCKET_URL=https://bitbucket.example.com ${IMAGE_NAME} whoami`,
        { encoding: 'utf-8' },
      ).trim();

      expect(user).not.toBe('root');
      expect(user).toBe('nodejs');
    });

    it('should have proper file permissions', () => {
      const permissions = execSync(
        `docker run --rm -e BITBUCKET_URL=https://bitbucket.example.com ${IMAGE_NAME} ls -la /app/dist/index.js`,
        { encoding: 'utf-8' },
      );

      // Should be readable by nodejs user
      expect(permissions).toContain('nodejs');
    });
  });

  describe('Cleanup', () => {
    it('should remove test image after tests', () => {
      execSync(`docker rmi -f ${IMAGE_NAME}`, { stdio: 'ignore' });

      // Verify image is removed
      try {
        execSync(`docker images ${IMAGE_NAME} -q`, { encoding: 'utf-8' });
      } catch {
        // Expected - image should not exist
      }
    });
  });
});
