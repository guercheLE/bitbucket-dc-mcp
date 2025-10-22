# Docker Deployment Guide

This guide explains how to deploy the Bitbucket Data Center MCP Server using Docker for easy, portable deployment across any Docker-compatible environment.

## Table of Contents

- [Quick Start](#quick-start)
- [Operation Modes](#operation-modes)
  - [stdio Mode (Default)](#stdio-mode-default)
  - [HTTP Mode](#http-mode)
- [Building the Image](#building-the-image)
- [Running the Container](#running-the-container)
- [Environment Variables](#environment-variables)
- [Volume Mounts](#volume-mounts)
- [Health Checks](#health-checks)
- [Docker Compose](#docker-compose)
- [Multi-Architecture Support](#multi-architecture-support)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Quick Start

### 1. Build the Docker Image

```bash
# Build the image (embeddings generated locally using @xenova/transformers)
docker build -t bitbucket-dc-mcp:latest .
```

### 2. Run the Container

```bash
docker run -d \
  --name bitbucket-mcp \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=your-personal-access-token \
  -e LOG_LEVEL=info \
  bitbucket-dc-mcp:latest
```

## Operation Modes

The Bitbucket DC MCP Server supports two operation modes:

| Mode | Use Case | Transport | Ports | Security |
|------|----------|-----------|-------|----------|
| **stdio** (default) | Claude Desktop, Cursor, MCP clients | stdin/stdout | None | File-based |
| **HTTP** | Web apps, APIs, integrations | HTTP POST | 3000+ | Header-based |

### stdio Mode (Default)

**⚠️ Important: stdio mode in Docker only works for internal container processes, NOT for external clients.**

**Use stdio mode when:**
- Running locally (not in Docker)
- Internal container processes only
- Local development with MCP clients
- Simple automation scripts
- No network access needed

**Example (internal use only):**
```bash
# ⚠️ This will NOT work for external clients (VS Code, Cursor, Claude Desktop)
docker run -it \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest
```

### HTTP Mode

**✅ HTTP mode is REQUIRED for external clients connecting to Docker containers.**

**Use HTTP mode when:**
- Running in Docker containers
- External clients (VS Code, Cursor, Claude Desktop) connecting to Docker
- Building web applications
- Creating REST APIs
- Need network access
- Want metrics and monitoring
- Cross-origin requests (CORS)

**Example:**
```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000
```

#### HTTP Mode Configuration

**Basic HTTP Server:**
```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000
```

**HTTP Server with CORS:**
```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000 --cors
```

**HTTP Server with Custom Port:**
```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 8080:8080 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 8080
```

**HTTP Server with Metrics:**
```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -p 9090:9090 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000 --cors
```

#### Testing HTTP Mode

**Test the HTTP server:**
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

**Test with authentication:**
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

### 3. Connect from Claude Desktop

Edit your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "bitbucket-mcp",
        "node",
        "/app/dist/index.js"
      ]
    }
  }
}
```

## Building the Image

### Standard Build

```bash
# Embeddings are generated locally during build using @xenova/transformers
docker build -t bitbucket-dc-mcp:latest .
```

### Build with Tag

```bash
docker build -t your-registry/bitbucket-dc-mcp:1.0.0 .
```

### Multi-Architecture Build

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/bitbucket-dc-mcp:latest \
  --push \
  .
```

## Running the Container

### Interactive Mode (stdio)

For direct MCP protocol communication via stdin/stdout:

```bash
docker run --rm -i \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest
```

### Background Mode (daemon)

For persistent server running in the background:

```bash
docker run -d \
  --name bitbucket-mcp \
  --restart unless-stopped \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest
```

### With Volume Mount

To use a configuration file instead of environment variables:

```bash
docker run -d \
  --name bitbucket-mcp \
  -v ~/.bitbucket-mcp:/root/.bitbucket-mcp \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  bitbucket-dc-mcp:latest
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BITBUCKET_URL` | Your Bitbucket Data Center URL | `https://bitbucket.example.com` |

### Authentication Variables

| Variable | Auth Method | Description | Example |
|----------|-------------|-------------|---------|
| `BITBUCKET_AUTH_METHOD` | All | Authentication method (`pat`, `basic`, `oauth1`, `oauth2`) | `pat` |
| `BITBUCKET_TOKEN` | PAT | Personal Access Token | `NjQyMDI0...` |
| `BITBUCKET_USERNAME` | Basic | Username for basic auth | `john.doe` |
| `BITBUCKET_PASSWORD` | Basic | Password for basic auth | `your-password` |

**Note:** OAuth1 and OAuth2 require configuration files mounted via volumes.

### Optional Variables

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) | `debug` |
| `LOG_PRETTY` | `false` | Pretty print logs (true/false) | `true` |
| `BITBUCKET_RATE_LIMIT` | `100` | Requests per minute | `150` |
| `BITBUCKET_TIMEOUT_MS` | `30000` | Request timeout in milliseconds | `60000` |
| `CACHE_SIZE` | `1000` | Cache size for responses | `2000` |
| `RETRY_ATTEMPTS` | `3` | Number of retry attempts | `5` |

### Configuration Priority

Environment variables take precedence over config files:

1. **Environment variables** (highest priority)
2. Config file from volume mount
3. Default values (lowest priority)

## Volume Mounts

### Config Directory Mount

Mount the `.bitbucket-mcp` directory to persist configuration:

```bash
docker run -d \
  --name bitbucket-mcp \
  -v ~/.bitbucket-mcp:/root/.bitbucket-mcp \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  bitbucket-dc-mcp:latest
```

### When to Use Volumes vs Environment Variables

**Use Environment Variables When:**
- Simple PAT or Basic authentication
- Ephemeral deployments (CI/CD, testing)
- Container orchestration (Kubernetes, ECS)

**Use Volume Mounts When:**
- OAuth1/OAuth2 authentication (requires config file)
- Shared configuration across multiple containers
- Persistent credential storage

### Example Config File

Create `~/.bitbucket-mcp/config.yml`:

```yaml
bitbucket_url: https://bitbucket.example.com
auth:
  method: pat
  token: your-personal-access-token
rate_limit: 100
timeout: 30000
log_level: info
```

## Health Checks

### Built-in Health Check

The Docker image includes a health check that runs every 30 seconds:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node /app/dist/healthcheck.js || exit 1
```

### Check Container Health

```bash
# View health status
docker inspect --format='{{.State.Health.Status}}' bitbucket-mcp

# View health check logs
docker inspect --format='{{json .State.Health}}' bitbucket-mcp | jq
```

**Health States:**
- `starting` - Container just started, health check not yet run
- `healthy` - All health checks passing
- `unhealthy` - Health check failing

### What the Health Check Validates

1. MCP server process is running (`node index.js`)
2. Embeddings database is accessible (`/app/data/embeddings.db`)

### Manual Health Check

```bash
docker exec bitbucket-mcp node /app/dist/healthcheck.js
echo $? # 0 = healthy, 1 = unhealthy
```

## Docker Compose

### Basic Usage

1. Create `.env` file:

```bash
BITBUCKET_URL=https://bitbucket.example.com
BITBUCKET_AUTH_METHOD=pat
BITBUCKET_TOKEN=your-token
LOG_LEVEL=info
```

2. Start the service:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f bitbucket-mcp

# Check health
docker-compose ps

# Stop
docker-compose down
```

### Production Deployment

```yaml
version: '3.8'
services:
  bitbucket-mcp:
    image: your-registry/bitbucket-dc-mcp:latest
    restart: always
    environment:
      BITBUCKET_URL: ${BITBUCKET_URL}
      BITBUCKET_AUTH_METHOD: ${BITBUCKET_AUTH_METHOD}
      BITBUCKET_TOKEN: ${BITBUCKET_TOKEN}
      LOG_LEVEL: info
      LOG_PRETTY: false
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.25'
          memory: 512M
    healthcheck:
      test: ["CMD", "node", "/app/dist/healthcheck.js"]
      interval: 30s
      timeout: 3s
      retries: 3
```

## Multi-Architecture Support

The Docker image supports multiple architectures:

- `linux/amd64` (Intel/AMD x86_64)
- `linux/arm64` (Apple Silicon M1/M2, ARM servers)

### Pull Pre-built Multi-Arch Image

```bash
# Docker automatically selects the correct architecture
docker pull your-registry/bitbucket-dc-mcp:latest

# Verify architecture
docker inspect your-registry/bitbucket-dc-mcp:latest | jq '.[0].Architecture'
```

### Build Multi-Arch Locally

```bash
# Setup buildx (one-time)
docker buildx create --use

# Build for multiple architectures (embeddings generated locally)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/bitbucket-dc-mcp:latest \
  --push \
  .
```

## Troubleshooting

### Container Fails to Start

**Symptom:** Container exits immediately after starting

```bash
# Check logs for error messages
docker logs bitbucket-mcp
```

**Common Causes:**

1. **Missing `BITBUCKET_URL`**
   ```
   ❌ ERROR: BITBUCKET_URL environment variable is required
   ```
   **Solution:** Add `-e BITBUCKET_URL=https://bitbucket.example.com`

2. **Missing credentials**
   ```
   ❌ ERROR: BITBUCKET_TOKEN required for PAT authentication
   ```
   **Solution:** Add `-e BITBUCKET_TOKEN=your-token`

3. **Invalid embeddings database**
   ```
   ❌ ERROR: embeddings.db not found at /app/data/embeddings.db
   ```
   **Solution:** Rebuild image (embeddings are generated automatically during build)

### Health Check Failing

**Symptom:** Container status shows `unhealthy`

```bash
# Check health check logs
docker inspect --format='{{json .State.Health}}' bitbucket-mcp | jq

# Run health check manually
docker exec bitbucket-mcp node /app/dist/healthcheck.js
```

**Common Causes:**

1. **MCP server crashed**
   - Check application logs: `docker logs bitbucket-mcp`
   - Look for uncaught exceptions or startup errors

2. **Embeddings database corrupted**
   - Verify file exists: `docker exec bitbucket-mcp ls -lh /app/data/embeddings.db`
   - Rebuild image if corrupted

### Network Connectivity Issues

**Symptom:** Cannot connect to Bitbucket from container

```bash
# Test network connectivity from inside container
docker exec bitbucket-mcp wget -O- https://bitbucket.example.com/status

# Check DNS resolution
docker exec bitbucket-mcp nslookup bitbucket.example.com
```

**Solutions:**

1. **Use custom DNS servers:**
   ```bash
   docker run --dns 8.8.8.8 --dns 8.8.4.4 ...
   ```

2. **Check firewall rules** - Ensure container can reach Bitbucket URL

3. **Use host network mode** (less secure):
   ```bash
   docker run --network host ...
   ```

### MCP Protocol Communication Issues

**Symptom:** Claude Desktop cannot connect to MCP server

```bash
# Test stdio communication manually
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | \
  docker exec -i bitbucket-mcp node /app/dist/index.js
```

**Expected Response:**
```json
{"jsonrpc":"2.0","result":{"capabilities":...},"id":1}
```

**Common Causes:**

1. **Container not running in interactive mode** - Ensure `-i` flag is used
2. **TTY enabled** - Disable TTY (`tty: false` in docker-compose)
3. **Wrong command in Claude config** - Use `docker exec -i bitbucket-mcp node /app/dist/index.js`

### Image Size Too Large

**Symptom:** Docker image exceeds 200MB

```bash
# Check image size
docker images bitbucket-dc-mcp

# Analyze layers
docker history bitbucket-dc-mcp:latest
```

**Solutions:**

1. **Verify multi-stage build** - Ensure production stage doesn't include dev dependencies
2. **Check .dockerignore** - Ensure tests/docs are excluded
3. **Clean npm cache** - Should run `npm cache clean --force` in production stage
4. **Note:** Embeddings generation downloads models (~500MB) during build but only ~4MB embeddings.db is included in final image

### Permission Denied Errors

**Symptom:** Cannot write to volume mount

```bash
# Check file permissions in volume
docker exec bitbucket-mcp ls -la /root/.bitbucket-mcp
```

**Solution:** Ensure mounted directory has correct permissions:

```bash
# On host
chmod 755 ~/.bitbucket-mcp
chown -R $(id -u):$(id -g) ~/.bitbucket-mcp
```

### Debugging Inside Container

```bash
# Open shell inside running container
docker exec -it bitbucket-mcp /bin/sh

# Check environment variables
docker exec bitbucket-mcp env

# View running processes
docker exec bitbucket-mcp ps aux

# Check disk usage
docker exec bitbucket-mcp df -h

# View application logs in real-time
docker logs -f bitbucket-mcp
```

## Security Best Practices

### 1. Run as Non-Root User

The image runs as user `nodejs` (UID 1001) by default:

```dockerfile
USER nodejs
```

**Never run as root in production.**

### 2. Use Secrets Management

**Don't hardcode credentials in docker-compose.yml:**

```yaml
# ❌ Bad
environment:
  BITBUCKET_TOKEN: hardcoded-token

# ✅ Good
environment:
  BITBUCKET_TOKEN: ${BITBUCKET_TOKEN}
```

**Use Docker secrets (Swarm) or external secret managers (Kubernetes, AWS Secrets Manager).**

### 3. Limit Resources

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 2G
```

Prevents container from consuming all host resources.

### Keep Images Updated

```bash
# Rebuild regularly with latest base image and dependencies
docker build --no-cache -t bitbucket-dc-mcp:latest .
```

### 5. Scan for Vulnerabilities

```bash
# Use Docker Scout or Trivy
docker scout cves bitbucket-dc-mcp:latest
# or
trivy image bitbucket-dc-mcp:latest
```

### 6. Use Read-Only Root Filesystem (Advanced)

```bash
docker run --read-only \
  --tmpfs /tmp \
  -e BITBUCKET_URL=... \
  bitbucket-dc-mcp:latest
```

Prevents malicious code from modifying the filesystem.

## Docker Hub Instructions

### Publishing Images

#### Option 1: Manual with Version from package.json

```bash
# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Tag images with version
docker tag bitbucket-dc-mcp:latest your-dockerhub-username/bitbucket-dc-mcp:latest
docker tag bitbucket-dc-mcp:latest your-dockerhub-username/bitbucket-dc-mcp:$VERSION

# Push to Docker Hub
docker push your-dockerhub-username/bitbucket-dc-mcp:latest
docker push your-dockerhub-username/bitbucket-dc-mcp:$VERSION
```

#### Option 2: Build with Version Tag Directly

```bash
# Get version and build with tags
VERSION=$(node -p "require('./package.json').version")
docker build -t your-dockerhub-username/bitbucket-dc-mcp:latest \
             -t your-dockerhub-username/bitbucket-dc-mcp:$VERSION .

# Push all tags
docker push your-dockerhub-username/bitbucket-dc-mcp --all-tags
```

#### Option 3: Using Git Tags (Automated CI/CD)

```bash
# Create a version tag matching package.json
git tag v2.3.2
git push origin v2.3.2

# GitHub Actions will automatically:
# - Build multi-arch images
# - Tag as: 2.3.2, 2.3, 2, latest, main-<sha>
# - Push to Docker Hub
```

### Pulling Published Images

```bash
# Pull latest version
docker pull your-dockerhub-username/bitbucket-dc-mcp:latest

# Pull specific version
docker pull your-dockerhub-username/bitbucket-dc-mcp:1.0.0
```

## CI/CD Integration

See `.github/workflows/docker-build.yml` for automated multi-arch builds on GitHub Actions.

The workflow:
1. Builds on every push to `main`
2. Creates multi-arch images (amd64, arm64)
3. Pushes to Docker Hub with tags: `latest` and `<git-sha>`

**Required GitHub Secrets:**
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub access token

**Note:** No API keys needed - embeddings are generated locally using @xenova/transformers during the build process.

## Additional Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
