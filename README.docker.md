# Bitbucket Data Center MCP Server - Docker Image

**Model Context Protocol (MCP) server for Atlassian Bitbucket Data Center** with semantic search and AI-powered workflow automation.

[![GitHub](https://img.shields.io/badge/GitHub-guercheLE%2Fbitbucket--dc--mcp-blue?logo=github)](https://github.com/guercheLE/bitbucket-dc-mcp)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%203.0-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)

Transform natural language queries into precise Bitbucket API operations. Built for LLMs (Claude, GPT-4) to interact intelligently with Bitbucket Data Center.

## 🚀 Quick Start

### Mode Selection

The Bitbucket DC MCP Server supports **two operation modes**:

| Mode | Use Case | Transport | Ports | Docker Compatibility |
|------|----------|-----------|-------|---------------------|
| **stdio** (default) | Local MCP clients | stdin/stdout | None | ❌ Not for external clients |
| **HTTP** | Web apps, APIs, integrations | HTTP POST | 3000+ | ✅ Required for Docker |

## ⚠️ Important: Docker Communication

**For external clients (VS Code, Cursor, Claude Desktop) connecting to Docker containers, you MUST use HTTP mode.**

- **stdio mode**: Only works for internal container processes, not external clients
- **HTTP mode**: Required for any external client communication with Docker containers

### Run with Docker (stdio mode - internal use only)

```bash
# ⚠️ stdio mode only works for internal container processes
# NOT for external clients (VS Code, Cursor, Claude Desktop)
docker run -it \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=your-personal-access-token \
  ghcr.io/guerchele/bitbucket-dc-mcp:latest
```

### Run with Docker (HTTP mode)

```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=your-personal-access-token \
  ghcr.io/guerchele/bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000
```

### Run with Docker Compose (stdio mode)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  bitbucket-mcp:
    image: guerchele/bitbucket-dc-mcp:latest
    environment:
      BITBUCKET_URL: https://bitbucket.example.com
      BITBUCKET_AUTH_METHOD: pat
      BITBUCKET_TOKEN: your-personal-access-token
      LOG_LEVEL: info
    restart: unless-stopped
```

### Run with Docker Compose (HTTP mode)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  bitbucket-mcp-http:
    image: guerchele/bitbucket-dc-mcp:latest
    ports:
      - "3000:3000"
    environment:
      BITBUCKET_URL: https://bitbucket.example.com
      BITBUCKET_AUTH_METHOD: pat
      BITBUCKET_TOKEN: your-personal-access-token
      LOG_LEVEL: info
    command: ["node", "/app/dist/cli.js", "http", "--host", "0.0.0.0", "--port", "3000"]
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

## 📋 Requirements

- **Bitbucket Data Center** instance with API access
- **Valid credentials**: OAuth 2.0, Personal Access Token, OAuth 1.0a, or Basic Auth
- **Docker Desktop 4.37.1+** or Docker Engine 20.10+

## 🔧 Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `BITBUCKET_URL` | Your Bitbucket Data Center URL | `https://bitbucket.example.com` |
| `BITBUCKET_AUTH_METHOD` | Authentication method | `pat`, `oauth2`, `oauth1`, `basic` |
| `BITBUCKET_TOKEN` | Authentication token (for PAT/Basic) | `your-token-here` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `BITBUCKET_API_VERSION` | `latest` | API version: `1.0` (legacy) or `latest` (modern) |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max API requests per minute |
| `REQUEST_TIMEOUT_MS` | `30000` | Request timeout in milliseconds |

## 🌐 HTTP Mode Configuration

### Basic HTTP Server

```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  ghcr.io/guerchele/bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000
```

### HTTP Server with CORS

```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  ghcr.io/guerchele/bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000 --cors
```

### HTTP Server with Metrics

```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -p 9090:9090 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  ghcr.io/guerchele/bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000 --cors
```

### HTTP Server with Custom Port

```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 8080:8080 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  ghcr.io/guerchele/bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 8080
```

**Note:** The `BITBUCKET_API_VERSION` is automatically detected based on your Bitbucket instance during setup. You typically don't need to set this manually unless you want to override the auto-detection. See [API Version Detection Guide](https://github.com/guercheLE/bitbucket-dc-mcp/blob/main/docs/api-version-detection.md) for more details.

## 📊 stdio vs HTTP Mode Comparison

| Feature | stdio Mode | HTTP Mode |
|---------|------------|-----------|
| **Transport** | stdin/stdout | HTTP POST |
| **Use Case** | Local MCP clients | Web apps, APIs, Docker clients |
| **Docker Compatibility** | ❌ Internal only | ✅ External clients |
| **Ports** | None | 3000+ (configurable) |
| **Authentication** | Config file | Headers + Config |
| **CORS** | N/A | Configurable |
| **Metrics** | N/A | Prometheus endpoint |
| **Tracing** | N/A | OpenTelemetry |
| **Network** | Local only | Network accessible |
| **Security** | File-based | Header-based |

### When to Use Each Mode

**Use stdio mode when:**
- Running locally (not in Docker)
- Integrating with Claude Desktop or Cursor locally
- Local development with MCP clients
- Simple automation scripts
- No network access needed

**Use HTTP mode when:**
- Running in Docker containers
- Building web applications
- Creating REST APIs
- Need network access
- Want metrics and monitoring
- Cross-origin requests (CORS)
- External clients (VS Code, Cursor, Claude Desktop) connecting to Docker

## 💡 Usage Examples

### Example 1: Basic Container (stdio mode)

```bash
docker run -it --rm \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=abc123xyz \
  guerchele/bitbucket-dc-mcp:latest
```

### Example 2: HTTP Mode Container

```bash
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=abc123xyz \
  guerchele/bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000
```

### Example 2: With Persistent Configuration

```bash
docker run -it -d \
  --name bitbucket-mcp \
  -v ~/.bitbucket-mcp:/root/.bitbucket-mcp \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=abc123xyz \
  guerchele/bitbucket-dc-mcp:latest
```

### Example 3: Debug Mode

```bash
docker run -it --rm \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=abc123xyz \
  -e LOG_LEVEL=debug \
  guerchele/bitbucket-dc-mcp:latest
```

### Example 4: Connect from Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bitbucket-datacenter": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BITBUCKET_URL=https://bitbucket.example.com",
        "-e",
        "BITBUCKET_AUTH_METHOD=pat",
        "-e",
        "BITBUCKET_TOKEN=your-token",
        "guerchele/bitbucket-dc-mcp:latest"
      ]
    }
  }
}
```

## 🏗️ Key Features

✅ **Semantic Search Engine** - Natural language queries with >90% relevance  
✅ **Three MCP Tools** - `search_ids`, `get_id`, `call_id`  
✅ **Multi-Authentication** - OAuth 2.0, PAT, OAuth 1.0a, Basic Auth  
✅ **Production Resilient** - Circuit breakers, rate limiting, retries  
✅ **Secure by Default** - Non-root user, credential redaction  
✅ **Multi-Architecture** - Supports `linux/amd64` and `linux/arm64`

## 🔍 MCP Tools Available

1. **`search_ids`** - Find Bitbucket operations using natural language
   ```json
   {"query": "create repository", "limit": 5}
   ```

2. **`get_id`** - Get operation details and schema
   ```json
   {"operation_id": "createRepository"}
   ```

3. **`call_id`** - Execute Bitbucket API operations
   ```json
   {"operation_id": "createRepository", "parameters": {...}}
   ```

## 🏥 Health Checks

The container includes built-in health checks:

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' bitbucket-mcp

# View health check logs
docker logs bitbucket-mcp
```

## 🔐 Security Notes

- Credentials are **never logged** (automatic redaction)
- Runs as **non-root user** (`nodejs`, UID 1001)
- Uses **OS-native keychains** when available
- Supports **read-only root filesystem**

## 📖 Full Documentation

- **GitHub Repository**: https://github.com/guercheLE/bitbucket-dc-mcp
- **Docker Guide**: [docs/docker.md](https://github.com/guercheLE/bitbucket-dc-mcp/blob/main/docs/docker.md)
- **Authentication Guide**: [docs/authentication.md](https://github.com/guercheLE/bitbucket-dc-mcp/blob/main/docs/authentication.md)
- **Troubleshooting**: [docs/troubleshooting.md](https://github.com/guercheLE/bitbucket-dc-mcp/blob/main/docs/troubleshooting.md)

## 🐛 Troubleshooting

### Container exits immediately

```bash
# Check logs for errors
docker logs bitbucket-mcp
```

Common causes:
- Missing `BITBUCKET_URL` environment variable
- Invalid authentication credentials
- Network connectivity issues

### Health check failing

```bash
# Run health check manually
docker exec bitbucket-mcp node /app/dist/healthcheck.js
```

### Cannot connect to Bitbucket

```bash
# Test connectivity from container
docker exec bitbucket-mcp wget -O- https://bitbucket.example.com/status
```

## 📜 License

LGPL-3.0 License - see [LICENSE](https://github.com/guercheLE/bitbucket-dc-mcp/blob/main/LICENSE)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/guercheLE/bitbucket-dc-mcp/blob/main/CONTRIBUTING.md)

---

**Need help?** Open an issue on [GitHub](https://github.com/guercheLE/bitbucket-dc-mcp/issues)
